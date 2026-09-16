-- ═══════════════════════════════════════════════════════════════════════════
-- 0100 — Wanneer is dit contentstuk voor het laatst aangepast?
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAAROM DIT NODIG IS
--
-- Blok C, punt 17 uit docs/tasks/nova-vergelijking-verbeterpunten.md: de
-- handmatige bewerkroute (PATCH `/api/analyses/[id]/content/[pieceId]`) sloeg
-- tot nu toe blind op, zonder te controleren of iemand anders de pagina
-- ondertussen ook had gewijzigd. Wie het laatst opslaat wint stilzwijgend, en
-- met een sales-led model waarin een consultant en een klant in dezelfde
-- tekst kunnen werken is dat geen randgeval.
--
-- `content_pieces` had al `version` (de AI-versiegeschiedenis van
-- herschrijfrondes) en `created_at`, maar niets dat bijhoudt wanneer een
-- bestaande rij voor het laatst is aangepast. `version` hergebruiken zou twee
-- betekenissen in één kolom persen: "welke herschrijfronde is dit" en "is deze
-- rij intussen veranderd" lopen niet gelijk op, want een handmatige bewerking
-- verhoogt `version` niet.
--
-- WAT DE KOLOM DOET
--
-- De PATCH-route zet `updated_at` bij elke geslaagde handmatige bewerking, en
-- gebruikt hem ook als voorwaarde bij het opslaan (`WHERE updated_at = ...`,
-- optimistic locking): matcht de update geen rij meer, dan wijzigde iemand
-- anders de pagina tussen het laden en het opslaan, en krijgt de gebruiker dat
-- te horen in plaats van dat de update stilzwijgend verdwijnt.
--
-- Bewust NIET bijgehouden door elke andere schrijfactie op deze tabel (de
-- schrijfpijplijn, de kwaliteitskeuring, publiceren): dat zijn systeemacties
-- met hun eigen taakvergrendeling (conventie 9), geen twee mensen die
-- tegelijk in hetzelfde tekstvak typen. Dit slot beschermt specifiek het
-- scenario dat punt 17 beschrijft.
--
-- Additief en idempotent (conventie 4). Bestaande rijen krijgen `now()`: geen
-- enkele bestaande rij heeft een eerder bekend wijzigingsmoment om op terug te
-- vallen, en een net-nu-tijdstip is voor hen de veilige default (de eerste
-- handmatige bewerking na deze migratie ziet toch geen conflict, want er is
-- nog niemand anders die tegelijk bewerkt).

alter table public.content_pieces
  add column if not exists updated_at timestamptz not null default now();

comment on column public.content_pieces.updated_at is
  'Wanneer de handmatige bewerkroute (PATCH) deze rij voor het laatst opsloeg. Optimistic locking, punt 17.';
