import { z } from "zod";

/**
 * Wat de VRAGENBEOORDELAAR oplevert (punt 57, `lib/pipeline/vraag-judge.ts`).
 * Per nieuwe vraag: vraagt hij in essentie hetzelfde als een bestaande vraag
 * (B-nummer) of een eerdere nieuwe vraag (N-nummer)? De code past het toe en
 * controleert het (`voegVragenSamen()`).
 */
export const VraagJudgeVerdict = z.object({
  vragen: z.array(
    z.object({
      /** Het nummer van de nieuwe vraag: 1 voor N1. */
      nummer: z.number().int(),
      /** "B3", "N2", of `null` als hij iets eigens vraagt. */
      zelfdeAls: z.string().nullable(),
      /** Eén korte zin waarom, voor de audit-trail. */
      reden: z.string(),
    }),
  ),
});

export type VraagJudgeVerdict = z.infer<typeof VraagJudgeVerdict>;
