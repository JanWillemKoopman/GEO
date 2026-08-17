-- ═══════════════════════════════════════════════════════════════════════════
-- ORBIT ENGINE — de dagelijkse schrijfronde van het contentplan
-- Migratie 0050 (fase 4, docs/Nova.md §7).
--
-- WAAROM VIA pg_cron EN NIET VIA vercel.json: hetzelfde als bij de werker
-- (migratie 0015). Vercel Cron op het Hobby-plan staat een beperkt aantal taken
-- toe; de wachtrij leeft toch al in Postgres en pg_cron plus pg_net zijn er.
--
-- Gebruikt DEZELFDE twee vault-geheimen als `trigger_worker()`:
--   geo_site_url · geo_cron_secret
-- Zijn die er niet, dan slaat de functie stil over. Elke dag een fout loggen
-- omdat de eenmalige setup ontbreekt levert alleen ruis op.
--
-- WAT DE ROUTE DOET: pagina's van een GOEDGEKEURDE maand die binnen tien dagen
-- gepubliceerd moeten worden, krijgen een schrijftaak. De route plant alleen;
-- het schrijven doet de werker. Zie app/api/cron/plan/route.ts.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_plan_writer()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'geo_site_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'geo_cron_secret';

  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_get(
    url     := v_url || '/api/cron/plan',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 5000
  );
end;
$$;

revoke all on function public.trigger_plan_writer() from public, anon, authenticated;

-- 04:00 UTC, dus 6 uur 's ochtends in de zomer en 5 uur in de winter. Ruim vóór
-- de werkdag: een pagina die vandaag ingepland wordt, is er als de klant kijkt.
-- Eén keer per dag is genoeg. Een plan denkt in dagen, en twee rondes per dag
-- kunnen hooguit een halve dag winnen op een voorsprong van tien dagen.
select cron.unschedule('aura-plan-writer') where exists (
  select 1 from cron.job where jobname = 'aura-plan-writer'
);

select cron.schedule('aura-plan-writer', '0 4 * * *', 'select public.trigger_plan_writer();');

-- Controleren:  select * from cron.job where jobname = 'aura-plan-writer';
--               select * from cron.job_run_details order by start_time desc limit 20;
-- Met de hand:  select public.trigger_plan_writer();
-- Uitzetten:    select cron.unschedule('aura-plan-writer');
-- Hernoemd naar 'orbit-engine-plan-writer' in migratie 0059 (rebrand Aura → ORBIT ENGINE).
