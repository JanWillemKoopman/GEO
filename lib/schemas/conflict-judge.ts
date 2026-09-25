import { z } from "zod";

/**
 * Wat L2 oplevert (`lib/pipeline/conflict-judge.ts`, WP2 van
 * contentpijplijn-publicatiewaardig.md): spreken twee feiten elkaar echt tegen,
 * of gaan ze over twee verschillende dingen? Het voorstel welk feit klopt, wordt
 * nooit automatisch toegepast; de adviseur beslist.
 */
export const ConflictJudgeVerdict = z.object({
  /** true = beide kunnen niet tegelijk waar zijn. */
  echtConflict: z.boolean(),
  /** Eén zin voor de adviseur: wat er botst, of waarom het twee varianten zijn. */
  uitleg: z.string(),
  /** Welk feit waarschijnlijk klopt: "A", "B", of "onbekend". */
  voorstel: z.enum(["A", "B", "onbekend"]),
  /** Waarom dat feit, in één zin. Leeg bij "onbekend". */
  voorstelReden: z.string(),
});
export type ConflictJudgeVerdict = z.infer<typeof ConflictJudgeVerdict>;
