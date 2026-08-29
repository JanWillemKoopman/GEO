-- ═══════════════════════════════════════════════════════════════════════════
-- 0068: rechten op databasefuncties terugbrengen tot wie ze echt nodig heeft
--
-- Volgt uit de beveiligingsaudit van 29 augustus 2026 (antihack.md M6).
--
-- ── WAT HIER GEBEURT ───────────────────────────────────────────────────────
--
-- Vier functies met SECURITY DEFINER stonden open voor de rol `anon`, de rol
-- van een bezoeker zonder sessie. Ze gaven zo iemand niets terug: ze leunen
-- allemaal op auth.uid(), en die is leeg zonder sessie, dus het antwoord was
-- `false` of een lege lijst. Er is dus nooit iets gelekt.
--
-- Maar het zijn functies met VERHOOGDE RECHTEN die openstonden voor iedereen
-- zonder dat dat ergens besloten is, en dat is precies het soort
-- standaardinstelling waar het later op misgaat. De adviseur van Supabase
-- meldde ze als `anon_security_definer_function_executable`.
--
-- ── ⚠️ WAT HIER NIET GEBEURT, EN WAAROM DAT ZO MOET BLIJVEN ────────────────
--
-- `authenticated` HOUDT zijn rechten op alle vier. Die functies staan IN de
-- RLS-policies (migratie 0056), en een policy draait met de rechten van de
-- aanroepende rol. Trek je die in, dan geeft élke lees-query van élke ingelogde
-- klant nul rijen terug en is de app stuk zonder één foutmelding.
--
-- De adviseur blijft daarom vier meldingen geven van het type
-- `authenticated_security_definer_function_executable`. Dat is een BEWUSTE
-- afwijking en geen achterstand. Wie hem ooit "oplost", breekt de app.
--
-- Additief en idempotent (conventie 4): `revoke` op een recht dat er al niet
-- is, is geen fout, dus deze migratie mag twee keer draaien.
-- ═══════════════════════════════════════════════════════════════════════════

-- ⚠️ EERST `public`, DAN PAS `anon`, EN DIE VOLGORDE IS DE HELE TRUC.
--
-- Bij de eerste poging stond hier alleen `revoke ... from anon`, en dat hielp
-- bij precies één van de vier. De reden staat in de rechtenlijst zelf:
--
--   is_staff              {postgres=X, service_role=X, authenticated=X}
--   readable_profile_ids  {=X, postgres=X, service_role=X, authenticated=X}
--                          ^^ dit lege stuk vóór de = is de pseudo-rol PUBLIC
--
-- PostgreSQL geeft een nieuwe functie standaard EXECUTE aan PUBLIC, en PUBLIC
-- is iedereen, ook `anon`. Een recht intrekken bij `anon` haalt dat niet weg:
-- `anon` had helemaal geen eigen recht, hij erfde het van PUBLIC. Alleen
-- `is_staff` had wél een eigen anon-grant, en dat is de enige die toen wegging.
--
-- De expliciete grant aan `authenticated` blijft bij een revoke van PUBLIC
-- gewoon staan, want dat is een aparte regel in de lijst. Voor de zekerheid
-- staat hij hieronder toch nog een keer: dan is de bedoeling leesbaar en maakt
-- het niet uit of hij er al was.
revoke execute on function public.is_staff()              from public, anon;
revoke execute on function public.readable_profile_ids()  from public, anon;
revoke execute on function public.readable_analysis_ids() from public, anon;
revoke execute on function public.user_account_ids()      from public, anon;

-- ⚠️ Deze vier grants zijn geen formaliteit. Zonder EXECUTE voor
-- `authenticated` geeft élke lees-query van élke ingelogde klant nul rijen
-- terug, want deze functies staan in de RLS-policies van migratie 0056.
grant execute on function public.is_staff()              to authenticated;
grant execute on function public.readable_profile_ids()  to authenticated;
grant execute on function public.readable_analysis_ids() to authenticated;
grant execute on function public.user_account_ids()      to authenticated;

-- ── Vast zoekpad op de laatste functie die er nog geen had ──────────────────
--
-- Zonder vast `search_path` bepaalt de aanroeper welke tabellen de functie
-- ziet. Deze functie is geen SECURITY DEFINER, dus het risico is klein, maar de
-- andere elf hebben het wel en dit is de enige uitzondering.
alter function public.normaliseer_prompt_cluster() set search_path = public, pg_temp;

-- ── pg_net: een HTTP-client in de database ──────────────────────────────────
--
-- Alleen de twee cron-functies (trigger_worker, trigger_plan_writer) hebben hem
-- nodig, en die draaien als `postgres`. De schemarechten voor anon en
-- authenticated zijn een standaard van Supabase die hier niets toevoegt: het
-- `net`-schema staat niet in de blootgestelde API-schema's, dus vandaag is er
-- geen weg naartoe. Dat is precies de reden om hem nu in te trekken en niet te
-- wachten tot die weg er wel is.
revoke usage on schema net from anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ WAT ER NA DEZE MIGRATIE VERANDERT VOOR EEN BEZOEKER ZONDER SESSIE
--
-- Nagemeten op productie, 29 augustus 2026. Vóór deze migratie kreeg `anon` bij
-- `select * from profiles` netjes NUL RIJEN terug: de policy draaide, riep
-- user_account_ids() aan, en die gaf een lege lijst omdat auth.uid() leeg is.
--
-- Nu krijgt hij een FOUT: "permission denied for function user_account_ids".
-- De policy wil de functie aanroepen en mag dat niet meer.
--
-- Dat is strenger en dus goed, maar het is wél een gedragsverandering, en die
-- hoort opgeschreven te staan in plaats van ontdekt. Nagelopen of het iets
-- breekt: nee. Alle vier de publieke pagina's (login, register,
-- wachtwoord-vergeten, uitnodiging) doen geen enkele tabel-lezing met de
-- anon-sleutel; de uitnodigingspagina leest via `lookupInvite()`, en die
-- gebruikt de service-role client die RLS sowieso omzeilt.
--
-- Komt er ooit een publieke pagina die wél met de anon-sleutel leest, dan
-- krijgt die een foutmelding in plaats van een lege lijst. Dat is het juiste
-- gedrag (onbekend is geen toegang, conventie 3), maar dan moet die pagina hem
-- wel afvangen.
-- ═══════════════════════════════════════════════════════════════════════════
