-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — betrouwbare meting (optimalisatie.md fase 2)
-- Migratie 0016: drie dingen die de cijfers eerlijk en vergelijkbaar maken.
--
--   1. De ONZEKERHEID van de score opslaan (2.2). Met 30 vragen × 1 meting is
--      de 95%-band ±16 punten. Die ruis kunnen we niet wegnemen zonder de
--      kosten te verdrievoudigen — maar we kunnen hem wél kennen en tonen.
--   2. Een STABIELE noemer voor het aandeel (2.5). Het huidige aandeel deelt
--      door "alle gevonden merken", en die verzameling groeit met elke meting.
--      Daardoor is het cijfer niet vergelijkbaar tussen periodes.
--   3. ENTITEITEN samenvoegen (2.4). "Coolblue", "coolblue.nl" en
--      "Coolblue B.V." zijn nu drie concurrenten.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Onzekerheid bij de score ─────────────────────────────────────────────
alter table public.visibility_scores
  -- Aantal metingen waarop de score gebaseerd is. Zonder dit getal is de
  -- bandbreedte niet te herleiden, en is een score van vorige maand niet te
  -- vergelijken met een die op minder vragen rust.
  add column judged_runs   integer,
  -- Standaardfout in procentpunten: √(p(1-p)/n) × 100. De 95%-band is ±1,96×
  -- deze waarde. Bewust de standaardfout opslaan en niet de band zelf: dan kan
  -- de UI later ook een andere betrouwbaarheid kiezen zonder migratie.
  add column score_stderr  numeric(5, 2),
  -- Idem voor de gewogen score, die een andere spreiding heeft omdat niet elke
  -- vraag even zwaar telt.
  add column weighted_stderr numeric(5, 2);

-- ── 2. Entiteiten: één rij per merk, met z'n schrijfwijzen ──────────────────
-- Per PROFIEL (niet per analyse): dezelfde concurrent duikt op bij meerdere
-- onderwerpen van hetzelfde merk, en die moeten dan ook één entiteit zijn.
create table public.entities (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  -- Zoals de klant hem kent en zoals hij in de UI verschijnt.
  canonical_name text not null,
  -- Genormaliseerde vorm (kleine letters, rechtsvorm/domeinsuffix eraf,
  -- leestekens weg) — hierop matchen we wat de classificatie teruggeeft.
  normalized     text not null,
  -- Extra schrijfwijzen die ook naar deze entiteit verwijzen, genormaliseerd.
  aliases        text[] not null default '{}',
  -- Heeft de klant deze entiteit gezien en goedgekeurd? Nieuw ontdekte merken
  -- staan op false en verschijnen in het beheerscherm (2.7) — zolang ze niet
  -- bevestigd zijn tellen ze niet mee in de noemer van het aandeel (2.5).
  confirmed      boolean not null default false,
  -- Door de klant weggezet als "dit is geen concurrent van mij". Blijft staan
  -- zodat we hem niet elke meting opnieuw voorstellen.
  dismissed      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index entities_profile_normalized_idx on public.entities (profile_id, normalized);
create index entities_profile_idx on public.entities (profile_id);

create trigger entities_set_updated_at
  before update on public.entities
  for each row execute function public.set_updated_at();

-- Koppeling van een gemeten vermelding naar de samengevoegde entiteit. Nullable:
-- een merk dat we nog niet kennen wordt aangemaakt bij de aggregatie, maar een
-- oude rij van vóór deze migratie heeft niets.
alter table public.tracking_run_mentions
  add column entity_id uuid references public.entities (id) on delete set null;

create index trm_entity_idx on public.tracking_run_mentions (entity_id);

-- ── 3. Aandeel over een vaste set ───────────────────────────────────────────
alter table public.visibility_scores
  -- Aantal entiteiten in de noemer van het aandeel. Zonder dit is niet te zien
  -- of een gedaald aandeel komt doordat de klant minder genoemd wordt of
  -- doordat er een concurrent bij is gekomen.
  add column share_basis_count integer;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Lezen mag de eigenaar (via het profiel); schrijven loopt zoals overal via de
-- service-role in een API-route met expliciete eigenaarscontrole (§5/§12.20).
alter table public.entities enable row level security;

create policy "entities_select_own"
  on public.entities for select
  using (exists (
    select 1 from public.profiles p
    where p.id = entities.profile_id and p.user_id = (select auth.uid())
  ));
