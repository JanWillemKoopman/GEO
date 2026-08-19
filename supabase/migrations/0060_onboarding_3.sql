-- ═══════════════════════════════════════════════════════════════════════════
-- 0060 · Onboarding 3.0, fase 1: de commerciële laag, de contactpersoon,
--        "niet van toepassing" en de vierde herkomst
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT DIT TOEVOEGT
--
-- Vijftien kolommen op `profiles` en één op `profile_field_sources`. Het volledige
-- ontwerp staat in `docs/tasks/onboarding-3.0.md`, deel D.
--
-- WAAROM DEZE VIJFTIEN EN GEEN ZESTIEN
--
-- Elk commercieel veld voldoet aan twee eisen: een website kan het niet zeggen,
-- en er is precies één pijplijnstap die er aantoonbaar beter van wordt. Een veld
-- dat alleen het gesprek helpt maar nergens gelezen wordt is administratie, en
-- die groeit vanzelf. De lezer per veld staat hieronder in het commentaar.
--
-- DE GRENS MET `profile_strategy`
--
-- Deze regel hoort hier en niet in een document dat verdwijnt:
--
--   * Een BLIJVENDE EIGENSCHAP van het merk hoort op `profiles`, ook als een
--     mens hem invulde. Dat is deze migratie.
--   * Een GEBEURTENIS MET EEN HOUDBAARHEIDSDATUM hoort in
--     `profile_strategy.context_factors`, want daar hangt per soort een gevolg
--     aan in code (`lib/pipeline/context-factors.ts`).
--   * De losse GESPREKSNOTITIE blijft `profile_strategy.strategy_notes`.
--
-- WAAROM OP `profiles` EN NIET IN EEN EIGEN TABEL
--
-- `BrandField.key` is `keyof Profile` (`lib/pipeline/brand-fields.ts`). Precies
-- die typering maakt de garantie "alles in de veldencatalogus is opslaanbaar"
-- mogelijk, bewaakt door een test die in beide richtingen faalt. Een veld uit
-- een andere tabel breekt die typering en daarmee de garantie.
--
-- NULLABLE EN ZONDER DEFAULT, BEHALVE DE LIJSTEN
--
-- Zelfde regel als 0048. Conventie 3: onbekend is een betere waarde dan een
-- verkeerde. Bij een lijst is "leeg" hetzelfde als "niet ingevuld", dus die
-- krijgen `default '{}'` en scheelt elke lezer een null-controle.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. De commerciële laag: twaalf velden ──────────────────────────────────
alter table public.profiles
  -- Welke diensten of producten commercieel voorop staan. Lezer:
  -- `propose-topics.ts` en `plan-build.ts`, plus de weging in de potentiescore.
  add column if not exists priority_offerings text[] not null default '{}',
  -- Waar géén content voor mag komen: te weinig marge, wordt uitgefaseerd.
  -- Lezer: `propose-topics.ts` en `plan-order.ts`.
  add column if not exists deprioritised_offerings text[] not null default '{}',
  -- Waar het merk heen WIL, los van waar het nu al werkt. Bewust naast
  -- `service_regions`: dat is het huidige werkgebied en stuurt de meting, dit is
  -- de ambitie en stuurt welke vragen er bij komen. Lezer: `prompts.ts`.
  add column if not exists growth_regions text[] not null default '{}',
  -- De segmenten waar de groei zit, bijvoorbeeld "installateurs met eigen
  -- monteurs". Lezer: `propose-topics.ts` en de personas.
  add column if not exists target_segments text[] not null default '{}',
  -- Wat een klant ongeveer waard is. Vier standen en geen bedrag: een bedrag
  -- suggereert een precisie die in een gesprek van een uur niet bestaat, en de
  -- potentiescore heeft alleen een weging nodig. Lezer: de potentiescore.
  add column if not exists deal_value_band text,
  -- Piek- en dalmomenten in het jaar. Lezer: `plan-order.ts`, dat bepaalt
  -- wanneer iets gepubliceerd hoort te worden.
  add column if not exists seasonality text,
  -- De bezwaren die in elk verkoopgesprek terugkomen. Lezer: `briefing.ts` en
  -- `content.ts`. Het meest ondergewaardeerde veld van de lijst: een AI-antwoord
  -- heeft vaak precies de vorm van een bezwaar.
  add column if not exists sales_objections text[] not null default '{}',
  -- Onderwerpen waar niet over geschreven mag worden, juridisch of
  -- concurrentiegevoelig. Lezer: `content-gate.ts` en `propose-topics.ts`.
  add column if not exists forbidden_topics text[] not null default '{}',
  -- ⚠️ STAAT NAAST `proof_points` EN VERVANGT HEM NIET.
  -- `proof_points` is per definitie uit de site geëxtraheerd zonder klant-invoer
  -- (`prepare-profile.ts`), en dat is de grondslag onder contentkwaliteit A2:
  -- elk proof point staat letterlijk op een bronpagina. Dit veld is precies het
  -- omgekeerde: bewijs dat nergens op de site staat. Ze door elkaar halen breekt
  -- die belofte. Lezer: de feitenbank, `factbase.ts`.
  add column if not exists offline_proof text[] not null default '{}',
  -- ⚠️ De tegenhanger van `aliases`: gelijknamige bedrijven die NIET dit merk
  -- zijn. Wij meten vermeldingen en InSpace Nova niet, dus wij hebben een
  -- uitsluitingslijst nodig die zij niet kennen. De kennistest meet die
  -- verwarring vandaag al (`llm-baseline.ts`, het blok `verwarring`) maar
  -- bewaart hem nergens. Lezer: `measure.ts`, de vermeldingsclassificatie.
  add column if not exists name_exclusions text[] not null default '{}',
  -- Mag het advies nieuwe pagina's voorstellen, of moet het binnen de bestaande
  -- structuur blijven? Het enige veld uit Nova's tweede invoerlaag dat we
  -- overnemen. Nullable en zonder default: `false` zou "verzin gerust nieuwe
  -- pagina's" betekenen en dat is een keuze, geen leegte. Lezer:
  -- `structure-gap.ts` en `plan-build.ts`.
  add column if not exists respect_site_structure boolean,
  -- Wat het merk over twaalf maanden bereikt wil hebben. Lezer: `plan-build.ts`
  -- en de duiding in het rapport.
  add column if not exists goal_12m text;

-- Vier standen, en 'onbekend' is er één van: dat betekent "gevraagd, en de
-- klant weet het niet", terwijl `null` betekent "nooit gevraagd". Dat verschil
-- is precies wat een tweede gesprek scheelt.
alter table public.profiles
  drop constraint if exists profiles_deal_value_band_check,
  add  constraint profiles_deal_value_band_check
       check (deal_value_band is null
              or deal_value_band in ('onbekend', 'klein', 'midden', 'groot'));

-- ── 2. De contactpersoon: drie velden ──────────────────────────────────────
--
-- Met wie we aan tafel zaten. Vandaag nergens vastgelegd: `toewijzen` koppelt
-- een merk aan een account, maar niet aan een mens, en dat wreekt zich bij de
-- overdracht.
--
-- ⚠️ Facturatiegegevens komen hier NIET bij, anders dan bij Nova. Het product is
-- sales-led en er is bewust geen self-serve betaalstroom; er wordt buiten de app
-- om gefactureerd.
--
-- Deze drie tellen niet mee in de volledigheidsmeter van het merkprofiel: ze
-- zeggen niets over hoe goed ORBIT ENGINE het merk kent.
alter table public.profiles
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

-- ── 3. Niet van toepassing, per veld ───────────────────────────────────────
--
-- WAT HET PROBLEEM WAS
--
-- Een leeg veld is vandaag dubbelzinnig: het kan "weten we nog niet" betekenen
-- of "niet van toepassing". Een merk zonder auteur heeft geen auteursbio, en dat
-- is geen gat. Zonder dat onderscheid haalt de volledigheidsmeter nooit 100% en
-- is hij binnen twee gesprekken waardeloos.
--
-- Deze kolom staat op de tabel waar per-veld-metadata al woont, met dezelfde
-- `set_by` en `set_at` die er al zijn: wie het zette en wanneer.
alter table public.profile_field_sources
  add column if not exists not_applicable boolean not null default false;

comment on column public.profile_field_sources.not_applicable is
  'Bewust niet van toepassing voor dit merk. De volledigheidsmeter telt '
  'gevuld + n.v.t. als behandeld, en lib/profile-gaps.ts laat het veld weg uit '
  'de gatenlijst. Een onderzoeksronde vult het niet alsnog: de rij staat op een '
  'mensbron en filterProtectedFields() beschermt hem al.';

-- ── 4. De vierde herkomst: `consultant` ────────────────────────────────────
--
-- ⚠️ `consultant` IS NIET HETZELFDE ALS `klant`.
--
-- Wat de consultant vóór het gesprek invult is een onderbouwde aanname, geen
-- bevestigd feit. Dat onderscheid is niet cosmetisch: `profile-research.ts`
-- instrueert het model letterlijk om door de klant opgegeven concurrenten,
-- waardeproposities en tone-of-voice te RESPECTEREN en niets anders te
-- verzinnen. Een consultant-aanname die als klantwaarde binnenkomt legt daarmee
-- het eigen marktonderzoek stil. Met een eigen herkomst kan de prompt het
-- verschil maken: een `gesprek`-waarde is waarheid, een `consultant`-waarde is
-- een startpunt dat het onderzoek mag tegenspreken.
--
-- Voor de bescherming tegen overschrijven telt hij wél als mens
-- (`lib/pipeline/field-merge.ts`): een herhaalronde gooit hem niet weg.
--
-- Op beide plekken waar de constraint staat, anders weigert de ene tabel wat de
-- andere toestaat.
alter table public.profile_field_sources
  drop constraint if exists profile_field_sources_source_check,
  add  constraint profile_field_sources_source_check
       check (source in ('ai', 'klant', 'gesprek', 'consultant'));

alter table public.profile_offerings
  drop constraint if exists profile_offerings_source_check,
  add  constraint profile_offerings_source_check
       check (source in ('ai', 'klant', 'gesprek', 'consultant'));
