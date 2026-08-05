/**
 * Hoe vaak wordt deze vraag gesteld? (optimalisatie.md 2.6)
 *
 * Tot nu toe schatte het model een getal van 0 tot 100 en ging dat cijfer
 * vermenigvuldigd het dashboard op als "Gewogen zichtbaarheid". Dat getal
 * suggereert een precisie die er niet is: het model heeft geen zoekvolumedata,
 * het heeft een gevoel. Het verschil tussen 62 en 68 bestaat niet, maar de
 * berekening deed alsof, en de klant zag "volume ~68/100" en dacht dat er iets
 * gemeten was.
 *
 * Daarom drie banden in plaats van honderd waarden. Wat het model wél kan. Deze
 * vraag is breder dan die, blijft behouden; wat het niet kan, hoeveel precies,
 * beweren we niet meer. En de klant kan de band per vraag bijstellen: hij weet
 * beter dan het model welke vragen zijn omzet opleveren.
 *
 * Bewust ZONDER `server-only`: ook de prompt-beheerschermen gebruiken dit.
 */

export const VOLUME_BANDS = ["hoog", "midden", "laag"] as const;
export type VolumeBand = (typeof VOLUME_BANDS)[number];

/** Wat de klant leest. Geen jargon, geen getal dat precisie suggereert. */
export const VOLUME_BAND_LABEL: Record<VolumeBand, string> = {
  hoog: "vaak gesteld",
  midden: "gemiddeld",
  laag: "weinig gesteld",
};

export const VOLUME_BAND_HELP: Record<VolumeBand, string> = {
  hoog: "Een brede vraag die veel mensen in deze markt stellen.",
  midden: "Een gewone vraag: niet de breedste, niet de smalste.",
  laag: "Een specifieke nichevraag: weinig mensen, maar vaak wel de juiste.",
};

/**
 * Wegingsfactor per band, voor de gewogen zichtbaarheidsscore.
 *
 * De verhouding 1 : 0,5 : 0,2 is een keuze, geen meting, een vaak gestelde
 * vraag telt vijf keer zo zwaar als een nichevraag. Bewust grofmazig: fijnere
 * verhoudingen zouden dezelfde schijnprecisie terugbrengen die we net
 * weghaalden.
 */
export const VOLUME_FACTOR: Record<VolumeBand, number> = {
  hoog: 1.0,
  midden: 0.5,
  laag: 0.2,
};

/** De band waarop we terugvallen als er niets bekend is: gemiddeld, niet onbelangrijk. */
export const DEFAULT_VOLUME_BAND: VolumeBand = "midden";

export function isVolumeBand(value: unknown): value is VolumeBand {
  return typeof value === "string" && (VOLUME_BANDS as readonly string[]).includes(value);
}

/**
 * Zet de oude 0-100-schatting om in een band.
 *
 * De grenzen (60 en 25) zijn zo gekozen dat een normale kalibratie ruwweg in
 * drieën valt, maar NIET per definitie: staan alle vragen van een analyse laag
 * op de schaal, dan komen ze allemaal in "weinig gesteld", en dat klopt dan
 * ook. Verdelen op rangorde zou elke analyse dwingen een derde "vaak gesteld"
 * te noemen, ook als dat niet zo is.
 */
export function bandFromEstimate(estimate: number | null | undefined): VolumeBand {
  if (estimate == null || Number.isNaN(estimate)) return DEFAULT_VOLUME_BAND;
  if (estimate >= 60) return "hoog";
  if (estimate >= 25) return "midden";
  return "laag";
}

/** Leest de band van een prompt-rij, met terugval op de oude schatting. */
export function volumeBandOf(prompt: {
  volume_band?: string | null;
  volume_estimate?: number | null;
}): VolumeBand {
  if (isVolumeBand(prompt.volume_band)) return prompt.volume_band;
  return bandFromEstimate(prompt.volume_estimate);
}
