-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — onboarding-intake op het klantprofiel
-- Migratie 0006: bij het aanmaken van een profiel doorloopt de klant een
-- onboarding-wizard. De meeste antwoorden vullen bestaande kolommen (name, url,
-- industry, products, competitors, tone_of_voice). Twee vrije-tekstvelden hebben
-- geen bestaande kolom maar sturen wél de AI (en zijn herbruikbaar bij een re-run):
--   • intake_description — korte omschrijving "wat doet het bedrijf / uniek".
--   • intake_audience    — doelgroep, zoals de klant die zelf omschrijft.
-- Klant-input is leidend: de AI-call vult alleen lege velden aan en verrijkt.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column intake_description text,
  add column intake_audience    text;
