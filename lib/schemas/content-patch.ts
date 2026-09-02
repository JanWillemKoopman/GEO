import { z } from "zod";

/**
 * De GERICHTE REPARATIE (docs/tasks/contentpijplijn-herontwerp.md A6).
 *
 * Waar `ContentPiece` een hele pagina is, is dit alleen wat er verandert. Het
 * model krijgt de bevindingen per sectie en levert alleen die secties terug;
 * `applySectionPatch()` (lib/pipeline/content-sections.ts) zet ze op hun plek.
 *
 * Ooit was het idee dat dit ook goedkoper zou zijn: een volledige herschrijving
 * kostte op productie $0,162 aan uitvoertokens, een sectie leek een fractie
 * daarvan. Gemeten op `ai_calls` (2 september 2026, herstelplan T1.4) klopt dat
 * niet: één reparatieronde kost gemiddeld $0,26, meer dan de volledige
 * herschrijving van vroeger. De echte winst is kwaliteit: het model kan de
 * secties die al goed waren niet meer stukmaken, omdat het ze niet terugstuurt.
 */
export const ContentPatch = z.object({
  /** De secties die je herschrijft. Kop = de bestaande kop, leeg = de aanhef. */
  sections: z.array(
    z.object({
      heading: z.string(),
      /** De volledige nieuwe sectie in Markdown, zonder de kopregel zelf. */
      markdown: z.string(),
    }),
  ),
  /** De volledige FAQ zoals hij na de reparatie moet zijn. Leeg = ongewijzigd laten. */
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  /**
   * Alle beweringen over het bedrijf op de pagina NA deze reparatie, met hun
   * F-nummer en het letterlijke citaat. Bewust de volledige lijst en niet
   * alleen die van de herschreven secties: `sourceCoverage()` rekent over de
   * hele pagina, en een halve lijst zou een dekking opleveren die niet over
   * deze tekst gaat.
   */
  claims: z.array(z.object({ claim: z.string(), factRef: z.string(), quote: z.string() })),
  /** Alleen invullen als de reparatie ze raakt; anders letterlijk de bestaande waarde. */
  metaTitle: z.string().max(60),
  metaDescription: z.string().max(160),
  /** Wat je hebt aangepast en waarom, in één zin per bevinding. Voor de audit-trail. */
  notes: z.array(z.string()),
});

export type ContentPatch = z.infer<typeof ContentPatch>;
