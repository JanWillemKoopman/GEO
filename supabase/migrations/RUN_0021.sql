-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — migratie van fase 6
--
-- Vervolg op RUN_0012_TOT_0017.sql, RUN_0018_EN_0019.sql en RUN_0020.sql.
-- Voer die EERST uit.
--
-- Herhalen is veilig; er wordt niets verwijderd. De backfill vult week_no uit de
-- bestaande `period`-tekst en raakt alleen rijen waar de kolom nog leeg is.
--
-- CONTROLE achteraf:
--   select
--     exists (select 1 from information_schema.columns
--              where table_name = 'reports' and column_name = 'week_no')     as rapport_periode,
--     exists (select 1 from information_schema.columns
--              where table_name = 'reports' and column_name = 'change_json') as rapport_verandering,
--     (select count(*) from public.reports where week_no is null)            as ongevulde_rijen;
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — trend en terugkerend rapport (optimalisatie.md fase 6)
-- Migratie 0021: de meting die niemand ooit zag, zichtbaar maken.
--
-- Het probleem: de terugkerende taak mat periode 1 tot en met 12 en schreef
-- alles netjes weg. Maar `generateReport` had `if (existingReport) return` — er
-- kwam na de nulmeting nooit een nieuw rapport — en de UI las uitsluitend
-- `week_no = 0`. Er werden dus twaalf periodes aan meetkosten gemaakt voor data
-- die niemand ooit onder ogen kreeg.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Rapporten worden een REEKS (6.1) ─────────────────────────────────────
-- `period` bestond al als vrije tekst ("week 0"), maar daar kun je niet op
-- filteren of sorteren zonder te parsen. Een integer naast de bestaande kolom:
-- de tekst blijft voor de weergave, het getal voor de logica.
alter table public.reports
  add column if not exists week_no integer;

-- Backfill uit de bestaande tekst ("week 3" → 3). Lukt dat niet, dan is het de
-- nulmeting — dat is wat er tot nu toe als enige bestond.
update public.reports
set week_no = coalesce((regexp_match(coalesce(period, ''), '(\d+)'))[1]::integer, 0)
where week_no is null;

alter table public.reports
  alter column week_no set not null,
  alter column week_no set default 0;

-- Eén rapport per periode. Dit VERVANGT de "bestaat er al een rapport"-controle
-- in de code: idempotentie hoort op databaseniveau, niet in een if.
create unique index if not exists reports_analysis_week_idx on public.reports (analysis_id, week_no);

-- ── 2. Wat er veranderd is (6.2) ────────────────────────────────────────────
-- Het periodieke rapport moet vooral het VERSCHIL beschrijven: welke vragen
-- erbij gekomen zijn, welke verloren, welke concurrent oprukt. Een rapport dat
-- elke maand opnieuw de stand beschrijft, wordt na twee keer niet meer gelezen.
alter table public.reports
  add column if not exists change_json jsonb;

-- ── 3. Herinnering per periode, niet per analyse ────────────────────────────
-- De mail moet ZWIJGEN als er niets te melden is (6.7). Om dat te kunnen weten
-- moeten we onthouden of hij voor déze periode al de deur uit ging.
alter table public.reports
  add column if not exists emailed_at timestamptz;
