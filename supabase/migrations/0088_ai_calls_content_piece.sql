-- 0088: kosten per contentpagina meetbaar maken
--
-- ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
--
-- docs/tasks/herstelplan-na-audit.md T1.5: "Bewaak het budget per pagina. Eén
-- pagina hoort een euro of minder te kosten." `ai_calls` kende tot nu toe alleen
-- `analysis_id` en `profile_id`; een analyse heeft meerdere contentpagina's, dus
-- er was geen manier om de kosten van ÉÉN pagina bij elkaar op te tellen zonder
-- op tijdstip te gokken. Gemeten via zo'n gok op 2 september 2026: een
-- reparatieronde kost gemiddeld $0,26, drie rondes plus het concept dus al gauw
-- meer dan een euro (zie de bijgewerkte toelichting bij `REPAIR_MAX` in
-- lib/pipeline/content.ts). Met deze kolom is dat een query, geen gok.
--
-- Nullable en additief (conventie 4): een aanroep zonder bekende pagina (bv. de
-- allereerste schrijfaanroep van een pagina die nog geen briefingrij heeft)
-- laat het veld leeg. Onbekend is een betere waarde dan geraden (conventie 3).

alter table public.ai_calls
  add column if not exists content_piece_id uuid references public.content_pieces (id) on delete set null;

create index if not exists ai_calls_content_piece_idx on public.ai_calls (content_piece_id);

comment on column public.ai_calls.content_piece_id is
  '(0088) Welke contentpagina deze aanroep kostte, voor het budget-per-pagina uit het herstelplan (T1.5). NULL = niet aan een pagina te koppelen (bv. de allereerste schrijfaanroep vóór de briefingrij bestond).';
