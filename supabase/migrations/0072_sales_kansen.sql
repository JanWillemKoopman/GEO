-- ═══════════════════════════════════════════════════════════════════════════
-- 0072 · De Sales-module, sprint 4: opportunities, score en bewijs
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT DIT TOEVOEGT
--
-- Twee tabellen: `sales_opportunities` (de kans zelf) en `sales_evidence` (de
-- vragen en antwoorden die haar dragen). Het ontwerp staat in
-- `docs/tasks/geo-prospect-engine.md` §7.3 en hoofdstuk 12 tot en met 15.
--
-- ⚠️ WAAROM `sales_evidence` EEN EIGEN TABEL IS EN GEEN JSONB-VELD
--
-- Plan §7.3, laatste regel: "zodat doorklikken een join is en geen zoektocht
-- door een jsonb-veld". Dat klinkt als een implementatiedetail en het is de
-- kern van hoofdstuk 15. Een salesmedewerker die op "Concurrent Y wordt vaker
-- genoemd" klikt, moet uitkomen bij de vraag, het volledige antwoord, wie er
-- genoemd is, welke bronnen de AI aanhaalde, welke engine het was en de
-- meetdatum. Dat is wat een verkoper nodig heeft op het moment dat een prospect
-- zegt "dat kan niet kloppen". Met alleen een jsonb-veld is dat een zoektocht
-- per klik, en dan wordt het niet gebouwd en dus niet gebruikt.
--
-- ⚠️ EN WAAROM `score_breakdown` VERPLICHT MEEGAAT
--
-- Plan hoofdstuk 19: "Elke opportunity bewaart zijn volledige score_breakdown,
-- niet alleen het eindcijfer. Zonder de componenten is achteraf niet te
-- achterhalen welk signaal voorspelde." Dat is de voorwaarde onder de leerlus:
-- later kan er een Sales Opportunity Score naast komen die op conversiedata
-- gewogen is in plaats van op ons vermoeden. Dat hoeft nu niet gebouwd te
-- worden, het mag alleen niet onmogelijk gemaakt worden.
--
-- Additief en idempotent (conventie 4), geen enkele `drop table` of
-- `drop column`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. De opportunity ──────────────────────────────────────────────────────
create table if not exists public.sales_opportunities (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references public.sales_runs (id) on delete cascade,
  market_id      uuid not null references public.sales_markets (id) on delete cascade,
  company_id     uuid not null references public.sales_companies (id) on delete cascade,
  -- Het PRIMAIRE type, dat de haak bepaalt (plan 12.1). De andere types die dit
  -- bedrijf ook raakte staan in `alle_types`: ze gaan niet verloren, maar ze
  -- bepalen niets.
  type           text not null,
  alle_types     text[] not null default '{}',
  score          integer not null default 0,
  -- Elke component apart. Zie de kop van dit bestand: zonder dit veld is de
  -- leerlus uit hoofdstuk 19 later niet meer te bouwen.
  score_breakdown jsonb not null default '{}'::jsonb,
  tier           text not null default 'laag',
  -- Afgeleid uit bewijsomvang en marges, en getoond zodra hij laag is (plan
  -- 13.2, derde punt). Onbekend is een betere waarde dan een verkeerde.
  confidence     text not null default 'middel',
  -- De zakelijke uitleg, drie tot vijf zinnen. Geschreven door het model, maar
  -- op een conclusie die de code al had bepaald.
  why_text       text,
  hook_type      text,
  hook_text      text,
  -- ⚠️ Uit het model of uit het sjabloon? Zonder dit veld is niet te zien hoe
  -- vaak het model getallen verzint, en dan is de kwaliteit van de haken alleen
  -- te achterhalen door ze allemaal na te lezen (plan hoofdstuk 14).
  hook_source    text,
  -- De concurrent die het verschil maakt (plan type 2). Eén, de sterkste, en
  -- geen lijstje: "je concurrent" is abstract, een naam is een gesprek.
  rival_company_id uuid references public.sales_companies (id) on delete set null,
  top_intent_labels text[] not null default '{}',
  -- De volledige cijfers waar deze kans op rust. Náást `sales_evidence`, want
  -- dit zijn de getallen en dat zijn de vindplaatsen (conventie 8).
  evidence       jsonb not null default '{}'::jsonb,
  -- Wijst naar de opportunity uit een latere ronde die deze vervangt. Zo blijft
  -- de geschiedenis staan zonder dat een verkoper een verouderde kans oppakt.
  superseded_by  uuid references public.sales_opportunities (id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table public.sales_opportunities
  drop constraint if exists sales_opportunities_type_check;
alter table public.sales_opportunities
  add constraint sales_opportunities_type_check check (
    type in (
      'onzichtbaar', 'concurrent_gap', 'intent_gap', 'engine_gap',
      'information_gap', 'source_gap', 'sterk_met_zwakke_plek', 'verlies'
    )
  );

alter table public.sales_opportunities
  drop constraint if exists sales_opportunities_tier_check;
alter table public.sales_opportunities
  add constraint sales_opportunities_tier_check check (
    tier in ('hoog', 'gemiddeld', 'laag')
  );

alter table public.sales_opportunities
  drop constraint if exists sales_opportunities_confidence_check;
alter table public.sales_opportunities
  add constraint sales_opportunities_confidence_check check (
    confidence in ('hoog', 'middel', 'laag')
  );

alter table public.sales_opportunities
  drop constraint if exists sales_opportunities_score_check;
alter table public.sales_opportunities
  add constraint sales_opportunities_score_check check (score between 0 and 100);

-- Eén kans per bedrijf per ronde. Twee kansen voor hetzelfde bedrijf in dezelfde
-- meting zouden twee mails opleveren over hetzelfde onderwerp.
create unique index if not exists sales_opportunities_run_company_key
  on public.sales_opportunities (run_id, company_id);

-- Het Opportunities-scherm: de kansen van een markt, aflopend op score.
create index if not exists sales_opportunities_markt_idx
  on public.sales_opportunities (market_id, score desc)
  where superseded_by is null;

comment on table public.sales_opportunities is
  'Een gekwalificeerde saleskans: welk soort kans, hoe interessant, waarom, en '
  'met welk bewijs (plan 7.3). Het PRODUCT van deze module, en geen ranglijst.';
comment on column public.sales_opportunities.score_breakdown is
  'Elke component van de score apart (plan hoofdstuk 19). Zonder dit veld is '
  'achteraf niet te achterhalen welk signaal voorspelde, en bestaat de leerlus niet.';
comment on column public.sales_opportunities.hook_source is
  'Uit het model of uit het sjabloon (plan hoofdstuk 14). Meet hoe vaak het '
  'model getallen verzint die de controle niet halen.';

-- ── 2. Het bewijs ──────────────────────────────────────────────────────────
--
-- Geen bewijs is geen claim, en die regel is absoluut (plan hoofdstuk 15).
create table if not exists public.sales_evidence (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.sales_opportunities (id) on delete cascade,
  question_id    uuid references public.sales_questions (id) on delete cascade,
  answer_id      uuid references public.sales_answers (id) on delete cascade,
  -- Waarvoor dit stuk bewijs dient: `eigen` (hier staat het bedrijf), `rivaal`
  -- (hier staat de concurrent wel en het bedrijf niet), `bron` (hier komt het
  -- brondomein vandaan).
  kind           text not null default 'eigen',
  note           text,
  created_at     timestamptz not null default now()
);

alter table public.sales_evidence
  drop constraint if exists sales_evidence_kind_check;
alter table public.sales_evidence
  add constraint sales_evidence_kind_check check (
    kind in ('eigen', 'rivaal', 'bron', 'vorige_ronde')
  );

-- Dezelfde vraag twee keer als bewijs bij dezelfde kans zegt niets extra.
create unique index if not exists sales_evidence_key
  on public.sales_evidence (opportunity_id, coalesce(question_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(answer_id, '00000000-0000-0000-0000-000000000000'::uuid), kind);

create index if not exists sales_evidence_opportunity_idx
  on public.sales_evidence (opportunity_id);

comment on table public.sales_evidence is
  'De vragen en antwoorden die een opportunity dragen (plan 7.3 en hoofdstuk 15). '
  'Een eigen tabel zodat doorklikken een join is en geen zoektocht door jsonb.';

-- ── 3. RLS: select-only, alleen voor sales ─────────────────────────────────
alter table public.sales_opportunities enable row level security;
drop policy if exists sales_opportunities_select_sales on public.sales_opportunities;
create policy sales_opportunities_select_sales on public.sales_opportunities
  for select to authenticated using (public.is_sales());

alter table public.sales_evidence enable row level security;
drop policy if exists sales_evidence_select_sales on public.sales_evidence;
create policy sales_evidence_select_sales on public.sales_evidence
  for select to authenticated using (public.is_sales());
