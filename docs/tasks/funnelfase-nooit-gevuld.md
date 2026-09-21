# Openstaand: `planned_pages.funnel_stage_id` wordt nergens meer gevuld

Gevonden op 21 september 2026, bij het overzichtscherm van Van den Udenhout: het blok "Per fase van
de klantreis" zei bij een plan van 18 pagina's voor alle vier fasen "niets gepland". Nagerekend op
productie:

```sql
select count(*) as totaal, count(funnel_stage_id) as met_fase
from planned_pages where profile_id = '<het merk>';
-- 18, 0
```

Geen enkele rij heeft een fase. `ensureFunnels()` in `lib/plans.ts` maakt de vier standaardfasen nog
gewoon aan (`profile_funnel_stages`), maar sinds de jaarverdeling op 25 augustus 2026 verdween
(`createPlan()`, zelfde bestand) kiest niets in de schrijfpijplijn meer een fase per pagina. De
kolom staat nog in migratie 0049 en in `lib/plan-progress.ts` (`funnelVoortgang()`), maar wordt
nergens meer geschreven.

**Wat er op 21 september 2026 is gebeurd:** het overzichtscherm toonde het blok en loog daarmee
structureel. Dat blok is weggehaald (`app/(app)/merk/[id]/page.tsx`, `PlanKaart`), niet gerepareerd.

**Wat nog open staat:** of ditzelfde blok ergens anders in de app staat (bijvoorbeeld op het
contentplan zelf, `plan-view.tsx` / `plan-read-view.tsx`) en daar hetzelfde laat zien. En of een fase
per pagina de moeite van het repareren waard is: dat vraagt een keuze in de schrijfpijplijn (welke
stap kiest de fase, en op basis waarvan) en is een eigen bouwronde, geen kleine reparatie.
