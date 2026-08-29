/**
 * De twee assen waarop een marktmeting gebouwd wordt
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 10).
 *
 * ── WAAROM DIT DE KERN VAN SPRINT 3 IS ──────────────────────────────────────
 *
 * "Een lijst willekeurige prompts levert een cijfer op waar niemand iets aan
 * heeft." Het verschil tussen een cijfer en een verkoopargument staat in twee
 * zinnen van plan 10.2:
 *
 *   zonder intentielabel:  "Je scoort 18 van 40"
 *   met intentielabel:     "Bij de negen vragen over aankoopbegeleiding word je
 *                           nul keer genoemd"
 *
 * De eerste zin is een score waar een ondernemer niets mee kan. De tweede is een
 * gesprek. Alles in dit bestand bestaat om de tweede mogelijk te maken.
 *
 * ── EN WAAROM HET GEWICHT HIER STAAT EN NIET IN DE PROMPT ───────────────────
 *
 * Conventie 2: rekenkunde hoort in een pure module zonder `server-only`, anders
 * is hij niet te testen vanuit `scripts/test-unit.ts`. Het model stelt de
 * intenties vóór; het gewicht dat eruit volgt is een rekensom die wij maken, en
 * die is te controleren, te kalibreren en te verantwoorden tegenover een
 * prospect die het narekent.
 */

/**
 * As 1: de klantreisfase (plan 10.1).
 *
 * Vier fases, en de volgorde is de volgorde van de klantreis zelf. Die volgorde
 * doet er toe: de vragenverdeling hieronder leunt erop, en de schermen tonen ze
 * in deze volgorde omdat een lezer een trechter verwacht en geen alfabet.
 */
export const INTENT_STAGES = ["orientatie", "vergelijken", "selecteren", "contact"] as const;
export type IntentStage = (typeof INTENT_STAGES)[number];

/** Wat een salesmedewerker leest per fase. Geen jargon (`docs/schrijfstijl.md`). */
export const STAGE_LABEL: Record<IntentStage, string> = {
  orientatie: "Oriëntatie",
  vergelijken: "Vergelijken",
  selecteren: "Selecteren",
  contact: "Contact opnemen",
};

export const STAGE_HELP: Record<IntentStage, string> = {
  orientatie: "Iemand verkent het onderwerp en weet nog niet wat hij zoekt.",
  vergelijken: "Iemand weegt aanbieders of aanpakken tegen elkaar af.",
  selecteren: "Iemand kiest, en zoekt de partij die het beste past.",
  contact: "Iemand wil iemand spreken en zoekt wie hij belt.",
};

/**
 * Hoe zwaar telt een fase mee?
 *
 * ⚠️ **Dit is een keuze en geen meting**, net als de verhouding 1 : 0,5 : 0,2 in
 * `lib/pipeline/volume.ts`. Bewust grofmazig: fijnere verhoudingen zouden een
 * precisie suggereren die er niet is (conventie 3, en plan 10.3 zegt hetzelfde
 * over frequentieschattingen).
 *
 * De verhouding volgt de koopbeslissing. Een vraag in de selecteerfase gaat over
 * wie de opdracht krijgt; een oriënterende vraag gaat over of iemand er ooit aan
 * begint. Dat scheelt commercieel een factor vier, en dat is precies waarom
 * "onzichtbaar bij oriëntatie" een ander gesprek is dan "onzichtbaar bij
 * selecteren".
 *
 * Contact staat iets onder selecteren en niet erboven: wie belt heeft de keuze
 * meestal al gemaakt, en dan is de AI niet meer de partij die hem stuurt.
 */
export const STAGE_WEIGHT: Record<IntentStage, number> = {
  orientatie: 0.25,
  vergelijken: 0.6,
  selecteren: 1.0,
  contact: 0.8,
};

/**
 * As 2: de commerciële intentie (plan 10.1).
 *
 * Deze lijst is per markt anders (bij makelaars: verkoopbegeleiding,
 * aankoopbegeleiding, taxatie, expats, starters) en wordt daarom voorgesteld
 * door een onderzoeksstap en bijgesteld door de admin bij poort 2.
 */
export interface Intentie {
  /** Het etiket dat op elke vraag terechtkomt, kleingeschreven en zonder spaties. */
  label: string;
  /** Wat een salesmedewerker leest. */
  naam: string;
  /** Waarom deze intentie commercieel telt, in één zin. */
  uitleg: string;
  /**
   * Hoe waardevol één opdracht uit deze intentie is: `hoog`, `midden`, `laag`.
   *
   * ⚠️ Drie banden en geen bedrag. Een bedrag zou een precisie suggereren die
   * niemand heeft, en het zou in een verkoopmail terechtkomen waar de prospect
   * het naast zijn eigen cijfers legt.
   */
  waarde: WaardeBand;
  /**
   * Hoe vaak deze intentie voorkomt, geschat.
   *
   * ⚠️ **Een schatting en niets meer** (plan 10.3). Echte zoekvolumes zijn in
   * ORBIT ENGINE bewust niet gebouwd, dus dit veld draagt het woord "schatting"
   * mee tot op het scherm.
   */
  frequentie: WaardeBand;
}

export const WAARDE_BANDEN = ["hoog", "midden", "laag"] as const;
export type WaardeBand = (typeof WAARDE_BANDEN)[number];

export function isWaardeBand(waarde: unknown): waarde is WaardeBand {
  return typeof waarde === "string" && (WAARDE_BANDEN as readonly string[]).includes(waarde);
}

export function isIntentStage(waarde: unknown): waarde is IntentStage {
  return typeof waarde === "string" && (INTENT_STAGES as readonly string[]).includes(waarde);
}

/** Dezelfde verhouding als bij de volumebanden: grofmazig, en dat is met opzet. */
export const BAND_FACTOR: Record<WaardeBand, number> = {
  hoog: 1.0,
  midden: 0.5,
  laag: 0.2,
};

/**
 * Ondergrens, zodat geen enkele vraag volledig wegvalt.
 *
 * Dezelfde reden als `MIN_WEIGHT` in `lib/pipeline/prompt-weight.ts`: een vraag
 * met gewicht 0 telt niet mee in de gewogen score en verdwijnt dan stil uit de
 * meting, terwijl hij wel betaald is.
 */
const MIN_GEWICHT = 0.02;

/**
 * Het gewicht van één vraag: fase × waarde × frequentie.
 *
 * Drie factoren, precies de drie die plan 10.3 noemt. De uitkomst loopt van
 * 0,01 (oriëntatie, lage waarde, lage frequentie) tot 1,0 (selecteren, hoge
 * waarde, hoge frequentie), en dat is de bandbreedte die je wilt: een factor
 * honderd tussen de minst en de meest waardevolle vraag.
 */
export function vraagGewicht(stage: IntentStage, waarde: WaardeBand, frequentie: WaardeBand): number {
  const ruw = STAGE_WEIGHT[stage] * BAND_FACTOR[waarde] * BAND_FACTOR[frequentie];
  return Math.max(MIN_GEWICHT, Number(ruw.toFixed(4)));
}

/**
 * Hoeveel vragen krijgt een markt?
 *
 * ⚠️ **Dit is de kostenknop van de hele module** (plan 21.1). Niet het aantal
 * bedrijven: dertig bedrijven meten kost precies evenveel als drie, want er
 * wordt per VRAAG betaald en de bedrijven worden uit hetzelfde antwoord gehaald.
 * Vandaar dat het aantal vragen begrensd is en het aantal bedrijven niet.
 */
export const VRAGEN_STANDAARD = 40;
export const VRAGEN_MIN = 10;
export const VRAGEN_MAX = 60;

/**
 * Hoeveel intenties zijn bruikbaar?
 *
 * Onder de drie is de intentie-as geen as maar een etiket, en dan bestaat
 * opportunitytype 3 (intent gap) niet. Boven de acht wordt elke intentie zo dun
 * gemeten dat het verschil tussen twee intenties binnen de marge valt, en een
 * verschil binnen de marge is geen verschil (plan hoofdstuk 12).
 */
export const INTENTIES_MIN = 3;
export const INTENTIES_MAX = 8;

/**
 * Hoeveel vragen per intentie zijn er minimaal nodig om er iets over te durven
 * zeggen?
 *
 * Bij drie vragen is "nul van de drie" nog toeval; bij vijf is het een patroon.
 * Deze grens wordt in sprint 4 opnieuw gebruikt bij de detectie van
 * opportunitytype 3, en hij staat hier zodat de vragenverdeling en de detectie
 * niet ieder hun eigen minimum kunnen krijgen.
 */
export const MIN_VRAGEN_PER_INTENTIE = 5;

export interface VerdeeldeVraag {
  intentLabel: string;
  stage: IntentStage;
  weight: number;
}

/**
 * Het kruis van de twee assen: welke vraag-plekken vult de vragenstap in?
 *
 * ── WAAROM DE VERDELING HIER GEMAAKT WORDT EN NIET DOOR HET MODEL ───────────
 *
 * Conventie 1. Vraag je een model "verdeel veertig vragen over zes intenties en
 * vier fases", dan krijg je zesendertig vragen, of veertig waarvan er elf over
 * dezelfde intentie gaan. Dat is geen slordigheid van het model maar de aard van
 * de opdracht: tellen is geen taalwerk. De verdeling is hier dus een rekensom,
 * en het model vult alleen de tekst in van de plekken die eruit komen.
 *
 * ── DE VERDELING ZELF ───────────────────────────────────────────────────────
 *
 * Elke intentie krijgt evenveel vragen, want een intentie die maar twee vragen
 * krijgt kan geen intent gap dragen. Binnen een intentie volgt de verdeling over
 * de fases de trechter: meer vragen waar de koopbeslissing valt, want dáár moet
 * het cijfer scherp zijn. De rest van de deling gaat naar de zwaarste fases,
 * niet naar de eerste in de lijst.
 */
export function verdeelVragen(intenties: Intentie[], aantal: number): VerdeeldeVraag[] {
  if (intenties.length === 0 || aantal <= 0) return [];

  // De verdeling over de fases binnen één intentie. Vier plekken, en de
  // volgorde bepaalt wie de rest van de deling krijgt: eerst selecteren, dan
  // vergelijken, dan contact, dan oriëntatie.
  const fasevolgorde: IntentStage[] = ["selecteren", "vergelijken", "contact", "orientatie"];

  const perIntentie = Math.floor(aantal / intenties.length);
  let rest = aantal - perIntentie * intenties.length;

  const uit: VerdeeldeVraag[] = [];
  for (const intentie of intenties) {
    // De rest verdelen over de eerste intenties, zodat het totaal exact klopt.
    // Eén vraag verschil per intentie valt binnen de ruis; een totaal dat niet
    // klopt met de kostenraming bij poort 2 niet.
    const nu = perIntentie + (rest > 0 ? 1 : 0);
    if (rest > 0) rest -= 1;

    for (let i = 0; i < nu; i++) {
      const stage = fasevolgorde[i % fasevolgorde.length];
      uit.push({
        intentLabel: intentie.label,
        stage,
        weight: vraagGewicht(stage, intentie.waarde, intentie.frequentie),
      });
    }
  }
  return uit;
}

/**
 * Een label dat als etiket bruikbaar is: kleingeschreven, streepjes, geen
 * accenten.
 *
 * Hetzelfde probleem als bij de merknamen in `lib/entities/normalize.ts`:
 * "Aankoopbegeleiding" en "aankoopbegeleiding " zijn hetzelfde etiket, en als ze
 * dat niet zijn, telt de intent gap ze als twee intenties met elk de helft van
 * de vragen.
 */
export function normaliseerLabel(ruw: string): string {
  return ruw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export interface IntentieOordeel {
  intenties: Intentie[];
  /** Wat er weggevallen is en waarom. Leeg als er niets afviel. */
  meldingen: string[];
}

/**
 * De voorgestelde intenties opschonen (conventie 1, het vangnet in code).
 *
 * Vier dingen die het model doet en die hier stilgezet worden: dubbele labels,
 * lege namen, een onbekende band, en meer intenties dan er te meten zijn. Het
 * laatste is de belangrijkste: het model levert er graag twaalf, en twaalf
 * intenties op veertig vragen betekent drie vragen per intentie. Dan valt elk
 * verschil tussen twee intenties binnen de marge en is de hele as waardeloos.
 */
export function schoonIntenties(ruw: unknown[], maxVragen: number): IntentieOordeel {
  const meldingen: string[] = [];
  const gezien = new Set<string>();
  const uit: Intentie[] = [];

  for (const item of ruw) {
    const r = (item ?? {}) as Record<string, unknown>;
    const naam = String(r.naam ?? "").trim();
    if (naam.length < 2) continue;

    const label = normaliseerLabel(String(r.label ?? naam));
    if (!label || gezien.has(label)) continue;
    gezien.add(label);

    uit.push({
      label,
      naam,
      uitleg: String(r.uitleg ?? "").trim(),
      // Onbekend wordt `midden` en niet `hoog`: conventie 3, een gok naar boven
      // zet een intentie bovenaan de vragenlijst op grond van niets.
      waarde: isWaardeBand(r.waarde) ? r.waarde : "midden",
      frequentie: isWaardeBand(r.frequentie) ? r.frequentie : "midden",
    });
  }

  // Hoeveel intenties passen er in dit aantal vragen? Elke intentie heeft
  // minstens vijf vragen nodig om iets te kunnen betekenen.
  const passend = Math.max(INTENTIES_MIN, Math.floor(maxVragen / MIN_VRAGEN_PER_INTENTIE));
  const grens = Math.min(INTENTIES_MAX, passend);

  if (uit.length > grens) {
    // Wat eruit gaat, gaat eruit op waarde en frequentie samen, en dat wordt
    // hardop gezegd. Een intentie die stil verdwijnt komt bij de volgende ronde
    // terug als "nieuw", terwijl hij gewoon niet gemeten is.
    uit.sort(
      (a, b) =>
        BAND_FACTOR[b.waarde] * BAND_FACTOR[b.frequentie] -
        BAND_FACTOR[a.waarde] * BAND_FACTOR[a.frequentie],
    );
    const weg = uit.splice(grens).map((i) => i.naam);
    meldingen.push(
      `${weg.length} ${weg.length === 1 ? "intentie is" : "intenties zijn"} niet meegenomen, ` +
        `want met ${maxVragen} vragen blijven er anders te weinig vragen per intentie over: ` +
        `${weg.join(", ")}.`,
    );
  }

  return { intenties: uit, meldingen };
}

/**
 * De vraag aan het model, apart zodat `scripts/test-unit.ts` hem kan nalezen.
 *
 * Wat er in moet, en waarom elk stuk erin staat:
 *
 * - **De markt zelf**, want een intentie is per plaats anders: een makelaar in
 *   Amsterdam heeft expats, een makelaar in Emmen niet.
 * - **De diensten van de gecrawlde sites**, want dat is wat déze markt
 *   aanbiedt en niet wat de branche landelijk aanbiedt.
 * - **De opdracht om er hooguit acht te noemen**, want meer intenties dan
 *   vragen per intentie levert een as op waar niets uit te concluderen valt.
 */
export function bouwIntentieVraag(
  markt: { label: string; industry: string; location: string; radius_km: number },
  secties: string[],
): string {
  return [
    `Markt: ${markt.label}`,
    `Branche: ${markt.industry}`,
    `Plaats: ${markt.location}, binnen ${markt.radius_km} km`,
    "",
    secties.length > 0
      ? "Dit zijn de onderwerpen die op de websites van de bedrijven in deze markt terugkomen. " +
        "Gebruik ze als bewijs van wat er in deze markt daadwerkelijk aangeboden wordt:\n" +
        secties.map((s) => `- ${s}`).join("\n")
      : "Er zijn geen websitegegevens beschikbaar van de bedrijven in deze markt. " +
        "Baseer je dan op de branche, en zeg in de kanttekening dat dit zonder websitegegevens is.",
    "",
    "Noem drie tot acht commerciële intenties in deze markt. Een intentie is een soort opdracht " +
      "waar iemand een aanbieder voor zoekt en waar geld in omgaat.",
    "Geef per intentie:",
    "- een label in kleine letters zonder spaties, bijvoorbeeld aankoopbegeleiding",
    "- een naam die een verkoper leest",
    "- één zin waarom deze intentie commercieel telt",
    "- hoe waardevol één opdracht is: hoog, midden of laag",
    "- hoe vaak deze intentie voorkomt: hoog, midden of laag. Dit is een schatting, " +
      "en als je het niet weet is midden het eerlijke antwoord.",
    "",
    "Noem geen intenties die niets opleveren, zoals algemene informatie of nieuws.",
  ]
    .filter(Boolean)
    .join("\n");
}
