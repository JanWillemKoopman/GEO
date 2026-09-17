-- ═══════════════════════════════════════════════════════════════════════════
-- ORBIT ENGINE: welke zoektermen horen bij welk merk en cluster
-- Migratie 0105 (docs/tasks/zoekdata-in-de-keten.md, blok B).
--
-- `keyword_demand` (migratie 0104) is generieke marktdata, zonder eigenaar.
-- Deze tabel legt de koppeling: welke zoekterm hoort bij welk merk, en waar
-- kwam hij vandaan. Dat laatste bepaalt waarom een zoekterm in een kanslijst
-- opduikt (herkomst "zoekverkeer" betekent bijvoorbeeld: deze term komt uit
-- een pagina die al vertoningen krijgt, niet uit een AI-gok).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.profile_keywords (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid references public.profile_topics(id) on delete cascade,
  keyword text not null,

  -- Waar deze zoekterm vandaan komt:
  --   aanbod       afgeleid uit de aanbodboom (lib/offerings.ts)
  --   zoekverkeer  al gezien in search_console_queries
  --   vraag        afgeleid uit een gemeten koopvraag (lib/pipeline/prompts.ts)
  --   handmatig    door een consultant toegevoegd
  origin text not null default 'aanbod',

  created_at timestamptz not null default now(),

  constraint profile_keywords_origin_check
    check (origin in ('aanbod', 'zoekverkeer', 'vraag', 'handmatig')),
  unique (profile_id, keyword)
);

create index if not exists profile_keywords_topic_idx
  on public.profile_keywords (topic_id);

alter table public.profile_keywords enable row level security;

drop policy if exists profile_keywords_select on public.profile_keywords;
create policy profile_keywords_select on public.profile_keywords
  for select using (profile_id in (select public.readable_profile_ids()));
