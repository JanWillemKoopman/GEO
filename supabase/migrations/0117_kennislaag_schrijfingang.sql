-- 0117: de schrijfingang van de kennislaag (docs/tasks/van-pijplijn-naar-kennissysteem.md, K2)
--
-- Drie aanvullingen op 0116, alle drie nodig voor `lib/kennis/vastleggen.ts`:
--
-- 1. Afwijzen. `wijsAf()` ("dit klopt niet", K7) moet een item uit blok A halen
--    zonder het te verwijderen (§6.1: nooit verwijderen). `vervangen_door` past
--    niet: er is geen nieuwere versie. Twee kolommen: wie en wanneer.
--
-- 2. Een model-item bevestigen. 0116 verbood `bron = 'ai'` samen met de status
--    bevestigd. Dat was te streng: §6.1 en K7 laten de consultant juist een
--    afgeleid item bevestigen ("we denken", met de knop bevestigen). De bron
--    blijft dan eerlijk 'ai' (daar kwam de bewering vandaan), en
--    `bevestigd_door` zegt welke mens ervoor instaat. Wat blijft staan: een model
--    VERKLAART nooit iets namens de klant. De constraint wordt daarom vervangen
--    door een smallere; de tabel was bij het toepassen leeg, dus geen rij kan
--    hierdoor van betekenis veranderen. Dat `drop constraint` is geen
--    verwijdering van data (conventie 4), en `if exists` houdt het herhaalbaar.
--
-- 3. Conflicten op de kennislaag (besluit V14). De code herkent een botsing
--    (zelfde soort, zelfde geldigheid, andere waarde; `vindKandidaten()`) en zet
--    hem op de bestaande conflictlijst. `fact_conflicts.feit_ids` wijst naar
--    `brand_facts`; een kennisconflict krijgt daar een lege lijst en zijn eigen
--    verwijzingen in `kennis_ids`. De oude lezers kijken alleen naar rijen zonder
--    `kennis_ids`, zodat hun gedrag niet verandert.

alter table public.klantkennis
  add column if not exists afgewezen_door uuid references auth.users (id) on delete set null,
  add column if not exists afgewezen_op   timestamptz;

alter table public.klantkennis drop constraint if exists klantkennis_ai_niet_verklaard_check;
do $$ begin
  alter table public.klantkennis add constraint klantkennis_ai_verklaart_niet_check check (
    not (bron = 'ai' and status = 'verklaard'));
exception when duplicate_object then null; end $$;

-- Afwijzen is een handeling van een mens, net als bevestigen.
do $$ begin
  alter table public.klantkennis add constraint klantkennis_afgewezen_door_mens_check check (
    afgewezen_op is null or afgewezen_door is not null);
exception when duplicate_object then null; end $$;

-- Een afgewezen item houdt zijn ontdubbelsleutel. Dat is bewust: komt dezelfde
-- bewering bij een volgende onderzoeksronde terug, dan herkent `legVast()` hem
-- als eerder afgewezen en legt hem niet opnieuw vast. Een verbeterde versie komt
-- er via `vervang()`, door een mens.

alter table public.fact_conflicts
  add column if not exists kennis_ids uuid[];

create index if not exists fact_conflicts_kennis_idx
  on public.fact_conflicts (profile_id)
  where kennis_ids is not null;

comment on column public.fact_conflicts.kennis_ids is
  'De twee botsende items in klantkennis (K2, besluit V14). NULL bij een conflict '
  'tussen twee brand_facts; dan staan die in feit_ids.';
