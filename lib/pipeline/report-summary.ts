/**
 * Het deterministische vangnet onder de samenvatting van het rapport.
 *
 * ── DE FOUT DIE DIT REPAREERT ───────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 31 augustus 2026, in de eerste live doorloop van de hele
 * klantreis. De alinea "Wat dit betekent" opende met:
 *
 *   "Wouter Warmtepomp wordt in deze eerste meting nog niet genoemd bij de 15
 *    onderzochte vragen. [...] De meting bestaat uit 30 antwoorden."
 *
 * Er stonden 30 vragen in het meetplan en er zijn 46 metingen over die 30
 * vragen gedaan. Het model haalde "15" ergens uit zijn invoer, waarschijnlijk
 * uit het aantal gemiste vragen in het bewijsdossier, en sprak zichzelf drie
 * zinnen verder tegen. Voor de klant is dit het eerste getal dat hij leest, en
 * twee getallen die elkaar tegenspreken maken het hele rapport ongeloofwaardig.
 *
 * ── WAAROM CODE EN NIET NOG EEN PROMPTREGEL (conventie 1) ───────────────────
 *
 * Het aantal onderzochte vragen is te tellen; daar hoeft geen model aan te pas
 * te komen. De instructie krijgt het getal nu wel expliciet mee (dat is de
 * intentie), en deze functie corrigeert wat er alsnog uit komt (dat is de
 * garantie). Precies het patroon van `mention_role`, `normalizePosition()` en
 * `mergeOverlappingRecommendations()`.
 *
 * ── WAAROM ZO SMAL ──────────────────────────────────────────────────────────
 *
 * Alleen zinsdelen die letterlijk het TOTAAL aantal onderzochte vragen
 * beweren, worden aangeraakt. Een zin als "bij 17 van de 30 vragen ontbreekt
 * het merk" blijft ongemoeid: dat is een verhouding en geen totaal, en een te
 * gretige vervanging zou daar een onwaarheid van maken. Bij twijfel niets doen
 * (conventie 3).
 */

/**
 * De vormen waarin het model het totaal opschrijft. De opvangende groep is
 * steeds het getal; de rest van de zin blijft staan zoals hij er stond.
 */
const TOTAAL_PATRONEN: RegExp[] = [
  /\b(\d{1,4})(\s+)(onderzochte\s+vragen)\b/gi,
  /\b(\d{1,4})(\s+)(gemeten\s+vragen)\b/gi,
  /\b(\d{1,4})(\s+)(vragen\s+onderzocht)\b/gi,
  /\b(\d{1,4})(\s+)(vragen\s+gemeten)\b/gi,
];

export interface SummaryCorrection {
  /** De samenvatting zoals hij opgeslagen mag worden. */
  summary: string;
  /** Welke getallen zijn rechtgezet. Leeg is de normale gang van zaken. */
  corrected: number[];
}

/**
 * Zet het aantal onderzochte vragen in de samenvatting recht.
 *
 * `actual` is het aantal UNIEKE vragen dat in deze meetronde gesteld is, niet
 * het aantal metingen: de zwaarstwegende vragen worden meerdere keren gemeten,
 * dus die twee lopen uiteen (30 vragen, 46 metingen bij de doorloop hierboven).
 * Voor de klant is "hoeveel vragen zijn er onderzocht" de eerste, en het aantal
 * herhalingen hoort in de betrouwbaarheidszin thuis.
 *
 * Bij `actual <= 0` gebeurt er niets: zonder een betrouwbaar eigen getal is
 * corrigeren gokken, en een gok in de verkeerde richting is erger dan de
 * modelfout die hij moest afvangen.
 */
export function correctQuestionCount(
  summary: string | null | undefined,
  actual: number,
): SummaryCorrection {
  const tekst = typeof summary === "string" ? summary : "";
  if (!tekst || !Number.isFinite(actual) || actual <= 0) {
    return { summary: tekst, corrected: [] };
  }

  const corrected: number[] = [];
  let resultaat = tekst;
  for (const patroon of TOTAAL_PATRONEN) {
    resultaat = resultaat.replace(
      patroon,
      (_hele, getal: string, spatie: string, staart: string) => {
        const genoemd = Number(getal);
        if (genoemd === actual) return `${getal}${spatie}${staart}`;
        corrected.push(genoemd);
        return `${actual}${spatie}${staart}`;
      },
    );
  }

  return { summary: resultaat, corrected };
}

/**
 * De regel die het aantal onderzochte vragen aan de schrijfinstructie meegeeft.
 *
 * Bewust met zoveel woorden het onderscheid tussen vragen en metingen erin: de
 * betrouwbaarheidsregel eronder noemt het aantal metingen, en zonder dit
 * onderscheid haalt het model die twee door elkaar.
 */
export function questionCountLine(uniqueQuestions: number, runs: number): string {
  if (uniqueQuestions <= 0) return "";
  const metingen =
    runs > uniqueQuestions
      ? ` Die zijn samen ${runs} keer gemeten, want de zwaarstwegende vragen worden herhaald.`
      : "";
  return (
    `AANTAL ONDERZOCHTE VRAGEN: ${uniqueQuestions}. Noem dit getal als je in de samenvatting ` +
    `zegt hoeveel vragen er onderzocht zijn, en verzin er geen ander.${metingen}`
  );
}
