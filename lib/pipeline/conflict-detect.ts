/**
 * Het feitenregister: soort en waarde per feit, kandidaat-conflicten, en de
 * regel wanneer een conflict een pagina tegenhoudt
 * (docs/tasks/contentpijplijn-publicatiewaardig.md, WP2, §6 en §8).
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * `planFactMerge()` ziet alleen tegenspraak tussen twee feiten met dezelfde
 * `fact_key`, en die sleutel komt uit de tekst. Twee zinnen over dezelfde prijs
 * in andere woorden krijgen verschillende sleutels en stonden allebei op de
 * kaart. Bij de rijschool schreef de schrijver toen "De beschikbare informatie
 * over de intakeprijs spreekt elkaar tegen" (§1.2, O4). Nagerekend was dat geen
 * tegenspraak maar verloren context: een intake op kantoor van € 50 en een in de
 * auto van € 80. Dit bestand vindt zulke paren op de INHOUD (zelfde soort, zelfde
 * geldigheid, andere waarde); het model (L2, `conflict-judge.ts`) beslist daarna
 * of het echt een conflict is of twee varianten.
 *
 * Puur (conventie 2): geen database en geen model, testbaar met de echte feiten.
 */

export const FEIT_SOORTEN = [
  "prijs",
  "termijn",
  "plaats",
  "werkgebied",
  "dienst",
  "product",
  "certificering",
  "garantie",
  "werkwijze",
  "cijfer",
  "openingstijd",
  "contact",
  "overig",
] as const;
export type FeitSoort = (typeof FEIT_SOORTEN)[number];

export type Stand = "bevestigd" | "site" | "onderzoek" | "betwist" | "vervangen";
export type Bewijskracht = "geen" | "gewoon" | "sterk";

/** De genormaliseerde waarde. Getallen óf tekst, nooit allebei leeg. */
export interface FeitWaarde {
  min?: number | null;
  max?: number | null;
  eenheid?: string | null;
  tekst?: string | null;
}

/** Een feit zoals het register het kent. */
export interface RegisterFeit {
  id: string;
  text: string;
  kind: string;
  factKey: string;
  soort: FeitSoort | null;
  waarde: FeitWaarde | null;
  geldtVoor: string | null;
  stand: Stand | null;
  bewijskracht: Bewijskracht | null;
  /** ISO-datum; alleen gebruikt om bij twee klantantwoorden het nieuwste te tonen. */
  createdAt?: string | null;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Het vangnet op L1: een getal moet in de feittekst staan
// ════════════════════════════════════════════════════════════════════════════

/**
 * Telwoorden die in de feiten van de proefklanten voorkomen ("Twaalf monteurs",
 * "een vaste ploeg van vijf man"). Zonder deze lijst zou het vangnet een juiste
 * waarde weggooien omdat het getal voluit geschreven staat.
 */
const TELWOORDEN: Record<string, number> = {
  een: 1, één: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9,
  tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16,
  zeventien: 17, achttien: 18, negentien: 19, twintig: 20, dertig: 30, veertig: 40,
  vijftig: 50, zestig: 60, zeventig: 70, tachtig: 80, negentig: 90, honderd: 100,
};

/**
 * Alle getallen in een tekst, in Nederlandse notatie: "€ 2.200" is 2200,
 * "4,9" is 4.9, "12.000" is 12000, "35+" is 35. Plus de telwoorden.
 */
export function getallenIn(tekst: string): number[] {
  const uit: number[] = [];
  for (const m of tekst.matchAll(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g)) {
    const ruw = m[0].replace(/\./g, "").replace(",", ".");
    const n = Number(ruw);
    if (Number.isFinite(n)) uit.push(n);
  }
  for (const woord of tekst.toLowerCase().split(/[^a-zà-ÿ]+/)) {
    if (woord in TELWOORDEN) uit.push(TELWOORDEN[woord]);
  }
  return uit;
}

/**
 * Conventie 1 en 3: wat het model als waarde opgeeft, geldt alleen als elk getal
 * erin letterlijk in de feittekst staat. Anders wordt de waarde `null`. Een
 * verzonnen of verkeerd overgenomen getal zou een conflict opleveren dat niet
 * bestaat, of er een verbergen dat wel bestaat.
 *
 * Een waarde zonder getallen en zonder tekst is ook `null`.
 */
export function veiligeWaarde(feitTekst: string, waarde: FeitWaarde | null | undefined): FeitWaarde | null {
  if (!waarde) return null;
  const getallen = getallenIn(feitTekst);
  const staatErin = (n: number | null | undefined) =>
    n == null || getallen.some((g) => Math.abs(g - n) < 1e-9);
  const min = typeof waarde.min === "number" && Number.isFinite(waarde.min) ? waarde.min : null;
  const max = typeof waarde.max === "number" && Number.isFinite(waarde.max) ? waarde.max : null;
  if (!staatErin(min) || !staatErin(max)) return null;
  const tekst = waarde.tekst?.trim() || null;
  if (min == null && max == null && !tekst) return null;
  return {
    min,
    max: max ?? min,
    eenheid: waarde.eenheid?.trim().toLowerCase() || null,
    tekst,
  };
}

/** De stand die een feit krijgt bij het indelen, uit de soort bron. */
export function standVanKind(kind: string): Stand {
  if (kind === "klant") return "bevestigd";
  if (kind === "site") return "site";
  return "onderzoek";
}

// ════════════════════════════════════════════════════════════════════════════
// 2. Kandidaat-conflicten
// ════════════════════════════════════════════════════════════════════════════

/**
 * Soorten waarbij een verschil in TEKST (en niet alleen in getal) al een
 * kandidaat oplevert. Bij een dienst of werkwijze zijn twee beschrijvingen
 * meestal twee kanten van hetzelfde (§8.2: "vaak twee beschrijvingen van
 * hetzelfde"); die zouden L2 alleen maar laten bevestigen dat het geen conflict
 * is. Bij een adres, een werkgebied of een openingstijd is een andere tekst wél
 * verdacht.
 */
const TEKST_VERGELIJKBAAR = new Set<FeitSoort>([
  "werkgebied",
  "openingstijd",
  "contact",
  "garantie",
  "certificering",
  "plaats",
]);

/** Geldigheid vergelijkbaar maken: kleine letters, zonder lidwoorden en leestekens. */
export function normaliseerGeldigheid(geldtVoor: string | null | undefined): string {
  return (geldtVoor ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ]+/g, " ")
    .split(" ")
    .filter((w) => w && !["de", "het", "een", "van", "voor"].includes(w))
    .join(" ");
}

function eenheidGelijk(a: FeitWaarde, b: FeitWaarde): boolean {
  const ea = (a.eenheid ?? "").replace(/[^a-z€]/g, "");
  const eb = (b.eenheid ?? "").replace(/[^a-z€]/g, "");
  const euro = (e: string) => (e === "€" || e === "euro" ? "eur" : e);
  return euro(ea) === euro(eb);
}

/**
 * Verschillen de twee waarden? `null` als ze niet te vergelijken zijn (andere
 * eenheid, het ene een getal en het andere tekst): dan is het geen kandidaat,
 * want "€ 12 per maand" en "€ 2.200 inclusief installatie" gaan niet over
 * hetzelfde.
 */
export function waardenVerschillen(soort: FeitSoort, a: FeitWaarde, b: FeitWaarde): boolean | null {
  const getalA = a.min != null;
  const getalB = b.min != null;
  if (getalA && getalB) {
    if (!eenheidGelijk(a, b)) return null;
    return a.min !== b.min || (a.max ?? a.min) !== (b.max ?? b.min);
  }
  if (getalA !== getalB) return null;
  if (!TEKST_VERGELIJKBAAR.has(soort)) return null;
  const ta = normaliseerGeldigheid(a.tekst);
  const tb = normaliseerGeldigheid(b.tekst);
  if (!ta || !tb) return null;
  return ta !== tb;
}

/** De sleutel van een paar: de twee `fact_key`s gesorteerd. Zie migratie 0113. */
export function paarSleutel(a: Pick<RegisterFeit, "factKey">, b: Pick<RegisterFeit, "factKey">): string {
  return [a.factKey, b.factKey].sort().join("|");
}

export interface Kandidaat {
  a: RegisterFeit;
  b: RegisterFeit;
  soort: FeitSoort;
  sleutel: string;
}

/**
 * Kandidaat-paren: zelfde soort, zelfde geldigheid, een andere waarde die te
 * vergelijken is. Een vervangen feit en de soort `overig` doen niet mee.
 *
 * Deterministisch gesorteerd (op sleutel), zodat een begrenzing op het aantal
 * te beoordelen paren bij elke run dezelfde paren kiest.
 */
export function vindKandidaten(feiten: readonly RegisterFeit[]): Kandidaat[] {
  const actief = feiten.filter(
    (f) => f.soort && f.soort !== "overig" && f.waarde && f.stand !== "vervangen",
  );
  const uit: Kandidaat[] = [];
  const gezien = new Set<string>();
  for (let i = 0; i < actief.length; i++) {
    for (let j = i + 1; j < actief.length; j++) {
      const a = actief[i];
      const b = actief[j];
      if (a.soort !== b.soort) continue;
      if (normaliseerGeldigheid(a.geldtVoor) !== normaliseerGeldigheid(b.geldtVoor)) continue;
      if (a.factKey === b.factKey) continue;
      if (!waardenVerschillen(a.soort!, a.waarde!, b.waarde!)) continue;
      const sleutel = paarSleutel(a, b);
      if (gezien.has(sleutel)) continue;
      gezien.add(sleutel);
      uit.push({ a, b, soort: a.soort!, sleutel });
    }
  }
  return uit.sort((x, y) => (x.sleutel < y.sleutel ? -1 : x.sleutel > y.sleutel ? 1 : 0));
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Ernst, automatisch oplossen en de poort (§8.1 en §8.2)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Kan dit soort conflict een pagina tegenhouden? Of hij het ook DOET, hangt af
 * van de pagina (`houdtPaginaTegen`). Product, werkwijze en overig zijn hooguit
 * een waarschuwing, behalve op een productpagina of als prioriteitsfeit; die
 * uitzondering zit in de poort, niet hier.
 */
export function ernstVan(soort: FeitSoort): "blokkerend" | "waarschuwing" {
  return soort === "product" || soort === "werkwijze" || soort === "overig"
    ? "waarschuwing"
    : "blokkerend";
}

/**
 * Wint één van de twee zonder de adviseur? Alleen bij een eenduidige rangorde
 * (§8.1 punt 4): een antwoord van de klant gaat vóór de site en vóór onderzoek.
 * Twee sitefeiten of twee klantantwoorden: `null`, dat beslist de adviseur.
 *
 * ⚠️ Afwijking van het plan: "een recentere pagina van de eigen site vóór een
 * oudere" is niet gebouwd. Het register kent geen publicatiedatum per
 * sitepagina, alleen wanneer wij hem lazen, en de volgorde waarin wij lazen zegt
 * niets over welke tekst actueel is. Liever de adviseur laten kiezen dan op
 * een schijnrangorde beslissen (conventie 3).
 */
export function automatischeWinnaar(a: RegisterFeit, b: RegisterFeit): RegisterFeit | null {
  const klantA = a.kind === "klant";
  const klantB = b.kind === "klant";
  if (klantA && !klantB) return a;
  if (klantB && !klantA) return b;
  return null;
}

export interface OpenConflict {
  soort: FeitSoort;
  feitIds: string[];
}

export interface PaginaContext {
  /** De prioriteitsfeiten uit de paginastrategie. */
  prioriteitsFeitIds: ReadonlySet<string>;
  /** Feiten zonder welke een gekozen onderwerp niet kan (de strategie zegt dat). */
  benodigdeFeitIds?: ReadonlySet<string>;
  /** Gaat de pagina over een plaats of een dienst? Dan telt een conflict daarover. */
  overPlaats?: boolean;
  overDienst?: boolean;
  isProductpagina?: boolean;
}

/**
 * Houdt dit conflict DEZE pagina tegen? Besluit 6 van de eigenaar: alleen als
 * het betwiste feit op deze pagina nodig is. Anders laat de strategie het feit
 * weg en krijgt het merk een waarschuwing. De tabel in §8.2 bepaalt per soort
 * wanneer "nodig" ook "tegenhouden" betekent.
 */
export function houdtPaginaTegen(conflict: OpenConflict, pagina: PaginaContext): boolean {
  const prioriteit = conflict.feitIds.some((id) => pagina.prioriteitsFeitIds.has(id));
  const benodigd = conflict.feitIds.some((id) => pagina.benodigdeFeitIds?.has(id) ?? false);
  if (!prioriteit && !benodigd) return false;

  switch (conflict.soort) {
    case "prijs":
    case "openingstijd":
    case "contact":
    case "certificering":
    case "garantie":
      return true;
    case "werkgebied":
    case "plaats":
      return Boolean(pagina.overPlaats);
    case "dienst":
      return Boolean(pagina.overDienst);
    case "termijn":
    case "cijfer":
    case "werkwijze":
      return prioriteit;
    case "product":
      return Boolean(pagina.isProductpagina);
    default:
      return false;
  }
}

/** Alle conflicten die deze pagina tegenhouden, voor de melding aan de adviseur. */
export function conflictpoort<T extends OpenConflict>(conflicten: readonly T[], pagina: PaginaContext): T[] {
  return conflicten.filter((c) => houdtPaginaTegen(c, pagina));
}

// ════════════════════════════════════════════════════════════════════════════
// 4. Betwiste feiten van de kaart
// ════════════════════════════════════════════════════════════════════════════

/** Zelfde normalisatie als `normalizeForQuote()` in factcard.ts, hier los om geen kring te maken. */
function vergelijkbaar(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Een betwist of vervangen feit gaat niet naar de schrijver (§8.2, WP2). Op id
 * waar de kaart dat kent, anders op tekst: een bevroren kaart uit de briefing
 * heeft niet altijd ids.
 *
 * Dit is de ondergrens tot de paginastrategie (WP3) per pagina kiest; daar
 * beslist `houdtPaginaTegen()` of een pagina moet wachten in plaats van zonder
 * het feit door te gaan.
 */
export function zonderBetwisteFeiten<T extends { id?: string | null; text: string }>(
  feiten: readonly T[],
  betwist: readonly { id: string; text: string }[],
): T[] {
  if (betwist.length === 0) return [...feiten];
  const ids = new Set(betwist.map((b) => b.id));
  const teksten = new Set(betwist.map((b) => vergelijkbaar(b.text)));
  return feiten.filter((f) => !(f.id && ids.has(f.id)) && !teksten.has(vergelijkbaar(f.text)));
}
