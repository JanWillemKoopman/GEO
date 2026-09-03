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

// ════════════════════════════════════════════════════════════════════════════
/**
 * DE IJKING: volgt de beoordelaar ook de VOLGORDE van het menselijke oordeel?
 * (V13 uit `docs/tasks/contentkwaliteit-copywriterronde.md`)
 *
 * ── WAAROM DIT EEN EIGEN GETAL IS ───────────────────────────────────────────
 *
 * Op 3 september 2026 lagen er voor het eerst drie oordelen over dezelfde
 * twaalf pagina's: de vakmanschapsbeoordelaar uit de app, een AI in de rol van
 * copywriter, en een echte copywriter. Wat daaruit kwam, is niet wat we dachten:
 *
 *   NIVEAU. Omgerekend naar dezelfde schaal van 1 tot 5 gaf de copywriter
 *   gemiddeld 3,92 voor specificiteit, 2,92 voor menselijkheid en 2,58 voor
 *   overtuiging. De beoordelaar gaf 3,60 / 2,87 / 2,82, dus 0,05 tot 0,32
 *   ernaast. Dat is goed geijkt.
 *
 *   VOLGORDE. De rangcorrelatie van zijn twaalf oordelen met die van de
 *   copywriter is +0,19. Hij weet dus wel hoe goed de stapel gemiddeld is, maar
 *   niet welke pagina de slechtste is. De copywriter noemde als vier zwakste
 *   pagina's 2, 8, 1 en 4; de beoordelaar noemde 1, 12, 4 en 9.
 *
 * De tweede helft is de erge. De score bepaalt per pagina "klaar, repareren of
 * geblokkeerd", dus een beoordelaar die het gemiddelde goed schat maar binnen
 * een batch de slechtste pagina niet aanwijst, stuurt de reparatie naar de
 * verkeerde tekst. Van de vier pagina's die hij zou aanpakken waren er twee de
 * verkeerde.
 *
 * ⚠️ Dat kon vier weken onopgemerkt blijven omdat dit getal nergens stond. Nu
 * wel: `berekenIjking()` rekent het uit zodra er menselijke oordelen liggen, en
 * `/beheer/kwaliteit` toont het.
 */

/** Onder deze rangcorrelatie kan de beoordelaar de pagina's niet uit elkaar houden. */
export const RANGCORRELATIE_NORM = 0.6;

/** Onder dit aantal zegt een rangcorrelatie te weinig om op te sturen. */
export const RANG_MINIMUM = 5;

export interface IjkPaar {
  /** Waar het paar over gaat, voor de melding. */
  pieceId: string;
  /** Het oordeel van de beoordelaar, op welke schaal dan ook. */
  model: number;
  /** Het oordeel van de mens, op welke schaal dan ook. */
  mens: number;
}

export interface Ijking {
  /** Hoeveel pagina's er een oordeel van allebei hebben. */
  paren: number;
  /** Volgt de beoordelaar de VOLGORDE van de mens? -1 tot 1, of null. */
  rangcorrelatie: number | null;
  /**
   * Het gemiddelde verschil in NIVEAU, in punten van de menselijke schaal.
   * Positief betekent dat het model hoger scoort dan de mens.
   */
  niveauverschil: number | null;
  /** Hoeveel er nog nodig zijn voor een volledige ijking. */
  nogNodig: number;
  /** Wat de adviseur leest. Altijd gevuld. */
  melding: string;
}

/**
 * Spearman-rangcorrelatie: volgen de twee beoordelaars dezelfde VOLGORDE?
 *
 * Rangen en geen ruwe cijfers, want de twee schalen lopen niet gelijk (0 tot 100
 * tegenover 1 tot 5) en het gaat hier niet om de hoogte maar om de ordening.
 * Gelijke waarden krijgen de gemiddelde rang, zodat een beoordelaar die drie
 * pagina's precies hetzelfde geeft niet toevallig gestraft of beloond wordt.
 */
export function rangcorrelatie(paren: readonly IjkPaar[]): number | null {
  if (paren.length < RANG_MINIMUM) return null;

  const rangen = (waarden: readonly number[]): number[] => {
    const volgorde = waarden.map((w, i) => ({ w, i })).sort((a, b) => a.w - b.w);
    const uit = new Array<number>(waarden.length);
    let i = 0;
    while (i < volgorde.length) {
      let j = i;
      while (j + 1 < volgorde.length && volgorde[j + 1].w === volgorde[i].w) j++;
      const gemiddeld = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) uit[volgorde[k].i] = gemiddeld;
      i = j + 1;
    }
    return uit;
  };

  const a = rangen(paren.map((p) => p.model));
  const b = rangen(paren.map((p) => p.mens));
  const gem = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const ma = gem(a);
  const mb = gem(b);

  let teller = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    teller += (a[i] - ma) * (b[i] - mb);
    na += (a[i] - ma) ** 2;
    nb += (b[i] - mb) ** 2;
  }
  // Alle waarden gelijk: dan is er geen volgorde om te vergelijken.
  if (na === 0 || nb === 0) return null;
  return teller / Math.sqrt(na * nb);
}

/**
 * De volledige ijking, met de zin die de adviseur leest.
 *
 * `modelSchaal` zegt hoe de modelscore omgerekend moet worden naar de menselijke
 * schaal voor het niveauverschil. Bij een score van 0 tot 100 naast cijfers van
 * 1 tot 5 is dat 20.
 */
export function berekenIjking(
  paren: readonly IjkPaar[],
  modelSchaal = 20,
): Ijking {
  const n = paren.length;
  const nogNodig = Math.max(0, IJKING_MINIMUM - n);

  if (n === 0) {
    return {
      paren: 0,
      rangcorrelatie: null,
      niveauverschil: null,
      nogNodig,
      melding:
        `Er is nog geen enkele pagina door een mens beoordeeld. Zolang dat zo is, weten we niet of ` +
        `het cijfer van de app klopt. Er zijn er ${IJKING_MINIMUM} nodig.`,
    };
  }

  const rang = rangcorrelatie(paren);
  const verschil =
    paren.reduce((som, p) => som + (p.model / modelSchaal - p.mens), 0) / n;

  const regels: string[] = [];

  if (Math.abs(verschil) < 0.5) {
    regels.push(
      `Het cijfer van de app ligt gemiddeld ${Math.abs(verschil).toFixed(2)} punt van het menselijke ` +
        `oordeel. Dat is dichtbij.`,
    );
  } else {
    const richting = verschil > 0 ? "hoger" : "lager";
    regels.push(
      `Het cijfer van de app ligt gemiddeld ${Math.abs(verschil).toFixed(2)} punt ${richting} dan ` +
        `het menselijke oordeel.`,
    );
  }

  if (rang === null) {
    regels.push(
      `Voor de volgorde zijn er minstens ${RANG_MINIMUM} beoordeelde pagina's nodig; er zijn er ${n}.`,
    );
  } else if (rang >= RANGCORRELATIE_NORM) {
    regels.push(
      `Belangrijker: hij zet dezelfde pagina's onderaan als de mens (${rang.toFixed(2)}). Daardoor ` +
        `gaat de reparatie naar de pagina die hem het hardst nodig heeft.`,
    );
  } else {
    regels.push(
      `⚠️ Belangrijker: hij zet NIET dezelfde pagina's onderaan als de mens (${rang.toFixed(2)}, ` +
        `norm ${RANGCORRELATIE_NORM.toFixed(2)}). Het gemiddelde klopt dan wel, maar de reparatie ` +
        `kan naar de verkeerde pagina gaan.`,
    );
  }

  if (nogNodig > 0) {
    regels.push(`Nog ${nogNodig} menselijk beoordeelde pagina's te gaan voor een volledige ijking.`);
  }

  return { paren: n, rangcorrelatie: rang, niveauverschil: verschil, nogNodig, melding: regels.join(" ") };
}
