-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — één huidige versie per pagina, afgedwongen door de database
-- Migratie 0023: het sluitstuk op de titel-fix in lib/pipeline/content.ts.
--
-- WAT ER MIS WAS. De schrijver (gpt-4.1) bepaalde zelf de titel van de pagina en
-- die werd opgeslagen, terwijl de rest van de app deze pagina opzoekt op de
-- titel uit het RAPPORT: de poll-route van de knop, de "al gegenereerd"-
-- markering, en de idempotentiecheck van de schrijftaak. Herformuleerde het
-- model de titel — wat het regelmatig doet — dan vond geen van die drie de
-- pagina nog terug. Elke volgende klik op "genereer" maakte dan een nieuwe rij
-- mét `is_current = true` naast de bestaande, en de index op
-- (analysis_id, is_current) uit migratie 0019 is niet uniek, dus de database
-- liet dat toe. Vanaf twee huidige rijen gaf de lookup zélf een fout, waarna er
-- weer een duplicaat bij kwam — met elke keer de volle schrijfkosten.
--
-- De code pint de titel nu op die van de aanbeveling. Deze migratie zorgt dat
-- het niet nóg een keer stilletjes mis kan gaan.
--
-- Herhalen is veilig; er wordt niets verwijderd (alleen een vlag omgezet).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Bestaande duplicaten opruimen ────────────────────────────────────────
-- Zonder dit faalt de unieke index hieronder op elke database waar het probleem
-- zich al voorgedaan heeft. De HOOGSTE versie wint (dat is de nieuwste poging);
-- bij gelijke versie de laatst aangemaakte. De rest blijft gewoon bestaan als
-- historie — precies zoals oudere versies dat altijd al deden — maar telt niet
-- meer mee als "de actuele pagina".
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
-- Partieel (alleen op `is_current`), want oudere versies MOETEN dezelfde titel
-- mogen delen — dat is de hele opzet van het versiebeheer uit migratie 0019.
create unique index if not exists content_pieces_one_current_per_title_idx
  on public.content_pieces (analysis_id, title)
  where is_current;

-- Controleren:
--   select analysis_id, title, count(*)
--     from public.content_pieces where is_current
--    group by 1, 2 having count(*) > 1;   -- hoort leeg te zijn
