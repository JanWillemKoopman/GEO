-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — kostenregistratie per AI-aanroep (optimalisatie.md 0.6)
-- Migratie 0012: één regel per OpenAI-aanroep, met tokens en geschatte kosten.
--
-- WAAROM EEN APARTE TABEL en niet een cost_usd-kolom per tabel:
-- de kosten van een analyse zitten verspreid over meting (tracking_runs),
-- rapport (reports), content (content_pieces) én het profielonderzoek (profiles,
-- dat aan meerdere analyses hangt). Een kolom per tabel maakt "wat kost deze
-- analyse?" een optelsom over vijf tabellen met verschillende sleutels. Eén
-- logboek maakt het één query — en sluit aan bij het bestaande principe uit
-- abcplan.md §5: we bewaren alles.
--
-- tracking_runs.cost_usd blijft bestaan en wordt nu ook echt gevuld, zodat de
-- kosten per meting op de meting zelf zichtbaar zijn zonder join.
--
-- GEEN client-toegang (RLS aan, nul policies = deny-all, net als `jobs`):
-- dit is bedrijfsinformatie voor de exploitant, niet voor de klant. Uitlezen
-- gebeurt via een API-route met de service-role key + eigenaarscontrole.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.ai_calls (
  id                 uuid primary key default gen_random_uuid(),
  -- Beide nullable: een profielonderzoek hangt aan een profiel zonder analyse,
  -- een meting aan een analyse. Waar allebei bekend is, vullen we allebei.
  analysis_id        uuid references public.analyses (id) on delete cascade,
  profile_id         uuid references public.profiles (id) on delete cascade,
  -- Welke stap in de pijplijn: 'profile_research' | 'topic_research' | 'prompts'
  -- | 'volume_calibration' | 'measure_simulate' | 'measure_mention'
  -- | 'gap_analysis' | 'report' | 'content_draft' | 'content_critique'.
  -- Vrije tekst i.p.v. enum: er komen stappen bij (fase 4/7/8) en een enum
  -- uitbreiden is een migratie, een tekstwaarde niet.
  kind               text not null,
  model              text not null,
  input_tokens       integer,
  output_tokens      integer,
  total_tokens       integer,
  web_search         boolean not null default false,
  -- Geschat, niet afgerekend: zie lib/openai/pricing.ts (cached input-tokens
  -- worden goedkoper afgerekend dan hier berekend).
  cost_usd           numeric(10, 6),
  openai_response_id text,
  created_at         timestamptz not null default now()
);

create index ai_calls_analysis_idx on public.ai_calls (analysis_id);
create index ai_calls_profile_idx  on public.ai_calls (profile_id);
create index ai_calls_kind_idx     on public.ai_calls (kind, created_at);

-- Deny-all: RLS aan, geen enkele policy (zelfde patroon als public.jobs).
alter table public.ai_calls enable row level security;
