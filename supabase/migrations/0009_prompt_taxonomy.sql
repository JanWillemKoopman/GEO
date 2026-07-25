-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — prompt-taxonomie voor latere analyse (abcplan.md §6 A2)
-- Migratie 0009: rijkere categorisatie per prompt, elk in een eigen kolom zodat
-- de dataset per dimensie te analyseren is (à la inspace.io: intent / funnel /
-- clusters). De FUNNELFASE blijft in de bestaande `category`-kolom (waarden nu
-- Oriëntatie/Overweging/Beslissing) zodat 'ie doorstroomt naar de meting
-- (prompt_category_snapshot) en de concurrentie-breakdown. De fijnere tags komen
-- als aparte kolommen:
--   • intent_type     — informational | commercial | transactional
--   • specificity     — head | long_tail (korte, brede vs lange, specifieke vraag)
--   • purchase_intent — koopintentie ja/nee
--   • cluster         — kort thema-/topic-label (bv. "hardloopschoenen")
--   • volume_estimate — door AI GESCHAT zoekvolume 0-100 (GEEN echte index):
--                        0 = zeer specifiek/zelden, 100 = zeer populair/breed.
-- Alle kolommen zijn additief/nullable — handmatig toegevoegde prompts hebben ze niet.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.prompts
  add column intent_type     text,
  add column specificity     text,
  add column purchase_intent boolean,
  add column cluster         text,
  add column volume_estimate integer;
