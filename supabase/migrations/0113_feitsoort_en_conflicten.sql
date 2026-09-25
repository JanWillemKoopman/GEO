-- 0113: het feitenregister en de conflictlijst
-- (docs/tasks/contentpijplijn-publicatiewaardig.md, WP2, §6 en §8)
--
-- Waarom. `planFactMerge()` herkent tegenspraak alleen als twee feiten dezelfde
-- `fact_key` hebben, en die sleutel komt uit de tekst. Twee zinnen over dezelfde
-- prijs in andere woorden stonden daardoor allebei op de kaart. Bij de rijschool
-- werd dat "De beschikbare informatie over de intakeprijs spreekt elkaar tegen"
-- (een intake op kantoor van € 50 en een in de auto van € 80, geen echte
-- tegenspraak). Om conflicten op de INHOUD te vinden, heeft elk feit een soort
-- en een genormaliseerde waarde nodig; om ze tegen te houden, een lijst die de
-- adviseur afhandelt.
--
-- Additief en idempotent (conventie 4): alleen `add column if not exists` en
-- `create ... if not exists`. De `drop policy if exists` is de bestaande vorm om
-- een policy te kunnen herhalen (zie 0038), geen verwijdering van data.

-- ── 1. Soort, waarde, geldigheid, stand en bewijskracht per feit ───────────────
alter table public.brand_facts
  -- prijs, termijn, plaats, werkgebied, dienst, product, certificering, garantie,
  -- werkwijze, cijfer, openingstijd, contact, overig. NULL = nog niet ingedeeld.
  add column if not exists soort text,
  -- Genormaliseerd: {"min": 2200, "max": 3200, "eenheid": "EUR"} of
  -- {"tekst": "Eindhoven, Helmond, Best"}. NULL = onbekend (conventie 3): een
  -- getal dat niet letterlijk in de feittekst staat, wordt nooit opgeslagen.
  add column if not exists waarde jsonb,
  -- Waarvoor het feit geldt: een dienst ("intake op kantoor"), een plaats, of
  -- NULL voor het hele merk.
  add column if not exists geldt_voor text,
  -- bevestigd (klant), site, onderzoek, betwist, vervangen. Een betwist feit
  -- gaat niet mee in een paginastrategie tot het conflict is opgelost.
  add column if not exists stand text,
  -- geen, gewoon, sterk. "35 jaar ervaring" en "1.800 onderhoudscontracten" zijn sterk.
  add column if not exists bewijskracht text,
  -- Wanneer L1 het feit indeelde. Conventie 9: een ingedeeld feit gaat niet
  -- opnieuw naar het model.
  add column if not exists ingedeeld_at timestamptz;

do $$ begin
  alter table public.brand_facts add constraint brand_facts_soort_check check (
    soort is null or soort in ('prijs', 'termijn', 'plaats', 'werkgebied', 'dienst', 'product',
      'certificering', 'garantie', 'werkwijze', 'cijfer', 'openingstijd', 'contact', 'overig'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.brand_facts add constraint brand_facts_stand_check check (
    stand is null or stand in ('bevestigd', 'site', 'onderzoek', 'betwist', 'vervangen'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.brand_facts add constraint brand_facts_bewijskracht_check check (
    bewijskracht is null or bewijskracht in ('geen', 'gewoon', 'sterk'));
exception when duplicate_object then null; end $$;

-- De feiten die nog ingedeeld moeten worden, per merk snel te vinden.
create index if not exists brand_facts_nog_indelen_idx
  on public.brand_facts (profile_id)
  where ingedeeld_at is null and superseded_by is null;

-- ── 2. De conflictlijst ───────────────────────────────────────────────────────
--
-- Eén rij per BEOORDEELD paar, ook als L2 zei dat het geen conflict is: dan
-- staat `echt_conflict` op false en wordt het paar niet opnieuw betaald
-- (conventie 9). Het paar is gesleuteld op de twee `fact_key`s en niet op de ids:
-- komt een vervangen feit bij een volgende crawl als nieuwe rij terug, dan
-- herkent de sleutel het besluit van de adviseur en wordt het opnieuw
-- toegepast in plaats van opnieuw gevraagd.
create table if not exists public.fact_conflicts (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  -- De twee feiten zoals ze bij de beoordeling in de bank stonden.
  feit_ids         uuid[] not null,
  -- De twee `fact_key`s, gesorteerd en met '|' verbonden.
  paar_sleutel     text not null,
  soort            text not null,
  -- Het oordeel van L2.
  echt_conflict    boolean not null,
  -- blokkerend of waarschuwing (§8.2): of dit soort conflict een pagina kan tegenhouden.
  ernst            text not null default 'waarschuwing',
  -- Eén zin voor de adviseur, en welk feit volgens L2 waarschijnlijk klopt.
  -- Nooit automatisch toegepast.
  uitleg           text,
  voorstel         text,
  voorstel_feit_id uuid references public.brand_facts (id) on delete set null,
  -- open, opgelost, gevraagd (vraag aan de ondernemer uitgezet), geen_conflict.
  status           text not null default 'open',
  -- Het feit dat geldt, en hoe het besluit viel.
  gekozen_feit_id  uuid references public.brand_facts (id) on delete set null,
  -- adviseur, automatisch (klant vóór site), of vraag
  oplossing        text,
  opgelost_door    uuid references auth.users (id) on delete set null,
  opgelost_op      timestamptz,
  -- De vraag aan de ondernemer, als de adviseur die koos.
  fact_request_id  uuid references public.fact_requests (id) on delete set null,
  -- Het volledige oordeel van L2 (conventie 8).
  oordeel_json     jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

do $$ begin
  alter table public.fact_conflicts add constraint fact_conflicts_status_check
    check (status in ('open', 'opgelost', 'gevraagd', 'geen_conflict'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.fact_conflicts add constraint fact_conflicts_ernst_check
    check (ernst in ('blokkerend', 'waarschuwing'));
exception when duplicate_object then null; end $$;

create unique index if not exists fact_conflicts_paar_idx
  on public.fact_conflicts (profile_id, paar_sleutel);

create index if not exists fact_conflicts_open_idx
  on public.fact_conflicts (profile_id) where status in ('open', 'gevraagd');

-- ── 3. Alleen medewerkers (§8.3: de klant ziet het conflictscherm niet) ───────
--
-- Lezen alleen voor medewerkers; schrijven loopt uitsluitend via de API-route
-- met de service-role key (conventie 6), dus er is geen schrijfpolicy.
alter table public.fact_conflicts enable row level security;

drop policy if exists "fact_conflicts_select_staff" on public.fact_conflicts;
create policy "fact_conflicts_select_staff"
  on public.fact_conflicts for select to authenticated
  using (public.is_staff());

comment on table public.fact_conflicts is
  'Beoordeelde paren feiten van dezelfde soort met een andere waarde (WP2 van '
  'contentpijplijn-publicatiewaardig.md). Alleen voor medewerkers.';
