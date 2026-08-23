-- ═══════════════════════════════════════════════════════════════════════════
-- 0063 · Mijn reputatie, tweede ronde: wat de eerste echte run leerde
-- ═══════════════════════════════════════════════════════════════════════════
--
-- De run op Van den Udenhout (23 augustus 2026) legde zeven fouten bloot, en
-- daarnaast vier dingen die geen fout waren maar wél zwak. Deze migratie draagt
-- de kolommen voor die vier. Het waarom staat in `docs/logbook.md`.
--
-- 1. HET GEMIDDELDE VERNIETIGDE DE BEVINDING. Tien keer "gemengd" en tien keer
--    "neutraal" leveren allebei een toon van 0 op, en dat zijn compleet
--    verschillende merken. Het eerste heeft uitgesproken meningen met lof én
--    kritiek, het tweede heeft er geen. Vandaar `tone_distribution` en
--    `tone_spread`: de verdeling zelf en hoe verdeeld hij is.
--
-- 2. ELK GETAL RUSTTE OP ÉÉN ANTWOORD. De meting op het scherm ernaast toont
--    al een betrouwbaarheidsband; dit scherm zei "+4" zonder enige marge.
--    `tone_stderr` maakt dat verschil zichtbaar.
--
-- 3. DE VERGELIJKING KON NIET WERKEN BIJ EEN REGIONAAL BEDRIJF. ChatGPT kende
--    geen van beide echte concurrenten. `market_*` draagt de uitkomst van de
--    open koperssvraag, die concurrenten ONTDEKT in plaats van ze op te leggen.
--
-- 4. HET MEETINSTRUMENT WAS NIET VERSIONEERD. Dit product wordt verkocht op
--    herhaling, dus een stille modelwijziging bij OpenAI zou een trendlijn
--    opleveren die ruis is. `instrument_version` maakt dat zichtbaar.
--
-- Additief en idempotent (conventie 4). Geen enkele `drop`.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.reputation_runs
  -- ⚠️ De verdeling naast de index, niet in plaats ervan. De index blijft het
  -- getal waarop je vergelijkt, de verdeling is wat je begrijpt.
  add column if not exists tone_distribution jsonb,
  -- 0 tot 100. Hoe verdeeld is het beeld? Hoog betekent dat er zowel lof als
  -- kritiek is; dat is een ander merk dan een merk waar niemand iets van vindt.
  add column if not exists tone_spread numeric,
  -- Standaardfout van de toonindex, in punten op dezelfde schaal. Null zolang
  -- er geen herhalingen zijn, want dan valt er niets te spreiden.
  add column if not exists tone_stderr numeric,

  -- ── De open marktvraag ────────────────────────────────────────────────────
  -- Op welke plek noemt AI de klant als een koper vraagt wie hij moet hebben?
  -- ⚠️ null = niet genoemd, en dat is iets anders dan een lage plaats. Precies
  -- dezelfde regel als bij `rank_position` (conventie 3).
  add column if not exists market_position numeric,
  -- Van hoeveel bedrijven AI er in totaal noemde.
  add column if not exists market_of int,
  -- Bij hoeveel van de gestelde marktvragen de klant überhaupt voorkwam.
  add column if not exists market_hit_rate numeric,
  -- De bedrijven die AI zelf noemde, op volgorde van hoe vaak. Dit is de
  -- ontdekte concurrentieset, en die is betrouwbaarder dan de opgelegde.
  add column if not exists market_rivals text[] not null default '{}',

  -- ── Het meetinstrument ────────────────────────────────────────────────────
  -- Model, redeneerinspanning en promptversie in één sleutel. Twee runs met
  -- verschillende sleutels zijn niet zonder meer te vergelijken, en het scherm
  -- hoort dat te zeggen in plaats van een trendlijn te tekenen die ruis is.
  add column if not exists instrument_version text;

comment on column public.reputation_runs.tone_spread is
  'Verdeeldheid 0..100. Hoog = lof en kritiek naast elkaar, niet hetzelfde als neutraal.';
comment on column public.reputation_runs.market_position is
  'Plek in het open aanbevelingsantwoord. NULL = niet genoemd, geen lage plaats.';
comment on column public.reputation_runs.instrument_version is
  'Model + redeneerinspanning + promptversie. Trends over twee versies zijn geen trends.';

-- Dezelfde vier op het niveau van de aanbodknoop, want daar zit het advies.
alter table public.reputation_offering_scores
  add column if not exists tone_spread numeric,
  add column if not exists market_position numeric,
  add column if not exists market_of int,
  -- De bedrijven die AI bij DEZE dienst noemde. Per dienst kan dat verschillen,
  -- en juist dat verschil is bruikbaar: bij onderhoud een andere set dan bij
  -- nieuwbouw betekent dat het twee markten zijn.
  add column if not exists market_rivals text[] not null default '{}';

-- ── De ontdekte concurrenten, één rij per genoemd bedrijf ──────────────────
--
-- Apart van `reputation_ranks`, en dat is een bewuste keuze. Die tabel gaat over
-- partijen die WIJ hebben opgelegd en die het model moest rangschikken. Deze
-- gaat over partijen die het MODEL zelf noemde. Dat is een ander soort feit met
-- een andere betrouwbaarheid, en ze op één hoop gooien zou het verschil wissen
-- tussen "wij vroegen ernaar" en "AI kwam er zelf mee".
create table if not exists public.reputation_market (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.reputation_runs (id) on delete cascade,
  answer_id    uuid not null references public.reputation_answers (id) on delete cascade,
  offering_id  uuid references public.profile_offerings (id) on delete set null,
  -- De naam zoals AI hem noemde, plus de entiteit als we hem herkennen. Een
  -- naam die we NIET herkennen is het interessantst: dat is een concurrent die
  -- nog niet in beeld was.
  party_name   text not null,
  entity_id    uuid references public.entities (id) on delete set null,
  is_own_brand boolean not null default false,
  -- Vanaf 1. De volgorde waarin AI ze noemde is de aanbeveling.
  position     int not null,
  of_parties   int not null,
  -- Waarom AI dit bedrijf noemt. Hier zit het bruikbare advies in.
  reason       text,
  created_at   timestamptz not null default now()
);

create index if not exists reputation_market_run_idx
  on public.reputation_market (run_id, position);

-- Eerst weg dan erin bij een herhaling, dus geen unieke sleutel nodig: de
-- combinatie (antwoord, naam) is al uniek per beoordeling en de handler ruimt
-- op voordat hij schrijft.

alter table public.reputation_market enable row level security;

drop policy if exists reputation_market_select on public.reputation_market;
create policy reputation_market_select on public.reputation_market
  for select using (
    run_id in (
      select r.id from public.reputation_runs r
       where r.profile_id in (select public.readable_profile_ids())
    )
  );

-- ── Het gedeelde bewijscorpus ──────────────────────────────────────────────
--
-- Twaalf keer opnieuw zoeken naar hetzelfde bedrijf kost geld, maar het echte
-- bezwaar is methodologisch: elke vraag krijgt ANDERE zoekresultaten. Valt de
-- ene dienst negatiever uit dan de andere, dan weet je niet of dat aan de
-- reputatie ligt of aan wat de zoekmachine die seconde opleverde. Je meet twee
-- dingen tegelijk en kunt ze niet uit elkaar halen.
--
-- Eén onderzoeksfase vult dit corpus, daarna beantwoorden de dienstvragen zich
-- eruit. Dan is het verschil tussen twee diensten een echt verschil.
--
-- ⚠️ De merkbrede vragen en de marktvraag blijven wél zoeken. Die simuleren wat
-- een echte gebruiker ziet, en dat is de belofte van het product. Consistentie
-- zou daar realisme kosten, en realisme is daar het punt.
create table if not exists public.reputation_evidence (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.reputation_runs (id) on delete cascade,
  -- Waar dit stuk bewijs vandaan komt: de zoekvraag die het opleverde.
  query       text not null,
  url         text,
  domain      text,
  -- De tekst zelf. Dit is wat de dienstvragen straks lezen.
  excerpt     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists reputation_evidence_run_idx
  on public.reputation_evidence (run_id);

alter table public.reputation_evidence enable row level security;

drop policy if exists reputation_evidence_select on public.reputation_evidence;
create policy reputation_evidence_select on public.reputation_evidence
  for select using (
    run_id in (
      select r.id from public.reputation_runs r
       where r.profile_id in (select public.readable_profile_ids())
    )
  );
