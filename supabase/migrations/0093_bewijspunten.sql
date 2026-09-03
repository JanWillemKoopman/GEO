-- 0093: de bewijspunten van een pagina (V9 uit contentkwaliteit-copywriterronde.md)
--
-- ── WAAROM DEZE KOLOM ─────────────────────────────────────────────────────────
--
-- De externe copywriter die op 3 september 2026 twaalf pagina's beoordeelde,
-- noemde dit zijn tweede aanbeveling van drie: "Maak van klantinformatie echte
-- differentiatie. Het probleem is niet dat de schrijver onvoldoende informatie
-- heeft. Het probleem is dat de informatie onvoldoende wordt omgezet in een
-- overtuigend argument." Zijn voorbeeld:
--
--   "Vaste ploeg van vier eigen dakdekkers"  wordt
--   "u weet wie er op uw dak komt."
--
-- `claims_json` bewijst dat een zin MAG (welk feit dekt hem). Deze kolom bewijst
-- dat een feit IS OMGEZET: per gekozen feit één zin die zegt wat het voor de
-- lezer betekent. Twee verschillende vragen, dus twee kolommen; ze in elkaar
-- schuiven zou van "onderbouwd" en "overtuigend" één cijfer maken, en dat zijn
-- op deze twaalf pagina's juist de twee die het verst uit elkaar liepen
-- (bronherleidbaarheid 23 tot 92 procent, overtuigingskracht 2,6 van 5).
--
-- ── VORM ──────────────────────────────────────────────────────────────────────
--
-- [{ "factRef": "F3", "betekenis": "u weet wie er op uw dak komt" }, ...]
--
-- Additief en idempotent (conventie 4): default een lege lijst, geen bestaande
-- rij verandert van betekenis, en een pagina van vóór deze migratie houdt
-- precies het oordeel dat hij had.

alter table public.content_pieces
  add column if not exists proof_points_json jsonb not null default '[]'::jsonb;

comment on column public.content_pieces.proof_points_json is
  'V9: per gekozen feit de zin die zegt wat het voor de lezer betekent. Naast claims_json, dat '
  'bewijst dat een bewering mag; dit bewijst dat een feit is omgezet naar een argument.';
