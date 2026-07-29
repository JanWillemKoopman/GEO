-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — de cirkel rond (optimalisatie.md fase 5)
-- Migratie 0020: aantoonbaar maken dát het werkt — of dat het niet werkt.
--
-- Dit is de fase waarin de belofte aan de klant wordt ingelost of weerlegd. Tot
-- nu toe eindigde de keten bij "hier is je tekst". Wat daarna gebeurde, wist de
-- app niet: of de pagina ooit gepubliceerd werd, en of het iets uithaalde.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Publicatiestatus (5.1) ───────────────────────────────────────────────
-- De statuswaarde 'published' bestaat al sinds migratie 0001 en werd nergens
-- gezet — er was geen enkele manier om te zeggen "deze staat live".
alter table public.content_pieces
  add column published_at   timestamptz,
  add column published_url  text,
  -- Uitkomst van de controle (5.2): bestaat de URL, staat de tekst er echt,
  -- is de gestructureerde data geplaatst. Vrije vorm, want de set controles
  -- groeit en dat mag geen migratie kosten.
  add column publish_check_json jsonb,
  add column publish_checked_at timestamptz;

create index content_pieces_published_idx
  on public.content_pieces (analysis_id, published_at)
  where published_at is not null;

-- ── 2. Metingen met een doel (5.3) ──────────────────────────────────────────
-- Een hermeting ná publicatie is iets anders dan de maandelijkse meting: hij
-- betreft maar een handvol vragen en mag dus NOOIT meetellen in de
-- zichtbaarheidsscore. Anders zou een impactmeting van drie vragen als een
-- score over drie vragen het dashboard op gaan, en dat is een grafiek die liegt.
alter table public.tracking_runs
  -- 'periodic'  — de gewone meting (nulmeting en maandelijkse hermeting)
  -- 'impact'    — hermeting van de vragen bij één gepubliceerde pagina
  -- 'control'   — hermeting van vragen waar GEEN pagina voor gemaakt is (5.5)
  add column purpose text not null default 'periodic',
  -- Bij welke gepubliceerde pagina deze impact-/controlemeting hoort.
  add column content_piece_id uuid references public.content_pieces (id) on delete cascade,
  -- Welke golf: 1 = twee weken na publicatie, 2 = vier weken. AI-systemen nemen
  -- nieuwe content niet dezelfde dag op, en één meetmoment is te weinig om
  -- "opgepikt" van "toeval" te onderscheiden.
  add column impact_wave integer;

alter table public.tracking_runs
  add constraint tracking_runs_purpose_check
    check (purpose in ('periodic', 'impact', 'control'));

create index tracking_runs_impact_idx
  on public.tracking_runs (content_piece_id, impact_wave)
  where content_piece_id is not null;

-- Idempotentie voor impactmetingen: één meting per (pagina, golf, prompt,
-- doel). Zonder deze index zou een herhaalde taak dezelfde dure web-zoekactie
-- nog een keer doen.
create unique index tracking_runs_impact_unique_idx
  on public.tracking_runs (content_piece_id, impact_wave, prompt_id, purpose)
  where content_piece_id is not null;

-- ── 3. Het gemeten effect (5.4/5.5) ─────────────────────────────────────────
-- Bewaard en niet elke keer herrekend: de vergelijking leunt op metingen uit
-- verschillende periodes, en die query bij elke paginaweergave opnieuw draaien
-- is zonde — maar vooral: een cijfer dat de klant vandaag ziet moet morgen nog
-- hetzelfde zijn, ook als er intussen een nieuwe meting binnenkwam.
create table public.content_impact (
  id               uuid primary key default gen_random_uuid(),
  content_piece_id uuid not null references public.content_pieces (id) on delete cascade,
  analysis_id      uuid not null references public.analyses (id) on delete cascade,
  wave             integer not null,

  -- De vragen waarvoor deze pagina gemaakt is.
  target_total            integer not null default 0,
  target_before_mentioned integer not null default 0,
  target_after_mentioned  integer not null default 0,

  -- De CONTROLEGROEP (5.5): vragen uit dezelfde analyse waar géén pagina voor
  -- gemaakt is. Zonder deze vergelijking is "je score steeg" geen uitspraak —
  -- zichtbaarheid kan om tien andere redenen stijgen. "Op de vragen waarvoor je
  -- publiceerde +18, op de rest +3" is wél verdedigbaar.
  control_total            integer not null default 0,
  control_before_mentioned integer not null default 0,
  control_after_mentioned  integer not null default 0,

  -- Verschil in procentpunten, en de drempel waarboven dat verschil buiten de
  -- ruis valt (zie lib/stats/uncertainty.ts).
  target_delta   numeric(6, 2),
  control_delta  numeric(6, 2),
  delta_threshold numeric(6, 2),
  -- 'gestegen' | 'gelijk' | 'gedaald' | 'te_weinig_data'
  verdict        text not null default 'te_weinig_data',

  computed_at    timestamptz not null default now()
);

create unique index content_impact_piece_wave_idx
  on public.content_impact (content_piece_id, wave);
create index content_impact_analysis_idx on public.content_impact (analysis_id);

-- ── 4. Herinnering bij niet-gepubliceerde content (5.8) ─────────────────────
-- Eén keer, niet zeurend. Vandaar een kolom en geen teller: is hij gezet, dan
-- sturen we nooit meer een herinnering voor deze analyse.
alter table public.analyses
  add column publish_reminder_sent_at timestamptz;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.content_impact enable row level security;

create policy "content_impact_select_own"
  on public.content_impact for select
  using (exists (
    select 1 from public.analyses a
    where a.id = content_impact.analysis_id and a.user_id = (select auth.uid())
  ));
