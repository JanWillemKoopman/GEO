-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — volume-gewogen zichtbaarheid (abcplan.md §6 A3, herzien)
-- Migratie 0010: naast de bestaande ongewogen score (elke prompt telt gelijk)
-- ook een GEWOGEN score, waarbij elke prompt weegt naar verwacht zoekvolume ×
-- commerciële waarde (koopklaar > vergelijkend > informatief). Zo tellen de
-- populaire, koopklare vragen zwaarder dan een informatieve niche-vraag.
--
--   • tracking_runs.prompt_weight — het gewicht van de prompt, BEVROREN op het
--     meetmoment (net als prompt_text_snapshot): (volume/100) × waardefactor,
--     met een ondergrens van 0,1 zodat geen enkele prompt volledig wegvalt.
--   • visibility_scores.weighted_score — 0-100, de gewogen zichtbaarheid.
-- Beide additief/nullable — veilig op een bestaande database.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.tracking_runs
  add column prompt_weight numeric(6, 4);

alter table public.visibility_scores
  add column weighted_score numeric(5, 2);
