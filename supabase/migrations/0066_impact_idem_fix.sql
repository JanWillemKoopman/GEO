-- ═══════════════════════════════════════════════════════════════════════════
-- 0066 — De effectmeting gooide de helft van haar betaalde metingen weg
-- (docs/tasks/doorloop-huyberts.md, punt 1)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT ER MIS GING
--
-- Twee unieke indexen op tracking_runs spraken elkaar tegen.
--
--   tracking_runs_impact_unique_idx (0020): één meting per (content_piece_id,
--   impact_wave, prompt_id, purpose) — de bedoeling voor impact/control.
--
--   tracking_runs_idem_idx (0041): één meting per (analysis_id, prompt_id,
--   week_no, engine, repeat_index, purpose) — de bedoeling voor periodieke
--   metingen, maar hij kent impact_wave en content_piece_id niet.
--
-- Een impactmeting draagt week_no van de laatste periode en repeat_index 0.
-- Golf 2 van dezelfde vraag botste daardoor met golf 1 op de 0041-index, en
-- twee pagina's die dezelfde vraag als doel hebben botsten met elkaar. De
-- insert in measureOnePrompt() faalde dan MET "Opslaan van 3a mislukt", en
-- dat gebeurde NA de betaalde web_search-aanroep. De taak probeert het daarna
-- nog drie keer (MAX_ATTEMPTS = 4), en elke poging herhaalt de dure aanroep.
--
-- Gemeten bij testklant Huyberts Keukens (6bcf277b-3692-4808-aebe-87380429333d):
-- 14 taken maal 4 pogingen is 56 weggegooide zoekacties, ongeveer $0,86 van de
-- $1,73 aan meetkosten. Precies de helft van alle 112 zoekacties van die
-- doorloop.
--
-- DE OPLOSSING
--
-- De kleinste wijziging die het probleem weghaalt zonder de periodieke
-- metingen aan te raken: de 0041-index vervangen door een index die uitsluitend
-- over periodieke metingen gaat (where content_piece_id is null). Impact- en
-- controlemetingen worden dan uitsluitend door de 0020-index beheerst, die wél
-- de juiste sleutel kent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Vooraf tellen: staan er al dubbelen op de NIEUWE sleutel? ───────────
-- Deze migratie mag niet stilzwijgend een index missen omdat hij niet
-- aangemaakt kon worden. De nieuwe index dekt alleen periodieke metingen
-- (content_piece_id is null), dus dit is een striktere controle dan die van
-- 0041 destijds, niet een lossere.
do $$
declare
  duplicates integer;
begin
  select count(*) into duplicates from (
    select 1
    from public.tracking_runs
    where content_piece_id is null
    group by analysis_id, prompt_id, week_no, engine, repeat_index, purpose
    having count(*) > 1
  ) d;

  if duplicates > 0 then
    raise exception
      'Kan tracking_runs_idem_periodic_idx niet aanmaken: % combinatie(s) van '
      '(analyse, prompt, week, engine, herhaling, doel) komen meer dan één keer '
      'voor bij periodieke metingen. Ruim die eerst op.', duplicates;
  end if;
end
$$;

-- ── 2. De nieuwe index eerst aanmaken ──────────────────────────────────────
-- Zelfde sleutel als de oude tracking_runs_idem_idx, maar nu partieel: hij
-- geldt alleen voor periodieke metingen (content_piece_id is null). Impact- en
-- controlemetingen (content_piece_id is niet null) vallen hierbuiten en worden
-- uitsluitend door tracking_runs_impact_unique_idx (0020) beheerst.
create unique index if not exists tracking_runs_idem_periodic_idx
  on public.tracking_runs (analysis_id, prompt_id, week_no, engine, repeat_index, purpose)
  where content_piece_id is null;

-- ── 3. Pas dan de oude, tegensprekende index laten vallen ─────────────────
-- Geen dataverlies: dit verwijdert alleen een indexdefinitie, geen rijen.
drop index if exists public.tracking_runs_idem_idx;

-- ── 4. Controle ──────────────────────────────────────────────────────────
select
  (select count(*) from pg_indexes
   where indexname = 'tracking_runs_idem_periodic_idx') as nieuwe_index_bestaat,
  (select count(*) from pg_indexes
   where indexname = 'tracking_runs_idem_idx') as oude_index_moet_weg_zijn;
