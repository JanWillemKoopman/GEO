# Architectuur

Backend, Supabase, pijplijn en deploy. Voor het *waarom* achter een keuze: `logbook.md`.
Voor UI/UX: `ux-design.md`.

> **Geverifieerd tegen de code op 13 augustus 2026** (branch `main`, t/m migratie `0057`),
> plus de eind-tot-eind-ronde van 1 augustus (`logbook.md` §10) en de eerste echte
> onboarding op productie van 3 augustus (`logbook.md`, Fysi-Unique). Die laatste legde
> zes fouten bloot in de samenhang tussen de onboardingstappen; alle zes zijn verwerkt.
> Dit document beschrijft wat de code dóet, niet wat een plan voorschrijft, wijkt het af, dan is
> de code leidend en is dit document fout. Werk deze datum bij zodra je hem hebt nagetrokken.
>
> §1 t/m §9 en §11 zijn op 13 augustus regel voor regel tegen de code van migraties `0051` t/m
> `0057` nagelopen (budgetplafond, promptverdeling, de rolmatrix-leesregels, de potentiescore).
> Daarbij kwam één gat boven water: `profile_competitors` (de concurrentdestillatie na de
> aggregatie) ontbrak in de taaksoortenlijst en had geen eigen rij in de pijplijntabel, allebei
> hersteld. Niet apart nagelopen: §10 (omgeving, twee vaste ID's, laag risico op drift).

## 1. Hosting en dataflow

```
Klant (browser/mobiel)
   │
   ▼
Vercel: Next.js 15 op Node.js  (code: GitHub, deploy op push naar main)
 ├─ Frontend: /profielen, /analyses/[id] (dossier in 4 hoofdstukken), /instellingen
 ├─ API-routes: CRUD + schrijfacties (service-role key + ownership-check)
 ├─ Vercel Cron (vercel.json, Hobby-limiet: max 2 taken, elk max 1×/dag)
 │    • /api/cron/tracking   maandelijks, 1e van de maand 06:00 UTC
 │    • /api/cron/reminders  wekelijks, maandag 09:00 UTC (staat nu uit vercel.json)
 ├─ /api/cron/worker: de motor, elke MINUUT aangeroepen door Supabase pg_cron
 └─ /api/cron/plan:   de schrijfronde van het contentplan, DAGELIJKS via pg_cron
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
 ├─ jobs (wachtrij: GEEN client-toegang, ook geen SELECT)
 └─ ai_calls (kostenlogboek, 1 rij per aanroep)
   │
   └──────► Resend (rapport-mail, publicatieherinnering), alleen bij EMAILS_ENABLED=true
```

**Uitvoeringsmodel.** Korte acties (CRUD, status opvragen) lopen via een gewone API-route. Al het
zware werk. Elke AI-aanroep, loopt via de jobwachtrij: de API-route zet alleen een taak klaar
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
- **Registratie:** twee lagen, Supabase "Allow new users to sign up" (harde poort, ook tegen
  directe API-aanroepen) en `SIGNUPS_ENABLED` in de app (verbergt UI, blokkeert de server action).

### Betaald werk: twee onafhankelijke remmen

Elf routes zetten werk in gang dat geld kost. Ze stellen allemaal dezelfde twee vragen, in deze
volgorde, en een route die er één vergeet wordt door een broncodecontrole in `scripts/test-unit.ts`
tegengehouden.

| | Vraag | Waar | Antwoord bij weigering |
|---|---|---|---|
| 1 | **Wie** mag dit starten? | `lib/cost-guard.ts` | 403, met een eigen zin per handeling (`lib/cost-rules.ts`) |
| 2 | **Hoeveel** is er nog over? | `lib/spend-limit.ts` | 402, met bedrag, plafond en waar je het verhoogt |

Vraag 1 is besluit 18: alleen de beheerder. Vraag 2 zijn twee plafonds, €50 per account per maand en
€150 per dag over alle accounts samen, allebei instelbaar (`MONTHLY_BUDGET_EUR`, `DAILY_BUDGET_EUR`)
en per account te overschrijven via `accounts.monthly_budget_eur`. De regels en bedragen staan puur
en testbaar in `lib/spend-rules.ts`.

⚠️ **De twee remmen falen expres de andere kant op.** Vraag 1 faalt naar "nee": gaat de controle
stuk, dan kan iemand even niets, en dat is het veiligste. Vraag 2 faalt naar "ja": zou die naar
"geblokkeerd" vallen, dan legt één trage query de hele pijplijn plat voor alle klanten, inclusief
werk dat allang betaald is. Dat wordt wel luid gelogd, want een rem die stil niet werkt is erger dan
geen rem.

De rem zit op het **starten** van werk, niet op de werker. Een taak die al in de wachtrij staat
draait door, en een meetronde wordt nooit halverwege afgekapt: een halve analyse is een groter
probleem dan een dollar.

## 3. Datamodel, de kern

| Tabel | Wat het is |
|---|---|
| `profiles` | Klant/merk op accountniveau. Website, branche, aliassen, concurrenten, persona's, tone-of-voice, `business_model`. Eén keer onderzocht, hergebruikt door alle analyses. Sinds migratie `0045` ook `taboo_phrases` en `compliance_notes` (harde schrijfregels, deterministisch teruggecontroleerd door `checkTabooWords()` in `lib/pipeline/content-gate.ts`), `author_name`/`author_role`/`author_bio`/`author_linkedin_url`, en vier tone-of-voice-schuiven `tone_formality`/`tone_energy`/`tone_complexity`/`tone_humor` (1-3 of `null`, vertaald naar prompttaal door `lib/pipeline/tone-sliders.ts`, nooit het cijfer zelf naar het model). |
| `profile_pages` | Contentinventaris uit een crawl (sitemap recursief, anders homepage-links). Productpagina's uitgesloten. Geen AI. Alle tekst gaat door `sanitizeForPostgres()` (`lib/pg-text.ts`): één NUL-byte uit één pagina laat Postgres anders de hele batch-insert weigeren, en dan verdwijnt de complete inventaris. |
| `analyses` | Eén getrackt onderwerp onder een profiel. Status, tracking aan of uit, content-brief. `topic` verplicht en niet wijzigbaar na start. |
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
| `content_pieces` | Gegenereerde pagina's. Versiebeheer per (analyse, titel) via `version`/`is_current`/`supersedes_id`, plus `briefing_snapshot_json`, `claims_json`, `source_coverage`, `quality_score`, `geo_score`, `needs_review`, `reviewed_at`/`reviewed_by`. `faq_json` is sinds de content-editie (§5, stap 16) ook door de klant bewerkbaar via de PATCH-route, niet alleen door het model. |
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

- **24 taaksoorten:** `profile_discover`, `profile_research`, `profile_offering`, `propose_topics`,
  `profile_market`, `profile_llm_baseline`, `profile_synthesis`, `prepare_analysis`,
  `generate_prompts`, `calibrate_volumes`, `measure_prompt`, `aggregate_week`,
  `profile_competitors`, `generate_report`, `content_brief`, `content_draft`, `content_revise`,
  `technical_audit`, `verify_publication`, `measure_impact`, `compute_impact`, `offsite_scan`,
  `gsc_sync`, `recalculate_potential`.
  `profile_competitors` hangt tussen `aggregate_week` en `generate_report`: destilleert per
  concurrent de eigenschappen uit de antwoordfragmenten van die periode (`competitor-intel.ts`),
  een eigen taak omdat het een eigen AI-aanroep is (conventie 7), niet omdat het inhoudelijk apart
  van de aggregatie staat.
  `recalculate_potential` is profielbreed (geen `analysis_id`), getriggerd vanuit `generate_report`
  zodra een analyse haar eerste rapport krijgt: herberekent `search_volume_index` op ALLE
  onderwerpen van dat merk in één aanroep (`lib/pipeline/search-demand.ts`), zie
  `docs/tasks/potentiescore.md`.
- **De onboardingketen** (de eerste zeven) hangt aan één `enqueue` vanuit `POST /api/profiles`:
  `profile_discover` plant `technical_audit` én `profile_research` in, en vanaf daar ketent elke
  stap zijn opvolger. `profile_offering` plant `profile_market` **onvoorwaardelijk** in, niet via
  `propose_topics`, want die keert vroeg terug als er geen aanbodboom is, en dan zou juist bij de
  klanten met een magere crawl de hele staart van de keten stil verdwijnen.
- **Eén taak = hoogstens één zware AI-aanroep**, zodat elke taak binnen één werker-aanroep past.
  Meting is daarom per prompt opgeknipt, contentgeneratie in twee taken.
- **Ketening:** elke handler plant zijn eigen vervolgtaak in. Het werk hangt aan de server, niet
  aan een openstaande browsertab.
- **Dedupe:** elke `enqueue` krijgt een sleutel; dubbele inserts worden genegeerd.
- **Retries:** max 4 pogingen, backoff 2/4/8/16 minuten. Definitief falen van de laatste
  `measure_prompt` triggert alsnog de vervolgketen (`scheduleFollowUpAfterFailure`), zodat een
  analyse niet blijft hangen.
- **Tijdbudget:** `workerTimeBudgetMs` 240.000 ms, ruim onder de `maxDuration` van 300s.
- **Gearchiveerd werk telt niet mee:** `/api/cron/tracking` en `/api/cron/reminders` filteren op
  `archived_at is null` (§11). Zonder dat filter blijft een verborgen merk maandelijks geld kosten.
- **Reclaim, geen stille corruptie:** elke `runWorker()`-aanroep begint met `reclaim_stuck_jobs`
  (RPC, `STUCK_AFTER_MINUTES = 5`): een taak die `running` bleef staan na een afgebroken vorige
  aanroep (platform-timeout, crash) gaat terug de rij in. Zo'n reclaim wordt sinds de
  betrouwbaarheidsronde ook gelogd (`console.warn`, `lib/jobs/worker.ts`), eerder telde
  `out.reclaimed` alleen mee maar kwam nergens in de logs terecht.
- **Poging zichtbaar voor de klant:** `JobProgress.attempts` (`lib/jobs/progress.ts`, het hoogste
  aantal pogingen onder de openstaande taken van een analyse of profiel) gaat mee in de
  status-routes en verschijnt in `WorkInProgress` als "poging 2 van 4" zodra er een nieuwe poging
  na een tegenslag loopt, in plaats van alleen "Aura probeert het automatisch opnieuw" zonder
  getal.

## 5. De pijplijn, stap voor stap

| # | Stap | AI | Kern |
|---|---|---|---|
| 1 | Profiel aanmaken |, | Eén scherm, drie velden: webadres, bedrijfsnaam, andere schrijfwijzen. De rest doet de pijplijn. |
| 2 | Ontdekken (fase 0) |, | `discover.ts`: tot 150 pagina's crawlen, JSON-LD/OpenGraph oogsten, telefoon/adres/e-mail/KvK uit de lopende tekst van de canonieke pagina's (`text-facts.ts`), inventariskwaliteit beoordelen, renderbaarheid vaststellen. **Nul AI-kosten**, en de context waar alle volgende stappen op leunen. |
| 3 | Technische GEO-audit |, | `robots.txt` tegen bekende AI-crawlers, plus vier entiteitschecks (naamconsistentie, `sameAs`, schema-dekking, Wikidata). Staat de site dicht, dan blokkeert dit contentgeneratie. |
| 4 | Profielonderzoek | luna, web_search | Merk, branche, bedrijfsmodel, **bereik en werkgebied**, tone-of-voice, persona's, concurrenten, `proofPoints`, `styleSamples`. nu op alle gecrawlde pagina's in plaats van op de homepage. Klant-input is leidend (`prepare-profile.ts`), en wat een mens zette blijft staan (`field-merge.ts` tegen `profile_field_sources`). |
| 4a | Aanbodboom | luna | `offering.ts`: het aanbod als boom (`profile_offerings`), per bedrijfsmodel een andere briefing. Een knoop zonder gecrawlde bron-URL vervalt; het citaat bepaalt de zekerheid (`quote-check.ts`). |
| 4b | Core topics | luna | `propose-topics.ts`: 5–8 onderwerpen uit de aanbodboom, elk met verwijzing naar de knopen waar ze uit volgen. Voorstel, geen meting, goedkeuring is een aparte handeling. |
| 4c | Markt | luna, web_search | `market.ts`: per concurrent wáárom die wint, plus het bronnenlandschap van de markt. |
| 4d | LLM-kennisbasislijn | luna, deels web_search | `llm-baseline.ts`: vijf blokken (`kent`, `klopt`, `citeert`, `verwarring`, `categorie`). `kent` stelt **zes** formuleringen en levert een verhouding, niet een ja of nee; `categorie` kiest zijn koopvragen via de topics en krijgt een eigen oordeel (word je genoemd, en wie wél). Alle oordelen worden in code geveld (`baseline-verdict.ts`), nooit door het model over zichzelf. |
| 4e | Synthese | **sol** (`SYNTHESIS_PREMIUM`) | `synthesis.ts`: dossier, gespreksagenda en `brand_facts`, alleen feiten waarvan het citaat letterlijk op de bronpagina staat. |
| 5 | Analyse aanmaken |, | Verplicht onderwerp + optionele content-brief. |
| 6 | Onderwerp-onderzoek (A1') | luna, web_search | Wat de site over dít onderwerp zegt + welke concurrenten hier relevant zijn. |
| 7 | Promptgeneratie (A2) | luna, temp 0,8 (effort none) | **Eén taak PER funnelfase** (sinds 12 aug 2026). Standaard 10 per fase, per analyse instelbaar (migratie 0054, `lib/prompt-mix.ts`). Merk- en concurrentneutraal geformuleerd. **Bij een lokaal merk zijn alle vragen regionaal**, zie hieronder. |
| 8 | Volumekalibratie | luna | Relatief gekalibreerd over álle prompts tegelijk, consistenter dan losse schattingen. Drie banden, geen verzonnen 0–100. |
| 9 | **Goedkeuringspoort** |, | De pijplijn stopt. De klant ziet en bewerkt onderzoek + alle prompts, en klikt pas dan "Bevestig en start meting". Geen black box, en niets betaalds start zonder akkoord. |
| 10 | Meting (A3) | 3a: luna + web_search, modelstandaard · 3b: luna, effort none | Per prompt: een gesimuleerd AI-antwoord, daarna een beoordeling per entiteit. 3a en 3b zijn los herhaalbaar, een mislukte 3b draait nooit opnieuw de dure 3a. |
| 11 | Gelaagd hermeten |, | De zwaarste `REPEATED_PROMPT_COUNT` (8) vragen worden `MEASURE_REPEATS` (3) keer gemeten. Alle aggregatie telt per **vraag**, met gewicht `1/aantal metingen van die vraag` (`question-share.ts`). |
| 12 | Aggregatie | luna (alleen nieuwe merken) | Entiteitclassificatie + deduplicatie, scores. |
| 12a | Concurrentdestillatie | luna | `profile_competitors`: per concurrent wélke eigenschappen uit de antwoordfragmenten van deze periode volgen, met letterlijk citaat als bewijs (`competitor-intel.ts`). Voedt `competitor_breakdown.attributes_json`/`why_summary`. |
| 13 | Gap-analyse (B1) | luna | Wáár concurrenten winnen, met bewijs uit de database. |
| 14 | Rapport (B2) | luna | Verwoordt B1; leidt niets zelf af. Krijgt naast de meetuitkomst de **structurele gaten** mee (`structure-gap.ts`): welke onderdelen van het aanbod geen eigen pagina hebben. Dat is de enige invoer die niet reactief is. Een claimvalidator verwijdert achteraf elke merknaam die niet in het bewijsdossier van díe vraag staat. |
| 15 | Contentbriefing | luna, temp 0 | Feitenkaart bouwen → claim-audit → max 8 vragen aan de klant. Eén slot is gereserveerd voor de positioneringsvraag. |
| 16 | Content schrijven | **sol** → luna-kritiek → sol herschrijven → luna-herbeoordeling | Uitsluitend binnen bevestigde feiten, met per bewering het feit dat hem dekt. Twee deterministische poorten: `checkContentGate()` (zeven GEO-checks, voedt `geo_score`) en `checkQuality()` (duplicatie + leesbaarheid, voedt alléén `needs_review`. Anders was de score van vorige maand onvergelijkbaar met die van vandaag). Schema.org volgt het bedrijfsmodel en draagt een organisatieknoop met `sameAs`. |
| 17 | Publiceren |, | Klant vult live-URL in; de app verifieert de pagina. |
| 18 | Effect meten | luna | Hermeetgolven + statistisch verdict of de zichtbaarheid meetbaar veranderd is. |
| 19 | Off-site | luna, gegrond | Op welke externe domeinen het merk wél/niet aanwezig is. |
| 20 | Maandelijkse ronde |, | Alleen voor analyses met tracking aan. Structureel merkloze vragen worden overgeslagen. |

**De content-editie** (naast stap 16, geen AI-kosten): de contentdetailpagina is niet alleen een
resultaat maar ook een bewerkoppervlak, naar het voorbeeld van InSpace Nova's contentreview
(`docs/logbook.md`, content-editie-paragraaf). Drie nieuwe pure modules voeden dat scherm, naast
de al bestaande `version-reason.ts` en `similarity.ts`:

- `lib/pipeline/content-diff.ts` (`diffContent()`): het woord-voor-woord-verschil tussen twee
  versies, klassieke LCS, met een terugval op alineaniveau bij een ongebruikelijk lange tekst.
  Gevoed via `GET /api/analyses/[id]/content/[pieceId]/diff?met=<versionId>`, lazy, alleen op
  verzoek.
- `lib/pipeline/slug.ts` (`slugFrom()`, `suggestedPath()`, `resolvedContentUrl()`): de
  voorgestelde of echte URL van een pagina, gedeeld door `PublishGuide` en `SearchPreview`.
- `lib/schemas/content-piece.ts` (`FaqEdit`): validatie voor een door de klant bewerkte FAQ, los
  van `ContentPiece` (wat het model teruggeeft). De PATCH-route herbouwt `schema_jsonld` via
  `validateOrRebuildJsonLd()` zodra de FAQ van een `type: "faq"`-pagina wijzigt, met
  `loadSchemaOrg()` (`lib/pipeline/content.ts`) als gedeelde bron voor de organisatieknoop, zodat
  die niet verdwijnt bij een herbouw.

### De promptverdeling, en waarom de generatie in drie taken zit

Standaard tien vragen per funnelfase, dertig in totaal. Per **analyse** aan te passen tussen 0 en 40
per fase, met een maximum van 90 in totaal (`lib/prompt-mix.ts`). Per analyse en niet per merk: de
juiste verdeling hangt aan het onderwerp, niet aan het bedrijf.

⚠️ **Nul is een keuze en geen leegte.** Een fase op nul zetten is geldig, en dat is overal expliciet
afgehandeld: de terugval naar de standaard gebeurt per fase en gebruikt geen `??` (dat zou nul
wegrekenen), een fase met nul krijgt geen taak, en een lege uitkomst geldt dan niet als storing.

**De generatie is één taak per fase**, sinds 12 augustus 2026. De gezamenlijke taak liep op productie
één keer 228 seconden van de 300 die hij heeft; met meer vragen per fase zou hij daaroverheen gaan en
middenin afgekapt worden. Drie taken van ~76 seconden houdt ruimte over, en het volgt conventie 7.

De poort naar klant-goedkeuring (`concept_klaar`) gaat pas open als álle fasen klaar zijn. De
fasetaak weet niet of hij de laatste is; de wachtrij telt hoeveel er nog openstaan.

**Wat een vraag kost:** $0,024 per meting, gemeten over 428 metingen op productie. Dertig vragen is
dus ~$0,72 per meetronde per onderwerp, zestig ~$1,44, negentig ~$2,16. De onzekerheidsband schaalt
met de wortel: ±16,4 punten bij 30, ±11,6 bij 60, ±9,5 bij 90. Het scherm toont beide getallen vóór
het starten.

### De regionale regel bij een lokaal merk

Staat `profiles.service_scope` op `lokaal` én zijn er regio's bekend, dan moet **elke** vraag een
plaats, een provincie of een nabijheidswoord ("bij mij in de buurt") bevatten. Niet een deel, alle.

**Waarom alles en niet een deel.** Een score is een aandeel: in hoeveel van de gemeten vragen word je
genoemd. Zit er een vraag in die dit bedrijf per definitie niet kan winnen, dan is de uitkomst niet
iets te laag maar onwaar. Gemeten bij Fysi-Unique, het enige merk met drie meetronden: van 57
betaalde metingen op landelijke vragen leverde er niet één een vermelding op, terwijl de tien
regionale vragen op score 28 uitkwamen.

**Hoe het afgedwongen wordt** (conventie 1, een instructie is een intentie en code is een garantie):

1. De promptinstructie noemt een concreet aantal, geen "een deel".
2. `lib/pipeline/geo-share.ts` telt na afloop hoeveel er regionaal zijn.
3. Klopt het niet, dan volgen maximaal drie bijvulronden die om regionale vragen vragen.
4. Wat er dan nog landelijk is, wordt **geschrapt**. Liever een kleinere set die klopt: de
   onzekerheidsband wordt breder bij minder vragen en dat is eerlijk zichtbaar, in plaats van een
   precies getal dat niet waar is.
5. Handmatig toevoegen of herschrijven van een vraag gaat door dezelfde poort
   (`regionGateMessage()`), anders haalt één tekstveld de garantie onderuit.

⚠️ **De hele regel hangt aan `service_scope`.** Staat dat veld leeg, dan vuurt er niets. Daarom is
"Werkgebied vastgesteld" een blokkerende regel in het afrondingsblok van het merkdossier
(`lib/pipeline/profile-readiness.ts`): zonder bereik is het dossier niet af.

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
plek. Reden: GPT-5.6 accepteert `temperature` uitsluitend bij effort `none`, bij elke hogere
stand is het een unsupported parameter en faalt de call.

| `work` | effort | temperature | Voor |
|---|---|---|---|
| `deterministic` | `none` | 0 | Classificeren/beoordelen, claim-audit, content-kritiek |
| `analytical` | `low` |, | Research, kalibratie, gap-analyse, rapport, bronanalyse |
| `creative` | `none` | 0,8 | Promptgeneratie, variatie is gewenst, redeneren maakt de vragen juist gelijkvormig |
| `content` | `medium` |, | Content schrijven/herschrijven |
| `simulation` |, |, | Halte 3a: bewust niets meegeven, meet wat een AI-assistent op standaardinstellingen doet |

De effort-standen staan bewust laag: één aanroep moet binnen `TIMEOUT_MS` (100 s,
`lib/openai/client.ts`) passen, en de onderzoeks- en meetstappen doen daar óók web_search bij
(20–40 s). Omhoog draaien kan pas nadat de doorlooptijd op productie is nagemeten en
`HEAVY_JOB_RESERVE_MS` in `lib/jobs/worker.ts` is bijgesteld.

**Vangnet.** Weigert de API `temperature` toch (OpenAI kan de regel aanscherpen), dan herhaalt
`structured.ts` die ene call zonder temperatuur en stuurt hem de rest van het proces niet meer
mee, een zelfherstellende hik in plaats van een meetronde die halverwege omvalt.

| Env | Standaard | Effect |
|---|---|---|
| `WEB_SEARCH_ENABLED` | aan | Uit = geen web_search bij meting, profiel- en onderwerponderzoek. Grootste kostenknop. |
| `MEASURE_WEB_SEARCH` | aan | Alleen de meting groundless. Uit = goedkoop ontwikkelen, niet representatief. |
| `CONTENT_WEB_SEARCH` |, | Vangnet tijdens schrijven, alleen bij < 3 `proof_points`. |
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
  $25, 30 vragen gaan van $0,75 naar $0,30.
- **Maar de opgehaalde pagina's worden nu wél als input afgerekend** (op de niet-redeneerpreview
  waren die tokens gratis). Bij ~8k tokens per zoekactie op Luna is dat ~$0,05 per ronde.
- De tokenkosten zelf blijven in dezelfde orde: `quality` halveerde (mini → Luna), `volume` werd
  duurder (nano → Luna), en samen wogen die twee al maar ~5% van een ronde.

Reken dus op **ruwweg $0,40 per meetronde**, een schatting op basis van de gepubliceerde tarieven,
nog niet nagerekend tegen `ai_calls` op productie (conventie 10). Contentgeneratie (`gpt-5.6-sol`)
is de enige duurdere post en werd juist ~5× duurder per pagina: Sol is 2,5×/3,75× het tarief van
gpt-4.1 en de redeneertokens tellen als output.

## 7. E-mail

`EMAILS_ENABLED` is de hoofdschakelaar en staat standaard **uit**. Dan gebeurt er niets, ook
`reports.emailed_at` en `analyses.publish_reminder_sent_at` blijven leeg, zodat een eenmalige
herinnering niet stil opgebrand wordt aan een mail die nooit ging. De reminder-cron antwoordt
`{ "skipped": "emails_disabled" }`. Rapporten blijven gewoon zichtbaar in de app.

De schakelaar staat **los van** `RESEND_API_KEY`: je kunt de sleutel in Vercel zetten zonder dat er
iets de deur uit gaat.

| Mail | Wanneer | Code |
|---|---|---|
| Rapport klaar | Na B2, als `notify_by_email` aan staat **en** `isWorthEmailing(change)`, een periode zonder betekenisvolle verandering mailt niet | `lib/email/report-email.ts` |
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
| `SUPABASE_SERVICE_ROLE_KEY` | idem, `service_role`, **server-only, nooit `NEXT_PUBLIC_`** |
| `OPENAI_API_KEY` | platform.openai.com |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | alleen bij `EMAILS_ENABLED=true` |

## 9. Deploy en cron

1. Push naar `main` → Vercel deployt. Env-variabelen in Project → Settings → Environment Variables.
2. `CRON_SECRET` zetten; Vercel Cron stuurt hem automatisch mee als `Authorization: Bearer …`.
3. **De werker draait op pg_cron, niet op Vercel.** Migratie `0015` regelt de aanroep, maar is
   niet genoeg, zet ook de twee Vault-geheimen:

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
| Rapport-mail | `/api/cron/reminders` | maandag 09:00 UTC | Vercel (nu uit `vercel.json` gehaald, bestaat alleen om te mailen) |
| Schrijfronde contentplan **en zoekdata** | `/api/cron/plan` | dagelijks 04:00 UTC | **Supabase pg_cron** (migratie `0050`, taak `aura-plan-writer`) |

**De schrijfronde in één alinea.** Pagina's van een GOEDGEKEURDE maand die binnen tien dagen
gepubliceerd moeten worden, krijgen een schrijftaak; de route plant alleen, de werker schrijft.
Wat er níet geschreven kan worden telt de route apart en verzwijgt hij niet: schrijven leunt op een
gemeten analyse, en bij Van den Udenhout hebben zes van de acht onderwerpen er nog geen. De regel
staat in `lib/plan-writing.ts` (`writeDecision`), de reden per pagina staat in het scherm. De brug
tussen plan en contentpijplijn is `plannedPageId` in de payload van `content_draft`: daarmee weet de
plan-pagina welke tekst het geworden is, en zet de werker hem op `mislukt` als het schrijven
definitief niet lukt.

**Dezelfde ronde haalt de zoekcijfers op.** Elk merk met een `gsc_property` krijgt één `gsc_sync`-taak
per dag (migratie `0052`). Bewust geen tweede cron: allebei dagelijks, allebei alleen plannend, en
twee pg_cron-taken die een minuut na elkaar hetzelfde doen zijn twee dingen om te vergeten. De
koppeling loopt via een **service account** en niet via OAuth, want de `webmasters`-scopes zijn bij
Google "sensitive" en vragen dan een verificatietraject van weken. De sleutel staat in één
env-variabele (`GOOGLE_SERVICE_ACCOUNT_JSON`); ontbreekt hij, dan is de koppeling niet ingericht en
zegt het scherm dat. Aura vraagt alleen leesrecht, dus de klant voegt het adres toe met het recht
"Beperkt".

### Tijdbudgetten, waarom deze getallen bij elkaar horen

De werkerroute krijgt van Vercel **300 seconden** (`maxDuration`). Alles eronder is daarvan
afgeleid en moet daar samen in passen; klopt de som niet, dan kapt het platform de functie af en
blijven geclaimde taken vijf minuten op 'running' staan tot de reaper ze terugzet.

| Grens | Waarde | Waar |
|---|---|---|
| Routelimiet | 300 s | `maxDuration`, `app/api/cron/worker/route.ts` |
| Tijdbudget werker | 240 s (instelbaar) | `workerTimeBudgetMs`, `lib/config.ts` |
| Reservering zware taak | 220 s | `HEAVY_JOB_RESERVE_MS`, `lib/jobs/worker.ts` |
| Reservering lichte taak | 115 s | `LIGHT_JOB_RESERVE_MS`, idem, gecontroleerd vóór élke claimronde |
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

## 11. Klanten, accounts en archief

### Een nieuwe klant aanmaken en koppelen

Het product is sales-led: de consultant zet het merk klaar, de klant krijgt het ná de verkoop.
Vier stappen, en de volgorde is niet de voor de hand liggende, **het profiel maak je in de app,
niet in Supabase.**

| # | Waar | Wat |
|---|---|---|
| 1 | Supabase → Authentication → Users → **Add user** | E-mail + wachtwoord, **Auto Confirm User aan**. Er komt géén rij in `profiles` bij. |
| 2 | De app, ingelogd als beheerder → **Merken → + Nieuw merk** | Webadres, bedrijfsnaam, schrijfwijzen. De pijplijn draait ~7,5 min (~$0,25). Het profiel staat nu op het account van de beheerder. |
| 3 | Het demogesprek | Profiel doorlopen, gespreksnotities vullen, onderwerpen goedkeuren. |
| 4 | Profielpagina → blok **Beheer** (alleen zichtbaar voor beheerders) | Kies het account uit stap 1. |

Stap 4 zet `profiles.user_id` op de klant, vult `assigned_at`, laat `created_by_user_id` op de
beheerder staan, **en verplaatst alle analyses van dat merk mee**. Dat laatste is geen detail:
`user_id` staat in precies twee tabellen (`profiles` en `analyses`), en alleen de eerste bijwerken
levert een klant op die zijn merk ziet maar geen enkele analyse. Precies het scherm waarvoor hij
betaalt. Al het andere hangt via `analysis_id` aan de analyse en verhuist mee met de RLS-join.

**Wat je niet moet doen:** handmatig een rij in `profiles` aanmaken (dan mist het merk de hele
onderzoeksketen. Geen aanbodboom, geen kennistest, geen topics), of een klant in `staff_users`
zetten (dan ziet hij álle merken).

### Beheerders

`staff_users` bepaalt wie alles ziet. RLS aan, nul policies; alleen `is_staff()`, `security
definer`, `search_path` vast, alleen aanroepbaar door `authenticated`, komt erbij. Elke tabel met
een `*_select_own`-policy heeft een extra permissieve `*_select_staff`-policy ernaast; Postgres
combineert permissieve policies met OR, dus dat verbreedt zonder de bestaande regels te raken.
Migraties `0038` en `0042`.

### Archiveren

`profiles.archived_at` en `analyses.archived_at` (migratie `0044`). Gevuld = verborgen uit elke
lijst, telling en cron; leeg = zichtbaar. De data blijft volledig staan en het profiel blijft
bereikbaar via zijn directe URL. Het is een back-up, geen verwijdering.

`lib/archive.ts` is de enige plek die weet wat "actief" betekent. Zes query's gebruiken hem: de
merkenlijst, de analysenlijst, de telling achter "+ Nieuwe analyse", `loadWorkAcross`,
`/api/cron/reminders` en `/api/cron/tracking`. **Die laatste is de dure**: zonder filter plant de
app elke maand een betaalde meetronde in voor een merk dat niemand meer in de app ziet.

Bewust **niet** in RLS: dat zou een gearchiveerd merk ook voor de eigenaar onbereikbaar maken.

## 12. Migraties

`0001` t/m `0057`, alle toegepast op productie behalve `0033` (gereserveerd voor R6.2, nooit
gedraaid, de reservering verviel toen `0039` de inventariskwaliteit fase 0 van de nieuwe
onboarding maakte; een gereserveerd nummer dat nooit draaide blokkeert niets).

**Index per migratie en de regels voor het schrijven ervan: [`../supabase/README.md`](../supabase/README.md).**
Dat is de enige plek waar die regels staan; herhaal ze hier niet.
