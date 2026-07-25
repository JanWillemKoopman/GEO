import { z } from "zod";

/**
 * Onderwerp-onderzoek (per analyse, halte A1'): alleen wat specifiek is voor
 * dit product/thema — het bedrijfsbrede deel zit al in het klantprofiel.
 */
export const TopicResearch = z.object({
  /** Wat de website specifiek zegt over dit product/thema. */
  contentSummary: z.string(),
  /** 3–5 concurrenten specifiek relevant voor dit product/thema. */
  competitors: z.array(z.string()),
});

export type TopicResearch = z.infer<typeof TopicResearch>;
