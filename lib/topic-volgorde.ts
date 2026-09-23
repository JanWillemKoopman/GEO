/**
 * De volgorde van voorgestelde onderwerpen als heel getal voor
 * `profile_topics.priority` (integer, hoogste bovenaan).
 *
 * Uit de positie in de lijst van het model, niet uit het getal dat het model
 * erbij zet: dat getal bleek op 23 september 2026 een kommagetal (0,95) en liet
 * de hele opslag mislukken. Zie `lib/pipeline/propose-topics.ts`.
 *
 * Bewust ZONDER `server-only` (conventie 2): pure functie, testbaar vanuit
 * `scripts/test-unit.ts`.
 */
export function topicPrioriteit(positie: number, max: number): number {
  const p = Math.max(0, Math.round(max) - Math.max(0, Math.floor(positie)));
  return Number.isFinite(p) ? p : 0;
}
