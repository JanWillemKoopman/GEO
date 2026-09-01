/**
 * Hoe snel de crawler een website leest (onboarding Ronde D,
 * `documentatie/onboarding_optimalisatie.md` §17.2/§17.5).
 *
 * Puur, zonder `server-only` (conventie 2): dit bepaalt hoe hard ORBIT ENGINE
 * op andermans server bonkt, en dat hoort getest te zijn.
 *
 * ── DRIE STANDEN, ÉÉN DOEL ───────────────────────────────────────────────────
 *
 * Het doel is niet onzichtbaarheid maar hoffelijkheid: een bezoeker die zich
 * identificeert (§17.3, de `User-Agent` blijft staan), zich aan robots.txt
 * houdt, en zijn tempo aanpast aan wat de site aankan. Een vast interval van
 * precies 800 ms is het duidelijkste bot-signaal dat er is; de variatie
 * hieronder (`nextDelayMs`) is er niet om te verhullen dat dit een bot is, maar
 * om niet als aanval te ogen.
 */

export type CrawlSpeed = "snel" | "normaal" | "langzaam";

export const CRAWL_SPEEDS: readonly CrawlSpeed[] = ["snel", "normaal", "langzaam"];

export function isCrawlSpeed(value: unknown): value is CrawlSpeed {
  return typeof value === "string" && (CRAWL_SPEEDS as readonly string[]).includes(value);
}

export interface SpeedProfile {
  /** Gelijktijdige fetches per ronde. */
  batchSize: number;
  /** Pauze tussen rondes, ondergrens in milliseconden. */
  minDelayMs: number;
  /** Pauze tussen rondes, bovengrens: `nextDelayMs()` kiest ertussenin. */
  maxDelayMs: number;
  /** Time-out per fetch. */
  timeoutMs: number;
  /** Label voor het scherm, bijvoorbeeld "Normaal". */
  label: string;
  /** Wat de consultant leest onder de keuze. */
  description: string;
}

const PROFILES: Record<CrawlSpeed, SpeedProfile> = {
  snel: {
    batchSize: 8,
    minDelayMs: 0,
    maxDelayMs: 0,
    timeoutMs: 12_000,
    label: "Snel",
    description: "Geen pauze tussen pagina's. Voor kleine sites, eigen testsites, of als het haast heeft.",
  },
  normaal: {
    batchSize: 3,
    minDelayMs: 700,
    maxDelayMs: 1_500,
    timeoutMs: 15_000,
    label: "Normaal",
    description: "Drie pagina's tegelijk, met een korte pauze ertussen. De juiste keuze bij vrijwel elke site.",
  },
  langzaam: {
    batchSize: 1,
    minDelayMs: 3_000,
    maxDelayMs: 7_000,
    timeoutMs: 20_000,
    label: "Langzaam",
    description:
      "Eén pagina tegelijk met een pauze ertussen. Kies dit als de site ons blokkeert, of bij een hele grote site waar we niet in de weg willen zitten.",
  },
};

export function speedProfile(speed: CrawlSpeed): SpeedProfile {
  return PROFILES[speed];
}

/**
 * Eén pauze tussen twee rondes, met variatie binnen de bandbreedte van de
 * stand. `random` is injecteerbaar zodat de test hem vastzet (conventie 2:
 * getest zonder database, en hier ook zonder de systeemklok).
 */
export function nextDelayMs(p: SpeedProfile, random: () => number = Math.random): number {
  if (p.maxDelayMs <= p.minDelayMs) return p.minDelayMs;
  return p.minDelayMs + Math.floor(random() * (p.maxDelayMs - p.minDelayMs));
}

/**
 * Eén stand omlaag bij een `429` of `503` (§17.3): de site vraagt zelf om
 * rustiger aan te doen. `langzaam` is de bodem, die kan niet verder omlaag.
 */
export function slowerThan(speed: CrawlSpeed): CrawlSpeed {
  if (speed === "snel") return "normaal";
  return "langzaam";
}
