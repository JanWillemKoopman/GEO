# Modulekaart

De hiërarchische opsplitsing van ORBIT ENGINE in dertien domeinen, bedoeld als startpunt voor een
technische deep dive met het engineeringteam.

> **Geverifieerd tegen de code op 20 augustus 2026** (branch `claude/architecture-analysis-breakdown-gq1q8y`,
> t/m migratie `0060`). Alle tellingen in dit document komen uit een commando op de werkboom van die
> dag, niet uit een ander document. `npx tsc --noEmit` schoon, `npm run test:unit` 1744 geslaagd,
> `npm run test:chain` 202 geslaagd, alle drie gedraaid op die peildatum.

## Wat dit document is, en wat het niet is

`docs/architecture.md` beschrijft **hoe het werkt**: dataflow, datamodel, de pijplijn stap voor stap,
de modellen, de kosten. Dat blijft de enige technische waarheid en die feiten staan hier niet nog een
keer.

Deze kaart beantwoordt een andere vraag: **waar zit wat, hoe groot is het, en waar raakt het de rest**.
Per onderdeel staan er drie dingen: de verantwoordelijkheid, de bestanden, en de afhankelijkheden naar
andere domeinen. Elk sub-onderdeel sluit af met de vraag die het waard is om in de deep dive te stellen.

Voor het *waarom* achter een keuze: `docs/logbook.md`. Voor de UI-regels: `docs/ux-design.md` en
`docs/designsystem.md`. Voor wat er nog gebouwd moet worden: `docs/tasks/ontwikkelplan-visie.md`.

## Hoe je de kaart leest

Drie niveaus:

1. **Domein** (kop `##`): een logisch afgebakend deel van de app met een eigen vraag die het beantwoordt.
2. **Sub-onderdeel** (kop `###`): een service, een pijplijnstap of een schermgroep binnen dat domein.
3. **Technische uitwerking** (bullets): rol, bestanden, afhankelijkheden, discussiepunt.

De complexiteitskolom in de tabellen is een oordeel op drie assen samen: omvang in regels, aantal
inkomende afhankelijkheden, en hoe duur een fout is. **Hoog** betekent niet slecht gebouwd, het betekent
dat een wijziging daar niet in je eentje op een vrijdagmiddag hoort te gebeuren.

⚠️ **De statuskolom beschrijft wat er draait, nooit wat er nog moet komen.** "Live sinds 0047" betekent:
dit onderdeel staat op productie en migratie `0047` is de migratie die het bracht. Elke migratie tot en
met `0060` is toegepast, met als enige uitzondering `0033`, die gereserveerd bleef en nooit gedraaid is.
Openstaand werk staat niet in dit document maar in `docs/tasks/`.

## De kaart in één oogopslag

| # | Domein | Kernvraag | Omvang | Complexiteit |
|---|---|---|---|---|
| 1 | Platform en applicatieschil | Waar draait het en hoe komt een verzoek binnen? | ~2.200 regels | Middel |
| 2 | Identiteit, accounts en autorisatie | Wie mag wat zien en wijzigen? | ~1.800 regels | **Hoog** |
| 3 | Merkprofiel en onboarding | Wie is deze klant, volgens de site en volgens het gesprek? | ~8.700 regels | **Hoog** |
| 4 | Job-orchestratie en cron | Wanneer draait welk werk, en wat als het misgaat? | ~2.400 regels | **Hoog** |
| 5 | AI-laag | Hoe praten we met een model, en wat kost dat? | ~2.300 regels | Middel |
| 6 | Meetmachine | Hoe zichtbaar is dit merk in AI-antwoorden? | ~4.700 regels | **Hoog** |
| 7 | Rapportage en inzichten | Wat betekenen de cijfers, en wat is de volgende stap? | ~4.100 regels | Middel |
| 8 | Content-engine | Hoe schrijft ORBIT ENGINE een pagina die klopt? | ~7.100 regels | **Hoog** |
| 9 | Contentplan en planautomatisering | Wat wordt er de komende twaalf maanden gemaakt? | ~1.600 regels | Middel |
| 10 | Externe data en audits | Wat zegt de buitenwereld over dit merk? | ~3.400 regels | Laag |
| 11 | Kostenbeheersing en governance | Wie mag geld uitgeven, en hoeveel is er nog? | ~950 regels | **Hoog** |
| 12 | UI-laag en werkruimte | Hoe ziet de klant dit alles? | ~20.900 regels | Middel |
| 13 | Datalaag en kwaliteitsborging | Hoe blijft het schema en het gedrag houdbaar? | ~18.300 regels | Middel |

Telcijfers voor de context: 50 API-routes, 34 pagina's, 46 gedeelde componenten, 83 pijplijnmodules,
62 losse modules in `lib/`, 17 Zod-contracten, 24 taaksoorten in de wachtrij, 59 migratiebestanden en
39 tabellen in het publieke schema van productie.

---

## 1. Platform en applicatieschil

Alles wat er staat voordat er ook maar één merk in beeld komt: het Next.js-frame, de Supabase-clients,
de sessie, de navigatie en de vertaling van rauwe waarden naar leesbare tekst.

### 1.1 Next.js-frame en routegroepen

- **Rol.** App Router, RSC-first. Drie routegroepen die elk een ander toegangsregime hebben:
  `app/(app)` (ingelogd), `app/(auth)` (uitgelogd) en `app/api` (server).
- **Code.** `app/layout.tsx`, `app/page.tsx` (de router na inloggen: naar het overzicht van het actieve
  merk, anders naar de merkenlijst), `app/(app)/layout.tsx`, `next.config.ts`, `vercel.json`.
- **Afhankelijk van.** Domein 2 voor de sessie, domein 12 voor de schil eromheen.
- **Deep-dive vraag.** `app/page.tsx` beslist waar iemand landt op basis van het actieve merk. Wat is
  het gedrag als het opgeslagen merk inmiddels gearchiveerd of toegewezen is aan een ander account?

### 1.2 Supabase-clients, drie soorten

- **Rol.** Lezen gaat met de sessie van de gebruiker (RLS geldt), schrijven met de service-role key
  (RLS omzeild, ownership expliciet gecontroleerd).
- **Code.** `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (RSC), `lib/supabase/admin.ts`
  (service-role, server-only), `lib/supabase/middleware.ts` plus `middleware.ts` in de root voor het
  verversen van de sessiecookie.
- **Afhankelijk van.** `lib/env.ts` voor de sleutels. Elk ander domein hangt hier weer aan.
- **Deep-dive vraag.** De admin-client is de sleutel tot alles: 45 van de 50 API-routes importeren hem,
  44 importeren `lib/auth.ts`. Is er een controle die afdwingt dat elke admin-client-aanroep langs een
  ownership-check gaat, of is dat afspraak plus reviewdiscipline?

### 1.3 Omgeving en schakelaars

- **Rol.** Eén gevalideerde toegang tot alle omgevingsvariabelen, met de server-only geheimen lazy
  gelezen zodat een import in een clientcomponent niet meteen omvalt. Daarnaast de feature-flags.
- **Code.** `lib/env.ts`, `lib/config.ts`, `.env.example`, `app/api/health/route.ts`.
- **Afhankelijk van.** Niets. Alles hangt hieraan.
- **Deep-dive vraag.** De vlaggen staan verspreid over `lib/config.ts` en directe `process.env`-lezingen
  in de enginelaag (`GEMINI_API_KEY`) en de Search Console-koppeling (`GOOGLE_SERVICE_ACCOUNT_JSON`).
  Hoort dat op één plek, of is de huidige spreiding bewust?

### 1.4 Navigatie, werkruimte en oude adressen

- **Rol.** De vijf klanthoofdstukken plus de afgeschermde stafgroep, één bron voor zijbalk en menu's.
  De werkruimte houdt bij welk merk je aankijkt. `redirects.ts` houdt oude merkadressen werkend.
- **Code.** `lib/nav.ts`, `lib/workspace.ts`, `app/(app)/workspace-actions.ts`, `lib/redirects.ts`,
  `lib/origin.ts` (waar wijst de terugknop heen).
- **Afhankelijk van.** Domein 2 (staf ziet meer koppen), domein 12 (de zijbalk rendert dit).
- **Deep-dive vraag.** Een hoofdstuk verschijnt pas als zijn bestemmingen bestaan. Wie bepaalt of een
  bestemming bestaat: een statusveld of een query? Wat kost die controle per paginalading?

### 1.5 Presentatiehulpen

- **Rol.** Getallen, datums, relatieve tijd, foutteksten, Markdown-rendering, URL-normalisatie en
  Postgres-veilige tekst.
- **Code.** `lib/format.ts`, `lib/errors.ts`, `lib/markdown.ts`, `lib/url.ts`, `lib/pg-text.ts`,
  `lib/highlight.ts`.
- **Afhankelijk van.** Niets, en dat is bewust: allemaal pure modules zonder `server-only`.
- **Deep-dive vraag.** `lib/markdown.ts` escapet eerst en herkent daarna structuur. Dat leverde eerder
  een stille bug op met citaatblokken. Welke andere regels in die renderer lezen nog naar een teken dat
  op dat moment al geëscaped is?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| Next.js-frame en routegroepen | ~200 | Stabiel | Laag |
| Supabase-clients | ~250 | Stabiel | **Hoog**, single point of failure |
| Omgeving en schakelaars | ~300 | Stabiel | Laag |
| Navigatie en werkruimte | ~450 | Herzien 17 aug 2026 | Middel |
| Presentatiehulpen | ~1.000 | Stabiel | Laag |

---

## 2. Identiteit, accounts en autorisatie

Het domein waar een fout het duurst is. Drie lagen boven elkaar: de gebruiker, het account (een bureau
kan meerdere merken hebben), en de staf die alles ziet.

### 2.1 Sessie en inloggen

- **Rol.** Registreren, inloggen, wachtwoord vergeten en wachtwoord zetten, alles via server actions.
- **Code.** `app/(auth)/login`, `app/(auth)/register`, `app/(auth)/wachtwoord`,
  `app/(auth)/wachtwoord-vergeten`, `app/auth/wachtwoord`, `lib/auth.ts` (`requireUser`, `getUser`).
- **Afhankelijk van.** Domein 1 (Supabase-clients, middleware).
- **Deep-dive vraag.** Registratie staat dicht via twee lagen: `SIGNUPS_ENABLED` in de app en de harde
  poort in Supabase zelf. Weet het team welke van de twee er als eerste omvalt als er een self-serve
  moment komt?

### 2.2 Accounts en de rolmatrix

- **Rol.** De laag boven het merk. Een account heeft leden met een rol (`admin`, `member`), een
  budgetplafond en een optionele waarde per vermelding.
- **Code.** `lib/accounts.ts`, `lib/account-editable.ts` (welke velden een klant zelf mag wijzigen),
  `lib/account-status.ts`, `lib/account-security.ts`, `app/api/accounts/[id]/route.ts`,
  `app/api/account/security/route.ts`, migraties `0046` en `0056`.
- **Afhankelijk van.** Domein 11 (het budget hangt aan het account), domein 3 (`profiles.account_id`).
- **Deep-dive vraag.** `account-editable.ts` is een handmatige lijst van wijzigbare velden. Wat gebeurt
  er met een nieuw accountveld dat iemand vergeet toe te voegen: is het dan dicht of open?

### 2.3 Uitnodigingen

- **Rol.** De enige deur naar binnen zolang registratie dichtstaat. De tabel bewaart alleen de SHA-256
  van het token, nooit het token zelf.
- **Code.** `lib/invites.ts`, `lib/invite-rules.ts` (puur, draait ook in de browser voor de live
  wachtwoordcontrole), `app/api/accounts/[id]/invites/`, `app/api/invites/accept/route.ts`,
  `app/(auth)/uitnodiging/[token]`, migratie `0047` (nul RLS-policies).
- **Afhankelijk van.** Domein 2.2, domein 1 (mail staat standaard uit, zie domein 13).
- **Deep-dive vraag.** Vier eindtoestanden van een uitnodiging staan puur in `invite-rules.ts`. Is de
  verlooptijd een productbeslissing die ergens vastligt, of een constante in code?

### 2.4 Rechten: RLS plus expliciete ownership

- **Rol.** Lezen gaat via select-only RLS op `user_id`. Schrijven gaat altijd via een route met een
  expliciete controle. Reden: RLS werkt op rijniveau en kan nooit afdwingen wélke kolom een klant mag
  wijzigen.
- **Code.** `lib/access.ts` (`getOwnedAnalysis`, `getOwnedProfile`), `lib/profiles.ts`,
  `lib/analyses.ts`, migraties `0038`, `0042`, `0046` en `0056` voor de policy-lagen.
- **Afhankelijk van.** Elk schrijfpad in de app. 44 van de 50 API-routes importeren `lib/auth.ts`.
- **Deep-dive vraag.** De drielaagse leesregel (eigen rij, accountlid, staf) staat in SQL, en de
  schrijfregel in TypeScript. Bij welke tabel lopen die twee inmiddels uit de pas, en hoe zouden we dat
  merken zonder het handmatig na te lopen?

### 2.5 Staf, CSM-paneel en verwijderen

- **Rol.** `staff_users` bepaalt wie alles ziet. Het CSM-paneel laat zien waar we achterlopen per merk.
  Verwijderen is definitief en staat los van archiveren.
- **Code.** `lib/staff.ts`, `lib/csm.ts` (rekenkant, puur) en `lib/csm-data.ts` (queries),
  `app/(app)/beheer/`, `lib/deletion.ts` en `lib/deletion-rules.ts`.
- **Afhankelijk van.** Domein 12 (het paneel is een scherm), domein 11 (archief).
- **Deep-dive vraag.** Verwijderen raakt 39 tabellen. Hangt dat aan cascades in het schema of aan een
  lijst in `deletion.ts`, en wat gebeurt er met een tabel die na deze ronde bijkomt?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| Sessie en inloggen | ~670 | Stabiel | Middel |
| Accounts en rolmatrix | ~500 | Live sinds 0046 en 0056 | **Hoog** |
| Uitnodigingen | ~400 | Live sinds 0047 | Middel |
| Rechten: RLS plus ownership | ~450 | Aangescherpt in 0042 | **Hoog**, hier zat al een fout |
| Staf, CSM en verwijderen | ~450 | Fase 8 | Middel |

---

## 3. Merkprofiel en onboarding

Het grootste domein en het meest recent verbouwd (onboarding 3.0, migratie `0060`). Zes geketende
stappen die van een webadres een merkdossier maken, plus het gesprek dat de consultant erbovenop legt.

### 3.1 Fase 0: ontdekken zonder AI

- **Rol.** Tot 150 pagina's crawlen, JSON-LD en OpenGraph oogsten, telefoon, adres, e-mail en KvK uit
  de lopende tekst halen, de inventariskwaliteit beoordelen, en het sjabloon herkennen. Nul AI-kosten.
- **Code.** `lib/pipeline/discover.ts`, `lib/crawler.ts`, `lib/pipeline/text-facts.ts`,
  `lib/pipeline/inventory-quality.ts`, `lib/pipeline/template-detect.ts`, tabel `profile_pages`.
- **Afhankelijk van.** Domein 10 (de crawler), domein 4 (taaksoort `profile_discover`, zwaar in tijd
  en niet in geld).
- **Deep-dive vraag.** Alle latere stappen leunen op deze inventaris. Wat is het gedrag bij een site
  die volledig client-side rendert: valt de keten dan door met een lege basis, of stopt hij?

### 3.2 Fase 1 tot 3: het onderzoek

- **Rol.** Vier AI-stappen die elkaar ketenen: profielonderzoek (merk, branche, bereik, tone-of-voice,
  concurrenten), de aanbodboom, de core topics, en het marktonderzoek.
- **Code.** `lib/pipeline/prepare-profile.ts`, `lib/pipeline/offering.ts`,
  `lib/pipeline/propose-topics.ts`, `lib/pipeline/market.ts`, `lib/pipeline/quote-check.ts` (een knoop
  zonder gecrawld citaat vervalt), `lib/pipeline/field-merge.ts` (wat een mens zette blijft staan).
- **Afhankelijk van.** Domein 5 (het model), domein 4 (de keten), domein 10 (web_search).
- **Deep-dive vraag.** `chain.ts` haalde de opvolgerelatie uit de handlers omdat een mislukte
  aanbodstap de halve keten stil liet verdwijnen. Welke andere stap draagt nog een opvolger die niet in
  `ONBOARDING_NEXT` staat?

### 3.3 Fase 3b: de kennistest

- **Rol.** Wat weten AI-assistenten al over dit merk, en klopt dat? Vijf blokken (`kent`, `klopt`,
  `citeert`, `verwarring`, `categorie`). Het oordeel wordt in code geveld, nooit door het model over
  zichzelf.
- **Code.** `lib/pipeline/llm-baseline.ts`, `lib/pipeline/baseline-verdict.ts` (597 regels puur
  rekenwerk), tabel `profile_llm_baseline`, migratie `0041`.
- **Afhankelijk van.** Domein 5 (de enginelaag: dit draait per beschikbare engine).
- **Deep-dive vraag.** Het model vragen of zijn eigen antwoord klopt ging in dit project drie keer mis.
  Waar in de rest van de codebase zit dat patroon nog wel?

### 3.4 Fase 5: synthese en dossier

- **Rol.** Alles samenbrengen tot een leesbaar dossier, een gespreksagenda en citeerbare `brand_facts`.
  De enige onboardingstap op het dure model.
- **Code.** `lib/pipeline/synthesis.ts`, `lib/pipeline/dossier.ts`, `lib/pipeline/dossier-verify.ts`,
  `lib/pipeline/factstore.ts`, `app/api/profiles/[id]/dossier/route.ts`.
- **Afhankelijk van.** Domein 8 (de feitenbank is dezelfde die content voedt).
- **Deep-dive vraag.** Alleen feiten waarvan het citaat letterlijk op de bronpagina staat komen erdoor.
  Hoeveel valt daarop af, en zien we dat cijfer ergens terug?

### 3.5 De onboardingsessie en het bijwerken

- **Rol.** Het enige stafscherm dat met de klant gedeeld wordt. De consultant vult de commerciële laag
  in (vijftien velden die per definitie niet uit een website volgen) en legt het gesprek vast. Daarna
  bepaalt `onboarding-refresh.ts` welke stappen opnieuw moeten draaien.
- **Code.** `app/(app)/merk/[id]/admin/onboarding/`, `app/(app)/merk/[id]/_components/onboarding-session.tsx`,
  `lib/pipeline/onboarding-refresh.ts`, `lib/pipeline/commercial-context.ts`,
  `lib/pipeline/intake-block.ts`, `lib/profile-source.ts`, `app/api/profiles/[id]/refresh/route.ts`.
- **Afhankelijk van.** Domein 11 (deze route kost geld), domein 4 (`chain: false` betekent: draai deze
  stap zonder de opvolgers).
- **Deep-dive vraag.** Tien van de vijftien commerciële velden leveren nul vervolgstappen op. Is die
  mapping getest tegen wat de stappen daadwerkelijk lezen, of tegen wat we dachten dat ze lezen?

### 3.6 Het dossier als scherm, en de volledigheid

- **Rol.** De klant leest en corrigeert wat ORBIT ENGINE vond, per veld met herkomst en zekerheid.
  De volledigheidsmeter telt de 41 klantvelden, niet de commerciële laag.
- **Code.** `app/(app)/merk/[id]/merkprofiel/`, `lib/pipeline/brand-fields.ts` (866 regels: de
  velddefinities), `lib/profile-editable.ts`, `lib/profile-meter.ts`, `lib/profile-gaps.ts`,
  `lib/profile-stage.ts`, `lib/pipeline/profile-readiness.ts`, `lib/pipeline/brand-examples.ts`.
- **Afhankelijk van.** Domein 12 (formuliercomponenten), domein 6 (werkgebied blokkeert de meting).
- **Deep-dive vraag.** `brand-fields.ts` is het grootste niet-contentbestand van de pijplijn. Is dat een
  registry die groeit met het product, of een bestand dat opgesplitst hoort te worden?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| Fase 0: ontdekken | ~900 | Draait op productie | Middel |
| Fase 1 tot 3: onderzoek | ~1.900 | Onboarding 3.0 | **Hoog** |
| Fase 3b: kennistest | ~1.230 | Multi-engine voorbereid | **Hoog** |
| Fase 5: synthese en dossier | ~900 | Duurste onboardingstap | Middel |
| Onboardingsessie en refresh | ~1.400 | Live sinds 0060, de nieuwste | **Hoog** |
| Dossierscherm en volledigheid | ~2.400 | Herzien 17 aug 2026 | Middel |

---

## 4. Job-orchestratie en cron

De motor. Zonder dit domein gebeurt er niets, letterlijk: de werker draait op pg_cron en niet op Vercel.

### 4.1 De wachtrij en haar contract

- **Rol.** 24 taaksoorten, elk met een getypte payload. Vijftien daarvan gelden als zwaar en vullen een
  werkeraanroep in hun eentje. De regel eronder: één taak is hoogstens één zware AI-aanroep.
- **Code.** `lib/jobs/types.ts` (het contract), `lib/jobs/queue.ts` (`enqueue`), `lib/jobs/dedupe.ts`,
  `lib/jobs/pending.ts`, tabel `jobs` (RLS aan, nul policies).
- **Afhankelijk van.** Alle pijplijndomeinen leveren hier hun stappen aan.
- **Deep-dive vraag.** `HEAVY_JOB_TYPES` is een handmatig onderhouden set. Wat is het gevolg als een
  nieuwe zware taak vergeten wordt: een afgekapte functie of een teruggezette taak?

### 4.2 De werker en het tijdbudget

- **Rol.** Taken claimen, uitvoeren, opnieuw plannen bij een fout, en op tijd stoppen. De getallen
  hangen aan elkaar: 300 seconden routelimiet, 240 budget, 220 reservering zwaar, 115 licht, 105 per
  AI-aanroep.
- **Code.** `lib/jobs/worker.ts`, `app/api/cron/worker/route.ts`, `lib/jobs/progress.ts` (poging 2 van
  4 zichtbaar voor de klant), `reclaim_stuck_jobs` als RPC.
- **Afhankelijk van.** Domein 5 (`callBudget()` in de OpenAI-client).
- **Deep-dive vraag.** De reserveringen zijn statisch. Hebben we per taaksoort de werkelijke duur op
  productie, en klopt 220 seconden nog voor de zwaarste onboardingstap?

### 4.3 Ketening en falen

- **Rol.** Elke handler plant zijn opvolger in, zodat het werk aan de server hangt en niet aan een
  browsertab. Opgeven is ook een uitkomst waar de keten mee verder moet.
- **Code.** `lib/jobs/handlers.ts` (782 regels, 24 handlers), `lib/jobs/chain.ts` (de opvolgertabel,
  puur), `scheduleFollowUpAfterFailure`, `BLOCKING_JOB_TYPES` en `NON_BLOCKING_TYPES`.
- **Afhankelijk van.** Alle pijplijndomeinen.
- **Deep-dive vraag.** `handlers.ts` is de plek waar elk domein samenkomt. Is 782 regels met 24
  handlers nog het juiste formaat, of vraagt dit om een handler per bestand?

### 4.4 De vier cron-ingangen

- **Rol.** Werker (elke minuut, pg_cron), maandelijkse meetronde (Vercel), rapportmail (Vercel, nu uit
  `vercel.json`), en de dagelijkse schrijfronde plus zoekdata-synchronisatie (pg_cron).
- **Code.** `app/api/cron/{worker,tracking,reminders,plan}/route.ts`, migraties `0015`, `0050` en
  `0059`, plus de twee vault-geheimen.
- **Afhankelijk van.** Domein 9 (de schrijfronde), domein 10 (Search Console), domein 11 (het archief
  filtert gearchiveerd werk weg, en dat is de dure).
- **Deep-dive vraag.** Zonder de twee vault-geheimen slaat `trigger_worker()` stil over: geen fout in de
  logs, maar ook geen enkele taak. Is er een alarm dat dat merkt, of merken we het aan een klant die
  belt?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| Wachtrij en contract | ~700 | Stabiel, 24 taaksoorten | **Hoog** |
| Werker en tijdbudget | ~500 | Reclaim wordt gelogd sinds aug 2026 | **Hoog** |
| Ketening en falen | ~850 | Hersteld na Teamsessie 18 aug 2026 | **Hoog** |
| Cron-ingangen | ~350 | Vier ingangen, twee platforms | Middel |

---

## 5. AI-laag

De enige plek die met OpenAI praat, plus de enginelaag die voorbereid is op een tweede aanbieder.

### 5.1 Client, budget en retries

- **Rol.** Eén aanroep met een timeout van 100 seconden en een totaalbudget van 105 over alle pogingen
  heen, als `AbortSignal`. Zonder dat totaalbudget was de echte bovengrens vier keer de timeout.
- **Code.** `lib/openai/client.ts`, `lib/openai/structured.ts` (structured output plus het vangnet dat
  `temperature` uitzet als de API hem weigert).
- **Afhankelijk van.** Domein 4 (de reserveringen in de werker hangen aan deze getallen).
- **Deep-dive vraag.** Het vangnet zet `temperature` voor de rest van het proces uit. Is dat proces een
  request, een werkeraanroep, of een module-scope variabele die blijft hangen?

### 5.2 Modellen en redeneerinspanning

- **Rol.** Drie tiers vast in code, geen env-variabele. De keuze zit niet meer in het model maar in de
  redeneerinspanning per soort werk: aanroepplekken geven `work: "analytical"` op, niet een temperatuur.
- **Code.** `lib/openai/models.ts`, `lib/openai/sampling.ts` (`resolveTuning()`).
- **Afhankelijk van.** Elke AI-aanroep in domein 3, 6, 7 en 8.
- **Deep-dive vraag.** De effortstanden staan laag omdat een aanroep binnen 100 seconden moet passen.
  Wat wint een stap als de effort omhoog gaat, en welke stap zou dat als eerste verdienen?

### 5.3 Contracten (Zod)

- **Rol.** Zeventien schema's die vastleggen wat een model terug mág geven. Structured output kiest bij
  twijfel de eerste enumwaarde, dus het schema is geen documentatie maar een poort.
- **Code.** `lib/schemas/` (17 bestanden: `mention`, `profile`, `report`, `content-piece`,
  `gap-analysis`, `fact-atoms`, `claim-audit`, en tien meer).
- **Afhankelijk van.** Domein 6 en 8 leunen er het zwaarst op.
- **Deep-dive vraag.** Bij tien van 27 niet-genoemde merken vulde het model tóch een rol in. Welke
  andere enums in deze zeventien schema's hebben nog geen deterministisch vangnet in code?

### 5.4 Enginelaag

- **Rol.** Een engine doet mee als er een sleutel voor is én hij op het profiel aanstaat. De doorsnede,
  niet de wens. Gemini is aangesloten maar slaapt zonder sleutel.
- **Code.** `lib/engines/{types,openai,gemini,registry,label}.ts`, `profiles.engines_enabled`,
  migratie `0041`.
- **Afhankelijk van.** Domein 6 (de meting draait per engine), domein 3.3 (de kennistest ook).
- **Deep-dive vraag.** De idempotentie-index van `tracking_runs` bevat de engine. Wat gebeurt er met de
  vergelijkbaarheid van periodes op het moment dat Gemini aan gaat: telt die mee in dezelfde score?

### 5.5 Kostenlogboek

- **Rol.** Eén rij per aanroep in `ai_calls`: model, tokens, geschatte kosten, soort, analyse en profiel.
  Meer dan vijftig verschillende soorten aanroepen worden apart gelabeld.
- **Code.** `lib/openai/ledger.ts`, `lib/openai/pricing.ts`, `app/api/analyses/[id]/costs/route.ts`.
- **Afhankelijk van.** Domein 11 (het budgetplafond leest deze tabel).
- **Deep-dive vraag.** De kosten zijn geschat uit tarieven in code. Hoe vaak wijkt dat af van de
  factuur, en wie merkt het als OpenAI een tarief verandert?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| Client, budget, retries | ~600 | Stabiel | **Hoog** |
| Modellen en sampling | ~300 | GPT-5.6-familie sinds aug 2026 | Middel |
| Zod-contracten | ~800 | 17 schema's | Middel |
| Enginelaag | ~400 | Gemini slaapt | Laag |
| Kostenlogboek | ~200 | Nagerekend 17 aug 2026 | Middel |

---

## 6. Meetmachine

Het hart van het product: van dertig vragen naar één score met een onzekerheidsband.

### 6.1 Promptgeneratie en verdeling

- **Rol.** Standaard tien vragen per funnelfase, per analyse instelbaar tussen 0 en 40 met een maximum
  van 90. Eén taak per fase, sinds een gezamenlijke taak op productie 228 van de 300 seconden vulde.
- **Code.** `lib/pipeline/prompts.ts`, `lib/prompt-mix.ts`, `app/api/analyses/[id]/prompts/`,
  migratie `0054`.
- **Afhankelijk van.** Domein 5 (`work: "creative"`, effort none met temperatuur 0,8).
- **Deep-dive vraag.** Nul is een geldige keuze per fase en dat is overal expliciet afgehandeld, zonder
  `??`. Waar in de rest van de app rekent een `??` een geldige nul nog weg?

### 6.2 De regionale poort

- **Rol.** Staat het bereik op lokaal en zijn er regio's bekend, dan moet élke vraag regionaal zijn.
  Niet een deel, alle. Bij het enige merk met drie meetronden leverden 57 landelijke metingen nul
  vermeldingen op, tegen score 28 op de tien regionale vragen.
- **Code.** `lib/pipeline/geo-share.ts`, `regionGateMessage()`, bijvulronden in `prompts.ts`,
  `lib/pipeline/profile-readiness.ts` (zonder bereik is het dossier niet af).
- **Afhankelijk van.** Domein 3 (`profiles.service_scope`). De hele regel hangt aan dat ene veld.
- **Deep-dive vraag.** Handmatig toevoegen gaat door dezelfde poort. Geldt dat ook voor het importeren
  of dupliceren van vragen tussen analyses, als dat er ooit komt?

### 6.3 De meting zelf

- **Rol.** Per vraag een gesimuleerd AI-antwoord (3a, met web_search) en daarna een beoordeling per
  entiteit (3b). Los herhaalbaar: een mislukte 3b draait nooit opnieuw de dure 3a.
- **Code.** `lib/pipeline/measure.ts` (1052 regels), `lib/openai/mention-prompt.ts`,
  `lib/pipeline/answers.ts`, `lib/pipeline/position.ts`, tabellen `tracking_runs` en
  `tracking_run_mentions`.
- **Afhankelijk van.** Domein 5, domein 4 (één taak per vraag), domein 11 (98,8 procent van de kosten
  van een ronde zit in 3a).
- **Deep-dive vraag.** Er is precies één kostenknop die telt en dat is web_search bij het stellen van de
  vraag. Wat verliezen we als die voor een deel van de vragen uit gaat, en is dat ooit gemeten?

### 6.4 Gelaagd hermeten en aggregatie

- **Rol.** De acht zwaarste vragen worden drie keer gemeten. Alle aggregatie telt per vraag, met gewicht
  één gedeeld door het aantal metingen van die vraag, zodat herhaalde vragen niet zwaarder gaan wegen.
- **Code.** `lib/pipeline/question-share.ts`, `lib/pipeline/prompt-weight.ts`,
  `lib/pipeline/periods.ts`, `lib/stats/uncertainty.ts`, tabel `visibility_scores`, migratie `0031`.
- **Afhankelijk van.** Domein 7 (de rapportage leest deze cijfers).
- **Deep-dive vraag.** De onzekerheidsband schaalt met de wortel: plus of min 16,4 punten bij 30 vragen.
  Communiceren we die band overal even hard, of alleen op het scherm waar hij ontworpen is?

### 6.5 Entiteiten en concurrenten

- **Rol.** Voorkomen dat "Coolblue", "coolblue.nl" en "Coolblue B.V." drie partijen worden. Daarna per
  concurrent destilleren wáárom die genoemd wordt, met letterlijk citaat als bewijs.
- **Code.** `lib/entities/normalize.ts` en `resolve.ts`, `lib/pipeline/classify-entities.ts`,
  `lib/pipeline/competitor-intel.ts`, `lib/pipeline/brand-rankings.ts`, tabellen `entities` en
  `competitor_breakdown`.
- **Afhankelijk van.** Domein 5, domein 12 (de rangordetabel is een scherm).
- **Deep-dive vraag.** `citesOwnSite()` telt een citatie mee zodra het domein op de merknaam lijkt. Een
  concurrent met een domeinnaam die niets met zijn merk te maken heeft wordt gemist. Hoe vaak komt dat
  voor in de data die we nu hebben?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| Promptgeneratie en verdeling | ~800 | Drie taken sinds 12 aug 2026 | Middel |
| Regionale poort | ~300 | Hangt aan één veld | **Hoog** |
| De meting | ~1.400 | 98,8% van de kosten | **Hoog** |
| Hermeten en aggregatie | ~900 | Ketentest dekt aggregatie niet | **Hoog** |
| Entiteiten en concurrenten | ~1.300 | Live sinds 0058 | Middel |

---

## 7. Rapportage en inzichten

Van cijfers naar een zin die een ondernemer begrijpt, plus de blokken die zeggen wat de volgende stap is.

### 7.1 Gap-analyse en rapport

- **Rol.** Waar winnen concurrenten en waarom, met bewijs uit de database. Het rapport verwoordt dat en
  leidt niets zelf af. Een claimvalidator verwijdert achteraf elke merknaam die niet in het
  bewijsdossier van díe vraag staat.
- **Code.** `lib/pipeline/report.ts` (899 regels), `lib/pipeline/validate-claims.ts`,
  `lib/pipeline/claim-extract.ts`, `lib/pipeline/evidence.ts`, `lib/pipeline/structure-gap.ts`,
  tabel `reports` met `stripped_claims_json` als audit-trail.
- **Afhankelijk van.** Domein 6 (de meetuitkomst), domein 3 (de aanbodboom voor de structurele gaten).
- **Deep-dive vraag.** De structurele gaten zijn de enige invoer die niet reactief is. Is dat de plek
  waar de visie (kansen zelf ontdekken) begint, en wat zou de volgende niet-reactieve invoer zijn?

### 7.2 Periodeverschil en trend

- **Rol.** Het model verwoordt het verschil, het berekent het niet. Dat ging eerder mis.
- **Code.** `lib/pipeline/period-change.ts`, `period-change-format.ts`, `lib/pipeline/trend.ts`,
  `components/trend-chart.tsx`, `components/sparkline.tsx`.
- **Afhankelijk van.** Domein 6, domein 12.
- **Deep-dive vraag.** Wanneer is een verandering betekenisvol genoeg om te mailen? Die drempel bepaalt
  ook of de klant iets hoort.

### 7.3 Inzichten, kansen en opbrengst

- **Rol.** Drie zinnen over wat er deze periode gebeurde, een kansenlijst met een actie erachter, en het
  opbrengstblok dat aantallen toont zolang er geen waarde per vermelding is ingevuld.
- **Code.** `lib/insights.ts` en `insights-data.ts`, `lib/opportunities.ts`, `lib/milestones.ts` en
  `milestones-data.ts`, `lib/dashboard.ts`, `components/milestones-block.tsx`.
- **Afhankelijk van.** Domein 2 (`accounts.value_per_mention_eur`), domein 6.
- **Deep-dive vraag.** Deze blokken zijn bewust geen AI-aanroep. Waar ligt de grens: welk blok zou echt
  beter worden van een model, en welk blok wordt daar alleen maar vager van?

### 7.4 Potentiescore en werkmodel

- **Rol.** Drie getallen van 0 tot 100 die zeggen waar het meeste te winnen is, herberekend over alle
  onderwerpen van een merk tegelijk. Plus één werkmodel dat de vijf soorten "werk" uit de app samenbrengt.
- **Code.** `lib/potential.ts` en `potential-data.ts`, `lib/pipeline/search-demand.ts`, `lib/work.ts`,
  `lib/activity.ts`, taaksoort `recalculate_potential`, migratie `0057`.
- **Afhankelijk van.** Domein 4, domein 9 (het plan gebruikt de potentie voor de volgorde).
- **Deep-dive vraag.** De herberekening hangt aan het eerste rapport van een analyse. Wat gebeurt er met
  de vergelijkbaarheid als een merk er een onderwerp bij krijgt: verschuift dan de hele schaal?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| Gap-analyse en rapport | ~1.600 | Claimvalidator actief | **Hoog** |
| Periodeverschil en trend | ~500 | Stabiel | Laag |
| Inzichten, kansen, opbrengst | ~1.100 | Fase 5 en 6 | Middel |
| Potentie en werkmodel | ~900 | Live sinds 0057 | Middel |

---

## 8. Content-engine

Van bevestigde feiten naar een pagina die de klant durft te publiceren, met twee deterministische
poorten en een meetbaar effect achteraf.

### 8.1 Feitenbank

- **Rol.** Elk feit heeft een identiteit en niet een positie, een scope (merkbreed of per analyse) en
  wordt opgevolgd in plaats van overschreven. Brontekst van de klant wordt gehasht bewaard.
- **Code.** `lib/pipeline/factbase.ts`, `factcard.ts`, `fact-atomise.ts`, `fact-merge.ts`,
  `atom-verify.ts`, tabellen `brand_facts`, `brand_documents`, `fact_requests`, migraties `0035` en
  `0036`.
- **Afhankelijk van.** Domein 3.4 (de synthese vult dezelfde bank).
- **Deep-dive vraag.** `superseded_by` in plaats van overschrijven betekent dat de bank groeit. Wat is
  het leesprofiel bij een merk met een paar honderd feiten, en is dat al gemeten?

### 8.2 Briefing

- **Rol.** Feitenkaart bouwen, claim-audit draaien, en maximaal acht vragen aan de klant stellen. Eén
  slot is gereserveerd voor de positioneringsvraag.
- **Code.** `lib/pipeline/briefing.ts` (620 regels), `briefing-select.ts` (472),
  `app/(app)/analyses/[id]/briefing/`, `app/api/analyses/[id]/briefing/route.ts`.
- **Afhankelijk van.** Domein 11 (betaalde route), domein 7 (de aanbevelingen uit het rapport).
- **Deep-dive vraag.** Acht vragen per batch is een productkeuze. Wat is de gemeten beantwoordingsgraad,
  en zakt die bij acht harder in dan bij vier?

### 8.3 Schrijven en herschrijven

- **Rol.** Vier stappen: schrijven op het dure model, kritiek op het goedkope, herschrijven, herbeoordelen.
  Uitsluitend binnen bevestigde feiten, met per bewering het feit dat hem dekt.
- **Code.** `lib/pipeline/content.ts` (1710 regels, het grootste bestand van de codebase),
  `lib/pipeline/source-analysis.ts`, `lib/pipeline/tone-sliders.ts`, `lib/pipeline/structured-data.ts`,
  `lib/schema-jsonld.ts`, taaksoorten `content_draft` en `content_revise`.
- **Afhankelijk van.** Domein 5 (het dure model), domein 3 (tone-of-voice, taboewoorden, auteur).
- **Deep-dive vraag.** 1710 regels in één bestand met vier modelaanroepen erin. Waar loopt de naad om
  dit te splitsen, en welke test dekt die naad vandaag af?

### 8.4 De twee poorten

- **Rol.** `checkContentGate()` doet zeven GEO-checks en voedt de `geo_score`. `checkQuality()` doet
  duplicatie en leesbaarheid en voedt alléén `needs_review`, want anders was de score van vorige maand
  onvergelijkbaar met die van vandaag.
- **Code.** `lib/pipeline/content-gate.ts` (638 regels), `similarity.ts` (Jaccard op vijfgrammen),
  `readability.ts`, `checkTabooWords()`.
- **Afhankelijk van.** Domein 3 (`taboo_phrases`, `compliance_notes`).
- **Deep-dive vraag.** De scheiding tussen "telt mee in de score" en "vraagt een mens" is de kern van de
  vergelijkbaarheid over tijd. Welke nieuwe check zou aan welke kant horen, en wie beslist dat?

### 8.5 Versies, bewerken en exporteren

- **Rol.** De contentdetailpagina is ook een bewerkoppervlak. Versiebeheer per analyse en titel, met een
  verschil op woordniveau, een FAQ die de klant zelf mag wijzigen, en een export die het CMS van de klant
  volgt.
- **Code.** `lib/pipeline/content-diff.ts`, `content-export.ts` (Gutenberg-blokken bij WordPress),
  `version-reason.ts`, `slug.ts`, `lib/library.ts`, `app/(app)/analyses/[id]/bibliotheek/[pieceId]/`,
  `components/version-diff.tsx`, `components/faq-editor.tsx`.
- **Afhankelijk van.** Domein 3.1 (het sjabloonfacet uit de crawl), domein 12.
- **Deep-dive vraag.** De export volgt het herkende CMS. Publicatie via het CMS zelf bestaat nog niet,
  terwijl de merkstrategie hem wel belooft. Wat is de kleinste stap die dat gat dicht?

### 8.6 Publiceren en effect meten

- **Rol.** De klant vult de live-URL in, de app verifieert dat de pagina er echt staat, en daarna volgen
  hermeetgolven met een statistisch verdict.
- **Code.** `lib/pipeline/publish.ts`, `publish-check.ts`, `impact.ts`, `impact-math.ts`,
  tabel `content_impact`, taaksoorten `verify_publication`, `measure_impact`, `compute_impact`.
- **Afhankelijk van.** Domein 6 (de hermeting is dezelfde meting met een ander doel), domein 10 (GSC
  levert het zoekverkeer ernaast).
- **Deep-dive vraag.** Het verdict kent `te_weinig_data` als uitkomst. Hoe vaak is dat in de praktijk de
  uitkomst, en wat vertellen we de klant dan?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| Feitenbank | ~1.400 | Live sinds 0035 en 0036 | Middel |
| Briefing | ~1.100 | Betaalde route | Middel |
| Schrijven en herschrijven | ~1.900 | Grootste bestand | **Hoog** |
| De twee poorten | ~1.100 | Deterministisch | **Hoog** |
| Versies, bewerken, export | ~1.100 | Content-editie aug 2026 | Middel |
| Publiceren en impact | ~600 | CMS-koppeling ontbreekt | Middel |

---

## 9. Contentplan en planautomatisering

Twaalf maanden vooruit plannen, goedkeuring per maand, en een dagelijkse ronde die schrijft wat er
binnen tien dagen moet staan.

### 9.1 Het plan als object

- **Rol.** Plan, maanden en pagina's, met buffers per maand en funnelfases per merk. Geen looptijd, want
  doorlopend opzegbaar.
- **Code.** `lib/plans.ts`, `lib/pipeline/plan-build.ts`, `lib/plan-order.ts`, `lib/plan-progress.ts`,
  `app/api/profiles/[id]/plan/`, migratie `0049`.
- **Afhankelijk van.** Domein 7.4 (de potentie bepaalt de volgorde), domein 3 (de topics).
- **Deep-dive vraag.** De volgorde binnen een maand is bewust niet slepen. Blijft dat houdbaar als een
  bureau met tien merken het plan wil bijsturen?

### 9.2 De schrijfronde

- **Rol.** De route plant, de werker schrijft. Wat er niet geschreven kan worden telt hij apart en
  verzwijgt hij niet: schrijven leunt op een gemeten analyse, en bij één klant hadden zes van de acht
  onderwerpen er nog geen.
- **Code.** `lib/plan-writing.ts` (`writeDecision`), `app/api/cron/plan/route.ts`, `plannedPageId` in
  de payload van `content_draft`, migratie `0050`.
- **Afhankelijk van.** Domein 8 (de schrijfpijplijn), domein 4 (de werker), domein 11 (het plafond).
- **Deep-dive vraag.** `plannedPageId` is de brug tussen plan en pijplijn. Zonder dat veld blijft een
  pagina op "bezig" staan tot iemand het opmerkt. Welke andere terugmeldingen missen zo'n brug?

### 9.3 Statustaal en bulkacties

- **Rol.** De status van een geplande pagina in drie talen tegelijk: technisch, leesbaar, en wie er aan
  zet is. Plus "markeer alles als geplaatst" met een eerlijke deelmelding.
- **Code.** `lib/plan-status.ts`, `lib/plan-bulk.ts`, `app/(app)/merk/[id]/strategie/plan/plan-view.tsx`
  (663 regels).
- **Afhankelijk van.** Domein 12.
- **Deep-dive vraag.** `plan-view.tsx` is het grootste UI-bestand. Hoeveel daarvan is staat en hoeveel
  is presentatie?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| Plan als object | ~770 | Live sinds 0049 | Middel |
| Schrijfronde | ~400 | Dagelijks op pg_cron | **Hoog** |
| Statustaal en bulk | ~390 | Stabiel | Laag |

---

## 10. Externe data en audits

Alles wat de buitenwereld leest en niets kost, plus de ene koppeling met een externe API.

### 10.1 Crawler

- **Rol.** robots.txt, dan sitemap (recursief), anders homepage-links. HTML naar schone platte tekst.
  Deterministisch en gratis.
- **Code.** `lib/crawler.ts` (410 regels).
- **Afhankelijk van.** Niets. Domein 3, 8 en 10.2 hangen eraan.
- **Deep-dive vraag.** Er zit geen rate limiting per host in beeld. Wat doet de crawler bij een site die
  traag antwoordt of 429 teruggeeft?

### 10.2 Technische GEO-audit

- **Rol.** Mag een AI-crawler de site überhaupt bezoeken? Plus vier entiteitschecks: naamconsistentie,
  `sameAs`, schemadekking en Wikidata. Staat de site dicht, dan blokkeert dit contentgeneratie.
- **Code.** `lib/audit/{robots,ai-crawlers,entity-consistency,technical,gate,store}.ts`,
  tabel `technical_audits`, `components/audit-gate.tsx` en `audit-panel.tsx`.
- **Afhankelijk van.** Domein 8 (de blokkade), domein 4 (taaksoort `technical_audit`).
- **Deep-dive vraag.** De crawlerlijst is een constante in code. Hoe vaak komt er een nieuwe AI-crawler
  bij, en hoe merken we dat we er een missen?

### 10.3 Off-site aanwezigheid

- **Rol.** Op welke externe domeinen het merk wel en niet aanwezig is, met Wikidata en Wikipedia via hun
  gratis open API's in plaats van via een model.
- **Code.** `lib/offsite/{scan,landscape,presence,entity-presence,domain}.ts`, tabellen
  `source_landscape` en `offsite_tasks`.
- **Afhankelijk van.** Domein 5 (één gegronde aanroep voor het landschap), domein 7.4 (de taken landen
  in het werkmodel).
- **Deep-dive vraag.** Off-site taken zijn handmatig werk voor de klant. Hoeveel daarvan wordt echt
  afgerond, en zou het systeem er zelf meer van kunnen doen?

### 10.4 Google Search Console

- **Rol.** Eén taak per merk per dag: klikken, vertoningen en positie per pagina per dag. Via een service
  account en niet via OAuth, omdat de benodigde scopes bij Google "sensitive" zijn en dat weken
  verificatie kost.
- **Code.** `lib/search-console/{auth,property,sync,window,metrics,key-state}.ts`,
  `app/api/profiles/[id]/search-console/route.ts`, `app/(app)/merk/[id]/analytics/zoekverkeer/`,
  `app/(app)/instellingen/koppelingen/`, migratie `0052`.
- **Afhankelijk van.** Domein 4 (de dagelijkse ronde plant dit mee), domein 8.6 (het effect per pagina).
- **Deep-dive vraag.** De sleutel staat in één env-variabele voor alle klanten samen. Wat is het plan als
  een klant die toegang intrekt, en zien we dat als fout of als lege data?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| Crawler | 410 | Stabiel, nul kosten | Laag |
| Technische audit | ~1.050 | Blokkeert content | Laag |
| Off-site | ~660 | Handmatige opvolging | Laag |
| Search Console | ~910 | Live sinds 0052 | Middel |

---

## 11. Kostenbeheersing en governance

Elf tot twaalf routes zetten werk in gang dat geld kost. Ze stellen allemaal dezelfde twee vragen, in
dezelfde volgorde.

### 11.1 De twee remmen

- **Rol.** Vraag één: wie mag dit starten? Vraag twee: hoeveel is er nog over? De eerste faalt naar nee,
  de tweede faalt naar ja, en dat is met opzet: een kapotte budgetcontrole mag niet de hele pijplijn voor
  alle klanten platleggen.
- **Code.** `lib/cost-guard.ts` en `lib/cost-rules.ts` (403 met een eigen zin per handeling),
  `lib/spend-limit.ts` en `lib/spend-rules.ts` (402 met bedrag, plafond en waar je het verhoogt).
- **Afhankelijk van.** Domein 5.5 (`ai_calls`), domein 2 (`accounts.monthly_budget_eur`).
- **Deep-dive vraag.** ⚠️ Twaalf routes gebruiken vandaag beide remmen, maar de broncodecontrole in
  `scripts/test-unit.ts` noemt er elf: `app/api/profiles/[id]/refresh/route.ts` (nieuw met onboarding
  3.0) staat niet in die lijst. De rem zit er wel in, maar hij wordt niet bewaakt. Moet die lijst
  handmatig blijven, of afgeleid worden uit de routes die `enqueue` aanroepen?

### 11.2 Archief en cadans

- **Rol.** Gearchiveerd werk telt niet mee in lijsten, tellingen en cron. Zonder dat filter kost een merk
  dat niemand meer ziet elke maand een betaalde meetronde. `measure-cadence.ts` voorkomt dat dezelfde
  analyse te snel opnieuw gemeten wordt.
- **Code.** `lib/archive.ts` (zes query's gebruiken hem), `lib/measure-cadence.ts`,
  `lib/require-count.ts` ("bestaat dit al?" mag nooit stil "nee" worden), migratie `0044`.
- **Afhankelijk van.** Domein 4 (de cron-routes filteren hierop).
- **Deep-dive vraag.** Archiveren staat bewust niet in RLS, zodat de eigenaar zijn merk kan blijven
  bereiken. Elke nieuwe query moet daardoor zelf aan `lib/archive.ts` denken. Hoe borgen we dat bij
  query nummer zeven?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| De twee remmen | ~600 | 12 routes, vangnet dekt 11 | **Hoog** |
| Archief en cadans | ~350 | Live sinds 0044 | **Hoog** |

---

## 12. UI-laag en werkruimte

Vijf hoofdstukken per merk, plus het clusterdossier in vier hoofdstukken. Dit is qua regels het grootste
domein van de app.

### 12.1 De schil

- **Rol.** Zijbalk die per hoofdstuk groepeert, merkwisselaar, profielmenu, en de chrome eromheen.
- **Code.** `components/app-shell.tsx`, `sidebar.tsx`, `workspace-chrome.tsx`, `brand-switcher.tsx`,
  `profile-menu.tsx`, `section-rail.tsx`.
- **Afhankelijk van.** Domein 1.4 (`lib/nav.ts`), domein 2 (staf ziet meer).
- **Deep-dive vraag.** De zijbalk toont een hoofdstuk pas als zijn bestemmingen bestaan. Hoeveel query's
  kost het renderen van de schil per paginalading?

### 12.2 De merk-werkruimte

- **Rol.** Vijf hoofdstukken: overzicht, strategie (plan, clusters, bibliotheek), analytics
  (zichtbaarheid, zoekverkeer, concurrenten), merkprofiel (dossier, bewerken, input) en admin (staf).
- **Code.** `app/(app)/merk/[id]/` met 18 componenten in `_components/`, waaronder
  `onboarding-session.tsx` (480 regels), `brand-field-input.tsx` (376), `topics-panel.tsx` (356) en
  `entities-manager.tsx` (350).
- **Afhankelijk van.** Domein 3, 6, 7, 9 en 10.
- **Deep-dive vraag.** `merk/[id]/page.tsx` is 498 regels. Hoeveel blokken haalt dat overzicht op, en
  welke daarvan zijn te lazy laden zonder dat de pagina leeg oogt?

### 12.3 Het clusterdossier

- **Rol.** Eén analyse in vier hoofdstukken: stand, resultaat, bewijs en werk. Plus de bewerkers voor
  vragen, onderwerp-onderzoek en de contentbriefing.
- **Code.** `app/(app)/analyses/[id]/` met `_chapters/`, `_editors/` en `_work/`, `score-panel.tsx`
  (589 regels, bevat de rangordetabel), `tabs.tsx`, de drie voortgangscomponenten.
- **Afhankelijk van.** Domein 6, 7, 8.
- **Deep-dive vraag.** Er zijn drie aparte voortgangscomponenten (meten, voorbereiden, rapporteren).
  Delen die één model van "werk dat loopt", of zijn het drie oplossingen voor dezelfde vraag?

### 12.4 Gedeelde primitieven

- **Rol.** 46 componenten: kaarten, chips, skeletons, toasts, foutmeldingen, lege staten, grafieken.
- **Code.** `components/`, met `trend-chart.tsx` (448 regels) als grootste.
- **Afhankelijk van.** `docs/designsystem.md` en `docs/ux-design.md` zijn hier leidend.
- **Deep-dive vraag.** Het designsysteem is afgeleid van een concurrent en dat botst met de
  merkstrategie (open besluit in `designsystem.md` §9b). Wanneer wordt dat besloten, en wat kost het
  dan aan verbouwing?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| De schil | ~800 | Herzien 17 aug 2026 | Middel |
| Merk-werkruimte | ~7.000 | Nieuwste laag | **Hoog** |
| Clusterdossier | ~4.500 | Stabiel | Middel |
| Gedeelde primitieven | ~4.600 | Open ontwerpbesluit | Middel |

---

## 13. Datalaag en kwaliteitsborging

### 13.1 Migraties

- **Rol.** 59 migratiebestanden (`0001` tot en met `0060`, waarbij `0033` gereserveerd bleef en nooit
  draaide), plus zes `RUN_`-hulpbestanden. 39 tabellen in productie. Additief en idempotent, nooit `drop`.
- **Code.** `supabase/migrations/`, index en regels in `supabase/README.md`.
- **Afhankelijk van.** Alles.
- **Deep-dive vraag.** Additief betekent dat er niets vanzelf verdwijnt, en dat is te zien in productie:
  `_backup_20260729` staat er nog met 51 rijen, `brand_dna` bestaat sinds migratie `0001` en heeft nul
  rijen, en `tracking_run_mentions.sentiment` wordt niet meer gevuld. Wanneer is opruimen het risico
  waard, en wie besluit dat?

### 13.2 Typen als contract

- **Rol.** `lib/types/database.ts` (1056 regels) is het handgeschreven contract tussen database en code.
- **Code.** `lib/types/database.ts`.
- **Afhankelijk van.** Alles.
- **Deep-dive vraag.** Dit bestand wordt met de hand bijgewerkt naast elke migratie, terwijl Supabase
  types kan genereren. Waarom handmatig, en is die reden er nog?

### 13.3 De drie testlagen

- **Rol.** 1744 unittests op pure functies zonder database of sleutel. 202 ketentests met echte handlers
  tegen echte Postgres, zonder netwerk. Eén rooktest die echte betaalde aanroepen doet.
- **Code.** `scripts/test-unit.ts` (7910 regels), `scripts/test-chain.ts` (2675) met
  `scripts/chain/{postgres,supabase-shim,openai-stub}.ts`, `scripts/test-openai.ts`,
  `scripts/eval-mention.ts`.
- **Afhankelijk van.** Alles. Zeven van de zeven fouten van een eerdere ronde zaten in de samenhang
  tussen taken, en geen enkele unittest kon ze vangen.
- **Deep-dive vraag.** De ketentest dekt de aggregatiestap van `measure.ts` niet, en dat is een bekend
  gat. Dat is precies de stap waar de rangordetabel en de citatietelling op leunen. Wat kost het om dat
  gat te dichten, en wat weegt zwaarder: dit gat of de volgende feature?

| Sub-onderdeel | Regels | Status | Complexiteit |
|---|---|---|---|
| Migraties | 6.174 | 59 bestanden, 39 tabellen | Middel |
| Typecontract | 1.056 | Handmatig onderhouden | Middel |
| Testlagen | 12.131 | Alles groen op 20 aug 2026 | Middel |

---

## De vijf gesprekken die deze kaart het meest oplevert

Als de deep dive maar een halve dag duurt, dan zijn dit de onderwerpen met de hoogste opbrengst per
minuut. Alle vijf komen uit de code van vandaag, niet uit een wens.

1. **De keten en zijn falende takken** (domein 4.3). `chain.ts` is net uit `handlers.ts` getrokken omdat
   een mislukte stap de halve onderzoeksketen stil liet verdwijnen. Dat patroon is één keer gevonden en
   is de moeite waard om systematisch na te lopen.
2. **Het gat in het vangnet op betaalde routes** (domein 11.1). Twaalf routes hebben beide remmen, de
   controle bewaakt er elf. De rem die niet bewaakt wordt is de nieuwste.
3. **`content.ts` op 1710 regels met vier modelaanroepen** (domein 8.3). Het grootste bestand van de
   codebase, en de plek waar het duurste model draait.
4. **De aggregatiestap zonder ketentest** (domein 13.3 en 6.4). De rangordetabel en de citatietelling
   leunen op een stap die alleen op eenheidsniveau getoetst is.
5. **De afstand tussen belofte en bouw** (domein 8.5). De merkstrategie belooft publicatie via het CMS.
   De export levert vandaag Gutenberg-blokken om te plakken. Dat is de kortste route naar de eerstvolgende
   autonome stap uit `docs/visie.md`.
