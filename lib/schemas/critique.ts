import { z } from "zod";

/**
 * Fase C — redactie/kritiek-stap (contentkwaliteit-analyse.md C3, abcplan.md §8).
 * Een aparte, goedkope call (model mini) beoordeelt de draft op een rubric en
 * markeert regel-risico's (de harde contentregels: merkneutraal, geen verzonnen
 * feiten, answer-first). Output stuurt de herschrijf-stap én de kwaliteitspoort (F1).
 */
export const Critique = z.object({
  /** Rubric-score 0-100: answer-first, on-brand, concreet-waar-mogelijk, scanbaar, waardevol. */
  qualityScore: z.number(),
  /**
   * Voldoet de draft aan de HARDE regels? (geen concurrent-/bedrijfsnamen,
   * geen verzonnen feiten, begint met het directe antwoord). Bij `false` is
   * herschrijven nodig én markeren we voor menselijke controle.
   */
  followsRules: z.boolean(),
  /** Concrete, actionable verbeterpunten voor de herschrijf-stap. Leeg = niets te verbeteren. */
  issues: z.array(z.string()),
});

export type Critique = z.infer<typeof Critique>;
