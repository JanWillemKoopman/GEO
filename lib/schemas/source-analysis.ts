import { z } from "zod";

/**
 * Fase 4.4, analyse van de pagina's die de AI CITEERDE. Model mini, geen
 * web_search (de pagina's zijn al opgehaald met de eigen crawler).
 *
 * Dit is de lat: wat deden deze pagina's goed genoeg om aangehaald te worden?
 * De uitkomst gaat als context de schrijfopdracht in.
 */
export const SourceAnalysis = z.object({
  sources: z.array(
    z.object({
      url: z.string(),
      /** Welke concrete vragen deze pagina beantwoordt. */
      answersQuestions: z.array(z.string()),
      /** In welke vorm: stappenplan, tabel, FAQ, prijslijst, definitie, … */
      format: z.string(),
      /** Harde feiten: cijfers, jaartallen, termijnen, prijzen. */
      concreteFacts: z.array(z.string()),
    }),
  ),
  /**
   * Waar de nieuwe pagina het verschil kan maken. Het waardevolste veld van de
   * hele analyse: niet "wat staat er", maar "wat staat er níét".
   */
  whatIsMissing: z.string(),
});

export type SourceAnalysis = z.infer<typeof SourceAnalysis>;
