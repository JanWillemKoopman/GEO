-- ═══════════════════════════════════════════════════════════════════════════
-- ORBIT ENGINE: de zoekopdrachten uit Search Console erbij
-- Migratie 0103 (docs/tasks/zoekdata-in-de-keten.md, blok A).
--
-- WAAROM DIT ER NU BIJ KOMT
--
-- Migratie 0052 liet de query-dimensie bewust weg: "een tweede tabel waard
-- zodra ze echt gebruikt worden". Dat moment is nu, met de kansenbron
-- "zoekverkeer" (wat scoort al bijna, maar nog niet) en de positieverdeling op
-- het zoekverkeerscherm.
--
-- WAAROM EEN EIGEN TABEL EN GEEN KOLOM OP search_console_days
--
-- `search_console_days` is per pagina per dag. Eén pagina heeft tientallen tot
-- honderden zoekopdrachten. Dat past niet in een rij, en het zou de bestaande
-- tabel (die de kerncijfers van het zoekverkeerscherm draagt) onnodig zwaar
-- maken voor schermen die alleen de paginatotalen nodig hebben.
--
-- ⚠️ HET OMVANGSRISICO STAAT IN HET PLAN, NIET HIERIN OPGELOST
--
-- Zoekopdracht × pagina × dag kan bij een grote site tot duizenden rijen per
-- dag oplopen. Google's eigen antwoord is al begrensd (25.000 rijen per
-- aanroep, hetzelfde plafond als search_console_days), dus de groei is nooit
-- groter dan wat er hoe dan ook al werd opgehaald en weggegooid. Een verdere
-- ondergrens (bijvoorbeeld: alleen zoekopdrachten met minstens één vertoning)
-- volgt zodra er productiecijfers zijn om op te rekenen (conventie 10).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.search_console_queries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  query text not null,
  page text not null,

  clicks integer not null default 0,
  impressions integer not null default 0,
  position numeric(6, 2),

  created_at timestamptz not null default now(),

  -- Zelfde reden als bij search_console_days: Google herziet de laatste dagen
  -- nog na, dus een tweede synchronisatie over dezelfde dag moet een correctie
  -- zijn en geen dubbele rij.
  unique (profile_id, day, query, page)
);

-- Voor "welke zoekopdrachten hoort bij deze pagina" (de kansenbron) en voor
-- de positieverdeling over een venster (per zoekopdracht, alle pagina's).
create index if not exists gsc_queries_profile_page_idx
  on public.search_console_queries (profile_id, page, day);
create index if not exists gsc_queries_profile_query_idx
  on public.search_console_queries (profile_id, query, day);

alter table public.search_console_queries enable row level security;

drop policy if exists gsc_queries_select on public.search_console_queries;
create policy gsc_queries_select on public.search_console_queries
  for select using (profile_id in (select public.readable_profile_ids()));
