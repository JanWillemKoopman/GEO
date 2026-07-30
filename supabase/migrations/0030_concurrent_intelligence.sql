-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — van concurrenten TELLEN naar concurrenten BEGRIJPEN
-- Migratie 0030. Hoort bij implementatieplan.md R4.
--
-- ── WAT DE KLANT NU ZIET, EN WAT ERAAN ONTBREEKT ────────────────────────────
--
-- Per concurrent staat er één ding: hoe vaak hij genoemd is. Verder een
-- verdeling per funnelfase, de geciteerde bronnen en wat run-ID's. Wat er NIET
-- staat is precies de vraag die de klant heeft: waaróm wordt die ander wel
-- genoemd en ik niet?
--
-- Dat is niet alleen een gemis voor het inzicht (doel 2), het is ook wat de
-- contentstap mist (doel 3). De schrijver krijgt nu het winnende antwoord als
-- lap tekst mee; wat hij niet krijgt is de gedestilleerde reden — "deze
-- concurrent wordt genoemd om zijn sportspecialisatie en centrale ligging" — en
-- dat is nu juist de lat waar de nieuwe pagina overheen moet.
--
-- Zie kwaliteitsanalyse-5-testcases.md §2.6.
--
-- ── WAT ERBIJ KOMT ──────────────────────────────────────────────────────────
--
-- Een nieuwe pijplijnstap (`profile_competitors`) leest de antwoordfragmenten
-- waarin de belangrijkste concurrenten voorkomen, en destilleert per concurrent
-- op wélke eigenschappen hij genoemd wordt — met een letterlijk citaat als
-- bewijs, zodat het navolgbaar blijft en niet nóg een laag interpretatie wordt.
--
-- Eén aanroep per analyse (`gpt-4.1-mini`, geen web_search), dus ~$0,005.
--
-- Volledig ADDITIEF: twee nullable kolommen op een bestaande tabel.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.competitor_breakdown
  add column if not exists attributes_json jsonb,
  add column if not exists why_summary     text;

comment on column public.competitor_breakdown.attributes_json is
  'Op welke EIGENSCHAPPEN deze concurrent in de antwoorden genoemd wordt '
  '(implementatieplan.md R4.2), met per eigenschap een letterlijk citaat uit de '
  'meting als bewijs. Vorm: [{ "attribute": "specialisme", "evidence": "..." }]. '
  'De eigenschappen zijn de lat voor de contentstap: de nieuwe pagina moet daar '
  'minstens zo concreet in zijn. De NAAM van de concurrent gaat nooit mee naar '
  'de content — alleen de eigenschap.';

comment on column public.competitor_breakdown.why_summary is
  'Eén leesbare zin voor de klant: waarom wordt deze concurrent genoemd. '
  'Bijvoorbeeld: "Wordt in 8 van je vragen genoemd, vrijwel altijd om zijn '
  'sportspecialisatie en centrale ligging."';

-- Controle: hoort 2 terug te geven.
select count(*) as nieuwe_kolommen
  from information_schema.columns
 where table_schema = 'public'
   and table_name   = 'competitor_breakdown'
   and column_name in ('attributes_json', 'why_summary');
