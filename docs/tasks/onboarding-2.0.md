# Onboarding 2.0 — consultant-gedreven klantprofiel, core topics en multi-engine

**Status:** open · **Effort:** ~14 werkdagen in 5 blokken · **Opgesteld:** 3 augustus 2026
**Vertrekpunt:** `main` op `cb34ed3`, migraties t/m `0037`, 416 unittests + 25 ketentests groen.

---

## 0. Waar dit vandaan komt

De onboarding vraagt nu een wizard van vier stappen uit vóórdat er iets gebeurt, en het
profielonderzoek dat daarop volgt is één AI-aanroep op **de homepage-tekst, afgekapt op 6000
tekens** (`crawler.ts`, `MAX_CHARS`). De content-inventaris van 60 pagina's die er parallel aan
draait, komt die aanroep niet in — `prepare-profile.ts` bewaart hem pas ná afloop. Het profiel
weet dus nauwelijks iets van het bedrijf, en alles wat het wél weet moest de klant zelf typen.

Dat kantelt. Het nieuwe model is **sales-led, zoals InSpace**: een consultant zet het profiel klaar
vóór het gesprek, de pipeline doet het zware werk, en het uur consultancy gaat over strategie —
het enige wat een model niet kan. De klant vult straks nog drie dingen in: **webadres,
bedrijfsnaam, eventuele andere schrijfwijzen.**

**De vier beslissingen die dit plan dragen** (3 augustus 2026):

| Beslissing | Gevolg |
|---|---|
| Consultant zet klaar, klant krijgt later toegang | Stafrol + eigendomsoverdracht in datamodel en RLS (blok A) |
| €2 plafond voor de onboarding; topicverkenning valt erbuiten | Budgetpoort per profiel (blok B) |
| Topics zijn een voorstellijst zonder meting | `propose_topics` is één goedkope aanroep (blok D) |
| Gemini in de kennistest **én** de maandelijkse meting | Enginelaag moet tot in de aggregatie (blok E) |

### Drie aanvullende beslissingen (3 augustus 2026)

1. **Wat het gesprek moet opleveren.** Twee dingen, en verder niets: (a) **welke topics er
   commercieel toe doen** voor deze klant, en (b) **wat de pipeline onmogelijk kan weten** — een
   nieuwe website in aanbouw, een naamswijziging, een dienst die stopt of net start, een nieuwe
   regio. Dat tweede is geen notitieveld: een aanstaande sitemigratie maakt de hele technische audit
   en het content-advies tijdelijk waardeloos, en dat hoort de app te weten.
2. **Geen backfill van bestaande profielen.** Het nieuwe onderzoek geldt alleen voor nieuwe
   profielen. Geen handmatige route, geen migratiepad.
3. **Geen apart gespreksleidraad-scherm.** Het gesprek landt op de bestaande profielpagina. Wat
   daarvoor nodig is bestaat al grotendeels: `dossier-box` voor geplakt materiaal, `fact-requests`
   voor feiten, en het topicpaneel uit blok D. Er komt één kaart bij.

---

## 1. De klantreis wordt zeven fases

De vijf fases uit `APP_FLOW_DOCUMENTATION.md` §1.2 blijven staan. Er komen er twee vóór, en fase 1
verandert van eigenaar.

| # | Fase | Wie | Wat |
|---|---|---|---|
| **0** | **Voorbereiding** | consultant | Voert URL + naam in. Pipeline draait ~10 min. |
| **1** | **Profiel** | pipeline | Zes onderzoeksfases, alles met bron en zekerheid |
| **1b** | **Het gesprek** | consultant + klant | Corrigeren, aanvullen, strategie vastleggen, overdragen |
| **1c** | **Core topics** | consultant | 5–8 voorstellen, handmatig aan/uit |
| 2–5 | Analyse opstellen → runnen → content → monitoren | ongewijzigd | Een goedgekeurde topic start de bestaande fase 2 |

`/analyses/new` met een vrij ingetypt onderwerp **blijft bestaan**. Topics zijn een snelpad, geen
vervanging.

---

## 2. Migraties

Vier stuks, additief en idempotent. `0033` blijft ongebruikt: de inventariskwaliteit waarvoor hij
gereserveerd stond (R6.2) zit nu in `0039`. Markeer `0033` in `supabase/README.md` als **vervallen**
in plaats van gereserveerd.

### `0038_staf_en_overdracht.sql`

```sql
create table if not exists public.staff_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'consultant',
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists created_by_user_id uuid references auth.users (id),
  add column if not exists handover_state text not null default 'intern',
  add column if not exists handover_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_handover_state_check,
  add  constraint profiles_handover_state_check
       check (handover_state in ('intern', 'overgedragen'));
```

Plus een `is_staff()`-hulpfunctie (`security definer`, leest `staff_users`) en een **verruimde
selectpolicy** op elke tabel die de consultant moet kunnen inzien: `user_id = auth.uid() or
public.is_staff()`. Dat is een bewuste verbreding — staf ziet álles. Documenteer hem als zodanig;
hij is niet per ongeluk te maken en mag niet stilzwijgend blijven staan.

⚠️ **Het gevaarlijkste stuk van dit plan.** `is_staff()` binnen een policy die zelf `staff_users`
leest, geeft oneindige recursie als die tabel ook RLS krijgt. Houd `staff_users` **zonder policies**
(zoals `jobs`) en laat alleen `security definer`-functies erbij.

### `0039_profielverdieping.sql`

```sql
-- Onderzoeksfacetten: één rij per fase, uitbreidbaar zonder migratie
create table if not exists public.profile_facets (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  facet         text not null,          -- identiteit|aanbod|markt|llm_kennis|techniek|synthese
  summary       text,
  raw_json      jsonb,
  confidence    numeric(3,2),           -- 0.00–1.00, null = niet vast te stellen
  sources       text[] not null default '{}',
  model_used    text,
  cost_usd      numeric(10,6),
  researched_at timestamptz not null default now(),
  unique (profile_id, facet)
);

-- Het aanbod als boom. Dit is wat de topics straks voedt.
create table if not exists public.profile_offerings (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  parent_id         uuid references public.profile_offerings (id) on delete cascade,
  kind              text not null,      -- dienst|product|categorie|merk|vestiging
  name              text not null,
  description       text,
  audience          text,
  price_indication  text,
  evidence_url      text,
  evidence_quote    text,
  confidence        numeric(3,2),
  source            text not null default 'ai',
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

-- Herkomst per veld. Maakt "de mens wint" afdwingbaar in plaats van hoopvol.
create table if not exists public.profile_field_sources (
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  field          text not null,         -- kolomnaam in profiles, of 'offering:<uuid>'
  source         text not null,         -- ai|klant|gesprek
  confidence     numeric(3,2),
  evidence_url   text,
  evidence_quote text,
  set_by         uuid references auth.users (id),
  set_at         timestamptz not null default now(),
  primary key (profile_id, field)
);

alter table public.profiles
  add column if not exists inventory_quality_json jsonb,   -- vervangt de gereserveerde 0033
  add column if not exists onboarding_budget_usd numeric(10,6) not null default 2.15,
  add column if not exists deep_research_at timestamptz;
```

### `0040_topics_en_strategie.sql`

```sql
create table if not exists public.profile_topics (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  rationale     text,                   -- waarom dit onderwerp, met verwijzing naar het aanbod
  offering_ids  uuid[] not null default '{}',
  priority      integer not null default 0,
  -- Wat de klant er in het gesprek zelf over zei. Dit is het antwoord op
  -- "welke topics zijn belangrijk" en het overrulet de AI-prioritering.
  client_note   text,
  status        text not null default 'voorgesteld',  -- voorgesteld|goedgekeurd|afgewezen
  analysis_id   uuid references public.analyses (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Wat uit het gesprek komt. Bewust klein: de topicprioriteit staat hierboven op
-- profile_topics, dus wat hier overblijft is de vrije strategie-uitleg plus de
-- context die de pijplijn niet zelf kan waarnemen.
create table if not exists public.profile_strategy (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  strategy_notes  text,
  -- [{ kind, description, effective_from }] — zie de kind-enum in blok C.
  context_factors jsonb not null default '[]'::jsonb,
  recorded_by     uuid references auth.users (id),
  recorded_at     timestamptz
);
```

### `0041_multi_engine.sql`

```sql
alter table public.ai_calls  add column if not exists engine text not null default 'openai';
alter table public.profiles  add column if not exists engines_enabled text[] not null default '{openai}';

-- De idempotentiesleutel van een meting krijgt de engine erbij. Zonder dit
-- ziet een Gemini-meting de OpenAI-meting van dezelfde vraag als "al gedaan".
create unique index if not exists tracking_runs_idem_idx
  on public.tracking_runs (analysis_id, prompt_id, week_no, engine, repeat_index, purpose);
```

`visibility_scores.per_engine_json` bestaat al sinds `0001` en is nooit gevuld — die wordt nu de
plek voor de score per engine. De rij blijft uniek op `(analysis_id, week_no)`; het totaalcijfer
blijft het gewogen gemiddelde over de engines heen.

⚠️ Controleer vóór het aanmaken van die unieke index of de bestaande rijen hem niet schenden
(oude metingen zonder `purpose`/`repeat_index`). Zo nodig eerst een `select` met `group by … having
count(*) > 1`.

---

## 3. Blok A — Stafrol en overdracht (2 d)

**Bestanden:** `lib/auth.ts`, `lib/profiles.ts`, `lib/analyses.ts`, `app/api/profiles/route.ts`,
nieuw `app/api/profiles/[id]/handover/route.ts`, `app/(app)/profielen/[id]/handover-box.tsx`.

1. `isStaff(userId)` naast `getUser()`. Eén plek, gecached per request.
2. `getOwnedProfile()` en `getOwnedAnalysis()` krijgen een tweede uitweg: eigenaar **of** staf.
   Dit is de gevoeligste wijziging van het hele plan — elke schrijfroute hangt eraan. Alle 30+
   aanroepplekken moeten mee, en er hoort een ketentest bij die bewijst dat een gewone gebruiker
   nog steeds niet bij het profiel van een ander kan.
3. Aanmaken: `created_by_user_id = auth.uid()`, `user_id = auth.uid()` (de consultant is tijdelijk
   eigenaar), `handover_state = 'intern'`.
4. **Overdracht** — `POST /api/profiles/[id]/handover { email }`:
   - zoekt of maakt de auth-gebruiker (Supabase invite);
   - zet `profiles.user_id`, **en cascadeert naar `analyses.user_id`, `content_pieces` en al het
     andere dat `user_id` draagt van dat profiel** — in één transactie. Vergeet je dit, dan ziet de
     klant zijn profiel maar niet zijn analyses;
   - zet `handover_state = 'overgedragen'` en `handover_at`.
5. UI: een overdrachtblok op de profielpagina, alleen zichtbaar voor staf.

**Verificatie:** een consultantaccount ziet alle profielen; een klantaccount ziet alleen het zijne;
na overdracht is het profiel én al zijn analyses van de klant, en de consultant houdt toegang via
`is_staff()`. Ketentest voor alle drie.

---

## 4. Blok B — De onderzoekspijplijn (6 d)

Zeven nieuwe taaksoorten in `lib/jobs/types.ts`. Elke taak ketent naar de volgende.

| Fase | Jobtype | AI | Web search | Kosten | Duur |
|---|---|---|---|---|---|
| 0 | `profile_discover` | nee | nee | **$0,00** | ~60 s |
| 1 | `profile_identity` | 1 | ja | ~$0,03 | ~30 s |
| 2 | `profile_offering` | 2–4 parallel | nee | ~$0,05 | ~60 s |
| 3 | `profile_market` | 3 parallel | ja | ~$0,10 | ~60 s |
| 4 | `profile_llm_baseline` | 8–12 parallel | deels | ~$0,30 | ~90 s |
| 5 | `technical_audit` (bestaand, uitgebreid) | nee | nee | $0,00 | ~30 s |
| 6 | `profile_synthesis` | 1 | nee | $0,02 of $0,49 | ~60 s |
| | **Totaal** | | | **$0,50–0,97** | **~7 min** |

Zeven zware taken × één per werkeraanroep (`HEAVY_JOB_RESERVE_MS` 220 s tegen een budget van
240 s, `pg_cron` 1×/min) = **~7 minuten wachttijd**, binnen de 10 die je acceptabel noemt. Dat is de
échte beperking, niet het geld: het budget is voor minder dan de helft benut.

### Fase 0 — Ontdekken (`lib/pipeline/discover.ts`, nieuw)

Alles wat met een `fetch` en een reguliere expressie kan. Nul API-kosten, en dit is de fase waar de
meeste kennis vandaan komt.

- Crawl tot `MAX_PAGES_HARD_CAP` (150) in plaats van de default 60.
- **URL-taxonomie uit de sitemap**: welke secties bestaan en hoeveel pagina's per sectie. Dit is hoe
  een productverkoper zijn categorieboom krijgt zonder dat een model iets hoeft te raden.
- **Gestructureerde data oogsten**: JSON-LD, OpenGraph, microdata. `Organization`, `LocalBusiness`
  (adres, openingstijden, telefoon), `Product`, `Service`, `FAQPage`, `AggregateRating`. Gratis,
  exact, en meteen citeerbare feiten voor `brand_facts`.
- **Renderingtest**: hoeveel tekst staat er in de HTML zónder JavaScript? AI-crawlers voeren geen JS
  uit; een site die zonder JS leeg is, is voor ChatGPT onzichtbaar hoe goed de content ook is.
- `llms.txt`, feeds, hreflang, canonicals, statuscodes, redirectketens.
- Wikidata/Wikipedia (`offsite/entity-presence.ts` bestaat al, staat nu op analyseniveau — verhuist
  hierheen).
- **Inventariskwaliteitsoordeel** → `profiles.inventory_quality_json`. Dit is R6.2 uit de roadmap:
  Bol had 1 pagina, HEMA 40 productpagina's, en in beide gevallen degradeerde het rapport zonder
  melding. Nu weet de pipeline het in fase 0 en zegt het de consultant vóór het gesprek.

Belangrijk: **fase 0 bepaalt het budget van de rest.** Levert de crawl weinig op, dan is web search
de betere besteding en mag fase 3 ruimer; is de site rijk, dan gaat het geld naar extractie.

### Fase 1 — Identiteit en bedrijfsmodel

Eén goedkope aanroep die één ding beslist: `businessModel` (de enum uit `0032` bestaat al). Die
waarde **stuurt welke takken van fase 2 draaien**. Verder: canonieke merknaam, aliassen,
naamvarianten die op de site voorkomen.

### Fase 2 — Het aanbod, per bedrijfsmodel

Ander schema, andere brontekst, andere vragen per model. Vult `profile_offerings`.

- **Dienstverlener:** dienst → subdienst → welk probleem → voor wie → prijsmodel → waar → wie levert
  het → doorlooptijd → wat is in-/uitgesloten → certificeringen.
- **Retailer/fabrikant:** categorieboom (uit de sitemap, gratis) → gevoerde merken → eigen merk
  ja/nee → prijsklasse → assortimentsbreedte per categorie → garantie/retour.
- **Platform:** aanbod- en vraagzijde apart, categorieën, verdienmodel.

Elk knooppunt krijgt `evidence_url` + `evidence_quote`. Zonder klantinvoer is herleidbaarheid het
enige wat een fout profiel corrigeerbaar maakt.

### Fase 3 — Markt en concurrentie

Concurrenten mét bewijs (waarom, waar genoemd), positionering, prijsklasse, en het **merkbrede**
bronnenlandschap. `source_landscape` bestaat al maar hangt aan een analyse; op merkniveau is hij
herbruikbaar over alle analyses heen.

### Fase 4 — De LLM-kennisbasislijn

Het onderscheidende deel, en de brug naar fase 2 van de app. Vijf blokken, parallel binnen één taak,
per beschikbare engine (zie blok E).

| Blok | Web search | Wat het meet |
|---|---|---|
| **A. Kent het model je?** | nee | Parametrische kennis: zit het merk in het model, of moet het altijd gezocht worden |
| **B. Klopt het?** | n.v.t. | **Deterministisch in code**: het antwoord uit A tegen de feiten uit fase 0. Per feit *juist / onjuist / verzonnen / niet genoemd* |
| **C. Wat citeert het?** | ja | Welke bronnen haalt een engine aan als hij over jou moet praten |
| **D. Verwarringstest** | ja | Is de naam ambigu? Levert aliassen **en uitsluitingen** |
| **E. Categorienulmeting** | ja | 3–5 merkneutrale koopvragen uit de aanbodboom |

Blok B is het punt waar dit product zich onderscheidt: *"ChatGPT denkt dat je in Eindhoven zit en
ook fysiotherapie doet."* Het model beoordeelt zichzelf **niet** — dat is dezelfde regel die hier al
drie keer nodig bleek (`content-gate.ts`, `validate-claims.ts`, `isSupported()`).

Blok D is niet cosmetisch: een ambigue merknaam produceert vals-positieve vermeldingen in fase 3.
De uitsluitingen die hier uitkomen, voeden `lib/entities/`.

**Nieuwe tabel** `profile_llm_baseline` (profile_id, engine, block, question, raw_response,
verdict_json, cost_usd, measured_at) — hoort bij `0040`.

### Fase 5 — Technische audit, uitgebreid

`lib/audit/technical.ts` kijkt nu alleen naar robots.txt en AI-crawlers. Erbij, allemaal uit wat
fase 0 al ophaalde en dus **nul extra kosten**:

- **Entiteitsconsistentie** — de check die niemand in dit segment doet. Canonieke naam tegenover:
  `<title>`, JSON-LD `Organization.name`, de footer, `og:site_name`, `sameAs`-profielen en Wikidata.
  Schrijft een MKB'er zijn bedrijf op vier manieren, dan is dat een concrete bevinding met een
  concrete actie.
- NAP-consistentie (naam/adres/telefoon) over alle gecrawlde pagina's.
- `@id` / `sameAs` / `mainEntityOfPage` aanwezig in de schema-opmaak.
- JSON-LD-dekking per paginatype.
- Renderbaarheid zonder JS (uit fase 0).
- **Antwoord-eerst als audit**: dezelfde heuristiek die `content_draft` afdwingt, losgelaten op de
  bestaande pagina's. Staat er een direct antwoord in de eerste twee zinnen?
- Citeerbaarheid: bevat een sectie een losstaand begrijpelijke zin?

Alles past in het bestaande `AuditCheck`-contract (`id`, `label`, `severity`, `finding`, `fix`,
`who`) en `technical_audits.checks_json` is al `jsonb` — **geen migratie nodig**.

### Fase 6 — Synthese

Eén aanroep die er een leesbaar dossier van maakt, gaten benoemt en per veld een zekerheid geeft.
Schrijft door naar de bestaande kolommen (`products`, `competitors`, `tone_of_voice`, `personas`,
`proof_points`, `style_samples`) zodat `topic-research`, `prompts` en `content` ongewijzigd blijven
werken — **geen big bang**.

Vult ook `brand_facts` (de feitenbank uit `0036`, met `fact_key`-ontdubbeling en
tegenspraakdetectie). Dat is waar de investering meetbaar terugkomt.

**Aanbeveling:** deze ene aanroep op `gpt-5.6-sol` ($0,49). Het is de call die alles samenbrengt en
doorwerkt in élke latere analyse, en het past ruim binnen €2. Zet hem achter een schakelaar
(`SYNTHESIS_PREMIUM`) zodat de keuze meetbaar is in plaats van definitief.

### De budgetpoort

`lib/pipeline/onboarding-budget.ts` (pure module, testbaar):
`budgetRemaining(profileId)` telt `ai_calls` op `profile_id` en vergelijkt met
`profiles.onboarding_budget_usd`. Elke fase controleert vóór zijn dure aanroepen.

**Past een fase er niet meer in, dan wordt hij overgeslagen én geregistreerd** — zichtbaar op het
profiel, nooit stil. Omdat de volgorde oploopt in kosten en afloopt in belang, is "budget op"
automatisch de juiste keuze. Dit is conventie 3 (*onbekend > verkeerd*) en 8 (*alles bewaren*) in één.

---

## 5. Blok C — Corrigeren, aanvullen en het gesprek (2 d)

**Bestanden:** `app/(app)/profielen/nieuw/onboarding-wizard.tsx` (uitkleden),
`app/(app)/profielen/[id]/profile-editor.tsx`, `profile-gaps.tsx`, nieuw
`app/(app)/profielen/[id]/strategy-box.tsx` en `app/api/profiles/[id]/strategy/route.ts`.

Geen apart gespreksscherm. Alles landt op de bestaande profielpagina, die al een editor, een
`dossier-box` voor geplakt materiaal en `fact-requests` heeft. Er komt één kaart bij.

1. **Wizard terug naar één scherm.** Stappen 1–3 en de knop "Eerst meer vertellen" eruit;
   `isStepValid` houdt alleen `case 0` over. De kolommen blijven bestaan (additief) — ze worden
   alleen door de pipeline gevuld in plaats van door de klant.
2. **Herkomst zichtbaar op elk veld.** Uit `profile_field_sources`: een chip met bron
   (`AI` / `klant` / `gesprek`), de zekerheid, en de bron-URL als link. Wie een veld bewerkt, zet de
   bron op `klant` of `gesprek`.
3. **De mens wint, en dat is afdwingbaar.** Een latere onderzoeksronde mag een veld met bron
   `klant` of `gesprek` **nooit** overschrijven. Dat hoort in een pure functie
   (`lib/pipeline/field-merge.ts`) met unittests, niet in een promptinstructie — conventie 1.
4. `ProfileGaps` verandert van *"vul dit nog in"* naar *"dit konden we niet vaststellen"*, gesorteerd
   op zekerheid oplopend. Dat is meteen de gespreksagenda: de consultant begint bij wat de pipeline
   niet wist. Geen apart scherm nodig — de sortering ís de leidraad.
5. **Interne feiten uit het gesprek** gaan via de bestaande route
   `POST /api/profiles/[id]/dossier` en `PATCH /api/profiles/[id]/facts` naar `brand_facts`, met
   bron `gesprek`. Nul nieuw bouwwerk; alleen de bronwaarde erbij.

### De strategiekaart

Eén kaart, twee velden, en het tweede is het interessante.

**a) Vrije strategie-uitleg** (`strategy_notes`). Wat de klant wil bereiken, in zijn eigen woorden.
Gaat als contextblok mee naar de promptgeneratie en het rapport.

**b) Contextfactoren die de pipeline niet kan waarnemen** (`context_factors`). Een lijstje met een
gesloten soort, een omschrijving en optioneel een ingangsdatum. Dit is geen notitieveld — elke soort
heeft een gevolg in code:

| `kind` | Wat de app ermee doet |
|---|---|
| `nieuwe_website` | Technische audit en het nieuw/verbeteren-advies krijgen een houdbaarheidsmelding: de bevindingen gelden voor een site die straks niet meer bestaat. Zichtbaar op het profiel én in de rapportinvoer. |
| `naamswijziging` · `rebranding` | Oude én nieuwe naam moeten in `aliases`, anders telt de meting de vermeldingen van één van beide niet mee. |
| `gestopte_dienst` | Valt uit de aanbodboom en uit de topicvoorstellen. |
| `nieuwe_dienst` | Staat nog niet op de site, dus de crawl vindt hem nooit — handmatig toe te voegen als `profile_offerings`-rij met bron `gesprek`. |
| `nieuwe_regio` | Gaat mee in `service_regions` en dus in de lokale promptgeneratie. |
| `overig` | Alleen zichtbaar, geen gedrag. |

Die tabel is de reden dat dit een gestructureerd veld is en geen tekstvak: *"we bouwen een nieuwe
site"* verandert wat het advies waard is, en dat mag niet in een notitie verdwijnen die niemand meer
leest. De afhandeling hoort in een pure module (`lib/pipeline/context-factors.ts`) met unittests.

---

## 6. Blok D — Core topics (2 d)

**Bestanden:** nieuw `lib/pipeline/propose-topics.ts`, `lib/schemas/topics.ts`,
`app/api/profiles/[id]/topics/route.ts`, `app/(app)/profielen/[id]/topics-panel.tsx`.

Eén taaksoort `propose_topics`, ketent na `profile_synthesis`. Eén aanroep, geen web search, invoer
is `profile_offerings` + markt + de LLM-basislijn. Kosten: **~$0,01** — de afspraak dat dit buiten
het €2-budget valt, is in de praktijk academisch.

Per topic: titel, onderbouwing met verwijzing naar het aanbod waar hij uit voortkomt, en een
prioriteit. **Geen meting** — de lijst is een voorstel, zoals besloten.

De consultant zet ze aan of uit. Goedkeuren roept de **bestaande** `POST /api/analyses` aan met
`topic = title`, en zet `profile_topics.analysis_id`. Nul duplicatie van de analysepijplijn.

Dat maakt dit blok klein en de UX-winst groot: van *"verzin een onderwerp"* naar *"kies uit wat je
aanbiedt"* — de grootste verandering die uit de InSpace-vergelijking kwam.

---

## 7. Blok E — Multi-engine (4 d, waarvan 1 d pas als de key er is)

### De seam bestaat al

`lib/openai/structured.ts` heeft een `StructuredTransport`-type met `__setTestTransport()` voor de
ketentests. Dat is het injectiepunt: een tweede provider is een tweede implementatie van een
bestaand contract, geen herbouw van de aanroeplaag. `tracking_runs.engine` staat sinds `0001` in de
database met default `'openai'`, en `visibility_scores.per_engine_json` wacht al vijf maanden op
gebruik.

### Nieuwe map `lib/engines/`

- `types.ts` — `EngineId = 'openai' | 'gemini'`, en een `EngineAdapter` met `callStructured`,
  `callPlain`, `supportsWebSearch`, `rates`.
- `openai.ts` — verhuist de bestaande implementatie hierheen, gedrag ongewijzigd.
- `gemini.ts` — Google GenAI SDK, Zod → JSON Schema voor structured output, `google_search` als
  groundingtool.
- `registry.ts` — `availableEngines()` leest welke API-keys er zijn. **Zonder `GEMINI_API_KEY` is
  dat `['openai']` en verandert er niets.** Dat is geen degradatiepad maar de normale toestand tot de
  key er is.

### De beslissing die de meting redt

**Halte 3a (de simulatie) draait per engine. Halte 3b (de beoordeling) blijft altijd op één vast
model.**

Zonder die scheiding meet je het verschil tussen twee *beoordelaars* in plaats van tussen twee
*engines*, en is geen enkele vergelijking tussen ChatGPT en Gemini nog iets waard.
`lib/openai/mention-prompt.ts` beschrijft zichzelf als "de meest load-bearing prompt van het
product" en `scripts/eval-mention.ts` is erop afgeregeld — die blijft dus waar hij is.

### Wat er verandert in de meetlaag

1. `measure.ts:176` heeft `engine: "openai"` hardgecodeerd → uit de taak-payload.
2. `JobPayloads.measure_prompt` krijgt `engine: EngineId`. Bij twee engines worden het 60 taken in
   plaats van 30. `measure_prompt` is een lichte taak, dus de werker pakt er meerdere per aanroep —
   de doorlooptijd verdubbelt niet evenredig, maar reken op ~1,5×.
3. Idempotentiesleutel `(analyse, prompt, week, engine, herhaling, doel)` — zie `0041`. **Zonder de
   engine erin ziet een Gemini-meting de OpenAI-meting als "al gedaan" en meet hij nooit.**
4. Aggregatie (`computeAggregates`) rekent per engine én totaal → `per_engine_json`. Het gewicht per
   engine hoort een constante te zijn in een pure module, geen verborgen aanname.
5. `lib/openai/pricing.ts` krijgt Gemini-tarieven. **Die zijn nu onbekend** — invullen zodra de key
   er is, en `RATES_CHECKED_ON` bijwerken. Tot die tijd valt Gemini op `FALLBACK_RATE` en overschat
   de registratie de kosten. Dat is de veilige kant, maar het is geen meetwaarde.
6. UI: score per engine in `score-panel.tsx` en `geo-scorecard.tsx`.

### Kosten

Een meetronde verdubbelt grofweg: **~$0,40 → ~$0,80**. Onder voorbehoud, want de Gemini-tarieven
staan nog niet vast en de web-zoekkosten per engine verschillen. Dit is de duurste beslissing in dit
plan en de enige die de maandelijkse kosten per klant structureel raakt — reken hem na tegen
`ai_calls` zodra de eerste ronde met twee engines gedraaid heeft (conventie 10).

---

## 8. Bouwvolgorde

| # | Blok | Dagen | Waarom hier |
|---|---|---|---|
| 1 | **B fase 0** (ontdekken, gratis) | 2 | Grootste kwaliteitssprong, nul kosten, blokkeert al het andere |
| 2 | **A** (staf + overdracht) | 2 | Zonder dit is er geen consultantflow om op te bouwen |
| 3 | **B fase 1–3, 6** (onderzoek) | 3 | Het profiel zelf |
| 4 | **C** (correctie + strategiekaart) | 2 | Maakt fase 3 bruikbaar; zonder dit is het onbevestigde data |
| 5 | **D** (topics) | 2 | Klein, en het leunt op het aanbod uit fase 2 |
| 6 | **B fase 4–5** (LLM-basislijn + audit) | 2 | Kan los; fase 5 is gratis |
| 7 | **E** (multi-engine) | 3 + 1 | Abstractie nu, Gemini-adapter zodra de key er is |

Blok 1 en 2 kunnen parallel: ze raken elkaars bestanden niet.

---

## 9. Verificatiecriteria

Conventie 10: gebouwd is niet geverifieerd. Per blok, tegen echte data:

| Blok | Criterium |
|---|---|
| A | Consultant ziet alle profielen; klant alleen het eigene; na overdracht zijn profiel **én analyses** van de klant. Ketentest voor alle drie. |
| B fase 0 | Bol wordt als "onvoldoende" gemarkeerd (1 pagina), HEMA als "vervuild" (overwegend productpagina's), de andere drie als voldoende. Dit is het bestaande R6.2-criterium. |
| B fase 2 | Bij Fysi-Unique (dienstverlener) staat de dienstenboom met minstens 4 diensten, elk met `evidence_url`. Bij HEMA (retailer) staat de categorieboom uit de sitemap. |
| B fase 4 | Blok B levert per feit een oordeel dat **deterministisch** herleidbaar is — geen enkel oordeel komt uit het model zelf. |
| B budget | p95 van de onboardingkosten over 5 profielen ligt onder $2,15, gemeten in `ai_calls`, niet geschat. |
| C | Een veld dat in het gesprek is aangepast, overleeft een tweede onderzoeksronde ongewijzigd. Unittest op `field-merge.ts`. |
| C | Een contextfactor `nieuwe_website` zet de houdbaarheidsmelding op de technische audit **en** in de rapportinvoer; `naamswijziging` levert beide namen in `aliases`. Unittest op `context-factors.ts` per soort. |
| D | Voor alle vijf testprofielen komen er 5–8 topics, elk met een verwijzing naar een bestaand `profile_offerings`-record. Een ingevulde `client_note` overrulet de AI-prioritering in de sortering. |
| E | Eén analyse gemeten op twee engines geeft twee sets `tracking_runs` met dezelfde prompt-ID's en verschillende `engine`, en `per_engine_json` bevat twee scores. |
| Keten | **Het aantal briefingvragen in fase 4 daalt.** Nu tot 8 omdat de feitenkaart leeg is; met een gevulde feitenbank hoort dat lager te liggen. Dit is het bewijs dat de investering doorwerkt. |

De vaste controle blijft: `npx tsc --noEmit` · `npm run test:unit` · `npm run test:chain` ·
`npm run build`. Elke wijziging die een uitkomst beïnvloedt krijgt een unittest; elke wijziging in de
samenhang tussen taken een scenario in `test-chain.ts` — daar zaten zeven van de zeven fouten van het
vorige traject.

---

## 10. Risico's

**De RLS-verbreding is het gevaarlijkst.** `is_staff()` geeft leestoegang tot alles. Eén fout in de
policy en klanten zien elkaars gegevens. Dit blok verdient een expliciete ketentest per tabel, en
`staff_users` moet zonder policies blijven om recursie te voorkomen.

**Het correctieanker verdwijnt.** Nu vangt klantinvoer modelfouten af; straks is er niets tot het
gesprek. Een fout profiel vervuilt élke latere analyse. Mitigatie: zekerheid per veld, herkomst per
veld, en een `ProfileGaps` die de twijfelgevallen bovenaan zet. Het gesprek is daarmee geen
service maar een **kwaliteitspoort**.

**Naamsverwarring bij alleen een naam en een URL.** Anker alles aan het **domein**, niet aan de naam:
wat web search oplevert zonder koppeling aan dat domein is een aanwijzing, geen feit. Daarom draait
blok D van fase 4 vroeg.

**De Gemini-tarieven zijn onbekend.** De verdubbeling naar ~$0,80 per meetronde is een schatting op
basis van OpenAI-prijzen. Kan er flink naast zitten, beide kanten op.

**Veroudering.** `profile_facets.researched_at` per facet, plus een goedkope herhaalronde die alleen
verlopen facetten ververst — en nooit een veld met bron `klant` of `gesprek` aanraakt.

---

## 11. Buiten scope

- **CMS-koppeling.** Expliciet later.
- **Backfill van bestaande profielen.** Helemaal niet: geen automatische ronde en ook geen
  handmatige route. Het nieuwe onderzoek geldt alleen voor nieuwe profielen.
- **Apart gespreksleidraad-scherm.** De oplopende sortering van `ProfileGaps` is de leidraad.
- **Meting per topic vóór goedkeuring.** Besloten: alleen een voorstellijst.
- **Meer engines dan OpenAI en Gemini.** De abstractie maakt het mogelijk; de beslissing is een
  aparte.
- **Contentplanning.** Genoemd als later werk.
