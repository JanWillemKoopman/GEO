-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — de schrijver krijgt de uitslagen (optimalisatie.md fase 4)
-- Migratie 0019: vier dingen die de meting en de schrijver aan elkaar knopen.
--
-- Het probleem dat hier opgelost wordt: de app meet wél en schrijft wél, maar de
-- twee helften raken elkaar niet. De schrijfaanroep kreeg het merkprofiel en
-- VIJF WILLEKEURIGE vraagteksten "alleen ter inspiratie" — niet welke vraag hij
-- moet winnen, niet wat de AI antwoordde toen de concurrent won.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Welke vraag moet deze pagina winnen? (4.1) ───────────────────────────
-- Dit is de spil van de hele fase. Zonder deze koppeling is niet te zeggen of
-- een gegenereerde pagina iets uithaalt, kan fase 5 (effect meten) niet bestaan,
-- en is dekkingsgraad niet te berekenen — "van je 15 gemiste vragen heb je er 6
-- geadresseerd" is precies het soort zin waar een klant iets aan heeft.
create table public.content_piece_targets (
  id               uuid primary key default gen_random_uuid(),
  content_piece_id uuid not null references public.content_pieces (id) on delete cascade,
  -- Nullable: de klant kan een prompt verwijderen zonder dat het bewijs
  -- daarmee waardeloos wordt. De tekst blijft als snapshot staan.
  prompt_id        uuid references public.prompts (id) on delete set null,
  -- De meting die aantoont dát deze vraag gemist werd. Hiermee kan de UI vanuit
  -- een pagina terugspringen naar het antwoord waar de concurrent won.
  tracking_run_id  uuid references public.tracking_runs (id) on delete set null,
  -- Bevroren op het moment van genereren: de vraag zoals de pagina hem moest
  -- winnen. Wijzigt de klant de prompt later, dan blijft herleidbaar waarvoor
  -- deze pagina geschreven is.
  prompt_text      text not null,
  cluster          text,
  created_at       timestamptz not null default now()
);

create unique index cpt_piece_prompt_idx
  on public.content_piece_targets (content_piece_id, prompt_id)
  where prompt_id is not null;
create index cpt_piece_idx  on public.content_piece_targets (content_piece_id);
create index cpt_prompt_idx on public.content_piece_targets (prompt_id);

-- ── 2. Versies (4.7) ────────────────────────────────────────────────────────
-- De idempotentie zat op de TITEL (`.eq("title", ...)`), waardoor opnieuw
-- genereren onmogelijk was: een pagina met "check nodig" liep dood en de klant
-- kon niets anders dan hem accepteren of negeren. Nu is elke nieuwe poging een
-- nieuwe rij; de nieuwste wordt getoond, oudere blijven bewaard (§5).
alter table public.content_pieces
  add column version    integer not null default 1,
  -- Welke rij is de actuele? Eén per (analyse, titel). Bewust een vlag en geen
  -- "max(version)"-query: het overzicht filtert hierop en dat moet indexeerbaar zijn.
  add column is_current  boolean not null default true,
  -- Waar deze versie uit voortkwam, zodat de geschiedenis te volgen is.
  add column supersedes_id uuid references public.content_pieces (id) on delete set null,
  -- Wat de klant zelf vroeg te veranderen (4.8). De belangrijkste ontbrekende
  -- knop in de hele app: er was geen enkele manier om te zeggen "dit moet anders".
  add column revision_note text,
  -- ── 3. GEO-beoordeling (4.5) ──────────────────────────────────────────────
  -- De beoordelaar scoorde op vijf REDACTIONELE dingen (answer-first, on-brand,
  -- concreet, scanbaar, geen slop). Geen enkel criterium ging over de vraag of
  -- een AI deze pagina zou citeren — terwijl daar het hele product over gaat.
  add column geo_score  integer,
  add column geo_json   jsonb,
  -- ── 3b. "Check nodig" uitleggen (4.13) ────────────────────────────────────
  -- Het gele label zei niet WÁT er gecheckt moest worden. De punten van de
  -- eindredacteur stonden alleen in `critique_raw_json` — de ruwe API-respons,
  -- die je niet aan een klant laat zien. Nu apart, leesbaar.
  add column review_notes text[] not null default '{}',
  -- Heeft de klant de tekst zelf bijgewerkt (4.12)? Dan mag een herschrijfronde
  -- zijn werk niet stilletjes overschrijven.
  add column edited_by_user boolean not null default false;

create index content_pieces_current_idx
  on public.content_pieces (analysis_id, is_current);

-- ── 4. De klant om feiten vragen (4.6) ──────────────────────────────────────
-- De schrijfinstructie zegt "verzin geen feiten, blijf algemeen bij twijfel".
-- Bij een klant met een dunne website levert dat gegarandeerd algemene tekst op
-- — en algemeen is precies wat niet geciteerd wordt. In plaats van dat te
-- accepteren, vraagt de app er gericht naar. Antwoorden gaan naar
-- profiles.proof_points en verbeteren élke volgende pagina.
create table public.fact_requests (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  -- Waar de vraag vandaan kwam; nullable want hij kan ook bij het profiel horen.
  analysis_id  uuid references public.analyses (id) on delete set null,
  -- "Hoeveel jaar bestaan jullie?" — één concrete vraag, geen open uitnodiging.
  question     text not null,
  -- Waarom we het vragen, zodat de klant ziet dat het ergens toe dient.
  reason       text,
  answer       text,
  -- 'open' | 'beantwoord' | 'overgeslagen'. Overgeslagen blijft staan zodat we
  -- dezelfde vraag niet elke keer opnieuw stellen.
  status       text not null default 'open',
  answered_at  timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.fact_requests
  add constraint fact_requests_status_check check (status in ('open', 'beantwoord', 'overgeslagen'));

-- Dezelfde vraag niet twee keer stellen aan hetzelfde profiel.
create unique index fact_requests_unique_idx on public.fact_requests (profile_id, question);
create index fact_requests_profile_idx on public.fact_requests (profile_id, status);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Lezen mag de eigenaar; schrijven loopt zoals overal via de service-role in een
-- API-route met expliciete eigenaarscontrole (§5/§12.20).
alter table public.content_piece_targets enable row level security;
alter table public.fact_requests enable row level security;

create policy "cpt_select_own"
  on public.content_piece_targets for select
  using (exists (
    select 1
      from public.content_pieces cp
      join public.analyses a on a.id = cp.analysis_id
     where cp.id = content_piece_targets.content_piece_id
       and a.user_id = (select auth.uid())
  ));

create policy "fact_requests_select_own"
  on public.fact_requests for select
  using (exists (
    select 1 from public.profiles p
    where p.id = fact_requests.profile_id and p.user_id = (select auth.uid())
  ));
