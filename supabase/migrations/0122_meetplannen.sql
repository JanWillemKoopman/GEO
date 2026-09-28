-- 0122: het meetplan, vastgelegd bij het goedkeuren
-- (docs/tasks/van-pijplijn-naar-kennissysteem.md, M1, §6.4)
--
-- Waarom. Sinds de contentketen opnieuw gebouwd is (WP1, 25 september 2026)
-- schrijft niemand meer in `content_piece_targets`: de oude schrijver
-- (`content.ts`, `saveTargets()`) bestaat niet meer. Elke pagina uit de nieuwe
-- keten had daardoor geen doelvragen, en `planImpactWaves()` sloeg de
-- effectmeting stilzwijgend over. `meetplannen` is de nieuwe, enige bron: één
-- rij per pagina, bevroren op het moment van goedkeuren (`lib/pipeline/meetplan.ts`).
--
-- `doelvragen` en `controlegroep`: jsonb-array van {promptId, tekst}. Een
-- array met een eigen kolom per veld zou een aparte tabel vragen voor iets
-- dat nooit los bevraagd wordt; de meting leest hem in zijn geheel.
--
-- `bronnen`: welke motoren meededen op het moment van vastleggen ('openai',
-- eventueel 'ai_overview'), zodat een latere aan/uit-schakeling de golven van
-- een al goedgekeurde pagina niet met terugwerkende kracht verandert.
--
-- `regio` en `zoekopdrachten`: horen bij M2 (Search Console per pagina, nog
-- niet gebouwd). De kolommen staan er al, zodat M2 geen tweede migratie nodig
-- heeft; ze blijven leeg tot M2 ze vult.
--
-- `adres`: leeg tot publicatie, dan gezet door `koppelAdresAanMeetplan()`.
--
-- Eén meetplan per pagina (unieke index op content_piece_id): een tweede
-- goedkeuring van dezelfde pagina (of een gelijktijdige dubbelklik) maakt er
-- geen tweede.
--
-- Nog niemand leest of schrijft hier client-side; alleen de service-role key
-- (zelfde patroon als klantkennis, migratie 0116).
--
-- Additief en idempotent (conventie 4).

create table if not exists public.meetplannen (
  id                uuid primary key default gen_random_uuid(),
  content_piece_id  uuid not null references public.content_pieces (id) on delete cascade,
  analysis_id       uuid not null references public.analyses (id) on delete cascade,
  doelvragen        jsonb not null default '[]'::jsonb,
  controlegroep     jsonb not null default '[]'::jsonb,
  bronnen           text[] not null default '{}',
  regio             text,
  zoekopdrachten    jsonb,
  adres             text,
  vastgelegd_op     timestamptz not null default now(),
  gepubliceerd_op   timestamptz
);

create unique index if not exists meetplannen_content_piece_idx
  on public.meetplannen (content_piece_id);

create index if not exists meetplannen_analysis_id_idx
  on public.meetplannen (analysis_id);

alter table public.meetplannen enable row level security;

comment on table public.meetplannen is
  'Het meetplan van een pagina (M1): doelvragen en controlegroep bevroren bij het goedkeuren, welke bronnen toen meededen, en het adres na publicatie. Vervangt content_piece_targets als bron voor de effectmeting.';
