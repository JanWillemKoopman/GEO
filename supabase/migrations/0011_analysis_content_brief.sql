-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — content-brief per analyse (abcplan.md §6/§7/§8)
-- Migratie 0011: een vrij-tekst toelichting waarmee de klant de HOEK/DOELGROEP
-- van de content stuurt. Voorbeeld: uitzendbureau, onderwerp "sollicitanten" →
-- "content waarmee een sollicitant zich voorbereidt op een gesprek (hoe kleed ik
-- me), niet generieke info voor wie niet naar vacatures zoekt". De brief werkt
-- door in de meet-vragen (A2), het rapport (B1/B2) en de content-generatie (C).
-- Optioneel/nullable.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.analyses
  add column content_brief text;
