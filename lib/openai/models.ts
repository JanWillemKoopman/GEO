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

/**
 * Vastgelegde temperatuur per SOORT werk (optimalisatie.md 0.5). Voorheen werd
 * `temperature` nergens gezet en draaide dus álles op de standaardwaarde (1.0),
 * ook het classificeren en beoordelen. Dat is onnodige ruis: bij een meting die
 * één keer per prompt draait, vertaalt variatie in de classificatie zich direct
 * in een schommelende zichtbaarheidsscore.
 *
 * Vuistregel: alles wat een OORDEEL velt over bestaande tekst moet zo
 * reproduceerbaar mogelijk zijn; alleen het SCHRIJVEN van content mag variëren
 * (daar is variatie juist kwaliteit).
 */
export const TEMPERATURES = {
  /** Classificeren/beoordelen (mention-detectie, redactie-kritiek): zo stabiel mogelijk. */
  deterministic: 0,
  /** Analyseren/samenvatten (profiel, onderwerp, gap, rapport): nagenoeg stabiel, iets speling. */
  analytical: 0.2,
  /** Vragen bedenken: variatie is hier gewenst, anders komen alle prompts op elkaar lijken. */
  creative: 0.8,
  /** Content schrijven/herschrijven: het betaalde product, mag natuurlijk klinken. */
  content: 0.7,
} as const;

/**
 * De simulatie-call (halte 3a) zet bewust GEEN temperature: we willen weten wat
 * een AI-assistent een echte gebruiker antwoordt, en die draait ook op de
 * standaardinstellingen. Een eigen temperatuur zou de meting juist onrealistisch
 * maken. Zie lib/pipeline/measure.ts.
 */
export const SIMULATION_TEMPERATURE = undefined;
