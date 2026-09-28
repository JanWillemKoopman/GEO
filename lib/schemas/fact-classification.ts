import { z } from "zod";
import { FEIT_SOORTEN } from "@/lib/pipeline/conflict-detect";

/**
 * Wat L1 oplevert (`lib/pipeline/fact-classify.ts`, WP2 van
 * contentpijplijn-publicatiewaardig.md): per feit een soort, een genormaliseerde
 * waarde, waarvoor het geldt en hoe sterk het als bewijs is. De code controleert
 * de waarde tegen de feittekst (`veiligeWaarde()`); het model mag dus nooit een
 * getal toevoegen dat er niet staat.
 */
export const FactClassification = z.object({
  feiten: z.array(
    z.object({
      /** Het nummer uit de lijst: 1 voor het eerste feit. */
      nummer: z.number().int(),
      soort: z.enum(FEIT_SOORTEN),
      /** Laagste getal van de waarde, of het ene getal. `null` als er geen getal is. */
      waardeMin: z.number().nullable(),
      /** Hoogste getal bij een bandbreedte; gelijk aan `waardeMin` bij één getal. */
      waardeMax: z.number().nullable(),
      /** "EUR", "EUR per maand", "week", "dag", "jaar", "procent", "monteurs". */
      eenheid: z.string().nullable(),
      /** De waarde in woorden als er geen getal is: "Eindhoven, Helmond, Best". */
      waardeTekst: z.string().nullable(),
      /** Waarvoor het feit geldt: een dienst, een plaats, of `null` voor het hele merk. */
      geldtVoor: z.string().nullable(),
      bewijskracht: z.enum(["geen", "gewoon", "sterk"]),
    }),
  ),
});
export type FactClassification = z.infer<typeof FactClassification>;
