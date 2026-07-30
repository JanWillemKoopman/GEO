-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — meetbaarheid als eerste-klas begrip
-- Migratie 0028. Hoort bij implementatieplan.md R2.
--
-- ── HET PROBLEEM ────────────────────────────────────────────────────────────
--
-- Bij 13 tot 30% van de metingen noemt het AI-antwoord geen enkele aanbieder.
-- Het zijn "hoe kies ik"-antwoorden: stappenplannen, criteria, tips. Bij Van der
-- Valk is dat de meerderheid van de vragen — "Hoe belangrijk is de
-- bereikbaarheid van een vergaderlocatie?" heeft geen merk als antwoord, hoe
-- zichtbaar je ook bent.
--
-- Die metingen tellen nu volledig mee als "het eigen merk werd niet genoemd", en
-- gaan dus als gemiste kans het rapport in. Daar wordt vervolgens content voor
-- geschreven. De score mengt daarmee twee onvergelijkbare dingen: vragen waar
-- merken genoemd worden en de klant er niet bij zit (een echte gemiste kans), en
-- vragen waar niemand genoemd wordt (geen kans). Uit één getal kan de klant niet
-- afleiden welk deel van zijn onzichtbaarheid hij kan beïnvloeden.
--
-- Zie kwaliteitsanalyse-5-testcases.md §2.1.
--
-- ── WAT "EEN MERK GENOEMD" PRECIES BETEKENT ─────────────────────────────────
--
-- `brands_in_answer` telt ALLE genoemde merken, INCLUSIEF het eigen merk. Dat is
-- bewust anders dan de telling in de kwaliteitsanalyse (die keek alleen naar
-- ándere merken) en anders dan het implementatieplan aanvankelijk voorschreef.
--
-- Reden: er zijn antwoorden waarin uitsluitend de klant zelf genoemd wordt — 3
-- bij Bol, 2 bij Coolblue, 2 bij HEMA, 1 bij Van der Valk. Dat zijn zuivere
-- winsten: de AI noemt één aanbieder en dat ben jij. Met de oude definitie
-- zouden die als "merkloos" buiten de score vallen en zou de klant een
-- overwinning kwijtraken. Vandaar: de vraag is meetbaar zodra er ÉÉN aanbieder
-- genoemd wordt, wie dat ook is.
--
-- Rommelentiteiten tellen niet mee. De mention-classificatie pikt naast
-- bedrijven ook gewone woorden op ("vergaderlocatie", "hotel", "Nederland");
-- die worden als `niet_relevant` geclassificeerd en horen niet als aanbieder te
-- gelden. Nog niet geclassificeerde namen tellen WÉL: dat is een naam die echt
-- in het antwoord stond en waarvan we alleen nog niet weten wat het is.
-- Dezelfde regel als in lib/pipeline/evidence.ts (RELEVANTE_ROLLEN).
--
-- Volledig ADDITIEF: alleen nieuwe, nullable kolommen.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Per meting: hoeveel aanbieders noemde dit antwoord? ──────────────────
alter table public.tracking_runs
  add column if not exists brands_in_answer integer;

comment on column public.tracking_runs.brands_in_answer is
  'Aantal verschillende aanbieders dat in dit antwoord bij naam genoemd wordt, '
  'INCLUSIEF het eigen merk. 0 = de AI noemde geen enkele aanbieder; die meting '
  'telt niet mee in de zichtbaarheidsscore, want daar viel niets te winnen. '
  'Rommelentiteiten (rol niet_relevant) tellen niet mee. Gevuld tijdens de '
  'aggregatie, ná de entiteitclassificatie (implementatieplan.md R2.1).';

-- ── 2. Per vraag: levert die structureel merkloze antwoorden op? ────────────
alter table public.prompts
  add column if not exists brand_eliciting text;

alter table public.prompts
  drop constraint if exists prompts_brand_eliciting_check,
  add  constraint prompts_brand_eliciting_check
       check (brand_eliciting is null or brand_eliciting in ('ja', 'nee', 'onbekend'));

comment on column public.prompts.brand_eliciting is
  'Levert deze vraag antwoorden op waarin aanbieders genoemd worden? '
  '''ja'' = minstens één meting noemde een aanbieder; ''nee'' = twee of meer '
  'metingen leverden er geen enkele op; ''onbekend'' = te weinig metingen om dat '
  'te zeggen. Vragen op ''nee'' worden bij vervolgperiodes overgeslagen — meten '
  'wat structureel niets oplevert is weggegooid geld (implementatieplan.md R2.4).';

-- ── 3. Per periode: de score splitsen ──────────────────────────────────────
alter table public.visibility_scores
  add column if not exists winnable_runs  integer,
  add column if not exists brandless_runs integer;

comment on column public.visibility_scores.winnable_runs is
  'Aantal beoordeelde metingen waarin de AI minstens één aanbieder noemde. Dit '
  'is de noemer van score en weighted_score sinds R2.2 — niet judged_runs.';

comment on column public.visibility_scores.brandless_runs is
  'Aantal beoordeelde metingen waarin de AI GEEN enkele aanbieder noemde. Geen '
  'gemiste kans maar een vraag waar (nog) niemand de standaard is; wordt als '
  'apart cijfer aan de klant getoond, niet verstopt in de score.';

-- ── 4. Bestaande metingen vullen ───────────────────────────────────────────
-- Zodat de vijf doorgerekende analyses van 30 juli meteen als regressieset
-- bruikbaar blijven zonder opnieuw te meten (dat zou ~$3,65 kosten).
--
-- `count(distinct ...)` op entiteit-of-naam: één bedrijf dat in twee
-- schrijfwijzen genoemd wordt, is één aanbieder. Zonder dit zou een antwoord dat
-- "Coolblue" en "coolblue.nl" noemt als twee aanbieders tellen.
update public.tracking_runs t
   set brands_in_answer = (
         select count(distinct coalesce(m.entity_id::text, lower(trim(m.entity_name))))
           from public.tracking_run_mentions m
           left join public.entities e on e.id = m.entity_id
          where m.tracking_run_id = t.id
            and m.mentioned
            and (
                  m.is_own_brand
               or e.id is null
               or e.entity_role in ('concurrent', 'vergelijker', 'brancheorganisatie', 'eigen_product')
            )
       )
 where t.brands_in_answer is null
   and exists (select 1 from public.tracking_run_mentions m where m.tracking_run_id = t.id);

-- ── 5. Opzoeken moet goedkoop zijn ─────────────────────────────────────────
-- De aggregatie en het inplannen van vervolgmetingen filteren hierop.
create index if not exists tracking_runs_brands_idx
  on public.tracking_runs (analysis_id, week_no, brands_in_answer);

create index if not exists prompts_brand_eliciting_idx
  on public.prompts (analysis_id, brand_eliciting)
  where brand_eliciting is not null;

-- Controle: hoort voor elk van de vijf testanalyses een telling te geven.
select count(*) filter (where brands_in_answer = 0)  as merkloze_metingen,
       count(*) filter (where brands_in_answer > 0)  as meetbare_metingen,
       count(*) filter (where brands_in_answer is null) as nog_niet_geteld
  from public.tracking_runs
 where week_no = 0 and purpose = 'periodic';
