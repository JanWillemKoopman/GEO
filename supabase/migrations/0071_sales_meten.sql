-- ═══════════════════════════════════════════════════════════════════════════
-- 0071 · De Sales-module, sprint 3: de markt meten
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT DIT TOEVOEGT
--
-- Vijf tabellen (`sales_runs`, `sales_questions`, `sales_answers`,
-- `sales_mentions`, `sales_company_scores`), één stand erbij op de markt en één
-- kolom op `ai_calls`. Het ontwerp staat in `docs/tasks/geo-prospect-engine.md`
-- §7.2 (datamodel), hoofdstuk 10 (intentie in plaats van zichtbaarheid), 11
-- (meerdere engines) en §8.1 (poort 2).
--
-- ⚠️ WAAROM DE MEETRONDE EEN EIGEN ENTITEIT IS EN GEEN KOLOMMEN OP DE MARKT
--
-- Plan hoofdstuk 6 en opportunitytype 8. Een markt is permanent en wordt
-- herhaald gemeten; zou de meting op de markt zelf landen, dan overschrijft
-- ronde twee ronde één en bestaat "je bent sinds juni gezakt van achttien naar
-- negen" niet meer. Dat type is volgens het plan het sterkste verkoopmoment dat
-- er is, en het is de hele economie van de module: elke hermeting levert nieuwe
-- belaanleidingen uit een markt die je al kent, tegen alleen de meetkosten.
--
-- ⚠️ WAAROM `sales_company_scores` NAAST `sales_mentions` STAAT
--
-- De vermeldingen zijn de waarheid, de scores zijn de rekensom erover. Die som
-- opnieuw maken bij elk schermbezoek is bij dertig bedrijven maal veertig vragen
-- maal twee engines 2400 rijen per scherm. De rekenkunde zelf staat in een pure
-- module (`lib/sales/measure-math.ts`, conventie 2) en is dus testbaar zonder
-- database; deze tabel is alleen de opslag van de uitkomst, met de invoer
-- ernaast bewaard zodat hij altijd na te rekenen is (conventie 8).
--
-- Additief en idempotent (conventie 4), geen enkele `drop table` of
-- `drop column`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. De markt krijgt een zevende stand ───────────────────────────────────
--
-- Poort 2 zit tussen "de vragen staan klaar" en "er wordt gemeten" (plan §8.1).
-- Bij poort 1 kon dat nog afgeleid worden uit `status` plus `approved_at`, maar
-- hier niet: tussen goedkeuring van de bedrijvenlijst en goedkeuring van de
-- vragen zit een hele keten (verrijken, intenties, vragen), en die standen
-- moeten uit elkaar te houden zijn. Anders staat een markt die nog aan het
-- crawlen is er hetzelfde bij als een markt die op een mens wacht, en dan is de
-- poort geen poort maar een lijst waar niemand naar kijkt.
alter table public.sales_markets
  drop constraint if exists sales_markets_status_check;
alter table public.sales_markets
  add constraint sales_markets_status_check check (
    status in (
      'concept',
      'bedrijven_gevonden',
      'wacht_op_goedkeuring',
      'vragen_klaar',
      'meet',
      'klaar',
      'mislukt'
    )
  );

-- ── 2. De meetronde ────────────────────────────────────────────────────────
create table if not exists public.sales_runs (
  id             uuid primary key default gen_random_uuid(),
  market_id      uuid not null references public.sales_markets (id) on delete cascade,
  -- De hoeveelste ronde van deze markt. Ronde 1 kan geen verlies detecteren,
  -- ronde 2 wel (plan hoofdstuk 12, type 8). Een teller en geen datumvergelijking,
  -- want "de vorige ronde" moet ook kloppen als er twee rondes op één dag zijn.
  round_no       integer not null default 1,
  status         text not null default 'concept',
  -- Welke engines meededen. Meervoud en opgeslagen, want het verschil tussen
  -- engines is zelf een verkoopargument (plan hoofdstuk 11) en een ronde met één
  -- engine mag nooit doorgaan voor een ronde met twee.
  engines        text[] not null default '{}',
  question_count integer not null default 0,
  -- De intenties van deze markt (plan 10.1, as 2). Als jsonb op de ronde en niet
  -- als eigen tabel: ze zijn per ronde vastgesteld, ze worden nooit los
  -- opgevraagd, en de vragen dragen hun label al bij zich. Een tabel zou drie
  -- joins toevoegen voor gegevens die altijd samen gelezen worden.
  intents_json   jsonb,
  -- Wat de raming zei bij poort 2. Bewaard náást wat het werd, want een raming
  -- die er structureel naast zit, is iets wat je alleen ziet als je hem bewaart.
  estimate_usd   numeric(10, 4),
  cost_usd       numeric(10, 4) not null default 0,
  -- Poort 2: wie heeft de vragen en de kostenraming gezien (plan §8.1).
  approved_at    timestamptz,
  approved_by    uuid references auth.users (id),
  started_at     timestamptz,
  finished_at    timestamptz,
  -- Wat er onderweg misging, in gewone taal. Een ronde die half draaide zegt
  -- hier wat er ontbreekt; hij doet niet alsof hij compleet is (plan §8.2).
  notes          text,
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now()
);

alter table public.sales_runs
  drop constraint if exists sales_runs_status_check;
alter table public.sales_runs
  add constraint sales_runs_status_check check (
    status in ('concept', 'vragen_klaar', 'meet', 'klaar', 'mislukt')
  );

-- Eén ronde per nummer per markt. Zonder deze index levert een dubbel
-- ingeplande taak twee rondes 1 op, en dan vergelijkt type 8 straks twee helften
-- van dezelfde meting met elkaar.
create unique index if not exists sales_runs_market_round_key
  on public.sales_runs (market_id, round_no);

create index if not exists sales_runs_market_idx
  on public.sales_runs (market_id, created_at desc);

comment on table public.sales_runs is
  'Eén meetronde van één markt (plan 7.2). De markt is permanent, de ronde niet: '
  'zonder dit onderscheid bestaat opportunitytype 8 (verlies) niet.';
comment on column public.sales_runs.engines is
  'Welke engines daadwerkelijk gemeten hebben. Valt er een weg, dan is dat '
  'zichtbaar op elk scherm dat de uitkomst toont (plan hoofdstuk 11, regel 3).';

-- ── 3. De vragen ───────────────────────────────────────────────────────────
--
-- ⚠️ HET INTENTIELABEL IS DE HELE REDEN DAT DEZE TABEL BESTAAT (plan 10.2).
--
-- "Je scoort 18 van 40" is een cijfer. "Bij de negen vragen over
-- aankoopbegeleiding word je nul keer genoemd" is een verkoopargument. Zonder
-- deze twee kolommen is er geen verschil tussen die twee zinnen, en dan werkt de
-- rest van het plan niet: opportunitytype 3 leunt erop, de hookselectie leunt
-- erop, en de uitleg in de mail leunt erop.
create table if not exists public.sales_questions (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.sales_runs (id) on delete cascade,
  text         text not null,
  -- As 1: waar in de klantreis staat deze vraag (plan 10.1).
  intent_stage text not null,
  -- As 2: welke commerciële intentie meet hij (bijvoorbeeld aankoopbegeleiding).
  intent_label text not null,
  -- Hoe zwaar deze vraag commercieel telt (plan 10.3). Bevroren op het moment
  -- dat de vragen worden vastgesteld, net als `prompt_weight` bij een
  -- klantmeting: een gewicht dat achteraf verschuift maakt twee rondes
  -- onvergelijkbaar.
  weight       numeric(4, 3) not null default 1,
  -- ⚠️ Een SCHATTING en geen meting (plan 10.3, laatste alinea). Echte
  -- zoekvolumes zijn in ORBIT ENGINE bewust niet gebouwd. Het veld heet daarom
  -- niet `volume` maar zegt in zijn naam wat het is, en elk scherm dat het toont
  -- hoort dat woord over te nemen.
  frequency_estimate text not null default 'onbekend',
  source       text not null default 'gegenereerd',
  position     integer not null default 0,
  -- Uit de lijst gehaald bij poort 2. Niet verwijderd: wie een vraag weghaalt
  -- moet dat bij de volgende ronde terug kunnen zien (plan §8.1).
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.sales_questions
  drop constraint if exists sales_questions_stage_check;
alter table public.sales_questions
  add constraint sales_questions_stage_check check (
    intent_stage in ('orientatie', 'vergelijken', 'selecteren', 'contact')
  );

alter table public.sales_questions
  drop constraint if exists sales_questions_source_check;
alter table public.sales_questions
  add constraint sales_questions_source_check check (
    source in ('gegenereerd', 'handmatig')
  );

-- Dezelfde vraag twee keer in één ronde is twee keer betalen voor hetzelfde
-- antwoord. `lower()` want het model levert wisselende hoofdletters.
create unique index if not exists sales_questions_run_text_key
  on public.sales_questions (run_id, lower(text));

create index if not exists sales_questions_run_idx
  on public.sales_questions (run_id, position);

comment on table public.sales_questions is
  'De gestelde vragen, met per vraag welke commerciële intentie hij meet en hoe '
  'zwaar die telt (plan 7.2 en 10.2). Zonder het intentielabel is de uitkomst een '
  'cijfer in plaats van een verkoopargument.';
comment on column public.sales_questions.frequency_estimate is
  'Een SCHATTING, nooit een meting: echte zoekvolumes zijn bewust niet gebouwd '
  '(plan 10.3). Elk scherm dat dit toont noemt het een schatting.';

-- ── 4. De antwoorden ───────────────────────────────────────────────────────
--
-- Eén rij per vraag per engine. Dezelfde vraag naar beide engines, zodat het
-- verschil aan de engine ligt en niet aan de vraag (plan hoofdstuk 11, regel 1).
create table if not exists public.sales_answers (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references public.sales_questions (id) on delete cascade,
  run_id        uuid not null references public.sales_runs (id) on delete cascade,
  engine        text not null,
  answer_text   text not null,
  -- De bronnen die de engine aanhaalde. Voedt opportunitytype 6 (source gap):
  -- welke domeinen bepalen deze markt, en staat dit bedrijf daartussen.
  cited_sources jsonb not null default '[]'::jsonb,
  -- Conventie 8, alles bewaren: de volledige ruwe uitvoer naast de uitgesplitste
  -- kolommen. Zonder dit is een oordeel achteraf niet te controleren, en deze
  -- oordelen belanden in een verkoopmail.
  raw           jsonb,
  model_used    text,
  response_id   text,
  -- ⚠️ Bedrijfsnamen die de engine noemde en die in GEEN ENKELE bron zaten
  -- (plan 9.1, laatste rij). Dat is op zichzelf informatie: ofwel onze
  -- inventarisatie was incompleet, ofwel de engine verzint een naam. Allebei
  -- wordt vastgelegd en getoond, geen van beide wordt stil weggegooid.
  unknown_names text[] not null default '{}',
  cost_usd      numeric(10, 6) not null default 0,
  measured_at   timestamptz not null default now()
);

-- ⚠️ De engine hoort ONVOORWAARDELIJK in de sleutel, precies zoals bij
-- `tracking_runs` (migratie 0041). Zonder dit ziet de Gemini-meting de
-- OpenAI-meting van dezelfde vraag als "al gedaan" en slaat hij zichzelf over.
-- Zonder foutmelding, met een lege score per engine terwijl alles groen lijkt.
create unique index if not exists sales_answers_question_engine_key
  on public.sales_answers (question_id, engine);

create index if not exists sales_answers_run_idx
  on public.sales_answers (run_id, engine);

comment on table public.sales_answers is
  'Eén antwoord per vraag per engine (plan 7.2). De ruwe uitvoer staat ernaast, '
  'want een oordeel dat in een verkoopmail belandt moet na te rekenen zijn.';
comment on column public.sales_answers.unknown_names is
  'Bedrijven die de engine noemde en die in geen enkele bron zaten (plan 9.1). '
  'Onze lijst was incompleet, of de engine verzon een naam. Beide zijn informatie.';

-- ── 5. De vermeldingen ─────────────────────────────────────────────────────
--
-- Dit is de tabel waar alles uit gerekend wordt (plan 7.2).
create table if not exists public.sales_mentions (
  id           uuid primary key default gen_random_uuid(),
  answer_id    uuid not null references public.sales_answers (id) on delete cascade,
  company_id   uuid not null references public.sales_companies (id) on delete cascade,
  run_id       uuid not null references public.sales_runs (id) on delete cascade,
  mentioned    boolean not null,
  -- ⚠️ MAG ALLEEN GEVULD ZIJN ALS `mentioned` WAAR IS (plan 15.2, conventie 1).
  -- Het model vulde bij de klantmeting ondanks een expliciete instructie bij 10
  -- van 27 niet-genoemde merken tóch een rol in: structured output kiest bij
  -- twijfel de eerste enum-waarde. De check hieronder is het vangnet in de
  -- database, náást hetzelfde vangnet in code.
  mention_role text,
  position     integer,
  -- Het stukje antwoord waar het bedrijf in staat. Dit is het bewijs dat straks
  -- in het prospectdossier en in de mail wordt geciteerd (plan hoofdstuk 15).
  snippet      text,
  created_at   timestamptz not null default now()
);

alter table public.sales_mentions
  drop constraint if exists sales_mentions_role_check;
alter table public.sales_mentions
  add constraint sales_mentions_role_check check (
    (mentioned and (mention_role is null or mention_role in
      ('eerste_aanbeveling', 'een_van_meerdere', 'zijdelings')))
    or (not mentioned and mention_role is null and position is null)
  );

create unique index if not exists sales_mentions_answer_company_key
  on public.sales_mentions (answer_id, company_id);

create index if not exists sales_mentions_run_company_idx
  on public.sales_mentions (run_id, company_id);

comment on table public.sales_mentions is
  'Eén rij per bedrijf per antwoord (plan 7.2). De tabel waar elke score, elke '
  'opportunity en elk bewijsfragment uit gerekend wordt.';
comment on column public.sales_mentions.mention_role is
  'Alleen gevuld als mentioned waar is (plan 15.2). De check-constraint is het '
  'vangnet: het model vulde bij de klantmeting 10 van 27 niet-genoemde merken toch in.';

-- ── 6. De uitkomst per bedrijf ─────────────────────────────────────────────
--
-- De rekensom over de vermeldingen, opgeslagen zodat een scherm hem niet
-- opnieuw hoeft te maken. Eén rij per bedrijf per ronde per engine, plus één rij
-- met `engine = 'alle'` voor het gecombineerde beeld.
--
-- ⚠️ `engine = 'alle'` als rij en niet als berekening op het scherm: het
-- gecombineerde cijfer is de noemer van bijna elke opportunityregel, en twee
-- plekken die hetzelfde getal rekenen lopen gegarandeerd uit elkaar.
create table if not exists public.sales_company_scores (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.sales_runs (id) on delete cascade,
  company_id      uuid not null references public.sales_companies (id) on delete cascade,
  engine          text not null,
  questions_total integer not null default 0,
  mentions        integer not null default 0,
  -- Het aandeel vragen waarin dit bedrijf genoemd wordt, 0 tot 1.
  share           numeric(6, 5) not null default 0,
  -- Hetzelfde aandeel, maar gewogen naar de commerciële waarde van de vragen
  -- (plan 10.3). Dit is het cijfer dat telt, want tien oriënterende vermeldingen
  -- zijn commercieel minder waard dan drie bij een koopklare vraag.
  weighted_share  numeric(6, 5) not null default 0,
  -- ⚠️ De onzekerheidsmarge hoort ERBIJ en niet ernaast (plan hoofdstuk 12,
  -- type 2 en 8). Een verschil binnen de marge is geen verschil, en dat is
  -- precies de fout die een verkoper voor schut zet in een gesprek.
  stderr          numeric(6, 5) not null default 0,
  avg_position    numeric(5, 2),
  -- Per intentie: hoeveel vragen, hoeveel vermeldingen, welk aandeel. Dit is de
  -- laag waar opportunitytype 3 (intent gap) op draait.
  per_intent      jsonb not null default '{}'::jsonb,
  per_stage       jsonb not null default '{}'::jsonb,
  -- De brondomeinen die dit bedrijf onderbouwen, met hun frequentie. Voedt
  -- opportunitytype 6.
  sources         jsonb not null default '[]'::jsonb,
  computed_at     timestamptz not null default now()
);

create unique index if not exists sales_company_scores_key
  on public.sales_company_scores (run_id, company_id, engine);

create index if not exists sales_company_scores_run_idx
  on public.sales_company_scores (run_id, engine, weighted_share desc);

comment on table public.sales_company_scores is
  'De rekensom over sales_mentions, per bedrijf per ronde per engine, plus een '
  'rij engine = alle voor het gecombineerde beeld (plan 7.2 en hoofdstuk 13).';
comment on column public.sales_company_scores.stderr is
  'De onzekerheidsmarge. Een verschil binnen de marge is geen verschil (plan '
  'hoofdstuk 12): dat is de fout die een verkoper voor schut zet.';

-- ── 7. Het kostenlogboek kent de ronde ─────────────────────────────────────
--
-- `ai_calls.sales_market_id` bestaat sinds 0069 en draagt het plafond per markt.
-- De ronde erbij, want bij een hermeting moet te zien zijn wat rónde twee kostte
-- en niet alleen wat de markt in totaal gekost heeft. Zonder deze kolom is de
-- kostprijs per hermeting niet na te rekenen, en juist die bepaalt of
-- structureel hermeten uit kan (plan hoofdstuk 21).
alter table public.ai_calls
  add column if not exists sales_run_id uuid references public.sales_runs (id) on delete set null;

create index if not exists ai_calls_sales_run_idx
  on public.ai_calls (sales_run_id)
  where sales_run_id is not null;

comment on column public.ai_calls.sales_run_id is
  'Bij welke meetronde hoort deze aanroep (migratie 0071). Naast sales_market_id, '
  'want de kostprijs per hermeting bepaalt of structureel hermeten uit kan.';

-- ── 8. Een taak mag ook aan een RONDE hangen ───────────────────────────────
--
-- Zelfde redenering als `sales_market_id` in 0070: een meettaak hangt aan een
-- ronde. De markt blijft erbij staan, want daar hangt het plafond aan.
alter table public.jobs
  add column if not exists sales_run_id uuid references public.sales_runs (id) on delete cascade;

create index if not exists jobs_sales_run_idx
  on public.jobs (sales_run_id)
  where sales_run_id is not null;

comment on column public.jobs.sales_run_id is
  'Bij welke meetronde hoort deze taak (migratie 0071). Naast sales_market_id: de '
  'markt draagt het plafond, de ronde draagt de voortgang.';

-- ── 9. RLS: select-only, alleen voor sales ─────────────────────────────────
--
-- Zelfde regel als in 0068 en 0069. Schrijven loopt uitsluitend via de
-- service-role key met een expliciete rechtencontrole (conventie 6), en `to
-- authenticated` staat er verplicht bij (zie migratie 0042 voor waarom).
alter table public.sales_runs enable row level security;
drop policy if exists sales_runs_select_sales on public.sales_runs;
create policy sales_runs_select_sales on public.sales_runs
  for select to authenticated using (public.is_sales());

alter table public.sales_questions enable row level security;
drop policy if exists sales_questions_select_sales on public.sales_questions;
create policy sales_questions_select_sales on public.sales_questions
  for select to authenticated using (public.is_sales());

alter table public.sales_answers enable row level security;
drop policy if exists sales_answers_select_sales on public.sales_answers;
create policy sales_answers_select_sales on public.sales_answers
  for select to authenticated using (public.is_sales());

alter table public.sales_mentions enable row level security;
drop policy if exists sales_mentions_select_sales on public.sales_mentions;
create policy sales_mentions_select_sales on public.sales_mentions
  for select to authenticated using (public.is_sales());

alter table public.sales_company_scores enable row level security;
drop policy if exists sales_company_scores_select_sales on public.sales_company_scores;
create policy sales_company_scores_select_sales on public.sales_company_scores
  for select to authenticated using (public.is_sales());
