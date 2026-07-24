-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — migratie 0003: contentkwaliteit
-- Zie contentkwaliteit-analyse.md en abcplan.md §8 (herziene Fase C).
--
-- Voegt de schrijf-grondslag toe aan brand_dna (concrete feiten + stijlvoorbeelden)
-- en de kwaliteitsmeta aan content_pieces (redactie-score + review-vlag + ruwe
-- kritiek-output). Alle kolommen zijn additief en nullable/met default, dus veilig
-- op een bestaande database (geen backfill nodig).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── brand_dna: schrijf-grondslag voor Fase C ─────────────────────────────────
alter table public.brand_dna
  add column if not exists proof_points  text[] not null default '{}', -- A2: citeerbare feiten uit de site
  add column if not exists style_samples text[] not null default '{}'; -- A3: letterlijke stijlvoorbeelden

-- ── content_pieces: kwaliteitspoort (F1) + redactie-audit (C3) ────────────────
-- Bewust een boolean 'needs_review' i.p.v. een nieuwe enum-waarde: additief,
-- geen mutatie van het bestaande content_status-type, en de UI kan er direct op
-- filteren ("check nodig"). status blijft 'ready'.
alter table public.content_pieces
  add column if not exists quality_score     numeric(5, 2), -- 0-100 uit de redactie-pass
  add column if not exists needs_review      boolean not null default false, -- onder de drempel of regel-risico
  add column if not exists critique_raw_json jsonb;         -- volledige ruwe redactie/kritiek-output (§5: alles bewaren)
