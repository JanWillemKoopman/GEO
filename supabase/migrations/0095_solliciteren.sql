-- ═══════════════════════════════════════════════════════════════════════════
-- 0095: de sollicitatieassistent van het zijproject
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── WAAROM DIT BUITEN HET DATAMODEL VAN ORBIT ENGINE STAAT ─────────────────
--
-- `app/solliciteren/` is een eigen app in dezelfde codebase (14 september 2026,
-- docs/logbook.md). De afspraak daar is dat hij twee dingen deelt, de inlog en
-- de publicatie, en de rest niet. Dat gold tot nu toe voor de opmaak; met deze
-- migratie geldt het ook voor de data.
--
-- Vandaar dat deze twee tabellen aan `auth.users` hangen en niet aan
-- `accounts`, `profiles` of welke tabel van het hoofdproduct dan ook. Er is
-- geen enkele join tussen deze tabellen en de rest van de database, en dat is
-- de bedoeling: een sollicitatiebrief van de eigenaar heeft niets te maken met
-- het merkprofiel van een klant, en een klant hoort er nooit bij te kunnen.
--
-- ── TWEE TABELLEN EN GEEN JSONB-KOLOM ──────────────────────────────────────
--
-- De berichten hadden ook als jsonb-lijst op het gesprek gekund. Dat is niet
-- gedaan om één reden: per bericht moet vastliggen welk model en welke
-- redeneerstand het gemaakt hebben, plus de tokens en de geschatte kosten. Dat
-- is precies het soort kolom waarop je later wilt kunnen rekenen ("wat kost een
-- brief op het dure model tegenover het goedkope"), en rekenen door een
-- jsonb-lijst heen is precies wat de Sales-module in migratie 0069 al een keer
-- heeft moeten terugdraaien.
--
-- ── DE RUWE UITVOER STAAT ERNAAST (CONVENTIE 8) ────────────────────────────
--
-- `raw_json` bewaart wat OpenAI teruggaf, naast de uitgesplitste kolommen. Bij
-- een brief die straks echt de deur uit gaat, is "wat stond er precies in en
-- waar kwam het vandaan" niet iets wat je een week later wilt moeten gokken.
--
-- Additief en idempotent (conventie 4).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.sollicitatie_chats (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  titel                  text not null default 'Nieuw gesprek',
  -- De drie bronteksten. Leeg mag: een gesprek begint zonder context en krijgt
  -- hem onderweg, en een lege tekst is iets anders dan een ontbrekend veld.
  cv_tekst               text not null default '',
  brieven_tekst          text not null default '',
  vacature_tekst         text not null default '',
  -- Wanneer de context voor het laatst aan het gesprek gekoppeld is. Null =
  -- nog nooit, en dat is wat het scherm laat zien in plaats van te doen alsof
  -- de assistent de teksten al kent.
  context_bijgewerkt_op  timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.sollicitatie_chats is
  '(0095) Een sollicitatiegesprek van het zijproject: de drie bronteksten (CV, oude brieven, '
  'vacature) plus wie het gesprek voert. Hangt aan auth.users en staat los van het datamodel van '
  'ORBIT ENGINE.';

-- Het scherm vraagt altijd om de gesprekken van één persoon, nieuwste bovenaan.
create index if not exists sollicitatie_chats_user_idx
  on public.sollicitatie_chats (user_id, updated_at desc);

-- `updated_at` bepaalt de volgorde in de lijst. Zonder trigger zou die volgorde
-- alleen kloppen zolang elke route eraan denkt hem mee te sturen, en dat is
-- precies de soort belofte die conventie 1 in code wil hebben.
drop trigger if exists sollicitatie_chats_set_updated_at on public.sollicitatie_chats;
create trigger sollicitatie_chats_set_updated_at
  before update on public.sollicitatie_chats
  for each row execute function public.set_updated_at();

create table if not exists public.sollicitatie_berichten (
  id               uuid primary key default gen_random_uuid(),
  chat_id          uuid not null references public.sollicitatie_chats (id) on delete cascade,
  -- Nederlandse waarden, want dit is een Nederlandse app en deze tabel praat
  -- met niemand anders. De vertaling naar 'user' en 'assistant' gebeurt op één
  -- plek, vlak voor de aanroep (lib/solliciteren/gesprek.ts).
  rol              text not null check (rol in ('gebruiker', 'assistent')),
  inhoud           text not null default '',
  -- Alleen gevuld bij een antwoord van de assistent: met welk model en welke
  -- instellingen is dit gemaakt. Bij een bericht van de gebruiker is dit null,
  -- en dat is de juiste waarde (conventie 3).
  model            text,
  reasoning_effort text,
  temperatuur      numeric(3,2),
  input_tokens     integer,
  output_tokens    integer,
  cost_usd         numeric(10,6),
  raw_json         jsonb,
  -- Ging het antwoord halverwege stuk, dan blijft het bericht staan met de
  -- reden erbij. Een verdwenen bericht laat de gebruiker raden of zijn vraag
  -- wel is aangekomen.
  fout             text,
  created_at       timestamptz not null default now()
);

comment on table public.sollicitatie_berichten is
  '(0095) Een bericht in een sollicitatiegesprek. Bij een antwoord van de assistent staat erbij '
  'welk model, welke redeneerstand en welke temperatuur het gemaakt hebben, plus tokens en '
  'geschatte kosten.';

create index if not exists sollicitatie_berichten_chat_idx
  on public.sollicitatie_berichten (chat_id, created_at);

-- ── RLS ────────────────────────────────────────────────────────────────────
--
-- Lezen mag alleen de eigenaar, en alleen als hij een account van ORBIT ENGINE
-- zelf is: `is_staff()` uit migratie 0038 is hetzelfde slot dat de layout van
-- het zijproject op de server gebruikt. Twee sloten op dezelfde deur, want als
-- iemand ooit uit `staff_users` verdwijnt, hoort zijn sessie ook langs deze
-- kant niets meer te kunnen lezen.
--
-- Bewust geen insert-, update- of deletepolicy: schrijven loopt via een
-- API-route met de service-role en een expliciete eigenaarscontrole
-- (conventie 6), nooit rechtstreeks vanaf de client.
alter table public.sollicitatie_chats enable row level security;
alter table public.sollicitatie_berichten enable row level security;

drop policy if exists sollicitatie_chats_select_own on public.sollicitatie_chats;
create policy sollicitatie_chats_select_own on public.sollicitatie_chats
  for select using (user_id = (select auth.uid()) and public.is_staff());

drop policy if exists sollicitatie_berichten_select_own on public.sollicitatie_berichten;
create policy sollicitatie_berichten_select_own on public.sollicitatie_berichten
  for select using (
    exists (
      select 1 from public.sollicitatie_chats c
      where c.id = chat_id and c.user_id = (select auth.uid()) and public.is_staff()
    )
  );

-- Controle: staan beide tabellen er, en staat de trigger op de volgorde?
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'sollicitatie_chats') as tabel_chats,
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'sollicitatie_berichten') as tabel_berichten,
  (select count(*) from pg_trigger
     where tgname = 'sollicitatie_chats_set_updated_at') as trigger_volgorde;
