-- ═══════════════════════════════════════════════════════════════════════════
-- 0043 — De aanbodkoppeling van een topic overleeft een herhaalronde
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT ER MISGING, EN WAAROM HET STIL GEBEURT
--
-- `profile_topics.offering_ids` is een kale `uuid[]` zonder foreign key. Dat kan
-- ook niet anders — Postgres kent geen refererende integriteit op een element
-- ván een array. Zolang de aanbodboom blijft staan is dat prima.
--
-- Maar "onderzoek opnieuw" (`/api/profiles/[id]/deep-research`) verwijdert
-- precies die boom: alle knopen met bron `ai` gaan eruit, want anders slaat
-- `buildOfferingTree()` zichzelf over (hij is idempotent op "staat er al iets")
-- en verandert er niets. Topics blijven bewust staan — dat zijn beslissingen van
-- de klant, soms met een lopende analyse eraan.
--
-- Gevolg: na één herhaalronde wijzen álle offering_ids naar verwijderde rijen.
-- Geen foutmelding, geen lege lijst — een lijst met id's die nergens meer op
-- uitkomen. Op het scherm ziet de onderbouwing van een topic er dan uit alsof
-- hij er niet is.
--
-- Dat is dezelfde bevinding als die van 3 augustus (topics met een lege
-- koppeling omdat de matcher op naam zocht en het model een pad teruggaf), nu
-- binnengekomen langs de andere deur.
--
-- ── WAAROM NAMEN NAAST ID'S, EN NIET IN PLAATS VAN ─────────────────────────
--
-- Het id is de juiste sleutel zolang de rij bestaat: uniek, en de UI hangt
-- eraan. De naam is wat het model zelf teruggaf en wat een mens herkent, en die
-- is stabiel over een herbouw van de boom heen — "Bekkenfysiotherapie" heet na
-- een tweede crawl nog steeds zo.
--
-- Dus allebei: het id voor de koppeling van nu, de naam om hem opnieuw te
-- kunnen leggen. `buildOfferingTree()` herstelt de id's na elke herbouw op basis
-- van deze kolom.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profile_topics
  add column if not exists offering_names text[] not null default '{}';

comment on column public.profile_topics.offering_names is
  'De namen van de aanbodknopen waar dit onderwerp uit volgt, náást offering_ids. '
  'Een herhaalronde verwijdert de AI-knopen en bouwt ze opnieuw op met nieuwe '
  'id''s; deze kolom is waarmee lib/pipeline/offering.ts de koppeling herstelt.';

-- Bestaande topics: de namen alsnog invullen zolang de boom er nog staat. Doen
-- we dit niet, dan zijn de topics van vóór deze migratie de eerste die hun
-- koppeling kwijtraken — precies de groep die het langst meeloopt.
update public.profile_topics t
set offering_names = coalesce(
  (
    select array_agg(o.name order by o.sort_order)
    from public.profile_offerings o
    where o.id = any (t.offering_ids)
  ),
  '{}'
)
where cardinality(t.offering_names) = 0
  and cardinality(t.offering_ids) > 0;
