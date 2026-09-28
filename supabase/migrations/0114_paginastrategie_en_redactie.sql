-- 0114: paginastrategie, eindredactie en publicatiegereedheid per versie, plus de
-- duur van elke AI-aanroep (docs/tasks/contentpijplijn-publicatiewaardig.md, WP3)
--
-- Waarom. De keuze wat er op een pagina komt, verhuist van het contract en de
-- schrijfopdracht (Luna, samen een halve cent) naar een eigen stap op Sol met
-- extra denktijd (L5). Die beslissing moet naast de tekst bewaard worden, zodat
-- bij elke zin na te gaan is welke keuze hem veroorzaakte (conventie 8). Het
-- logboek van de eindredactie (WP5) en het oordeel over publicatiegereedheid
-- (§12.3) horen er op dezelfde manier bij.
--
-- `ai_calls.duration_ms`: strategie en eindredactie draaien op denktijd hoog en
-- een aanroep mag hoogstens 150 seconden duren (`CALL_BUDGET_MS`). Het plan
-- eist dat hun duur vastligt; boven 120 seconden gaan ze naar de
-- achtergrondmodus van de API. Dat besluit leest deze kolom. Geldt voor elke
-- aanroep, niet alleen deze twee: een tijdmeting erbij kost niets.
--
-- Additief en idempotent (conventie 4).

alter table public.content_pieces
  add column if not exists strategy_json  jsonb,
  add column if not exists edit_log_json  jsonb,
  add column if not exists readiness_json jsonb;

alter table public.ai_calls
  add column if not exists duration_ms integer;

-- Voor het achtergrondbesluit: de laatste duren per soort aanroep.
create index if not exists ai_calls_kind_duur_idx
  on public.ai_calls (kind, created_at desc)
  where duration_ms is not null;

comment on column public.content_pieces.strategy_json is
  'De paginastrategie (L5, WP3 van contentpijplijn-publicatiewaardig.md): wat er op de pagina '
  'komt en wat niet, met de correcties die de code erop deed. Of een wachtstand op een conflict.';
comment on column public.ai_calls.duration_ms is
  'Hoe lang de aanroep duurde, in milliseconden, pogingen binnen de SDK meegerekend. NULL voor '
  'aanroepen van vóór migratie 0114.';
