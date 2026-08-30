# Architectuur

Backend, Supabase, pijplijn en deploy. Voor het *waarom* achter een keuze: `logbook.md`.
Voor UI/UX: `ux-design.md`.

> **Geverifieerd tegen de code op 13 augustus 2026** (branch `main`, t/m migratie `0057`).
> **Bijgewerkt op 19 augustus 2026** voor onboarding 3.0 (migratie `0060`): §3 (de commerciële laag
> en `profile_field_sources`), §5 (stap 4f en 4g), §11 (de onboardingsessie in de klantreis) en §12.
> **Bijgewerkt op 22 augustus 2026** voor Mijn reputatie (migratie `0062`): §3 (de vijf
> reputatietabellen en de kolom op `ai_calls`), §4 (de zes nieuwe taaksoorten), §5 (stap 17) en §6
> (de vijf nieuwe AI-aanroepen). ⚠️ Dat onderdeel is gebouwd en op ketentests geverifieerd, maar er
> Migraties `0062` en `0063` staan op productie. Er zijn op 23 augustus twee echte runs gedraaid,
> op Van den Udenhout en op Gasservice Brabant; wat die opleverden staat in §6 en in
> `docs/logbook.md`. De tweede run draaide op de herziene opzet: de open marktvraag in plaats van de
> benoemde vergelijking als hoofdmechanisme, drie herhalingen op de merkbrede vragen, en de
> verdeling naast het gemiddelde.
> **Bijgewerkt op 24 augustus 2026**: de gespreksagenda uit de synthese landt nu als
> beantwoordbare vragen in `fact_requests` (§3 en §5, stap 4e), en de statusroute telt de open
> punten niet meer apart naast die vragen.
> **Bijgewerkt op 28 augustus 2026**: de eindpoort staat in §2 (geen definitieve versie zolang er
> vragen open staan), en "Vraagt jouw input" heet "Openstaande vragen" en staat op
> `/merk/[id]/strategie/vragen`. Geen migratie: alle kolommen bestonden al.
> **Bijgewerkt op 26 augustus 2026**: de tijdrij van §9 is opnieuw doorgerekend
> (doorloop-huyberts.md punt 5). Migraties `0066` en `0067` zijn erbij gekomen
> (supabase/README.md); `0067` staat bij §3, het contentplan.
> **Bijgewerkt op 29 augustus 2026** voor sprint 1 tot en met 5 van de Sales-module (migraties
> `0068` tot en met `0073`): §2 (de derde en vierde rol), §3 (de Sales-tabellen), §4 (twaalf
> taaksoorten erbij en twee extra soorten taakeigenaar) en §12. Die module is intern en de klant
> ziet er niets van; de scheiding staat in de database en niet alleen in de schermen.
> De rest van de peildatum hieronder blijft staan.
> **Migraties `0058` en `0059` zijn er sindsdien bijgekomen** en staan wél in §12 en in dit
> document verwerkt, maar de rest is niet opnieuw regel voor regel nagelopen. Verder geldt:
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
 ├─ Frontend: /merk/[id]/... (de merk-werkruimte), /analyses/[id] (dossier in 4 hoofdstukken, hangt in het menu onder Clusters), /instellingen
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

### ⚠️ De functies draaien in Dublin, en dat is geen detail (28 augustus 2026)

`vercel.json` zet `"regions": ["dub1"]`. Dublin is AWS `eu-west-1`, precies de regio waar het
Supabase-project staat. Tot 28 augustus 2026 stond er niets, en dan kiest Vercel `iad1`
(Washington). Elke databasevraag legde dus de Atlantische Oceaan af en weer terug: ongeveer 80
milliseconden per vraag, terwijl de vraag zelf in de database een tiende daarvan kost
(`pg_stat_statements`: geen enkele app-query staat in de top van de zwaarste verbruikers, de
zwaarste post is de minuutlijkse `trigger_worker()` met 8,7 ms gemiddeld).

Dat verklaarde het meeste van de traagheid: niet de queries, maar de afstand ertussen, maal het
aantal vragen dat een scherm stelt. Binnen dezelfde AWS-regio is die afstand ongeveer één
milliseconde.

**Deze regel hoort mee te verhuizen als het Supabase-project ooit van regio verandert.** Staan ze
uit elkaar, dan is elke query weer een oversteek en telt geen enkele optimalisatie hieronder nog op.

### Hoeveel netwerkrondes een scherm kost (28 augustus 2026)

Een scherm rendert op de server, en elke vraag aan Supabase is een aparte netwerkronde. Wat er
onder elkaar staat, wacht ook onder elkaar. Vier plekken deden dat zonder dat het nodig was, en
alle vier draaiden ze onder **élk** scherm van de app:

| Wat | Was | Is |
|---|---|---|
| `supabase.auth.getUser()` (`lib/auth.ts`) | 3× per scherm, want de shell, de merk-layout en de pagina vroegen het elk apart | 1×, gememoïseerd per verzoek met `cache()` |
| De shell (`app/(app)/layout.tsx`) | werkruimte, `isStaff` en `isStaffAccount` achter elkaar | tegelijk, in één `Promise.all` |
| De merkenlijst (`lib/workspace.ts`) | lidmaatschap en beheerdersrecht achter elkaar, en de hele lijst twee keer opgehaald | tegelijk, en gememoïseerd |
| De teller open vragen (`lib/open-questions.ts`) | profiel ophalen, dán de twee vragenlijsten | alle drie tegelijk |

⚠️ `auth.getUser()` is géén cookie-lezing: hij laat het token valideren door de Auth-server van
Supabase, en dat is precies waarom hij veiliger is dan `getSession()`. Die controle blijft staan,
hij gebeurt alleen nog één keer per verzoek in plaats van drie keer.

⚠️ De middleware slaat `/api/` sinds dezelfde datum over. Ze deed daar niets nuttigs (een
doorverwijzing naar HTML helpt een `fetch()` niet) en kostte wél een ronde naar de Auth-server
vóór de route-handler begon. Elke knop in de app doet een `fetch()`, dus die ronde zat in elke
klik. Alle routes doen hun eigen controle; `health` en `invites/accept` zijn met opzet publiek.

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

### De eindpoort: geen definitieve versie met openstaande vragen (28 augustus 2026)

Een pagina kan geschreven worden terwijl er vragen open staan, maar hij kan niet **afgerond**
worden. De poort staat op twee routes:

| Route | Wat hij doet | Wat de poort doet |
|---|---|---|
| `POST /api/analyses/[id]/content/[pieceId]` | Herschrijven met feedback, levert een nieuwe versie | 409 zolang er vragen open staan |
| `POST /api/analyses/[id]/content/[pieceId]/approve` | Vrijgeven (`needs_review` op `false`) | 409, idem |
| `POST /api/analyses/[id]/generate` met `regenerate: true` | Nieuwe versie bovenop een afgeronde pagina | 409, idem |

Het eerste concept (`generate` zonder `regenerate`) blijft vrij. Dat is geen slordigheid maar de
kern: de scherpste vragen ontstaan pas tijdens dat schrijven, want de claim-audit leest wat de tekst
beweert en vraagt precies dát na (`lib/pipeline/briefing.ts`). Een poort ervóór zou vragen om
antwoorden die nog niet bestaan.

**Wat tegenhoudt** (`countBlockingQuestions` in `lib/open-questions.ts`): open vragen met de
`analysis_id` van dit cluster, plus open vragen waarvan `content_piece_ids` deze pagina bevat. Een
merkbrede vraag die niet aan deze pagina hangt telt niet mee, anders zet één onbeantwoorde vraag uit
de onboarding élke pagina van élk cluster voorgoed dicht. Status `overgeslagen` telt als behandeld:
dat is de uitweg die de poort leefbaar houdt.

De beslissing en de meldingstekst staan in `lib/content-final-gate.ts`, puur en zonder
`server-only`, zodat de knop en de route letterlijk dezelfde zin tonen (conventie 1: de knop is de
intentie, de route de garantie).

### De klantweergave: een beheerder die zichzelf tijdelijk klant maakt

Een beheerder kan met één knop rechtsboven in de bovenbalk zien wat een klant ziet, zonder uit te
loggen. De knop staat alleen bij een echte beheerder (`isStaffAccount()` in `lib/staff.ts`), en zet
een sessiecookie (`orbit_engine_klantweergave`, geen `maxAge`, dus weg zodra de browser dicht gaat).

**De cookie kan nooit rechten geven, alleen wegnemen.** `isStaff()`, de functie die overal in de app
"mag deze gebruiker als beheerder"beantwoordt, controleert eerst het echte recht
(`isStaffAccount()`) en pas daarna, alleen als dat recht er al was, of de klantweergave aanstaat. Een
klant die dezelfde cookie zelf zou zetten verandert daarmee niets: bij hem was het echte recht er
nooit, dus de tweede vraag komt niet eens aan bod.

**Eén functie, geen aparte controle per scherm.** Elke plek die al "isStaff(user.id)" vroeg, voor
menu's, voor de vijf beheerschermen, voor de sloten in `lib/cost-guard.ts`, krijgt de klantweergave
automatisch mee, zonder dat scherm daar zelf voor hoeft te coderen. Dat is bewust: de klantweergave
zou onbetrouwbaar zijn als één vergeten scherm zijn eigen `isStaff`-vraag anders zou beantwoorden dan
de rest.

⚠️ **Wat de klantweergave niet raakt: rijbeveiliging (RLS).** Leest een scherm via de gewone,
gebruikersgebonden Supabase-client (bijvoorbeeld `getProfile()`), dan gelden de policies uit
migratie `0046` gewoon, en die kennen de klantweergave niet: een beheerder blijft via
`profiles_select_staff` elk merk kunnen lezen, ook tijdens de klantweergave. Dat is de reden dat
previewen op eender welk merk werkt. Schrijfroutes lopen via `getOwnedProfile()` /
`getOwnedAnalysis()` (`lib/access.ts`, `hasAccess()`), en die vallen wél terug op `isStaff()` als
laatste stap: een beheerder die tijdens de klantweergave iets probeert te wijzigen op een merk dat
niet van hemzelf is en niet in zijn eigen account zit, krijgt daar dezelfde weigering als een klant
zou krijgen. Op een eigen testmerk (`profiles.user_id` is de beheerder zelf) blijft alles werken,
want eigendom hangt nooit van `isStaff()` af.

⚠️ **Faalt zacht buiten een verzoek.** `cookies()` bestaat alleen binnen een Next.js-verzoek. Roept
iets `isStaff()` aan zonder dat verzoek (een achtergrondtaak, een script, een ketentest die een
route-handler rechtstreeks aanroept), dan valt de klantweergave-controle terug op "niet aan het
previewen" in plaats van te crashen.

### Eén merk tegelijk, altijd

Een klant ziet nooit gegevens van meer dan één merk naast elkaar. Dat staat op drie plekken vast, en
de eerste twee zijn de echte garantie:

1. **De rechten.** `profiles` en `analyses` hebben RLS-policies die lezen beperken tot je eigen
   merken, de merken van je account, en staf (migratie `0046`). Een klant die het adres van een
   ander merk intikt krijgt `notFound()`, want `getProfile()` leest via die policies.
2. **De query.** `loadBrandWork()` en `loadDashboard()` krijgen het merk als verplicht argument mee
   en filteren erop in de database. Tot 27 augustus 2026 haalden ze élke analyse van de gebruiker op
   en filterde het scherm daarna zelf; filteren is een intentie, de query is de garantie
   (conventie 1). De twee aggregaten die over merken heen telden (`stats`, `biggestChange`) zijn
   verwijderd met het scherm dat ze toonde.
3. **De schermen.** Elk klantscherm hangt onder `/merk/[id]/` of onder één cluster, en dat cluster
   hoort bij één merk. De enige uitzondering is de merkenlijst `/merk`, en dat is een keuzemenu:
   namen en status, geen cijfers. Een klant met precies één merk wordt daarvandaan doorgestuurd naar
   dat merk, dus hij ziet die lijst nooit.

⚠️ Wat hier bewust buiten valt: `/instellingen` toont de accounts waar de gebruiker zelf lid van is,
met de teamleden erbij. Dat zijn zijn eigen accounts en geen merkgegevens.
### Vier rollen sinds de Sales-module (migratie `0068`)

Tot 24 augustus 2026 kende de app er twee: klant, en beheerder via `staff_users`. Dat is te grof
zodra er een interne acquisitiemodule bij komt, en wel twee kanten op. Een salesmedewerker moet bij
de opportunities kunnen, maar hoort niet ongevraagd in het merkdossier van een bestaande klant te
kunnen kijken. En een marktanalyse starten kost geld en kan tot een publieke pagina leiden, dus dat
hoort niet iedereen met een Sales-inlog te mogen.

| Rol | Tabel | Ziet | Mag |
|---|---|---|---|
| Klant | `profiles.user_id` plus zijn account | alleen het eigen merk | niets in Sales |
| Sales | `sales_users` | de hele Sales-sectie | opportunities bekijken, toewijzen, status wijzigen |
| Sales admin | `sales_users.is_admin` | idem | plus wat geld kost of naar buiten gaat |
| Beheerder | `staff_users` | alles, ook de klantomgeving | alles |

Een beheerder is automatisch ook sales admin; andersom niet. Dat staat op twee plekken en die geven
hetzelfde antwoord: `is_sales()` in de database roept `is_staff()` aan, en `lib/sales/access.ts`
doet hetzelfde op de server. Zouden ze uiteenlopen, dan ziet iemand een knop die de database weigert.

De scheiding met de klantomgeving staat op drie plekken, en dat is hier terecht: dit is de enige
plek in de app met gegevens over bedrijven die geen klant zijn en er niet om gevraagd hebben.

1. **De database.** RLS op de drie datatabellen, één selectpolicy, en die vraagt `is_sales()`.
   `sales_users` zelf heeft nul policies, net als `staff_users` en `jobs`.
2. **De route.** `app/(app)/sales/layout.tsx` geeft 404 en geen 403 aan wie er niet bij hoort. Een
   403 bevestigt dat het scherm bestaat.
3. **De broncodecontrole.** `scripts/test-unit.ts` dwingt af dat geen enkel klantscherm een
   Sales-tabel leest, dat alleen de gedeelde shell de Sales-laag importeert (om de kop te kunnen
   verbergen), en dat elke Sales-schrijfroute zijn eigen rechtencontrole heeft.

### Betaald werk: twee onafhankelijke remmen

Elf routes zetten werk in gang dat geld kost. Ze stellen allemaal dezelfde twee vragen, in deze
volgorde, en een route die er één vergeet wordt door een broncodecontrole in `scripts/test-unit.ts`
tegengehouden.

| | Vraag | Waar | Antwoord bij weigering |
|---|---|---|---|
| 1 | **Wie** mag dit starten? | `lib/cost-guard.ts` | 403, met een eigen zin per handeling (`lib/cost-rules.ts`) |
| 2 | **Hoeveel** is er nog over? | `lib/spend-limit.ts` | 402, met bedrag, plafond en waar je het verhoogt |

Vraag 1 hangt sinds 27 augustus 2026 van de handeling af, en niet meer van de persoon
(`STAFF_ONLY_ACTIONS` in `lib/cost-rules.ts`). **Eén handeling blijft van de beheerder: de
reputatieanalyse.** Dat is geen stap in de maandelijkse ronde maar een los product dat een klant
apart koopt. De vijf andere doet de klant zelf: een merk laten onderzoeken, een cluster starten, de
meting bevestigen, content laten schrijven en een maand van het contentplan vrijgeven. Tot die dag
stonden alle zes op slot (besluit 18), en het gevolg in het scherm was erger dan de rekening: de
klant zag vier volle knoppen die pas ná de klik weigerden, waarvan er één als taak in zijn eigen
werklijst op de startpagina stond. De rem op de rekening is daarmee vraag 2 geworden, en die geldt
voor iedereen.

⚠️ Dit gaat alleen over betaald werk. Wie bij de **beheerschermen** mag (onboarding, diagnose,
toewijzen, alle merken, koppelingen) is een aparte vraag: die vijf schermen staan achter `isStaff`
met een `notFound()`, en de zijbalk toont het hele hoofdstuk Admin alleen aan staf (`lib/nav.ts`).

Vraag 2 zijn twee plafonds, €50 per account per maand en
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
| `profiles` | Klant/merk op accountniveau. Website, branche, aliassen, concurrenten, persona's, tone-of-voice, `business_model`. Eén keer onderzocht, hergebruikt door alle analyses. Sinds migratie `0045` ook `taboo_phrases` en `compliance_notes` (harde schrijfregels, deterministisch teruggecontroleerd door `checkTabooWords()` in `lib/pipeline/content-gate.ts`), `author_name`/`author_role`/`author_bio`/`author_linkedin_url`, en vier tone-of-voice-schuiven `tone_formality`/`tone_energy`/`tone_complexity`/`tone_humor` (1-3 of `null`, vertaald naar prompttaal door `lib/pipeline/tone-sliders.ts`, nooit het cijfer zelf naar het model). Sinds migratie `0060` ook de commerciële laag (`priority_offerings`, `deprioritised_offerings`, `growth_regions`, `target_segments`, `deal_value_band`, `seasonality`, `sales_objections`, `forbidden_topics`, `offline_proof`, `name_exclusions`, `respect_site_structure`, `goal_12m`) en de contactpersoon (`contact_name`/`contact_email`/`contact_phone`). Die vijftien zijn per definitie niet uit een website af te leiden en komen uit het gesprek met de klant; ze tellen daarom niet mee in `overallProgress()`, dat de 41 klantvelden meet. |
| `profile_field_sources` | Wie zette welk veld, met welke zekerheid en op welk bewijs (`0039`). Vier herkomsten sinds `0060`: `ai`, `klant`, `gesprek` en `consultant`. Alleen `ai` mag door een volgende onderzoeksronde overschreven worden (`lib/pipeline/field-merge.ts`). `not_applicable` (`0060`) zegt dat een veld bewust niet van toepassing is, en telt in de volledigheidsmeter als behandeld. |
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
| `fact_requests` | De briefingvragen aan de klant, max 8 per batch. `scope: 'merk'` slaat op met `analysis_id = null`. Ook de open punten uit de synthese staan hier, herkenbaar aan `raw_json.bron = 'synthese-gap'`; dat merkje bepaalt dat hun antwoord géén tweede regel in `profiles.proof_points` krijgt (het bereikt de schrijver al via `buildFactBase()`, en dan mét de juiste bron). |
| `content_pieces` | Gegenereerde pagina's. Versiebeheer per (analyse, titel) via `version`/`is_current`/`supersedes_id`, plus `briefing_snapshot_json`, `claims_json`, `source_coverage`, `quality_score`, `geo_score`, `needs_review`, `reviewed_at`/`reviewed_by`. `faq_json` is sinds de content-editie (§5, stap 16) ook door de klant bewerkbaar via de PATCH-route, niet alleen door het model. |
| `content_impact` | Hermeetgolven na publicatie + statistisch verdict. |
| `content_plans` / `plan_months` | Het contentplan (`0049`): één lopende versie per merk, twaalf maanden. `pages_per_month` is een KOPIE van het pakket, geen verwijzing: wie halverwege upgradet hoort niet met terugwerkende kracht een ander plan te krijgen. Een vorige versie gaat op `gestopt` en blijft staan (conventie 8). |
| `planned_pages` | Twee toestanden in één tabel (`0065`): met een `plan_month_id` staat de pagina ingepland, zonder staat hij in de **voorraad**. Inplannen verandert alleen de maand en de datum, dus de kaart houdt zijn status, zijn `content_piece_id` en zijn geschiedenis. `source` zegt waar hij vandaan komt (`aanbeveling` = een gemeten kans uit een rapport), `source_ref` (`"<rapport-id>#<volgnummer>"`) maakt het vullen idempotent, en `why`/`target_intent`/`existing_url`/`recommendation_action` dragen de briefing die anders opnieuw bedacht zou moeten worden. `potential` is de opgeslagen potentiescore, ververst bij elke synchronisatie. `scheduled_manual` (`0067`) zegt dat de gebruiker de publicatiedatum zelf koos, waardoor het herplannen van de maand hem laat staan. |
| `technical_audits` | Kunnen AI-crawlers de site bereiken (robots.txt vs GPTBot, CCBot, …). Geen AI. |
| `source_landscape` / `offsite_tasks` | Off-site aanwezigheid: welke externe domeinen relevant zijn en of het merk er staat. |
| `jobs` | De wachtrij. |
| `ai_calls` | Kostenlogboek: model, tokens, geschatte kosten, `kind`, analyse-/profiel-ID. Sinds `0062` ook `reputation_run_id`: zonder die kolom is niet te tellen wat één reputatieanalyse kostte, en dan is het plafond van €3 per run niet af te dwingen. |
| `reputation_runs` | Eén reputatieanalyse (`0062`). De drie getallen (`tone_index`, `evidence_score`, `consistency`), de plaats (`rank_score`, `rank_position`, `rank_of`, `rank_indicative`), tegen wie er vergeleken is (`rivals`, `wins_on`, `loses_on`), het gemeten volgorde-effect (`order_bias`), en `scope_json` met welke knopen en welke concurrenten meegingen. ⚠️ `tone_index` en `rank_score` zijn nullable met opzet: nul is neutraal en eerste van één is geen uitslag. `notes` legt vast wat er overgeslagen is; overslaan is een uitkomst, geen stilte. |
| `reputation_answers` | Eén gestelde vraag, met het ruwe antwoord én het oordeel erover, net als `tracking_runs` dat doet. Dat maakt een mislukte beoordeling opnieuw te proberen zónder de dure gegronde vraag opnieuw te stellen. `party_order` bewaart de volgorde waarin de partijen de vergelijkingsvraag in gingen; zonder die kolom is `order_bias` niet te berekenen. |
| `reputation_ranks` | Eén rij per partij per criterium per vergelijking. De enige tabel met een rij per partij, want dit is het enige onderdeel waarin de klant niet alleen op zichzelf beoordeeld wordt. ⚠️ `of_parties` staat per rij en niet per run: kende het model bij prijs-kwaliteit maar drie van de vier partijen, dan is een tweede plaats daar iets anders waard. |
| `reputation_offering_scores` | De uitkomst per aanbodknoop. `offering_name` staat naast `offering_id`, want een herhaalonderzoek kan de aanbodboom herschrijven en dan wijst het id nergens meer heen. |
| `reputation_sources` | Waar AI zijn beeld vandaan haalt: domein, soort, aantal citaties, en bij reviewplatforms het cijfer met `verified`. ⚠️ `verified` gaat alleen op `true` als de eigen crawler de pagina ophaalde en er JSON-LD met `aggregateRating` op stond; een cijfer uit een AI-antwoord is een gok tot het bewezen is. |
| `reputation_market` | Eén rij per bedrijf dat AI zélf noemde op de open kopersvraag, per aanbodknoop (`0063`). Betrouwbaarder dan de opgelegde concurrentieset, want een bedrijf dat het model niet kent noemt het gewoon niet, en dat is zelf de uitkomst. ⚠️ Dit is de tabel waarop het scherm sinds 26 augustus 2026 zijn hoofdstuk per product bouwt: staat de klant er niet tussen, dan zeggen de rijen wie ChatGPT in zijn plaats aanraadt. |
| `reputation_evidence` | Het gedeelde bewijscorpus (`0063`): letterlijke fragmenten met bron, waar de dienstvragen als achtergrond uit putten. Wordt niet op een klantscherm getoond. |

**De Sales-module (migraties `0068` tot en met `0073`).** Vijftien tabellen die de klantomgeving nergens raken. Ze staan
bewust apart in deze tabel: een klant mag nooit kunnen zien dat hij ooit als prospect in het systeem
heeft gestaan (zie §2).

| Tabel | Wat het is |
|---|---|
| `sales_users` | Wie bij de Sales-module mag, met `is_admin` voor wat geld kost. RLS aan, nul policies, net als `staff_users`: rijen komen er alleen via het Supabase-dashboard in. |
| `sales_markets` | Een onderzochte markt: branche plus plaats plus straal, met een `slug` die straks ook het publieke adres is. Permanent en herhaald gemeten; de meetrondes zelf komen in een latere migratie. Zes standen, met een check-constraint en geen enum, want de lijst groeit nog. |
| `sales_companies` | Een bedrijf, over markten heen, ontdubbeld op genormaliseerd domein. ⚠️ `domain` is nullable met een gedeeltelijke unieke index: een bedrijf zonder website is juist de prospect die deze module zoekt. ⚠️ `last_activity_at` en `anonymised_at` dragen de bewaartermijn van twaalf maanden; de rekenkunde staat puur in `lib/sales/retention.ts`. `do_not_contact` is absoluut en geldt over alle markten. |
| `sales_market_companies` | Hoort dit bedrijf in deze markt? Draagt de vindplaatsen (`evidence_urls`), de zekerheid en de herkomst in gewone taal. ⚠️ `included` heeft drie standen: `null` (nog niet beoordeeld), `true` en `false`. Zonder dat onderscheid is een niet-beoordeelde lijst niet te scheiden van een afgekeurde, en dan kan de goedkeuringspoort niet bestaan. |
| `sales_runs` | Eén meetronde van één markt (migratie `0071`). De markt is permanent, de ronde niet: zonder dat onderscheid overschrijft ronde twee ronde één en bestaat opportunitytype 8 (verlies) niet |
| `sales_questions` | De gestelde vragen, met per vraag de klantreisfase, de commerciële intentie en het bevroren gewicht. Zonder het intentielabel is de uitkomst een cijfer in plaats van een verkoopargument |
| `sales_answers` | Eén antwoord per vraag per engine, met de ruwe uitvoer, de aangehaalde bronnen en de genoemde bedrijven die in geen enkele bron zaten |
| `sales_mentions` | Eén rij per bedrijf per antwoord, ook voor de bedrijven die er niet in staan. De tabel waar elke score uit gerekend wordt |
| `sales_company_scores` | De rekensom daarover: per bedrijf per ronde per engine, plus een rij `alle` voor het gecombineerde beeld |
| `sales_opportunities` | De gekwalificeerde kans (migratie `0072`): welk van de acht types, hoe hoog de score, waarom, met welke haak en welk bewijs. Het PRODUCT van deze module, en geen ranglijst |
| `sales_evidence` | De vragen en antwoorden die één kans dragen. Een eigen tabel, zodat doorklikken een join is en geen zoektocht door jsonb |
| `sales_contacts` | De gevonden contactpersonen (migratie `0073`). Een afgeleid adres zonder menselijke bevestiging mag nooit een ontvanger zijn |
| `sales_outreach` | Wat er uitstaat en wat eruit kwam. ⚠️ `sent_at` betekent: de medewerker heeft gemeld dat hij hem zélf verstuurd heeft. De app verstuurt nooit een openingsmail |
| `sales_send_stats` | Per medewerker per dag: verstuurd, gestuiterd, geklaagd, afgemeld. Remt de AANVOER van concepten en beschermt zo het maildomein |
| `sales_events` | Het logboek: elke statuswijziging en toewijzing als eigen rij. De bron voor de trechter |
| `sales_suppressions` | Wie er nooit in een prospectlijst mag staan (migratie `0069`): een bestaande klant, een lopend traject, een concurrent van een klant, of een bedrijf dat zich heeft afgemeld. Bij elke ronde opnieuw geëvalueerd. ⚠️ De ENIGE plek waar de Sales-module naar `profiles` verwijst, en het verkeer gaat maar één kant op: Sales leest wie er klant is om die eruit te houden. |

Volledig ontwerp en de twee sprints die hierop volgen: [`tasks/geo-prospect-engine.md`](tasks/geo-prospect-engine.md).

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

### Het contentplan: een voorraad, geen jaarverdeling (25 augustus 2026, migratie `0065`)

Tot 25 augustus verdeelde `buildPlan()` het hele jaar vooruit: elk onderwerp × elke funnelfase,
uitgesmeerd over twaalf maanden. Bij Gasservice Brabant leverde dat 120 rijen op uit **28 unieke
titels**, dus elke titel stond er vier tot vijf keer in. En 103 van die 120 hingen aan een cluster
dat nooit gemeten is; schrijven leunt op de gemiste vragen uit een meting als briefing
(`lib/plan-writing.ts`), dus die konden nooit beginnen. De rekenkunde klopte, de aanname eronder
niet: dat er genoeg te schrijven vált zodra er onderwerpen zijn.

Nu vullen alleen **gemeten kansen** de voorraad. `syncBacklog()` (`lib/plan-backlog-data.ts`) leest
het laatste rapport per cluster en zet elke aanbeveling als kaart klaar, met de potentiescore die
`loadRecommendationPotential()` over precies de doelvragen van die aanbeveling uitrekent. Dat draait
bij elke opening van het planscherm, idempotent via `source_ref`, en verwijdert nooit iets: een
aanbeveling die uit een nieuw rapport verdwijnt blijft staan, want anders zou ingepland werk zonder
melding uit iemands plan vallen.

`createPlan()` maakt twaalf **lege** maanden en vult alleen maand 1, met de sterkste kansen tot aan
de quota. De rest van het jaar stelt de gebruiker zelf samen: `assignToMonth()` en `moveToBacklog()`
verplaatsen kaarten, en `resequenceMonth()` (`lib/plan-schedule.ts`) hangt er daarna kloppende
publicatiedata aan. De spreiding hangt af van het aantal pagina's in die maand en niet van de quota:
er is bewust **geen bovengrens** aan wat je in één maand zet, het scherm zegt alleen hoeveel je
boven je pakket zit.

⚠️ De kalendermaand komt sinds `0065` uit `content_plans.started_on` plus het maandnummer, niet meer
uit de vroegste publicatiedatum in die maand. Een lege maand had anders geen naam, en dat is precies
de maand waar iemand iets in wil slepen.

**De publicatiedatum is sinds 26 augustus zelf te zetten** (migratie `0067`, `setPageDate()` in
`lib/plans.ts`, actie `datum` op `/api/profiles/[id]/plan/pages/[pageId]`). `datumProbleem()`
(`lib/plan-schedule.ts`, puur en getest) bewaakt twee grenzen: de dag valt binnen de kalendermaand
van die planmaand, en hij ligt niet in het verleden. Diezelfde functie draait in de browser om de
knop uit te zetten en op de server om het verzoek te weigeren (conventie 1).

⚠️ De kolom `planned_pages.scheduled_manual` is wat die keuze laat overleven. `resequenceMonth()`
herberekent na élke wijziging in een maand alle data, dus zonder vlag is een zelfgekozen dag één
sleepbeweging later weer weg; met vlag krijgt hij dezelfde uitzondering als een geplaatste pagina.
`swapWithNeighbour()` volgt dezelfde regel: draagt één van de twee een eigen datum, dan wisselen
alleen de plekken. De vlag vervalt zodra de pagina naar een ándere maand of terug naar de voorraad
gaat, want een dag in oktober is geen dag in november. Alleen een pagina op `gepland` mag verzet
worden: zodra ORBIT ENGINE schrijft is de datum een lopende opdracht, en een geplaatste pagina houdt
zijn datum omdat die werkelijkheid is geworden.

## 4. De jobwachtrij

Bron: `lib/jobs/{types,queue,worker,handlers,pending}.ts`.

- **36 taaksoorten:** `profile_discover`, `profile_research`, `profile_offering`, `propose_topics`,
  `profile_market`, `profile_llm_baseline`, `profile_synthesis`, `prepare_analysis`,
  `generate_prompts`, `calibrate_volumes`, `measure_prompt`, `aggregate_week`,
  `profile_competitors`, `generate_report`, `content_brief`, `content_draft`, `content_revise`,
  `technical_audit`, `verify_publication`, `measure_impact`, `compute_impact`, `offsite_scan`,
  `gsc_sync`, `recalculate_potential`, `reputation_start`, `reputation_brand`,
  `reputation_offering`, `reputation_compare`, `reputation_sources`, `reputation_synthesis`,
  `reputation_market`, `reputation_evidence`, `sales_market_discover`, `sales_market_verify`,
  `sales_market_suppress`, `sales_company_enrich`, `sales_market_intents`,
  `sales_market_questions`, `sales_measure_question`, `sales_market_aggregate`,
  `sales_detect_opportunities`, `sales_opportunity_explain`, `sales_contact_find`,
  `sales_outreach_draft`.
  `profile_competitors` hangt tussen `aggregate_week` en `generate_report`: destilleert per
  concurrent de eigenschappen uit de antwoordfragmenten van die periode (`competitor-intel.ts`),
  een eigen taak omdat het een eigen AI-aanroep is (conventie 7), niet omdat het inhoudelijk apart
  van de aggregatie staat.
  `recalculate_potential` is profielbreed (geen `analysis_id`), getriggerd vanuit `generate_report`
  zodra een analyse haar eerste rapport krijgt: herberekent `search_volume_index` op ALLE
  onderwerpen van dat merk in één aanroep (`lib/pipeline/search-demand.ts`), zie
  `docs/tasks/potentiescore.md`.
- **De Sales-keten** (de twaalf `sales_*`-taken, migraties `0069` tot en met `0073`) hangt aan een MARKT en niet aan
  een merk. Daarvoor is `jobs.sales_market_id` de derde soort taakeigenaar naast `analysis_id` en
  `profile_id`; de constraint `jobs_has_owner` uit `0013` eist er nog steeds precies één van.
  ⚠️ **Maar één van de vier roept een model aan.** Ontdubbelen, uitsluiten en de crawl per bedrijf
  zijn gratis, en dat is ontwerp en geen toeval: wat meeschaalt met het aantal bedrijven moet
  kosteloos zijn, anders gaan mensen bedrijven wegsnijden en sneuvelen precies de onzichtbare
  bedrijven die de module zoekt (plan 21.1).
  ⚠️ **De keten stopt bij poort 1 en gaat niet vanzelf door.** `sales_market_suppress` plant niets
  in; alleen een mens die op goedkeuren drukt zet de crawltaken in gang. Dat is het verschil tussen
  een poort en een pauze, en het is de goedkoopste plek om een verkeerd afgebakende markt te
  stoppen (plan 8.1).
  Deze vier verschijnen nooit in "wat ORBIT ENGINE deze week deed": hun vertaling in
  `lib/activity.ts` is expliciet `null`, want ze gaan over bedrijven die geen klant zijn.
- **De reputatieketen** (de zes `reputation_*`-taken, migratie `0062`) is de enige keten die niet lineair is:
  `reputation_start` kiest de aanbodknopen en de concurrenten, legt die keuze vast in `scope_json`
  en plant alle andere taken tegelijk in. Elke afrondende taak telt daarna hoeveel reputatietaken
  er nog openstaan, en de laatste plant de synthese in (`scheduleSynthesisIfLast`, dezelfde
  constructie als `scheduleAggregateIfLastPrompt` en met dezelfde valkuil: de taak die het aanroept
  staat zélf nog op `running` en moet uitgesloten worden).
  ⚠️ De afteller telt TAKEN en geen antwoorden. Een taak kan legitiem nul antwoorden opleveren, de
  budgetpoort slaat hem over of de aanbodknoop is intussen verdwenen; zou de afteller op antwoorden
  tellen, dan komt hij in precies die gevallen nooit op nul uit en blijft de run open.
  ⚠️ De vergelijkingstaken krijgen een LATERE `scheduled_for` dan de reputatietaken. De wachtrij
  claimt op `scheduled_for asc`, dus dat is wat afdwingt dat een vol budget de vergelijking laat
  vallen en de basisanalyse overeind laat. Een klant met een toon en een bewijskracht maar zonder
  plaats heeft nog een product; andersom heeft hij een plaats zonder te weten waarom.
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
  na een tegenslag loopt, in plaats van alleen "ORBIT ENGINE probeert het automatisch opnieuw" zonder
  getal.

## 5. De pijplijn, stap voor stap

| # | Stap | AI | Kern |
|---|---|---|---|
| 1 | Profiel aanmaken |, | Eén scherm, drie velden: webadres, bedrijfsnaam, andere schrijfwijzen. De rest doet de pijplijn. |
| 2 | Ontdekken (fase 0) |, (luna als de site te groot is) | `discover.ts`: **alle** sitemaps volledig uitlezen (parallel, tot 10.000 URL's), daaruit tot 150 pagina's kiezen die over alle secties van de site verdeeld zijn (`url-priority.ts`), die crawlen, JSON-LD/OpenGraph oogsten, telefoon/adres/e-mail/KvK uit de lopende tekst van de canonieke pagina's (`text-facts.ts`), inventariskwaliteit beoordelen, renderbaarheid vaststellen, sjabloon herkennen (`template-detect.ts`: welk CMS, FAQ-accordions, citaatblokken, opgeslagen als facet `sjabloon`). **Nul AI-kosten**, behalve één aanroep van ~$0,01 (`crawl-focus.ts`) als de site méér pagina's heeft dan we mogen lezen: die kiest uit de echte sectielijst waar het aanbod staat. Een site die past raakt hem nooit. |
| 2a | Pagina's met de hand toevoegen |, | `manual-pages.ts` plus `POST/DELETE /api/profiles/[id]/pages`: de consultant plakt de adressen die er zeker bij horen. Ze krijgen `profile_pages.source = 'handmatig'` en overleven daarmee elke volgende crawlronde. Geen AI, geen kostenpoort. |
| 3 | Technische GEO-audit |, | `robots.txt` tegen bekende AI-crawlers, plus vier entiteitschecks (naamconsistentie, `sameAs`, schema-dekking, Wikidata). Staat de site dicht, dan blokkeert dit contentgeneratie. |
| 4 | Profielonderzoek | luna, web_search | Merk, branche, bedrijfsmodel, **bereik en werkgebied**, tone-of-voice, persona's, concurrenten, `proofPoints`, `styleSamples`. nu op alle gecrawlde pagina's in plaats van op de homepage. Klant-input is leidend (`prepare-profile.ts`), en wat een mens zette blijft staan (`field-merge.ts` tegen `profile_field_sources`). |
| 4a | Aanbodboom | luna | `offering.ts`: het aanbod als boom (`profile_offerings`), per bedrijfsmodel een andere briefing. Een knoop zonder gecrawlde bron-URL vervalt; het citaat bepaalt de zekerheid (`quote-check.ts`). ⚠️ Er passen ~35 van de 150 gelezen pagina's in het tekenbudget van 55.000; `page-select.ts` verdeelt die over de secties van de site in plaats van de langste te nemen. Wat er afvalt (pagina's, bewijsloze knopen, knopen boven `MAX_NODES`) komt in `gaps` terecht, uit code en niet uit zelfrapportage van het model. |
| 4b | Core topics | luna | `propose-topics.ts`: 5–8 onderwerpen uit de aanbodboom, elk met verwijzing naar de knopen waar ze uit volgen. Voorstel, geen meting, goedkeuring is een aparte handeling. |
| 4c | Markt | luna, web_search | `market.ts`: per concurrent wáárom die wint, plus het bronnenlandschap van de markt. |
| 4d | LLM-kennisbasislijn | luna, deels web_search | `llm-baseline.ts`: vijf blokken (`kent`, `klopt`, `citeert`, `verwarring`, `categorie`). `kent` stelt **zes** formuleringen en levert een verhouding, niet een ja of nee; `categorie` kiest zijn koopvragen via de topics en krijgt een eigen oordeel (word je genoemd, en wie wél). Alle oordelen worden in code geveld (`baseline-verdict.ts`), nooit door het model over zichzelf. |
| 4e | Synthese | **sol** (`SYNTHESIS_PREMIUM`) | `synthesis.ts`: dossier, gespreksagenda en `brand_facts`, alleen feiten waarvan het citaat letterlijk op de bronpagina staat. ⚠️ Sinds 24 augustus 2026 wordt de gespreksagenda ook wegschreven als merkbrede rijen in `fact_requests` (`gap-questions.ts`), zodat de klant ze op "Openstaande vragen" kan beantwoorden in plaats van alleen lezen. Idempotent via de unieke index op (`profile_id`, `question`). |
| 4f | **Onboardingsessie** |, | `/merk/[id]/admin/onboarding`, staf-only en het enige stafscherm dat gedeeld wordt. De consultant loopt het dossier mét de klant na, vult de commerciële laag in (migratie `0060`) en legt het gesprek vast. Opslaan gaat per veld, met bron `gesprek`. Nul AI-aanroepen: het scherm leest wat er ligt. |
| 4g | **Het onderzoek bijwerken** |, | `POST /api/profiles/[id]/refresh`, achter `mayTriggerCost` en het budgetplafond. `onboarding-refresh.ts` bepaalt per gewijzigd veld welke stappen opnieuw draaien: bereik of werkgebied → promptgeneratie plus kennistest, commerciële sturing → onderwerpen, concurrenten → markt. Tien van de vijftien velden leveren nul stappen op. Een stap die zo wordt ingepland krijgt `chain: false` en sleept zijn opvolger niet mee. |
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
| 14 | Rapport (B2) | luna | Verwoordt B1; leidt niets zelf af. Krijgt naast de meetuitkomst de **structurele gaten** mee (`structure-gap.ts`): welke onderdelen van het aanbod geen eigen pagina hebben. Dat is de enige invoer die niet reactief is. Een claimvalidator verwijdert achteraf elke merknaam die niet in het bewijsdossier van díe vraag staat. De vraagcodes (V1, V2) en hun gewichten mogen sinds 24 augustus 2026 alleen in `targets` staan en niet in de toelichting: het model schreef ze in de zin die de klant leest, en `lib/recommendation-text.ts` haalt ze er bij het tonen alsnog uit (conventie 1, prompt plus vangnet). |
| 15 | Contentbriefing | luna, temp 0 | Feitenkaart bouwen → claim-audit → max 8 vragen aan de klant. Eén slot is gereserveerd voor de positioneringsvraag. |
| 16 | Content schrijven | **sol** → luna-kritiek → sol herschrijven → luna-herbeoordeling | Uitsluitend binnen bevestigde feiten, met per bewering het feit dat hem dekt. Twee deterministische poorten: `checkContentGate()` (zeven GEO-checks, voedt `geo_score`) en `checkQuality()` (duplicatie + leesbaarheid, voedt alléén `needs_review`. Anders was de score van vorige maand onvergelijkbaar met die van vandaag). Schema.org volgt het bedrijfsmodel en draagt een organisatieknoop met `sameAs`. |
| 17 | Publiceren |, | Klant vult live-URL in; de app verifieert de pagina. |
| 18 | Effect meten | luna | Hermeetgolven + statistisch verdict of de zichtbaarheid meetbaar veranderd is. |
| 19 | Off-site | luna, gegrond | Op welke externe domeinen het merk wél/niet aanwezig is. |
| 20 | Maandelijkse ronde |, | Alleen voor analyses met tracking aan. Structureel merkloze vragen worden overgeslagen. |
| 21 | Reputatieanalyse | luna, gegrond → luna-oordeel → luna-synthese | **Los product, draait niet mee in de cyclus.** Ongeveer 50 vragen aan ChatGPT in de standaardmodus en ongeveer 75 in de diepe modus over hoe er over het merk gepraat wordt: merkbreed, per aanbodknoop, en naast de concurrenten uit de metingen. Elke vraag wordt eerst opgeslagen en dán beoordeeld, zodat een mislukte beoordeling opnieuw mag zonder de betaalde web-zoekactie te herhalen. De drie getallen en de plaats worden in code gerekend (`lib/reputation/`), niet door het model; de synthese krijgt ze als gegeven. Zes taaksoorten, een eigen budgetplafond van €3, en de vergelijking valt als eerste weg als dat plafond geraakt wordt. Alle vijf bouwsprints af en op drie echte runs geverifieerd, zie `docs/logbook.md`, 22 en 23 augustus 2026. |

### De rangordetabel (13 augustus 2026): alle merken op één schaal, geen AI-aanroep

Hoofdstuk 02 ("Waar je wint en mist") opende altijd met balkjes (`CompetitorCard`) die "Jij" vast
als eerste rij tonen, met het percentage van de hoofdscore (`score.score`, ÷ **winbare** vragen).
De concurrenten daaronder krijgen een ander percentage: genoemd ÷ **alle gemeten** vragen
(`measuredRunCount`). Dat is bewust zo (de balk van "Jij" moet hetzelfde getal tonen als de rest
van de pagina), maar het betekent dat twee schalen door elkaar liepen, onzichtbaar zolang je zelf
altijd bovenaan stond.

`lib/pipeline/brand-rankings.ts` (`buildBrandRankings()`) rekent daarom alle merken, inclusief het
eigen merk, over precies dezelfde noemer (`measuredRunCount`) en zet ze in één rangorde op aandeel
(share of voice). Geen nieuwe meting, geen AI-aanroep: alle onderliggende cijfers
(`avg_position`, `first_mention_count` per concurrent) liggen al sinds migratie `0029` in
`competitor_breakdown`, ze werden alleen nooit uit die tabel gehaald naar het scherm.
`BrandRankingsTable` (`score-panel.tsx`) toont dit bovenaan hoofdstuk 02, vóór de bestaande
balkjes, die blijven staan voor het "versnipperde markt"-verhaal dat een tabel niet vertelt.

`ownMentionCount()` (dezelfde module) leidt de kale telling af uit `score.score` en
`winnable_runs`; `lib/dashboard.ts` gebruikte hiervoor al een eigen inline versie en verwijst er nu
naar (één feit, één eigenaar).

**"Bron gebruikt" per concurrent (migratie `0058`, dezelfde dag).** Deze kolom stond bij de eerste
versie van de tabel nog vast op `n.v.t.` voor concurrenten: het eigen citatiepercentage kent het
echte domein (`profiles.url`), een concurrent heeft nergens een geregistreerd domein. Opgelost
zonder dat domein te hoeven opslaan: `citesOwnSite()` (`lib/entities/normalize.ts`) normaliseert het
geciteerde domein op dezelfde manier als `isSameEntity()` ("coolblue.nl" en "Coolblue" worden allebei
"coolblue") en telt een citatie mee zodra die overeenkomt met de merknaam. `measure.ts` vult
`competitor_breakdown.citation_count` voortaan bij elke nieuwe aggregatie.

Twee grenzen, allebei bewust: (1) een concurrent wiens domeinnaam niets met zijn merknaam te maken
heeft, wordt gemist. Dat is conventie 3 in de praktijk, een te lage telling is veiliger dan een
verzonnen citatie een concurrent toeschrijven. (2) bestaande periodes blijven op `null` staan tot ze
opnieuw gemeten worden, geen SQL-backfill (zie `supabase/README.md`, migratie 0058, voor waarom). De
tabel toont `null` als een streepje en een echte 0 als "0%": dat onderscheid ("nog niet berekend"
versus "berekend en nul") geldt sinds deze ronde ook voor "Aanbevolen" en voor het eigen merk zelf,
niet alleen voor concurrenten. **Nog niet geverifieerd tegen een echte nieuwe meting op productie**:
de ketentest dekt `measure.ts`'s aggregatiestap tot op vandaag niet (een bestaand gat, zie
`docs/logbook.md` bij de potentiescore-fase-1-alinea), dus deze stap is alleen op eenheidsniveau
getoetst (`citesOwnSite()`, `buildBrandRankings()`), niet end-to-end tegen een echte meting.

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

### Sjabloondetectie en sjabloongerichte export (13 augustus 2026)

Content komt eruit als platte Markdown/HTML, ongeacht of de klant een WordPress-site met een
FAQ-accordion heeft of een custom site zonder één uitklapblok. Twee nieuwe, pure modules dichten dat
gat zonder de schrijvende AI-aanroep zelf iets over opmaak te laten bedenken (conventie 1: de AI
levert de intentie, code levert de garantie):

- `lib/pipeline/template-detect.ts` (`detectPageTemplate()`, `aggregateTemplateProfile()`): draait
  tijdens stap 2 (Ontdekken) op de RUWE HTML van elke gecrawlde pagina, vóórdat die wordt weggegooid
  (`lib/crawler.ts`, `CrawledPage.template`). Herkent aan concrete asset-vingerafdrukken welk CMS de
  site waarschijnlijk gebruikt (WordPress, Shopify, Webflow, Wix, Squarespace, anders `onbekend`),
  of er al FAQ-accordions (`<details>` of bekende accordion-classnamen) of citaatblokken
  (`<blockquote>`/testimonial-classnamen) gebruikt worden, en hoe diep de koppenstructuur gaat. Nul
  AI-kosten, nul extra netwerkverkeer: dezelfde HTML die stap 2 toch al ophaalt. Opgeslagen als een
  nieuw `profile_facets`-facet `sjabloon`, los van het bestaande `techniek`-facet: dat gaat over
  vindbaarheid voor AI-crawlers, dit over de technische vorm van gegenereerde content.
- `lib/pipeline/content-export.ts` (`buildTemplateExport()`): leest dat facet terug op de
  contentdetailpagina en biedt, alleen als er ook echt iets te winnen is, een extra downloadknop aan
  naast de bestaande generieke export. Bij een herkende WordPress-site: de hele pagina als
  Gutenberg-blokken (`markdownToGutenbergBlocks()`, spiegelt de regelherkenning van
  `renderMarkdown()` in `lib/markdown.ts` één op één maar wikkelt elk element in
  `<!-- wp:... -->`-blokcommentaar), met de FAQ als "Aangepast HTML"-blok (bewust niet het
  `core/details`-blok, dat bestaat pas sinds WordPress 6.5). Zonder herkend CMS maar mét een
  FAQ-accordion op de site: alleen de FAQ in diezelfde `<details>`-vorm. Zonder enig signaal: `null`,
  geen knop, want een knop die niets toevoegt is ruis (conventie 3).

⚠️ **Bug gevonden tijdens het bouwen hiervan, in bestaande code.** `renderMarkdown()` escapet een
regel EERST (om ruwe HTML/scripts buiten te houden) en herkent de structuur DAARNA. De citaatregex
zocht nog naar het kale `>`, dat na het escapen al `&gt;` was geworden, en matchte daardoor nooit: elk
citaat dat het schrijvende model ooit met `> ` opmaakte, verscheen als kale tekst `&gt; ...` op de
pagina in plaats van als `<blockquote>`. Onopgemerkt omdat er geen test op stond en de tekst zelf
leesbaar bleef, alleen de opmaak ontbrak. Gerepareerd in dezelfde ronde, met een regressietest in
`scripts/test-unit.ts`.

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

### Bewust géén AI

De scheidslijn van dit product. Elke stap hieronder zou met een model kúnnen, en doet het bewust
niet. De regel eronder: een model vragen naar iets dat letterlijk in de HTML staat of exact te
berekenen is, is geld uitgeven aan een slechter antwoord.

| Stap | Waarom |
|---|---|
| Contentinventaris (`crawler.ts`) | robots.txt → sitemap (recursief, parallel, volledig uitgelezen) → links vanaf de homepage, twee niveaus diep. Deterministisch en gratis. |
| Welke pagina's we lezen bij een te grote site (`url-priority.ts`) | Score uit het pad plus een quotum per sectie. Bij gasservice-brabant.nl haalde dit alle 26 dienstenpagina's binnen waar de oude sitemapvolgorde er nul opleverde. |
| Welke pagina's de aanbod-aanroep in gaan (`page-select.ts`) | Zelfde score, verdeeld over de secties binnen het tekenbudget. |
| Technische GEO-audit (`audit/`) | robots.txt vergelijken met bekende AI-crawlers. Feitelijk, niet interpretatief. |
| Pagina-relevantie (`page-relevance.ts`) | Termmatching op het onderwerp. |
| Entiteitscontrole (`offsite/entity-presence.ts`) | Wikidata en Wikipedia hebben gratis open API's. Een model laten raden wat je exact kunt opzoeken is geld uitgeven aan een slechter antwoord. |
| Publicatiecontrole (`publish-check.ts`) | Pagina ophalen en tekst vergelijken. |
| Aggregatie en impact (`measure.ts` 3c, `impact-math.ts`) | Rekenkunde hoort in een pure, testbare module (conventie 2). |
| Periodeverschil (`period-change.ts`) | Het model verwoordt het verschil, het berekent het niet. Dat ging mis. |
| Fase 0 van de onboarding (`discover.ts`) | Crawl plus JSON-LD en OpenGraph oogsten, telefoon, adres en KvK uit de lopende tekst, inventariskwaliteit, renderbaarheid. Het adres staat letterlijk in de HTML. |
| Entiteitsconsistentie (`audit/entity-consistency.ts`) | Heet het bedrijf overal hetzelfde? Tekstvergelijking. |
| Het oordeel over de kennistest (`baseline-verdict.ts`) | Het model vragen of zijn eigen antwoord klopt is de meting aan de gemetene vragen. In dit project drie keer misgegaan. |
| Structurele gap-analyse (`structure-gap.ts`) | Aanbodboom tegen gecrawlde pagina's, met de matcher van `page-relevance.ts`. |
| Duplicatie en leesbaarheid (`similarity.ts`, `readability.ts`) | Jaccard op vijf-grammen en vier gemeten grootheden. Geen verzonnen score. |

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

**Nagerekend op productie (17 augustus 2026), en de schatting was te laag.** Hierboven stond
"ruwweg $0,40 per meetronde", afgeleid uit de gepubliceerde tarieven en met de kanttekening dat het
nog niet tegen `ai_calls` was nagerekend. Dat is nu gedaan, over de 13 meetrondes van minstens 40
aanroepen die op productie in `ai_calls` staan, alle met web_search aan:

| | Per meetronde |
|---|---|
| Gemiddeld | **$0,855** |
| Laagste | $0,495 |
| Hoogste | $1,562 |

De spreiding is groot omdat een ronde niet altijd evenveel vragen telt en web_search per vraag
verschilt in hoeveel pagina's het ophaalt. De verdeling binnen een ronde is nog schever dan gedacht:
**`measure_simulate` is 98,8% van de kosten, `measure_mention` 1,2%.** Er is dus precies één
kostenknop die telt, en dat is web_search bij het stellen van de vraag.

Dit is conventie 10 in de praktijk: de schatting stond er ruim een week met de eigen waarschuwing
erbij, en week bij narekenen ruim een factor twee af. Contentgeneratie (`gpt-5.6-sol`) blijft de
enige duurdere post per pagina en werd ~5× duurder: Sol is 2,5×/3,75× het tarief van gpt-4.1 en de
redeneertokens tellen als output.

### De AI-aanroepen van Mijn reputatie (22 augustus 2026, migratie `0062`)

Vijf nieuwe soorten aanroepen, allemaal op `MODELS.volume` behalve de synthese. De `kind`-waarden
in `ai_calls` beginnen alle met `reputation_`, en ze dragen sinds `0062` ook `reputation_run_id`,
zodat een run per stuk af te rekenen is.

| `kind` | Model | Zoeken | Werk | Wat het doet |
|---|---|---|---|---|
| `reputation_merk` · `reputation_aanbod` · `reputation_vergelijking` · `reputation_bron` | `quality` | ja, behalve de eerste merkvraag | `simulation` | De vraag stellen, zoals een echte gebruiker hem zou stellen. Geen temperatuur en geen redeneerinstelling meegeven, dezelfde keuze als bij halte 3a. |
| `reputation_verdict` | `volume` | nee | `deterministic` | Het antwoord omzetten in een toon, plus- en minpunten, een grondslag en citaten. |
| `reputation_compare_verdict` | `volume` | nee | `deterministic` | Het vergelijkingsantwoord omzetten in plaatsen per criterium per partij. |
| `reputation_ratings` | `volume` | nee | `deterministic` | De reviewcijfers uit het bronantwoord lezen. Kandidaten, geen feiten. |
| `reputation_source_kinds` | `volume` | nee | `deterministic` | Alle gevonden domeinen indelen. Eén aanroep voor de hele lijst, zoals `offsite/presence.ts`. |
| `reputation_synthesis` | `quality` | nee | `analytical` | De uitleg schrijven. ⚠️ De cijfers staan dan al vast en gaan als gegeven de prompt in. |

**Nagerekend op productie (23 augustus 2026), twee runs.** De eerste op Van den Udenhout in de
oorspronkelijke opzet, de tweede op Gasservice Brabant na de herziening:

| | Geschat | v1, Van den Udenhout | v2, Gasservice Brabant |
|---|---|---|---|
| Aanroepen | 68 | 66 | 51 gepland |
| Kosten | $0,54 | $0,75 | **$0,48** |
| Doorlooptijd | 6 tot 9 minuten | 31,6 minuten | **9 minuten** |

⚠️ De sprong in doorlooptijd komt volledig uit de wachtrij: `IO_BOUND_HEAVY_TYPES` laat
netwerkgebonden zwaar werk met drie tegelijk draaien, waar `HEAVY_JOB_RESERVE_MS` er eerder één per
minuut van maakte. Die reservering blijft onaangetast voor contentgeneratie, dat één lange aanroep
is en niet een handvol korte.

Het aantal aanroepen klopte vrijwel precies; de prijs per gegronde vraag niet ($0,021 tot $0,023 in
plaats van $0,015). Oorzaak: web-zoeken haalt pagina's op die als invoer meetellen, precies het
risico dat het plan zelf benoemde. De beoordelingen kwamen wél op $0,001 uit. Ruim binnen het
plafond van €3 per run (`lib/reputation/budget.ts`), dat niet als doel maar als rem bestaat.

⚠️ **De doorlooptijd is drie keer de schatting, en dat is architectonisch.** De wachtrij doet exact
één zware taak per minuut: `HEAVY_JOB_RESERVE_MS` houdt 220 van de 240 seconden vrij voordat een
zware taak begint, en de cron vuurt één keer per minuut. De aanname "met de knopen parallel" gaat
dus niet op. De schermteksten noemen een halfuur.

Wat die run verder opleverde, waaronder zeven fouten die geen enkele test had gevangen, staat in
`docs/logbook.md` bij 23 augustus 2026.

**Bewust géén AI, in dit onderdeel:** de keuze van de aanbodknopen en de concurrenten
(`lib/reputation/select-nodes.ts` en `select-rivals.ts`), alle rekenkunde (`score.ts`, `rank.ts`,
`order-bias.ts`), het tellen van de aangehaalde domeinen, en de controle van de reviewcijfers via
de eigen crawler plus de JSON-LD-oogst. Dat laatste is het verschil tussen een cijfer dat als
bevestigd op het scherm staat en een cijfer dat als onbevestigd op het scherm staat.

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
| Schrijfronde contentplan **en zoekdata** | `/api/cron/plan` | dagelijks 04:00 UTC | **Supabase pg_cron** (migratie `0050`, taak `orbit-engine-plan-writer`, hernoemd van `aura-plan-writer` in migratie `0059`) |

**De schrijfronde in één alinea.** Pagina's van een GOEDGEKEURDE maand die binnen tien dagen
gepubliceerd moeten worden, krijgen een schrijftaak; de route plant alleen, de werker schrijft.
⚠️ `plan_months.status = 'goedgekeurd'` heet in het scherm sinds 24 augustus 2026 **vrijgegeven**:
een maand vrijgeven en een geschreven tekst goedkeuren zijn twee verschillende handelingen, en die
deelden hiervoor één woord (`docs/ux-design.md` §5). De databasewaarde is niet mee hernoemd, want
een statuswaarde omdopen raakt migraties, cron en tests voor alleen een etiket.
De briefing komt sinds `0065` uit de kans zelf als die er is: bij handeling `verbeteren` gaat de
bestaande URL mee de schrijfstap in, zodat er een pagina wordt aangevuld in plaats van een tweede
pagina naast de eerste gezet. Hiervoor stond er onvoorwaardelijk `action: "nieuw"`, en dat zou bij
Gasservice Brabant vier van de zeven kansen verkeerd hebben uitgevoerd.
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
zegt het scherm dat. ORBIT ENGINE vraagt alleen leesrecht, dus de klant voegt het adres toe met het recht
"Beperkt".

### Tijdbudgetten, waarom deze getallen bij elkaar horen

**Opnieuw doorgerekend, 26 augustus 2026 (doorloop-huyberts.md punt 5).** Het tweede geschreven
artikel van de testklant Huyberts Keukens (1034 woorden) had drie mislukte pogingen nodig vóór de
vierde binnen het toenmalige budget van 105 s paste, telkens afgebroken met "Request was
aborted" ná de betaalde aanroep op het duurste model. Nagemeten op 26 echte, al betaalde
schrijf- en herschrijfaanroepen op productie (verschillende klanten, 197 tot 1034 woorden): de
duur hangt NIET netjes samen met het aantal woorden (197 woorden in 13 s, maar ook 570 woorden in
89-91 s), de traagste geslaagde poging duurde 98,8 s. Dat wijst op de redeneertijd van het model
als bepalende factor, niet de tekstlengte.

De werkerroute krijgt van Vercel **300 seconden** (`maxDuration`), een harde platformgrens die niet
te verhogen is. Alles eronder is daarvan afgeleid en moet daar samen in passen; klopt de som niet,
dan kapt het platform de functie af en blijven geclaimde taken vijf minuten op 'running' staan tot
de reaper ze terugzet (precies wat er op 1 augustus 2026 gebeurde).

| Grens | Waarde | Waar |
|---|---|---|
| Routelimiet | 300 s | `maxDuration`, `app/api/cron/worker/route.ts` |
| Tijdbudget werker | 240 s (instelbaar) | `workerTimeBudgetMs`, `lib/config.ts` |
| Reservering zware taak | 200 s | `HEAVY_JOB_RESERVE_MS`, `lib/jobs/worker.ts` |
| Reservering lichte taak | 160 s | `LIGHT_JOB_RESERVE_MS`, idem, gecontroleerd vóór élke claimronde |
| Totaalbudget één AI-aanroep | 150 s | `CALL_BUDGET_MS` → `callBudget()`, `lib/openai/client.ts` |
| Timeout per poging | 145 s | `TIMEOUT_MS`, idem |

Het totaalbudget is een `AbortSignal` die over ALLE pogingen heen geldt. Zonder dat was de echte
bovengrens van één aanroep 4 × 145 s ≈ 580 s (`maxRetries = 3` herhaalt ook timeouts), en dan klopt
geen enkele reservering hierboven meer.

**Wat er precies is veranderd, en waarom de reservering van de zware taak juist DAALDE terwijl het
aanroepbudget steeg.** De reservering voor een zware taak stond op 2 × `CALL_BUDGET_MS`: een
verdubbeling van het VOLLE aanroepbudget, ook voor de kritiekaanroep die op het schrijven volgt
(`content_critique`, het goedkope model, in de praktijk enkele seconden, zie `ai_calls.kind =
'content_critique'`). Die verdubbeling liet geen ruimte over toen het aanroepbudget omhoog moest:
2 × 150 s = 300 s is al de hele routelimiet. De reservering is daarom herzien naar wat de twee
aanroepen van één zware taak (`draftContentPiece()`/`reviseContentPiece()`, schrijven + redactie,
`lib/pipeline/content.ts`) daadwerkelijk nodig hebben: het volle, nagemeten budget voor de trage
schrijfaanroep (150 s) plus een ruime maar realistische marge voor de snelle kritiekaanroep (30 s)
plus marge om de uitkomst weg te schrijven (20 s) = 200 s. Dat is 20 s MINDER dan voorheen, ook al
kreeg de trage aanroep zelf 45 s meer lucht: de eerdere reservering was voor de verkeerde aanroep
gebouwd. `HEAVY_JOB_RESERVE_MS` en `LIGHT_JOB_RESERVE_MS` zijn in code van `CALL_BUDGET_MS`
afgeleid (niet los overgetypt), zodat ze niet stil uit elkaar kunnen drijven zoals hier gebeurde.

De routelimiet (300 s) en het tijdbudget van de werker (240 s), met de marge van 60 s daartussen
tegen de reaper, zijn dit keer ONGEWIJZIGD: de hele verhoging paste binnen de bestaande marge.
Verhoog je één van de getallen in de tabel hierboven verder, reken dan de hele rij opnieuw door.
`scripts/test-unit.ts` ("de tijdgrenzen passen nog in elkaar") leest de broncode van alle vier de
bestanden en bewaakt dat de som nog klopt.

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
| 3 | Het demogesprek → **Admin → Onboarding** | De sessiepagina: open punten eerst, dan de commerciële laag, dan het gevonden dossier ter controle. Opslaan gaat per veld. Sluit af met het gesprek vastleggen en, als er iets gewijzigd is dat ertoe doet, het onderzoek bijwerken. |
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

`0001` t/m `0067`, alle toegepast op productie behalve `0033` (gereserveerd voor R6.2, nooit
gedraaid, de reservering verviel toen `0039` de inventariskwaliteit fase 0 van de nieuwe
onboarding maakte; een gereserveerd nummer dat nooit draaide blokkeert niets).

**Index per migratie en de regels voor het schrijven ervan: [`../supabase/README.md`](../supabase/README.md).**
Dat is de enige plek waar die regels staan; herhaal ze hier niet.
