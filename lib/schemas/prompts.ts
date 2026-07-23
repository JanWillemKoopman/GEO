import { z } from "zod";

/**
 * Halte 2 — Prompt-generatie (abcplan.md §6 A2). 5 aparte calls, één per
 * categorie; model gpt-4.1-mini. Elke call levert ~6 prompts voor díe categorie.
 */
export const PromptSet = z.object({
  prompts: z.array(
    z.object({
      text: z.string(),
      /** Onderliggende intentie/job-to-be-done van de vraag (§inspaceplan 6-staps methodiek). */
      intent: z.string(),
    }),
  ),
});

export type PromptSet = z.infer<typeof PromptSet>;
