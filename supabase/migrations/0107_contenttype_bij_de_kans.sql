-- ═══════════════════════════════════════════════════════════════════════════
-- 0107 — Het contenttype bij de kans, zodat het niet meer onderweg kwijtraakt
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- Een aanbeveling in `reports.recommendations_json` draagt een `type` uit vier:
-- `article`, `faq`, `landing`, `comparison`. Dat type stuurt de doellengte
-- (`TARGET_WORDS`), de schrijfinstructie (`TYPE_GUIDANCE`), de inhoudsopgave
-- (`content-contract.ts`), de publicatiedrempel (`quality-profile.ts`) en het
-- schema.org-type. Het is dus geen etiket maar de knop die bepaalt wat voor
-- pagina eruit komt.
--
-- Op de route van de kans naar de schrijver werd dat type twee keer vertaald,
-- en die twee vertalingen zijn niet elkaars omgekeerde:
--
--   `pageTypeVoor()`   (lib/plan-backlog-data.ts)  faq        → informatief
--                                                  comparison → categorie
--   `contentTypeFor()` (lib/plan-writing.ts)       informatief → article
--                                                  categorie   → landing
--
-- Een FAQ-aanbeveling kwam dus als artikel bij de schrijver aan (700 tot 1200
-- woorden in plaats van 250 tot 500, vraag-antwoordparen in de body in plaats
-- van in het FAQ-veld, en beoordeeld langs het profiel van een artikel), en een
-- vergelijking als landingspagina. Nagerekend op productie op 19 september 2026:
-- 4 van de 37 aanbevelingen, 11 procent.
--
-- Dat raakt alleen de route via het contentplan (`app/api/cron/plan/route.ts`),
-- en dat is sinds migratie 0065 de normale route. De directe knop op het
-- analysescherm gaf het type altijd al ongewijzigd door.
--
-- WAAROM EEN EIGEN KOLOM EN GEEN TWEEDE VERTALING
--
-- `page_type` (migratie 0049) beschrijft de FUNCTIE van een pagina op de site
-- en voedt de contentmix op het overzicht en de kliktabel onder Zoekverkeer.
-- `content_type` beschrijft de VORM van de tekst en voedt de schrijfpijplijn.
-- Twee feiten, dus twee kolommen, elk met één eigenaar (conventie P2). Het type
-- uit de aanbeveling letterlijk bewaren is bovendien de enige vorm die géén
-- informatie weggooit: vier waarden blijven vier waarden.
--
-- Additief en idempotent (conventie 4). Nullable zonder default: leeg betekent
-- "niet vastgesteld", en dat is iets anders dan een gok (conventie 3). Een
-- pagina zonder waarde valt in de code terug op `contentTypeFor(page_type)`,
-- precies het gedrag van vandaag.

alter table public.planned_pages
  add column if not exists content_type text;

-- Zelfde `drop constraint if exists` plus `add constraint`-patroon als migratie
-- 0065 voor `source` en `recommendation_action`: idempotent bij herhaald
-- toepassen, en het laat bestaande rijen ongemoeid.
alter table public.planned_pages
  drop constraint if exists planned_pages_content_type_check,
  add  constraint planned_pages_content_type_check
    check (content_type is null
           or content_type in ('article', 'faq', 'landing', 'comparison'));

comment on column public.planned_pages.content_type is
  'De VORM van de tekst, letterlijk uit reports.recommendations_json[].type. Stuurt doellengte, schrijfinstructie, contract en kwaliteitsprofiel. NULL = niet vastgesteld; de code valt dan terug op contentTypeFor(page_type). Niet te verwarren met page_type, dat de functie van de pagina op de site beschrijft en de contentmix voedt.';

-- ── De bestaande kansen alsnog vullen ──────────────────────────────────────
--
-- `source_ref` is "<rapport-id>#<volgnummer>" (migratie 0065), dus het type is
-- terug te vinden in het rapport waar de kans uit komt. Alleen waar de kolom
-- nog leeg is, dus herhaald toepassen verandert niets meer (conventie 4) en een
-- handmatige correctie van later wordt nooit overschreven.
--
-- `jsonb_typeof` als wacht: één rapport met een niet-array in die kolom zou
-- anders de hele update laten omvallen.
with kansen as (
  select rp.id::text || '#' || (r.ord - 1)::text as source_ref,
         r.rec ->> 'type'                        as content_type
    from public.reports rp,
         lateral jsonb_array_elements(
           case when jsonb_typeof(rp.recommendations_json) = 'array'
                then rp.recommendations_json
                else '[]'::jsonb
           end
         ) with ordinality as r(rec, ord)
)
update public.planned_pages p
   set content_type = k.content_type
  from kansen k
 where p.source_ref = k.source_ref
   and p.content_type is null
   and k.content_type in ('article', 'faq', 'landing', 'comparison');
