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

/** Welk soort onderbouwing een aangenomen claim op dit punt het eerst zou redden. */
export type OntbrekendBewijs = "cijfer" | "bron" | "voorbeeld";

/**
 * Superlatieven en marktclaims: zonder eigen naam kloppen ze per definitie
 * niet als "gewoon feit". Elk patroon draagt meteen welk soort onderbouwing
 * de claim het meest natuurlijk redt, zodat de uitleg aan de klant kan zeggen
 * WAT er mist in plaats van alleen DAT er iets mist (punt 6 van
 * `docs/tasks/opdracht-bevindingen-5-tot-9.md`). "De snelste" vraagt om een
 * cijfer (reactietijd, doorlooptijd), "marktleider" om een bron (een lijst, een
 * award), "de enige die" om een concreet voorbeeld (een klant, een project).
 */
const SUPERLATIEF_PATRONEN: { patroon: RegExp; ontbreekt: OntbrekendBewijs }[] = [
  { patroon: /\bde\s+beste\b/i, ontbreekt: "bron" },
  { patroon: /\bde\s+grootste\b/i, ontbreekt: "cijfer" },
  { patroon: /\bde\s+goedkoopste\b/i, ontbreekt: "cijfer" },
  { patroon: /\bde\s+snelste\b/i, ontbreekt: "cijfer" },
  { patroon: /\bmarktleider\b/i, ontbreekt: "bron" },
  { patroon: /\btoonaangevend/i, ontbreekt: "bron" },
  { patroon: /\bnummer\s*1\b/i, ontbreekt: "bron" },
  { patroon: /\bmeest\s+gekozen\b/i, ontbreekt: "cijfer" },
  { patroon: /\bmeest\s+gebruikte\b/i, ontbreekt: "cijfer" },
  { patroon: /\bde\s+enige\s+(die|met|in)\b/i, ontbreekt: "voorbeeld" },
  { patroon: /\bniemand\s+(anders\s+)?(doet|biedt|kan)\b/i, ontbreekt: "voorbeeld" },
  { patroon: /\bbeter\s+dan\s+(de|onze|elke|iedere)\s+concurrent/i, ontbreekt: "voorbeeld" },
];

/** Cijfer, percentage, jaartal of URL: het "cijfer, bron of voorbeeld" dat de claim mag dragen. */
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
  const isMarktclaim = SUPERLATIEF_PATRONEN.some((p) => p.patroon.test(tekst));
  const heeftBewijs = BEWIJS_PATROON.test(tekst);
  return {
    isMarktclaim,
    heeftBewijs,
    aangenomen: !isMarktclaim || heeftBewijs,
  };
}

/**
 * Welk soort onderbouwing ontbreekt er nog, voor de tekst die dat concreet
 * benoemt? `null` als er al bewijs bij staat, of als geen enkel patroon de
 * claim herkent (dan is er niets specifieks te missen).
 *
 * Zelfde patronen als `beoordeelClaim()`: is de tekst een marktclaim volgens
 * `SUPERLATIEF_PATRONEN`, dan levert dit altijd het bijbehorende
 * `ontbreekt`-type, nooit `null`.
 */
export function ontbrekendeOnderbouwing(tekst: string): OntbrekendBewijs | null {
  if (BEWIJS_PATROON.test(tekst)) return null;
  return SUPERLATIEF_PATRONEN.find((p) => p.patroon.test(tekst))?.ontbreekt ?? null;
}

/** Wat de klant leest als zijn antwoord (nog) niet aangenomen wordt, zonder dat er iets specifieks te missen valt. */
export const MARKTCLAIM_UITLEG =
  "Dit klinkt als een claim over de markt of de concurrentie, geen mededeling over jullie eigen " +
  "werk. Zulke claims gebruiken we pas in een tekst als er een cijfer, bron of concreet voorbeeld " +
  "bij zit. Vul dat toe, of laat het antwoord zoals het is, dan blijft de tekst er voorzichtig over.";

/** De concrete zin per soort ontbrekende onderbouwing. */
const ONDERBOUWING_ZIN: Record<OntbrekendBewijs, string> = {
  cijfer: "Noem er een cijfer bij, dan mag deze zin in je teksten.",
  bron: "Noem de bron erbij, dan mag deze zin in je teksten.",
  voorbeeld: "Noem een concreet voorbeeld, dan mag deze zin in je teksten.",
};

/**
 * De uitleg die de klant op het scherm leest: specifiek waar mogelijk, de
 * algemene waarschuwing als terugval. "Dit klinkt als een claim" bleef eerder
 * de enige zin die de klant zag; deze functie zegt er meteen bij WAT er
 * ontbreekt, zodat de klant weet wat hij moet toevoegen in plaats van te
 * moeten raden (punt 6 van docs/tasks/opdracht-bevindingen-5-tot-9.md).
 */
export function marktclaimUitleg(tekst: string): string {
  const ontbreekt = ontbrekendeOnderbouwing(tekst);
  if (!ontbreekt) return MARKTCLAIM_UITLEG;
  return (
    "Dit klinkt als een claim over de markt of de concurrentie, geen mededeling over jullie eigen " +
    `werk. ${ONDERBOUWING_ZIN[ontbreekt]} Laat je het antwoord zoals het is, dan blijft de tekst er ` +
    "voorzichtig over."
  );
}
