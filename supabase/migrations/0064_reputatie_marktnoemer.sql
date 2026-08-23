-- ─────────────────────────────────────────────────────────────────────────────
-- 0064 · De noemer onder de trefkans op de marktvraag
--
-- Additief en idempotent (conventie 4), geen enkele `drop`.
--
-- ── WAAROM DEZE ENE KOLOM ────────────────────────────────────────────────────
--
-- `market_hit_rate` is een breuk: bij hoeveel van de marktvragen kwam de klant
-- voor. Zonder de NOEMER erbij is die breuk niet te vergelijken met die van een
-- volgende meting. Twee runs op Gasservice Brabant gaven 0,17 en 0,36, en de
-- vraag "is dat een verbetering of ruis" is alleen te beantwoorden als je weet
-- of dat 1 op 6 tegenover 2 op 6 was, of 3 op 18 tegenover 6 op 18.
--
-- De rekenkunde die dat beantwoordt bestaat al: `binomialStderr()` in
-- `lib/stats/uncertainty.ts`, dezelfde functie die de zichtbaarheidsscore zijn
-- bandbreedte geeft. Hij had alleen zijn noemer niet.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.reputation_runs
  add column if not exists market_answers integer;

comment on column public.reputation_runs.market_answers is
  'Hoeveel marktvragen er bruikbaar waren. De noemer onder market_hit_rate, nodig om twee metingen te kunnen vergelijken.';
