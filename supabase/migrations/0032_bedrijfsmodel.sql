-- ═══════════════════════════════════════════════════════════════════════════
-- 0032 — Bedrijfsmodel op het profiel (R8.5, deel van R0.5)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- De contentbriefing stelt vaste vragen per contenttype (contentbriefing.md
-- §3.3). Voor een `landing`-pagina zijn dat er twee die verplicht zijn:
--
--   "Welk telefoonnummer en adres moeten er op deze pagina staan?"
--   "Naar welke pagina moet de knop 'Neem contact op' linken?"
--
-- Voor een lokale onderneming is dat precies de goede vraag. In de contentronde
-- van 31 juli bleek hij voor 3 van de 5 testcases principieel onbeantwoordbaar:
--
--   Bol           43.300 verkooppartners, geen fysieke vestiging
--   Coolblue      22 winkels, geen enkelvoudig "het" adres
--   Van der Valk  100+ zelfstandige hotels, elk met een eigen nummer
--
-- Een verplichte vraag die niet naar waarheid te beantwoorden is, doet precies
-- wat R5 moest voorkomen: hij nodigt uit tot invullen wat niet klopt. Alle drie
-- zijn ze bij die test dan ook bewust overgeslagen — en dat is de goede uitkomst
-- van een vraag die niet gesteld had moeten worden.
--
-- WAAROM DEZE OPLOSSING
--
-- Het onderscheid dat ertoe doet is het BEDRIJFSMODEL, niet de branche: een
-- webshop met eigen producten heeft wél een adres, een marktplaats niet. Vandaar
-- een eigen kolom in plaats van afleiden uit `industry` (vrije tekst, niet
-- betrouwbaar te matchen).
--
-- Nullable en zonder default: onbekend is een betere waarde dan een verkeerde
-- (status-doorontwikkeling.md §2.4). Zolang de waarde null is, gedraagt de
-- briefing zich exact zoals hiervoor — de vragenset verandert alleen wanneer we
-- het model écht kennen.
--
-- Deze kolom is in implementatieplan.md gereserveerd voor R0.5; R8.5 heeft hem
-- als eerste nodig en levert hem daarom hier. De rest van R0.5 (productlijn-
-- deduplicatie, de concurrent/eigen_product-regel bij retailers) blijft open.

alter table public.profiles
  add column if not exists business_model text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_business_model_check'
  ) then
    alter table public.profiles
      add constraint profiles_business_model_check
      check (
        business_model is null
        or business_model in ('retailer', 'platform', 'dienstverlener', 'fabrikant', 'overig')
      );
  end if;
end $$;

comment on column public.profiles.business_model is
  'retailer | platform | dienstverlener | fabrikant | overig. Bepaalt o.a. welke vaste '
  'briefingvragen zinvol zijn (R8.5): een platform heeft geen enkelvoudig adres of '
  'telefoonnummer. Null = onbekend; de briefing valt dan terug op het oude gedrag.';

-- Controle: de kolom bestaat en accepteert null.
select count(*) as profielen_zonder_bedrijfsmodel
from public.profiles
where business_model is null;
