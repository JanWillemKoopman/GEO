-- 0124: welke kennis in een versie zat (C3 van
-- docs/tasks/van-pijplijn-naar-kennissysteem.md, §6.3)
--
-- Waarom. Later moet te zien zijn welke klantkennis een pagina droeg, en wat
-- geraakt wordt als die kennis verandert (G2 leest dit voor de afhankelijkheden).
-- De code legt vast wat er in blok A ging (`kiesVoorBlokA()`), niet de schrijver
-- (B9 van contentketen-opnieuw.md blijft staan).
--
-- Additief en idempotent (conventie 4): een array-kolom kan geen foreign key
-- dragen, dus geen `references`; `lib/kennis/` zelf is de enige schrijver van
-- `klantkennis` en levert de ids.

alter table public.content_pieces
  add column if not exists gebruikte_kennis uuid[] not null default '{}';

create index if not exists content_pieces_gebruikte_kennis_idx
  on public.content_pieces using gin (gebruikte_kennis);

comment on column public.content_pieces.gebruikte_kennis is
  'De kennisitems die in blok A van DEZE versie stonden (C3). Gevuld door de '
  'code bij schrijven en herschrijven, nooit door de schrijver zelf.';
