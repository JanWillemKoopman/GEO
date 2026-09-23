-- 0109: Clusters ontdekken (docs/tasks/clusters-ontdekken.md).
--
-- Een ontdekkingsronde zoekt uit Search Console, de onboarding en DataForSEO
-- nieuwe onderwerpen voor een merk en bundelt ze tot kandidaat-clusters. Twee
-- tabellen: de ronde zelf (met alle ruwe invoer, conventie 8) en de kandidaten
-- die eruit komen.
--
-- ⚠️ Bewust NIET in `profile_topics`. Een ronde levert 8 tot 15 kandidaten op,
-- en die horen niet in "Voorgesteld" op Mijn clusters te verschijnen voordat
-- iemand ze heeft gekozen. Pas bij "toevoegen" wordt een kandidaat een
-- voorgesteld onderwerp, met een verwijzing terug hierheen.
--
-- ⚠️ Zoekvolumes uit deze tabellen gaan NERGENS de potentiescore of de
-- meetgewichten in (logboek 20 september 2026 (2) en 23 september 2026): daar
-- ontstonden de twee fouten van de geparkeerde zoekvolumelaag.
--
-- Additief en idempotent (conventie 4). Lezen mag wie het merk mag lezen,
-- schrijven gaat alleen via de API met de service-role key (conventie 6).

create table if not exists public.cluster_discovery_runs (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  -- Wie de ronde startte. Altijd een beheerder: `clusters_ontdekken` staat in
  -- STAFF_ONLY_ACTIONS (lib/cost-rules.ts).
  started_by    uuid references auth.users (id) on delete set null,
  -- verzamelen → verbreden → schiften → bundelen → klaar, of mislukt.
  status        text not null default 'verzamelen',
  -- In gewone taal, voor het scherm: wat ging er mis, of welke bron ontbrak.
  status_note   text,
  -- Wat er aan invoer was: aanbod, gesprek, Search Console, bestaande clusters.
  -- Ook de vermijdlijst. Zodat een ronde achteraf na te lopen is.
  input_json    jsonb not null default '{}'::jsonb,
  -- De volledige ruwe DataForSEO-antwoorden per aanroep (conventie 8).
  dataforseo_raw jsonb,
  -- De zoektermen na het verbreden en na het schiften, met herkomst.
  terms_json    jsonb,
  sifted_json   jsonb,
  -- Kosten, gesplitst: DataForSEO rekent buiten `ai_calls` om.
  dataforseo_cost_usd numeric not null default 0,
  ai_cost_usd   numeric not null default 0,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

alter table public.cluster_discovery_runs
  drop constraint if exists cluster_discovery_runs_status_check,
  add  constraint cluster_discovery_runs_status_check
       check (status in ('verzamelen', 'verbreden', 'schiften', 'bundelen', 'klaar', 'mislukt'));

create index if not exists cluster_discovery_runs_profile_idx
  on public.cluster_discovery_runs (profile_id, created_at desc);

create table if not exists public.cluster_discovery_candidates (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.cluster_discovery_runs (id) on delete cascade,
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  rationale     text,
  -- Snelle winst, nieuw terrein of concurrent is je voor. Bepaald in code
  -- (lib/cluster-discovery.ts), niet door het model.
  kind          text not null,
  -- De dienst(en) uit de aanbodboom waar dit uit volgt, op naam.
  offering_names text[] not null default '{}',
  -- [{ keyword, volume, bron, positie, url, concurrent }]. Alleen termen die
  -- in de invoer van de ronde stonden; de code controleert dat.
  terms_json    jsonb not null default '[]'::jsonb,
  -- Opgeteld door de code. NULL als geen enkele term een volume had.
  total_volume  int,
  -- Beste eigen positie uit Search Console of DataForSEO, NULL = nergens.
  own_position  numeric,
  -- De score en zijn onderdelen, 0..100, voor de uitleg op de kaart.
  score         numeric not null default 0,
  score_json    jsonb not null default '{}'::jsonb,
  -- Lijkt deze kandidaat op een bestaand cluster of voorstel? Dan staat hier
  -- de titel daarvan. Niet stil weggooien: de mens beslist.
  overlaps_with text,
  status        text not null default 'nieuw',
  rejection_reason text,
  -- Het voorgestelde onderwerp dat hieruit ontstond, na "toevoegen".
  topic_id      uuid references public.profile_topics (id) on delete set null,
  -- Wie de klant was die "Dit wil ik" klikte, en wanneer.
  requested_by  uuid references auth.users (id) on delete set null,
  requested_at  timestamptz,
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.cluster_discovery_candidates
  drop constraint if exists cluster_discovery_candidates_kind_check,
  add  constraint cluster_discovery_candidates_kind_check
       check (kind in ('snelle_winst', 'nieuw_terrein', 'concurrent_voor')),
  drop constraint if exists cluster_discovery_candidates_status_check,
  add  constraint cluster_discovery_candidates_status_check
       check (status in ('nieuw', 'aangevraagd', 'toegevoegd', 'afgewezen'));

create index if not exists cluster_discovery_candidates_run_idx
  on public.cluster_discovery_candidates (run_id, score desc);
create index if not exists cluster_discovery_candidates_profile_idx
  on public.cluster_discovery_candidates (profile_id, status);

alter table public.cluster_discovery_runs enable row level security;
alter table public.cluster_discovery_candidates enable row level security;

drop policy if exists cluster_discovery_runs_select on public.cluster_discovery_runs;
create policy cluster_discovery_runs_select on public.cluster_discovery_runs
  for select using (profile_id in (select public.readable_profile_ids()));

drop policy if exists cluster_discovery_candidates_select on public.cluster_discovery_candidates;
create policy cluster_discovery_candidates_select on public.cluster_discovery_candidates
  for select using (profile_id in (select public.readable_profile_ids()));

-- Een voorgesteld onderwerp dat uit een ontdekkingsronde komt.
alter table public.profile_topics
  add column if not exists discovery_candidate_id uuid
    references public.cluster_discovery_candidates (id) on delete set null;

alter table public.profile_topics
  drop constraint if exists profile_topics_origin_check,
  add  constraint profile_topics_origin_check
       check (origin is null or origin in ('aanbod', 'aanbod_en_gesprek', 'ontdekking'));

comment on column public.profile_topics.discovery_candidate_id is
  'De kandidaat uit Clusters ontdekken waar dit onderwerp uit kwam (migratie 0109).';
