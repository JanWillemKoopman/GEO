import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ErrorNotice } from "@/components/error-notice";
import { FactRequests } from "../../_components/fact-requests";
import { findGaps, gapLink } from "@/lib/profile-gaps";
import type { UserFacingError } from "@/lib/errors";
import type { FactRequest } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vraagt jouw input" };

/**
 * VRAAGT JOUW INPUT: alles wat ORBIT ENGINE nog van de klant wil weten.
 *
 * ── WAAROM DIT ÉÉN SCHERM IS ────────────────────────────────────────────────
 *
 * De uitvraag stond op twee adressen ("Feitenvragen" en "Openstaande punten"),
 * en voor de klant is dat één vraag: moet ik hier nog iets aanvullen? Het
 * onderscheid dat wij maakten, invulveld tegenover gesprek, is onze indeling en
 * niet de zijne. Sinds 17 augustus 2026 staat het op één pagina met de teller in
 * de kop.
 *
 * ── ⚠️ ELKE REGEL IN BEELD IS TE BEANTWOORDEN (24 AUGUSTUS 2026) ────────────
 *
 * Daarvoor niet. De open punten uit de synthese stonden hier als platte tekst:
 * bij Van den Udenhout tien vragen onder de kop "10 open", zonder één invoerveld
 * eronder. Ze kwamen uit `profile_facets.raw_json.gaps`, en die zijn in de
 * pijplijn geschreven als agenda voor het gesprek, niet als vraag aan de klant.
 * De teller vroeg dus iets waarop het scherm geen antwoord aannam, en dat is
 * precies het dode einde uit `docs/ux-design.md` §4.
 *
 * Ze zijn nu gewone feitenvragen (`lib/pipeline/gap-questions.ts`), dus dit
 * scherm leest die synthese niet meer. Wat overblijft zijn twee soorten, en
 * allebei kun je er iets mee:
 *
 *   1. Feitenvragen: beantwoorden of overslaan, hier ter plekke.
 *   2. Open punten in het profiel zelf (`findGaps`): een knop naar het veld op
 *      het bewerkscherm, want dat is waar zo'n waarde thuishoort.
 *
 * ── ⚠️ ALLEEN DE MERKBREDE VRAGEN ───────────────────────────────────────────
 *
 * `fact_requests` krijgt ook rijen mét een `analysis_id`: die kwamen uit één
 * specifiek cluster en horen bij hoofdstuk 03 van dát cluster, niet hier. Die
 * scheiding is op 14 augustus 2026 bewust aangebracht.
 *
 * ── ⚠️ DE GESPREKSNOTITIES STAAN HIER NIET MEER ─────────────────────────────
 *
 * Ze stonden onderaan dit scherm, afgeschermd voor de klant, en zijn op 17
 * augustus 2026 naar `/merk/[id]/admin` verhuisd. Wegvouwen is niet afschermen:
 * het waren aantekeningen óver de klant op een scherm dat voor hém bedoeld is,
 * en dan sta je in een demo één misklik van een ongemakkelijk gesprek af
 * (besluit 4).
 */
export default async function InputPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  await requireUser();

  const supabase = await createClient();
  const [{ data: factRows, error: factError }, { data: nvtRows, error: nvtError }] =
    await Promise.all([
      supabase
        .from("fact_requests")
        .select("*")
        .eq("profile_id", id)
        .is("analysis_id", null)
        // ⚠️ Overgeslagen vragen horen er wél bij. Het scherm heeft een blok
        // "toon wat je oversloeg" waarmee je een vraag alsnog kunt beantwoorden,
        // en dat blok bleef leeg zolang de query die rijen niet ophaalde.
        .in("status", ["open", "beantwoord", "overgeslagen"])
        .order("created_at"),
      supabase
        .from("profile_field_sources")
        .select("field")
        .eq("profile_id", id)
        .eq("not_applicable", true),
    ]);

  // ⚠️ Een mislukte query gaf hier tot 24 augustus 2026 een gróéne kaart: `data`
  // is dan leeg, en leeg betekende "niets open". De klant kreeg dus goed nieuws
  // te zien op het moment dat de app zijn vragen niet kon ophalen. Onbekend is
  // een betere waarde dan een verkeerde (conventie 3).
  const mislukt: UserFacingError | null =
    factError || nvtError
      ? {
          kind: "unknown",
          title: "ORBIT ENGINE kon je vragen nu niet ophalen",
          message:
            "Er ging iets mis bij het ophalen. Ververs de pagina. Blijft het misgaan, laat het ons dan weten.",
          canRetry: false,
          detail: (factError ?? nvtError)?.message ?? "",
        }
      : null;

  const facts = (factRows ?? []) as FactRequest[];
  const openFacts = facts.filter((f) => f.status === "open").length;

  // Velden die bewust op "niet van toepassing" staan zijn behandeld en horen
  // geen open punt meer te zijn (migratie 0060). De onboardingsessie gaf ze al
  // mee, dit scherm niet, en dan haalt de lijst hier nooit nul.
  const nvt = (nvtRows ?? []).map((r) => (r as { field: string }).field);
  const gaps = findGaps(profile, nvt);

  // De teller in de kop telt wat je op dit scherm kunt doen: onbeantwoorde
  // vragen plus open punten met een knop erachter. Eén vraag, "moet ik hier nog
  // iets?", en het antwoord moet kloppen met wat eronder staat.
  const open = openFacts + gaps.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merkprofiel"
        title={open === 0 ? "Vraagt jouw input" : `Vraagt jouw input · ${open} open`}
        description="Elk antwoord maakt de meting scherper en de teksten concreter. Overslaan mag altijd."
      />

      {mislukt && <ErrorNotice error={mislukt} />}

      {/* ── 1. De vragen, met invoerveld ───────────────────────────────────── */}
      {facts.length > 0 && <FactRequests profileId={id} initial={facts} />}

      {/* ── 2. Open punten in het profiel ──────────────────────────────────── */}
      {gaps.length > 0 && (
        <div className="card flex flex-col gap-3">
          <span className="mono-label">Dit zou de meting scherper maken</span>
          <ul className="flex flex-col gap-3">
            {gaps.map((gap) => {
              const href = gapLink(id, gap.field);
              return (
                <li
                  key={gap.field}
                  className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-medium">{gap.label}</span>
                    <p className="text-sm text-secondary">{gap.effect}</p>
                  </div>
                  {href && (
                    <Link href={href} className="btn-outline w-fit shrink-0">
                      Invullen
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── 3. Niets open ──────────────────────────────────────────────────────
          Eén bevestiging waar er twee stonden. Twee groene kaarten onder elkaar
          die allebei "er is niets" zeggen lezen als een fout in het scherm. Bij
          een mislukte query verschijnt hij niet: dan weten we het niet. */}
      {!mislukt && facts.length === 0 && gaps.length === 0 && (
        <div className="card card-success flex flex-col gap-1">
          <span className="mono-label">Niets open</span>
          <p className="text-secondary">
            ORBIT ENGINE heeft alles wat het nodig heeft. Komen er bij een volgende meting
            nieuwe vragen bij, dan staan ze hier.
          </p>
        </div>
      )}
    </div>
  );
}
