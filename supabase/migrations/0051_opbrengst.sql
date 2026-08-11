-- ═══════════════════════════════════════════════════════════════════════════
-- Aura: de waarde per vermelding, voor het opbrengstblok
-- Migratie 0051 (fase 5, docs/Nova.md §5, besluit 16).
--
-- WAAROM ÉÉN KOLOM EN GEEN PRIJSTABEL
--
-- Besluit 16: de waarde per bezoeker is een OPTIONELE parameter. Staat hij leeg,
-- dan toont het opbrengstblok aantallen ("+12 punten zichtbaarheid"); staat er
-- een bedrag, dan toont het geld erbij. Zo hoeft er geen scherm om zodra de
-- prijzen er zijn: dezelfde functie, één parameter meer (`lib/milestones.ts`).
--
-- Per ACCOUNT en niet per merk: wat een vermelding waard is, hangt aan het
-- bedrijf en zijn marge, niet aan één website. Een autodealer die twee merken
-- voert, rekent voor allebei met hetzelfde bedrag.
--
-- ⚠️ Bewust GEEN standaardwaarde. Conventie 3: onbekend is een betere waarde dan
-- een verkeerde. Een gemiddelde invullen zou een bedrag op het scherm zetten dat
-- de klant als belofte leest.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.accounts
  add column if not exists value_per_mention_eur numeric(10, 2);

comment on column public.accounts.value_per_mention_eur is
  'Wat één punt extra AI-zichtbaarheid dit account per maand waard is, in euro. Leeg = onbekend, dan toont het opbrengstblok aantallen in plaats van geld (besluit 16).';

-- Nooit negatief, en nooit een bedrag dat een tikfout verraadt. De bovengrens is
-- ruim: een groothandel met een ordergemiddelde van tienduizenden euro's past er
-- nog in, een per ongeluk ingetypte reeks nullen niet.
alter table public.accounts
  drop constraint if exists accounts_value_per_mention_check;
alter table public.accounts
  add constraint accounts_value_per_mention_check
  check (value_per_mention_eur is null or (value_per_mention_eur >= 0 and value_per_mention_eur <= 100000));
