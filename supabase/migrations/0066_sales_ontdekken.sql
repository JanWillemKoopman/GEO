-- ═══════════════════════════════════════════════════════════════════════════
-- 0066 · De Sales-module, sprint 2: de markt ontdekken en uitsluiten wie er
--        niet in hoort
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT DIT TOEVOEGT
--
-- Eén tabel, één kolom op `ai_calls`, en acht kolommen verspreid over de drie
-- tabellen uit `0065`. Het ontwerp staat in `docs/tasks/geo-prospect-engine.md`
-- hoofdstuk 9 (ontdekken, ontdubbelen, uitsluiten) en §7.1b.
--
-- ⚠️ WAAROM DEZE MIGRATIE BESTAAT, TERWIJL HET PLAN SPRINT 1 EN 2 HETZELFDE
-- NUMMER GAF
--
-- Zodra `0065` op productie heeft gedraaid, ligt hij vast: er staan rijen in en
-- een migratie herschrijven zou betekenen dat de database en het bestand niet
-- meer hetzelfde zeggen. Sprint 2 krijgt daarom een eigen nummer, en de
-- migraties erna schuiven één op. Dat staat ook in §7 van het plan.
--
-- ⚠️ EN WAAROM `sales_suppressions` HIER STAAT EN NIET IN SPRINT 5
--
-- Het plan zette hem in de migratie van sprint 5, bij de outreach. Dat is drie
-- sprints te laat, en het plan spreekt zichzelf daarin tegen: 9.5 zegt dat de
-- controle gebeurt "voordat er een opportunity zichtbaar wordt, niet pas bij het
-- versturen". Dat is precies deze sprint. Zou hij later komen, dan zou de eerste
-- marktronde een bedrijvenlijst opleveren waar bestaande klanten in staan, en
-- dat is de pijnlijkste fout die deze module kan maken.
--
-- Additief en idempotent (conventie 4), geen enkele `drop table` of
-- `drop column`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Wie er nooit in een prospectlijst mag staan ─────────────────────────
--
-- Vier soorten (plan 9.5). De eerste drie ontstaan bij elke ronde opnieuw, want
-- een markt waar vandaag geen klant zit kan er over drie maanden wel een hebben.
-- De vierde, `do_not_contact`, is permanent en staat óók als vlag op het bedrijf
-- zelf; deze tabel legt daarnaast vast wannéér en waarom.
--
-- ⚠️ Een uitgesloten bedrijf VERDWIJNT NIET uit het systeem (9.5, laatste alinea).
-- Het blijft in de markt staan met de reden erbij. Zou het weggegooid worden,
-- dan komt het bij de volgende meetronde gewoon weer boven als nieuwe kans.
create table if not exists public.sales_suppressions (
  id                 uuid primary key default gen_random_uuid(),
  -- Precies één van deze twee is gevuld. Een uitsluiting geldt óf voor één
  -- bedrijf (dit bedrijf nooit), óf voor een hele markt (hier zit een klant van
  -- ons, wees voorzichtig). De check-constraint hieronder dwingt dat af, want
  -- een rij met allebei leeg sluit niets uit en zou stil niets doen.
  company_id         uuid references public.sales_companies (id) on delete cascade,
  market_id          uuid references public.sales_markets (id) on delete cascade,
  kind               text not null,
  reason             text not null,
  -- Naar welk merk in de klantomgeving dit wijst. De ENIGE verwijzing van de
  -- Sales-module naar `profiles`, en hij gaat maar één kant op: Sales leest wie
  -- er klant is om die eruit te houden. Er wordt niets in de klantomgeving
  -- geschreven en er komt niets uit deze tabel op een klantscherm.
  related_profile_id uuid references public.profiles (id) on delete set null,
  -- Leeg = permanent. Gevuld = opnieuw beoordelen na deze datum.
  expires_at         timestamptz,
  created_at         timestamptz not null default now()
);

alter table public.sales_suppressions
  drop constraint if exists sales_suppressions_kind_check;
alter table public.sales_suppressions
  add constraint sales_suppressions_kind_check check (
    kind in ('klant', 'lopend_traject', 'concurrent_van_klant', 'do_not_contact')
  );

-- Een uitsluiting die nergens op slaat, sluit niets uit.
alter table public.sales_suppressions
  drop constraint if exists sales_suppressions_doel_check;
alter table public.sales_suppressions
  add constraint sales_suppressions_doel_check check (
    company_id is not null or market_id is not null
  );

-- Dezelfde uitsluiting twee keer vastleggen levert dubbele waarschuwingen op
-- hetzelfde scherm op. Twee indexen, want een gedeeltelijke unieke index kan
-- niet over twee kolommen tegelijk die allebei leeg mogen zijn.
create unique index if not exists sales_suppressions_bedrijf_uniek
  on public.sales_suppressions (company_id, kind)
  where company_id is not null;
create unique index if not exists sales_suppressions_markt_uniek
  on public.sales_suppressions (market_id, kind)
  where market_id is not null and company_id is null;

comment on table public.sales_suppressions is
  'Wie er nooit in een prospectlijst mag staan (plan 9.5). Bij elke ronde opnieuw '
  'geevalueerd, want een markt zonder klant kan er over drie maanden een hebben.';

-- ── 2. Kosten per markt ────────────────────────────────────────────────────
--
-- Zonder deze kolom is niet te tellen wat één markt heeft gekost, en dan is het
-- plafond van 10 euro per markt (plan 21.3) niet af te dwingen. Exact dezelfde
-- onderbouwing als `reputation_run_id` in migratie 0062 en `account_id` in 0053:
-- een logboek hoort de dimensie te dragen waarop je afrekent.
alter table public.ai_calls
  add column if not exists sales_market_id uuid references public.sales_markets (id) on delete set null;

create index if not exists ai_calls_sales_market_idx
  on public.ai_calls (sales_market_id)
  where sales_market_id is not null;

comment on column public.ai_calls.sales_market_id is
  'Bij welke marktanalyse hoort deze aanroep. Draagt het plafond van 10 euro per '
  'markt uit lib/sales/budget.ts.';

-- ── 3. Wat de markt onderweg vastlegt ──────────────────────────────────────
alter table public.sales_markets
  -- Wanneer de bedrijvenlijst compleet was. Los van `created_at`, want daar kan
  -- weken tussen zitten.
  add column if not exists discovered_at timestamptz,
  -- Poort 1: wie keurde de lijst goed, en wanneer. Zonder deze twee is achteraf
  -- niet te zeggen of er iemand naar gekeken heeft vóór er gemeten werd, en dat
  -- is precies wat de poort moet bewijzen.
  add column if not exists approved_at   timestamptz,
  add column if not exists approved_by   uuid references auth.users (id),
  -- Wat er misging, in gewone taal. Een markt op 'mislukt' zonder reden is een
  -- doodlopende weg voor degene die hem moet repareren (K2).
  add column if not exists failure_reason text,
  -- ⚠️ Zit er een klant van ons in deze markt? Dan werkt de verkoper in gevoelig
  -- gebied (plan 9.5, derde uitsluiting). Deze notitie verschijnt bij de markt en
  -- straks bij elke opportunity erin. Hij vervangt de uitsluitingen niet, hij
  -- maakt ze leesbaar.
  add column if not exists conflict_note text,
  -- ⚠️ De volledige ruwe uitvoer van de ontdekkingsaanroep (conventie 8: alles
  -- bewaren). Twee redenen, en de tweede is de praktische.
  --
  -- Ten eerste de audit: maanden later moet te zien zijn waaróp de bedrijvenlijst
  -- van deze markt gebaseerd was, inclusief de bedrijven die er bij poort 1 zijn
  -- uitgehaald. Ten tweede is dit de overdracht tussen twee taken: de dure
  -- aanroep staat in `sales_market_discover` en het uitlezen van de bronpagina's
  -- in `sales_market_verify`, want samen passen ze niet in één werker-aanroep.
  -- Zonder deze kolom zou een mislukte tweede stap de eerste opnieuw laten
  -- betalen.
  add column if not exists discovery_json jsonb,
  -- Wat het onderzoek zelf niet zeker wist, in gewone taal. Staat bij poort 1 op
  -- het scherm: een lijst van dertig bedrijven waarvan er acht twijfelachtig zijn,
  -- is iets anders dan een lijst van dertig zekere.
  add column if not exists discovery_note text;

comment on column public.sales_markets.approved_at is
  'Poort 1 (plan 8.1): wanneer de admin de bedrijvenlijst goedkeurde. Leeg = er '
  'is nog niet naar gekeken, en dan mag er niet gemeten worden.';
comment on column public.sales_markets.conflict_note is
  'Zit er een klant van ons in deze markt? Dan staat hier de waarschuwing die de '
  'verkoper te zien krijgt (plan 9.5).';

-- ── 4. Wat de crawl per bedrijf oplevert ───────────────────────────────────
alter table public.sales_companies
  -- `open`, `gelukt`, `niet_gelukt`, `geen_website`. Vier standen en geen
  -- boolean: "we hebben het niet geprobeerd", "het lukte niet" en "er is niets om
  -- te proberen" zijn drie verschillende dingen, en alleen de tweede is een
  -- probleem dat iemand moet oplossen (conventie 3).
  add column if not exists crawl_status text not null default 'open',
  add column if not exists crawl_error  text,
  -- Waar de naam vandaan komt: `bronpagina`, `ai`, `crawl` of `domein`. Bij poort
  -- 1 is dat het verschil tussen een naam die iemand ergens heeft opgeschreven en
  -- een naam die wij uit het webadres hebben afgeleid.
  add column if not exists name_source text;

alter table public.sales_companies
  drop constraint if exists sales_companies_crawl_status_check;
alter table public.sales_companies
  add constraint sales_companies_crawl_status_check check (
    crawl_status in ('open', 'gelukt', 'niet_gelukt', 'geen_website')
  );

comment on column public.sales_companies.crawl_status is
  'Vier standen. "niet_gelukt" is een probleem, "geen_website" is een bevinding: '
  'een bedrijf zonder site is juist een interessante prospect (plan hoofdstuk 9).';

-- ── 5. Waar dit bedrijf vandaan kwam ───────────────────────────────────────
alter table public.sales_market_companies
  -- De vindplaatsen: de pagina's waarop dit bedrijf stond. Dit is wat de admin
  -- bij poort 1 kan aanklikken om te controleren of een bedrijf echt in deze
  -- markt hoort. Zonder bewijs is een zekerheidslabel een mening.
  add column if not exists evidence_urls text[] not null default '{}',
  -- Wat er over dit lidmaatschap te zeggen valt in gewone taal, bijvoorbeeld
  -- "gevonden op de ledenlijst van de branchevereniging".
  add column if not exists discovery_note text;

comment on column public.sales_market_companies.evidence_urls is
  'De pagina''s waarop dit bedrijf gevonden is. Bij poort 1 aanklikbaar, zodat de '
  'admin de zekerheid kan controleren in plaats van hem te geloven.';

-- ── 6. RLS op de nieuwe tabel ──────────────────────────────────────────────
--
-- Zelfde regel als in 0065: select-only, alleen voor `is_sales()`, en `to
-- authenticated` verplicht erbij (zie migratie 0042 voor waarom).
alter table public.sales_suppressions enable row level security;
drop policy if exists sales_suppressions_select_sales on public.sales_suppressions;
create policy sales_suppressions_select_sales on public.sales_suppressions
  for select to authenticated using (public.is_sales());
