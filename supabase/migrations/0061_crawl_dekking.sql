-- ═══════════════════════════════════════════════════════════════════════════
-- 0061 · Crawldekking: hoeveel pagina's had de site écht, en welke tellen mee
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- De crawl haalde tot 150 pagina's op en nam daarvoor de EERSTE 150 URL's in
-- sitemapvolgorde. Twee dingen gingen daar mis, en geen van beide was zichtbaar:
--
--   1. Bij een WordPress-site staat `post-sitemap.xml` meestal vóór
--      `page-sitemap.xml`. Een site met 2000 blogartikelen en 12 dienstenpagina's
--      leverde dus 150 blogartikelen op en geen enkele dienstenpagina, terwijl
--      juist die 12 het aanbod dragen.
--   2. Het aantal URL's dat er wérkelijk stond werd nergens bewaard. `pagesFound`
--      in `inventory_quality_json` is altijd hoogstens 150, dus "de site heeft
--      precies 150 pagina's" en "de site heeft er 8000 en we lazen er 150" zijn
--      in de data niet van elkaar te onderscheiden. Zonder dat cijfer is de vraag
--      "knelt het plafond?" niet te beantwoorden, en dus ook niet te prioriteren.
--
-- DRIE KOLOMMEN, ELK MET ÉÉN LEZER
--
--   • `profiles.sitemap_total_urls` — hoeveel niet-product-URL's er in de
--     sitemap(s) stonden vóór het afkappen. Gelezen door `discover.ts` (het
--     oordeel 'afgekapt') en getoond op het merkprofiel ("150 van de 2400
--     gelezen"). Null = nog niet gemeten, dus profielen van vóór deze migratie
--     liegen niet, ze zwijgen (conventie 3).
--
--   • `profiles.crawl_priority_paths` — welke secties van de site voorrang
--     krijgen bij het verdelen van de beschikbare plekken, bijvoorbeeld
--     `{/diensten,/behandelingen}`. Gevuld door `crawl-focus.ts` als de site te
--     groot is, en handmatig overschrijfbaar door de consultant. Gelezen door
--     `url-priority.ts`. Leeg = de deterministische score beslist alleen.
--
--   • `profile_pages.source` — 'crawl' of 'handmatig'. Zonder dit onderscheid
--     wist de crawl elke pagina die een mens had toegevoegd: `discover.ts`
--     verwijdert de hele inventaris voordat hij hem opnieuw wegschrijft. Dat is
--     precies het geval waarvoor de consultant die URL's invoerde, dus die mogen
--     niet verdwijnen bij de eerstvolgende ronde.
--
-- ADDITIEF EN IDEMPOTENT (conventie 4). Geen drop, geen backfill: bestaande
-- rijen krijgen de default en dat is de juiste waarde voor alles wat er nu staat.

alter table public.profiles
  add column if not exists sitemap_total_urls integer,
  add column if not exists crawl_priority_paths text[] not null default '{}';

comment on column public.profiles.sitemap_total_urls is
  'Aantal niet-product-URL''s in de sitemap(s) vóór het afkappen op max_inventory_pages. Null = niet gemeten.';
comment on column public.profiles.crawl_priority_paths is
  'Sitesecties die voorrang krijgen bij de crawlselectie, bv. {/diensten}. Leeg = alleen de deterministische score.';

alter table public.profile_pages
  add column if not exists source text not null default 'crawl';

comment on column public.profile_pages.source is
  '''crawl'' = door ORBIT ENGINE gevonden · ''handmatig'' = door een mens toegevoegd, overleeft een nieuwe crawl.';

-- Elke lezer die alleen de handmatige pagina's wil (of ze juist wil overslaan)
-- filtert op deze twee kolommen samen. Bij 150 rijen per profiel is dat geen
-- winst; bij een profiel dat na een paar rondes honderden rijen heeft wel.
create index if not exists profile_pages_source_idx
  on public.profile_pages (profile_id, source);
