/**
 * Ruwe HTML → platte tekst. Puur (conventie 2, geen `server-only`): dit doet
 * geen netwerkverkeer, alleen tekstbewerking, dus hoort het los van
 * `lib/crawler.ts` te staan om vanuit `scripts/test-unit.ts` te kunnen testen.
 * `lib/crawler.ts` her-exporteert deze functie, zodat bestaande imports
 * (`import { htmlToText } from "@/lib/crawler"`) blijven werken.
 */
import { sanitizeForPostgres } from "@/lib/pg-text";

/**
 * Decodeert een numerieke HTML-entiteit (`&#8220;` of `&#x201C;`) naar het
 * teken dat hij bedoelt. Ongeldige of buiten-bereik codepoints (een corrupte
 * of kwaadwillende pagina) leveren een lege string op in plaats van een
 * crash: onbekend is hier beter dan een gecrashte crawltaak (conventie 3).
 */
function decodeNumericEntity(codePoint: number): string {
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return "";
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "";
  }
}

/** Ruwe HTML → platte tekst: scripts/styles weg, tags → spaties, whitespace inklappen. */
export function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Meteen hier schonen, niet pas bij de insert: ALLES wat de app aan platte
  // tekst uit een externe pagina haalt loopt via deze functie, dus dit is de
  // enige plek waar een NUL-byte of losse surrogate kan binnenkomen. Zie
  // lib/pg-text.ts voor wat er misging toen dat niet gebeurde.
  const text = sanitizeForPostgres(withoutScripts)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    // ⚠️ Herstelplan na audit T8.5: de zes namen hierboven waren niet genoeg.
    // Gemeten op productie: 76 van de 790 gecrawlde pagina's bevatten een
    // entiteit die niet gedecodeerd werd, meestal een typografisch
    // aanhalingsteken (`&#8220;`) dat zo letterlijk in een citaat terechtkwam,
    // óók in `evidence_quote` waarmee een bewering letterlijk onderbouwd moet
    // worden. Erbij: de veelgebruikte typografische namen, en als restcategorie
    // ALLE numerieke entiteiten (decimaal én hex), want daar grijpt elk CMS
    // naar zodra een teken geen eigen naam heeft.
    .replace(/&hellip;/gi, "…")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&copy;/gi, "©")
    .replace(/&reg;/gi, "®")
    .replace(/&trade;/gi, "™")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => decodeNumericEntity(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => decodeNumericEntity(Number(dec)))
    .replace(/\s+/g, " ")
    .trim();

  return text;
}
