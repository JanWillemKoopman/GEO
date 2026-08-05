/**
 * Domeinen herkennen en filteren (optimalisatie.md 7.1).
 *
 * Apart van `landscape.ts`, dat de database bevraagt: dit is pure tekst- en
 * URL-bewerking, en juist het stuk waar het stil misgaat, een subdomein dat
 * als eigen bron telt, of een tweedelige TLD die tot "co.uk" wordt gereduceerd.
 *
 * Bewust ZONDER `server-only`.
 */

/**
 * Domeinen die niets zeggen over de markt van de klant.
 *
 * Zoekmachines en sociale platforms duiken bij vrijwel elke vraag op en zouden
 * elke ranglijst domineren; "sta jij op google.com" is geen bruikbaar advies.
 * De eigen site van de klant hoort er ook niet in. Dat is on-site werk en dat
 * heeft al een eigen hoofdstuk.
 */
export const IGNORED_DOMAINS = new Set([
  "google.com", "google.nl", "bing.com", "duckduckgo.com", "yahoo.com",
  "facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com",
  "youtube.com", "linkedin.com", "pinterest.com", "reddit.com",
  "chatgpt.com", "openai.com",
]);

/** Onder dit aantal citaties is een domein toeval en geen patroon. */
export const MIN_CITATIONS = 2;

/** Hoeveel domeinen we bewaren. Meer is een lijst, geen advies. */
export const MAX_DOMAINS = 15;

/**
 * Haalt de hostnaam uit een URL, zonder `www.` en zonder subdomein-ruis.
 *
 * Bewust NIET het volledige subdomein: `nl.trustpilot.com` en `trustpilot.com`
 * zijn hetzelfde platform, en die als twee bronnen tellen maakt de ranglijst
 * onbruikbaar. Wel voorzichtig bij tweedelige TLD's (`co.uk`), anders houden we
 * `co.uk` over als "domein".
 */
export function domainOf(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length <= 2) return host;

    const twoPartTlds = ["co.uk", "org.uk", "com.au", "co.nz", "com.br"];
    const lastTwo = parts.slice(-2).join(".");
    if (twoPartTlds.includes(lastTwo)) return parts.slice(-3).join(".");
    return lastTwo;
  } catch {
    return null;
  }
}
