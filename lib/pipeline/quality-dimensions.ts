/**
 * De KWALITEITSDIMENSIES: waaruit bestaat "goed" bij een contentpagina?
 * (docs/tasks/contentkwaliteit-framework.md §4.1)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Tot 2 september 2026 had een pagina drie cijfers: `quality_score` (één getal
 * dat de redactionele beoordelaar zelf samenvatte uit vijf criteria),
 * `geo_score` en `coverage_score`. Gemeten over 43 pagina's op productie stond
 * de GEO-score gemiddeld op 97,4 en op de drie slechtste pagina's van de laatste
 * ronde zelfs op 100. Een cijfer dat bijna altijd vol staat, zegt niets meer.
 *
 * En belangrijker: geen van de drie zegt WAAROM. "68 van de 100" is geen
 * diagnose, en de 72 losse zinnen in `review_notes` die eronder stonden ook
 * niet. Een dimensie is de kleinste eenheid waarin een oordeel nog een reden
 * heeft: niet "de pagina is matig" maar "de diepgang is onvoldoende, en dat komt
 * doordat drie secties onder hun richtlengte bleven".
 *
 * ── WAAROM PRECIES DEZE TWAALF ──────────────────────────────────────────────
 *
 * De opdracht noemde vijftien kandidaten. Drie zijn afgevallen omdat er geen
 * bron in de app is die ze kan vullen, en een dimensie zonder bron is een
 * cijfer dat iemand verzint:
 *
 *   • "commerciële integriteit"  → valt samen met `feitelijkheid` (een claim
 *     zonder bewijs) en met de harde regel op verboden onderwerpen.
 *   • "menselijke kwaliteit"     → is de UITKOMST van dit hele raamwerk, geen
 *     losse dimensie. Zie `docs/tasks/contentkwaliteit-framework.md` §31.
 *   • "betrouwbaarheid van claims"→ is `bewijs`, met een andere naam.
 *
 * Elke dimensie hieronder heeft minstens één bron die hem vult, en bij de meeste
 * is dat een DETERMINISTISCHE bron. Zie `QUALITY_DIMENSION_SOURCES`.
 *
 * Bewust ZONDER `server-only` (conventie 2): pure definities en pure rekenkunde,
 * testbaar vanuit `scripts/test-unit.ts`.
 */

/**
 * De twaalf dimensies. De volgorde is die van de opdracht en is tegelijk de
 * volgorde waarin ze op het adviseursscherm staan: eerst wat waar is, dan wat
 * compleet is, dan hoe het leest.
 */
export const QUALITY_DIMENSIONS = [
  "feitelijkheid",
  "bewijs",
  "relevantie",
  "specificiteit",
  "expertise",
  "volledigheid",
  "diepgang",
  "originaliteit",
  "structuur",
  "leesbaarheid",
  "toon",
  "overtuiging",
] as const;

export type QualityDimension = (typeof QUALITY_DIMENSIONS)[number];

/** Wat elke dimensie betekent, in de taal van de klant. Geen jargon. */
export const DIMENSION_LABELS: Record<QualityDimension, string> = {
  feitelijkheid: "klopt wat er staat",
  bewijs: "onderbouwd met jouw gegevens",
  relevantie: "beantwoordt de vraag waarvoor de pagina bedoeld is",
  specificiteit: "gaat over jouw bedrijf en niet over de branche",
  expertise: "laat vakkennis zien",
  volledigheid: "behandelt alles wat erop hoort",
  diepgang: "gaat verder dan de oppervlakte",
  originaliteit: "zegt iets eigens in plaats van het bekende verhaal",
  structuur: "is overzichtelijk opgebouwd",
  leesbaarheid: "leest prettig",
  toon: "klinkt zoals jouw bedrijf klinkt",
  overtuiging: "zet een lezer aan tot contact",
};

/**
 * Waar de score van een dimensie vandaan komt.
 *
 * `deterministisch` = de code kan hem tellen, altijd, gratis.
 * `beoordeeld`      = er is een AI-oordeel voor nodig.
 * `gemengd`         = de code levert een deel, het model de rest.
 *
 * Dit is niet documentatie maar een controle: `scripts/test-unit.ts` rekent na
 * dat elke dimensie in dit raamwerk een bron heeft, zodat er nooit een cijfer
 * op het scherm komt dat niemand kan navertellen (conventie 3).
 */
export const QUALITY_DIMENSION_SOURCES: Record<
  QualityDimension,
  { soort: "deterministisch" | "beoordeeld" | "gemengd"; bron: string }
> = {
  feitelijkheid: {
    soort: "gemengd",
    bron: "feitelijkheidsbeoordelaar, bronherleidbaarheid, bewerende zinnen zonder claim",
  },
  bewijs: { soort: "deterministisch", bron: "gewogen bewijsdekking en kritieke dekking" },
  relevantie: { soort: "gemengd", bron: "checkContentGate, citeerbaarheidsbeoordelaar" },
  specificiteit: { soort: "gemengd", bron: "vakmanschapsbeoordelaar, F-nummers per honderd woorden" },
  expertise: { soort: "beoordeeld", bron: "vakmanschapsbeoordelaar" },
  volledigheid: { soort: "gemengd", bron: "contractdekking, resterende lezersvragen" },
  diepgang: { soort: "gemengd", bron: "vakmanschapsbeoordelaar, woorden per sectie tegen richtlengte" },
  originaliteit: { soort: "gemengd", bron: "vakmanschapsbeoordelaar, gelijkenis met bestaande pagina's" },
  structuur: { soort: "deterministisch", bron: "checkContentGate, sectie-indeling, JSON-LD" },
  leesbaarheid: { soort: "deterministisch", bron: "checkQuality, gemiddelde zinslengte" },
  toon: { soort: "beoordeeld", bron: "vakmanschapsbeoordelaar tegen de tone-of-voice-schuiven" },
  overtuiging: { soort: "beoordeeld", bron: "vakmanschapsbeoordelaar" },
};

/**
 * De dimensies die voor ÉLK contenttype meetellen, wat voor pagina het ook is.
 *
 * Vier, en dat is bewust weinig. Een FAQ hoeft niet te overtuigen en een
 * dienstenpagina hoeft geen diepgang van een kennisartikel te hebben, maar geen
 * enkele pagina mag onwaar zijn, langs de vraag heen praten, rommelig zijn of
 * onleesbaar. Dat is de ondergrens die geen enkel paginatype mag onderschrijden.
 */
export const UNIVERSELE_DIMENSIES: readonly QualityDimension[] = [
  "feitelijkheid",
  "relevantie",
  "structuur",
  "leesbaarheid",
];

/** Is dit een geldige dimensienaam? Voor het inlezen van opgeslagen JSON. */
export function isQualityDimension(waarde: unknown): waarde is QualityDimension {
  return typeof waarde === "string" && (QUALITY_DIMENSIONS as readonly string[]).includes(waarde);
}
