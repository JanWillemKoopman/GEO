import { z } from "zod";

/**
 * Wat de ZINNENBEOORDELAAR oplevert (punt 59 van de kwaliteitsdoorlichting,
 * `lib/pipeline/claim-judge.ts`).
 *
 * Per voorgelegde zin twee vragen, en verder niets: beweert deze zin iets
 * controleerbaars over dit bedrijf, en zo ja, welk feit op de kaart onderbouwt
 * hem exact. De code controleert beide antwoorden daarna zelf
 * (`verwerkZinOordelen()` in `claim-extract.ts`).
 */
export const ClaimJudgeVerdict = z.object({
  oordelen: z.array(
    z.object({
      /** Het nummer van de zin zoals hij in de prompt stond. */
      nummer: z.number().int(),
      /** Beweert de zin iets controleerbaars over DIT bedrijf? */
      overBedrijf: z.boolean(),
      /** Het F-nummer van het feit dat de zin exact onderbouwt, of `null`. */
      feit: z.string().nullable(),
      /** Eén korte zin waarom, voor de audit-trail. */
      reden: z.string(),
    }),
  ),
});

export type ClaimJudgeVerdict = z.infer<typeof ClaimJudgeVerdict>;
