/**
 * Kostenberekening per OpenAI-aanroep (optimalisatie.md 0.6).
 *
 * De kolom `tracking_runs.cost_usd` bestond al vanaf migratie 0001 maar werd
 * nooit gevuld: er was dus geen enkel zicht op wat een analyse kost. Dat is een
 * probleem zodra we het aantal metingen per vraag verdrievoudigen (fase 2) — dan
 * wil je vóóraf kunnen rekenen wat dat gaat kosten.
 *
 * ⚠️ TARIEVEN CONTROLEREN VÓÓR PRODUCTIE.
 * Onderstaande bedragen zijn de tarieven zoals bekend bij het schrijven van deze
 * code. OpenAI past prijzen aan. Dit is bewust ÉÉN blok op ÉÉN plek zodat
 * bijstellen een kwestie is van deze tabel aanpassen. Controleer ze tegen
 * https://openai.com/api/pricing/ en werk `RATES_CHECKED_ON` bij.
 *
 * De berekende kosten zijn een SCHATTING: cached input-tokens worden goedkoper
 * afgerekend dan verse, en die splitsing nemen we hier niet mee. Redeneertokens
 * (GPT-5.6) hoeven geen aparte behandeling: de API telt ze al mee in
 * `output_tokens` en ze worden ook als output afgerekend. De schatting
 * valt daardoor iets aan de hoge kant uit — dat is de veilige kant voor een
 * budgetberekening.
 */
import { isReasoningModel } from "@/lib/openai/sampling";

/** Datum waarop de tarieven hieronder voor het laatst geverifieerd zijn. */
export const RATES_CHECKED_ON = "2026-08-01";

interface ModelRate {
  /** USD per 1 miljoen input-tokens. */
  inputPerMillion: number;
  /** USD per 1 miljoen output-tokens. */
  outputPerMillion: number;
}

/**
 * Tarieven per model. Een onbekend model valt terug op FALLBACK_RATE: liever een
 * ruwe schatting dan een stil gat in de kostenregistratie.
 */
const RATES: Record<string, ModelRate> = {
  // GPT-5.6 — wat de app sinds augustus 2026 draait (lib/openai/models.ts).
  "gpt-5.6-sol": { inputPerMillion: 5.0, outputPerMillion: 30.0 },
  "gpt-5.6-terra": { inputPerMillion: 2.0, outputPerMillion: 12.0 },
  "gpt-5.6-luna": { inputPerMillion: 0.2, outputPerMillion: 1.2 },
  // `gpt-5.6` is de alias van Sol; komt hij ergens ongesuffixt voorbij, dan mag
  // hij niet stilletjes op de terugval belanden.
  "gpt-5.6": { inputPerMillion: 5.0, outputPerMillion: 30.0 },
  // GPT-4.1 — blijft staan voor de historische rijen in `ai_calls`: die zijn met
  // déze tarieven berekend en moeten narekenbaar blijven.
  "gpt-4.1": { inputPerMillion: 2.0, outputPerMillion: 8.0 },
  "gpt-4.1-mini": { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  "gpt-4.1-nano": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
};

/**
 * Terugval voor een model dat (nog) niet in de tabel staat — bewust aan de dure
 * kant, en dus gelijk aan het duurste model dat we draaien (Sol). Stond op het
 * gpt-4.1-tarief; dat zou een onbekend GPT-5.6-model 2,5× te goedkoop schatten,
 * en een te lage schatting is precies wat je in een budgetberekening niet wilt.
 */
const FALLBACK_RATE: ModelRate = { inputPerMillion: 5.0, outputPerMillion: 30.0 };

/**
 * Vast tarief per web-zoekactie. Dit is verreweg de grootste kostenpost van de
 * meting: bij 30 vragen weegt dit zwaarder dan alle tokens samen. Precies daarom
 * bestaat de MEASURE_WEB_SEARCH-schakelaar (lib/config.ts).
 *
 * Twee tarieven, en welke geldt hangt af van het MODEL, niet van de toolnaam:
 * op een redeneermodel kost een zoekactie $10 per 1000 calls en worden de
 * opgehaalde pagina-tokens gewoon als input afgerekend; op een niet-redeneermodel
 * is de preview-tool $25 per 1000 calls en zijn die tokens gratis. De overstap
 * naar GPT-5.6 maakt de meting op dit punt dus 2,5× goedkoper per zoekactie —
 * de opgehaalde tokens zitten al in `input_tokens` en tellen hieronder vanzelf mee.
 */
const WEB_SEARCH_PER_CALL_REASONING = 0.01;
const WEB_SEARCH_PER_CALL_PREVIEW = 0.025;

export interface CostInput {
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Stond de web_search-tool aan? Dan komt het vaste tarief erbij. */
  webSearch: boolean;
}

/**
 * Schat de kosten van één aanroep in USD. Ontbreken de tokenaantallen (de API
 * geeft ze niet altijd), dan tellen alleen de eventuele web-zoekkosten mee —
 * beter een gedeeltelijke registratie dan geen.
 */
export function estimateCostUsd(input: CostInput): number {
  const rate = RATES[input.model] ?? FALLBACK_RATE;
  const inputCost = ((input.inputTokens ?? 0) / 1_000_000) * rate.inputPerMillion;
  const outputCost = ((input.outputTokens ?? 0) / 1_000_000) * rate.outputPerMillion;
  const perSearch = isReasoningModel(input.model)
    ? WEB_SEARCH_PER_CALL_REASONING
    : WEB_SEARCH_PER_CALL_PREVIEW;
  const searchCost = input.webSearch ? perSearch : 0;
  // 6 decimalen: matcht numeric(10,6) in de database.
  return Number((inputCost + outputCost + searchCost).toFixed(6));
}

/** Staat dit model in de tarieventabel, of rekenen we met de terugval? */
export function hasKnownRate(model: string): boolean {
  return model in RATES;
}
