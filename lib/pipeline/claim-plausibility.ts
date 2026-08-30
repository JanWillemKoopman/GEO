/**
 * Niet alle klantinput is gelijk (docs/optimalisatielab-orbit-engine.md,
 * werkpakket A §3.4).
 *
 * ── HET ONDERSCHEID ─────────────────────────────────────────────────────────
 *
 * Wat een klant zegt over zijn EIGEN werkwijze, aanbod, prijzen, garanties,
 * werkgebied en processen is zijn eigen domein en wordt zonder meer
 * aangenomen. Een claim over de MARKT, over concurrenten, over resultaten of
 * een superlatief ("de beste", "marktleider") is dat niet: die mag pas de
 * tekst in als er een cijfer, bron of concreet voorbeeld bij zit. Zonder dat
 * onderscheid schrijft de AI een bewering als "wij zijn de beste van Brabant"
 * met dezelfde overtuiging als "wij leveren binnen 48 uur", en de eerste is
 * niet na te trekken en de tweede wel.
 *
 * ── WAAROM DIT EEN WOORDPATROON IS EN GEEN AI-OORDEEL (conventie 1) ─────────
 *
 * Een promptinstructie ("wees voorzichtig met superlatieven") is een intentie
 * en geen garantie: het model dat de synthese doet krijgt die instructie al
 * (`synthesis.ts`, "'de beste van de regio' is geen feit"), en toch kan een
 * klant in de contentbriefing gewoon "ja, wij zijn de beste" typen als
 * antwoord op een vraag. Dat antwoord gaat rechtstreeks naar `proof_points`
 * (`app/api/profiles/[id]/facts/route.ts`), de lijst die de hele
 * schrijfpijplijn als vaststaand feit leest. Alleen een deterministische
 * controle op dat ene punt kan dat vangen, net als `checkTabooWords()` en
 * `forbiddenTopicHits()` hetzelfde doen voor andere risico's.
 *
 * Bewust smal en met opzet niet uitputtend: bij twijfel niet blokkeren
 * (conventie 3, onbekend is beter dan een verkeerde gok in de VERKEERDE
 * richting hier zou een gewone, eigen mededeling ("wij zijn dinsdag dicht")
 * ten onrechte tegenhouden, en dat kost de klant meer vertrouwen dan een
 * enkele superlatief die er per ongeluk doorheen glipt).
 */

/** Superlatieven en marktclaims: zonder eigen naam kloppen ze per definitie niet als "gewoon feit". */
const SUPERLATIEF_PATRONEN: RegExp[] = [
  /\bde\s+beste\b/i,
  /\bde\s+grootste\b/i,
  /\bde\s+goedkoopste\b/i,
  /\bde\s+snelste\b/i,
  /\bmarktleider\b/i,
  /\btoonaangevend/i,
  /\bnummer\s*1\b/i,
  /\bmeest\s+gekozen\b/i,
  /\bmeest\s+gebruikte\b/i,
  /\bde\s+enige\s+(die|met|in)\b/i,
  /\bniemand\s+(anders\s+)?(doet|biedt|kan)\b/i,
  /\bbeter\s+dan\s+(de|onze|elke|iedere)\s+concurrent/i,
];

/** Cijfer, percentage, jaartal of URL: het "cijfer of voorbeeld" dat de claim mag dragen. */
const BEWIJS_PATROON = /\d|https?:\/\//;

export interface ClaimBeoordeling {
  /** Bevat de tekst een superlatief of marktclaim? */
  isMarktclaim: boolean;
  /** Staat er een cijfer, jaartal of link bij die de claim draagt? */
  heeftBewijs: boolean;
  /** Mag deze tekst zonder meer als vaststaand feit gelden? */
  aangenomen: boolean;
}

/**
 * Mag deze klantuitspraak zonder meer als feit gelden, of is het een claim die
 * eerst een cijfer, bron of voorbeeld nodig heeft?
 */
export function beoordeelClaim(tekst: string): ClaimBeoordeling {
  const isMarktclaim = SUPERLATIEF_PATRONEN.some((p) => p.test(tekst));
  const heeftBewijs = BEWIJS_PATROON.test(tekst);
  return {
    isMarktclaim,
    heeftBewijs,
    aangenomen: !isMarktclaim || heeftBewijs,
  };
}

/** Wat de klant leest als zijn antwoord (nog) niet aangenomen wordt. */
export const MARKTCLAIM_UITLEG =
  "Dit klinkt als een claim over de markt of de concurrentie, geen mededeling over jullie eigen " +
  "werk. Zulke claims gebruiken we pas in een tekst als er een cijfer, bron of concreet voorbeeld " +
  "bij zit. Vul dat toe, of laat het antwoord zoals het is, dan blijft de tekst er voorzichtig over.";
