import "server-only";

/**
 * Gewicht van een prompt voor de GEWOGEN zichtbaarheidsscore (abcplan.md §6 A3):
 * verwacht zoekvolume × commerciële waarde. Zo tellen populaire, koopklare vragen
 * zwaarder dan een informatieve niche-vraag. Ondergrens 0,1 zodat geen enkele
 * prompt volledig wegvalt.
 *
 * Waardefactor per intent-type (vastgelegd, makkelijk bij te stellen):
 *   transactional (koopklaar) 1,0 · commercial (vergelijkend) 0,6 · informational 0,3.
 * Onbekend/handmatige prompt → neutrale 0,6 en volume 50.
 */
export const VALUE_FACTOR: Record<string, number> = {
  transactional: 1.0,
  commercial: 0.6,
  informational: 0.3,
};

/**
 * Ondergrens zodat geen enkele prompt volledig wegvalt.
 *
 * Stond op 0,1 — te hoog (optimalisatie.md 0.10): een informatieve vraag heeft
 * waardefactor 0,3, dus alles met een geschat volume tot 33 kwam uit onder 0,1
 * en werd naar diezelfde 0,1 opgetrokken. Een informatieve niche-vraag (volume
 * 5) woog daardoor precies even zwaar als een informatieve breed-gezochte vraag
 * (volume 33) — juist in de staart waar het gewicht onderscheid moest maken.
 *
 * Met 0,02 wordt de ondergrens alleen nog geraakt door vragen met een volume
 * onder ~7 bij de laagste waardefactor: een echte uitzondering in plaats van
 * een derde van het veld.
 */
const MIN_WEIGHT = 0.02;

/**
 * Gewicht voor een meting waarvan het gewicht niet bevroren is (rijen van vóór
 * migratie 0010, of een handmatig toegevoegde prompt zonder tags). Dit is
 * bewust het NEUTRALE gewicht — volume 50, waardefactor 0,6 — en niet de
 * ondergrens: "onbekend" betekent gemiddeld, niet onbelangrijk. Voorheen stond
 * hier op drie plekken een losse `?? 0.1`, wat onbekende prompts ten onrechte
 * als de minst waardevolle behandelde.
 */
export const NEUTRAL_WEIGHT = 0.3;

export function promptWeight(
  volumeEstimate: number | null,
  intentType: string | null,
): number {
  const volume = volumeEstimate == null ? 50 : Math.max(0, Math.min(100, volumeEstimate));
  const valueFactor = intentType != null ? VALUE_FACTOR[intentType] ?? 0.6 : 0.6;
  const raw = (volume / 100) * valueFactor;
  return Math.max(MIN_WEIGHT, Number(raw.toFixed(4)));
}
