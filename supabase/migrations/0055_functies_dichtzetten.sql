-- 0055: de triggerfunctie uit 0053 niet meer aanroepbaar via de publieke API
--
-- ── WAT DE VEILIGHEIDSCONTROLE MELDDE ──────────────────────────────────────
--
-- Supabase's controle wees op 12 augustus 2026 vier functies met verhoogde
-- rechten (`security definer`) aan die aanroepbaar zijn via `/rest/v1/rpc/...`:
--
--   • `is_staff()`                 gebruikt in 28 RLS-regels
--   • `readable_profile_ids()`     gebruikt in 5 RLS-regels
--   • `user_account_ids()`         gebruikt in 3 RLS-regels
--   • `ai_calls_resolve_account()` triggerfunctie uit migratie 0053, 0 regels
--
-- ── ⚠️ DRIE ERVAN MOGEN NIET DICHT, EN DAT IS MET SCHADE GELEERD ───────────
--
-- De eerste versie van deze migratie trok het uitvoerrecht bij alle vier in.
-- Gevolg: een ingelogde gebruiker kon NIETS meer lezen. Een RLS-regel wordt
-- geëvalueerd namens de bevragende rol, dus die rol moet de functie in die regel
-- mogen aanroepen. Zonder dat recht faalt niet de regel maar de hele query, met
-- "permission denied for function is_staff". Dat raakte 28 tabellen tegelijk.
--
-- Op productie stond dat een paar minuten zo. Direct teruggedraaid, en de
-- controle die het aantoonde staat nu in `scripts/test-chain.ts`, zodat deze
-- fout niet nog een keer ongemerkt gemaakt kan worden.
--
-- ── WAAROM DE MELDING VOOR DIE DRIE BLIJFT STAAN, EN DAT MAG ───────────────
--
-- Ze leunen alle drie op `auth.uid()`, en die is leeg voor een niet-ingelogde
-- bezoeker. Wie ze van buitenaf aanroept krijgt dus een lege lijst of `false`
-- terug: er valt niets te halen. De nette oplossing is ze verplaatsen naar een
-- schema dat niet via de API wordt aangeboden, maar dat betekent 36 RLS-regels
-- opnieuw aanmaken. Dat is een operatie met echt risico voor een melding zonder
-- echt gevolg, en die afweging hoort opgeschreven te worden in plaats van
-- stilzwijgend genomen.
--
-- ── WAT WEL DICHT KAN ──────────────────────────────────────────────────────
--
-- `ai_calls_resolve_account()` is een triggerfunctie. Hij hoort helemaal niet in
-- de API, en geen enkele RLS-regel gebruikt hem. Een trigger draait namens de
-- eigenaar van de tabel, niet namens degene die de rij invoegt, dus het
-- kostenlogboek blijft gewoon werken.
--
-- Additief en idempotent, conventie 4: alleen een recht intrekken, geen `drop`.

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'ai_calls_resolve_account'
  ) then
    revoke all on function public.ai_calls_resolve_account() from public, anon, authenticated;
  end if;
end $$;

-- Expliciet terugzetten wat er hoort te zijn. Bedoeld als vangnet voor het geval
-- de eerste versie van deze migratie ergens al gedraaid heeft: dan zijn deze
-- rechten daar ingetrokken en is de app stuk zonder dat iets het zegt.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'is_staff') then
    grant execute on function public.is_staff() to anon, authenticated;
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'readable_profile_ids') then
    grant execute on function public.readable_profile_ids() to anon, authenticated;
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'user_account_ids') then
    grant execute on function public.user_account_ids() to anon, authenticated;
  end if;
end $$;
