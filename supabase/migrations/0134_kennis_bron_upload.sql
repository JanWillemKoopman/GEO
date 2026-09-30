-- 0134: de bron "upload" voor de kennislaag (30 september 2026)
--
-- Waarom. Op "Feiten en kennis" komt een knop waarmee de klant of de consultant een
-- document uploadt of tekst plakt, waarna het model er feiten, kennis en vermoedens uit
-- haalt. Die items moeten in de kolom Bron als "Handmatige upload" staan en niet als
-- "Document": `document` is het merkdossier (een tarievenpagina plakken voor alleen
-- harde feiten), en beide los kunnen tellen is precies de vraag die de consultant stelt.
--
-- Wat verandert. Alleen de lijst toegestane waarden van `klantkennis.bron`: er komt
-- `upload` bij. Een check-constraint is alleen te verruimen door hem te vervangen (zoals
-- 0117 deed); dat `drop constraint` verwijdert geen data en geen enkele bestaande rij
-- valt buiten de nieuwe lijst, want die is een superset. `if exists` houdt het herhaalbaar.

alter table public.klantkennis drop constraint if exists klantkennis_bron_check;
alter table public.klantkennis add constraint klantkennis_bron_check check (
  bron in ('website', 'klant', 'gesprek', 'document', 'upload', 'extern', 'meting', 'ai'));
