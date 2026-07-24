import { z } from "zod";

/**
 * Halte 2 — Prompt-generatie (abcplan.md §6 A2). Eén call per FUNNELFASE; model
 * gpt-4.1-mini. Elke prompt krijgt fijnere tags mee voor latere analyse (intent,
 * head/long-tail, koopintentie, cluster, geschat zoekvolume). De funnelfase zelf
 * komt niet uit het model (die is bekend per call).
 */
export const PromptSet = z.object({
  prompts: z.array(
    z.object({
      text: z.string(),
      /** Onderliggende intentie/job-to-be-done van de vraag (§inspaceplan 6-staps methodiek). */
      intent: z.string(),
      /** informational (leren) | commercial (vergelijken vóór aankoop) | transactional (klaar om te kopen). */
      intentType: z.enum(["informational", "commercial", "transactional"]),
      /** head (korte, brede vraag) | long_tail (lange, specifieke vraag). */
      specificity: z.enum(["head", "long_tail"]),
      /** Koopintentie ja/nee. */
      purchaseIntent: z.boolean(),
      /** Kort thema-/topic-label (bv. "hardloopschoenen") om prompts/content te groeperen. */
      cluster: z.string(),
      /**
       * GESCHAT zoekvolume 0-100 (GEEN echte index): het model schat hoe populair
       * deze vraag is. 0 = zeer specifiek/zelden gebruikt, 100 = zeer populair/breed.
       */
      volumeEstimate: z.number(),
    }),
  ),
});

export type PromptSet = z.infer<typeof PromptSet>;
