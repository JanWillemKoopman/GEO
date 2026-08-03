-- ═══════════════════════════════════════════════════════════════════════════
-- 0040 — Core topics en de uitkomst van het gesprek
--        (docs/tasks/onboarding-2.0.md, blok C en D)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── CORE TOPICS ────────────────────────────────────────────────────────────
--
-- Een analyse begint nu met een leeg tekstveld waarin de klant een onderwerp
-- typt ("wasmachines", "herenkapsel"). Dat werkt, maar het legt de moeilijkste
-- vraag van het hele product bij de persoon die er het minst over nagedacht
-- heeft — en het is precies de stap die InSpace handmatig door een strateeg
-- laat doen ("map 5 to 8 core topics").
--
-- Met een aanbodboom uit 0039 kan die lijst automatisch. De klant kiest dan uit
-- wat hij aanbiedt in plaats van iets te verzinnen.
--
-- Bewust GEEN meting per voorgesteld topic: dat zou 8 × ~$0,40 kosten voordat
-- iemand ja heeft gezegd. Het is een voorstellijst met een onderbouwing; pas na
-- goedkeuring draait de bestaande analysepijplijn van 30 vragen.
--
-- `analysis_id` en niet andersom: een analyse kan ook zonder topic ontstaan
-- (het vrije tekstveld blijft bestaan), dus de verwijzing hoort aan de kant die
-- optioneel is.
--
-- ── WAT HET GESPREK OPLEVERT ───────────────────────────────────────────────
--
-- Het uur consultancy gaat over twee dingen die een model niet kan weten:
-- welke topics er commercieel toe doen, en wat er speelt buiten de website om.
--
-- Het eerste staat op `profile_topics.client_note` — bij het topic waar het
-- over gaat, niet in een los strategiedocument.
--
-- Het tweede is `context_factors`, en dat is bewust GESTRUCTUREERD en geen
-- tekstvak. "We bouwen een nieuwe site" verandert wat het advies waard is: de
-- technische audit gaat dan over een site die straks niet meer bestaat, en het
-- nieuw/verbeteren-oordeel rust op URL's die verdwijnen. Als dat in een
-- notitieveld belandt, leest niemand het terug op het moment dat het uitmaakt.
-- Per soort hangt er gedrag aan; zie lib/pipeline/context-factors.ts.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Core topics ─────────────────────────────────────────────────────────
create table if not exists public.profile_topics (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  title        text not null,
  -- Waarom dit onderwerp, met verwijzing naar het aanbod waaruit het volgt.
  rationale    text,
  offering_ids uuid[] not null default '{}',
  -- Volgorde zoals het model hem voorstelde. Een ingevulde client_note wint
  -- hiervan bij het sorteren: wat de klant zegt gaat vóór wat het model dacht.
  priority     integer not null default 0,
  client_note  text,
  -- voorgesteld | goedgekeurd | afgewezen
  status       text not null default 'voorgesteld',
  analysis_id  uuid references public.analyses (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists profile_topics_profile_idx
  on public.profile_topics (profile_id, priority desc);

alter table public.profile_topics
  drop constraint if exists profile_topics_status_check,
  add  constraint profile_topics_status_check
       check (status in ('voorgesteld', 'goedgekeurd', 'afgewezen'));

-- Twee keer hetzelfde onderwerp voorstellen levert twee analyses over dezelfde
-- vragen op — en dus dubbele meetkosten zonder extra inzicht.
create unique index if not exists profile_topics_unique_title_idx
  on public.profile_topics (profile_id, lower(title));

drop trigger if exists profile_topics_set_updated_at on public.profile_topics;
create trigger profile_topics_set_updated_at
  before update on public.profile_topics
  for each row execute function public.set_updated_at();

-- ── 2. De uitkomst van het gesprek ─────────────────────────────────────────
create table if not exists public.profile_strategy (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  strategy_notes  text,
  -- [{ kind, description, effective_from }] — zie context-factors.ts voor de
  -- toegestane soorten en wat elke soort in gang zet.
  context_factors jsonb not null default '[]'::jsonb,
  recorded_by     uuid references auth.users (id),
  recorded_at     timestamptz,
  updated_at      timestamptz not null default now()
);

comment on column public.profile_strategy.context_factors is
  'Wat de pijplijn niet kan waarnemen. Gestructureerd en niet vrij, omdat elke '
  'soort gevolg heeft: nieuwe_website zet een houdbaarheidsmelding op de '
  'technische audit, naamswijziging eist beide namen in aliases, gestopte_dienst '
  'valt uit de topicvoorstellen.';

drop trigger if exists profile_strategy_set_updated_at on public.profile_strategy;
create trigger profile_strategy_set_updated_at
  before update on public.profile_strategy
  for each row execute function public.set_updated_at();

-- ── 3. RLS ─────────────────────────────────────────────────────────────────
alter table public.profile_topics   enable row level security;
alter table public.profile_strategy enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['profile_topics', 'profile_strategy']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format($f$
      create policy %I on public.%I for select
      using (exists (
        select 1 from public.profiles p
        where p.id = %I.profile_id and p.user_id = (select auth.uid())
      ))
    $f$, t || '_select_own', t, t);

    execute format('drop policy if exists %I on public.%I', t || '_select_staff', t);
    execute format(
      'create policy %I on public.%I for select using (public.is_staff())',
      t || '_select_staff', t
    );
  end loop;
end
$$;
