-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — migratie 0023 (één huidige versie per pagina)
--
-- Vervolg op RUN_0012_TOT_0017.sql, RUN_0018_EN_0019.sql, RUN_0020.sql,
-- RUN_0021.sql en RUN_0022.sql. Voer die EERST uit.
--
-- Herhalen is veilig; er wordt niets verwijderd (alleen een vlag omgezet).
--
-- CONTROLE achteraf — beide moeten kloppen:
--
--   -- 1. geen dubbele huidige pagina's meer:
--   select analysis_id, title, count(*)
--     from public.content_pieces where is_current
--    group by 1, 2 having count(*) > 1;        -- hoort 0 rijen te geven
--
--   -- 2. de index staat er:
--   select to_regclass('public.content_pieces_one_current_per_title_idx') is not null as index_aanwezig;
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Bestaande duplicaten opruimen ────────────────────────────────────────
-- De hoogste versie wint; oudere blijven bestaan als historie maar zijn niet
-- langer "de actuele pagina". Moet vóór de index, anders faalt die.
with genummerd as (
  select
    id,
    row_number() over (
      partition by analysis_id, title
      order by version desc, created_at desc
    ) as rang
  from public.content_pieces
  where is_current
)
update public.content_pieces cp
   set is_current = false
  from genummerd g
 where cp.id = g.id
   and g.rang > 1;

-- ── 2. Het opnieuw laten ontstaan onmogelijk maken ──────────────────────────
create unique index if not exists content_pieces_one_current_per_title_idx
  on public.content_pieces (analysis_id, title)
  where is_current;
