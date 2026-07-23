/**
 * Vastgelegde modelkeuze (abcplan.md §2) — als typed constante, GEEN env-override.
 * Eén bron van waarheid: wil je van model wisselen, pas je het hier aan en deploy je.
 * Voordeel t.o.v. env-variabelen: een typefout valt bij het bouwen op i.p.v. stil te falen.
 */
export const MODELS = {
  /** Hoogvolume/classificatie — halte 3 (30×/week). */
  volume: "gpt-4.1-nano",
  /** Laagvolume/kwaliteitsgevoelig — Brand DNA, prompts, rapport, content. */
  quality: "gpt-4.1-mini",
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];
