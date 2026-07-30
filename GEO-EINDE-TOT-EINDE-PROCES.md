# GEO Tracker — Eind-tot-eind procesdocument (huidige stand, `main`)

> **Doel van dit document.** Eén volledig, gedetailleerd overzicht van het proces zoals het
> **nu daadwerkelijk in de code op de `main`-branch staat** (de versie die via Vercel online
> staat) — vanaf het aanmaken van een account tot en met het genereren, publiceren en
> effect-meten van content. Bedoeld voor de product owner, de klant, de softwareontwikkelaar
> en de prompt engineer samen, zodat iedereen vanuit dezelfde feitelijke basis het proces kan
> beoordelen, knelpunten kan aanwijzen en verbeteringen kan voorstellen.
>
> **Dit document bevat uitsluitend de huidige status — geen aanbevelingen, geen meningen,
> geen toekomstplannen.** Waar de bestaande planningsdocumenten (`abcplan.md`,
> `optimalisatie.md`) afwijken van wat de code daadwerkelijk doet, is de code leidend en is
> dat expliciet aangegeven. Elke bewering hieronder is geverifieerd tegen de broncode; waar
> een bestand/regel relevant is, wordt die genoemd zodat iedereen het zelf kan naslaan.
>
> **Peildatum:** juli 2026, branch `main`. **Taal van de app:** Nederlands (UI, AI-prompts,
> AI-output). Dit document zelf is in het Nederlands opgesteld, net als de rest van de
> projectdocumentatie.

---

## Inhoudsopgave

1. [Actoren en rollen](#1-actoren-en-rollen)
2. [Architectuur — hosting en dataflow](#2-architectuur--hosting-en-dataflow)
3. [Kernbegrippen en datamodel](#3-kernbegrippen-en-datamodel)
4. [AI-modellen, temperaturen en feature-flags](#4-ai-modellen-temperaturen-en-feature-flags)
5. [Statusmachines](#5-statusmachines)
6. [Het eind-tot-eind proces, stap voor stap](#6-het-eind-tot-eind-proces-stap-voor-stap)
   - 6.0 Toegang / registratie / inloggen
   - 6.1 Een klantprofiel aanmaken (onboarding-wizard)
   - 6.2 Profielonderzoek (achtergrondtaak, 1e AI-call)
   - 6.3 Content-inventaris (crawl, geen AI)
   - 6.4 Technische GEO-audit (geen AI)
   - 6.5 Een analyse aanmaken
   - 6.6 Onderwerp-onderzoek (A1', 2e AI-call)
   - 6.7 Promptgeneratie (A2, 3 AI-calls parallel) + volumekalibratie (1 AI-call)
   - 6.8 Het conceptscherm — de goedkeuringspoort
   - 6.9 Bevestigen & meten (A3: per prompt 2 AI-calls)
   - 6.10 Aggregatie, entiteiten en concurrentclassificatie (3c)
   - 6.11 Rapport genereren (B1 + B2, 2 AI-calls) + e-mail
   - 6.12 Content genereren (Fase C: tot 4 AI-calls per pagina)
   - 6.13 De Content Bibliotheek
   - 6.14 Publiceren en verifiëren
   - 6.15 Effect meten (impact-golven)
   - 6.16 Off-site zichtbaarheid (1 AI-call + externe API's)
   - 6.17 Terugkerende maandelijkse meting
   - 6.18 Feitenvragen aan de klant
7. [De achtergrond-jobwachtrij](#7-de-achtergrond-jobwachtrij)
8. [Volledig overzicht van alle AI-aanroepen](#8-volledig-overzicht-van-alle-ai-aanroepen)
9. [Rechten, schrijfstrategie en beveiliging](#9-rechten-schrijfstrategie-en-beveiliging)
10. [E-mail en notificaties](#10-e-mail-en-notificaties)
11. [Bijlage — bestandenoverzicht](#11-bijlage--bestandenoverzicht)

---

## 1. Actoren en rollen

| Actor | Rol in het proces |
|---|---|
| **Klant (eindgebruiker)** | Maakt een account, richt één of meer klantprofielen (merken) in, maakt daaronder analyses (getrackte onderwerpen), keurt het meetplan goed, beoordeelt het rapport, laat content schrijven, publiceert die zelf op zijn eigen website, meldt publicatie terug aan de app. |
| **Vercel** | Host de Next.js-applicatie (frontend + API-routes + twee lichte cron-taken). Voert geen zware/lange taken uit buiten de job-werker. |
| **Supabase pg_cron** | Roept elke minuut `/api/cron/worker` aan — dit is de motor die de achtergrond-wachtrij (`jobs`-tabel) afwerkt. Zonder deze cron gebeurt er niets. |
| **Supabase Postgres + Auth** | Slaat alle data op (profielen, analyses, prompts, metingen, rapporten, content, jobs, kostenlogboek) en verzorgt e-mail+wachtwoord-authenticatie. |
| **OpenAI (Responses API)** | Voert alle AI-taken uit: onderzoek, promptgeneratie, het "simuleren" van AI-antwoorden, classificatie van vermeldingen, concurrentie-analyse, rapportage, contentgeneratie en -redactie, entiteitclassificatie, bronanalyse, off-site-aanwezigheidscheck. Uitsluitend OpenAI; geen tweede LLM-provider. |
| **Resend** | Verzendt rapport-mails en publicatie-herinneringen — alleen als `EMAILS_ENABLED=true`. |
| **Externe website van de klant** | Wordt door de eigen Node.js-crawler van de app gelezen (geen AI-kosten) voor het profielonderzoek, de content-inventaris en de publicatiecontrole. |

---

## 2. Architectuur — hosting en dataflow

```
Klant (browser/mobiel)
        │
        ▼
   Vercel — Next.js/Node.js  (hoster: Vercel, code: GitHub)
   ├─ Frontend: /profielen, /analyses (tabs: Overzicht·Antwoorden·Rapport·Bibliotheek·Instellingen)
   ├─ API-routes: CRUD + schrijfacties (service-role key + expliciete ownership-check)
   ├─ Twee lichte cron-taken (vercel.json, Hobby-limiet: max. 2, elk max. 1×/dag):
   │    • /api/cron/tracking  — maandelijks, 1e van de maand 06:00 UTC
   │    • /api/cron/reminders — wekelijks, maandag 09:00 UTC
   └─ /api/cron/worker — de motor, elke MINUUT aangeroepen door Supabase pg_cron
        (niet door Vercel Cron: dat zou meer dan 2 taken/dag vergen, buiten het Hobby-plan)
        │
        ├────────────► OpenAI Responses API (gpt-4.1-nano / gpt-4.1-mini / gpt-4.1, + web_search)
        │
        ▼
   Supabase (Postgres + Auth)
   ├─ auth.users
   ├─ profiles (klant/merk, accountniveau) → analyses (getrackt onderwerp) → prompts
   │    → tracking_runs → tracking_run_mentions → visibility_scores / competitor_breakdown
   ├─ entities (gededupliceerd merk-/concurrentregister)
   ├─ reports, content_pieces, content_piece_targets, content_impact
   ├─ technical_audits, source_landscape, offsite_tasks
   ├─ fact_requests
   ├─ jobs (achtergrond-wachtrij — GEEN client-toegang, ook geen SELECT)
   └─ ai_calls (kostenlogboek: 1 rij per OpenAI-aanroep)
        │
        └──────────────► Resend (rapport-mail, publicatieherinnering) — alleen als EMAILS_ENABLED=true
```

**Uitvoeringsmodel.** Alle korte, directe acties (CRUD, een status opvragen, een knop
indrukken) lopen via een gewone Next.js API-route. Al het zware/langlopende werk (elke
AI-aanroep in de pijplijn) loopt via de **jobwachtrij** in Supabase (`lib/jobs/`): een
API-route zet alleen een taak klaar (`enqueue`), en `/api/cron/worker` voert die taken
minuutlijks in kleine batches uit. Dit is nodig omdat serverless functies een tijdslimiet
hebben (de werker-route staat op `maxDuration = 300`, zie `app/api/cron/worker/route.ts`) en
omdat het werk moet doorlopen ook als de klant zijn browser sluit.

---

## 3. Kernbegrippen en datamodel

| Begrip | Betekenis |
|---|---|
| **Profiel** (`profiles`) | Eén klantprofiel = één merk/bedrijf, **accountniveau**. Bevat het bedrijfsbrede onderzoek: merknaam, aliassen, branche, producten, waardeproposities, concurrenten, tone-of-voice, persona's, `proof_points` (citeerbare feiten) en `style_samples` (stijlvoorbeelden). Eén account kan meerdere profielen hebben (bv. een bureau met meerdere merken). Eenmalig onderzocht; alle analyses onder dit profiel hergebruiken het. |
| **Analyse** (`analyses`) | Eén getrackt **onderwerp/product** onder een profiel (bv. "MediaMarkt" + onderwerp "iPhone"). Verplicht gekoppeld aan één profiel (`profile_id`) en verplicht voorzien van een onderwerp (`topic`) — een analyse zonder onderwerp voegt niets toe aan wat het profiel al dekt. Eén profiel kan meerdere analyses hebben. |
| **Prompt** (`prompts`) | Eén te meten vraag ("Waar koop ik het beste een iPhone?"), gegroepeerd per **funnelfase** (`Oriëntatie` / `Overweging` / `Beslissing`). 30 per analyse (10 per fase), automatisch gegenereerd én door de klant beheerbaar. |
| **Tracking run** (`tracking_runs`) | Eén meting van één prompt op één moment: het ruwe gesimuleerde AI-antwoord + de beoordeling ervan. |
| **Tracking run mention** (`tracking_run_mentions`) | Eén rij per **entiteit** (eigen merk of een gevonden merk) per meting: genoemd of niet, positie, sentiment, geciteerde bronnen. |
| **Entiteit** (`entities`) | Het gededupliceerde merken-register per profiel (`Coolblue`, `coolblue.nl` en `Coolblue B.V.` worden één entiteit). Elke entiteit krijgt een **rol**: `eigen_merk`, `eigen_product`, `concurrent`, `brancheorganisatie`, `vergelijker` of `niet_relevant`. |
| **Visibility score** (`visibility_scores`) | De geaggregeerde zichtbaarheidsscore per analyse per periode: ongewogen, gewogen, share-of-voice, onzekerheidsmarges. |
| **Competitor breakdown** (`competitor_breakdown`) | Per periode, per concurrent-entiteit: aantal vermeldingen, per funnelfase, meest geciteerde bronnen, winnende/verliezende meting-ID's. |
| **Report** (`reports`) | Het rapport per periode: samenvatting, gaps, aanbevelingen (met doelvragen-koppeling), periodewijziging, feitenvragen. |
| **Content piece** (`content_pieces`) | Eén gegenereerde/herschreven pagina: titel, type, body (Markdown), meta-tags, FAQ, schema.org JSON-LD, kwaliteits-/GEO-score, publicatiestatus, gemeten effect. Versiebeheer: elke herstart maakt een nieuwe versie, met precies één "huidige" versie per (analyse, titel). |
| **Job** (`jobs`) | Eén taak in de achtergrond-wachtrij. Geen enkele klant-toegang (RLS deny-all). |
| **ai_calls** | Kostenlogboek: één rij per OpenAI-aanroep (model, tokens, kosten, `kind`, gekoppelde analyse/profiel). |

**Vastgelegd principe: alles wordt bewaard.** Elke AI-aanroep in de pijplijn slaat zijn
volledige ruwe JSON-output op (`raw_json`, `mention_json`, `source_raw_json`,
`critique_raw_json`, …), naast de uitgesplitste kolommen die de UI gebruikt.

---

## 4. AI-modellen, temperaturen en feature-flags

Bron: `lib/openai/models.ts`, `lib/config.ts`. De modelkeuze staat **vast in de code**, niet
als omgevingsvariabele.

| Constante | Waarde | Gebruikt voor |
|---|---|---|
| `MODELS.volume` | `gpt-4.1-nano` | Hoogvolume/classificatie: de beoordeling van elke meting (3b). |
| `MODELS.quality` | `gpt-4.1-mini` | Laagvolume/kwaliteitsgevoelig: profiel- en onderwerp-onderzoek, promptgeneratie, volumekalibratie, het gesimuleerde AI-antwoord (3a), gap-analyse, rapport, entiteitclassificatie, content-redactie/kritiek, bronanalyse. |
| `MODELS.content` | `gpt-4.1` (vol) | Uitsluitend het schrijven en herschrijven van content-pagina's (Fase C) — het betaalde eindproduct. |

| Temperatuur-constante | Waarde | Voor welk soort werk |
|---|---|---|
| `TEMPERATURES.deterministic` | 0 | Classificeren/beoordelen: mention-detectie (3b), entiteitclassificatie, content-redactie/kritiek. |
| `TEMPERATURES.analytical` | 0,2 | Analyseren/samenvatten: profiel- en onderwerp-onderzoek, volumekalibratie, gap-analyse, rapport. |
| `TEMPERATURES.creative` | 0,8 | Promptgeneratie — variatie is hier gewenst. |
| `TEMPERATURES.content` | 0,7 | Content schrijven/herschrijven. |
| `SIMULATION_TEMPERATURE` | `undefined` (standaard) | Het gesimuleerde AI-antwoord (3a) — bewust géén eigen temperatuur, om te meten wat een AI-assistent op standaardinstellingen zou antwoorden. |

**Feature-flags (omgevingsvariabelen, `lib/config.ts`):**

| Variabele | Effect indien uit |
|---|---|
| `SIGNUPS_ENABLED` | Registratie-UI verborgen, registratie-actie weigert (app-laag; de harde poort is de Supabase-instelling "Allow new users to sign up"). |
| `WEB_SEARCH_ENABLED` (standaard aan) | Zet `web_search` uit op alle drie de plekken: de meting (3a), het profielonderzoek en het onderwerp-onderzoek. Grootste kostenknop van het product (~94% van de meetkosten zit in de `web_search`-call). |
| `MEASURE_WEB_SEARCH` | Fijnere schakelaar: alleen de meting (3a) groundless, ongeacht `WEB_SEARCH_ENABLED`. |
| `CONTENT_WEB_SEARCH` | Web-zoeken tijdens het schrijven, alleen als vangnet bij te weinig `proof_points` (< 3, zie `minProofPointsForConcreteContent`). |
| `SOURCE_ANALYSIS` (standaard aan) | Analyseert de geciteerde bronnen vóór het schrijven (1 extra mini-call + HTTP-verzoeken). |
| `EMAILS_ENABLED` (standaard uit) | Hoofdschakelaar voor alle uitgaande e-mail. |
| `MAX_MEASUREMENT_PERIODS` (standaard onbeperkt) | Plafond op het aantal periodieke metingen. |
| `promptsPerFunnelStage` | Vast op 10 (× 3 funnelfasen = 30 prompts per analyse). |

---

## 5. Statusmachines

### 5.1 `profiles.status`
`bezig` → `klaar` (of `mislukt`). Gezet door `prepareProfile()` (`lib/pipeline/prepare-profile.ts`).

### 5.2 `analyses.status`
Bron: `lib/analysis-status.ts`, `lib/pipeline/prepare.ts`, `lib/pipeline/measure.ts`,
`lib/jobs/handlers.ts`, `lib/pipeline/report.ts`.

| Status | UI-label | Betekenis |
|---|---|---|
| `bezig` | "Bezig…" | Onderwerp-onderzoek + promptgeneratie lopen. |
| `concept_klaar` | "Wacht op jouw goedkeuring" (visueel geprioriteerd, bovenaan de lijst) | Onderwerp-onderzoek + 30 prompts staan klaar; wacht op de klant op het conceptscherm. |
| `meten` | "Meten…" | Klant heeft bevestigd; de metingen (3a/3b) lopen. |
| `gemeten` | "Score klaar, rapport volgt" | Nulmeting + aggregatie (3c) klaar; rapport (B1/B2) loopt nog. |
| `gereed` | "Gereed" | Rapport ook klaar. Blijft `gereed` bij elke volgende periodieke meting (die gaat niet terug naar `meten`/`gemeten`). |
| `mislukt` | "Mislukt" (met retry-knop) | Een stap is na alle pogingen definitief mislukt. |

---

## 6. Het eind-tot-eind proces, stap voor stap

Elke stap hieronder wordt beschreven vanuit (a) wat de gebruiker ziet/doet, (b) wat er
technisch gebeurt, en (c) — waar van toepassing — de exacte AI-input en -output.

### 6.0 Toegang / registratie / inloggen

**Gebruiker.** Inlogscherm met e-mail + wachtwoord (`app/(auth)/login`). Registratie
(`app/(auth)/register`) is alleen zichtbaar/bruikbaar als `SIGNUPS_ENABLED=true`; anders
krijgt de bezoeker de melding "Registratie is momenteel niet mogelijk. Toegang is op
uitnodiging." Na succesvol inloggen: redirect naar `/analyses` ("Mijn analyses").

**Techniek.** Supabase Auth (e-mail+wachtwoord), server actions in `app/(auth)/actions.ts`
(`signIn`, `signUp`, `signOut`). `requireUser()`/`getUser()` (`lib/auth.ts`) beveiligen elke
server component/route die een ingelogde gebruiker vereist. Er is geen aparte
rollen-/rechtenstructuur boven "ingelogde gebruiker" — eigenaarschap wordt per rij bepaald
via `user_id`.

Geen AI-aanroepen in deze stap.

---

### 6.1 Een klantprofiel aanmaken (onboarding-wizard)

**Gebruiker.** Op `/profielen/nieuw` (`onboarding-wizard.tsx`) ziet de klant eerst **twee
verplichte velden**: bedrijfsnaam en website. Twee gelijkwaardige knoppen:
- **"Start het onderzoek"** — direct starten met alleen naam + URL.
- **"Eerst meer vertellen (3 korte vragen)"** — opent 3 extra stappen.

Bij "meer vertellen" doorloopt de klant 4 stappen in totaal (`STEP_TITLES`):
1. **Bedrijf** — naam*, website*, aliassen/schrijfwijzen (optioneel).
2. **Wat je doet** — korte omschrijving*, branche*, producten/diensten* (min. 1), waardeproposities (optioneel).
3. **Markt & concurrentie** — bereik (lokaal/landelijk/internationaal, optioneel), regio's (optioneel), markt & taal (optioneel), concurrenten* (min. 1).
4. **Doelgroep, stijl & techniek** — doelgroep*, tone-of-voice*, sitemap-URL (optioneel).

Kiest de klant voor de snelle start, dan slaat hij alle bovenstaande extra velden over; die
worden dan volledig door AI-onderzoek ingevuld. Vult hij ze wel in, dan zijn de
velden met een `*` verplicht om verder te kunnen.

De website-URL wordt live gevalideerd op formaat (`checkUrlFormat`). Bij indienen
controleert de server of de site bereikbaar is (`isReachable`); is dat niet zo, dan krijgt
de klant een waarschuwing mét de mogelijkheid om toch door te gaan (`force`-knop) — geen
harde blokkade, want een site kan legitiem bestaan maar botcontrole hebben.

Na indienen: redirect naar `/profielen/[id]`, waar de klant de voortgang van het
achtergrondonderzoek ziet (status "Onderzoek loopt…" → "Klaar").

**Techniek.** `POST /api/profiles` (`app/api/profiles/route.ts`):
1. Auth-check (`getUser`).
2. URL-formaat- en bereikbaarheidscontrole.
3. Insert in `profiles` met `status: "bezig"` en alle door de klant ingevulde velden
   (leeg = `null`/lege lijst, zodat de AI die mag aanvullen).
4. Twee taken op de wachtrij gezet (`enqueue`, elk met een dedupe-sleutel zodat een dubbele
   aanroep geen dubbel werk oplevert):
   - `profile_research` — het AI-onderzoek (zie 6.2).
   - `technical_audit` — de robots.txt-controle (zie 6.4), los zodat een onbereikbare site
     het profielonderzoek niet laat mislukken.
5. Response: `{ id }`, status 201.

Geen AI-aanroep in deze route zelf — die gebeurt asynchroon door de werker.

---

### 6.2 Profielonderzoek (achtergrondtaak, 1e AI-call)

**Gebruiker.** Ziet op de profielpagina een voortgangsindicator totdat `status = "klaar"`.
Geen verdere actie vereist; de klant kan het scherm sluiten.

**Techniek.** Taak `profile_research` → `prepareProfile()` (`lib/pipeline/prepare-profile.ts`):
1. **Content-inventaris crawlen** (zie 6.3) start **parallel**, best-effort (mislukt hij,
   dan blokkeert dat het profiel niet).
2. **Eigen crawl** van de homepage (+ enkele kernpagina's) via `crawlSite()` — een gewone
   `fetch` + HTML-naar-platte-tekst-extractie, **geen API-kosten**.
3. **AI-call** `generateProfileResearch()` (`lib/pipeline/profile-research.ts`):
   - **Model:** `gpt-4.1-mini`. **`web_search`:** aan (indien `webSearchEnabled`).
     **Temperatuur:** 0,2 (`analytical`).
   - **Input (samengevat):** de website-URL, de geëxtraheerde website-tekst, en — indien
     ingevuld — een blok met de intake-gegevens van de klant met de instructie: *"RESPECTEER
     dit: verzin geen andere merknaam, branche of concurrenten als die gegeven zijn, en
     gebruik het als leidraad; VUL de rest aan en verrijk."*
   - **Systeeminstructie (kern):** *"Analyseer dit bedrijf op basis van de website-tekst en
     het web. Bepaal: branche, kernproducten/-diensten, tone-of-voice, doelgroep-persona's,
     waardeproposities en 3–5 belangrijkste concurrenten van het HELE bedrijf. Bepaal ook de
     canonieke merknaam (brandName) zoals klanten die kennen — niet het domein. Extraheer
     daarnaast, UITSLUITEND op basis van wat letterlijk in de website-tekst staat: (a)
     proofPoints — concrete, citeerbare feiten; (b) styleSamples — 2-3 letterlijke
     voorbeeldzinnen."*
   - **Output-schema** (`ProfileResearch`, `lib/schemas/profile.ts`): `brandName`,
     `industry`, `products[]`, `toneOfVoice`, `personas[{name, needs[]}]`, `valueProps[]`,
     `competitors[]`, `summary`, `proofPoints[]`, `styleSamples[]`.
4. **Samenvoegen (klant leidend, AI vult aan):** ingevulde scalars van de klant blijven
   staan; lijsten (`products`, `valueProps`, `competitors`) worden een gededupliceerde unie
   van klant + AI; `proofPoints`/`styleSamples` komen altijd van de AI (puur uit de site
   geëxtraheerd). Resultaat + volledige ruwe JSON opgeslagen in `profiles`
   (`raw_json`-kolom), status → `"klaar"`.
5. Mislukt een van deze stappen, dan `status: "mislukt"`.

Idempotent: is `status` al `"klaar"`, dan doet de taak niets.

---

### 6.3 Content-inventaris (crawl, geen AI)

**Techniek.** `crawlInventory()` (`lib/crawler.ts`), aangestuurd door
`profile.max_inventory_pages` (5–150) en optioneel `profile.sitemap_url`. Ontdekking:
`robots.txt` lezen voor de sitemap-locatie(s) → sitemap-index'en recursief volgen → alleen
als er écht geen sitemap is: links vanaf de homepage volgen. Webshop-productpagina's worden
uitgesloten (hele product-sitemaps zoals Shopify `sitemap_products_*.xml` of Yoast
`product-sitemap.xml`, plus losse `/product(s)/`-URL's); categorie-/`collections`-pagina's
blijven wél staan. Resultaat: rijen in `profile_pages` (URL, titel, tekst-fragment). Draait
zowel bij het aanmaken van een profiel als opnieuw via de knop **"Vernieuw inventaris"**
(`POST /api/profiles/[id]/refresh-inventory`), zonder het merkonderzoek te raken.

Geen AI-aanroep.

---

### 6.4 Technische GEO-audit (geen AI)

**Techniek.** Taak `technical_audit` → `runAuditForProfile()` (`lib/audit/store.ts`,
`lib/audit/robots.ts`, `lib/audit/ai-crawlers.ts`, `lib/audit/technical.ts`). Pure
HTTP-/tekstcontrole: haalt `robots.txt` op en checkt of bekende AI-crawlers (o.a. `GPTBot`,
`CCBot`) geblokkeerd worden. Resultaat opgeslagen in `technical_audits` (`checks_json`, met
per controle een `severity`, o.a. `"blocker"`).

`lib/audit/gate.ts` (`loadAuditGate`) leest de laatste audit en bepaalt of er actieve
`blocker`-bevindingen zijn, plus sinds wanneer die blokkade aaneengesloten bestaat. Zijn er
blockers, dan wordt contentgeneratie voor die klant geblokkeerd totdat het probleem is
opgelost — extra content heeft geen zin als AI-crawlers de site niet eens kunnen lezen.

Draait bij het aanmaken van een profiel én opnieuw bij elke maandelijkse tracking-cron (één
keer per profiel, niet per analyse — zie 6.17).

Geen AI-aanroep.

---

### 6.5 Een analyse aanmaken

**Gebruiker.** Op `/analyses/new` (`new-analysis-form.tsx`) kiest de klant:
- **Merk\*** — dropdown met zijn bestaande, klare profielen.
- **Product/onderwerp\*** — vrij tekstveld, **verplicht** (niet optioneel — zonder
  onderwerp voegt een analyse niets toe aan wat het profiel al dekt).
- **Content-brief (optioneel)** — vrije tekst over de gewenste hoek/doelgroep van de content,
  bv. *"Richt de content op sollicitanten die zich voorbereiden op een gesprek…"*.
- **E-mail bij gereed** (checkbox, standaard aan, alleen zichtbaar als `EMAILS_ENABLED`).

Na indienen: redirect naar `/analyses/[id]`, dat vanwege de status meteen naar het
voortgangs-/conceptscherm doorstuurt.

**Techniek.** `POST /api/analyses` (`app/api/analyses/route.ts`):
1. Auth + validatie: onderwerp verplicht, profiel moet bestaan, van deze gebruiker zijn, en
   `status === "klaar"` (anders 409 "Dit merk is nog niet klaar met onderzoeken.").
2. Insert in `analyses`: `profile_id`, `url` (overgenomen/gesnapshot van het profiel),
   `topic`, `name` (auto-gegenereerd, `buildAnalysisName`), `content_brief`,
   `notify_by_email`, `status: "bezig"`.
3. Eén taak op de wachtrij: `prepare_analysis`.

Geen AI-aanroep in deze route zelf.

---

### 6.6 Onderwerp-onderzoek (A1', 2e AI-call)

**Gebruiker.** Ziet het voortgangsscherm; geen actie vereist.

**Techniek.** Taak `prepare_analysis` → `prepareTopicResearch()` (`lib/pipeline/prepare.ts`).
Dit is bewust een **aparte taak** van de promptgeneratie (zie hieronder) — anders past het
niet binnen de tijdslimiet van één werker-aanroep.

`generateTopicResearch()` (`lib/pipeline/topic-research.ts`):
- **Model:** `gpt-4.1-mini`. **`web_search`:** aan. **Temperatuur:** 0,2.
- **Input:** de al gecrawlde `profile_pages` (max. 40 pagina's met inhoud, elk tot 400
  tekens), plus profielcontext (merknaam, website, branche, bestaande bedrijfsbrede
  concurrenten), het onderwerp, en — indien ingevuld — de content-brief van de klant.
- **Systeeminstructie (kern):** *"Dit bedrijf heeft al een profiel; jouw taak is ALLEEN het
  specifieke onderwerp '{topic}' te onderzoeken: (1) wat zegt de website specifiek over dit
  product/thema (contentSummary), en (2) welke 3–5 concurrenten zijn relevant VOOR DIT
  SPECIFIEKE ONDERWERP (niet per se dezelfde als de algemene concurrenten van het bedrijf)."*
- **Output-schema** (`TopicResearch`, `lib/schemas/topic-research.ts`): `contentSummary`
  (string), `competitors` (string[]).
- Opgeslagen in `topic_research` (1 rij per analyse, incl. `raw_json`).

Vervolgens ketent de taak automatisch door naar `generate_prompts`.

---

### 6.7 Promptgeneratie (A2, 3 AI-calls parallel) + volumekalibratie (1 AI-call)

**Gebruiker.** Nog steeds het voortgangsscherm; geen actie.

**Techniek — promptgeneratie.** Taak `generate_prompts` → `generateAnalysisPrompts()`
(`lib/pipeline/prepare.ts`) → `generatePrompts()` (`lib/pipeline/prompts.ts`). Voor elk van
de **3 funnelfasen** (`Oriëntatie`, `Overweging`, `Beslissing`) draait een **eigen, parallelle
call** die `promptsPerFunnelStage` (= 10) prompts oplevert:

- **Model:** `gpt-4.1-mini`. **`web_search`:** uit. **Temperatuur:** 0,8 (`creative`).
- **Systeeminstructie (kern):** *"Je bedenkt realistische vragen ('prompts') die een echte
  koper aan een AI-assistent zoals ChatGPT stelt. Schrijf natuurlijke, gesproken vragen —
  geen losse zoekwoorden."* Plus een **harde merk-/concurrentneutraliteitsregel**: de
  eigen merknaam/het domein en elk bedrijf uit de concurrentenlijst mag **nooit** in de
  prompttekst voorkomen (generieke productmerken/-categorieën mogen wel). Reden: een prompt
  met de eigen merknaam erin garandeert een vermelding en meet dus niets — de meting moet
  spontane vermeldingen meten.
- **Per funnelfase een eigen briefing:**
  - *Oriëntatie* — "AWARENESS: brede oriëntatievragen van iemand die zich net inleest en
    nog geen aanbieder kent."
  - *Overweging* — "CONSIDERATION: vragen waarin iemand opties/aanpakken/type-aanbieders
    vergelijkt vóór een aankoop, zonder een merk te noemen."
  - *Beslissing* — "DECISION: vragen van iemand die klaar is om te kiezen/kopen/boeken."
  - Extra sturing indien van toepassing: content-brief van de klant, en bij een lokaal
    bedrijf met bekende regio's — verwerk plaatsnamen in een deel van de prompts.
- **Output-schema** (`PromptSet`, `lib/schemas/prompts.ts`): per prompt `text`, `intent`
  (job-to-be-done), `intentType` (`informational`/`commercial`/`transactional`),
  `specificity` (`head`/`long_tail`), `purchaseIntent` (boolean), `cluster` (thema-label).
- **Vangnet:** elke teruggekregen prompt wordt gecontroleerd op verboden merk-/domeintokens
  (`containsForbidden`, hele-woord-matching, regex-gebaseerd); wordt er iets weggegooid, dan
  volgt een **aanvulronde** (max. 2 pogingen per funnelfase) die alleen het ontbrekende
  aantal opnieuw vraagt zonder de al verzamelde prompts te herhalen. Blijft het na 2 pogingen
  te kort, dan wordt het gewoon met minder prompts doorgezet (met een `console.warn`); levert
  een fase **nul** prompts op, dan faalt de hele analyse (`status: "mislukt"`).
- Resultaat: 30 rijen in `prompts` (`category` = funnelfase, `created_by: "system"`,
  `source_raw_json` = de ruwe output van de betreffende call, `volume_estimate: 50`
  voorlopig, `active: true`).

Daarna keten naar `calibrate_volumes`, en pas dan `status: "concept_klaar"`.

**Techniek — volumekalibratie.** Taak `calibrate_volumes` → `calibratePromptVolumes()` →
`calibrateVolumes()` (`lib/pipeline/prompts.ts`):

- **Eén call** die **alle** prompts van de analyse in één keer relatief weegt.
- **Model:** `gpt-4.1-mini`. **`web_search`:** uit. **Temperatuur:** 0,2.
- **Systeeminstructie:** *"Schat hoe vaak elke onderstaande vraag door echte mensen aan een
  AI-assistent/zoekmachine gesteld wordt, RELATIEF ten opzichte van elkaar. Gebruik de VOLLE
  schaal 0-100."*
- **Input:** de genummerde lijst van alle prompt-teksten.
- **Output-schema** (`VolumeCalibration`): `weights[{index, volume}]`.
- Elke prompt krijgt zijn `volume_estimate` bijgewerkt plus een afgeleide `volume_band`
  (`bandFromEstimate`, hoog/midden/laag — alleen de **band** weegt en verschijnt in de UI,
  niet het ruwe getal). Mislukt de call, dan blijft elke prompt op het neutrale 50/"midden"
  staan; dit raakt de analysestatus niet (cosmetische verfijning, geen blokkerende stap).

Dit is een verfijning **na** de goedkeuringspoort — de klant hoeft er niet op te wachten.

---

### 6.8 Het conceptscherm — de goedkeuringspoort

**Gebruiker.** Zodra `status = "concept_klaar"` landt de klant op `/analyses/[id]/concept`
(`app/(app)/analyses/[id]/concept/page.tsx`) — een eigen, dedicated scherm (niet meer
onderdeel van "Instellingen"). Hij ziet, in deze volgorde:
1. Kop **"Dit gaan we meten"**.
2. **Waar het over gaat** — website, onderwerp, merknaam, branche, en de lijst concurrenten
   die uit de vragen geweerd worden (met link "Merk bewerken" naar de profielpagina).
3. **Onderwerp-onderzoek** — bewerkbaar (`TopicResearchEditor`).
4. **Content-brief** — bewerkbaar (`ContentBriefEditor`).
5. **De volledige lijst van 30 prompts**, per funnelfase, elk **bewerkbaar**: tekst/categorie
   wijzigen, toevoegen, verwijderen, aan/uit zetten (`PromptsManager`).
6. Onderaan: **"Bevestig en start meting"**-balk (`ConfirmBar`) — **alleen zichtbaar als er
   minstens één actieve prompt is**; staat alles uit, dan toont de pagina een waarschuwing in
   plaats van een knop die zou doodlopen.

Is de analyse al bevestigd (status ≠ `concept_klaar`), dan stuurt deze route automatisch door
naar `/analyses/[id]` — het scherm bestaat alleen voor deze ene, verplichte stap.

**Techniek.** Puur weergave + CRUD op bestaande data, **geen AI-aanroep** in deze stap zelf.

---

### 6.9 Bevestigen & meten (A3: per prompt 2 AI-calls)

**Gebruiker.** Klik op **"Bevestig en start meting"**. Daarna: voortgangsindicator op tab
Overzicht ("Bezig met meten…").

**Techniek — bevestiging.** `POST /api/analyses/[id]/confirm`
(`app/api/analyses/[id]/confirm/route.ts`):
1. Alleen toegestaan als `status === "concept_klaar"`.
2. Controleert dat er minstens één actieve prompt is (anders 409, met duidelijke melding).
3. **Plant eerst de metingen in** (`enqueueMeasurement`, één `measure_prompt`-taak per
   actieve prompt, periode 0), **dan pas** `status: "meten"` — deze volgorde voorkomt dat de
   status belooft wat het inplannen niet waarmaakt.

**Techniek — per prompt (`measure_prompt`-taak), `measureOnePrompt()` in
`lib/pipeline/measure.ts`:**

**Stap 3a — het AI-antwoord simuleren:**
- **Model:** `gpt-4.1-mini` (níet nano — `web_search` bleek onbetrouwbaar op nano, zie
  code-commentaar: "meting faalde 10/10 met web_search op nano"). **`web_search`:** aan
  (indien enabled). **Temperatuur:** geen (bewust standaardinstelling, om realistisch te
  simuleren wat een AI-assistent op standaardinstellingen zou antwoorden).
- **Systeeminstructie:** *"Je bent een behulpzame AI-assistent (zoals ChatGPT) die vragen
  van gebruikers beantwoordt. Gebruik web search om actuele, feitelijke informatie te
  vinden. Noem concrete merken, bedrijven of bronnen waar relevant."*
- **Input (user-message):** de letterlijke prompttekst, bv. *"Waar koop ik het beste een
  iPhone?"*
- **Output:** vrije tekst (geen structured output) — het "gesimuleerde" AI-antwoord.
- **Kwaliteitscontrole vóór opslag:** een antwoord onder 40 tekens wordt beschouwd als
  meetfout (leeg/geweigerd antwoord), niet als nulscore, en gooit een fout (de taak wordt
  opnieuw geprobeerd) in plaats van te worden opgeslagen.
- Opgeslagen in `tracking_runs`: `raw_response`, `prompt_text_snapshot`,
  `prompt_category_snapshot` (bevroren op meetmoment), `prompt_weight` (bevroren
  volume-band × koopwaarde), `openai_response_id`, `tokens_used`, `cost_usd`.
- **Idempotent:** zodra dit succesvol is opgeslagen, wordt 3a **nooit** herhaald bij een
  retry — alleen 3b.

**Stap 3b — het antwoord beoordelen:**
- **Model:** `gpt-4.1-nano`. **`web_search`:** uit. **Temperatuur:** 0 (`deterministic`).
- **Input:** het ruwe antwoord uit 3a + de eigen merknaam/aliassen (`ownLabel`,
  `ownAliases`), via de gedeelde `MENTION_SYSTEM`/`buildMentionUser()`
  (`lib/openai/mention-prompt.ts` — dezelfde functie die ook `scripts/eval-mention.ts`
  gebruikt, zodat test en productie exact hetzelfde beoordelen).
- **Output-schema** (`Mention`, `lib/schemas/mention.ts`): een array `mentions[]`, **één rij
  per gevonden entiteit** (niet plat), elk met `entity` (naam), `isOwnBrand`, `mentioned`,
  `position`, `sentiment` (`positive`/`neutral`/`negative`), `citedSources[]`. Concurrenten
  worden dus **ontdekt uit het antwoord zelf**, niet uit een vooraf opgegeven lijst.
- Genormaliseerd weggeschreven naar `tracking_run_mentions` (1 rij per entiteit), en de volledige
  structured output naar `tracking_runs.mention_json` (het veld dat de rest van de app als
  "beoordeeld" herkent).
- **Idempotent:** staat `mention_json` al, dan gebeurt er niets.

**Ketening.** Na elke geslaagde `measure_prompt`-taak controleert de handler of dit de
laatste openstaande meting van deze periode was; zo ja, dan wordt `aggregate_week`
ingepland. Mislukt een meting **definitief** (na alle pogingen), dan checkt
`scheduleFollowUpAfterFailure()` hetzelfde — anders zou de analyse blijven hangen als
precies de laatste taak faalt.

**Drempel.** `measurementIsUsable()`: minstens 70% van de actieve prompts moet succesvol
beoordeeld zijn; anders faalt de aggregatietaak (en bij de nulmeting: `status: "mislukt"`).

---

### 6.10 Aggregatie, entiteiten en concurrentclassificatie (3c)

**Techniek.** Taak `aggregate_week` → `computeAggregates()` (`lib/pipeline/measure.ts`).
Geen "eigen" AI-aanroep voor de aggregatie zelf, maar **wel** een (goedkope) AI-aanroep voor
nieuw ontdekte merken:

1. **Entiteiten koppelen** (`lib/entities/resolve.ts`): elke gemeten merknaam wordt
   genormaliseerd en gekoppeld aan een bestaande of nieuwe rij in `entities`
   (`normalizeEntityName`, `pickCanonicalName` — zo worden "Coolblue", "coolblue.nl" en
   "Coolblue B.V." één entiteit). Nieuwe entiteiten starten met `role_source: "onbepaald"`.
2. **Classificatie van nog onbepaalde entiteiten** (`classifyPendingEntities()`,
   `lib/pipeline/classify-entities.ts`):
   - **Model:** `gpt-4.1-mini`. **`web_search`:** uit. **Temperatuur:** 0.
   - **Input:** de eigen merknaam, branche, onderwerp, eigen producten, en een lijst van tot
     40 nog-onbepaalde merknamen per aanroep (batching).
   - **Systeeminstructie (kern):** *"Je bepaalt per merk welke ROL het speelt ten opzichte
     van één specifiek bedrijf. Wees streng en feitelijk."* Rollen: `concurrent`,
     `eigen_merk`, `eigen_product`, `brancheorganisatie`, `vergelijker`, `niet_relevant`. "Bij
     twijfel tussen 'concurrent' en iets anders: kies het andere."
   - **Output-schema** (`EntityClassification`): per merk een rol + reden.
   - Het eigen merk en eigen producten worden **niet** aan het model voorgelegd (in code al
     bekend). Een handmatig oordeel van de klant (`role_source: "handmatig"`) wordt nooit
     overschreven. Mislukt de call, dan blijven entiteiten `"onbepaald"` en probeert de
     volgende aggregatie het opnieuw — dit blokkeert de score niet.
3. **Zichtbaarheidsscore** (`visibility_scores`): ongewogen score = % beoordeelde metingen
   waarin het eigen merk genoemd wordt; **gewogen score** = som van gewichten (volumeband ×
   koopwaarde) van metingen waarin genoemd, gedeeld door totaalgewicht; **share-of-voice** =
   eigen vermeldingen ÷ (eigen + vermeldingen van entiteiten met rol `concurrent`, niet
   afgewezen); plus **onzekerheidsmarges** (`binomialStderr`, `weightedScoreStderr`,
   `lib/stats/uncertainty.ts`).
4. **Concurrentie-uitsplitsing** (`competitor_breakdown`): per concurrent-entiteit (alleen
   rol `concurrent`, niet `dismissed`): aantal vermeldingen per funnelfase, meest geciteerde
   bronnen, en `winning_run_ids`/`losing_run_ids` (verwijzingen naar `tracking_runs.id` —
   klikbaar bewijs). Concurrenten zonder één vermelding worden niet opgeslagen.

Vervolgens: bij periode 0 → `status: "gemeten"`; in alle gevallen → keten naar
`generate_report`.

---

### 6.11 Rapport genereren (B1 + B2, 2 AI-calls) + e-mail

**Gebruiker.** Tab **Rapport** toont "Rapport wordt opgesteld…" totdat het klaar is; daarna
headline-score, samenvatting, gaps met concurrent + bewijs, en 5–8 aanbevelingen met
"Genereer deze pagina"-knop per aanbeveling. Als `notify_by_email` aanstond én er
inhoudelijk iets veranderd is (zie hieronder): een e-mail.

**Techniek.** Taak `generate_report` → `generateReport()` (`lib/pipeline/report.ts`).
Vooraf: `computeMissedPrompts()` bepaalt de "gemiste vragen" (eigen merk expliciet
niet-genoemd, dus **niet** hetzelfde als "onbeoordeeld"), gesorteerd op bevroren gewicht,
gecodeerd `V1, V2, …`. `computePeriodChange()` berekent puur in code wat er t.o.v. de vorige
periode veranderd is (geen AI-vergelijking van twee periodes — dat gaat mis).

**B1 — concurrentie-gap-analyse:**
- **Model:** `gpt-4.1-mini`. **`web_search`:** uit. **Temperatuur:** 0,2.
- **Systeeminstructie (kern):** *"Je bent een GEO-analist. Op basis van meetdata
  identificeer je concrete zichtbaarheids-gaps: categorieën waarin concurrenten vaker door
  AI-assistenten genoemd worden dan het eigen merk, mét bewijs (run-ID's, bronnen).
  PRIORITEER de gaps op de vragen met het HOOGSTE GEWICHT waar het eigen merk niet genoemd
  wordt. Werk uitsluitend met de aangeleverde cijfers — verzin niets."*
- **Input:** eigen merk, branche, content-brief (indien aanwezig), wat de website al zegt
  over het onderwerp, de score (incl. onzekerheidsmarge in gewone taal), de gemiste vragen
  (met code/gewicht/categorie/cluster), en per concurrent: vermeldingen, per-categorie-
  verdeling, meest geciteerde bronnen, gewonnen/verloren run-ID's.
- **Output-schema** (`GapAnalysis`): `gaps[{competitor, cluster, evidence, evidenceRunIds[],
  citedSourcesForCompetitor[]}]`, `strengths[{cluster, evidence}]`.

**B2 — leesbaar rapport + aanbevelingen:**
- **Model:** `gpt-4.1-mini`. **`web_search`:** uit. **Temperatuur:** 0,2.
- **Systeeminstructie (kern):** *"Je schrijft een kort, jargonvrij rapport voor een
  ondernemer zonder SEO-achtergrond over hun zichtbaarheid in AI-assistenten (GEO). Gebruik
  geen vaktermen als 'share of voice'. Noem in elk probleem expliciet welke concurrent het
  betreft. PRIORITEER je aanbevelingen op de zwaarwegende vragen waar de klant slecht scoort.
  Bepaal per aanbeveling of dit een BESTAANDE pagina verbetert (action='verbeteren',
  bestaande URL) of een GEHEEL NIEUWE pagina vereist (action='nieuw'). Wijs bij ELKE
  aanbeveling aan welke gemiste vragen (V1, V2, …) die pagina moet gaan winnen. Vraag
  daarnaast in factRequests om concrete feiten die de content beter zouden maken."*
- **Input:** hetzelfde als B1, plus de B1-output (JSON), plus de volledige lijst bestaande
  paginas van de klant (tot 150, voor de nieuw/verbeteren-beslissing), plus het
  periode-wijzigingsblok.
- **Output-schema** (`Report`): `headlineScore`, `summary`, `gaps[{cluster, problem,
  evidenceRunIds[]}]`, `recommendations[{title, type (article/faq/landing/comparison),
  targetIntent, why, priority, action (nieuw/verbeteren), existingUrl, targetQuestionIds[]}]`,
  `factRequests[{question, reason}]` (max. 6, zie 6.18).

Na opslag (`reports`, incl. beide `raw_json`'s, `change_json`): de vraagcodes (`V1, V2, …`)
worden omgezet naar echte `prompt_id`/`tracking_run_id`-referenties
(`resolveTargets()`, `lib/pipeline/recommendation.ts`) vóórdat ze worden opgeslagen — vanaf
hier werkt de rest van de app met echte ID's, niet met de tijdelijke codes.

Vervolgens: een niet-blokkerende `offsite_scan`-taak (zie 6.16) wordt ingepland,
`status: "gereed"`, en — als `EMAILS_ENABLED` én de wijziging het waard is
(`isWorthEmailing`) — een rapport-mail.

---

### 6.12 Content genereren (Fase C: tot 4 AI-calls per pagina)

**Gebruiker.** Op een aanbeveling in het Rapport (of een kaart in de Bibliotheek) klikt de
klant **"Genereer deze pagina"**. De pagina verschijnt na verwerking in de Content
Bibliotheek, eventueel met een **"Check nodig"**-label. De klant kan een pagina laten
**herschrijven** met een eigen instructie (`revisionNote`) of, ook ná een afgeronde versie,
een geheel **nieuwe versie** laten genereren (`regenerate`), zonder de oude te verliezen
(versiebeheer: precies één "huidige" versie per titel).

**Techniek.** `POST /api/analyses/[id]/generate` → `planContentDraft()`
(`lib/jobs/content-jobs.ts`) → taak `content_draft`, die zo nodig doorkettent naar
`content_revise`.

**Stap 1 — Draft (schrijven) + Redactie/kritiek**, samen in de `content_draft`-taak
(`draftContentPiece()`, `lib/pipeline/content.ts`):

*Context die verzameld wordt vóór het schrijven (`loadContentContext`):* het profiel
(merknaam, branche, tone-of-voice, producten, waardeproposities, `proof_points`,
`style_samples`), het onderwerp-onderzoek, beantwoorde feitenvragen van de klant
(`fact_requests` met status `beantwoord`), de gededupliceerde concurrentenlijst (om te
weren), de bestaande pagina bij `action = "verbeteren"`, de **doelvragen** (de gemiste
prompts die deze pagina moet winnen), het **winnende antwoord van de concurrent** op die
vragen (met concurrentnamen geredigeerd, `redactCompetitors`) en een **bronanalyse** van de
daarbij geciteerde bronnen (`analyzeCitedSources()`, `lib/pipeline/source-analysis.ts` — 1
losse AI-call + HTTP, alleen als `sourceAnalysisEnabled`).

*Draft-aanroep:*
- **Model:** `gpt-4.1` (premium, uitsluitend voor dit doel). **`web_search`:** alleen aan als
  vangnet bij te weinig `proof_points` (< 3, `contentWebSearchEnabled`). **Temperatuur:** 0,7.
- **Systeeminstructie (kern, 8 harde/GEO-regels):** *(1)* nooit concurrenten/bedrijven bij
  naam noemen; *(2)* geen feiten verzinnen buiten de meegegeven `proof_points`; *(3)* schrijf
  in de meegegeven stijlvoorbeelden; *(4)* beantwoord de doelvraag letterlijk in de eerste
  twee zinnen; *(5)* noem het bedrijf **expliciet** bij naam (niet "wij"/"ons"); *(6)* elke
  sectie bevat minstens één losstaand-citeerbare zin; *(7)* beantwoord ook logische
  vervolgvragen; *(8)* voeg geldige schema.org JSON-LD toe. Vermijd "AI-slop".
- **Input:** bedrijfsgegevens, content-brief, tone-of-voice, `proof_points` + eventuele
  door-de-klant-beantwoorde feiten, `style_samples`, te weren concurrenten, het te schrijven
  type/titel/doel, type-specifieke instructie (FAQ/landing/artikel/vergelijking),
  **doellengte** (per type, bv. FAQ 250–500 woorden, artikel 700–1200), de doelvragen
  letterlijk, het winnende-concurrent-antwoord (geanonimiseerd), de bronanalyse, en — bij
  "verbeteren" — de bestaande paginatekst om op voort te bouwen.
- **Output-schema** (`ContentPiece`, `lib/schemas/content-piece.ts`): `title`, `metaTitle`
  (≤60 tekens), `metaDescription` (≤160), `bodyMarkdown`, `faq[{q, a}]`, `schemaJsonLd`,
  `targetIntent`, `cluster`.
- Na ontvangst: `schema_jsonld` wordt **programmatisch gevalideerd/gerepareerd**
  (`validateOrRebuildJsonLd`, `lib/schema-jsonld.ts`) — nooit blind de LLM-string vertrouwd.
- De draft wordt **meteen weggeschreven** (`status: "draft"`) vóórdat de redactieronde
  start, zodat een afgekapte taak het dure schrijfwerk niet verliest.

*Redactie/kritiek-aanroep:*
- **Model:** `gpt-4.1-mini`. **`web_search`:** uit. **Temperatuur:** 0.
- **Systeeminstructie (kern):** *"Je bent een strenge eindredacteur én GEO-specialist."*
  Redactioneel: score 0–100 op answer-first/on-brand/concreet/scanbaar/waardevol. Harde
  regels: `followsRules = false` bij concurrentnaam, verzonnen feiten, of geen direct
  antwoord. **GEO-criteria** (5 booleans, `GeoCriteria`): beantwoordt de doelvraag meteen;
  bevat losstaand-citeerbare zinnen; noemt het bedrijf expliciet; gebruikt concrete feiten;
  beantwoordt vervolgvragen. "Bij twijfel: false."
- **Input:** type, doel, bedrijfsnaam, doelvragen, titel, body, FAQ.
- **Output-schema** (`Critique`): `qualityScore`, `followsRules`, `geo` (5 booleans),
  `issues[]`.
- **Kwaliteitspoort:** `geo_score` = percentage GEO-criteria gehaald. Herschrijven nodig
  (`needsRevise`) als `!followsRules`, of `qualityScore < 80`, of `geo_score < 60`, of er
  issues zijn. Komt de eerste versie er zonder problemen door: direct `status: "ready"`.

**Stap 2 — Herschrijven + herbeoordelen** (alleen als `needsRevise`), losse taak
`content_revise` → `reviseContentPiece()`:
- Zelfde `CONTENT_SYSTEM`, maar met de eigen vorige versie + de verbeterpunten uit de
  kritiek + (indien aanwezig) de eigen instructie van de klant (`revisionNote`, weegt het
  zwaarst: "dit is zijn website"). **Model:** `gpt-4.1`.
- Daarna **herbeoordeling** met dezelfde `CRITIQUE_SYSTEM`/model `gpt-4.1-mini`, die de
  **definitieve** score en `needs_review`-status bepaalt (er volgt geen derde ronde). Beide
  kritiek-rondes worden bewaard (`critique_raw_json` is een array).

**Doelvragen-koppeling** (`content_piece_targets`): welke gemiste prompts deze pagina moet
winnen wordt expliciet vastgelegd — dit is de basis voor de effectmeting (6.15).

---

### 6.13 De Content Bibliotheek

**Gebruiker.** Tab **Bibliotheek**: kaarten met titel, type-badge, cluster, status,
woordaantal, kwaliteits-/GEO-score. Detailpagina per stuk
(`app/(app)/analyses/[id]/bibliotheek/[pieceId]/page.tsx`): leesbare weergave (Markdown →
HTML), knoppen om te kopiëren/downloaden, de schema-markup te kopiëren, te herschrijven
(`revise-box.tsx`) of te publiceren (`publish-box.tsx`, zie 6.14). Er is **geen
CMS-connector** — de klant kopieert/downloadt en plaatst de content zelf op zijn eigen site.

**Techniek.** Puur weergave + CRUD-achtige acties; geen eigen AI-aanroep op dit scherm zelf
(alleen de acties "genereer opnieuw"/"herschrijf" starten weer de Fase C-taken uit 6.12).

---

### 6.14 Publiceren en verifiëren

**Gebruiker.** Op de detailpagina van een contentstuk: veld "Staat deze pagina al online?" →
link invullen → **"Dit staat live."** De pagina toont daarna een gepubliceerd-label met datum,
en na een korte tijd het resultaat van de automatische controle: "✓ Gecontroleerd: de tekst
staat erop" of een waarschuwing met concrete problemen. Ook een "Toch niet gepubliceerd"-knop
om terug te draaien.

**Techniek.** `markPublished()` (`lib/pipeline/publish.ts`):
1. `content_pieces.status → "published"`, `published_at`, `published_url` vastgelegd.
2. Taak `verify_publication` ingepland: `verifyPublication()` haalt de live pagina op via
   HTTP en vergelijkt de tekst (`checkPublication()`, `lib/pipeline/publish-check.ts`) — geen
   AI-aanroep, puur tekstvergelijking. Faalt de controle inhoudelijk (pagina onbereikbaar,
   tekst niet gevonden), dan is dat **geen mislukte taak** maar een bevinding die aan de
   klant getoond wordt.
3. `planImpactWaves()` plant meteen twee toekomstige hermeet-taken in (zie 6.15).

`markUnpublished()` zet alles terug en verwijdert nog niet-uitgevoerde impact-taken (al
uitgevoerde metingen blijven als historie staan).

Geen AI-aanroep in deze stap zelf.

---

### 6.15 Effect meten (impact-golven)

**Gebruiker.** Geen directe actie; het resultaat verschijnt vanzelf bij de betreffende
contentpagina zodra beide golven gemeten zijn ("op de vragen waarvoor je publiceerde: +18,
op de rest: +3", of "nog niet te zeggen").

**Techniek.** Twee golven (`IMPACT_WAVES`: 14 en 28 dagen na publicatie,
`lib/pipeline/impact.ts`), elk als geplande `measure_impact`-taak:
1. `planImpactMeasurements()`: plant `measure_prompt`-taken (met `purpose: "impact"`) voor de
   **doelvragen** van deze pagina, plus een **controlegroep** (`purpose: "control"`, max. 5
   actieve prompts uit dezelfde analyse waarvoor géén pagina gepubliceerd is, deterministisch
   gekozen). Dezelfde 3a/3b-meting als bij een gewone periodieke meting, maar buiten de
   reguliere score om (telt niet mee in `visibility_scores`).
2. Zodra alle metingen van de golf klaar zijn: `compute_impact` → `computeImpact()`:
   vergelijkt "vóór" (laatste periodieke meting van de doelvragen vóór publicatiedatum) met
   "ná" (de impact-/controlemeting van deze golf), voor zowel de doelgroep als de
   controlegroep (`compare`, `deltaOf`, `thresholdOf`, `verdictOf`,
   `lib/pipeline/impact-math.ts`). Resultaat in `content_impact`: `target_delta`,
   `control_delta`, `delta_threshold`, `verdict`.

Geen extra AI-aanroep buiten de standaard 3a/3b-metingen zelf.

---

### 6.16 Off-site zichtbaarheid (1 AI-call + externe API's)

**Gebruiker.** Geen apart scherm beschreven in deze inventarisatie buiten de taken die eruit
voortkomen (`offsite_tasks`) — concrete adviezen als "Zorg dat {merk} op {domein} staat"
(met reden en actie), en signalen over Wikidata/Wikipedia-aanwezigheid.

**Techniek.** Taak `offsite_scan` (ingepland na elk rapport, niet-blokkerend) →
`runOffsiteScan()` (`lib/offsite/scan.ts`):
1. **Bronnenlandschap** (`computeLandscape`/`saveLandscape`, `lib/offsite/landscape.ts`):
   afgeleid uit de bronnen die de metingen al citeerden — geen extra AI-call.
2. **Aanwezigheidscheck** (`checkPresence`, `lib/offsite/presence.ts`): **één gegrondde
   AI-call** (met web-context) die bepaalt of de klant op de relevante externe domeinen
   voorkomt.
3. **Entiteitscontrole** (`checkEntityPresence`, `lib/offsite/entity-presence.ts`):
   gratis publieke Wikidata-/Wikipedia-API's, **geen AI-call**. Resultaat (`wikidata_id`,
   `wikipedia_url`) opgeslagen op het profiel.
4. **Taken aanmaken** (`createTasks`): voor elk relevant domein (≥ 3 vragen citeerden het)
   waar de klant **niet** op staat, een concrete taak met titel/reden/actie/prioriteit.
   Domeinen met "niet vast te stellen"-aanwezigheid leveren bewust géén taak op. Bestaande
   taken worden niet overschreven (de klant kan er zelf "gedaan" van gemaakt hebben).

---

### 6.17 Terugkerende maandelijkse meting

**Techniek.** `GET /api/cron/tracking` (Vercel Cron, maandelijks, 1e van de maand 06:00
UTC, beveiligd met `CRON_SECRET`): voor elke analyse met `tracking_enabled = true` en
status `gemeten`/`gereed`:
1. Eén technische audit per **profiel** (niet per analyse) opnieuw ingepland — een blokkade
   kan er na een sitewijziging ontstaan.
2. De volgende periode bepaald (`week_no` = periode-index, geen kalenderweek) en, als onder
   `maxMeasurementPeriods`, dezelfde meting als 6.9/6.10/6.11 opnieuw ingepland (zonder de
   review-gate — die geldt alleen voor de nulmeting).

`tracking_enabled` staat **standaard uit** en is per analyse beheerbaar in het tabblad
Instellingen (`TrackingToggle`).

---

### 6.18 Feitenvragen aan de klant

**Gebruiker.** Het rapport (B2) kan concrete vragen aan de klant stellen (max. 6,
`factRequests`), bv. *"Hoeveel jaar bestaan jullie?"* — bewaard op **profielniveau**
(`fact_requests`, niet per analyse: eenmaal beantwoorden geldt voor elke toekomstige pagina
van dit merk). Beantwoorde vragen (`status: "beantwoord"`) worden meegenomen als extra
`proof_points` bij het schrijven van content (zie 6.12).

---

## 7. De achtergrond-jobwachtrij

Bron: `lib/jobs/types.ts`, `lib/jobs/queue.ts`, `lib/jobs/worker.ts`, `lib/jobs/handlers.ts`,
`lib/jobs/pending.ts`.

- **Taaksoorten** (`JOB_TYPES`): `profile_research`, `prepare_analysis`, `generate_prompts`,
  `calibrate_volumes`, `measure_prompt`, `aggregate_week`, `generate_report`, `content_draft`,
  `content_revise`, `technical_audit`, `verify_publication`, `measure_impact`,
  `compute_impact`, `offsite_scan`.
- **Ontwerpprincipe:** één taak = hoogstens één zware AI-aanroep, zodat elke taak ruim binnen
  de tijdslimiet van één werker-aanroep past. Meting is daarom per **prompt** opgeknipt (niet
  per analyse), en contentgeneratie in twee taken (schrijven+beoordelen,
  herschrijven+herbeoordelen).
- **Ketening:** elke handler plant zelf zijn vervolgtaak in (`enqueue`) — het werk hangt aan
  de server, niet aan een openstaande browsertab.
- **Dedupe:** elke `enqueue`-aanroep krijgt een dedupe-sleutel; een dubbele insert op
  dezelfde sleutel wordt genegeerd (voorkomt dubbel werk bij races tussen gelijktijdige
  taken).
- **Retries:** maximaal 4 pogingen (`MAX_ATTEMPTS`), met oplopende backoff (2, 4, 8, 16
  minuten, `backoffMinutes`). Definitief mislukken van de laatste openstaande
  `measure_prompt`-taak triggert alsnog de vervolgketen (`scheduleFollowUpAfterFailure`),
  zodat de analyse niet blijft hangen.
- **Zware taken** (`HEAVY_JOB_TYPES`): `profile_research`, `prepare_analysis`,
  `generate_prompts`, `content_draft`, `content_revise`, `offsite_scan` — de werker plant
  hiermee hoeveel taken hij per aanroep durft op te pakken.
- **Tijdbudget:** `workerTimeBudgetMs` (standaard 240.000 ms), ruim onder de `maxDuration`
  van de route (300s) zodat er tijd overblijft om de laatste taak netjes af te ronden.
- **Motor:** `GET /api/cron/worker`, aangeroepen door **Supabase pg_cron elke minuut** (niet
  door Vercel Cron — die staat op het Hobby-plan beperkt tot 2 taken per dag).

---

## 8. Volledig overzicht van alle AI-aanroepen

| # | Halte | Trigger | Model | `web_search` | Temp. | Input (kern) | Output-schema |
|---|---|---|---|---|---|---|---|
| 1 | Profielonderzoek | Profiel aangemaakt | `gpt-4.1-mini` | aan | 0,2 | Website-tekst (eigen crawl) + klant-intake | `ProfileResearch` |
| 2 | Onderwerp-onderzoek (A1') | Analyse aangemaakt | `gpt-4.1-mini` | aan | 0,2 | `profile_pages` + profielcontext + onderwerp + content-brief | `TopicResearch` |
| 3 | Promptgeneratie (A2), ×3 parallel | Na onderwerp-onderzoek | `gpt-4.1-mini` | uit | 0,8 | Profiel + onderwerp + funnelfase-briefing + neutraliteitsregel | `PromptSet` |
| 4 | Volumekalibratie | Na promptgeneratie | `gpt-4.1-mini` | uit | 0,2 | Alle prompt-teksten van de analyse | `VolumeCalibration` |
| 5 | Simulatie (3a) | Per prompt, elke meting | `gpt-4.1-mini` | aan | (geen) | De letterlijke prompttekst | vrije tekst |
| 6 | Mention-beoordeling (3b) | Direct na 5 | `gpt-4.1-nano` | uit | 0 | Ruw antwoord + eigen merknaam/aliassen | `Mention` |
| 7 | Entiteitclassificatie | Tijdens aggregatie, alleen nieuwe merken | `gpt-4.1-mini` | uit | 0 | Tot 40 onbepaalde merknamen + brand/branche/onderwerp | `EntityClassification` |
| 8 | Gap-analyse (B1) | Na aggregatie | `gpt-4.1-mini` | uit | 0,2 | Score, gemiste vragen, concurrentie-uitsplitsing | `GapAnalysis` |
| 9 | Rapport (B2) | Direct na B1 | `gpt-4.1-mini` | uit | 0,2 | B1-output + score + bestaande pagina's + wijzigingsblok | `Report` |
| 10 | Content-draft | Klant klikt "Genereer" | **`gpt-4.1`** | uit (tenzij feiten-vangnet) | 0,7 | Aanbeveling + profiel/`proof_points`/`style_samples` + doelvragen + winnend concurrent-antwoord + bronanalyse | `ContentPiece` |
| 11 | Content-kritiek | Direct na 10 | `gpt-4.1-mini` | uit | 0 | Type/doel/titel/body/FAQ + doelvragen | `Critique` |
| 12 | Content-herschrijven | Alleen als `needsRevise` | **`gpt-4.1`** | uit (tenzij vangnet) | 0,7 | Vorige versie + verbeterpunten + klant-instructie | `ContentPiece` |
| 13 | Content-herbeoordeling | Direct na 12 | `gpt-4.1-mini` | uit | 0 | Herschreven versie + doelvragen | `Critique` |
| 14 | Bronanalyse | Vóór elke content-draft (indien aan) | `gpt-4.1-mini` (aangenomen, zie `lib/pipeline/source-analysis.ts`) | n.v.t. | — | Geciteerde bron-URL's + doelvragen + concurrenten | — |
| 15 | Off-site aanwezigheidscheck | Na elk rapport | `gpt-4.1-mini` (aangenomen) | aan (gegrond) | — | Merknaam/branche/regio's + bronnenlandschap | — |

*(Rijen 14–15: model/temperatuur zijn niet expliciet uitgelezen in dit onderzoek — voor de
exacte aanroep zie `lib/pipeline/source-analysis.ts` resp. `lib/offsite/presence.ts`.)*

Elke aanroep wordt gelogd in `ai_calls` (model, tokens, geschatte kosten, `kind`,
analyse-/profiel-ID) — dit is het kostenlogboek waarop `/api/analyses/[id]/costs` leunt.

---

## 9. Rechten, schrijfstrategie en beveiliging

- **Lezen:** de client leest rechtstreeks via de Supabase-client met de eigen sessie.
  RLS-policies zijn select-only, gefilterd op `user_id` (direct op `profiles`/`analyses`, via
  `analysis_id`/`profile_id` op de overige tabellen).
- **Schrijven:** altijd via een Next.js API-route met de **service-role key** (omzeilt RLS),
  die zelf expliciet controleert dat de rij van de ingelogde gebruiker is
  (`getOwnedAnalysis`, `getOwnedProfile`). Nooit rechtstreekse client-writes naar Postgres.
- **`jobs`-tabel:** geen enkele client-toegang, ook geen SELECT (RLS deny-all by default).
- **Cron-beveiliging:** alle drie de cron-routes controleren
  `Authorization: Bearer <CRON_SECRET>`.
- **Registratie tijdens de bouwfase:** twee lagen — de Supabase-instelling "Allow new users
  to sign up" (harde poort, ook tegen rechtstreekse API-aanroepen) en de app-laag
  `SIGNUPS_ENABLED` (verbergt de UI en blokkeert de server action).

---

## 10. E-mail en notificaties

- **Hoofdschakelaar:** `EMAILS_ENABLED` (standaard **uit**). Staat hij uit, dan wordt geen
  enkele e-mail-gerelateerde code uitgevoerd, ook `emailed_at` niet gezet.
- **Rapport-mail** (`lib/email/report-email.ts`, verstuurd via Resend): alleen als de klant
  bij het aanmaken van de analyse `notify_by_email` aan liet staan (standaard aan) **en**
  `isWorthEmailing(change)` — een periode zonder betekenisvolle verandering levert geen mail
  op, om mail-moeheid te voorkomen.
- **Publicatieherinnering** (`lib/email/publish-reminder.ts`): verstuurd via
  `GET /api/cron/reminders`, wekelijks (maandag 09:00 UTC).

---

## 11. Bijlage — bestandenoverzicht

```
app/
  (auth)/                          login/register, server actions (signIn/signUp/signOut)
  (app)/profielen/                 profiellijst, onboarding-wizard, profieldetail (research/entiteiten/feiten/hiaten)
  (app)/analyses/                  analyselijst, nieuwe-analyse-formulier
    [id]/concept/                  het conceptscherm (goedkeuringspoort, 6.8)
    [id]/(overzicht|antwoorden|rapport|bibliotheek|instellingen)
  api/profiles/                    profiel-CRUD + research/refresh-inventory/status/entities/facts
  api/analyses/                    analyse-CRUD + confirm/prepare/measure/report/generate(-all)/tracking/topic-research/costs/prompts/content(/publish)
  api/cron/                        worker (elke minuut) · tracking (maandelijks) · reminders (wekelijks)
lib/
  auth.ts, supabase/               requireUser/getUser, browser/server/admin-clients
  openai/                          client, structured-output-helper, models.ts, pricing, ai_calls-logboek, mention-prompt.ts
  entities/                        normalize.ts, resolve.ts — merknaam-deduplicatie
  audit/                           technische GEO-audit (robots.txt, AI-crawlers) — geen AI
  offsite/                         bronnenlandschap, presence-check, entity-presence
  pipeline/                        profile-research, prepare-profile, prepare (topic-research+prompts),
                                    prompts, measure, classify-entities, report, recommendation,
                                    period-change, content, redact, source-analysis, publish,
                                    publish-check, impact, impact-math, schema-jsonld
  jobs/                            types, queue, handlers, worker, pending, content-jobs, progress, format
  schemas/                         alle Zod-contracten (profile, topic-research, prompts, mention,
                                    entity-classification, gap-analysis, report, content-piece, critique)
  stats/uncertainty.ts             binomiale standaardfout, gewogen-score-standaardfout
  types/database.ts                TypeScript-datamodel
supabase/migrations/                0001 t/m (recentste, zie supabase/README.md)
scripts/
  test-unit.ts                     npm run test:unit
  test-openai.ts                   npm run test:openai (echte, betaalde calls)
  eval-mention.ts                  npm run eval:mention — accuratesse mention-classificatie, nano vs. mini
```
