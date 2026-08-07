-- ═══════════════════════════════════════════════════════════════════════════
-- 0045 — Klantprofiel verrijkt: verboden woorden, compliance, auteur, tone-sliders
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- Vier dingen kon een klant nergens vastleggen, terwijl InSpace Nova ze alle
-- vier als eigen onboardingstap heeft (docs/tasks/nova-analyse.md §3.3):
--
--   1. Woorden of claims die hij nooit terug wil zien in gegenereerde tekst.
--   2. Regels en wetten waar content aan moet voldoen (zorg, financieel,
--      juridisch, precies het MKB-segment waar dit het vaakst speelt).
--   3. Wie de content publiceert: naam, functie, korte bio, LinkedIn. AI-
--      assistenten wegen een herkenbare, vindbare auteur mee als signaal van
--      betrouwbaarheid (E-E-A-T), en dit is de goedkoopste manier om daarop
--      te scoren.
--   4. Tone of voice was één vrij tekstveld. Vijf schuiven met benoemde
--      standen geven het model iets waar het ECHT op kan sturen, zoals Nova's
--      formality/energy/complexity/humor/emotional-range-faders.
--
-- WAAROM DEZE OPLOSSING
--
-- Alle vier landen op `profiles`, niet op `analyses`: het zijn merkbrede
-- keuzes, net als `tone_of_voice` en `style_samples` er al staan. Nullable en
-- zonder default (conventie 3, onbekend is een betere waarde dan een
-- verkeerde): zolang een klant niets invult, gedraagt de schrijfprompt zich
-- exact zoals hiervoor.
--
-- De vier schuifjes zijn een geheel getal 1-3 (of null = niet ingesteld), en
-- de vertaling naar prompttaal ("informeel" versus "3") gebeurt in code
-- (lib/pipeline/tone-sliders.ts), nooit door het cijfer zelf naar het model te
-- sturen. Conventie 1: een promptinstructie is een intentie, code is een
-- garantie.

alter table public.profiles
  add column if not exists taboo_phrases text[] not null default '{}',
  add column if not exists compliance_notes text,
  add column if not exists author_name text,
  add column if not exists author_role text,
  add column if not exists author_bio text,
  add column if not exists author_linkedin_url text,
  add column if not exists tone_formality smallint,
  add column if not exists tone_energy smallint,
  add column if not exists tone_complexity smallint,
  add column if not exists tone_humor smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_tone_sliders_check'
  ) then
    alter table public.profiles
      add constraint profiles_tone_sliders_check
      check (
        (tone_formality is null or tone_formality between 1 and 3)
        and (tone_energy is null or tone_energy between 1 and 3)
        and (tone_complexity is null or tone_complexity between 1 and 3)
        and (tone_humor is null or tone_humor between 1 and 3)
      );
  end if;
end $$;

comment on column public.profiles.taboo_phrases is
  'Woorden of claims die de klant nooit in gegenereerde tekst terug wil zien '
  '(bv. "gratis", "beste van Nederland"). Leeg = geen restricties. Gaat als '
  'verbod de schrijfprompt in (lib/pipeline/content.ts) en wordt na het '
  'schrijven deterministisch teruggecontroleerd (lib/pipeline/content-gate.ts, '
  'conventie 1: een promptinstructie is een intentie, code is een garantie).';

comment on column public.profiles.compliance_notes is
  'Vrije tekst: regels, wetten of disclaimers waar content aan moet voldoen '
  '(bv. "nooit resultaatgaranties", "altijd een medische disclaimer"). Gaat '
  'als extra regel de schrijfprompt in.';

comment on column public.profiles.author_name is
  'Naam van de auteur onder wiens naam content gepubliceerd wordt. Een echt, '
  'vindbaar persoon weegt mee in hoe AI-assistenten een bron beoordelen.';
comment on column public.profiles.author_role is 'Functie van de auteur, bv. "Fysiotherapeut".';
comment on column public.profiles.author_bio is 'Korte bio, een paar zinnen.';
comment on column public.profiles.author_linkedin_url is 'LinkedIn-profiel van de auteur, ter verificatie.';

comment on column public.profiles.tone_formality is
  '1 (informeel) tot 3 (formeel). Null = niet ingesteld, dan bepaalt alleen '
  '`tone_of_voice` (vrije tekst) de stijl. Vertaling naar prompttaal in '
  'lib/pipeline/tone-sliders.ts, nooit het cijfer zelf naar het model.';
comment on column public.profiles.tone_energy is '1 (rustig) tot 3 (energiek). Null = niet ingesteld.';
comment on column public.profiles.tone_complexity is '1 (eenvoudig) tot 3 (diepgaand expert). Null = niet ingesteld.';
comment on column public.profiles.tone_humor is '1 (geen humor) tot 3 (speels). Null = niet ingesteld.';

-- Controle: de kolommen bestaan en de bestaande profielen zijn onaangeraakt
-- (alle nieuwe waarden staan op hun default, geen enkel profiel is stuk).
select
  count(*) as profielen_totaal,
  count(*) filter (where taboo_phrases <> '{}') as met_verboden_woorden,
  count(*) filter (where tone_formality is not null) as met_tone_sliders
from public.profiles;
