-- 0079: de aanbodboom bewerkbaar maken
--
-- ── WAT DIT OPLOST ─────────────────────────────────────────────────────────
--
-- documentatie/onboarding_optimalisatie.md, hoofdstuk 16 (Ronde C, stap C1):
-- `profile_offerings` is tot nu toe alleen leesbaar. Er is geen route en geen
-- knop om een dienst toe te voegen, te wijzigen of weg te halen, ook niet voor
-- staf. Dat is precies het gat dat het onboardinggesprek zou moeten dichten en
-- nu niet kan: een dienst die niet op de site staat (nieuw, of alleen
-- telefonisch verkocht) komt nooit in het contentplan.
--
-- ── DE VIER KOLOMMEN ─────────────────────────────────────────────────────────
--
-- `note`: vrije context van het gesprek per dienst, bijvoorbeeld "levert 40
-- procent van de omzet, staat nergens op de site". De andere kolommen
-- beschrijven het aanbod zelf; deze beschrijft wat de klant erover vertelde.
--
-- `removed_at` / `removed_by`: verwijderen is uitzetten, niet wissen
-- (conventie 8). Een gewiste rij komt bij de volgende crawl gewoon terug, want
-- de pagina staat er nog. Zelfde patroon als `profile_topics.status` en de
-- vele andere "verborgen, niet weg"-kolommen in dit schema.
--
-- `updated_by`: wie de knoop voor het laatst wijzigde, naast de al bestaande
-- `updated_at`-trigger.
--
-- Additief en idempotent (conventie 4): geen bestaande rij verandert.
alter table public.profile_offerings
  add column if not exists note text,
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references auth.users(id),
  add column if not exists updated_by uuid references auth.users(id);

comment on column public.profile_offerings.note is
  '(0079) Vrije context uit het gesprek, bijvoorbeeld "levert 40% van de omzet, '
  'staat niet op de site". Anders dan description/audience/price_indication: '
  'dit is wat de klant erover vertelde, niet het aanbod zelf.';

comment on column public.profile_offerings.removed_at is
  '(0079) Verwijderen is uitzetten, niet wissen (conventie 8): een gewiste rij '
  'komt bij de volgende crawl gewoon terug. Alle lezers filteren op '
  '"removed_at is null" via lib/offerings.ts, niet rechtstreeks.';

comment on column public.profile_offerings.removed_by is
  '(0079) Wie de knoop uitzette. Null voor knopen die nog actief zijn.';

comment on column public.profile_offerings.updated_by is
  '(0079) Wie de knoop voor het laatst wijzigde via de nieuwe schrijfroute '
  '(app/api/profiles/[id]/offerings). Null voor knopen die alleen door AI '
  'gezet of gewijzigd zijn.';

-- Elke lezer die "wat is er nu actief" vraagt filtert op profile_id met
-- removed_at is null (zie lib/offerings.ts, activeOfferings()). Een partiële
-- index dekt precies die query, zonder de verwijderde knopen mee te tellen.
create index if not exists profile_offerings_actief_idx
  on public.profile_offerings (profile_id)
  where removed_at is null;

-- Controle: de vier kolommen bestaan en de index staat er.
select
  count(*) filter (where column_name = 'note') as heeft_note,
  count(*) filter (where column_name = 'removed_at') as heeft_removed_at,
  count(*) filter (where column_name = 'removed_by') as heeft_removed_by,
  count(*) filter (where column_name = 'updated_by') as heeft_updated_by
from information_schema.columns
where table_schema = 'public' and table_name = 'profile_offerings';
