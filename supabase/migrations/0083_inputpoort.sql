-- 0083: de inputpoort, de onderbouwingsgraad en de sectie achter een vraag
--
-- ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
--
-- docs/tasks/vragen-voor-het-schrijven.md. De app plande tot nu toe OM een gat
-- in haar kennis heen in plaats van ernaar te vragen: regel (d) van de
-- contractprompt zei letterlijk "daar mag je omheen plannen, niet doorheen".
-- Gemeten in de contentronde van 1 september 2026 (Gasservice Brabant): van de
-- 25 secties van de Tilburg-pagina rustten er 18 op geen enkel feit over het
-- bedrijf, alle vier de pagina's eindigden op "check nodig", en samen bevatten
-- ze 5 concrete getallen tegen 80 zinnen die de lezer opdragen iets na te
-- vragen.
--
-- Het contract beschrijft vanaf nu het IDEAAL (wat een goede pagina nodig
-- heeft), de feitenkaart de werkelijkheid, en het verschil is de vragenlijst.
-- Daarvoor moet drie dingen bewaard kunnen worden.
--
-- ── content_pieces.input_coverage ───────────────────────────────────────────
--
-- De ONDERBOUWINGSGRAAD: welk deel van de secties die iets over dit bedrijf
-- moeten zeggen, dat ook echt kan (lib/pipeline/input-coverage.ts). Een getal
-- van 0 tot 100, of NULL als de pagina geen enkele merkgebonden sectie heeft.
--
-- NULL is hier een echte waarde en geen ontbrekende (conventie 3): een pagina
-- die volledig uit algemene uitleg bestaat is geen slechte pagina, hij is
-- alleen geen pagina waarvoor de klant iets hoeft aan te leveren. Een 0 zou
-- daar het verkeerde antwoord zijn en de inputpoort ten onrechte dichtzetten.
--
-- Bewust een EIGEN kolom naast `coverage_score`, dat iets anders meet: dat is
-- de dekking van de GESCHREVEN TEKST op het contract (achteraf), dit is de
-- dekking van het CONTRACT op de feitenkaart (vooraf). Ze horen bij twee
-- verschillende poorten en mogen niet in elkaar geschoven worden.
--
-- ── content_pieces.write_mode ───────────────────────────────────────────────
--
-- Wat de klant koos toen de inputpoort deze pagina tegenhield. NULL is de
-- normale gang van zaken (gewoon schrijven met alles wat er is); 'algemeen'
-- betekent: schrijf hem bewust zonder uitspraken over dit bedrijf, als
-- kennisbankartikel. Dat is de derde uitweg naast beantwoorden en laten vallen,
-- en zonder die uitweg is de poort een muur (docs/ux-design.md §4: een scherm
-- dat alleen zegt wat er niet kan is een dood einde).
--
-- ── fact_requests.section_refs ──────────────────────────────────────────────
--
-- Bij welke secties van welke contracten deze vraag hoort, als lijst van
-- '<content_piece_id>:<sectie-id>'. Dit is wat overslaan een zichtbare prijs
-- geeft: slaat de klant de vraag over, dan vallen die secties uit hun contract
-- en wordt de pagina korter in plaats van vager. Zonder deze koppeling is een
-- overgeslagen vraag niet aan een sectie te verbinden en verdampt het gat,
-- precies wat er op 1 september gebeurde.
--
-- ⚠️ Een LIJST en geen enkel veld, want één vraag kan bij meerdere pagina's
-- horen. De ontdubbeling in `briefing-select.ts` voegt twee vragen over
-- hetzelfde onderwerp samen tot één, en die dekt dan sectie s3 van pagina A én
-- sectie s5 van pagina B. Met één veld zou het overslaan maar één van die twee
-- secties laten vervallen en bleef de andere pagina achter met een sectie die
-- ze niet kan vullen: precies de dunne sectie die dit werk opheft. Het sectie-id
-- alleen is niet genoeg om dat te doen, want elke pagina nummert zijn eigen
-- secties vanaf s1.
--
-- Leeg blijft geldig: de vaste slots (§3.3) en de positioneringsvraag komen
-- niet uit een sectie, en vragen van vóór deze migratie evenmin. Een vraag
-- zonder sectie laat het contract met rust.
--
-- `section_id` is in dezelfde sessie aangemaakt en meteen vervangen door
-- `section_refs` hierboven, toen bleek dat één sectie per vraag niet klopt. Hij
-- staat er nog omdat migraties nooit iets weggooien (conventie 4); hij is leeg
-- en geen enkele regel code leest hem.
--
-- Additief en idempotent (conventie 4): geen bestaande rij verandert, geen
-- enkele kolom verdwijnt, en alle drie de kolommen mogen NULL zijn.

alter table public.content_pieces
  add column if not exists input_coverage numeric(5,2),
  add column if not exists write_mode text;

comment on column public.content_pieces.input_coverage is
  '(0083) Onderbouwingsgraad: percentage van de merkgebonden contractsecties dat een bestaand F-nummer heeft. NULL = deze pagina heeft geen merkgebonden sectie, er valt niets te onderbouwen. Zie lib/pipeline/input-coverage.ts.';

comment on column public.content_pieces.write_mode is
  '(0083) Keuze van de klant bij de inputpoort. NULL = normaal schrijven. ''algemeen'' = bewust zonder uitspraken over dit bedrijf. Zie lib/content-input-gate.ts.';

alter table public.fact_requests
  add column if not exists section_id text,
  add column if not exists section_refs text[] not null default '{}';

comment on column public.fact_requests.section_id is
  '(0083) NIET IN GEBRUIK. Binnen dezelfde migratie vervangen door section_refs, omdat één vraag bij secties van meerdere pagina''s kan horen. Blijft staan omdat migraties niets weggooien (conventie 4).';

comment on column public.fact_requests.section_refs is
  '(0083) De contractsecties waar deze vraag bij hoort, als ''<content_piece_id>:<sectie-id>''. Wordt de vraag overgeslagen, dan vervallen die secties. Leeg bij vaste slots en bij vragen van vóór 0083. Zie lib/pipeline/input-coverage.ts.';
