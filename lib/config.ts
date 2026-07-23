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
