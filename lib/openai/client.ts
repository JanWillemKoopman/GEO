import "server-only";

/**
 * Officiële OpenAI Node-SDK, één gedeelde instance (abcplan.md §2).
 * Server-only: de API-key mag nooit naar de browser.
 */
import OpenAI from "openai";
import { serverEnv } from "@/lib/env";

/**
 * Nieuwe pogingen bij tijdelijke fouten (429 rate-limit, 5xx, netwerk) —
 * optimalisatie.md 0.4. Zonder dit liet één tijdelijke 429 tussen de parallelle
 * meet-calls de HELE meting mislukken via Promise.allSettled.
 *
 * De SDK doet exponentiële backoff met jitter en herhaalt alleen wat veilig te
 * herhalen is. Dit staat LOS van de retry-laag op taakniveau (fase 1, jobs):
 * deze vangt de seconde-schaal af, die de minuten-schaal.
 */
const MAX_RETRIES = 3;

/**
 * Ruim boven de traagste call, maar onder de tijdslimiet van de route zodat wíj
 * de timeout melden en niet het platform de functie hard afkapt.
 *
 * Stond op 50s toen de route nog op 60s stond. Dat was te krap geworden: een
 * meting met web_search duurt 20-40s, maar gpt-4.1 die een volledige pagina
 * schrijft doet er regelmatig langer over — die werd dus afgebroken vóórdat hij
 * klaar was. Nu de route op 300s staat past 100s daar comfortabel in, met nog
 * ruimte voor de tweede aanroep van dezelfde taak (schrijven + redactie) — zie
 * HEAVY_JOB_RESERVE_MS in lib/jobs/worker.ts, dat op deze waarde is afgestemd.
 */
const TIMEOUT_MS = 100_000;

let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!cached) {
    cached = new OpenAI({
      apiKey: serverEnv.openaiApiKey,
      maxRetries: MAX_RETRIES,
      timeout: TIMEOUT_MS,
    });
  }
  return cached;
}
