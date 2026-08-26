-- ═══════════════════════════════════════════════════════════════════════════
-- 0067 — Een publicatiedatum die de gebruiker zelf zet, blijft staan
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAAROM DIT NODIG IS
--
-- `resequenceMonth()` (lib/plan-schedule.ts) herberekent na ELKE wijziging in
-- een maand alle publicatiedata: kaart erbij, kaart eruit, kaart verplaatst.
-- Tien pagina's in augustus staan daardoor op dag 1, 4, 7, 10 enzovoort, en dat
-- is precies de bedoeling zolang niemand er zelf iets van vindt.
--
-- Zodra de gebruiker één regel op 18 augustus zet omdat de beurs dan is, moet
-- die datum de eerstvolgende sleepbeweging overleven. Zonder een vlag hier is
-- dat niet te zien: de herberekening kan niet weten of 18 augustus een keuze
-- was of het toevallige resultaat van de vorige spreiding.
--
-- WAT DE VLAG DOET
--
-- `scheduled_manual = true` betekent: laat `scheduled_for` met rust. Dezelfde
-- uitzondering die een geplaatste pagina al had (die houdt zijn datum omdat hij
-- werkelijkheid is geworden), nu ook voor een datum die iemand bewust koos.
--
-- Additief en idempotent (conventie 4). Bestaande rijen krijgen `false`, dus
-- alle huidige plannen blijven zich gedragen zoals ze deden.

alter table public.planned_pages
  add column if not exists scheduled_manual boolean not null default false;

comment on column public.planned_pages.scheduled_manual is
  'De gebruiker koos deze publicatiedatum zelf; resequenceMonth() laat hem staan.';
