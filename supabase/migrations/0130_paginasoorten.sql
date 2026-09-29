-- 0130: de soort pagina gaat ongewijzigd door de keten, en "gids" komt erbij.
--
-- Besluiten B33 en B34 in docs/tasks/contentketen-opnieuw.md §2 (29 september 2026).
--
-- Tot nu toe ging de soort van een aanbeveling (article, faq, landing,
-- comparison) via het plan (`page_type`: categorie, dienst, informatief,
-- overig) en weer terug naar `content_pieces.type`. Die vertaling verloor
-- twee van de vier: een FAQ werd een artikel, een vergelijking een
-- dienstpagina. Op productie stonden op 29 september 2026 4 FAQ-kansen en 5
-- vergelijkingskansen, en er bestond geen enkele FAQ- of vergelijkingspagina.
--
-- ⚠️ De kolom `planned_pages.content_type` BESTAAT AL op productie: migratie
-- `0107_contenttype_bij_de_kans` (19 september 2026, tekst met een
-- check-constraint op de vier soorten). Het bestand van die migratie staat
-- niet in deze map, en de code las de kolom sinds de ombouw van de
-- contentketen (WP1, 25 september 2026) niet meer; alle 63 rijen waren leeg
-- op 29 september 2026. Daarom hier `add column if not exists` met dezelfde
-- vorm, zodat een lege database hem ook krijgt, en daarna de constraint
-- vervangen door een ruimere met `gids` erbij. Dat haalt geen data weg
-- (zelfde werkwijze als 0106, conventie 4).
--
-- Leeg betekent: nog niet gekozen, en dan geldt de oude vertaling vanuit
-- `page_type` (conventie 3). `page_type` blijft voor de contentmix en de
-- analytics: dat is de functie van de pagina op de site, geen vorm van de tekst.
--
-- Additief en idempotent.

alter type public.content_type add value if not exists 'gids';

alter table public.planned_pages
  add column if not exists content_type text;

alter table public.planned_pages
  drop constraint if exists planned_pages_content_type_check,
  add  constraint planned_pages_content_type_check
    check (content_type is null
           or content_type in ('article', 'faq', 'landing', 'comparison', 'gids'));

comment on column public.planned_pages.content_type is
  'De soort tekst (article, faq, landing, comparison, gids): letterlijk uit de aanbeveling, of gekozen door de consultant. NULL = afgeleid van page_type (contentTypeFor). Migraties 0107 en 0130, besluit B33.';

-- Controle: de constraint laat gids toe. De enum controleer je los, ná deze
-- migratie (`select enum_range(null::public.content_type)`): een nieuwe
-- enumwaarde mag in dezelfde transactie nog niet gebruikt worden, ook niet
-- door `enum_range`.
select pg_get_constraintdef(oid) from pg_constraint where conname = 'planned_pages_content_type_check';
