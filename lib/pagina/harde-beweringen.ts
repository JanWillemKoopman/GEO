/**
 * HARDE BEWERINGEN: welke zinnen moet de ondernemer misschien nalopen?
 * (`docs/tasks/contentketen-opnieuw.md` §6.5, besluit B1)
 *
 * ── WAT DEZE MODULE IS, EN WAT NIET ─────────────────────────────────────────
 *
 * Een conservatieve detectie van zinnen die het controleren waard zijn: een
 * bedrag, een getal, een termijn, of een woord als "garantie" in een zin over
 * het bedrijf, waar geen bron voor te vinden is. Die zinnen worden geel op het
 * goedkeuringsscherm, en de ondernemer bevestigt of past aan.
 *
 * Het is GEEN factchecker. Hij bewijst niet of een zin waar is; het inhoudelijke
 * oordeel hoort bij de beoordeling (`pagina_controle`) en bij de ondernemer.
 *
 * Twee regels die voorkomen dat hij uitgroeit (§6.5):
 *   1. Liever onterecht geel dan onterecht gedekt.
 *   2. Te veel vals alarm? Maak de lijsten hieronder korter, niet de code
 *      slimmer. Geen zinsontleding, geen synoniemen, geen model, geen getal
 *      voor "betrouwbaarheid".
 *
 * Puur en zonder `server-only` (conventie 2).
 */

export interface GetalToken {
  soort: "getal";
  /** Genormaliseerde waarde: `1.800` wordt "1800", `3,5` wordt "3.5". */
  waarde: string;
  /** Genormaliseerde eenheid ("euro", "jaar", "week", "monteurs") of null. */
  eenheid: string | null;
  /** Zoals het in de tekst stond, voor de melding. */
  tekst: string;
}

export interface WoordToken {
  soort: "woord";
  /** De stam waarop gezocht wordt ("garant", "certific", "altijd"). */
  stam: string;
  tekst: string;
}

export type HardToken = GetalToken | WoordToken;

export interface Zinsoordeel {
  zin: string;
  tokens: HardToken[];
  /** De tokens waar geen bron voor gevonden is. Leeg = gedekt. */
  ongedekt: HardToken[];
}

/**
 * Tellingen die een opsomming aankondigen en niets over het bedrijf beweren
 * ("3 tips", "5 vragen"). Bewust kort (regel 2).
 */
const OPSOMMING = new Set(["tips", "stappen", "vragen", "redenen", "dingen", "punten", "manieren", "fouten", "voordelen", "nadelen"]);

/** Eenheden die we herkennen, met hun genormaliseerde vorm. */
const EENHEID: [RegExp, string][] = [
  [/^(€|euro|eur)$/i, "euro"],
  [/^(jaar|jaren)$/i, "jaar"],
  [/^(maand|maanden)$/i, "maand"],
  [/^(week|weken)$/i, "week"],
  [/^(dag|dagen|werkdag|werkdagen)$/i, "dag"],
  [/^(uur|uren)$/i, "uur"],
  [/^(minuut|minuten|min)$/i, "minuut"],
  [/^(%|procent)$/i, "procent"],
];

/**
 * Woorden die in een zin over het bedrijf een harde belofte zijn. Elk met de
 * stam waarop in de bronnen gezocht wordt. Bewust kort (regel 2).
 */
const BELOFTEWOORDEN: [RegExp, string][] = [
  [/\bgarant\w*|\bgegarandeerd\b/i, "garant"],
  [/\bgecertificeerd\b|\bcertifica\w*|\bcertificering\w*/i, "certific"],
  [/\berkend\b|\berkenning\b/i, "erken"],
  [/\bkeurmerk\w*/i, "keurmerk"],
  [/\blid van\b/i, "lid van"],
  [/\baltijd\b/i, "altijd"],
  [/\bnooit\b/i, "nooit"],
  [/\b24\/7\b/i, "24/7"],
  [/\bde beste\b/i, "beste"],
  [/\bde goedkoopste\b/i, "goedkoopste"],
  [/\bde grootste\b/i, "grootste"],
  [/\bde enige\b/i, "enige"],
  [/\bnummer 1\b|\bnummer één\b/i, "nummer 1"],
];

/** Een zin gaat over het bedrijf als hij de wij-vorm of de bedrijfsnaam gebruikt. */
function overHetBedrijf(zin: string, bedrijfsnamen: string[]): boolean {
  if (/\b(wij|we|ons|onze)\b/i.test(zin)) return true;
  const laag = zin.toLowerCase();
  return bedrijfsnamen.some((n) => n.trim().length >= 3 && laag.includes(n.trim().toLowerCase()));
}

const ONTKENNING = /\b(geen|niet|nooit|zonder)\b/i;

/** Markdown naar platte zinnen: koppen, lijsttekens, links en nadruk eruit. */
export function splitsZinnen(tekst: string): string[] {
  const plat = tekst
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]+/g, " ")
    .split(/\n+/)
    .map((r) => r.replace(/^\s*(?:[-+]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
  const zinnen: string[] = [];
  for (const regel of plat) {
    // Splits op een punt, vraag- of uitroepteken gevolgd door een spatie en een
    // hoofdletter of cijfer. "3,5" en "1.800" blijven heel.
    for (const z of regel.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9€"'“‘(])/)) {
      const schoon = z.replace(/\s{2,}/g, " ").trim();
      if (schoon) zinnen.push(schoon);
    }
  }
  return zinnen;
}

/** Haalt wat nooit een harde bewering is uit een zin: telefoonnummers, postcodes, huisnummers. */
function zonderRuis(zin: string): string {
  return (
    zin
      // Telefoonnummer: een reeks van 9 of meer cijfers, met spaties of streepjes ertussen.
      .replace(/(?:\+\d{2}[\s-]?)?(?:\d[\s-]?){9,}\d?/g, (m) => (m.replace(/\D/g, "").length >= 9 ? " " : m))
      // Postcode.
      .replace(/\b\d{4}\s?[A-Z]{2}\b/g, " ")
      // Huisnummer direct na een straatnaam.
      .replace(
        /\b(\p{L}+(?:straat|weg|laan|plein|dreef|singel|kade|gracht|park|hof|dijk|pad|steeg|markt|baan|ring))\s+\d+\s?[a-zA-Z]?\b/giu,
        "$1",
      )
  );
}

function normaliseerGetal(ruw: string): string {
  let s = ruw.replace(/[€\s]/g, "");
  // 1.800 of 12.500.000: punten als duizendtallen.
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "");
  s = s.replace(",", ".");
  // 1800.00 en 1800 zijn hetzelfde getal.
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, "");
  return s;
}

function eenheidVan(woord: string | undefined): string | null {
  if (!woord) return null;
  const w = woord.replace(/[.,;:!?)]+$/, "");
  for (const [re, naam] of EENHEID) if (re.test(w)) return naam;
  return null;
}

/** De getallen in een zin, met hun eenheid. */
export function getallenIn(zin: string): GetalToken[] {
  const tekst = zonderRuis(zin);
  const uit: GetalToken[] = [];
  // Een getal, eventueel met € ervoor, eventueel een bereik ("2 tot 4 weken",
  // "€ 2.200 tot € 3.200"), gevolgd door het woord erna.
  const re =
    /(€\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\+?(?:\s*(%))?(?:\s*(?:tot|à|a|-|–)\s*(€\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\+?(?:\s*(%))?)?(?:\s+([\p{L}€%]+))?/gu;
  for (const m of tekst.matchAll(re)) {
    const [heel, euroVoor1, g1, pct1, euroVoor2, g2, pct2, volgwoord] = m;
    const eenheidNa = eenheidVan(volgwoord);
    const eenheid =
      euroVoor1 || euroVoor2 ? "euro" : pct1 || pct2 ? "procent" : eenheidNa ?? (volgwoord && /^\p{Ll}/u.test(volgwoord) ? volgwoord.toLowerCase() : null);
    if (eenheid && OPSOMMING.has(eenheid)) continue;
    uit.push({ soort: "getal", waarde: normaliseerGetal(g1), eenheid, tekst: heel.trim() });
    if (g2) uit.push({ soort: "getal", waarde: normaliseerGetal(g2), eenheid, tekst: heel.trim() });
  }
  return uit;
}

/** De harde woorden in een zin, alleen als de zin over het bedrijf gaat. */
function woordenIn(zin: string, bedrijfsnamen: string[]): WoordToken[] {
  if (!overHetBedrijf(zin, bedrijfsnamen)) return [];
  const uit: WoordToken[] = [];
  for (const [re, stam] of BELOFTEWOORDEN) {
    const m = zin.match(re);
    if (m) uit.push({ soort: "woord", stam, tekst: m[0] });
  }
  return uit;
}

/** Elke zin met een harde bewering, en welke tokens erin staan. */
export function vindHardeBeweringen(tekst: string, bedrijfsnamen: string[] = []): { zin: string; tokens: HardToken[] }[] {
  const uit: { zin: string; tokens: HardToken[] }[] = [];
  for (const zin of splitsZinnen(tekst)) {
    const tokens: HardToken[] = [...getallenIn(zin), ...woordenIn(zin, bedrijfsnamen)];
    if (tokens.length > 0) uit.push({ zin, tokens });
  }
  return uit;
}

/**
 * Staat dit token in een bron?
 *
 * Een getal: dezelfde waarde met dezelfde eenheid. Heeft een van de twee geen
 * herkenbare eenheid ("35+ jaar" tegenover "35 jaar ervaring", "sinds 1990"),
 * dan telt dezelfde waarde.
 *
 * Een woord: hetzelfde woord in een bronzin, en in geen van beide zinnen een
 * ontkenning. Staat er ergens "geen", "niet", "nooit" of "zonder", dan is de zin
 * geel: welke van de twee klopt, is een vraag voor de ondernemer.
 */
export function zoekBron(token: HardToken, zin: string, bronZinnen: string[]): boolean {
  if (token.soort === "getal") {
    return bronZinnen.some((b) =>
      getallenIn(b).some(
        (g) => g.waarde === token.waarde && (token.eenheid === null || g.eenheid === null || g.eenheid === token.eenheid),
      ),
    );
  }
  if (ONTKENNING.test(zin)) return false;
  const [re] = BELOFTEWOORDEN.find(([, stam]) => stam === token.stam) ?? [];
  if (!re) return false;
  return bronZinnen.some((b) => re.test(b) && !ONTKENNING.test(b));
}

/**
 * De controle op een hele tekst: per zin met een harde bewering, welke tokens
 * geen bron hebben. `bronnen` is alle tekst van blok A, B en de vakkennis van C.
 */
export function controleerHardeBeweringen(
  tekst: string,
  bronnen: string[],
  bedrijfsnamen: string[] = [],
): Zinsoordeel[] {
  const bronZinnen = bronnen.flatMap((b) => splitsZinnen(b));
  return vindHardeBeweringen(tekst, bedrijfsnamen).map(({ zin, tokens }) => ({
    zin,
    tokens,
    ongedekt: tokens.filter((t) => !zoekBron(t, zin, bronZinnen)),
  }));
}

/** Alleen de zinnen die geel worden. */
export function geleZinnen(oordelen: Zinsoordeel[]): string[] {
  return oordelen.filter((o) => o.ongedekt.length > 0).map((o) => o.zin);
}
