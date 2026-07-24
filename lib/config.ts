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
 * Aantal prompts dat per categorie gegenereerd wordt (abcplan.md §6 A2).
 * Met 5 categorieën: 2 = 10 prompts (bouwfase, kostenbesparend),
 * 6 = 30 prompts (productie, zoals in het plan). Pas dit aan bij lancering.
 */
export const promptsPerCategory = 2;

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
