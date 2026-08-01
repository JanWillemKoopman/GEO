/**
 * Winbaarheid als KANS in plaats van als vlag (R7, migratie 0037).
 *
 * ── WAT ER MIS WAS MET DE VLAG ──────────────────────────────────────────────
 *
 * `prompts.brand_eliciting` had drie waarden — ja / nee / onbekend — en werd
 * 'nee' zodra een vraag in twee opeenvolgende periodes nul aanbieders opleverde
 * (R2.1). De verificatieronde van 31 juli liet zien dat die aanname niet klopt.
 * Van de 8 herhaald gemeten vragen veranderde bij 4 de winbaarheid TUSSEN de
 * metingen van dezelfde week:
 *
 *   Vraag (ingekort)                        meting 1   2   3
 *   Hoe kan ik snel een afspraak maken…            0   1   4
 *   Waar kan ik in Amersfoort terecht…             0   5   1
 *   Welke praktijk biedt ook preventief…           0   5   4
 *   Is een persoonlijk behandelplan mogelijk…      0   4   0
 *
 * Geen enkele herhaalde vraag was alle drie de keren winbaar. Winbaarheid is dus
 * geen eigenschap van de vraag maar een kans — en een vlag kan een kans niet
 * dragen.
 *
 * ── WAT DE OUDE REGEL KOSTTE ────────────────────────────────────────────────
 *
 * Bij een vraag die één op de drie keer winbaar is, is de kans om twee keer
 * achter elkaar nul te trekken ongeveer 44%. Die vraag verdween dan permanent
 * uit de meting. Gemeten gevolg bij Fysi-Unique:
 *
 *   periode   judged   winbaar   score   stderr
 *   0             30        17      18      6,5
 *   1             30        11      36     14,8
 *   2             21         5      38     21,4
 *
 * Bij 5 winbare vragen is de 95%-band ongeveer ±42 punten. Op productie staan op
 * dit moment 9 vragen op 'nee' — en alle negen op basis van precies TWEE
 * metingen. Uit 0 van 2 valt niet af te leiden dat een kans laag is; de
 * bovengrens van het betrouwbaarheidsinterval ligt daar rond de 66%.
 *
 * ── DE NIEUWE REGEL ─────────────────────────────────────────────────────────
 *
 * Een vraag wordt pas overgeslagen wanneer we met redelijke zekerheid weten dát
 * hij zelden iets oplevert: genoeg metingen én een bovengrens onder de drempel.
 * Niet zodra hij twee keer pech had.
 *
 * Bewust ZONDER `server-only`: pure rekenkunde, testbaar in een kaal script —
 * zelfde patroon als `uncertainty.ts` en `question-share.ts`.
 */

/** Wat we van een vraag weten: hoe vaak gemeten, hoe vaak leverde het iets op. */
export interface ElicitEvidence {
  successes: number;
  samples: number;
}

/**
 * Onder dit aantal metingen zeggen we niets. Drie is de ondergrens waarbij een
 * schatting überhaupt betekenis krijgt; daaronder is elke uitspraak over de kans
 * een uitspraak over toeval.
 */
export const MIN_SAMPLES_FOR_LABEL = 3;

/**
 * Onder dit aantal metingen slaan we nooit over, hoe slecht het er ook uitziet.
 *
 * Acht en niet twee, en dat is de hele reparatie. De oude regel sloeg over na
 * twee nulmetingen; bij een vraag met een echte kans van 1 op 3 gebeurt dat in
 * 44% van de gevallen.
 */
export const MIN_SAMPLES_TO_SKIP = 8;

/**
 * Zelfs optimistisch geschat moet de kans hieronder liggen om een vraag te laten
 * vallen.
 *
 * We toetsen de BOVENGRENS en niet de schatting zelf: bij 0 van 10 is de
 * puntschatting 0%, maar de bovengrens 28% — en een vraag die één op de vier
 * keer winbaar is, wil je niet kwijt. Pas rond 12 metingen zonder resultaat zakt
 * die bovengrens onder de 25%.
 */
export const MAX_UPPER_BOUND_TO_SKIP = 0.25;

/** z-waarde voor een 95%-interval; zelfde keuze als lib/stats/uncertainty.ts. */
const Z = 1.96;

/** De puntschatting van de kans, of `null` als er nog niets gemeten is. */
export function elicitRate(e: ElicitEvidence): number | null {
  if (e.samples <= 0) return null;
  return e.successes / e.samples;
}

/**
 * Het Wilson-betrouwbaarheidsinterval.
 *
 * Wilson en niet de gewone normaalbenadering, om precies de reden waarom deze
 * module bestaat: bij 0 successen geeft de normaalbenadering een interval van
 * nul breed ("0%, absoluut zeker"), en dan is elke drempel meteen gehaald.
 * Wilson houdt het interval eerlijk breed zolang de steekproef klein is.
 */
export function wilsonBounds(e: ElicitEvidence): { low: number; high: number } {
  const n = e.samples;
  if (n <= 0) return { low: 0, high: 1 };

  const p = e.successes / n;
  const noemer = 1 + (Z * Z) / n;
  const midden = (p + (Z * Z) / (2 * n)) / noemer;
  const spreiding = (Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n))) / noemer;

  return {
    low: Math.max(0, midden - spreiding),
    high: Math.min(1, midden + spreiding),
  };
}

/**
 * Mag deze vraag bij een vervolgperiode overgeslagen worden?
 *
 * Twee voorwaarden, en ze moeten allebei gelden: genoeg metingen om iets te
 * kunnen zeggen, én een bovengrens die laag genoeg is om het te durven zeggen.
 */
export function maySkip(e: ElicitEvidence): boolean {
  if (e.samples < MIN_SAMPLES_TO_SKIP) return false;
  return wilsonBounds(e).high < MAX_UPPER_BOUND_TO_SKIP;
}

/**
 * De vlag `brand_eliciting`, afgeleid van de kans.
 *
 * De kolom blijft bestaan en blijft gevuld (additief principe,
 * status-doorontwikkeling.md §2.3), zodat alles wat er nu op filtert blijft
 * werken. Alleen de manier waarop hij tot stand komt verandert: niet meer "twee
 * keer nul op rij" maar "wat zeggen alle metingen samen".
 *
 *   'ja'       — er is minstens één keer een aanbieder genoemd
 *   'nee'      — genoeg metingen, en zelfs optimistisch geschat is de kans laag
 *   'onbekend' — te weinig metingen, of ertussenin
 */
export function elicitLabel(e: ElicitEvidence): "ja" | "nee" | "onbekend" {
  if (e.samples < MIN_SAMPLES_FOR_LABEL) return "onbekend";
  if (e.successes > 0) return "ja";
  return maySkip(e) ? "nee" : "onbekend";
}

/**
 * Hoe de kans in het rapport en op het scherm komt.
 *
 * Met het interval erbij, want dat is het hele punt: "1 van de 3" en "4 van de
 * 12" zijn dezelfde schatting en een heel ander weten.
 */
export function describeElicit(e: ElicitEvidence): string {
  if (e.samples <= 0) return "nog niet gemeten";
  const { low, high } = wilsonBounds(e);
  const pct = (v: number) => Math.round(v * 100);
  return (
    `${e.successes} van de ${e.samples} metingen leverde een aanbieder op ` +
    `(kans ${pct(e.successes / e.samples)}%, tussen ${pct(low)}% en ${pct(high)}%)`
  );
}
