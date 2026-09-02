-- ═══════════════════════════════════════════════════════════════════════════
-- 0084 · Sales: een geplande hermeting, de ruwe uitvoer, en de kosten per markt
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ HET NUMMER. Dit bestand heette `0083` toen hij op productie draaide (zie
-- de Supabase-migratiegeschiedenis). Dat nummer bleek diezelfde middag door
-- `0083_clusterlabels.sql` gebruikt te zijn, dus hier heet hij `0084`. De
-- inhoud is ongewijzigd en additief, dus opnieuw draaien is een no-op.
--
-- WAT DIT TOEVOEGT
--
-- Drie kolommen op de markt voor een hermeting die je vooruit kunt zetten, één
-- kolom op `ai_calls` voor de ruwe uitvoer van elke aanroep, en één op de markt
-- voor de kosten die er tot nu toe in zitten. Alles additief, niets verandert
-- van betekenis.
--
-- ⚠️ WAAROM EEN GEPLANDE HERMETING EN GEEN VAST RITME
--
-- Het sterkste verkoopmoment dat deze module kent, is een DALING: "je bent
-- sinds juni gezakt van achttien naar negen" is een gebeurtenis, en die roept
-- vanzelf de vraag op wat er veranderd is. Dat type kan pas bestaan vanaf de
-- tweede meetronde (plan hoofdstuk 12, type 8). Zonder een tweede ronde is elke
-- markt dus een eenmalige oogst.
--
-- Een vast ritme voor alle markten zou dat oplossen en tegelijk elke maand geld
-- uitgeven aan markten waar niemand mee werkt. Vandaar één datum per markt, met
-- de hand gezet, die één keer afgaat. De eigenaar kiest wanneer een markt het
-- waard is om opnieuw te meten, en de app onthoudt het.
--
-- ⚠️ `remeasure_done_at` IS HET SLOT OP DE DEUR
--
-- De cron kijkt naar markten waarvan de datum verstreken is en `done_at` nog
-- leeg. Zonder die tweede kolom zou een markt elke minuut opnieuw gemeten
-- worden zodra de datum voorbij is, en dat is de duurste lus die dit systeem kan
-- maken: veertig betaalde vragen per keer.
--
-- ⚠️ `ai_calls.raw_json` IS CONVENTIE 8, EN HIJ ONTBRAK
--
-- "Elke AI-call bewaart zijn volledige ruwe JSON naast de uitgesplitste
-- kolommen, voor de audit-trail." Voor de metingen gebeurde dat al
-- (`sales_answers.raw`), voor de rest niet: er stond wel wat een aanroep kostte,
-- niet wat het model zei. Op 1 september 2026 werd een conceptmail afgekeurd
-- omdat er een cijfer in stond dat niet gemeten was, en daarna was niet meer
-- terug te lezen wát er stond. Bij een bericht dat naar een ondernemer gaat, is
-- dat precies het verkeerde moment om je bron kwijt te zijn.
--
-- ⚠️ `cost_cents` BESTOND AL EN WERD NOOIT GEVULD
--
-- De kolom staat er sinds `0068` en geen enkele regel code schreef hem. Het
-- kostenlogboek (`ai_calls.sales_market_id`) is de waarheid; deze kolom is de
-- kopie die een scherm kan tonen zonder over alle aanroepen te sommeren. Hij
-- wordt bijgewerkt na elke stap die geld kost.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── De geplande hermeting ──────────────────────────────────────────────────
alter table public.sales_markets
  add column if not exists remeasure_at timestamptz,
  add column if not exists remeasure_set_by uuid references auth.users(id) on delete set null,
  add column if not exists remeasure_done_at timestamptz,
  add column if not exists remeasure_note text;

comment on column public.sales_markets.remeasure_at is
  'Wanneer deze markt eenmalig opnieuw gemeten moet worden. Leeg is geen hermeting.';
comment on column public.sales_markets.remeasure_done_at is
  'Gevuld zodra de geplande hermeting is gestart. Voorkomt dat de cron hem blijft herhalen.';

-- Alleen de markten die echt wachten. Een gedeeltelijke index, want dat zijn er
-- hooguit een handvol tussen alle markten.
create index if not exists sales_markets_remeasure_idx
  on public.sales_markets (remeasure_at)
  where remeasure_at is not null and remeasure_done_at is null;

-- ── De ruwe uitvoer van elke AI-aanroep ────────────────────────────────────
alter table public.ai_calls
  add column if not exists raw_json jsonb;

comment on column public.ai_calls.raw_json is
  'De volledige uitvoer van het model, ook als de controle hem daarna verwierp (conventie 8).';
