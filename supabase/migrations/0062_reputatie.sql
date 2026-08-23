-- ═══════════════════════════════════════════════════════════════════════════
-- 0062 · Mijn reputatie: hoe AI over een merk praat, per dienst en tegenover
--        de concurrenten
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT DIT TOEVOEGT
--
-- Vijf tabellen plus één kolom op `ai_calls`. Het volledige ontwerp staat in
-- `docs/tasks/mijn-reputatie.md`, §6.
--
-- WAAROM DIT EEN EIGEN DATAMODEL KRIJGT EN GEEN KOLOM OP `tracking_runs`
--
-- De meting beantwoordt "word je genoemd bij een koopvraag". Dit beantwoordt
-- "hoe wordt er over je gepraat, en kiest AI jou of je concurrent". Dat is een
-- ander soort uitkomst: geen percentage over 30 vragen, maar een toon, een
-- bewijskracht en een plaats van een aantal. De klant koopt het bovendien apart,
-- dus het moet los te starten, los te dateren en los af te rekenen zijn.
--
-- ⚠️ SENTIMENT IS HIER AL EENS GEMETEN EN LEVERDE NIETS OP
--
-- Tot migratie 0029 mat elke meting `sentiment` per vermelding. Na 650 gemeten
-- rijen kwam `negative` geen enkele keer voor. De reden staat in §2.1 van het
-- plan: die 650 rijen waren antwoorden op KOOPVRAGEN, en daar noemt een
-- assistent bedrijven neutraal in op. Er zat geen oordeel in, dus viel er geen
-- oordeel uit te lezen.
--
-- Dit onderdeel vraagt er rechtstreeks naar, en vraagt bewust ook naar de andere
-- kant ("waar klagen klanten over"). Dat het dáármee wél variatie oplevert is
-- een aanname, en die aanname krijgt een vangnet in dit schema in plaats van in
-- een prompt: `evidence_score` staat naast `tone_index`, en een antwoord zonder
-- controleerbare bron telt niet mee in het merkcijfer. Een gerustgesteld bedrijf
-- dat onzichtbaar is, is de gevaarlijkste uitkomst die dit product kan geven.
--
-- ⚠️ NULL IS HIER GEEN LUIHEID MAAR DE KERN (conventie 3)
--
-- `tone_index` is `null` als er geen oordeel te vellen viel. Nul betekent
-- neutraal, en dat is iets anders. `rank_score` is `null` bij minder dan twee
-- bekende partijen, want eerste van één is geen uitslag. Een klant die het model
-- niet in de volgorde zette krijgt geen laatste plaats maar geen plaats.
--
-- ADDITIEF EN IDEMPOTENT (conventie 4). Geen enkele `drop table`, geen enkele
-- `drop column`. De `drop policy if exists` hieronder is de bestaande vorm uit
-- 0038, 0049 en 0056: een policy opnieuw definiëren kan niet zonder hem eerst
-- weg te halen.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. `reputation_runs`, één rij per analyse ──────────────────────────────
create table if not exists public.reputation_runs (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  -- Welke AI-assistent. Vandaag alleen ChatGPT (§12), maar de enginelaag bestaat
  -- al, dus Gemini erbij is later een tweede waarde en geen herbouw.
  engine            text not null default 'openai',
  -- 'standaard' meet tot 12 aanbodknopen, 'diep' tot 25 met herhalingen (§2.3).
  depth             text not null default 'standaard',
  status            text not null default 'queued',
  started_by        uuid references auth.users (id),
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,

  -- ── De vier getallen van §3.1 ────────────────────────────────────────────
  -- ⚠️ Alle vier nullable, en dat is de belangrijkste eigenschap van deze tabel.
  tone_index        numeric,   -- -100 tot 100. null = geen oordeel te vellen
  evidence_score    numeric,   -- 0 tot 100. 0 IS een uitkomst: AI verzint het
  consistency       numeric,   -- 0 tot 100, alleen bij herhalingen (diepe modus)
  rank_score        numeric,   -- 0 tot 100, de vergelijking uit §4.4
  rank_position     numeric,   -- de gemiddelde plaats, bijvoorbeeld 2,3
  rank_of           int,       -- van hoeveel partijen

  -- ⚠️ Standaard `true`, en hij gaat pas op `false` als er genoeg rotaties onder
  -- liggen én het gemeten volgorde-effect binnen de verwachting valt. De veilige
  -- kant is "dit is een indicatie": een plaats die stelliger op het scherm staat
  -- dan hij is, is precies de fout die dit onderdeel probeert te vermijden.
  rank_indicative   boolean not null default true,

  -- Tegen wie er vergeleken is. Eén vaste set voor de hele run: zou de set per
  -- aanbodknoop verschillen, dan is "je wint bij onderhoud en verliest bij
  -- nieuwbouw" geen uitspraak meer.
  rivals            text[] not null default '{}',
  wins_on           text[] not null default '{}',
  loses_on          text[] not null default '{}',

  -- Het GEMETEN volgorde-effect (§4.4, maatregel 4): hoe vaak werd de
  -- eerstgenoemde partij ook als eerste geplaatst? Bij vier partijen is 25% de
  -- verwachting. null = te weinig vergelijkingen om het vast te stellen.
  order_bias        numeric,

  summary           text,
  strengths         text[] not null default '{}',
  weaknesses        text[] not null default '{}',

  questions_planned int not null default 0,
  questions_done    int not null default 0,
  cost_usd          numeric(10,6) not null default 0,
  -- Het plafond dat voor DEZE run gold, in euro. Meebewaren en niet uit een
  -- constante lezen: verandert het plafond later, dan moet een oude run nog
  -- steeds uit te leggen zijn.
  budget_eur        numeric not null default 3,

  -- Welke knopen en welke concurrenten meegingen, en waarom. Zonder dit is een
  -- herhaling over drie maanden niet met deze te vergelijken: dan weet niemand
  -- meer of het verschil in de reputatie zat of in de vraag.
  scope_json        jsonb,
  -- Wat er overgeslagen is, en waarom. Overslaan is een uitkomst, geen stilte.
  notes             text[] not null default '{}',
  created_at        timestamptz not null default now()
);

comment on column public.reputation_runs.tone_index is
  'Toon -100..100. NULL = onbekend, en dat is iets anders dan 0 (neutraal).';
comment on column public.reputation_runs.rank_indicative is
  'Rust de plaats op te weinig rotaties of op een te groot volgorde-effect?';

create index if not exists reputation_runs_profile_idx
  on public.reputation_runs (profile_id, started_at desc);

-- ── 2. `reputation_answers`, één rij per gestelde vraag ────────────────────
--
-- Draagt zowel het ruwe antwoord als het oordeel, net als `tracking_runs` dat
-- doet met `raw_response` en `mention_json`. Reden: het maakt de beoordeling
-- opnieuw te proberen ZONDER de dure vraag opnieuw te stellen, en dat is bij de
-- meting de belangrijkste kostenbescherming gebleken.
create table if not exists public.reputation_answers (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.reputation_runs (id) on delete cascade,
  block         text not null,          -- 'merk' | 'aanbod' | 'vergelijking' | 'bron'
  offering_id   uuid references public.profile_offerings (id) on delete set null,
  question      text not null,
  web_search    boolean not null default false,
  -- Onderscheidt de rotaties van de vergelijking: drie rotaties zijn drie rijen
  -- en geen duplicaat.
  repeat_index  int not null default 0,

  answer_text   text,
  raw_json      jsonb,
  cited_urls    text[] not null default '{}',

  -- ⚠️ Geen administratie. Zonder deze kolom is achteraf niet vast te stellen of
  -- een uitslag door de volgorde kwam, en dan is `order_bias` niet te berekenen
  -- en de hele vergelijking niet te controleren.
  party_order   text[] not null default '{}',

  -- null = de beoordeling is nog niet gelukt en mag opnieuw, zonder dat de dure
  -- vraag opnieuw gesteld wordt.
  verdict_json  jsonb,
  tone          text,
  tone_score    int,
  pros          text[] not null default '{}',
  cons          text[] not null default '{}',
  grounding     text,
  mentions_brand boolean,

  model         text,
  cost_usd      numeric(10,6) not null default 0,
  created_at    timestamptz not null default now()
);

-- De idempotentie (conventie 9): een taak die twee keer draait stelt de vraag
-- één keer. Een unieke index en geen constraint, want `offering_id` mag null
-- zijn en Postgres telt twee nullen niet als gelijk. Vandaar de coalesce naar
-- een vaste uuid voor het merkbrede geval.
create unique index if not exists reputation_answers_uniek
  on public.reputation_answers (
    run_id, block, coalesce(offering_id, '00000000-0000-0000-0000-000000000000'::uuid),
    md5(question), repeat_index
  );

create index if not exists reputation_answers_run_idx
  on public.reputation_answers (run_id, block);

-- ── 3. `reputation_ranks`, één rij per partij per criterium ────────────────
--
-- De enige tabel met een rij per partij, want dit is het enige onderdeel waarin
-- de klant niet alleen op zichzelf beoordeeld wordt.
create table if not exists public.reputation_ranks (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.reputation_runs (id) on delete cascade,
  answer_id    uuid not null references public.reputation_answers (id) on delete cascade,
  offering_id  uuid references public.profile_offerings (id) on delete set null,
  -- Vast en niet vrij: liet je het model zelf criteria bedenken, dan levert elke
  -- run andere assen op en is geen enkele herhaling nog iets waard. Dezelfde
  -- reden waarom `mention_role` een enum is en geen vrije tekst.
  criterion    text not null,  -- dienstverlening|kwaliteit|prijs_kwaliteit|betrouwbaarheid
  -- ⚠️ Staat NAAST `entity_id`, om dezelfde reden als `offering_name`: een
  -- entiteit kan later hernoemd of samengevoegd worden, en dan moet nog steeds
  -- na te lezen zijn welke naam de vraag in ging.
  party_name   text not null,
  entity_id    uuid references public.entities (id) on delete set null,
  is_own_brand boolean not null default false,

  -- null als het model de partij niet kende. Niet "laatste": geen oordeel is
  -- iets anders dan een slecht oordeel.
  position     int,
  -- ⚠️ Per RIJ en niet per run, met opzet. Kende het model bij prijs-kwaliteit
  -- maar drie van de vier partijen, dan is een tweede plaats daar iets anders
  -- waard dan een tweede plaats van vier. Zonder deze kolom is dat verschil weg
  -- en rekent de score de klant rijk of arm.
  of_parties   int not null default 0,
  known        boolean not null default false,

  reason       text,
  sources      text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists reputation_ranks_run_idx
  on public.reputation_ranks (run_id, criterion);

-- ── 4. `reputation_offering_scores`, één rij per aanbodknoop ───────────────
create table if not exists public.reputation_offering_scores (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.reputation_runs (id) on delete cascade,
  offering_id     uuid references public.profile_offerings (id) on delete set null,
  -- ⚠️ Staat NAAST `offering_id`, met opzet. Een herhaalonderzoek kan de
  -- aanbodboom herschrijven en dan wijst het id nergens meer heen. De naam
  -- bewaart wat er gemeten is.
  offering_name   text not null,
  offering_kind   text,

  tone_index      numeric,
  evidence_score  numeric,
  answers         int not null default 0,

  rank_score      numeric,
  rank_position   numeric,
  rank_of         int,
  rank_indicative boolean not null default true,
  wins_on         text[] not null default '{}',
  loses_on        text[] not null default '{}',

  summary         text,
  top_pros        text[] not null default '{}',
  top_cons        text[] not null default '{}',
  source_domains  text[] not null default '{}',
  -- Uit de bestaande meting, als die er is. Nul extra kosten, en het is de zin
  -- die de klant het langst onthoudt: "je wordt bij 8 van de 30 vragen genoemd,
  -- en als je genoemd wordt is de toon positief".
  visibility_score numeric,
  created_at      timestamptz not null default now()
);

create unique index if not exists reputation_offering_scores_uniek
  on public.reputation_offering_scores (run_id, offering_name);

-- ── 5. `reputation_sources`, waar AI het vandaan haalt ─────────────────────
create table if not exists public.reputation_sources (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references public.reputation_runs (id) on delete cascade,
  domain           text not null,
  kind             text not null default 'overig',  -- review|vakpers|eigen|sociaal|register|overig
  citations        int not null default 0,
  url              text,
  rating           numeric,
  rating_count     int,
  -- ⚠️ Een reviewcijfer uit een AI-antwoord is een gok tot het bewezen is. Deze
  -- vlag gaat alleen op `true` als de eigen crawler de pagina ophaalde en er
  -- JSON-LD met `aggregateRating` op stond (§2.4). Anders staat er onbevestigd
  -- bij, zichtbaar op het scherm.
  verified         boolean not null default false,
  first_seen_block text,
  created_at       timestamptz not null default now()
);

create unique index if not exists reputation_sources_uniek
  on public.reputation_sources (run_id, domain);

-- ── 6. De kolom op `ai_calls` ──────────────────────────────────────────────
--
-- Zonder deze kolom is niet te tellen wat één run heeft gekost, en dan is het
-- plafond van €3 niet af te dwingen. Migratie 0053 deed hetzelfde met
-- `account_id`, met dezelfde onderbouwing: een logboek hoort de dimensie te
-- dragen waarop je afrekent.
alter table public.ai_calls
  add column if not exists reputation_run_id uuid
    references public.reputation_runs (id) on delete set null;

create index if not exists ai_calls_reputation_run_idx
  on public.ai_calls (reputation_run_id);

-- ── 7. RLS: lezen mag, schrijven nooit vanaf de client ─────────────────────
--
-- SELECT-only, volgens hetzelfde patroon als `profile_offerings` (0056 heeft de
-- accountlaag via `readable_profile_ids()`, 0038 de beheerderslaag die daar al
-- in verwerkt zit). Schrijven gaat uitsluitend via de service-role key in de
-- API-route en de jobhandlers (conventie 6).
alter table public.reputation_runs enable row level security;
alter table public.reputation_answers enable row level security;
alter table public.reputation_ranks enable row level security;
alter table public.reputation_offering_scores enable row level security;
alter table public.reputation_sources enable row level security;

drop policy if exists reputation_runs_select on public.reputation_runs;
create policy reputation_runs_select on public.reputation_runs
  for select using (profile_id in (select public.readable_profile_ids()));

-- De vier kindtabellen hangen aan de run en niet aan het merk. Eén subquery per
-- tabel, met dezelfde hulpfunctie eronder, zodat een vierde toegangslaag ooit op
-- één plek verandert.
do $$
declare
  t text;
begin
  foreach t in array array[
    'reputation_answers', 'reputation_ranks',
    'reputation_offering_scores', 'reputation_sources'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select using ('
      || 'run_id in (select r.id from public.reputation_runs r '
      || 'where r.profile_id in (select public.readable_profile_ids())))',
      t || '_select', t
    );
  end loop;
end $$;
