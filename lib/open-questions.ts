import "server-only";

/**
 * Hoeveel vragen er open staan voor een merk, en welke.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS (28 AUGUSTUS 2026) ───────────────────────
 *
 * Hetzelfde getal staat vanaf vandaag op drie plekken: in de bovenbalk naast
 * élk scherm, als bolletje in de zijbalk, en in de kop van de vragenpagina zelf.
 * Drie plekken die het los uitrekenen lopen gegarandeerd uit elkaar, en dan
 * staat er "3 openstaande vragen" boven een pagina die er twee toont. Dat is
 * precies de tegenspraak die `docs/logbook.md` §15 over tellingen beschrijft.
 *
 * Eén loader, drie lezers. De pure optelling staat in
 * `lib/open-questions-count.ts`, zonder `server-only`, zodat
 * `scripts/test-unit.ts` erbij kan (conventie 2).
 *
 * ── WAT ER MEETELT ──────────────────────────────────────────────────────────
 *
 * Twee soorten, en de klant kan er allebei iets mee:
 *
 *   1. Feitenvragen met status `open` (`fact_requests`). Uit het merkonderzoek
 *      (zonder cluster) én uit het rapport van een cluster. Sinds de vragen op
 *      één pagina staan is dat onderscheid een filter en geen scheiding meer.
 *   2. Open punten in het merkprofiel zelf (`findGaps`), met een knop naar het
 *      veld waar de waarde thuishoort.
 *
 * ⚠️ Overgeslagen vragen tellen NIET mee. Overslaan is een antwoord: de klant
 * heeft de vraag gezien en gezegd dat hij het niet weet. Zouden ze meetellen,
 * dan blijft het bolletje branden voor werk dat niemand meer kan doen.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfile } from "@/lib/profiles";
import { findGaps, type ProfileGap } from "@/lib/profile-gaps";
import { openVragenTotaal } from "@/lib/open-questions-count";
import type { FactRequest, Profile } from "@/lib/types/database";

type Db = SupabaseClient;

export interface OpenVragen {
  /** Alle feitenvragen van dit merk, ook de beantwoorde en overgeslagen. */
  facts: FactRequest[];
  /** Open punten in het profiel zelf. */
  gaps: ProfileGap[];
  /** Het getal dat op het scherm komt: open vragen plus open punten. */
  totaal: number;
  /** Ging er iets mis bij het ophalen? Dan is `totaal` een ondergrens. */
  fout: boolean;
}

/**
 * Alles wat op de klant wacht, in drie queries.
 *
 * ⚠️ Een mislukte query gaf tot 24 augustus 2026 een grоene kaart: `data` is dan
 * leeg, en leeg betekende "niets open". De klant kreeg dus goed nieuws te zien
 * op het moment dat de app zijn vragen niet kon ophalen. Vandaar `fout`
 * (conventie 3: onbekend is een betere waarde dan een verkeerde).
 */
/**
 * De twee queries, los van het profiel dat erbij hoort.
 *
 * Als eigen functie omdat de bovenbalk het profiel nog niet heeft en de
 * vragenpagina wél: zie `countOpenQuestionsForBrand` hieronder. Allebei de
 * lezers stellen zo gegarandeerd dezelfde vraag aan de database.
 */
function fetchQuestionRows(db: Db, profileId: string) {
  return Promise.all([
    db
      .from("fact_requests")
      .select("*")
      .eq("profile_id", profileId)
      // ⚠️ Overgeslagen vragen horen er wél bij in de LIJST. Het scherm heeft
      // een blok "toon wat je oversloeg" waarmee je een vraag alsnog kunt
      // beantwoorden, en dat blok bleef leeg zolang de query die rijen niet
      // ophaalde. In de TELLING tellen ze niet mee, zie hierboven.
      .in("status", ["open", "beantwoord", "overgeslagen"])
      .order("created_at"),
    db
      .from("profile_field_sources")
      .select("field")
      .eq("profile_id", profileId)
      .eq("not_applicable", true),
  ]);
}

export async function loadOpenQuestions(
  db: Db,
  profile: Profile,
): Promise<OpenVragen> {
  const [{ data: factRows, error: factError }, { data: nvtRows, error: nvtError }] =
    await fetchQuestionRows(db, profile.id);

  const facts = (factRows ?? []) as FactRequest[];
  const nvt = ((nvtRows ?? []) as { field: string }[]).map((r) => r.field);
  const gaps = findGaps(profile, nvt);

  return {
    facts,
    gaps,
    totaal: openVragenTotaal({
      openFacts: facts.filter((f) => f.status === "open").length,
      gaps: gaps.length,
    }),
    fout: Boolean(factError || nvtError),
  };
}

/**
 * Alleen het getal, voor de bovenbalk.
 *
 * ── ⚠️ WAAROM DIT EEN MERK-ID AANNEEMT EN GEEN PROFIEL (28 AUGUSTUS 2026) ───
 *
 * De bovenbalk kent het actieve merk uit `loadWorkspace()`, maar dat is de
 * smalle kiezerregel (naam, adres, status) en niet het volle profiel. `findGaps`
 * heeft dat volle profiel wél nodig, dus de shell haalde het eerst op en stelde
 * daarná pas de twee vragen: drie netwerkrondes achter elkaar, naast élk scherm
 * van de app.
 *
 * Alle drie kunnen tegelijk, want de twee queries hebben aan het merk-id genoeg
 * en wachten nergens op. Drie rondes worden er zo één, zonder dat het getal
 * verandert.
 */
export async function countOpenQuestionsForBrand(db: Db, profileId: string): Promise<number> {
  const [profile, [{ data: factRows }, { data: nvtRows }]] = await Promise.all([
    getProfile(profileId),
    fetchQuestionRows(db, profileId),
  ]);

  // Geen profiel betekent hier niet "nul vragen" maar "we weten het niet". Het
  // getal is dan de enige eerlijke stand: geen bolletje in de balk. Conventie 3.
  if (!profile) return 0;

  const facts = (factRows ?? []) as FactRequest[];
  const nvt = ((nvtRows ?? []) as { field: string }[]).map((r) => r.field);
  return openVragenTotaal({
    openFacts: facts.filter((f) => f.status === "open").length,
    gaps: findGaps(profile, nvt).length,
  });
}

/**
 * Hoeveel vragen houden de definitieve versie van een pagina tegen?
 *
 * ── WAT ER MEETELT, EN WAAROM NIET MEER DAN DAT ─────────────────────────────
 *
 * Twee verzamelingen, allebei met status `open`:
 *
 *   1. Vragen die uit het rapport van DIT cluster komen (`analysis_id`).
 *   2. Vragen die de claim-audit aan DEZE pagina hing (`content_piece_ids`).
 *      Die kunnen merkbreed zijn ("wat is jullie oprichtingsjaar") en tóch bij
 *      deze pagina horen, want de tekst beweert het.
 *
 * ⚠️ Merkbrede vragen die NIET aan deze pagina hangen tellen niet mee. Zouden
 * ze dat wel doen, dan zet één onbeantwoorde vraag uit de onboarding élke
 * pagina van élk cluster voorgoed dicht, en dan is de poort geen
 * kwaliteitsmaatregel maar een slot (`lib/content-final-gate.ts`).
 *
 * ⚠️ Overgeslagen vragen tellen niet mee. Dat is de uitweg die de poort
 * leefbaar houdt: wie een cijfer niet heeft, klikt "weet ik niet" en kan door.
 *
 * Faalt naar 0 bij een storing: een pagina die al geschreven is niet kunnen
 * afronden omdat een telling niet lukte, is erger dan een pagina afronden met
 * een vraag open. De poort is een kwaliteitsmaatregel, geen veiligheidsslot.
 */
export async function countBlockingQuestions(
  db: Db,
  analysisId: string,
  pieceId: string | null,
): Promise<number> {
  const [{ data: clusterRows }, { data: pieceRows }] = await Promise.all([
    db
      .from("fact_requests")
      .select("id")
      .eq("analysis_id", analysisId)
      .eq("status", "open"),
    pieceId
      ? db
          .from("fact_requests")
          .select("id")
          .eq("status", "open")
          .contains("content_piece_ids", [pieceId])
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);

  // Een vraag kan in allebei de lijsten zitten. Twee keer tellen zou de melding
  // "er staan nog 4 vragen open" laten zeggen bij twee vragen, en dan gelooft de
  // klant de teller niet meer.
  const ids = new Set([
    ...((clusterRows ?? []) as { id: string }[]).map((r) => r.id),
    ...((pieceRows ?? []) as { id: string }[]).map((r) => r.id),
  ]);
  return ids.size;
}
