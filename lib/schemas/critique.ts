import { z } from "zod";

/**
 * Fase C — redactie/kritiek-stap (contentkwaliteit-analyse.md C3, abcplan.md §8).
 * Een aparte, goedkope call (model mini) beoordeelt de draft op een rubric en
 * markeert regel-risico's. Output stuurt de herschrijf-stap én de kwaliteitspoort.
 *
 * UITGEBREID IN FASE 4 (optimalisatie.md 4.5). De beoordelaar scoorde op vijf
 * dingen: answer-first, on-brand, concreet, scanbaar, geen slop. Allemaal
 * REDACTIONEEL. Geen enkel criterium ging over de vraag of een AI deze pagina
 * zou citeren — terwijl daar het hele product over gaat. Een tekst kan
 * vlekkeloos zijn en tegelijk volstrekt onciteerbaar.
 */

/**
 * De GEO-criteria: wordt deze pagina door een AI-assistent aangehaald?
 *
 * Bewust booleans en geen scores. "7 op citeerbaarheid" is een getal waar
 * niemand iets mee kan; "de doelvraag wordt niet in de eerste twee zinnen
 * beantwoord" is een instructie voor de herschrijfronde.
 */
export const GeoCriteria = z.object({
  /**
   * Wordt de doelvraag LETTERLIJK en binnen de eerste twee zinnen beantwoord?
   * Een AI die een antwoord zoekt, leest de inleiding niet uit.
   */
  answersTargetQuestionUpFront: z.boolean(),
  /**
   * Bevat elke sectie minstens één zin die LOSSTAAND te citeren is —
   * begrijpelijk zonder de rest van de pagina? Dat is de eenheid waarin een
   * AI-assistent knipt.
   */
  hasStandaloneCitableSentences: z.boolean(),
  /**
   * Worden het bedrijf en zijn eigenschappen EXPLICIET benoemd, in plaats van
   * "wij" en "ons"? Een model dat "wij leveren binnen 24 uur" leest, weet niet
   * wie "wij" is en kan het bedrijf dus niet noemen in z'n antwoord.
   */
  namesTheBusinessExplicitly: z.boolean(),
  /** Zijn er concrete cijfers, jaartallen of feiten verwerkt uit de feitenlijst? */
  usesConcreteFacts: z.boolean(),
  /** Beantwoordt de pagina naast de hoofdvraag ook de logische vervolgvragen? */
  answersFollowUpQuestions: z.boolean(),
});

export type GeoCriteria = z.infer<typeof GeoCriteria>;

export const Critique = z.object({
  /** Rubric-score 0-100: answer-first, on-brand, concreet-waar-mogelijk, scanbaar, waardevol. */
  qualityScore: z.number(),
  /**
   * Voldoet de draft aan de HARDE regels? (geen concurrent-/bedrijfsnamen,
   * geen verzonnen feiten, begint met het directe antwoord). Bij `false` is
   * herschrijven nodig én markeren we voor menselijke controle.
   */
  followsRules: z.boolean(),
  /** Zou een AI-assistent deze pagina citeren? Zie GeoCriteria. */
  geo: GeoCriteria,
  /** Concrete, actionable verbeterpunten voor de herschrijf-stap. Leeg = niets te verbeteren. */
  issues: z.array(z.string()),
});

export type Critique = z.infer<typeof Critique>;

/** Alle GEO-criteria op een rij, met een leesbare naam voor de UI en de feedback. */
export const GEO_CRITERIA_LABELS: Record<keyof GeoCriteria, string> = {
  answersTargetQuestionUpFront: "beantwoordt de doelvraag meteen",
  hasStandaloneCitableSentences: "bevat losstaand citeerbare zinnen",
  namesTheBusinessExplicitly: "noemt het bedrijf expliciet",
  usesConcreteFacts: "gebruikt concrete feiten",
  answersFollowUpQuestions: "beantwoordt vervolgvragen",
};

/**
 * De GEO-score: het percentage criteria dat gehaald is.
 *
 * Even zwaar wegen is een keuze. Je zou "beantwoordt de doelvraag meteen"
 * zwaarder kunnen laten tellen, maar dan wordt de score een gewogen gemiddelde
 * waarvan niemand meer kan nazoeken hoe hij tot stand kwam — en de vijf
 * vinkjes eronder vertellen het echte verhaal.
 */
export function geoScore(geo: GeoCriteria): number {
  const values = Object.values(geo);
  const met = values.filter(Boolean).length;
  return Math.round((met / values.length) * 100);
}

/** De criteria die NIET gehaald zijn, als verbeterpunten voor de herschrijfronde. */
export function geoIssues(geo: GeoCriteria): string[] {
  return (Object.keys(GEO_CRITERIA_LABELS) as (keyof GeoCriteria)[])
    .filter((key) => !geo[key])
    .map((key) => `GEO: de pagina ${GEO_CRITERIA_LABELS[key]} nog niet.`);
}
