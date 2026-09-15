-- ═══════════════════════════════════════════════════════════════════════════
-- 0098 — Wie zette deze pagina in haar maand: het systeem of een mens?
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Genummerd 0098 en niet 0095: het zijproject "Solliciteren" (0095 tot en met
-- 0097) landde op main terwijl dit werk op een eigen branch liep. Zie
-- supabase/README.md voor de volledige toelichting.
--
-- WAAROM DIT NODIG IS
--
-- Blok A, punt 1 uit docs/tasks/nova-vergelijking-verbeterpunten.md: het
-- contentplan vult zichzelf voortaan vooraf, in plaats van dat de klant elke
-- kaart zelf uit de voorraad sleept (`vulOpenMaanden()`, lib/plans.ts). Zodra
-- dat naast elkaar bestaat, kan geen enkele bestaande kolom nog het verschil
-- vertellen tussen "ORBIT ENGINE zette dit hier" en "een mens sleepte dit
-- hier": `plan_month_id`, `sort_order` en `scheduled_for` zien er in beide
-- gevallen identiek uit.
--
-- Dat onderscheid is niet met terugwerkende kracht te reconstrueren zodra deze
-- functie een tijdje draait, en punt 4 uit hetzelfde document (herkomst tonen,
-- "wat is er nieuw sinds de vorige keer") heeft het nodig. Vandaar nu alvast
-- deze ene kolom, ook al bouwt dit plan zelf nog geen scherm dat hem toont.
--
-- WAT DE VLAG DOET
--
-- `auto_placed = true`: `vulOpenMaanden()` zette deze kaart in deze maand.
-- `false`: een mens deed dat, via slepen (`assignToMonth()`) of via de
-- eenmalige voorzet van vóór deze migratie.
--
-- Additief en idempotent (conventie 4). Bestaande rijen krijgen `false`: ze
-- zijn per definitie vóór dit onderscheid bestond in een maand gezet, en dus
-- was dat altijd een menselijke of eenmalige handeling, nooit deze functie.

alter table public.planned_pages
  add column if not exists auto_placed boolean not null default false;

comment on column public.planned_pages.auto_placed is
  'true als vulOpenMaanden() deze kaart automatisch in zijn maand zette, false bij een menselijke sleepactie.';
