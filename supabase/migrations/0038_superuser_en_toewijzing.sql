-- ═══════════════════════════════════════════════════════════════════════════
-- 0038 — Superuser en toewijzing (docs/tasks/onboarding-2.0.md, blok A)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT ER VERANDERT AAN HET PRODUCT
--
-- De app was self-serve: wie een account maakte, maakte zijn eigen profiel en
-- vulde een wizard van vier stappen. Vanaf nu is het verkoopgedreven. De
-- eigenaar van de app zet het profiel klaar vóór het demogesprek, de pijplijn
-- doet het onderzoek, en pas na de verkoop wordt het profiel toegewezen aan het
-- account van de klant.
--
-- Daar zijn twee dingen voor nodig, en verder niets:
--
--   1. Een SUPERUSER die alles kan zien. Zonder dat kan de eigenaar een profiel
--      dat hij zelf aanmaakte wél beheren (hij is dan eigenaar), maar verliest
--      hij het uit het oog op het moment dat hij het toewijst — precies het
--      moment waarop de begeleiding begint.
--   2. TOEWIJZING: het profiel en zijn analyses van eigenaar laten wisselen.
--
-- Accounts aanmaken hoort hier NIET bij. Dat doet de eigenaar in het
-- Supabase-dashboard. Geen uitnodigings-API, geen half-aangemaakte gebruikers,
-- geen e-mailbezorging in een flow waar een mislukte mail de verkoop ophoudt.
--
-- ── WAAROM EEN EXTRA POLICY EN GEEN AANGEPASTE ─────────────────────────────
--
-- Er staan 19 tabellen met een `*_select_own`-policy. Die alle 19 herschrijven
-- naar `user_id = auth.uid() or public.is_staff()` zou werken, maar het raakt
-- elke bestaande regel en is niet terug te draaien zonder ze nóg een keer te
-- herschrijven.
--
-- Postgres combineert meerdere PERMISSIVE policies met OR. Eén extra policy per
-- tabel doet dus exact hetzelfde, laat de bestaande regels ongemoeid, en is met
-- één `drop policy` per tabel weer weg. Dat is additief in de geest van
-- conventie 4, en het maakt de verbreding zichtbaar als een eigen ding in plaats
-- van een aanpassing die je in 19 diffs moet terugzoeken.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Wie is staf? ────────────────────────────────────────────────────────
-- Bewust een tabel en geen env-variabele: RLS draait in Postgres en kan niet bij
-- de omgeving van de applicatie. Bewust ook geen kolom op auth.users — daar
-- horen wij niet in te schrijven.
create table if not exists public.staff_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'superuser',
  created_at timestamptz not null default now()
);

comment on table public.staff_users is
  'Wie de app beheert (docs/tasks/onboarding-2.0.md blok A). Leeg bij aanmaak: '
  'de eigenaar zet zichzelf er handmatig in. Een hardgecodeerd account-ID in '
  'versiebeheer is een achterdeur die niemand meer terugvindt.';

-- RLS AAN, en NUL policies — net als `jobs`. Niemand leest deze tabel via de
-- API; alleen de security-definer-functie hieronder komt erbij. Zonder deze
-- regel zou een klant kunnen uitlezen wie er beheerder is.
alter table public.staff_users enable row level security;

-- ── 2. De hulpfunctie ──────────────────────────────────────────────────────
--
-- ⚠️ `security definer` is hier geen luxe maar een vereiste. Zou deze functie
-- als aanroeper draaien, dan las hij `staff_users` mét RLS — een tabel zonder
-- policies levert dan altijd `false`, en de hele verbreding zou stil niet
-- werken. Met `security definer` draait hij als eigenaar en omzeilt hij RLS.
--
-- ⚠️ `set search_path = public` hoort er verplicht bij: zonder dat kan een
-- aanroeper met een eigen search_path een andere `staff_users` voorschuiven.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_users s where s.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

comment on function public.is_staff() is
  'Is de ingelogde gebruiker beheerder? Gebruikt in de *_select_staff-policies. '
  'security definer omdat staff_users zelf nul leespolicies heeft.';

-- ── 3. Eén extra selectpolicy per tabel ────────────────────────────────────
--
-- De lus slaat tabellen over die (nog) niet bestaan, zodat deze migratie ook
-- draait op een database waar een latere migratie nog niet langs is geweest.
-- `jobs` en `ai_calls` staan er bewust NIET bij: die hebben nul leespolicies en
-- dat blijft zo — exploitatiedata leest de beheerder in Supabase zelf.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'analyses', 'prompts', 'tracking_runs', 'tracking_run_mentions',
    'visibility_scores', 'competitor_breakdown', 'reports', 'content_pieces',
    'topic_research', 'profile_pages', 'entities', 'technical_audits',
    'content_piece_targets', 'fact_requests', 'content_impact',
    'source_landscape', 'offsite_tasks', 'brand_documents', 'brand_facts'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_select_staff', t);
      execute format(
        'create policy %I on public.%I for select using (public.is_staff())',
        t || '_select_staff', t
      );
    end if;
  end loop;
end
$$;

-- ── 4. Eigenaarschap op het profiel ────────────────────────────────────────
-- `user_id` blijft de eigenaar (daar hangt alle RLS aan). Deze twee kolommen
-- leggen alleen vast wie het profiel begon en wanneer het overging.
alter table public.profiles
  add column if not exists created_by_user_id uuid references auth.users (id),
  add column if not exists assigned_at timestamptz;

comment on column public.profiles.created_by_user_id is
  'Wie dit profiel aanmaakte. Blijft de superuser, ook nadat user_id naar de '
  'klant is overgezet — zo blijft zichtbaar dat het een voorbereid profiel was.';
comment on column public.profiles.assigned_at is
  'Wanneer het profiel aan de klant is toegewezen. Null = nog intern.';

-- Bestaande profielen hebben geen aanmaker; die vullen we met de huidige
-- eigenaar. Anders staat er null waar "de eigenaar zelf" bedoeld is.
update public.profiles set created_by_user_id = user_id where created_by_user_id is null;
