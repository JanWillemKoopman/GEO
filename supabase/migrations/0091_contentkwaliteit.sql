-- 0091: het kwaliteitsraamwerk voor content
--
-- ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
--
-- docs/tasks/contentkwaliteit-framework.md. Een pagina had drie cijfers
-- (`quality_score`, `geo_score`, `coverage_score`) en één boolean
-- (`needs_review`) die vier verschillende dingen tegelijk betekende. Wat er
-- niet was: een reden, een zekerheid, een blokkade, een geschiedenis per ronde
-- en een menselijke meetlat.
--
-- Gemeten op productie, 2 september 2026, over de zeven pagina's die de nieuwe
-- pijplijn schreef: contractdekking 86 tot 98 procent, bronherleidbaarheid 28
-- tot 39 procent, 45 tot 96 losse opmerkingen per pagina, en alle zeven op
-- `ready` met `needs_review`. De app schreef dus zelf tientallen redenen op
-- waarom een pagina niet af was, en bood hem aan als af.
--
-- ── DE ZES KOLOMMEN OP content_pieces ───────────────────────────────────────
--
-- `quality_json`: de volledige evaluatie. Dimensiescores, alle bevindingen als
-- getypeerde objecten (dimensie, ernst, sectie, bewijs, verwachting,
-- aanbeveling, blokkerend, zekerheid, ketenfase), de blokkades en de
-- root-cause-analyse. Dit is wat "waarom is deze pagina goed of niet" opzoekbaar
-- maakt. `review_notes` blijft daarnaast staan en blijft gevuld met dezelfde
-- soort zinnen als voorheen, want zes schermen lezen die kolom.
--
-- `quality_verdict`: 'pass', 'repair' of 'block'. Bewust naast `needs_review` en
-- niet in plaats daarvan: die boolean staat in de klantschermen, in `lib/work.ts`
-- en in de eindpoort, en een pagina van vóór deze migratie moet blijven werken.
--
-- `quality_confidence`: hoe zeker de app van haar eigen oordeel is, 0 tot 100.
-- Zonder deze kolom is een gevallen beoordelaar niet te onderscheiden van een
-- geslaagde keuring, en dat is precies de stilte die scenario 11 van de opdracht
-- verbiedt.
--
-- `weighted_evidence_coverage` en `critical_evidence_coverage`: de bewijsdekking
-- gewogen naar het belang van de sectie, en de dekking van alleen de
-- kernsecties. Naast en niet in plaats van `input_coverage` (0087): die is
-- ongewogen en die reeks moet vergelijkbaar blijven.
--
-- `quality_profile`: welk kwaliteitsprofiel gewogen heeft. Nodig omdat de
-- drempels per contenttype verschillen en nog niet geijkt zijn: verandert een
-- profiel later, dan moet het cijfer van vandaag nog navertelbaar zijn.
--
-- ── content_quality_runs ────────────────────────────────────────────────────
--
-- Eén rij per beoordeling per ronde. Dit is wat "versie 2 blijft de beste"
-- opzoekbaar maakt (punt 20 van de opdracht): de scores per ronde stonden alleen
-- in `critique_raw_json` als ongestructureerde blob, dus de vergelijking was wel
-- gemaakt maar nergens terug te vinden.
--
-- Dezelfde tabel levert de benchmarkdata: twintig pagina's of duizend maakt geen
-- verschil, want het zijn rijen en geen structuur.
--
-- ── content_quality_reviews ─────────────────────────────────────────────────
--
-- De MENSELIJKE beoordeling en de gouden referentie (punt 11, 12 en 13 van de
-- opdracht, plus herstelplan T2). Voor de meting bestaat `eval:mention`; voor
-- het schrijven, het duurste onderdeel van de app, bestond niets, en daardoor is
-- elke wijziging aan de schrijfinstructie een gok met een verhaal eromheen.
--
-- ⚠️ Er komt bewust GEEN aparte benchmarktabel voor merken, clusters en
-- pagina's. Merk is `profiles`, cluster is `analyses`, pagina is
-- `content_pieces`. Een vierde structuur ernaast zou een tweede bron van
-- waarheid zijn en dat is precies wat het raamwerk moet voorkomen. Een
-- benchmark is een LABEL op bestaande rijen: `benchmark_set`.
--
-- `reference_markdown` is de gouden referentie: de versie zoals een mens hem
-- zou schrijven. Optioneel, want niet elke pagina krijgt er een, en nadrukkelijk
-- geen "enige juiste tekst" maar een meetlat.
--
-- Additief en idempotent (conventie 4): geen bestaande rij verandert, geen
-- enkele kolom verdwijnt, en alle nieuwe kolommen mogen NULL zijn.

alter table public.content_pieces
  add column if not exists quality_json jsonb,
  add column if not exists quality_verdict text,
  add column if not exists quality_confidence numeric(5,2),
  add column if not exists weighted_evidence_coverage numeric(5,2),
  add column if not exists critical_evidence_coverage numeric(5,2),
  add column if not exists quality_profile text;

comment on column public.content_pieces.quality_json is
  '(0091) De volledige kwaliteitsevaluatie: dimensiescores, getypeerde bevindingen, blokkades en root cause. Zie lib/pipeline/quality-score.ts. review_notes blijft daarnaast bestaan voor de schermen.';

comment on column public.content_pieces.quality_verdict is
  '(0091) pass | repair | block. NULL = beoordeeld vóór deze migratie. block betekent: ORBIT ENGINE noemt deze pagina niet klaar; de klant kan hem wel lezen, bewerken en zelf publiceren.';

comment on column public.content_pieces.quality_confidence is
  '(0091) Hoe zeker de app van haar oordeel is, 0-100. Daalt zodra een beoordelaar uitvalt of een dimensie niet te bepalen was.';

comment on column public.content_pieces.weighted_evidence_coverage is
  '(0091) Bewijsdekking van de merkgebonden contractsecties, gewogen naar sectiebelang (kern telt 3x, optioneel 1x). Zie lib/pipeline/evidence-weight.ts.';

comment on column public.content_pieces.critical_evidence_coverage is
  '(0091) Dekking van alleen de KERNsecties. NULL = deze pagina heeft er geen. Onder 100 is een blokkade: een pagina waarvan de kern niet waargemaakt kan worden, bereikt zijn doel niet.';

comment on column public.content_pieces.quality_profile is
  '(0091) Welk kwaliteitsprofiel deze pagina gewogen heeft (article|faq|landing|comparison). Nodig om een cijfer navertelbaar te houden nadat een profiel is bijgesteld.';

-- ── De rondegeschiedenis ────────────────────────────────────────────────────

create table if not exists public.content_quality_runs (
  id uuid primary key default gen_random_uuid(),
  content_piece_id uuid not null references public.content_pieces(id) on delete cascade,
  analysis_id uuid references public.analyses(id) on delete cascade,
  -- 0 = het eerste concept, 1 tot 3 = de reparatierondes.
  repair_round integer not null default 0,
  quality_profile text,
  score numeric(5,2),
  confidence numeric(5,2),
  verdict text,
  dimensions_json jsonb,
  issues_json jsonb,
  root_cause_json jsonb,
  blocking_count integer not null default 0,
  issue_count integer not null default 0,
  -- Is de tekst van DEZE ronde bewaard, of bleef een eerdere versie staan?
  retained boolean not null default false,
  word_count integer,
  -- Wat deze ronde aan AI-kosten opleverde, in dollar. Best effort.
  cost_usd numeric(10,6),
  created_at timestamptz not null default now()
);

create unique index if not exists content_quality_runs_piece_round_idx
  on public.content_quality_runs (content_piece_id, repair_round);

create index if not exists content_quality_runs_analysis_idx
  on public.content_quality_runs (analysis_id);

alter table public.content_quality_runs enable row level security;

comment on table public.content_quality_runs is
  '(0091) Eén rij per kwaliteitsbeoordeling per reparatieronde. Maakt "welke versie was de beste en waarom" opzoekbaar, en levert de benchmarkdata. Nul policies: alleen de service-role, net als jobs.';

-- ── De menselijke meetlat en de gouden referentie ───────────────────────────

create table if not exists public.content_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  content_piece_id uuid not null references public.content_pieces(id) on delete cascade,
  -- Wie er keek. Een auth-gebruiker, of NULL bij een import uit een oudere ronde.
  reviewer_id uuid,
  reviewer_name text,
  -- Waar deze beoordeling bij hoort. NULL = losse beoordeling, geen benchmark.
  benchmark_set text,
  -- De zes maten uit punt 11 van de opdracht, elk 1 tot 5. NULL = niet beoordeeld.
  copywriter_equivalence smallint,
  company_specificity smallint,
  generic_ai_feel smallint,
  persuasiveness smallint,
  brand_representation smallint,
  -- Hoeveel handmatige correctie er nodig is: geen | licht | zwaar | opnieuw.
  correction_effort text,
  -- De vraag die de eigenaar zelf stelt: zou je dit zonder aanpassing versturen?
  would_send boolean,
  -- Wat er als eerste veranderd moet worden, in de woorden van de beoordelaar.
  first_thing_to_change text,
  notes text,
  -- De GOUDEN REFERENTIE: hoe een mens deze pagina geschreven zou hebben.
  -- Optioneel en nadrukkelijk geen "enige juiste tekst", maar een meetlat.
  reference_markdown text,
  reference_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_quality_reviews_piece_idx
  on public.content_quality_reviews (content_piece_id);

create index if not exists content_quality_reviews_set_idx
  on public.content_quality_reviews (benchmark_set);

alter table public.content_quality_reviews enable row level security;

comment on table public.content_quality_reviews is
  '(0091) Menselijke beoordeling van een gegenereerde pagina, plus een optionele gouden referentie. Groepeerbaar met benchmark_set. Nul policies: alleen de service-role; dit is intern materiaal en geen klantdata.';

comment on column public.content_quality_reviews.benchmark_set is
  '(0091) Label dat losse beoordelingen tot een benchmark maakt, bijvoorbeeld "start-20". Bewust een label en geen aparte tabel: merk is profiles, cluster is analyses, pagina is content_pieces.';

comment on column public.content_quality_reviews.reference_markdown is
  '(0091) De menselijke referentieversie. Geen norm maar een meetlat: waar wijkt de AI-versie van af, en hoeveel correctie kostte dat.';
