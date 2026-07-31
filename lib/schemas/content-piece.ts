import { z } from "zod";

/**
 * Fase C — Content-generatie (abcplan.md §8). Model mini, geen web_search.
 * LLM-geoptimaliseerd: direct antwoord, heldere koppen, FAQ, schema-markup.
 */
export const ContentPiece = z.object({
  title: z.string(),
  metaTitle: z.string().max(60), // Google kapt rond de 60 tekens af
  metaDescription: z.string().max(160),
  bodyMarkdown: z.string(), // volledige pagina in Markdown
  faq: z.array(
    z.object({
      q: z.string(),
      a: z.string(),
    }),
  ),
  schemaJsonLd: z.string(), // klaar om te plakken
  targetIntent: z.string(),
  cluster: z.string(),
  /**
   * Traceerbaarheid (contentbriefing.md §9, implementatieplan.md R5.3): per
   * concrete bewering over de klant het F-nummer van de feitenkaart dat hem
   * dekt.
   *
   * Het model moet zijn eigen tekst dus nalopen en per bewering de bron
   * aanwijzen. Dat is niet alleen administratie — het is wat het verzinnen
   * duur maakt. Een bewering zonder F-nummer valt op, en `sourceCoverage()`
   * rekent in code na of het genoemde nummer echt bestaat. Alleen algemene
   * uitleg over het onderwerp hoeft hier niet in; die bevat geen belofte van
   * deze klant.
   */
  claims: z.array(
    z.object({
      claim: z.string(),
      factRef: z.string(),
      /**
       * Het letterlijke fragment uit dat feit dat de bewering dekt. De code
       * controleert of het er echt in staat — een F-nummer noemen zonder de
       * dekkende zin te kunnen aanwijzen telt niet als onderbouwing.
       */
      quote: z.string(),
    }),
  ),
});

export type ContentPiece = z.infer<typeof ContentPiece>;
