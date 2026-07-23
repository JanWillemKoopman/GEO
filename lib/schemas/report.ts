import { z } from "zod";

/**
 * Fase B2 — Rapport & aanbevelingen (abcplan.md §7). Model mini, geen web_search.
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
      priority: z.number(), // 1–3
    }),
  ),
});

export type Report = z.infer<typeof Report>;
