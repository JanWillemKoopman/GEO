import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOwnedProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { laadPagina } from "@/lib/pagina-data";
import { leesHerkomst } from "@/lib/origin";
import { formatDag, heeftEigenScherm } from "@/lib/pagina-stand";
import { schrijfdatum } from "@/lib/pagina/schrijfpoort";
import { PaginaKop } from "@/components/pagina/pagina-kop";
import { AanZet } from "@/components/pagina/aan-zet";
import { Vragenlijst, type Vraag } from "@/components/pagina/vragenlijst";

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
 * `paginaId` is het id van de plan-pagina, of het id van de tekst.
 *
 * De weergave van een geschreven tekst (lezen, gele zinnen, goedkeuren) komt
 * in WP7 van `docs/tasks/contentketen-opnieuw.md` (§6.9).
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

  // ── Er is tekst ─────────────────────────────────────────────────────────
  // Tot WP7 van de ombouw staat hier alleen de stand (§6.9).
  const metTekst = ["goedkeuren", "live_zetten", "effect_meten", "effect_bekend"].includes(rij.stand.sleutel);
  if (metTekst) {
    return (
      <div className="flex flex-col gap-6">
        {kop}
        <AanZet stand={rij.stand} />
      </div>
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

      <WatDezePaginaDoet why={voortraject.why} voorWie={voortraject.voorWie} />
    </div>
  );
}

function WatDezePaginaDoet({ why, voorWie }: { why: string | null; voorWie: string | null }) {
  if (!why && !voorWie) return null;
  return (
    <section className="card flex flex-col gap-3">
      <h2 className="type-section">Waarom deze pagina</h2>
      {why && <p className="type-body text-secondary">{why}</p>}
      {voorWie && (
        <p className="type-body">
          <span className="text-muted">Voor wie: </span>
          {voorWie}
        </p>
      )}
    </section>
  );
}

/** Wat het voortraject van een pagina nodig heeft: de vragen en het waarom. */
async function laadVoortraject(
  admin: ReturnType<typeof createAdminClient>,
  pieceId: string | null,
  plannedPageId: string | null,
): Promise<{ vragen: Vraag[]; why: string | null; voorWie: string | null }> {
  const [{ data: piece }, { data: plan }, { data: vraagRijen }] = await Promise.all([
    pieceId
      ? admin.from("content_pieces").select("target_intent").eq("id", pieceId).maybeSingle()
      : Promise.resolve({ data: null }),
    plannedPageId
      ? admin.from("planned_pages").select("why, target_intent").eq("id", plannedPageId).maybeSingle()
      : Promise.resolve({ data: null }),
    pieceId
      ? admin
          .from("fact_requests")
          .select("id, question, reason, kind, answer_type, options, suggested_answer, required, status, answer, content_piece_ids, open_vraag, created_at")
          .contains("content_piece_ids", [pieceId])
          .in("status", ["open", "beantwoord", "overgeslagen"])
          .order("created_at")
      : Promise.resolve({ data: [] }),
  ]);

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
    content_piece_ids: string[] | null;
    open_vraag: boolean | null;
  }[];

  const vragen: Vraag[] = rijen.map((r) => ({
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
    open_vraag: Boolean(r.open_vraag),
  }));
  // Eerst wat nog open staat: daar begint de klant, en een beantwoorde vraag
  // bovenaan laat de lijst langer lijken dan het werk is.
  vragen.sort((a, b) => Number(a.status !== "open") - Number(b.status !== "open"));

  return {
    vragen,
    why: (plan?.why as string | null) ?? null,
    voorWie: (plan?.target_intent as string | null) ?? (piece?.target_intent as string | null) ?? null,
  };
}
