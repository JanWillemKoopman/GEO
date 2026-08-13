-- 0057: de potentiescore, zoekvolume-helft
--
-- Uitvoering van docs/tasks/potentiescore.md. Twee kolommen op `profile_topics`:
-- het onderwerp is de natuurlijke eenheid, want één analyse hoort al bij precies
-- één onderwerp (`profile_topics.analysis_id`), dus "per analyse" en "per
-- onderwerp" zijn hetzelfde ding.
--
-- `search_volume_index` is NOOIT de ruwe uitkomst van één AI-aanroep. Hij komt
-- van `recalibrateSearchVolume()` (lib/pipeline/search-demand.ts), die ALLE
-- onderwerpen van een merk in één aanroep tegen elkaar afzet en herschrijft
-- zodra er een nieuw onderwerp bijkomt. Dat is het verschil met de oude,
-- teruggedraaide aanpak uit migratie 0017 (drie banden, omdat een los getal per
-- analyse geen vergelijkbare betekenis had): dit getal is pas vergelijkbaar
-- NADAT de code het over de hele portefeuille van dit merk heeft afgezet, dus
-- het mag als index getoond worden.
--
-- Additief en idempotent, conventie 4.

alter table public.profile_topics
  add column if not exists search_volume_index integer,
  add column if not exists search_volume_reasoning text;

comment on column public.profile_topics.search_volume_index is
  'Hoe vaak dit onderwerp gezocht wordt, 0-100, herberekend over ALLE onderwerpen van dit merk
  tegelijk (recalibrateSearchVolume). Null = nog geen herberekening geweest. Nooit de ruwe
  uitkomst van één op zichzelf staande AI-aanroep, altijd het resultaat van de profielbrede
  herkalibratie, zie docs/tasks/potentiescore.md.';
comment on column public.profile_topics.search_volume_reasoning is
  'Eén zin van het model over waarom dit onderwerp op deze index staat. Audit-trail én de tekst
  die de tooltip in de app vult.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profile_topics_search_volume_index_check') then
    alter table public.profile_topics
      add constraint profile_topics_search_volume_index_check
      check (search_volume_index is null or (search_volume_index between 0 and 100));
  end if;
end $$;
