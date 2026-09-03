/**
 * DE BENCHMARK: waar lopen het oordeel van de app en dat van een mens uit elkaar?
 * (docs/tasks/contentkwaliteit-framework.md §6, punt 11 tot en met 13)
 *
 * ── WAT DIT MOET BEANTWOORDEN ───────────────────────────────────────────────
 *
 * Niet "hoe goed is onze content" maar "kunnen we ons eigen cijfer geloven".
 * Een AI-beoordelaar die structureel milder is dan een mens, bewaakt niets:
 * dat is precies wat er op 31 juli 2026 gebeurde, toen tien van de tien
 * pagina's zichzelf 100 gaven, inclusief de pagina met vijf verzonnen feiten.
 *
 * Drie vragen, en alle drie zijn ze te beantwoorden zodra er twintig beoordeelde
 * pagina's liggen:
 *
 *   1. Hoe vaak zegt de app "klaar" terwijl een mens de pagina niet zou sturen?
 *      Dat is de gevaarlijke fout, en die telt zwaarder dan de andere kant op.
 *   2. Hoeveel scheelt het cijfer van de app met het menselijke oordeel?
 *   3. Op welke dimensie zit het verschil?
 *
 * Bewust ZONDER `server-only` (conventie 2): pure rekenkunde, testbaar vanuit
 * `scripts/test-unit.ts`.
 */

/** Eén beoordeelde pagina, zoals de benchmark hem nodig heeft. */
export interface BenchmarkRij {
  pieceId: string;
  /** Het gewogen cijfer van de app, 0-100. `null` = niet beoordeeld. */
  score: number | null;
  verdict: "pass" | "repair" | "block" | null;
  /** Zou een mens deze tekst zonder aanpassing versturen? */
  wouldSend: boolean | null;
  /** Hoe dicht bij een copywriter, 1 tot 5. */
  copywriterEquivalence: number | null;
  /** Hoeveel handmatige correctie er nodig is. */
  correctionEffort: "geen" | "licht" | "zwaar" | "opnieuw" | null;
}

export interface BenchmarkUitkomst {
  /** Hoeveel pagina's er zowel een appcijfer als een menselijk oordeel hebben. */
  vergelijkbaar: number;
  /**
   * ⚠️ De gevaarlijke fout: de app zegt "klaar" en een mens zou hem niet sturen.
   *
   * Dit is het getal dat telt. De andere kant op (de app houdt een pagina tegen
   * die een mens wél zou sturen) kost een herstelronde; deze kant kost de
   * ondernemer een pagina op zijn site die hij niet wilde.
   */
  tenOnrechteGoedgekeurd: number;
  /** De app houdt tegen, een mens zou hem sturen. Kost geld, geen geloofwaardigheid. */
  tenOnrechteTegengehouden: number;
  /** Hoe vaak app en mens het eens zijn, als percentage van `vergelijkbaar`. */
  overeenstemming: number | null;
  /** Het gemiddelde appcijfer van de pagina's die een mens WEL zou sturen. */
  gemiddeldeScoreVerstuurbaar: number | null;
  /** En van de pagina's die hij niet zou sturen. Hoort duidelijk lager te liggen. */
  gemiddeldeScoreAfgekeurd: number | null;
  /**
   * Het verschil tussen die twee.
   *
   * Dit is het echte kwaliteitscijfer van de BEOORDELAAR: is het klein, dan
   * onderscheidt het raamwerk goede content niet van slechte, hoe precies de
   * cijfers ook lijken. `null` zolang een van beide groepen leeg is.
   */
  onderscheidendVermogen: number | null;
  /** Hoeveel pagina's er zonder noemenswaardige correctie de deur uit kunnen. */
  zonderCorrectie: number;
}

function gemiddelde(waarden: number[]): number | null {
  if (waarden.length === 0) return null;
  return Math.round((waarden.reduce((t, w) => t + w, 0) / waarden.length) * 10) / 10;
}

/**
 * Vergelijkt het oordeel van de app met dat van een mens.
 *
 * Alleen rijen met allebei een oordeel tellen mee. Een pagina die nog niet
 * menselijk beoordeeld is, is geen fout van de app en telt dus nergens in mee
 * (conventie 3).
 */
export function vergelijkMetMens(rijen: readonly BenchmarkRij[]): BenchmarkUitkomst {
  const vergelijkbaar = rijen.filter((r) => r.verdict !== null && r.wouldSend !== null);

  const tenOnrechteGoedgekeurd = vergelijkbaar.filter(
    (r) => r.verdict === "pass" && r.wouldSend === false,
  ).length;
  const tenOnrechteTegengehouden = vergelijkbaar.filter(
    (r) => r.verdict !== "pass" && r.wouldSend === true,
  ).length;

  const eens = vergelijkbaar.length - tenOnrechteGoedgekeurd - tenOnrechteTegengehouden;

  const verstuurbaar = vergelijkbaar
    .filter((r) => r.wouldSend === true && r.score !== null)
    .map((r) => r.score as number);
  const afgekeurd = vergelijkbaar
    .filter((r) => r.wouldSend === false && r.score !== null)
    .map((r) => r.score as number);

  const gemVerstuurbaar = gemiddelde(verstuurbaar);
  const gemAfgekeurd = gemiddelde(afgekeurd);

  return {
    vergelijkbaar: vergelijkbaar.length,
    tenOnrechteGoedgekeurd,
    tenOnrechteTegengehouden,
    overeenstemming:
      vergelijkbaar.length === 0
        ? null
        : Math.round((eens / vergelijkbaar.length) * 1000) / 10,
    gemiddeldeScoreVerstuurbaar: gemVerstuurbaar,
    gemiddeldeScoreAfgekeurd: gemAfgekeurd,
    onderscheidendVermogen:
      gemVerstuurbaar === null || gemAfgekeurd === null
        ? null
        : Math.round((gemVerstuurbaar - gemAfgekeurd) * 10) / 10,
    zonderCorrectie: rijen.filter((r) => r.correctionEffort === "geen").length,
  };
}

/**
 * Hoeveel beoordeelde pagina's er nodig zijn voordat de drempels bijgesteld
 * mogen worden.
 *
 * Twintig, en dat is het aantal uit de opdracht: vijf merken, twee clusters, twee
 * pagina's. Niet omdat twintig statistisch veel is, maar omdat het het kleinste
 * aantal is waarbij alle vier de contenttypes en meerdere merken erin passen.
 * Onder dat aantal is elke bijstelling van een drempel een gok op een steekproef
 * van één, en dat is precies wat dit raamwerk moet vervangen.
 */
export const IJKING_MINIMUM = 20;

/** Wat er nog moet gebeuren voordat de drempels op data mogen worden bijgesteld. */
export function ijkingStand(beoordeeld: number): string {
  if (beoordeeld >= IJKING_MINIMUM) {
    return `${beoordeeld} beoordeelde pagina's: genoeg om de drempels op data bij te stellen.`;
  }
  const tekort = IJKING_MINIMUM - beoordeeld;
  return (
    `${beoordeeld} van de ${IJKING_MINIMUM} beoordeelde pagina's. Nog ${tekort} te gaan voordat ` +
    `de drempels op echte cijfers bijgesteld kunnen worden; tot die tijd zijn ze gekozen en niet gemeten.`
  );
}
