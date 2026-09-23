-- 0110: zinnen zonder bron die de klant bewust laat staan
--
-- Besluit van de eigenaar (23 september 2026): een zin die iets over het bedrijf zegt
-- zonder bevestigd feit (`quality-collect.ts`, bron `bronherleidbaarheid`) blokkeert
-- publicatie. De klant weet vaak zelf dat hij klopt ("alle zes vestigingen zijn open van
-- 8.00 tot 17.30"), en moet dan kunnen zeggen: akkoord, laat staan. Dan verdwijnt het
-- punt en blijft de zin ongewijzigd in de tekst.
--
-- Per zin: de tekst, wie hem accepteerde en wanneer. Een lijst op de tekstrij zelf en
-- geen eigen tabel: het is een eigenschap van precies deze tekst, en het scherm leest
-- hem mee met de rij die het al ophaalt. Het scherm telt ook de lijsten van eerdere
-- versies van dezelfde pagina mee, zodat een herschrijving een geaccepteerde zin niet
-- opnieuw laat opduiken zolang hij letterlijk hetzelfde is.
--
-- Additief en idempotent. Schrijven alleen via de server
-- (`app/api/analyses/[id]/content/[pieceId]/zinnen/route.ts`).

alter table public.content_pieces
  add column if not exists geaccepteerde_zinnen jsonb not null default '[]'::jsonb;

comment on column public.content_pieces.geaccepteerde_zinnen is
  'Zinnen zonder bron die de klant bewust laat staan: [{zin, door, op}]. Zie migratie 0110.';
