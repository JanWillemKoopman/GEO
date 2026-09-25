import { z } from "zod";

/**
 * Wat de FAQ-SELECTIE oplevert (L6, docs/tasks/contentpijplijn-publicatiewaardig.md
 * §5 en §11, WP7): per kandidaatvraag houden of afwijzen, op welk van de vier
 * criteria hij sneuvelt, en voor een gehouden vraag waarop het antwoord rust.
 * De code past de criteria daarna zelf nog eens toe (`faq-criteria.ts`).
 */
export const FAQ_CRITERIA = [
  /** 1. Een echte lezer van deze pagina stelt hem, in zijn fase. */
  "lezer",
  /** 2. De tekst beantwoordt hem niet al. */
  "al beantwoord",
  /** 3. Het antwoord rust op een feit of vaste vakkennis. */
  "geen onderbouwing",
  /** 4. Het antwoord helpt richting dit bedrijf of neemt een drempel weg. */
  "helpt niet",
] as const;

export const FaqSelection = z.object({
  kandidaten: z.array(
    z.object({
      nummer: z.number().int(),
      houden: z.boolean(),
      /** Het criterium waarop hij sneuvelt; `null` bij een gehouden vraag. */
      criterium: z.enum(FAQ_CRITERIA).nullable(),
      reden: z.string(),
      /** Waarop het antwoord rust. */
      onderbouwing: z.enum(["feit", "vakkennis", "geen"]),
      /** De F-nummers bij onderbouwing "feit". */
      feiten: z.array(z.string()),
      /** Bij "vakkennis": de algemeen bekende uitleg in één zin. */
      vakkennis: z.string().nullable(),
    }),
  ),
});
export type FaqSelection = z.infer<typeof FaqSelection>;
