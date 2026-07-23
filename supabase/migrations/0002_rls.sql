-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — Row Level Security (abcplan.md §5 "RLS- en schrijfstrategie", §12.20)
--
-- VASTGELEGDE REGEL:
--   • Lezen  → client leest RECHTSTREEKS via de eigen sessie. Policies zijn
--              SELECT-only, gefilterd op user_id (direct op analyses, via
--              analysis_id op de rest).
--   • Schrijven → ALTIJD via een Next.js API-route met de service-role key
--              (omzeilt RLS) + expliciete ownership-check in de route.
--              Er zijn dus BEWUST geen INSERT/UPDATE/DELETE-policies.
--   • jobs   → GEEN client-toegang (ook geen SELECT): RLS aan, nul policies
--              = standaard deny-all in Supabase.
--
-- Reden dat writes niet via RLS lopen: Postgres RLS werkt op rij-niveau, niet
-- op kolom-niveau, en kan dus niet afdwingen welke specifieke velden een klant
-- mag wijzigen (bv. wél tracking_enabled, niet topic/status). Die logica hoort
-- in de API-route.
-- ═══════════════════════════════════════════════════════════════════════════

-- RLS aanzetten op alle tabellen.
alter table public.analyses               enable row level security;
alter table public.brand_dna              enable row level security;
alter table public.prompts                enable row level security;
alter table public.tracking_runs          enable row level security;
alter table public.tracking_run_mentions  enable row level security;
alter table public.visibility_scores      enable row level security;
alter table public.competitor_breakdown   enable row level security;
alter table public.reports                enable row level security;
alter table public.content_pieces         enable row level security;
alter table public.jobs                   enable row level security;

-- ── analyses: eigenaar mag zijn eigen rijen lezen ────────────────────────────
create policy "analyses_select_own"
  on public.analyses for select
  using (user_id = (select auth.uid()));

-- ── kindtabellen met directe analysis_id: lezen als je de analyse bezit ───────
create policy "brand_dna_select_own"
  on public.brand_dna for select
  using (exists (
    select 1 from public.analyses a
    where a.id = brand_dna.analysis_id and a.user_id = (select auth.uid())
  ));

create policy "prompts_select_own"
  on public.prompts for select
  using (exists (
    select 1 from public.analyses a
    where a.id = prompts.analysis_id and a.user_id = (select auth.uid())
  ));

create policy "tracking_runs_select_own"
  on public.tracking_runs for select
  using (exists (
    select 1 from public.analyses a
    where a.id = tracking_runs.analysis_id and a.user_id = (select auth.uid())
  ));

create policy "visibility_scores_select_own"
  on public.visibility_scores for select
  using (exists (
    select 1 from public.analyses a
    where a.id = visibility_scores.analysis_id and a.user_id = (select auth.uid())
  ));

create policy "competitor_breakdown_select_own"
  on public.competitor_breakdown for select
  using (exists (
    select 1 from public.analyses a
    where a.id = competitor_breakdown.analysis_id and a.user_id = (select auth.uid())
  ));

create policy "reports_select_own"
  on public.reports for select
  using (exists (
    select 1 from public.analyses a
    where a.id = reports.analysis_id and a.user_id = (select auth.uid())
  ));

create policy "content_pieces_select_own"
  on public.content_pieces for select
  using (exists (
    select 1 from public.analyses a
    where a.id = content_pieces.analysis_id and a.user_id = (select auth.uid())
  ));

-- ── tracking_run_mentions: ownership via tracking_runs → analyses ─────────────
create policy "tracking_run_mentions_select_own"
  on public.tracking_run_mentions for select
  using (exists (
    select 1
    from public.tracking_runs tr
    join public.analyses a on a.id = tr.analysis_id
    where tr.id = tracking_run_mentions.tracking_run_id
      and a.user_id = (select auth.uid())
  ));

-- ── jobs: GEEN policies → deny-all voor alle client-rollen ───────────────────
-- (Bewust leeg. Alleen de service-role, die RLS omzeilt, raakt deze tabel aan.)
