import { z } from "zod";

/**
 * Het BEOORDELAARSPANEL (docs/tasks/contentpijplijn-herontwerp.md A5).
 *
 * Eén beoordelaar deed tot nu toe alles tegelijk: redactie, harde regels en de
 * vijf GEO-criteria, op de goedkope tier met redeneerinspanning `none`. Dat is
 * de goedkoopste stand van het goedkoopste model voor het oordeel over het
 * duurste product van de app.
 *
 * Nu drie beoordelaars die elk één ding doen en die parallel draaien. Ze staan
 * bewust nog steeds op de goedkope tier, maar mét redeneertijd (werk-soort
 * `judging`, lib/openai/sampling.ts): gemeten op productie kost een
 * beoordeling daar ongeveer een tiende cent, dus drie ervan kosten samen minder
 * dan een cent per pagina. De dure tier is een keuze voor later, en pas als
 * deze aantoonbaar tekortschiet.
 *
 * De redactionele beoordelaar houdt zijn bestaande schema (`Critique`): dat
 * voedt `quality_score`, en die reeks moet vergelijkbaar blijven met de
 * pagina's van vorige maand.
 */

/** Wat de FEITELIJKHEIDSbeoordelaar oplevert. */
export const FactualityVerdict = z.object({
  /**
   * Zinnen die een bewering over het bedrijf doen zonder dat de feitenkaart ze
   * dekt. Dit is de categorie waarin de twee fabricages van 31 juli vielen.
   */
  unsupportedSentences: z.array(
    z.object({
      sentence: z.string(),
      /** In welke sectie hij staat, zodat de reparatie weet wat hij mag aanraken. */
      section: z.string(),
      why: z.string(),
    }),
  ),
  /** Algemene uitleg die als belofte van dit bedrijf gelezen kan worden. */
  overreachingClaims: z.array(z.string()),
  /** Geen enkele bewering zonder dekking gevonden? */
  allClaimsCovered: z.boolean(),
});

export type FactualityVerdict = z.infer<typeof FactualityVerdict>;

/** Wat de CITEERBAARHEIDSbeoordelaar oplevert. */
export const CitabilityVerdict = z.object({
  /**
   * Per deelvraag uit het contract: wordt hij op de pagina beantwoord, en met
   * welke zin? Dit is het inhoudelijke oordeel naast de deterministische
   * dekkingspoort, die alleen op woordoverlap kan kijken.
   */
  subQuestionAnswers: z.array(
    z.object({
      subQuestion: z.string(),
      answered: z.boolean(),
      /** De zin die het antwoord geeft. Leeg als `answered` false is. */
      answeringSentence: z.string(),
    }),
  ),
  /** Vragen die een lezer na deze pagina nog heeft. Dit is het "er ontbreekt iets"-signaal. */
  remainingReaderQuestions: z.array(z.string()),
  /** Concrete verbeterpunten, elk met de sectie waar ze op slaan. */
  issues: z.array(z.object({ section: z.string(), issue: z.string() })),
});

export type CitabilityVerdict = z.infer<typeof CitabilityVerdict>;
