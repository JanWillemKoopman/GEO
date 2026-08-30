-- 0077: de knop "Stel nieuwe clusters voor" (werkpakket A, punt 10)
--
-- ── WAT DIT OPLOST ─────────────────────────────────────────────────────────
--
-- docs/optimalisatielab-orbit-engine.md, werkpakket A §3.5: op elk moment een
-- nieuwe ronde onderwerpen aanmaken op basis van alles wat er op dat moment
-- bekend is, aanvullend op wat er al staat, nooit vervangend. Drie dingen
-- ontbraken daarvoor:
--
--   1. Een plek om te onthouden WANNEER de laatste ronde draaide en op welke
--      stand van zaken (`profile_topic_rounds`), want zonder dat kan de app
--      niet zeggen "er is niets nieuws sinds de vorige keer" (§3.5, de regel
--      die een tweede identieke, dure ronde moet voorkomen).
--   2. Een reden bij een afwijzing (`rejection_reason`), zodat "wat de klant
--      eerder afwees komt niet terug in dezelfde vorm" ook echt kan: zonder
--      reden weet een volgende ronde alleen DAT iets afgewezen is, niet WAAROM,
--      en kan hij het onderwerp dus niet gericht vermijden.
--   3. Een vlag of een voorstel mede op gemeten gemissen rust
--      (`origin_uses_measurement`), naast de bestaande `origin`-kolom uit 0076
--      die alleen aanbod tegenover aanbod-plus-gesprek onderscheidt. Samen
--      geven de twee kolommen de herkomst die §3.5 vraagt: "uit het aanbod,
--      uit het gesprek, uit een meting, of een combinatie."
--
-- ── WAAROM EEN BOOLEAN EN GEEN DERDE `origin`-WAARDE ────────────────────────
--
-- `origin` en "gebruikt meting" zijn onafhankelijke assen: een ronde kan wel
-- of geen gesprek hebben gehad, EN wel of geen metingen. Vier combinaties in
-- één kolom proppen (zoals `aanbod_gesprek_en_meting`) maakt de check-
-- constraint onleesbaar en de lezende code een reeks losse
-- stringvergelijkingen. Twee kolommen die elk één vraag beantwoorden zijn
-- allebei triviaal te lezen en te combineren in de UI.
--
-- Additief en idempotent (conventie 4): geen enkele bestaande rij verandert.

create table if not exists public.profile_topic_rounds (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  triggered_by   uuid references auth.users (id),
  triggered_at   timestamptz not null default now(),
  cost_usd       numeric,
  proposed_count integer not null default 0,
  -- Momentopname waarmee een volgende klik vergelijkt: zie
  -- lib/pipeline/topic-round-diff.ts voor de vorm en de vergelijkingslogica.
  snapshot_json  jsonb not null default '{}'::jsonb
);
create index if not exists profile_topic_rounds_profile_idx
  on public.profile_topic_rounds (profile_id, triggered_at desc);

alter table public.profile_topics
  add column if not exists rejection_reason text,
  add column if not exists origin_uses_measurement boolean not null default false;

comment on column public.profile_topics.rejection_reason is
  'Waarom dit onderwerp is afgewezen (0077). Gaat als instructie mee in een '
  'volgende ronde van "Stel nieuwe clusters voor", zodat dezelfde richting '
  'niet terugkomt. Null is toegestaan: een afwijzing zonder reden blokkeert '
  'niets, hij levert alleen minder sturing op.';
comment on column public.profile_topics.origin_uses_measurement is
  'Stond er gemeten bewijs (een rapportgap van een lopend cluster) in de '
  'aanroep die dit onderwerp opleverde? Naast origin (0076) de tweede as van '
  'de herkomstregel op het scherm.';

alter table public.profile_topic_rounds enable row level security;

drop policy if exists profile_topic_rounds_select_own on public.profile_topic_rounds;
create policy profile_topic_rounds_select_own on public.profile_topic_rounds for select
using (exists (
  select 1 from public.profiles p
  where p.id = profile_topic_rounds.profile_id and p.user_id = (select auth.uid())
));

drop policy if exists profile_topic_rounds_select_staff on public.profile_topic_rounds;
create policy profile_topic_rounds_select_staff on public.profile_topic_rounds for select
using (public.is_staff());
