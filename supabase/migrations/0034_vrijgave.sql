-- ═══════════════════════════════════════════════════════════════════════════
-- 0034 — Vrijgave: heeft er ooit iemand naar deze pagina gekeken? (S6)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- `content_pieces.needs_review` betekent twee verschillende dingen tegelijk, en
-- die twee zijn niet uit elkaar te houden:
--
--   1. "de controles vonden niets"  — automatisch gezet door de kwaliteitspoort
--   2. "een mens heeft gekeken"     — de klant drukte op de knop
--
-- In de contentronde van 31 juli kwamen alle tien de pagina's op `status:
-- 'ready'`. Eén daarvan had vijf concrete verbeterpunten van de eigen redactie
-- in `review_notes` staan, waaronder "het directe antwoord op de hoofdvraag is
-- niet expliciet genoeg in de eerste twee zinnen" — en stond desondanks in de
-- bibliotheek als "klaar om te publiceren".
--
-- S6 loste dat op met het vrijgavepaneel, maar zónder deze kolommen kon het
-- alleen `needs_review` op false zetten. Gevolg: een pagina die de poort schoon
-- passeert wordt automatisch als in orde geboekt, en er is geen manier om te
-- zien dat er nooit iemand naar gekeken heeft. Precies het onderscheid dat het
-- paneel wilde maken.
--
-- WAAROM DEZE OPLOSSING
--
-- Twee kolommen in plaats van een extra statuswaarde. `content_status` is een
-- Postgres-enum; een waarde `te_beoordelen` toevoegen betekent dat elke plek
-- die op status filtert mee moet veranderen (de pollroute, de bibliotheek,
-- planContentDraft, runBriefing, draftContentPiece). Dat is veel bewegende
-- delen voor iets wat een tijdstempel ook kan dragen.
--
-- `reviewed_at` is bovendien rijker dan een status: het zegt WANNEER, en samen
-- met `reviewed_by` ook DOOR WIE. Daarmee wordt "3 van je 8 pagina's heeft nog
-- nooit iemand bekeken" een vraag die je kunt beantwoorden.
--
-- Nullable en zonder default: onbekend is een betere waarde dan een verkeerde
-- (status-doorontwikkeling.md §2.4). Alle bestaande pagina's krijgen `null` —
-- en dat is de waarheid, want er is inderdaad nog nooit iemand langs geweest.
-- Ze op `now()` zetten zou een controle suggereren die nooit heeft
-- plaatsgevonden, en dat is precies het soort stille onwaarheid dat dit hele
-- traject probeert uit te bannen.

alter table public.content_pieces
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

comment on column public.content_pieces.reviewed_at is
  'Wanneer een mens deze pagina heeft vrijgegeven (S6). NULL = nog nooit bekeken; '
  'dat is iets anders dan needs_review = false, wat de poort ook automatisch zet.';

comment on column public.content_pieces.reviewed_by is
  'Wie de pagina heeft vrijgegeven (S6).';

-- Waar de bibliotheek op filtert: "welke pagina's wachten nog op een blik?".
-- Partieel, want de rijen die er al langs zijn hoeven niet in de index.
create index if not exists content_pieces_unreviewed_idx
  on public.content_pieces (analysis_id)
  where reviewed_at is null;

-- ── Controle ────────────────────────────────────────────────────────────────
select
  count(*) as pagina_s,
  count(*) filter (where reviewed_at is null) as nooit_bekeken
from public.content_pieces;
