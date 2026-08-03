/**
 * Gestructureerde data oogsten uit ruwe HTML — JSON-LD, OpenGraph, microdata.
 *
 * ── WAAROM DIT GEEN AI-AANROEP IS ───────────────────────────────────────────
 *
 * Dit is precies het soort werk dat `APP_FLOW_DOCUMENTATION.md` §"Bewust géén
 * AI" beschrijft: een model vragen wat het adres van een bedrijf is terwijl dat
 * letterlijk als `LocalBusiness.address` in de HTML staat, is geld uitgeven aan
 * een slechter antwoord. Een reguliere expressie leest het exact, gratis, en
 * met een bron-URL erbij.
 *
 * Bij een MKB-site met een WordPress-SEO-plugin levert dit vaak in één klap de
 * bedrijfsnaam, het adres, de openingstijden, het telefoonnummer en de
 * beoordelingen — allemaal harde feiten die anders uit een gok moeten komen.
 *
 * ── PUUR, DUS TESTBAAR ──────────────────────────────────────────────────────
 *
 * Geen `server-only`, geen netwerk: HTML erin, feiten eruit (conventie 2).
 */

/** Eén geoogst gegeven, met de bron erbij zodat het te controleren is. */
export interface HarvestedFact {
  /** Waar het over gaat, bv. 'naam', 'adres', 'telefoon', 'openingstijden'. */
  key: string;
  value: string;
  /** Uit welk schema-type het komt, bv. 'LocalBusiness'. */
  fromType: string;
}

export interface StructuredHarvest {
  /** Alle @type-waarden die op de pagina voorkomen, ontdubbeld. */
  types: string[];
  facts: HarvestedFact[];
  /** Externe profielen uit `sameAs` — LinkedIn, Wikipedia, Facebook, KvK. */
  sameAs: string[];
  /** Namen zoals ze in de opmaak staan. Bron voor de consistentiecheck. */
  names: string[];
}

/** Haalt de inhoud van alle `<script type="application/ld+json">`-blokken op. */
export function extractJsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      // Ongeldige JSON-LD is doodnormaal op MKB-sites (een plugin die een
      // aanhalingsteken niet ontsnapt). Overslaan; één kapot blok mag de rest
      // niet meenemen.
    }
  }
  return out;
}

/** OpenGraph- en Twitter-metatags als platte sleutel-waardeparen. */
export function extractMetaTags(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<meta\s+([^>]+?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    const prop = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1];
    if (prop && content !== undefined) out[prop.toLowerCase()] = decodeEntities(content).trim();
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

/** Vlakt `@graph` en geneste arrays uit tot één lijst van objecten. */
function flattenNodes(input: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 6 || input === null || typeof input !== "object") return [];
  if (Array.isArray(input)) return input.flatMap((n) => flattenNodes(n, depth + 1));

  const node = input as Record<string, unknown>;
  const graph = node["@graph"];
  const nested = graph ? flattenNodes(graph, depth + 1) : [];
  return node["@type"] || node["name"] ? [node, ...nested] : nested;
}

function typeNames(node: Record<string, unknown>): string[] {
  const t = node["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

/** Zet een adresobject om naar één regel. */
function formatAddress(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (!value || typeof value !== "object") return null;
  const a = value as Record<string, unknown>;
  const parts = [a.streetAddress, a.postalCode, a.addressLocality, a.addressCountry]
    .filter((p): p is string => typeof p === "string" && p.trim() !== "")
    .map((p) => p.trim());
  return parts.length > 0 ? parts.join(", ") : null;
}

function asStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

/**
 * Welke velden we oogsten en onder welke naam. Bewust een korte, gesloten lijst:
 * alles meenemen levert een berg ruis op waar niemand doorheen kijkt, en de
 * velden hieronder zijn precies degene die in een contentpagina of een
 * entiteitscontrole terugkomen.
 */
const SIMPLE_FIELDS: Array<[schemaKey: string, factKey: string]> = [
  ["name", "naam"],
  ["legalName", "statutaire_naam"],
  ["telephone", "telefoon"],
  ["email", "email"],
  ["priceRange", "prijsklasse"],
  ["foundingDate", "opgericht"],
  ["vatID", "btw_nummer"],
  ["taxID", "fiscaal_nummer"],
  ["description", "omschrijving"],
];

export function harvestStructuredData(html: string): StructuredHarvest {
  const nodes = extractJsonLdBlocks(html).flatMap((b) => flattenNodes(b));
  const meta = extractMetaTags(html);

  const types = new Set<string>();
  const facts: HarvestedFact[] = [];
  const sameAs = new Set<string>();
  const names = new Set<string>();

  const push = (key: string, value: string | null | undefined, fromType: string) => {
    const v = (value ?? "").trim();
    if (!v) return;
    // Ontdubbelen op (sleutel, waarde): dezelfde organisatie staat vaak in élk
    // JSON-LD-blok van élke pagina.
    if (facts.some((f) => f.key === key && f.value === v)) return;
    facts.push({ key, value: v, fromType });
  };

  for (const node of nodes) {
    const nodeTypes = typeNames(node);
    for (const t of nodeTypes) types.add(t);
    const label = nodeTypes[0] ?? "Thing";

    for (const [schemaKey, factKey] of SIMPLE_FIELDS) {
      const v = node[schemaKey];
      if (typeof v === "string") push(factKey, v, label);
    }

    if (typeof node.name === "string" && node.name.trim()) names.add(node.name.trim());

    const address = formatAddress(node.address);
    if (address) push("adres", address, label);

    const hours = asStrings(node.openingHours);
    if (hours.length > 0) push("openingstijden", hours.join("; "), label);

    for (const url of asStrings(node.sameAs)) sameAs.add(url.trim());

    // Beoordelingen zijn een sterk trust-signaal en komen bijna altijd als
    // genest object binnen.
    const rating = node.aggregateRating;
    if (rating && typeof rating === "object") {
      const r = rating as Record<string, unknown>;
      const value = r.ratingValue;
      const count = r.reviewCount ?? r.ratingCount;
      if (value !== undefined && value !== null) {
        push(
          "beoordeling",
          count !== undefined && count !== null
            ? `${String(value)} (${String(count)} beoordelingen)`
            : String(value),
          label,
        );
      }
    }
  }

  // OpenGraph als aanvulling, niet als vervanging: `og:site_name` is vaak de
  // naam zoals klanten hem kennen, en die wijkt regelmatig af van de statutaire
  // naam in de JSON-LD. Juist dat verschil wil de consistentiecheck zien.
  if (meta["og:site_name"]) {
    names.add(meta["og:site_name"]);
    push("naam_opengraph", meta["og:site_name"], "OpenGraph");
  }
  if (meta["og:description"]) push("omschrijving_opengraph", meta["og:description"], "OpenGraph");

  return {
    types: [...types].sort(),
    facts,
    sameAs: [...sameAs],
    names: [...names],
  };
}

/**
 * Draait de site waarschijnlijk op JavaScript?
 *
 * ── WAAROM DIT DE ZWAARSTE BEVINDING IS DIE ER BESTAAT ──────────────────────
 *
 * AI-crawlers voeren geen JavaScript uit. Staat de tekst niet in de HTML die de
 * server terugstuurt, dan bestaat de pagina voor ChatGPT niet — hoe goed de
 * content ook is. Alle content die wij daarna schrijven zou aan een dichte deur
 * geleverd worden.
 *
 * De heuristiek is bewust grof: weinig zichtbare tekst én veel script. Een
 * volwaardige rendering-test zou een headless browser vragen, en dat is een
 * afhankelijkheid die niet in een serverless functie past. Deze test haalt de
 * duidelijke gevallen eruit — een React-app die 300 tekens tekst en 400 kB
 * JavaScript terugstuurt — en dat zijn precies de gevallen die ertoe doen.
 */
export interface RenderAssessment {
  textChars: number;
  scriptChars: number;
  /** Grens: minder dan 600 tekens tekst én meer script dan tekst. */
  likelyClientRendered: boolean;
}

export function assessRendering(html: string, plainTextLength: number): RenderAssessment {
  let scriptChars = 0;
  const re = /<script[\s\S]*?<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) scriptChars += m[0].length;

  return {
    textChars: plainTextLength,
    scriptChars,
    likelyClientRendered: plainTextLength < 600 && scriptChars > plainTextLength,
  };
}
