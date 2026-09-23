-- 0108: rate_limit_hit() alleen nog voor de server
--
-- Gevonden op 22 september 2026 via de Supabase-beveiligingsadviseur: migratie 0090
-- maakte `rate_limit_hit()` aan als `security definer` zonder de standaardrechten in te
-- trekken. Postgres geeft elke nieuwe functie `execute` aan `public`, dus ook `anon` kon
-- hem aanroepen via `/rest/v1/rpc/rate_limit_hit`, met alleen de publieke sleutel die in
-- elke browser staat.
--
-- Het gevolg: de sleutels zijn voorspelbaar (`login:e:<e-mailadres>`, zie
-- `app/(auth)/actions.ts`), dus wie een e-mailadres kende kon die teller in één keer boven
-- de grens van 10 pogingen per venster zetten. Dan kan de eigenaar van dat adres niet meer
-- inloggen, en door dat elk venster te herhalen blijft dat zo. Daarnaast kon iedereen
-- ongelimiteerd rijen in `rate_limits` schrijven.
--
-- De app roept de functie alleen aan met de service-role (`lib/rate-limit.ts`,
-- `createAdminClient()`), en die houdt zijn rechten. Dezelfde regel als 0013 en 0015 voor
-- `claim_jobs()` en `trigger_worker()`.
--
-- Idempotent: `revoke` op een recht dat er al niet is, doet niets.

revoke all on function public.rate_limit_hit(text, timestamptz) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, timestamptz) to service_role;
