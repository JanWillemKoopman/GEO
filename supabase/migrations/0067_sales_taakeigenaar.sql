-- ═══════════════════════════════════════════════════════════════════════════
-- 0067 · Een taak mag ook aan een MARKT hangen
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HIER MISGING, EN HOE HET GEVONDEN IS
--
-- Migratie `0013` legde vast: "Een taak hoort ergens bij: aan een analyse of aan
-- een profiel, nooit aan niets." Dat klopte, en het klopt nog steeds. Alleen
-- bestond er toen nog geen derde soort eigenaar.
--
-- De Sales-module (migraties `0065` en `0066`) plant taken in die bij een MARKT
-- horen. Een markt is geen merk: een prospect is per definitie nog geen klant.
-- De constraint `jobs_has_owner` weigerde die taken daarom, en de ketentest zag
-- dat meteen bij de eerste keer draaien van de keten. Precies waar die test voor
-- is: de fout zat in de SAMENHANG tussen twee onderdelen, niet in één ervan.
--
-- WAAROM EEN DERDE KOLOM EN NIET EEN UITZONDERING OP DE REGEL
--
-- De makkelijke oplossing was de constraint verruimen met "of het type begint
-- met sales". Dat is een uitzondering die niets vastlegt: de taak hangt dan nog
-- steeds aan niets, en niemand kan achteraf vragen wat er voor markt X gedraaid
-- heeft. Met een eigen kolom blijft de regel uit `0013` overeind, wordt hij
-- alleen breder, en is de vraag "welke taken horen bij deze markt" een gewone
-- query in plaats van een zoektocht door jsonb-payloads.
--
-- Additief en idempotent (conventie 4). De constraint wordt VERVANGEN door een
-- ruimere; er wordt geen enkele bestaande rij door geraakt, want elke bestaande
-- taak heeft nog steeds een analyse of een profiel.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.jobs
  add column if not exists sales_market_id uuid
    references public.sales_markets (id) on delete cascade;

create index if not exists jobs_sales_market_idx
  on public.jobs (sales_market_id)
  where sales_market_id is not null;

-- De regel blijft dezelfde en wordt alleen ruimer: een taak hoort ergens bij.
alter table public.jobs
  drop constraint if exists jobs_has_owner;
alter table public.jobs
  add constraint jobs_has_owner check (
    analysis_id is not null or profile_id is not null or sales_market_id is not null
  );

comment on column public.jobs.sales_market_id is
  'Bij welke marktanalyse hoort deze taak (migratie 0066). De derde soort eigenaar '
  'naast analysis_id en profile_id; een markt is geen merk.';
