-- ═══════════════════════════════════════════════════════════════════════════
-- 0037 — Winbaarheid is een kans, geen vlag (R7)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- `prompts.brand_eliciting` is tekst met drie waarden: 'ja', 'nee', 'onbekend'.
-- De afleiding (R2.1): 'nee' zodra een vraag in twee opeenvolgende periodes nul
-- aanbieders opleverde.
--
-- De verificatieronde van 31 juli liet zien dat die aanname niet klopt. Van de 8
-- herhaald gemeten vragen veranderde bij 4 de winbaarheid TUSSEN de metingen van
-- dezelfde week:
--
--   Vraag (ingekort)                        meting 1   2   3
--   Hoe kan ik snel een afspraak maken…            0   1   4
--   Waar kan ik in Amersfoort terecht…             0   5   1
--   Welke praktijk biedt ook preventief…           0   5   4
--   Is een persoonlijk behandelplan mogelijk…      0   4   0
--
-- Geen enkele herhaalde vraag was alle drie de keren winbaar. Winbaarheid is dus
-- geen eigenschap van de vraag maar een KANS — en een vlag kan een kans niet
-- dragen.
--
-- Wat dat aanricht: R2.4 slaat een vraag over na twee nulmetingen. Bij een vraag
-- die één op de drie keer wél winbaar is, is de kans om twee keer achter elkaar
-- nul te trekken ongeveer 44%. Die vraag verdwijnt dan permanent uit de meting,
-- en de meetbasis krimpt:
--
--   periode   judged   winbaar   score   stderr
--   0             30        17      18      6,5
--   1             30        11      36     14,8
--   2             21         5      38     21,4
--
-- Bij 5 winbare vragen is de 95%-band ongeveer ±42 punten. De score is dan
-- formeel nog een getal maar zegt niets meer — en de app tekent er een trendlijn
-- op.
--
-- WAAROM DEZE OPLOSSING
--
-- Twee tellers in plaats van een vlag. `elicit_samples` is het aantal keren dat
-- deze vraag beoordeeld is, `elicit_successes` hoe vaak er minstens één
-- aanbieder genoemd werd. Daarmee is de kans te schatten MET een
-- betrouwbaarheidsinterval, en dat interval is het punt: bij 2 metingen weet je
-- vrijwel niets, bij 12 weet je genoeg om een vraag te laten vallen.
--
-- De ondergrens van dat interval (Wilson) wordt de nieuwe overslaanregel: een
-- vraag verdwijnt pas wanneer we met redelijke zekerheid weten dát hij zelden
-- iets oplevert — niet zodra hij twee keer pech had.
--
-- `brand_eliciting` blijft bestaan en blijft gevuld (additief principe,
-- status-doorontwikkeling.md §2.3). Hij wordt voortaan AFGELEID van de kans in
-- plaats van van de laatste twee metingen, zodat alles wat er nu op filtert
-- blijft werken.
--
-- BACKFILL
--
-- De tellers zijn terug te rekenen uit `tracking_runs`: elke beoordeelde meting
-- is een steekproef, elke meting met `brands_in_answer > 0` een succes. Dat is
-- exact dezelfde definitie die R2.2 voor `winnable_runs` gebruikt, dus de
-- backfill kan niet uit de pas lopen met wat de score doet.

alter table public.prompts
  add column if not exists elicit_successes integer not null default 0,
  add column if not exists elicit_samples   integer not null default 0;

comment on column public.prompts.elicit_samples is
  'Hoe vaak deze vraag beoordeeld is (R7). Samen met elicit_successes de schatting '
  'van de kans dat er überhaupt een aanbieder genoemd wordt.';

comment on column public.prompts.elicit_successes is
  'Hoe vaak er bij deze vraag minstens één aanbieder genoemd werd (brands_in_answer > 0).';

-- ── Backfill uit de bestaande metingen ──────────────────────────────────────
--
-- Alleen beoordeelde metingen tellen mee: een mislukte meting zegt niets over de
-- markt, alleen over de aanroep. `brands_in_answer is not null` is precies dat
-- onderscheid (de kolom wordt gevuld ná een geslaagde mention-beoordeling).
with tellingen as (
  select
    r.prompt_id,
    count(*)                                          as samples,
    count(*) filter (where r.brands_in_answer > 0)    as successes
  from public.tracking_runs r
  where r.prompt_id is not null
    and r.brands_in_answer is not null
  group by r.prompt_id
)
update public.prompts p
   set elicit_samples   = t.samples,
       elicit_successes = t.successes
  from tellingen t
 where t.prompt_id = p.id;

-- ── Controle ────────────────────────────────────────────────────────────────
select
  count(*)                                       as vragen,
  count(*) filter (where elicit_samples > 0)     as met_metingen,
  count(*) filter (where elicit_samples >= 3)    as met_drie_of_meer,
  round(avg(elicit_successes::numeric / nullif(elicit_samples, 0)) * 100)::int as gem_kans_pct
from public.prompts;
