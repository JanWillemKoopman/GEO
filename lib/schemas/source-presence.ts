import { z } from "zod";

/**
 * Fase 7.2, staat de klant op de bronnen die zijn markt bepalen?
 *
 * Eén gegroundde aanroep voor alle domeinen tegelijk in plaats van één per
 * domein: de web-zoekactie is de dure post, en tien domeinen los controleren
 * kost tien keer zoveel als ze samen voorleggen.
 */
export const SourcePresence = z.object({
  results: z.array(
    z.object({
      domain: z.string(),
      /**
       * 'ja' | 'nee' | 'onbekend'.
       *
       * Bewust drie waarden en geen boolean. "We konden het niet vaststellen"
       * is een echt antwoord, en het als "nee" tonen zou de klant op pad sturen
       * voor iets wat misschien al geregeld is, of erger, hem laten denken dat
       * de app iets weet wat hij niet weet.
       */
      present: z.enum(["ja", "nee", "onbekend"]),
      /** De gevonden pagina, als die er is. Leeg bij 'nee' of 'onbekend'. */
      url: z.string(),
      /** Waarom dit het antwoord is, houdt het model eerlijk en is te controleren. */
      reasoning: z.string(),
    }),
  ),
});

export type SourcePresence = z.infer<typeof SourcePresence>;
