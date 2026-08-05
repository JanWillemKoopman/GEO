import { z } from "zod";

/**
 * Halte 2, Prompt-generatie (abcplan.md §6 A2). Eén call per FUNNELFASE, op de
 * quality-tier. Elke prompt krijgt fijnere tags mee voor latere analyse (intent,
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
      /** Koopintentie ja of nee. */
      purchaseIntent: z.boolean(),
      /** Kort thema-/topic-label (bv. "hardloopschoenen") om prompts/content te groeperen. */
      cluster: z.string(),
    }),
  ),
});

export type PromptSet = z.infer<typeof PromptSet>;

/**
 * Volume-kalibratie (abcplan.md §6 A2): één call die ALLE gegenereerde prompts
 * van een analyse in één keer t.o.v. elkaar weegt naar verwacht zoekvolume.
 * Relatief kalibreren is consistenter dan losse per-prompt-schattingen. Elke
 * prompt wordt via z'n 1-based `index` teruggekoppeld; `volume` is 0-100
 * (0 = zeer specifiek/zelden, 100 = zeer populair/breed), een SCHATTING, geen
 * echte index.
 */
export const VolumeCalibration = z.object({
  weights: z.array(
    z.object({
      index: z.number(),
      volume: z.number(),
    }),
  ),
});

export type VolumeCalibration = z.infer<typeof VolumeCalibration>;
