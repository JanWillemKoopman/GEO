/**
 * De rekenkunde achter het gemeten effect (optimalisatie.md 5.4/5.5).
 *
 * Apart van `impact.ts`, want dít is het stuk waar het misgaat: welke vragen
 * mag je vergelijken, wanneer is een verschil een verschil, en wanneer zeg je
 * eerlijk "nog niet te zeggen". Dat hoort testbaar te zijn zonder database.
 *
 * Bewust ZONDER `server-only`.
 */
import { binomialStderr, Z95 } from "@/lib/stats/uncertainty";
import type { ImpactVerdict } from "@/lib/types/database";

export interface Comparison {
  /** Aantal vragen dat in BEIDE metingen beoordeeld is. */
  total: number;
  beforeMentioned: number;
  afterMentioned: number;
}

/**
 * Vergelijkt twee metingen over alleen de vragen die in allebei beoordeeld zijn.
 *
 * Die beperking is de kern. Een vraag die vóór wél en ná niet beoordeeld werd
 * (de classificatie faalde, de prompt is verwijderd) zou anders als "niet meer
 * genoemd" tellen, en dan meet je een dataprobleem als een daling.
 */
export function compare(
  before: Map<string, boolean>,
  after: Map<string, boolean>,
): Comparison {
  const shared = Array.from(after.keys()).filter((id) => before.has(id));
  return {
    total: shared.length,
    beforeMentioned: shared.filter((id) => before.get(id)).length,
    afterMentioned: shared.filter((id) => after.get(id)).length,
  };
}

export function percent(mentioned: number, total: number): number {
  return total > 0 ? (mentioned / total) * 100 : 0;
}

/** Verandering in procentpunten tussen de twee metingen. */
export function deltaOf(c: Comparison): number {
  return percent(c.afterMentioned, c.total) - percent(c.beforeMentioned, c.total);
}

/**
 * Vanaf welk verschil weten we dat er écht iets veranderd is?
 *
 * De spreiding van het VERSCHIL tussen twee metingen van dezelfde vragen: de
 * wortel uit de som van de kwadraten van de losse standaardfouten. Met een
 * handvol vragen is die drempel fors. Dat is geen tekortkoming van de
 * berekening maar van de steekproef, en de klant hoort dat te weten in plaats
 * van een stijging voorgeschoteld te krijgen die er niet is.
 */
export function thresholdOf(c: Comparison): number {
  const before = binomialStderr(c.beforeMentioned, c.total);
  const after = binomialStderr(c.afterMentioned, c.total);
  return Math.round(Z95 * Math.sqrt(before ** 2 + after ** 2) * 100) / 100;
}

/**
 * Minimaal aantal vergelijkbare vragen voor een uitspraak.
 *
 * Onder de twee is elke "stijging" een enkel antwoord dat toevallig anders
 * uitviel. Liever "nog niet te zeggen" dan een cijfer waar de klant een
 * beslissing op baseert die het niet draagt.
 */
const MIN_COMPARABLE = 2;

export function verdictOf(c: Comparison): ImpactVerdict {
  if (c.total < MIN_COMPARABLE) return "te_weinig_data";
  const delta = deltaOf(c);
  if (Math.abs(delta) <= thresholdOf(c)) return "gelijk";
  return delta > 0 ? "gestegen" : "gedaald";
}

/**
 * Bovengrens voor de zoektocht hieronder. Een verschil dat zelfs bij 200
 * vergelijkbare vragen nog binnen de meetruis zou vallen, is voor geen enkele
 * pagina haalbaar; dan is "onbekend" (`null`) eerlijker dan een getal dat
 * niemand ooit gaat halen.
 */
const MAX_SEARCH_QUESTIONS = 200;

/**
 * Hoeveel vergelijkbare vragen zijn er minimaal nodig om DIT verschil, op
 * dezelfde verhouding, van toeval te kunnen onderscheiden? (doorloop-huyberts.md
 * punt 6)
 *
 * ── WAAROM DIT ERBIJ MOEST ───────────────────────────────────────────────────
 *
 * `thresholdOf()` is statistisch correct en tegelijk onbruikbaar voor de klant:
 * "dat verschil valt binnen de meetruis (55 punten nodig)" zegt niet WAT er te
 * doen valt. Bij de Eindhoven-pagina van Huyberts Keukens ging de zichtbaarheid
 * van 0 naar 1 van de 5 doelvragen (20%), met een drempel van 55 punten: bij dit
 * aantal vragen kan de toets nooit iets anders zeggen dan "gelijk". Dit getal
 * maakt dat concreet: "met 5 vragen is dit niet te onderscheiden van toeval,
 * daar zijn er minstens N voor nodig".
 *
 * ── HOE ──────────────────────────────────────────────────────────────────────
 *
 * Zoekt vanaf het huidige aantal vragen omhoog, met de GEMETEN vóór- en
 * ná-percentages vastgehouden (niet de aantallen zelf: die zouden bij elke n
 * apart moeten afronden, en dat afronden laat de uitkomst instabiel heen en
 * weer springen rond een oneven n). `binomialStderr()` rekent net zo goed met
 * een niet-geheel aantal successen, dus dat afronden is hier niet nodig.
 *
 * `null` als zelfs `MAX_SEARCH_QUESTIONS` vragen dit verschil niet zouden
 * onderscheiden (delta 0, of een verschil dat verhoudingsgewijs te klein is):
 * conventie 3, onbekend is een betere waarde dan een getal dat de lezer nooit
 * gaat halen.
 */
export function minQuestionsForSignal(c: Comparison): number | null {
  if (c.total <= 0) return null;
  const delta = Math.abs(deltaOf(c));
  if (delta === 0) return null; // geen verschil gemeten; meer vragen maken dat niet anders

  const beforeRate = c.beforeMentioned / c.total;
  const afterRate = c.afterMentioned / c.total;

  for (let n = c.total + 1; n <= MAX_SEARCH_QUESTIONS; n++) {
    const hypothetisch: Comparison = {
      total: n,
      beforeMentioned: beforeRate * n,
      afterMentioned: afterRate * n,
    };
    if (delta > thresholdOf(hypothetisch)) return n;
  }
  return null;
}
