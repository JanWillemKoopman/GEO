-- 0083: de bestaande pagina als bron, en het verbeterplan dat eruit volgt
--
-- ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
--
-- docs/tasks/paginakeuze-nieuw-of-verbeteren.md, O2 tot en met O5. Bijna de
-- helft van alles wat de app voorstelt is het VERBETEREN van een pagina die de
-- klant al heeft: nagerekend op productie op 1 september 2026 waren dat 59 van
-- de 129 aanbevelingen over 20 rapporten. Wat de schrijver daarvan te zien
-- kreeg, was één afgekapte brok tekst uit de laatste crawl:
--
--   • `profile_pages.text_excerpt` is afgekapt op 1500 tekens (`PAGE_MAX_CHARS`,
--     nodig omdat er 150 pagina's tegelijk in één prompt moeten passen). Van de
--     738 gecrawlde pagina's zitten er 667 op die grens, en van de tien pagina's
--     die daadwerkelijk verbeterd zijn negen. Dat is ongeveer 230 woorden,
--     terwijl de vervangende tekst er 400 tot 1200 telt.
--   • Het excerpt komt uit de crawl en niet uit een verse ophaling: tot 20 dagen
--     oud op het moment van schrijven.
--   • Nergens werd de bestaande tekst vergeleken met wat de pagina zou moeten
--     bevatten. De klant kreeg een vervangende tekst zonder één woord over wat
--     er nu eigenlijk aan schortte.
--
-- ── DRIE KOLOMMEN OP content_pieces ─────────────────────────────────────────
--
-- `existing_page_text`: de tekst van de bestaande pagina zoals hij was op het
-- moment van plannen, vers opgehaald (tot 6000 tekens) in plaats van uit de
-- crawl. Bewaard en niet alleen gebruikt, om drie redenen: de audit-trail
-- (conventie 8, waarop is deze verbetering gebaseerd), het verschilscherm dat de
-- klant laat zien wat er van zijn pagina af gaat, en herhaalbaarheid, want een
-- herschrijfronde een week later mag niet stilletjes een andere bron krijgen.
--
-- `existing_page_fetched_at`: wanneer dat was. Zonder dit getal is "de pagina is
-- sindsdien veranderd" niet vast te stellen, en dan weet niemand of het
-- verschilscherm nog klopt.
--
-- `related_url`: een bestaande pagina die het onderwerp AL raakt terwijl de
-- handeling toch `nieuw` is. Dit is nadrukkelijk geen tweede `existing_url`:
-- die zegt "deze pagina wordt vervangen", `related_url` zegt "hier staat al
-- iets, doe het niet nog eens over". Het rapportmodel wees zo'n pagina 13 keer
-- aan (32 van de 70 nieuw-aanbevelingen droegen een adres, waarvan er 13 echt
-- bestonden) en niets in de keten las dat adres.
--
-- ── EN ÉÉN OP planned_pages ─────────────────────────────────────────────────
--
-- Sinds migratie 0065 loopt het normale pad via de contentvoorraad, en een
-- voorraaditem draagt zijn eigen `recommendation_action` en `existing_url`. Zonder
-- `related_url` daar zou het signaal precies op de route verdwijnen die de
-- meeste pagina's aflegt.
--
-- Additief en idempotent, conventie 4. Alle kolommen nullable zonder default:
-- leeg betekent "niet vastgesteld", en dat is iets anders dan "er is niets"
-- (conventie 3). Bestaande rijen veranderen niet en de keten gedraagt zich voor
-- hen als voorheen.

alter table public.content_pieces
  add column if not exists existing_page_text text,
  add column if not exists existing_page_fetched_at timestamptz,
  add column if not exists related_url text;

comment on column public.content_pieces.existing_page_text is
  'De tekst van de te verbeteren pagina, vers opgehaald bij het plannen (tot 6000 tekens). Leeg = niet opgehaald of geen verbetering.';
comment on column public.content_pieces.existing_page_fetched_at is
  'Wanneer existing_page_text is opgehaald. Zonder dit is niet vast te stellen of het verschilscherm nog klopt.';
comment on column public.content_pieces.related_url is
  'Een bestaande pagina die dit onderwerp al raakt terwijl dit tóch een nieuwe pagina is. Waarschuwing tegen twee pagina''s die om dezelfde vraag concurreren, geen pagina die vervangen wordt.';

alter table public.planned_pages
  add column if not exists related_url text;

comment on column public.planned_pages.related_url is
  'Zie content_pieces.related_url. Staat hier ook omdat het normale pad sinds 0065 via de contentvoorraad loopt.';
