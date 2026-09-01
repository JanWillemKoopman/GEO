-- 0082: het contentcontract, het itemdossier en de gecachte bronanalyse
--
-- ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
--
-- docs/tasks/contentpijplijn-herontwerp.md, knelpunten K1, K2 en K6. De
-- schrijfpijplijn wist wél welke BEWERINGEN een pagina moest doen (de
-- claim-audit, `briefing_snapshot_json`), maar nergens stond welke SECTIES de
-- pagina moest hebben en welke deelvraag elke sectie beantwoordt. Volledigheid
-- hing daardoor aan twee promptregels en één zelfbeoordeling, in strijd met
-- conventie 1. Nagerekend op productie: van de 29 afgeronde pagina's stonden er
-- 15 op "check nodig", de gemiddelde pagina telde 548 woorden waar een artikel
-- op 700 tot 1200 mikt, en de bronherleidbaarheid was 78,6% (bij de drie
-- gepubliceerde pagina's 52,2%).
--
-- ── DE VIER KOLOMMEN OP content_pieces ──────────────────────────────────────
--
-- `dossier_json`: het ITEMDOSSIER (A1). Eén onderzoekstap per contentitem, niet
-- per cluster: de deelvragen die een lezer bij deze doelvraag stelt, de
-- vervolgvragen, en de algemene begrippen die uitleg nodig hebben mét bron en
-- letterlijk citaat. Dit is het antwoord op "hoe schrijven we juist dit item zo
-- goed mogelijk" in plaats van "wat weten we over dit cluster".
--
-- `contract_json`: het CONTENTCONTRACT (A2). De inhoudsopgave als data: per
-- sectie de deelvraag, de verplichte F-nummers en de uitleg die erin hoort.
-- Gaat zowel naar de schrijver als naar de poort, en dat is de kern: dezelfde
-- lijst die de opdracht geeft, rekent hem na.
--
-- `coverage_score`: welk percentage van het contract de tekst daadwerkelijk
-- afdekt (A3). Bewust een EIGEN kolom en niet verrekend in `geo_score`: die
-- score bestaat sinds R8.2 en de app toont er trends van. Een nieuwe component
-- erin zou de pagina's van vorige maand onvergelijkbaar maken met die van
-- vandaag, dezelfde reden waarom `checkQuality` er destijds ook buiten bleef.
--
-- `repair_round`: hoeveel gerichte reparatierondes deze pagina heeft gehad (A6).
-- Vervangt de ene ongerichte herschrijving. Begrensd in code op REPAIR_MAX;
-- deze kolom is wat die grens afdwingt over taken heen, want een taak kan
-- opnieuw geprobeerd worden.
--
-- ── DE CACHETABEL ───────────────────────────────────────────────────────────
--
-- `source_analysis_cache`: de uitkomst van `analyzeCitedSources()` bewaren
-- (A9). Die stap crawlt tot vier geciteerde bronpagina's en doet daar een
-- AI-aanroep overheen, en hij draaide bij het schrijven én bij het
-- herschrijven, per pagina. Tien pagina's uit één cluster citeren grotendeels
-- dezelfde bronnen, dus dat is tot twintig keer crawlen voor een uitkomst die
-- per bron hetzelfde is.
--
-- De sleutel bevat de doelvragen en niet alleen de URL's: de analyse is
-- gericht op wat DEZE pagina moet winnen, dus twee pagina's met dezelfde
-- bronnen maar andere doelvragen horen een andere uitkomst te krijgen. Zonder
-- de vragen in de sleutel zou de cache precies de itemspecifieke scherpte
-- weggooien die S9 en S10 kwamen brengen.
--
-- Nul RLS-policies, net als `jobs` (migratie 0002): dit is afgeleide data die
-- alleen de service-role leest en schrijft. Geen enkele client hoort erbij te
-- kunnen (conventie 6).
--
-- Additief en idempotent (conventie 4): geen bestaande rij verandert.

alter table public.content_pieces
  add column if not exists dossier_json jsonb,
  add column if not exists contract_json jsonb,
  add column if not exists coverage_score numeric(5,2),
  add column if not exists repair_round integer not null default 0;

comment on column public.content_pieces.dossier_json is
  '(0082) Itemdossier: deelvragen, vervolgvragen en geverifieerde uitleg van algemene begrippen voor DIT contentitem. Zie lib/pipeline/item-dossier.ts.';

comment on column public.content_pieces.contract_json is
  '(0082) Contentcontract: de secties die deze pagina moet hebben, met per sectie de deelvraag, de verplichte F-nummers en de uitleg. Zie lib/pipeline/content-contract.ts.';

comment on column public.content_pieces.coverage_score is
  '(0082) Percentage van het contract dat de tekst afdekt (lib/pipeline/content-coverage.ts). Bewust los van geo_score, zodat de reeks van geo_score vergelijkbaar blijft.';

comment on column public.content_pieces.repair_round is
  '(0082) Hoeveel gerichte reparatierondes deze pagina heeft gehad. Begrensd op REPAIR_MAX in lib/pipeline/content.ts.';

create table if not exists public.source_analysis_cache (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  cache_key text not null,
  block text not null,
  urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create unique index if not exists source_analysis_cache_key_idx
  on public.source_analysis_cache (profile_id, cache_key);

alter table public.source_analysis_cache enable row level security;

comment on table public.source_analysis_cache is
  '(0082) Gecachte uitkomst van analyzeCitedSources(): welke geciteerde bronnen wat doen. Sleutel = profiel + hash van (URL-lijst, doelvragen). Nul policies: alleen de service-role.';
