/**
 * Deugt de content-inventaris? (R6.2, migratie 0039, de reservering 0033 vervalt)
 *
 * ── WAT HIER MIS GING ───────────────────────────────────────────────────────
 *
 * Bol leverde 1 pagina in de inventaris op, HEMA 40 productpagina's. In beide
 * gevallen draaide de hele pijplijn gewoon door: het rapport koos tussen
 * "nieuwe pagina" en "bestaande verbeteren" op basis van vrijwel niets, en
 * meldde dat nergens. De klant las een advies dat op één pagina gebaseerd was
 * alsof het op zijn hele site sloeg.
 *
 * Nu wordt dat oordeel geveld vóórdat er iets duurs gebeurt, in fase 0 van de
 * onboarding, waar het nog nul euro kost om te constateren.
 *
 * Puur, dus testbaar (conventie 2). Geen netwerk, geen database.
 */
import type { InventoryQuality } from "@/lib/types/database";

/** Wat deze module van een gecrawlde pagina moet weten. */
export interface InventoryPageLike {
  url: string;
  title?: string | null;
  text?: string | null;
}

/**
 * Vanaf hoeveel tekens noemen we de tekst van een pagina bruikbaar? 200 tekens
 * is ongeveer drie zinnen, genoeg om er een feit uit te halen. Daaronder is het
 * een navigatieframe of een cookiemelding.
 */
export const USABLE_TEXT_CHARS = 200;

/** Onder dit aantal pagina's is elk nieuw/verbeteren-oordeel een gok. */
export const MIN_USABLE_PAGES = 5;

/** Boven dit aandeel productpagina's is de inventaris geen contentbeeld meer. */
export const MAX_PRODUCT_RATIO = 0.7;

/**
 * Ziet dit eruit als een productpagina?
 *
 * Drie signalen naast elkaar, want één alleen is te grof:
 *
 *   1. Bekende webshop-paden (`/product/`, `/shop/`, `/p/`), Shopify,
 *      WooCommerce en Magento gebruiken die vrijwel allemaal.
 *   2. Een artikelnummer-achtig laatste segment. Bij HEMA is dat
 *      `...-200302.html`: vier of meer cijfers op rij aan het eind.
 *   3. Diep pad (≥ 4 segmenten) én cijfers in het laatste segment.
 *
 * Bewust GEEN prijsdetectie in de tekst: "vanaf € 25" staat ook op een
 * dienstenpagina van een kapper, en die is juist wél inhoudelijk.
 */
export function looksLikeProductPage(url: string): boolean {
  let path: string;
  try {
    path = new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
  } catch {
    path = url;
  }

  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return false;

  const lower = path.toLowerCase();
  if (/\/(product|products|producten|shop|winkel|artikel|p)\//.test(lower)) return true;

  const last = segments[segments.length - 1];
  if (/\d{4,}(?:\.html?)?$/.test(last)) return true;
  if (segments.length >= 4 && /\d{3,}/.test(last)) return true;

  return false;
}

/**
 * Velt het oordeel over een gecrawlde inventaris.
 *
 * Drie uitkomsten en geen score: een getal van 0-100 nodigt uit tot een drempel
 * die niemand kan uitleggen. `dun` en `vervuild` zijn verschillende problemen
 * met verschillende oplossingen, en dat verschil moet in de uitkomst zitten.
 */
export function assessInventory(pages: InventoryPageLike[]): InventoryQuality {
  const total = pages.length;

  if (total === 0) {
    return {
      pages: 0,
      usableTextRatio: 0,
      productPageRatio: 0,
      verdict: "dun",
      advice:
        "We konden geen enkele pagina lezen. Controleer of robots.txt onze crawler toelaat, of vul de sitemap-URL in bij de instellingen van dit merk.",
    };
  }

  const usable = pages.filter((p) => (p.text ?? "").trim().length >= USABLE_TEXT_CHARS).length;
  const products = pages.filter((p) => looksLikeProductPage(p.url)).length;

  const usableTextRatio = round2(usable / total);
  const productPageRatio = round2(products / total);

  if (usable < MIN_USABLE_PAGES) {
    return {
      pages: total,
      usableTextRatio,
      productPageRatio,
      verdict: "dun",
      advice:
        total < MIN_USABLE_PAGES
          ? "We vonden te weinig pagina's om een betrouwbaar beeld van de site te krijgen. Vul de sitemap-URL in, of verhoog het paginamaximum bij de instellingen van dit merk."
          : `Van de ${total} gevonden pagina's bevatten er maar ${usable} bruikbare tekst. Vaak betekent dat de site zijn inhoud met JavaScript opbouwt. Dan lezen AI-assistenten hem ook niet.`,
    };
  }

  if (productPageRatio > MAX_PRODUCT_RATIO) {
    return {
      pages: total,
      usableTextRatio,
      productPageRatio,
      verdict: "vervuild",
      advice: `${Math.round(productPageRatio * 100)}% van wat we vonden zijn productpagina's. Daardoor zien we vooral het assortiment en nauwelijks de inhoudelijke pagina's waarop een advies hoort te rusten.`,
    };
  }

  return { pages: total, usableTextRatio, productPageRatio, verdict: "voldoende", advice: null };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Groepeert URL's per eerste padsegment: de ruwe vorm van de sitestructuur.
 *
 * Dit is hoe een productverkoper zijn categorieboom krijgt zonder dat er een
 * model aan te pas komt. `/diensten/*` met 12 pagina's tegenover `/blog/*` met
 * 80 zegt meteen wat voor site dit is.
 */
export interface SiteSection {
  segment: string;
  count: number;
  /** Een paar voorbeelden, zodat een mens (of een model) ziet wat erin zit. */
  examples: string[];
}

export function buildTaxonomy(urls: string[], maxExamples = 3): SiteSection[] {
  const groups = new Map<string, string[]>();

  for (const url of urls) {
    let path: string;
    try {
      path = new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
    } catch {
      continue;
    }
    const segments = path.split("/").filter(Boolean);
    // Een pagina in de wortel is geen sectie maar dé pagina; die krijgt een
    // eigen bak zodat hij niet als "sectie /over-ons met 1 pagina" verschijnt.
    const key = segments.length === 0 ? "/" : `/${segments[0]}`;
    const list = groups.get(key) ?? [];
    list.push(url);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([segment, list]) => ({
      segment,
      count: list.length,
      examples: list.slice(0, maxExamples),
    }))
    .sort((a, b) => b.count - a.count || a.segment.localeCompare(b.segment));
}
