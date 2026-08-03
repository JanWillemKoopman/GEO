-- ═══════════════════════════════════════════════════════════════════════════
-- 0042 — Aanscherping na de RLS-verbreding van 0038
-- ═══════════════════════════════════════════════════════════════════════════
--
-- De Supabase-linter meldde na 0038 twee dingen. Geen van beide is een lek,
-- allebei zijn ze het dichtzetten waard — juist omdat de verbreding uit 0038
-- het gevoeligste stuk van dit traject is en er geen ruis omheen hoort te staan.
--
-- ── 1. is_staff() was aanroepbaar door `anon` ──────────────────────────────
--
-- Via `/rest/v1/rpc/is_staff`. Onschadelijk: de functie leest `auth.uid()`, en
-- voor een niet-ingelogde bezoeker is dat null, dus hij geeft altijd `false`.
-- Er valt niets uit te lezen over wie er beheerder is.
--
-- Toch dicht. Een `security definer`-functie die zonder inloggen aan te roepen
-- is, is precies het soort ding dat over een jaar wél iets lekt omdat iemand er
-- een parameter aan toevoegt.
--
-- ── 2. De stafpolicies golden ook voor de anon-rol ─────────────────────────
--
-- `create policy ... using (public.is_staff())` zonder `to`-clausule geldt voor
-- ÉLKE rol, inclusief `anon`. In combinatie met punt 1 zou het intrekken van de
-- EXECUTE-rechten dan een fout opleveren in plaats van een lege uitkomst: een
-- niet-ingelogde query op zo'n tabel zou stuklopen op "permission denied for
-- function is_staff" in plaats van netjes nul rijen te geven.
--
-- Vandaar dat deze twee samen in één migratie horen: los toegepast breekt de
-- eerste iets wat de tweede repareert.
--
-- ── 3. set_updated_at had een beweegbaar zoekpad ───────────────────────────
--
-- Bestond al vanaf 0001 en is nooit een probleem geweest, maar migratie 0039 en
-- 0040 hebben er twee nieuwe triggers aan gehangen (profile_offerings,
-- profile_topics, profile_strategy). Een triggerfunctie zonder vast
-- `search_path` kan door een aanroeper met een eigen pad naar een andere
-- `now()` gestuurd worden. Eén regel, geen gedragsverandering.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Alleen ingelogde gebruikers mogen is_staff() aanroepen ──────────────
revoke all on function public.is_staff() from public;
revoke all on function public.is_staff() from anon;
grant execute on function public.is_staff() to authenticated;

-- ── 2. De stafpolicies expliciet op `authenticated` ────────────────────────
-- Zelfde lijst als in 0038, plus de tabellen die 0039 en 0040 erbij maakten.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'analyses', 'prompts', 'tracking_runs', 'tracking_run_mentions',
    'visibility_scores', 'competitor_breakdown', 'reports', 'content_pieces',
    'topic_research', 'profile_pages', 'entities', 'technical_audits',
    'content_piece_targets', 'fact_requests', 'content_impact',
    'source_landscape', 'offsite_tasks', 'brand_documents', 'brand_facts',
    'profile_facets', 'profile_offerings', 'profile_field_sources',
    'profile_topics', 'profile_strategy', 'profile_llm_baseline'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_select_staff', t);
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.is_staff())',
        t || '_select_staff', t
      );
    end if;
  end loop;
end
$$;

-- ── 3. Vast zoekpad op de gedeelde triggerfunctie ──────────────────────────
alter function public.set_updated_at() set search_path = public, pg_temp;
