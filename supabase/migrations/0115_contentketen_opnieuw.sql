-- 0115: de contentketen opnieuw (docs/tasks/contentketen-opnieuw.md §7.1)
--
-- Waarom. De keten van pagina tot tekst gaat van 12 tot 15 AI-aanroepen per pagina
-- naar drie of vier: content brief, schrijven, controle, hooguit één herschrijving.
-- Daarvoor zijn vijf kolommen nodig, en verder niets:
--
--   content_pieces.brief_json     de content brief (onderzoek plus de bedrijfskennis
--                                 die de schrijver kreeg); gevuld = voorbereiding klaar
--   content_pieces.controle_json  de uitkomst van de controle: harde beweringen, het
--                                 oordeel, welke versie bleef, bevestigde gele zinnen
--   fact_requests.open_vraag      de vaste open vraag per pagina (besluit B3). Een
--                                 kolom en geen nieuwe `kind`: de check-constraint op
--                                 `kind` verruimen kan alleen door hem eerst te
--                                 verwijderen, en dat verbiedt conventie 4
--   profiles.verhalen             de verhalen uit het gesprek met de ondernemer
--   profiles.stem_voorbeelden     één tot drie adressen met de stem van het bedrijf,
--                                 met de opgehaalde tekst (besluit B14)
--
-- De oude kolommen (contract_json, strategy_json en de rest) blijven staan; geen
-- code leest ze nog (§7.2). Additief en idempotent (conventie 4).

alter table public.content_pieces
  add column if not exists brief_json    jsonb,
  add column if not exists controle_json jsonb;

alter table public.fact_requests
  add column if not exists open_vraag boolean not null default false;

alter table public.profiles
  add column if not exists verhalen         text,
  add column if not exists stem_voorbeelden jsonb;

-- Hooguit één open vraag per pagina: de voorbereiding kan twee keer starten
-- (vrijgeven en de cron), en dan mag er geen tweede open vraag ontstaan.
create unique index if not exists fact_requests_open_vraag_per_pagina
  on public.fact_requests ((content_piece_ids[1]))
  where open_vraag;
