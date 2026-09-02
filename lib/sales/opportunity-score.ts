/**
 * De GEO Opportunity Score (`docs/tasks/geo-prospect-engine.md` hoofdstuk 13).
 *
 * ── ÉÉN GETAL, EN HET KOMT NOOIT UIT EEN MODEL ──────────────────────────────
 *
 * "De score is nooit een modeluitvoer. Hij wordt gerekend, zodat hij uitlegbaar,
 * testbaar en aanpasbaar is." Elke component wordt apart opgeslagen, want zonder
 * de componenten is achteraf niet te achterhalen welk signaal voorspelde (plan
 * hoofdstuk 19). Dat is wat de leerlus later mogelijk maakt: dezelfde signalen,
 * maar gewogen op basis van wat historisch werkte in plaats van op basis van wat
 * wij dachten.
 *
 * ── WAT DEZE SCORE BEWUST NIET DOET (plan 13.2) ─────────────────────────────
 *
 * **Niet sorteren op laagste zichtbaarheid.** Dat is de fout die het hele systeem
 * onbruikbaar zou maken (plan hoofdstuk 2). Een bedrijf dat nul keer genoemd
 * wordt kan een eenmanszaak zijn zonder budget, zonder website en zonder ambitie.
 * Een marktleider die één dure intentie mist, is commercieel interessanter. Dat
 * verschil zit in "commerciële relevantie" en "verbeterbaarheid", en die twee
 * samen wegen 30 van de 100.
 *
 * **Niet vertrouwen op één signaal.** Vandaar zeven componenten en niet één.
 *
 * **Niet doen alsof het precies is.** Naast de score staat een `confidence`, en
 * bij lage confidence hoort het scherm dat te tonen. Conventie 3.
 */
import type { BedrijfMeting, Kans, KansType } from "@/lib/sales/opportunity";

/**
 * De gewichten uit plan 13.1.
 *
 * ⚠️ Ze staan hier als constanten bij elkaar zodat kalibratie één plek is (plan
 * 13.3). Na de eerste echte markt kijkt New business naar de top tien en de
 * bodem tien en zegt per bedrijf of hij het eens is; elke afwijking is een
 * kalibratiepunt en verandert een getal in deze tabel.
 */
export const GEWICHTEN = {
  kansgrootte: 25,
  bewijssterkte: 20,
  commercieel: 20,
  scherpte: 15,
  verbeterbaarheid: 10,
  concurrentiedruk: 10,
} as const;

/** De bonus voor een aantoonbare, recente daling (plan 13.1). */
export const BEWEGING_BONUS = 10;

/**
 * Hoe scherp is elk type als haak? (plan 13.1, component "scherpte")
 *
 * "Type 5 en 3 zijn scherper dan type 1, want ze zijn specifiek en
 * verifieerbaar." Een specifieke observatie waar de ondernemer zelf ja of nee op
 * kan zeggen, opent een gesprek; een algemene constatering nodigt uit tot
 * wegwuiven.
 */
export const SCHERPTE: Record<KansType, number> = {
  information_gap: 1,
  intent_gap: 0.95,
  verlies: 0.9,
  concurrent_gap: 0.8,
  source_gap: 0.55,
  engine_gap: 0.5,
  sterk_met_zwakke_plek: 0.45,
  onzichtbaar: 0.3,
};

export interface ScoreInvoer {
  bedrijf: BedrijfMeting;
  /** Alle gedetecteerde kansen, en de primaire eruit. */
  kansen: Kans[];
  primair: Kans;
  /** Het gemiddelde gewogen aandeel van de markt: de lat waar tegen af te zetten. */
  marktGemiddelde: number;
  /** Heeft dit bedrijf een vindbaar contactadres of telefoonnummer? */
  heeftContactgegevens: boolean;
  /** `zzp`, `klein`, `middel`, `groot` of `onbekend`. */
  sizeSignal: string;
  /** Staat dit bedrijf permanent uit? Dan is de score nul, hoe groot de kans ook is. */
  doNotContact: boolean;
  /** Eerder benaderd en afgewezen binnen twaalf maanden? Ook nul. */
  eerderAfgewezen: boolean;
}

export interface ScoreUitkomst {
  score: number;
  tier: "hoog" | "gemiddeld" | "laag";
  confidence: "hoog" | "middel" | "laag";
  /** Elke component apart, want zonder de componenten is de score niet uit te leggen. */
  breakdown: Record<string, number>;
}

/** Boven deze score is een kans warm, eronder lauw (plan §5.2, drie temperaturen). */
export const TIER_HOOG = 70;
export const TIER_GEMIDDELD = 45;

/**
 * Hoeveel vragen er onder een conclusie moeten liggen voordat we hem zeker
 * durven noemen.
 *
 * Twintig antwoorden is de helft van een volle ronde op één engine. Daaronder is
 * elk percentage een schatting met een brede band eromheen, en dat hoort de
 * verkoper te weten vóórdat hij belt.
 */
const ZEKER_VANAF = 20;
const ONZEKER_ONDER = 10;

export function rekenScore(invoer: ScoreInvoer): ScoreUitkomst {
  const { bedrijf, kansen, primair } = invoer;

  // ── De uitsluitingen gaan vóór alles ─────────────────────────────────────
  //
  // Plan 13.1, laatste alinea: `do_not_contact` en een afwijzing binnen twaalf
  // maanden zetten de score op NUL in plaats van hem te verlagen. Een score van
  // 30 op een bedrijf dat zich heeft afgemeld, staat nog steeds in de lijst en
  // wordt uiteindelijk toch gebeld.
  if (invoer.doNotContact || invoer.eerderAfgewezen) {
    return {
      score: 0,
      tier: "laag",
      confidence: "hoog",
      breakdown: {
        uitgesloten: 1,
        reden_afgemeld: invoer.doNotContact ? 1 : 0,
        reden_afgewezen: invoer.eerderAfgewezen ? 1 : 0,
      },
    };
  }

  const breakdown: Record<string, number> = {};

  // ── Kansgrootte: hoeveel valt er te winnen ───────────────────────────────
  //
  // Het verschil met het marktgemiddelde, en niet de afstand tot 100%. Tegen
  // 100% afzetten zou betekenen dat élk bedrijf in élke markt een enorme kans
  // heeft, want geen enkel bedrijf wordt bij alle vragen genoemd.
  const teWinnen = Math.max(0, invoer.marktGemiddelde - bedrijf.alle.weightedShare);
  const kansgrootte =
    invoer.marktGemiddelde > 0 ? Math.min(1, teWinnen / invoer.marktGemiddelde) : 0;
  breakdown.kansgrootte = rond(kansgrootte * GEWICHTEN.kansgrootte);

  // ── Bewijssterkte: hoeveel vragen dragen dit ─────────────────────────────
  const antwoorden = bedrijf.alle.questionsTotal;
  const bewijs = Math.min(1, antwoorden / (ZEKER_VANAF * 2));
  breakdown.bewijssterkte = rond(bewijs * GEWICHTEN.bewijssterkte);

  // ── Commerciële relevantie: kan dit bedrijf klant worden ─────────────────
  //
  // ⚠️ DIT IS DE COMPONENT DIE HOOFDSTUK 2 AFDWINGT. Zonder deze weging staat de
  // eenmanszaak zonder website bovenaan, want die is het onzichtbaarst. Met deze
  // weging staat het professionele bedrijf dat één dure intentie mist bovenaan,
  // en dat is de prospect die het gesprek begrijpt.
  const commercieel = commercieleRelevantie(invoer);
  breakdown.commercieel = rond(commercieel * GEWICHTEN.commercieel);

  // ── Scherpte van de haak ─────────────────────────────────────────────────
  breakdown.scherpte = rond(SCHERPTE[primair.type] * GEWICHTEN.scherpte);

  // ── Verbeterbaarheid: kunnen wij dit plausibel oplossen ──────────────────
  //
  // Er is content om op te bouwen (de crawl vond secties), en de dienst bestaat
  // al. Een bedrijf zonder enige pagina is niet onmogelijk te helpen, maar het
  // is een ander en langer traject, en dat hoort de score te zeggen.
  const verbeterbaar = Math.min(1, bedrijf.secties.length / 8);
  breakdown.verbeterbaarheid = rond(verbeterbaar * GEWICHTEN.verbeterbaarheid);

  // ── Concurrentiedruk: is er een naam om tegenover te zetten ──────────────
  //
  // "Een zichtbaar verschil met een genoemde concurrent verkoopt beter dan een
  // abstract gat" (plan 13.1). Vandaar dat dit aan de aanwezigheid van een
  // rivaal hangt en niet aan de grootte van het verschil: de naam is het punt.
  const heeftRivaal = kansen.some((k) => k.rivalCompanyId);
  breakdown.concurrentiedruk = heeftRivaal ? GEWICHTEN.concurrentiedruk : 0;

  // ── De bonus voor recente beweging ───────────────────────────────────────
  //
  // Alleen als er twee rondes zijn en de daling buiten de marge valt. Dat is
  // precies de voorwaarde die `detecteerVerlies()` al toetst, dus de bonus hangt
  // aan de aanwezigheid van dat type en niet aan een tweede rekensom die er net
  // anders over kan denken.
  const verlies = kansen.find((k) => k.type === "verlies");
  breakdown.beweging = verlies ? BEWEGING_BONUS : 0;

  // ── De aftrek ────────────────────────────────────────────────────────────
  //
  // Geen website en geen contactgegevens zijn geen kleine minpunten: ze bepalen
  // of er überhaupt een gesprek mogelijk is. Aftrek en geen ontbrekende
  // optelling, zodat de reden zichtbaar in de opbouw staat.
  let aftrek = 0;
  if (!bedrijf.domein) aftrek += 15;
  if (!invoer.heeftContactgegevens) aftrek += 10;
  breakdown.aftrek = -aftrek;

  const ruw =
    breakdown.kansgrootte +
    breakdown.bewijssterkte +
    breakdown.commercieel +
    breakdown.scherpte +
    breakdown.verbeterbaarheid +
    breakdown.concurrentiedruk +
    breakdown.beweging -
    aftrek;

  const score = Math.max(0, Math.min(100, Math.round(ruw)));

  return {
    score,
    tier: score >= TIER_HOOG ? "hoog" : score >= TIER_GEMIDDELD ? "gemiddeld" : "laag",
    confidence: bepaalConfidence(invoer),
    breakdown,
  };
}

/**
 * Kan dit bedrijf klant worden?
 *
 * Vier signalen, en geen ervan is doorslaggevend. Een eenmanszaak met een goede
 * site is een betere prospect dan een middelgroot bedrijf zonder enige
 * webaanwezigheid, en andersom.
 */
function commercieleRelevantie(invoer: ScoreInvoer): number {
  const { bedrijf } = invoer;
  let punten = 0;

  // Omvang. `onbekend` krijgt het middenpad en niet de bodem: conventie 3, een
  // onbekende omvang is niet hetzelfde als een kleine omvang.
  const omvang: Record<string, number> = {
    groot: 1,
    middel: 0.9,
    klein: 0.6,
    onbekend: 0.5,
    zzp: 0.35,
  };
  punten += (omvang[invoer.sizeSignal] ?? 0.5) * 0.4;

  // Een site die meer is dan een visitekaartje.
  punten += Math.min(1, bedrijf.secties.length / 10) * 0.3;

  // Bereikbaarheid: zonder contactgegevens is er geen gesprek.
  punten += invoer.heeftContactgegevens ? 0.2 : 0;

  // Een eigen domein. Het scheelt weinig punten en het zegt veel: een bedrijf
  // zonder website is aantoonbaar bestaand en volledig onzichtbaar, maar het is
  // ook een bedrijf dat nog nergens aan kan bouwen.
  punten += bedrijf.domein ? 0.1 : 0;

  return Math.min(1, punten);
}

/**
 * Hoe zeker is dit oordeel? (plan 13.2, derde punt)
 *
 * Twee dingen bepalen het: hoeveel antwoorden eronder liggen, en of het primaire
 * type op bewijs rust dat je kunt aanwijzen. Een onzichtbaar bedrijf heeft per
 * definitie geen fragmenten, en dat maakt het oordeel niet fout maar wel minder
 * hard.
 */
function bepaalConfidence(invoer: ScoreInvoer): "hoog" | "middel" | "laag" {
  const antwoorden = invoer.bedrijf.alle.questionsTotal;
  if (antwoorden < ONZEKER_ONDER) return "laag";

  const heeftBewijs = invoer.primair.antwoorden.length > 0;
  if (antwoorden >= ZEKER_VANAF && heeftBewijs) return "hoog";
  return "middel";
}

function rond(waarde: number): number {
  return Number(waarde.toFixed(2));
}

// ── Gelijke scores: eerlijk zijn in plaats van precies doen ────────────────

/**
 * Hoeveel bedrijven delen de hoogste score, en welke score is dat?
 *
 * ⚠️ **Dit lost geen rekenprobleem op maar een eerlijkheidsprobleem** (bevinding
 * P1-9 van 1 september 2026). Bij de eerste echte markt stonden er zeven
 * bedrijven op exact 76, met exact dezelfde opbouw. Dat was geen fout in de
 * formule: de meting gaf over die zeven precies hetzelfde beeld, namelijk nul
 * vermeldingen op veertig vragen. Elke formule geeft dan hetzelfde cijfer.
 *
 * Wat er wél fout was, is dat het scherm die zeven onder elkaar zette alsof de
 * bovenste de beste was. Een verkoper begint dan bovenaan en denkt dat daar een
 * reden voor is. Deze functie levert het cijfer waarmee het scherm kan zeggen
 * hoeveel bedrijven er gelijk staan, zodat hij zelf kan kiezen op iets wat hij
 * wél weet.
 */
export function grootsteGelijkspel(scores: readonly number[]): {
  score: number | null;
  aantal: number;
} {
  const teller = new Map<number, number>();
  for (const s of scores) teller.set(s, (teller.get(s) ?? 0) + 1);

  let score: number | null = null;
  let aantal = 0;
  for (const [waarde, keer] of teller) {
    // Bij gelijk aantal wint de hoogste score: dat is de groep die bovenaan
    // staat, en dus de groep waar de verkoper als eerste in kijkt.
    if (keer > aantal || (keer === aantal && score !== null && waarde > score)) {
      score = waarde;
      aantal = keer;
    }
  }

  return aantal >= 2 ? { score, aantal } : { score: null, aantal: 0 };
}

/**
 * De volgorde binnen dezelfde score, zodat de lijst niet willekeurig schuift.
 *
 * Bewijssterkte eerst (op hoeveel vragen rust de conclusie), dan of het bedrijf
 * klant kan worden, dan de naam. Geen van drieën maakt de score anders; ze maken
 * de VOLGORDE herhaalbaar, en dat is precies wat ontbrak toen zeven bedrijven
 * hetzelfde cijfer hadden.
 */
export function vergelijkKansen(
  a: { score: number; breakdown?: Record<string, number> | null; naam: string },
  b: { score: number; breakdown?: Record<string, number> | null; naam: string },
): number {
  if (b.score !== a.score) return b.score - a.score;

  const bewijsA = Number(a.breakdown?.bewijssterkte ?? 0);
  const bewijsB = Number(b.breakdown?.bewijssterkte ?? 0);
  if (bewijsB !== bewijsA) return bewijsB - bewijsA;

  const commA = Number(a.breakdown?.commercieel ?? 0);
  const commB = Number(b.breakdown?.commercieel ?? 0);
  if (commB !== commA) return commB - commA;

  return a.naam.localeCompare(b.naam, "nl");
}
