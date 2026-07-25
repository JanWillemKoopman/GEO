-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — content-inventaris van het klantprofiel
-- Migratie 0004: een beperkte crawl (sitemap.xml, fallback: links vanaf de
-- homepage) van de website van een klantprofiel, zodat het rapport (B2) per
-- aanbeveling kan beslissen: bestaande pagina verbeteren, of nieuwe pagina.
-- Hoort bij het PROFIEL (niet de analyse) — dezelfde site wordt maar één keer
-- gecrawld, ongeacht hoeveel analyses/onderwerpen er later op draaien.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── profile_pages ────────────────────────────────────────────────────────────
create table public.profile_pages (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  url          text not null,
  title        text,
  text_excerpt text,
  created_at   timestamptz not null default now(),
  unique (profile_id, url)
);
create index profile_pages_profile_id_idx on public.profile_pages (profile_id);

-- ── content_pieces: nieuw/verbeteren-beslissing uit het rapport ─────────────
create type content_action as enum ('nieuw', 'verbeteren');

alter table public.content_pieces
  add column action content_action not null default 'nieuw',
  add column existing_url text;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.profile_pages enable row level security;

create policy "profile_pages_select_own"
  on public.profile_pages for select
  using (exists (
    select 1 from public.profiles p
    where p.id = profile_pages.profile_id and p.user_id = (select auth.uid())
  ));
