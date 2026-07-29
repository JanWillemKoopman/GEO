-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — bericht als het klaar is (optimalisatie.md 1.8)
-- Migratie 0014: nu het werk op de achtergrond draait en de klant het scherm
-- écht mag sluiten, moet hij ook te horen krijgen wanneer het af is.
--
-- De rapportmail bestond al (§7 B2) maar ging er altijd uit, zonder dat de
-- klant het wist of kon kiezen. Voor een proces dat minuten duurt is dat het
-- verschil tussen wachten en verdergaan met je werk — dus maken we het een
-- bewuste keuze bij het starten van de analyse.
--
-- Standaard AAN: wie een analyse start wil weten wanneer die klaar is.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.analyses
  add column notify_by_email boolean not null default true;
