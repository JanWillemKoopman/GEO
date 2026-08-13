-- 0058: citatiepercentage per concurrent
--
-- `visibility_scores.citation_count` bestaat al voor het eigen merk sinds migratie
-- 0029 (measure.ts kent het echte domein uit `profiles.url`, exacte match). Voor
-- een concurrent is nergens een domein geregistreerd, alleen een naam, dus die
-- kolom bleef leeg: "het eigen domein is hier niet van toepassing" stond
-- letterlijk in het commentaar bij de aggregatie.
--
-- `citesOwnSite()` (lib/entities/normalize.ts) lost dat op door het geciteerde
-- domein tegen de merknaam te normaliseren (dezelfde normalisatie als
-- `isSameEntity()`, "coolblue.nl" en "Coolblue" worden allebei "coolblue"), in
-- plaats van een opgeslagen domein te vereisen. `measure.ts` vult deze kolom
-- voortaan bij elke nieuwe aggregatie.
--
-- ⚠️ Bestaande periodes blijven op `null` staan: dit is een AFGELEIDE kolom uit
-- al opgeslagen `tracking_run_mentions.cited_sources` (conventie 8, alles
-- bewaren), maar wordt alleen bijgewerkt op het moment dat `competitor_breakdown`
-- opnieuw wordt weggeschreven, dat is bij de eerstvolgende meting van die
-- analyse. `null` betekent hier dus "nog niet herberekend", niet "geen
-- citaties gevonden": dat verschil moet de UI expliciet houden (conventie 3).
--
-- Additief en idempotent, conventie 4.

alter table public.competitor_breakdown
  add column if not exists citation_count integer;

comment on column public.competitor_breakdown.citation_count is
  'Hoe vaak deze concurrent zijn EIGEN site als bron gebruikt zag, herkend op naam via
  citesOwnSite() (lib/entities/normalize.ts). Null = deze periode is aangemaakt vóór migratie 0058
  of nog niet opnieuw geaggregeerd, niet "geen citaties gevonden". Zie docs/architecture.md,
  "De rangordetabel".';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'competitor_breakdown_citation_count_check') then
    alter table public.competitor_breakdown
      add constraint competitor_breakdown_citation_count_check
      check (citation_count is null or citation_count >= 0);
  end if;
end $$;
