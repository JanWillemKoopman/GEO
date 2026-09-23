import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOwnedProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { laadPagina } from "@/lib/pagina-data";
import { leesHerkomst } from "@/lib/origin";
import { formatDag, heeftEigenScherm } from "@/lib/pagina-stand";
import { schrijfdatum } from "@/lib/content-write-gate";
import { sectiesVanPagina } from "@/lib/pipeline/input-coverage";
import type { ContentContract } from "@/lib/schemas/content-contract";
import { PaginaKop } from "@/components/pagina/pagina-kop";
import { AanZet } from "@/components/pagina/aan-zet";
import { Vragenlijst, type Vraag } from "@/components/pagina/vragenlijst";
import { KeuzeKnoppen } from "@/components/pagina/knoppen";
import { ContentDetail } from "@/app/(app)/analyses/[id]/bibliotheek/[pieceId]/content-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; paginaId: string }>;
}): Promise<Metadata> {
  const { id, paginaId } = await params;
  const gebruiker = await requireUser();
  const admin = createAdminClient();
  if (!(await getOwnedProfile(admin, id, gebruiker.id))) return {};
  const rij = await laadPagina(admin, id, paginaId);
  return { title: rij?.naam ?? "Pagina" };
}

/**
 * HET PAGINASCHERM: één adres per pagina, van gepland tot effect
 * (`docs/tasks/contentflow-een-lijn.md` §4.6 en §4.6a, 23 september 2026).
 *
 * Tot die dag had een pagina pas een scherm zodra er tekst was, en dat scherm
 * hing onder het cluster: in het menu lichtte "Clusters" op terwijl je uit de
 * Bibliotheek kwam. Een pagina die op vragen wachtte, toonde een leeg wit vlak
 * met "Er staan geen opmerkingen meer open" en de knop "Zet deze pagina live".
 *
 * Nu heeft elke pagina vanaf het moment dat hij in het plan staat dit ene
 * adres. Bovenaan staan altijd de naam, de standbalk en de kaart "Aan zet", met
 * hooguit één hoofdknop. Daaronder volgt per stand een eigen, gevulde
 * weergave. Nooit een leeg vlak zonder uitleg.
 *
 * Later op 23 september 2026 viel een deel weer weg. Bij "Wordt voorbereid",
 * "Wordt geschreven", "Alle vragen gedaan" en "Nog niet ingepland" liet dit
 * scherm een laadbalk of één zin zien, met daaronder de opdracht die ook in het
 * contentplan staat: de eigenaar vond dat het niets toevoegde. Die standen
 * sturen nu door naar het contentplan (`heeftEigenScherm()`), tenzij er
 * beantwoorde vragen zijn om nog aan te passen, en geen lijst linkt er nog naartoe. Het adres blijft bestaan voor de standen waar de klant
 * iets moet doen of iets kan lezen.
 *
 * `paginaId` is het id van de plan-pagina, of, voor een tekst uit de oude route
 * die nog niet aan het plan hangt, het id van de tekst.
 */
export default async function PaginaScherm({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; paginaId: string }>;
  searchParams: Promise<{ van?: string }>;
}) {
  const { id, paginaId } = await params;
  const herkomst = leesHerkomst((await searchParams).van);
  const gebruiker = await requireUser();
  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, gebruiker.id);
  if (!profile) notFound();

  const rij = await laadPagina(admin, id, paginaId);
  if (!rij) notFound();

  const terug =
    herkomst === "plan"
      ? { href: `/merk/${id}/strategie/plan`, label: "Contentplan" }
      : herkomst === "taken"
        ? { href: `/merk/${id}/strategie/vragen`, label: "Openstaande vragen" }
        : { href: `/merk/${id}/strategie/bibliotheek`, label: "Bibliotheek" };

  const kop = (
    <PaginaKop
      terug={terug}
      naam={rij.naam}
      soort={rij.soort}
      cluster={rij.cluster}
      datum={rij.datum}
      stand={rij.stand}
    />
  );

  // ── Er is tekst: het bestaande scherm met de nieuwe kop erboven ────────────
  const metTekst = ["goedkeuren", "live_zetten", "effect_meten", "effect_bekend"].includes(rij.stand.sleutel);
  if (metTekst && rij.pieceId && rij.analysisId) {
    const pieceId = rij.pieceId;
    const analysisId = rij.analysisId;
    return (
      <ContentDetail
        id={analysisId}
        pieceId={pieceId}
        terug={terug}
        leesTitel={rij.naam}
        paginaKop={kop}
        stand={rij.stand}
      />
    );
  }

  // ── Nog geen tekst: het voortraject ───────────────────────────────────────
  const voortraject = await laadVoortraject(admin, rij.pieceId, rij.plannedPageId);
  // Zonder eigen scherm en zonder vragen valt er hier niets te zien of te doen.
  // Met gegeven antwoorden wel: wie net de laatste vraag beantwoordde, blijft
  // op dit scherm (de lijst ververst na elk antwoord) en kan een antwoord nog
  // aanpassen tot het schrijven begint.
  if (!heeftEigenScherm(rij.stand.sleutel) && voortraject.vragen.length === 0) {
    redirect(`/merk/${id}/strategie/plan`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="wil-lezen" hidden />
      {kop}
      <AanZet
        stand={rij.stand}
        actie={
          rij.stand.sleutel === "vragen" ? (
            <a href="#vragen" className="btn-primary">
              {rij.stand.handeling}
            </a>
          ) : rij.stand.sleutel === "keuze" && rij.pieceId && rij.analysisId ? (
            <KeuzeKnoppen analysisId={rij.analysisId} pieceId={rij.pieceId} />
          ) : undefined
        }
      />

      {voortraject.vragen.length > 0 && (
        <section id="vragen" className="scroll-mt-24">
          <Vragenlijst
            profileId={id}
            vragen={voortraject.vragen}
            naAfronden={
              rij.datum && schrijfdatum(rij.datum) > new Date().toISOString().slice(0, 10)
                ? `Alles gedaan. We schrijven deze pagina vanaf ${formatDag(schrijfdatum(rij.datum))}.`
                : "Alles gedaan. We beginnen nu met schrijven."
            }
          />
        </section>
      )}

      <WatDezePaginaDoet
        why={voortraject.why}
        voorWie={voortraject.voorWie}
        doelvragen={voortraject.doelvragen}
        secties={voortraject.secties}
      />
    </div>
  );
}

function WatDezePaginaDoet({
  why,
  voorWie,
  doelvragen,
  secties,
}: {
  why: string | null;
  voorWie: string | null;
  doelvragen: string[];
  secties: { heading: string; wachtOpVraag: boolean }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {(why || voorWie || doelvragen.length > 0) && (
        <section className="card flex flex-col gap-3">
          <h2 className="type-section">Waarom deze pagina</h2>
          {why && <p className="type-body text-secondary">{why}</p>}
          {voorWie && (
            <p className="type-body">
              <span className="text-muted">Voor wie: </span>
              {voorWie}
            </p>
          )}
          {doelvragen.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="type-caption text-muted">Vragen aan AI-assistenten waar deze pagina het antwoord op moet zijn</span>
              <ul className="flex flex-col gap-1">
                {doelvragen.slice(0, 6).map((v) => (
                  <li key={v} className="type-body">
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
      {secties.length > 0 && (
        <section className="card flex flex-col gap-3">
          <h2 className="type-section">Wat er op de pagina moet</h2>
          <ol className="flex flex-col gap-1.5">
            {secties.map((s, i) => (
              <li key={`${s.heading}-${i}`} className="flex items-baseline justify-between gap-3 type-body">
                <span>{s.heading}</span>
                {s.wachtOpVraag && <span className="chip chip-warning shrink-0">Wacht op een vraag</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

/** Wat het voortraject van een pagina nodig heeft: de vragen, het contract, het waarom. */
async function laadVoortraject(
  admin: ReturnType<typeof createAdminClient>,
  pieceId: string | null,
  plannedPageId: string | null,
): Promise<{
  vragen: Vraag[];
  secties: { heading: string; wachtOpVraag: boolean }[];
  why: string | null;
  voorWie: string | null;
  doelvragen: string[];
}> {
  const [{ data: piece }, { data: plan }, { data: vraagRijen }] = await Promise.all([
    pieceId
      ? admin
          .from("content_pieces")
          .select("contract_json, target_intent, brief_instruction, briefing_snapshot_json")
          .eq("id", pieceId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    plannedPageId
      ? admin.from("planned_pages").select("why, target_intent").eq("id", plannedPageId).maybeSingle()
      : Promise.resolve({ data: null }),
    pieceId
      ? admin
          .from("fact_requests")
          .select("id, question, reason, kind, answer_type, options, suggested_answer, required, status, answer, section_refs, content_piece_ids, created_at")
          .contains("content_piece_ids", [pieceId])
          .in("status", ["open", "beantwoord", "overgeslagen"])
          .order("created_at")
      : Promise.resolve({ data: [] }),
  ]);

  const contract = (piece?.contract_json ?? null) as ContentContract | null;
  const secties = contract?.sections ?? [];
  const kopVan = new Map(secties.map((s) => [s.id, s.heading]));

  const rijen = (vraagRijen ?? []) as {
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
    section_refs: string[] | null;
    content_piece_ids: string[] | null;
  }[];

  const openSecties = new Set<string>();
  const vragen: Vraag[] = rijen.map((r) => {
    const ids = pieceId ? sectiesVanPagina(r.section_refs, pieceId) : [];
    if (r.status === "open") ids.forEach((s) => openSecties.add(s));
    return {
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
      onderdelen: ids.map((s) => kopVan.get(s)).filter((k): k is string => Boolean(k)),
      paginas: (r.content_piece_ids ?? []).length,
    };
  });
  // Eerst wat nog open staat: daar begint de klant, en een beantwoorde vraag
  // bovenaan laat de lijst langer lijken dan het werk is.
  vragen.sort((a, b) => Number(a.status !== "open") - Number(b.status !== "open"));

  const snapshot = (piece?.briefing_snapshot_json ?? null) as {
    recommendation?: { targets?: { text?: string }[] };
  } | null;
  const doelvragen = (snapshot?.recommendation?.targets ?? [])
    .map((t) => t.text?.trim())
    .filter((t): t is string => Boolean(t));

  return {
    vragen,
    secties: secties.map((s) => ({ heading: s.heading, wachtOpVraag: openSecties.has(s.id) })),
    why: (plan?.why as string | null) ?? (piece?.brief_instruction as string | null) ?? null,
    voorWie: (plan?.target_intent as string | null) ?? (piece?.target_intent as string | null) ?? null,
    doelvragen,
  };
}
