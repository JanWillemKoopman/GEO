import { z } from "zod";

/**
 * Halte 3b — Mention beoordelen (abcplan.md §6 A3). Per ENTITEIT, niet plat
 * (§12.16): alleen zo weet je welke bron bij welke concurrent hoort. Model nano.
 */
export const Mention = z.object({
  mentions: z.array(
    z.object({
      entity: z.string(), // merknaam of concurrentnaam
      isOwnBrand: z.boolean(),
      mentioned: z.boolean(),
      position: z.number().nullable(), // positie van déze entiteit in het antwoord
      sentiment: z.enum(["positive", "neutral", "negative"]),
      citedSources: z.array(z.string()), // bronnen die specifiek déze entiteit onderbouwen
    }),
  ),
});

export type Mention = z.infer<typeof Mention>;
