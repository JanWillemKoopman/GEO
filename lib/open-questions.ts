import "server-only";
import { publicFactRequest } from "@/lib/fact-request-public";

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

  // ⚠️ **De ruwe rij mag de browser niet bereiken** (herstelplan na audit,
  // T8.9). `fact_requests.raw_json` bevat het complete antwoord van OpenAI,
  // inclusief het antwoord-id, want conventie 8 bewaart elke AI-call volledig
  // voor de audit-trail. Twee plekken zijn daar destijds voor gerepareerd; deze
  // derde is op 16 september 2026 gevonden: `select("*")` hierboven ging via
  // `facts` rechtstreeks als prop naar een clientcomponent op
  // `/merk/[id]/strategie/vragen`.
  //
  // De schoonmaak staat hier en niet in dat scherm, zodat elke volgende lezer
  // hem vanzelf krijgt in plaats van hem te moeten kennen.
  const facts = ((factRows ?? []) as Record<string, unknown>[]).map(publicFactRequest);
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
 * Hoeveel vragen van DEZE pagina staan nog open?
 *
 * ── EÉN TELLING VOOR TWEE POORTEN (contentflow-een-lijn.md §4.1) ────────────
 *
 * De schrijfpoort (`lib/content-write-gate.ts`, vóór het schrijven) en de
 * eindpoort (`lib/content-final-gate.ts`, vóór goedkeuren) tellen sinds
 * 23 september 2026 precies dezelfde vragen: de vragen met status `open` die
 * aan deze pagina hangen (`content_piece_ids`). Dat zijn de vragen uit de
 * voorbereiding van deze pagina, ook als ze merkbreed zijn.
 *
 * ⚠️ Open vragen van het cluster die aan GEEN pagina hangen tellen niet meer
 * mee. Nagerekend op 23 september 2026 over de hele database: alle 26 zulke
 * open vragen zijn `aanvulling`-vragen uit een meting of de onboarding. Elke
 * vraag die de voorbereiding van een pagina stelde (bewijs, grenzen,
 * onderscheid, praktisch, verificatie) hing aan die pagina. Zouden de losse
 * vragen meetellen, dan hield bij Van den Udenhout één meting van het cluster
 * "APK Den Bosch" (zes vragen) elke pagina van dat cluster tegen, ook als de
 * vragen van die pagina zelf allemaal beantwoord waren.
 *
 * ⚠️ Overgeslagen telt als gedaan: dat is de uitweg die de poort leefbaar houdt.
 *
 * Gooit bij een storing. Voor de SCHRIJFPOORT is dat bewust: een telling die
 * stil op 0 uitkomt zou de dure schrijfstap starten terwijl er misschien nog
 * vragen open staan, en dat is precies wat het besluit van de eigenaar verbiedt.
 */
export async function openVragenVanPagina(db: Db, pieceId: string): Promise<number> {
  const { data, error } = await db
    .from("fact_requests")
    .select("id")
    .eq("status", "open")
    .contains("content_piece_ids", [pieceId]);
  if (error) throw new Error(`Open vragen van pagina ${pieceId} tellen mislukte: ${error.message}`);
  return (data ?? []).length;
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
  // ⚠️ Met een pagina: alleen de vragen van die pagina (zie
  // `openVragenVanPagina`). Zonder pagina, op het herschrijfpad van een cluster,
  // blijft het de open vragen van het hele cluster.
  const [{ data: clusterRows }, { data: pieceRows }] = await Promise.all([
    pieceId
      ? Promise.resolve({ data: [] as { id: string }[] })
      : db
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
