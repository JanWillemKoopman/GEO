-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — alle nog niet toegepaste migraties in één bestand
--
-- Bevat 0012 t/m 0017: fase 0 (kostenregistratie), fase 1 (wachtrij, e-mail,
-- cron) en fase 2 (meetkwaliteit, volumebanden). Bedoeld om in één keer in de
-- Supabase SQL-editor te plakken.
--
-- ── LEES DIT EERST ─────────────────────────────────────────────────────────
--
-- 1. STAP 3 MOET APART. `alter type ... add value` mag in Postgres niet in
--    dezelfde transactie gebruikt worden als waarin de waarde wordt toegevoegd,
--    en de SQL-editor draait je selectie als één transactie. Voer stap 3 dus
--    als losse selectie uit (of run 'm gewoon nog een keer in z'n eentje als de
--    grote run daarop struikelt).
--
-- 2. STAP 6 (pg_cron) IS OPTIONEEL. Alleen nodig als je de werker vanuit
--    Postgres wilt aansturen in plaats van via Vercel Cron — dat scheelt een
--    Vercel Pro-abonnement. Draaien ze allebei, dan is dat geen probleem:
--    `claim_jobs()` met FOR UPDATE SKIP LOCKED zorgt dat twee werkers nooit
--    dezelfde taak pakken. Vóór stap 6 moet je eenmalig twee geheimen zetten,
--    zie de instructie daar.
--
-- 3. HERHALEN IS VEILIG. Overal staat `if not exists` / `or replace`, dus een
--    tweede run doet niets kwaads. Uitzondering is stap 3, zie hierboven.
--
-- 4. Er wordt GEEN data verwijderd of overschreven. De enige update is de
--    backfill van `volume_band` in stap 7, en die raakt alleen rijen waar de
--    kolom nog leeg is.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- STAP 1 — Migratie 0012: kostenregistratie per AI-aanroep (fase 0.6)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Eén regel per OpenAI-aanroep, met tokens en geschatte kosten.
--
-- WAAROM EEN APARTE TABEL en niet een cost_usd-kolom per tabel: de kosten van
-- een analyse zitten verspreid over meting (tracking_runs), rapport (reports),
-- content (content_pieces) én het profielonderzoek (profiles, dat aan meerdere
-- analyses hangt). Een kolom per tabel maakt "wat kost deze analyse?" een
-- optelsom over vijf tabellen met verschillende sleutels. Eén logboek maakt het
-- één query.
--
-- GEEN client-toegang (RLS aan, nul policies = deny-all): dit is
-- bedrijfsinformatie voor de exploitant, niet voor de klant.

create table if not exists public.ai_calls (
  id                 uuid primary key default gen_random_uuid(),
  -- Beide nullable: een profielonderzoek hangt aan een profiel zonder analyse,
  -- een meting aan een analyse. Waar allebei bekend is, vullen we allebei.
  analysis_id        uuid references public.analyses (id) on delete cascade,
  profile_id         uuid references public.profiles (id) on delete cascade,
  -- Welke stap in de pijplijn: 'profile_research' | 'topic_research' | 'prompts'
  -- | 'volume_calibration' | 'measure_simulate' | 'measure_mention'
  -- | 'gap_analysis' | 'report' | 'content_draft' | 'content_critique'.
  -- Vrije tekst i.p.v. enum: er komen stappen bij en een enum uitbreiden is een
  -- migratie, een tekstwaarde niet.
  kind               text not null,
  model              text not null,
  input_tokens       integer,
  output_tokens      integer,
  total_tokens       integer,
  web_search         boolean not null default false,
  -- Geschat, niet afgerekend: cached input-tokens worden goedkoper afgerekend
  -- dan hier berekend (zie lib/openai/pricing.ts).
  cost_usd           numeric(10, 6),
  openai_response_id text,
  created_at         timestamptz not null default now()
);

create index if not exists ai_calls_analysis_idx on public.ai_calls (analysis_id);
create index if not exists ai_calls_profile_idx  on public.ai_calls (profile_id);
create index if not exists ai_calls_kind_idx     on public.ai_calls (kind, created_at);

alter table public.ai_calls enable row level security;


-- ═══════════════════════════════════════════════════════════════════════════
-- STAP 2 — Migratie 0013: de wachtrij activeren (fase 1)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `jobs` bestond al sinds migratie 0001 met status, pogingen, planning en
-- foutkolom — en werd nergens gebruikt. Het werk draaide synchroon in de
-- API-routes, aangestuurd door de BROWSER van de klant. Sloot hij de tab na de
-- meting, dan werd het rapport pas gemaakt als hij terugkwam.

alter table public.jobs
  -- Profielonderzoek hangt aan een PROFIEL, niet aan een analyse. De kolom was
  -- not null, waardoor dat soort werk er niet in paste.
  alter column analysis_id drop not null,
  add column if not exists profile_id  uuid references public.profiles (id) on delete cascade,
  -- Sleutel om dubbel inplannen te voorkomen (zie de unieke index hieronder).
  add column if not exists dedupe_key  text,
  add column if not exists started_at  timestamptz,
  add column if not exists finished_at timestamptz;

-- Een taak hoort ergens bij: aan een analyse of aan een profiel, nooit aan niets.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_has_owner'
  ) then
    alter table public.jobs
      add constraint jobs_has_owner
      check (analysis_id is not null or profile_id is not null);
  end if;
end $$;

create index if not exists jobs_profile_idx on public.jobs (profile_id);

-- Dubbel inplannen voorkomen. Klikt de klant twee keer, of vuurt de UI twee
-- keer, dan mag er maar één taak lopen. De index geldt ALLEEN voor openstaand
-- werk: is een taak klaar of definitief mislukt, dan mag dezelfde sleutel
-- opnieuw ingepland worden — anders zou een retry na een storing onmogelijk zijn.
create unique index if not exists jobs_dedupe_open_idx
  on public.jobs (dedupe_key)
  where dedupe_key is not null and status in ('queued', 'running');

-- Werk claimen zonder dat twee werkers dezelfde taak pakken.
--
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

-- Vastgelopen werk terughalen. Wordt een werker halverwege afgekapt
-- (platform-timeout, deploy, crash), dan blijft z'n taak op 'running' staan en
-- pakt niemand hem ooit nog op. De drempel staat ruim boven de langste taak,
-- zodat we nooit iets terugzetten dat nog gewoon draait.
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


-- ═══════════════════════════════════════════════════════════════════════════
-- STAP 3 — Rest van migratie 0013: APART UITVOEREN
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Contentgeneratie doet vier AI-aanroepen achter elkaar, waarvan twee een
-- volledige pagina schrijven. Dat past niet betrouwbaar in één taak. Het werk
-- is gesplitst in twee taken (schrijven+beoordelen, dan herschrijven+
-- herbeoordelen), en daartussen staat de pagina als 'draft' in de tabel. Zo is
-- het werk van de eerste stap nooit weg als de tweede faalt.
--
-- ⚠️  Selecteer ALLEEN de regel hieronder en voer die apart uit.

alter type content_status add value if not exists 'draft';


-- ═══════════════════════════════════════════════════════════════════════════
-- STAP 4 — Migratie 0014: bericht als het klaar is (fase 1.8)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Nu het werk op de achtergrond draait en de klant het scherm écht mag sluiten,
-- moet hij ook te horen krijgen wanneer het af is. De rapportmail bestond al
-- maar ging er altijd uit, zonder dat de klant het wist of kon kiezen.
--
-- Standaard AAN: wie een analyse start wil weten wanneer die klaar is.

alter table public.analyses
  add column if not exists notify_by_email boolean not null default true;


-- ═══════════════════════════════════════════════════════════════════════════
-- STAP 5 — Migratie 0016: betrouwbare meting (fase 2)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Drie dingen die de cijfers eerlijk en vergelijkbaar maken:
--   1. De ONZEKERHEID van de score opslaan. Met 30 vragen × 1 meting is de
--      95%-band ±18 punten. Die ruis kunnen we niet wegnemen zonder de kosten
--      te verdrievoudigen — maar we kunnen hem wél kennen en tonen.
--   2. Een STABIELE noemer voor het aandeel. Het oude aandeel deelde door "alle
--      gevonden merken", en die verzameling groeit met elke meting.
--   3. ENTITEITEN samenvoegen: "Coolblue", "coolblue.nl" en "Coolblue B.V."
--      waren drie concurrenten.

alter table public.visibility_scores
  -- Aantal metingen waarop de score rust. Zonder dit getal is de bandbreedte
  -- niet te herleiden, en is een score van vorige maand niet te vergelijken met
  -- een die op minder vragen rust.
  add column if not exists judged_runs       integer,
  -- Standaardfout in procentpunten: √(p(1-p)/n) × 100. De 95%-band is ±1,96×
  -- deze waarde. Bewust de standaardfout opslaan en niet de band zelf: dan kan
  -- de UI later een andere betrouwbaarheid kiezen zonder migratie.
  add column if not exists score_stderr      numeric(5, 2),
  -- Idem voor de gewogen score, die een andere spreiding heeft omdat niet elke
  -- vraag even zwaar telt.
  add column if not exists weighted_stderr   numeric(5, 2),
  -- Aantal entiteiten in de noemer van het aandeel. Zonder dit is niet te zien
  -- of een gedaald aandeel komt doordat de klant minder genoemd wordt of
  -- doordat er een concurrent bij is gekomen.
  add column if not exists share_basis_count integer;

-- Eén rij per merk, met z'n schrijfwijzen. Per PROFIEL (niet per analyse):
-- dezelfde concurrent duikt op bij meerdere onderwerpen van hetzelfde merk, en
-- die moeten dan ook één entiteit zijn.
create table if not exists public.entities (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  -- Zoals de klant hem kent en zoals hij in de UI verschijnt.
  canonical_name text not null,
  -- Genormaliseerde vorm (kleine letters, rechtsvorm/domeinsuffix eraf,
  -- leestekens weg) — hierop matchen we wat de classificatie teruggeeft.
  normalized     text not null,
  -- Extra schrijfwijzen die ook naar deze entiteit verwijzen, genormaliseerd.
  aliases        text[] not null default '{}',
  -- Heeft de klant deze entiteit gezien en goedgekeurd? Nieuw ontdekte merken
  -- staan op false en verschijnen in het beheerscherm — zolang ze niet bevestigd
  -- zijn tellen ze niet mee in de noemer van het aandeel.
  confirmed      boolean not null default false,
  -- Door de klant weggezet als "dit is geen concurrent van mij". Blijft staan
  -- zodat we hem niet elke meting opnieuw voorstellen.
  dismissed      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists entities_profile_normalized_idx
  on public.entities (profile_id, normalized);
create index if not exists entities_profile_idx on public.entities (profile_id);

drop trigger if exists entities_set_updated_at on public.entities;
create trigger entities_set_updated_at
  before update on public.entities
  for each row execute function public.set_updated_at();

-- Koppeling van een gemeten vermelding naar de samengevoegde entiteit. Nullable:
-- een merk dat we nog niet kennen wordt aangemaakt bij de aggregatie, maar een
-- oude rij van vóór deze migratie heeft niets.
alter table public.tracking_run_mentions
  add column if not exists entity_id uuid references public.entities (id) on delete set null;

create index if not exists trm_entity_idx on public.tracking_run_mentions (entity_id);

-- Lezen mag de eigenaar (via het profiel); schrijven loopt zoals overal via de
-- service-role in een API-route met expliciete eigenaarscontrole.
alter table public.entities enable row level security;

drop policy if exists "entities_select_own" on public.entities;
create policy "entities_select_own"
  on public.entities for select
  using (exists (
    select 1 from public.profiles p
    where p.id = entities.profile_id and p.user_id = (select auth.uid())
  ));


-- ═══════════════════════════════════════════════════════════════════════════
-- STAP 6 — Migratie 0017: eerlijk volumecijfer (fase 2.6)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `volume_estimate` is een gok van het model op een schaal van 0 tot 100 — de
-- code zegt dat er zelf bij — en dat getal ging vermenigvuldigd het dashboard op
-- als "Gewogen zichtbaarheid". Het verschil tussen 62 en 68 bestaat niet; de
-- berekening deed alsof, en de klant zag "volume ~68/100".
--
-- We houden `volume_estimate` (audit-trail: dít gaf het model terug), maar de
-- WEGING en de WEERGAVE lopen voortaan over de band.

alter table public.prompts
  -- 'hoog' | 'midden' | 'laag'. Nullable voor rijen van vóór deze migratie; de
  -- code valt dan terug op de omzetting van volume_estimate.
  add column if not exists volume_band   text,
  -- 'geschat' (door het model) of 'klant' (handmatig bijgesteld). Zodra de klant
  -- de band aanpast, mag een volgende kalibratie hem niet overschrijven.
  add column if not exists volume_source text not null default 'geschat';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'prompts_volume_band_check') then
    alter table public.prompts add constraint prompts_volume_band_check
      check (volume_band is null or volume_band in ('hoog', 'midden', 'laag'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prompts_volume_source_check') then
    alter table public.prompts add constraint prompts_volume_source_check
      check (volume_source in ('geschat', 'klant'));
  end if;
end $$;

-- Backfill met dezelfde grenzen als lib/pipeline/volume.ts (60 en 25). Bewust
-- vaste grenzen en geen verdeling op rangorde: staan alle vragen van een analyse
-- laag op de schaal, dan hóren ze allemaal in 'laag' te vallen.
update public.prompts
set volume_band = case
    when volume_estimate is null then 'midden'
    when volume_estimate >= 60   then 'hoog'
    when volume_estimate >= 25   then 'midden'
    else                              'laag'
  end
where volume_band is null;

create index if not exists prompts_volume_band_idx on public.prompts (analysis_id, volume_band);


-- ═══════════════════════════════════════════════════════════════════════════
-- STAP 7 — Migratie 0015: werker aansturen vanuit Postgres — OPTIONEEL
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Alleen nodig als je géén Vercel Pro hebt. Vercel Cron staat op het Hobby-plan
-- maar een beperkt aantal taken toe met een lage frequentie (dagelijks); een
-- werker die elke minuut draait vraagt Pro. Maar de wachtrij LEEFT AL in
-- Postgres, en Supabase heeft pg_cron en pg_net. Dan kan de database zichzelf
-- net zo goed aansturen — geen extra leverancier, geen extra abonnement.
--
-- ⚠️  ZET EERST DEZE TWEE GEHEIMEN (eenmalig, apart uitvoeren):
--
--       select vault.create_secret('https://jouw-app.vercel.app', 'geo_site_url');
--       select vault.create_secret('<dezelfde waarde als CRON_SECRET>', 'geo_cron_secret');
--
--     Zonder die twee doet de cron niets — hij faalt niet elke minuut met een
--     fout, hij slaat gewoon over.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Losse functie i.p.v. inline SQL in de cron-definitie: zo is hij met de hand te
-- testen (`select public.trigger_worker();`) en staat de logica op één plek.
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

-- Elke minuut. Bestaat de taak al (bij een herhaalde run), eerst weghalen.
select cron.unschedule('geo-worker') where exists (
  select 1 from cron.job where jobname = 'geo-worker'
);

select cron.schedule('geo-worker', '* * * * *', 'select public.trigger_worker();');

-- Controleren:  select * from cron.job;
--               select * from cron.job_run_details order by start_time desc limit 20;
-- Uitzetten:    select cron.unschedule('geo-worker');


-- ═══════════════════════════════════════════════════════════════════════════
-- CONTROLE — draai dit na afloop; alles hoort 't' te zijn
-- ═══════════════════════════════════════════════════════════════════════════
--
-- select
--   to_regclass('public.ai_calls')  is not null as tabel_ai_calls,
--   to_regclass('public.entities')  is not null as tabel_entities,
--   to_regproc('public.claim_jobs') is not null as functie_claim_jobs,
--   exists (select 1 from information_schema.columns
--            where table_name = 'jobs' and column_name = 'dedupe_key')       as jobs_dedupe_key,
--   exists (select 1 from information_schema.columns
--            where table_name = 'analyses' and column_name = 'notify_by_email') as analyses_mail,
--   exists (select 1 from information_schema.columns
--            where table_name = 'visibility_scores' and column_name = 'score_stderr') as scores_stderr,
--   exists (select 1 from information_schema.columns
--            where table_name = 'prompts' and column_name = 'volume_band')   as prompts_band,
--   'draft' = any (enum_range(null::content_status)::text[])                 as status_draft;
