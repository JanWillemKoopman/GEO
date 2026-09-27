-- 0126: een melding bij een pagina waarvan de kennis veranderde (G3 van
-- docs/tasks/van-pijplijn-naar-kennissysteem.md, §6.5)
--
-- Waarom. "Wij doen geen warmtepompen meer" mag niet leiden tot blind opnieuw
-- draaien, maar wel tot een zichtbare lijst (§4 regel 5: niets draait vanzelf).
-- `kansen.status` kent de waarden 'te_herzien' en 'vervallen' al sinds migratie
-- 0118; die krijgen nu voor het eerst een schrijver. Een pagina heeft geen
-- vergelijkbare status (die zou een "echte" contentstatus verstoren), dus deze
-- kolom is een losse melding: wanneer de kennis waarop deze versie leunde voor
-- het laatst veranderde, of NULL als er niets te melden is.
--
-- Additief en idempotent (conventie 4).

alter table public.content_pieces
  add column if not exists kennis_gewijzigd_op timestamptz;

comment on column public.content_pieces.kennis_gewijzigd_op is
  'Wanneer een kennisitem uit gebruikte_kennis van DEZE versie voor het laatst '
  'veranderde (G3). NULL = niets te melden. Gezet door de abonnee '
  'kennis_wijziging_impact, nooit door de schrijver.';
