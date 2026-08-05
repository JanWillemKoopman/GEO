/**
 * Tekst opknippen op merknamen (optimalisatie.md 3.1).
 *
 * Apart van het component, want dit is het stuk waar het misgaat en dus het
 * stuk dat getest moet kunnen worden zonder React erbij te halen.
 *
 * Bewust GEEN HTML terug maar een lijst stukjes. Het antwoord komt van een
 * AI-model dat op zijn beurt webpagina's las; daar mag nooit HTML uit in de DOM
 * belanden, dus het component zet de stukjes zelf als React-elementen neer.
 */

export interface TextPart {
  text: string;
  /** De term waarop dit stuk matchte, in de vorm die is meegegeven. */
  term: string | null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Bouwt één expressie voor alle termen tegelijk, LANGSTE EERST.
 *
 * Die volgorde is niet cosmetisch: bij ["Bol", "Bol.com"] zou de korte term
 * eerst matchen en alleen "Bol" markeren, met ".com" er los achter. Langste
 * eerst geeft altijd de volledige naam.
 *
 * De randen zijn `(?<![\p{L}\p{N}])` in plaats van `\b`: zo matcht "Coolblue"
 * niet binnen "Coolbluezaken", maar wordt "Bol.com" wél als geheel gevonden,
 * `\b` breekt op de punt en zou hier precies het verkeerde doen.
 */
function buildPattern(terms: string[]): RegExp | null {
  const cleaned = Array.from(
    new Set(terms.map((t) => t.trim()).filter((t) => t.length >= 2)),
  ).sort((a, b) => b.length - a.length);

  if (cleaned.length === 0) return null;
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(${cleaned.map(escapeRegex).join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
}

/**
 * Knipt `text` in stukjes, waarbij elk stukje dat een van de termen is `term`
 * gevuld heeft. Losse tekst krijgt `term: null`.
 *
 * Termen van één teken worden genegeerd: die zouden een heel antwoord in
 * confetti veranderen.
 */
export function splitByTerms(text: string, terms: string[]): TextPart[] {
  const pattern = buildPattern(terms);
  if (!pattern) return [{ text, term: null }];

  // Kleine letters als sleutel: de match komt zoals hij in de tekst staat, en
  // "COOLBLUE" moet dezelfde term opleveren als "Coolblue".
  const byLower = new Map<string, string>();
  for (const t of terms) {
    const key = t.trim().toLowerCase();
    if (key.length >= 2) byLower.set(key, t.trim());
  }

  const out: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) out.push({ text: text.slice(last, start), term: null });
    out.push({ text: match[0], term: byLower.get(match[0].toLowerCase()) ?? match[0] });
    last = start + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), term: null });

  return out;
}
