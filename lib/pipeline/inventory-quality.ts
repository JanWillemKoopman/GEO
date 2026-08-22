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
import { pathOf, sectionOf, segmentsOf } from "@/lib/crawl-urls";

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
  const path = pathOf(url);
  const segments = segmentsOf(url);
  if (segments.length === 0) return false;

  const lower = path.toLowerCase();
  if (/\/(product|products|producten|shop|winkel|artikel|p)\//.test(lower)) return true;

  const last = segments[segments.length - 1];
  if (/\d{4,}(?:\.html?)?$/.test(last)) return true;
  if (segments.length >= 4 && /\d{3,}/.test(last)) return true;

  return false;
}

/** Wat de crawl buiten de pagina's zelf over de site weet. */
export interface InventoryContext {
  /**
   * Hoeveel URL's de sitemap opleverde vóór het afkappen op het paginamaximum.
   * Weglaten als dat niet gemeten is: dan blijft het oordeel wat het was, in
   * plaats van te doen alsof de site precies zo groot is als wat we lazen.
   */
  totalFound?: number;
}

/**
 * Velt het oordeel over een gecrawlde inventaris.
 *
 * Vier uitkomsten en geen score: een getal van 0-100 nodigt uit tot een drempel
 * die niemand kan uitleggen. `dun`, `vervuild` en `afgekapt` zijn verschillende
 * problemen met verschillende oplossingen, en dat verschil moet in de uitkomst
 * zitten.
 *
 * ── WAAROM 'AFGEKAPT' ERBIJ MOEST (22 augustus 2026) ────────────────────────
 *
 * Een site met 150 gelezen pagina's kreeg het oordeel `voldoende`, of er nu
 * precies 150 pagina's waren of 8.000. Juist dat tweede geval is het geval
 * waarin de consultant iets moet doen, en het was het enige geval dat er
 * hetzelfde uitzag als een site die volledig gelezen is.
 */
export function assessInventory(
  pages: InventoryPageLike[],
  context: InventoryContext = {},
): InventoryQuality {
  const total = pages.length;
  const totalFound = context.totalFound;
  const afgekapt = typeof totalFound === "number" && totalFound > total;

  if (total === 0) {
    return {
      pages: 0,
      totalFound,
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
  const basis = { pages: total, totalFound, usableTextRatio, productPageRatio };

  if (usable < MIN_USABLE_PAGES) {
    return {
      ...basis,
      verdict: "dun",
      advice:
        total < MIN_USABLE_PAGES
          ? "We vonden te weinig pagina's om een betrouwbaar beeld van de site te krijgen. Vul de sitemap-URL in, of verhoog het paginamaximum bij de instellingen van dit merk."
          : `Van de ${total} gevonden pagina's bevatten er maar ${usable} bruikbare tekst. Vaak betekent dat de site zijn inhoud met JavaScript opbouwt. Dan lezen AI-assistenten hem ook niet.`,
    };
  }

  if (productPageRatio > MAX_PRODUCT_RATIO) {
    return {
      ...basis,
      verdict: "vervuild",
      advice: `${Math.round(productPageRatio * 100)}% van wat we vonden zijn productpagina's. Daardoor zien we vooral het assortiment en nauwelijks de inhoudelijke pagina's waarop een advies hoort te rusten.`,
    };
  }

  // Ná 'vervuild': bij een grote webshop zijn beide waar, en dan is "we zien
  // vooral het assortiment" de nuttigere melding. Die zegt iets over wat we
  // hebben; deze alleen iets over wat we misten.
  if (afgekapt) {
    return {
      ...basis,
      verdict: "afgekapt",
      advice: `Je site heeft ${totalFound} pagina's en ORBIT ENGINE las er ${total}. Die ${total} zijn verdeeld over alle delen van de site, dus het beeld klopt, maar het is niet compleet. Voeg hieronder de pagina's toe die er zeker bij horen, of geef bij de instellingen aan welke mappen voorrang krijgen.`,
    };
  }

  return { ...basis, verdict: "voldoende", advice: null };
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
    // Een pagina in de wortel is geen sectie maar dé pagina; die krijgt een
    // eigen bak zodat hij niet als "sectie /over-ons met 1 pagina" verschijnt.
    // `sectionOf` is dezelfde grens die `url-priority.ts` gebruikt om de crawl
    // te verdelen: twee kopieën van die regel zouden betekenen dat de crawl
    // over andere hokjes verdeelt dan het model te zien krijgt.
    const key = sectionOf(url);
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
