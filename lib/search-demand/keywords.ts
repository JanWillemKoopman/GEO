/**
 * Van een meetvraag naar een opzoekbare zoekterm
 * (docs/tasks/zoekdata-in-de-keten.md §3.2, deel B).
 *
 * ── DE MOEILIJKSTE STAP VAN HET HELE PLAN ───────────────────────────────────
 *
 * "Wat kost een dakinspectie in Zutphen en wanneer is het nodig" heeft als
 * hele zin geen zoekvolume: niemand typt die zin exact zo bij Google. De
 * zoekterm erachter is iets als "dakinspectie kosten". Een taalmodel zou dit
 * goed kunnen, maar dat maakt de stap weer een AI-aanroep, en dan meet je de
 * zoekterm van een gok af tegen het volume van een andere gok.
 *
 * Deze functie is daarom BEWUST deterministisch en beperkt: een vaste lijst
 * vraagwoorden en lidwoorden eraf, de rest blijft staan. Dat lukt goed bij
 * een vraag met één duidelijke kern ("wat kost een dakinspectie" →
 * "dakinspectie"), en matig tot slecht bij een samengestelde vraag met twee
 * onderwerpen. Dat is geen bug om later te repareren met meer regels: hoe
 * meer regels, hoe meer een verzonnen zoekterm eruit rolt die niemand ooit
 * typte. Lukt de afleiding niet goed genoeg, dan levert deze functie `null`,
 * en blijft `prompts.volume_source` op `geschat` staan (conventie 3).
 *
 * Puur en zonder `server-only` (conventie 2): dit bepaalt of een prompt straks
 * een gemeten of een geschat gewicht krijgt, en dat hoort onder test.
 */

/**
 * Onder deze lengte is er te weinig over om een zoekterm te zijn: een enkel
 * woord van drie letters is vaker een resterend lidwoord dan een kern.
 */
export const MIN_KEYWORD_LENGTH = 4;

/**
 * Vraagzinnen die de kern inleiden. Langste eerst, zodat "hoeveel kost" vóór
 * het kortere "hoeveel" wordt geprobeerd.
 */
const VRAAG_PREFIXEN = [
  "wat kost",
  "hoeveel kost",
  "hoe duur is",
  "wat is de prijs van",
  "waar kan ik",
  "waar vind ik",
  "wat zijn de kosten van",
  "hoe vind ik",
  "hoe kies ik",
  "wat is",
  "wat zijn",
  "hoe werkt",
  "hoe lang duurt",
  "hoe vaak",
  "wanneer moet",
  "wanneer is",
  "welke",
  "waarom",
  "hoe",
  "kan ik",
  "moet ik",
];

/** Lidwoorden en voegwoorden die geen deel van een zoekterm horen te zijn. */
const VULWOORDEN = new Set([
  "de",
  "het",
  "een",
  "en",
  "of",
  "dat",
  "die",
  "dit",
  "als",
  "voor",
  "van",
  "bij",
  "op",
  "in",
  "met",
  "je",
  "jouw",
  "mijn",
  "ik",
]);

/**
 * Splitst een samengestelde vraag bij het eerste voegwoord ("en", "of") en
 * gebruikt alleen het eerste deel: dat is meestal de hoofdvraag, en een
 * zoekterm met twee onderwerpen erin vindt niemand terug.
 */
function eersteDeel(zin: string): string {
  const match = zin.match(/^(.*?)\s+(en|of)\s+/i);
  return match ? match[1] : zin;
}

/**
 * Leidt een zoekterm af uit een meetvraag, of `null` als dat niet lukt.
 *
 * `null` bij: een lege of te korte invoer, of een resultaat dat na het
 * strippen nog steeds korter is dan `MIN_KEYWORD_LENGTH`.
 */
/**
 * Google Ads' eigen woordlimiet per zoekterm. Nagemeten tegen een echt
 * DataForSEO-account op 19 september 2026 (docs/logbook.md): 10 woorden
 * lukt, 11 geeft `status_code 40501` ("Keyword text has too many words")
 * terug, en dat is een fout op het niveau van de hele batch waar de term
 * toevallig in zat, niet alleen van die ene term.
 */
export const MAX_WOORDEN_PER_ZOEKTERM = 10;

/** Past deze term binnen Google Ads' woordlimiet? */
export function binnenWoordlimiet(term: string): boolean {
  const woordenAantal = term.trim().split(/\s+/).filter(Boolean).length;
  return woordenAantal > 0 && woordenAantal <= MAX_WOORDEN_PER_ZOEKTERM;
}

export function afleidenZoekterm(vraag: string): string | null {
  let tekst = vraag
    .trim()
    .toLowerCase()
    .replace(/[?!.]+$/, "")
    .trim();
  if (!tekst) return null;

  tekst = eersteDeel(tekst).trim();

  for (const prefix of VRAAG_PREFIXEN) {
    if (tekst.startsWith(`${prefix} `)) {
      tekst = tekst.slice(prefix.length).trim();
      break;
    }
  }

  const woorden = tekst
    .split(/\s+/)
    .filter((w) => w.length > 0 && !VULWOORDEN.has(w));

  const resultaat = woorden.join(" ").trim();
  return resultaat.length >= MIN_KEYWORD_LENGTH ? resultaat : null;
}
