-- ═══════════════════════════════════════════════════════════════════════════
-- 0099 — Bewust uit een maand gehaald, of nog nooit ingepland?
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAAROM DIT NODIG IS
--
-- Blok A, punt 4 uit docs/tasks/nova-vergelijking-verbeterpunten.md: de
-- voorraad is vandaag één bak, zonder onderscheid tussen "nog nooit ingepland"
-- en "er bewust uitgehaald". Nova's precedent: een aparte "Not included"-lijst
-- met de zin "Pages you took out, and pages your ordering pushed past the
-- monthly quota. None of them will be written, and none of them are gone."
--
-- Het tweede deel van die zin ("buiten bereik door de volgorde") is al uit te
-- rekenen: `bepaalVulling()` (lib/plan-fill.ts) geeft nu ook terug wélke
-- voorraadkansen na twaalf maanden vol content plus buffer nog steeds niet
-- pasten. Het eerste deel ("bewust uitgehaald") is nergens op te slaan: er is
-- geen kolom die vertelt of een kaart die nu in de voorraad zit daar altijd al
-- stond, of dat een klant hem terugsleepte uit een maand (`moveToBacklog()`).
--
-- WAT DE VLAG DOET
--
-- `taken_out = true`: een klant sleepte deze kaart terug naar de voorraad
-- (`moveToBacklog()`, lib/plans.ts). `false`: hij is nog nooit in een maand
-- geweest, of hij is net weer aan iemand toegewezen (automatisch of met de
-- hand) en dus weer in actieve dienst.
--
-- Additief en idempotent (conventie 4). Bestaande voorraadrijen krijgen
-- `false`: voor geen van hen is vast te stellen dat een klant ze bewust
-- terugsleepte, dus "nog nooit ingepland" is voor hen de juiste, veilige
-- default (conventie 3: onbekend is beter dan een gok).

alter table public.planned_pages
  add column if not exists taken_out boolean not null default false;

comment on column public.planned_pages.taken_out is
  'true als een klant deze kaart bewust terugsleepte naar de voorraad (moveToBacklog()), false als hij nog nooit ingepland is geweest of net weer is toegewezen.';
