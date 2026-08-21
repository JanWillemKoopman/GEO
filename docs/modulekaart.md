# Modulekaart

De hiërarchische opsplitsing van ORBIT ENGINE in dertien domeinen en 56 deep dives, bedoeld als
werkagenda voor het engineeringteam.

> **Geverifieerd tegen de code op 20 augustus 2026** (branch `claude/architecture-analysis-breakdown-gq1q8y`,
> t/m migratie `0060`). Alle tellingen in dit document komen uit een commando op de werkboom van die
> dag, niet uit een ander document. `npx tsc --noEmit` schoon, `npm run test:unit` 1744 geslaagd,
> `npm run test:chain` 202 geslaagd, productiebuild groen, alle vier gedraaid op die peildatum.

## Wat dit document is, en wat het niet is

`docs/architecture.md` beschrijft **hoe het werkt**: dataflow, datamodel, de pijplijn stap voor stap,
de modellen, de kosten. Dat blijft de enige technische waarheid en die feiten staan hier niet nog een
keer.

Deze kaart beantwoordt een andere vraag: **waar zit wat, hoe groot is het, waar raakt het de rest, en
wat moeten we er als eerste over uitzoeken**. Per onderdeel staan de verantwoordelijkheid, de
bestanden, de afhankelijkheden en vijf deep-dive vragen.

Voor het *waarom* achter een keuze: `docs/logbook.md`. Voor de UI-regels: `docs/ux-design.md` en
`docs/designsystem.md`. Voor wat er nog gebouwd moet worden: `docs/tasks/ontwikkelplan-visie.md`.

## Hoe je de kaart leest

Drie niveaus:

1. **Domein** (kop `##`): een logisch afgebakend deel van de app met een eigen vraag die het beantwoordt.
2. **Sub-onderdeel** (kop `###`): een service, een pijplijnstap of een schermgroep binnen dat domein.
3. **Technische uitwerking** (bullets): rol, bestanden, afhankelijkheden, en vijf deep-dive vragen.

**Elk sub-onderdeel is één deep dive en draagt een prioriteitsnummer van 1 tot 56.** Nummer 1 is de
sessie waarmee het team op dit moment het meeste aan de app verbetert. De volledige rangschikking met
de onderbouwing staat achteraan, in "De 56 deep dives op volgorde van potentie". De vijf vragen binnen
een deep dive staan óók op volgorde: vraag 1 is de vraag die je stelt als je er maar één kunt stellen.

De complexiteitskolom in de tabellen is een oordeel op drie assen samen: omvang in regels, aantal
inkomende afhankelijkheden, en hoe duur een fout is. **Hoog** betekent niet slecht gebouwd, het betekent
dat een wijziging daar niet in je eentje op een vrijdagmiddag hoort te gebeuren.

⚠️ **De statuskolom beschrijft wat er draait, nooit wat er nog moet komen.** "Live sinds 0047" betekent:
dit onderdeel staat op productie en migratie `0047` is de migratie die het bracht. Elke migratie tot en
met `0060` is toegepast, met als enige uitzondering `0033`, die gereserveerd bleef en nooit gedraaid is.
Openstaand werk staat niet in dit document maar in `docs/tasks/`.

## De kaart in één oogopslag

| # | Domein | Kernvraag | Omvang | Complexiteit | Hoogste prio hierin |
|---|---|---|---|---|---|
| 1 | Platform en applicatieschil | Waar draait het en hoe komt een verzoek binnen? | ~2.200 regels | Middel | 36 |
| 2 | Identiteit, accounts en autorisatie | Wie mag wat zien en wijzigen? | ~1.800 regels | **Hoog** | 8 |
| 3 | Merkprofiel en onboarding | Wie is deze klant, volgens de site en volgens het gesprek? | ~8.700 regels | **Hoog** | 10 |
| 4 | Job-orchestratie en cron | Wanneer draait welk werk, en wat als het misgaat? | ~2.400 regels | **Hoog** | 5 |
| 5 | AI-laag | Hoe praten we met een model, en wat kost dat? | ~2.300 regels | Middel | 20 |
| 6 | Meetmachine | Hoe zichtbaar is dit merk in AI-antwoorden? | ~4.700 regels | **Hoog** | **1** |
| 7 | Rapportage en inzichten | Wat betekenen de cijfers, en wat is de volgende stap? | ~4.100 regels | Middel | 17 |
| 8 | Content-engine | Hoe schrijft ORBIT ENGINE een pagina die klopt? | ~7.100 regels | **Hoog** | 4 |
| 9 | Contentplan en planautomatisering | Wat wordt er de komende twaalf maanden gemaakt? | ~1.600 regels | Middel | 13 |
| 10 | Externe data en audits | Wat zegt de buitenwereld over dit merk? | ~3.400 regels | Laag | 30 |
| 11 | Kostenbeheersing en governance | Wie mag geld uitgeven, en hoeveel is er nog? | ~950 regels | **Hoog** | 6 |
| 12 | UI-laag en werkruimte | Hoe ziet de klant dit alles? | ~20.900 regels | Middel | 28 |
| 13 | Datalaag en kwaliteitsborging | Hoe blijft het schema en het gedrag houdbaar? | ~18.300 regels | Middel | 9 |

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

**Deep dive #55 van 56.**

1. `app/page.tsx` beslist waar iemand landt op basis van het actieve merk. Wat gebeurt er als dat merk
   inmiddels gearchiveerd is of aan een ander account is toegewezen: een lege pagina, een 404, of een
   nette terugval naar de merkenlijst?
2. 33 van de 34 pagina's staan op `force-dynamic`. Welke daarvan tonen data die per uur hooguit één
   keer verandert, en wat levert caching daar op in laadtijd?
3. Er zijn 69 clientcomponenten in een RSC-first app. Welke daarvan zijn client geworden om één
   `onClick`, en kunnen die de serverkant terugkrijgen?
4. Is er een `error.tsx` en een `not-found.tsx` per routegroep, of valt een fout in de merkwerkruimte
   terug op de standaardfoutpagina van Next.js zonder onze eigen tekst?
5. De drie routegroepen hebben elk een ander toegangsregime, maar dat staat nergens als één regel
   opgeschreven. Waar wordt afgedwongen dat een nieuwe pagina in `app/(app)` niet per ongeluk publiek is?

### 1.2 Supabase-clients, drie soorten

- **Rol.** Lezen gaat met de sessie van de gebruiker (RLS geldt), schrijven met de service-role key
  (RLS omzeild, ownership expliciet gecontroleerd).
- **Code.** `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (RSC), `lib/supabase/admin.ts`
  (service-role, server-only), `lib/supabase/middleware.ts` plus `middleware.ts` in de root voor het
  verversen van de sessiecookie.
- **Afhankelijk van.** `lib/env.ts` voor de sleutels. Elk ander domein hangt hier weer aan.

**Deep dive #36 van 56.**

1. De admin-client is de sleutel tot alles: 45 van de 50 API-routes importeren hem, 44 importeren
   `lib/auth.ts`. Kan een broncodecontrole afdwingen dat elke admin-client-aanroep langs een
   ownership-check gaat, net zoals dat voor betaalde routes al gebeurt?
2. Er staan 116 `select("*")` in de codebase. Welke daarvan halen kolommen op met ruwe modeloutput
   (`raw_response`, `raw_json`) die het scherm niet gebruikt, en hoeveel bandbreedte kost dat per
   paginalading?
3. De middleware draait op vrijwel elk verzoek om de sessiecookie te verversen. Wat is de gemeten
   latency die dat toevoegt, en kan de matcher smaller?
4. Een `select` via de gebruikerssessie geeft bij een rechtenfout een lege lijst terug, geen fout. Waar
   in de app is "leeg" daardoor niet te onderscheiden van "mag je niet zien"?
5. Wat gebeurt er functioneel als de service-role key ooit rouleert: is er één plek die hem leest, of
   moeten er meerdere plekken tegelijk mee?

### 1.3 Omgeving en schakelaars

- **Rol.** Eén gevalideerde toegang tot alle omgevingsvariabelen, met de server-only geheimen lazy
  gelezen zodat een import in een clientcomponent niet meteen omvalt. Daarnaast de feature-flags.
- **Code.** `lib/env.ts`, `lib/config.ts`, `.env.example`, `app/api/health/route.ts`.
- **Afhankelijk van.** Niets. Alles hangt hieraan.

**Deep dive #53 van 56.**

1. De vlaggen staan verspreid over `lib/config.ts` en directe `process.env`-lezingen in de enginelaag
   (`GEMINI_API_KEY`) en de Search Console-koppeling (`GOOGLE_SERVICE_ACCOUNT_JSON`). Welke van die
   twee patronen wordt de standaard, en wat kost het om de rest te verplaatsen?
2. `/api/health` toont welke variabelen gezet zijn. Controleert die route ook of ze wérken (een
   testquery, een tokenaanvraag), of alleen of ze bestaan?
3. Feature-flags zijn nu omgevingsbreed. Welke ervan zouden per merk moeten kunnen, en welke zouden
   dan een kolom in `profiles` verdienen in plaats van een env-variabele?
4. `MEASURE_WEB_SEARCH=false` maakt ontwikkelen goedkoop maar de meting niet representatief. Is er een
   zichtbaar signaal in de app dat een meting onder die vlag gedraaid heeft?
5. Welke variabelen zijn vandaag verplicht om de app te laten starten, en faalt de app daarop luid bij
   het opstarten of pas stil bij de eerste aanroep?

### 1.4 Navigatie, werkruimte en oude adressen

- **Rol.** De vijf klanthoofdstukken plus de afgeschermde stafgroep, één bron voor zijbalk en menu's.
  De werkruimte houdt bij welk merk je aankijkt. `redirects.ts` houdt oude merkadressen werkend.
- **Code.** `lib/nav.ts`, `lib/workspace.ts`, `app/(app)/workspace-actions.ts`, `lib/redirects.ts`,
  `lib/origin.ts` (waar wijst de terugknop heen).
- **Afhankelijk van.** Domein 2 (staf ziet meer koppen), domein 12 (de zijbalk rendert dit).

**Deep dive #50 van 56.**

1. Een hoofdstuk verschijnt pas als zijn bestemmingen bestaan. Wie bepaalt of een bestemming bestaat,
   een statusveld of een query, en wat kost die controle per paginalading?
2. Het actieve merk staat in de werkruimte. Waar wordt dat opgeslagen (cookie, database, sessie), en
   wat ziet een klant die in twee tabbladen twee verschillende merken openzet?
3. `redirects.ts` houdt oude merkadressen werkend. Hoe lang blijven die staan, en is er een moment
   waarop een oude URL beter een nette uitleg kan tonen dan een stille doorverwijzing?
4. Voor een bureau met tien merken: schaalt de merkwisselaar naar een lijst van tien, of vraagt dat om
   zoeken en groeperen?
5. De zijbalk is de enige plek waar de klant "wat kan ik hier" leest. Welke bestemming wordt het minst
   bezocht, en meten we dat überhaupt?

### 1.5 Presentatiehulpen

- **Rol.** Getallen, datums, relatieve tijd, foutteksten, Markdown-rendering, URL-normalisatie en
  Postgres-veilige tekst.
- **Code.** `lib/format.ts`, `lib/errors.ts`, `lib/markdown.ts`, `lib/url.ts`, `lib/pg-text.ts`,
  `lib/highlight.ts`.
- **Afhankelijk van.** Niets, en dat is bewust: allemaal pure modules zonder `server-only`.

**Deep dive #56 van 56.**

1. `lib/markdown.ts` escapet eerst en herkent daarna structuur. Dat leverde eerder een stille bug op
   met citaatblokken. Welke andere regels in die renderer lezen nog naar een teken dat op dat moment al
   geëscaped is, en staat er per regel een test op?
2. De renderer is bewust dependency-vrij. Welke opmaak levert het schrijvende model dat de renderer
   vandaag niet kent, en wat gebeurt er dan met die tekst op het scherm?
3. `lib/errors.ts` maakt SDK-fouten leesbaar voor logging. Kan diezelfde tekst per ongeluk in een
   klantgerichte melding terechtkomen, en wat zou de klant dan lezen?
4. Alle datums lopen via `lib/format.ts`. Draait dat op de tijdzone van de server of van de bezoeker,
   en klopt "gisteren" dan ook rond middernacht?
5. `sanitizeForPostgres()` ving één NUL-byte af die een hele batch-insert liet weigeren. Welke andere
   tekstinvoer van het open web gaat er nog buiten die functie om naar de database?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| Next.js-frame en routegroepen | 55 | ~200 | Stabiel | Laag |
| Supabase-clients | 36 | ~250 | Stabiel | **Hoog**, single point of failure |
| Omgeving en schakelaars | 53 | ~300 | Stabiel | Laag |
| Navigatie en werkruimte | 50 | ~450 | Herzien 17 aug 2026 | Middel |
| Presentatiehulpen | 56 | ~1.000 | Stabiel | Laag |

---

## 2. Identiteit, accounts en autorisatie

Het domein waar een fout het duurst is. Drie lagen boven elkaar: de gebruiker, het account (een bureau
kan meerdere merken hebben), en de staf die alles ziet.

### 2.1 Sessie en inloggen

- **Rol.** Registreren, inloggen, wachtwoord vergeten en wachtwoord zetten, alles via server actions.
- **Code.** `app/(auth)/login`, `app/(auth)/register`, `app/(auth)/wachtwoord`,
  `app/(auth)/wachtwoord-vergeten`, `app/auth/wachtwoord`, `lib/auth.ts` (`requireUser`, `getUser`).
- **Afhankelijk van.** Domein 1 (Supabase-clients, middleware).

**Deep dive #54 van 56.**

1. Registratie staat dicht via twee lagen: `SIGNUPS_ENABLED` in de app en de harde poort in Supabase.
   Welke van de twee valt als eerste om zodra er een self-serve moment komt, en wie zet ze dan aan?
2. Hoe lang leeft een sessie, en wat ziet een klant die na twee weken terugkomt: opnieuw inloggen, of
   een scherm dat half laadt?
3. Wat gebeurt er bij een e-mailadres dat al bestaat, bij het aanvragen van een nieuw wachtwoord voor
   een onbekend adres, en bij een verlopen herstel-link: krijgt elk van die drie een eigen, eerlijke
   tekst?
4. Is er enige vorm van snelheidsbegrenzing op inlogpogingen, of leunt dat volledig op Supabase?
5. Wachtwoordregels staan puur in `lib/invite-rules.ts` voor de activatiepagina. Gelden precies
   dezelfde regels bij het wijzigen van een wachtwoord, of is dat een tweede lijst?

### 2.2 Accounts en de rolmatrix

- **Rol.** De laag boven het merk. Een account heeft leden met een rol (`admin`, `member`), een
  budgetplafond en een optionele waarde per vermelding.
- **Code.** `lib/accounts.ts`, `lib/account-editable.ts` (welke velden een klant zelf mag wijzigen),
  `lib/account-status.ts`, `lib/account-security.ts`, `app/api/accounts/[id]/route.ts`,
  `app/api/account/security/route.ts`, migraties `0046` en `0056`.
- **Afhankelijk van.** Domein 11 (het budget hangt aan het account), domein 3 (`profiles.account_id`).

**Deep dive #33 van 56.**

1. `account-editable.ts` is een handmatige lijst van wijzigbare velden. Is een nieuw accountveld
   standaard dicht of standaard open, en welke test bewaakt dat?
2. Het verschil tussen `admin` en `member` binnen een account: welke handelingen scheiden die twee
   vandaag echt, en klopt dat met wat een bureau verwacht?
3. Eén account met tien merken is het bureaumodel uit de visie. Welke schermen tonen vandaag alleen het
   actieve merk terwijl een bureau juist de vergelijking wil?
4. Het budgetplafond staat per account. Wil een bureau dat per merk kunnen verdelen, en wat zou dat
   betekenen voor `lib/spend-rules.ts`?
5. Wat gebeurt er als het laatste `admin`-lid van een account wordt verwijderd: blokkeren we dat, of
   ontstaat er een account dat niemand meer kan beheren?

### 2.3 Uitnodigingen

- **Rol.** De enige deur naar binnen zolang registratie dichtstaat. De tabel bewaart alleen de SHA-256
  van het token, nooit het token zelf.
- **Code.** `lib/invites.ts`, `lib/invite-rules.ts` (puur, draait ook in de browser voor de live
  wachtwoordcontrole), `app/api/accounts/[id]/invites/`, `app/api/invites/accept/route.ts`,
  `app/(auth)/uitnodiging/[token]`, migratie `0047` (nul RLS-policies).
- **Afhankelijk van.** Domein 2.2, domein 1 (mail staat standaard uit, zie domein 13).

**Deep dive #46 van 56.**

1. Vier eindtoestanden van een uitnodiging staan puur in `invite-rules.ts`. Is de verlooptijd een
   productbeslissing die ergens vastligt, of een constante die niemand meer bespreekt?
2. `EMAILS_ENABLED` staat standaard uit. Hoe bereikt een uitnodiging vandaag de klant dan: kopieert de
   consultant de link met de hand, en is dat het bedoelde proces?
3. Het token staat gehasht opgeslagen. Wordt het onbewerkte token ergens gelogd, in een foutmelding
   getoond, of in een e-mailonderwerp gezet?
4. Wat gebeurt er als iemand een uitnodiging accepteert met een e-mailadres dat al een account heeft:
   samenvoegen, weigeren, of stil een tweede account?
5. Kan een ingetrokken uitnodiging nog geaccepteerd worden binnen het venster tussen intrekken en
   verlopen, en welke test dekt dat af?

### 2.4 Rechten: RLS plus expliciete ownership

- **Rol.** Lezen gaat via select-only RLS op `user_id`. Schrijven gaat altijd via een route met een
  expliciete controle. Reden: RLS werkt op rijniveau en kan nooit afdwingen wélke kolom een klant mag
  wijzigen.
- **Code.** `lib/access.ts` (`getOwnedAnalysis`, `getOwnedProfile`), `lib/profiles.ts`,
  `lib/analyses.ts`, migraties `0038`, `0042`, `0046` en `0056` voor de policy-lagen.
- **Afhankelijk van.** Elk schrijfpad in de app. 44 van de 50 API-routes importeren `lib/auth.ts`.

**Deep dive #8 van 56.**

1. De drielaagse leesregel (eigen rij, accountlid, staf) staat in SQL, de schrijfregel in TypeScript.
   Bij welke tabel lopen die twee inmiddels uit de pas, en hoe zouden we dat merken zonder het
   handmatig na te lopen?
2. Er staan 50 policies over 32 tabellen met RLS aan. Welke tabellen hebben er bewust nul (`jobs`,
   `account_invites`, `staff_users`) en welke hebben er per ongeluk nul?
3. Een uitgenodigde klant kon ooit niets goedkeuren omdat de rechtencontrole zijn account niet meetelde.
   Welke route mist die accountlaag vandaag nog, en is er een test die elke route langsloopt?
4. Kan één klant via een gemanipuleerd `id` in de URL de gegevens van een ander merk opvragen? Welke
   route zou dat als eerste toelaten, en bestaat daar een test voor?
5. Staf ziet alles. Wordt ergens vastgelegd dát een stafgebruiker klantdata heeft ingezien, en willen
   we dat vastleggen voordat de eerste klant ernaar vraagt?

### 2.5 Staf, CSM-paneel en verwijderen

- **Rol.** `staff_users` bepaalt wie alles ziet. Het CSM-paneel laat zien waar we achterlopen per merk.
  Verwijderen is definitief en staat los van archiveren.
- **Code.** `lib/staff.ts`, `lib/csm.ts` (rekenkant, puur) en `lib/csm-data.ts` (queries),
  `app/(app)/beheer/`, `lib/deletion.ts` en `lib/deletion-rules.ts`.
- **Afhankelijk van.** Domein 12 (het paneel is een scherm), domein 11 (archief).

**Deep dive #41 van 56.**

1. Verwijderen raakt 39 tabellen. Hangt dat aan cascades in het schema of aan een lijst in
   `deletion.ts`, en wat gebeurt er met een tabel die na deze ronde bijkomt?
2. Welke signalen toont het CSM-paneel vandaag, en welk signaal zou het team écht op tijd waarschuwen
   dat een klant gaat opzeggen?
3. Het paneel laadt alle merken tegelijk. Bij hoeveel merken wordt dat traag, en welke query is dan de
   dure?
4. Verwijderen is onomkeerbaar. Is er een bevestiging die de naam laat intypen, en wordt er iets
   bewaard voor de boekhouding, bijvoorbeeld de kosten in `ai_calls`?
5. Wie zet iemand in `staff_users`, en is dat een handeling in de app of een query in Supabase?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| Sessie en inloggen | 54 | ~670 | Stabiel | Middel |
| Accounts en rolmatrix | 33 | ~500 | Live sinds 0046 en 0056 | **Hoog** |
| Uitnodigingen | 46 | ~400 | Live sinds 0047 | Middel |
| Rechten: RLS plus ownership | **8** | ~450 | Aangescherpt in 0042 | **Hoog**, hier zat al een fout |
| Staf, CSM en verwijderen | 41 | ~450 | Fase 8 | Middel |

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

**Deep dive #31 van 56.**

1. Alle latere stappen leunen op deze inventaris. Wat is het gedrag bij een site die volledig
   client-side rendert: valt de keten door met een lege basis, of stopt hij met een leesbare reden?
2. 150 pagina's is een plafond. Bij welk deel van de klanten wordt dat plafond geraakt, en welke
   pagina's vallen er dan af: de belangrijkste of de toevallig laatste?
3. De inventariskwaliteit is een oordeel zonder AI. Welke drempel maakt van "matige inventaris" een
   blokkade, en wat zegt het scherm de consultant op dat moment?
4. Productpagina's worden uitgesloten. Klopt die regel voor een webshop met 2.000 producten, waar juist
   de categoriepagina's het aanbod dragen?
5. Deze stap is gratis en draait één keer. Wat zou het opleveren om hem periodiek opnieuw te draaien,
   zodat een nieuwe pagina van de klant vanzelf in beeld komt?

### 3.2 Fase 1 tot 3: het onderzoek

- **Rol.** Vier AI-stappen die elkaar ketenen: profielonderzoek (merk, branche, bereik, tone-of-voice,
  concurrenten), de aanbodboom, de core topics, en het marktonderzoek.
- **Code.** `lib/pipeline/prepare-profile.ts`, `lib/pipeline/offering.ts`,
  `lib/pipeline/propose-topics.ts`, `lib/pipeline/market.ts`, `lib/pipeline/quote-check.ts` (een knoop
  zonder gecrawld citaat vervalt), `lib/pipeline/field-merge.ts` (wat een mens zette blijft staan).
- **Afhankelijk van.** Domein 5 (het model), domein 4 (de keten), domein 10 (web_search).

**Deep dive #16 van 56.**

1. `chain.ts` haalde de opvolgerelatie uit de handlers omdat een mislukte aanbodstap de halve keten
   stil liet verdwijnen. Welke andere stap draagt nog een opvolger die niet in `ONBOARDING_NEXT` staat?
2. `field-merge.ts` laat staan wat een mens zette. Op productie staat er precies één rij in
   `profile_field_sources` bij tien profielen. Betekent dat dat klanten niets corrigeren, of dat de
   herkomst niet altijd wordt weggeschreven?
3. Het bereik (`service_scope`) komt uit deze stap en draagt de hele regionale regel van de meting.
   Hoe vaak raadt het model dat verkeerd, gemeten over de merken die er nu staan?
4. Een aanbodknoop zonder gecrawld citaat vervalt. Hoeveel knopen vallen er zo af per merk, en zien we
   dat aantal ergens terug of verdwijnt het stil?
5. De onderzoeksstappen draaien met `web_search`. Wat verandert er aan de uitkomst als die uit staat,
   en is dat verschil ooit naast elkaar gelegd?

### 3.3 Fase 3b: de kennistest

- **Rol.** Wat weten AI-assistenten al over dit merk, en klopt dat? Vijf blokken (`kent`, `klopt`,
  `citeert`, `verwarring`, `categorie`). Het oordeel wordt in code geveld, nooit door het model over
  zichzelf.
- **Code.** `lib/pipeline/llm-baseline.ts`, `lib/pipeline/baseline-verdict.ts` (597 regels puur
  rekenwerk), tabel `profile_llm_baseline`, migratie `0041`.
- **Afhankelijk van.** Domein 5 (de enginelaag: dit draait per beschikbare engine).

**Deep dive #21 van 56.**

1. Het model vragen of zijn eigen antwoord klopt ging in dit project drie keer mis. Waar in de rest van
   de codebase zit dat patroon nog wel?
2. `kent` stelt zes formuleringen en levert een verhouding. Is zes genoeg om het verschil tussen "kent
   je niet" en "kent je soms" betrouwbaar te zien, en wat zegt de spreiding daarover?
3. Deze test is een momentopname bij de start. Wat zou het waard zijn om hem elk kwartaal te herhalen,
   als bewijs dat het werk van ORBIT ENGINE de kennis van het model verandert?
4. Het blok `verwarring` levert de uitsluitingslijst voor de meting. Hoe vaak levert dat een echte
   naamsverwarring op, en wat gebeurt er met een merk waarvan de naam ook een gewoon woord is?
5. De kennistest draait per engine. Wat betekent de uitkomst als OpenAI en Gemini elkaar tegenspreken,
   en welke van de twee toont het scherm dan?

### 3.4 Fase 5: synthese en dossier

- **Rol.** Alles samenbrengen tot een leesbaar dossier, een gespreksagenda en citeerbare `brand_facts`.
  De enige onboardingstap op het dure model.
- **Code.** `lib/pipeline/synthesis.ts`, `lib/pipeline/dossier.ts`, `lib/pipeline/dossier-verify.ts`,
  `lib/pipeline/factstore.ts`, `app/api/profiles/[id]/dossier/route.ts`.
- **Afhankelijk van.** Domein 8 (de feitenbank is dezelfde die content voedt).

**Deep dive #39 van 56.**

1. Alleen feiten waarvan het citaat letterlijk op de bronpagina staat komen erdoor. Hoeveel valt daarop
   af, en zien we dat cijfer ergens terug?
2. Dit is de enige onboardingstap op het dure model. Wat wordt er meetbaar slechter als hij op het
   goedkope model draait, en is dat ooit vergeleken?
3. Eén aanroep over 55.000 tekens sitetekst. Welke pagina's halen die selectie, en op welke grond
   vallen de andere af?
4. De gespreksagenda is de brug naar het verkoopgesprek. Gebruikt de consultant hem echt, of schrijft
   hij zijn eigen lijstje?
5. Wat gebeurt er met de bestaande feiten als de synthese opnieuw draait: overschrijven, opvolgen, of
   dubbel?

### 3.5 De onboardingsessie en het bijwerken

- **Rol.** Het enige stafscherm dat met de klant gedeeld wordt. De consultant vult de commerciële laag
  in (vijftien velden die per definitie niet uit een website volgen) en legt het gesprek vast. Daarna
  bepaalt `onboarding-refresh.ts` welke stappen opnieuw moeten draaien.
- **Code.** `app/(app)/merk/[id]/admin/onboarding/`, `app/(app)/merk/[id]/_components/onboarding-session.tsx`,
  `lib/pipeline/onboarding-refresh.ts`, `lib/pipeline/commercial-context.ts`,
  `lib/pipeline/intake-block.ts`, `lib/profile-source.ts`, `app/api/profiles/[id]/refresh/route.ts`.
- **Afhankelijk van.** Domein 11 (deze route kost geld), domein 4 (`chain: false` betekent: draai deze
  stap zonder de opvolgers).

**Deep dive #10 van 56.**

1. Tien van de vijftien commerciële velden leveren nul vervolgstappen op. Is die mapping getoetst tegen
   wat de stappen daadwerkelijk lezen, of tegen wat we dachten dat ze lezen?
2. Dit scherm is het hart van het sales-led model. Hoe lang duurt het invullen in de praktijk, en welk
   veld kost de meeste tijd terwijl het het minste verandert?
3. Opslaan gaat per veld met bron `gesprek`. Wat gebeurt er als de consultant tijdens het gesprek per
   ongeluk iets overschrijft: is er een geschiedenis, of is de vorige waarde weg?
4. Na het gesprek draait `refresh` de gekozen stappen opnieuw met `chain: false`. Ziet de consultant
   wanneer dat klaar is, en wat toont het scherm zolang het loopt?
5. De vijftien commerciële velden tellen niet mee in de volledigheidsmeter. Klopt dat nog, nu ze wel
   echte lezers hebben in de pijplijn?

### 3.6 Het dossier als scherm, en de volledigheid

- **Rol.** De klant leest en corrigeert wat ORBIT ENGINE vond, per veld met herkomst en zekerheid.
  De volledigheidsmeter telt de 41 klantvelden, niet de commerciële laag.
- **Code.** `app/(app)/merk/[id]/merkprofiel/`, `lib/pipeline/brand-fields.ts` (866 regels: de
  velddefinities), `lib/profile-editable.ts`, `lib/profile-meter.ts`, `lib/profile-gaps.ts`,
  `lib/profile-stage.ts`, `lib/pipeline/profile-readiness.ts`, `lib/pipeline/brand-examples.ts`.
- **Afhankelijk van.** Domein 12 (formuliercomponenten), domein 6 (werkgebied blokkeert de meting).

**Deep dive #27 van 56.**

1. `brand-fields.ts` is met 866 regels het grootste niet-contentbestand van de pijplijn. Is dat een
   registry die meegroeit met het product, of een bestand dat opgesplitst hoort te worden?
2. 41 klantvelden is veel om in te vullen. Welke velden worden in de praktijk leeg gelaten, en wat
   verliest de pijplijn daardoor concreet?
3. `profile-readiness.ts` blokkeert op "werkgebied vastgesteld". Welke andere velden verdienen die
   status van blokkerend, gemeten aan wat er misgaat als ze leeg zijn?
4. Elk veld toont herkomst en zekerheid. Begrijpt een klant het verschil tussen "AI dacht dit" en "jij
   hebt dit gezegd", of is dat vakjargon op zijn scherm?
5. Er zijn 247 branchevoorbeelden om het formulier concreet te maken. Hoe wordt bepaald welke branche
   een klant heeft, en wat ziet iemand die daarbuiten valt?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| Fase 0: ontdekken | 31 | ~900 | Draait op productie | Middel |
| Fase 1 tot 3: onderzoek | 16 | ~1.900 | Onboarding 3.0 | **Hoog** |
| Fase 3b: kennistest | 21 | ~1.230 | Multi-engine voorbereid | **Hoog** |
| Fase 5: synthese en dossier | 39 | ~900 | Duurste onboardingstap | Middel |
| Onboardingsessie en refresh | **10** | ~1.400 | Live sinds 0060, de nieuwste | **Hoog** |
| Dossierscherm en volledigheid | 27 | ~2.400 | Herzien 17 aug 2026 | Middel |

---

## 4. Job-orchestratie en cron

De motor. Zonder dit domein gebeurt er niets, letterlijk: de werker draait op pg_cron en niet op Vercel.

### 4.1 De wachtrij en haar contract

- **Rol.** 24 taaksoorten, elk met een getypte payload. Vijftien daarvan gelden als zwaar en vullen een
  werkeraanroep in hun eentje. De regel eronder: één taak is hoogstens één zware AI-aanroep.
- **Code.** `lib/jobs/types.ts` (het contract), `lib/jobs/queue.ts` (`enqueue`), `lib/jobs/dedupe.ts`,
  `lib/jobs/pending.ts`, tabel `jobs` (RLS aan, nul policies).
- **Afhankelijk van.** Alle pijplijndomeinen leveren hier hun stappen aan.

**Deep dive #24 van 56.**

1. `HEAVY_JOB_TYPES` is een handmatig onderhouden set. Wat is het gevolg als een nieuwe zware taak
   vergeten wordt: een afgekapte functie of een netjes teruggezette taak?
2. De dedupe-sleutel voorkomt dubbele inserts. Welke taaksoort heeft een sleutel die te grof is, zodat
   een tweede, wél gewenste taak stil verdwijnt?
3. `jobs` heeft nul policies, dus geen enkel scherm leest de tabel rechtstreeks. Hoe ziet iemand
   vandaag wat er in de wachtrij staat als er iets vastloopt: via de app, of via Supabase?
4. Er staan 685 rijen in `jobs` op productie. Worden afgeronde taken ooit opgeruimd, en bij welk aantal
   wordt de claim-query traag?
5. Een taak draagt zijn payload als JSON. Wat gebeurt er met een taak die in de wachtrij stond toen het
   payloadformaat veranderde: valt hij om, of draait hij met een half veld?

### 4.2 De werker en het tijdbudget

- **Rol.** Taken claimen, uitvoeren, opnieuw plannen bij een fout, en op tijd stoppen. De getallen
  hangen aan elkaar: 300 seconden routelimiet, 240 budget, 220 reservering zwaar, 115 licht, 105 per
  AI-aanroep.
- **Code.** `lib/jobs/worker.ts`, `app/api/cron/worker/route.ts`, `lib/jobs/progress.ts` (poging 2 van
  4 zichtbaar voor de klant), `reclaim_stuck_jobs` als RPC.
- **Afhankelijk van.** Domein 5 (`callBudget()` in de OpenAI-client).

**Deep dive #11 van 56.**

1. De reserveringen zijn statisch. Hebben we per taaksoort de werkelijke duur op productie, en klopt
   220 seconden nog voor de zwaarste onboardingstap?
2. De werker draait elke minuut en pakt hooguit vijf taken per ronde. Wat is de doorvoer per uur, en
   hoeveel merken kunnen tegelijk meten voordat de wachtrij achterloopt?
3. Een taak die vijf minuten op `running` blijft staan wordt teruggezet. Kan een taak die nog echt
   draait daardoor twee keer worden uitgevoerd, en welke stap zou dan dubbel betalen?
4. Vier pogingen met 2, 4, 8, 16 minuten backoff overbrugt ruim een half uur storing. Wat is de
   werkelijke faalreden van de taken die op productie definitief zijn opgegeven?
5. De klant ziet "poging 2 van 4". Is dat geruststellend of juist verontrustend, en wat ziet hij als
   poging 4 ook mislukt?

### 4.3 Ketening en falen

- **Rol.** Elke handler plant zijn opvolger in, zodat het werk aan de server hangt en niet aan een
  browsertab. Opgeven is ook een uitkomst waar de keten mee verder moet.
- **Code.** `lib/jobs/handlers.ts` (782 regels, 24 handlers), `lib/jobs/chain.ts` (de opvolgertabel,
  puur), `scheduleFollowUpAfterFailure`, `BLOCKING_JOB_TYPES` en `NON_BLOCKING_TYPES`.
- **Afhankelijk van.** Alle pijplijndomeinen.

**Deep dive #5 van 56.**

1. De Teamsessie van 18 augustus vond één stap die als niet-blokkerend gold terwijl hij de halve keten
   droeg. Loop de andere 23 taaksoorten langs met dezelfde vraag: wat hangt er achter deze stap, en
   klopt zijn blokkerend-oordeel daarmee?
2. `handlers.ts` is 782 regels met 24 handlers en is de plek waar elk domein samenkomt. Is dat nog het
   juiste formaat, of vraagt dit om een handler per bestand met één gedeelde vorm?
3. Als een keten halverwege stilvalt, wie merkt dat dan als eerste: een alarm, het CSM-paneel, of de
   klant die belt?
4. Elke handler plant zijn opvolger ná zijn eigen werk. Wat gebeurt er als het inplannen zelf faalt
   nadat het dure werk al gedaan is?
5. Welke ketens bestaan er eigenlijk allemaal (onboarding, meting, rapport, content, impact), en staat
   dat ergens als één plaat, of moet je het uit 24 handlers afleiden?

### 4.4 De vier cron-ingangen

- **Rol.** Werker (elke minuut, pg_cron), maandelijkse meetronde (Vercel), rapportmail (Vercel, nu uit
  `vercel.json`), en de dagelijkse schrijfronde plus zoekdata-synchronisatie (pg_cron).
- **Code.** `app/api/cron/{worker,tracking,reminders,plan}/route.ts`, migraties `0015`, `0050` en
  `0059`, plus de twee vault-geheimen.
- **Afhankelijk van.** Domein 9 (de schrijfronde), domein 10 (Search Console), domein 11 (het archief
  filtert gearchiveerd werk weg, en dat is de dure).

**Deep dive #47 van 56.**

1. Zonder de twee vault-geheimen slaat `trigger_worker()` stil over: geen fout in de logs, maar ook
   geen enkele taak. Is er een alarm dat dat merkt, of merken we het aan een klant die belt?
2. De meetronde draait op de eerste van de maand om 06:00 UTC voor álle merken tegelijk. Wat doet dat
   met de wachtrij die ochtend, en zou spreiding over de maand beter zijn?
3. De rapportmail-cron staat uit `vercel.json` maar de route bestaat nog. Blijft dat zo, of hoort daar
   een besluit bij?
4. Het Hobby-plan van Vercel staat twee dagelijkse taken toe en dat is de reden dat de werker op
   pg_cron draait. Wat verandert er als het plan omhoog gaat, en is dat het waard?
5. Alle drie de cron-routes eisen hetzelfde `CRON_SECRET`. Wat gebeurt er als dat geheim ooit uitlekt,
   en hoe snel kunnen we het roteren zonder de werker stil te leggen?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| Wachtrij en contract | 24 | ~700 | Stabiel, 24 taaksoorten | **Hoog** |
| Werker en tijdbudget | **11** | ~500 | Reclaim wordt gelogd sinds aug 2026 | **Hoog** |
| Ketening en falen | **5** | ~850 | Hersteld na Teamsessie 18 aug 2026 | **Hoog** |
| Cron-ingangen | 47 | ~350 | Vier ingangen, twee platforms | Middel |

---

## 5. AI-laag

De enige plek die met OpenAI praat, plus de enginelaag die voorbereid is op een tweede aanbieder.

### 5.1 Client, budget en retries

- **Rol.** Eén aanroep met een timeout van 100 seconden en een totaalbudget van 105 over alle pogingen
  heen, als `AbortSignal`. Zonder dat totaalbudget was de echte bovengrens vier keer de timeout.
- **Code.** `lib/openai/client.ts`, `lib/openai/structured.ts` (structured output plus het vangnet dat
  `temperature` uitzet als de API hem weigert).
- **Afhankelijk van.** Domein 4 (de reserveringen in de werker hangen aan deze getallen).

**Deep dive #20 van 56.**

1. Het vangnet zet `temperature` voor de rest van het proces uit. Is dat proces één request, één
   werkeraanroep, of een modulevariabele die blijft hangen tot de volgende deploy?
2. Wat gebeurt er als een structured-outputaanroep een antwoord teruggeeft dat niet door het Zod-schema
   komt: opnieuw proberen, laten vallen, of een halve rij wegschrijven?
3. Er staan 93 lege `catch {}`-blokken in `lib` en `app`. Welke daarvan slikken een AI-fout die we
   eigenlijk hadden willen zien?
4. De timeout van 100 seconden is krap voor een aanroep die ook nog `web_search` doet. Hoe vaak wordt
   die timeout op productie geraakt, en bij welke taaksoort?
5. Wordt er ergens gemeten hoe lang een aanroep duurde, of kennen we alleen de kosten en niet de tijd?

### 5.2 Modellen en redeneerinspanning

- **Rol.** Drie tiers vast in code, geen env-variabele. De keuze zit niet meer in het model maar in de
  redeneerinspanning per soort werk: aanroepplekken geven `work: "analytical"` op, niet een temperatuur.
- **Code.** `lib/openai/models.ts`, `lib/openai/sampling.ts` (`resolveTuning()`).
- **Afhankelijk van.** Elke AI-aanroep in domein 3, 6, 7 en 8.

**Deep dive #40 van 56.**

1. De effortstanden staan laag omdat een aanroep binnen 100 seconden moet passen. Wat wint een stap als
   de effort omhoog gaat, en welke stap zou dat als eerste verdienen?
2. `volume` en `quality` wijzen naar hetzelfde model. Verdient dat onderscheid nog twee namen, of is
   dat inmiddels een dode knop die verwarring oplevert?
3. Modellen staan vast in code, bewust niet in env. Hoeveel werk is een modelwissel vandaag, en hoe
   zouden we oud en nieuw naast elkaar meten voordat we omgaan?
4. `creative` gebruikt temperatuur 0,8 bij promptgeneratie omdat redeneren de vragen juist gelijkvormig
   maakt. Is dat gemeten, of is het een aanname uit één observatie?
5. Waar hangt het risico als OpenAI de regel rond `temperature` opnieuw aanscherpt, en welke stap valt
   dan als eerste om?

### 5.3 Contracten (Zod)

- **Rol.** Zeventien schema's die vastleggen wat een model terug mág geven. Structured output kiest bij
  twijfel de eerste enumwaarde, dus het schema is geen documentatie maar een poort.
- **Code.** `lib/schemas/` (17 bestanden: `mention`, `profile`, `report`, `content-piece`,
  `gap-analysis`, `fact-atoms`, `claim-audit`, en tien meer).
- **Afhankelijk van.** Domein 6 en 8 leunen er het zwaarst op.

**Deep dive #23 van 56.**

1. Bij tien van 27 niet-genoemde merken vulde het model tóch een rol in. Welke andere enums in deze
   zeventien schema's hebben nog geen deterministisch vangnet in code?
2. Welke velden zijn optioneel in het schema maar worden in de code als aanwezig behandeld?
3. Elk schema legt een vorm vast, geen betekenis. Waar accepteren we een geldig gevormd antwoord dat
   inhoudelijk onmogelijk is, bijvoorbeeld een positie hoger dan het aantal genoemde merken?
4. Als een schema verandert, hoe blijft de ruwe JSON van oude aanroepen dan leesbaar? De app bewaart
   alles, maar leest ze ook iemand terug?
5. Welk schema is het grootst, en dwingt dat het model in één aanroep te veel tegelijk te doen?

### 5.4 Enginelaag

- **Rol.** Een engine doet mee als er een sleutel voor is én hij op het profiel aanstaat. De doorsnede,
  niet de wens. Gemini is aangesloten maar slaapt zonder sleutel.
- **Code.** `lib/engines/{types,openai,gemini,registry,label}.ts`, `profiles.engines_enabled`,
  migratie `0041`.
- **Afhankelijk van.** Domein 6 (de meting draait per engine), domein 3.3 (de kennistest ook).

**Deep dive #51 van 56.**

1. De idempotentie-index van `tracking_runs` bevat de engine. Wat gebeurt er met de vergelijkbaarheid
   van periodes zodra Gemini aan gaat: telt die mee in dezelfde score, of komt er een tweede score?
2. Wat is de zakelijke reden om een tweede engine aan te zetten: vragen klanten erom, of is het een
   technische ambitie die nog geen vraag heeft?
3. De enginelaag is gebouwd rond de aanname dat elke engine hetzelfde soort antwoord geeft. Waar breekt
   die aanname bij een aanbieder zonder `web_search` of zonder structured output?
4. Kosten worden per engine gelogd. Kan het budgetplafond straks per engine verschillen, of is dat één
   pot?
5. Als een engine halverwege een meetronde uitvalt, wat is dan de uitkomst: een halve periode, of een
   periode die netjes zonder die engine wordt afgerond?

### 5.5 Kostenlogboek

- **Rol.** Eén rij per aanroep in `ai_calls`: model, tokens, geschatte kosten, soort, analyse en profiel.
  Meer dan vijftig verschillende soorten aanroepen worden apart gelabeld.
- **Code.** `lib/openai/ledger.ts`, `lib/openai/pricing.ts`, `app/api/analyses/[id]/costs/route.ts`.
- **Afhankelijk van.** Domein 11 (het budgetplafond leest deze tabel).

**Deep dive #29 van 56.**

1. De kosten zijn geschat uit tarieven in code. Hoe vaak wijkt dat af van de factuur, en wie merkt het
   als OpenAI een tarief verandert?
2. Er staan 1331 rijen in `ai_calls` op productie. Wat kost een gemiddelde klant per maand, en hoe
   verhoudt zich dat tot wat hij betaalt?
3. Wordt een mislukte aanroep ook gelogd? Een timeout na 100 seconden kan tokens hebben gekost zonder
   bruikbaar antwoord.
4. Het kostenscherm zit per analyse. Waar ziet iemand het totaal per merk, per account en per maand,
   en is dat hetzelfde getal dat het budgetplafond gebruikt?
5. Een meetronde kostte gemiddeld $0,855 met een uitschieter naar $1,562. Wat verklaart die spreiding
   per merk, en is dat te voorspellen vóór het starten?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| Client, budget, retries | **20** | ~600 | Stabiel | **Hoog** |
| Modellen en sampling | 40 | ~300 | GPT-5.6-familie sinds aug 2026 | Middel |
| Zod-contracten | 23 | ~800 | 17 schema's | Middel |
| Enginelaag | 51 | ~400 | Gemini slaapt | Laag |
| Kostenlogboek | 29 | ~200 | Nagerekend 17 aug 2026 | Middel |

---

## 6. Meetmachine

Het hart van het product: van dertig vragen naar één score met een onzekerheidsband.

### 6.1 Promptgeneratie en verdeling

- **Rol.** Standaard tien vragen per funnelfase, per analyse instelbaar tussen 0 en 40 met een maximum
  van 90. Eén taak per fase, sinds een gezamenlijke taak op productie 228 van de 300 seconden vulde.
- **Code.** `lib/pipeline/prompts.ts`, `lib/prompt-mix.ts`, `app/api/analyses/[id]/prompts/`,
  migratie `0054`.
- **Afhankelijk van.** Domein 5 (`work: "creative"`, effort none met temperatuur 0,8).

**Deep dive #14 van 56.**

1. De vragen bepalen wat er gemeten wordt en daarmee de hele score. Is er ooit gecontroleerd of de
   dertig vragen van een merk overeenkomen met wat zijn klanten écht aan een AI-assistent vragen, of
   toetsen we alleen op vorm?
2. Nul is een geldige keuze per fase en dat is overal expliciet afgehandeld, zonder `??`. Waar in de
   rest van de app rekent een `??` een geldige nul nog weg?
3. Vragen zijn merk- en concurrentneutraal geformuleerd. Hoe wordt dat afgedwongen, en wat gebeurt er
   met een vraag die de klant zelf toevoegt met zijn eigen merknaam erin?
4. De klant mag vragen bewerken vóór de goedkeuringspoort. Hoeveel klanten doen dat, en wat veranderen
   ze het vaakst: dat is gratis onderzoek naar wat wij verkeerd voorstellen.
5. 403 vragen staan er op productie over 14 analyses. Welke daarvan leverden in drie meetrondes nooit
   één merk op, en zouden die niet automatisch moeten afvallen ten gunste van winbare vragen?

### 6.2 De regionale poort

- **Rol.** Staat het bereik op lokaal en zijn er regio's bekend, dan moet élke vraag regionaal zijn.
  Niet een deel, alle. Bij het enige merk met drie meetronden leverden 57 landelijke metingen nul
  vermeldingen op, tegen score 28 op de tien regionale vragen.
- **Code.** `lib/pipeline/geo-share.ts`, `regionGateMessage()`, bijvulronden in `prompts.ts`,
  `lib/pipeline/profile-readiness.ts` (zonder bereik is het dossier niet af).
- **Afhankelijk van.** Domein 3 (`profiles.service_scope`). De hele regel hangt aan dat ene veld.

**Deep dive #3 van 56.**

1. De hele regel hangt aan `service_scope`. Hoe vaak staat dat veld verkeerd of leeg bij de merken die
   er nu staan, en wat was in die gevallen de score die we de klant hebben laten zien?
2. Handmatig toevoegen gaat door dezelfde poort. Geldt dat ook voor het dupliceren of importeren van
   vragen tussen analyses, als dat er ooit komt?
3. Lokaal is vandaag binair. Wat doen we met een merk dat in drie provincies werkt maar landelijk
   levert, of met een webshop met één fysieke winkel?
4. Wat er landelijk overblijft na drie bijvulronden wordt geschrapt. Hoe vaak gebeurt dat, en hoeveel
   vragen houdt zo'n merk dan over: is de onzekerheidsband dan nog uit te leggen?
5. Dezelfde logica geldt niet voor een landelijk merk in een niche. Bestaat er een tweede categorie
   onwinbare vragen die we nog niet afvangen, bijvoorbeeld vragen over een dienst die het merk niet
   levert?

### 6.3 De meting zelf

- **Rol.** Per vraag een gesimuleerd AI-antwoord (3a, met web_search) en daarna een beoordeling per
  entiteit (3b). Los herhaalbaar: een mislukte 3b draait nooit opnieuw de dure 3a.
- **Code.** `lib/pipeline/measure.ts` (1052 regels), `lib/openai/mention-prompt.ts`,
  `lib/pipeline/answers.ts`, `lib/pipeline/position.ts`, tabellen `tracking_runs` en
  `tracking_run_mentions`.
- **Afhankelijk van.** Domein 5, domein 4 (één taak per vraag), domein 11 (98,8 procent van de kosten
  van een ronde zit in 3a).

**Deep dive #1 van 56.**

1. Er is precies één kostenknop die telt: `web_search` bij het stellen van de vraag, goed voor 98,8
   procent van een meetronde. Wat verliezen we meetbaar als die voor een deel van de vragen uit gaat,
   en is dat ooit naast elkaar gelegd op echte data?
2. De meting simuleert wat een AI-assistent zou antwoorden. Hoe goed komt dat overeen met wat ChatGPT
   op dat moment écht antwoordt, en wanneer is die vergelijking voor het laatst gemaakt?
3. De mention-classificatie is de tweede stap en er is een eval voor (`npm run eval:mention`). Wat is
   de laatst gemeten accuratesse, en op hoeveel gevallen?
4. `measure.ts` is 1052 regels en bevat zowel de meting als de aggregatie. Waar loopt de naad om die
   twee te scheiden, en wat wint de ketentest daarmee?
5. Een meting is een momentopname van een model dat verandert. Hoe scheiden we "het merk werd
   zichtbaarder" van "het model is geüpdatet", en zou een vast controlemerk in elke ronde dat verschil
   kunnen tonen?

### 6.4 Gelaagd hermeten en aggregatie

- **Rol.** De acht zwaarste vragen worden drie keer gemeten. Alle aggregatie telt per vraag, met gewicht
  één gedeeld door het aantal metingen van die vraag, zodat herhaalde vragen niet zwaarder gaan wegen.
- **Code.** `lib/pipeline/question-share.ts`, `lib/pipeline/prompt-weight.ts`,
  `lib/pipeline/periods.ts`, `lib/stats/uncertainty.ts`, tabel `visibility_scores`, migratie `0031`.
- **Afhankelijk van.** Domein 7 (de rapportage leest deze cijfers).

**Deep dive #2 van 56.**

1. De aggregatiestap van `measure.ts` heeft geen ketentest, en juist daar hangt alles aan: de score,
   de rangordetabel en de citatietelling. Wat kost het om dat gat te dichten, en welk scenario dekt het
   als eerste af?
2. De onzekerheidsband is plus of min 16,4 punten bij 30 vragen. Communiceren we die band overal even
   hard, of alleen op het scherm waar hij ontworpen is?
3. Een score is een aandeel over winbare vragen, terwijl concurrenten over alle gemeten vragen worden
   geteld. Die twee noemers staan nu naast elkaar op één scherm. Is dat na de rangordetabel nog steeds
   uitlegbaar aan een klant?
4. Drie herhalingen op acht vragen: is dat de juiste verdeling? Wat zegt de gemeten spreiding over hoe
   veel herhalingen er nodig zijn om een echte verandering van ruis te scheiden?
5. Als een klant zijn vragenset wijzigt tussen twee periodes, is de score dan nog vergelijkbaar? Wordt
   dat ergens gemarkeerd in de trendlijn?

### 6.5 Entiteiten en concurrenten

- **Rol.** Voorkomen dat "Coolblue", "coolblue.nl" en "Coolblue B.V." drie partijen worden. Daarna per
  concurrent destilleren wáárom die genoemd wordt, met letterlijk citaat als bewijs.
- **Code.** `lib/entities/normalize.ts` en `resolve.ts`, `lib/pipeline/classify-entities.ts`,
  `lib/pipeline/competitor-intel.ts`, `lib/pipeline/brand-rankings.ts`, tabellen `entities` en
  `competitor_breakdown`.
- **Afhankelijk van.** Domein 5, domein 12 (de rangordetabel is een scherm).

**Deep dive #19 van 56.**

1. `citesOwnSite()` telt een citatie mee zodra het domein op de merknaam lijkt. Een concurrent met een
   domeinnaam die niets met zijn merk te maken heeft wordt gemist. Hoe vaak komt dat voor in de 713
   entiteiten die er nu staan?
2. Zou het opslaan van een domein per concurrent dat probleem in één keer oplossen, en waar zou dat
   domein vandaan komen: uit de meting zelf, of uit het marktonderzoek?
3. Er staan 713 entiteiten tegenover 10 merken. Hoeveel daarvan zijn duplicaten die de normalisatie
   niet ving, en wat kost het om dat te meten?
4. Een merknaam die ook een gewoon woord is (een plaats, een dienst) levert valse treffers. Welke
   controle vangt dat vandaag af, en werkt die ook bij een naam van één woord?
5. De concurrentdestillatie draait per periode en levert eigenschappen met citaat. Blijven die
   eigenschappen stabiel over periodes, of vertelt elke maand een ander verhaal over dezelfde
   concurrent?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| Promptgeneratie en verdeling | **14** | ~800 | Drie taken sinds 12 aug 2026 | Middel |
| Regionale poort | **3** | ~300 | Hangt aan één veld | **Hoog** |
| De meting | **1** | ~1.400 | 98,8% van de kosten | **Hoog** |
| Hermeten en aggregatie | **2** | ~900 | Ketentest dekt aggregatie niet | **Hoog** |
| Entiteiten en concurrenten | **19** | ~1.300 | Live sinds 0058 | Middel |

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

**Deep dive #17 van 56.**

1. De structurele gaten zijn de enige invoer die niet reactief is. Is dat de plek waar de visie
   (kansen zelf ontdekken) begint, en wat zou de volgende niet-reactieve invoer zijn?
2. `stripped_claims_json` bewaart elke zin die de claimvalidator schrapte. Hoeveel zinnen zijn dat per
   rapport, en welk soort bewering sneuvelt het vaakst? Dat is een directe meting van waar het model
   overdrijft.
3. Het rapport wordt gelezen door een ondernemer. Is er ooit getoetst of hij eruit haalt wat wij
   bedoelen: welke actie onderneemt hij na het lezen?
4. 899 regels voor het rapport plus een aparte gap-analyse. Wat zou er misgaan als die twee AI-stappen
   samengevoegd worden, en wat won de splitsing oorspronkelijk?
5. Een rapport per periode per analyse: een klant met acht onderwerpen krijgt acht rapporten. Wil hij
   dat, of wil hij er één over zijn merk?

### 7.2 Periodeverschil en trend

- **Rol.** Het model verwoordt het verschil, het berekent het niet. Dat ging eerder mis.
- **Code.** `lib/pipeline/period-change.ts`, `period-change-format.ts`, `lib/pipeline/trend.ts`,
  `components/trend-chart.tsx`, `components/sparkline.tsx`.
- **Afhankelijk van.** Domein 6, domein 12.

**Deep dive #42 van 56.**

1. Wanneer is een verandering betekenisvol genoeg om te mailen? Die drempel bepaalt ook of de klant
   iets hoort, en hij staat nu in code zonder dat iemand hem periodiek toetst.
2. Een verschil binnen de onzekerheidsband is geen verschil. Toont de trendlijn die band, of tekent hij
   ruis als een beweging?
3. Bij twee meetpunten is er nog geen trend. Wat toont het scherm in maand één en maand twee, en klopt
   dat met wat de klant verwacht na zijn eerste meting?
4. De grafiekcomponent is 448 regels. Hoeveel daarvan is berekening die eigenlijk in een pure module
   thuishoort, waar een test hem kan raken?
5. Wat gebeurt er in de trendlijn als een periode is overgeslagen, bijvoorbeeld omdat het budget op was?

### 7.3 Inzichten, kansen en opbrengst

- **Rol.** Drie zinnen over wat er deze periode gebeurde, een kansenlijst met een actie erachter, en het
  opbrengstblok dat aantallen toont zolang er geen waarde per vermelding is ingevuld.
- **Code.** `lib/insights.ts` en `insights-data.ts`, `lib/opportunities.ts`, `lib/milestones.ts` en
  `milestones-data.ts`, `lib/dashboard.ts`, `components/milestones-block.tsx`.
- **Afhankelijk van.** Domein 2 (`accounts.value_per_mention_eur`), domein 6.

**Deep dive #35 van 56.**

1. Deze blokken zijn bewust geen AI-aanroep. Waar ligt de grens: welk blok zou echt beter worden van
   een model, en welk blok wordt daar alleen maar vager van?
2. Het opbrengstblok toont aantallen tot iemand een waarde per vermelding invult. Bij hoeveel accounts
   staat die waarde ingevuld, en wat houdt de rest tegen?
3. De kansenlijst zegt wat er te winnen is. Hoe vaak volgt de klant die op, en meten we dat verschil
   tussen voorgesteld en gedaan?
4. Drie zinnen per periode is een strak keurslijf. Welke situatie past er niet in, en wat toont het
   scherm dan?
5. `lib/dashboard.ts` bracht alles samen omdat een klant met drie analyses geen enkel overzicht had.
   Klopt die aanname nog nu er een merkoverzicht is, of doen die twee schermen nu hetzelfde?

### 7.4 Potentiescore en werkmodel

- **Rol.** Drie getallen van 0 tot 100 die zeggen waar het meeste te winnen is, herberekend over alle
  onderwerpen van een merk tegelijk. Plus één werkmodel dat de vijf soorten "werk" uit de app samenbrengt.
- **Code.** `lib/potential.ts` en `potential-data.ts`, `lib/pipeline/search-demand.ts`, `lib/work.ts`,
  `lib/activity.ts`, taaksoort `recalculate_potential`, migratie `0057`.
- **Afhankelijk van.** Domein 4, domein 9 (het plan gebruikt de potentie voor de volgorde).

**Deep dive #25 van 56.**

1. De herberekening hangt aan het eerste rapport van een analyse. Wat gebeurt er met de
   vergelijkbaarheid als een merk er een onderwerp bij krijgt: verschuift dan de hele schaal, en ziet
   de klant dat zijn cijfers veranderden zonder dat hij iets deed?
2. Zoekvolume is relatief gekalibreerd in drie banden. Hoe verhoudt die schatting zich tot de echte
   cijfers uit Search Console voor de merken die gekoppeld zijn?
3. De potentiescore bepaalt de volgorde van het contentplan. Is die volgorde ooit achteraf getoetst:
   leverden de hoog scorende onderwerpen ook echt het meeste op?
4. `lib/work.ts` bracht vijf statusmachines terug tot één. Zijn er sindsdien nieuwe soorten werk
   bijgekomen die er weer buiten vallen?
5. Drie getallen van 0 tot 100 nodigen uit tot vergelijken tussen merken. Mag dat, of is de schaal per
   merk en zou het scherm dat moeten zeggen?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| Gap-analyse en rapport | **17** | ~1.600 | Claimvalidator actief | **Hoog** |
| Periodeverschil en trend | 42 | ~500 | Stabiel | Laag |
| Inzichten, kansen, opbrengst | 35 | ~1.100 | Fase 5 en 6 | Middel |
| Potentie en werkmodel | 25 | ~900 | Live sinds 0057 | Middel |

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

**Deep dive #18 van 56.**

1. Er staan 84 feiten en 93 feitverzoeken op productie, tegenover nul merkdocumenten. Klanten plakken
   dus geen brontekst. Ligt dat aan het scherm, aan het moment waarop we het vragen, of aan de vraag
   zelf?
2. `superseded_by` in plaats van overschrijven betekent dat de bank groeit. Wat is het leesprofiel bij
   een merk met een paar honderd feiten, en is dat al gemeten?
3. Een feit heeft een `fact_key` als identiteit. Wie bepaalt die sleutel, en wat gebeurt er als het
   model voor hetzelfde feit twee keer een andere sleutel kiest?
4. Feiten hebben een houdbaarheid die nergens staat: een prijs uit maart is in september mogelijk
   onjuist. Zou een feit een vervaldatum moeten dragen?
5. De feitenbank is de enige rem op verzonnen content. Wat gebeurt er als de bank te dun is: schrijft
   de pijplijn dan minder, of schrijft hij vager?

### 8.2 Briefing

- **Rol.** Feitenkaart bouwen, claim-audit draaien, en maximaal acht vragen aan de klant stellen. Eén
  slot is gereserveerd voor de positioneringsvraag.
- **Code.** `lib/pipeline/briefing.ts` (620 regels), `briefing-select.ts` (472),
  `app/(app)/analyses/[id]/briefing/`, `app/api/analyses/[id]/briefing/route.ts`.
- **Afhankelijk van.** Domein 11 (betaalde route), domein 7 (de aanbevelingen uit het rapport).

**Deep dive #26 van 56.**

1. Acht vragen per batch is een productkeuze. Wat is de gemeten beantwoordingsgraad van de 93 verzoeken
   die er staan, en zakt die bij acht harder in dan bij vier?
2. De briefing is de plek waar het werk stilvalt als de klant niets doet. Wat gebeurt er na een week
   stilte: een herinnering, doorschrijven met minder feiten, of blijft het staan?
3. Eén slot is gereserveerd voor de positioneringsvraag. Levert die vraag ander materiaal op dan de
   rest, en zien we dat terug in de tekst?
4. Kan de consultant de vragen namens de klant beantwoorden tijdens het gesprek, en wordt de herkomst
   daarvan dan vastgelegd?
5. De briefing draait één keer per batch pagina's. Wat als een klant halverwege een pagina toevoegt:
   nieuwe briefing, of doorschrijven op de oude?

### 8.3 Schrijven en herschrijven

- **Rol.** Vier stappen: schrijven op het dure model, kritiek op het goedkope, herschrijven, herbeoordelen.
  Uitsluitend binnen bevestigde feiten, met per bewering het feit dat hem dekt.
- **Code.** `lib/pipeline/content.ts` (1710 regels, het grootste bestand van de codebase),
  `lib/pipeline/source-analysis.ts`, `lib/pipeline/tone-sliders.ts`, `lib/pipeline/structured-data.ts`,
  `lib/schema-jsonld.ts`, taaksoorten `content_draft` en `content_revise`.
- **Afhankelijk van.** Domein 5 (het dure model), domein 3 (tone-of-voice, taboewoorden, auteur).

**Deep dive #4 van 56.**

1. 1710 regels in één bestand met vier modelaanroepen erin. Waar loopt de naad om dit te splitsen, en
   welke test dekt die naad vandaag af?
2. De herschrijfronde verdubbelt de kosten van de duurste stap. Hoeveel beter wordt de tekst gemeten
   aan `quality_score` en `geo_score`, en is dat bij elk paginatype hetzelfde?
3. Er staan 35 contentstukken op productie. Hoeveel daarvan zijn ook echt gepubliceerd, en wat is de
   afvalgrond bij de rest?
4. De tekst moet klinken naar het merk (tone-of-voice, taboewoorden, auteur). Is er ooit een klant
   gevraagd of de tekst inderdaad als de zijne leest, of toetsen we alleen op regels?
5. Het schrijven leunt op `web_search` als vangnet bij minder dan drie bewijspunten. Hoe vaak springt
   dat vangnet aan, en levert het dan bronnen op die de claimvalidator daarna weer schrapt?

### 8.4 De twee poorten

- **Rol.** `checkContentGate()` doet zeven GEO-checks en voedt de `geo_score`. `checkQuality()` doet
  duplicatie en leesbaarheid en voedt alléén `needs_review`, want anders was de score van vorige maand
  onvergelijkbaar met die van vandaag.
- **Code.** `lib/pipeline/content-gate.ts` (638 regels), `similarity.ts` (Jaccard op vijfgrammen),
  `readability.ts`, `checkTabooWords()`.
- **Afhankelijk van.** Domein 3 (`taboo_phrases`, `compliance_notes`).

**Deep dive #7 van 56.**

1. De scheiding tussen "telt mee in de score" en "vraagt een mens" is de kern van de vergelijkbaarheid
   over tijd. Welke nieuwe check zou aan welke kant horen, en wie beslist dat?
2. De zeven GEO-checks zijn onze definitie van goede GEO-content. Wanneer zijn die voor het laatst
   getoetst aan wat AI-assistenten daadwerkelijk citeren, en welke check zou als eerste sneuvelen?
3. Hoeveel pagina's komen er door de poort zonder `needs_review`, en hoeveel keurt een mens daarna
   alsnog af? Dat verschil zegt of de poort de juiste dingen meet.
4. De duplicatiecheck werkt met Jaccard op vijfgrammen. Vangt die ook de zesde pagina over hetzelfde
   onderwerp met andere woorden, of alleen letterlijke overlap?
5. De taboewoorden komen uit het merkprofiel. Wat gebeurt er als een klant die lijst uitbreidt nadat er
   al twintig pagina's zijn geschreven: worden die opnieuw gecontroleerd?

### 8.5 Versies, bewerken en exporteren

- **Rol.** De contentdetailpagina is ook een bewerkoppervlak. Versiebeheer per analyse en titel, met een
  verschil op woordniveau, een FAQ die de klant zelf mag wijzigen, en een export die het CMS van de klant
  volgt.
- **Code.** `lib/pipeline/content-diff.ts`, `content-export.ts` (Gutenberg-blokken bij WordPress),
  `version-reason.ts`, `slug.ts`, `lib/library.ts`, `app/(app)/analyses/[id]/bibliotheek/[pieceId]/`,
  `components/version-diff.tsx`, `components/faq-editor.tsx`.
- **Afhankelijk van.** Domein 3.1 (het sjabloonfacet uit de crawl), domein 12.

**Deep dive #15 van 56.**

1. De export volgt het herkende CMS. Publicatie via het CMS zelf bestaat nog niet, terwijl de
   merkstrategie hem wel belooft. Wat is de kleinste stap die dat gat dicht: een WordPress-plug-in, een
   koppeling via de REST-API, of iets anders?
2. Hoeveel tijd kost het een klant vandaag om één pagina van export naar live te brengen, gemeten en
   niet geschat? Dat getal is de waarde van die koppeling.
3. De sjabloondetectie herkent vijf CMS'en. Welk deel van de klanten valt op `onbekend`, en krijgen die
   dan iets bruikbaars?
4. De klant mag de FAQ bewerken, en de route herbouwt daarna de JSON-LD. Welke andere delen van de
   pagina zou hij willen bewerken, en wat breekt er als hij dat mag?
5. Versies stapelen per titel. Wat ziet een klant met vijf versies van dezelfde pagina, en is duidelijk
   welke er live staat?

### 8.6 Publiceren en effect meten

- **Rol.** De klant vult de live-URL in, de app verifieert dat de pagina er echt staat, en daarna volgen
  hermeetgolven met een statistisch verdict.
- **Code.** `lib/pipeline/publish.ts`, `publish-check.ts`, `impact.ts`, `impact-math.ts`,
  tabel `content_impact`, taaksoorten `verify_publication`, `measure_impact`, `compute_impact`.
- **Afhankelijk van.** Domein 6 (de hermeting is dezelfde meting met een ander doel), domein 10 (GSC
  levert het zoekverkeer ernaast).

**Deep dive #12 van 56.**

1. Er staat één rij in `content_impact` op productie tegenover 35 contentstukken. De hele
   bewijsketen van het product hangt hieraan: waarom komt er zo weinig doorheen, ligt dat aan
   publicatie, aan de golven, of aan de drempel voor een verdict?
2. Het verdict kent `te_weinig_data` als uitkomst. Hoe vaak is dat de uitkomst, en wat vertellen we de
   klant dan zonder de indruk te wekken dat er niets gebeurd is?
3. Hoeveel hermetingen kost één impactmeting, en weegt dat op tegen wat het aantoont? Dit is na de
   gewone meting de tweede kostenpost.
4. Een gepubliceerde pagina wordt geverifieerd. Wat als de klant hem later wijzigt of offline haalt:
   merken we dat, of blijft de impactmeting doorlopen op een pagina die er niet meer is?
5. Effect meten leunt op vergelijking met controlevragen. Zijn die controlevragen goed gekozen, en zou
   een klant het verschil begrijpen als we het hem uitleggen?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| Feitenbank | **18** | ~1.400 | Live sinds 0035 en 0036 | Middel |
| Briefing | 26 | ~1.100 | Betaalde route | Middel |
| Schrijven en herschrijven | **4** | ~1.900 | Grootste bestand | **Hoog** |
| De twee poorten | **7** | ~1.100 | Deterministisch | **Hoog** |
| Versies, bewerken, export | **15** | ~1.100 | Content-editie aug 2026 | Middel |
| Publiceren en impact | **12** | ~600 | CMS-koppeling ontbreekt | Middel |

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

**Deep dive #32 van 56.**

1. Er staan 264 geplande pagina's tegenover 35 geschreven stukken. Loopt het plan vooruit op wat de
   pijplijn aankan, en wat betekent dat voor de verwachting die de klant heeft?
2. De volgorde binnen een maand is bewust niet slepen. Blijft dat houdbaar als een bureau met tien
   merken het plan wil bijsturen?
3. Twaalf maanden vooruit plannen op basis van cijfers van vandaag. Wanneer wordt een plan uit maand
   één ongeldig, en herplant het systeem dan zelf?
4. Goedkeuring gaat per maand. Wat gebeurt er als een klant maand drie goedkeurt maar maand twee niet?
5. Buffers per maand: waar zijn die voor bedoeld, en worden ze in de praktijk gebruikt of blijven ze
   leeg?

### 9.2 De schrijfronde

- **Rol.** De route plant, de werker schrijft. Wat er niet geschreven kan worden telt hij apart en
  verzwijgt hij niet: schrijven leunt op een gemeten analyse, en bij één klant hadden zes van de acht
  onderwerpen er nog geen.
- **Code.** `lib/plan-writing.ts` (`writeDecision`), `app/api/cron/plan/route.ts`, `plannedPageId` in
  de payload van `content_draft`, migratie `0050`.
- **Afhankelijk van.** Domein 8 (de schrijfpijplijn), domein 4 (de werker), domein 11 (het plafond).

**Deep dive #13 van 56.**

1. Dit is de enige stap waarin ORBIT ENGINE vandaag zelfstandig werk begint. Wat is er nodig om die
   autonomie uit te breiden naar de volgende stap uit `docs/visie.md`, en wat houdt ons tegen: techniek,
   vertrouwen, of kosten?
2. `plannedPageId` is de brug tussen plan en pijplijn. Zonder dat veld blijft een pagina op "bezig"
   staan tot iemand het opmerkt. Welke andere terugmeldingen in de app missen zo'n brug?
3. Bij één klant konden zes van de acht onderwerpen niet geschreven worden omdat er geen meting was.
   Hoe vaak komt dat voor, en zou het systeem die meting dan zelf moeten inplannen?
4. De ronde draait dagelijks om 04:00 UTC en schrijft wat binnen tien dagen moet staan. Waar komt tien
   vandaan, en wat gebeurt er bij een piek van twintig pagina's op één dag?
5. De ronde start werk dat geld kost zonder dat er op dat moment een mens kijkt. Welke rem geldt daar,
   en wat gebeurt er als het maandplafond midden in de ronde wordt geraakt?

### 9.3 Statustaal en bulkacties

- **Rol.** De status van een geplande pagina in drie talen tegelijk: technisch, leesbaar, en wie er aan
  zet is. Plus "markeer alles als geplaatst" met een eerlijke deelmelding.
- **Code.** `lib/plan-status.ts`, `lib/plan-bulk.ts`, `app/(app)/merk/[id]/strategie/plan/plan-view.tsx`
  (663 regels).
- **Afhankelijk van.** Domein 12.

**Deep dive #49 van 56.**

1. `plan-view.tsx` is met 663 regels het grootste UI-bestand. Hoeveel daarvan is staat en hoeveel is
   presentatie, en wat zou een splitsing opleveren?
2. De statustaal zegt wie er aan zet is. Klopt dat label in elke situatie, ook als er twee partijen
   tegelijk aan zet zijn?
3. "Markeer alles als geplaatst" is een bulkactie zonder terugweg. Is er een ongedaan maken, en zo nee,
   wat is dan de bevestiging?
4. Bij 264 pagina's over twaalf maanden: waar begint dit scherm traag te worden, en welke query is dan
   de dure?
5. Welke statusovergang doet de klant het vaakst met de hand, en zou het systeem die kunnen afleiden in
   plaats van vragen?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| Plan als object | 32 | ~770 | Live sinds 0049 | Middel |
| Schrijfronde | **13** | ~400 | Dagelijks op pg_cron | **Hoog** |
| Statustaal en bulk | 49 | ~390 | Stabiel | Laag |

---

## 10. Externe data en audits

Alles wat de buitenwereld leest en niets kost, plus de ene koppeling met een externe API.

### 10.1 Crawler

- **Rol.** robots.txt, dan sitemap (recursief), anders homepage-links. HTML naar schone platte tekst.
  Deterministisch en gratis.
- **Code.** `lib/crawler.ts` (410 regels).
- **Afhankelijk van.** Niets. Domein 3, 8 en 10.2 hangen eraan.

**Deep dive #44 van 56.**

1. Er zit geen zichtbare snelheidsbegrenzing per host in. Wat doet de crawler bij een site die traag
   antwoordt of 429 teruggeeft, en kunnen we een klantsite plat leggen?
2. Welke user-agent sturen we mee, en herkent de klant ons in zijn logs? Dat is het eerste wat een
   technische partner van de klant vraagt.
3. De crawler haalt tekst uit HTML zonder JavaScript uit te voeren. Bij welk deel van de sites levert
   dat te weinig op, en meten we dat via de renderbaarheidscheck?
4. Er is nul caching: elke stap crawlt opnieuw. Wat zou een gedeelde cache per merk besparen aan tijd
   in de onboardingketen?
5. De crawler is de enige plek die het open web binnenhaalt. Welke controle voorkomt dat een vijandige
   pagina iets in onze prompts stopt dat het model als instructie leest?

### 10.2 Technische GEO-audit

- **Rol.** Mag een AI-crawler de site überhaupt bezoeken? Plus vier entiteitschecks: naamconsistentie,
  `sameAs`, schemadekking en Wikidata. Staat de site dicht, dan blokkeert dit contentgeneratie.
- **Code.** `lib/audit/{robots,ai-crawlers,entity-consistency,technical,gate,store}.ts`,
  tabel `technical_audits`, `components/audit-gate.tsx` en `audit-panel.tsx`.
- **Afhankelijk van.** Domein 8 (de blokkade), domein 4 (taaksoort `technical_audit`).

**Deep dive #38 van 56.**

1. De crawlerlijst is een constante in code. Hoe vaak komt er een nieuwe AI-crawler bij, en hoe merken
   we dat we er een missen?
2. De audit blokkeert contentgeneratie als de site dichtstaat. Hoe vaak is dat gebeurd, en snapt de
   klant uit de melding wat hij moet doen?
3. De audit draait één keer per merk. Een klant kan zijn robots.txt daarna dichtzetten zonder dat wij
   het merken. Zou dit periodiek moeten draaien?
4. Vier entiteitschecks leunen op Wikidata en Wikipedia. Wat is de dekking daarvan bij het MKB, en
   levert een lege uitkomst een nuttig advies of alleen een leeg vakje?
5. De audit is gratis en snel. Zou hij vóór het verkoopgesprek als losse quick scan kunnen draaien, als
   opener richting een nieuwe klant?

### 10.3 Off-site aanwezigheid

- **Rol.** Op welke externe domeinen het merk wel en niet aanwezig is, met Wikidata en Wikipedia via hun
  gratis open API's in plaats van via een model.
- **Code.** `lib/offsite/{scan,landscape,presence,entity-presence,domain}.ts`, tabellen
  `source_landscape` en `offsite_tasks`.
- **Afhankelijk van.** Domein 5 (één gegronde aanroep voor het landschap), domein 7.4 (de taken landen
  in het werkmodel).

**Deep dive #48 van 56.**

1. Er staan 75 rijen in `source_landscape` en nul in `offsite_tasks`. Off-site levert dus wel een
   landschap maar geen enkel opgevolgd stuk werk. Is dat een scherm-, een waarde- of een
   verwachtingsprobleem?
2. Off-site taken zijn handmatig werk voor de klant. Welke daarvan zou het systeem zelf kunnen doen, en
   welke vereisen echt een mens?
3. Het bronnenlandschap zegt welke domeinen de markt bepalen. Wordt dat gebruikt in de content, of
   blijft het een losse lijst?
4. Hoe vaak verandert zo'n landschap? Als het antwoord "zelden" is, hoort deze scan dan wel per merk te
   draaien in plaats van per branche?
5. Aanwezigheid op een extern domein is niet hetzelfde als geciteerd worden. Kunnen we die twee aan
   elkaar knopen met de citaties uit de meting?

### 10.4 Google Search Console

- **Rol.** Eén taak per merk per dag: klikken, vertoningen en positie per pagina per dag. Via een service
  account en niet via OAuth, omdat de benodigde scopes bij Google "sensitive" zijn en dat weken
  verificatie kost.
- **Code.** `lib/search-console/{auth,property,sync,window,metrics,key-state}.ts`,
  `app/api/profiles/[id]/search-console/route.ts`, `app/(app)/merk/[id]/analytics/zoekverkeer/`,
  `app/(app)/instellingen/koppelingen/`, migratie `0052`.
- **Afhankelijk van.** Domein 4 (de dagelijkse ronde plant dit mee), domein 8.6 (het effect per pagina).

**Deep dive #30 van 56.**

1. De sleutel staat in één env-variabele voor alle klanten samen. Wat is het plan als een klant die
   toegang intrekt, en zien we dat als fout of als lege data?
2. Er staan 91 dagen aan data voor de gekoppelde merken. Hoeveel merken zijn er eigenlijk gekoppeld, en
   wat houdt de rest tegen: het proces of het scherm?
3. Zoekverkeer en AI-zichtbaarheid staan nu naast elkaar. Is er een merk waar die twee tegengesteld
   bewegen, en wat zou dat betekenen voor het advies?
4. Google levert alleen pagina's, geen zoekopdrachten. Wat zou de tweede tabel met zoekopdrachten
   opleveren voor de potentiescore, die nu op schattingen leunt?
5. De synchronisatie draait dagelijks per merk. Wat gebeurt er bij naijlende correcties van Google, en
   is de unieke sleutel per dag en pagina daar echt tegen bestand?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| Crawler | 44 | 410 | Stabiel, nul kosten | Laag |
| Technische audit | 38 | ~1.050 | Blokkeert content | Laag |
| Off-site | 48 | ~660 | Handmatige opvolging | Laag |
| Search Console | **30** | ~910 | Live sinds 0052 | Middel |

---

## 11. Kostenbeheersing en governance

Twaalf routes zetten werk in gang dat geld kost. Ze stellen allemaal dezelfde twee vragen, in dezelfde
volgorde.

### 11.1 De twee remmen

- **Rol.** Vraag één: wie mag dit starten? Vraag twee: hoeveel is er nog over? De eerste faalt naar nee,
  de tweede faalt naar ja, en dat is met opzet: een kapotte budgetcontrole mag niet de hele pijplijn voor
  alle klanten platleggen.
- **Code.** `lib/cost-guard.ts` en `lib/cost-rules.ts` (403 met een eigen zin per handeling),
  `lib/spend-limit.ts` en `lib/spend-rules.ts` (402 met bedrag, plafond en waar je het verhoogt).
- **Afhankelijk van.** Domein 5.5 (`ai_calls`), domein 2 (`accounts.monthly_budget_eur`).

**Deep dive #6 van 56.**

1. ⚠️ Twaalf routes gebruiken vandaag beide remmen, maar de broncodecontrole in `scripts/test-unit.ts`
   noemt er elf: `app/api/profiles/[id]/refresh/route.ts` staat niet in die lijst. Moet die lijst
   handmatig blijven, of afgeleid worden uit de routes die `enqueue` aanroepen?
2. De rem zit op het starten, niet op de werker. Wat is het maximale bedrag dat één merk kan uitgeven
   nadat het plafond is geraakt maar de wachtrij nog vol staat?
3. Vraag twee faalt naar "ja" en logt luid. Wie leest die logregel, en zou een stille budgetcontrole
   binnen een dag opvallen?
4. €50 per account per maand en €150 per dag over alles: waar komen die bedragen vandaan, en kloppen ze
   nog nu een meetronde gemiddeld $0,855 kost en een klant meerdere onderwerpen heeft?
5. De klant ziet bij een blokkade bedrag, plafond en waar hij het verhoogt. Kan hij dat zelf, of komt
   hij altijd bij de beheerder uit, en is dat de bedoeling?

### 11.2 Archief en cadans

- **Rol.** Gearchiveerd werk telt niet mee in lijsten, tellingen en cron. Zonder dat filter kost een merk
  dat niemand meer ziet elke maand een betaalde meetronde. `measure-cadence.ts` voorkomt dat dezelfde
  analyse te snel opnieuw gemeten wordt.
- **Code.** `lib/archive.ts` (zes query's gebruiken hem), `lib/measure-cadence.ts`,
  `lib/require-count.ts` ("bestaat dit al?" mag nooit stil "nee" worden), migratie `0044`.
- **Afhankelijk van.** Domein 4 (de cron-routes filteren hierop).

**Deep dive #22 van 56.**

1. Archiveren staat bewust niet in RLS, zodat de eigenaar zijn merk kan blijven bereiken. Elke nieuwe
   query moet daardoor zelf aan `lib/archive.ts` denken. Hoe borgen we dat bij query nummer zeven?
2. Kan een broncodecontrole afdwingen dat elke query op `profiles` of `analyses` het archieffilter
   gebruikt, net zoals dat bij betaalde routes gebeurt?
3. `measure-cadence.ts` voorkomt te snel opnieuw meten. Wat is de regel, en kan een beheerder hem
   bewust overrulen als een klant erom vraagt?
4. Wat is de kostenkant van vergeten archiveren: hoeveel merken staan er nu actief die al maanden geen
   gebruiker hebben gezien?
5. Archiveren is bedoeld als back-up en niet als verwijdering. Weten klanten dat hun data blijft staan,
   en past dat bij wat we ze beloven over bewaartermijnen?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| De twee remmen | **6** | ~600 | 12 routes, vangnet dekt 11 | **Hoog** |
| Archief en cadans | **22** | ~350 | Live sinds 0044 | **Hoog** |

---

## 12. UI-laag en werkruimte

Vijf hoofdstukken per merk, plus het clusterdossier in vier hoofdstukken. Dit is qua regels het grootste
domein van de app.

### 12.1 De schil

- **Rol.** Zijbalk die per hoofdstuk groepeert, merkwisselaar, profielmenu, en de chrome eromheen.
- **Code.** `components/app-shell.tsx`, `sidebar.tsx`, `workspace-chrome.tsx`, `brand-switcher.tsx`,
  `profile-menu.tsx`, `section-rail.tsx`.
- **Afhankelijk van.** Domein 1.4 (`lib/nav.ts`), domein 2 (staf ziet meer).

**Deep dive #52 van 56.**

1. De zijbalk toont een hoofdstuk pas als zijn bestemmingen bestaan. Hoeveel query's kost het renderen
   van de schil per paginalading?
2. De ingeklapte zijbalk toont één teken per hoofdstuk, bewust geen icoonset. Herkent een klant die
   tekens na een week, of klikt hij ze allemaal open?
3. Werkt de schil op een telefoon? De consultant deelt de onboardingsessie met de klant, en die kijkt
   mogelijk mee op een klein scherm.
4. Staf ziet een extra hoofdstuk. Is er ooit een stafscherm per ongeluk aan een klant getoond, en welke
   test zou dat vangen?
5. Wat is de eerste indruk van iemand die net inlogt: hoeveel bestemmingen ziet hij, en weet hij binnen
   tien seconden waar hij moet zijn?

### 12.2 De merk-werkruimte

- **Rol.** Vijf hoofdstukken: overzicht, strategie (plan, clusters, bibliotheek), analytics
  (zichtbaarheid, zoekverkeer, concurrenten), merkprofiel (dossier, bewerken, input) en admin (staf).
- **Code.** `app/(app)/merk/[id]/` met 18 componenten in `_components/`, waaronder
  `onboarding-session.tsx` (480 regels), `brand-field-input.tsx` (376), `topics-panel.tsx` (356) en
  `entities-manager.tsx` (350).
- **Afhankelijk van.** Domein 3, 6, 7, 9 en 10.

**Deep dive #28 van 56.**

1. `merk/[id]/page.tsx` is 498 regels. Hoeveel blokken haalt dat overzicht op, hoeveel query's zijn dat,
   en welke daarvan zijn te lazy laden zonder dat de pagina leeg oogt?
2. Het overzicht moet twee vragen beantwoorden: hoe sta ik ervoor, en wat moet ik nu doen. Beantwoordt
   het scherm die tweede vraag met één duidelijke actie, of met een lijst?
3. Welke van de vijf hoofdstukken wordt het minst bezocht, en meten we bezoek überhaupt?
4. Een klant die net begint ziet lege blokken. Wat toont elk hoofdstuk in de eerste week, vóór de eerste
   meting?
5. De werkruimte is per merk. Wat mist een bureau met tien merken: een overzicht boven de merken, of is
   de merkenlijst genoeg?

### 12.3 Het clusterdossier

- **Rol.** Eén analyse in vier hoofdstukken: stand, resultaat, bewijs en werk. Plus de bewerkers voor
  vragen, onderwerp-onderzoek en de contentbriefing.
- **Code.** `app/(app)/analyses/[id]/` met `_chapters/`, `_editors/` en `_work/`, `score-panel.tsx`
  (589 regels, bevat de rangordetabel), `tabs.tsx`, de drie voortgangscomponenten.
- **Afhankelijk van.** Domein 6, 7, 8.

**Deep dive #37 van 56.**

1. Er zijn drie aparte voortgangscomponenten (meten, voorbereiden, rapporteren). Delen die één model
   van "werk dat loopt", of zijn het drie oplossingen voor dezelfde vraag?
2. De goedkeuringspoort staat in dit scherm: de klant bevestigt en de meting start. Hoe lang zit een
   analyse gemiddeld vast op die poort, en wat is de reden?
3. Het bewijshoofdstuk toont de ruwe antwoorden. Leest een klant die, of is dat een scherm voor ons?
4. Vier hoofdstukken per analyse naast vijf per merk: weet een klant nog waar hij is, en is de relatie
   tussen merk en cluster op het scherm zichtbaar?
5. `score-panel.tsx` is 589 regels en draagt de rangordetabel plus de balkjes. Vertellen die twee
   hetzelfde verhaal, of moet er één weg?

### 12.4 Gedeelde primitieven

- **Rol.** 46 componenten: kaarten, chips, skeletons, toasts, foutmeldingen, lege staten, grafieken.
- **Code.** `components/`, met `trend-chart.tsx` (448 regels) als grootste.
- **Afhankelijk van.** `docs/designsystem.md` en `docs/ux-design.md` zijn hier leidend.

**Deep dive #45 van 56.**

1. Het designsysteem is afgeleid van een concurrent en dat botst met de merkstrategie (open besluit in
   `designsystem.md` §9b). Wanneer wordt dat besloten, en wat kost het dan aan verbouwing?
2. Er zijn 46 componenten voor 34 pagina's. Welke worden één keer gebruikt, en horen die bij het scherm
   in plaats van in de gedeelde map?
3. Elke pagina heeft een lege staat, een laadstaat en een foutstaat nodig. Welke pagina mist er een, en
   hoe zou een test dat kunnen vangen?
4. Toegankelijkheid: werkt de app met alleen een toetsenbord, en hebben de grafieken een tekstueel
   alternatief?
5. De grafieken zijn met de hand gebouwd. Wat zou een bibliotheek opleveren, en wat verliezen we aan
   controle over de vormgeving?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| De schil | 52 | ~800 | Herzien 17 aug 2026 | Middel |
| Merk-werkruimte | **28** | ~7.000 | Nieuwste laag | **Hoog** |
| Clusterdossier | 37 | ~4.500 | Stabiel | Middel |
| Gedeelde primitieven | 45 | ~4.600 | Open ontwerpbesluit | Middel |

---

## 13. Datalaag en kwaliteitsborging

### 13.1 Migraties

- **Rol.** 59 migratiebestanden (`0001` tot en met `0060`, waarbij `0033` gereserveerd bleef en nooit
  draaide), plus zes `RUN_`-hulpbestanden. 39 tabellen in productie. Additief en idempotent, nooit `drop`.
- **Code.** `supabase/migrations/`, index en regels in `supabase/README.md`.
- **Afhankelijk van.** Alles.

**Deep dive #34 van 56.**

1. Additief betekent dat er niets vanzelf verdwijnt, en dat is te zien in productie: `_backup_20260729`
   staat er nog met 51 rijen, `brand_dna` bestaat sinds migratie `0001` en heeft nul rijen, en
   `tracking_run_mentions.sentiment` wordt niet meer gevuld. Wanneer is opruimen het risico waard, en
   wie besluit dat?
2. Er staan 108 indexen. Welke query op productie is vandaag het traagst, en heeft die een index die
   hem echt raakt?
3. `raw_response` en `raw_json` bewaren elke AI-uitvoer. Hoe groot is de database daardoor, en wat is de
   groei per klant per maand?
4. Migraties gaan via de MCP-tool naar productie, niet via de CLI. Hoe weten we zeker dat de map en de
   database gelijk lopen, en heeft iemand dat sinds `0060` gecontroleerd?
5. Er is geen terugweg bij een migratie. Wat is het plan als een migratie op productie iets breekt: een
   nieuwe migratie erachteraan, of een herstel uit back-up?

### 13.2 Typen als contract

- **Rol.** `lib/types/database.ts` (1056 regels) is het handgeschreven contract tussen database en code.
- **Code.** `lib/types/database.ts`.
- **Afhankelijk van.** Alles.

**Deep dive #43 van 56.**

1. Dit bestand wordt met de hand bijgewerkt naast elke migratie, terwijl Supabase types kan genereren.
   Waarom handmatig, en is die reden er nog?
2. Waar wijkt het type af van het echte schema? Eén kolom die in de database `null` mag zijn en in het
   type niet is een crash die op geen enkele test stuit.
3. Het bestand bevat ook betekenis (commentaar dat uitlegt waarom een veld bestaat). Zou gegenereerde
   typen die uitleg wegvagen, en is dat de echte reden om handmatig te blijven?
4. Er staan nul `any`-types in de hele codebase. Welke plekken gebruiken in plaats daarvan een cast die
   hetzelfde risico draagt?
5. Welke enums staan zowel in TypeScript als in een Postgres check-constraint, en wie controleert dat
   die twee lijsten gelijk blijven?

### 13.3 De drie testlagen

- **Rol.** 1744 unittests op pure functies zonder database of sleutel. 202 ketentests met echte handlers
  tegen echte Postgres, zonder netwerk. Eén rooktest die echte betaalde aanroepen doet.
- **Code.** `scripts/test-unit.ts` (7910 regels), `scripts/test-chain.ts` (2675) met
  `scripts/chain/{postgres,supabase-shim,openai-stub}.ts`, `scripts/test-openai.ts`,
  `scripts/eval-mention.ts`.
- **Afhankelijk van.** Alles. Zeven van de zeven fouten van een eerdere ronde zaten in de samenhang
  tussen taken, en geen enkele unittest kon ze vangen.

**Deep dive #9 van 56.**

1. De ketentest dekt de aggregatiestap van `measure.ts` niet, en dat is precies de stap waar de score,
   de rangordetabel en de citatietelling op leunen. Wat kost het om dat gat te dichten?
2. Welke van de 24 taaksoorten heeft vandaag géén ketentest, en welke van die ontbrekende is het duurst
   als hij stilletjes stukgaat?
3. Er draait geen CI: de vier controles zijn een afspraak vóór de commit. Wat kost het om ze op elke
   push te draaien, en wat wint dat aan zekerheid?
4. `eval:mention` meet de accuratesse van de classificatie maar kost geld. Wanneer draaide die voor het
   laatst, en zou hij bij elke promptwijziging moeten draaien?
5. De ketentest gebruikt een stub voor OpenAI. Hoe realistisch is die stub, en welke fout uit de
   praktijk zou hij niet hebben opgeleverd?

| Sub-onderdeel | Prio | Regels | Status | Complexiteit |
|---|---|---|---|---|
| Migraties | 34 | 6.174 | 59 bestanden, 39 tabellen | Middel |
| Typecontract | 43 | 1.056 | Handmatig onderhouden | Middel |
| Testlagen | **9** | 12.131 | Alles groen op 20 aug 2026 | Middel |

---

## De 56 deep dives op volgorde van potentie

Dit is de rangschikking waar de nummers hierboven vandaan komen. Nummer 1 is de sessie waarmee het team
op dit moment het meeste aan de app verbetert.

**⚠️ Deze volgorde is een oordeel van 20 augustus 2026 en verloopt.** Zodra deep dive 1 tot en met 5
gedaan zijn verschuift de rest, want de helft van de potentie van een sessie zit in wat er nog niet
onderzocht is. Herzie de lijst na elke ronde, en laat een sessie die niets opleverde zakken in plaats
van hem netjes af te vinken.

### Waarop is gerangschikt

Vier vragen, in deze volgorde van gewicht. De eerste weegt het zwaarst omdat het product staat of valt
met de geloofwaardigheid van zijn cijfer.

| | Vraag | Waarom die weegt |
|---|---|---|
| 1 | **Klopt het cijfer?** Raakt dit onderdeel de waarheid van wat we de klant tonen? | Een score die niet waar is, is erger dan geen score: hij stuurt de klant én zijn contentplan de verkeerde kant op, en dat merkt niemand tot de klant opzegt |
| 2 | **Valt het stil zonder dat iemand het ziet?** | Werk dat halverwege stopt kost geld dat al is uitgegeven en levert niets. Dit is de faalvorm die dit product het vaakst heeft gehad |
| 3 | **Wat kost of verdient het?** | 98,8 procent van de kosten van een meetronde zit in één aanroep. Waar het geld zit, zit ook de hefboom |
| 4 | **Brengt het de app dichter bij `docs/visie.md`?** | Elke stap die het systeem zelfstandig kan zetten telt zwaarder dan een stap die weer een handeling toevoegt |

Wat bewust **niet** meeweegt: hoeveel regels code er staan, en hoe onaangenaam het onderdeel is om aan
te werken. Het grootste bestand van de codebase staat op plek 4 en niet op plek 1, omdat de meting nog
zwaarder weegt dan de tekst die eruit volgt.

### De top vijf, en wat ze opleveren

**1. De meting zelf (6.3).** Alles in dit product hangt aan één aanroep die 98,8 procent van de kosten
draagt en de basis is van elk cijfer dat de klant ziet. Twee dingen zijn daar nooit hard gemaakt: hoe
goed onze simulatie overeenkomt met wat ChatGPT die dag echt antwoordt, en wat we verliezen als
`web_search` selectiever wordt ingezet. De eerste bepaalt of het product waar is, de tweede bepaalt de
marge. Eén sessie kan beide vragen omzetten in een meting op echte data.

**2. Hermeten en aggregatie (6.4).** Hier wordt van 30 tot 90 metingen één getal gemaakt, en juist deze
stap heeft geen ketentest. De rangordetabel en de citatietelling leunen erop, en die zijn nog niet
end-to-end tegen een echte meting nagerekend. Zolang dat zo is, weten we van het belangrijkste getal in
de app alleen dat de losse functies kloppen, niet dat de keten klopt.

**3. De regionale poort (6.2).** Bewezen effect met cijfers: 57 betaalde metingen op landelijke vragen
leverden nul vermeldingen op, terwijl tien regionale vragen op score 28 uitkwamen. De hele garantie
hangt aan één veld dat een model invult. Staat dat veld verkeerd, dan is de score niet iets te laag maar
onwaar, en de klant heeft geen enkele manier om dat te zien. Deze sessie beschermt de belofte van het
product tegen de zwakste schakel erin.

**4. Schrijven en herschrijven (8.3).** Het duurste model, het grootste bestand, en het enige wat de
klant daadwerkelijk publiceert onder zijn eigen naam. Twee open vragen met directe waarde: wat levert de
herschrijfronde meetbaar op, en leest de tekst als die van het merk. De eerste is een kostenvraag, de
tweede bepaalt of een klant blijft.

**5. Ketening en falen (4.3).** De Teamsessie van 18 augustus vond één stap die als niet-blokkerend
gold terwijl hij de halve onderzoeksketen droeg. Er is geen reden om aan te nemen dat dat de enige was,
en de faalvorm is de gevaarlijkste die er is: geen foutmelding, geen klant die belt, alleen werk dat
nooit gebeurt. Deze sessie loopt alle 24 taaksoorten langs met dezelfde vraag.

### De volledige rangschikking

| Prio | Deep dive | Domein | Waarom deze plek |
|---|---|---|---|
| 1 | De meting zelf | 6.3 | Draagt elk cijfer én 98,8% van de kosten |
| 2 | Hermeten en aggregatie | 6.4 | Maakt het hoofdgetal, en heeft geen ketentest |
| 3 | De regionale poort | 6.2 | Bepaalt of de score waar is; hangt aan één veld |
| 4 | Schrijven en herschrijven | 8.3 | Duurste model, en dit is wat de klant publiceert |
| 5 | Ketening en falen | 4.3 | Stille stilstand is de duurste faalvorm van dit product |
| 6 | De twee remmen | 11.1 | Geld, en het vangnet dekt elf van twaalf routes |
| 7 | De twee poorten | 8.4 | De enige garantie op contentkwaliteit over tijd |
| 8 | Rechten: RLS plus ownership | 2.4 | Een fout hier is klantdata bij de verkeerde klant |
| 9 | De drie testlagen | 13.3 | Bepaalt hoe snel 1 tot en met 8 veilig kunnen bewegen |
| 10 | Onboardingsessie en refresh | 3.5 | Het hart van het sales-led model, en het nieuwste |
| 11 | Werker en tijdbudget | 4.2 | Doorvoer bepaalt hoeveel klanten erbij kunnen |
| 12 | Publiceren en impact | 8.6 | Het bewijs van waarde; één rij op productie |
| 13 | De schrijfronde | 9.2 | De enige stap die vandaag zelfstandig werk start |
| 14 | Promptgeneratie en verdeling | 6.1 | Bepaalt wát er gemeten wordt |
| 15 | Versies, bewerken, export | 8.5 | Het gat tussen belofte (CMS) en bouw |
| 16 | Fase 1 tot 3: onderzoek | 3.2 | Voedt alles, inclusief het veld onder deep dive 3 |
| 17 | Gap-analyse en rapport | 7.1 | Wat de klant leest, plus het risico op onware claims |
| 18 | Feitenbank | 8.1 | Bepaalt of content klopt; nul merkdocumenten op productie |
| 19 | Entiteiten en concurrenten | 6.5 | Eén verkeerde koppeling vervuilt alle cijfers |
| 20 | Client, budget, retries | 5.1 | Betrouwbaarheid van élke AI-stap |
| 21 | Fase 3b: kennistest | 3.3 | Duur, nieuw, en het oordeel hoort in code te blijven |
| 22 | Archief en cadans | 11.2 | Stille maandelijkse kosten op merken die niemand ziet |
| 23 | Zod-contracten | 5.3 | Het enum-vangnet dat één keer tien fouten maakte |
| 24 | Wachtrij en contract | 4.1 | Fundament, maar stabiel en goed getest |
| 25 | Potentie en werkmodel | 7.4 | Bepaalt de volgorde van al het werk van de klant |
| 26 | Briefing | 8.2 | De plek waar het werk stilvalt op de klant |
| 27 | Dossierscherm en volledigheid | 3.6 | Waar de klant corrigeert wat het model verzon |
| 28 | Merk-werkruimte | 12.2 | Het scherm waar de klant woont |
| 29 | Kostenlogboek | 5.5 | Marge-inzicht, nu nog geschat in plaats van gemeten |
| 30 | Search Console | 10.4 | De tweede databron naast onze eigen meting |
| 31 | Fase 0: ontdekken | 3.1 | Gratis basis onder alles, maar stabiel |
| 32 | Plan als object | 9.1 | 264 geplande pagina's tegenover 35 geschreven |
| 33 | Accounts en rolmatrix | 2.2 | Het bureaumodel uit de visie leunt hierop |
| 34 | Migraties | 13.1 | Schemahoudbaarheid en twee dode tabellen |
| 35 | Inzichten, kansen, opbrengst | 7.3 | Waardecommunicatie richting verlenging |
| 36 | Supabase-clients | 1.2 | Fundament, stabiel, maar 116 keer `select("*")` |
| 37 | Clusterdossier | 12.3 | Veel scherm, drie voortgangsmodellen |
| 38 | Technische audit | 10.2 | Blokkeert content, maar draait maar één keer |
| 39 | Synthese en dossier | 3.4 | Duurste onboardingstap, kwaliteit onbewezen |
| 40 | Modellen en sampling | 5.2 | Eén knop met effect op alles, nu bewust laag gezet |
| 41 | Staf, CSM en verwijderen | 2.5 | Operationeel, en verwijderen raakt 39 tabellen |
| 42 | Periodeverschil en trend | 7.2 | Communicatie van het cijfer, niet het cijfer zelf |
| 43 | Typecontract | 13.2 | Handmatig onderhouden naast elke migratie |
| 44 | Crawler | 10.1 | Stabiel en gratis, maar wel onze voordeur naar het web |
| 45 | Gedeelde primitieven | 12.4 | Het open ontwerpbesluit wacht op een beslissing |
| 46 | Uitnodigingen | 2.3 | De enige deur naar binnen, maar weinig verkeer |
| 47 | Cron-ingangen | 4.4 | Vier ingangen, twee platforms, één stil faalpad |
| 48 | Off-site | 10.3 | 75 landschapsrijen, nul opgevolgde taken |
| 49 | Statustaal en bulk | 9.3 | Grootste UI-bestand, maar begrensd risico |
| 50 | Navigatie en werkruimte | 1.4 | Net herzien, dus weinig nieuws te halen |
| 51 | Enginelaag | 5.4 | Gemini slaapt; pas urgent bij een tweede engine |
| 52 | De schil | 12.1 | Net herzien op 17 augustus |
| 53 | Omgeving en schakelaars | 1.3 | Werkt, en de spreiding is hooguit netheid |
| 54 | Sessie en inloggen | 2.1 | Standaard Supabase-werk, registratie staat dicht |
| 55 | Next.js-frame en routegroepen | 1.1 | Framework doet het werk, weinig eigen logica |
| 56 | Presentatiehulpen | 1.5 | Pure functies met tests, laagste risico van allemaal |

### Dezelfde ranglijst in gewone taal

Voor iedereen die de code niet kent: dezelfde 56 onderwerpen, zonder bestandsnamen. Zelfde volgorde,
zelfde nummers. Wie wil weten wat er precies onderzocht wordt, leest de vijf vragen bij het onderdeel
zelf.

| Prio | Onderwerp | Waar het over gaat |
|---|---|---|
| 1 | Meten we echt wat een AI antwoordt? | We stellen dertig vragen aan een AI en kijken of het merk genoemd wordt. Bijna al het geld gaat hierin zitten, en we hebben nooit naast elkaar gelegd of onze nabootsing klopt met wat ChatGPT die dag echt zegt |
| 2 | Van dertig antwoorden naar één cijfer | De rekensom die het rapportcijfer maakt is nooit als geheel getest, alleen in losse stukjes |
| 3 | Vragen die dit bedrijf nooit kan winnen | Een lokaal bedrijf moet alleen op vragen uit zijn eigen regio worden afgerekend. Gaat dat mis, dan is het cijfer niet te laag maar gewoon onwaar |
| 4 | De tekst die de klant publiceert | Het duurste onderdeel van de app. Levert de tweede schrijfronde echt een betere tekst op, en klinkt die tekst als het merk zelf? |
| 5 | Werk dat stilvalt zonder dat iemand het merkt | Als een stap in de keten mislukt, moet de rest doorlopen of luid klagen. Eén keer gebeurde geen van beide |
| 6 | De rem op alles wat geld kost | Twaalf knoppen in de app geven geld uit. Elf worden bewaakt door een automatische controle, één niet |
| 7 | De kwaliteitscontrole op teksten | Twee controles bepalen of een tekst goed genoeg is. Meten die de juiste dingen, en wie beslist dat? |
| 8 | Wie mag welke gegevens zien | De ene klant mag nooit iets van de andere zien. Hier is al een keer een fout gevonden |
| 9 | Het vangnet dat fouten tegenhoudt | Bijna 2.000 automatische controles, maar juist rond het hoofdcijfer zit een gat |
| 10 | Het klantgesprek waarin het profiel af komt | Het scherm waarop de consultant samen met de klant het merkprofiel afmaakt. Het hart van hoe we verkopen |
| 11 | Hoeveel werk de motor per uur aankan | Bepaalt hoeveel klanten er tegelijk bij kunnen zonder dat het gaat schuiven |
| 12 | Bewijzen dat een pagina iets oplevert | Ons bewijs dat het werkt. Er staat op dit moment één gemeten resultaat tegenover 35 geschreven pagina's |
| 13 | Het enige dat de app zelf begint | Elke nacht kiest de app zelf welke pagina's geschreven worden. Dat is de eerste stap richting de visie |
| 14 | De dertig vragen die we stellen | Die vragen bepalen alles wat er daarna gemeten wordt. Lijken ze op wat klanten écht aan een AI vragen? |
| 15 | Van tekst naar een pagina op de site | De klant krijgt een bestand en moet zelf plakken. De merkstrategie belooft publiceren, dat bestaat nog niet |
| 16 | Wat de app zelf over een bedrijf uitzoekt | De vier onderzoeksstappen die het merkprofiel vullen, inclusief het veld waar punt 3 aan hangt |
| 17 | Het rapport dat de klant leest | Er zit een controle in die verzonnen merknamen uit het rapport haalt. Hoeveel haalt hij eruit, en waarom? |
| 18 | De feiten waarbinnen geschreven mag worden | De app mag alleen schrijven wat bevestigd is. Klanten leveren nu nul brondocumenten aan |
| 19 | Herkennen we merken goed? | "Coolblue" en "coolblue.nl" moeten hetzelfde bedrijf zijn. Eén verkeerde koppeling vervuilt alle cijfers |
| 20 | Wat er gebeurt als de AI hapert | Een trage of weigerende AI mag geen halve meting opleveren |
| 21 | Wat weet AI nu al over dit merk? | De nulmeting bij de start. Duur, nieuw, en het oordeel moet uit code komen en niet uit de AI zelf |
| 22 | Slapende merken die toch geld kosten | Een merk dat niemand meer bekijkt, moet ook geen maandelijkse meting meer krijgen |
| 23 | Voorkomen dat de AI iets verzint in een vakje | De AI vult bij twijfel het eerste beste antwoord in. Dat is één keer tien van de 27 keer misgegaan |
| 24 | De takenlijst van de app | 24 soorten werk in één rij. Werkt, maar niemand kan hem vandaag inzien als er iets vastloopt |
| 25 | Waar valt het meeste te winnen? | Het cijfer dat de volgorde van het contentplan bepaalt. Nooit achteraf getoetst of die volgorde klopte |
| 26 | De vragen die we de klant stellen | Voor er geschreven wordt, stelt de app maximaal acht vragen. Hier valt het werk stil als de klant niet antwoordt |
| 27 | Het scherm waar de klant zijn profiel corrigeert | 41 velden om na te lopen. Welke laat iedereen leeg, en wat verliezen we daardoor? |
| 28 | Het startscherm van de klant | Moet twee vragen beantwoorden: hoe sta ik ervoor, en wat moet ik nu doen |
| 29 | Wat een klant ons per maand kost | We schatten de kosten uit tarieven in code, we lezen ze niet van de factuur |
| 30 | De koppeling met Google-zoekcijfers | De tweede databron naast onze eigen meting. Weinig merken zijn gekoppeld |
| 31 | De website uitlezen | Gratis en snel, en de basis onder al het onderzoek. Werkt niet bij sites die alles pas in de browser opbouwen |
| 32 | Het contentplan voor twaalf maanden | 264 geplande pagina's tegenover 35 geschreven. Loopt het plan te ver voor de uitvoering uit? |
| 33 | Bureaus met meerdere merken | De laag boven het merk. De visie leunt hierop, de app gebruikt hem nog nauwelijks |
| 34 | De opbouw van de database | Er verdwijnt nooit iets vanzelf. Twee dode tabellen staan er nog |
| 35 | De opbrengst laten zien | Het blok dat vertelt wat het abonnement opleverde. Bepaalt of een klant verlengt |
| 36 | Hoe de app zijn gegevens ophaalt | Werkt, maar haalt op 116 plekken alles op terwijl het scherm maar een deel gebruikt |
| 37 | Het scherm per onderwerp | Drie verschillende manieren om "er wordt gewerkt" te tonen, voor één begrip |
| 38 | Mag AI de site van de klant lezen? | Staat de site dicht voor AI-crawlers, dan is al het andere werk zinloos. Wordt maar één keer gecontroleerd |
| 39 | Het merkdossier samenstellen | De duurste stap van de onboarding. Nooit vergeleken met een goedkopere variant |
| 40 | Welk AI-model waarvoor | Drie keuzes vast in code. De denkkracht staat bewust laag, en dat is nooit opnieuw gemeten |
| 41 | Het beheerpaneel en klanten verwijderen | Waar wij zien hoe klanten ervoor staan. Verwijderen raakt 39 tabellen tegelijk |
| 42 | De grafiek met het verloop | Toont de beweging over de maanden. Laat hij ruis als beweging zien? |
| 43 | De koppeling tussen database en code | Wordt met de hand bijgehouden, terwijl het ook automatisch kan |
| 44 | Het programma dat websites ophaalt | Onze voordeur naar het open web. Zonder snelheidsrem, en zonder controle op vijandige pagina's |
| 45 | De vormgeving van de app | Het ontwerp is van een concurrent afgeleid en botst met de merkstrategie. Dat besluit staat nog open |
| 46 | Hoe een klant toegang krijgt | Uitnodigingen zijn de enige deur naar binnen, want registreren staat dicht |
| 47 | De klokken die het werk starten | Vier automatische starters op twee platformen. Eén ervan kan stil stoppen zonder foutmelding |
| 48 | Aanwezigheid op andere websites | We brengen 75 relevante websites in kaart, en er is nog geen enkele actie op opgevolgd |
| 49 | De statussen in het contentplan | Het grootste schermbestand van de app, met beperkt risico |
| 50 | Het menu | Net herzien, dus hier valt weinig nieuws te halen |
| 51 | De tweede AI-aanbieder | Google's Gemini is aangesloten maar staat uit. Pas urgent als hij aan gaat |
| 52 | De zijbalk en de schil eromheen | Net herzien op 17 augustus |
| 53 | De instellingen van de omgeving | Werkt. Wat er te winnen is, is netheid |
| 54 | Inloggen en wachtwoorden | Standaardwerk, en registreren staat toch dicht |
| 55 | Het frame waar de app in draait | Het framework doet het werk, wij hebben er weinig eigen logica in |
| 56 | Datums, getallen en opmaak | Kleine functies met tests eromheen. Het laagste risico van allemaal |

### Hoe je dit gebruikt

**Eerste ronde: 1 tot en met 5.** Die vijf gaan samen over één vraag: klopt wat we meten, en gebeurt het
werk echt. Zolang daar twijfel zit, is elke verbetering daarboven bouwen op een fundament dat je niet
hebt nagerekend.

**Tweede ronde: 6 tot en met 12.** Geld, contentkwaliteit, rechten, testdekking en het bewijs richting
de klant. Dit is de ronde die de marge en de verlenging raakt.

**Wat je overslaat tot er een aanleiding is: 44 tot en met 56.** Die dertien zijn niet onbelangrijk, ze
zijn af. Een sessie daarover levert nette antwoorden op en verandert de app niet. Pak ze op wanneer je
er tóch aan werkt, niet als geplande deep dive.
