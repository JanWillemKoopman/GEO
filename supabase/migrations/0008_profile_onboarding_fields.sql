-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — uitgebreide onboarding-velden op het klantprofiel
-- Migratie 0007: de begeleide onboarding-wizard (§12.24) vraagt meer uit. Deze
-- velden hebben geen bestaande kolom en worden ook DOORGEVOERD in de pipeline:
--   • aliases            — andere namen/schrijfwijzen; verbeteren de mention-
--                          detectie in de meting (herkent het merk breder).
--   • service_scope      — 'lokaal' | 'landelijk' | 'internationaal'; stuurt de
--                          promptgeneratie (lokale vragen met plaatsnaam).
--   • service_regions    — plaatsen/regio's (bij lokaal bereik).
--   • market_language    — markt & taal (bv. 'Nederland', 'Nederland + België',
--                          'Internationaal'); stuurt de taal van prompts/meting.
--   • customer_questions — veelgehoorde klantvragen; merk-brede context voor
--                          content en promptgeneratie.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column aliases            text[] not null default '{}',
  add column service_scope       text,
  add column service_regions     text[] not null default '{}',
  add column market_language     text,
  add column customer_questions  text[] not null default '{}';
