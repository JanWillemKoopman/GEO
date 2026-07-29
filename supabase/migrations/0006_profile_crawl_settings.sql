-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — crawl-instellingen per klantprofiel
-- Migratie 0005: de content-inventaris (§12.23) wordt instelbaar per profiel:
--   • sitemap_url         — optioneel; als de klant de sitemap-locatie weet,
--                           gebruikt de crawler die met zekerheid als ingang.
--   • max_inventory_pages — hoeveel pagina's er maximaal in de inventaris komen.
-- Beide bewerkbaar via het profielscherm; de "Vernieuw inventaris"-knop draait
-- de crawl opnieuw met deze instellingen (zonder het merkonderzoek te raken).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column sitemap_url         text,
  add column max_inventory_pages integer not null default 60;
