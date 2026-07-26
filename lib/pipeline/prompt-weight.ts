/**
 * Gewicht van een prompt voor de GEWOGEN zichtbaarheidsscore (abcplan.md §6 A3):
 * hoe vaak de vraag gesteld wordt × hoe koopklaar hij is. Zo tellen populaire,
 * koopklare vragen zwaarder dan een informatieve nichevraag.
 *
 * Sinds optimalisatie.md 2.6 komt de volumekant uit een BAND (hoog/midden/laag)
 * en niet meer uit een verzonnen getal van 0 tot 100. Zie lib/pipeline/volume.ts
 * voor waarom.
 *
 * Waardefactor per intent-type (vastgelegd, makkelijk bij te stellen):
 *   transactional (koopklaar) 1,0 · commercial (vergelijkend) 0,6 · informational 0,3.
 * Onbekend/handmatige prompt → neutrale 0,6 en band 'midden'.
 *
 * Bewust ZONDER `server-only`: pure rekenkunde zonder geheimen, zodat de
 * prompt-schermen kunnen laten zien hoe zwaar een vraag meetelt en de functie in
 * een kaal script te testen is.
 */
import { VOLUME_FACTOR, DEFAULT_VOLUME_BAND, isVolumeBand } from "@/lib/pipeline/volume";

export const VALUE_FACTOR: Record<string, number> = {
  transactional: 1.0,
  commercial: 0.6,
  informational: 0.3,
};

/**
 * Ondergrens zodat geen enkele prompt volledig wegvalt.
 *
 * Met banden is de laagste echte waarde 0,2 × 0,3 = 0,06, dus deze grens wordt
 * in de praktijk niet meer geraakt. Hij blijft staan als vangnet voor een
 * onbekende intent-waarde die per ongeluk op 0 uitkomt: een prompt met gewicht 0
 * telt niet mee in de gewogen score en verdwijnt dan stil uit de meting.
 */
const MIN_WEIGHT = 0.02;

/**
 * Gewicht voor een meting waarvan het gewicht niet bevroren is (rijen van vóór
 * migratie 0010, of een handmatig toegevoegde prompt zonder tags). Dit is
 * bewust het NEUTRALE gewicht — band 'midden' (0,5) × waardefactor 0,6 — en niet
 * de ondergrens: "onbekend" betekent gemiddeld, niet onbelangrijk. Voorheen
 * stond hier op drie plekken een losse `?? 0.1`, wat onbekende prompts ten
 * onrechte als de minst waardevolle behandelde.
 */
export const NEUTRAL_WEIGHT = 0.3;

export function promptWeight(volumeBand: string | null, intentType: string | null): number {
  const band = isVolumeBand(volumeBand) ? volumeBand : DEFAULT_VOLUME_BAND;
  const valueFactor = intentType != null ? VALUE_FACTOR[intentType] ?? 0.6 : 0.6;
  const raw = VOLUME_FACTOR[band] * valueFactor;
  return Math.max(MIN_WEIGHT, Number(raw.toFixed(4)));
}
