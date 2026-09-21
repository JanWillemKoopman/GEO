/**
 * Van een meetvraag naar een opzoekbare zoekterm
 * (docs/tasks/zoekdata-in-de-keten.md §3.2, deel B).
 *
 * ── EERST GEPROBEERD, EN WEER WEGGEHAALD: EEN VOLZIN TERUGKNIPPEN ───────────
 *
 * De eerste versie van deze module probeerde een hele meetvraag ("Wat kost
 * het gemiddeld om een daklekkage in Apeldoorn snel te laten repareren?")
 * terug te knippen tot een zoekterm door vraagwoorden en lidwoorden weg te
 * strippen. Op 19 september 2026 tegen een echt DataForSEO-account getest
 * (docs/logbook.md): van tien afgeleide termen kreeg er precies één een
 * resultaat, de rest was óf te lang óf te specifiek om ooit gezocht te
 * worden. Meer strip-regels lossen dat niet op: hoe meer regels, hoe meer
 * een verzonnen zoekterm eruit rolt die niemand ooit typte.
 *
 * ── WAT ER IN PLAATS DAARVAN GEBEURT: OPBOUWEN, NIET AFLEIDEN ───────────────
 *
 * `generatePromptsForStage()` (`lib/pipeline/prompts.ts`) geeft elke
 * meetvraag al een `cluster`: een kort thema-label ("dakrenovatie",
 * "hardloopschoenen"), en bij een lokaal bedrijf staat er een plaats uit
 * `profile.service_regions` LETTERLIJK in de vraag (harde regel aan het
 * model, zie `geoRule` in `prompts.ts`). Beide bouwstenen bestaan dus al en
 * zijn geen gok: het cluster-label is precies zo'n modeloutput als de
 * onderwerptitel die `propose-topics.ts` al als kandidaat-zoekterm gebruikt,
 * en de plaats staat vast in het profiel. `kandidaatZoektermen()` plakt ze
 * aan elkaar ("dakrenovatie" + "Apeldoorn" → "dakrenovatie apeldoorn") in
 * plaats van iets uit de vrije zin te destilleren.
 *
 * ── ÉÉN TERUGVALOPTIE: DE PLAATS KAN DE DATA JUIST WEGDRUKKEN ───────────────
 *
 * Diezelfde test op 19 september 2026 liet ook zien dat een plaats erbij
 * plakken niet altijd helpt: "bekkenfysiotherapie" had een gemeten volume van
 * 5.400 per maand, maar "bekkenfysiotherapie utrecht" leverde niets op, Google
 * Ads heeft simpelweg te weinig zoekvolume op dat combinatieniveau om het te
 * melden. Vandaar dat deze functie twee kandidaten teruggeeft, van specifiek
 * naar breed: eerst thema-plus-plaats, dan het thema alleen. De aanroeper
 * probeert ze in die volgorde en gebruikt de eerste met een echt volume
 * (conventie 3: geen gok, en liever een breder gemeten cijfer dan een
 * specifiek geschat cijfer).
 *
 * Puur en zonder `server-only` (conventie 2): dit bepaalt of een prompt straks
 * een gemeten of een geschat gewicht krijgt, en dat hoort onder test.
 */

/**
 * Onder deze lengte is er te weinig over om een zoekterm te zijn.
 */
export const MIN_KEYWORD_LENGTH = 4;

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

/**
 * Bouwt de kandidaat-zoektermen op voor één meetvraag, van specifiek naar
 * breed: eerst het thema-label plus de plaats die er letterlijk in staat (bij
 * een lokaal bedrijf), dan het thema-label alleen. Een lege lijst als er geen
 * bruikbaar thema-label is.
 *
 * Deterministisch: de plaats komt niet uit vrije tekstherkenning, maar uit
 * een letterlijke, hoofdletterongevoelige match tegen `serviceRegions`, de
 * lijst die het merk zelf heeft opgegeven. Staat er geen van die plaatsen in
 * de vraag (of is `serviceRegions` leeg, bijvoorbeeld bij een landelijk
 * bedrijf), dan is het thema-label de enige kandidaat. Noemt een vraag
 * toevallig twee plaatsen (zie `geoRule` in `prompts.ts`, "Nieuwegein of
 * Utrecht"), dan wint de eerste treffer in de volgorde van `serviceRegions`.
 */
export function kandidaatZoektermen(
  cluster: string,
  promptText: string,
  serviceRegions: string[],
): string[] {
  const thema = cluster.trim().toLowerCase().replace(/\s+/g, " ");
  if (thema.length < MIN_KEYWORD_LENGTH) return [];

  const tekstLower = promptText.toLowerCase();
  const plaats = serviceRegions
    .map((r) => r.trim().toLowerCase())
    .find((r) => r.length > 0 && tekstLower.includes(r));

  if (!plaats || thema.includes(plaats)) return [thema];
  return [`${thema} ${plaats}`, thema];
}
