-- ═══════════════════════════════════════════════════════════════════════════
-- 0048 — Het merkprofiel compleet: de laatste dertien velden
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- `docs/Nova.md` §13 legt ORBIT ENGINE's `profiles`-kolommen naast wat InSpace in hun
-- onboarding uitvraagt. Van de ~40 velden had ORBIT ENGINE er veertien al, kon de
-- pijplijn er elf afleiden, en vervielen er vier (taalkeuze, CMS, auteurspagina,
-- Google Analytics). Wat overbleef zijn de dertien hieronder: velden die de
-- schrijfprompt scherper maken en die nergens vandaan komen.
--
-- WAAROM DEZE DERTIEN EN NIET MEER
--
-- Alles wat al een eigenaar had, blijft waar het staat. Dat is de reden dat
-- deze lijst korter is dan Nova's stappenlijst:
--
--   Nova's veld             →  waar het bij ORBIT ENGINE al stond
--   brandValuePillars       →  `value_props`
--   brandProofPoints        →  `proof_points`
--   competitors             →  `competitors` plus de tabel `entities`
--   primaryAudience         →  `intake_audience`
--   geoIdentity             →  `service_scope` + `service_regions`
--   brandCoreCategory       →  `industry`
--   tabooPhrases            →  `taboo_phrases`
--   lawsAndRegulations      →  `compliance_notes`
--   formality/energy/…      →  `tone_formality` en de twee andere
--
-- Eén feit heeft één eigenaar. Een tweede kolom met dezelfde betekenis is een
-- kolom die gaat afwijken.
--
-- WAAROM NULLABLE EN ZONDER DEFAULT
--
-- Conventie 3: onbekend is een betere waarde dan een verkeerde. Een leeg veld
-- betekent hier "nog niet vastgesteld", en de schrijfprompt slaat het dan over
-- in plaats van een verzonnen waarde te gebruiken. Een default zou dat verschil
-- wegpoetsen.
--
-- De array-velden krijgen wél een lege-array-default, net als `taboo_phrases`
-- in 0045: bij een lijst is "leeg" en "niet ingevuld" hetzelfde, en dan is een
-- `null`-controle bij elke lezer verspilde moeite.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Merkfundament (Nova's "Your brand foundation" en "Topics") ──────────────
alter table public.profiles
  -- "De verandering die je merk wil maken, in één zin."
  add column if not exists brand_mission text,
  -- "Hoe je gezien wilt worden ten opzichte van de alternatieven."
  add column if not exists brand_positioning text,
  -- Het ene ding dat je beter doet dan wie dan ook. Apart van `value_props`:
  -- dat zijn er meerdere en gelijkwaardig, dit is er één en de sterkste.
  add column if not exists usp text,
  -- De kernideeën die in élke pagina terug horen te komen.
  add column if not exists key_messages text[] not null default '{}',
  -- Woorden die bij de merkidentiteit horen en die content moet versterken.
  add column if not exists identity_keywords text[] not null default '{}',
  -- Nova's "Us vs. Them": wat je onderscheidt van de partijen waar de klant
  -- je mee vergelijkt.
  add column if not exists differentiator text;

-- ── Doelgroep ───────────────────────────────────────────────────────────────
alter table public.profiles
  -- De primaire doelgroep staat al in `intake_audience`; dit is de tweede.
  add column if not exists audience_secondary text,
  -- 1 = basis, 2 = professional, 3 = expert. Bepaalt hoeveel een tekst mag
  -- aannemen dat de lezer al weet. Als cijfer opgeslagen en als woord getoond,
  -- net als de tone-of-voice-schuiven (zie `lib/pipeline/tone-sliders.ts`):
  -- het cijfer gaat nooit naar het model, de vertaling wel.
  add column if not exists audience_knowledge_level smallint
    check (audience_knowledge_level is null
           or audience_knowledge_level between 1 and 3);

-- ── Stem: de vijfde schuif ──────────────────────────────────────────────────
-- 0045 bracht er vier (formality, energy, complexity, humor). Nova heeft er
-- vijf, en de vijfde is de enige met VIER standen in plaats van drie:
-- neutraal, geruststellend, enthousiast, urgent.
alter table public.profiles
  add column if not exists tone_emotional smallint
    check (tone_emotional is null or tone_emotional between 1 and 4);

-- ── Woorden en taalgebruik ──────────────────────────────────────────────────
alter table public.profiles
  -- De tegenhanger van `taboo_phrases`: uitdrukkingen die juist wél van dit
  -- merk zijn en terug mogen komen.
  add column if not exists signature_phrases text[] not null default '{}',
  -- ⚠️ Hoe de content de LEZER aanspreekt, niet hoe ORBIT ENGINE zijn eigen gebruiker
  -- aanspreekt. `docs/schrijfstijl.md` legt "je en jij" vast voor de interface;
  -- dat is een keuze over ORBIT ENGINE zelf. Wat ORBIT ENGINE vóór een advocatenkantoor
  -- schrijft, hoort "u" te zeggen. Twee verschillende dingen, en zonder deze
  -- kolom vielen ze samen.
  add column if not exists pronoun_preference text
    check (pronoun_preference is null
           or pronoun_preference in ('je', 'u', 'wij'));

-- ── Auteur: de rest van het visitekaartje ───────────────────────────────────
-- Naam, functie, bio en LinkedIn kwamen met 0045. Deze drie horen erbij omdat
-- ze meegaan in de schema.org-opbouw (`lib/schema-jsonld.ts`), en dat is precies
-- het signaal waarmee AI-assistenten een persoon als echte entiteit herkennen.
--
-- Nova's "maak een auteurspagina op de site van de klant" komt hier NIET: dat
-- kan niet zonder CMS-koppeling, en die is buiten scope.
alter table public.profiles
  add column if not exists author_photo_url text,
  add column if not exists author_facebook_url text,
  add column if not exists author_other_url text;
