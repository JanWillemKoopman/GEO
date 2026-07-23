/**
 * Normaliseert een door de klant ingevoerde website naar een schone hostnaam
 * (bv. "https://www.MediaMarkt.nl/" → "mediamarkt.nl"). Retourneert null als de
 * invoer duidelijk geen website is.
 */
export function normalizeUrl(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
  // Minimale sanity-check: bevat een punt, geen spaties.
  if (!s.includes(".") || /\s/.test(s)) return null;
  return s;
}

/** Bouwt de auto-gegenereerde analysenaam (abcplan.md §3.4). */
export function buildAnalysisName(url: string, topic: string | null): string {
  return topic && topic.trim() ? `${url} — ${topic.trim()}` : `${url} (hele site)`;
}
