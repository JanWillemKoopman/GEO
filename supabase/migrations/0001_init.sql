-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — datamodel (abcplan.md §5)
-- Migratie 0001: schema, enums, tabellen, indexes, triggers.
-- RLS-policies staan in 0002_rls.sql.
--
-- Kernprincipe (§5): we bewaren ALLES. Elke AI-call slaat zijn volledige ruwe
-- JSON op (raw_json / mention_json / source_raw_json) naast de uitgesplitste
-- kolommen die de UI gebruikt.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ── Enums ────────────────────────────────────────────────────────────────────

-- 6-statusmachine (§3.4 / §12.19). 'gemeten' zit bewust tussen 'meten' en
-- 'gereed': score klaar (na A3) vs. rapport ook klaar (na B2).
create type analysis_status as enum (
  'bezig',
  'concept_klaar',
  'meten',
  'gemeten',
  'gereed',
  'mislukt'
);

create type prompt_origin as enum ('system', 'user');           -- prompts.created_by (§5)
create type mention_sentiment as enum ('positive', 'neutral', 'negative'); -- 3b (§6)
create type content_type as enum ('article', 'faq', 'landing', 'comparison'); -- Fase B/C
create type content_status as enum ('ready', 'archived', 'published'); -- 'published' pas in Fase D (§13)
create type job_status as enum ('queued', 'running', 'done', 'failed'); -- job-queue (§4)

-- ── analyses ─────────────────────────────────────────────────────────────────
-- Het kernobject (§3). Eén user → veel analyses, elk volledig zelfstandig.
create table public.analyses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  url              text not null,
  topic            text,                       -- optioneel onderwerp/segment (§3.1); niet wijzigbaar na start (§3.3)
  name             text not null,              -- auto: "{url} — {topic}" of "{url} (hele site)"
  status           analysis_status not null default 'bezig',
  tracking_enabled boolean not null default false, -- wekelijkse lus, per analyse (§6 A3 / §12.4)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index analyses_user_id_idx on public.analyses (user_id);
create index analyses_status_idx on public.analyses (status);

-- ── brand_dna ────────────────────────────────────────────────────────────────
-- Eén per analyse (halte 1, topic-aware). Bewerkbaar door de klant (§3.6).
create table public.brand_dna (
  id             uuid primary key default gen_random_uuid(),
  analysis_id    uuid not null unique references public.analyses (id) on delete cascade,
  industry       text,
  tone_of_voice  text,
  summary        text,
  products       text[] not null default '{}',
  value_props    text[] not null default '{}',
  competitors    text[] not null default '{}',
  personas       jsonb not null default '[]'::jsonb, -- [{ name, needs: [] }]
  raw_json       jsonb,                              -- volledige ruwe OpenAI-output (halte 1)
  edited_by_user boolean not null default false,     -- §3.6 / §5 — puur informatief
  updated_at     timestamptz not null default now()
);

-- ── prompts ──────────────────────────────────────────────────────────────────
-- De te tracken vragen (halte 2). Volledig CRUD-beheerbaar door de klant (§3.5, A2b).
create table public.prompts (
  id              uuid primary key default gen_random_uuid(),
  analysis_id     uuid not null references public.analyses (id) on delete cascade,
  text            text not null,
  category        text not null,                -- Oriëntatie/Vergelijking/... (§6 A2), vrije tekst
  intent          text,
  active          boolean not null default true, -- aan/uit zonder verwijderen (§3.5)
  created_by      prompt_origin not null default 'system',
  source_raw_json jsonb,                          -- fragment van halte-2-output waaruit deze prompt ontstond
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index prompts_analysis_id_idx on public.prompts (analysis_id);
create index prompts_active_idx on public.prompts (analysis_id, active);

-- ── tracking_runs ────────────────────────────────────────────────────────────
-- Elke keer dat een prompt naar de LLM ging (halte 3a+3b). Alles bewaard.
-- analysis_id is bewust gedenormaliseerd toegevoegd (naast prompt_id) voor
-- RLS-eenvoud en de per-analyse aggregatie in 3c.
create table public.tracking_runs (
  id                       uuid primary key default gen_random_uuid(),
  analysis_id              uuid not null references public.analyses (id) on delete cascade,
  prompt_id                uuid references public.prompts (id) on delete set null,
  prompt_text_snapshot     text not null,       -- bevroren op meetmoment (§3.5, §5) — vervalst nooit de historie
  prompt_category_snapshot text not null,
  engine                   text not null default 'openai',
  model_used               text,
  week_no                  integer not null default 0, -- 0 = nulmeting (§6 A3)
  ran_at                   timestamptz not null default now(),
  raw_response             text,                -- ruw AI-antwoord uit 3a
  raw_response_received_at timestamptz,         -- voor idempotente retries (§6 A3)
  mention_json             jsonb,               -- volledige structured-output uit 3b
  openai_response_id       text,
  tokens_used              integer,
  cost_usd                 numeric(10, 6)
);
create index tracking_runs_analysis_id_idx on public.tracking_runs (analysis_id);
create index tracking_runs_prompt_id_idx on public.tracking_runs (prompt_id);
create index tracking_runs_week_idx on public.tracking_runs (analysis_id, week_no);

-- ── tracking_run_mentions ────────────────────────────────────────────────────
-- Genormaliseerde vorm van mention_json: ÉÉN RIJ PER ENTITEIT (§5, §12.16).
-- Bron voor visibility_scores (is_own_brand = true) én competitor_breakdown (false).
create table public.tracking_run_mentions (
  id              uuid primary key default gen_random_uuid(),
  tracking_run_id uuid not null references public.tracking_runs (id) on delete cascade,
  entity_name     text not null,
  is_own_brand    boolean not null,
  mentioned       boolean not null,
  position        integer,
  sentiment       mention_sentiment,
  cited_sources   text[] not null default '{}'
);
create index trm_run_id_idx on public.tracking_run_mentions (tracking_run_id);
create index trm_own_brand_idx on public.tracking_run_mentions (is_own_brand);

-- ── visibility_scores ────────────────────────────────────────────────────────
-- Rollup per week (3c, geen AI-call). Eén rij per (analyse, week).
create table public.visibility_scores (
  id              uuid primary key default gen_random_uuid(),
  analysis_id     uuid not null references public.analyses (id) on delete cascade,
  week_no         integer not null,
  score           numeric(5, 2) not null,          -- 0–100
  share_of_voice  numeric(5, 2),                    -- % t.o.v. concurrenten
  per_engine_json jsonb,
  computed_at     timestamptz not null default now(),
  unique (analysis_id, week_no)
);
create index visibility_scores_analysis_idx on public.visibility_scores (analysis_id);

-- ── competitor_breakdown ─────────────────────────────────────────────────────
-- Per-concurrent uitsplitsing (3c). Rijke, structured input voor Fase B1.
create table public.competitor_breakdown (
  id                        uuid primary key default gen_random_uuid(),
  analysis_id               uuid not null references public.analyses (id) on delete cascade,
  week_no                   integer not null,
  competitor_name           text not null,
  mentions_count            integer not null default 0,
  mentions_by_category_json jsonb,
  top_cited_sources         text[] not null default '{}',
  winning_run_ids           uuid[] not null default '{}', -- verwijzen naar tracking_runs.id (§5, §12.17)
  losing_run_ids            uuid[] not null default '{}',
  computed_at               timestamptz not null default now()
);
create index competitor_breakdown_analysis_idx on public.competitor_breakdown (analysis_id, week_no);

-- ── reports ──────────────────────────────────────────────────────────────────
-- Fase B: gap-analyse (B1) + rapport (B2). Beide ruwe outputs bewaard.
create table public.reports (
  id                   uuid primary key default gen_random_uuid(),
  analysis_id          uuid not null references public.analyses (id) on delete cascade,
  period               text,                 -- bv. "week 0"
  summary              text,
  gaps_json            jsonb,
  recommendations_json jsonb,
  gap_analysis_raw_json jsonb,               -- volledige ruwe OpenAI-output B1
  raw_json             jsonb,                -- volledige ruwe OpenAI-output B2
  generated_at         timestamptz not null default now()
);
create index reports_analysis_idx on public.reports (analysis_id);

-- ── content_pieces ───────────────────────────────────────────────────────────
-- Fase C: gegenereerde pagina's (Content Bibliotheek). Op klant-klik.
create table public.content_pieces (
  id               uuid primary key default gen_random_uuid(),
  analysis_id      uuid not null references public.analyses (id) on delete cascade,
  report_id        uuid references public.reports (id) on delete set null,
  type             content_type not null,
  title            text not null,
  target_intent    text,
  cluster          text,
  body_markdown    text,
  meta_title       text,
  meta_description  text,
  schema_jsonld    text,
  faq_json         jsonb,
  raw_json         jsonb,                    -- volledige ruwe OpenAI-output (halte 6)
  status           content_status not null default 'ready',
  word_count       integer,
  created_at       timestamptz not null default now()
);
create index content_pieces_analysis_idx on public.content_pieces (analysis_id);

-- ── jobs ─────────────────────────────────────────────────────────────────────
-- Async motor (§4). GEEN client-toegang (RLS deny-all in 0002). Altijd aan een analyse gekoppeld.
create table public.jobs (
  id            uuid primary key default gen_random_uuid(),
  analysis_id   uuid not null references public.analyses (id) on delete cascade,
  type          text not null,            -- 'baseline_run' | 'weekly_run' | 'report' | 'content' | ...
  payload_json  jsonb,
  status        job_status not null default 'queued',
  attempts      integer not null default 0,
  scheduled_for timestamptz not null default now(),
  last_error    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index jobs_status_scheduled_idx on public.jobs (status, scheduled_for);
create index jobs_analysis_idx on public.jobs (analysis_id);

-- ── updated_at triggers ──────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger analyses_set_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();

create trigger brand_dna_set_updated_at
  before update on public.brand_dna
  for each row execute function public.set_updated_at();

create trigger prompts_set_updated_at
  before update on public.prompts
  for each row execute function public.set_updated_at();

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();
