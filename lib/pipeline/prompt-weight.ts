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

const MIN_WEIGHT = 0.1;

export function promptWeight(
  volumeEstimate: number | null,
  intentType: string | null,
): number {
  const volume = volumeEstimate == null ? 50 : Math.max(0, Math.min(100, volumeEstimate));
  const valueFactor = intentType != null ? VALUE_FACTOR[intentType] ?? 0.6 : 0.6;
  const raw = (volume / 100) * valueFactor;
  return Math.max(MIN_WEIGHT, Number(raw.toFixed(4)));
}
