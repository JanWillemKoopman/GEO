import { z } from "zod";

/**
 * Wat de EINDREDACTIE oplevert (L8, docs/tasks/contentpijplijn-publicatiewaardig.md
 * §5 en §6, WP5): de geredigeerde pagina en een logboek per wijziging. De code
 * rekent de redactie na (`redactie-check.ts`) en draait hem terug naar het
 * concept als er een nieuw feit in sloop.
 */
export const REDACTIE_SOORTEN = ["relativering", "herhaling", "adviestoon", "stem", "lengte", "helderheid"] as const;

export const EditorialPass = z.object({
  bodyMarkdown: z.string(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  metaTitle: z.string().max(60),
  metaDescription: z.string().max(160),
  /** De VOLLEDIGE lijst beweringen na de redactie, elk met F-nummer en letterlijk citaat. */
  claims: z.array(z.object({ claim: z.string(), factRef: z.string(), quote: z.string() })),
  /** De bewijspunten zoals ze na de redactie in de tekst staan. */
  proofPoints: z.array(z.object({ factRef: z.string(), betekenis: z.string(), relevantie: z.string() })),
  /** Het logboek (EditorialLog, §6): per wijziging wat, waarom, en of het een feit raakte. */
  wijzigingen: z.array(
    z.object({
      was: z.string(),
      wordt: z.string(),
      soort: z.enum(REDACTIE_SOORTEN),
      raaktFeit: z.boolean(),
    }),
  ),
});
export type EditorialPass = z.infer<typeof EditorialPass>;
