-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — migratie van fase 7
--
-- Vervolg op RUN_0012_TOT_0017.sql, RUN_0018_EN_0019.sql, RUN_0020.sql en
-- RUN_0021.sql. Voer die EERST uit.
--
-- Herhalen is veilig; er wordt niets verwijderd.
--
-- CONTROLE achteraf:
--   select
--     to_regclass('public.source_landscape') is not null as tabel_bronnen,
--     to_regclass('public.offsite_tasks')    is not null as tabel_taken,
--     exists (select 1 from information_schema.columns
--              where table_name = 'profiles' and column_name = 'wikidata_id') as profiel_entiteit;
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — off-site zichtbaarheid (optimalisatie.md fase 7)
-- Migratie 0022: het plafond doorbreken dat op puur on-site advies zit.
--
-- De metingen laten zien dat AI-assistenten voor koopvragen zwaar leunen op
-- ÁNDERE sites: reviewplatforms, vergelijkers, lijstjes, vakpers, Wikipedia,
-- fora. De app registreerde die bronnen zelfs al netjes per concurrent in
-- `top_cited_sources` — maar het enige advies dat het product kon geven was
-- "schrijf een pagina op je eigen site". Daarmee zit er een plafond op het
-- resultaat dat je met betere teksten niet wegneemt.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Het bronnenlandschap (7.1) ───────────────────────────────────────────
-- Welke DOMEINEN bepalen deze markt? Per domein en niet per URL: dat een AI
-- drie verschillende pagina's van hetzelfde reviewplatform aanhaalt, is één
-- signaal ("dit platform telt hier") en niet drie.
create table if not exists public.source_landscape (
  id            uuid primary key default gen_random_uuid(),
  analysis_id   uuid not null references public.analyses (id) on delete cascade,
  domain        text not null,
  -- Hoe vaak dit domein over alle metingen heen geciteerd is.
  citations     integer not null default 0,
  -- In hoeveel verschillende vragen. Een domein dat bij één vraag vijf keer
  -- langskomt is iets anders dan een dat bij vijf vragen opduikt.
  prompt_count  integer not null default 0,
  -- Welke concurrenten er via deze bron genoemd werden. Dit is de zin die het
  -- rapport moet kunnen maken: "je concurrent staat erop, jij niet".
  competitors   text[] not null default '{}',
  -- Staat de KLANT op deze bron? null = nog niet gecontroleerd (7.2). Bewust
  -- drie toestanden en geen boolean: "we weten het niet" is een echt antwoord,
  -- en het als "nee" tonen zou de klant op pad sturen voor iets wat misschien
  -- al geregeld is.
  own_present   boolean,
  own_url       text,
  checked_at    timestamptz,
  updated_at    timestamptz not null default now()
);

create unique index if not exists source_landscape_analysis_domain_idx
  on public.source_landscape (analysis_id, domain);
create index if not exists source_landscape_analysis_idx
  on public.source_landscape (analysis_id, citations desc);

-- ── 2. Entiteitsaanwezigheid (7.4) ──────────────────────────────────────────
-- Of een merk in Wikidata en Wikipedia voorkomt, is een van de sterkste
-- signalen die AI-systemen gebruiken om een bedrijf überhaupt als BESTAANDE
-- ENTITEIT te herkennen. Staat een merk daar niet, dan is het voor een model
-- geen ding maar een woord.
--
-- Bij het profiel en niet bij de analyse: dit gaat over het merk, niet over één
-- onderwerp.
alter table public.profiles
  add column if not exists wikidata_id      text,
  add column if not exists wikipedia_url    text,
  add column if not exists entity_checked_at timestamptz;

-- ── 3. Off-site taken (7.6) ─────────────────────────────────────────────────
-- Deze acties worden GEEN gegenereerde pagina maar een taak met een status.
-- Zonder dat blijven ze hangen als goedbedoeld advies — en dat is precies wat
-- er nu met off-site adviezen gebeurt in de markt.
create table if not exists public.offsite_tasks (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  -- 'platform' | 'wikidata' | 'wikipedia' | 'overig'
  kind        text not null default 'platform',
  -- Het domein waar het over gaat, als dat er is.
  domain      text,
  title       text not null,
  -- Waarom dit uitmaakt, met de cijfers erbij. Dit is wat de klant overtuigt.
  why         text not null,
  -- De concrete vervolgstap, in gewone taal.
  action      text,
  -- 'open' | 'bezig' | 'gedaan' | 'niet_relevant'
  status      text not null default 'open',
  -- Volgorde waarin ze getoond worden; laag = eerst.
  priority    integer not null default 50,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.offsite_tasks
  add constraint offsite_tasks_status_check
    check (status in ('open', 'bezig', 'gedaan', 'niet_relevant')),
  add constraint offsite_tasks_kind_check
    check (kind in ('platform', 'wikidata', 'wikipedia', 'overig'));

-- Dezelfde taak niet twee keer aanmaken bij een volgende scan.
create unique index if not exists offsite_tasks_unique_idx
  on public.offsite_tasks (analysis_id, kind, coalesce(domain, ''));
create index if not exists offsite_tasks_analysis_idx on public.offsite_tasks (analysis_id, status);

drop trigger if exists offsite_tasks_set_updated_at on public.offsite_tasks;

create trigger offsite_tasks_set_updated_at
  before update on public.offsite_tasks
  for each row execute function public.set_updated_at();

drop trigger if exists source_landscape_set_updated_at on public.source_landscape;

create trigger source_landscape_set_updated_at
  before update on public.source_landscape
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.source_landscape enable row level security;
alter table public.offsite_tasks enable row level security;

drop policy if exists "source_landscape_select_own" on public.source_landscape;

create policy "source_landscape_select_own"
  on public.source_landscape for select
  using (exists (
    select 1 from public.analyses a
    where a.id = source_landscape.analysis_id and a.user_id = (select auth.uid())
  ));

drop policy if exists "offsite_tasks_select_own" on public.offsite_tasks;

create policy "offsite_tasks_select_own"
  on public.offsite_tasks for select
  using (exists (
    select 1 from public.analyses a
    where a.id = offsite_tasks.analysis_id and a.user_id = (select auth.uid())
  ));
