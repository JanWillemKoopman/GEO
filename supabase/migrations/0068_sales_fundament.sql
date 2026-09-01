-- ═══════════════════════════════════════════════════════════════════════════
-- 0068 · De Sales-module, fundament: de rol, de markt en het bedrijf
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT DIT TOEVOEGT
--
-- Vier tabellen en twee functies. Het volledige ontwerp staat in
-- `docs/tasks/geo-prospect-engine.md`, hoofdstuk 4 (de rol) en 7.1 (de tabellen).
-- Dit is sprint 1 van zeven: er wordt nog niets gemeten en er gaat nog geen
-- enkele AI-aanroep de deur uit.
--
-- WAAROM DE SALES-MODULE EEN EIGEN ROL KRIJGT EN NIET OP `staff_users` MEELIFT
--
-- Vandaag kent de app twee soorten gebruiker: de klant, en de beheerder die
-- alles ziet. Dat is te grof voor deze module, en wel twee kanten op. Een
-- salesmedewerker moet bij de opportunities kunnen, maar hoort niet in het
-- merkdossier van een bestaande klant te kunnen kijken. En een marktanalyse
-- starten kost geld en kan tot een publieke pagina leiden, dus dat hoort niet
-- iedereen met een Sales-inlog te mogen.
--
-- Vandaar drie niveaus in plaats van twee, met de beheerder als breedste:
--
--   klant        ziet niets van Sales
--   sales        ziet de hele Sales-sectie, werkt de opportunities af
--   sales admin  idem, plus alles wat geld kost of naar buiten gaat
--   beheerder    alles, en is daarmee automatisch ook sales admin
--
-- ⚠️ DE ANDERE KANT VAN DIE SCHEIDING IS NET ZO HARD (plan 4.3)
--
-- Een klant mag nooit kunnen zien dat hij ooit als prospect met een
-- opportunityscore in dit systeem heeft gestaan. Deze migratie legt daarvoor de
-- ene helft neer: RLS staat aan op alle drie de datatabellen en de enige
-- leespolicy vraagt `is_sales()`. De andere helft, dat geen klantscherm uit
-- deze tabellen leest, is een broncodecontrole in `scripts/test-unit.ts`.
--
-- ⚠️ DE BEWAARTERMIJN ZIT ER VANAF DE EERSTE MIGRATIE IN (plan 24.2)
--
-- "Prospects die na twaalf maanden nergens toe geleid hebben, worden opgeruimd
-- of geanonimiseerd. Dit hoort in de eerste migratie ontworpen te zijn, niet
-- later bedacht." Vandaar `last_activity_at` en `anonymised_at` op
-- `sales_companies`. De rekenkunde eromheen staat puur en testbaar in
-- `lib/sales/retention.ts`; het opruimen zelf komt in een latere sprint, maar
-- de kolommen die het mogelijk maken staan er nu al. Een bewaartermijn die je
-- achteraf toevoegt kan niet terugrekenen over de periode dat hij ontbrak.
--
-- Additief en idempotent (conventie 4), geen enkele `drop table` of
-- `drop column`. De `drop policy if exists` hieronder is de bestaande vorm uit
-- 0038 en 0062: een policy is niet te vervangen zonder hem eerst weg te halen.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Wie is salesmedewerker ──────────────────────────────────────────────
--
-- Exact het patroon van `staff_users` (0038), en om exact dezelfde reden: RLS
-- aan en NUL policies. Niemand kan via de API uitlezen wie in Sales zit, en
-- niemand kan zichzelf toevoegen. Dat gebeurt alleen in het Supabase-dashboard.
create table if not exists public.sales_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  -- Mag deze medewerker de knoppen indrukken die geld kosten of naar buiten
  -- gaan: een markt starten, een meting herhalen, een rapport publiceren.
  is_admin   boolean not null default false,
  -- Wie dit is, voor het geval het e-mailadres in `auth.users` niets zegt.
  note       text,
  created_at timestamptz not null default now()
);

alter table public.sales_users enable row level security;

comment on table public.sales_users is
  'Wie mag bij de Sales-module (plan 4.2). RLS aan, nul policies, net als '
  'staff_users: rijen komen er alleen via het Supabase-dashboard in.';

-- ── 2. De twee vragen die elk Sales-scherm en elke Sales-route stelt ───────
--
-- ⚠️ `security definer` is hier geen luxe maar een vereiste, precies zoals bij
-- `is_staff()`: zou deze functie als aanroeper draaien, dan las hij
-- `sales_users` mét RLS, en een tabel zonder policies levert dan altijd `false`.
-- De hele rol zou stil niet werken.
--
-- ⚠️ `set search_path = public` hoort er verplicht bij: zonder dat kan een
-- aanroeper met een eigen search_path een andere `sales_users` voorschuiven.
--
-- Beide functies roepen `public.is_staff()` aan in plaats van `staff_users`
-- nog een keer zelf te bevragen. Dat is één plek waar "wie is beheerder"
-- beslist wordt, en geen tweede kopie die eroverheen kan groeien.
create or replace function public.is_sales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sales_users s where s.user_id = (select auth.uid())
  ) or public.is_staff();
$$;

revoke all on function public.is_sales() from public;
revoke all on function public.is_sales() from anon;
grant execute on function public.is_sales() to authenticated;

comment on function public.is_sales() is
  'Mag de ingelogde gebruiker bij de Sales-module? Een beheerder is automatisch '
  'ook sales; andersom niet. security definer omdat sales_users nul leespolicies heeft.';

create or replace function public.is_sales_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sales_users s
    where s.user_id = (select auth.uid()) and s.is_admin
  ) or public.is_staff();
$$;

revoke all on function public.is_sales_admin() from public;
revoke all on function public.is_sales_admin() from anon;
grant execute on function public.is_sales_admin() to authenticated;

comment on function public.is_sales_admin() is
  'Mag de ingelogde gebruiker de Sales-knoppen indrukken die geld kosten of naar '
  'buiten gaan (plan 4.2)? Een beheerder mag dat automatisch.';

-- ── 3. De markt ────────────────────────────────────────────────────────────
--
-- Een markt is permanent en wordt herhaald gemeten (plan hoofdstuk 6). Hij
-- draagt daarom geen meetgegevens: die komen in `sales_runs` (sprint 3), één
-- rij per ronde. Dat onderscheid is de reden dat opportunitytype 8 ("verlies")
-- later kan bestaan, en het is de hele economie van deze module: elke hermeting
-- levert nieuwe belaanleidingen op uit een markt die je al kent.
create table if not exists public.sales_markets (
  id          uuid primary key default gen_random_uuid(),
  -- Ook het publieke adres straks (`/markt/makelaar-eindhoven`, sprint 6).
  -- Uniek vanaf nu, want een adres dat later pas uniek wordt is geen adres.
  slug        text not null unique,
  -- Wat sales leest. Bewust apart van `industry` en `location`: die twee zijn
  -- invoer voor de marktontdekking, dit is een naam die iemand mag bijstellen.
  label       text not null,
  industry    text not null,
  location    text not null,
  radius_km   integer not null default 15,
  country     text not null default 'NL',
  status      text not null default 'concept',
  -- Publiceren is een aparte, expliciete handeling van een sales admin, en
  -- intrekken kan altijd (plan hoofdstuk 20). Standaard uit.
  is_public   boolean not null default false,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Opgeteld uit het kostenlogboek, zodat het plafond per markt (plan 21.3)
  -- straks één kolom hoeft te lezen in plaats van een som over `ai_calls`.
  cost_cents  integer not null default 0,
  archived_at timestamptz
);

-- De zes standen uit plan 7.1. Een constraint en geen enum: een enum uitbreiden
-- vraagt een migratie met een `alter type` die niet in een transactie past,
-- en deze lijst gaat nog groeien.
alter table public.sales_markets
  drop constraint if exists sales_markets_status_check;
alter table public.sales_markets
  add constraint sales_markets_status_check check (
    status in ('concept', 'bedrijven_gevonden', 'wacht_op_goedkeuring', 'meet', 'klaar', 'mislukt')
  );

-- Een straal van 0 is geen markt en 1000 km is geen straal meer maar het land.
alter table public.sales_markets
  drop constraint if exists sales_markets_radius_check;
alter table public.sales_markets
  add constraint sales_markets_radius_check check (radius_km between 1 and 250);

comment on table public.sales_markets is
  'Een onderzochte markt: branche plus plaats plus straal (plan 7.1). Permanent, '
  'wordt herhaald gemeten. De meetrondes zelf komen in sales_runs.';
comment on column public.sales_markets.slug is
  'Het adres van de markt, ook publiek zodra is_public aan staat. Uniek vanaf de eerste rij.';
comment on column public.sales_markets.cost_cents is
  'Opgeteld uit het kostenlogboek. Draagt straks het plafond per markt (plan 21.3).';

-- ── 4. Het bedrijf ─────────────────────────────────────────────────────────
--
-- Een bedrijf is permanent en kan in meerdere markten zitten (plan hoofdstuk 6).
-- Het hangt dus NIET aan een markt en al helemaal niet aan een rapport: meet je
-- dezelfde markt drie maanden later opnieuw, dan is het hetzelfde bedrijf met
-- dezelfde geschiedenis.
create table if not exists public.sales_companies (
  id                    uuid primary key default gen_random_uuid(),
  -- ⚠️ NULLABLE, en dat is geen slordigheid maar het hele punt van hoofdstuk 9.
  --
  -- Het plan noemt `domain` "uniek" en dat blijft zo, maar een bedrijf ZONDER
  -- website is juist de prospect waar deze module naar op zoek is: aantoonbaar
  -- bestaand en volledig onzichtbaar. Zou dit veld verplicht zijn, dan zou de
  -- marktontdekking precies die bedrijven weggooien. De uniciteit staat daarom
  -- in een gedeeltelijke index hieronder, die meerdere lege waarden toestaat.
  domain                text,
  name                  text not null,
  -- De schrijfwijzen waarop de meting telt. Bij dertig bedrijven per markt is
  -- dit belangrijker dan bij één merk: "Van X Makelaars" en "Van X" zijn
  -- hetzelfde bedrijf en "Van Y Makelaars" is dat niet.
  name_variants         text[] not null default '{}',
  city                  text,
  address               text,
  phone                 text,
  email                 text,
  size_signal           text not null default 'onbekend',
  -- Wat de crawler vond: diensten, pagina's, feiten. Geen AI, dus gratis.
  crawl_summary         jsonb,
  crawled_at            timestamptz,
  -- ⚠️ Absoluut, over alle markten heen, permanent (plan 16.4 en 24.2). Een
  -- afmelding zet hem, en daarna genereert de engine hier geen mail meer voor.
  do_not_contact        boolean not null default false,
  do_not_contact_reason text,
  do_not_contact_at     timestamptz,
  first_seen_at         timestamptz not null default now(),
  -- De klok onder de bewaartermijn. Elke aanraking die ergens toe leidt zet hem
  -- opnieuw: een nieuwe meting, een toewijzing, een mail, een gesprek. Blijft
  -- hij twaalf maanden stilstaan, dan is dit een prospect die nergens toe
  -- geleid heeft. Zie `lib/sales/retention.ts`.
  last_activity_at      timestamptz not null default now(),
  -- Gevuld = de persoonsgegevens zijn eruit, de rij blijft staan voor de
  -- geschiedenis. Leeg = de rij is nog compleet.
  anonymised_at         timestamptz,
  created_at            timestamptz not null default now()
);

alter table public.sales_companies
  drop constraint if exists sales_companies_size_check;
alter table public.sales_companies
  add constraint sales_companies_size_check check (
    size_signal in ('zzp', 'klein', 'middel', 'groot', 'onbekend')
  );

-- Ontdubbelen gebeurt op genormaliseerd domein als eerste sleutel (plan 9.3).
-- `where domain is not null` laat bedrijven zonder website er allemaal in;
-- die worden op naam beoordeeld en gaan bij twijfel naar poort 1.
create unique index if not exists sales_companies_domain_key
  on public.sales_companies (domain)
  where domain is not null;

-- Zoeken op naam in het Prospects-scherm, over alle markten heen.
create index if not exists sales_companies_name_idx
  on public.sales_companies (lower(name));

-- De opruimlijst: welke bedrijven staan te lang stil. Zonder deze index wordt
-- dat een volledige tabelscan zodra er duizenden prospects staan.
create index if not exists sales_companies_retention_idx
  on public.sales_companies (last_activity_at)
  where anonymised_at is null;

comment on table public.sales_companies is
  'Een bedrijf, permanent en over markten heen (plan 7.1). Ontdubbeld op '
  'genormaliseerd domein; een bedrijf zonder website mag er wel in.';
comment on column public.sales_companies.last_activity_at is
  'De klok onder de bewaartermijn van twaalf maanden (plan 24.2). Elke aanraking '
  'die ergens toe leidt zet hem opnieuw. Rekenkunde: lib/sales/retention.ts.';
comment on column public.sales_companies.do_not_contact is
  'Absoluut en permanent, over alle markten heen (plan 16.4). Een afmelding zet hem.';

-- ── 5. Welk bedrijf hoort in welke markt ───────────────────────────────────
--
-- De koppeltabel draagt de zekerheid en de goedkeuring, want dat zijn
-- eigenschappen van het LIDMAATSCHAP en niet van het bedrijf. Dezelfde makelaar
-- kan zeker in "makelaars Eindhoven" horen en twijfelachtig in "aankoopmakelaar
-- Brabant".
create table if not exists public.sales_market_companies (
  id                 uuid primary key default gen_random_uuid(),
  market_id          uuid not null references public.sales_markets (id) on delete cascade,
  company_id         uuid not null references public.sales_companies (id) on delete cascade,
  -- Waar dit bedrijf vandaan kwam. Meervoud, want een bedrijf uit drie
  -- onafhankelijke bronnen is zeker en een bedrijf dat alleen een model noemde
  -- is dat niet (plan 9.1). Die twijfel hoort zichtbaar te zijn bij poort 1.
  discovery_sources  text[] not null default '{}',
  confidence         text not null default 'middel',
  -- ⚠️ NULL BETEKENT "DE ADMIN HEEFT ER NOG NIET NAAR GEKEKEN", en dat is iets
  -- anders dan `false` ("eruit gehaald"). Conventie 3: onbekend is een betere
  -- waarde dan een verkeerde. Zonder dit onderscheid zou poort 1 niet kunnen
  -- bestaan, want dan is een niet-beoordeelde lijst niet te onderscheiden van
  -- een lijst waar alles is afgekeurd.
  included           boolean,
  excluded_reason    text,
  -- Plan 9.2, derde toets: een landelijk platform is geen prospect maar een
  -- bron. Het telt mee als concurrent in de meting en verschijnt niet in de
  -- prospectlijst. Standaard `true`, want de meeste rijen zijn wél prospects.
  is_prospect        boolean not null default true,
  decided_by         uuid references auth.users (id),
  decided_at         timestamptz,
  created_at         timestamptz not null default now()
);

-- Eén bedrijf hoort hooguit één keer in dezelfde markt. Zonder deze regel
-- levert een tweede marktontdekking dubbele rijen op en telt de meting het
-- bedrijf twee keer.
create unique index if not exists sales_market_companies_uniek
  on public.sales_market_companies (market_id, company_id);

create index if not exists sales_market_companies_company_idx
  on public.sales_market_companies (company_id);

alter table public.sales_market_companies
  drop constraint if exists sales_market_companies_confidence_check;
alter table public.sales_market_companies
  add constraint sales_market_companies_confidence_check check (
    confidence in ('hoog', 'middel', 'laag')
  );

comment on table public.sales_market_companies is
  'Hoort dit bedrijf in deze markt (plan 7.1)? Draagt de zekerheid, de '
  'vindplaatsen en het oordeel van poort 1.';
comment on column public.sales_market_companies.included is
  'null = de admin heeft er nog niet naar gekeken, true = goedgekeurd, '
  'false = eruit gehaald. Die drie standen zijn poort 1 (plan 8.1).';

-- ── 6. RLS: lezen mag alleen Sales, schrijven nooit vanaf de client ────────
--
-- SELECT-only, zoals overal in deze app (conventie 6). Schrijven gaat
-- uitsluitend via de API-routes met de service-role key en een expliciete
-- controle op `is_sales()` of `is_sales_admin()`.
--
-- ⚠️ `to authenticated` staat er verplicht bij. Migratie 0042 legt uit waarom:
-- een policy zonder `to`-clausule geldt ook voor `anon`, en die rol mag
-- `is_sales()` niet aanroepen. Een uitgelogde bezoeker zou dan een
-- permissiefout krijgen in plaats van netjes nul rijen.
do $$
declare
  t text;
begin
  foreach t in array array[
    'sales_markets', 'sales_companies', 'sales_market_companies'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_sales', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_sales())',
      t || '_select_sales', t
    );
  end loop;
end
$$;
