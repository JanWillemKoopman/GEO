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

/**
 * Zet een ECHT gemeten zoekvolume om in een band, relatief aan de zwaarste
 * vraag in dezelfde batch (docs/tasks/zoekdata-in-de-keten.md, blok C, §3.2
 * deel B).
 *
 * ⚠️ Bewust GEEN nieuwe absolute grenzen ("500 is hoog, 50 is midden"): dat
 * zou een cijfer uit de lucht grijpen zonder productiedata om het tegen af te
 * zetten (open vraag 3 van het plan, conventie 10). In plaats daarvan wordt
 * het echte volume herschaald naar de zwaarste vraag van de batch (= 100), en
 * beslissen dezelfde 60/25-grenzen als `bandFromEstimate()` de band. Zo blijft
 * er precies één plek die bepaalt waar "hoog" begint, gemeten of geschat.
 *
 * `zwaarsteVolume` van 0 of minder betekent dat er niets te herschalen valt:
 * dan is er geen meting, terug naar `bandFromEstimate(fallbackEstimate)`.
 *
 * ── ⚠️ DE ANKERFOUT DIE NOG OPENSTAAT (20 september 2026) ───────────────────
 *
 * Deze functie wordt op dit moment nooit met een echte meting aangeroepen: de
 * zoekvolumelaag is geparkeerd (`SEARCH_DEMAND_ENABLED`, zie
 * `lib/search-demand/registry.ts`), dus `gemetenVolume` is altijd `null` en
 * dit valt altijd terug op de schatting. Dat is maar goed ook, want er zit een
 * fout in die nog niet gerepareerd is.
 *
 * "De zwaarste van de batch" is alleen een eerlijk ijkpunt als die term ook
 * echt bij dit merk hoort, en dat wordt nergens gecontroleerd. Bij Van den
 * Udenhout was de zwaarste gemeten term "financiering": 2.400 zoekopdrachten
 * per maand met een CPC van 14,66 euro, dus hypotheken en zakelijke leningen,
 * niet autofinanciering bij een occasiondealer. Die term zou anker worden en
 * band `hoog` krijgen (gewicht 1,0 in `promptWeight()`), terwijl
 * "aankoopadvies" (50 per maand, wel passend) op index 2 uitkomt en naar het
 * minimumgewicht zakt. Het merkvreemde woord krijgt dan het hoogste gewicht.
 *
 * Wie deze laag ooit weer aanzet, repareert eerst dit: een gemeten term mag
 * pas meetellen als hij aantoonbaar bij dit merk hoort. Het materiaal daarvoor
 * ligt al klaar en wordt vandaag weggegooid: `keyword_demand` bewaart per term
 * ook `cpc` en `competition` (`lib/search-demand/cache.ts`), en geen enkele
 * consument leest ze.
 */
export function bandFromMeasuredVolume(
  gemetenVolume: number | null | undefined,
  zwaarsteVolume: number,
  fallbackEstimate: number | null | undefined,
): VolumeBand {
  if (gemetenVolume == null || zwaarsteVolume <= 0) return bandFromEstimate(fallbackEstimate);
  return bandFromEstimate((gemetenVolume / zwaarsteVolume) * 100);
}
