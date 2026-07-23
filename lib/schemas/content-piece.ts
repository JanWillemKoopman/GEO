import { z } from "zod";

/**
 * Fase C — Content-generatie (abcplan.md §8). Model mini, geen web_search.
 * LLM-geoptimaliseerd: direct antwoord, heldere koppen, FAQ, schema-markup.
 */
export const ContentPiece = z.object({
  title: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
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
});

export type ContentPiece = z.infer<typeof ContentPiece>;
