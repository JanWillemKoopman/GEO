-- 0118: kansen als eigen object (docs/tasks/van-pijplijn-naar-kennissysteem.md, N1, §6.2)
--
-- Waarom. Een kans staat vandaag op drie plekken en in drie vormen: als JSON in
-- `reports.recommendations_json`, als kopie in `planned_pages` (`source_ref`,
-- `why`, `target_intent`, `potential`), en alleen voor het scherm in
-- `lib/opportunities.ts`, waar de bron `zoekverkeer` uit Search Console naast de
-- meting wordt gezet zonder dat die twee ooit aan elkaar hangen. Een kans met
-- bewijs uit twee bronnen bestaat daardoor nergens als één ding.
--
-- Deze migratie maakt alleen de twee tabellen. Niemand schrijft er nog in (dat is
-- N2 voor het rapport, N3 voor Search Console, N5 voor de consultant), niemand
-- leest eruit (N7). De volgorde en de uitleg rekent `lib/kansen/prioriteit.ts`
-- uit, in code en nooit door een model (§4, P4).
--
-- Additief en idempotent (conventie 4): `create ... if not exists`, en een
-- check-constraint in een `do`-blok dat een bestaande laat staan. De `drop policy
-- if exists` is de bestaande vorm om een policy te kunnen herhalen (zie 0116),
-- geen verwijdering van data.

create table if not exists public.kansen (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles (id) on delete cascade,
  -- Het gemeten cluster, als dat er is. In deze database is een cluster een
  -- analyse (zoals `klantkennis.analysis_id`, besluit V13). Een handmatige kans
  -- van de consultant heeft er geen (besluit V2). SET NULL en niet CASCADE: een
  -- gearchiveerd cluster maakt een kans niet ongedaan, wel ongemeten.
  analysis_id         uuid references public.analyses (id) on delete set null,

  -- Wat, en voor wie in één zin (het huidige `targetIntent`).
  titel               text not null,
  lezer               text,

  -- nieuwe_pagina of pagina_verbeteren. Verbeteren eist het adres.
  handeling           text not null,
  bestaande_url       text,

  -- Verwijzingen naar kennisitems: deze dienst, deze regio, deze doelgroep. Een
  -- array kan geen foreign key dragen; wie schrijft, controleert dat ze bij
  -- hetzelfde merk horen (zoals `klantkennis.geldt_voor`).
  geldt_voor          uuid[] not null default '{}',

  -- voorrang, gewoon, minder: uit de commerciële prioriteiten van het merk
  -- (`priority_offerings` en `deprioritised_offerings`, straks de kennislaag).
  -- NULL = niet bekend, en dat is iets anders dan gewoon (conventie 3).
  commerciele_waarde  text,
  -- De potentiescore, 0 tot 100 (`lib/potential.ts`). NULL = niet berekend.
  potentie            numeric,

  -- Het kennisgat (N6). NULL = nog niet uitgerekend; een lege lijst = er
  -- ontbreekt niets. Dat verschil is de hele reden dat er geen default staat.
  kennis_bekend       uuid[],
  kennis_ontbreekt    text[],

  status              text not null default 'open',
  -- De zin die de kans onderbouwt. Opgebouwd in code uit het bewijs
  -- (`uitlegVan()` in `lib/kansen/prioriteit.ts`), nooit door een model.
  uitleg              text,

  -- Waar de kans vandaan kwam: het rapport, of de consultant.
  rapport_id          uuid references public.reports (id) on delete set null,
  vastgelegd_door     uuid references auth.users (id) on delete set null,
  vastgelegd_door_taak text,
  -- Ontdubbelsleutel: hetzelfde rapport twee keer verwerken geeft één kans (N2
  -- vult hem). Per merk één levende kans per sleutel.
  sleutel             text,
  -- Wat de bron letterlijk opleverde, bijvoorbeeld de aanbeveling uit het
  -- rapport (conventie 8).
  ruw                 jsonb,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

do $$ begin
  alter table public.kansen add constraint kansen_handeling_check check (
    handeling in ('nieuwe_pagina', 'pagina_verbeteren'));
exception when duplicate_object then null; end $$;

-- Een bestaande pagina verbeteren zonder te weten welke, kan niet.
do $$ begin
  alter table public.kansen add constraint kansen_verbeteren_url_check check (
    handeling <> 'pagina_verbeteren' or coalesce(btrim(bestaande_url), '') <> '');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.kansen add constraint kansen_commerciele_waarde_check check (
    commerciele_waarde is null or commerciele_waarde in ('voorrang', 'gewoon', 'minder'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.kansen add constraint kansen_potentie_check check (
    potentie is null or (potentie >= 0 and potentie <= 100));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.kansen add constraint kansen_status_check check (
    status in ('open', 'ingepland', 'in_voorbereiding', 'geschreven', 'gepubliceerd', 'vervallen', 'te_herzien'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.kansen add constraint kansen_titel_check check (btrim(titel) <> '');
exception when duplicate_object then null; end $$;

-- Iemand of iets heeft de kans gemaakt.
do $$ begin
  alter table public.kansen add constraint kansen_vastgelegd_check check (
    vastgelegd_door is not null or coalesce(btrim(vastgelegd_door_taak), '') <> '');
exception when duplicate_object then null; end $$;

create index if not exists kansen_profiel_idx on public.kansen (profile_id, status);

create unique index if not exists kansen_sleutel_idx
  on public.kansen (profile_id, sleutel)
  where sleutel is not null and status <> 'vervallen';

-- ── Het bewijs, één rij per bron per kans ─────────────────────────────────────
--
-- Getypte kolommen en geen losse JSON: een leeg veld betekent "geen gegevens"
-- (conventie 3, P7), en dat moet te onderscheiden zijn van een gemeten nul.
-- Welke kolommen bij welke bron horen, staat in `lib/kansen/prioriteit.ts`.
create table if not exists public.kans_bewijs (
  id                    uuid primary key default gen_random_uuid(),
  kans_id               uuid not null references public.kansen (id) on delete cascade,
  -- Dubbel met de kans, zodat de leesregel geen join nodig heeft.
  profile_id            uuid not null references public.profiles (id) on delete cascade,

  -- consultant, chatgpt, ai_overview, gemini, search_console, structuur
  bron                  text not null,

  -- ChatGPT, AI Overview, Gemini: hoeveel doelvragen gemeten, en bij hoeveel het
  -- merk genoemd werd. Welke concurrenten wel genoemd werden.
  vragen_gemeten        integer,
  vragen_genoemd        integer,
  concurrenten          text[],
  -- AI Overview: citeert Google de eigen site bij deze vragen? NULL = niet bekend.
  eigen_site_geciteerd  boolean,
  -- De meting waar het uit komt.
  run_ids               uuid[],

  -- Search Console: vertoningen, klikken en gemiddelde positie over een periode.
  vertoningen           integer,
  klikken               integer,
  positie               numeric,
  periode_dagen         integer,
  zoekopdrachten        text[],

  -- Consultant en structuur: waarom, in gewone taal ("dienst zonder pagina").
  toelichting           text,

  rapport_id            uuid references public.reports (id) on delete set null,
  gemeten_op            timestamptz,
  ruw                   jsonb,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

do $$ begin
  alter table public.kans_bewijs add constraint kans_bewijs_bron_check check (
    bron in ('consultant', 'chatgpt', 'ai_overview', 'gemini', 'search_console', 'structuur'));
exception when duplicate_object then null; end $$;

-- Genoemd bij meer vragen dan er gemeten zijn, kan niet.
do $$ begin
  alter table public.kans_bewijs add constraint kans_bewijs_vragen_check check (
    (vragen_gemeten is null or vragen_gemeten >= 0)
    and (vragen_genoemd is null or (vragen_genoemd >= 0 and vragen_gemeten is not null and vragen_genoemd <= vragen_gemeten)));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.kans_bewijs add constraint kans_bewijs_zoekverkeer_check check (
    (vertoningen is null or vertoningen >= 0)
    and (klikken is null or klikken >= 0)
    and (periode_dagen is null or periode_dagen > 0));
exception when duplicate_object then null; end $$;

create unique index if not exists kans_bewijs_bron_idx on public.kans_bewijs (kans_id, bron);
create index if not exists kans_bewijs_profiel_idx on public.kans_bewijs (profile_id);

-- ── Wie leest ─────────────────────────────────────────────────────────────────
--
-- Anders dan de kennislaag (V11) is een kans voor de klant bedoeld: het
-- kansenscherm (N7) wordt met een klantlogin beoordeeld (§11 risico 9). Dus
-- dezelfde leesregel als het contentplan (0049). Schrijven alleen met de
-- service-role key (conventie 6), dus geen schrijfpolicy.
alter table public.kansen enable row level security;
alter table public.kans_bewijs enable row level security;

drop policy if exists "kansen_select" on public.kansen;
create policy "kansen_select"
  on public.kansen for select
  using (profile_id in (select public.readable_profile_ids()));

drop policy if exists "kans_bewijs_select" on public.kans_bewijs;
create policy "kans_bewijs_select"
  on public.kans_bewijs for select
  using (profile_id in (select public.readable_profile_ids()));

comment on table public.kansen is
  'Eén kans per te nemen actie op een klantbehoefte, ongeacht de bron (N1 van '
  'van-pijplijn-naar-kennissysteem.md). Volgorde en uitleg: lib/kansen/prioriteit.ts.';
comment on table public.kans_bewijs is
  'Het bewijs voor een kans, één rij per bron. Leeg is geen gegevens, niet nul.';
