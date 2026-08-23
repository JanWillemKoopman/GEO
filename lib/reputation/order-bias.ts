/**
 * Het volgorde-effect meten in plaats van aannemen (§4.4, maatregel 4).
 *
 * Bewust ZONDER `server-only` (conventie 2).
 *
 * ── WAAROM DIT ERIN ZIT ─────────────────────────────────────────────────────
 *
 * De rotatie uit `rotate.ts` corrigeert het volgorde-effect op het GEMIDDELDE.
 * Dat is een aanname: hij gaat ervan uit dat het effect bestaat en dat rouleren
 * hem uitmiddelt. Maar hoe groot het effect is, weet je pas als je het meet, en
 * als het heel groot is dan is uitmiddelen niet genoeg. Dan rust elke losse
 * uitslag op ruis, ook al klopt het gemiddelde.
 *
 * Vandaar deze telling: over de hele run, hoe vaak werd de EERSTGENOEMDE partij
 * ook als eerste geplaatst? Bij vier partijen is de verwachting 25%. Komt daar
 * bijvoorbeeld 70% uit, dan meet dit product de volgorde en niet de markt, en
 * dan hoort dat op het scherm te staan in gewone taal, niet in de kleine
 * lettertjes.
 *
 * Een meting die zijn eigen betrouwbaarheid kan aantonen is meer waard dan een
 * meting met een voorbehoud eronder.
 */

/** Eén oordeel: wie stond vooraan in de vraag, en wie kwam er als eerste uit? */
export interface OrderObservation {
  /** De partij die als eerste in de vraag genoemd werd. */
  firstAsked: string;
  /** De partij die het model op plaats 1 zette. Null als er geen plaats 1 was. */
  firstPlaced: string | null;
  /** Hoeveel partijen er in dit oordeel meededen. */
  ofParties: number;
}

/**
 * Boven deze grens is het effect te groot om weg te middelen.
 *
 * De verwachting bij vier partijen is 25%. De drempel staat op de verwachting
 * plus twintig punten, dus 45% bij vier partijen. Dat is ruim: bij twintig
 * oordelen is een uitschieter naar 40% nog gewoon toeval, en een product dat bij
 * elke run "let op, dit is indicatief" zegt, leert de klant die waarschuwing
 * negeren. Boven 45% is het geen toeval meer maar een patroon.
 */
export const BIAS_MARGIN = 0.20;

/**
 * Onder dit aantal oordelen is er niets vast te stellen.
 *
 * Bij vijf oordelen is drie keer raak al 60%, en dat kan puur toeval zijn. Onder
 * de tien geven we daarom `null` terug in plaats van een getal, precies zoals
 * conventie 3 het wil: onbekend is een betere waarde dan een verkeerde.
 */
export const MIN_OBSERVATIONS = 10;

export interface OrderBiasResult {
  /** Het aandeel keren dat de eerstgevraagde ook eerste werd. Null = te weinig data. */
  bias: number | null;
  /** Wat je bij zuiver toeval zou verwachten, gegeven de noemers. */
  expected: number | null;
  /** Ligt het effect zo ver boven de verwachting dat elke plaats indicatief wordt? */
  exceeded: boolean;
  observations: number;
}

/** Losse namen vergelijken zonder over hoofdletters of spaties te struikelen. */
function sleutel(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Meet het volgorde-effect over alle vergelijkingen van één run.
 *
 * De verwachting is niet hard 25%, maar het gemiddelde van 1/n over de
 * oordelen. Kende het model bij de helft van de oordelen maar drie partijen, dan
 * is de verwachting daar 33% en niet 25%, en dat verschil optellen bij het
 * effect zou een bias meten die er niet is.
 */
export function measureOrderBias(observations: OrderObservation[]): OrderBiasResult {
  const bruikbaar = observations.filter(
    (o) => o.firstPlaced !== null && o.ofParties >= 2 && o.firstAsked.trim().length > 0,
  );

  if (bruikbaar.length < MIN_OBSERVATIONS) {
    return { bias: null, expected: null, exceeded: false, observations: bruikbaar.length };
  }

  const raak = bruikbaar.filter(
    (o) => sleutel(o.firstAsked) === sleutel(o.firstPlaced as string),
  ).length;

  const bias = raak / bruikbaar.length;
  const expected =
    bruikbaar.reduce((sum, o) => sum + 1 / o.ofParties, 0) / bruikbaar.length;

  return {
    bias: Math.round(bias * 1000) / 1000,
    expected: Math.round(expected * 1000) / 1000,
    exceeded: bias > expected + BIAS_MARGIN,
    observations: bruikbaar.length,
  };
}

/**
 * Mag de plaats als uitslag op het scherm, of alleen als indicatie? (§4.4)
 *
 * ⚠️ Twee voorwaarden, en ze moeten ALLEBEI gelden. Genoeg rotaties zonder een
 * gemeten volgorde-effect is niet genoeg: als vooraan staan structureel wint,
 * dan zeggen drie rotaties alleen dat het effect drie keer optrad.
 *
 * Standaard `true` (indicatief). De veilige kant is hier "dit is een indicatie",
 * want een plaats die stelliger op het scherm staat dan hij is, is precies de
 * fout die dit hele onderdeel probeert te vermijden.
 */
export function rankIsIndicative(args: {
  /** Hoeveel rotaties er onder deze plaats liggen. */
  rotations: number;
  /** Het gemeten volgorde-effect over de hele run. */
  bias: OrderBiasResult;
}): boolean {
  if (args.bias.exceeded) return true;
  return args.rotations < 3;
}
