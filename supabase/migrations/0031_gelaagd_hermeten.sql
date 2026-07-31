-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — gelaagd hermeten: precisie waar het ertoe doet
-- Migratie 0031. Hoort bij implementatieplan.md R6.1.
--
-- ── DE AANLEIDING, GEMETEN ──────────────────────────────────────────────────
--
-- Elke vraag wordt één keer gemeten. Hoe onbetrouwbaar dat is, bleek pas bij de
-- verificatieronde van 30 juli — dezelfde analyse (Fysi-Unique), dezelfde dertig
-- vragen, twee periodes achter elkaar:
--
--            | meetbare vragen | score
--   periode 0|        17       |  18
--   periode 1|        11       |  36
--
-- Niet alleen de score verdubbelde, ook de NOEMER bewoog: van 17 naar 11. Er is
-- in die tussentijd niets veranderd aan de website of de markt. Dit is ruis.
--
-- Twee bronnen van variatie zitten hier door elkaar:
--   1. Noemt de AI überhaupt aanbieders bij deze vraag? (blijkt te wisselen)
--   2. Zit de klant daar dan tussen?
--
-- Met één meting per vraag is geen van beide te scheiden van toeval, en toch
-- toont de app er een trendlijn op. Dat is een grafiek die meer belooft dan de
-- meting draagt.
--
-- ── WAAROM NIET GEWOON ALLES VAKER METEN ────────────────────────────────────
--
-- Omdat de meting 95% van de kosten is ($0,78 van de $0,82 per ronde). Alles
-- drie keer meten verdrievoudigt de rekening voor een precisie die je vooral
-- nodig hebt waar het geld zit: de zwaarwegende vragen (populair en/of
-- koopklaar). Een vraag met gewicht 0,15 hoeft niet op de komma te kloppen.
--
-- Vandaar GELAAGD: de zwaarste vragen meerdere keren, de rest één keer.
-- Instelbaar via lib/config.ts, zodat de balans per omgeving te kiezen is.
--
-- ── WAT DIT BETEKENT VOOR DE BEREKENING ─────────────────────────────────────
--
-- De aggregatie telt vanaf nu per VRAAG, niet per meting. Een vraag die drie
-- keer gemeten is en twee keer een vermelding opleverde, telt als 2/3 — niet als
-- drie losse waarnemingen. Anders zouden de herhaalde vragen driemaal zo zwaar
-- wegen als de rest, precies het tegenovergestelde van wat we willen.
--
-- Volledig ADDITIEF: één kolom met een standaardwaarde, dus bestaande metingen
-- blijven geldig (die zijn allemaal repeat_index 0).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.tracking_runs
  add column if not exists repeat_index integer not null default 0;

comment on column public.tracking_runs.repeat_index is
  'Hoeveelste herhaling van dezelfde vraag binnen dezelfde periode '
  '(implementatieplan.md R6.1). 0 = de eerste (en voor de meeste vragen enige) '
  'meting. De zwaarstwegende vragen worden meerdere keren gemeten om de ruis '
  'eruit te middelen; de aggregatie rekent daarom per VRAAG en niet per meting.';

-- De idempotentiecontrole in measureOnePrompt zoekt op
-- (analysis_id, prompt_id, week_no, purpose, repeat_index). Zonder deze index
-- wordt dat een sequentiële scan bij elke van de tientallen meettaken.
create index if not exists tracking_runs_repeat_idx
  on public.tracking_runs (analysis_id, prompt_id, week_no, purpose, repeat_index);

-- Controle: alle bestaande metingen horen op 0 te staan.
select repeat_index, count(*) as metingen
  from public.tracking_runs
 group by repeat_index
 order by repeat_index;
