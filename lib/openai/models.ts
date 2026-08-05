/**
 * Vastgelegde modelkeuze (abcplan.md §2), als typed constante, GEEN env-override.
 * Eén bron van waarheid: wil je van model wisselen, pas je het hier aan en deploy je.
 * Voordeel t.o.v. env-variabelen: een typefout valt bij het bouwen op i.p.v. stil te falen.
 *
 * **Augustus 2026: over van de GPT-4.1-familie naar GPT-5.6.** Alles wat meet,
 * onderzoekt en beoordeelt draait op `gpt-5.6-luna`; alleen het schrijven van de
 * content zelf staat op het duurste model dat OpenAI levert (`gpt-5.6-sol`).
 * De drie tiers hieronder blijven bestaan omdat de pijplijn ze op 21 plekken
 * gebruikt, het verschil tussen `volume` en `quality` zit nu niet meer in een
 * ander model, maar in de redeneerinspanning per soort werk
 * (`lib/openai/sampling.ts`).
 */
export const MODELS = {
  /**
   * Hoogvolume/classificatie, halte 3 (30×/week). Was `gpt-4.1-nano`.
   * Luna kost $0,20/$1,20 per miljoen tokens tegen $0,10/$0,40 voor nano: per
   * meetronde van 30 vragen ~$0,004 duurder aan tokens, terwijl één web_search
   * ($0,025) daar het twintigvoudige van is. Het prijsverschil is dus geen
   * argument; de betere classificatie wel.
   */
  volume: "gpt-5.6-luna",
  /**
   * Laagvolume/kwaliteitsgevoelig, Brand DNA, prompts, rapport, redactie/kritiek.
   * Was `gpt-4.1-mini` ($0,40/$1,60). Luna is hier juist de helft goedkoper én
   * een generatie nieuwer; deze stappen krijgen bovendien echte redeneertijd
   * (effort `low`), wat mini niet kende.
   */
  quality: "gpt-5.6-luna",
  /**
   * Premium, uitsluitend het schrijven/herschrijven van de content zelf
   * (Fase C, §8). Content ís het betaalde product; hier weegt kwaliteit zwaarder
   * dan de paar cent per pagina extra. Zie contentkwaliteit-analyse.md (C4).
   *
   * Sol is het duurste model van de GPT-5.6-familie ($5/$30 per miljoen tokens,
   * tegen $2/$12 voor Terra). Bewuste keuze: dit is de enige stap waar de klant
   * de uitkomst letterlijk publiceert. Reken wel op de kosten: Sol is 2,5× de
   * input- en 3,75× de outputprijs van gpt-4.1, en de redeneertokens tellen als
   * output. Een pagina wordt daarmee grofweg vijf keer zo duur, bij de ~$0,08
   * die twee calls op gpt-4.1 kostten dus enkele dubbeltjes per pagina. Dat is
   * nog steeds klein t.o.v. een meetronde ($0,82), en het is de enige post waar
   * de klant het verschil ziet.
   */
  content: "gpt-5.6-sol",
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
 *
 * ⚠️ Sinds GPT-5.6 is `temperature` geen knop meer die overal mag. Redeneer-
 * modellen accepteren hem alleen als de redeneerinspanning op `none` staat.
 * Deze tabel is daarom niet meer wat er letterlijk de deur uit gaat: welke
 * parameters een aanroep meekrijgt, bepaalt `resolveTuning()` in
 * lib/openai/sampling.ts. Daar staat ook per soort werk wáárom.
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
