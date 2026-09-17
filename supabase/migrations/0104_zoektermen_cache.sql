-- ═══════════════════════════════════════════════════════════════════════════
-- ORBIT ENGINE: echte zoekvolumes cachen
-- Migratie 0104 (docs/tasks/zoekdata-in-de-keten.md, blok B).
--
-- WAAROM EEN CACHE EN NIET ELKE KEER OPNIEUW OPHALEN
--
-- Dezelfde zoekterm twee keer ophalen is twee keer betalen voor hetzelfde
-- getal. Volumes veranderen maandelijks, niet dagelijks, dus een rij van
-- minder dan dertig dagen oud wordt nooit opnieuw opgehaald
-- (`lib/search-demand/cache.ts`).
--
-- WAAROM EEN EIGEN KOSTENLOGBOEK EN NIET `ai_calls`
--
-- `ai_calls` wordt gelezen door het dagplafond (`lib/spend-limit.ts`), dat
-- bedoeld is om een op hol geslagen AI-meetronde te stoppen. Een
-- zoekvolume-aanroep bij DataForSEO hoort daar niet in mee te tellen: dat
-- plafond mag een meting nooit blokkeren vanwege een paar dollarcent aan
-- zoektermen. Vandaar `vendor_calls`, een eigen, kleiner logboek voor
-- leveranciers buiten OpenAI.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.keyword_demand (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  -- ISO-landcode, bijvoorbeeld "NL". Los van taal: "BE" heeft zowel nl als fr.
  country text not null,
  -- ISO-taalcode, bijvoorbeeld "nl".
  language text not null,

  -- Maandelijks zoekvolume. `null` = de leverancier kent deze term niet, en
  -- dat is onbekend, geen nul (conventie 3).
  volume integer,
  competition numeric(4, 3),
  cpc numeric(8, 2),

  provider text not null default 'dataforseo',
  -- De volledige ruwe respons van de leverancier, naast de uitgesplitste
  -- kolommen (conventie 8, audit-trail).
  raw_json jsonb,

  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  unique (keyword, country, language)
);

create index if not exists keyword_demand_fetched_idx
  on public.keyword_demand (fetched_at);

-- Geen RLS-select-policy voor klanten: dit is generieke marktdata, niet aan
-- één profiel gebonden, en wordt alleen door de service-role gelezen
-- (conventie 6). Wel RLS aan, met nul policies, zelfde patroon als
-- `staff_users`.
alter table public.keyword_demand enable row level security;

-- ── Het kostenlogboek voor leveranciers buiten OpenAI ────────────────────────
create table if not exists public.vendor_calls (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  -- Wat voor aanroep, bijvoorbeeld "search_volume".
  kind text not null,
  units integer not null default 0,
  cost_usd numeric(10, 4) not null default 0,
  profile_id uuid references public.profiles(id) on delete set null,
  raw_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists vendor_calls_created_idx
  on public.vendor_calls (created_at);
create index if not exists vendor_calls_profile_idx
  on public.vendor_calls (profile_id);

alter table public.vendor_calls enable row level security;
