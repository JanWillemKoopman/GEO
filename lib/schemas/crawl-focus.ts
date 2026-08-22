import { z } from "zod";

/**
 * Welke secties van een grote site het aanbod dragen.
 *
 * ── WAAROM HET MODEL GEEN URL'S TERUGGEEFT ──────────────────────────────────
 *
 * De verleiding is om te vragen "geef alle dienstenpagina's van deze klant".
 * Dat levert een lijst op die er goed uitziet en die deels verzonnen is:
 * modellen vullen URL-patronen aan, dus `/diensten/sportmassage` komt terug ook
 * als de pagina `/behandelingen/massage` heet. Je zou elke URL daarna alsnog met
 * een fetch moeten natrekken.
 *
 * Wij weten de URL's al: ze staan in de sitemap. Het model krijgt daarom de
 * ECHTE sectielijst mee en kiest daaruit. Verzinnen is dan geen risico meer maar
 * een onmogelijkheid: een segment dat niet in de aangeboden lijst stond, wordt
 * in `crawl-focus.ts` weggegooid (conventie 1, een promptinstructie is een
 * intentie en code een garantie).
 */
export const CrawlFocus = z.object({
  /**
   * De sectiepaden die voorrang krijgen, zoals ze in de aangeboden lijst staan
   * (`/diensten`, `/behandelingen`). Hoogste prioriteit eerst.
   */
  prioritySegments: z.array(z.string()),
  /**
   * Waarom deze secties. Eén zin, gaat naar de logregel en het merkprofiel, zodat
   * een mens kan zien waaróm de crawl zich hierop richtte en het kan corrigeren.
   */
  reasoning: z.string(),
});

export type CrawlFocus = z.infer<typeof CrawlFocus>;
