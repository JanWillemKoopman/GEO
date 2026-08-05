import { z } from "zod";

/**
 * Halte 3b, Mention beoordelen (abcplan.md §6 A3). Per ENTITEIT, niet plat
 * (§12.16): alleen zo weet je welke bron bij welke concurrent hoort. Model nano.
 */
export const Mention = z.object({
  mentions: z.array(
    z.object({
      entity: z.string(), // merknaam of concurrentnaam
      isOwnBrand: z.boolean(),
      mentioned: z.boolean(),
      position: z.number().nullable(), // positie van déze entiteit in het antwoord
      /**
       * Hoe PROMINENT dit merk in het antwoord staat (implementatieplan.md R3).
       *
       * Vervangt `sentiment`, dat in 650 gemeten rijen geen enkele keer
       * 'negative' opleverde en nergens in de applicatie getoond werd, een
       * veld dat elke meting modelaandacht kostte zonder ooit iets te zeggen.
       * De rol varieert wél, en is precies het verschil tussen "je staat erbij"
       * en "je wordt aangeraden".
       *
       * Null als het merk niet genoemd wordt.
       */
      role: z
        .enum(["eerste_aanbeveling", "een_van_meerdere", "zijdelings"])
        .nullable(),
      citedSources: z.array(z.string()), // bronnen die specifiek déze entiteit onderbouwen
    }),
  ),
});

export type Mention = z.infer<typeof Mention>;
