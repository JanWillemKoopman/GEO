# ORBIT ENGINE: technische beschrijving van de pijplijn, van klantaccount tot nameting

> **Voor wie.** Een extern technisch team dat de app wil analyseren. Elke stap staat er, ook de stappen
> die geen mens ooit aanklikt omdat de app ze zelf doet. Per stap staat wat er gebeurt, welke techniek
> erachter zit, welke data erin en eruit gaat, en waarom de stap bestaat.
>
> **Peildatum en bron.** 30 september 2026. Alles hieronder is nagelezen tegen de code op `main`, commit
> `80631e6`: de samenvoeging van de pijplijnanalyse, fase 1 tot en met 5
> ([JanWillemKoopman/GEO#208](https://github.com/JanWillemKoopman/GEO/pull/208)), het verwijderen van de
> Sales-module en van het scherm Diagnose, en de nieuwe zijbalk (die raakt de pijplijn niet). De eerste versie van dit
> document (29 september 2026) beschreef de stand na fase 2; fase 3 tot en met 5 en de Sales- en
> Diagnosewijziging zijn in deze versie verwerkt. Waar dit document afwijkt van de oudere
> documentatie in `docs/` (bijvoorbeeld `doorloop-van-klant-tot-content.md`), is de code leidend en staat
> de afwijking in [bijlage G](#bijlage-g-waar-dit-document-afwijkt-van-de-oudere-documentatie).
>
> **Wat wel en niet is gecontroleerd.** De code is gelezen. Er is voor dit document geen
> betaalde AI-aanroep gedaan en geen database van productie bevraagd. De testsuites zijn bij de
> samenvoeging wel gedraaid (zie het einde van bijlage H). Bedragen en
> doorlooptijden komen uit de projectdocumentatie (`CLAUDE.md`, `docs/doorloop-van-klant-tot-content.md`)
> en zijn hier niet opnieuw gemeten; ze staan er als richtwaarde. Het project houdt zelf de regel aan dat
> "gebouwd" niet "geverifieerd" is (`CLAUDE.md`, conventie 10). Waar ik uit de code iets afleid dat ik niet
> heb kunnen nameten, staat dat er met "afgeleid uit de code" bij.
>
> **Hoe je een microstap leest.** Elke microstap heeft dezelfde vaste velden:
>
> | Veld | Betekenis |
> |---|---|
> | **Wat** | Wat er gebeurt, in één of twee zinnen |
> | **Techniek** | Welk mechanisme: route, taak, model, regelwerk in code, database |
> | **Data in** | Welke gegevens de stap leest |
> | **Data uit** | Wat de stap oplevert en waar dat wordt opgeslagen |
> | **Waarom** | Het ontwerpbesluit erachter |
> | **Bij fouten** | Alleen waar het faalgedrag bijzonder is |
> | **Code** | De belangrijkste bestanden |

---

## Introductie: wat ORBIT ENGINE is en waarvoor de app dient

**Wat het is.** ORBIT ENGINE is een app van Outer Orbit voor het mkb. Steeds meer mensen stellen hun vragen
niet meer aan Google maar aan een AI-assistent zoals ChatGPT: "welke installateur in Eindhoven kan mijn
cv-ketel vervangen?". Noemt zo'n assistent een bedrijf niet in het antwoord, dan bestaat dat bedrijf voor die
vrager niet. Het vakgebied heet GEO (Generative Engine Optimization): zichtbaar zijn in de antwoorden van
AI-assistenten. ORBIT ENGINE maakt dat voor een mkb-bedrijf meetbaar en stuurbaar.

**Het doel.** De app helpt een bedrijf vaker en beter genoemd te worden in AI-antwoorden, en laat zien of
dat gelukt is. Ze doet dat in vier bewegingen:

1. **Meten.** Word je genoemd als een koper een vraag stelt, hoe prominent, en wie wordt er in plaats van
   jou genoemd?
2. **Adviseren.** Welke pagina's ontbreken of zijn te zwak, zodat een AI-assistent je niet kan noemen?
3. **Schrijven.** Die pagina's samen met de ondernemer maken: de app haalt op wat alleen de ondernemer weet,
   en een sterke AI-schrijver maakt daar een pagina van die de ondernemer zo op zijn site kan zetten.
4. **Het effect bewijzen.** Na publicatie opnieuw meten, naast een controlegroep van vragen zonder nieuwe
   pagina, om te zien of de pagina iets opleverde.

**Het uitgangspunt bij het schrijven.** De app probeert niet de beste AI-tekst te maken, maar de kennis van
een ondernemer zo goed mogelijk aan een goede AI-schrijver te geven. Daarom zijn de vragen aan de ondernemer
de kern van het product en geen last die zo klein mogelijk gehouden wordt.

**Hoe de app wordt ingezet.** De verkoop loopt via een consultant van Outer Orbit: die zet het merk klaar
vóór het eerste gesprek, de app doet het onderzoek, en pas na de verkoop krijgt de klant een eigen account.
Alles wat geld kost, start alleen de consultant. De klant leest, beantwoordt vragen en keurt teksten goed.

**Wat de app bewust niet doet.** Ze publiceert nooit zelf op de site van een klant (er is geen koppeling met
een websitesysteem), en ze meet geen tien AI-assistenten tegelijk: ChatGPT is de hoofdbron, de andere bronnen
zijn optioneel.

**Wat dit document beschrijft.** De hele weg die een klant aflegt: account en merk aanmaken, onderzoek, gesprek,
meten, adviseren, plannen, schrijven, controleren, goedkeuren, publiceren en nameten. Zo ziet een technisch
team wat er op elk moment achter de schermen gebeurt.

---

## Inhoud

- [Deel I. Overzicht](#deel-i-overzicht)
  - [1. Wat de app doet](#1-wat-de-app-doet)
  - [2. De hoofdstappen op een rij](#2-de-hoofdstappen-op-een-rij)
  - [3. Techstack en omgevingen](#3-techstack-en-omgevingen)
  - [4. Het datamodel in het kort](#4-het-datamodel-in-het-kort)
- [Deel II. De gemeenschappelijke techniek](#deel-ii-de-gemeenschappelijke-techniek)
  - [Hoofdstap 0. Het platform onder alle stappen](#hoofdstap-0-het-platform-onder-alle-stappen)
- [Deel III. De pijplijn, hoofdstap voor hoofdstap](#deel-iii-de-pijplijn-hoofdstap-voor-hoofdstap)
  - [Hoofdstap 1. Inloggen, accounts en rechten](#hoofdstap-1-inloggen-accounts-en-rechten)
  - [Hoofdstap 2. Een merk aanmaken](#hoofdstap-2-een-merk-aanmaken)
  - [Hoofdstap 3. Het automatische merkonderzoek](#hoofdstap-3-het-automatische-merkonderzoek)
  - [Hoofdstap 4. De kennislaag: één klantwaarheid](#hoofdstap-4-de-kennislaag-één-klantwaarheid)
  - [Hoofdstap 5. Het gesprek met de klant](#hoofdstap-5-het-gesprek-met-de-klant)
  - [Hoofdstap 6. Het klantaccount, de toewijzing en het pakket](#hoofdstap-6-het-klantaccount-de-toewijzing-en-het-pakket)
  - [Hoofdstap 7. Een cluster opzetten: onderwerp, meetvragen en de poort](#hoofdstap-7-een-cluster-opzetten-onderwerp-meetvragen-en-de-poort)
  - [Hoofdstap 8. De meting](#hoofdstap-8-de-meting)
  - [Hoofdstap 9. Het rapport en de kansen](#hoofdstap-9-het-rapport-en-de-kansen)
  - [Hoofdstap 10. Het contentplan](#hoofdstap-10-het-contentplan)
  - [Hoofdstap 11. De voorbereiding van een pagina](#hoofdstap-11-de-voorbereiding-van-een-pagina)
  - [Hoofdstap 12. De vragen aan de klant](#hoofdstap-12-de-vragen-aan-de-klant)
  - [Hoofdstap 13. Het schrijven](#hoofdstap-13-het-schrijven)
  - [Hoofdstap 14. De controle en de herschrijving](#hoofdstap-14-de-controle-en-de-herschrijving)
  - [Hoofdstap 15. Lezen, goedkeuren en opleveren](#hoofdstap-15-lezen-goedkeuren-en-opleveren)
  - [Hoofdstap 16. Publiceren en de publicatiecontrole](#hoofdstap-16-publiceren-en-de-publicatiecontrole)
  - [Hoofdstap 17. De nameting van een gepubliceerde pagina](#hoofdstap-17-de-nameting-van-een-gepubliceerde-pagina)
  - [Hoofdstap 18. Herhaling en aanverwante processen](#hoofdstap-18-herhaling-en-aanverwante-processen)
- [Deel IV. Bijlagen](#deel-iv-bijlagen)
  - [Bijlage A. Alle AI-aanroepen](#bijlage-a-alle-ai-aanroepen)
  - [Bijlage B. Alle taaksoorten](#bijlage-b-alle-taaksoorten)
  - [Bijlage C. Statusmodellen](#bijlage-c-statusmodellen)
  - [Bijlage D. Schakelaars en instellingen](#bijlage-d-schakelaars-en-instellingen)
  - [Bijlage E. Planning en cron](#bijlage-e-planning-en-cron)
  - [Bijlage F. Kosten](#bijlage-f-kosten)
  - [Bijlage G. Waar dit document afwijkt van de oudere documentatie](#bijlage-g-waar-dit-document-afwijkt-van-de-oudere-documentatie)
  - [Bijlage H. Aandachtspunten voor het technische team](#bijlage-h-aandachtspunten-voor-het-technische-team)

---

# Deel I. Overzicht

## 1. Wat de app doet

ORBIT ENGINE meet of een bedrijf (een "merk") genoemd wordt in de antwoorden van AI-assistenten zoals
ChatGPT, adviseert welke webpagina's ontbreken of te zwak zijn, laat die pagina's schrijven met kennis van
de ondernemer, en meet daarna of de gepubliceerde pagina effect had. Dit vakgebied heet GEO (Generative
Engine Optimization).

De app is **sales-led, niet self-serve**: een klant maakt zelf geen merk aan. De consultant (medewerker van
Outer Orbit, in de code "staff") zet het merk klaar vóór het eerste gesprek, de pijplijn doet het onderzoek,
en pas na de verkoop wordt het merk aan het account van de klant gekoppeld. Alles wat geld kost (betaald
AI-werk) kan alleen de consultant starten.

De app **publiceert nooit zelf** op de site van een klant. Er is geen koppeling met een websitesysteem. De
klant plakt de goedgekeurde tekst zelf op zijn site en vult de live-link in.

Het ontwerpuitgangspunt van het schrijven staat in `docs/tasks/contentketen-opnieuw.md` §0: de app probeert
niet de beste AI-tekst te maken, maar de kennis van een ondernemer zo goed mogelijk aan een goede
AI-schrijver te geven.

## 2. De hoofdstappen op een rij

```
   CONSULTANT / KLANT                       APP (automatisch, via de wachtrij)
   ──────────────────                       ──────────────────────────────────
 1  Account, inloggen, rechten
 2  Merk aanmaken (3 velden)  ──────────▶  3  Merkonderzoek: vooronderzoek, crawl, profiel, aanbod,
                                              onderwerpen, markt, kennistest, samenvatting
                                          4  Kennislaag: elk onderzoeksresultaat wordt een item
                                              met status en herkomst
 5  Gesprek met de klant  ◀───────────────   onderzoek bijwerken waar het gesprek iets raakt
 6  Klantaccount, toewijzing, pakket
 7  Cluster kiezen  ────────────────────▶   onderwerp onderzoeken, 30 meetvragen opstellen
    vragen goedkeuren (de poort)
                                          8  Meting: elke vraag aan de AI-assistent, beoordeling,
                                              score, concurrenten
                                          9  Rapport, aanbevelingen, kansen
10  Contentplan: maanden, vrijgeven  ───▶  11 Per pagina: open vraag, brief met onderzoek en vragen
12  Vragen beantwoorden  ◀──────────────
                                          13 Schrijven (poort: brief klaar, nul open vragen,
                                              datum binnen 10 dagen)
                                          14 Controle in code, beoordeling, hooguit één herschrijving
15  Lezen, gele zinnen bevestigen,
    goedkeuren, opleveren  ◀────────────
16  Klant plaatst de pagina zelf,
    vult de live-link in  ──────────────▶  publicatiecontrole (bereikbaar, tekst aanwezig, metadata)
                                          17 Nameting na 14 en 28 dagen: doelvragen tegen controlevragen,
                                              oordeel met foutmarge
                                          18 Maandelijkse herhaling, Search Console, off-site scan,
                                              technische audit, herinneringen
```

| Hoofdstap | Doel in één zin | Wie start het | Betaald AI-werk |
|---|---|---|---|
| 0 Platform | Wachtrij, AI-laag, kostenbewaking, rechten | Nvt | Nvt |
| 1 Accounts | Wie mag wat zien en doen | Beheerder | Nee |
| 2 Merk aanmaken | Een klantbedrijf met website vastleggen | Consultant | Start hoofdstap 3 |
| 3 Merkonderzoek | Weten wie het bedrijf is en wat AI erover weet | Automatisch | Ja |
| 4 Kennislaag | Eén plek voor alles wat over het bedrijf bekend is | Automatisch en mens | Beperkt |
| 5 Gesprek | Aanvullen wat een website niet vertelt | Consultant | Bij "onderzoek bijwerken" |
| 6 Toewijzing | Het merk naar het klantaccount, pakket vastleggen | Consultant | Nee |
| 7 Cluster | Onderwerp kiezen en meetvragen opstellen | Consultant | Ja, licht |
| 8 Meting | Meten of het merk genoemd wordt | Consultant (poort), daarna automatisch | Ja, het grootste deel |
| 9 Rapport | Van meting naar aanbevelingen en kansen | Automatisch | Ja, licht |
| 10 Plan | Kansen in maanden zetten, maand vrijgeven | Consultant en klant | Nee |
| 11 Voorbereiding | Onderzoek en vragen per pagina | Automatisch na vrijgeven | Ja, per pagina |
| 12 Vragen | Kennis van de ondernemer ophalen | Klant of consultant | Nee |
| 13 Schrijven | Eén sterke schrijfbeurt | Automatisch | Ja, per pagina |
| 14 Controle | Verzonnen beweringen tegenhouden | Automatisch | Ja, per pagina |
| 15 Goedkeuren | De ondernemer beslist | Klant | Alleen bij een aanpassing |
| 16 Publiceren | Live-link vastleggen en controleren | Klant | Nee |
| 17 Nameting | Bewijzen of de pagina werkte | Automatisch, op vaste dagen | Ja |
| 18 Herhaling | Periodieke meting en aanverwante processen | Automatisch | Ja |

## 3. Techstack en omgevingen

| Onderdeel | Keuze | Waar in de code |
|---|---|---|
| Framework | Next.js 15 (App Router, React Server Components), React 19, TypeScript | `app/`, `components/`, `lib/` |
| Styling | Tailwind v4 | `app/globals.css`, `docs/designsystem.md` |
| Database en inlog | Supabase: Postgres, Auth, Row Level Security, `pg_cron`, `pg_net` | `lib/supabase/`, `supabase/migrations/` (127 migratiebestanden, genummerd tot en met `0129`, met enkele gaten in de nummering) |
| Hosting | Vercel, regio `dub1` (Dublin) | `vercel.json` |
| AI | OpenAI Responses API, twee modellen: `gpt-6-luna` (goedkoop) en `gpt-6-sol` (sterk). Vast in code, geen omgevingsvariabele | `lib/openai/models.ts` |
| Gestructureerde uitvoer | Zod-schema's, met `zodTextFormat` en `responses.parse` | `lib/openai/structured.ts` |
| Tweede meetbron (optioneel) | Google AI Overview via DataForSEO SERP-API | `lib/ai-overview/` |
| Derde meetbron (optioneel) | Gemini via DataForSEO, en een eigen Gemini-adapter met `GEMINI_API_KEY` | `lib/llm-responses/`, `lib/engines/gemini.ts` |
| Zoekvolume (optioneel, standaard uit) | DataForSEO keyword-volumes met 30 dagen cache | `lib/search-demand/` |
| E-mail | Resend, standaard uit (`EMAILS_ENABLED`) | `lib/email/` |
| Validatie | Zod | overal |

Twee omgevingen zijn relevant: `main` is productie (Vercel). Werk gebeurt op feature-branches. Migraties gaan
naar productie via de Supabase MCP-tool (`apply_migration`), niet via de CLI, en zijn altijd additief en
idempotent (nooit `drop`).

## 4. Het datamodel in het kort

Het volledige schema staat in `supabase/migrations/`. De tabellen die in dit document terugkomen, per laag:

| Laag | Tabellen | Betekenis |
|---|---|---|
| Toegang | `auth.users` (Supabase), `staff_users`, `accounts`, `account_users`, `account_invites` | Wie bestaat, wie is beheerder, welk klantaccount, welke leden, welke uitnodigingen |
| Merk | `profiles`, `profile_field_sources`, `profile_pages`, `profile_page_signals`, `profile_facets`, `profile_offerings`, `profile_topics`, `profile_strategy`, `profile_llm_baseline`, `profile_funnel_stages` | Eén klantbedrijf met zijn website, en alle onderzoeksresultaten |
| Kennis | `klantkennis`, `fact_requests`, `fact_conflicts`, `brand_facts` (oud), `afhankelijkheden`, `gebeurtenissen`, `gebeurtenis_verwerkingen` | De klantwaarheid (K1 tot en met K8), vragen aan de klant, conflicten |
| Cluster en meting | `analyses`, `topic_research`, `prompts`, `tracking_runs`, `tracking_run_mentions`, `entities` (via `lib/entities`), `visibility_scores`, `competitor_breakdown`, `reports` | Een cluster is één `analyses`-rij; een meetvraag is een `prompts`-rij; een antwoord is een `tracking_runs`-rij |
| Kansen en plan | `kansen`, `kans_bewijs`, `content_plans`, `plan_months`, `planned_pages` | Kansen uit het rapport, en de planning |
| Content | `content_pieces`, `content_piece_targets` (niet meer geschreven), `meetplannen`, `content_impact` | De pagina met alle versies, het meetplan, het effect |
| Wachtrij en boekhouding | `jobs`, `ai_calls`, `rate_limits` | Achtergrondwerk, elke AI-aanroep met kosten en ruwe uitvoer |
| Aanverwant | `technical_audits`, `source_landscape`, `offsite_tasks`, `search_console_days`, `search_console_queries`, `reputation_*`, `cluster_discovery_*`, `keyword_demand` | Zie hoofdstap 18 |
| Buiten gebruik | `sales_*` | De Sales-module is op 30 september 2026 uit de app verwijderd; de tabellen blijven staan omdat migraties additief zijn, net als de kolommen `sales_market_id` en `sales_run_id` op `jobs` en `ai_calls` (die de code nog meestuurt, maar altijd leeg). Geen code leest of schrijft de `sales_*`-tabellen nog |

Enkele afspraken over het model die de code afdwingt:

- **Eén cluster is één `analyses`-rij**, met `analyses.topic` als onderwerp. De kolom `week_no` (op
  `tracking_runs`, `visibility_scores` en `reports`) heet in de code een "periode": `week_no = 0` is de
  nulmeting, daarna 1, 2, 3 per maandelijkse ronde. De naam "week" is historisch.
- **Elke AI-aanroep** wordt vastgelegd in `ai_calls` met model, tokens, kosten, `raw_json` (de volledige ruwe
  uitvoer), `input_json` (wat er is meegestuurd) en `prompt_hash` (conventie 8 in `CLAUDE.md`).
- **Row Level Security is SELECT-only.** Schrijven gebeurt uitsluitend in API-routes en taken met de
  service-role client, na een expliciete eigenaarscontrole (conventie 6). De tabel `jobs` heeft RLS aan en nul
  policies: geen enkele clienttoegang, ook geen lezen (`supabase/README.md`).

---

# Deel II. De gemeenschappelijke techniek

## Hoofdstap 0. Het platform onder alle stappen

Deze hoofdstap beschrijft de mechanismen die in elke andere hoofdstap terugkomen. Lees hem eerst; de
latere hoofdstappen verwijzen ernaar met "zie 0.x".

### 0.1 De wachtrij met taken

- **Wat.** Bijna al het werk na een klik gebeurt op de achtergrond. Een route zet een taak klaar en antwoordt
  meteen; het scherm hoeft niet open te blijven.
- **Techniek.** De tabel `jobs` (`supabase/migrations/0013_jobs_queue.sql`). Een taak heeft `type`,
  `payload_json`, `analysis_id` of `profile_id`, `status` (`queued`, `running`, `done`, `failed`),
  `attempts`, `scheduled_for` en een `dedupe_key`. `enqueue()` (`lib/jobs/queue.ts`) voegt een rij in. Er
  is een unieke index op `dedupe_key` **alleen voor open taken** (`status in ('queued', 'running')`,
  `jobs_dedupe_open_idx`, migratie 0013). Botst die (Postgres-fout `23505`), dan is de taak al ingepland of
  loopt hij al en doet `enqueue()` niets (`created: false`). Zo kan een herhaalde klik of een dubbele
  gebeurtenis nooit twee gelijktijdige taken opleveren. Een afgeronde taak blokkeert een latere herhaling
  niet: het "al gedaan"-oordeel ligt bij de stap zelf, die eerst kijkt of zijn resultaat al bestaat (0.6). De sleutels staan gecentraliseerd in `lib/jobs/dedupe.ts`.
- **Data in.** Het taaktype en de payload (`JobPayloads` in `lib/jobs/types.ts`).
- **Data uit.** Een rij in `jobs`.
- **Waarom.** Vercel-functies mogen maximaal 300 seconden draaien en een onderzoeksstap kan minuten duren.
  De wachtrij ontkoppelt de klik van het werk en maakt herhalen veilig (idempotent).
- **Code.** `lib/jobs/queue.ts`, `lib/jobs/dedupe.ts`, `lib/jobs/types.ts`.

### 0.2 De werker

- **Wat.** Elke minuut pakt een werker de taken op die klaarstaan.
- **Techniek.** `pg_cron` draait de taak `geo-worker` met schema `* * * * *`
  (`0015_worker_cron_via_pg_cron.sql`). Die roept `public.trigger_worker()` aan, die met `pg_net` een
  HTTP-verzoek doet naar `/api/cron/worker` op de site, met `Authorization: Bearer <CRON_SECRET>`. De site-URL
  en het geheim staan als Supabase Vault-geheimen (`geo_site_url`, `geo_cron_secret`). Zijn ze niet gezet,
  dan gebeurt er zonder foutmelding niets. De route (`app/api/cron/worker/route.ts`, `maxDuration = 300`)
  controleert het geheim en draait `runWorker()` (`lib/jobs/worker.ts`). (Tot 30 september 2026 draaide
  de route eerst nog de geplande hermetingen van de Sales-module; die is verwijderd.)
- **Hoe `runWorker()` werkt.**
  1. `reclaim_stuck_jobs(5)` zet taken die langer dan 5 minuten op `running` staan terug in de rij (een
     vorige werker-aanroep is dan kennelijk afgekapt).
  2. Een lus roept `claim_jobs(5)` aan (een RPC die per aanroep hooguit 5 taken atomair op `running` zet)
     zolang er tijd over is. Het tijdbudget is `WORKER_TIME_BUDGET_MS`, standaard 240.000 ms.
  3. De taken van één claim worden in klassen verdeeld (`lib/jobs/types.ts`): **lichte** taken draaien
     parallel; **zware** taken (`HEAVY_JOB_TYPES`) draaien alleen als er nog genoeg tijd over is (een
     reserve van 200 seconden, gebaseerd op de 150 seconden die één AI-aanroep mag duren); **I/O-gebonden
     zware** taken (de reputatiestappen) draaien met 3 tegelijk; **contenttaken** (`pagina_brief`,
     `pagina_schrijven`, `pagina_controle`, `pagina_herschrijven`) draaien met 3 tegelijk
     (`CONTENT_PARALLELISM`). Past een taak niet meer in het budget, dan gaat hij terug in de rij
     (`releaseJob`).
  4. Een taak van een gearchiveerd merk of gearchiveerde analyse wordt zonder werk op `done` gezet.
  5. Na een geslaagde taak zet `markDone()` de status op `done`, met drie pogingen. Lukt dat niet, dan pakt de
     wachtrij de taak later opnieuw op en wordt het werk dubbel gedaan; dat wordt luid gelogd.
- **Waarom.** Zie 0.1. De tijdreserves voorkomen dat een taak halverwege wordt afgekapt door de
  functiegrens van Vercel.
- **Code.** `lib/jobs/worker.ts`, `app/api/cron/worker/route.ts`, `supabase/migrations/0015_*.sql`.

### 0.3 Opnieuw proberen en definitief mislukken

- **Wat.** Een mislukte taak krijgt vier pogingen.
- **Techniek.** `handleFailure()` in `lib/jobs/worker.ts`. `MAX_ATTEMPTS = 4`. Bij een fout onder het maximum
  zet de werker de taak terug op `queued` met `scheduled_for = nu + backoffMinutes(attempts)`, waarbij
  `backoffMinutes = min(2^attempts, 16)`: 2, 4 en 8 minuten tussen de pogingen. Daaronder zit nog de retry van
  de OpenAI-client zelf (`maxRetries = 3`, seconde-schaal).
- **Bij de vierde fout** (definitief mislukt):
  1. status `failed` met `last_error`;
  2. voor de **blokkerende** taaksoorten (`profile_research`, `prepare_analysis`, `generate_prompts`,
     `aggregate_week`, `generate_report`) gaat het profiel of de analyse zelf op `mislukt`. Andere taken
     laten de status ongemoeid: een mislukte contentpagina mag een klant zijn rapport niet afpakken;
  3. een bijbehorende plan-pagina gaat op `mislukt`;
  4. `scheduleFollowUpAfterFailure()` (`lib/jobs/handlers.ts`) plant het vervolg toch in, zodat een keten niet
     halverwege stilvalt: de opvolger uit `ONBOARDING_NEXT` (`lib/jobs/chain.ts`), of bij contenttaken een
     eigen opgeefroutine (`briefGafOp`, `schrijvenGafOp`, `controleGafOp`, `herschrijvenGafOp`), of bij een
     reputatiestap de synthese over wat er wél gemeten is.
- **Waarom.** Vier pogingen met oplopende wachttijd overbruggen een storing van ruim een kwartier zonder
  dat de klant iets merkt. Doorzetten na opgeven voorkomt dat één falende stap een hele keten onzichtbaar
  afkapt (een fout die op 18 augustus 2026 is gevonden en toen is gerepareerd, zie de toelichting in
  `lib/jobs/chain.ts`).
- **Let op, afgeleid uit de code.** `profile_discover` staat niet in `ONBOARDING_NEXT` en niet in de lijst
  blokkerende taken. Geeft die stap definitief op, dan plant niets `profile_research` in en blijft het merk
  op `bezig` staan. Zie bijlage H.

### 0.4 De AI-laag

- **Wat.** Eén ingang voor alle AI-aanroepen: `callStructured`, `callPlain` en de achtergrondvariant
  (`startStructuredAchtergrond`, `haalStructuredOp`), allemaal in `lib/openai/structured.ts`.
- **Techniek.**
  - Aanroep via `openai.responses.parse` met `text.format = zodTextFormat(schema, naam)`: het model levert
    JSON die tegen het Zod-schema wordt gevalideerd. Web-zoeken staat per aanroep aan of uit
    (`tools: [{ type: "web_search_preview" }]`).
  - Elke aanroep heeft een harde tijdgrens (`CALL_BUDGET_MS = 150.000`, via `AbortSignal.timeout`) en de
    client een eigen timeout van 145 seconden en 3 automatische herhalingen (`lib/openai/client.ts`).
  - **Soort werk bepaalt de instellingen** (`lib/openai/sampling.ts`):

    | Soort werk | Temperatuur | Denkinspanning (reasoning effort) |
    |---|---|---|
    | `deterministic` | 0 | geen |
    | `analytical` | 0,2 | laag |
    | `creative` | 0,8 | geen |
    | `content` | 0,7 | middel |
    | `judging` | niet gezet | middel |
    | `redactioneel` | niet gezet | hoog |
    | `simulation` | niet gezet | niet gezet |

    Voor redeneermodellen (`gpt-5`, `gpt-6` en verder, `o1` enzovoort) wordt de temperatuur alleen
    meegestuurd als de denkinspanning "geen" is. Weigert de API de temperatuur, dan probeert de code het
    één keer zonder en onthoudt dat voor de rest van het proces.
  - **Achtergrondmodus voor het schrijven.** Een schrijfaanroep kan 3 tot 6 minuten duren, en een taak
    mag er hooguit 5. De app start de aanroep, bewaart meteen het `responseId` in de payload van de taak,
    plant een ophaaltaak met oplopende vertraging in (`ophaalVertragingSeconden`, maximaal
    `MAX_OPHAALPOGINGEN` rondes), en haalt het resultaat later op. Breekt OpenAI de aanroep af, dan mag hij
    één keer opnieuw (`MAX_HERSTARTS = 1`).
  - **Kostenboekhouding.** `logAiCall()` (`lib/openai/ledger.ts`) schrijft een rij in `ai_calls` met
    `kind`, `model`, tokens, `cost_usd`, `openai_response_id`, `raw_json`, `input_json`, `prompt_hash`,
    `duration_ms` en de koppelingen (`profile_id`, `analysis_id`, `content_piece_id`, `engine` enzovoort).
    Een mislukte parse wordt ook gelogd, met kosten 0 en de foutmelding in `raw_json`. Een fout in het
    loggen zelf breekt de aanroep niet.
  - **Tarieven** (`lib/openai/pricing.ts`, geldig gecontroleerd op 2026-09-23): Luna 0,10 dollar per miljoen
    invoertokens en 0,50 per miljoen uitvoertokens; Sol 2,00 en 10,00. Een zoekopdracht kost 0,01 dollar per
    aanroep voor redeneermodellen. Onbekende modellen vallen terug op een duur tarief (5 en 30), zodat een
    vergeten model de kosten niet onderschat.
  - **Teststub.** `__setTestTransport()` laat de tests de AI vervangen; de functie weigert in productie.
- **Waarom.** Eén ingang maakt het mogelijk om overal dezelfde regels af te dwingen: schema, tijdgrens,
  kostenregistratie, ruwe uitvoer bewaren.
- **Code.** `lib/openai/structured.ts`, `client.ts`, `sampling.ts`, `models.ts`, `ledger.ts`, `pricing.ts`,
  `achtergrond.ts`.

### 0.5 Kostenbewaking

- **Wat.** Drie remmen tegen doorlopende kosten.
- **Techniek.**
  1. **Wie mag betaald werk starten.** `STAFF_ONLY_ACTIONS` (`lib/cost-rules.ts`) bevat zeven handelingen:
     `merk_onderzoeken`, `analyse_starten`, `meting_starten`, `content_schrijven`, `plan_goedkeuren`,
     `reputatie_starten`, `clusters_aanvullen`. `mayTriggerCost(userId, actie)` (`lib/cost-guard.ts`) staat
     die alleen een beheerder toe. Een klant die de route toch aanroept krijgt 403 met een uitnodigende
     melding (`COST_DENIED`).
  2. **Dagplafond.** `checkBudget()` en `checkBudgetForProfile()` (`lib/spend-limit.ts`,
     `lib/spend-rules.ts`) tellen de kosten van vandaag uit `ai_calls`. Standaard 20 euro per account
     (`DAILY_BUDGET_PER_ACCOUNT_EUR`, per account te overschrijven via `daily_budget_eur`, migratie 0089) en 50
     euro over alle accounts samen (`DAILY_BUDGET_EUR`). Omrekenkoers vast op 1,08 dollar per euro. Een vol
     plafond geeft HTTP 402 met een uitleg; de teller gaat om 00:00 uur naar nul.
  3. **Plafond per merk voor het onderzoek.** `profiles.onboarding_budget_usd` staat standaard op 2,15 dollar
     (migratie 0039). `remainingBudgetUsd()` (`lib/pipeline/onboarding-budget.ts`) telt alle `ai_calls` van het
     merk. De duurste onderzoeksstappen kijken daar vooraf naar: de kennistest slaat een engine over bij
     minder dan 0,10 dollar budget, en de samenvatting valt terug op het goedkope model als er minder dan
     0,25 dollar over is. Faalt de telling, dan geldt "geen budget" en niet "onbeperkt".
- **Waarom.** Op productie is aangetoond dat een ingelogde klant zelf in één middag dollars kon uitgeven
  (herstelplan T4, 2 september 2026). De volgorde van de onderzoekstaken is bewust ook de prioritering:
  wat het duurst is staat laatst, zodat het als eerste sneuvelt als het budget op is.
- **Code.** `lib/cost-rules.ts`, `lib/cost-guard.ts`, `lib/spend-limit.ts`, `lib/spend-rules.ts`,
  `lib/pipeline/onboarding-budget.ts`.

### 0.6 De afspraken die overal terugkomen

Uit `CLAUDE.md` (conventies) en zichtbaar in de code:

1. **Harde feiten krijgen een vangnet in code.** Een instructie over bedragen, getallen, termijnen,
   garanties of keurmerken wordt nooit alleen aan het model overgelaten. Een instructie over stijl, toon of
   lengte krijgt dat bewust niet.
2. **Rekenkunde staat in pure modules** zonder `server-only`, testbaar vanuit `scripts/test-unit.ts`.
3. **Onbekend is beter dan verkeerd.** Onbruikbare modeluitvoer wordt `null`, nooit 0 en nooit een gok.
4. **Eén taak is hooguit één zware AI-aanroep.** Een nieuwe zware stap wordt een eigen taaksoort.
5. **Elke stap controleert eerst of zijn resultaat al bestaat** vóór een dure aanroep, zodat een herhaling
   nooit twee keer betaalt.
6. **Schrijven loopt nooit rechtstreeks vanaf de client**, altijd via een API-route met service-role en
   eigenaarscontrole.

---

# Deel III. De pijplijn, hoofdstap voor hoofdstap

## Hoofdstap 1. Inloggen, accounts en rechten

*Wie: beheerder, consultant, klant. Kost: niets.*

**Doel van de hoofdstap.** Vastleggen wie de app in mag, wat een gebruiker mag zien en wat hij mag doen. De
hele rest van de pijplijn leunt op deze laag: elke route controleert de eigenaar, en de kostenremmen (0.5)
gebruiken de beheerdersrol.

### 1.1 Het model: gebruiker, account, merk, beheerder

- **Wat.** Vier begrippen: een **gebruiker** (`auth.users`), een **account** (de laag boven het merk, de
  klant of het bureau), een **merk** (`profiles`, één bedrijf met één website) en een **beheerder** van
  Outer Orbit.
- **Techniek.** `accounts` (migratie 0046) met naam, facturatiegegevens, contactpersoon, `package_pages_per_month`,
  `started_at`, `cancelled_at`. `account_users` koppelt een gebruiker aan een account met rol `admin` of
  `member`, zodat een marketingbureau meerdere klanten kan hebben en een klant meerdere websites. `staff_users`
  bevat de beheerders. Een merk hangt aan een account via `profiles.account_id`.
- **Toegangsregel, drie lagen** (`lib/accounts.ts`): (1) je zit in het account waar het merk aan hangt (de
  hoofdregel), (2) je bent de historische eigenaar (`profiles.user_id`), (3) je bent beheerder (`isStaff`).
  Laag 2 blijft bewust bestaan tot op productie is nagerekend dat elk merk een account heeft.
- **Waarom.** Drie besluiten van 10 augustus 2026: een klant kan een bureau zijn, een klant kan meerdere
  websites hebben, en er komen ongeveer twintig accounts in het eerste jaar.
- **Code.** `lib/accounts.ts`, `lib/staff.ts`, `lib/profiles.ts` (`getOwnedProfile`), `supabase/migrations/0046_accounts.sql`.

### 1.2 Een gebruiker krijgt een inlog

- **Wat.** Zelf registreren kan niet in productie. Een gebruiker ontstaat op twee manieren: de eigenaar maakt
  hem aan in het Supabase-dashboard (de eerste consultant), of de gebruiker accepteert een uitnodiging
  (stap 6.2).
- **Techniek.** De registratiepagina (`app/(auth)/register/page.tsx`) stuurt terug naar het inlogscherm
  tenzij `SIGNUPS_ENABLED === "true"` (`lib/config.ts`, standaard uit). Staat het aan, dan roept de serveractie
  `signUp` (`app/(auth)/actions.ts`) `supabase.auth.signUp` aan met een wachtwoord van minstens 8 tekens.
  Een beheerder is een rij in `staff_users` die de eigenaar in de database zet (er is geen scherm voor).
- **Data in.** E-mailadres en wachtwoord.
- **Data uit.** Een rij in `auth.users`.
- **Waarom.** ORBIT ENGINE is op uitnodiging: de verkoop loopt via een consultant.

### 1.3 Inloggen en sessie

- **Wat.** Inloggen met e-mail en wachtwoord, sessie in cookies, automatisch verversen.
- **Techniek.**
  1. `signIn` (`app/(auth)/actions.ts`) doet eerst twee rate-limit-tellingen via `hitRateLimit`
     (`lib/rate-limit.ts`, database-functie `rate_limit_hit`): maximaal 10 pogingen per e-mailadres en 60 per IP-adres per
     15 minuten. Het IP komt uit `x-forwarded-for`. Twee tellers omdat ze twee aanvallen vangen: één account
     bestoken, of vanaf één plek veel accounts afgaan.
  2. `supabase.auth.signInWithPassword`. Bij een fout één neutrale melding.
  3. De **middleware** (`middleware.ts`, `lib/supabase/middleware.ts`) draait op elke pagina (niet op
     `_next`, afbeeldingen en `api/`), ververst het sessietoken, stuurt een bezoeker zonder sessie van een
     beschermde pagina naar het inlogscherm, en zet twee requestheaders: `x-apparaat` (telefoon of computer,
     uit de user-agent) en `x-pad` (het volledige pad, voor servercomponenten).
  4. **API-routes vallen buiten de middleware** en doen elk hun eigen controle via `getUser()`
     (`lib/auth.ts`) of, voor de cron-routes, via het geheim. Reden (28 augustus 2026): de middleware kostte een
     volledige netwerkronde naar Supabase Auth in elke klik. Twee routes zijn bewust publiek: `health` en
     `invites/accept`.
- **Data uit.** Een sessiecookie; geen eigen sessietabel.
- **Wachtwoord vergeten.** `requestPasswordReset` loopt via Supabase Auth zelf (staat los van
  `EMAILS_ENABLED`); de herstelpagina's staan onder `app/(auth)/wachtwoord*` en `app/auth/wachtwoord`.
- **Code.** `app/(auth)/actions.ts`, `middleware.ts`, `lib/supabase/`, `lib/auth.ts`, `lib/rate-limit.ts`.

### 1.4 Wie is beheerder, en de klantweergave

- **Wat.** Een beheerder mag alles wat de consultant doet. Hij kan tijdelijk meekijken als klant.
- **Techniek.** `isStaffAccount(userId)` leest `staff_users` (het echte recht). `isStaff(userId)` combineert dat
  met de cookie `orbit_engine_klantweergave`: de cookie kan een echte beheerder tijdelijk als klant laten
  lezen, nooit een klant als beheerder. Buiten een echt verzoek (taken, scripts) geeft `isStaff` het echte
  recht. Alle ownership- en kostenchecks gebruiken `isStaff`.
- **Waarom.** De consultant moet kunnen controleren wat de klant ziet zonder in te loggen als de klant.
- **Code.** `lib/staff.ts`.

### 1.5 Een consultant krijgt een eigen account

- **Wat.** Een merk moet altijd aan een account hangen. Heeft de consultant er nog geen, dan ontstaat er een.
- **Techniek.** `defaultAccountFor(userId)` (`lib/accounts.ts`): heeft de gebruiker al een lidmaatschap, dan
  het oudste account. Anders wordt een `accounts`-rij gemaakt met de naam gelijk aan het e-mailadres, en een
  `account_users`-rij met rol `admin`. Faalt het aanmaken, dan volgt `null` en valt een merk terug op laag 2.
- **Waarom.** Zonder account vindt het contentplan geen pakket en ziet een uitgenodigde klant het merk niet.
- **Code.** `lib/accounts.ts`.

### 1.6 Elke schrijfroute controleert de eigenaar

- **Wat.** Elke route die iets wijzigt, controleert eerst wie de aanroeper is en of hij erbij mag.
- **Techniek.** `getUser()` (401 bij geen sessie), dan `getOwnedProfile(admin, id, userId)`,
  `getOwnedAnalysis(...)` of een expliciete stap-voor-stap controle (bijvoorbeeld bij uitnodigen: ingelogd,
  lid van dit account, juiste rol, nooit één samengestelde voorwaarde). Bij "niet gevonden" geeft de route 404
  en niet 403, zodat het bestaan van andermans gegevens niet lekt. Daarna schrijft de route met de
  service-role client (`createAdminClient()`).
- **Waarom.** RLS is SELECT-only (zie deel I §4); de applicatielaag is de enige schrijfpoort.
- **Code.** `lib/profiles.ts`, `lib/analyses.ts`, `lib/supabase/admin.ts`.

---

## Hoofdstap 2. Een merk aanmaken

*Wie: de consultant. Waar: "+ Nieuw merk" (`/merk/nieuw`). Kost: niets direct, start wel het betaalde
onderzoek van hoofdstap 3.*

**Doel van de hoofdstap.** Met zo min mogelijk invoer een merk vastleggen, zodat de pijplijn het onderzoek kan
doen vóór er een gesprek met de klant is.

### 2.1 De consultant vult drie velden in

- **Wat.** Bedrijfsnaam (verplicht), website (verplicht) en andere schrijfwijzen van de naam (optioneel).
- **Techniek.** `app/(app)/merk/nieuw/onboarding-wizard.tsx` stuurt `POST /api/profiles` met een JSON-body
  (`name`, `url`, `aliases` en `force`). De route accepteert meer velden (branche, producten, concurrenten,
  werkgebied, taal, omschrijving, doelgroep), maar de wizard toont alleen de drie hierboven.
- **Waarom.** De naamvarianten zijn belangrijk voor de meting (hoofdstap 8): een ontbrekende schrijfwijze
  geeft een te lage score, omdat de beoordeling alleen bekende namen telt.

### 2.2 Toegang, budget en invoer worden gecontroleerd

- **Techniek.** In deze volgorde in `app/api/profiles/route.ts`:
  1. `getUser()` (401);
  2. `mayTriggerCost(user.id, "merk_onderzoeken")` (403 voor een niet-beheerder);
  3. `checkBudget(null)` (402 als het dagplafond van alle accounts samen op is; er is nog geen merk, dus
     alleen dat plafond);
  4. `checkUrlFormat(url)` (400 met melding bij het veld);
  5. `isReachable(url)` met een timeout van 6 seconden. Is de site niet bereikbaar, dan geeft de route 400
     met `canForce: true`; de consultant kan met `force` doorgaan, want sommige sites weren automatische
     bezoekers.
- **Waarom.** Liever nu weten dat een site onbereikbaar is dan minuten later via een mislukt profiel.

### 2.3 Het merk wordt opgeslagen

- **Wat.** Een rij in `profiles`, eerst op het account van de consultant. De klant ziet het nog niet.
- **Techniek.**
  1. `accountId = defaultAccountFor(user.id)` (zie 1.5).
  2. Het pakket wordt hier bewust niet gezet (besluit A5): het staat op het klantaccount en bestaat pas na
     de toewijzing (hoofdstap 6). Tot 31 augustus 2026 schreef deze route het pakket per ongeluk naar het
     account van de consultant.
  3. `resolveScope()` (`lib/pipeline/field-merge.ts`) normaliseert bereik en plaatsen: ontdubbelen, en
     "lokaal" zonder plaats wordt `null`, want dat is een half antwoord waar de meetvragen niets mee kunnen.
  4. Insert in `profiles`: `user_id`, `account_id`, `url`, `name`, `status = 'bezig'`.
  5. `slaProfielOp()` (`lib/kennis/uit-gesprek.ts`) legt de ingetypte velden vast in de kennislaag (hoofdstap 4)
     met bron `consultant`. Een fout hier geeft geen 500: het merk staat er al en een tweede poging zou op
     het webadres botsen.
  6. Voor elk ingevuld veld een rij in `profile_field_sources` met `source = 'consultant'`, `confidence = 1`,
     `set_by`. `name` valt terug op het webadres als er niets is getypt; zo'n terugval telt niet als aanname.
- **Data uit.** `profiles`, `profile_field_sources`, kennisitems.
- **Waarom.** Wat een mens invult krijgt het label "ingevuld door de consultant" en is beschermd: het
  onderzoek mag het tegenspreken maar nooit stilletjes overschrijven (`filterProtectedFields`, zie 3.5).

### 2.4 De eerste onderzoekstaak wordt klaargezet

- **Techniek.** `enqueue` van `profile_light_scan` met `{ round: 0 }` en `dedupe.profileLightScan(id, 0)`. De
  route antwoordt `201 { id }`. Het scherm hoeft niet te wachten.
- **Waarom.** Het onderzoek hangt aan de wachtrij, niet aan een openstaande browsertab.

**Uitkomst van hoofdstap 2:** een `profiles`-rij op `bezig`, herkomstregels, kennisitems, en één taak in de
wachtrij. De merkfase (`lib/profile-stage.ts`) is "Voorbereiden".

---
## Hoofdstap 3. Het automatische merkonderzoek

*Wie: niemand, het loopt vanzelf na hoofdstap 2. Duur: volgens de projectdocumentatie tot ongeveer 10 minuten
vooronderzoek en daarna ongeveer 7,5 minuut. Kost: richtwaarde 25 dollarcent, met een harde bovengrens van
2,15 dollar per merk (0.5).*

**Doel van de hoofdstap.** Vóór het eerste gesprek weten wie het bedrijf is, wat het aanbiedt, wie de
concurrenten zijn en wat AI-assistenten er al over weten. De consultant verkoopt op wat de app gevonden heeft
en weet welke vragen hij in het gesprek moet stellen.

### 3.0 De volgorde van de taken

Elke taak plant zijn opvolger zelf in. De keten (`lib/jobs/handlers.ts`, `lib/jobs/chain.ts`):

```
profile_light_scan (rondes, tot 5)
   └▶ profile_discover ─┬▶ profile_research ──▶ profile_offering ─┬▶ profile_market ──▶ profile_llm_baseline ──▶ profile_synthesis
                        │                                         └▶ propose_topics (alleen als de aanbodboom knopen heeft)
                        ├▶ technical_audit
                        └▶ crawl_inventory (aanvulronde, alleen bij een trage site)
```

`ONBOARDING_NEXT` in `lib/jobs/chain.ts` legt vast welke stap welke opvolger heeft (`profile_light_scan` naar
`profile_discover`, `profile_offering` naar `profile_market`, `profile_market` naar `profile_llm_baseline`,
`profile_llm_baseline` naar `profile_synthesis`). Dezelfde tabel wordt gebruikt als een stap definitief
mislukt (0.3). `propose_topics` staat er bewust niet in: onderwerpen voorstellen zonder aanbodboom levert
generieke onderwerpen op die niet over deze klant gaan. `profile_research` is bewust blokkerend: mislukt hij,
dan gaat het profiel op `mislukt` en komt er niets meer achteraan.

Een taak met `payload.chain === false` doet zijn werk maar plant zijn opvolger niet in. Dat gebruikt
"onderzoek bijwerken" (hoofdstap 5) om één stap te herhalen zonder de duurste stappen mee te slepen.

### 3.1 Vooronderzoek: titel en omschrijving van tot 1.000 pagina's

- **Wat.** De app bekijkt van tot 1.000 pagina's alleen de titel en de korte omschrijving.
- **Techniek.** Taak `profile_light_scan`, functie `runLightScanTick()` (`lib/pipeline/light-scan.ts`).
  1. `collectPageUrls(profile.url, profile.sitemap_url)` (`lib/crawler.ts`) verzamelt adressen: `robots.txt`
     wordt alleen gelezen voor `Sitemap:`-regels, plus de standaardlocaties, met recursie door sitemap-indexen
     (maximaal 50 sitemaps, maximaal 10.000 adressen). Zonder sitemap volgt de code links vanaf de homepage.
  2. `selectUrls()` (`lib/pipeline/url-priority.ts`) kiest maximaal `MAX_PREONBOARDING_LIGHT_PAGES = 1000`
     adressen, met voorrang voor eventuele handmatige voorrangspaden (`profiles.crawl_priority_paths`).
  3. `crawlHeads()` leest per adres alleen het begin van de pagina (maximaal 32.000 tekens, timeout 8
     seconden) en haalt `<title>` en `meta description` (of `og:description`) eruit. Het tempo volgt
     `profiles.crawl_speed`; `crawl_as_browser` bepaalt of de crawler zich als browser voordoet. Standaard
     identificeert hij zich als `GEO-Tracker-Bot/1.0`.
  4. Upsert in `profile_page_signals` (`profile_id`, `url`, `title`, `description`), in blokken van 100.
  5. Een tick heeft een budget van 150 seconden. Is niet alles gescand, dan plant de taak zichzelf opnieuw in
     met `round + 1`, tot `MAX_LIGHT_SCAN_ROUNDS = 5`. Daarna (of zodra alles gescand is) volgt
     `profile_discover`.
- **Data in.** Alleen de website en instellingen op het merk.
- **Data uit.** `profile_page_signals`. Geen AI, dus geen kosten.
- **Waarom.** De volgende stap leest maar 150 pagina's helemaal. Een site kan er duizenden hebben. Met titel en
  omschrijving kan de keuze van die 150 op inhoud gebeuren in plaats van alleen op het URL-pad
  (migratie 0102).
- **Bij fouten.** Mislukt het vooronderzoek definitief, dan kiest `profile_discover` gewoon op URL-pad alleen.
  Het is verrijking, geen voorwaarde.

### 3.2 De site uitlezen (tot 150 pagina's)

- **Wat.** De tekst van de site wordt binnengehaald als grondstof voor alles daarna.
- **Techniek.** Taak `profile_discover`, functie `discoverSite()` (`lib/pipeline/discover.ts`).
  1. Adressen verzamelen (zoals 3.1). Zijn er meer dan `MAX_PAGES_HARD_CAP = 150` en zijn er geen handmatige
     voorrangspaden, dan doet `chooseCrawlFocus()` (`lib/pipeline/crawl-focus.ts`) één AI-aanroep (kind
     `crawl_focus`, Luna, `analytical`, zonder zoeken) die uit de sitestructuur (tot 40 secties, per sectie het
     aantal pagina's) hooguit 8 voorrangssecties kiest. De keuze wordt op het merk bewaard
     (`crawl_priority_paths`).
  2. `selectUrls()` verdeelt de 150 plaatsen eerlijk over de secties van de site, met de signalen uit 3.1, en
     `metMenuVoorrang()` geeft pagina's uit het hoofdmenu voorrang.
  3. `crawlPages()` leest in batches van 8 parallel (per pagina een timeout van 25 seconden, totaal budget
     180 seconden, minimaal 60 seconden voor het lezen zelf). Per pagina wordt de zichtbare tekst gehaald
     (`stripChrome` verwijdert `<nav>`, `<header>` en `<footer>`), afgekapt op 4.000 tekens
     (`PAGE_MAX_CHARS`), met `harvest: true`: structured data (JSON-LD, schema.org, OpenGraph), namen,
     `sameAs`-links en tekstfeiten (telefoon, adres, e-mail, KvK-nummer).
  4. Ook per pagina: of de tekst zonder JavaScript leesbaar is (`rendering.likelyClientRendered`) en een
     sjabloonherkenning (welk CMS, hoe een FAQ wordt getoond, `template-detect.ts`).
  5. `assessInventory()` (`inventory-quality.ts`) beoordeelt de dekking.
  6. Opslaan: `replaceCrawledPages()` verwijdert alleen de eerder gecrawlde pagina's (`source = 'crawl'`) en
     laat handmatig toegevoegde staan; `profile_facets` krijgt de facetten `techniek` (schema-typen, namen,
     feiten, `sameAs`) en `sjabloon`; `profiles` krijgt `inventory_quality_json`, `sitemap_total_urls` en
     `crawl_priority_paths`.
  7. Pagina's die door een timeout niet gelezen zijn (`traagNietGelezen`) worden in een aanvulronde
     (`crawl_inventory`, tempo "langzaam", tot `MAX_AANVULRONDES = 4` rondes) rustig nagelezen.
  8. `profile_discover` plant daarna `profile_research` en `technical_audit` in.
- **Data in.** `profile_page_signals`, de site.
- **Data uit.** `profile_pages` (url, titel, `text_excerpt`), `profile_facets` (`techniek`, `sjabloon`),
  `profiles.inventory_quality_json`.
- **Waarom.** Alles daarna (profiel, aanbod, feiten, stem) leest deze pagina's. Het onderzoek start pas ná de
  crawl, niet parallel: eerder startte de inventaris naast de AI-aanroep en kwamen die 60 pagina's het
  onderzoek nooit in.
- **Let op.** De eigen crawler leest `robots.txt` alleen voor sitemapregels en houdt geen rekening met
  `Disallow`-regels (afgeleid uit `lib/crawler.ts`; alleen de technische audit in 3.3 leest `robots.txt` als
  regelbestand, om te beoordelen of AI-crawlers de site mogen bezoeken).

### 3.3 De technische audit

- **Wat.** Kunnen AI-assistenten de site überhaupt lezen?
- **Techniek.** Taak `technical_audit` (`lib/audit/store.ts`, `runAuditForProfile`; de controles in
  `lib/audit/technical.ts`). Een pure functie van een host naar een uitslag: `robots.txt`, homepage en
  `llms.txt` worden parallel opgehaald. Controles (id in de code): `crawler.*` (mogen de crawlers van
  AI-bedrijven de site bezoeken, met de impact per crawler), `llms-txt`, `no-js-content` (een lege schil
  zonder JavaScript is een "blocker"), `structured-data`, `sitemap`, `bing-index` (Bing is voor ChatGPT-zoeken
  een bron). Daarbij komt `entityConsistencyChecks` (is de naam overal hetzelfde, `lib/audit/entity-consistency.ts`).
  Elke controle krijgt een ernst: `ok`, `warning`, `blocker` of `unknown`. Een controle die niet uitgevoerd kan
  worden komt als `unknown` terug, zodat een audit nooit crasht op een site die even plat lag.
- **Data uit.** Tabel `technical_audits`. De blokkade-poort (`lib/audit/gate.ts`) leest de laatste audit en
  zoekt uit sinds wanneer een blokkade er onafgebroken staat.
- **Waarom.** Een site die AI-crawlers weert of alleen met JavaScript inhoud toont, maakt alle content
  nutteloos. De audit draait ook maandelijks opnieuw (hoofdstap 18).

### 3.4 Het bedrijf leren kennen (het profiel)

- **Wat.** De basis van het merkprofiel: branche, kernaanbod, toon, doelgroepen, waardeproposities,
  concurrenten, bedrijfsmodel, bereik en werkgebied.
- **Techniek.** Taak `profile_research`, functie `prepareProfile()` (`lib/pipeline/prepare-profile.ts`).
  1. Is `profiles.status` al `klaar`, dan stopt de functie (idempotent).
  2. De sitetekst wordt opgebouwd uit `profile_pages`: pagina's gesorteerd op lengte (langste eerst) tot een
     budget van 60.000 tekens (`MAX_SITE_CHARS`). Zijn er geen pagina's, dan valt de code terug op
     `crawlSite(url)`. De feiten uit de structured data (maximaal 30) worden erachter gezet met de opdracht ze
     niet tegen te spreken.
  3. De herkomst per veld wordt geladen uit `profile_field_sources` en als "aanname van vóór het gesprek"
     meegegeven (`buildIntakeBlock`).
  4. **AI-aanroep** (`generateProfileResearch`, kind `profile_research`): Luna, `analytical`, **met**
     web-zoeken (tenzij `WEB_SEARCH_ENABLED=false`). Opdracht in het kort: "Je bent een merk- en
     marktanalist." Bepaal branche, kernaanbod, toon, doelgroepen, waardeproposities en 3 tot 5 concurrenten
     van het hele bedrijf, de merknaam zoals klanten die kennen (niet het domein), het bedrijfsmodel
     (retailer, platform, dienstverlener, fabrikant, overig), het bereik (lokaal, landelijk, internationaal,
     onbekend) met plaatsen, harde feiten die letterlijk op de site staan, en twee of drie voorbeeldzinnen
     van de merkstem. Bij tien of meer pagina's mag het model concluderen dat wat ontbreekt waarschijnlijk niet
     wordt aangeboden; bij minder pagina's niet. Weet het model het werkgebied niet, dan moet het "onbekend"
     kiezen: "een beter antwoord dan een gok". Het werkgebied hoort in **plaatsen** te staan zoals een klant
     ze uitspreekt, niet in streken; noemt de site alleen een streek, dan de plaatsen die de site daarbinnen
     noemt, en anders de streek zelf (besluit V10, 29 september 2026: bij één merk stonden er alleen streken,
     en noemden alle 90 meetvragen een streek in plaats van een dorp).
  5. **Samenvoegen in code.** `filterProtectedFields()` (`lib/pipeline/field-merge.ts`) laat een veld dat een
     mens zette staan; het model wint nooit van een mens. Lijstvelden (producten, concurrenten) worden
     samengevoegd zonder dubbelen; waardeproposities gaan door `schoneWaardeproposities()`. Plaatsnamen worden
     ontdubbeld (`resolveScope`).
  6. Opslaan via `legOnderzoeksveldenVast()` (kennislaag, hoofdstap 4) met `raw_json` (de volledige ruwe
     uitvoer), `deep_research_at`, `status = 'klaar'`, `velden_te_verversen = []`.
- **Data in.** Sitetekst (60.000 tekens), feiten uit structured data, herkomst per veld.
- **Data uit.** De profielvelden op `profiles` en de bijbehorende kennisitems.
- **Waarom.** Dit is de enige onderzoeksstap die de keten stopt als hij mislukt: alles daarna bouwt erop.
- **Bij fouten.** Een fout zet het profiel op `mislukt` en gooit de fout door (vier pogingen, 0.3).
- **Code.** `lib/pipeline/prepare-profile.ts`, `profile-research.ts`, `field-merge.ts`, `intake-block.ts`.

### 3.5 Het aanbod als boom

- **Wat.** Precies weten wat het bedrijf levert, als boom van diensten, producten, categorieën, gevoerde
  merken en vestigingen, elk met een bronpagina en een citaat.
- **Techniek.** Taak `profile_offering`, functie `buildOfferingTree()` (`lib/pipeline/offering.ts`).
  1. Bestaat er al een door AI gebouwde boom (`source = 'ai'`), dan doet de functie niets (idempotent). Zijn er
     geen pagina's, dan komt er alleen een open punt.
  2. `buildPageBlocks()` (`lib/pipeline/page-select.ts`) stelt een invoer samen van maximaal 250.000
     tekens (`MAX_SITE_CHARS`), eerlijk verdeeld over de secties van de site, met de sitestructuur uit de
     sitemap (`buildTaxonomy`, de 15 grootste secties).
  3. **AI-aanroep** (kind `profile_offering`): Luna, `analytical`, **zonder** web-zoeken, bewust: anders neemt
     het model aanbod van concurrenten over. Opdracht: breng alles in kaart wat het bedrijf aanbiedt als boom
     (elke dienst een knoop, elk product of productgroep, gevoerde merken, vestigingen; wees fijnmazig,
     maar noem geen losse artikelen). Harde regels: elke knoop heeft een `evidenceUrl` uit de meegegeven
     pagina's en een `evidenceQuote` die letterlijk op die pagina staat; verzin geen aanbod; laat doelgroep en
     prijs leeg als de site er niets over zegt; zet in `gaps` wat je niet kon vaststellen; een advies of tip
     op de site is geen dienst. Een korte hint per bedrijfsmodel stuurt alleen de nadruk (`modelContext`):
     elk bedrijf krijgt dezelfde volledige vraag.
  4. **Controle in code** (`persistTree`): een knoop zonder naam vervalt; een knoop waarvan de `evidenceUrl`
     niet bij de gelezen pagina's hoort vervalt; een dienst waarvan het citaat een advies is en geen aanbod
     (`isAdviesCitaat`) vervalt. Het citaat zelf wordt nagelopen met `quoteConfidence()`: staat het
     letterlijk op de bronpagina, dan `confidence = 1`; anders `0,5`. Zo'n knoop blijft dus wel bestaan, met
     lage zekerheid. Maximaal 200 knopen (`MAX_NODES`).
  5. Opslaan met de ouder-kind-structuur (`bewaarAanbodboom`, `hangKnoopOnder` in `lib/kennis/aanbodkopie.ts`),
     het facet `aanbod` (met de ruwe uitvoer) en kennisitems (`kennisUitAanbod`). Wat afviel wordt een open
     punt in `gaps`: de agenda van het gesprek.
  6. `relinkTopics()` herstelt de koppeling van bestaande onderwerpen na een herbouw. Is het bedrijfsmodel nog
     niet gezet, dan neemt de functie het van het model over.
  7. Daarna plant de taak `profile_market` in (tenzij `chain === false`) en, als er knopen zijn,
     `propose_topics`.
- **Data in.** `profile_pages`, sitestructuur, `crawl_priority_paths`.
- **Data uit.** `profile_offerings`, facet `aanbod`, kennisitems.
- **Waarom.** Onderwerpen, meetvragen en aanbevelingen moeten uit het echte aanbod volgen, anders meet en
  schrijft de app over dingen die het bedrijf niet doet. Sinds 28 september 2026 gaat de invoer van 55.000
  naar 250.000 tekens: bij een klant met tientallen diensten vond de eerdere invoer er 11.

### 3.6 Onderwerpen voorstellen

- **Wat.** Vijf tot acht onderwerpen waarop het merk gemeten kan worden. Dit zijn de kandidaten voor de
  clusters van hoofdstap 7.
- **Techniek.** Taak `propose_topics`, functie `proposeTopics()` (`lib/pipeline/propose-topics.ts`).
  1. Bestaan er al onderwerpen, dan stopt de functie, behalve als het gesprek is vastgelegd en er nog
     onbeslist conceptonderwerpen zijn (dan worden die vervangen, zie hieronder).
  2. Zonder aanbodknopen (na filtering op producten die volgens het gesprek stoppen, `discontinuedNames`) doet
     de functie niets: geen algemene onderwerpen verzinnen.
  3. **AI-aanroep** (kind `propose_topics`): Luna, `analytical`, zonder zoeken. Invoer: bedrijfsnaam, branche,
     bedrijfsmodel, werkgebied, de aanbodboom als pad (`categorie › dienst`) met omschrijving, doelgroep en
     prijs, de commerciële sturing uit het gesprek (`topicSteering`) en, na het gesprek, de aantekeningen.
     Opdracht: bepaal 5 tot 8 onderwerpen op het niveau waarop iemand met een probleem zoekt (niet te breed,
     niet te smal), elk aantoonbaar uit het aanbod (de gebruikte aanbodnamen letterlijk teruggeven), zonder
     merknamen, zonder overlap, met een onderbouwing zonder vaktermen.
  4. **Code:** ontdubbelen op titel, maximaal 8, aanbodnamen terugvertalen naar knoop-id's, prioriteit uit de
     volgorde (`topicPrioriteit`). Een eventueel zoekvolume komt alleen mee als de zoekvolumelaag aan staat
     (`keywordVolumes`, `search_volume_source = 'gemeten'`); anders `geschat`.
  5. **Concept en definitief.** Vóór het gesprek is `stage = 'concept'` (met `origin = 'aanbod'`); ná het
     gesprek `stage = 'definitief'` (`origin = 'aanbod_en_gesprek'`). Een conceptonderwerp kan niet worden
     goedgekeurd of gestart (HTTP 409); de consultant moet eerst het gesprek vastleggen (hoofdstap 5).
     Bij vervanging van concepten bewaart de code de oude rijen en zet ze terug als het opslaan van de nieuwe
     mislukt.
- **Data uit.** `profile_topics` (`title`, `rationale`, `offering_ids`, `priority`, `status`, `stage`,
  `origin`).
- **Waarom.** Een cluster moet meetbaar en betekenisvol zijn: te breed meet een hele markt, te smal meet
  niets. De stap zit los van de aanbodstap omdat hij zonder aanbodboom bewust wegvalt.

### 3.7 De markt

- **Wat.** Begrijpen waarom concurrenten winnen en welke externe websites gezag hebben in deze markt.
- **Techniek.** Taak `profile_market`, `researchMarket()` (`lib/pipeline/market.ts`). **AI-aanroep** (kind
  `profile_market`): Luna, `analytical`, **met** web-zoeken. Opdracht: "marktanalist voor een
  GEO-adviesbureau"; per concurrent waarom die wint, concreet en met een vindplaats; de domeinen die in deze
  markt gezaghebbend zijn (vergelijkers, reviewplatforms, vakpers); de positionering van dit bedrijf; "verzin
  geen concurrenten die niet bestaan". Code daarna: eigen namen eruit, ontdubbelen, maximaal 8 concurrenten
  (`MAX_COMPETITORS`) en 10 domeinen (`MAX_DOMAINS`), eigen domein eruit. De concurrentenlijst van het merk
  wordt aangevuld (niet vervangen) via de kennislaag.
- **Data uit.** Facet `markt` (met ruwe uitvoer, `confidence` 0,8 met zoeken en 0,4 zonder),
  `profiles.competitors`.
- **Bij fouten.** Een fout wordt gelogd maar breekt de keten niet af: het marktonderzoek is verrijking, en het
  zou de kennistest en de samenvatting meesleuren.

### 3.8 De kennistest: wat weten AI-assistenten al over dit bedrijf?

- **Wat.** Een reeks korte vragen aan de AI-assistent, zoals een gewone gebruiker ze stelt, om te zien of het
  merk bekend is, of wat de AI zegt klopt, en of het merk genoemd wordt bij koopvragen.
- **Techniek.** Taak `profile_llm_baseline`, `runLlmBaseline()` (`lib/pipeline/llm-baseline.ts`). Per engine
  (standaard alleen `openai`, `profiles.engines_enabled`; Gemini alleen met sleutel) worden de vragen gesteld
  die nog niet in `profile_llm_baseline` staan (idempotent). Vier blokken:
  - **kent** (6 vragen, zonder zoeken): bijvoorbeeld "Wat weet je over {merk} uit {plaats}?" en "Is {merk}
    een bestaand bedrijf?". Meet wat in het model zelf zit. De plaats is `service_regions[0]`: bij een bedrijf
    met meerdere vestigingen meet de test er één.
  - **citeert** (1 vraag, met zoeken): "Zoek informatie over {merk} ({website}) en vertel wat je vindt. Noem
    de bronnen die je gebruikt."
  - **verwarring** (1 vraag, met zoeken): zijn er meer bedrijven of begrippen met deze naam?
  - **categorie** (3 vragen, met zoeken): "Welke aanbieders van {dienst} in {plaats} kun je aanbevelen?", voor
    de drie belangrijkste diensten of producten (eerst die onder de topics met de hoogste prioriteit).
  Systeemopdracht: "behulpzame AI-assistent, zoals ChatGPT, kort en feitelijk". Alle vragen van één engine
  draaien parallel (`Promise.allSettled`); een mislukte vraag telt als overgeslagen.
- **Het oordeel is code, geen model.** `buildVerdict()`, `scoreCategoryAnswer()`, `extractConfusions()`
  (`lib/pipeline/baseline-verdict.ts`): of het merk bekend is, of feiten uit de site (naam, adres, telefoon,
  oprichting, prijsklasse, e-mail, KvK) worden tegengesproken, en of het merk bij een categorievraag wordt
  genoemd. Het model beoordeelt zichzelf niet.
- **Budgetpoort.** Is er minder dan 0,10 dollar onderzoeksbudget over, dan slaat de stap een engine over en
  vermeldt dat.
- **Vervolg.** Uit het verwarringblok worden gelijknamige bedrijven voorgesteld als uitsluitingslijst
  (`name_exclusions`, bron `ai`), alleen als die lijst nog leeg is.
- **Data uit.** `profile_llm_baseline` (vraag, ruw antwoord, `verdict_json`, kosten), facet `llm_kennis`
  (samenvatting), en voorgestelde uitsluitingen.
- **Waarom.** "ChatGPT denkt dat je in Eindhoven zit" is voor een ondernemer de meest overtuigende uitkomst
  van het hele onderzoek, en het is de nulmeting voor wat AI weet vóór er content is.

### 3.9 De samenvatting

- **Wat.** Eén leesbaar dossier voor het gesprek, een lijst citeerbare feiten, de concrete klussen die de
  site zelf beschrijft, en een agenda met wat nog onbekend is.
- **Techniek.** Taak `profile_synthesis`, `synthesiseProfile()` (`lib/pipeline/synthesis.ts`).
  1. Bestaat het facet `synthese` al, dan stopt de functie. Zijn er geen pagina's, dan ook.
  2. Model: Sol (`gpt-6-sol`, `content`) als `SYNTHESIS_PREMIUM` niet uit staat en er nog minstens 0,25 dollar
     onderzoeksbudget is; anders Luna (`analytical`). Het is de enige onderzoeksstap op het sterke model.
  3. Invoer: de samenvattingen van alle facetten, het aanbod (maximaal 60 regels), en de paginatekst
     (maximaal 45.000 tekens, langste pagina's eerst), zonder zoeken.
  4. **AI-aanroep** (kind `profile_synthesis`). Opdracht: lever (1) een dossier van vier tot acht zinnen zonder
     vakjargon, (2) open punten die in dertig seconden te beantwoorden zijn ("niet 'meer over de doelgroep' maar
     'hoeveel behandelkamers zijn er?'"), (3) citeerbare feiten, elk met een `sourceUrl` en een `quote` die
     letterlijk, teken voor teken, op die pagina staat; schrijf de bewering zelf op en niet dat de site hem
     doet; liever tien scherpe dan veertig vage; (4) **klussen** (besluit V9, 29 september 2026): concrete
     klussen of projecten die de site zelf beschrijft (recente werkzaamheden, projecten, cases, een
     nieuwsbericht over een klus), per klus wat er gebeurde, de plaats als die er staat, de pagina en een
     letterlijk citaat; hooguit `MAX_KLUSSEN = 10`; een algemene dienstomschrijving is geen klus.
  5. **Controle in code:** een feit waarvan de bron niet bij de gelezen pagina's hoort, of waarvan het citaat
     niet letterlijk op de pagina staat (`quoteOnPage`, minimaal 12 tekens), vervalt. Maximaal 25 feiten
     (`MAX_FACTS`). Dezelfde regel geldt voor de klussen. De rest gaat het facet `synthese` in, met
     `confidence` gelijk aan het aandeel geldige feiten en het aantal geldige klussen in `raw_json.klussen`.
  6. De geldige feiten gaan via `legOnderzoekVast()` de kennislaag in, als "waargenomen" met citaat. De
     geldige klussen gaan erin als domein `verhaal`, soort `klus`, waargenomen, voor gebruik in content
     (`kennisUitSynthese()`), naast de klussen die de consultant in het gesprek vastlegt (5.2). Aanleiding: de
     site van een klant had een hele reeks "recente werkzaamheden", en in de kennislaag stonden er twee. De open
     punten (`gaps`) blijven in de ruwe uitvoer van het facet; op het kennisoverzicht ziet de consultant ze als
     onderwerp voor het gesprek. Ze worden geen vragen aan de klant (besluit V3, 27 september 2026).
- **Waarom.** De feiten die letterlijk op de site staan zijn de enige claims die een schrijver later als
  "zeker" mag gebruiken.

### 3.10 Het onderzoek is klaar

- **Techniek.** `profiles.status = 'klaar'` is al gezet door 3.4. De merkfase wordt afgeleid, niet
  opgeslagen (`profileStage()` in `lib/profile-stage.ts`): `voorbereiden` zolang er onderzoekstaken open staan
  of het onderzoek niet klaar is; daarna `klaar_voor_gesprek`; na het vastleggen van het gesprek
  `gesprek_gehad`; na toewijzing `overgedragen`. Een stap die niets vindt toont een waarschuwing en geen groen
  vinkje.
- **Het statusoverzicht.** Op het onboardinggesprek (hoofdstap 5) ziet de consultant sinds 30 september 2026
  één statusoverzicht (`buildOnboardingStatus()` en `statusZin()` in `lib/pipeline/onboarding-status.ts`, puur;
  getoond door `app/(app)/merk/[id]/_components/profile-readiness-panel.tsx`): de
  onderzoekstaken en de volledigheidscheck van het dossier samen, in drie groepen (onderzoek, dossier,
  gesprek). De balk, de zin erboven en de getallen per groep tellen dezelfde regels. Daarvoor bestonden er
  twee overzichten die anders telden (het scherm Diagnose met "9 van de 9" en een blok Voorbereiding met
  "7 van de 7" terwijl er tien regels onder stonden); het scherm Diagnose is verwijderd, en daarmee ook het
  kostenlogboek, de ruwe modeluitvoer en de herkomst per veld die daar te zien waren. Die gegevens staan nog
  in de database (`ai_calls`, `profile_field_sources`).
- **Waarom.** Zo kan de fase nooit uit de pas lopen met de taken.

**Uitkomst van hoofdstap 3:** een merkprofiel, `profile_pages`, een aanbodboom, 5 tot 8 conceptonderwerpen, het
marktfacet, de kennistest, de samenvatting, een technische audit, en een groot aantal kennisitems in
`klantkennis`.

---

## Hoofdstap 4. De kennislaag: één klantwaarheid

*Wie: de onderzoekstaken, de consultant en de klant schrijven erin; de brief, de schrijver en de controle
lezen eruit. Kost: geen eigen AI-aanroepen, behalve het indelen van kennis (4.6).*

**Doel van de hoofdstap.** Eén plek voor alles wat over een bedrijf bekend is, elk item met status, herkomst en
toegestaan gebruik. Vóór deze laag stond klantkennis verspreid over `profiles` (94 kolommen), `brand_facts`,
`profile_offerings`, `profile_facets`, `fact_requests` en meer. De schrijver las maar een deel. De laag
volgt uit het plan `docs/tasks/van-pijplijn-naar-kennissysteem.md`; hij is gebouwd in de werkpakketten K1 tot
en met K8 (26 en 27 september 2026).

### 4.1 Het model: het kennisitem

- **Techniek.** Tabel `klantkennis` (migratie 0116, aangevuld door 0117). Belangrijke kolommen:
  - `domein`: `identiteit`, `aanbod`, `doelgroep`, `positionering`, `bewijs`, `stem`, `verhaal`, `grens`,
    `geleerd`;
  - `soort` (vrije soort binnen het domein, bijvoorbeeld `dienst`, `werkgebied`, `prijs`, `bezwaar`,
    `eigen verhaal`, `verboden woord`, `verboden onderwerp`);
  - `bewering`: de uitspraak in gewone taal, zoals een schrijver hem kan gebruiken;
  - `status`: **`waargenomen`** (uit een bron, met bronadres en letterlijk citaat), **`verklaard`** (de klant of
    de consultant zegt het), **`bevestigd`** (een mens bevestigde het, met wie en wanneer), **`afgeleid`** (wat
    een model denkt);
  - `bron`: `website`, `klant`, `gesprek`, `document`, `extern`, `meting`, `ai`;
  - `gebruik`: `content` (mag op een pagina), `intern`, `verboden`;
  - `bewijskracht` (`geen`, `gewoon`, `sterk`), `bron_url`, `citaat`, `bevestigd_door`, `bevestigd_op`,
    `vastgelegd_door` (mens) of `vastgelegd_door_taak`, `verloopt_op`, `vervangen_door`, `afgewezen_op`,
    `geldt_voor` (lijst met id's van andere items, bijvoorbeeld werkgebieden), `analysis_id`,
    `content_piece_id`, `sleutel`, `herkomst_tabel` en `herkomst_id`, `ruw` (conventie 8).
- **Regels als database-constraints en in code** (`lib/kennis/regels.ts`, de checks in migratie 0116):
  - waargenomen kan alleen met bronadres en citaat;
  - een model kan niets "verklaren" namens de klant: `bron = 'ai'` met status verklaard of bevestigd mag niet;
  - bevestigd kan alleen met wie en wanneer;
  - afgeleid is geen feit en mag nooit `gebruik = 'content'` hebben;
  - elk item zegt wie het vastlegde (een mens of een taak).
- **Waarom.** De feedback van het team op de eerste versie: "te veel intelligentie in de pipeline, te weinig in
  het datamodel". De regels zitten in tabellen en constraints, niet in prompts.

### 4.2 De enige schrijfingang

- **Techniek.** Alleen `lib/kennis/vastleggen.ts` schrijft in `klantkennis` (een bewakingstest in
  `scripts/test-unit.ts` dwingt dat af). Functies: `legVast()`, `bevestig()`, `wijsAf()`, `vervang()`,
  `deelIn()`. Bij `legVast()`:
  1. `controleerItem()` valideert de regels uit 4.1, en `magNieuwMetStatus()` bepaalt wat een actor mag
     vastleggen: een model alleen `afgeleid`; alleen een mens `bevestigd`; `verklaard` alleen met bron klant,
     gesprek of document.
  2. Een niet-mens moet zeggen waar het vandaan kwam (`herkomst`: tabel en rij).
  3. `geldt_voor` moet naar items van hetzelfde merk wijzen.
  4. `kennisSleutel()` (`lib/kennis/samenvoegen.ts`) berekent een ontdubbelsleutel. Bestaat het item al dan
     is de uitkomst `bestond`; was het eerder afgewezen, dan `eerder_afgewezen` (een afgewezen item komt niet
     terug).
  5. `botsingenMet()` zoekt items die dezelfde grootheid met een andere waarde noemen en zet ze op de
     conflictlijst (`fact_conflicts`); de consultant kiest welke klopt.
  6. Na een geslaagde schrijfactie publiceert de laag een gebeurtenis (4.5).
- **Overgangen** (`magOvergaan`): een model verandert niets; bevestigd verandert niet meer; alleen een mens
  maakt iets verklaard of bevestigd; van afgeleid naar waargenomen alleen als citaat en bronadres er zijn.
- **Versies.** Een wijziging maakt geen update in place maar een nieuw item; het oude krijgt `vervangen_door`
  (`lib/kennis/versies.ts`). Een gewijzigd antwoord van een klant is dus een nieuwe versie.

### 4.3 Wat elke stap in de laag schrijft

| Bron | Module | Wat |
|---|---|---|
| Het merk aanmaken | `lib/kennis/uit-gesprek.ts` (`slaProfielOp`) | Ingetypte profielvelden, verklaard door de consultant |
| Het profiel (3.4) | `lib/kennis/onderzoek.ts`, `uit-onderzoek.ts` | Merkonderzoek: waargenomen alleen waar de code het citaat terugvond, het overige afgeleid en intern |
| Het aanbod (3.5) | `lib/kennis/aanbodkopie.ts`, `onderzoek.ts` | Aanbodknopen, waargenomen bij `confidence = 1` |
| De markt en kennistest | `onderzoek.ts` | Concurrenten, gelijknamige bedrijven |
| De samenvatting (3.9) | `onderzoek.ts` (`kennisUitSynthese`) | Citeerbare feiten, waargenomen; de klussen van de site als verhaal (domein `verhaal`, soort `klus`), waargenomen |
| Het gesprek (hoofdstap 5) | `lib/kennis/gesprek.ts`, `uit-gesprek.ts` | Profielvelden en aantekeningen, verklaard |
| Antwoorden op vragen (hoofdstap 12) | `gesprek.ts` (`kennisUitAntwoord`) | Een antwoord op een gerichte vraag geldt voor het cluster van de pagina (besluit V17); een praktijkvoorbeeld en het antwoord op de open vraag blijven bij hun pagina |
| Stemvoorbeelden en merkdossier | `lib/kennis/uit-stem.ts` | Domein `stem` |
| Terugvullen van oude gegevens | `lib/kennis/terugvullen.ts` | Eenmalig (K3) |

### 4.4 Wat de schrijver mag lezen

- **Techniek.** `magInBlokA()` (`lib/kennis/regels.ts`): een item mag in blok A (de bedrijfskennis voor de
  schrijver) alleen als het actueel is (niet vervangen, niet afgewezen, niet verlopen), `gebruik = 'content'`,
  niet `afgeleid`, en, bij `waargenomen`, met citaat en bronadres. Een item met `bron = 'ai'` mag alleen
  als het waargenomen of bevestigd is. `setVoorBlokA()` sorteert bevestigd eerst, dan verklaard, dan
  waargenomen, en daarbinnen sterk bewijs eerst. Verboden woorden en onderwerpen gaan apart mee, als verbod.
- **Waarom.** "Nooit iets wat alleen een model denkt" (plan §4 regel 4).
- Hoe dit per pagina wordt toegepast staat in 11.3.

### 4.5 Gebeurtenissen en afhankelijkheden

- **Wat.** Wat verandert er aan een pagina of kans als kennis wijzigt? En welke onderzoeksstappen moeten
  opnieuw als een mens iets in het profiel zet?
- **Techniek.** Bij elke geslaagde schrijfactie publiceert `lib/kennis/vastleggen.ts` de gebeurtenis
  `kennis_gewijzigd` (`publiceer()`, tabel `gebeurtenissen`, best effort: een mislukte melding blokkeert de
  kennis zelf niet). `publiceer()` zoekt de abonnees in het register (`lib/gebeurtenissen/register.ts`) en plant
  per abonnee een taak `gebeurtenis_verwerken` (idempotent per gebeurtenis en abonnee; tabel
  `gebeurtenis_verwerkingen`). Er zijn twee abonnees, en de laag is daar bewust gestopt (besluit G5,
  27 september 2026):
  1. `kennis_wijziging_impact`: zoekt via `afhankelijkVan()` (tabel `afhankelijkheden`, migratie 0125) welke
     kansen en pagina's op het gewijzigde item leunen. Een afgewezen of verboden item zet de kansen op
     `vervallen`; anders `te_herzien`. Pagina's krijgen `kennis_gewijzigd_op` (een melding, geen status).
  2. `onderzoek_refresh`: houdt in `profiles.velden_te_verversen` bij welke profielvelden een mens zette sinds
     de laatste onderzoeksronde. Het scherm "onderzoek bijwerken" (hoofdstap 5) leest die lijst.
- **Afhankelijkheden** worden vastgelegd door `lib/afhankelijkheden/vastleggen.ts`: bij het vastleggen van een
  kans (uit `geldt_voor`) en bij het schrijven en herschrijven van een pagina (uit `gebruikte_kennis`).
- **Waarom.** Zonder dit ziet niemand dat een pagina op een inmiddels afgewezen feit leunt.

### 4.6 Nieuwe feiten indelen

- **Wat.** Feiten van de site zonder `soort` krijgen een soort (prijs, termijn, plaats, werkgebied, dienst,
  product, certificering, garantie, werkwijze, cijfer, openingstijd, contact, overig) en een waarde met eenheid.
- **Techniek.** Taak `fact_register` (`deelKennisIn()`, `lib/kennis/indelen.ts`), gepland bij het voorbereiden
  van pagina's (11.1). In batches (maximaal 12 batches, 4 tegelijk) een **AI-aanroep** (`deelFeitenIn`,
  kind `fact_classify`): Luna, `deterministic`, zonder zoeken; het model "herschrijft niets en voegt niets
  toe". De code controleert dat een getal in de waarde ook in de feittekst staat. Het resultaat wordt met
  `deelIn()` (actor `model`) toegevoegd.
- **Tegenstrijdigheden** worden sinds 27 september 2026 zonder model gevonden: twee waarden voor hetzelfde
  gegeven (zelfde soort en zelfde onderwerp) komen op het conflictscherm van de consultant. Zolang een
  conflict openstaat, houdt `lib/kennis/betwist.ts` de betrokken kennis bij de schrijver weg.
- **Waarom.** Zonder soort kan de kennislaag niet zien dat twee feiten hetzelfde gegeven beschrijven.

---

## Hoofdstap 5. Het gesprek met de klant

*Wie: de consultant, met de klant erbij. Waar: Admin, Onboardinggesprek (`/merk/[id]/admin/onboarding`). Kost:
niets, behalve bij "onderzoek bijwerken".*

**Doel van de hoofdstap.** Aanvullen wat een website nooit vertelt: commerciële keuzes, verhalen, de stem van
het bedrijf en wat verboden is. Deze invoer gaat letterlijk naar de schrijver van elke pagina, dus hier wordt
een groot deel van de latere tekstkwaliteit bepaald.

### 5.1 Het scherm

- **Wat.** Bovenaan staat het statusoverzicht van het onderzoek en het dossier (3.10), en wat nog niet bekend
  is (en per kans wat er voor die pagina ontbreekt, de "kennisronde"), daarna het dossier blok voor blok: het
  bedrijf en de namen, het aanbod, de markt, het bewijs, de klant en de toon, materiaal en veranderingen,
  techniek en koppelingen, en afspraken.
- **Techniek.** Component `app/(app)/merk/[id]/_components/onboarding-session.tsx`, met
  `profile-readiness-panel.tsx` voor het statusoverzicht. De kennisronde (`lib/kansen/kennisronde.ts`,
  `kennisrondeVoorMerk()`) groepeert het kennisgat van elke kans die nog geschreven moet worden per domein,
  in de volgorde van het kansenscherm (`ordenKansen`, hoofdstap 9); geen model.
- **De open punten van het onderzoek** staan op het kennisoverzicht (`/merk/[id]/admin/kennis`): eerst
  `werkgebiedPunten()` (`lib/kennis/overzicht.ts`, besluit V10), dan de open punten van de samenvatting en
  het aanbod (`openPuntenUitOnderzoek()`). Staat er een streek in het werkgebied van een lokaal bedrijf
  (`isStreek()`: "regio …", "… en omstreken", een provincie of een bekende streek als Alblasserwaard; een stad
  met de naam van een provincie, zoals Utrecht, telt als plaats), dan is het eerste punt "Welke plaatsen
  vallen precies onder …?". Is het bedrijfsmodel leeg of `overig`, dan volgt de vraag wat voor bedrijf het is.
  Geen model; de consultant vult de plaatsen in het gesprek in (er is in de app geen lijst van plaatsen per
  streek).
- **Waarom.** Zo weet de consultant welke vragen hij in het gesprek moet stellen om pagina's te kunnen
  schrijven zonder later de klant te hoeven storen.

### 5.2 Velden worden per veld opgeslagen

- **Techniek.** `PATCH /api/profiles/[id]` (`app/api/profiles/[id]/route.ts`). Elk veld wordt opgeslagen zodra
  de consultant eruit klikt. De herkomst wordt bepaald door `resolveWriteSource()` (`lib/profile-source.ts`):
  een klant schrijft als `klant`; een beheerder die voor een klant invult schrijft als `gesprek`; alleen een
  beheerder mag `gesprek` of `consultant` kiezen (anders 403). De herkomst komt in `profile_field_sources`.
  Kennisvelden gaan via `slaProfielOp()` de kennislaag in (4.3); alleen velden uit `GESPREKSVELDEN` doen dat,
  en `slaProfielOp()` publiceert de `kennis_gewijzigd`-gebeurtenis met de gezette velden (voor
  `onderzoek_refresh`, 4.5). Wordt `offline_proof`, `service_regions` of `growth_regions` gewijzigd, dan sluit
  `sluitVragenUitGesprek()` openstaande vragen die het gesprek nu beantwoordt. De route valideert ook: de
  website (`checkUrlFormat`), maximaal 10 voorrangspaden voor de crawl (alleen het eerste padsegment),
  `max_inventory_pages` tussen 5 en 150, en de vaste waarden voor aanspreekvorm en klantwaardeband.
- **Welke velden en waar ze heen gaan** (de invoer wordt dus in de app hergebruikt):

  | Veld | Gaat naar |
  |---|---|
  | Verhalen (vier vakken: klussen, werkwijze, wat het bedrijf niet doet, waarom het begon), bezwaren met antwoord | De schrijver van elke pagina (blok A) |
  | Wat het bedrijf anders doet, bewijs buiten de site | Blok A en het rapport |
  | Verboden woorden | De schrijver en een controle in code (14.2) |
  | Verboden onderwerpen | De schrijver, de onderwerpen en het rapport |
  | Aanspreekvorm (je, u, wij) | De schrijver |
  | Stemvoorbeelden | De schrijver, als voorbeeld van toon (5.3) |
  | Groeiregio's, prioriteiten, doelgroepen | Onderwerpen, meetvragen, rapport |
  | Gelijknamige bedrijven | De meting (tellen niet als het eigen merk) |
  | Doel over twaalf maanden, seizoen | Het contentplan en het rapport |

### 5.3 De stemvoorbeelden

- **Wat.** Eén tot drie adressen van pagina's waarop de stem van het bedrijf goed te horen is.
- **Techniek.** Bij het opslaan van de adressen (`schoneAdressen`, maximaal `MAX_STEMVOORBEELDEN = 3`) antwoordt
  de route eerst; daarna haalt `after()` (Next.js) de tekst op met `haalStemvoorbeeldenOp()`
  (`lib/pagina/stemvoorbeelden.ts`): tot `STEMTEKST_MAX = 2000` tekens per pagina, vanaf de eerste echte
  alinea. Lukt dat niet, dan staat er "Deze pagina konden we niet lezen". De tekst gaat ook de kennislaag in
  (`legStemVast()`, domein `stem`). Bij het schrijven wordt op de stemtekst nog `zonderSiteHerhaling()` toegepast (zie 13.2).
- **Waarom.** De schrijver neemt toon, zinsbouw en woordkeus over. Zonder stemvoorbeelden gebruikt hij de tekst
  van de homepage.

### 5.4 De strategie en het gesprek vastleggen

- **Wat.** De aantekeningen en veranderingen ("contextfactoren": een nieuwe naam, een vestiging, een dienst die
  stopt) worden vastgelegd, en het merk springt naar "Gesprek gehad".
- **Techniek.** `PUT /api/profiles/[id]/strategy` (`app/api/profiles/[id]/strategy/route.ts`): upsert in
  `profile_strategy` (`strategy_notes`, `context_factors`, `recorded_by`, `recorded_at`). `legGesprekVast()` zet
  de inhoud in de kennislaag. Daarna:
  1. **`propose_topics` wordt opnieuw ingepland.** Omdat `recorded_at` nu gezet is, worden de onbeslisten
     conceptonderwerpen vervangen door definitieve, waarin het gesprek meeweegt (3.6).
  2. Een nieuwe naamvariant of regio uit de contextfactoren wordt aan `aliases` en `service_regions` toegevoegd,
     met bron `gesprek`.
- **Waarom.** De onderwerpen zijn pas na het gesprek "definitief" en startbaar; het gesprek is dus een
  poort in de pijplijn.

### 5.5 "Onderzoek bijwerken"

- **Wat.** Verandert er iets wat het onderzoek raakt, dan herhaalt de app alleen de stappen die daar iets mee
  te maken hebben, na een kostenschatting.
- **Techniek.** `POST /api/profiles/[id]/refresh` en `planRefresh()` (`lib/pipeline/onboarding-refresh.ts`).
  `FIELD_TASKS` koppelt een veld aan de stappen die opnieuw moeten:

  | Veld verandert | Opnieuw | Geschatte kosten |
  |---|---|---|
  | `service_scope`, `service_regions`, `growth_regions` | `prompts` en `kennistest` | 0,02 per analyse en 0,05 |
  | `priority_offerings`, `deprioritised_offerings`, `target_segments`, `forbidden_topics` | `onderwerpen` | 0,01 |
  | `competitors` | `markt` | 0,03 |
  | Alle verhalenvelden, bezwaren, bewijs buiten de site, doel, seizoen | niets (worden gelezen bij het schrijven of rapporteren) | 0 |

  De stappen draaien in de volgorde onderwerpen, markt, prompts, kennistest. Voor de meetvragen (`prompts`)
  wordt per bestaande analyse per funnelfase een `generate_prompts` met `regenerate: true` gepland: de oude
  vragen gaan op `active = false`, ze worden niet verwijderd (een `delete` zou de metingen meenemen). De
  taken `profile_market` en `profile_llm_baseline` worden met `chain: false` ingepland.
- **Waarom.** Zo kost een correctie van één veld centen en geen nieuwe onderzoeksronde.

**Uitkomst van hoofdstap 5:** aangevulde profielvelden, `profile_strategy`, definitieve onderwerpen, een
kennislaag met verklaarde items, en de merkfase `gesprek_gehad`.

---

## Hoofdstap 6. Het klantaccount, de toewijzing en het pakket

*Wie: de consultant. Waar: Admin, Toewijzen (`/merk/[id]/admin/toewijzen`). Kost: niets. Deze hoofdstap mag
ook later.*

**Doel van de hoofdstap.** Na de verkoop het merk naar het account van de klant zetten, zodat de klant kan
inloggen, vragen kan beantwoorden en teksten kan goedkeuren. De consultant houdt volledige toegang.

### 6.1 Toewijzen op e-mailadres

- **Wat.** De consultant vult het e-mailadres van de klant in.
- **Techniek.** `POST /api/profiles/[id]/assign-by-email` (alleen beheerder, anders 404).
  `findUserByEmail()` (`lib/invites.ts`) zoekt het adres in `auth.users` met `admin.listUsers({ page: 1,
  perPage: 200 })`: alleen de eerste 200 gebruikers worden doorzocht (zie bijlage H). Twee uitkomsten:
  1. **De gebruiker bestaat** (bijvoorbeeld een bureau met een tweede klant): `wijsToeAanGebruiker()`
     (`lib/profile-assign.ts`). Bepaalt het account met `defaultAccountFor(target)`, zet `profiles.user_id`,
     `assigned_at` en `account_id`, en verplaatst `analyses.user_id` mee (alleen die twee tabellen hebben
     `user_id`; de rest volgt via `analysis_id` en RLS). Mislukt het bijwerken van de analyses, dan zet de
     code het merk terug.
  2. **De gebruiker bestaat niet**: `wijsToeAanNieuwAccount()`. Maakt een `accounts`-rij met de naam van het
     merk, zet `profiles.account_id` en `assigned_at`, en maakt een uitnodiging voor het e-mailadres met rol
     `admin` (6.2). `profiles.user_id` en `analyses.user_id` blijven de consultant; de klant krijgt toegang
     via het accountlidmaatschap (toegangslaag 1, 1.1).
  In beide gevallen zet `zetStartdatum()` `accounts.started_at` als die nog leeg is (de startdatum van de
  verkoopafspraak, `lib/verkoopafspraak.ts`).
- **Data uit.** `accounts`, `account_users` (na acceptatie), `account_invites`, bijgewerkte `profiles`.
- **Waarom.** Het klantaccount ontstaat pas bij de verkoop en niet bij het aanmaken van het merk: het merk
  is eerst een intern demonstratieobject van de consultant.
- **Alternatief.** `POST /api/profiles/[id]/assign` wijst toe aan een bestaande gebruiker op id (beheerder).

### 6.2 De uitnodiging

- **Techniek.** `createInvite()` (`lib/invites.ts`): een willekeurig token, waarvan alleen de SHA-256-hash
  (`token_hash`) wordt bewaard. Geldigheid 14 dagen (`INVITE_DAGEN`). De link
  `<siteUrl>/uitnodiging/<token>` wordt **alleen in het antwoord teruggegeven en niet opgeslagen**: het ruwe
  token bestaat op één moment. Zolang e-mail uit staat kopieert de consultant de link en stuurt hem zelf door.
  Leden van een account kunnen later ook uitnodigen: `POST /api/accounts/[id]/invites` (alleen een `admin` van
  het account of een beheerder; rol `admin` of `member`), en intrekken via
  `POST /api/accounts/[id]/invites/[inviteId]/revoke`.
- **Waarom.** Een link die je zelf doorstuurt werkt altijd, ook als een e-mail in een spamfilter blijft
  hangen.

### 6.3 De klant accepteert de uitnodiging

- **Techniek.** Pagina `app/(auth)/uitnodiging/[token]` toont de stand van de link (`lookupInvite`: `ongeldig`,
  `verlopen`, `gebruikt`, `geldig`). Het formulier stuurt `POST /api/invites/accept`. Deze route is
  bewust publiek (de aanroeper is nog niemand) en heeft een rate limit van 20 pogingen per 15 minuten per
  IP-adres. `acceptInvite()` controleert de stand opnieuw (tussen laden en versturen kan de link zijn
  ingetrokken), en dan:
  1. bestaat het e-mailadres al als gebruiker, dan wordt die hergebruikt;
  2. anders moet het wachtwoord voldoen aan `passwordRules`: minstens 8 tekens, een cijfer en een hoofdletter;
     `auth.admin.createUser({ email, password, email_confirm: true })` maakt de gebruiker aan;
  3. upsert in `account_users` met de rol van de uitnodiging;
  4. de uitnodiging krijgt `accepted_at` en `accepted_user_id`;
  5. de route logt de gebruiker meteen in met `signInWithPassword`. Bij een bestaande gebruiker met een ander
     wachtwoord mislukt dat stil: hij is dan wel lid geworden en gaat naar het inlogscherm.
- **Waarom.** De klant kiest zelf een wachtwoord en hoeft daarna niet nog eens in te loggen.

### 6.4 Het pakket en de startdatum

- **Techniek.** `PATCH /api/accounts/[id]` (`app/api/accounts/[id]/route.ts`): alleen een beheerder mag
  `package_pages_per_month` en `started_at` zetten; een klant krijgt 403 met de uitleg dat de consultant het
  vastlegt. Geldige maten zijn **10, 20 of 40 pagina's per maand** (`PACKAGE_SIZES` in `lib/package-sizes.ts`,
  een check-constraint in migratie 0046). Het pakket wordt bewust hier gezet, op het klantaccount, en niet bij
  het aanmaken van het merk (besluit A5). Zonder pakket weigert de planroute (hoofdstap 10).
  `afspraakGaten()` (`lib/verkoopafspraak.ts`) waarschuwt als pakket of startdatum ontbreekt.
- **Waarom.** Het pakket is een verkoopafspraak en geen klantinstelling: zou een klant zichzelf op 40 kunnen
  zetten, dan is de afspraak een suggestie en de facturatie een gok.
- **Opzeggen.** `cancel: true` zet `accounts.cancelled_at`. `isActiveAccount()` beschouwt een account als
  actief tot die datum.

**Uitkomst van hoofdstap 6:** een klantaccount met een admin-lid, een pakket, een startdatum en een merk dat
aan het account hangt (merkfase `overgedragen`).

---
## Hoofdstap 7. Een cluster opzetten: onderwerp, meetvragen en de poort

*Wie: de consultant. Waar: Strategie, Clusters (`/merk/[id]/strategie/clusters`). Kost: een paar dollarcent
per cluster.*

**Doel van de hoofdstap.** Een onderwerp kiezen en dertig realistische vragen opstellen die kopers over dat
onderwerp aan een AI-assistent stellen. Die vragen zijn de meetlat: score, rapport en pagina's gaan allemaal
over deze vragen. De hoofdstap eindigt bij een bewuste poort: er wordt pas gemeten na een klik van de
consultant.

### 7.1 Een onderwerp kiezen en het cluster starten

- **Wat.** Uit de voorgestelde onderwerpen (3.6) keurt de consultant er één goed, of hij typt zelf een
  onderwerp in. Er komt een nieuwe analyse bij met status `bezig`.
- **Techniek.** Twee routes:
  1. **Voorgesteld onderwerp.** `PATCH /api/profiles/[id]/topics` (status `voorgesteld`, `goedgekeurd`,
     `afgewezen`, plus de aantekeningen van de klant: `client_questions`, `client_friction`, `client_edge`,
     `client_note`), daarna `POST /api/profiles/[id]/topics` met `topicId` en optioneel `mix`.
  2. **Zelf ingetypt onderwerp.** `POST /api/analyses` met `profileId`, `topic` en optioneel `label_id` of
     `label_name` (clusterlabels), `content_brief` en `mix`.
  Beide routes controleren in deze volgorde: ingelogd, `mayTriggerCost(user.id, "analyse_starten")` (alleen
  beheerder, 403), de eigenaar van het merk, dat `profiles.status = 'klaar'` is (409 als het onderzoek nog
  loopt), en bij de voorgestelde route ook het dagplafond (`checkBudgetForProfile`, 402) en dat het onderwerp
  geen `concept` meer is (409, zie 3.6). Een onderwerp dat al een analyse heeft, geeft dezelfde analyse terug.
  De route maakt een `analyses`-rij (`status = 'bezig'`, `topic`, `name`, `content_brief` uit de aantekeningen
  van de klant via `buildTopicBrief()`, `notify_by_email`) en plant `prepare_analysis` in.
- **Waarschuwing bij een lijkend cluster** (besluit V18, 29 september 2026). Het formulier voor een zelf
  ingetypt onderwerp (`app/(app)/analyses/new/`) toont "Lijkt op: …" als het onderwerp lijkt op een bestaand
  cluster van hetzelfde merk (`lijktOp()`, `lib/cluster-overlap.ts`, puur: minstens 60 procent van de
  betekenisdragende woorden van het kleinste onderwerp gedeeld, met een eenvoudige stam en zonder lege woorden
  als "de" of "beste"). Het houdt niets tegen: twee clusters die op elkaar lijken, kunnen een bewuste keuze
  zijn.
- **De verdeling van de vragen** (`lib/prompt-mix.ts`): standaard 10 per funnelfase (oriëntatie, overweging,
  beslissing), dus 30. Per analyse instelbaar in `analyses.prompts_orientatie`, `prompts_overweging` en
  `prompts_beslissing`; `checkMix()` en `checkNewClusterMix()` bewaken de grenzen.
- **Waarom.** Het cluster is de meeteenheid van de app. Het startbaar maken pas na het gesprek voorkomt dat er
  gemeten wordt op onderwerpen die de klant niet wil.

### 7.2 Het onderwerp onderzoeken

- **Wat.** Weten wat de eigen site over dit onderwerp zegt en wie de concurrenten voor dit onderwerp zijn
  (dat kunnen andere zijn dan voor het hele bedrijf).
- **Techniek.** Taak `prepare_analysis` (`prepareTopicResearch()`, `lib/pipeline/prepare.ts`). Bestaat er al een
  `topic_research`-rij, dan geen aanroep. Anders **AI-aanroep** (`generateTopicResearch`, kind
  `topic_research`): Luna, `analytical`, **met** web-zoeken. Invoer: merknaam, website, branche, algemene
  concurrenten, het onderwerp, de gewenste hoek van de klant, en de eerste 40 pagina's met tekst (adres,
  titel en de eerste 400 tekens). Opdracht: onderzoek alleen dit onderwerp: (1) wat zegt de website erover
  (`contentSummary`), (2) welke 3 tot 5 concurrenten zijn relevant, per concurrent alleen de naam van 2 tot 4
  woorden. Een fout zet de analyse op `mislukt` (blokkerend, 0.3).
- **Data uit.** `topic_research` (`content_summary`, `competitors`, `raw_json`).
- **Waarom.** De meetvragen mogen de concurrenten van dit onderwerp niet noemen, en de latere brief gebruikt
  ze om namen uit antwoorden te halen.
- Daarna plant `prepare_analysis` één `generate_prompts` per funnelfase in (een fase met aantal 0 wordt
  overgeslagen). Eén taak per fase omdat de gezamenlijke taak op productie 228 van de 300 seconden vulde.

### 7.3 De meetvragen opstellen

- **Wat.** Vragen die lijken op wat echte kopers aan ChatGPT vragen, zonder merknaam, zodat de meting eerlijk
  laat zien of het merk vanzelf genoemd wordt.
- **Techniek.** Taak `generate_prompts` (`generateAnalysisPrompts()` in `prepare.ts`,
  `generatePromptsForStage()` in `lib/pipeline/prompts.ts`), per funnelfase. **AI-aanroep** (kind `prompts`):
  Luna, `creative`, zonder zoeken. Invoer: website, merknaam en concurrenten (om te vermijden), het onderwerp,
  branche, aanbod, samenvatting, werkgebied en groeiregio's, de bezwaren van klanten uit het gesprek (alleen
  in de fase overweging), en de actieve vragen van de andere clusters van hetzelfde merk
  (`vragenVanAndereClusters()` in `prepare.ts`, hooguit `ANDERE_CLUSTERS_MAX = 60` in de opdracht) met de
  opdracht die niet opnieuw te stellen, ook niet in andere woorden (besluit V18).
  Opdracht: "Je bedenkt realistische vragen die een echte koper aan een AI-assistent zoals ChatGPT stelt."
  Natuurlijke, gesproken vragen, gevarieerd, precies het aantal van de fase. Fasen: *oriëntatie* (iemand die
  zich net inleest en nog geen aanbieder kent), *overweging* (opties vergelijken zonder merk), *beslissing*
  (een aanbieder kiezen). Harde regel: nooit de eigen merknaam of het domein, en nooit een concurrent bij naam
  (generieke productmerken mogen wel). Bij een lokaal bedrijf moet **elke** vraag een plaats uit het
  werkgebied bevatten, en die plaats moet de vraag echt lokaal maken (met een fout en een goed voorbeeld in de
  opdracht). **Hooguit één vraag per cluster over een bezwaar uit het verkoopgesprek**, alleen in de fase
  overweging en alleen als het bezwaar echt over het onderwerp gaat (besluit V11, 29 september 2026; tot dan
  "minstens één" in oriëntatie én overweging, en kwam bij één merk hetzelfde bezwaar vijf keer terug in 90
  vragen, ook in clusters waar het niet over ging). Omdat de drie fasen parallel lopen, is één fase de enige
  manier om er één per cluster van te maken. Per vraag
  ook de intentie, het type (`informational`, `commercial`, `transactional`), de specificiteit (`head` of
  `long_tail`), of er koopintentie is, een cluster-label, en `volumeEstimate` (een schatting van hoe vaak de
  vraag gesteld wordt, 0 tot 100).
- **Code daarna** (dit is het echte vangnet):
  1. `containsForbidden()` verwerpt een vraag met een verboden naam (merk, domein, concurrenten);
  2. `nieuweVraag()` verwerpt dubbelen, ook als twee vragen alleen in de plaatsnaam verschillen, en een
     vraag die letterlijk al in een ander cluster van het merk staat (die tellen vooraf als gezien); en
     `tweedeBezwaarvraag()` (`lib/pipeline/prompt-dedupe.ts`) verwerpt een tweede vraag over een bezwaar uit
     het gesprek (`raaktBezwaar()`: minstens twee gedeelde inhoudswoorden, of alle woorden van een kort
     bezwaar als "te duur");
  3. is het aantal niet gehaald, dan volgen tot `MAX_TOPUP_ATTEMPTS = 3` aanvulrondes met de ontbrekende
     hoeveelheid erbij;
  4. bij een lokaal bedrijf (`isLokaal`) volgen geo-rondes (`geoBalance`, `REGIO_DREMPEL = 1,0`, dus alle
     vragen) die vragen zonder plaats vervangen; blijft dat mislukken, dan worden landelijke vragen geschrapt en
     komen er minder vragen;
  5. voor groeiregio's een eigen balansronde (`groeiBalans`);
  6. levert een fase geen enkele bruikbare vraag op, dan een fout (meestal omdat de merknaam samenvalt met
     categoriewoorden).
- **Zoekvolume.** Per vraag worden kandidaat-zoektermen afgeleid (`kandidaatZoektermen`). Staat de
  zoekvolumelaag aan (`SEARCH_DEMAND_ENABLED=true`, **standaard uit**), dan worden ze opgehaald bij DataForSEO
  (`keywordVolumes`, 30 dagen cache in `keyword_demand`) en krijgt de vraag `volume_source = 'gemeten'`; de
  band volgt uit de verhouding tot de zwaarste vraag (`bandFromMeasuredVolume`). Anders `volume_source =
  'geschat'`.
- **Data uit.** `prompts` (`text`, `category`, `intent`, `intent_type`, `specificity`, `purchase_intent`,
  `cluster`, `volume_estimate`, `volume_band`, `volume_source`, `active = true`, `created_by = 'system'`,
  `source_raw_json`).
- **Waarom.** Een vraag met de merknaam of een concurrentnaam meet niets: dan noemt de AI dat merk altijd. Een
  vraag zonder plaats bij een lokaal bedrijf levert een landelijk antwoord op waarin geen enkel lokaal bedrijf
  staat.

### 7.4 Afronden en de vragen wegen

- **Techniek.** De laatste `generate_prompts` van de analyse (geteld met `requireCount` op nog lopende
  taken) roept `finishPromptGeneration()` aan: dubbelen over de fasen heen worden verwijderd
  (`duplicatePromptIds`, een echte `delete`), en ook vragen van dit cluster die al actief in een ander cluster
  van hetzelfde merk staan (`dubbelMetAndereClusters()`, vergelijking na `vraagSleutel()`: zonder hoofdletters,
  accenten en leestekens; besluit V18). Alleen de vragen van het nieuwe cluster gaan weg, want op bestaande
  clusters zijn al metingen gedaan, en er blijft altijd minstens één vraag staan. Dit vangt twee clusters die
  tegelijk hun vragen opstellen; de opdracht in 7.3 kreeg de andere vragen al mee. Reden: dezelfde vraag in
  drie clusters werd drie keer gemeten, telde drie keer mee in de merkscore en leverde drie rapporten op die
  naar dezelfde pagina wezen. Heeft de analyse nul vragen, dan wordt hij `mislukt`. Anders
  `analyses.status = 'concept_klaar'`. Daarna plant hij `calibrate_volumes` in.
  `calibratePromptVolumes()` doet één **AI-aanroep** (`volume_calibration`, Luna, `content`, zonder zoeken)
  voor de vragen die niet `gemeten` zijn: "Je bent een zoekgedrag-analist", schat de relatieve frequentie 0 tot
  100 met vaste ijkpunten (`SEARCH_VOLUME_ANCHORS`). Het resultaat vult `volume_estimate` en `volume_band`
  (`bandFromEstimate`: vanaf 60 `hoog`, vanaf 25 `midden`, anders `laag`). Faalt de aanroep, dan krijgt elke
  vraag de middenwaarde 50 (zie bijlage H).
- **Waarom.** De band bepaalt hoe zwaar een vraag meetelt in de gewogen score en de volgorde van kansen
  (8.6, 9.4). Het is dus een schatting van een model tenzij de zoekvolumelaag aan staat.

### 7.5 De goedkeuringspoort

- **Wat.** De analyse staat op `concept_klaar`. De consultant (met de klant) leest de vragen op
  `/analyses/[id]/concept`, past ze aan, zet vragen uit die niet passen, en klikt "Bevestig en start meting".
  Er wordt pas gemeten na deze klik.
- **Techniek.** Vragen bewerken: `app/api/analyses/[id]/prompts` en `.../prompts/[promptId]` (tekst wijzigen,
  aan- of uitzetten, toevoegen). Bevestigen: `POST /api/analyses/[id]/confirm`: ingelogd, eigenaar,
  status moet `concept_klaar` zijn (409), `mayTriggerCost(..., "meting_starten")` (alleen beheerder),
  `checkBudgetForProfile`, minstens één actieve vraag (409). Dan `enqueueMeasurement(admin, id, 0)` plus
  `enqueueAiOverviewMeasurement` en `enqueueLlmResponseMeasurement` (die doen niets zonder hun
  schakelaar), en `analyses.status = 'meten'`.
- **Waarom.** Een meetronde is de duurste handeling van het product (richtwaarde 0,82 dollar); de klant moet
  eerst akkoord zijn met de vragen die de score bepalen.

**Uitkomst van hoofdstap 7:** een `analyses`-rij op `meten`, een `topic_research`-rij, en actieve `prompts`
(standaard 30) met volumeband. Analysestatussen: bijlage C.

---

## Hoofdstap 8. De meting

*Wie: niemand, het loopt vanzelf na de poort. Kost: richtwaarde 82 dollarcent per meetronde, waarvan ongeveer
95 procent in het stellen van de vragen zelf (`CLAUDE.md`).*

**Doel van de hoofdstap.** Vaststellen of het merk genoemd wordt als een koper een vraag stelt, hoe prominent,
en wie er in plaats van het merk genoemd wordt. Dit is de nulmeting waartegen later het effect van pagina's
wordt gemeten.

### 8.1 De meettaken worden ingepland

- **Techniek.** `enqueueMeasurement(admin, analysisId, weekNo)` (`lib/jobs/queue.ts`):
  1. Leest alle actieve vragen. **Volledige ronde** bij `weekNo === 0` en bij elke vierde periode
     (`weekNo % 4 === 0`); in de tussenliggende periodes worden vragen overgeslagen die structureel
     merkloos zijn (`maySkip`: eerder gemeten zonder dat de AI enige aanbieder noemde, `elicit_successes`
     en `elicit_samples`).
  2. De `repeatedPromptCount = 8` zwaarste vragen (gewicht `promptWeight()` = volumefactor × waardefactor,
     8.6) worden `measureRepeats = 3` keer gemeten (`repeat_index` 0, 1, 2), de rest één keer. Reden: één
     antwoord kan toeval zijn.
  3. Slaat over wat al gemeten is (`tracking_runs` met `mention_json`) en wat al open in de wachtrij staat.
  4. Voegt de taken in één keer in als `measure_prompt` (`payload: { promptId, weekNo, repeatIndex }`,
     dedupe per analyse, vraag, periode en herhaling); bij een botsing per taak. `analyses.resultaat_gezien_at`
     wordt op `null` gezet.
  Met de schakelaars aan komt daar bij: `measure_ai_overview` (elke vraag `AI_OVERVIEW_REPEATS = 3` keer;
  `AI_OVERVIEW_ENABLED=true`) en `measure_llm_response` (elke vraag één keer, bron Gemini via DataForSEO,
  `DATAFORSEO_LLM_ENABLED=true`, met `GEMINI_AFSTAND_MS = 4000` tussen de taken).
- **Waarom.** Elke meting is een eigen taak zodat een storing één meting kost en niet de hele ronde, en
  zodat een herhaling nooit dubbel betaalt.

### 8.2 Het antwoord van de assistent

- **Wat.** De vraag wordt gesteld zoals een gebruiker hem zou stellen.
- **Techniek.** Taak `measure_prompt` → `measurePromptById()` → `measureOnePrompt()` (`lib/pipeline/measure.ts`).
  De functie zoekt eerst of de meting al bestaat (`tracking_runs` op analyse, vraag, engine, periode en
  herhaling) en slaat de aanroep dan over. Anders `engine.callPlain()` (`lib/engines/openai.ts`): Luna
  (`MODELS.quality`) met **web-zoeken** tenzij `MEASURE_WEB_SEARCH=false`. De opdracht is vast
  (`SIMULATE_SYSTEM`): *"Je bent een behulpzame AI-assistent (zoals ChatGPT) die vragen van gebruikers
  beantwoordt. Gebruik web search om actuele, feitelijke informatie te vinden. Noem concrete merken,
  bedrijven of bronnen waar relevant voor het antwoord. Antwoord in het Nederlands, zoals je dat voor een
  echte gebruiker zou doen die deze vraag stelt."* De invoer is alleen de vraagtekst. De aanroep draait bewust **zonder `work`**, dus zonder
  temperatuur en zonder ingestelde denkinspanning: de app meet wat een assistent op standaardinstellingen doet,
  niet wat hij doet als de app aan de knoppen zit.
  Een antwoord korter dan 40 tekens is een meetfout (een fout, geen nulscore).
  Opslaan in `tracking_runs`: `prompt_text_snapshot`, `prompt_category_snapshot`, `prompt_weight` (op dat
  moment), `engine`, `model_used`, `week_no`, `purpose = 'periodic'`, `repeat_index`, `raw_response`,
  `openai_response_id`, tokens en kosten. Een botsing op de unieke index (parallelle werker) haalt de bestaande
  rij op.
- **Waarom.** Het antwoord (8.2) en de beoordeling (8.3) zijn los herhaalbaar: een mislukte beoordeling betaalt
  nooit opnieuw voor het antwoord.
- **Let op.** Dit is een nabootsing van een gebruiker via de API, met een eigen opdracht en met zoeken. Het is
  niet hetzelfde als wat een gebruiker in de ChatGPT-app ziet (ander model, geen geschiedenis, geen locatie). De
  opdracht vraagt het model bovendien om merken te noemen, wat de kans op vermeldingen kan verhogen.

### 8.3 Wie wordt er genoemd?

- **Techniek.** `judgeRun()` (`lib/pipeline/measure.ts`). Bestaat `mention_json` al, dan niets doen
  (idempotent). **AI-aanroep** (kind `measure_mention`): Luna, `deterministic`, zonder zoeken, opdracht en
  invoer uit `lib/openai/mention-prompt.ts` (bewust zonder afhankelijkheden, zodat `npm run eval:mention`
  exact dezelfde opdracht test). Invoer: het eigen merk met onderwerp, de andere schrijfwijzen, de gelijknamige
  bedrijven die niet het eigen merk zijn (`name_exclusions`), en het antwoord uit 8.2. Uitvoer volgens het
  schema `Mention`: per merk `entity`, `isOwnBrand`, `mentioned`, `position` (het hoeveelste merk), `role`
  (`eerste_aanbeveling`, `een_van_meerdere` of `zijdelings`) en `citedSources`. Over het eigen merk geeft het
  model altijd een oordeel, ook als het niet genoemd wordt; andere merken alleen als ze echt bij naam
  genoemd worden ("Verzin niets"); bij twijfel tussen de eerste twee rollen geldt `een_van_meerdere`.
- **Vangnet in code.** `mentionSurvivesTextGuard()` (`lib/entities/normalize.ts`): `mentioned` telt alleen als
  het model het zegt **en** minstens één kandidaatnaam (het eigen merk, de aliassen, of bij een ander merk
  de eigen naam) ook echt als los woord in de ruwe tekst staat. `normalizePosition()` maakt van een ongeldige
  positie `null`.
- **Onleesbare uitvoer.** Levert de aanroep geen geldig schema (het model begint soms hardop te "denken"),
  dan volgt één tweede poging met denkinspanning `judging` in plaats van `deterministic`
  (`isOnleesbaarAntwoord`, `lib/openai/onleesbaar.ts`, besluit V12 van 29 september 2026).
- **Data uit.** `tracking_run_mentions` (per merk: `entity_name`, `is_own_brand`, `mentioned`, `position`,
  `mention_role`, `cited_sources`), en `tracking_runs.mention_json`. De oude mentions van die run worden eerst
  verwijderd, zodat een herhaling niet dubbel telt.
- **Waarom.** Dit is de belangrijkste aanroep van het product: elk cijfer, elk rapport en elke aanbeveling
  hangt eraan.

### 8.4 De merken worden ingedeeld

- **Wat.** Is een genoemd merk een echte concurrent, of iets anders?
- **Techniek.** In `computeAggregates()` (8.6), per gevonden merk: `resolveEntity()` (`lib/entities/resolve.ts`)
  normaliseert de naam (`normalizeEntityName`) en koppelt aan een rij in `entities` (met aliassen; onbekend
  wordt een nieuwe rij). Rollen die nog `onbepaald` zijn gaan in batches door
  `classifyPendingEntities()` (`lib/pipeline/classify-entities.ts`): het eigen merk en de merken die de
  klant zelf voert worden in code herkend (`eigen_merk`, `eigen_product`) zonder model; de rest krijgt **AI**
  (kind `classify_entities`, Luna, `deterministic`): `concurrent` (biedt in de kern hetzelfde aan dezelfde
  klantgroep), `brancheorganisatie`, `vergelijker`, `niet_relevant`. Bij twijfel: het andere, want "een merk
  dat onterecht als concurrent telt, vervuilt het cijfer van de klant". Een oordeel dat een mens gaf
  (`role_source`) wordt nooit overschreven; alleen `role_source = 'onbepaald'` wordt gevraagd.
- **Waarom.** Een marktplaats of vergelijker die genoemd wordt is geen alternatief voor de klant.

### 8.5 De meting wordt afgesloten

- **Techniek.** Elke meettaak roept `scheduleAggregateIfLastPrompt()` aan: zijn er voor deze analyse en
  periode geen openstaande meettaken meer (alle drie de soorten `measure_prompt`, `measure_ai_overview` en
  `measure_llm_response`, minus de taak zelf), dan wordt `aggregate_week` ingepland (idempotent op
  `dedupe.aggregateWeek`). Een definitief mislukte meettaak roept dezelfde functie aan (`scheduleFollowUpAfterFailure`),
  zodat één falende vraag de analyse niet laat hangen.
- **Bruikbaarheidsdrempel.** `aggregate_week` roept eerst `measurementIsUsable()` aan: het aantal gemeten en
  beoordeelde vragen van de primaire engine (herhaling 0) gedeeld door het aantal actieve vragen moet
  minstens `MIN_SUCCESS_RATIO = 0,7` zijn. Anders een fout: bij de nulmeting gaat de analyse meteen op
  `mislukt`; bij een latere periode gebeurt dat na de vierde mislukte poging, want `aggregate_week` is een
  blokkerende taaksoort (0.3). Is de verhouding groter dan 0,7 maar kleiner dan 1, dan wordt de score op
  dat deel gebaseerd, met een waarschuwing in de logs.
- **Waarom.** Een score op te weinig vragen is een gok. Liever geen score dan een verkeerde (conventie 3).

### 8.6 De score

- **Techniek.** `computeAggregates()` (`lib/pipeline/measure.ts`), per analyse en periode:
  1. **Alleen de primaire engine (ChatGPT) telt voor de hoofdscore.** Andere bronnen (AI Overview, Gemini)
     zijn gemeten en beoordeeld maar staan alleen in `visibility_scores.per_engine_json`, met een eigen score,
     foutmarge en aantallen.
  2. **Herhalingen tellen als één vraag.** `shareByRun()` (`lib/pipeline/question-share.ts`): elke meting
     van een vraag telt met gewicht 1 gedeeld door het aantal metingen van die vraag. Zo gaat een driemaal
     gemeten vraag niet zwaarder meetellen.
  3. **Vragen zonder aanbieder tellen niet mee.** `countBrandsPerRun()` telt per antwoord de genoemde aanbieders
     (concurrenten, vergelijkers, brancheorganisaties, eigen producten, plus het eigen merk als dat genoemd
     wordt). Een antwoord met nul aanbieders is "merkloos" (`brandless_runs`) en telt niet mee in de score en
     niet als gemiste kans: dat is geen verlies maar een kans om de eerste te zijn. Het aantal wordt op
     `tracking_runs.brands_in_answer` bewaard en werkt `prompts.elicit_*` bij (`brand_eliciting`).
  4. **De score** = het aandeel "winbare" vragen waarin het eigen merk genoemd wordt, in procenten:
     `score = round(genoemd / winbaar × 100)`. Daarnaast de **gewogen score** (`weighted_score`), waarbij
     elke vraag meetelt met `prompt_weight × aandeel`. Het vraaggewicht (`lib/pipeline/prompt-weight.ts`) is
     `volumefactor × waardefactor`: volumefactor `hoog` 1,0, `midden` 0,5, `laag` 0,2 (standaard `midden`);
     waardefactor `transactional` 1,0, `commercial` 0,6, `informational` 0,3 (standaard 0,6); ondergrens
     0,02.
  5. **Onzekerheid.** `score_stderr` (`binomialStderr`) en `weighted_stderr` (`weightedScoreStderr`), voor de
     foutmarge die de klant ziet.
  6. **Extra kengetallen:** `avg_position` (gewogen gemiddelde positie), `citation_count` (hoe vaak de bron
     het eigen domein bevat), `first_mention_count` (rol `eerste_aanbeveling`), `share_of_voice` (eigen
     vermeldingen gedeeld door eigen plus die van bevestigde concurrenten), `judged_runs`, `winnable_runs`.
  7. Upsert in `visibility_scores` op (`analysis_id`, `week_no`).
  8. **Concurrentenoverzicht.** `competitor_breakdown` per bevestigde concurrent (`entity_role =
     'concurrent'`, niet afgewezen): vermeldingen per categorie, de bronnen die hem onderbouwen (maximaal 5),
     `winning_run_ids` (antwoorden waarin hij genoemd wordt en het eigen merk niet) en `losing_run_ids`,
     gemiddelde positie, en hoe vaak hij zijn eigen site laat citeren. Alleen concurrenten met minstens één
     vermelding worden opgeslagen.
- **Waarom.** De regels rond merkloze vragen en herhalingen houden de score eerlijk: zonder dat zou een
  goed meetbare vraag zwaarder wegen dan een moeilijk meetbare, en zou een vraag waarop niemand wint als
  verlies tellen.
- **Daarna.** `aggregate_week` zet bij de nulmeting `analyses.status = 'gemeten'` en plant
  `profile_competitors` in.

### 8.7 Het concurrentprofiel

- **Techniek.** Taak `profile_competitors` (`profileCompetitors()`, `lib/pipeline/competitor-intel.ts`): de
  acht concurrenten met de meeste vermeldingen (`MAX_COMPETITORS = 8`), alleen bij minstens 2 vermeldingen
  (`MIN_MENTIONS = 2`). **AI-aanroep** (kind `competitor_intel`): Luna, `deterministic`. Invoer: per
  concurrent de fragmenten uit de antwoorden waarin hij voorkomt. Opdracht: "Je destilleert alleen wat er
  staat": kies per aanbieder eigenschappen uit een vaste lijst, elk met een letterlijk citaat als bewijs; een
  lege lijst is een geldig antwoord. Opslaan in `competitor_breakdown.attributes_json` en `why_summary`.
  Een fout wordt gelogd; de keten loopt door naar het rapport.
- **Waarom.** Zo ziet de klant waarom een concurrent genoemd wordt, met bewijs en zonder dat het model iets
  bijverzint.

**Uitkomst van hoofdstap 8:** `tracking_runs` en `tracking_run_mentions` per vraag en herhaling,
`visibility_scores` voor periode 0, `competitor_breakdown`, `entities`, en een analyse op `gemeten`.

---

## Hoofdstap 9. Het rapport en de kansen

*Wie: niemand. Kost: een paar dollarcent per rapport.*

**Doel van de hoofdstap.** Van meting naar besluit: waar verliest het merk, waarom, en welke pagina's zijn nodig
om dat te veranderen. De aanbevelingen worden later de kaarten in het contentplan.

### 9.1 Wat zijn de gemiste vragen?

- **Techniek.** `computeMissedPrompts()` (`lib/pipeline/report.ts`) en `bepaalGemisteVragen()`
  (`lib/pipeline/missed-prompts.ts`), zonder model. Alleen antwoorden met minstens één genoemde aanbieder
  tellen (`brands_in_answer !== 0`), en alleen als het eigen-merk-oordeel bestaat. Een vraag is per bron
  gemist als meer dan de helft van de metingen van die bron het eigen merk niet noemde; een vraag is gemist
  als minstens de helft van de bronnen hem als gemist telt (een meerderheidsregel over alle bronnen,
  ChatGPT, AI Overview en Gemini). Elke gemiste vraag krijgt een code (V1, V2, ...) en een representatieve
  meting.
- **Waarom.** De aanbevelingen mogen alleen steunen op vragen die daadwerkelijk gemist zijn, met een concreet
  antwoord als bewijs.

### 9.2 Het bewijsdossier en de structuur

- **Techniek.** `buildEvidenceDossier()` (`lib/pipeline/evidence.ts`): per gemiste vraag welke merken in dát
  antwoord genoemd werden. `assessStructureCoverage()` (`lib/pipeline/structure-gap.ts`) legt de aanbodboom
  naast de bestaande pagina's van de site en bepaalt per dienst of er een eigen pagina is, een zwakke, of
  geen. `computePeriodChange()` (`period-change.ts`) vergelijkt met de vorige periode. Alles code.

### 9.3 De gaten

- **Techniek.** **AI-aanroep** (kind `gap_analysis`): Luna, `analytical`, zonder zoeken (`GAP_SYSTEM`).
  Invoer: merk en onderwerp, branche, wat de site al over het onderwerp zegt (`topic_research`), de score,
  het bewijsdossier en het marktbeeld over de hele meting (per concurrent vermeldingen, positie, waarom
  genoemd, bronnen). Opdracht: "Je bent een GEO-analist." Vind de categorieën waarin concurrenten vaker
  genoemd worden, met bewijs; prioriteer op de vragen met het hoogste gewicht; noem een concurrent bij een
  vraag alleen als die naam onder die vraag in het dossier staat.

### 9.4 Het rapport en de aanbevelingen

- **Techniek.** **AI-aanroep** (kind `report`): Luna, **`judging`** (denkinspanning middel), zonder zoeken
  (`REPORT_SYSTEM`, `buildReportInput`). Tot 29 september 2026 was dit `analytical` (denkinspanning laag);
  het rapport kreeg meer denktijd omdat hier beslist wordt welke pagina's er komen (besluit V6, B-b). Op
  productie duurde het rapport daarvoor hooguit 29 seconden en kostte het 0,0035 dollar. Invoer: alles van 9.3
  plus de uitkomst daarvan, het aantal vragen en metingen, de
  bestaande pagina's van de site (maximaal 150 adressen), de diensten zonder eigen pagina, het doel over twaalf
  maanden, het seizoen, de commerciële sturing uit het gesprek (prioriteiten, groeiregio's, doelgroepen,
  verboden onderwerpen, bewijs buiten de site), en **de open kansen van het hele merk** (`openKansenBlok()`,
  `lib/kansen/samenvoegen.ts`: hooguit `OPEN_KANSEN_MAX = 40` kansen met status `open`, `ingepland`,
  `in_voorbereiding` of `te_herzien`, elk met een code K1, K2, ..., de titel, de rol en het adres bij een
  verbetering; besluit V7). Opdracht: een kort jargonvrij rapport voor een ondernemer,
  eindigend in aanbevelingen. **Een aanbeveling beschrijft een pagina, geen opdracht** (besluit V6):
  `title` is het onderwerp zoals een bezoeker het zou zoeken, nooit een gebiedende wijs of een belofte; `rol`
  zegt in één zin wat deze pagina doet dat de andere pagina's van het merk niet doen; `kernvraag` is de ene
  vraag die de pagina moet beantwoorden om bestaansrecht te hebben; `why` is de onderbouwing uit de meting,
  zonder schrijfinstructies. Verder per aanbeveling: **verbeteren** (het adres letterlijk uit de lijst) of
  **nieuw**; welke gemiste vragen (V-codes) de pagina moet winnen, minimaal één; een rangnummer; in
  `targetIntent` de lezer in één zin ("niet 'Daklekkage Apeldoorn' maar 'iemand met water door zijn plafond
  die vandaag hulp zoekt en wil weten wat een reparatie kost'"); en `bestaandeKans`: de K-code van een open
  kans die deze aanbeveling versterkt, of `null`. Het aantal aanbevelingen ligt niet vast: een aanbeveling
  alleen als (1) er een gemeten gemis met bewijs is, (2) de klant er via zijn aanbod of feiten iets echts over
  te zeggen heeft, (3) geen bestaande pagina het al goed dekt, (4) hij niet overlapt, en dat laatste geldt
  sinds V7 voor het hele merk, niet alleen voor dit rapport. Wat afvalt komt in
  `declinedGaps` met de reden. Het model levert ook `factRequests`, maar die worden sinds besluit V3 (27
  september 2026) geen vragen aan de klant meer en blijven in de ruwe uitvoer.
- **Code daarna, in deze volgorde** (`generateReport()`):
  1. `resolveTargets()` koppelt de V-codes aan de vraag en het `runId` van de meting, zet de K-code om in het
     id van de kans (`bijKans`; een onbekende code wordt `null`), en maakt van een lege of nietszeggende
     `rol` of `kernvraag` ("onbekend", "nvt") `null`;
  2. `mergeOverlappingRecommendations()` voegt overlappende aanbevelingen samen;
  3. `reconcileExistingPageActions()` (`existing-page-match.ts`, zonder model) herrekent uit de gecrawlde
     pagina's (termoverlap op woordstammen, `page-relevance.ts`) of een aanbeveling iets dekt wat de site al
     heeft, en corrigeert `action` en `existingUrl` waar het model en de site uit elkaar lopen (een verzonnen
     adres, een "nieuw" terwijl de pagina al bestaat, een adres zonder domein); de correcties worden gelogd.
     Aanleiding: op productie gaf het model bij een nieuwe aanbeveling toch een adres op, of claimde het
     "verbeteren" met een pad dat nergens in de crawl voorkomt;
  4. `validateReportClaims()` (`validate-claims.ts`) verwijdert beweringen die het bewijs niet dragen, zoals
     een concurrentnaam die niet onder die vraag in het dossier staat (`stripped_claims_json`);
  5. `rangschikAanbevelingen()` sorteert op groeidoelen en laat aanbevelingen over aanbod dat de klant
     niet wil (`deprioritised_offerings`) weg;
  6. `eenVerbeteringPerAdres()` zet een tweede verbetering van dezelfde pagina om naar een nieuwe pagina;
  7. `correctQuestionCount()` en `vulBronnenAan()` zetten het aantal onderzochte vragen en de genoemde bronnen
     in de tekst recht.
- **Idempotent.** Bestaat er al een rapport voor deze periode, dan geen aanroep, alleen de status wordt
  bijgewerkt.
- **Data uit.** `reports` (`summary`, `gaps_json`, `recommendations_json`, `declined_json`,
  `stripped_claims_json`, `change_json`, en de volledige ruwe uitvoer van beide aanroepen in
  `gap_analysis_raw_json` en `raw_json`), `analyses.status = 'gereed'`. Elke aanbeveling heeft `targets` met de
  vraagtekst en het `runId` van de meting, en (in rapporten vanaf 29 september 2026) `rol`, `kernvraag` en
  `bijKans`. Bij oudere rapporten zijn die drie `null` (`readRecommendations()`).
- **Waarom.** Het bewijs staat per vraag in het rapport. Zo kan later per pagina worden bepaald voor welke
  vragen die pagina is gemaakt (17.1).

### 9.5 Van aanbeveling naar kans

- **Wat.** Sinds N2 (27 september 2026) wordt elke aanbeveling ook een **kans**: een eigen object met bewijs
  per bron, een commerciële waarde en een kennisgat. Sinds 29 september 2026 wordt een aanbeveling voor een
  pagina waar al een open kans voor is, geen tweede kans maar extra bewijs bij die kans (stap 2).
- **Techniek.** `legKansenVast()` (`lib/kansen/uit-rapport.ts`, de enige schrijver in `kansen` en
  `kans_bewijs`, gooit nooit een fout) na het opslaan van het rapport:
  1. `kansUitAanbeveling()` (`lib/kansen/rapport.ts`) maakt per aanbeveling een kans (`titel`, `handeling`
     `nieuwe_pagina` of `pagina_verbeteren`, `lezer`, `doelvragen`; de hele aanbeveling, met `rol` en
     `kernvraag`, staat in `kansen.ruw`);
  2. **Eén kaart per pagina** (besluit V7 en V20, 29 september 2026). Vóór een nieuwe kans wordt aangemaakt,
     beslist `kiesDoelKans()` (`lib/kansen/samenvoegen.ts`, puur) of hij bij een open kans van hetzelfde merk
     uit een **ander** rapport hoort (status `open`, `ingepland`, `in_voorbereiding` of `te_herzien`). Drie
     regels, in deze volgorde: het rapport wees die kans zelf aan (`bijKans`); beide verbeteren dezelfde
     bestaande pagina (adres vergeleken met `canonicalKey`, dus `www` en een slash aan het eind tellen niet);
     of de nieuwe kans is een nieuwe pagina die op precies één meetvraag rust en de open kans heeft die vraag
     ook. Is dat zo, dan wordt de nieuwe kans **extra bewijs** bij de open kans (`voegToeAlsBewijs()`): het
     bewijs van alleen de doelvragen die de open kans nog niet had wordt per bron opgeteld (`telBewijsOp()`:
     aantallen opgeteld, concurrenten en metingen zonder dubbelen), zodat één vraag nooit twee keer meetelt,
     en de uitleg van de open kans wordt opnieuw berekend. De nieuwe kans wordt toch vastgelegd, met status
     `vervallen` en in `ruw` een verwijzing (`samengevoegdMet`, `samenvoegReden`), zodat een tweede aanroep
     niets dubbel toevoegt (conventie 9) en terug te zien is waar hij bleef; de voorraad (10.1) slaat
     vervallen kansen over, en het kennisoverzicht telt zo'n kans niet als "geraakt door een kenniswijziging"
     (`geraaktOverzicht()`). Binnen één rapport voegt deze stap
     niets samen: daar doen `mergeOverlappingRecommendations()` en `eenVerbeteringPerAdres()` dat al (9.4).
     Aanleiding: in ronde 1 van de contentkwaliteit wezen drie rapporten van hetzelfde merk naar dezelfde
     pagina, en stonden er twee vervangingen voor één adres in het plan;
  3. **bewijs per bron** (`bewijsUitMetingen`): voor ChatGPT, AI Overview en Gemini hoeveel vragen gemeten en
     genoemd zijn en welke concurrenten genoemd werden, en of het eigen domein geciteerd wordt
     (`eigenSiteGeciteerd`: `true`, `false` of `null` zonder meting). Twee bronnen komen op andere momenten
     bij: Search Console (vertoningen, klikken, positie) na elke geslaagde `gsc_sync`
     (`lib/kansen/uit-search-console.ts`, alleen bij een bestaande kans, geen nieuwe kans puur uit een
     zoekterm), en `consultant` bij een handmatige kans. De bewijssoort `structuur` (een dienst zonder pagina)
     bestaat in de volgorde en de uitleg (`lib/kansen/prioriteit.ts`), maar een plek in de code die hem
     schrijft heb ik niet gevonden;
  4. `commercieleWaardeVan()`: `voorrang`, `gewoon` of `minder`, als een dienst die de klant voorrang (of
     juist minder aandacht) gaf letterlijk in de titel, de lezer of een doelvraag van de kans staat (besluit
     B32; op woordstammen, zonder koppeling aan het aanbod);
  5. `geldtVoorVan()`: de werkgebieden (kennisitems) die letterlijk in de kans voorkomen. Sinds besluit B32
     (29 september 2026) hangt een kans **niet** meer aan diensten of producten; alleen aan plaatsen;
  6. `kennisgatVan()` (`lib/kansen/kennisgat.ts`): een vaste lijst van wat er per soort pagina nodig is (prijs,
     termijn, voor wie het niet is, enzovoort), per behoefte `bekend`, `afgeleid` of `onbekend`, zonder model;
  7. de afhankelijkheden (kans leunt op kennisitems, 4.5) worden vastgelegd.
  Het kennisgat gaat sinds besluit V19 niet meer naar de brief en staat sinds besluit B-j ook niet meer op de
  kaart in het plan (daar staat nu de kaartzin, 10.1); de consultant ziet het nog in de kennisronde van het
  gesprek (5.1), en het telt mee in de volgorde van de kansen (hieronder).
- **De volgorde van kansen** (`ordenKansen`, `lib/kansen/prioriteit.ts`, zonder model, in vier lagen waarvan
  elke alleen beslist als de vorige gelijk is): (1) commerciële waarde (voorrang, dan gewoon of onbekend, dan
  minder), (2) het aantal bronnen dat de kans steunt, (3) de potentiescore, (4) het kennisgat (minder
  ontbrekend eerst). Reden voor lagen in plaats van één gewogen score: gewichten zijn een gok zolang er geen
  gepubliceerde pagina is om ze aan te toetsen, en een volgorde die een model bepaalt is niet uit te leggen aan
  een klant.
- **De potentiescore** (`lib/potential.ts`, `potentialScore`): `round((100 − zichtbaarheid) / 100 ×
  zoekvolume-index)`, met zichtbaarheid het aandeel gemeten vragen waarbij het merk genoemd wordt en de
  zoekvolume-index (0 tot 100) een relatieve schatting per onderwerp (`recalibrateSearchVolume`,
  `lib/pipeline/search-demand.ts`, kind `search_demand_calibration`, Luna, `content`, één aanroep voor alle
  onderwerpen van het merk). Onbekend blijft `null`.

### 9.6 Wat er daarna op de achtergrond gebeurt

- **Techniek.** `generateReport()` plant `offsite_scan` in (hoofdstap 18) en, bij de nulmeting,
  `recalculate_potential` (de zoekvolume-herkalibratie hierboven). Is `EMAILS_ENABLED` uit, dan komt er geen
  rapportmail. `werkKennisgatBij()` werkt de kennisgaten bij. De analyse gaat op `gereed`.

**Uitkomst van hoofdstap 9:** een `reports`-rij, `kansen` met `kans_bewijs`, een analyse op `gereed`.

---

## Hoofdstap 10. Het contentplan

*Wie: de consultant, samen met de klant. Waar: Strategie, Contentplan (`/merk/[id]/strategie/plan`). Kost:
niets tot het vrijgeven van een maand.*

**Doel van de hoofdstap.** Van losse kansen naar een planning: welke pagina's in welke maand, binnen het
verkochte pakket. Het vrijgeven van een maand is het moment waarop de klant akkoord geeft en het schrijfwerk
begint.

### 10.1 De kansen komen in de voorraad

- **Techniek.** `syncBacklog()` (`lib/plan-backlog-data.ts`) draait bij elke keer dat het plan geladen wordt
  en ook bij het opstellen van een plan. Eerst roept hij `legKansenVast()` (9.5) aan voor het meest recente
  rapport van elke analyse (een vangnet voor rapporten van vóór de kansen); daarna komt per kans van die
  rapporten die niet `vervallen` is (een kans die als bewijs bij een andere kans ging, telt dus niet mee) een
  kaart in `planned_pages` met `plan_month_id = null` (de voorraad), `source_ref =
  '<rapport-id>#<volgnummer>'` (de lijn terug naar de meetvragen), `source_analysis_id`, `potential`,
  `target_weight`, de funnelfase (`faseVoorPagina`), de handeling en (bij verbeteren) het bestaande adres,
  en `kans_id`. Een kaart wordt nooit gewist. Handmatige kansen (`lib/kansen/handmatig.ts`,
  `POST /api/profiles/[id]/kansen/handmatig`, alleen de consultant) komen zonder gemeten cluster binnen:
  een meteen gearchiveerde schaduwanalyse dekt alleen de databasekoppeling, de opgegeven doelvragen worden als
  `prompts` bewaard maar niet gemeten.
- **Waarom.** Eén voorraad waaruit consultant en klant plannen, met de herkomst van elke kaart terug te
  vinden.
- **De kaartzin voor de consultant** (besluiten V8, V19 en V20, B-j; 29 september 2026). Alleen een beheerder
  ziet onder een kaart één zin (`kaartZin()`, `lib/kansen/kaart.ts`, puur; samengesteld in `loadPlan()`,
  `lib/plans.ts`): "Voorrang van de klant." als `kansen.commerciele_waarde = 'voorrang'` (9.5); "Rust op één
  meetvraag." bij een gemeten kans met precies één doelvraag (`rustOpEenVraag()`); en de stand van de
  kernvraag van de pagina ("Kernvraag beantwoord.", "Kernvraag wacht op antwoord." of "Kernvraag niet
  beantwoord."), via de pagina op de kaart, `brief_json.kernvraagId` (11.2) en de stand van die vraag in
  `fact_requests`. Zonder iets te melden staat er niets. De zin staat op elke kaart in de voorraad, en op een
  kaart in een maand zolang die nog `gepland` is. Hij houdt niets tegen (besluit B5): de consultant kan de
  kaart wisselen of de klant nog even bellen. Tot 29 september 2026 stond hier het kennisgat ("Nog niet
  bekend: prijs, werkwijze en voorbeeld"), dat bij bijna elke kaart hetzelfde was.

### 10.2 Het plan opstellen

- **Techniek.** `POST /api/profiles/[id]/plan` (`mayTriggerCost("content_schrijven")`, `checkBudgetForProfile`,
  eigenaar, het merk moet aan een account hangen en dat account moet een pakket hebben: 400 anders). Optioneel
  een `strategyNote` (maximaal `MAX_STRATEGY_NOTE_LENGTH`). `createPlan()` (`lib/plans.ts`):
  1. `ensureFunnels()` en `syncBacklog()`; een eerder plan wordt op `gestopt` gezet (nieuwe `version`);
  2. is er geen enkele kaart in de voorraad, dan een melding dat er eerst gemeten moet worden;
  3. maakt een `content_plans`-rij (`pages_per_month` = het pakket, `started_on`) en `MONTHS_AHEAD = 12`
     lege `plan_months`;
  4. `vulOpenMaanden()` → `bepaalVulling()` (`lib/plan-fill.ts`): verdeelt de voorraad, gesorteerd op
     potentie (`compareByPotential`), over de open maanden in volgorde, tot het pakket per maand vol is
     (alleen in maanden waar nog ruimte voor is, zie 10.3). Een bestaande pagina mag niet twee keer in
     dezelfde periode verbeterd worden: minstens `VERBETER_TUSSENRUIMTE_MAANDEN = 3` maanden ertussen. Per maand
     komt daarnaast `BUFFER_PER_MONTH = 1` bufferpagina (`is_buffer`), een reserve voor als een pagina
     uitvalt. De eerste maand met inhoud gaat op `ter_goedkeuring`.
  5. Elke kaart in een maand krijgt een publicatiedatum: `spreadDates()` (`lib/plan-schedule.ts`) verdeelt de
     pagina's gelijkmatig over dag 1 tot en met `LAATSTE_DAG = 28`; in de lopende maand vanaf morgen. Is het
     vandaag de 28e of later, dan is er in de lopende maand geen ruimte en komen de pagina's in de volgende maand.
- **Waarom.** Het pakket bepaalt de capaciteit; de potentie bepaalt de volgorde; buffers vangen uitval op.

### 10.3 Kaarten verschuiven

- **Techniek.** `POST /api/profiles/[id]/plan/pages/[pageId]` met `actie`: `inplannen` (van de voorraad naar
  een maand, `assignToMonth`), `naar_voorraad` (terug, alleen als de pagina nog `gepland` is), `verplaats`
  (omhoog of omlaag binnen de maand, `swapWithNeighbour`), `datum` (handmatige publicatiedatum,
  `scheduled_manual`), `goedkeuren`, `afwijzen`, `geplaatst` en `schrijf_nu` (10.5). Dit kost niets en de
  klant mag het ook. Na het inplannen in een reeds vrijgegeven maand start meteen de voorbereiding van die
  pagina (`bereidVoor`, hoofdstap 11).

### 10.4 De maand vrijgeven

- **Wat.** Dit is de handeling die geld kost: alleen de consultant. De klant zegt akkoord, de consultant drukt.
- **Techniek.** `POST /api/profiles/[id]/plan/months/[monthId]` met `actie: "goedkeuren"`:
  `mayTriggerCost("plan_goedkeuren")` (alleen beheerder), `checkBudgetForProfile`, `approveMonth()`
  (`plan_months.status = 'goedgekeurd'`), dan `bereidMaandVoor()` voor alle pagina's van die maand
  (`status = 'gepland'`, geen buffer). Mislukt de voorbereiding, dan pakt de ochtendronde (11.6) hem op.
  Overige acties: `afwijzen` (maand op `afgewezen`) en `alles_geplaatst` (bulk: een lijst pagina's als
  geplaatst markeren, `kiesVoorBulk`).
- **Waarom.** De maand vrijgeven is de bewuste betaalhandeling: vanaf hier gaat het schrijven kosten maken.

### 10.5 Nu laten schrijven

- **Techniek.** `actie: "schrijf_nu"` op een plan-pagina: alleen een beheerder, `checkBudgetForProfile`,
  `bereidVoor(..., { negeerMaand: true })` en `probeerTeSchrijven(..., { negeerDatum: true })`. De maand en de
  publicatiedatum tellen dan niet, de openstaande vragen wel (13.1).
- **Waarom.** Een snelle doorloop bij een test of demonstratie, zonder de poort met de vragen te omzeilen.

**Uitkomst van hoofdstap 10:** `content_plans`, `plan_months` (12), `planned_pages` met datum, en voor een
vrijgegeven maand een voorbereiding per pagina die nog niet is begonnen.

---
## Hoofdstap 11. De voorbereiding van een pagina

*Wie: niemand, het loopt vanzelf na het vrijgeven van een maand (10.4) of het inplannen in een vrijgegeven
maand. Duur: volgens de projectdocumentatie ongeveer een halve minuut per pagina, na elkaar. Kost:
richtwaarde 6 tot 7,5 dollarcent per pagina.*

**Doel van de hoofdstap.** Per pagina uitzoeken wat een goede pagina over dit onderwerp moet behandelen, en
welke vragen de ondernemer moet beantwoorden om de pagina eigener te maken dan een concurrent of een AI zonder
hem kan. Vanaf hier werkt de contentketen die op 25 en 26 september 2026 opnieuw is gebouwd
(`docs/tasks/contentketen-opnieuw.md`).

### 11.1 Per pagina komt een paginarij en een open vraag

- **Techniek.** `bereidMaandVoor()` en `bereidVoor()` (`lib/pagina/start.ts`). Per plan-pagina:
  1. Alleen pagina's met status `gepland` of `mislukt`, geen buffer (`is_buffer`). Tenzij `negeerMaand` staat
     de maand op `goedgekeurd`.
  2. `clusterVan()`: de analyse (het cluster) waar de pagina bij hoort, via `source_analysis_id` of via het
     onderwerp (`topic_id`). Hangt de pagina aan geen cluster, dan wordt hij niet voorbereid en toont het plan
     "Geen cluster" (`zonderCluster`).
  3. Staat er onder dat cluster al een `content_pieces`-rij met dezelfde titel (`is_current`), dan wordt die
     gebruikt. Anders een nieuwe rij (`status = 'briefing'`, `version = 1`, `is_current = true`,
     `needs_review = false`, `action` nieuw of verbeteren, bij verbeteren `existing_url`), en
     `planned_pages.content_piece_id` wordt gezet.
  4. **De vaste open vraag** (`maakOpenVraag()`, `lib/pagina/open-vraag.ts`): een `fact_requests`-rij met
     `open_vraag = true`, `scope = 'pagina'`, `answer_type = 'tekst_lang'`, `content_piece_ids = [piece]`
     de tekst `Wat wil je zelf vertellen op de pagina "<titel>"?` (de titel erin, omdat `fact_requests` een
     unieke index op merk en vraagtekst heeft) en een vaste uitleg (`openVraagTekst()`, `openVraagUitleg()`,
     `lib/pagina/open-vraag-tekst.ts`). De drie voorbeeldantwoorden (`OPEN_VRAAG_VOORBEELDEN`) staan sinds 30
     september 2026 niet meer als voorbeeldtekst in het invulveld. Dit maakt de code, geen AI, en het is idempotent (bestaat er al een,
     of botst de unieke index, dan doet hij niets). Zo is hij er altijd, ook als de brief mislukt, en nooit
     dubbel.
  5. Voor elk betrokken merk wordt `fact_register` ingepland (4.6): de nieuwe sitefeiten worden ingedeeld,
     zodat conflicterende waarden bij de consultant terechtkomen en niet ongemerkt bij de schrijver.
  6. Pagina's zonder `brief_json` worden gesorteerd op publicatiedatum (dan `sort_order`) en gaan in een rij.
     `planBriefs()` plant alleen de eerste in als taak `pagina_brief`, met de rest van de rij in
     `payload.rij`.
- **Waarom de briefs na elkaar lopen.** De volgende brief moet de vragen zien die de vorige al stelde
  (11.4), anders krijgt de klant vijf keer dezelfde vraag in andere woorden. Briefs van verschillende merken
  mogen wel naast elkaar (`PARALLEL_CONTENT_TYPES`).

### 11.2 De content brief: wat gaat erin, wat komt eruit

- **Techniek.** Taak `pagina_brief` → `voerBriefUit()` → `maakBrief()` (`lib/pagina/brief.ts`). Bestaat
  `brief_json` al, dan geen aanroep (`bestond_al`). Anders wordt de invoer parallel verzameld:
  1. `laadPagina()` (`lib/pagina/context.ts`): titel, soort, nieuw of verbeteren, zoekintentie (uit de pagina,
     anders uit het plan), reden, publicatiedatum, `source_ref`.
  2. `laadMerk()`: naam, werkgebied, concurrenten (het merk plus die van het cluster), aanspreekvorm, verboden
     woorden en onderwerpen, stemvoorbeelden, website.
  3. `laadBedrijf()` en `blokA()`: **blok A**, de bedrijfskennis (11.3).
  4. `laadDoelvragen()`: de gemiste vragen van de aanbeveling (uit `reports.recommendations_json` via
     `source_ref`), elk met het antwoord dat de assistent nu geeft. Daarin worden de namen van concurrenten
     weggehaald (`redactCompetitors`) en het antwoord wordt in de opdracht afgekapt op `ANTWOORD_MAX = 1500`
     tekens.
  5. `eerdereVragen()`: de 200 nieuwste vragen van het merk (zonder de open vragen), met id, stand (open,
     beantwoord, overgeslagen) en, als beantwoord, het antwoord (in de opdracht afgekapt op
     `EERDER_ANTWOORD_MAX = 400`).
  6. `huidigeTekst()` (alleen bij "verbeteren"): de tekst van de bestaande pagina, uit
     `existing_page_text` of anders één keer van de site gehaald (`fetchExistingPage`) en bewaard, met
     `zonderSiteHerhaling()` (13.2) erover, in de opdracht afgekapt op `HUIDIGE_TEKST_MAX = 12.000` tekens.
  7. `merkNamen()`: de merknaam, alle schrijfwijzen en aliassen, voor de controle op vakkennis (11.4).
  8. `laadPaginaDefinitie()` (`lib/pagina/context.ts`): de `rol` en de `kernvraag` van de aanbeveling achter de
     pagina (9.4), via `source_ref`. Bij een rapport van vóór 29 september 2026, een handmatige kans of een
     kans uit Search Console `null`: onbekend, niet leeg (conventie 3).
- **AI-aanroep** (kind `pagina_brief`): **Sol**, `analytical`, **met web-zoeken**. Brief versie
  `BRIEF_VERSIE = 6`. De opdracht (`lib/pagina/brief-opdracht.ts`, `BRIEF_SYSTEEM`), samengevat: "Je bereidt
  één webpagina voor van een Nederlands mkb-bedrijf. Een schrijver maakt de pagina straks; jij zorgt dat hij
  weet wat hij moet weten. Je schrijft zelf geen tekst voor de pagina." Twee taken, en een markering:
  1. **Onderzoek**: de zoekintentie in de woorden van de bezoeker, de deelvragen, de vakkennis (elk punt met het
     webadres waar het gevonden is; zonder adres laten weglaten; over het vak, nooit over dit bedrijf; als
     feit over het onderwerp), en de valkuilen (wat klanten vaak verkeerd begrijpen).
  2. **Vragen aan de ondernemer, hooguit acht** (`MAX_BRIEFVRAGEN`), in vijf soorten: `feit`, `praktijk`,
     `werkwijze`, `twijfel`, `onderscheid`. Een vraag is alleen gerechtvaardigd als (1) de schrijver het
     antwoord kan gebruiken, en (2) het antwoord niet betrouwbaar te halen is uit wat al bekend is, uit de
     eerdere antwoorden, uit algemene vakkennis of uit webonderzoek. Met voorbeelden (slecht, goed, beter) en:
     "stel zo weinig vragen als nodig is", "nul vragen is een goed antwoord", "vraag liever om een voorbeeld
     uit de praktijk dan om een los feit". Vraag niets opnieuw dat in de lijst met eerdere vragen staat, ook
     niet in andere woorden of met een andere plaatsnaam; is zo'n eerdere vraag ook voor deze pagina nuttig,
     zet dan het id in `ook_voor_deze_pagina` (een beantwoorde vraag komt dan met haar antwoord bij deze
     schrijver). Een praktijkvoorbeeld koppel je niet aan een andere pagina: elke pagina krijgt een eigen
     voorbeeldvraag. Noemt de vakkennis iets wat per bedrijf verschilt, vraag dan hoe dit bedrijf het doet.
     Vraagvorm: één vraag vraagt één ding, kort, in "je"-vorm, een vraag naar bewijs is merkbreed. Per vraag
     `waarom` (één zin voor de ondernemer), `antwoord_type` (`ja_nee`, `bedrag`, `getal`, `tekst_kort`,
     `tekst_lang`, `keuze`), `merkbreed` en `kern`.
  3. **De kernvraag** (besluit V8, B-c; versie 6, 29 september 2026): de invoer noemt de kernvraag van de
     pagina uit het rapport ("De kernvraag van deze pagina: ..."). Kan het antwoord daarop alleen van de
     ondernemer komen en staat het nog nergens, dan stelt de brief er een vraag over en zet bij die ene vraag
     `kern: true`; staat er al een vraag over in de eerdere vragen, dan zet hij het id daarvan in
     `kern_eerder`. Is het antwoord al bekend of is er geen kernvraag, dan is `kern` overal onwaar en
     `kern_eerder` `null`.
  De brief krijgt sinds versie 5 **geen** kennisgat meer en **geen** concurrentieanalyse (besluit V19 en B22,
  29 september 2026): het kennisgat is voor de consultant, en concurrentiegegevens leidden de schrijver af.
- **Code daarna** (`verwerkBrief()`, `lib/pagina/brief-regels.ts`):
  1. vakkennis zonder geldig webadres (`http` of `https` met punt in de host) valt weg;
  2. **vakkennis over het bedrijf zelf valt weg** (`overHetBedrijfZelf()`): een bron op het eigen domein, of
     een uitleg die een merknaam van minstens vier tekens noemt (besluit V4);
  3. een vraag die het merk al kreeg valt weg, ook in iets andere woorden (`normaliseerVraag`: kleine letters,
     zonder accenten en leestekens);
  4. hooguit acht vragen; een keuzevraag met minder dan twee opties wordt een korte tekstvraag;
  5. alle tekst gaat door `pasSchrijfregelsToe()` (geen gedachtestreepjes en dergelijke);
  6. `ook_voor_deze_pagina` blijft alleen over voor bestaande vragen met stand `open` of `beantwoord`;
  7. hooguit één vraag houdt `kern`, en nooit een merkbrede vraag (die geldt voor het hele bedrijf, niet
     voor één pagina); `kern_eerder` telt alleen als er geen nieuwe kernvraag is en het id bij een open of
     beantwoorde vraag van het merk hoort, en die vraag wordt dan ook aan de pagina gekoppeld.
- **Opslaan, in deze volgorde:** eerst de vragen (`bewaarVragen()`: `fact_requests` met `scope = 'merk'` of
  `'pagina'`, `kind` uit de soort, `answer_type`, `options`, `content_piece_ids = [piece]`, `required = kern`,
  `raw_json = { bron: 'pagina_brief', soort, kern }`; een unieke-index-botsing wordt genegeerd), dan de
  koppelingen (`koppelVragen()`: de pagina wordt aan een bestaande vraag toegevoegd), dan pas `brief_json =
  { onderzoek, bedrijf: { feiten: [{ id, text }] }, versie, kernvraagId }` (alleen als het nog `null` is).
  `kernvraagId` is het id van de nieuwe kernvraag, of anders `kern_eerder`, of `null`; het staat per pagina en
  niet op de vraag, omdat een eerdere vraag de kern van deze pagina kan zijn en niet van een andere. Reden
  voor de volgorde: anders ziet de poort even nul openstaande vragen en schrijft de app te vroeg.
- **Bij fouten.** Faalt de brief vier keer, dan zet `briefGafOp()` een brief zonder onderzoek
  (`onderzoek: null`) en gaat de pagina door met alleen de open vraag. De tekst wordt minder goed, maar de
  pagina blijft niet hangen.
- **Na de brief** (`naBrief()`): de volgende pagina uit de rij wordt ingepland, en als de schrijfpoort (13.1)
  nu openstaat, start `probeerTeSchrijven()`.
- **Waarom.** De brief is het instrument waarmee de app de kennis van de ondernemer ophaalt: het onderzoek
  maakt de schrijver vakbekwaam, de vragen halen op wat alleen de ondernemer weet.

### 11.3 Wat is "bedrijfskennis" (blok A)?

- **Wat.** Het vaste pakket dat zowel de brief als de schrijver krijgt. De code stelt het samen, geen AI.
- **Techniek.** `laadBedrijf()` (`lib/pagina/context.ts`) roept `kennisVoor()` (`lib/kennis/voor-pagina.ts`)
  aan, dat de kennislaag leest:
  1. `versiesVan()`: alle versies van deze pagina (zelfde cluster en titel; een herschreven pagina krijgt een
     nieuw id).
  2. Alle actuele items van het merk uit `klantkennis` (`vervangen_door is null`).
  3. `kansGeldtVoor`: de werkgebieden van de kans achter de pagina (`planned_pages.kans_id` → `kansen.geldt_voor`
     via `naarActueleVersies`).
  4. `vragenInBlokB`: de vragen die aan een versie van deze pagina hangen (die staan in blok B, 13.2, en niet
     dubbel in blok A).
  5. `blokkadesVoorMerk()`: kennis die op een open conflict staat wordt weggehouden (4.6).
  6. `kiesVoorBlokA()` (`lib/kennis/blok-a.ts`): domein `stem` valt af (dat gaat via de stemvoorbeelden).
     `dienstenVanPagina()` bepaalt eerst de set "waar deze pagina voor geldt": de werkgebieden van de kans, de
     aanbodknopen (dienst of categorie) waarvan een woord van vier of meer letters uit de naam in de titel of
     de zoekintentie voorkomt (sinds besluit B32 altijd zo, er is geen koppeling aan het aanbod meer), en alles
     wat onder zo'n knoop hangt. Daarna beslist `hoortBijPagina()` per item, in deze volgorde: een antwoord dat
     al in blok B staat gaat niet nog eens in blok A; een antwoord uit de tijd vóór V17 dat nog aan diensten of
     plaatsen hangt gaat niet mee; een aanbodknoop gaat alleen mee als hij in de set zit; kennis van één
     bepaalde pagina gaat alleen naar een versie van die pagina; kennis van een ander cluster valt af; kennis
     met `geldt_voor` (bijvoorbeeld een prijs voor een plaats) gaat mee als de pagina voor die plaats of dienst
     geldt; al het overige is merkbreed en gaat altijd mee.
  7. `setVoorBlokA()` (4.4) filtert en sorteert; maximaal `MAX_KENNIS = 150` items.
  8. `blokAUitKennis()` maakt er tekst van, in koppen: "Over het bedrijf", "Aanbod, prijzen en werkwijze",
     "Klanten en hun bezwaren, met het antwoord van de ondernemer", "Wat het bedrijf anders doet", "Bewijs",
     "Verhalen van de ondernemer" en "Wat eerdere pagina's opleverden". Dubbelingen worden verwijderd (op
     genormaliseerde tekst). Een antwoord op een vraag wordt als bewering opgeschreven **zonder de vraag**
     zodra het minstens 40 tekens lang is (`ZELFSTANDIG_ANTWOORD`); een bezwaar zonder antwoord staat apart
     met de tekst dat de ondernemer daar geen antwoord op gaf en dat de schrijver het niet namens hem mag
     beantwoorden. Bovenaan staat een contactblok (`contactBlok`) uit de feiten van de site.
  9. De verboden woorden en onderwerpen gaan niet in blok A maar als huisregel apart mee (13.3).
- **Data uit.** De lijst `gebruikte_kennis` (id's) wordt later op de pagina bewaard (13.5), zodat achteraf
  vastligt op welke kennis een versie leunde.
- **Waarom.** De schrijver mag alleen bouwen op wat de app zeker weet (4.4), en hij mag niet verdrinken in een
  stapel: het oude blok A was een ongeordende lijst, het nieuwe is een gestructureerd dossier per pagina.

### 11.4 Waarom de vragen niet dubbel worden gesteld

- **Techniek.** Drie lagen: het model krijgt de eerdere vragen te lezen (11.2), de code verwijdert
  herhalingen (`verwerkBrief`, punt 3), en de unieke index op `fact_requests` vangt de rest. Een vraag voor
  het hele merk hangt aan geen cluster (`analysis_id = null`); een bestaande open vraag krijgt deze pagina
  erbij.
- **Waarom.** Eén klant beantwoordt liever één keer een vraag dan vijf keer dezelfde.

### 11.5 Als de voorbereiding uitvalt

- **Techniek.** Zie 11.2, "Bij fouten". Daarnaast start de ochtendronde (11.6) elke dag een voorbereiding
  die niet startte.

### 11.6 De ochtendronde

- **Wat.** Een dagelijks vangnet voor alle vrijgegeven maanden.
- **Techniek.** `pg_cron` draait `orbit-engine-plan-writer` met schema `0 4 * * *` (04:00 UTC), die
  `public.trigger_plan_writer()` aanroept, die met `pg_net` `GET /api/cron/plan` doet (zelfde Vault-geheimen
  als de werker). De route (`app/api/cron/plan/route.ts`) draait `ochtendronde()` (`lib/pagina/start.ts`) en
  `planSearchConsoleSync()` (18.3). `ochtendronde()` doet, voor alle `plan_months` met status `goedgekeurd`:
  `bereidVoor()` voor alle pagina's met status `gepland` of `mislukt`, dan `probeerTeSchrijven()` voor elke
  pagina met een `content_piece_id`.
- **Waarom.** Een voorbereiding die niet startte, start dan alsnog; een pagina die aan de beurt is, gaat
  schrijven; een pagina waarvan het schrijven mislukte, krijgt een nieuwe kans.

**Uitkomst van hoofdstap 11:** per pagina een `content_pieces`-rij op `briefing` met `brief_json`, een
`fact_requests`-rij (de open vraag) en tot acht gerichte vragen.

---

## Hoofdstap 12. De vragen aan de klant

*Wie: de klant, of de consultant samen met de klant. Waar: Strategie, Openstaande vragen
(`/merk/[id]/strategie/vragen`), of het scherm van de pagina zelf. Kost: niets.*

**Doel van de hoofdstap.** Ophalen wat alleen de ondernemer weet. Dit is het moment dat het verschil maakt
tussen een eigen pagina en een algemene AI-tekst.

### 12.1 De vragen staan per pagina

- **Techniek.** `components/pagina/vragenlijst.tsx` en het vragenscherm lezen `fact_requests`
  (`status` in `open`, `beantwoord`, `overgeslagen`). Op het scherm van een pagina staat de **kernvraag**
  (`required = true`, 11.2) bovenaan, dan de open vraag met een groot tekstvak, dan de rest; op het
  vragenscherm staat de kernvraag bovenaan de open vragen (`kernvraagEerst()`, `lib/feitenvraag.ts`). Bij de
  kernvraag staat "Zonder dit antwoord wordt deze pagina zwak. Overslaan mag: de pagina wordt dan zonder dit
  stuk geschreven." (`VERPLICHT_UITLEG`), op het vragenscherm met het label "Kernvraag van de pagina". Bij
  elke gerichte vraag staat in één zin waarom hij gesteld wordt (`reason`). De vorm van het invoerveld
  volgt uit `answer_type` en `options` (`vraagVorm()`, `lib/feitenvraag.ts`: keuze, tekstvak, regel, getal,
  bedrag, url); het tekstvak en de regel houden de grens van 1.500 tekens aan, en het tekstvak toont een
  teller (`components/antwoordveld.tsx`).
- **Waarom.** Het antwoord op de open vraag mag niet afhangen van of de klant zelf gaat typen: de consultant
  kan de vragen samen met de ondernemer invullen, in diens woorden. De kernvraag bovenaan helpt juist een
  drukke klant om de ene vraag te beantwoorden die ertoe doet.

### 12.2 Beantwoorden of overslaan

- **Techniek.** `PATCH /api/profiles/[id]/facts` (`app/api/profiles/[id]/facts/route.ts`): ingelogd, eigenaar
  (`getOwnedProfile`), de vraag moet bij het merk horen.
  - **Overslaan** (`skip: true`): `status = 'overgeslagen'`. Dat telt als antwoord voor de schrijfpoort.
  - **Beantwoorden**: een leeg antwoord wordt geweigerd; de lengtegrens is `OPEN_VRAAG_MAX = 3000` tekens voor
    de open vraag en `GERICHT_ANTWOORD_MAX = 1500` voor elke andere vraag, met een duidelijke melding waar de
    grens ligt (nooit meer stil afkappen; besluit V1, 29 september 2026). `answerFact()` (`lib/facts.ts`) zet
    `answer`, `status = 'beantwoord'` en `answered_at`, en legt het antwoord vast in de kennislaag
    (`legAntwoordVast`, actor mens; 4.3). Bij een gerichte vraag beoordeelt `beoordeelClaim()`
    (`lib/pipeline/claim-plausibility.ts`) of het antwoord een marktclaim is die bewijs nodig heeft
    (`needsEvidence` en een hint); dat blokkeert het opslaan niet.
  - Na het antwoord aan de klant draait `after(() => probeerNaAntwoord(admin, factId))`: voor elke pagina in
    `content_piece_ids` van de vraag wordt `probeerTeSchrijven()` aangeroepen (13.1).
- **Waarom.** Er is geen knop "schrijf nu": het laatste antwoord is de handeling. Overslaan mag altijd, zodat
  een ondernemer die een cijfer niet heeft door kan.

### 12.3 Waar een antwoord terechtkomt

| Soort vraag | Gaat naar |
|---|---|
| De open vraag | Letterlijk naar de schrijver van die pagina (blok B, 13.2). Niet in losse feiten geknipt |
| Gerichte vraag van deze pagina | De schrijver van die pagina (blok B), en, als het geen praktijkvoorbeeld is, als kennis voor het hele cluster (blok A van de andere pagina's van dat cluster, V17) |
| Vraag voor het hele merk (`merkbreed`) | Blok A van elke pagina |
| Praktijkvoorbeeld | Alleen die pagina |

Een antwoord kan nog worden aangepast tot het schrijven begint; een gewijzigd antwoord wordt een nieuwe versie
van het kennisitem (4.2).

- **Waarom.** Een praktijkvoorbeeld of het antwoord op de open vraag hoort bij één pagina: op andere pagina's
  hoort een eigen voorbeeld. Een antwoord op een gerichte vraag over bijvoorbeeld prijs of termijn is voor het
  hele cluster nuttig.

### 12.4 Wat er niet meer is

- Sinds A3 en besluit V3 (27 september 2026) stellen het rapport (9.4) en de samenvatting (3.9) geen vragen
  aan de klant meer. Alleen de brief stelt gerichte vragen, naast de vaste open vraag, het merkdossier en,
  sinds 29 september 2026, de vraag van de schrijver (13.5). Een bewakingstest in `scripts/test-unit.ts`
  staat alleen deze vier plekken toe. Wat het onderzoek niet weet, staat als "open punt" op het
  kennisoverzicht van de consultant (5.1).
- **Herinneringen.** Op het startscherm van de klant staat "Wacht sinds ..." (`lib/work.ts`), en het
  CSM-overzicht van de consultant telt pagina's die op antwoorden wachten (`lib/csm.ts`). De e-mail
  (`lib/email/question-reminder.ts`) rijdt mee op `/api/cron/reminders`, die niet in `vercel.json` staat en
  daarom niet automatisch draait (Vercel Hobby-limiet van twee cron-taken); bovendien doet de route niets
  zolang `EMAILS_ENABLED` uit staat. Een klant die zijn vragen laat liggen houdt zijn pagina dus onbeperkt
  tegen (bewust, besluit B5), zonder actieve melding.

**Uitkomst van hoofdstap 12:** beantwoorde of overgeslagen `fact_requests`, nieuwe kennisitems, en per pagina
de vraag "mag hij nu geschreven worden".

---

## Hoofdstap 13. Het schrijven

*Wie: niemand. Duur: volgens de projectdocumentatie ongeveer een minuut per pagina. Kost: richtwaarde 3 tot 4
dollarcent per pagina.*

**Doel van de hoofdstap.** Eén sterke schrijfbeurt die de kennis van de ondernemer, het onderzoek en de stem
van het bedrijf omzet in een pagina die de ondernemer zo op zijn site zet.

### 13.1 De schrijfpoort

- **Techniek.** `probeerTeSchrijven()` (`lib/pagina/start.ts`) met `poortVoor()` (`lib/pagina/brief.ts`) en
  `schrijfpoort()` (`lib/pagina/schrijfpoort.ts`), puur. Een pagina mag geschreven worden als aan twee regels
  is voldaan, en niet meer:
  1. **De brief is klaar en er staan precies nul vragen open.** `openVragenVanPagina()` telt `fact_requests`
     met `status = 'open'` en de pagina in `content_piece_ids`. Weet de code het aantal niet zeker (databasefout,
     `NaN`), dan telt dat als "nog niet". Overgeslagen vragen tellen niet als open.
  2. **De publicatiedatum ligt binnen tien dagen** (`SCHRIJFVOORSPRONG_DAGEN = 10`, `lib/plan-status.ts`): de
     app schrijft op zijn vroegst tien dagen vóór de datum. Zonder datum geldt regel 2 niet.
  Voldoet de pagina, dan wint één schrijver de wedstrijd met een voorwaardelijke update van `status`
  `briefing` naar `draft` (`.eq("status", "briefing")`); alleen wie een rij terugkrijgt plant `pagina_schrijven`
  in. Zo leveren twee antwoorden die tegelijk binnenkomen één tekst op. De plan-pagina gaat op `schrijven`.
  Er komt nooit een schrijftaak met een openstaande vraag, en er is geen uiterste datum.
- **Uitkomsten** (`Schrijfuitkomst`): `ingepland`, `wacht` (met reden `voorbereiding_loopt`, `vragen_open` of
  `nog_niet_aan_de_beurt` en de melding voor de klant, bijvoorbeeld "Nog 2 vragen. Beantwoord of sla ze over,
  daarna schrijven we deze pagina."), `al_bezig`, `geen_pagina`.
- **Waarom.** Schrijven zonder de antwoorden van de ondernemer levert precies de generieke tekst op die de
  keten wil voorkomen. De datumregel voorkomt dat een tekst weken oud is als hij live gaat.

### 13.2 De invoer van de schrijver

- **Techniek.** `laadSchrijfbasis()` (`lib/pagina/schrijven.ts`) verzamelt de invoer (`SchrijfBlokken`) en
  `schrijfInvoer()` (`lib/pagina/schrijfopdracht.ts`) zet hem in deze volgorde in de opdracht:
  1. **De pagina:** titel, soort, nieuw of verbeteren.
  2. **Zoekintentie (blok D):** wat de bezoeker wil (uit de brief, anders uit het plan), de kernvraag van de
     pagina ("De vraag die deze pagina moet beantwoorden: ..."), de rol ("Wat deze pagina doet dat de andere
     pagina's van dit bedrijf niet doen: ...") en de doelvragen (de vragen die mensen aan AI-assistenten
     stellen; alleen de vraagtekst, niet het antwoord). Rol en kernvraag komen uit het rapport
     (`laadPaginaDefinitie()`, 11.2) en ontbreken als ze onbekend zijn (besluit V6, B-b).
  3. **"Wat we zeker weten over het bedrijf" (blok A)**, gemarkeerd als bedrijfskennis (11.3).
  4. **"Wat de ondernemer vertelde" (blok B)**, ook bedrijfskennis: de open vraag letterlijk, de
     antwoorden op de gerichte vragen van deze pagina (`klantinput()`: `fact_requests` met deze pagina in
     `content_piece_ids`, `status = 'beantwoord'`; merkbrede vragen niet), en de gerichte vragen die de
     ondernemer **oversloeg** ("Vragen die de ondernemer oversloeg (hier is geen antwoord op, dus beweer er
     niets over)"; besluit V8, B-c). Een overgeslagen open vraag telt daar niet bij.
  5. **"Wat een goede pagina over dit onderwerp behandelt" (blok C)**, gemarkeerd als algemene kennis, met de
     zin "Dit is onderzoek op het web over het onderwerp, niet over dit bedrijf. Het zegt niet wat dit bedrijf
     doet of belooft.": deelvragen, vakkennis en valkuilen uit de brief.
  6. **"Zo klinkt dit bedrijf":** de stemvoorbeelden (`stemVan()`), elk met `zonderSiteHerhaling()` erover en
     afgekapt op 2.000 tekens; zonder stemvoorbeelden de homepagina vanaf de eerste alinea. Met de zin:
     "Neem de toon, de zinsbouw en de woordkeus over, niet de inhoud en niet de zinnen zelf."
  7. **"Andere pagina's over dit onderwerp, met wat ze doen (schrijf ernaast, niet eroverheen)":** tot
     `MAX_BUREN = 20` andere pagina's uit hetzelfde cluster, elk als "titel: rol" (`burenInCluster()`: de
     kansen van hetzelfde cluster die niet `vervallen` zijn, zonder de kans van deze pagina; de rol uit
     `kansen.ruw`, besluit V7). Tot 29 september 2026 waren dit tot 60 titels van alle pagina's van het merk,
     waaruit de schrijver niet kon opmaken wat hij aan zijn buren moest overlaten.
  8. **Bij verbeteren:** "De functie van deze pagina (vaste eis)" (`functieblok()`) en de huidige tekst.
- **`zonderSiteHerhaling()`** (`lib/pipeline/site-herhaling.ts`, besluit V2): een reeks van `REEKS = 6`
  woorden die letterlijk op minstens `AANDEEL = 0,4` van de andere pagina's van dezelfde site terugkomt (bij
  minstens `MIN_ANDERE_PAGINAS = 3` andere pagina's) is menu, telefoonbalk of voettekst en gaat eruit. Blijft
  er minder dan `MIN_OVER = 0,3` van de tekst over, dan komt de oorspronkelijke tekst terug. Geen AI, alleen
  tellen. Aanleiding: bij een klant begon de "stem" met menuwoorden en een telefoonnummer.
- **Waarom.** De schrijver moet bedrijfskennis en algemene kennis uit elkaar kunnen houden: alleen de eerste
  mag als werkwijze, belofte of eigenschap van het bedrijf worden opgeschreven (13.3).

### 13.3 De schrijfaanroep

- **Techniek.** Taak `pagina_schrijven` → `voerSchrijvenUit()` (`lib/pagina/taken.ts`). Heeft de pagina al
  tekst, dan gaat het meteen door naar de controle (idempotent). Anders `achtergrondRonde()`:
  1. De eerste keer start `startStructuredAchtergrond()` de aanroep, wordt het `responseId` in de payload
     bewaard en een ophaaltaak ingepland (0.4).
  2. `haalStructuredOp()` haalt het resultaat op: `klaar`, `bezig` (nieuwe ophaaltaak met langere vertraging,
     tot `MAX_OPHAALPOGINGEN`) of `mislukt` (één herstart, `MAX_HERSTARTS = 1`).
- **AI-aanroep** (kind `pagina_schrijven`): **Sol**, `redactioneel` (veel denktijd), achtergrondmodus.
  Schrijfopdracht versie `SCHRIJFOPDRACHT_VERSIE = 5` (`lib/pagina/schrijfopdracht.ts`, het enige bestand
  waar je aan draait om de kwaliteit te verbeteren). De opdracht in het kort (letterlijke kernzinnen):
  *"Je bent een ervaren vakschrijver en schrijft een pagina voor de eigen website van dit bedrijf. Schrijf de
  beste pagina die iemand met deze vraag zou kunnen lezen. Beantwoord wat deze bezoeker wil weten, zo kort
  als dat kan, en zeg elk punt één keer. Begin met het antwoord op zijn vraag. Schrijf natuurlijk, concreet en
  overtuigend. Gebruik algemene vakkennis alleen waar die de lezer helpt kiezen of handelen, niet om te laten
  zien wat je weet."* Versie 5 (besluit V13, 29 september 2026) verving "wees inhoudelijk volledig" en
  "schrijf zo uitgebreid als nodig is", die in ronde 1 naar lange pagina's met randgevallen duwden.
  Houd bedrijfskennis en algemene kennis uit elkaar: bedrijfskennis is de enige basis voor wat dit bedrijf
  doet, biedt, belooft, rekent, adviseert of hanteert; algemene kennis mag uitleggen, maar nooit als werkwijze,
  belofte, advies of eigenschap van het bedrijf. *"Verzin geen bedrijfsclaims, cijfers, garanties, prijzen,
  resultaten, certificeringen, termijnen of andere concrete eigenschappen die niet uit de bedrijfskennis
  blijken. Weet je iets niet, laat het dan weg."* Een gegeven overal hetzelfde, ook in de metabeschrijving en
  de FAQ. *"Sloeg de ondernemer een vraag over, schrijf er dan niet omheen: geen alinea over wat de lezer zelf
  moet navragen of wat niet bekend is. Kies een invalshoek die je met de informatie wel kunt waarmaken."*
  *"Schrijf als een vakman, niet als een AI die informatie afvinkt."* Noem nooit een ander bedrijf bij naam.
- **Huisregels** (`schrijfSysteem()`): de aanspreekvorm (u, je of wij), de verboden onderwerpen ("Schrijf niet
  over ..."), de verboden woorden ("Gebruik deze woorden niet ..."), geen gedachtestreepje en nooit de schuine streep tussen "en" en "of", een
  FAQ alleen met een antwoord dat uit de bedrijfskennis blijkt of algemene vakkennis is die ook als algemene
  uitleg wordt geschreven, een praktijkvoorbeeld alleen als het over het onderwerp van deze pagina gaat (een
  bedrijfsbreed verhaal hooguit kort, en een voorbeeld dat de ondernemer voor deze pagina vertelde krijgt
  altijd voorrang), en de vorm: een titel, een metatitel van hooguit 60 tekens, een metabeschrijving van
  hooguit 160 tekens, tekst in markdown (tussenkoppen met `##`), 0 tot `MAX_FAQ = 5` veelgestelde vragen die
  iets toevoegen, en `notitie_voor_ondernemer` (wat de schrijver nog had willen weten, of `null`).
- **Bewust niet in de opdracht:** geen woordenbudget, geen verplichte opbouw, geen bronverwijzingen, geen lijst
  met punten die erin moeten (`docs/tasks/contentketen-opnieuw.md` §3). Een instructie over stijl of lengte
  krijgt geen vangnet in code (conventie 1).
- **Uitvoerschema** (`PaginaSchema`, Zod): `titel`, `meta_titel`, `meta_beschrijving`, `tekst_markdown`,
  `faq` (lijst van `vraag` en `antwoord`), `notitie_voor_ondernemer`.
- **Waarom.** Eén sterke schrijfbeurt met goede invoer in plaats van een keten van bijsturende stappen: de
  kwaliteit komt van de invoer (de kennis van de ondernemer), niet van meer AI-stappen.

### 13.4 Mechanische reparatie

- **Techniek.** `gerepareerd()` → `repareerMechanisch()` (`lib/pagina/mechanisch.ts`), zonder model, en nooit
  tegenhoudend: `pasSchrijfregelsToe()` (`lib/schrijfregel-vangnet.ts`) maakt van een "en", schuine streep, "of" een "of" en
  van een gedachtestreepje met spaties eromheen een komma (een bereik zonder spaties tussen twee getallen blijft
  staan, dat is notatie); daarbovenop wordt een streepje tussen twee letters een komma; keurmerksterren als `SKG**` worden `SKG★★` (Markdown zou ze als
  vet lezen, besluit V3a); code-opmaak met backticks eruit; metatitel op maximaal `MAX_METATITEL = 60` tekens
  en metabeschrijving op maximaal 160 tekens, op een woordgrens (`lib/pipeline/metatitel.ts`); lege
  FAQ-rijen eruit.
- **Waarom.** Dit zijn mechanische regels waarvoor een herschrijving een verspilling zou zijn.

### 13.5 Opslaan

- **Techniek.** `tekstKolommen()` (`lib/pagina/schrijven.ts`) bouwt de kolommen: `body_markdown`, `meta_title`,
  `meta_description`, `faq_json` (`[{ q, a }]`), `word_count`, `gebruikte_kennis` (de id's van de kennis die in
  blok A zat, migratie 0124), `updated_at`, en `raw_json = { soort, schrijfopdracht_versie, uitvoer,
  notitie_voor_ondernemer }` met de volledige ruwe uitvoer van het model. Dat is conventie 8: achteraf is te
  zien wat het model schreef en wat de klant veranderde. **Gestructureerde gegevens:**
  `validateOrRebuildJsonLd()` (`lib/schema-jsonld.ts`) bouwt het JSON-LD-blok (type volgens de paginasoort en het
  bedrijfsmodel, titel, beschrijving, adres, FAQ, en de organisatiegegevens uit `laadOrganisatie()`: naam,
  website, `sameAs`, telefoon, e-mail, adres, en bij een lokale dienstverlener het werkgebied), met `dateModified = nu` en nog geen `datePublished` (dat komt bij de
  publicatie, 16.2). De titel uit het plan blijft de titel van de pagina. `status` blijft `draft`.
  Daarna `legAfhankelijkhedenVast()` (kans en pagina leunen op de kennisitems in `gebruikte_kennis`, 4.5) en
  `pagina_controle` wordt ingepland.
- **De vraag van de schrijver wordt een vraag aan de klant** (besluit V16, 29 september 2026). Staat er in
  `notitie_voor_ondernemer` iets bruikbaars (`vraagUitNotitie()`, `lib/pagina/notitie-vraag.ts`: niet leeg,
  niet "null" of "nvt", hooguit `NOTITIE_VRAAG_MAX = 500` tekens), dan maakt `notitieAlsVraag()`
  (`lib/pagina/taken.ts`) er een open vraag van bij deze pagina: `fact_requests` met `scope = 'pagina'`, het
  cluster als `analysis_id`, `kind = 'aanvulling'`, `answer_type = 'tekst_lang'`, en `raw_json = { bron:
  'notitie_schrijver' }`. Heeft het merk al een vraag met dezelfde tekst (na `normaliseerVraag`), dan hangt
  de pagina aan die vraag in plaats van een tweede. Alleen bij het eerste schrijven, niet bij een
  herschrijving; een fout hier houdt de pagina niet tegen. De pagina is dan al geschreven: de open vraag
  houdt het goedkeuren niet tegen, maar het antwoord gaat de kennislaag in (voor de andere pagina's van het
  cluster) en de klant kan er om een aanpassing mee vragen (15.3).
- **Bij fouten.** Geeft het schrijven op (vier pogingen), dan gaat de pagina terug naar `briefing`
  (`schrijvenGafOp()`, alleen als er nog geen tekst is) en de plan-pagina naar `mislukt`. De ochtendronde
  probeert het de volgende dag opnieuw.

**Uitkomst van hoofdstap 13:** een `content_pieces`-rij op `draft` met tekst, metadata, FAQ, JSON-LD, ruwe
uitvoer en de gebruikte kennis.

---

## Hoofdstap 14. De controle en de herschrijving

*Wie: niemand. Kost: richtwaarde 1 tot 1,5 dollarcent voor de controle, 2,6 tot 4,3 dollarcent voor een
herschrijving.*

**Doel van de hoofdstap.** Voorkomen dat er iets verzonnens over het bedrijf op de site komt, en een tekst die
duidelijk niet goed is één keer laten verbeteren. Wat daarna nog twijfelachtig is, legt de app aan de
ondernemer voor in plaats van het zelf te beslissen.

### 14.1 Controle in code: harde beweringen

- **Techniek.** `controleerHardeBeweringen()` (`lib/pagina/harde-beweringen.ts`), puur, zonder model. De
  controle loopt over de hoofdtekst, de metabeschrijving en de FAQ-antwoorden samen
  (`volledigeControletekst()`). Stappen:
  1. `splitsZinnen()` knipt de tekst in zinnen (markdown weg, opsommingstekens weg).
  2. Per zin zoekt `vindHardeBeweringen()` **getallen** (`getallenIn()`, met eenheid: euro, jaar, maand, week,
     dag, uur, minuut, procent; bereiken als "5 tot 10"; telefoonnummers, postcodes en huisnummers tellen niet
     mee, `zonderRuis()`; een getal voor een opsommingswoord als "tips" of "stappen" telt niet) en
     **beloftewoorden** (garantie, gecertificeerd of certificering, erkend of erkenning, keurmerk, "lid van",
     altijd, nooit, 24/7, "de beste", "de goedkoopste", "de grootste", "de enige", "nummer 1"), die laatste
     alleen in een zin die over het bedrijf gaat (`overHetBedrijf()`: "wij", "we", "ons", "onze" of de
     bedrijfsnaam).
  3. Voor elke bewering zoekt `zoekBron()` of hij terugkomt in de bronnen: blok A, de open vraag en de
     antwoorden (blok B) en de stemvoorbeelden (`Schrijfbasis.bronnen`). Een getal moet met dezelfde waarde
     (en, als beide een eenheid hebben, dezelfde eenheid) in een bronzin staan (`1.800` is `1800`, `€ 359` is
     `359 euro`). Een beloftewoord moet in een bronzin staan; staat er in de tekstzin of de bronzin een
     ontkenning ("geen", "niet", "nooit", "zonder"), dan telt hij niet als gedekt.
  4. **Vakkennis dekt geen zin over het bedrijf** (besluit V4): voor een zin die over het bedrijf gaat tellen
     alleen de bedrijfsbronnen; alleen een algemene zin mag ook op de vakkennis van de brief steunen
     (`algemeneBronnen`).
  5. De zinnen met een niet-gedekte bewering zijn de **ongedekte zinnen** (`geleZinnen()`).
- **Waarom.** "Liever onterecht geel dan onterecht goed." Deze controle krijgt bewust nooit een model of een
  zinsontleding: bij te veel valse alarmen wordt de lijst korter, niet de code slimmer (conventie 1).
- **Bekende beperking.** Kleine beweringen zonder getal of beloftewoord ("een ouder mag meekomen") vangt de code
  niet; die hangen af van de beoordeling (14.3) en de ondernemer.

### 14.2 Controle in code: verboden woorden

- **Techniek.** `zinnenMetVerbodenWoord()` (`lib/pagina/controle-regels.ts`): de verboden woorden van het merk
  (uit `profiles.taboo_phrases` plus de kennislaag, `laadSchrijfbasis`), als los woord (`(?<![\p{L}\d])woord(?![\p{L}\d])`,
  hoofdletterongevoelig, minstens 3 tekens, tekst tussen haakjes wordt genegeerd), per zin. Ook over hoofdtekst,
  metabeschrijving en FAQ.
- **Waarom.** De schrijver kan alleen vermijden wat er staat; deze controle is het vangnet voor als hij het
  toch gebruikt.

### 14.3 De beoordeling door een eindredacteur

- **Techniek.** Taak `pagina_controle` → `voerControleUit()`. Bestaat `controle_json` al of is er geen tekst,
  dan niets. **AI-aanroep** (kind `pagina_controle`): **Sol**, `judging`, een directe aanroep (geen
  achtergrondmodus), zonder zoeken. Invoer (`controleInvoer()`): dezelfde informatie als de schrijver (exact
  dezelfde tekst uit `schrijfInvoer()`), de tekst, de metabeschrijving, de FAQ, en de zinnen die de code niet in
  de informatie terugvond. Opdracht (`CONTROLE_SYSTEEM`): "Je bent een ervaren eindredacteur ... Je herschrijft
  niets; je beoordeelt." Twee vragen:
  1. *Klopt het?* Staan er bedrijfsclaims, cijfers, prijzen, garanties, certificeringen of andere concrete
     beweringen in die niet uit de informatie blijken, in de tekst, de metabeschrijving of de FAQ? Zet ze
     letterlijk in `verzonnen`, met waarom. Algemene vakkennis is geen verzonnen claim zolang hij als algemene
     uitleg staat; als iets wat dit bedrijf doet of belooft wel. De zinnen van de code zijn "niet automatisch
     fout".
  2. *Is het goed?* De hoofdvraag meteen beantwoord, de zoekintentie afgedekt, natuurlijk geschreven, klinkt als
     de stemvoorbeelden, geen onnodige herhaling, geen zinnen die de lezer niet helpen, geen zinnen letterlijk
     overgenomen uit de stemvoorbeelden, geen AI-content, iets wat echt van dit bedrijf komt, heeft de lezer er
     iets aan. De vraag naar "genoeg diepgang" is sinds 29 september 2026 weg (besluit V14, B-d).
  "Oordeel 'goed' als je deze pagina zo op de site van de ondernemer zou zetten." Anders `niet_goed`, met
  hooguit `MAX_PUNTEN = 5` punten (waar, probleem, hoe het beter kan). Geen punten over smaak. **Een punt
  schrapt, corrigeert, verplaatst of maakt korter**: het vraagt nooit om een bedrag, een totaal, een
  voorwaarde, een uitzondering, een belofte of een voorbehoud dat niet al in de informatie staat (V14). In
  ronde 1 gingen de punten vooral over meer voorbehouden, en voegde de herschrijving die allemaal toe.
- **Uitvoer** (`ControleSchema`): `oordeel` (`goed` of `niet_goed`), `verzonnen` (zin en waarom), `punten`.
  **Geen cijfer.**
- **Waarom.** Sol beoordeelt tekst van Sol, met het risico van een milde beoordelaar. De verdediging: er is geen
  cijfer maar letterlijke zinnen en concrete punten, en het oordeel leidt hooguit tot één herschrijving.

### 14.4 De beslissing

- **Techniek.** `moetHerschrijven(beoordeling, verboden)` (puur): herschrijven als het oordeel `niet_goed`
  is, als er `verzonnen` zinnen zijn, of als er een zin met een verboden woord in staat. **Een zin die alleen
  de code niet terugvond (ongedekt), is geen reden om te herschrijven** (besluit V15, B-e, 29 september
  2026): die zin wordt geel en de ondernemer beslist (14.6). In ronde 1 kwamen drie van de tien
  herschrijvingen alleen daardoor, en bij één pagina gingen daarbij drie bruikbare veelgestelde vragen
  verloren. Een verboden woord blijft wel een reden: dat is een harde huisregel van de klant, geen twijfel
  over een feit. Mislukt de beoordeling zelf (`beoordeling = null`), dan komt er **geen** herschrijving. Bij
  "herschrijven" schrijft de code `controle_json` alvast weg (`ongedekt`, `verboden`, `beoordeling`,
  `herschreven: false`) en plant `pagina_herschrijven` in; anders gaat de pagina direct naar de klant (14.6).
- **Waarom.** Regelwerk in code en niet een model dat beslist of hij zichzelf overdoet.

### 14.5 De herschrijving (niet altijd)

- **Techniek.** Taak `pagina_herschrijven` → `voerHerschrijvenUit()`. Alleen als de pagina actueel is
  (`is_current`), er tekst is, en (zonder klantwens) er een `controle_json` is dat nog niet herschreven is: dus
  **hooguit één herschrijving per pagina**. **AI-aanroep** (kind `pagina_herschrijven`): Sol, `redactioneel`,
  achtergrondmodus, dezelfde opdracht en invoer als het schrijven, plus `herschrijfInvoer()`: "HIER IS JE
  VORIGE VERSIE EN DE FEEDBACK. SCHRIJF EEN BETERE VERSIE. Voer de punten uit en laat de rest van de tekst
  staan, ook de veelgestelde vragen." (die laatste zin sinds V14) met de vorige versie, de punten van de
  eindredacteur, de verzonnen en ongedekte zinnen ("haal ze weg of schrijf ze zonder de bewering") en de
  zinnen met een verboden woord.
- **Code daarna.** De mechanische reparatie (13.4) en de controles 14.1 en 14.2 draaien opnieuw op de nieuwe
  tekst. **De herschrijving blijft altijd** (besluit V15, B-e, 29 september 2026). Tot die datum koos
  `kiesVersie()` de vorige versie zodra de herschrijving meer ongedekte zinnen had, en ging zo bij één pagina
  in ronde 1 een betere versie weg die het ontbrekende telefoonnummer had opgelost. Nu worden de ongedekte en
  verboden zinnen van de nieuwe versie geel, en houdt `nieuwOngedekt()` apart bij welke daarvan de
  herschrijving bijzette. Vastgelegd in `controle_json.herschrijving` (`ongedekt_vorige`, `ongedekt_nieuw`,
  `behouden`, dat nu altijd `nieuw` is, en `nieuw_ongedekt`; oudere controles kunnen nog `vorige` dragen). De
  nieuwe versie krijgt bijgewerkte `gebruikte_kennis` en afhankelijkheden.
- **Er komt geen tweede beoordeling en geen tweede herschrijving.**
- **Bij fouten.** Geeft de herschrijving op (`herschrijvenGafOp()`), dan blijft de eerste versie staan met de
  gele zinnen.

### 14.6 De gele zinnen en klaarzetten

- **Techniek.** `geleZinnenNa()` (`lib/pagina/controle-regels.ts`) bepaalt de gele zinnen: alle nog
  ongedekte zinnen, alle zinnen met een verboden woord, en de door de eindredacteur als verzonnen genoemde zinnen
  die er (na eventuele herschrijving) nog in staan. Een gele zin houdt de pagina niet tegen, maar de klant moet
  hem bevestigen of aanpassen voor hij goedkeurt (15.3). `zetKlaar()` zet `status = 'ready'`,
  `needs_review = true`, schrijft `controle_json = { ongedekt, verboden, beoordeling, herschreven, herschrijving?,
  gele_zinnen, bevestigd: [], verdwenen? }`, en zet de plan-pagina op `ter_goedkeuring`.
- **Verdwenen gegevens** (besluit V21 punt 3, B-h, 29 september 2026). Bij een verbeterpagina zoekt
  `verdwenenVan()` (`lib/pagina/taken.ts`) met `verdwenenGegevens()` (`lib/pagina/verdwenen-gegevens.ts`,
  puur, zonder model) de harde gegevens van de huidige pagina die niet in de nieuwe tekst (hoofdtekst,
  metabeschrijving en FAQ-antwoorden) staan: telefoonnummers (vergeleken op cijfers), keurmerken met sterren
  (`SKG***` en `SKG★★★` zijn hetzelfde), en getallen met een harde eenheid (euro, procent, dag, week, maand,
  jaar, uur, minuut; een getal zonder eenheid of een opsomming als "3 tips" telt niet). Op de huidige tekst
  gaat eerst `zonderSiteHerhaling()` (13.2), zodat een telefoonnummer in de voettekst van de site niet als
  verdwenen telt. Hooguit `MAX_VERDWENEN = 10`, in `controle_json.verdwenen` (alleen als er iets ontbreekt).
  Dit houdt niets tegen: soms is weglaten juist de bedoeling (een oude prijs). Aanleiding: bij een
  verbeterpagina in ronde 1 verdween een deel van de tarieven, en bij een andere het telefoonnummer, zonder
  dat iemand het zag.
- **Bij fouten.** Mislukt de beoordeling helemaal (`controleGafOp()`), dan komt er geen herschrijving: de
  ongedekte zinnen worden geel en de pagina gaat toch naar de klant.
- **Waarom.** De laatste beslissing over wat er over zijn bedrijf staat, ligt bij de ondernemer. De app legt
  de twijfelzinnen aan hem voor in plaats van zelf te kiezen.

**Uitkomst van hoofdstap 14:** een pagina op `ready` met `needs_review = true`, een `controle_json`, en in het
plan de status `ter_goedkeuring`.

---
## Hoofdstap 15. Lezen, goedkeuren en opleveren

*Wie: de klant, eventueel met de consultant. Waar: het paginascherm
(`/merk/[id]/strategie/bibliotheek/[paginaId]`), te bereiken vanuit het plan, de bibliotheek of de startpagina.
Kost: niets, behalve een aanpassing op verzoek (richtwaarde 3 dollarcent).*

**Doel van de hoofdstap.** De ondernemer laat beslissen: klopt het, klinkt het als mijn bedrijf, en zet ik dit
zo op mijn site? Dat is de enige maatstaf die telt (`docs/tasks/contentketen-opnieuw.md` §1).

### 15.1 De klant leest de tekst

- **Techniek.** `app/(app)/merk/[id]/strategie/bibliotheek/[paginaId]/page.tsx` rendert `body_markdown` met
  `renderMarkdown()` (`lib/markdown.ts`), met bovenaan de `notitie_voor_ondernemer` van de schrijver als die
  er is (die staat sinds V16 ook als open vraag bij de pagina, 13.5). De gele zinnen
  (`controle_json.gele_zinnen`) worden in de tekst, de metabeschrijving en de
  FAQ-antwoorden gemarkeerd (`markeerZinnen()`, `lib/tekst-markering.ts`), elk met "Klopt" en "Pas aan". Bij
  een verbeterpagina staat, zolang de pagina niet is goedgekeurd, het blok "Gegevens van je huidige pagina"
  met de gegevens uit `controle_json.verdwenen` (14.6) en de zin dat ze op de huidige pagina staan en niet in
  de nieuwe tekst; horen ze erbij, dan vraagt de klant een aanpassing (15.3), zijn ze niet meer actueel, dan
  keurt hij gewoon goed (`components/pagina/goedkeuren.tsx`). De
  punten van de eindredacteur staan erbij als "Wat we nog zien", maar alleen als er niet herschreven is. Onder
  de tekst staan, ook vóór het goedkeuren, de metatitel, de metabeschrijving en de FAQ: ze horen bij wat de
  ondernemer goedkeurt.
- **Waarom.** De klant beslist over de hele pagina, niet alleen over de hoofdtekst.

### 15.2 Gele zinnen bevestigen of aanpassen

- **Techniek.**
  - **Bevestigen:** `POST /api/profiles/[id]/paginas/[pieceId]/zinnen` met `{ zin }`. `bevestigZin()`
    (`lib/pagina/goedkeuren.ts`) accepteert alleen een zin die in `controle_json.gele_zinnen` staat (409
    anders) en voegt hem toe aan `controle_json.bevestigd`. Vergelijking op genormaliseerde tekst
    (`normaliseerVraag`).
  - **Zelf aanpassen:** `PATCH /api/analyses/[id]/content/[pieceId]` (velden `body_markdown`, `meta_title`,
    `meta_description`, `title`, `faq_json`). Optimistisch vergrendeld: de body moet het `updated_at` van de
    laatst geziene versie meesturen en de update filtert erop; is de pagina intussen gewijzigd, dan mislukt het
    opslaan en moet de klant vernieuwen. Titel en tekst mogen niet leeg zijn. `edited_by_user = true`,
    `word_count` wordt herberekend. De tekst van het model blijft onaangeroerd in
    `raw_json.uitvoer.tekst_markdown`, zodat achteraf te zien is wat de klant veranderde.
  - Een gele zin die na een aanpassing niet meer in de tekst staat, hoeft niet meer bevestigd te worden:
    `nogGeel()` berekent de nog openstaande gele zinnen door te kijken welke nog letterlijk in de huidige
    tekst, metabeschrijving of FAQ voorkomen.
- **Waarom.** Een gele zin is een zin die de app niet kan bewijzen. Alleen de ondernemer kan zeggen dat hij
  klopt.

### 15.3 Een aanpassing vragen

- **Techniek.** `POST /api/profiles/[id]/paginas/[pieceId]` met `actie: "aanpassing"` en een `notitie` (maximaal
  `MAX_NOTITIE = 2000` tekens). Controles: ingelogd, eigenaar, `checkBudgetForProfile`. Dan `enqueue`
  `pagina_herschrijven` met `klantNotitie`; bestaat er al een open herschrijftaak voor deze pagina (unieke index
  op open taken), dan 409 "Er loopt al een aanpassing".
  `voerHerschrijvenUit()` met een klantnotitie (`opVerzoek`): dezelfde opdracht en invoer als het schrijven plus
  "Wat de ondernemer anders wil" met de wens, en **geen** punten van de eindredacteur. Er komt **geen nieuwe
  beoordeling**. Het resultaat wordt een **nieuwe versie** (`nieuweVersie()`): een nieuwe `content_pieces`-rij
  met `version + 1`, `supersedes_id`, `revision_note` (de wens), `is_current = true` (de oude wordt
  `is_current = false` en blijft bewaard), status `ready`, `needs_review = true`, en een `controle_json` waarin
  alle ongedekte en verboden zinnen van de nieuwe tekst meteen geel zijn (zonder een nieuwe lijst met
  verdwenen gegevens: die berekent alleen `zetKlaar()`, 14.6). `wijsNaarNieuweVersie()` laat de
  plan-pagina en alle bijbehorende `fact_requests` naar de nieuwe versie wijzen. De afhankelijkheden worden
  opnieuw vastgelegd.
- **Waarom.** De klant blijft de baas over de tekst, zonder dat de app een tweede cyclus van eigen oordelen
  start.

### 15.4 Goedkeuren

- **Techniek.** `POST /api/profiles/[id]/paginas/[pieceId]` met `actie: "goedkeuren"` (of de gelijknamige actie
  op de plan-pagina) → `keurGoed()` (`lib/pagina/goedkeuren.ts`):
  1. Laadt de pagina en berekent met `nogGeel()` welke gele zinnen nog in de tekst staan. Zijn er zinnen
     die niet bevestigd zijn (`allesBevestigd`), dan HTTP 409 met "Er staat nog één gele zin. Bevestig hem of
     pas hem aan." (of het aantal).
  2. Dan `needs_review = false`, `reviewed_at`, `reviewed_by`.
  3. De plan-pagina gaat van `gepland`, `schrijven` of `ter_goedkeuring` naar `goedgekeurd`.
  4. `maakMeetplan()` (`lib/pipeline/meetplan.ts`) legt het **meetplan** vast (zie 17.1). Een mislukt
     meetplan blokkeert het goedkeuren niet, het wordt gelogd.
- **Waarom.** Goedkeuren is het moment waarop de pagina definitief is; het meetplan moet daarom nu worden
  vastgelegd, en niet pas bij de publicatie, omdat de controlegroep dan al vastligt (17.1).

### 15.5 Opleveren: het publicatiepakket

- **Wat.** Na het goedkeuren krijgt de klant alles wat hij nodig heeft om de pagina op zijn eigen site te
  zetten. De app publiceert nooit zelf.
- **Techniek.** `components/pagina/opleveren.tsx`, `lib/oplevering.ts`, `lib/kopieervormen.ts`,
  `lib/pipeline/content-export.ts`, `components/publish-guide.tsx` en `publish-box.tsx`.
  - Titel (metatitel) en omschrijving kopiëren, voor de SEO-velden van zijn site.
  - De tekst kopiëren als HTML, platte tekst of Markdown (`kopieeropties()`, `plattetekst()`), met per vorm
    in één zin voor welk soort site.
  - De FAQ apart kopiëren in dezelfde drie vormen (`faqMarkdown()`).
  - **Alles in één bestand:** `htmlDocument()` bouwt een compleet HTML-document (metatitel als `<title>`,
    metabeschrijving als `<meta name="description">`, het JSON-LD-blok in de `<head>`, de tekst en de FAQ
    onder de tekst met de kop "Veelgestelde vragen"); ook als Markdown (`volledigeMarkdown()`);
    `bestandsnaam()` maakt de bestandsnaam.
  - De gestructureerde gegevens apart kopiëren.
  - **Sjabloonexport:** herkende het onderzoek de opbouw van de site (`profile_facets.sjabloon`, 3.2), dan
    een versie in de vorm van die site (`buildTemplateExport()`, bijvoorbeeld Gutenberg-blokken voor
    WordPress via `markdownToGutenbergBlocks()`).
  - **Adres en interne links** (`siteLinksVoorOnderwerp()`, `zusterPaginas()`, `laadInterneLinks()`): het
    voorgestelde adres (`resolvedContentUrl`), welke bestaande pagina's deze pagina zou moeten linken en welke
    naar deze zouden moeten linken. Deterministisch: een woord uit de dienstnaam dat terugkomt in een
    bestaande paginatitel of adres, en de kruising van diensten tussen kansen. Zonder kans of zonder dienst
    komt er geen voorstel. "Liever een gemiste link dan een verzonnen relatie."
  - Een korte handleiding "Wat doe je hiermee?".
- **Waarom.** In de eerste versie van de nieuwe keten verdween het menu met kopiëren en downloaden, en zag
  de klant alleen de tekst: de helft van wat hij betaalt bleef in de database staan (26 september 2026).

**Uitkomst van hoofdstap 15:** een goedgekeurde pagina (`needs_review = false`), een plan-pagina op
`goedgekeurd`, een `meetplannen`-rij.

---

## Hoofdstap 16. Publiceren en de publicatiecontrole

*Wie: de klant plaatst de pagina zelf op zijn website en vult de live-link in. Kost: niets.*

**Doel van de hoofdstap.** Vastleggen dat en waar de pagina live staat, controleren of de tekst er echt staat,
en de nameting (hoofdstap 17) klaarzetten.

### 16.1 De klant vult de live-link in

- **Techniek.** Twee ingangen die op dezelfde functie uitkomen:
  1. `POST /api/analyses/[id]/content/[pieceId]/publish` met `{ url }`: ingelogd, eigenaar van de analyse,
     `checkUrlFormat`, de pagina mag niet meer op `needs_review` staan (409), en het adres moet op het
     domein van het merk staan (`isOnBrandDomain`, 400; een partnersite vraagt contact met de consultant).
     Geeft HTTP 202.
  2. De plan-pagina-actie `geplaatst` → `markPosted()` (`lib/plans.ts`): dezelfde controles (`volledigAdres()`
     maakt van een pad een volledig adres, `isOnBrandDomain`, "Keur de tekst eerst goed voordat je hem live
     zet"), en dan `markPublished()`. Een bulkvariant (`alles_geplaatst` per maand) bestaat ook.
  Terugdraaien kan met `DELETE` op dezelfde route (`markUnpublished()`).
- **Waarom.** De klant hoeft niet op een controle te wachten om door te kunnen; de controle volgt op de
  achtergrond.

### 16.2 De pagina wordt als gepubliceerd vastgelegd

- **Techniek.** `markPublished()` (`lib/pipeline/publish.ts`):
  1. `content_pieces`: `status = 'published'`, `published_at = nu`, `published_url`, en het JSON-LD krijgt
     `datePublished` (`metPublicatiedatum()`, `lib/schema-jsonld.ts`). Eventuele eerdere controle-uitslag
     (`publish_check_json`) wordt leeggemaakt.
  2. Een taak `verify_publication` wordt meteen ingepland (16.3).
  3. `planned_pages`: `status = 'geplaatst'`, `posted_at`, `posted_url`.
  4. `koppelAdresAanMeetplan()` schrijft `adres` en `gepubliceerd_op` op het meetplan.
  5. `planImpactWaves()` plant twee `measure_impact`-taken in met `scheduled_for` gelijk aan de
     publicatiedatum plus 14 en plus 28 dagen (17.2). Heeft de pagina geen meetplan met doelvragen, dan komt er
     een waarschuwing in de logs en **geen** nameting.
- **Waarom.** De publicatiedatum is het `t = 0` van alles wat daarna gemeten wordt.

### 16.3 De publicatiecontrole

- **Techniek.** Taak `verify_publication` → `verifyPublication()` → `checkPublication()`
  (`lib/pipeline/publish-check.ts`):
  1. `fetchPage(url)` haalt de pagina echt op en geeft ook het eindadres na doorverwijzingen. Lukt dat niet:
     `reachable = false` met de melding dat de link niet te openen is of nog op concept staat.
  2. **Staat de tekst er echt?** `pickSentences()` kiest uit de Markdown de acht langste zinnen met minstens
     acht woorden; met `normalize()` (kleine letters, gelijke aanhalingstekens en streepjes, enkele
     spaties) wordt gekeken hoeveel daarvan in de tekst van de pagina staan (`htmlToText`). Bij minstens
     `MIN_MATCH_RATIO = 0,6` (60 procent) telt de tekst als aanwezig; de drempel voorkomt onnodig alarm bij
     kleine opmaakverschillen.
  3. **Staat de gestructureerde data er?** Er moet een `application/ld+json`-blok in staan, en, als het schema
     een `@type` heeft, ook dat type. Het ontbreken hiervan is een waarschuwing, geen fout.
  4. **Doorverwijzing:** `isRedirectedElsewhere()` (`lib/url.ts`) vergelijkt het opgegeven adres met het
     eindadres. Een verschil in alleen http of https, `www`, hoofdletters, een slash aan het eind of een
     trackingcode telt niet. Stuurt de link echt door, dan vraagt de app het adres in te vullen waar de
     bezoeker uitkwam, want Search Console koppelt bezoekers op het opgegeven adres.
  5. Het resultaat komt in `content_pieces.publish_check_json` (`reachable`, `textFound`, `textMatchRatio`,
     `schemaFound`, `finalUrl`, `checkedAt`, `problems` in gewone taal).
- **Bij een mislukte controle** (niet bereikbaar, of de tekst niet aanwezig): de pagina wordt teruggezet naar
  `status = 'ready'`, `published_at = null`, `needs_review = true`, met `review_notes` "Publicatie mislukt:
  ...", en de nog niet gestarte `measure_impact` en `compute_impact` taken van deze pagina worden uit de
  wachtrij verwijderd (alleen taken met status `queued`).
- **Waarom.** Een nameting op een pagina die niet live staat meet niets en zou een misleidend effect
  opleveren.

**Uitkomst van hoofdstap 16:** een pagina op `published` met `published_url` en `publish_check_json`, een
plan-pagina op `geplaatst`, en twee geplande nameettaken.

---

## Hoofdstap 17. De nameting van een gepubliceerde pagina

*Wie: niemand, het loopt op vaste dagen na de publicatie. Kost: het stellen van de doelvragen en
controlevragen opnieuw, dus enkele tientallen dollarcenten per pagina en golf (richtwaarde afgeleid uit
8.2).*

**Doel van de hoofdstap.** Bewijzen of de pagina iets opleverde. Een score die na publicatie stijgt is geen
bewijs op zichzelf: zichtbaarheid beweegt ook vanzelf en de ruis in een meting van dertig vragen is al gauw net
zo groot als een gewone stijging. Daarom meet de app twee dingen naast elkaar: de vragen waar deze ene pagina
voor gemaakt is (**doelvragen**) en een **controlegroep** van vragen waar geen pagina voor gemaakt is. Stijgt
alles even hard, dan lag het niet aan de pagina.

### 17.1 Het meetplan (vastgelegd bij het goedkeuren)

- **Techniek.** `maakMeetplan()` (`lib/pipeline/meetplan.ts`, migratie 0122, tabel `meetplannen`, één rij per
  pagina, idempotent):
  1. **Doelvragen:** de gemiste vragen uit het rapport achter de pagina (`planned_pages.source_ref` →
     `reports.recommendations_json[i].targets`), teruggezet naar `prompt_id` via `tracking_runs`, ontdubbeld.
     Zonder `source_ref` of zonder doelen "geen doelvragen gevonden": dan geen meetplan (zie bijlage H voor
     handmatige kansen).
  2. **Controlegroep:** `pickControlPrompts()` (`lib/pipeline/impact.ts`): vragen uit dezelfde analyse die
     actief zijn en die **geen enkele gepubliceerde pagina** als doelvraag claimt (over alle meetplannen van
     gepubliceerde pagina's van de analyse), in vaste volgorde op `id`, maximaal
     `min(aantal doelvragen, MAX_CONTROL_PROMPTS = 5)`. De keuze ligt vast op het moment van goedkeuren,
     zodat golf 1 en golf 2 dezelfde controlevragen gebruiken en eerlijk naast elkaar staan. Eerder koos de
     code de controlegroep bij elke golf opnieuw, waardoor twee golven een andere groep konden pakken.
  3. **Bronnen:** `["openai"]` plus `"ai_overview"` als die bron op dat moment aan stond.
  4. Opslaan: `doelvragen`, `controlegroep`, `bronnen`.
- **Achtergrond.** Sinds de contentketen opnieuw gebouwd is (25 september 2026) schreef niemand meer in
  `content_piece_targets`; elke pagina van de nieuwe keten had daardoor stil geen doelvragen en er is een tijd
  lang geen enkele effectmeting gestart. Het meetplan repareert dat (M1, 27 september 2026).
- **Waarom.** Het meetplan is administratie over metingen die al gedaan zijn of nog gedaan gaan worden: geen
  nieuwe AI-aanroep.

### 17.2 De twee golven worden gepland

- **Techniek.** `planImpactWaves()` (`lib/pipeline/impact.ts`) bij de publicatie (16.2): voor elke golf in
  `IMPACT_WAVES = [{ wave: 1, days: 14 }, { wave: 2, days: 28 }]` een taak `measure_impact` met
  `scheduled_for = published_at + days`. Dus **14 en 28 dagen na de publicatie** (niet 28 dagen na golf 1).
- **Waarom.** Niet eerder dan 14 dagen, want een AI-assistent neemt een nieuwe pagina niet dezelfde dag op: hij
  moet eerst gecrawld en geïndexeerd worden. Twee momenten in plaats van één, omdat één meting "opgepikt" niet
  van "toeval" kan onderscheiden.

### 17.3 De hermeting

- **Techniek.** Taak `measure_impact` → `planImpactMeasurements()`. Per doelvraag en per controlevraag een
  taak `measure_prompt` met `payload.impact = { purpose: "impact" | "control", contentPieceId, wave }` en
  `weekNo: 0` (niet gebruikt bij een impactmeting; de sleutel is pagina, golf en vraag). Staat `ai_overview` in
  de bronnen van het meetplan, dan ook een `measure_ai_overview` met dezelfde `impact`. Ze doorlopen
  dezelfde stappen als hoofdstap 8.2 en 8.3 (antwoord, beoordeling), met één meting per vraag (geen
  herhalingen) en met `tracking_runs.purpose = 'impact'` of `'control'`, `content_piece_id` en `impact_wave`.
  Gemini via DataForSEO doet niet mee in de nameting.
- **Afsluiten.** Elke afgeronde impactmeting roept `scheduleImpactIfLastRun()` aan: zijn er voor deze pagina en
  golf geen openstaande `measure_prompt`- of `measure_ai_overview`-taken meer (geteld met `requireCount`, dus
  een falende telling wordt geen nul), dan wordt `compute_impact` ingepland. Zijn er in het geheel geen
  vragen gepland (`planned === 0`), dan wordt `compute_impact` meteen ingepland.
- **Waarom.** Precies dezelfde meetmethode als de oorspronkelijke meting, zodat voor en na vergelijkbaar zijn.

### 17.4 Vóór en na

- **Techniek.** `computeImpact()` (`lib/pipeline/impact.ts`), taak `compute_impact`. Pagina moet nog
  gepubliceerd zijn, anders geen berekening.
  - **Vóór:** `beforeState()`: per vraag de **laatste** reguliere meting (`purpose = 'periodic'`) met
    `ran_at` vóór de publicatiedatum van deze pagina. Bewust niet de allereerste meting: publiceert de klant
    pas na drie maanden, dan is die geen eerlijk vertrekpunt meer.
  - **Na:** `afterState()`: de metingen van deze golf (`impact_wave`) voor deze pagina, apart voor
    `impact` en `control`.
  - De uitkomst per vraag is één ja of nee: heeft het eigen merk in de beoordeling `mentioned = true`.
    `ownMentionsByPrompt()` houdt één waarde per vraag over; er is geen filter op bron.
  - **Citatie van de eigen pagina** (M3): `ownPageCited()` kijkt of het gepubliceerde adres in minstens één
    `cited_sources` van een eigen-merk-vermelding van de doelvragen staat (`citeertEigenPagina()`,
    `lib/pipeline/impact-math.ts`, dezelfde regels als `isRedirectedElsewhere`); `null` zonder gemeten golf of
    zonder adres, nooit "nee" zonder meting.

### 17.5 Het oordeel

- **Techniek.** `lib/pipeline/impact-math.ts`, puur:
  1. `compare(voor, na)`: alleen vragen die zowel vóór als na beoordeeld zijn tellen mee (`total`,
     `beforeMentioned`, `afterMentioned`), apart voor doelvragen en controlegroep.
  2. `deltaOf()`: het verschil in procentpunten (na min voor).
  3. `thresholdOf()`: de marge, `Z95 × wortel(se_voor² + se_na²)` met de binomiale standaardfout per
     helft (`binomialStderr`). Een verschil binnen de marge is toeval.
  4. `verdictOf()`: `te_weinig_data` bij minder dan `MIN_COMPARABLE = 2` vergelijkbare vragen; `gelijk` als
     `|delta| ≤ marge`; anders `gestegen` of `gedaald`.
  5. Opslaan in `content_impact` op (`content_piece_id`, `wave`): `target_total`, `target_before_mentioned`,
     `target_after_mentioned`, `control_total`, `control_before_mentioned`, `control_after_mentioned`,
     `target_delta`, `control_delta` (`null` zonder controlevragen), `delta_threshold`, `verdict`,
     `target_cited_own_page`, `computed_at`. Golf 1 en golf 2 blijven apart terug te zien.
- **Waarom.** Een streng oordeel: liever "nog te weinig data" of "gelijk" dan een toevallige stijging als
  effect verkopen (conventie 3).

### 17.6 Wat de klant ziet

- **Techniek.** Het scherm Zoekverkeer (`app/(app)/merk/[id]/analytics/zoekverkeer/page.tsx`) leest per
  gepubliceerde pagina de `content_impact`-rijen en toont per pagina de **hoogste beschikbare golf** (een
  latere golf vervangt de eerdere op het scherm; beide blijven in de database). `impactUitleg()`
  (`lib/impact-uitleg.ts`) zet de cijfers om in gewone taal: hoeveel van de doelvragen AI het merk noemde
  vóór en na, hetzelfde voor de controlegroep, en de conclusie. Valt een stijging weg tegen de controlegroep
  (`doelDelta − controleDelta ≤ marge`), dan staat er dat hij waarschijnlijk niet door de pagina komt. Zonder
  controlegroep staat er dat een algemene verschuiving niet uit te sluiten is.
- **De bewijsladder** (`lib/meting/bewijsladder.ts`, M4): zeven treden, elk `bewezen`, `geen_verandering`,
  `te_weinig_gegevens` of `geen_gegevens`: gepubliceerd en gecontroleerd; zichtbaar in Google (Search Console
  vertoningen sinds publicatie, pas na 14 dagen); genoemd door AI (het oordeel uit 17.5); geciteerd door AI
  (17.4); verkeer (Search Console klikken); conversie en omzet. **Conversie en omzet zijn altijd "geen
  gegevens"**: er is geen koppeling met boekhouding of CRM. De klant ziet de verst bereikte trede en de hele
  ladder in het detailpaneel.
- **Search Console per pagina.** De cijfers per gepubliceerde pagina komen uit `search_console_days`
  (hoofdstap 18.3). Search Console als invloed op het oordeel van de nameting zelf is nog niet gebouwd
  (werkpakket M2 staat open in `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
- **Nog niet gebouwd.** Terugkoppeling van de uitkomst naar de kennislaag ("geleerd", L1) en een lerende
  prioritering (L2) staan open.
- **De maandelijkse meting loopt gewoon door** (hoofdstap 18.1) op alle vragen van het cluster, los van de
  nameting per pagina, zodat het oordeel over één pagina nooit van één momentopname afhangt.

**Uitkomst van hoofdstap 17:** per gepubliceerde pagina en golf een rij in `content_impact` met oordeel en
aantallen.

---

## Hoofdstap 18. Herhaling en aanverwante processen

Deze hoofdstap beschrijft wat naast de hoofdlijn loopt of de hoofdlijn herhaalt. De modules onder 18.5 zijn
kort beschreven; ik heb ze niet tot in de details nagelezen.

### 18.1 De maandelijkse meting

- **Techniek.** Vercel Cron draait `GET /api/cron/tracking` met schema `0 6 1 * *` (de eerste van de maand,
  06:00 UTC; het enige item in `vercel.json`). De route (geheim vereist) loopt over alle analyses met
  `tracking_enabled = true` en status `gemeten` of `gereed` en niet gearchiveerd:
  1. plant per merk een `technical_audit` in (idempotent per merk);
  2. bepaalt de volgende periode (`laatste week_no + 1`) en controleert `mayMeasureAgain()`
     (`lib/measure-cadence.ts`): er moeten minstens `MIN_DAGEN_TUSSEN_PERIODES = 21` dagen zitten tussen twee
     periodes, anders wordt de analyse overgeslagen (met de reden in het antwoord);
  3. respecteert `MAX_MEASUREMENT_PERIODS` (standaard onbeperkt);
  4. plant `enqueueMeasurement` (8.1) en, met de schakelaars aan, de AI Overview- en Gemini-metingen in.
  Daarna verloopt alles zoals in hoofdstap 8 en 9: `aggregate_week` (nu met periode > 0, zonder de
  status `gemeten`), `profile_competitors`, `generate_report`. Het rapport bevat dan een
  periodevergelijking (`change_json`, `computePeriodChange`); `isWorthEmailing()` bepaalt of er iets
  betekenisvols veranderd is voor de rapportmail (die uit staat zonder `EMAILS_ENABLED`).
- **Volledige ronde of niet.** Elke vierde periode meet alle vragen; in de tussenliggende periodes vallen
  structureel merkloze vragen af (8.1).
- **Waarom.** Zichtbaarheid beweegt; een maandelijkse ronde laat zien of het merk zich in bredere zin
  ontwikkelt, ook als er geen enkele nieuwe pagina is.

### 18.2 De dagelijkse ochtendronde

Zie 11.6 (`0 4 * * *` UTC, via Supabase `pg_cron`): voorbereiding, schrijfpoort en, in dezelfde route, de
Search Console-synchronisatie (18.3).

### 18.3 Search Console

- **Techniek.** Per merk kan de consultant een Search Console-property koppelen
  (`POST /api/profiles/[id]/search-console`, `normalizeProperty`; `profiles.gsc_property`,
  `gsc_verified_at`, `gsc_last_error`). Inloggen bij Google gebeurt met een service account
  (`GOOGLE_SERVICE_ACCOUNT_JSON`, geen bibliotheek, `lib/search-console/auth.ts`). Elke dag plant
  `planSearchConsoleSync()` (in `/api/cron/plan`) een `gsc_sync` per gekoppeld merk (dedupe per merk en dag).
  `syncSearchConsole()` haalt twee aanroepen op: paginacijfers (per datum en pagina) en, als bijvangst,
  zoekopdrachten (per datum, zoekopdracht en pagina), maximaal 25.000 rijen per aanroep, met een
  nawerkvenster. Opslag: `search_console_days` en `search_console_queries`. Mislukt de zoekopdrachtenronde, dan
  mislukt de synchronisatie niet. Na een geslaagde synchronisatie legt `legZoekverkeerBewijsVast()`
  (`lib/kansen/uit-search-console.ts`) Search Console-bewijs vast bij bestaande kansen.
- **Waarom.** Echte zoekcijfers zijn een tweede bron naast de gemeten AI-antwoorden, en de enige bron voor
  vertoningen en klikken op de gepubliceerde pagina.
- **Stand.** Volgens de projectdocumentatie was op 26 september 2026 geen enkel merk gekoppeld; dat heb ik niet
  op productie nagelopen.

### 18.4 De off-site scan

- **Techniek.** Taak `offsite_scan`, na elk rapport (`runOffsiteScan()`, `lib/offsite/scan.ts`): brengt het
  bronnenlandschap in kaart (welke externe domeinen de antwoorden noemen, `lib/offsite/landscape.ts`; een
  bron telt als "de markt bepaalt" vanaf `RELEVANT_PROMPT_COUNT = 3` vragen), controleert of het merk daarop
  staat (`presence.ts`, `entity-presence.ts`, met Wikipedia en Wikidata als bronnen) en maakt daar
  **taken** van (`offsite_tasks`, bijvoorbeeld "maak een account aan op dit reviewplatform"). Eén taak doet ook
  een AI-aanroep met zoeken.
- **Waarom.** Advies dat geen taak wordt blijft een goede bedoeling.

### 18.5 Aanverwante modules (kort)

| Module | Wat het doet | Taken | Waar |
|---|---|---|---|
| **Clusters ontdekken** | Vindt nieuwe kandidaat-clusters voor een thema uit Search Console en DataForSEO Labs (eigen site, echte concurrenten, suggesties), schift ze op aanbod en strategie, en bundelt tot 6 tot 12 kandidaten. Eén zware AI-aanroep (de bundeling). Schrijft niet in de potentiescore of de meetgewichten | `discovery_collect`, `discovery_expand`, `discovery_sift`, `discovery_bundle` | `lib/pipeline/cluster-discovery.ts`, `lib/discovery/`, `app/api/profiles/[id]/discovery` |
| **Clusters aanvullen** | Stelt extra onderwerpen voor (`propose_more_topics`), alleen door de consultant (`clusters_aanvullen`) | `propose_topics`-achtig | `lib/pipeline/propose-more-topics.ts` |
| **Reputatie** | Een los product: een analyse van de reputatie van het merk (toon, plaats, bewijskracht) met eigen vragen, vergelijkingen met concurrenten en een synthese. De volgorde van inplannen is een budgetmaatregel: de vergelijking valt als eerste weg | `reputation_start`, `_evidence`, `_brand`, `_offering`, `_compare`, `_sources`, `_market`, `_synthesis` | `lib/pipeline/reputation-*.ts`, `app/api/profiles/[id]/reputation` |
| **Solliciteren** | Een zijproject van één pagina achter dezelfde inlog, met eigen stijlblad; geen onderdeel van de klantpijplijn | Geen | `app/solliciteren/`, `app/api/solliciteren` |

De **Sales-module** (saleskansen uit een markt, onderbouwing en conceptmails, dertien taaksoorten) is op
30 september 2026 uit de app verwijderd: schermen, API-routes, `lib/sales/`, `lib/pipeline/sales-*.ts`,
`app/markt/` en de tests. Alleen de `sales_*`-tabellen staan nog in de database (deel I §4).

---

# Deel IV. Bijlagen

## Bijlage A. Alle AI-aanroepen

Alle aanroepen gaan via `lib/openai/structured.ts` en worden vastgelegd in `ai_calls` met de `kind` in de
tweede kolom. "Luna" is `gpt-6-luna` (in de code `MODELS.quality` of `MODELS.volume`), "Sol" is `gpt-6-sol`
(`MODELS.content`). "Zoeken" is het web-zoeken van OpenAI.

| Hoofdstap | `kind` | Model | Soort werk | Zoeken | Taak |
|---|---|---|---|---|---|
| 3.2 | `crawl_focus` | Luna | analytical | Nee | `profile_discover` (alleen bij meer dan 150 pagina's) |
| 3.4 | `profile_research` | Luna | analytical | Ja | `profile_research` |
| 3.5 | `profile_offering` | Luna | analytical | Nee | `profile_offering` |
| 3.6 | `propose_topics` | Luna | analytical | Nee | `propose_topics` |
| 3.7 | `profile_market` | Luna | analytical | Ja | `profile_market` |
| 3.8 | `llm_baseline_kent` (6), `_citeert` (1), `_verwarring` (1), `_categorie` (3) | Luna | standaardinstellingen | Alleen de laatste drie soorten | `profile_llm_baseline` |
| 3.9 | `profile_synthesis` | Sol (of Luna bij weinig budget) | content (of analytical) | Nee | `profile_synthesis` |
| 4.6 | `fact_classify` | Luna | deterministic | Nee | `fact_register` |
| 7.2 | `topic_research` | Luna | analytical | Ja | `prepare_analysis` |
| 7.3 | `prompts` (per fase een hoofdronde plus aanvul- en geo-rondes) | Luna | creative | Nee | `generate_prompts` |
| 7.4 | `volume_calibration` | Luna | content | Nee | `calibrate_volumes` |
| 8.2 | `measure_simulate` | Luna | standaardinstellingen | Ja (tenzij `MEASURE_WEB_SEARCH=false`) | `measure_prompt` |
| 8.3 | `measure_mention` | Luna | deterministic (bij onleesbare uitvoer: judging) | Nee | `measure_prompt` |
| 8.4 | `classify_entities` | Luna | deterministic | Nee | `aggregate_week` |
| 8.7 | `competitor_intel` | Luna | deterministic | Nee | `profile_competitors` |
| 9.3 | `gap_analysis` | Luna | analytical | Nee | `generate_report` |
| 9.4 | `report` | Luna | judging (tot 29 september 2026 analytical) | Nee | `generate_report` |
| 9.5 | `search_demand_calibration` | Luna | content | Nee | `recalculate_potential` |
| 11.2 | `pagina_brief` | Sol | analytical | Ja | `pagina_brief` |
| 13.3 | `pagina_schrijven` | Sol | redactioneel, achtergrondmodus | Nee | `pagina_schrijven` |
| 14.3 | `pagina_controle` | Sol | judging | Nee | `pagina_controle` |
| 14.5 en 15.3 | `pagina_herschrijven` | Sol | redactioneel, achtergrondmodus | Nee | `pagina_herschrijven` |
| 18 | `measure_ai_overview` | Geen model: DataForSEO SERP-API | Nvt | Nvt | `measure_ai_overview` |
| 18 | `measure_llm_response` | Gemini via DataForSEO | Nvt | Nvt | `measure_llm_response` |
| 18.4 | `source_presence` en verwante | Luna | Zie `lib/offsite/` | Ja | `offsite_scan` |
| 18.5 | `discovery_seeds`, `discovery_sift`, `discovery_bundle` | Luna | Zie `lib/pipeline/cluster-discovery.ts` | Nee | `discovery_*` |
| 18.5 | `reputation_*` (o.a. `reputation_ratings`, `_verdict`, `_synthesis`) | Luna | Zie `lib/pipeline/reputation-*.ts` | Ja | `reputation_*` |

Wat er niet in de tabel staat omdat er geen AI-aanroep is: vooronderzoek (3.1), de crawl (3.2), de audit (3.3),
alle controles in code (14.1, 14.2, de verdwenen gegevens in 14.6), de kansenvolgorde, het samenvoegen van
kansen (9.5), de kaartzin (10.1), de vraag van de schrijver (13.5), het meetplan, het oordeel over de
nameting, de publicatiecontrole, de kennistest-oordelen. De fasen 3 tot en met 5 van de pijplijnanalyse
(29 september 2026) hebben geen AI-aanroep toegevoegd: ze veranderden opdrachten en invoer van bestaande
aanroepen, en de denkinspanning van het rapport.

## Bijlage B. Alle taaksoorten

Uit `lib/jobs/types.ts` (`JOB_TYPES`). "Zwaar" betekent dat de werker de taak alleen oppakt als er nog
genoeg tijd over is (0.2).

| Taaksoort | Hoofdstap | Zwaar | Plant als opvolger |
|---|---|---|---|
| `profile_light_scan` | 3.1 | Ja | zichzelf (volgende ronde), dan `profile_discover` |
| `profile_discover` | 3.2 | Ja | `profile_research`, `technical_audit`, eventueel `crawl_inventory` |
| `crawl_inventory` | 3.2 | Ja | een volgende aanvulronde |
| `technical_audit` | 3.3, 18.1 | Nee | Geen |
| `profile_research` | 3.4 | Ja | `profile_offering` |
| `profile_offering` | 3.5 | Ja | `profile_market`, `propose_topics` |
| `propose_topics` | 3.6 | Ja | Geen |
| `profile_market` | 3.7 | Ja | `profile_llm_baseline` |
| `profile_llm_baseline` | 3.8 | Ja | `profile_synthesis` |
| `profile_synthesis` | 3.9 | Ja | Geen |
| `fact_register` | 4.6, 11.1 | Nee | Geen |
| `gebeurtenis_verwerken` | 4.5 | Nee | Geen |
| `prepare_analysis` | 7.2 | Ja | `generate_prompts` (per fase) |
| `generate_prompts` | 7.3 | Ja | `calibrate_volumes` (de laatste) |
| `calibrate_volumes` | 7.4 | Nee | Geen |
| `measure_prompt` | 8.2, 17.3 | Nee | `aggregate_week` (de laatste) of `compute_impact` |
| `measure_ai_overview` | 8.1, 17.3 | Nee | idem |
| `measure_llm_response` | 8.1 | Nee | `aggregate_week` (de laatste) |
| `aggregate_week` | 8.5, 8.6 | Nee | `profile_competitors` |
| `profile_competitors` | 8.7 | Ja | `generate_report` |
| `generate_report` | 9 | Nee | `offsite_scan`, `recalculate_potential` |
| `offsite_scan` | 18.4 | Ja | Geen |
| `recalculate_potential` | 9.5 | Nee | Geen |
| `pagina_brief` | 11.2 | Ja | `pagina_brief` (volgende in de rij), `pagina_schrijven` |
| `pagina_schrijven` | 13.3 | Ja | zichzelf (ophalen), `pagina_controle` |
| `pagina_controle` | 14.3 | Ja | `pagina_herschrijven` (soms) |
| `pagina_herschrijven` | 14.5, 15.3 | Ja | zichzelf (ophalen) |
| `verify_publication` | 16.3 | Nee | Geen |
| `measure_impact` | 17.3 | Nee | `measure_prompt`, `measure_ai_overview` |
| `compute_impact` | 17.4 | Nee | Geen |
| `gsc_sync` | 18.3 | Nee | Geen |
| `discovery_*` (4), `reputation_*` (8) | 18.5 | Deels | Zie modules |

De dertien `sales_*`-taaksoorten zijn op 30 september 2026 met de Sales-module verwijderd.

## Bijlage C. Statusmodellen

| Object | Waarden | Wie zet ze |
|---|---|---|
| `jobs.status` | `queued`, `running`, `done`, `failed` | De werker (0.2, 0.3) |
| `profiles.status` | `bezig`, `klaar`, `mislukt` | Aanmaken, `profile_research`, `markOwnerFailed` |
| Merkfase (afgeleid, niet opgeslagen) | `voorbereiden`, `klaar_voor_gesprek`, `gesprek_gehad`, `overgedragen` | `profileStage()` uit open taken, `recorded_at`, `assigned_at` |
| `analyses.status` | `bezig`, `concept_klaar`, `meten`, `gemeten`, `gereed`, `mislukt` | 7.1, 7.4, 7.5, 8.6, 9.4 |
| `profile_topics.status` en `stage` | `voorgesteld`, `goedgekeurd`, `afgewezen`; `concept`, `definitief` | 3.6, 5.4, 7.1 |
| `klantkennis.status` | `waargenomen`, `verklaard`, `bevestigd`, `afgeleid` | 4.2 |
| `fact_requests.status` | `open`, `beantwoord`, `overgeslagen` | 11.1, 11.2, 13.5 (nieuw, `open`), 12.2 |
| `kansen.status` | `open`, `ingepland`, `in_voorbereiding`, `geschreven`, `gepubliceerd`, `vervallen`, `te_herzien` | 9.5 (ook `vervallen` voor een kans die als bewijs bij een andere kans ging), 4.5 |
| `content_plans.status` | `concept`, `actief`, `gestopt` | 10.2 |
| `plan_months.status` | `concept`, `ter_goedkeuring`, `goedgekeurd`, `afgewezen` | 10.2, 10.4 |
| `planned_pages.status` | `gepland`, `schrijven`, `ter_goedkeuring`, `goedgekeurd`, `geplaatst`, `afgewezen`, `mislukt` | 10, 13.1, 14.6, 15.4, 16.2 |
| `content_pieces.status` | `briefing`, `draft`, `ready`, `published`, `archived` | 11.1, 13.1, 14.6, 16.2 |
| `content_pieces.needs_review` | waar of onwaar | `true` na de controle, `false` na goedkeuren, weer `true` bij een mislukte publicatiecontrole |
| `content_impact.verdict` | `gestegen`, `gelijk`, `gedaald`, `te_weinig_data` | 17.5 |
| `accounts.cancelled_at`, `archived_at` (merk en analyse) | Datum of leeg | 6.4; archiveren laat taken overslaan (0.2) |

## Bijlage D. Schakelaars en instellingen

Omgevingsvariabelen (Vercel), zoals de code ze leest:

| Variabele | Standaard | Effect |
|---|---|---|
| `OPENAI_API_KEY` | verplicht | Alle AI-aanroepen |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | verplicht | Database en inlog |
| `CRON_SECRET` | verplicht | Bearer-geheim voor `/api/cron/*` (moet gelijk zijn aan het Vault-geheim `geo_cron_secret`) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Basis van uitnodigingslinks |
| `SIGNUPS_ENABLED` | uit | Zelf registreren (1.2) |
| `EMAILS_ENABLED` | uit | Resend-mail (rapporten, herinneringen); wachtwoordherstel staat hier los van |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | nodig bij `EMAILS_ENABLED` | Afzender |
| `WEB_SEARCH_ENABLED` | aan (alleen `false` zet uit) | Zoeken bij onderzoek (3.4, 3.7, 7.2) |
| `MEASURE_WEB_SEARCH` | aan (alleen `false` zet uit) | Zoeken bij meting en kennistest. Uit is goedkoper maar niet representatief |
| `SYNTHESIS_PREMIUM` | aan | Samenvatting op Sol (3.9) |
| `MEASURE_REPEATS` | 3 | Herhalingen van de zwaarste vragen (8.1) |
| `REPEATED_PROMPT_COUNT` | 8 | Aantal vragen dat herhaald wordt (8.1) |
| `MAX_MEASUREMENT_PERIODS` | onbeperkt | Bovengrens op maandelijkse periodes (18.1) |
| `WORKER_TIME_BUDGET_MS` | 240000 | Tijdbudget per werker-aanroep (0.2) |
| `DAILY_BUDGET_PER_ACCOUNT_EUR` | 20 | Dagplafond per account (0.5) |
| `DAILY_BUDGET_EUR` | 50 | Dagplafond over alle accounts (0.5) |
| `SEARCH_DEMAND_ENABLED` | uit | Gemeten zoekvolumes via DataForSEO (7.3) |
| `AI_OVERVIEW_ENABLED` | uit | Google AI Overview als extra meetbron |
| `DATAFORSEO_LLM_ENABLED` | uit | Gemini via DataForSEO als extra meetbron |
| `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | nodig voor de drie DataForSEO-lagen | Toegang |
| `GEMINI_API_KEY`, `GEMINI_MODEL` (standaard `gemini-3-pro`) | optioneel | Eigen Gemini-adapter (3.8) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | nodig voor Search Console | 18.3 |
| `CONTENT_WEB_SEARCH`, `SOURCE_ANALYSIS` | Zie opmerking | Staan in `lib/config.ts` maar worden volgens een zoekopdracht op de code nergens meer gelezen |

In de database (per merk of account): `profiles.onboarding_budget_usd` (2,15), `accounts.daily_budget_eur`,
`accounts.package_pages_per_month`, `profiles.engines_enabled` (standaard `{openai}`), `profiles.crawl_speed`,
`crawl_as_browser`, `crawl_priority_paths`, `max_inventory_pages`, `analyses.tracking_enabled`,
`analyses.prompts_orientatie`, `_overweging`, `_beslissing`.

## Bijlage E. Planning en cron

| Wat | Waar | Schema | Doet |
|---|---|---|---|
| Werker | Supabase `pg_cron` `geo-worker` → `trigger_worker()` → `pg_net` → `/api/cron/worker` | Elke minuut | Pakt taken op (0.2) |
| Ochtendronde | Supabase `pg_cron` `orbit-engine-plan-writer` → `trigger_plan_writer()` → `/api/cron/plan` | 04:00 UTC dagelijks | Voorbereiden en schrijven van vrijgegeven pagina's (11.6), en `gsc_sync` per gekoppeld merk (18.3) |
| Maandelijkse meting | Vercel Cron | `0 6 1 * *` | `/api/cron/tracking` (18.1) |
| Herinneringen | Route `/api/cron/reminders` | Staat niet in `vercel.json` en draait dus niet automatisch (Vercel Hobby laat twee cron-taken toe, volgens `docs/architecture.md`); doet bovendien niets zonder `EMAILS_ENABLED` | E-mail bij pagina's die op publicatie of antwoorden wachten |
| Nameting | Taak `measure_impact` met `scheduled_for` | 14 en 28 dagen na publicatie | 17 |

Alle cron-routes vragen `Authorization: Bearer <CRON_SECRET>` en geven anders 401. Zijn de Vault-geheimen
`geo_site_url` en `geo_cron_secret` niet gezet, dan doen de `pg_cron`-taken zonder foutmelding niets.

## Bijlage F. Kosten

Alle bedragen zijn **richtwaarden uit de projectdocumentatie** (`CLAUDE.md`,
`docs/doorloop-van-klant-tot-content.md`, opmerkingen in de code) en zijn voor dit document niet opnieuw
gemeten. De echte kosten staan per aanroep in `ai_calls.cost_usd`.

| Onderdeel | Richtwaarde |
|---|---|
| Merkonderzoek (hoofdstap 3) | Ongeveer 0,25 dollar, met een harde bovengrens van 2,15 dollar per merk |
| Een cluster opzetten (7) | Een paar dollarcent |
| Een meetronde van 30 vragen (8) | Ongeveer 0,82 dollar, waarvan ongeveer 95 procent in het stellen van de vragen |
| Google AI Overview per aanroep | Ongeveer 0,0037 dollar per geslaagde aanroep, tegen ongeveer 0,017 voor een ChatGPT-meting (opmerking in `lib/ai-overview/types.ts`) |
| Gemini via DataForSEO per meting | 0,02 tot 0,065 dollar (opmerking in `lib/jobs/types.ts`) |
| Rapport (9) | Een paar dollarcent |
| Brief per pagina (11) | 6 tot 7,5 dollarcent |
| Schrijven per pagina (13) | 3 tot 4 dollarcent |
| Controle per pagina (14) | 1 tot 1,5 dollarcent, plus 2,6 tot 4,3 voor een herschrijving |
| Alles per pagina samen | 10 tot 17 dollarcent (op de proef van 26 september 2026) |
| Een aanpassing op verzoek (15.3) | Ongeveer 3 dollarcent |

## Bijlage G. Waar dit document afwijkt van de oudere documentatie

Bij het nalezen tegen de code bleek een aantal beweringen in `docs/doorloop-van-klant-tot-content.md` (peildatum
26 september 2026, gecontroleerd tegen `main` na PR #162) niet meer of niet te kloppen. De code is leidend.

| Onderwerp | Oudere documentatie | Code op `main` |
|---|---|---|
| Pakketmaten | 5, 10 of 20 pagina's per maand | **10, 20 of 40** (`PACKAGE_SIZES`, check-constraint in migratie 0046, foutmelding in de accountroute) |
| Klantaccount aanmaken | Alleen "toewijzen aan een gebruiker" | Ook: `assign-by-email` maakt een nieuw account en een uitnodiging met link als het adres nog niet bestaat (6.1) |
| Tekenbudget merkonderzoek | 55.000 tekens (bij het aanbod vermeld als 55.000 en later 250.000) | Profiel: 60.000 (`prepare-profile.ts`); aanbod: 250.000 (`offering.ts`); samenvatting: 45.000 (`synthesis.ts`) |
| Zoekvolume van meetvragen | "Een schatting van het model, geen echte zoekdata" | Een schatting, **tenzij** `SEARCH_DEMAND_ENABLED=true` (standaard uit): dan gemeten via DataForSEO (`volume_source`) |
| Aanbodcitaat | "Het citaat wordt nagelopen; wat afvalt, komt als open punt" | Een knoop zonder bekende bronpagina of met een adviescitaat vervalt; een citaat dat niet letterlijk op de pagina staat geeft `confidence = 0,5` maar de knoop blijft |
| Brief | Versie 4, met het kennisgat van de kans en de concurrentie | **Versie 6**: geen kennisgat meer (V19), geen concurrentie (B22), vakkennis over het bedrijf zelf valt weg (V4), eerdere antwoorden meegegeven (V17), en de kernvraag van de pagina met een markering van de vraag die hem beantwoordt (V8, 11.2) |
| Schrijfopdracht | Versie 3 | **Versie 5** (`SCHRIJFOPDRACHT_VERSIE = 5`): de lezer als maatstaf, zo kort als dat kan, niet om een overgeslagen vraag heen schrijven (V13, 13.3) |
| Andere pagina's voor de schrijver | Tot 60 titels van het merk, "schrijf er niet overheen" | Tot 20 pagina's uit hetzelfde cluster, elk met hun rol, "schrijf ernaast, niet eroverheen" (V7, 13.2) |
| Aanbeveling | Een titel, de lezer, de reden | Een onderwerp als titel (geen opdracht), de lezer, een rol in de set en een kernvraag; het rapport ziet de open kansen van het hele merk (V6, V7, 9.4) |
| Meetvragen en bezwaren | Minstens één vraag over een twijfel uit het verkoopgesprek | Hooguit één per cluster, alleen in de fase overweging en alleen als het bezwaar bij het onderwerp past (V11); een vraag die al in een ander cluster van het merk staat, wordt niet nog eens gemeten (V18, 7.3, 7.4) |
| De beoordeling | Onder meer "genoeg diepgang" | Die vraag is weg; een verbeterpunt schrapt, corrigeert, verplaatst of maakt korter en voegt niets toe (V14, 14.3) |
| De beslissing om te herschrijven | Bij "niet goed", verzonnen, onbewezen of verboden zinnen | Bij "niet goed", een verzonnen zin of een verboden woord; een zin die alleen de code niet terugvond wordt geel zonder herschrijving (V15, 14.4) |
| Welke versie blijft na herschrijven | De nieuwe, tenzij hij meer onbewezen zinnen heeft | Altijd de nieuwe; wat hij aan onbewezen zinnen bijzette wordt geel (V15, 14.5) |
| Lengte gericht antwoord | Tot 500 tekens | **1.500** (`GERICHT_ANTWOORD_MAX`, V1); open vraag 3.000 |
| Blok A | Feiten uit `brand_facts`, beperkt met een woordfilter | Uit de kennislaag (`klantkennis`), met statusregels, dossier per pagina en een cap van 150 (K6, V3) |
| Antwoorden hergebruik | Een antwoord hoort bij de pagina | Een gericht antwoord geldt ook voor het cluster van die pagina (V17, B32), een praktijkvoorbeeld en de open vraag niet |
| Contentplan opstellen | "Zet de kaarten met de meeste potentie in maand 1" | Vult **alle** open maanden in volgorde tot het pakket per maand vol is, met een bufferpagina per maand en drie maanden tussenruimte voor het verbeteren van dezelfde pagina; alleen de eerste maand met inhoud gaat op `ter_goedkeuring` (10.2) |
| Onderwerpen voor het gesprek | Niet beschreven | Vóór het gesprek `concept` (niet startbaar), erna `definitief` (5.4) |
| Score | "Staan AI Overview of Gemini aan, dan meten die mee" | Ze meten mee en worden beoordeeld, maar de **hoofdscore** telt alleen ChatGPT; de andere bronnen staan in `per_engine_json`. Het rapport (9.1) weegt alle bronnen wel mee voor de gemiste vragen |
| Golf 2 "telt zwaarder" (`processtappen-nieuwe-pagina.md` stap 115) | Golf 2 weegt zwaarder dan golf 1 | Er is geen weging: het scherm toont de hoogste beschikbare golf; beide staan in de database |
| Nameting na 28 dagen | "28 dagen erna" (na golf 1) | 28 dagen na de **publicatie** (`IMPACT_WAVES`) |
| Mislukte publicatiecontrole | Alleen "meldt het probleem" | De pagina gaat terug naar `ready` en `needs_review`, en nog niet gestarte nameettaken worden verwijderd (16.3) |
| Kennistest en de plaats | Alleen de eerste plaats | Klopt, en staat nu als bekende beperking (3.8) |

## Bijlage H. Aandachtspunten voor het technische team

Dit zijn dingen die ik bij het nalezen zag en die het analyseren waard zijn. Ze komen uit het lezen van de code
en zijn niet op productie of met testdata nagelopen; waar iets een afleiding is, staat dat erbij.

**Betrouwbaarheid van de keten**

1. `profile_discover` heeft geen opvolger na definitief opgeven en telt niet als blokkerend (afgeleid uit
   `lib/jobs/chain.ts` en `lib/jobs/worker.ts`). Een definitief mislukte crawl laat het merk op `bezig` staan
   zonder foutmelding, terwijl `profile_research` en `technical_audit` niet meer worden ingepland.
2. `findUserByEmail()` en de gebruikerslijst bij toewijzen doorzoeken alleen de eerste 200 gebruikers
   (`listUsers({ page: 1, perPage: 200 })`). Bij meer gebruikers wordt een bestaand adres niet gevonden en
   wordt een tweede gebruiker met hetzelfde adres geprobeerd aan te maken.
3. `content/[pieceId]/status/route.ts` telt open schrijftaken op de namen `content_plan`, `content_strategy`,
   `content_draft`, `content_edit` en `content_revise`. Die bestaan niet meer in `JOB_TYPES`; de nieuwe namen zijn
   `pagina_*`. Afgeleid: het veld `schrijft` van die route is daardoor altijd onwaar.
4. Na een mislukte publicatiecontrole (16.3) gaat de pagina terug naar `ready`, maar de plan-pagina blijft
   `geplaatst` (afgeleid uit `verifyPublication()`, dat `planned_pages` niet bijwerkt).
5. `/api/cron/reminders` staat niet in `vercel.json`. De herinneringsmails draaien dus niet, ook niet als
   `EMAILS_ENABLED` aan staat.

**Meetmethode en statistiek**

6. **Nabootsing.** De meting stelt de vraag via de API aan Luna met een eigen opdracht en met web-zoeken. Dat is
   niet gelijk aan wat een gebruiker in de ChatGPT-app ziet, en de opdracht vraagt om merken te noemen. Of de
   nabootsing dicht bij de echte ervaring zit, is volgens de projectdocumentatie nooit gemeten.
7. **De belangrijkste aanroep is een model dat zichzelf controleert met een tekstvangnet.** De beoordeling van
   een antwoord (8.3) is een modelaanroep; het vangnet controleert alleen dat de naam letterlijk in de tekst
   staat, niet of de rol (`eerste_aanbeveling`) of de positie klopt. Er is een testscript
   (`npm run eval:mention`); hoe vaak het draait en op welke set staat niet in de code.
8. **De gewichten hangen aan een schatting.** Zonder `SEARCH_DEMAND_ENABLED` komt de volumeband van een vraag uit
   één modelaanroep (`volume_calibration`). Faalt die aanroep, dan krijgt elke vraag de waarde 50 in plaats van
   `null` (`calibrateVolumes()`, `catch`), wat botst met conventie 3 ("onbekend is beter dan verkeerd").
9. **Twee verschillende bronnen voor score en kansen.** De hoofdscore telt alleen ChatGPT (8.6), maar de gemiste
   vragen voor het rapport en de kansen tellen alle bronnen (9.1, meerderheidsregel). Met AI Overview aan kan
   een vraag dus bij de kansen als gemist staan terwijl de hoofdscore hem als genoemd telt.
10. **Voor-nameting zonder bronfilter.** `beforeState()` en `afterState()` (`lib/pipeline/impact.ts`) filteren
    niet op bron. De vorige meting per vraag is de laatste reguliere run over alle bronnen; de nameting bevat
    ChatGPT en, als het meetplan dat zegt, AI Overview. `ownMentionsByPrompt()` houdt per vraag één waarde over
    (de laatst verwerkte rij). Bij twee bronnen voor dezelfde vraag kan een verschil dus uit een ander
    bronnenmengsel komen dan uit de pagina. In de code staat dat dit bedoeld is ("computeImpact ... geen
    engine-filter"), maar het is een aandachtspunt voor de vergelijkbaarheid.
11. **Steekproefgrootte.** De marge van het oordeel is de binomiale standaardfout op enkele tot vijf vragen. De
    code zegt daarom vaak "gelijk" of "te weinig data" (`MIN_COMPARABLE = 2`); `minQuestionsForSignal()` schat
    hoeveel vragen nodig waren.
12. **Effectmetingen in de praktijk.** Volgens `docs/tasks/van-pijplijn-naar-kennissysteem.md` waren er op 26
    september 2026 nul gepubliceerde pagina's en nul effectmetingen op productie; de nameting en de
    bewijsladder zijn dus gebouwd en getest, maar (volgens die documentatie) nog niet met echte klantdata
    doorlopen.
13. **Handmatige kansen.** Een handmatige kans krijgt geen nulmeting en (afgeleid uit `maakMeetplan()`, dat via
    `source_ref` naar het rapport gaat) geen meetplan, dus geen nameting.
14. **Bewijssoort `structuur`.** Bestaat in `lib/kansen/prioriteit.ts` maar er is in de code geen plek gevonden
    die hem schrijft.

**Contentkwaliteit**

15. **Sol beoordeelt tekst van Sol** (14.3). De verdediging is het ontbreken van een cijfer en het maximum van één
    herschrijving. Op de proef werd volgens de documentatie 5 van 9 pagina's herschreven, toen nog ook bij
    alleen een ongedekte zin. Sinds 29 september 2026 is dat geen reden meer (14.4); of de drempel ("niet
    goed", een verzonnen zin of een verboden woord) nu goed staat, is nog niet tegen productie nagerekend.
16. **De controle in code ziet geen beweringen zonder getal of beloftewoord** (14.1).
17. **Blok A kan tot 150 items bevatten**; of goede feiten in een lange lijst verdwijnen is niet gemeten.
18. **De crawler leest `robots.txt` alleen voor sitemapregels** en negeert `Disallow` (3.2). Alleen de technische
    audit interpreteert het bestand.
19. **De schrijfpoort behandelt een onbekend aantal open vragen als "nog niet"** (13.1). Een databasefout bij het
    tellen zet het schrijven dus stil tot de ochtendronde (11.6).
20. **De kennistest meet één plaats** (`service_regions[0]`), ook bij meerdere vestigingen (3.8).
21. **Fase 3 tot en met 5 van de pijplijnanalyse zijn gebouwd, niet geverifieerd.** De wijzigingen van 29
    september 2026 (9.4, 9.5, 10.1, 11.2, 13.2, 13.3, 13.5, 14.3 tot en met 14.6, 7.3, 7.4, 3.9) zijn getest
    met eenheids- en ketentests, maar nog niet tegen productie of opgeslagen klantdata nagerekend
    (`docs/tasks/pijplijnanalyse-contentketen.md` §10). Een rapport van vóór die datum heeft geen rol en geen
    kernvraag, dus bestaande kansen en pagina's krijgen die pas na een nieuw rapport.
22. **Het samenvoegen van kansen kijkt niet door naar de pagina.** Gaat een nieuwe kans als bewijs bij een open
    kans die al een pagina in voorbereiding heeft (9.5), dan krijgt de telling van die kans de extra
    doelvragen, maar de schrijver van die pagina leest zijn doelvragen nog uit het oorspronkelijke rapport
    (`laadDoelvragen()` via `source_ref`). Afgeleid uit de code.

**Kwaliteitsborging in de repository**

- Vóór elke commit horen `npx tsc --noEmit`, `npm run test:unit`, `npm run test:chain` en `npm run build`
  groen te zijn (`CLAUDE.md`). Bij de samenvoeging in PR #208 (30 september 2026) waren alle vier groen, met
  5.020 eenheidstests en 825 ketentests. Minder dan de 5.684 en 1.004 van een dag eerder, omdat de tests
  van de Sales-module met die module zijn verwijderd. Bij die samenvoeging bleek ook dat het
  eenheidstestbestand sinds het verwijderen van Sales halverwege stopte en ruim 1.400 tests stil oversloeg
  terwijl de uitslag "0 mislukt" gaf; de samenvatting staat nu onderaan het bestand, zodat dat niet meer
  kan. `npm run test:openai` doet echte, betaalde aanroepen; `npm run eval:mention` toetst de
  beoordeling uit 8.3.
- De tests vervangen de AI met `__setTestTransport()` (0.4), zodat de ketentests (`scripts/test-chain.ts`) de
  volledige keten zonder betaalde aanroepen kunnen doorlopen.
