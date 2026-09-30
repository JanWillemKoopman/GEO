import Link from "next/link";
import { BLIJFT_MISGAAN } from "@/lib/meldingen";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { ErrorNotice } from "@/components/error-notice";
import { gapLink } from "@/lib/profile-gaps";
import { loadOpenQuestions } from "@/lib/open-questions";
import { activeOnly } from "@/lib/archive";
import { laadPaginas, paginaHref, type PaginaRij } from "@/lib/pagina-data";
import { formatDag } from "@/lib/pagina-stand";
import type { Vraag } from "@/components/pagina/vragenlijst";
import type { FactRequest } from "@/lib/types/database";
import { VragenOverzicht, type VraagGroep } from "./vragen-overzicht";
import type { UserFacingError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const metadata = { title: "Openstaande vragen" };

/**
 * OPENSTAANDE VRAGEN: alle vragen aan de klant, en alleen vragen.
 *
 * Heette op 23 september 2026 kort "Jouw beurt" en toonde toen ook de teksten
 * om goed te keuren en de pagina's om live te zetten. Op verzoek van de eigenaar
 * (dezelfde dag) staan die weer alleen in de bibliotheek, waar ze met hun stand
 * en een filter al stonden; twee plekken voor hetzelfde werk is er één te veel.
 *
 * Sinds 30 september 2026 in één lijst met één filterrij (`vragen-overzicht.tsx`),
 * in deze volgorde:
 *
 *   1. de vragen per pagina, de pagina met de vroegste streefdatum eerst
 *      (`docs/tasks/contentflow-een-lijn.md` §3.1);
 *   2. de losse vragen over het merk, met de lege velden van het merkdossier;
 *   3. de losse vragen per cluster, op naam.
 *
 * Volle breedte, zoals de andere schermen van de app: de smalle leesstand
 * (720px) was op verzoek van de eigenaar te krap.
 */
export default async function JouwBeurtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();
  await requireUser();

  const supabase = await createClient();
  const admin = createAdminClient();

  const [vragen, { data: analysisRows }, paginas] = await Promise.all([
    loadOpenQuestions(supabase, profile),
    activeOnly(supabase.from("analyses").select("id, topic").eq("profile_id", id)),
    laadPaginas(admin, id),
  ]);

  const analyses = (analysisRows ?? []) as { id: string; topic: string | null }[];
  const actieveIds = new Set(analyses.map((a) => a.id));

  // ── 1. Vragen per pagina ──────────────────────────────────────────────────
  const metVragen = paginas.filter((p) => p.stand.sleutel === "vragen");
  const perPagina = await laadVragenPerPagina(admin, metVragen);

  // ── 2. De losse vragen: aan geen pagina gekoppeld ─────────────────────────
  // Vragen uit een gearchiveerd cluster vallen weg (migratie 0044).
  const losseFacts = vragen.facts.filter(
    (f) =>
      (f.analysis_id === null || actieveIds.has(f.analysis_id)) &&
      (f.content_piece_ids ?? []).length === 0,
  );
  const gaps = vragen.gaps;

  const alleGroepen: VraagGroep[] = [
    ...metVragen.map((p) => ({
      sleutel: p.routeId,
      soort: "pagina" as const,
      naam: p.naam,
      href: paginaHref(id, p.routeId, "taken"),
      streefdatum: p.stand.streefdatum ? formatDag(p.stand.streefdatum) : null,
      looptAchter: p.stand.looptAchter,
      vragen: perPagina.get(p.routeId) ?? [],
    })),
    {
      sleutel: "merk",
      soort: "merk" as const,
      naam: "Over je merk",
      vragen: losseFacts.filter((f) => f.analysis_id === null).map(alsVraag),
      gaten: gaps.map((g) => ({ field: g.field, label: g.label, effect: g.effect, href: gapLink(id, g.field) })),
    },
    ...analyses
      .map((a) => ({
        sleutel: a.id,
        soort: "cluster" as const,
        naam: a.topic ?? "Cluster",
        vragen: losseFacts.filter((f) => f.analysis_id === a.id).map(alsVraag),
      }))
      .sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
  ];
  const groepen = alleGroepen.filter((g) => g.vragen.length > 0 || (g.gaten?.length ?? 0) > 0);

  const mislukt: UserFacingError | null = vragen.fout
    ? {
        kind: "unknown",
        title: "ORBIT ENGINE kon je vragen nu niet ophalen",
        message:
          `Ververs de pagina. ${BLIJFT_MISGAAN}`,
        canRetry: false,
        detail: "",
      }
    : null;

  const aantal =
    metVragen.reduce((n, p) => n + Math.max(p.openVragen, 1), 0) +
    losseFacts.filter((f) => f.status === "open").length +
    gaps.length;
  const eerste = [...metVragen]
    .map((p) => p.stand.streefdatum)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  const beschrijving =
    aantal === 0
      ? "Er staan geen vragen open. De volgende vragen komen als er een nieuwe maand in het contentplan start."
      : `${aantal === 1 ? "Er staat 1 vraag" : `Er staan ${aantal} vragen`} open${
          eerste ? `. De eerste graag vóór ${formatDag(eerste)}.` : "."
        }`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Strategie" title="Openstaande vragen" description={beschrijving} />

      {mislukt && <ErrorNotice error={mislukt} />}

      {groepen.length > 0 && <VragenOverzicht profileId={id} groepen={groepen} />}

      {!mislukt && aantal === 0 && (
        <div className="card card-success flex flex-col gap-1">
          <span className="type-body-emphasis">Niets open</span>
          <p className="text-secondary">
            ORBIT ENGINE heeft alles wat het nu nodig heeft. De volgende vragen komen als je een nieuwe
            maand in het contentplan start.
          </p>
        </div>
      )}
    </div>
  );
}

/** Een losse vraag in de vorm van de vraagkaart: aan geen pagina gekoppeld. */
function alsVraag(f: FactRequest): Vraag {
  return {
    id: f.id,
    question: f.question,
    reason: f.reason,
    kind: f.kind ?? null,
    answer_type: f.answer_type ?? null,
    options: f.options ?? null,
    required: f.required ?? null,
    status: f.status,
    answer: f.answer,
    onderdelen: [],
    paginas: 0,
  };
}

/**
 * De open vragen van elke pagina in één uitvraag. Een vraag die voor twee
 * pagina's geldt, staat één keer, onder de eerste van die twee in de lijst,
 * met "Geldt voor 2 pagina's" erbij (§3.2 regel 5).
 */
async function laadVragenPerPagina(
  admin: ReturnType<typeof createAdminClient>,
  paginas: PaginaRij[],
): Promise<Map<string, Vraag[]>> {
  const uit = new Map<string, Vraag[]>();
  const pieceIds = paginas.map((p) => p.pieceId).filter((x): x is string => Boolean(x));
  if (pieceIds.length === 0) return uit;

  const { data } = await admin
    .from("fact_requests")
    .select("id, question, reason, kind, answer_type, options, required, status, answer, content_piece_ids, open_vraag, created_at")
    .eq("status", "open")
    .overlaps("content_piece_ids", pieceIds)
    .order("created_at");

  const gezien = new Set<string>();
  for (const p of paginas) {
    if (!p.pieceId) continue;
    const lijst: Vraag[] = [];
    for (const r of (data ?? []) as {
      id: string;
      question: string;
      reason: string | null;
      kind: string | null;
      answer_type: string | null;
      options: string[] | null;
      required: boolean | null;
      status: string;
      answer: string | null;
      content_piece_ids: string[] | null;
      open_vraag: boolean | null;
    }[]) {
      if (gezien.has(r.id) || !(r.content_piece_ids ?? []).includes(p.pieceId)) continue;
      gezien.add(r.id);
      lijst.push({
        id: r.id,
        question: r.question,
        reason: r.reason,
        kind: r.kind,
        answer_type: r.answer_type,
        options: r.options,
        required: r.required,
        status: r.status,
        answer: r.answer,
        onderdelen: [],
        paginas: (r.content_piece_ids ?? []).length,
        open_vraag: Boolean(r.open_vraag),
      });
    }
    uit.set(p.routeId, lijst);
  }
  return uit;
}
