-- ═══════════════════════════════════════════════════════════════════════════
-- 0036 — De feitenbank: feiten krijgen een identiteit
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- Feiten bestonden alleen als JSON-lijst binnenin
-- `content_pieces.briefing_snapshot_json` — per pagina, per versie. Bij
-- Fysi-Unique staan dezelfde vier therapeutenbio's dus in elke snapshot van elke
-- versie opnieuw.
--
-- Erger is wat een F-nummer IS. Het is een POSITIE, geen identiteit: "F3" =
-- "het derde citeerbare feit in deze lijst". Voeg er één toe en alles schuift.
--
-- Dat is geen theoretisch risico. In de ketentest verwees de teststub naar F1 en
-- F2; zodra er vier klantantwoorden bijkwamen werden dat F5 en F6, omdat
-- klantantwoorden vooraan sorteren (`SOURCE_ORDER`). De test viel daar terecht
-- op om. Bij de echte Fysi-Unique-pagina bleven de nummers tussen versie 1 en 2
-- gelijk — maar alleen omdat er niets bijkwam. Dat is geluk, geen ontwerp.
--
-- Wat daardoor niet kon:
--
--   • `claims_json` verwijst naar een plek in een lijst, niet naar een feit. Of
--     F3 in versie 2 hetzelfde feit is als F3 in versie 1, is niet te zeggen.
--   • Ontdubbelen over analyses heen bestaat niet. Elke analyse bouwt z'n eigen
--     kaart op uit dezelfde bronnen.
--   • TEGENSPRAAK is onzichtbaar. Beantwoordt een klant dezelfde vraag twee keer
--     verschillend, dan komen beide antwoorden op de kaart en mag het model
--     kiezen welk het aanhaalt.
--   • "Wat weten we over deze klant?" is geen vraag die je kunt stellen — dat is
--     wél de kennisbank die contentbriefing.md §7 belooft: "na drie analyses een
--     gevulde feitenbank, en elke volgende pagina beter én sneller dan de
--     vorige".
--
-- WAAROM DEZE OPLOSSING
--
-- Een tabel als BRON VAN WAARHEID, en de snapshot blijft bestaan als BEWIJSSTUK.
-- Dat is bewust "en" en geen "of": de snapshot heeft één deugd die een tabel
-- niet heeft — hij is precies wat het model zág, bevroren, zonder join die er
-- later onderuit kan schuiven (contentbriefing.md §10, zelfde principe als
-- `prompt_text_snapshot`). De tabel geeft wat de snapshot niet kan: identiteit,
-- ontdubbeling en een geschiedenis.
--
-- `fact_key` is de ontdubbelsleutel (`claimKey()`), dezelfde die de briefing al
-- gebruikt om niet twee keer hetzelfde te vragen. Twee feiten met dezelfde
-- sleutel gaan over hetzelfde; verschilt hun tekst, dan is dat een tegenspraak
-- die getoond hoort te worden in plaats van stilzwijgend opgelost.
--
-- `superseded_by` in plaats van verwijderen: een feit dat de klant bijstelt
-- blijft bestaan. Anders is een al geschreven pagina die ernaar verwijst niet
-- meer na te trekken — en dat is precies de traceerbaarheid die R5 opleverde.
--
-- SCOPE, en waarom die hier `analysis_id` heet en niet `scope`
--
-- `fact_requests` kent drie niveaus (merk/analyse/pagina). Voor feiten zijn er
-- maar twee die ertoe doen: geldt dit voor het hele merk (`analysis_id is null`)
-- of alleen binnen dit onderwerp. Een pagina-specifiek gegeven is geen feit over
-- het bedrijf maar een instructie voor één tekst, en hoort dus niet hier.

create table if not exists public.brand_facts (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  -- NULL = merkbreed, geldt voor élke analyse van deze klant.
  analysis_id    uuid references public.analyses (id) on delete cascade,

  -- De bewering zelf, in gewone taal. Dit is wat op de feitenkaart komt.
  text           text not null,
  -- Waar het vandaan komt: "klant, bevestigd 29-07", "site /tarieven".
  source         text not null,
  source_url     text,
  -- 'klant' | 'site' | 'onderzoek' — bepaalt de volgorde op de kaart
  -- (SOURCE_ORDER); door de klant bevestigde feiten staan bovenaan.
  kind           text not null default 'site',

  -- Mag dit item als BRON voor een bewering dienen? Een lap sitetekst is
  -- context, geen feit (zie FactItem.citable, R5-verificatie 31 juli).
  citable        boolean not null default true,
  -- false = dit is een VERBOD: de klant heeft expliciet gezegd dat het niet zo is.
  allowed        boolean not null default true,

  -- Ontdubbelsleutel (`claimKey()`), gedeeld met fact_requests.claim_key.
  fact_key       text not null,
  -- Wanneer dit feit opnieuw bevestigd moet worden (contentbriefing.md §7).
  verify_after   date,

  -- Waar dit feit vandaan komt, als het ergens vandaan komt.
  origin_fact_request_id uuid references public.fact_requests (id) on delete set null,
  origin_document_id     uuid references public.brand_documents (id) on delete set null,

  -- Vervangen door een nieuwer feit. Niet verwijderd: een al geschreven pagina
  -- die hiernaar verwijst moet na te trekken blijven.
  superseded_by  uuid references public.brand_facts (id) on delete set null,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists brand_facts_profile_idx
  on public.brand_facts (profile_id) where superseded_by is null;

create index if not exists brand_facts_analysis_idx
  on public.brand_facts (analysis_id) where analysis_id is not null and superseded_by is null;

-- Eén actueel feit per sleutel per scope. Dit is de index die ontdubbeling
-- afdwingt in plaats van hem te hopen — en die een tegenspraak zichtbaar maakt
-- op het moment dat hij ontstaat, in plaats van pas op de feitenkaart.
--
-- `coalesce` omdat NULL in een unieke index nooit botst: zonder dit zouden twee
-- merkbrede feiten met dezelfde sleutel er allebei in passen.
create unique index if not exists brand_facts_actueel_idx
  on public.brand_facts (profile_id, coalesce(analysis_id, '00000000-0000-0000-0000-000000000000'::uuid), fact_key)
  where superseded_by is null;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.brand_facts enable row level security;

drop policy if exists "brand_facts_select_own" on public.brand_facts;
create policy "brand_facts_select_own"
  on public.brand_facts for select
  using (exists (
    select 1 from public.profiles p
    where p.id = brand_facts.profile_id and p.user_id = (select auth.uid())
  ));

-- ── Terugkoppeling naar de geschreven pagina ────────────────────────────────
--
-- `claims_json` bevat per bewering het F-nummer. Dat blijft — het model heeft
-- een korte handle nodig — maar de code vult er sinds deze migratie ook het
-- FEIT-ID bij in, bij het opslaan. Daarmee is achteraf aanwijsbaar naar wélk
-- feit een bewering verwees, ook als de nummering intussen verschoven is.
comment on column public.content_pieces.claims_json is
  'Per bewering: het F-nummer (de handle die het model gebruikt), het letterlijke '
  'citaat, en sinds 0036 het brand_facts-id dat erachter zat — want een F-nummer is '
  'een positie en geen identiteit.';

-- ── Controle ────────────────────────────────────────────────────────────────
select count(*) as feiten from public.brand_facts;
