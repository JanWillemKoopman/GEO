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
 * Stond op 50s toen de route nog op 60s stond, daarna op 100s. Dat laatste
 * bleek bij het schrijven zelf nog te krap: nagemeten op 26 echte, al betaalde
 * schrijf- en herschrijfaanroepen op productie (doorloop-huyberts.md punt 5,
 * 26 augustus 2026), duurde de traagste geslaagde poging 98,8s, en het
 * kostenartikel van Huyberts Keukens (1034 woorden) had drie mislukte pogingen
 * nodig vóór de vierde binnen het toenmalige budget van 105s paste. De duur
 * bleek NIET netjes te schalen met het aantal woorden (197 woorden in 13s,
 * maar ook 570 woorden in 89-91s): de redeneertijd van het model, niet de
 * tekstlengte, domineert de uitschieters.
 *
 * 145s geeft de traagste gemeten poging (98,8s) ruim 45% marge. Nog steeds
 * ruim onder de tijdslimiet van de route (300s), met ruimte voor de
 * kritiekaanroep van dezelfde taak (schrijven + redactie) erna, zie
 * HEAVY_JOB_RESERVE_MS in lib/jobs/worker.ts, dat op deze waarde is afgestemd.
 *
 * ⚠️ Sinds GPT-5.6 komt er redeneertijd bij elke aanroep bovenop. Dit is
 * daarom de reden dat de redeneerinspanning per soort werk bewust laag staat
 * (lib/openai/sampling.ts): `none` waar het kan, `low` bij onderzoek dat óók
 * web_search doet, `medium` bij het schrijven. Wie die knop verder omhoog
 * draait, moet eerst hier en in lib/jobs/worker.ts opnieuw nameten, niet
 * andersom.
 */
const TIMEOUT_MS = 145_000;

/**
 * Het TOTALE tijdbudget van één aanroep, retries meegerekend.
 *
 * ── WAAROM DIT ERBIJ MOEST ──────────────────────────────────────────────────
 *
 * `timeout` hierboven geldt PER POGING, en de SDK herhaalt ook een timeout.
 * Met MAX_RETRIES = 3 was de echte bovengrens van één aanroep dus 4 × TIMEOUT_MS,
 * meer dan de 300s die de werkerroute van het platform krijgt. De rekensom in
 * lib/jobs/worker.ts (HEAVY_JOB_RESERVE_MS) ging er stilzwijgend van uit dat er
 * niet herhaald werd.
 *
 * Op 1 augustus 2026 stonden er twee 504's op /api/cron/worker in de
 * Vercel-logs ("Task timed out after 300 seconds"). Alles wat op dat moment
 * geclaimd was bleef op 'running' staan tot de reaper het vijf minuten later
 * terugzette, de klant kijkt dan naar een voortgangsscherm waarachter niets
 * gebeurt.
 *
 * 150 seconden (was 105s, opgehoogd 26 augustus 2026, doorloop-huyberts.md
 * punt 5) is de bovengrens die de rekensom van lib/jobs/worker.ts nog steeds
 * waarmaakt: de schrijfaanroep (tot 150s) plus de kritiekaanroep erna (ruim
 * boven zijn gemeten duur van enkele seconden, met een eigen marge) passen
 * samen binnen HEAVY_JOB_RESERVE_MS. De retries leven binnen dit budget in
 * plaats van erbovenop; loopt het op, dan valt de taak terug op de
 * retry-laag van de wachtrij (minutenschaal), precies waar hij thuishoort.
 */
export const CALL_BUDGET_MS = 150_000;

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
