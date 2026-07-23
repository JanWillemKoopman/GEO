-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — Klantprofiel op accountniveau
-- Migratie 0003: het grondige merkonderzoek (merknaam, branche, concurrenten,
-- persona's, tone-of-voice) verhuist van "per analyse" naar "per klantprofiel"
-- (§accountniveau). Eén account kan meerdere profielen hebben (bv. een bureau
-- met meerdere merken); elke analyse hangt aan precies één profiel en doet zelf
-- alleen nog een lichtgewicht, onderwerp-specifiek onderzoek (`topic_research`).
--
-- Registratie staat dicht (bouwfase) — bestaande testdata gaat hierbij weg;
-- dit is bewust een schone migratie, geen dataconversie.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Testdata weg vóór we analyses.profile_id/topic not null maken ───────────
truncate table public.analyses cascade;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Eén per klantprofiel. Het grondige, bedrijfsbrede onderzoek (§A1 oud) gebeurt
-- hier eenmalig. Eigen statusmachine: onderzoek loopt async, net als een analyse.
create type profile_status as enum ('bezig', 'klaar', 'mislukt');

create table public.profiles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,             -- label, bv. "MediaMarkt"
  url            text not null,
  brand_name     text,                      -- canonieke merknaam (eigen kolom, geen raw_json-hack meer)
  industry       text,
  tone_of_voice  text,
  summary        text,
  products       text[] not null default '{}',
  value_props    text[] not null default '{}',
  competitors    text[] not null default '{}', -- bedrijfsbreed; per-analyse aanvulling zit in topic_research
  personas       jsonb not null default '[]'::jsonb, -- [{ name, needs: [] }]
  raw_json       jsonb,                     -- volledige ruwe OpenAI-output van het profielonderzoek
  status         profile_status not null default 'bezig',
  edited_by_user boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index profiles_user_id_idx on public.profiles (user_id);

-- ── analyses: koppeling aan een profiel, onderwerp verplicht ────────────────
alter table public.analyses
  add column profile_id uuid references public.profiles (id) on delete cascade;
alter table public.analyses
  alter column topic set not null;
-- Snapshot van profiles.url op aanmaakmoment (zelfde patroon als
-- tracking_runs.prompt_text_snapshot) — geen los url-veld meer in het formulier,
-- maar wél zinvol te bevriezen als het profiel later van url verandert.
alter table public.analyses
  alter column profile_id set not null;

-- ── brand_dna vervalt: het bedrijfsbrede deel zit nu in profiles ────────────
drop table public.brand_dna;

-- ── topic_research ───────────────────────────────────────────────────────────
-- Vervangt brand_dna op analyseniveau, sterk verkleind: alleen wat specifiek is
-- voor het onderwerp van déze analyse (§1: content op de site, §2: concurrenten
-- voor dit onderwerp). Persona's/tone/industry/producten zitten in profiles.
create table public.topic_research (
  id              uuid primary key default gen_random_uuid(),
  analysis_id     uuid not null unique references public.analyses (id) on delete cascade,
  content_summary text,
  competitors     text[] not null default '{}',
  raw_json        jsonb,
  edited_by_user  boolean not null default false,
  updated_at      timestamptz not null default now()
);

-- ── updated_at triggers ──────────────────────────────────────────────────────
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger topic_research_set_updated_at
  before update on public.topic_research
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.topic_research enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (user_id = (select auth.uid()));

create policy "topic_research_select_own"
  on public.topic_research for select
  using (exists (
    select 1 from public.analyses a
    where a.id = topic_research.analysis_id and a.user_id = (select auth.uid())
  ));
