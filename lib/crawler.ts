import "server-only";

/**
 * Eigen crawler (abcplan.md §2/§6 A1): haalt de klant-website op met een simpele
 * fetch en zet de HTML om naar schone platte tekst. Géén API-kosten — dit is
 * bewust Node.js-werk, geen OpenAI-tool. De tekst wordt als context meegegeven
 * aan de Brand-DNA-call.
 */

const MAX_CHARS = 6000; // genoeg context, houdt de tokenkost laag
const FETCH_TIMEOUT_MS = 12000;

/** Zet een hostnaam (mediamarkt.nl) om naar een op te halen URL. */
function toFetchUrl(host: string): string {
  return host.startsWith("http") ? host : `https://${host}`;
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
