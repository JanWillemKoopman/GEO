/**
 * GEWOGEN BEWIJSDEKKING: is de JUISTE informatie er, niet alleen genoeg ervan
 * (docs/tasks/contentkwaliteit-framework.md §4, punt 5 van de opdracht)
 *
 * ── WAT ER MIS WAS MET ÉÉN PERCENTAGE ───────────────────────────────────────
 *
 * `berekenInputCoverage()` telt elke merkgebonden sectie even zwaar. Negen
 * randsecties onderbouwd en de ene sectie over de prijs niet, levert 90 procent
 * op, en 90 gaat vlot door de inputpoort van 70. Gemeten op de zeven pagina's
 * van 1 en 2 september 2026 gebeurde precies dat, alleen andersom: alle zeven
 * haalden 86 tot 98 procent CONTRACTdekking terwijl hun bronherleidbaarheid
 * tussen de 28 en 39 procent lag. Het cijfer klopte en zei niets.
 *
 * De opdracht zegt het zo: negentig procent dekking kan alsnog slecht zijn
 * wanneer juist de belangrijkste commerciële claims niet onderbouwd zijn.
 *
 * ── DE DRIE MATEN ───────────────────────────────────────────────────────────
 *
 *   • `graad`     , het ongewogen percentage. Blijft bestaan, ongewijzigd, want
 *                    `content_pieces.input_coverage` en de bestaande tests
 *                    rekenen erop.
 *   • `gewogen`   , hetzelfde, maar een kernsectie telt drie keer zo zwaar als
 *                    een optionele.
 *   • `kritiek`   , het percentage van alleen de KERNsecties. Dit is de maat die
 *                    blokkeert: een kernsectie zonder bewijs betekent dat de
 *                    pagina zijn doel niet kan bereiken, hoe goed de rest ook is.
 *
 * Drie getallen en niet één, om dezelfde reden als bij score, zekerheid en
 * blokkade: ze zeggen verschillende dingen en het gemiddelde ervan zegt niets.
 *
 * Bewust ZONDER `server-only` (conventie 2): pure rekenkunde, testbaar vanuit
 * `scripts/test-unit.ts`.
 */
import {
  splitRefs,
  isSupported,
  normalizeForQuote,
  type FactItem,
  type WrittenClaim,
} from "@/lib/pipeline/factcard";
import type { ContentContract, ContractSection } from "@/lib/schemas/content-contract";
import type { AuditedClaim } from "@/lib/schemas/claim-audit";
import { GOED_GENOEG } from "@/lib/content-input-gate";

/** Hoe zwaar een sectie meetelt in de gewogen dekking. */
export const BELANG_GEWICHT = { kern: 3, ondersteunend: 2, optioneel: 1 } as const;

export type SectieBelang = keyof typeof BELANG_GEWICHT;

/**
 * Het belang van een sectie, met de terugval voor contracten van vóór 0091.
 *
 * `ondersteunend` als terugval en niet `kern`: met `kern` zou elke oude pagina
 * ineens een blokkerende bewijseis krijgen op een veld dat destijds niet
 * bestond, en dan verandert een migratie het oordeel over bestaande content.
 * Met `ondersteunend` valt de gewogen dekking samen met de ongewogen, precies
 * het gedrag van voorheen (conventie 3).
 */
export function belangVan(sectie: ContractSection): SectieBelang {
  const ruw = (sectie as { importance?: string }).importance;
  if (ruw === "kern" || ruw === "ondersteunend" || ruw === "optioneel") return ruw;
  return "ondersteunend";
}

/** Vraagt deze sectie om een uitspraak over dit bedrijf? Zelfde regel als input-coverage.ts. */
function isMerksectie(sectie: ContractSection): boolean {
  return sectie.needsBrandFact === true;
}

/** Heeft deze sectie minstens één F-nummer dat echt op de kaart staat? */
function isGedekt(sectie: ContractSection, beschikbaar: ReadonlySet<string>): boolean {
  return (sectie.factRefs ?? [])
    .flatMap((ref) => splitRefs(ref))
    .some((ref) => beschikbaar.has(ref));
}

export interface GewogenDekking {
  /** Het ongewogen percentage, identiek aan `berekenInputCoverage().graad`. */
  graad: number | null;
  /** Hetzelfde percentage, met kernsecties driemaal zo zwaar. */
  gewogen: number | null;
  /** Alleen de kernsecties. `null` = deze pagina heeft er geen. */
  kritiek: number | null;
  /** Hoeveel merkgebonden secties er zijn, per belang. */
  aantallen: Record<SectieBelang, { totaal: number; gedekt: number }>;
  /** De kernsecties zonder bewijs. Dit is waar een blokkade uit voortkomt. */
  ongedekteKern: ContractSection[];
  /** Alle ongedekte merksecties, zwaarste eerst. Hier komen de vragen vandaan. */
  ongedekt: ContractSection[];
}

/**
 * De gewogen dekking van één pagina.
 *
 * `facts` is de feitenkaart zoals hij NU geldt, inclusief de antwoorden die de
 * klant al gaf. Daardoor stijgt de dekking zichtbaar zodra hij een vraag
 * beantwoordt, en dat is precies het moment waarop de app moet laten zien dat
 * zijn input verschil maakt.
 */
export function berekenGewogenDekking(
  contract: ContentContract | null,
  facts: readonly FactItem[],
): GewogenDekking {
  const beschikbaar = new Set(
    facts.map((f) => f.ref?.toUpperCase().replace(/\s+/g, "")).filter(Boolean),
  );

  const merksecties = (contract?.sections ?? []).filter(isMerksectie);

  const aantallen: Record<SectieBelang, { totaal: number; gedekt: number }> = {
    kern: { totaal: 0, gedekt: 0 },
    ondersteunend: { totaal: 0, gedekt: 0 },
    optioneel: { totaal: 0, gedekt: 0 },
  };

  const ongedekt: ContractSection[] = [];
  let gewichtTotaal = 0;
  let gewichtGedekt = 0;

  for (const sectie of merksecties) {
    const belang = belangVan(sectie);
    const gedekt = isGedekt(sectie, beschikbaar);
    aantallen[belang].totaal++;
    if (gedekt) aantallen[belang].gedekt++;
    else ongedekt.push(sectie);

    gewichtTotaal += BELANG_GEWICHT[belang];
    if (gedekt) gewichtGedekt += BELANG_GEWICHT[belang];
  }

  const gedektTotaal = merksecties.length - ongedekt.length;

  return {
    graad:
      merksecties.length === 0 ? null : Math.round((gedektTotaal / merksecties.length) * 1000) / 10,
    gewogen: gewichtTotaal === 0 ? null : Math.round((gewichtGedekt / gewichtTotaal) * 1000) / 10,
    kritiek:
      aantallen.kern.totaal === 0
        ? null
        : Math.round((aantallen.kern.gedekt / aantallen.kern.totaal) * 1000) / 10,
    aantallen,
    ongedekteKern: ongedekt.filter((s) => belangVan(s) === "kern"),
    // Zwaarste eerst: dat is de volgorde waarin de vragen aan de klant gesteld
    // horen te worden en waarin de melding de secties opsomt.
    ongedekt: [...ongedekt].sort((a, b) => BELANG_GEWICHT[belangVan(b)] - BELANG_GEWICHT[belangVan(a)]),
  };
}

/**
 * De dekking van de BEWERINGEN in de geschreven tekst, per soort claim
 * (punt 7 van de opdracht).
 *
 * `sourceCoverage()` in `factcard.ts` telt alle beweringen even zwaar en blijft
 * bestaan: die reeks staat in `content_pieces.source_coverage` en moet
 * vergelijkbaar blijven. Deze functie kijkt naar wat een claim IS. Een algemene
 * bewering zonder F-nummer is geen probleem; een bedrijfsspecifieke bewering
 * zonder F-nummer is er wel een, en een kritieke bedrijfsspecifieke bewering
 * zonder F-nummer is een blokkade.
 */
export interface ClaimDekking {
  /** Beweringen die specifiek over dit bedrijf gaan. */
  bedrijfsspecifiek: number;
  /** Daarvan onderbouwd met een bestaand F-nummer. */
  onderbouwd: number;
  /** De kritieke bedrijfsspecifieke beweringen die géén bewijs hebben. */
  kritiekOnbewezen: AuditedClaim[];
  /** Het percentage, of `null` als er geen bedrijfsspecifieke bewering is. */
  dekking: number | null;
}

/**
 * Het soort claim, met de terugval voor audits van vóór 0091.
 *
 * `bedrijfsspecifiek` als terugval, en dat is hier bewust de STRENGE kant,
 * anders dan bij `belangVan()`. Reden: dit veld bepaalt of we bewijs eisen, en
 * een oude claim waarvan we het soort niet weten, is een claim waarvan we niet
 * weten of hij verzonnen is. Bij twijfel bewijs eisen kost de ondernemer dertig
 * seconden nakijken; niet eisen kost hem zijn geloofwaardigheid. Dat is dezelfde
 * afweging die de feitelijkheidsbeoordelaar in `content-panel.ts` maakt.
 */
export function claimSoortVan(claim: AuditedClaim): "bedrijfsspecifiek" | "controleerbaar" | "algemeen" {
  const ruw = (claim as { claimClass?: string }).claimClass;
  if (ruw === "controleerbaar" || ruw === "algemeen") return ruw;
  return "bedrijfsspecifiek";
}

/**
 * Is deze bewering onderbouwd door de feitenkaart zoals hij NU is?
 *
 * ── ⚠️ WAAROM DIT NIET GEWOON `isSupported()` IS ────────────────────────────
 *
 * Een F-nummer is een POSITIE en geen identiteit: "F3" betekent "het derde
 * citeerbare feit op deze kaart" (`numberFacts` in factcard.ts). De kaart is
 * gesorteerd op betrouwbaarheid, met de klantantwoorden vooraan
 * (`SOURCE_ORDER`), dus zodra de klant één vraag beantwoordt schuift élk
 * volgend nummer één op.
 *
 * De claim-audit is bevroren op het moment van de briefing, dus vóór die
 * antwoorden. Zijn `sourceRef` opnieuw opzoeken op de HUIDIGE kaart wijst
 * daarna naar een ander feit. De citaatplicht in `isSupported()` vangt dat op
 * (het citaat staat dan niet in dat andere feit), maar de uitkomst is dan
 * "onbewezen" terwijl het bewijs er gewoon is. Voor de schrijfprompt is dat
 * hooguit jammer; voor een BLOKKADE is het onacceptabel, want dan houdt de app
 * een pagina tegen om een nummer dat verschoven is.
 *
 * Daarom twee stappen, en de tweede is de vangnetstap:
 *
 *   1. de strenge, positiegebonden controle (`isSupported`), zoals overal;
 *   2. staat het letterlijke citaat in ÉÉN van de bruikbare feiten op de
 *      huidige kaart, ongeacht welk nummer dat feit heeft?
 *
 * Stap 2 is losser dan stap 1 en dat is hier precies goed: blokkeren mag alleen
 * als er nergens bewijs is, niet als het bewijs verhuisd is.
 *
 * ⚠️ Een feit met `allowed: false` telt nooit mee. Dat is een VERBOD (de klant
 * heeft dit ontkend), en een verbod onderbouwt niets.
 */
export function claimIsOnderbouwd(
  claim: Pick<AuditedClaim, "sourceRef" | "supportQuote">,
  facts: readonly FactItem[],
): boolean {
  if (isSupported(claim.sourceRef, facts as FactItem[], claim.supportQuote)) return true;

  const citaat = (claim.supportQuote ?? "").trim();
  if (citaat.length < MIN_CITAAT_TEKENS) return false;

  const genormaliseerd = normalizeForQuote(citaat);
  return facts.some(
    (f) => f.allowed && f.citable && normalizeForQuote(f.text).includes(genormaliseerd),
  );
}

/**
 * Een citaat korter dan dit wijst niets aan.
 *
 * Zelfde grens als `MIN_QUOTE_CHARS` in `factcard.ts`, en om dezelfde reden:
 * een fragment van drie tekens komt in vrijwel elke tekst voor en zou elke
 * bewering onderbouwd laten lijken.
 */
const MIN_CITAAT_TEKENS = 4;

/**
 * Hoeveel van de bedrijfsspecifieke beweringen uit de claim-audit een bestaand
 * feit achter zich hebben.
 *
 * `isOnderbouwd` is standaard `claimIsOnderbouwd` tegen de meegegeven kaart. De
 * aanroeper mag hem overschrijven; de tests doen dat, zodat de telling los van
 * de dekkingscontrole te toetsen is.
 */
export function berekenClaimDekking(
  claims: readonly AuditedClaim[],
  isOnderbouwd: (claim: AuditedClaim) => boolean,
): ClaimDekking {
  const specifiek = claims.filter((c) => claimSoortVan(c) === "bedrijfsspecifiek");
  const onderbouwd = specifiek.filter((c) => isOnderbouwd(c));
  const kritiekOnbewezen = specifiek.filter((c) => c.importance === "kern" && !isOnderbouwd(c));

  return {
    bedrijfsspecifiek: specifiek.length,
    onderbouwd: onderbouwd.length,
    kritiekOnbewezen,
    dekking:
      specifiek.length === 0
        ? null
        : Math.round((onderbouwd.length / specifiek.length) * 1000) / 10,
  };
}

/**
 * De bewijsdimensie als cijfer van 0 tot 100.
 *
 * Kritieke dekking weegt dubbel ten opzichte van de gewogen dekking: een pagina
 * waarvan de kern staat en de randen niet, is bruikbaar; andersom niet. Ontbreekt
 * een van de twee (geen kernsectie, of geen merkgebonden sectie), dan telt alleen
 * wat er wel is; ontbreken ze allebei, dan is er niets te scoren en is het
 * antwoord `null` (conventie 3: geen 0 en geen gok).
 */
export function bewijsDimensie(
  dekking: GewogenDekking,
  /**
   * De dekking van de BEWERINGEN uit de claim-audit (R1, 3 september 2026).
   *
   * Naast de sectiedekking en niet in plaats daarvan: een sectie kan een feit
   * hebben terwijl de bewering die de pagina moet dragen er niet aan hangt. Dat
   * verschil was er wel en woog nergens in mee.
   */
  claimDekking?: ClaimDekking | null,
): number | null {
  const delen: { waarde: number; gewicht: number }[] = [];
  if (dekking.kritiek !== null) delen.push({ waarde: dekking.kritiek, gewicht: 2 });
  if (dekking.gewogen !== null) delen.push({ waarde: dekking.gewogen, gewicht: 1 });
  if (claimDekking?.dekking !== null && claimDekking?.dekking !== undefined) {
    delen.push({ waarde: claimDekking.dekking, gewicht: 2 });
  }
  if (delen.length === 0) return null;
  const som = delen.reduce((t, d) => t + d.waarde * d.gewicht, 0);
  const gewicht = delen.reduce((t, d) => t + d.gewicht, 0);
  return Math.round((som / gewicht) * 10) / 10;
}

/**
 * De graad die de inputpoort moet wegen
 * (punt 5 van de opdracht: maak de drempels van 70 en 40 niet blind leidend).
 *
 * ── DE REGEL ────────────────────────────────────────────────────────────────
 *
 * Een pagina met 90 procent dekking waarvan de kernsectie ontbreekt, is
 * slechter af dan een pagina met 60 procent waarvan de kern staat. Staat de kern
 * niet volledig, dan zakt de graad daarom onder `GOED_GENOEG`: deze pagina mag
 * nooit als "schrijven zonder voorbehoud" gelden, hoe hoog de rest ook scoort.
 *
 * ── ⚠️ EN WAAROM HIJ NIET NAAR NUL ZAKT ─────────────────────────────────────
 *
 * De eerste vorm hiervan gaf gewoon de kritieke dekking terug. Bij één
 * kernsectie is dat 0 of 100, en dan wordt de poort een schakelaar: één sectie
 * zonder feit hield de hele pagina tegen. Dat is precies de muur die
 * `release-panel.tsx` verbiedt ("een gate die je niet kunt passeren levert
 * afgehaakte klanten op in plaats van betere content"), en het klopt ook
 * inhoudelijk niet: de rest van de pagina is er nog steeds.
 *
 * Nu is het een plafond in plaats van een vervanging. De pagina komt in de
 * waarschuwingsstand terecht, de melding zegt welke kernsectie het is en wat het
 * kost, en de drie uitwegen blijven bestaan. Zakt de dekking daarnaast ook nog
 * onder de 40, dan houdt de poort hem alsnog tegen, en dat is dan om de gewone
 * reden en niet om deze.
 */
export function poortGraad(dekking: GewogenDekking): number | null {
  const basis = dekking.gewogen ?? dekking.graad;
  if (basis === null) return null;
  if (dekking.kritiek !== null && dekking.kritiek < 100) {
    return Math.min(basis, GOED_GENOEG - 1);
  }
  return basis;
}

/**
 * De beweringen in de GESCHREVEN tekst die over het bedrijf gaan en geen
 * bestaand F-nummer hebben.
 *
 * Losgetrokken van `sourceCoverage()` omdat die de dekking als percentage
 * teruggeeft en dit de lijst nodig heeft: elke onbewezen bewering wordt een
 * bevinding met de zin erin, en een percentage is geen zin.
 */
export function onbewezenBeweringen(
  claims: readonly WrittenClaim[],
  isOnderbouwd: (claim: WrittenClaim) => boolean,
): WrittenClaim[] {
  return claims.filter((c) => !isOnderbouwd(c));
}
