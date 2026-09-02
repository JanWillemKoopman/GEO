-- 0090: de snelheidsbegrenzing die er al lag, eindelijk aangezet
--
-- ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
--
-- docs/tasks/herstelplan-na-audit.md T8.11: de tabel `rate_limits` bestond al
-- op productie (aangemaakt buiten een migratie om, vandaar dat hij hier voor
-- het eerst als `create table if not exists` verschijnt), was leeg, en het
-- woord "rate_limit" kwam in de hele code niet voor. Inloggen en het
-- verzilveren van een uitnodiging waren onbegrensd: een aanvaller kon
-- onbeperkt wachtwoorden of uitnodigingstokens raden.
--
-- ── HET ONTWERP: EEN VAST VENSTER, ATOMAIR OPGEHOOGD ────────────────────────
--
-- `rate_limits (key, window_start, count)`, primary key op (key, window_start):
-- één rij per sleutel per tijdvenster. `rate_limit_hit()` doet de ophoging in
-- ÉÉN SQL-statement (`insert ... on conflict ... do update set count = count +
-- 1`), want twee gelijktijdige aanvragen die allebei "count is 0, dus zet hem
-- op 1" zouden lezen, zijn precies de race die een snelheidsbegrenzing zinloos
-- maakt. De sleutel en de vensterduur bepaalt de aanroeper (`lib/rate-limit.ts`,
-- puur en dus testbaar, conventie 2); deze functie doet alleen de atomaire
-- telling.
--
-- ⚠️ Geen opruimtaak in deze migratie. Oude vensters blijven staan (klein: één
-- rij per sleutel per venster van vijftien minuten) en groeien traag genoeg om
-- geen probleem te zijn vóór er een volgende ronde tijd voor is; dit lost het
-- ONTBREKEN van een begrenzing op, niet het langetermijnbeheer van de tabel.
--
-- Additief en idempotent (conventie 4).

create table if not exists public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
-- Deny-all: RLS aan, geen enkele policy (zelfde patroon als public.jobs en
-- public.ai_calls). Alleen de service-role (via `rate_limit_hit()`) mag hier
-- iets in wegschrijven of uit lezen.

create or replace function public.rate_limit_hit(
  p_key text,
  p_window_start timestamptz
)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.rate_limits (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count;
$$;

comment on table public.rate_limits is
  '(0090) Snelheidsbegrenzing per sleutel per tijdvenster. Zie lib/rate-limit.ts. Schrijf er nooit rechtstreeks in, alleen via rate_limit_hit().';
comment on function public.rate_limit_hit(text, timestamptz) is
  '(0090) Hoogt de teller voor (key, window_start) atomair op met 1 en geeft de nieuwe stand terug. Zie lib/rate-limit.ts.';
