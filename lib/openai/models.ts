/**
 * Vastgelegde modelkeuze (abcplan.md §2) — als typed constante, GEEN env-override.
 * Eén bron van waarheid: wil je van model wisselen, pas je het hier aan en deploy je.
 * Voordeel t.o.v. env-variabelen: een typefout valt bij het bouwen op i.p.v. stil te falen.
 */
export const MODELS = {
  /** Hoogvolume/classificatie — halte 3 (30×/week). */
  volume: "gpt-4.1-nano",
  /** Laagvolume/kwaliteitsgevoelig — Brand DNA, prompts, rapport, redactie/kritiek. */
  quality: "gpt-4.1-mini",
  /**
   * Premium — uitsluitend het schrijven/herschrijven van de content zelf
   * (Fase C, §8). Content ís het betaalde product; hier weegt kwaliteit zwaarder
   * dan de paar cent per pagina extra. Zie contentkwaliteit-analyse.md (C4).
   */
  content: "gpt-4.1",
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];
