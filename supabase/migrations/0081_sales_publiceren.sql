-- ═══════════════════════════════════════════════════════════════════════════
-- 0081 · De Sales-module, sprint 6 en 7: publiceren en hermeten
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT DIT TOEVOEGT
--
-- Eén tabel (`sales_market_reports`), vier kolommen op de markt, en één op het
-- bedrijf. Het ontwerp staat in `docs/tasks/geo-prospect-engine.md` hoofdstuk 20
-- (het publieke rapport) en hoofdstuk 22, sprint 7 (hermeten).
--
-- ⚠️ HET RAPPORT IS BEWIJS EN GEEN PRODUCT
--
-- Plan hoofdstuk 20: "Het publieke rapport blijft bestaan, maar het is niet
-- langer de sales-interface." De prospect komt binnen via een mail die al
-- vertelt wat er aan de hand is; het rapport is de controle, niet de
-- introductie. Vandaar dat `is_public` standaard uit staat, publiceren een
-- expliciete handeling van een sales admin is, en intrekken altijd kan.
--
-- ⚠️ EN WAAROM HET RAPPORT EEN EIGEN TABEL IS EN GEEN KOLOM OP DE MARKT
--
-- Een markt wordt herhaald gemeten, en elke ronde heeft zijn eigen cijfers. Een
-- rapport dat op de markt staat, wordt bij ronde twee overschreven, en dan
-- verwijst elke verkoopmail die naar dat adres verwees naar andere cijfers dan
-- er in de mail stonden. Dat is precies het soort stille fout waar hoofdstuk 15
-- voor waarschuwt: een prospect die het naleest, ziet iets anders dan wat hem
-- geschreven is.
--
-- ⚠️ VERWIJDEREN GAAT VOOR (plan hoofdstuk 20, laatste alinea)
--
-- "Een bedrijf dat vraagt om verwijdering wordt verwijderd, zonder discussie, en
-- krijgt tegelijk `do_not_contact`." Vandaar `hidden_from_report` op het bedrijf:
-- het blijft in de meting staan (anders komt het bij de volgende ronde gewoon
-- weer boven), maar het verschijnt nooit meer op een publieke pagina.
--
-- Additief en idempotent (conventie 4), geen enkele `drop table` of
-- `drop column`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Het publieke rapport, per ronde ─────────────────────────────────────
create table if not exists public.sales_market_reports (
  id           uuid primary key default gen_random_uuid(),
  market_id    uuid not null references public.sales_markets (id) on delete cascade,
  run_id       uuid not null references public.sales_runs (id) on delete cascade,
  -- De leesbare tekst: intro, wat er gemeten is, wat eruit kwam, en de
  -- verantwoording. Geschreven door het model op cijfers die al vastlagen.
  intro        text,
  methode      text,
  bevindingen  text,
  -- De cijfers waar de tekst op rust, bevroren op publicatiemoment. Zonder dit
  -- veld is een gepubliceerde pagina niet meer na te rekenen zodra de volgende
  -- ronde de scores overschrijft.
  cijfers      jsonb not null default '{}'::jsonb,
  -- Uit het model of uit het sjabloon, net als bij de haak. Meet hoe vaak de
  -- getallencontrole aanslaat.
  bron         text not null default 'sjabloon',
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Eén rapport per ronde. Twee rapporten over dezelfde meting zouden twee
-- verschillende versies van dezelfde cijfers zijn.
create unique index if not exists sales_market_reports_run_key
  on public.sales_market_reports (run_id);

create index if not exists sales_market_reports_markt_idx
  on public.sales_market_reports (market_id, created_at desc);

comment on table public.sales_market_reports is
  'Het publieke marktrapport per MEETRONDE (plan hoofdstuk 20). Per ronde, want '
  'een rapport dat bij een hermeting overschreven wordt, laat een prospect andere '
  'cijfers zien dan er in zijn mail stonden.';

-- ── 2. De markt weet wanneer hij publiek werd ──────────────────────────────
alter table public.sales_markets
  add column if not exists published_at timestamptz;
alter table public.sales_markets
  add column if not exists unpublished_at timestamptz;
alter table public.sales_markets
  add column if not exists published_by uuid references auth.users (id);
-- Welke ronde er op de publieke pagina staat. Bij een hermeting verschuift dit
-- pas als iemand de nieuwe ronde bewust publiceert: een pagina die vanzelf
-- meebeweegt met de laatste meting, verandert onder een lopende mailcampagne.
alter table public.sales_markets
  add column if not exists published_run_id uuid references public.sales_runs (id) on delete set null;

comment on column public.sales_markets.published_run_id is
  'Welke meetronde er publiek staat (migratie 0081). Verschuift alleen als iemand '
  'de nieuwe ronde bewust publiceert, zodat een lopende mailcampagne blijft kloppen.';

-- ── 3. Verwijderen gaat voor ───────────────────────────────────────────────
alter table public.sales_companies
  add column if not exists hidden_from_report boolean not null default false;
alter table public.sales_companies
  add column if not exists hidden_reason text;

comment on column public.sales_companies.hidden_from_report is
  'Op verzoek verwijderd van elke publieke pagina (plan hoofdstuk 20). Het bedrijf '
  'blijft in de meting staan, anders komt het bij de volgende ronde gewoon weer boven.';

-- ── 4. RLS: het rapport is select-only voor sales ──────────────────────────
--
-- ⚠️ De PUBLIEKE pagina leest niet via RLS maar via de service-role key op de
-- server, met een expliciete controle op `is_public` en `published_run_id`. Dat
-- is bewust: een anonieme selectpolicy op deze tabel zou betekenen dat élk
-- rapport leesbaar is zodra iemand het adres raadt, ook een rapport dat nog niet
-- gepubliceerd is of net is ingetrokken.
alter table public.sales_market_reports enable row level security;
drop policy if exists sales_market_reports_select_sales on public.sales_market_reports;
create policy sales_market_reports_select_sales on public.sales_market_reports
  for select to authenticated using (public.is_sales());
