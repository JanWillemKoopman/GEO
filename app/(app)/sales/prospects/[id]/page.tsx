import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ExternalLink } from "@/components/external-link";
import { KANS_LABEL, type KansType } from "@/lib/sales/opportunity";
import { GEWICHTEN } from "@/lib/sales/opportunity-score";
import { engineLabel } from "@/lib/engines/label";
import { magOntvangerZijn } from "@/lib/sales/contact";
import { Werkpaneel } from "./werkpaneel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prospect" };

/**
 * Het prospectdossier (plan §5.3 en hoofdstuk 15).
 *
 * ── DIT SCHERM BESTAAT VOOR ÉÉN MOMENT ──────────────────────────────────────
 *
 * Het moment waarop een prospect zegt "dat kan niet kloppen". Plan 15.1: een
 * verkoper die op de haak klikt komt uit bij de specifieke vraag, het volledige
 * AI-antwoord, welke bedrijven daarin genoemd zijn, welke bronnen de AI
 * aanhaalde, welke engine het was en de meetdatum.
 *
 * "Dat is geen luxe. Het is wat een verkoper nodig heeft op het moment dat een
 * prospect zegt dat het niet klopt. En het is wat een prospect nodig heeft om
 * ons te geloven."
 *
 * ── EN DE SCORE WORDT UITGELEGD, NIET GETOOND ───────────────────────────────
 *
 * Een getal van 0 tot 100 zonder opbouw is een oordeel dat je moet geloven. De
 * componenten staan er daarom bij, met hun gewicht: dan is te zien of de score
 * hoog is omdat er veel te winnen valt of omdat dit een groot bedrijf is, en dat
 * zijn twee verschillende gesprekken.
 */
export default async function ProspectDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: bedrijf } = await supabase
    .from("sales_companies")
    .select("id, name, domain, city, phone, email, size_signal, crawl_status, do_not_contact, do_not_contact_reason")
    .eq("id", id)
    .maybeSingle();

  if (!bedrijf) notFound();

  const { data: kansRij } = await supabase
    .from("sales_opportunities")
    .select(
      "id, type, alle_types, score, tier, confidence, hook_text, hook_source, why_text, " +
        "score_breakdown, evidence, top_intent_labels, rival_company_id, run_id, market_id, " +
        "sales_markets(label, slug, is_public), sales_runs(round_no, finished_at, engines)",
    )
    .eq("company_id", id)
    .is("superseded_by", null)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  type Kans = {
    id: string;
    type: string;
    alle_types: string[];
    score: number;
    tier: string;
    confidence: string;
    hook_text: string | null;
    hook_source: string | null;
    why_text: string | null;
    score_breakdown: Record<string, number> | null;
    evidence: { cijfers?: Record<string, number> } | null;
    top_intent_labels: string[];
    rival_company_id: string | null;
    run_id: string;
    market_id: string;
    sales_markets: { label: string; slug: string; is_public: boolean } | null;
    sales_runs: { round_no: number; finished_at: string | null; engines: string[] } | null;
  };

  const kans = kansRij as unknown as Kans | null;

  // Het bewijs: de vragen en antwoorden waar deze kans op rust. Eén join, want
  // dat is precies waarom `sales_evidence` een tabel is en geen jsonb-veld.
  const { data: bewijsRijen } = kans
    ? await supabase
        .from("sales_evidence")
        .select(
          "id, kind, note, sales_questions(text, intent_label), " +
            "sales_answers(engine, answer_text, cited_sources, measured_at)",
        )
        .eq("opportunity_id", kans.id)
        .limit(10)
    : { data: [] };

  type Bewijs = {
    id: string;
    kind: string;
    note: string | null;
    sales_questions: { text: string; intent_label: string } | null;
    sales_answers: {
      engine: string;
      answer_text: string;
      cited_sources: string[] | null;
      measured_at: string;
    } | null;
  };

  const bewijs = (bewijsRijen ?? []) as unknown as Bewijs[];

  // ── De outreach en de contactpersoon ────────────────────────────────────
  //
  // Beide horen bij het dossier en niet op een apart scherm: plan §17.2 zegt dat
  // een verkoper vanuit de analyse direct moet kunnen handelen, zonder ergens
  // anders heen te navigeren.
  const { data: outreachRij } = await supabase
    .from("sales_outreach")
    .select("id, status, subject, body_draft, call_prep, contact_id, notes")
    .eq("company_id", id)
    .not("status", "in", "(afgewezen,klant,niet_nu)")
    .maybeSingle();

  type OutreachRij = {
    id: string;
    status: string;
    subject: string | null;
    body_draft: string | null;
    call_prep: {
      cijfers?: string[];
      openingen?: string[];
      bezwaren?: { bezwaar: string; antwoord: string }[];
      nietZeggen?: string[];
    } | null;
    contact_id: string | null;
    notes: string | null;
  };
  const outreach = outreachRij as unknown as OutreachRij | null;

  const { data: contactRij } = await supabase
    .from("sales_contacts")
    .select("id, name, role, email, email_kind, confidence, verified_at")
    .eq("company_id", id)
    .order("confidence")
    .limit(1)
    .maybeSingle();

  type ContactRij = {
    id: string;
    name: string;
    role: string | null;
    email: string | null;
    email_kind: "gevonden" | "afgeleid";
    confidence: "hoog" | "middel" | "laag";
    verified_at: string | null;
  };
  const contactData = contactRij as unknown as ContactRij | null;

  // ⚠️ Het oordeel "mag deze persoon een ontvanger zijn" komt uit de pure module
  // en niet uit een `if` op dit scherm. Er staat straks een route naast die
  // hetzelfde antwoord moet geven, en twee plekken die dat oordeel apart vellen
  // lopen uit elkaar (plan 9.4).
  const contactOordeel = contactData
    ? magOntvangerZijn({
        naam: contactData.name,
        rol: contactData.role,
        email: contactData.email,
        emailKind: contactData.email_kind,
        zekerheid: contactData.confidence,
        verifiedAt: contactData.verified_at,
      }, bedrijf.name as string)
    : null;

  let rivaalNaam: string | null = null;
  if (kans?.rival_company_id) {
    const { data } = await supabase
      .from("sales_companies")
      .select("name")
      .eq("id", kans.rival_company_id)
      .maybeSingle();
    rivaalNaam = (data?.name as string) ?? null;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={kans?.sales_markets?.label ?? "Prospect"}
        title={bedrijf.name as string}
        description={beschrijving(bedrijf)}
      />

      {/* ⚠️ Bovenaan en niet onderaan. Een bedrijf dat zich heeft afgemeld mag
          niet gebeld worden, en die mededeling hoort te staan vóór de reden om
          te bellen (plan 16.4). */}
      {bedrijf.do_not_contact && (
        <div className="card card-danger">
          <p>
            Dit bedrijf wil niet benaderd worden.{" "}
            {(bedrijf.do_not_contact_reason as string | null) ?? ""}
          </p>
        </div>
      )}

      {!kans ? (
        <div className="card">
          <h2 className="text-lg font-semibold">Nog geen kans gevonden</h2>
          <p className="mt-1 text-secondary">
            Dit bedrijf staat in een markt, maar de meting leverde geen aanleiding op om contact op
            te nemen. Dat is een uitkomst en geen fout.
          </p>
        </div>
      ) : (
        <>
          <section className="card flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">Waarom je belt</h2>
              <div className="flex items-center gap-2">
                <span className="chip chip-neutral">{KANS_LABEL[kans.type as KansType] ?? kans.type}</span>
                <span className="chip chip-neutral">score {kans.score}</span>
                {kans.confidence === "laag" && (
                  <span className="chip chip-warning">weinig bewijs</span>
                )}
              </div>
            </div>

            <p className="text-lg">{kans.hook_text}</p>

            {kans.why_text && <p className="text-secondary">{kans.why_text}</p>}

            {rivaalNaam && (
              <p className="text-sm text-muted">
                De concurrent die het verschil maakt in deze markt: {rivaalNaam}.
              </p>
            )}

            {kans.hook_source === "sjabloon" && (
              <p className="text-sm text-muted">
                Deze zin komt uit het vaste sjabloon en is niet apart geschreven. Hij klopt met de
                meting; hij is alleen zakelijker dan nodig.
              </p>
            )}

            {kans.alle_types.length > 1 && (
              <p className="text-sm text-muted">
                Er speelt meer bij dit bedrijf:{" "}
                {kans.alle_types
                  .filter((t) => t !== kans.type)
                  .map((t) => KANS_LABEL[t as KansType] ?? t)
                  .join(", ")}
                . De opening hierboven is de sterkste van de reeks.
              </p>
            )}
          </section>

          <Werkpaneel
            opportunityId={kans.id}
            outreach={
              outreach
                ? {
                    id: outreach.id,
                    status: outreach.status,
                    subject: outreach.subject,
                    bodyDraft: outreach.body_draft,
                    callPrep: outreach.call_prep,
                    prepMelding: outreach.notes,
                    contact: contactData
                      ? {
                          naam: contactData.name,
                          rol: contactData.role,
                          email: contactData.email,
                          magMailen: Boolean(contactOordeel?.ok),
                          melding: contactOordeel?.melding ?? null,
                        }
                      : null,
                  }
                : null
            }
          />

          <section className="card flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold">Hoe de score is opgebouwd</h2>
              <p className="mt-1 text-secondary">
                De score is gerekend en niet geschat. Elk onderdeel telt voor zichzelf, en samen
                bepalen ze of dit bedrijf de eerste is die je belt.
              </p>
            </div>
            <ul className="flex flex-col gap-1 text-sm">
              {Object.entries(kans.score_breakdown ?? {}).map(([naam, waarde]) => (
                <li key={naam} className="flex justify-between gap-4">
                  <span>{onderdeelLabel(naam)}</span>
                  <span className="text-secondary">
                    {waarde > 0 ? "+" : ""}
                    {waarde}
                    {maxVan(naam) ? ` van de ${maxVan(naam)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* ⚠️ De openbare pagina, als die er is. Plan §5.3 noemt dit "openbaar
              bewijs": de link die in de mail kan staan en die de prospect zelf
              kan nalezen. Zolang de markt niet gepubliceerd is, staat er niets,
              want een link naar een pagina die nog niet bestaat is de snelste
              manier om het vertrouwen kwijt te raken dat de mail net won. */}
          {kans.sales_markets?.is_public && kans.sales_markets.slug && (
            <section className="card flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Openbaar bewijs</h2>
              <p className="text-secondary">
                De uitkomst van deze markt staat online. Deze link mag in je mail: de prospect kan
                er zelf nalezen wat er gemeten is.
              </p>
              <Link href={`/markt/${kans.sales_markets.slug}`} className="btn-ghost self-start">
                orbitengine.nl/markt/{kans.sales_markets.slug}
              </Link>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold">Het bewijs</h2>
              <p className="mt-1 text-secondary">
                Dit is wat er gevraagd is en wat de AI antwoordde. Gemeten in ronde{" "}
                {kans.sales_runs?.round_no ?? 1}
                {kans.sales_runs?.finished_at
                  ? ` op ${new Date(kans.sales_runs.finished_at).toLocaleDateString("nl-NL")}`
                  : ""}
                .
              </p>
            </div>

            {bewijs.length === 0 ? (
              <div className="card">
                <p className="text-secondary">
                  Bij dit soort kans is de afwezigheid het bewijs: dit bedrijf komt in geen van de
                  gemeten antwoorden voor. De vragen staan bij de markt.
                </p>
              </div>
            ) : (
              bewijs.map((b) => (
                <article key={b.id} className="card flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{b.sales_questions?.text ?? "Onbekende vraag"}</p>
                    <span className="mono-label">
                      {b.sales_answers ? engineLabel(b.sales_answers.engine) : ""}
                      {b.kind === "rivaal" ? " · de concurrent wel, dit bedrijf niet" : ""}
                    </span>
                  </div>
                  {b.sales_answers && (
                    <p className="whitespace-pre-line text-sm text-secondary">
                      {b.sales_answers.answer_text.slice(0, 800)}
                      {b.sales_answers.answer_text.length > 800 ? "…" : ""}
                    </p>
                  )}
                  {(b.sales_answers?.cited_sources ?? []).length > 0 && (
                    <p className="flex flex-wrap gap-2 text-sm">
                      {(b.sales_answers?.cited_sources ?? []).slice(0, 6).map((bron) => (
                        <ExternalLink key={bron} href={`https://${bron.replace(/^https?:\/\//, "")}`}>
                          {bron}
                        </ExternalLink>
                      ))}
                    </p>
                  )}
                </article>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}

function beschrijving(bedrijf: Record<string, unknown>): string {
  const delen = [
    bedrijf.city as string | null,
    bedrijf.domain as string | null,
    bedrijf.phone as string | null,
  ].filter(Boolean);
  return delen.length > 0 ? delen.join(" · ") : "Geen website en geen contactgegevens gevonden.";
}

/** De componentnamen zoals een verkoper ze leest, niet zoals de code ze noemt. */
function onderdeelLabel(sleutel: string): string {
  const labels: Record<string, string> = {
    kansgrootte: "Hoeveel er te winnen valt",
    bewijssterkte: "Hoeveel vragen dit dragen",
    commercieel: "Kan dit bedrijf klant worden",
    scherpte: "Hoe scherp de aanleiding is",
    verbeterbaarheid: "Of wij dit kunnen oplossen",
    concurrentiedruk: "Of er een concurrent tegenover staat",
    beweging: "Recent gezakt",
    aftrek: "Aftrek: geen website of geen contactgegevens",
    uitgesloten: "Uitgesloten van benadering",
    reden_afgemeld: "Reden: afgemeld",
    reden_afgewezen: "Reden: eerder afgewezen",
  };
  return labels[sleutel] ?? sleutel;
}

function maxVan(sleutel: string): number | null {
  return (GEWICHTEN as Record<string, number>)[sleutel] ?? null;
}
