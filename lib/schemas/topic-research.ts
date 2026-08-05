import { z } from "zod";

/**
 * Onderwerp-onderzoek (per analyse, halte A1'): alleen wat specifiek is voor
 * dit product of thema, het bedrijfsbrede deel zit al in het klantprofiel.
 */
export const TopicResearch = z.object({
  /** Wat de website specifiek zegt over dit product of thema. */
  contentSummary: z.string(),
  /**
   * 3–5 concurrenten specifiek relevant voor dit product of thema, ALLEEN de
   * bedrijfsnaam of merknaam, geen toelichting en geen bronvermelding. Dit veld wordt
   * als losse chips getoond op het conceptscherm (zie TopicResearchEditor); een
   * volledige zin per item maakt dat scherm onleesbaar.
   */
  competitors: z.array(z.string().describe("Alleen de bedrijfsnaam of merknaam, bv. \"Ebiketogo\". Geen toelichting, geen link.")),
});

export type TopicResearch = z.infer<typeof TopicResearch>;
