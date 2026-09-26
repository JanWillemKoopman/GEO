-- 0116: de kennislaag (docs/tasks/van-pijplijn-naar-kennissysteem.md, K1, §6.1)
--
-- Waarom. Wat ORBIT over een bedrijf weet, staat vandaag op zes plekken
-- (`docs/tasks/kennismodel-inventaris.md`: 193 kolommen, waarvan 55 kennis):
-- `profiles`, `brand_facts`, `profile_offerings`, `fact_requests`,
-- `profile_strategy` en de ruwe uitvoer in `profile_facets`. Geen van die plekken
-- zegt in één vast veld of iets gezien, gezegd, bevestigd of alleen gedacht is.
-- Deze tabel is de ene plek, met die status erbij.
--
-- Deze migratie maakt alleen de tabel. Niemand schrijft er nog in (dat is K2 en
-- verder), niemand leest eruit (K6). De oude tabellen blijven zoals ze zijn.
--
-- Additief en idempotent (conventie 4): `create ... if not exists`, en een
-- check-constraint in een `do`-blok dat een bestaande laat staan. De `drop policy
-- if exists` is de bestaande vorm om een policy te kunnen herhalen (zie 0038),
-- geen verwijdering van data.

create table if not exists public.klantkennis (
  id                      uuid primary key default gen_random_uuid(),
  profile_id              uuid not null references public.profiles (id) on delete cascade,

  -- identiteit, aanbod, doelgroep, positionering, bewijs, stem, verhaal, grens, geleerd
  domein                  text not null,
  -- Binnen het domein: prijs, termijn, werkgebied, dienst, bezwaar, voorbeeld,
  -- verboden woord, enzovoort. Vrije tekst: de soorten groeien met het terugvullen
  -- (K3), en een check-constraint is in deze database alleen te verruimen door hem
  -- eerst te verwijderen.
  soort                   text,
  -- De uitspraak in gewone taal, zoals een schrijver hem kan gebruiken.
  bewering                text not null,
  -- Genormaliseerd waar het kan, anders NULL (conventie 3).
  waarde                  jsonb,

  -- waargenomen: uit een bron, met citaat. verklaard: de klant of de consultant
  -- zei het. bevestigd: door een mens bevestigd. afgeleid: een model denkt het.
  status                  text not null,
  -- sterk, gewoon, geen (besluit V12). Zegt hoe overtuigend de bewering is, niet
  -- hoe zeker we hem weten; dat is de status.
  bewijskracht            text,

  -- website, klant, gesprek, document, extern, meting, ai
  bron                    text not null,
  bron_url                text,
  -- Letterlijk zoals het in de bron staat. Verplicht bij waargenomen.
  citaat                  text,

  -- Wie het vastlegde: een mens (`vastgelegd_door`), of bij code en modellen de
  -- taaksoort (`vastgelegd_door_taak`, bijvoorbeeld 'profile_synthesis' of
  -- 'kennis_terugvullen'). Minstens één van de twee.
  vastgelegd_door         uuid references auth.users (id) on delete set null,
  vastgelegd_door_taak    text,
  vastgelegd_op           timestamptz not null default now(),
  bevestigd_door          uuid references auth.users (id) on delete set null,
  bevestigd_op            timestamptz,

  -- Voor wat kan verouderen: prijzen, termijnen, openingstijden.
  laatst_gecontroleerd_op timestamptz,
  verloopt_op             date,

  -- content: mag op een pagina. intern: alleen voor vragen, kansen en analyse.
  -- verboden: de klant zei "dit niet"; de schrijver krijgt het als verbod.
  gebruik                 text not null,

  -- Voor welke andere kennis dit geldt: deze dienst, deze regio, deze doelgroep.
  -- Leeg is merkbreed. Een array kan geen foreign key dragen; `lib/kennis/`
  -- controleert dat de verwijzingen bij hetzelfde merk horen.
  geldt_voor              uuid[] not null default '{}',
  -- Alleen voor dit onderwerp of deze ene pagina (besluit V13). Leeg is geen
  -- beperking. CASCADE en niet SET NULL: kennis die alleen voor één pagina gold,
  -- mag nooit stil merkbreed worden omdat die pagina verdween.
  analysis_id             uuid references public.analyses (id) on delete cascade,
  content_piece_id        uuid references public.content_pieces (id) on delete cascade,

  -- Een nieuwere versie. Een item wordt nooit verwijderd, alleen vervangen.
  vervangen_door          uuid references public.klantkennis (id) on delete set null,

  -- Waar het vandaan kwam: de tabel en de rij (een klantvraag, een document, een
  -- meting, een oude rij in `brand_facts`). Zonder tabelnaam is een id niet terug
  -- te vinden, want hij kan uit zes tabellen komen.
  herkomst_tabel          text,
  herkomst_id             uuid,
  -- Ontdubbelsleutel (K2, zoals `claimKey()`): hetzelfde feit twee keer vastleggen
  -- geeft één item.
  sleutel                 text,
  -- Wat de bron letterlijk opleverde (conventie 8).
  ruw                     jsonb,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── De vaste waarden ──────────────────────────────────────────────────────────
do $$ begin
  alter table public.klantkennis add constraint klantkennis_domein_check check (
    domein in ('identiteit', 'aanbod', 'doelgroep', 'positionering', 'bewijs', 'stem', 'verhaal', 'grens', 'geleerd'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.klantkennis add constraint klantkennis_status_check check (
    status in ('waargenomen', 'verklaard', 'bevestigd', 'afgeleid'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.klantkennis add constraint klantkennis_bron_check check (
    bron in ('website', 'klant', 'gesprek', 'document', 'extern', 'meting', 'ai'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.klantkennis add constraint klantkennis_gebruik_check check (
    gebruik in ('content', 'intern', 'verboden'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.klantkennis add constraint klantkennis_bewijskracht_check check (
    bewijskracht is null or bewijskracht in ('geen', 'gewoon', 'sterk'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.klantkennis add constraint klantkennis_herkomst_tabel_check check (
    herkomst_tabel is null or herkomst_tabel in ('brand_facts', 'profile_offerings', 'profiles', 'fact_requests',
      'brand_documents', 'profile_strategy', 'profile_facets', 'content_impact'));
exception when duplicate_object then null; end $$;

-- ── De regels die de database zelf bewaakt ───────────────────────────────────
--
-- Dezelfde regels staan in `lib/kennis/regels.ts`, zodat de code een nette fout
-- geeft. Hier staan ze nog een keer omdat een regel die alleen in de code staat
-- een intentie is (conventie 1): een script of een tweede route die
-- `lib/kennis/` overslaat, loopt hier alsnog vast.

-- Waargenomen betekent: er is een plek en een letterlijke tekst (§6.1).
do $$ begin
  alter table public.klantkennis add constraint klantkennis_waargenomen_citaat_check check (
    status <> 'waargenomen'
    or (coalesce(btrim(citaat), '') <> '' and coalesce(btrim(bron_url), '') <> ''));
exception when duplicate_object then null; end $$;

-- AI is niet de database (P2, §4 regel 2): een model zegt nooit namens de klant
-- iets, en bevestigt nooit.
do $$ begin
  alter table public.klantkennis add constraint klantkennis_ai_niet_verklaard_check check (
    not (bron = 'ai' and status in ('verklaard', 'bevestigd')));
exception when duplicate_object then null; end $$;

-- Bevestigd kan alleen van een mens komen, en dat moet te zien zijn.
do $$ begin
  alter table public.klantkennis add constraint klantkennis_bevestigd_door_mens_check check (
    status <> 'bevestigd' or (bevestigd_door is not null and bevestigd_op is not null));
exception when duplicate_object then null; end $$;

-- Afgeleid is geen feit (P3): het mag nooit het gebruik "content" hebben.
do $$ begin
  alter table public.klantkennis add constraint klantkennis_afgeleid_niet_content_check check (
    not (status = 'afgeleid' and gebruik = 'content'));
exception when duplicate_object then null; end $$;

-- Iemand of iets heeft het vastgelegd.
do $$ begin
  alter table public.klantkennis add constraint klantkennis_vastgelegd_check check (
    vastgelegd_door is not null or coalesce(btrim(vastgelegd_door_taak), '') <> '');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.klantkennis add constraint klantkennis_bewering_check check (
    btrim(bewering) <> '');
exception when duplicate_object then null; end $$;

-- ── Indexen ───────────────────────────────────────────────────────────────────
--
-- Het meest gelezen: de actuele kennis van één merk (blok A, het kennisoverzicht).
create index if not exists klantkennis_actueel_idx
  on public.klantkennis (profile_id, domein)
  where vervangen_door is null;

-- Ontdubbelen (K2): per merk één actueel item per sleutel.
create unique index if not exists klantkennis_sleutel_idx
  on public.klantkennis (profile_id, sleutel)
  where vervangen_door is null and sleutel is not null;

-- Terugvinden wat uit een oude rij kwam (K3 is idempotent: eerst kijken, dan schrijven).
create index if not exists klantkennis_herkomst_idx
  on public.klantkennis (herkomst_tabel, herkomst_id)
  where herkomst_id is not null;

create index if not exists klantkennis_pagina_idx
  on public.klantkennis (content_piece_id)
  where content_piece_id is not null;

create index if not exists klantkennis_analyse_idx
  on public.klantkennis (analysis_id)
  where analysis_id is not null;

-- ── Alleen medewerkers lezen (besluit V11) ────────────────────────────────────
--
-- De klant ziet het kennisoverzicht niet (besluit V6), en de tabel bevat wat een
-- model alleen denkt. Blok A en de schermen lezen via de server met de
-- service-role key. Schrijven loopt uitsluitend via `lib/kennis/` met die sleutel
-- (conventie 6), dus er is geen schrijfpolicy.
alter table public.klantkennis enable row level security;

drop policy if exists "klantkennis_select_staff" on public.klantkennis;
create policy "klantkennis_select_staff"
  on public.klantkennis for select to authenticated
  using (public.is_staff());

comment on table public.klantkennis is
  'De kennislaag: alles wat ORBIT over een bedrijf weet, met status, herkomst en '
  'gebruik (K1 van van-pijplijn-naar-kennissysteem.md). Alleen voor medewerkers.';
