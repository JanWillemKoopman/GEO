-- ═══════════════════════════════════════════════════════════════════════════
-- 0097: de feitenkaart van een loopbaan
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── WAAROM DIT HET BELANGRIJKSTE STUK VAN DIT ZIJPROJECT IS ────────────────
--
-- Het hoofdproduct heeft dit patroon al, en de aanleiding daar staat in
-- `lib/pipeline/factcard.ts`: bij de eerste echte contentronde bleken van de 16
-- beweringen op een gegenereerde pagina er 5 verzonnen. Het model verzint niet
-- willekeurig; het verzint precies daar waar de tekst een concreet feit NODIG
-- heeft en het bronmateriaal het niet levert.
--
-- Een sollicitatiebrief is precies zo'n tekst. "Ik bracht de doorlooptijd terug
-- van negen naar vijf dagen" is de zin die werkt, en het is ook de zin die een
-- model invult als hij er niet staat. Een dossier meegeven met "gebruik dit waar
-- het past" is een uitnodiging, geen grens.
--
-- Deze tabel draait dat om: een genummerde, gesloten lijst feiten, en alles wat
-- er niet op staat mag niet beweerd worden. De brief verwijst per bewering naar
-- een nummer, en `lib/solliciteren/feiten.ts` rekent na of dat nummer bestaat.
--
-- ── HET NUMMER IS VAST EN GEEN POSITIE ─────────────────────────────────────
--
-- In het hoofdproduct is "F3" een POSITIE in een lijst: voeg je een feit toe,
-- dan schuift alles op, en verwijst een oudere tekst ineens naar iets anders.
-- Dat is daar te overzien omdat de kaart per pagina gemaakt wordt. Hier leeft de
-- kaart maanden en worden er brieven naast bewaard, dus krijgt elk feit een
-- eigen `nummer` dat nooit meer verschuift. F7 blijft F7, ook als F3 weg is.
--
-- ── WAAROM EEN FEIT ZIJN BRONZIN BEWAART ───────────────────────────────────
--
-- `bronzin` is de zin uit het dossier waar het feit uit komt. Zonder die kolom
-- is een feit een bewering van een model over jou, en is bij twijfel niet na te
-- gaan of het er echt stond. Met die kolom is het aanwijsbaar, en dat is het
-- verschil tussen een kaart die je vertrouwt en een kaart die je elke keer
-- helemaal moet nalezen.
--
-- ── EEN MENS WINT VAN HET MODEL ────────────────────────────────────────────
--
-- `handmatig` markeert een feit dat jij zelf hebt gezet of gecorrigeerd. Bij een
-- volgende uitleesronde blijven die staan en worden ze nooit overschreven.
-- Zelfde afspraak als `profile_field_sources` in het hoofdproduct (migratie
-- 0035): een correctie die bij de eerstvolgende ronde verdwijnt, is erger dan
-- geen correctie, want je maakt hem één keer en vertrouwt daarna de kaart.
--
-- Additief en idempotent (conventie 4).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.sollicitatie_feiten (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- Waar dit feit vandaan komt. `set null` en geen cascade: gooi je het CV weg
  -- en zet je een nieuwe versie neer, dan blijft het feit staan. Het feit is
  -- waar of niet waar, los van het bestand waar het toevallig in stond.
  document_id uuid references public.sollicitatie_documenten (id) on delete set null,
  -- Het F-nummer, vast per persoon. Zie de toelichting hierboven.
  nummer      integer not null,
  categorie   text not null check (categorie in ('werk', 'resultaat', 'vaardigheid', 'opleiding', 'drijfveer', 'overig')),
  tekst       text not null,
  -- Wanneer, als dat bij dit feit hoort. Leeg mag: een vaardigheid heeft geen
  -- periode, en een verzonnen jaartal is erger dan een leeg veld (conventie 3).
  periode     text,
  -- De zin uit het dossier waar dit feit op steunt.
  bronzin     text not null default '',
  -- Door een mens gezet of gecorrigeerd? Dan blijft hij bij een nieuwe
  -- uitleesronde staan.
  handmatig   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.sollicitatie_feiten is
  '(0097) De gesloten lijst beweringen die een sollicitatiebrief mag doen over deze persoon, elk '
  'met een vast F-nummer en de bronzin uit het dossier. Alles wat hier niet op staat, mag de brief '
  'niet beweren.';

-- Twee keer hetzelfde nummer bij één persoon zou twee verschillende feiten
-- achter "F7" zetten, en dan verwijst een bewaarde brief naar allebei. Dit is
-- het deterministische vangnet onder het toekennen van nummers in de route
-- (conventie 1).
create unique index if not exists sollicitatie_feiten_nummer_idx
  on public.sollicitatie_feiten (user_id, nummer);

create index if not exists sollicitatie_feiten_user_idx
  on public.sollicitatie_feiten (user_id, categorie, nummer);

drop trigger if exists sollicitatie_feiten_set_updated_at on public.sollicitatie_feiten;
create trigger sollicitatie_feiten_set_updated_at
  before update on public.sollicitatie_feiten
  for each row execute function public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
--
-- Dezelfde twee sloten als 0095 en 0096. Geen insert- of updatepolicy:
-- schrijven loopt via een API-route met de service-role en een expliciete
-- eigenaarscontrole (conventie 6).
alter table public.sollicitatie_feiten enable row level security;

drop policy if exists sollicitatie_feiten_select_own on public.sollicitatie_feiten;
create policy sollicitatie_feiten_select_own on public.sollicitatie_feiten
  for select using (user_id = (select auth.uid()) and public.is_staff());

-- Controle: staat de tabel er, en is het nummer echt uniek per persoon?
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'sollicitatie_feiten') as tabel,
  (select count(*) from pg_indexes
     where schemaname = 'public' and indexname = 'sollicitatie_feiten_nummer_idx') as unieke_nummers;
