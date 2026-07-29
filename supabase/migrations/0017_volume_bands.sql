-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — eerlijk volumecijfer (optimalisatie.md 2.6)
-- Migratie 0017: van een verzonnen getal 0-100 naar drie banden.
--
-- `volume_estimate` is een gok van het model op een schaal van 0 tot 100 — de
-- code in prompts.ts zegt dat er zelf bij ("Dit is een schatting, geen echte
-- index") — en dat getal ging vermenigvuldigd het dashboard op als "Gewogen
-- zichtbaarheid". Het verschil tussen 62 en 68 bestaat niet; de berekening deed
-- alsof, en de klant zag een cijfer met twee cijfers achter de komma.
--
-- We houden `volume_estimate` (audit-trail: dít gaf het model terug), maar de
-- WEGING en de WEERGAVE lopen voortaan over de band.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.prompts
  -- 'hoog' | 'midden' | 'laag'. Nullable voor rijen van vóór deze migratie;
  -- de code valt dan terug op de omzetting van volume_estimate.
  add column volume_band text,
  -- 'geschat' (door het model) of 'klant' (handmatig bijgesteld). Zodra de klant
  -- de band aanpast, mag een volgende kalibratie hem niet overschrijven — hij
  -- weet beter dan het model welke vragen zijn omzet opleveren.
  add column volume_source text not null default 'geschat';

alter table public.prompts
  add constraint prompts_volume_band_check
    check (volume_band is null or volume_band in ('hoog', 'midden', 'laag')),
  add constraint prompts_volume_source_check
    check (volume_source in ('geschat', 'klant'));

-- Backfill met dezelfde grenzen als lib/pipeline/volume.ts (60 en 25). Bewust
-- vaste grenzen en geen verdeling op rangorde: staan alle vragen van een analyse
-- laag op de schaal, dan hóren ze allemaal in 'laag' te vallen.
update public.prompts
set volume_band = case
    when volume_estimate is null then 'midden'
    when volume_estimate >= 60   then 'hoog'
    when volume_estimate >= 25   then 'midden'
    else                              'laag'
  end
where volume_band is null;

create index prompts_volume_band_idx on public.prompts (analysis_id, volume_band);
