import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { ErrorNotice } from "@/components/error-notice";
import { FactRequests } from "../../_components/fact-requests";
import { gapLink } from "@/lib/profile-gaps";
import { loadOpenQuestions } from "@/lib/open-questions";
import { activeOnly } from "@/lib/archive";
import { laadPaginas, paginaHref, type PaginaRij } from "@/lib/pagina-data";
import { STAND_CHIP, formatDag } from "@/lib/pagina-stand";
import { Vragenlijst, type Vraag } from "@/components/pagina/vragenlijst";
import type { UserFacingError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jouw beurt" };

/**
 * JOUW BEURT: alles wat op de klant wacht, op één plek
 * (`docs/tasks/contentflow-een-lijn.md` §4.6 en §4.6a, 23 september 2026).
 *
 * Heette tot die dag "Openstaande vragen" en toonde alleen losse vragen. Wat de
 * klant verder moest doen stond op drie andere plekken: het briefingscherm in
 * een cluster, "Tekst klaar voor akkoord" in het contentplan, en vrijgeven en
 * publiceren in de bibliotheek. Nu staan hier, in deze volgorde:
 *
 *   1. de vragen per pagina, de pagina met de vroegste streefdatum eerst;
 *   2. de teksten om goed te keuren;
 *   3. de pagina's om live te zetten;
 *   4. de losse vragen over het merk en de clusters, die aan geen pagina hangen.
 *
 * Opmaak `lezen` (720px): een lijst om af te werken, geen dashboard.
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
  const metVragen = paginas.filter((p) => p.stand.sleutel === "vragen" || p.stand.sleutel === "keuze");
  const perPagina = await laadVragenPerPagina(admin, metVragen);
  const teKeuren = paginas.filter((p) => p.stand.sleutel === "goedkeuren");
  const liveZetten = paginas.filter((p) => p.stand.sleutel === "live_zetten");

  // ── 4. De losse vragen: aan geen pagina gekoppeld ─────────────────────────
  // Vragen uit een gearchiveerd cluster vallen weg (migratie 0044).
  const losseFacts = vragen.facts.filter(
    (f) =>
      (f.analysis_id === null || actieveIds.has(f.analysis_id)) &&
      (f.content_piece_ids ?? []).length === 0,
  );
  const groepen = [
    { id: "merk", naam: "Over je merk" },
    ...analyses
      .map((a) => ({ id: a.id, naam: a.topic ?? "Cluster" }))
      .sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
  ];
  const gaps = vragen.gaps;

  const mislukt: UserFacingError | null = vragen.fout
    ? {
        kind: "unknown",
        title: "ORBIT ENGINE kon je vragen nu niet ophalen",
        message:
          "Er ging iets mis bij het ophalen. Ververs de pagina. Blijft het misgaan, laat het ons dan weten.",
        canRetry: false,
        detail: "",
      }
    : null;

  const aantal =
    metVragen.length +
    teKeuren.length +
    liveZetten.length +
    losseFacts.filter((f) => f.status === "open").length +
    gaps.length;
  const eerste = [...metVragen]
    .map((p) => p.stand.streefdatum)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  const beschrijving =
    aantal === 0
      ? "Er wacht niets op je. De volgende vragen komen als je een nieuwe maand in het contentplan vrijgeeft."
      : `${aantal === 1 ? "Er wacht 1 ding" : `Er wachten ${aantal} dingen`} op je${
          eerste ? `. De eerste graag vóór ${formatDag(eerste)}.` : "."
        }`;

  return (
    <div className="flex flex-col gap-8">
      <div className="wil-lezen" hidden />
      <PageHeader eyebrow="Strategie" title="Jouw beurt" description={beschrijving} />

      {mislukt && <ErrorNotice error={mislukt} />}

      {metVragen.length > 0 && (
        <Sectie titel="Vragen per pagina" uitleg="Een pagina wordt geschreven zodra al zijn vragen beantwoord of overgeslagen zijn.">
          {metVragen.map((p) => (
            <div key={p.routeId} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={paginaHref(id, p.routeId, "taken")} className="type-body-emphasis hover:underline">
                  {p.naam}
                </Link>
                <span className="flex items-center gap-2">
                  {p.stand.looptAchter && <span className="chip chip-danger">Loopt achter</span>}
                  {p.stand.streefdatum && (
                    <span className="type-caption text-muted">vóór {formatDag(p.stand.streefdatum)}</span>
                  )}
                </span>
              </div>
              {p.stand.sleutel === "keuze" ? (
                <Link href={paginaHref(id, p.routeId, "taken")} className="card card-rail card-rail-warning type-body">
                  {p.stand.zin} <span className="underline">Kies op de pagina</span>
                </Link>
              ) : (
                <Vragenlijst
                  profileId={id}
                  vragen={perPagina.get(p.routeId) ?? []}
                  naAfronden="Alles voor deze pagina is binnen. We gaan hem schrijven."
                />
              )}
            </div>
          ))}
        </Sectie>
      )}

      {teKeuren.length > 0 && (
        <Sectie titel="Teksten om goed te keuren">
          <Rijen profileId={id} rijen={teKeuren} />
        </Sectie>
      )}

      {liveZetten.length > 0 && (
        <Sectie titel="Pagina's om live te zetten">
          <Rijen profileId={id} rijen={liveZetten} />
        </Sectie>
      )}

      {(losseFacts.length > 0 || gaps.length > 0) && (
        <Sectie
          titel="Losse vragen over je merk"
          uitleg="Deze vragen horen bij geen enkele pagina. Een antwoord maakt de meting scherper en helpt elke volgende pagina."
        >
          {losseFacts.length > 0 && <FactRequests profileId={id} initial={losseFacts} groepen={groepen} kop="Vragen over je merk" />}
          {gaps.length > 0 && (
            <ul className="flex flex-col gap-3">
              {gaps.map((gap) => {
                const href = gapLink(id, gap.field);
                return (
                  <li key={gap.field} className="card flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="type-body-emphasis">{gap.label}</span>
                      <p className="type-caption text-secondary">{gap.effect}</p>
                    </div>
                    {href && (
                      <Link href={href} className="btn-outline btn-sm w-fit shrink-0">
                        Invullen
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Sectie>
      )}

      {!mislukt && aantal === 0 && (
        <div className="card card-success flex flex-col gap-1">
          <span className="type-body-emphasis">Niets te doen</span>
          <p className="text-secondary">
            ORBIT ENGINE heeft alles wat het nu nodig heeft. De volgende vragen komen als je een nieuwe
            maand in het contentplan vrijgeeft.
          </p>
        </div>
      )}
    </div>
  );
}

function Sectie({ titel, uitleg, children }: { titel: string; uitleg?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="type-section">{titel}</h2>
        {uitleg && <p className="type-caption text-muted">{uitleg}</p>}
      </div>
      {children}
    </section>
  );
}

function Rijen({ profileId, rijen }: { profileId: string; rijen: PaginaRij[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {rijen.map((r) => (
        <li key={r.routeId}>
          <Link
            href={paginaHref(profileId, r.routeId, "taken")}
            className="card card-interactive flex flex-wrap items-center justify-between gap-3"
          >
            <span className="min-w-0 flex-1 truncate type-body-emphasis" title={r.naam}>
              {r.naam}
            </span>
            <span className="flex items-center gap-3">
              <span className={STAND_CHIP[r.stand.toon]}>{r.stand.label}</span>
              {r.stand.handeling && <span className="type-caption-emphasis underline">{r.stand.handeling}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
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
    .select("id, question, reason, kind, answer_type, options, suggested_answer, required, status, answer, content_piece_ids, created_at")
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
      suggested_answer: string | null;
      required: boolean | null;
      status: string;
      answer: string | null;
      content_piece_ids: string[] | null;
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
        suggested_answer: r.suggested_answer,
        required: r.required,
        status: r.status,
        answer: r.answer,
        onderdelen: [],
        paginas: (r.content_piece_ids ?? []).length,
      });
    }
    uit.set(p.routeId, lijst);
  }
  return uit;
}
