/**
 * In welke volgorde gaan de partijen de vergelijkingsvraag in? (§4.4)
 *
 * Bewust ZONDER `server-only` (conventie 2). Dit is de maatregel waar blok V op
 * staat of valt, dus hij hoort testbaar te zijn.
 *
 * ── HET PROBLEEM, EN HET IS GEMETEN EN GEEN THEORIE ─────────────────────────
 *
 * Een taalmodel bevoordeelt de partij die het eerst genoemd wordt. Dat is een
 * bekende eigenschap, en het is dezelfde soort fout die deze app al een keer
 * gemaakt heeft: structured output koos bij twijfel de eerste waarde uit de
 * lijst, en dat vulde bij 10 van 27 niet-genoemde merken alsnog een rol in
 * (conventie 1).
 *
 * Zet je de klant altijd vooraan, dan bouw je een product dat élke klant een
 * mooie plaats geeft. Dat is erger dan geen vergelijking: het is een cijfer dat
 * niemand kan weerleggen en dat structureel de verkeerde kant op wijst.
 *
 * ── DE OPLOSSING: ROULEREN, DETERMINISTISCH ─────────────────────────────────
 *
 * De partijenlijst wordt cyclisch geroteerd. Bij vier partijen en twaalf
 * aanbodknopen staat de klant daarmee precies drie keer op elke plek. Het
 * GEMIDDELDE over de knopen is daarmee gecorrigeerd, ook al is één losse knoop
 * dat niet, en dat is precies waarom het merkcijfer wél op één vergelijking per
 * knoop mag rusten en de losse knoop niet (die krijgt de chip `indicatief`).
 *
 * ⚠️ DETERMINISTISCH, en dat is geen nettigheid. Draai je dezelfde run twee keer,
 * dan moet de volgorde hetzelfde zijn; anders weet je bij een verschil in de
 * uitslag niet of het antwoord veranderde of alleen de vraag. De rotatie hangt
 * daarom aan `runId`, aan de plek van de knoop in de vastgelegde scope, en aan
 * de herhaling, en aan verder niets. Geen `Math.random()`, geen tijdstempel.
 *
 * ⚠️ AFWIJKING VAN HET PLAN, BEWUST. §4.4 schrijft "(runId, offeringId,
 * herhaling)". Een hash van het knoop-id verdeelt de klant ongeveer gelijk over
 * de posities, maar niet exact: bij twaalf knopen kan hij dan vijf keer vooraan
 * staan en één keer achteraan, en dan is de correctie op het gemiddelde precies
 * zo scheef als het effect dat ze moest wegnemen. De PLEK van de knoop in de
 * scope (`slot`) doet hetzelfde deterministisch én exact. Het knoop-id blijft de
 * terugval voor het geval er geen plek bekend is.
 */

/** Een tekst omzetten in een stabiel getal. FNV-1a, klein en zonder afhankelijkheden. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export interface RotateArgs {
  runId: string;
  /** De partijen in hun natuurlijke volgorde: de klant eerst, dan de concurrenten. */
  parties: string[];
  /**
   * De plek van deze aanbodknoop in de vastgelegde scope, vanaf 0. Merkbreed is
   * dit 0. Levert de exacte, gelijk verdeelde rotatie.
   */
  slot?: number;
  /** Terugval als er geen plek bekend is: het knoop-id. Merkbreed leeg. */
  offeringId?: string | null;
  /** Hoeveelste rotatie van deze vergelijking, vanaf 0. */
  repeat?: number;
}

/**
 * De volgorde waarin de partijen de vraag in gaan.
 *
 * De uitkomst gaat letterlijk naar `reputation_answers.party_order`. Zonder die
 * kolom is achteraf niet vast te stellen of een uitslag door de volgorde kwam.
 */
export function rotateParties(args: RotateArgs): string[] {
  const parties = args.parties.filter((p) => p.trim().length > 0);
  const n = parties.length;
  if (n <= 1) return [...parties];

  const basis =
    typeof args.slot === "number" && Number.isFinite(args.slot)
      ? Math.trunc(args.slot)
      : hash32(args.offeringId ?? "");

  // De run schuift het hele patroon op, zodat twee merken met dezelfde
  // aanbodboom niet dezelfde volgordes krijgen, en een tweede scan over drie
  // maanden dus ook een ander patroon draait. Binnen één run blijft alles vast.
  const runShift = hash32(args.runId);
  const stap = basis + (args.repeat ?? 0) + runShift;

  // Cyclisch roteren. Een echte permutatie zou de klant ook gelijk verdelen,
  // maar dan verandert óók de onderlinge volgorde van de concurrenten per knoop,
  // en dan meet je twee dingen tegelijk. Bij roteren blijft de ring gelijk en
  // schuift alleen het beginpunt.
  const k = ((stap % n) + n) % n;
  return [...parties.slice(k), ...parties.slice(0, k)];
}

/**
 * Op welke plek staat deze partij in de volgorde, vanaf 0? -1 als hij er niet in
 * staat. Gebruikt door `order-bias.ts` om te meten of vooraan staan loont.
 */
export function positionInOrder(order: string[], party: string): number {
  const doel = party.trim().toLowerCase();
  return order.findIndex((p) => p.trim().toLowerCase() === doel);
}
