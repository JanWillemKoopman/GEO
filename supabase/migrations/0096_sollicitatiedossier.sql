-- ═══════════════════════════════════════════════════════════════════════════
-- 0096: het dossier gaat los van het gesprek, en de stem wordt meetbaar
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── WAT ER MIS WAS AAN 0095 ────────────────────────────────────────────────
--
-- In 0095 stonden het CV en de eerdere brieven als kolom OP het gesprek, naast
-- de vacature. Dat is de verkeerde plek gebleken zodra je er een tweede keer
-- mee werkt: een CV verandert twee keer per jaar en een vacature elke keer. Wie
-- op vijf vacatures reageert, plakt zijn hele loopbaan vijf keer opnieuw, en
-- verbetert hij iets aan zijn projectbeschrijving, dan geldt dat alleen voor
-- het gesprek waarin hij toevallig zat.
--
-- Vandaar deze migratie: het materiaal hangt aan de PERSOON, de vacature blijft
-- aan het gesprek hangen. Een nieuwe brief is daarmee: vacature plakken, knop.
--
-- ── WAAROM LOSSE DOCUMENTEN EN GEEN TWEE GROTE TEKSTVELDEN ─────────────────
--
-- "Diverse eerdere brieven, motivaties en projecten" is geen één tekst. In één
-- veld geplakt is er geen enkele manier om te zeggen welk stuk waarover gaat,
-- om er eentje bij te werken zonder de rest aan te raken, of om achteraf te
-- zien welke stukken een geslaagde brief hebben gedragen. Elk stuk krijgt
-- daarom een eigen rij met een soort en een titel.
--
-- Het SOORT is niet alleen ordening: `brief` is het materiaal waar
-- `lib/solliciteren/stem.ts` de schrijfstijl uit meet, en `cv` is het materiaal
-- waar de feiten uit komen. Die twee door elkaar meten zou de gemeten stem
-- vervuilen met opsommingen uit een CV, en dat is precies het register dat een
-- brief niet moet hebben.
--
-- ── DE OUDE KOLOMMEN BLIJVEN STAAN ─────────────────────────────────────────
--
-- `cv_tekst` en `brieven_tekst` worden niet gebruikt en niet weggegooid
-- (conventie 4). Nagekeken op productie op 14 september 2026: nul gesprekken,
-- nul berichten, dus er valt ook niets over te zetten. `vacature_tekst` blijft
-- wél in gebruik: die hoort per definitie bij één gesprek.
--
-- Additief en idempotent (conventie 4).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.sollicitatie_documenten (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- `cv` levert de feiten, `brief` levert de stem, de rest is achtergrond.
  -- Zie de toelichting hierboven voor waarom dat onderscheid in de database
  -- staat en niet alleen in het scherm.
  soort      text not null check (soort in ('cv', 'brief', 'motivatie', 'project', 'overig')),
  titel      text not null default 'Zonder titel',
  inhoud     text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sollicitatie_documenten is
  '(0096) Het dossier van één persoon: CV, eerdere brieven, motivaties en projecten, elk als eigen '
  'rij. Hangt aan auth.users en blijft staan over gesprekken heen. Het soort bepaalt waarvoor het '
  'materiaal gebruikt wordt: brieven leveren de schrijfstijl, het CV levert de feiten.';

-- Het scherm vraagt altijd om het hele dossier van één persoon, op soort
-- gegroepeerd en daarbinnen op naam.
create index if not exists sollicitatie_documenten_user_idx
  on public.sollicitatie_documenten (user_id, soort, titel);

drop trigger if exists sollicitatie_documenten_set_updated_at on public.sollicitatie_documenten;
create trigger sollicitatie_documenten_set_updated_at
  before update on public.sollicitatie_documenten
  for each row execute function public.set_updated_at();

-- ── Welke stukken zaten er in dit gesprek ──────────────────────────────────
--
-- Het hele dossier gaat mee bij elk bericht, en dat dossier verandert. Zonder
-- deze kolom is bij een brief die goed viel niet meer na te gaan wélke stukken
-- hem gedragen hebben, en dat is precies wat je bij de volgende brief wilt
-- weten. Alleen de namen en de omvang, niet de inhoud: die staat al in
-- `sollicitatie_documenten` en twee keer bewaren maakt een correctie daar
-- stilletjes ongedaan.
--
-- Vorm: [{ "id": "...", "titel": "CV 2026", "soort": "cv", "tekens": 4210 }]
alter table public.sollicitatie_chats
  add column if not exists documenten_snapshot jsonb not null default '[]'::jsonb;

comment on column public.sollicitatie_chats.documenten_snapshot is
  '(0096) Welke dossierstukken er bij het eerste bericht van dit gesprek meegingen, op naam en '
  'omvang. Niet de inhoud: die staat in sollicitatie_documenten.';

comment on column public.sollicitatie_chats.cv_tekst is
  '(0096) NIET MEER IN GEBRUIK. Het CV staat sinds deze migratie in sollicitatie_documenten, bij de '
  'persoon in plaats van bij het gesprek. Blijft staan omdat migraties niets weggooien '
  '(conventie 4); er stond op het moment van migreren geen enkele rij in.';

comment on column public.sollicitatie_chats.brieven_tekst is
  '(0096) NIET MEER IN GEBRUIK. Zie cv_tekst hierboven; eerdere brieven zijn nu documenten met '
  'soort = brief, en leveren daar de gemeten schrijfstijl.';

-- ── RLS ────────────────────────────────────────────────────────────────────
--
-- Zelfde twee sloten als 0095: de eigenaar én een account van ORBIT ENGINE
-- zelf. Geen insert- of updatepolicy, schrijven loopt via een API-route met de
-- service-role en een expliciete eigenaarscontrole (conventie 6).
alter table public.sollicitatie_documenten enable row level security;

drop policy if exists sollicitatie_documenten_select_own on public.sollicitatie_documenten;
create policy sollicitatie_documenten_select_own on public.sollicitatie_documenten
  for select using (user_id = (select auth.uid()) and public.is_staff());

-- Controle: staat de tabel er, staat de kolom erbij, en is de trigger gezet?
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'sollicitatie_documenten') as tabel,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'sollicitatie_chats'
       and column_name = 'documenten_snapshot') as kolom,
  (select count(*) from pg_trigger
     where tgname = 'sollicitatie_documenten_set_updated_at') as trigger_bijwerken;
