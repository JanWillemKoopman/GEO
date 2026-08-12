-- 0056: de accountlaag op de leesregels van het hele dossier
--
-- ── DE VONDST ──────────────────────────────────────────────────────────────
--
-- Gevonden tijdens het narekenen van de rolmatrix, 12 augustus 2026.
-- `analyses` en `profiles` hebben elk drie leesregels: de historische eigenaar
-- (`user_id`), het account (`user_account_ids()`), en de beheerder. De 23
-- tabellen die aan een merk of analyse hangen, hebben er maar twéé: eigenaar en
-- beheerder. De accountregel ontbreekt.
--
-- ── WAT DAT IN DE PRAKTIJK BETEKENT ─────────────────────────────────────────
--
-- Fase 2 (migratie 0046) bouwde het uitnodigingspad zodat een account meerdere
-- mensen kan bevatten: de klant zelf, een collega, iemand van een bureau. De
-- route "Merk toewijzen" zet `user_id` op precies ÉÉN gekozen gebruiker. Elke
-- ANDERE persoon die je nadien bij hetzelfde account uitnodigt, komt binnen via
-- `account_users`, niet via `user_id`.
--
-- Voor `analyses` en `profiles` maakt dat niets uit: die twee tabellen kennen
-- hem via de accountregel. Maar zodra hij het dossier opent, leest elk
-- hoofdstuk een van deze 23 tabellen rechtstreeks met de sessie van de klant
-- (RLS, geen service-role): de vragen, de score, het rapport, de geschreven
-- pagina's, de concurrenten. Voor hem komt dat allemaal LEEG terug. Niet een
-- foutmelding, gewoon niets: nul vragen, geen score, een leeg rapport.
--
-- Dit is dezelfde soort fout als die op 11 augustus `getOwnedAnalysis` trof
-- (een laag die bij de ene functie wél werd toegevoegd en bij de andere niet),
-- alleen ditmaal op de LEESKANT en over 23 tabellen tegelijk in plaats van één
-- functie. En het is geen randgeval: elk tweede teamlid dat ooit bij een
-- klantaccount wordt uitgenodigd, loopt hier middenin.
--
-- ── WAAROM EEN EXTRA POLICY EN GEEN AANGEPASTE (zie ook migratie 0038) ─────
--
-- Postgres combineert PERMISSIVE policies met OR. Eén extra policy per tabel
-- doet dus precies wat nodig is, laat de bestaande `_select_own` en
-- `_select_staff` ongemoeid, en is met één `drop policy` per tabel terug te
-- draaien. De naam `_select_account` is dezelfde die `analyses` en `profiles`
-- al gebruiken.
--
-- ── WAT DIT NIET IS ─────────────────────────────────────────────────────────
--
-- Geen lek naar een vreemde. `readable_profile_ids()` (migratie 0046) beperkt
-- zich tot profielen waar de aanvrager écht bij hoort: eigen account, eigen
-- historische profiel, of beheerder. Deze migratie repareert een deur die te
-- veel dichtzat, niet een die openstond.

-- Eén nieuwe helperfunctie, naar het voorbeeld van `readable_profile_ids()`:
-- welke ANALYSES mag deze gebruiker lezen? Gebouwd bovenop diezelfde functie in
-- plaats van de logica te herhalen, zodat er precies één plek is die "wie hoort
-- hierbij" beantwoordt (P2: geen tweeling die uit elkaar kan groeien).
create or replace function public.readable_analysis_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select a.id from public.analyses a
   where a.profile_id in (select public.readable_profile_ids());
$$;

grant execute on function public.readable_analysis_ids() to anon, authenticated;

-- ── De twaalf tabellen die aan een PROFIEL hangen ──────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'brand_documents', 'brand_facts', 'entities', 'fact_requests',
    'profile_facets', 'profile_field_sources', 'profile_llm_baseline',
    'profile_offerings', 'profile_pages', 'profile_strategy',
    'profile_topics', 'technical_audits'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_select_account', t);
      execute format(
        'create policy %I on public.%I for select using (profile_id in (select public.readable_profile_ids()))',
        t || '_select_account', t
      );
    end if;
  end loop;
end $$;

-- ── De elf tabellen die aan een ANALYSE hangen ─────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'brand_dna', 'competitor_breakdown', 'content_impact', 'content_pieces',
    'offsite_tasks', 'prompts', 'reports', 'source_landscape',
    'topic_research', 'tracking_runs', 'visibility_scores'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_select_account', t);
      execute format(
        'create policy %I on public.%I for select using (analysis_id in (select public.readable_analysis_ids()))',
        t || '_select_account', t
      );
    end if;
  end loop;
end $$;
