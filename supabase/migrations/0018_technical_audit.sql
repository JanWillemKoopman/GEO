-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — technische GEO-audit (optimalisatie.md fase 3B)
-- Migratie 0018: kan een AI-crawler de site überhaupt bezoeken?
--
-- Nergens in de app werd dat gecontroleerd. We konden dus perfecte content laten
-- schrijven voor een site die ChatGPT de deur wijst — de klant betaalt voor
-- teksten die nooit gelezen worden. Pijnlijk detail: lib/crawler.ts haalde
-- robots.txt al op voor de sitemaps en gooide de rest van de inhoud weg.
--
-- WAAROM EEN TABEL EN NIET EEN PAAR KOLOMMEN OP `profiles`:
-- de audit draait opnieuw bij elke maandelijkse meting (3.8). Een blokkade kan
-- er morgen zijn na een aanpassing door de webbouwer, en dan wil je kunnen zien
-- SINDS WANNEER — "dit is nieuw sinds vorige maand" is een heel ander gesprek
-- dan "dit staat er al een jaar". Met kolommen op het profiel overschrijf je de
-- vorige stand en is die vraag niet meer te beantwoorden.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.technical_audits (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  checked_at  timestamptz not null default now(),
  site_url    text not null,
  -- Aantallen apart van de json, zodat "heeft dit profiel een blokkade?" een
  -- indexeerbare vraag is en niet een scan door jsonb.
  blockers    integer not null default 0,
  warnings    integer not null default 0,
  -- De volledige uitslag: per controle een id, label, ernst, bevinding, wat
  -- eraan te doen is en wie dat kan. Vrije vorm, want de set controles groeit
  -- (3.6 noemt er vijf, er komen er meer) en dat mag geen migratie kosten.
  checks_json jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- De vraag die het scherm stelt is altijd "wat is de laatste stand?", vandaar
-- checked_at aflopend in de index.
create index technical_audits_profile_idx
  on public.technical_audits (profile_id, checked_at desc);

alter table public.technical_audits enable row level security;

create policy "technical_audits_select_own"
  on public.technical_audits for select
  using (exists (
    select 1 from public.profiles p
    where p.id = technical_audits.profile_id and p.user_id = (select auth.uid())
  ));
