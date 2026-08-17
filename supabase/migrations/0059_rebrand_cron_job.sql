-- ═══════════════════════════════════════════════════════════════════════════
-- ORBIT ENGINE — pg_cron-taak hernoemen na de rebrand van Aura
-- Migratie 0059.
--
-- Migratie 0050 zette de dagelijkse contentplan-cron op onder de naam
-- `aura-plan-writer`. Die migratie blijft ongewijzigd staan (migraties zijn
-- geschiedenis, niet herschrijven), maar de live taak moet wél de nieuwe naam
-- dragen. Unschedule op de oude naam, schedule opnieuw onder de nieuwe: de
-- functie zelf (`trigger_plan_writer()`) en het schema blijven ongemoeid.
-- ═══════════════════════════════════════════════════════════════════════════

select cron.unschedule('aura-plan-writer') where exists (
  select 1 from cron.job where jobname = 'aura-plan-writer'
);

select cron.schedule('orbit-engine-plan-writer', '0 4 * * *', 'select public.trigger_plan_writer();');

-- Controleren:  select * from cron.job where jobname = 'orbit-engine-plan-writer';
-- Uitzetten:    select cron.unschedule('orbit-engine-plan-writer');
