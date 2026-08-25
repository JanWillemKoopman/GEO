-- ── 0065: de contentvoorraad ───────────────────────────────────────────────
--
-- WAT DIT OPLOST
--
-- Tot nu toe kreeg elke geplande pagina bij het opstellen van het plan meteen
-- een maand én een publicatiedatum. Een idee dat wél bedacht is maar nog
-- nergens staat, kon de database niet bewaren. Gevolg op het scherm van
-- Gasservice Brabant: 120 rijen over twaalf maanden, opgebouwd uit maar 28
-- unieke titels (7 clusters × 4 funnelfasen), dus elke titel stond er vier tot
-- vijf keer in. En van die 120 waren er 17 daadwerkelijk te schrijven, want maar
-- één van de zeven clusters is gemeten.
--
-- Een plan dat vier keer hetzelfde belooft en voor 86% wacht op een meting die
-- niemand gestart heeft, is geen plan. Vandaar deze omkering: ORBIT ENGINE vult
-- een VOORRAAD met kansen die uit een echte meting komen, en de gebruiker zet
-- zelf samen welke daarvan in welke maand geschreven worden.
--
-- HET MODEL: EEN VOORRAADITEM IS EEN PAGINA ZONDER MAAND
--
-- Bewust geen tweede tabel. Een voorraaditem en een geplande pagina zijn
-- hetzelfde ding in twee toestanden, en dat verschil is precies `plan_month_id`:
-- gevuld = ingepland, leeg = beschikbaar. Een aparte tabel zou betekenen dat
-- inplannen een rij verplaatst, en dan verliest de pagina bij elke sleepactie
-- zijn geschiedenis, zijn `content_piece_id` en zijn status. Nu verandert er bij
-- inplannen precies twee dingen: de maand en de datum.
--
-- ⚠️ De voorraad hoort bij het MERK en niet bij het plan. Stelt de consultant
-- een nieuwe planversie op (conventie 8: de oude blijft op `gestopt` staan), dan
-- blijft de voorraad staan zoals hij was. Wat nog niet geschreven is, is niet
-- van een planversie maar van de klant.
--
-- Additief en idempotent, conventie 4. Geen enkele bestaande rij verandert:
-- alle bestaande pagina's houden hun maand, en `source` valt voor hen terug op
-- de standaardwaarde 'plan'.

-- ── 1. Een pagina mag nu zonder maand bestaan ──────────────────────────────
alter table public.planned_pages
  alter column plan_month_id drop not null;

comment on column public.planned_pages.plan_month_id is
  'De maand waarin deze pagina geschreven wordt. NULL = hij staat in de voorraad: wel beschikbaar, nog niet ingepland.';

-- ── 2. Waar dit item vandaan komt ──────────────────────────────────────────
alter table public.planned_pages
  add column if not exists source text not null default 'plan',
  -- De analyse (het cluster) waar de kans uit komt. Bewust naast `topic_id`:
  -- een aanbeveling hangt aan een RAPPORT van een analyse, en een cluster kan
  -- gemeten zijn zonder dat er nog een onderwerp aan hangt.
  add column if not exists source_analysis_id uuid references public.analyses(id) on delete set null,
  -- De sleutel waarop de synchronisatie herkent dat deze kans er al staat:
  -- "<rapport-id>#<volgnummer>". Zonder deze kolom levert elke keer opnieuw
  -- ophalen zeven dubbele voorraaditems op (conventie 9: idempotentie).
  add column if not exists source_ref text,
  -- 'nieuw' = deze pagina bestaat nog niet, 'verbeteren' = er staat al iets en
  -- dat wordt aangevuld. Dat verschil bepaalt of het werk een nieuwe URL
  -- oplevert of een bestaande, en de klant wil erop kunnen filteren.
  add column if not exists recommendation_action text,
  -- Het adres van de pagina die verbeterd wordt. Leeg bij 'nieuw'.
  add column if not exists existing_url text,
  -- Waarom dit een kans is, in de woorden van het rapport. Dit is wat de
  -- gebruiker leest voordat hij besluit de kaart in een maand te slepen.
  add column if not exists why text,
  -- Voor wie de pagina is. Gaat mee als briefing naar de schrijfstap.
  add column if not exists target_intent text,
  -- Hoeveel gemeten vragen deze kans raakt. NULL = de aanbeveling draagt geen
  -- doelvragen, en dan staat er geen getal op het scherm (conventie 3).
  add column if not exists target_count integer,
  -- ⚠️ SORTEERSLEUTEL, NOOIT EEN GETAL OP HET SCHERM. De som van de bevroren
  -- gewichten van de doelvragen, 0,02 tot 1,0 per vraag. Hij loopt op boven de
  -- 1 en is dus geen aandeel: op het overzicht van Van den Udenhout stond
  -- hierdoor ooit letterlijk "240% van de gemeten vragen". Zie de waarschuwing
  -- bovenaan `lib/opportunities.ts`.
  add column if not exists target_weight numeric,
  -- De potentiescore van deze kans (docs/tasks/potentiescore.md), 0-100.
  --
  -- ⚠️ Opgeslagen en niet bij elk scherm herberekend. `loadRecommendationPotential()`
  -- kost twee tot drie leesqueries per kans; bij een merk met vijftig kansen is dat
  -- honderdvijftig queries per keer dat iemand het planscherm opent. De
  -- synchronisatie ververst deze kolom, en die draait bij elke opening van het
  -- scherm één keer voor alle kansen tegelijk.
  --
  -- NULL = nog geen profielbrede herberekening, of geen doelvragen. Dan staat er
  -- geen getal op de kaart, ook geen nul (conventie 3).
  add column if not exists potential numeric;

alter table public.planned_pages
  drop constraint if exists planned_pages_source_check,
  add  constraint planned_pages_source_check
    check (source in ('plan', 'aanbeveling', 'handmatig'));

alter table public.planned_pages
  drop constraint if exists planned_pages_recommendation_action_check,
  add  constraint planned_pages_recommendation_action_check
    check (recommendation_action is null
           or recommendation_action in ('nieuw', 'verbeteren'));

comment on column public.planned_pages.source is
  'plan = door de oude jaarverdeling bedacht, aanbeveling = een gemeten kans uit een rapport, handmatig = door een mens toegevoegd.';

-- ── 3. Dezelfde kans komt er maar één keer in ──────────────────────────────
--
-- ⚠️ Dit is het vangnet onder de synchronisatie, niet de vervanging ervan
-- (conventie 1: een instructie is een intentie, een constraint is een garantie).
-- Draaien er twee sessies tegelijk, dan wint de eerste en faalt de tweede op
-- deze index in plaats van een tweede kaart aan te maken.
--
-- ⚠️ BEWUST NIET PARTIEEL, al zou `where source_ref is not null` logischer
-- lijken. Een partiële unieke index kan niet dienen als conflictdoel van een
-- `insert ... on conflict`, en dat is precies waar de synchronisatie hem voor
-- nodig heeft: dan valt hij terug op een gewone insert en klapt de tweede
-- gelijktijdige ronde met een foutmelding op het scherm van een klant die alleen
-- maar een pagina opende. Zonder de partiële voorwaarde werkt hij net zo goed,
-- want Postgres beschouwt twee `null`-waarden als verschillend: alle pagina's
-- zonder `source_ref` (de oude planpagina's, en alles wat een mens zelf
-- toevoegt) blijven gewoon naast elkaar bestaan.
drop index if exists public.planned_pages_source_ref_idx;
create unique index if not exists planned_pages_source_ref_uq
  on public.planned_pages (profile_id, source_ref);

-- De voorraadquery: alles van dit merk dat nog geen maand heeft.
create index if not exists planned_pages_voorraad_idx
  on public.planned_pages (profile_id, status)
  where plan_month_id is null;
