/**
 * App-brede schakelaars.
 *
 * `signupsEnabled` — of publieke registratie via de app is toegestaan.
 * Standaard UIT: tijdens de bouwfase mag alleen de eigenaar de app gebruiken.
 * Zet later bij lancering `SIGNUPS_ENABLED=true` in Vercel om open te stellen.
 *
 * ⚠️ Dit is de app-laag. De HARDE poort is de Supabase-instelling
 * "Allow new users to sign up" (uitzetten) — die geldt ook als iemand de
 * Supabase-API rechtstreeks aanroept, buiten onze UI om. Zie SETUP.md.
 */
export const signupsEnabled = process.env.SIGNUPS_ENABLED === "true";

/**
 * Aantal prompts dat per FUNNELFASE gegenereerd wordt (abcplan.md §6 A2).
 * Met 3 funnelfasen (Oriëntatie/Overweging/Beslissing): 4 = 12 prompts
 * (bouwfase), 10 = 30 prompts (productie). Pas dit aan bij lancering.
 */
export const promptsPerFunnelStage = 4;

/**
 * Grounding (de dure `web_search`-tool) in de MÉTING (halte A3, 3a) aan/uit.
 * Standaard AAN. Zet `MEASURE_WEB_SEARCH=false` in de ontwikkelomgeving om de
 * web_search uit te schakelen: de AI beantwoordt de meet-prompt dan uit eigen
 * kennis i.p.v. live internet — veel goedkoper en sneller tijdens het ontwikkelen
 * (web_search is verreweg de grootste kostenpost, zie abcplan.md §10).
 *
 * ⚠️ NIET uitzetten in productie: dan meet je niet meer wat AI-assistenten mét
 * live-zoeken daadwerkelijk antwoorden — de meting wordt dan onrealistisch.
 */
export const measureWebSearchEnabled = process.env.MEASURE_WEB_SEARCH !== "false";

/**
 * Hoeveel wandkloktijd de werker zichzelf per aanroep gunt (optimalisatie.md 1.1).
 *
 * Moet RUIM onder de tijdslimiet van de route blijven, zodat er tijd overblijft
 * om de laatste taak af te ronden en de status weg te schrijven. Die limiet
 * verschilt per platform en per abonnement — vandaar een env-schakelaar in
 * plaats van een vaste waarde:
 *
 *   • Vercel met `maxDuration = 60` (de instelling in de route):  40000 (standaard)
 *   • Een platform dat op 10s afkapt:                              7000
 *   • Een eigen server zonder limiet:                              gerust 120000
 *
 * Te laag zetten is niet erg: de werker doet dan minder per ronde en de volgende
 * aanroep gaat verder. Te hoog zetten wél — dan wordt hij midden in een taak
 * afgekapt en moet de reaper hem tien minuten later terugzetten.
 */
export const workerTimeBudgetMs = Number(process.env.WORKER_TIME_BUDGET_MS ?? 40_000);
