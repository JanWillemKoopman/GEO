-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — de wachtrij activeren (optimalisatie.md fase 1)
-- Migratie 0013: `jobs` bestond sinds migratie 0001 met status, pogingen,
-- planning en foutkolom — en werd nergens gebruikt. Het werk draaide synchroon
-- in de API-routes, aangestuurd door de BROWSER van de klant.
--
-- Twee problemen die dat oplevert:
--   1. De voortgangsschermen beloofden "je kunt dit scherm sluiten" terwijl ze
--      het werk zélf startten met een fetch. Sloot de klant de tab na de meting,
--      dan werd het rapport pas gemaakt als hij terugkwam.
--   2. Alles moest binnen de 60s van een Vercel-route. Met 12 vragen net
--      haalbaar; met de beoogde 30 (en straks 3 metingen per vraag, fase 2) niet.
--
-- Deze migratie maakt de tabel geschikt om echt als wachtrij te dienen.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── jobs: bruikbaar maken voor alle soorten werk ────────────────────────────
alter table public.jobs
  -- Profielonderzoek hangt aan een PROFIEL, niet aan een analyse. De kolom was
  -- not null, waardoor dat soort werk er niet in paste.
  alter column analysis_id drop not null,
  add column profile_id  uuid references public.profiles (id) on delete cascade,
  -- Sleutel om dubbel inplannen te voorkomen (zie de unieke index hieronder).
  add column dedupe_key  text,
  add column started_at  timestamptz,
  add column finished_at timestamptz;

-- Een taak hoort ergens bij: aan een analyse of aan een profiel, nooit aan niets.
alter table public.jobs
  add constraint jobs_has_owner check (analysis_id is not null or profile_id is not null);

create index jobs_profile_idx on public.jobs (profile_id);

-- ── Dubbel inplannen voorkomen ──────────────────────────────────────────────
-- Klikt de klant twee keer, of vuurt de UI twee keer, dan mag er maar één taak
-- lopen. De index geldt ALLEEN voor openstaand werk: is een taak klaar of
-- definitief mislukt, dan mag dezelfde sleutel opnieuw ingepland worden
-- (anders zou een retry na een storing onmogelijk zijn).
create unique index jobs_dedupe_open_idx
  on public.jobs (dedupe_key)
  where dedupe_key is not null and status in ('queued', 'running');

-- ── Werk claimen zonder dat twee werkers dezelfde taak pakken ───────────────
-- `for update skip locked` is de standaardoplossing: wie het eerst is pakt de
-- rij en vergrendelt hem; een gelijktijdige werker slaat die rij over in plaats
-- van te wachten. Dit MOET in de database gebeuren — via de JS-client zou er
-- tussen "selecteer" en "markeer als lopend" een gat zitten waar een tweede
-- werker doorheen glipt, en dan draait dezelfde dure meting twee keer.
create or replace function public.claim_jobs(p_limit integer)
returns setof public.jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.jobs j
     set status     = 'running',
         attempts   = j.attempts + 1,
         started_at = now(),
         updated_at = now()
   where j.id in (
     select id
       from public.jobs
      where status = 'queued'
        and scheduled_for <= now()
      order by scheduled_for asc
      limit p_limit
      for update skip locked
   )
  returning j.*;
end;
$$;

-- ── Vastgelopen werk terughalen ─────────────────────────────────────────────
-- Wordt een werker halverwege afgekapt (platform-timeout, deploy, crash), dan
-- blijft z'n taak op 'running' staan en pakt niemand hem ooit nog op. Deze
-- functie zet zulke taken terug in de rij. De drempel staat ruim boven de
-- langste taak, zodat we nooit iets terugzetten dat nog gewoon draait.
create or replace function public.reclaim_stuck_jobs(p_older_than_minutes integer default 10)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with reclaimed as (
    update public.jobs
       set status        = 'queued',
           scheduled_for = now(),
           last_error    = 'Teruggezet in de wachtrij: de vorige poging is halverwege afgebroken.',
           updated_at    = now()
     where status = 'running'
       and started_at < now() - make_interval(mins => p_older_than_minutes)
    returning 1
  )
  select count(*) into v_count from reclaimed;
  return v_count;
end;
$$;

-- Beide functies zijn security definer en draaien alleen vanuit de werker met
-- de service-role key. Client-rollen krijgen geen rechten (jobs staat op
-- deny-all in RLS sinds migratie 0002).
revoke all on function public.claim_jobs(integer) from public, anon, authenticated;
revoke all on function public.reclaim_stuck_jobs(integer) from public, anon, authenticated;

-- ── content_pieces: tussenstand tijdens generatie ───────────────────────────
-- Contentgeneratie doet vier AI-aanroepen achter elkaar, waarvan twee een
-- volledige pagina schrijven. Dat past niet betrouwbaar in één taak. Het werk
-- wordt gesplitst in twee taken (schrijven+beoordelen, dan herschrijven+
-- herbeoordelen), en daartussen staat de pagina als 'draft' in de tabel.
-- Zo is het werk van de eerste stap nooit weg als de tweede faalt.
alter type content_status add value if not exists 'draft';
