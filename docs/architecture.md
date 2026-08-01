# Architectuur

Backend, Supabase, pijplijn en deploy. Voor het *waarom* achter een keuze: `logbook.md`.
Voor UI/UX: `ux-design.md`.

> **Geverifieerd tegen de code op 1 augustus 2026** (branch `main`, t/m migratie `0037`),
> plus de eind-tot-eind-ronde van diezelfde dag (`logbook.md` §10) — die raakte de crawler,
> de werker en de OpenAI-client, en die wijzigingen staan hieronder verwerkt.
> Dit document beschrijft wat de code dóet, niet wat een plan voorschrijft — wijkt het af, dan is
> de code leidend en is dit document fout. Werk deze datum bij zodra je hem hebt nagetrokken.

## 1. Hosting en dataflow

```
Klant (browser/mobiel)
   │
   ▼
Vercel — Next.js 15 / Node.js  (code: GitHub, deploy op push naar main)
 ├─ Frontend: /profielen, /analyses/[id] (dossier in 4 hoofdstukken), /instellingen
 ├─ API-routes: CRUD + schrijfacties (service-role key + ownership-check)
 ├─ Vercel Cron (vercel.json, Hobby-limiet: max 2 taken, elk max 1×/dag)
 │    • /api/cron/tracking   maandelijks, 1e van de maand 06:00 UTC
 │    • /api/cron/reminders  wekelijks, maandag 09:00 UTC (staat nu uit vercel.json)
 └─ /api/cron/worker — de motor, elke MINUUT aangeroepen door Supabase pg_cron
   │
   ├──────► OpenAI Responses API (gpt-5.6-luna / gpt-5.6-sol, + web_search)
   ▼
Supabase (Postgres + Auth)
 ├─ auth.users
 ├─ profiles → analyses → prompts → tracking_runs → tracking_run_mentions
 │              → visibility_scores / competitor_breakdown
 ├─ entities, reports, content_pieces, content_piece_targets, content_impact
 ├─ brand_facts, brand_documents, fact_requests
 ├─ technical_audits, source_landscape, offsite_tasks
 ├─ jobs (wachtrij — GEEN client-toegang, ook geen SELECT)
 └─ ai_calls (kostenlogboek, 1 rij per aanroep)
   │
   └──────► Resend (rapport-mail, publicatieherinnering) — alleen bij EMAILS_ENABLED=true
```

**Uitvoeringsmodel.** Korte acties (CRUD, status opvragen) lopen via een gewone API-route. Al het
zware werk — elke AI-aanroep — loopt via de jobwachtrij: de API-route zet alleen een taak klaar
(`enqueue`), de werker voert hem minuutlijks uit. Nodig omdat serverless functies een tijdslimiet
hebben (`maxDuration = 300`) en het werk moet doorlopen als de klant zijn browser sluit.

**De werker hoort NIET in `vercel.json`.** Het Hobby-plan staat 2 cron-taken toe, elk hoogstens
dagelijks. Een regel met `"schedule": "* * * * *"` laat niet de cron maar de **hele build** falen.
Daarom pg_cron.

## 2. Rechten en schrijfstrategie

- **Lezen:** de client leest rechtstreeks via de Supabase-client met de eigen sessie. RLS-policies
  zijn **select-only**, gefilterd op `user_id` (direct op `profiles`/`analyses`, via
  `analysis_id`/`profile_id` elders).
- **Schrijven:** altijd via een API-route met de service-role key (omzeilt RLS), die zelf
  controleert dat de rij van de ingelogde gebruiker is (`getOwnedAnalysis`, `getOwnedProfile`).
  Nooit rechtstreekse client-writes. Reden: Postgres RLS werkt op rij-, niet op kolomniveau en kan
  dus nooit afdwingen wélke velden een klant mag wijzigen.
- **`jobs`:** RLS aan, nul policies. Alle mutaties via de werker.
- **Cron:** alle drie de routes eisen `Authorization: Bearer <CRON_SECRET>`.
- **Registratie:** twee lagen — Supabase "Allow new users to sign up" (harde poort, ook tegen
  directe API-aanroepen) en `SIGNUPS_ENABLED` in de app (verbergt UI, blokkeert de server action).

## 3. Datamodel — de kern

| Tabel | Wat het is |
|---|---|
| `profiles` | Klant/merk op accountniveau. Website, branche, aliassen, concurrenten, persona's, tone-of-voice, `business_model`. Eén keer onderzocht, hergebruikt door alle analyses. |
| `profile_pages` | Contentinventaris uit een crawl (sitemap recursief, anders homepage-links). Productpagina's uitgesloten. Geen AI. Alle tekst gaat door `sanitizeForPostgres()` (`lib/pg-text.ts`): één NUL-byte uit één pagina laat Postgres anders de hele batch-insert weigeren, en dan verdwijnt de complete inventaris. |
| `analyses` | Eén getrackt onderwerp onder een profiel. Status, tracking aan/uit, content-brief. `topic` verplicht en niet wijzigbaar na start. |
| `prompts` | 30 per analyse (10 per funnelfase). Volledig door de klant beheerbaar. `elicit_successes`/`elicit_samples` = de kans dat deze vraag überhaupt een merk oplevert. |
| `tracking_runs` | Eén rij per meting per prompt. `raw_response`, `brands_in_answer`, `repeat_index`, `prompt_weight` (bevroren op meetmoment). |
| `tracking_run_mentions` | Eén rij per entiteit per meting: `mentioned`, `mention_role`, `position`, `cited_sources`. (`sentiment` bestaat nog maar wordt niet meer gevuld.) |
| `visibility_scores` | De score per periode: `score`, `weighted_score`, `winnable_runs`, `brandless_runs`, `avg_position`, `citation_count`, `first_mention_count`, `score_stderr`. |
| `competitor_breakdown` | Per concurrent: aandeel + `attributes_json` (`{attribute, evidence}` met letterlijk citaat) + `why_summary`. Alleen ≥2 vermeldingen of top 8. |
| `entities` | Gededupliceerd merk-/concurrentregister (`lib/entities/`). Voorkomt dat "Coolblue", "coolblue.nl" en "Coolblue B.V." drie partijen worden. |
| `reports` | Rapport per periode + trend. `stripped_claims_json` = audit-trail van door de claimvalidator verwijderde zinnen. |
| `brand_facts` | De feitenbank (`0036`). Elk feit heeft een `fact_key` (identiteit, geen positie), een scope (merkbreed / per analyse) en `superseded_by` in plaats van overschrijven. |
| `brand_documents` | Door de klant geplakte brontekst + sha256-hash, met `facts_extracted`/`facts_rejected`. |
| `fact_requests` | De briefingvragen aan de klant, max 8 per batch. `scope: 'merk'` slaat op met `analysis_id = null`. |
| `content_pieces` | Gegenereerde pagina's. Versiebeheer per (analyse, titel) via `version`/`is_current`/`supersedes_id`, plus `briefing_snapshot_json`, `claims_json`, `source_coverage`, `quality_score`, `geo_score`, `needs_review`, `reviewed_at`/`reviewed_by`. |
| `content_impact` | Hermeetgolven na publicatie + statistisch verdict. |
| `technical_audits` | Kunnen AI-crawlers de site bereiken (robots.txt vs GPTBot, CCBot, …). Geen AI. |
| `source_landscape` / `offsite_tasks` | Off-site aanwezigheid: welke externe domeinen relevant zijn en of het merk er staat. |
| `jobs` | De wachtrij. |
| `ai_calls` | Kostenlogboek: model, tokens, geschatte kosten, `kind`, analyse-/profiel-ID. |

**Alles bewaren.** Elke AI-call slaat zijn volledige ruwe JSON op (`raw_json`/`mention_json`/
`source_raw_json`) náást de uitgesplitste kolommen.

### Statusmachines

- `analyses.status`: `gemeten` = score/trendlijn zichtbaar (na A3) · `gereed` = rapport ook klaar
  (na B2). Bewust gesplitst, anders is niet af te leiden welke tabs beschikbaar zijn.
- `content_pieces.status`: `briefing` (feitenkaart + claim-audit klaar, wacht op de klant) →
  `draft` (geschreven, moet herschreven) → `ready` → `published`.
  *Let op:* een rij met status `briefing` die voor het eerst geschreven wordt wisselt niet van
  status maar krijgt een **nieuwe rij** (versie +1), met de oude op `is_current = false`.
  `draftContentPiece()` stelt de "is dit een hervatting?"-vraag alleen voor `draft`.
- `needs_review = true` betekent "nog niet vrijgegeven"; `reviewed_at`/`reviewed_by` leggen vast
  dát iemand keek en wie. Zonder die twee betekende `needs_review = false` twee dingen tegelijk.

## 4. De jobwachtrij

Bron: `lib/jobs/{types,queue,worker,handlers,pending}.ts`.

- **Taaksoorten:** `profile_research`, `prepare_analysis`, `generate_prompts`, `calibrate_volumes`,
  `measure_prompt`, `aggregate_week`, `generate_report`, `content_brief`, `content_draft`,
  `content_revise`, `technical_audit`, `verify_publication`, `measure_impact`, `compute_impact`,
  `offsite_scan`.
- **Eén taak = hoogstens één zware AI-aanroep**, zodat elke taak binnen één werker-aanroep past.
  Meting is daarom per prompt opgeknipt, contentgeneratie in twee taken.
- **Ketening:** elke handler plant zijn eigen vervolgtaak in. Het werk hangt aan de server, niet
  aan een openstaande browsertab.
- **Dedupe:** elke `enqueue` krijgt een sleutel; dubbele inserts worden genegeerd.
- **Retries:** max 4 pogingen, backoff 2/4/8/16 minuten. Definitief falen van de laatste
  `measure_prompt` triggert alsnog de vervolgketen (`scheduleFollowUpAfterFailure`), zodat een
  analyse niet blijft hangen.
- **Tijdbudget:** `workerTimeBudgetMs` 240.000 ms, ruim onder de `maxDuration` van 300s.

## 5. De pijplijn, stap voor stap

| # | Stap | AI | Kern |
|---|---|---|---|
| 1 | Profiel aanmaken | — | Onboarding-wizard, 5 stappen. Klant-input is leidend (`prepare-profile.ts`): scalars van de klant blijven staan, lijsten worden een unie, lege velden vult de AI. |
| 2 | Profielonderzoek | luna, web_search | Merk, branche, tone-of-voice, persona's, concurrenten, `proofPoints`, `styleSamples`. |
| 3 | Contentinventaris | — | Crawl via robots.txt → sitemap (recursief) → homepage-links. Productpagina's uitgesloten. Instelbaar per profiel (`sitemap_url`, `max_inventory_pages` 5–150). |
| 4 | Technische GEO-audit | — | `robots.txt` tegen bekende AI-crawlers. Staat de site dicht, dan blokkeert dit contentgeneratie: meer content heeft dan geen zin. |
| 5 | Analyse aanmaken | — | Verplicht onderwerp + optionele content-brief. |
| 6 | Onderwerp-onderzoek (A1') | luna, web_search | Wat de site over dít onderwerp zegt + welke concurrenten hier relevant zijn. |
| 7 | Promptgeneratie (A2) | luna ×3 parallel, temp 0,8 (effort none) | 10 per funnelfase. Merk- en concurrentneutraal geformuleerd. Aparte calls per fase, want één grote call levert herhaling op. |
| 8 | Volumekalibratie | luna | Relatief gekalibreerd over álle prompts tegelijk — consistenter dan losse schattingen. Drie banden, geen verzonnen 0–100. |
| 9 | **Goedkeuringspoort** | — | De pijplijn stopt. De klant ziet en bewerkt onderzoek + alle prompts, en klikt pas dan "Bevestig en start meting". Geen black box, en niets betaalds start zonder akkoord. |
| 10 | Meting (A3) | 3a: luna + web_search, modelstandaard · 3b: luna, effort none | Per prompt: een gesimuleerd AI-antwoord, daarna een beoordeling per entiteit. 3a en 3b zijn los herhaalbaar — een mislukte 3b draait nooit opnieuw de dure 3a. |
| 11 | Gelaagd hermeten | — | De zwaarste `REPEATED_PROMPT_COUNT` (8) vragen worden `MEASURE_REPEATS` (3) keer gemeten. Alle aggregatie telt per **vraag**, met gewicht `1/aantal metingen van die vraag` (`question-share.ts`). |
| 12 | Aggregatie | luna (alleen nieuwe merken) | Entiteitclassificatie + deduplicatie, scores, concurrent-uitsplitsing. |
| 13 | Gap-analyse (B1) | luna | Wáár concurrenten winnen, met bewijs uit de database. |
| 14 | Rapport (B2) | luna | Verwoordt B1; leidt niets zelf af. Een claimvalidator verwijdert achteraf elke merknaam die niet in het bewijsdossier van díe vraag staat. |
| 15 | Contentbriefing | luna, temp 0 | Feitenkaart bouwen → claim-audit → max 8 vragen aan de klant. Eén slot is gereserveerd voor de positioneringsvraag. |
| 16 | Content schrijven | **sol** → luna-kritiek → sol herschrijven → luna-herbeoordeling | Uitsluitend binnen bevestigde feiten, met per bewering het feit dat hem dekt. Deterministische poort (`content-gate.ts`) in plaats van zelfrapportage. |
| 17 | Publiceren | — | Klant vult live-URL in; de app verifieert de pagina. |
| 18 | Effect meten | luna | Hermeetgolven + statistisch verdict of de zichtbaarheid meetbaar veranderd is. |
| 19 | Off-site | luna, gegrond | Op welke externe domeinen het merk wél/niet aanwezig is. |
| 20 | Maandelijkse ronde | — | Alleen voor analyses met tracking aan. Structureel merkloze vragen worden overgeslagen. |

## 6. Modellen, redeneerinspanning, feature-flags

Bron: `lib/openai/models.ts`, `lib/openai/sampling.ts`, `lib/config.ts`. **Vast in code, niet als
env-variabele.**

| Constante | Waarde | Tarief (in/uit per 1M) | Voor |
|---|---|---|---|
| `MODELS.volume` | `gpt-5.6-luna` | $0,20 / $1,20 | Mention-beoordeling (3b) |
| `MODELS.quality` | `gpt-5.6-luna` | $0,20 / $1,20 | Research, prompts, kalibratie, simulatie (3a), gap-analyse, rapport, entiteiten, redactie, bronanalyse |
| `MODELS.content` | `gpt-5.6-sol` | $5 / $30 | Uitsluitend content schrijven/herschrijven |

`volume` en `quality` wijzen sinds augustus 2026 naar hetzelfde model; de tiers blijven bestaan
omdat ze vastleggen wélke keuze per stap bewust gemaakt is. Het onderscheid dat vroeger in het
model zat (nano vs. mini) zit nu in de **redeneerinspanning**.

**Soort werk → parameters** (`resolveTuning()` in `lib/openai/sampling.ts`). Aanroepplekken geven
alleen nog `work: "..."` op; de vertaling naar `temperature` en `reasoning.effort` staat op één
plek. Reden: GPT-5.6 accepteert `temperature` uitsluitend bij effort `none` — bij elke hogere
stand is het een unsupported parameter en faalt de call.

| `work` | effort | temperature | Voor |
|---|---|---|---|
| `deterministic` | `none` | 0 | Classificeren/beoordelen, claim-audit, content-kritiek |
| `analytical` | `low` | — | Research, kalibratie, gap-analyse, rapport, bronanalyse |
| `creative` | `none` | 0,8 | Promptgeneratie — variatie is gewenst, redeneren maakt de vragen juist gelijkvormig |
| `content` | `medium` | — | Content schrijven/herschrijven |
| `simulation` | — | — | Halte 3a: bewust niets meegeven, meet wat een AI-assistent op standaardinstellingen doet |

De effort-standen staan bewust laag: één aanroep moet binnen `TIMEOUT_MS` (100 s,
`lib/openai/client.ts`) passen, en de onderzoeks- en meetstappen doen daar óók web_search bij
(20–40 s). Omhoog draaien kan pas nadat de doorlooptijd op productie is nagemeten en
`HEAVY_JOB_RESERVE_MS` in `lib/jobs/worker.ts` is bijgesteld.

**Vangnet.** Weigert de API `temperature` toch (OpenAI kan de regel aanscherpen), dan herhaalt
`structured.ts` die ene call zonder temperatuur en stuurt hem de rest van het proces niet meer
mee — een zelfherstellende hik in plaats van een meetronde die halverwege omvalt.

| Env | Standaard | Effect |
|---|---|---|
| `WEB_SEARCH_ENABLED` | aan | Uit = geen web_search bij meting, profiel- en onderwerponderzoek. Grootste kostenknop. |
| `MEASURE_WEB_SEARCH` | aan | Alleen de meting groundless. Uit = goedkoop ontwikkelen, niet representatief. |
| `CONTENT_WEB_SEARCH` | — | Vangnet tijdens schrijven, alleen bij < 3 `proof_points`. |
| `SOURCE_ANALYSIS` | aan | Analyseert geciteerde bronnen vóór het schrijven. |
| `MEASURE_REPEATS` | 3 | Herhalingen per zware vraag. Op 1 = R6.1 uit. |
| `REPEATED_PROMPT_COUNT` | 8 | Hoeveel vragen herhaald worden. Op 0 = R6.1 uit. |
| `EMAILS_ENABLED` | uit | Hoofdschakelaar alle uitgaande mail. |
| `SIGNUPS_ENABLED` | uit | Registratie-UI en -actie. |
| `MAX_MEASUREMENT_PERIODS` | onbeperkt | Plafond op periodieke metingen. |
| `WORKER_TIME_BUDGET_MS` | 240000 | Tijdbudget per werker-aanroep. |

**Kosten.** Op de GPT-4.1-familie was een meetronde ≈ **$0,82** zonder herhalingen; de meting was
daarvan ~95% en web_search ~94% dáárvan (30 × $0,025). Met herhalingen ≈ **$1,06** per
vervolgperiode.

De overstap naar GPT-5.6 verschuift dat beeld twee kanten op:

- **Zoeken werd goedkoper.** Op een redeneermodel kost web_search $10 per 1000 calls in plaats van
  $25 — 30 vragen gaan van $0,75 naar $0,30.
- **Maar de opgehaalde pagina's worden nu wél als input afgerekend** (op de niet-redeneerpreview
  waren die tokens gratis). Bij ~8k tokens per zoekactie op Luna is dat ~$0,05 per ronde.
- De tokenkosten zelf blijven in dezelfde orde: `quality` halveerde (mini → Luna), `volume` werd
  duurder (nano → Luna), en samen wogen die twee al maar ~5% van een ronde.

Reken dus op **ruwweg $0,40 per meetronde** — een schatting op basis van de gepubliceerde tarieven,
nog niet nagerekend tegen `ai_calls` op productie (conventie 10). Contentgeneratie (`gpt-5.6-sol`)
is de enige duurdere post en werd juist ~5× duurder per pagina: Sol is 2,5×/3,75× het tarief van
gpt-4.1 en de redeneertokens tellen als output.

## 7. E-mail

`EMAILS_ENABLED` is de hoofdschakelaar en staat standaard **uit**. Dan gebeurt er niets — ook
`reports.emailed_at` en `analyses.publish_reminder_sent_at` blijven leeg, zodat een eenmalige
herinnering niet stil opgebrand wordt aan een mail die nooit ging. De reminder-cron antwoordt
`{ "skipped": "emails_disabled" }`. Rapporten blijven gewoon zichtbaar in de app.

De schakelaar staat **los van** `RESEND_API_KEY`: je kunt de sleutel in Vercel zetten zonder dat er
iets de deur uit gaat.

| Mail | Wanneer | Code |
|---|---|---|
| Rapport klaar | Na B2, als `notify_by_email` aan staat **en** `isWorthEmailing(change)` — een periode zonder betekenisvolle verandering mailt niet | `lib/email/report-email.ts` |
| Publicatieherinnering | Wekelijkse cron, één keer per analyse | `lib/email/publish-reminder.ts` |

## 8. Lokaal draaien

Vereist: Node ≥ 20, een Supabase-project, een OpenAI-key met toegang tot `gpt-5.6-luna` én `gpt-5.6-sol`.

```bash
npm install
cp .env.example .env.local     # vul Supabase + OpenAI in
supabase link --project-ref <ref> && supabase db push
npm run dev                    # → localhost:3000
```

`/` toont welke env-variabelen gezet zijn; `/api/health` doet hetzelfde op productie.

| Variabele | Waar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | idem, `service_role` — **server-only, nooit `NEXT_PUBLIC_`** |
| `OPENAI_API_KEY` | platform.openai.com |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | alleen bij `EMAILS_ENABLED=true` |

## 9. Deploy en cron

1. Push naar `main` → Vercel deployt. Env-variabelen in Project → Settings → Environment Variables.
2. `CRON_SECRET` zetten; Vercel Cron stuurt hem automatisch mee als `Authorization: Bearer …`.
3. **De werker draait op pg_cron, niet op Vercel.** Migratie `0015` regelt de aanroep, maar is
   niet genoeg — zet ook de twee Vault-geheimen:

```sql
select vault.create_secret('https://jouw-app.vercel.app', 'geo_site_url');
select vault.create_secret('<dezelfde waarde als CRON_SECRET>', 'geo_cron_secret');
```

Zonder die twee slaat `trigger_worker()` stil over: geen fout in de logs, maar ook geen enkele
taak die verwerkt wordt. Controleren:

```sql
select * from cron.job;                                          -- staat 'geo-worker' erin?
select name from vault.decrypted_secrets where name like 'geo_%'; -- beide geheimen?
select * from cron.job_run_details order by start_time desc limit 10;
```

| Taak | Pad | Schema | Door |
|---|---|---|---|
| **Werker** | `/api/cron/worker` | elke minuut | **Supabase pg_cron**. Zonder deze taak gebeurt er niets. |
| Terugkerende meting | `/api/cron/tracking` | 1e van de maand 06:00 UTC | Vercel |
| Rapport-mail | `/api/cron/reminders` | maandag 09:00 UTC | Vercel (nu uit `vercel.json` gehaald — bestaat alleen om te mailen) |

### Tijdbudgetten — waarom deze getallen bij elkaar horen

De werkerroute krijgt van Vercel **300 seconden** (`maxDuration`). Alles eronder is daarvan
afgeleid en moet daar samen in passen; klopt de som niet, dan kapt het platform de functie af en
blijven geclaimde taken vijf minuten op 'running' staan tot de reaper ze terugzet.

| Grens | Waarde | Waar |
|---|---|---|
| Routelimiet | 300 s | `maxDuration`, `app/api/cron/worker/route.ts` |
| Tijdbudget werker | 240 s (instelbaar) | `workerTimeBudgetMs`, `lib/config.ts` |
| Reservering zware taak | 220 s | `HEAVY_JOB_RESERVE_MS`, `lib/jobs/worker.ts` |
| Reservering lichte taak | 115 s | `LIGHT_JOB_RESERVE_MS`, idem — gecontroleerd vóór élke claimronde |
| Totaalbudget één AI-aanroep | 105 s | `CALL_BUDGET_MS` → `callBudget()`, `lib/openai/client.ts` |
| Timeout per poging | 100 s | `TIMEOUT_MS`, idem |

Het totaalbudget is een `AbortSignal` die over ALLE pogingen heen geldt. Zonder dat was de echte
bovengrens van één aanroep 4 × 100 s = 400 s (`maxRetries = 3` herhaalt ook timeouts), en dan
klopt geen enkele reservering hierboven meer. Verhoog je één van deze getallen, reken dan de rij
opnieuw door.

## 10. Omgeving

| | |
|---|---|
| Supabase-project | `kosauqzjbpweluiqgmwv` ("GEO") |
| Vercel-project | `prj_VyYIOCRAn5nau54fHv7IdvqyXARr`, team `team_gCNH0rm9rhi5DACbVpaJR9zq` |

## 11. Migraties

`0001` t/m `0037`, alle toegepast op productie behalve `0033` (gereserveerd voor R6.2, nooit
gedraaid — een gereserveerd nummer dat nooit draaide blokkeert niets).

**Index per migratie en de regels voor het schrijven ervan: [`../supabase/README.md`](../supabase/README.md).**
Dat is de enige plek waar die regels staan; herhaal ze hier niet.
