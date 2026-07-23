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
const DEFAULT_MAX_PAGES = 20;

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
 * Ontdekt een beperkte lijst pagina-URL's van dezelfde site (content-inventaris,
 * abcplan.md §12.23): eerst sitemap.xml/sitemap_index.xml (simpele <loc>-regex,
 * geen XML-lib nodig — consistent met de handgeschreven htmlToText-aanpak),
 * anders links vanaf de homepage volgen. Alleen zelfde domein, gedupliceerd,
 * gecapt op maxPages.
 */
export async function discoverPageUrls(host: string, maxPages = DEFAULT_MAX_PAGES): Promise<string[]> {
  const base = toFetchUrl(host);
  const baseHost = new URL(base).hostname;

  for (const sitemapPath of ["/sitemap.xml", "/sitemap_index.xml"]) {
    const xml = await fetchText(`${base}${sitemapPath}`);
    if (!xml) continue;
    const locs = Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map((m) => m[1]);
    const urls = Array.from(new Set(locs.filter((u) => sameDomain(u, baseHost))));
    if (urls.length > 0) return urls.slice(0, maxPages);
  }

  // Fallback: links vanaf de homepage volgen.
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
    .filter((u): u is string => u !== null && sameDomain(u, baseHost));
  const urls = Array.from(new Set([base, ...resolved]));
  return urls.slice(0, maxPages);
}

export interface CrawledPage {
  url: string;
  title: string | null;
  text: string;
}

/** Haalt meerdere pagina's parallel op (faalt per pagina zacht, net als crawlSite). */
export async function crawlPages(urls: string[]): Promise<CrawledPage[]> {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const html = await fetchText(url);
      if (!html) return null;
      return {
        url,
        title: extractTitle(html),
        text: htmlToText(html).slice(0, PAGE_MAX_CHARS),
      };
    }),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<CrawledPage | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((p): p is CrawledPage => p !== null && p.text.length > 0);
}
