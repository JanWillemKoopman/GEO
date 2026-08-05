import "server-only";

/**
 * Officiële OpenAI Node-SDK, één gedeelde instance (abcplan.md §2).
 * Server-only: de API-key mag nooit naar de browser.
 */
import OpenAI from "openai";
import { serverEnv } from "@/lib/env";

/**
 * Nieuwe pogingen bij tijdelijke fouten (429 rate-limit, 5xx, netwerk),
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
 * meting met web_search duurt 20-40s, maar het premium model dat een volledige
 * pagina schrijft doet er regelmatig langer over. Die werd dus afgebroken
 * vóórdat hij klaar was. Nu de route op 300s staat past 100s daar comfortabel
 * in, met nog ruimte voor de tweede aanroep van dezelfde taak (schrijven +
 * redactie), zie HEAVY_JOB_RESERVE_MS in lib/jobs/worker.ts, dat op deze
 * waarde is afgestemd.
 *
 * ⚠️ Sinds GPT-5.6 komt er redeneertijd bij elke aanroep bovenop. Deze 100s is
 * daarom de reden dat de redeneerinspanning per soort werk bewust laag staat
 * (lib/openai/sampling.ts): `none` waar het kan, `low` bij onderzoek dat óók
 * web_search doet, `medium` bij het schrijven. Wie die knop omhoog draait, moet
 * eerst hier en in lib/jobs/worker.ts nameten, niet andersom.
 */
const TIMEOUT_MS = 100_000;

/**
 * Het TOTALE tijdbudget van één aanroep, retries meegerekend.
 *
 * ── WAAROM DIT ERBIJ MOEST ──────────────────────────────────────────────────
 *
 * `timeout` hierboven geldt PER POGING, en de SDK herhaalt ook een timeout.
 * Met MAX_RETRIES = 3 was de echte bovengrens van één aanroep dus 4 × 100s =
 * 400 seconden, meer dan de 300s die de werkerroute van het platform krijgt.
 * De rekensom in lib/jobs/worker.ts (HEAVY_JOB_RESERVE_MS = 220s voor twee
 * aanroepen van 100s) ging er stilzwijgend van uit dat er niet herhaald werd.
 *
 * Op 1 augustus 2026 stonden er twee 504's op /api/cron/worker in de
 * Vercel-logs ("Task timed out after 300 seconds"). Alles wat op dat moment
 * geclaimd was bleef op 'running' staan tot de reaper het vijf minuten later
 * terugzette, de klant kijkt dan naar een voortgangsscherm waarachter niets
 * gebeurt.
 *
 * 105 seconden is de bovengrens die de rekensom wél waarmaakt: twee aanroepen
 * van een zware taak passen samen (210s) binnen HEAVY_JOB_RESERVE_MS. De
 * retries leven binnen dit budget in plaats van erbovenop; loopt het op,
 * dan valt de taak terug op de retry-laag van de wachtrij (minutenschaal),
 * precies waar hij thuishoort.
 */
const CALL_BUDGET_MS = 105_000;

/**
 * Requestopties met een harde bovengrens op de totale duur van één aanroep.
 * Elke aanroep in lib/openai/structured.ts geeft dit mee; het signaal geldt
 * over alle pogingen heen, dus dit is een echte grens en geen wens.
 */
export function callBudget(): { signal: AbortSignal } {
  return { signal: AbortSignal.timeout(CALL_BUDGET_MS) };
}

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
