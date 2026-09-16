-- 0101: hoeveel pagina's kregen alleen een titel/meta-blik, niet een volledige lezing
--
-- ── WAAROM DIT NODIG WAS ─────────────────────────────────────────────────────
--
-- Nova (InSpace) leest tijdens onboarding expliciet ook de titel en de
-- meta-description van pagina's los van de volledige crawl ("Reading your
-- titles and meta descriptions…", zie Nova_onboarding.md §3b). ORBIT ENGINE las
-- tot nu toe alleen de gekozen top-`max_inventory_pages` volledig, en koos die
-- top puur op het URL-pad (`lib/pipeline/url-priority.ts`): een dienstenpagina
-- met een generieke slug zoals `/diensten/42` werd daardoor even laag
-- gewaardeerd als een blogartikel, ook al zegt de titel "Vloerverwarming
-- installeren" precies waar de pagina over gaat.
--
-- Sinds deze ronde doet `crawlInventory()` (lib/crawler.ts) bij een site die
-- groter is dan het plafond eerst een goedkope titel+meta-doorgang over een
-- veel groter deel van de sitemap (`MAX_LIGHTWEIGHT_PAGES`, geen volledige
-- tekst, geen structured-data-oogst), en gebruikt die titels en
-- meta-descriptions als extra signaal om de uiteindelijke `max_inventory_pages`
-- te kiezen. Dat cijfer stond nergens, en zonder dat cijfer is "we keken breder"
-- niet van "we keken niet breder" te onderscheiden op het scherm.
--
-- Additief en idempotent (conventie 4): een bestaand profiel krijgt geen
-- waarde totdat de eerstvolgende crawlronde er een zet, en dat is de juiste
-- waarde voor alles wat nu al gecrawld is: die ronde deed deze stap nog niet.

alter table public.profiles
  add column if not exists crawl_lightly_scanned integer;

comment on column public.profiles.crawl_lightly_scanned is
  '(0101) Aantal pagina''s waarvan bij de laatste crawlronde alleen titel en meta-description zijn gelezen (niet de volledige tekst), als extra signaal voor de paginakeuze. Null = deze stap draaide nog niet mee.';

-- Controle: de kolom bestaat.
select count(*) as heeft_crawl_lightly_scanned
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'crawl_lightly_scanned';
