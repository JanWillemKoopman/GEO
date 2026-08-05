import { z } from "zod";

/**
 * Fase B1, Concurrentie-gap-analyse (abcplan.md §7). Model mini, geen web_search.
 * Bewijs als ID-verwijzing naar tracking_runs.id (§12.17), niet als losse tekst.
 */
export const GapAnalysis = z.object({
  gaps: z.array(
    z.object({
      competitor: z.string(),
      cluster: z.string(), // categorie waar de concurrent wint
      evidence: z.string(), // concreet: hoeveel/waarom, welke bronnen
      evidenceRunIds: z.array(z.string()), // verwijzing naar tracking_runs.id
      citedSourcesForCompetitor: z.array(z.string()),
    }),
  ),
  strengths: z.array(
    z.object({
      cluster: z.string(),
      evidence: z.string(),
    }),
  ),
});

export type GapAnalysis = z.infer<typeof GapAnalysis>;
