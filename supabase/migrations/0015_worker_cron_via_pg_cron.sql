-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — de werker aansturen vanuit Postgres i.p.v. Vercel Cron
-- Migratie 0015: alternatief voor `vercel.json` (optimalisatie.md 1.1).
--
-- WAAROM: Vercel Cron staat op het Hobby-plan maar een beperkt aantal taken toe
-- met een lage frequentie (dagelijks); een werker die elke minuut draait vraagt
-- Pro. Maar de wachtrij LEEFT AL in Postgres, en Supabase heeft pg_cron en
-- pg_net. Dan kan de database zichzelf net zo goed aansturen — geen extra
-- leverancier, geen extra abonnement.
--
-- VEILIG NAAST VERCEL CRON. Draaien ze allebei, dan pakken twee werkers werk op
-- en dat is precies waar `claim_jobs()` met FOR UPDATE SKIP LOCKED voor is: de
-- tweede slaat vergrendelde rijen over in plaats van ze dubbel te doen.
--
-- ── VOORAF, EENMALIG (niet in deze migratie, want het zijn echte geheimen) ──
-- Zet in de Supabase SQL-editor:
--
--   select vault.create_secret('https://jouw-app.vercel.app', 'geo_site_url');
--   select vault.create_secret('<dezelfde waarde als CRON_SECRET>', 'geo_cron_secret');
--
-- Zonder die twee doet de cron niets (zie de check in trigger_worker) — hij
-- faalt niet elke minuut met een fout, hij slaat gewoon over.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

/**
 * Roept de werker aan. Losse functie i.p.v. inline SQL in de cron-definitie:
 * zo is hij met de hand te testen (`select public.trigger_worker();`) en staat
 * de logica op één plek.
 */
create or replace function public.trigger_worker()
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

  -- Nog niet ingesteld? Stil overslaan. Elke minuut een fout loggen omdat de
  -- eenmalige setup nog niet gedaan is, levert alleen ruis op.
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_get(
    url     := v_url || '/api/cron/worker',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    -- Niet wachten op het antwoord: de werker doet tot 40 seconden werk en
    -- pg_net is asynchroon. We willen alleen dat hij afgetrapt wordt.
    timeout_milliseconds := 5000
  );
end;
$$;

revoke all on function public.trigger_worker() from public, anon, authenticated;

-- Elke minuut. Bestaat de taak al (bij een herhaalde migratie), eerst weghalen.
select cron.unschedule('geo-worker') where exists (
  select 1 from cron.job where jobname = 'geo-worker'
);

select cron.schedule('geo-worker', '* * * * *', 'select public.trigger_worker();');

-- Controleren:  select * from cron.job;
--               select * from cron.job_run_details order by start_time desc limit 20;
-- Uitzetten:    select cron.unschedule('geo-worker');
