import "server-only";

/**
 * Eigen crawler (abcplan.md §2/§6 A1): haalt de klant-website op met een simpele
 * fetch en zet de HTML om naar schone platte tekst. Géén API-kosten — dit is
 * bewust Node.js-werk, geen OpenAI-tool. De tekst wordt als context meegegeven
 * aan de profiel-/onderwerp-onderzoekscalls.
 */

const MAX_CHARS = 6000; // genoeg context, houdt de tokenkost laag
const PAGE_MAX_CHARS = 1500; // kleinere cap per pagina bij de content-inventaris (meerdere pagina's tegelijk)
const FETCH_TIMEOUT_MS = 12000;

// ── Content-inventaris (abcplan.md §12.23) ─────────────────────────────────
// We ontdekken WELKE pagina's er bestaan (URL-lijst via sitemaps) en halen voor
// die pagina's titel + tekst op. Het aantal pagina's is per profiel instelbaar
// (max_inventory_pages), begrensd door een harde bovengrens om de 60s-route te
// beschermen. Het crawlen zelf is API-gratis (eigen server, geen OpenAI).
export const DEFAULT_MAX_PAGES = 60; // fallback als een profiel (nog) geen instelling heeft
export const MAX_PAGES_HARD_CAP = 150; // absolute bovengrens (timeout-bescherming)
const CRAWL_BATCH_SIZE = 8; // parallelle fetches per batch (niet alles tegelijk)
const MAX_SITEMAPS = 50; // recursie-plafond bij sitemap-index'en

/** Zet een hostnaam (mediamarkt.nl) om naar een op te halen URL. */
function toFetchUrl(host: string): string {
  return host.startsWith("http") ? host : `https://${host}`;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? htmlToText(match[1]).trim() || null : null;
}

/** Ruwe HTML → platte tekst: scripts/styles weg, tags → spaties, whitespace inklappen. */
export function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const text = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

export interface CrawlResult {
  url: string;
  text: string;
  ok: boolean;
}

/**
 * Haalt de homepage op en extraheert de tekst. Faalt zacht: bij een fout geven
 * we een lege tekst terug zodat de Brand-DNA-call alsnog kan draaien op alleen
 * de web_search-context (de call krijgt dan minder, maar niet niets).
 */
export async function crawlSite(host: string): Promise<CrawlResult> {
  const url = toFetchUrl(host);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "GEO-Tracker-Bot/1.0 (+https://geo-tracker.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return { url, text: "", ok: false };
    const html = await res.text();
    const text = htmlToText(html).slice(0, MAX_CHARS);
    return { url, text, ok: text.length > 0 };
  } catch {
    return { url, text: "", ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "GEO-Tracker-Bot/1.0 (+https://geo-tracker.app)",
        Accept: "text/html,application/xhtml+xml,application/xml,text/xml",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Zelfde domein (host, zonder www.) als de basis-URL? */
function sameDomain(candidate: string, baseHost: string): boolean {
  try {
    const host = new URL(candidate).hostname.replace(/^www\./, "");
    return host === baseHost.replace(/^www\./, "");
  } catch {
    return false;
  }
}

/**
 * Is dit een webshop-PRODUCTpagina? Die willen we uitsluiten — een grote webshop
 * heeft er duizenden en ze zijn geen zinvolle GEO-content-doelen. We houden het
 * bewust strak op `/product/` en `/products/` (WooCommerce, Shopify): daarmee
 * blijven categorie-/`collections`- en `product-category`-pagina's WÉL behouden
 * (die zijn juist waardevol).
 */
function isProductUrl(url: string): boolean {
  return /\/products?\//i.test(url);
}

/**
 * Is dit een sitemap die (bijna) alleen productpagina's bevat? Die slaan we in
 * z'n geheel over — scheelt vaak duizenden URL's in één keer. Matcht o.a.
 * Shopify (`sitemap_products_1.xml`) en Yoast/WooCommerce (`product-sitemap.xml`),
 * maar niet `product-category-sitemap.xml` (daar volgt na "product-" geen sitemap/cijfer).
 */
function isProductSitemap(url: string): boolean {
  return /products?[-_](sitemap|\d)/i.test(url) || /sitemap[-_]products?/i.test(url);
}

/** Decodeert de paar XML-entiteiten die in sitemap-<loc>-URL's voorkomen. */
function decodeXmlEntities(s: string): string {
  return s.replace(/&amp;/gi, "&").replace(/&#38;/g, "&");
}

function extractLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map((m) => decodeXmlEntities(m[1]));
}

/** Een <sitemapindex> wijst naar andere sitemaps; een <urlset> bevat pagina's. */
function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

/**
 * Verzamelt pagina-URL's uit de sitemap(s): vindt de ingang(en) via een door de
 * klant opgegeven sitemap-URL (indien aanwezig, met voorrang), robots.txt
 * (Sitemap:-regels) + de standaardlocaties, en volgt sitemap-index'en recursief.
 * Product-sitemaps en losse product-URL's worden overgeslagen. Alleen zelfde
 * domein, gededupliceerd, gecapt.
 */
async function collectSitemapPageUrls(
  base: string,
  baseHost: string,
  maxPages: number,
  sitemapUrl?: string | null,
): Promise<string[]> {
  const entryPoints: string[] = [];
  // Door de klant opgegeven sitemap krijgt voorrang (staat vooraan in de queue).
  if (sitemapUrl && sitemapUrl.trim()) entryPoints.push(sitemapUrl.trim());

  const robots = await fetchText(`${base}/robots.txt`);
  if (robots) {
    for (const m of robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)) entryPoints.push(m[1].trim());
  }
  entryPoints.push(`${base}/sitemap.xml`, `${base}/sitemap_index.xml`);

  const queue = Array.from(new Set(entryPoints)).filter((u) => !isProductSitemap(u));
  const seen = new Set<string>();
  const pageUrls = new Set<string>();
  let fetched = 0;

  while (queue.length > 0 && fetched < MAX_SITEMAPS && pageUrls.size < maxPages) {
    const sm = queue.shift()!;
    if (seen.has(sm)) continue;
    seen.add(sm);

    const xml = await fetchText(sm);
    fetched++;
    if (!xml) continue;

    const locs = extractLocs(xml);
    if (isSitemapIndex(xml)) {
      for (const loc of locs) {
        if (!seen.has(loc) && !isProductSitemap(loc)) queue.push(loc);
      }
    } else {
      for (const loc of locs) {
        if (sameDomain(loc, baseHost) && !isProductUrl(loc)) pageUrls.add(loc);
      }
    }
  }

  return Array.from(pageUrls).slice(0, maxPages);
}

/**
 * Ontdekt zo compleet mogelijk welke pagina's er op de site staan (content-
 * inventaris, abcplan.md §12.23): eerst via de sitemap(s), en pas als die er
 * echt niet zijn → links volgen vanaf de homepage. Productpagina's uitgesloten.
 */
export async function discoverPageUrls(
  host: string,
  maxPages = DEFAULT_MAX_PAGES,
  sitemapUrl?: string | null,
): Promise<string[]> {
  const base = toFetchUrl(host);
  const baseHost = new URL(base).hostname;

  const sitemapUrls = await collectSitemapPageUrls(base, baseHost, maxPages, sitemapUrl);
  if (sitemapUrls.length > 0) return sitemapUrls.slice(0, maxPages);

  // Fallback: geen (bruikbare) sitemap → links vanaf de homepage volgen.
  const html = await fetchText(base);
  if (!html) return [base];
  const hrefs = Array.from(html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi)).map((m) => m[1]);
  const resolved = hrefs
    .map((href) => {
      try {
        return new URL(href, base).toString();
      } catch {
        return null;
      }
    })
    .filter((u): u is string => u !== null && sameDomain(u, baseHost) && !isProductUrl(u));
  const urls = Array.from(new Set([base, ...resolved]));
  return urls.slice(0, maxPages);
}

export interface CrawledPage {
  url: string;
  title: string | null;
  text: string;
}

/**
 * Haalt meerdere pagina's op in batches (niet alles tegelijk — voorkomt dat we
 * een site platleggen of de 60s-route overschrijden). Faalt per pagina zacht.
 */
export async function crawlPages(urls: string[]): Promise<CrawledPage[]> {
  const out: CrawledPage[] = [];
  for (let i = 0; i < urls.length; i += CRAWL_BATCH_SIZE) {
    const batch = urls.slice(i, i + CRAWL_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const html = await fetchText(url);
        if (!html) return null;
        return { url, title: extractTitle(html), text: htmlToText(html).slice(0, PAGE_MAX_CHARS) };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value && r.value.text.length > 0) out.push(r.value);
    }
  }
  return out;
}

export interface InventoryPage {
  url: string;
  title: string | null;
  text: string | null;
}

export interface InventoryOptions {
  /** Max aantal pagina's in de inventaris (per profiel instelbaar). */
  maxPages?: number;
  /** Door de klant opgegeven sitemap-URL (voorrang boven auto-detectie). */
  sitemapUrl?: string | null;
}

/**
 * Bouwt de content-inventaris van een site: ontdekt de (niet-product) pagina-URL's
 * en haalt daarvan titel + tekst op, tot `maxPages` (begrensd door de harde
 * bovengrens). Een pagina waarvan de fetch faalt komt met titel/tekst = null in
 * de lijst, zodat de URL-lijst niettemin de gevonden pagina's weerspiegelt.
 */
export async function crawlInventory(host: string, opts: InventoryOptions = {}): Promise<InventoryPage[]> {
  const maxPages = Math.min(Math.max(opts.maxPages ?? DEFAULT_MAX_PAGES, 1), MAX_PAGES_HARD_CAP);
  const urls = await discoverPageUrls(host, maxPages, opts.sitemapUrl);
  const crawled = await crawlPages(urls);
  const byUrl = new Map(crawled.map((p) => [p.url, p]));
  return urls.map((url) => {
    const c = byUrl.get(url);
    return { url, title: c?.title ?? null, text: c?.text ?? null };
  });
}
