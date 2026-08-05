import { z } from "zod";

/**
 * Fase B2, Rapport & aanbevelingen (abcplan.md §7). Model mini, geen web_search.
 * Jargon-vrij; elke aanbeveling wordt straks een content_piece.
 */
export const Report = z.object({
  headlineScore: z.number(),
  summary: z.string(), // jargon-vrij, plain-language
  gaps: z.array(
    z.object({
      cluster: z.string(),
      problem: z.string(), // "AI noemt concurrent X, jou niet"
      evidenceRunIds: z.array(z.string()), // verwijzing naar tracking_runs.id
    }),
  ),
  recommendations: z.array(
    z.object({
      title: z.string(),
      type: z.enum(["article", "faq", "landing", "comparison"]),
      targetIntent: z.string(),
      why: z.string(), // waarom dit de gap dicht
      priority: z.number(),
      // Content-inventaris (abcplan.md §12.23): bestaande pagina verbeteren of nieuw?
      action: z.enum(["nieuw", "verbeteren"]),
      existingUrl: z.string().nullable(), // url uit profile_pages als action = "verbeteren"
      /**
       * WELKE GEMISTE VRAGEN deze pagina moet gaan winnen (optimalisatie.md 4.1/4.2).
       *
       * De codes (V1, V2, …) komen uit de genummerde lijst gemiste vragen in de
       * invoer. Bewust codes en géén letterlijke vraagteksten: een model dat een
       * vraag moet overtypen maakt er net iets anders van, en dan is de koppeling
       * met `prompts.id` weg. Precies de koppeling waar deze hele fase op rust.
       */
      targetQuestionIds: z.array(z.string()),
    }),
  ),
  /**
   * Concrete feiten die we aan de KLANT moeten vragen (optimalisatie.md 4.6).
   *
   * De schrijfinstructie zegt "verzin geen feiten, blijf algemeen bij twijfel".
   * Bij een dunne website levert dat gegarandeerd algemene tekst op, en
   * algemeen is precies wat niet geciteerd wordt. In plaats van dat te
   * accepteren, vragen we ernaar.
   */
  factRequests: z.array(
    z.object({
      question: z.string(), // "Hoeveel jaar bestaan jullie?"
      reason: z.string(), // waarom dit de content beter maakt
    }),
  ),
});

export type Report = z.infer<typeof Report>;
