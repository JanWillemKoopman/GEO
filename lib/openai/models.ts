/**
 * Vastgelegde modelkeuze (abcplan.md §2), als typed constante, GEEN env-override.
 * Eén bron van waarheid: wil je van model wisselen, pas je het hier aan en deploy je.
 * Voordeel t.o.v. env-variabelen: een typefout valt bij het bouwen op i.p.v. stil te falen.
 *
 * **Augustus 2026: over van de GPT-4.1-familie naar GPT-5.6.** Alles wat meet,
 * onderzoekt en beoordeelt draait op `gpt-5.6-luna`; alleen het schrijven van de
 * content zelf staat op een duurder model.
 * De drie tiers hieronder blijven bestaan omdat de pijplijn ze op 21 plekken
 * gebruikt, het verschil tussen `volume` en `quality` zit nu niet meer in een
 * ander model, maar in de redeneerinspanning per soort werk
 * (`lib/openai/sampling.ts`).
 *
 * **4 september 2026: de contenttier van Sol naar Terra.** Zie de toelichting
 * bij `content` hieronder voor de nagerekende reden.
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
   * (Fase C, §8). Content ís het betaalde product, dus dit is de enige tier die
   * boven Luna uitkomt. Zie contentkwaliteit-analyse.md (C4).
   *
   * ⚠️ **Van Sol naar Terra op 4 september 2026.** Terra kost $2/$12 per miljoen
   * tokens tegen $5/$30 voor Sol: 2,5× goedkoper op zowel input als output.
   * De aanleiding is een nameting op `ai_calls` over de twaalf pagina's van
   * 3 september 2026 (MJB Dakservice en Fysio Centrum Utrecht):
   *
   *   12 schrijfaanroepen (`content_draft`)      $3,0936   $0,2578 per stuk
   *   16 herschrijfaanroepen (`content_revise`)  $3,3252   $0,2078 per stuk
   *   alles wat onderzoekt en beoordeelt          $1,0105
   *   ─────────────────────────────────────────────────
   *   twaalf pagina's, 328 aanroepen              $7,4293
   *
   * Het schrijven was daarmee 86% van de rekening, en de vier beoordelaars
   * samen kostten $0,62 voor 208 aanroepen. Op Terra zakken dezelfde 28
   * schrijfaanroepen naar ongeveer $2,57: een besparing van ~$3,85 per twaalf
   * pagina's, ofwel ~$0,32 per pagina, bij gelijkblijvend tokengebruik.
   *
   * Waarom dit verdedigbaar is en niet gewoon bezuinigen: de zwakke plek van
   * deze twaalf pagina's zat niet in het model maar in de opdracht. De externe
   * copywriter wees geen enkele keer op iets wat een groter model had opgelost
   * (geen redeneerfouten, geen onlogische opbouw) en wél elf keer op een
   * ontbrekende lezer, een ontbrekende stem en een ontbrekend eigen woord.
   * Precies daarvoor zijn op 3 september de blokken in `content.ts` gebouwd.
   * Het geld dat hier vrijkomt is bovendien meer waard bij de beoordelaars: één
   * vermeden herschrijfronde ($0,2078) betaalt zeventien volledige keuringen
   * ($0,0119 per stuk).
   *
   * ⚠️ Ongeverifieerd (conventie 10): dat Terra dezelfde tekstkwaliteit haalt is
   * een aanname tot de nameting uit `docs/tasks/contentkwaliteit-copywriterronde.md`
   * §7 is gedraaid. Terugdraaien is één regel: zet `content` terug op
   * `"gpt-5.6-sol"`, dat tarief staat nog in `lib/openai/pricing.ts`.
   */
  content: "gpt-5.6-terra",
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
