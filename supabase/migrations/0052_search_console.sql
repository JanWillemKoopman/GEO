-- ═══════════════════════════════════════════════════════════════════════════
-- ORBIT ENGINE: Google Search Console koppelen
-- Migratie 0052 (fase 5, docs/tasks/zoekdata-koppeling.md, besluit 4).
--
-- WAAROM EEN SERVICE ACCOUNT EN GEEN OAUTH
--
-- Uitgezocht op 6 augustus (§2 van dat document): de `webmasters`-scopes zijn bij
-- Google "sensitive", dus een OAuth-app die de Search Console van klanten leest
-- moet door een verificatietraject van weken met privacybeleid en demovideo. Een
-- service account heeft geen consent-scherm en dus geen verificatieplicht. De
-- prijs is één handmatige stap bij de klant: hij voegt ons adres toe als
-- gebruiker. Lezen mag met de rol "Beperkt", dus dat is genoeg.
--
-- WAT HIER NIET IN ZIT, EN WAAROM
--
--   • Geen tokens. Er is niets per klant op te slaan: één sleutel in een secret,
--     verder niets. Dat is precies de winst van het service account.
--   • Geen Google Analytics. Dat zijn persoonsgegevens en dan wordt ORBIT ENGINE
--     verwerker (§2). InSpace maakt hetzelfde onderscheid.
--   • Geen aparte kolom voor AI Overviews. Google levert die niet: klikken uit
--     een AI-antwoord zitten ongesplitst in `web`. Dat is precies het cijfer
--     waarvan een klant aanneemt dat het erin zit, dus het staat expliciet in de
--     UI en niet stilzwijgend in een kolom die iets anders betekent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. De koppeling per merk ───────────────────────────────────────────────
alter table public.profiles
  add column if not exists gsc_property text,
  add column if not exists gsc_verified_at timestamptz,
  add column if not exists gsc_last_error text,
  add column if not exists gsc_last_sync_at timestamptz,
  add column if not exists gsc_first_day date;

comment on column public.profiles.gsc_property is
  'De property zoals Search Console hem kent: "sc-domain:voorbeeld.nl" of "https://voorbeeld.nl/". Leeg = niet gekoppeld.';
comment on column public.profiles.gsc_verified_at is
  'Wanneer ORBIT ENGINE voor het laatst kon lezen. Leeg terwijl er wél een property staat = de klant moet ons adres nog toevoegen.';
comment on column public.profiles.gsc_last_error is
  'De laatste fout in gewone taal, zodat het scherm kan zeggen wát er mis is in plaats van "mislukt".';
comment on column public.profiles.gsc_first_day is
  'De eerste dag waarvoor cijfers zijn opgehaald. Bepaalt het nulpunt van "sinds de start".';

-- ── 2. De cijfers, per pagina per dag ──────────────────────────────────────
--
-- Per PAGINA en niet per zoekopdracht: de vraag die dit product stelt is "doet
-- de pagina die ORBIT ENGINE schreef iets", en dat is een paginavraag. Zoekopdrachten
-- zijn een tweede tabel waard zodra ze echt gebruikt worden (fase 2 van
-- zoekdata-koppeling.md); ze nu al ophalen levert rijen op die niemand leest.
create table if not exists public.search_console_days (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  page text not null,

  clicks integer not null default 0,
  impressions integer not null default 0,
  -- Gemiddelde positie. Kan best 40,7 zijn; geen integer dus.
  position numeric(6, 2),

  created_at timestamptz not null default now(),

  -- ⚠️ Google herziet de cijfers van de afgelopen dagen nog na. Zonder deze
  -- unieke sleutel zou elke synchronisatie dezelfde dag opnieuw invoegen en
  -- zouden de totalen optellen tot een veelvoud van de waarheid.
  unique (profile_id, day, page)
);

create index if not exists gsc_days_profile_idx
  on public.search_console_days (profile_id, day);
create index if not exists gsc_days_page_idx
  on public.search_console_days (profile_id, page, day);

-- ── 3. RLS ─────────────────────────────────────────────────────────────────
-- Lezen mag wie het merk mag lezen; schrijven loopt zoals overal via de
-- service-role in een API-route of een taak (conventie 6).
alter table public.search_console_days enable row level security;

drop policy if exists gsc_days_select on public.search_console_days;
create policy gsc_days_select on public.search_console_days
  for select using (profile_id in (select public.readable_profile_ids()));
