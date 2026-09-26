# Van nieuwe klant tot opgeleverde content: de volledige doorloop

> **Waarvoor dit document is.** Om de app één keer helemaal te doorlopen met een testklant en bij
> elke stap te controleren of alles goed gaat. Het beschrijft wat er gebeurt vanaf het moment dat de
> consultant een merk aanmaakt tot het moment dat de klant een goedgekeurde tekst in handen heeft.
>
> **Voor wie.** Voor de eigenaar (niet technisch) en voor een engineer. Elke stap heeft drie lagen:
>
> - **Wat er gebeurt**: in gewone taal. Deze laag is genoeg om de doorloop te doen.
> - **Onder de motorkap**: bestanden, taaksoorten en tabellen. Voor de engineer die wil nagaan
>   waarom iets gebeurt of waar het misging.
> - **Controleer**: wat je bij de test ziet als het goed gaat. Vink af tijdens de doorloop.
>
> **Peildatum: 26 september 2026**, gecontroleerd tegen de code op `main` (na PR #162). De code is
> leidend: klopt iets hier niet meer, dan is dit document fout. Wat er na het opleveren gebeurt
> (publiceren, de controle van de live pagina en de nameting na 14 en 28 dagen) staat in
> [`processtappen-nieuwe-pagina.md`](./processtappen-nieuwe-pagina.md) fase 14 en 15. Het plan achter
> de contentketen staat in [`tasks/contentketen-opnieuw.md`](./tasks/contentketen-opnieuw.md).

---

## Inhoud

- [Deel 0. Voorbereiding van de testdoorloop](#deel-0-voorbereiding-van-de-testdoorloop)
- [Fase 1. Het merk aanmaken](#fase-1-het-merk-aanmaken)
- [Fase 2. Het automatische onderzoek](#fase-2-het-automatische-onderzoek)
- [Fase 3. Het gesprek met de klant](#fase-3-het-gesprek-met-de-klant)
- [Fase 4. De klant toegang geven](#fase-4-de-klant-toegang-geven)
- [Fase 5. Een cluster opzetten](#fase-5-een-cluster-opzetten)
- [Fase 6. De meting](#fase-6-de-meting)
- [Fase 7. Het rapport en de kansen](#fase-7-het-rapport-en-de-kansen)
- [Fase 8. Het contentplan](#fase-8-het-contentplan)
- [Fase 9. De voorbereiding van de pagina's](#fase-9-de-voorbereiding-van-de-paginas)
- [Fase 10. De vragen aan de klant](#fase-10-de-vragen-aan-de-klant)
- [Fase 11. Het schrijven](#fase-11-het-schrijven)
- [Fase 12. De controle en hooguit één herschrijving](#fase-12-de-controle-en-hooguit-één-herschrijving)
- [Fase 13. Lezen, goedkeuren en opleveren](#fase-13-lezen-goedkeuren-en-opleveren)
- [Bijlage A. Wat nog niet af is, of anders werkt dan je zou denken](#bijlage-a-wat-nog-niet-af-is-of-anders-werkt-dan-je-zou-denken)
- [Bijlage B. Statussen](#bijlage-b-statussen)
- [Bijlage C. Kosten en tijd](#bijlage-c-kosten-en-tijd)
- [Bijlage D. Handige query's tijdens de doorloop](#bijlage-d-handige-querys-tijdens-de-doorloop)

---

## Hoe de app werkt, in vijf zinnen

1. Bijna alles wat de app doet, gebeurt op de achtergrond in een **wachtrij met taken**. Een scherm
   zet een taak klaar en geeft meteen antwoord, en het scherm mag daarna dicht.
2. Een **werker** pakt elke minuut de taken op die klaarstaan. Elke taak plant zelf de volgende in,
   zodat een keten van stappen vanzelf doorloopt.
3. Een taak doet **hooguit één zware AI-aanroep**. Mislukt een taak, dan probeert de werker het tot
   vier keer, met 2, 4, 8 en 16 minuten ertussen.
4. Elke taak kijkt **eerst of zijn resultaat al bestaat**. Een herhaling betaalt dus nooit twee keer.
5. Alles wat **geld kost**, start alleen een beheerder (de consultant), en er geldt een dagplafond.

**Onder de motorkap.** De wachtrij is de tabel `jobs` (`lib/jobs/queue.ts`, `worker.ts`,
`handlers.ts`). De werker draait via Supabase `pg_cron` (taak `geo-worker`, elke minuut) en roept
`/api/cron/worker` aan; zonder de twee Vault-geheimen `geo_site_url` en `geo_cron_secret` gebeurt er
niets, zonder foutmelding (`docs/architecture.md` §9). Een taak die langer dan 5 minuten op `running`
blijft staan, gaat terug in de rij. Elke AI-aanroep komt met kosten in `ai_calls`. De betaalde
handelingen staan in `STAFF_ONLY_ACTIONS` (`lib/cost-rules.ts`): merk onderzoeken, cluster starten,
meting starten, contentplan opstellen, maand vrijgeven, reputatieanalyse en clusters aanvullen. Het
dagplafond is €20 per account en €50 over alle accounts samen (`lib/spend-limit.ts`).

---

## Deel 0. Voorbereiding van de testdoorloop

Doe dit vóór je begint. Een doorloop die halverwege stilvalt door een instelling, test niets.

**Wat je nodig hebt**

- Een **beheerdersaccount** (staat in `staff_users`). Daarmee doe je alles wat de consultant doet.
- Een **tweede inlog voor de testklant**, om te zien wat de klant ziet. Dat kan een uitnodiging zijn
  (fase 4) of een gebruiker die je in Supabase aanmaakt (Authentication, Add user, Auto Confirm aan).
- Een **echte website** van een bedrijf met een duidelijk aanbod en een werkgebied. Een site met
  weinig tekst geeft een magere aanbodboom, en dan vallen de onderwerpvoorstellen weg (stap 2.6).
- Iemand die de rol van **ondernemer** speelt en de vragen kan beantwoorden, het liefst met echte
  kennis van het bedrijf. De kwaliteit van de tekst hangt vooral af van die antwoorden.
- Een **pakketkeuze** (5, 10 of 20 pagina's per maand). Voor een test is het kleinste pakket genoeg.

**Controleer vooraf**

- [ ] De werker draait: `select * from cron.job_run_details order by start_time desc limit 5;`
      toont runs van de afgelopen minuten.
- [ ] Er is budget: in `ai_calls` is de som van `cost_usd` van vandaag ruim onder het plafond.
- [ ] Je weet welke meetbronnen aanstaan. ChatGPT meet altijd. Google AI Overview meet alleen met
      `AI_OVERVIEW_ENABLED=true`, Gemini alleen met `DATAFORSEO_LLM_ENABLED=true` (Vercel,
      omgevingsvariabelen). Met `MEASURE_WEB_SEARCH=false` wordt de meting goedkoper, maar minder echt.
- [ ] E-mail staat standaard uit (`EMAILS_ENABLED`). Een uitnodigingslink kopieer je dus zelf.

**Een belangrijk punt over de kalender.** Het plan verdeelt de publicatiedata over dag 1 tot en met
28 van een maand, en in de lopende maand vanaf morgen. Geschreven wordt er op zijn vroegst **tien
dagen vóór** de publicatiedatum. Wie op de 26e test, heeft in de lopende maand bijna geen ruimte
meer; de pagina's komen dan in de volgende maand, en een deel wacht met schrijven. Voor een snelle
doorloop heeft de beheerder de knop **"nu laten schrijven"** (stap 11.3): die slaat de datum over,
maar nooit de vragen.

---

## Fase 1. Het merk aanmaken

*Wie: de consultant. Waar: Merken, "+ Nieuw merk" (`/merk/nieuw`). Kost: niets direct, start wel
het betaalde onderzoek van fase 2.*

**1.1 De consultant vult drie velden in.** Het webadres, de bedrijfsnaam en eventueel andere
schrijfwijzen van de naam (een afkorting, een veelgemaakte spelfout). Die laatste lijkt onbelangrijk,
maar de meting telt later alleen de namen die hier bekend zijn: een ontbrekende schrijfwijze geeft
een te lage score.

**1.2 De app controleert het adres.** Is het adres ongeldig, dan staat de melding bij het veld. Is de
site niet bereikbaar, dan meldt de app dat en mag de consultant toch doorgaan: sommige sites weren
automatische bezoekers.

**1.3 Het merk wordt opgeslagen**, eerst op het account van de consultant. De klant ziet het nog
niet. Wat de consultant intypte, krijgt het label "ingevuld door de consultant": het onderzoek mag
dat tegenspreken, maar nooit stilletjes overschrijven.

**1.4 De eerste onderzoekstaak wordt klaargezet.** Het scherm geeft meteen antwoord.

**Onder de motorkap.** `POST /api/profiles` (`app/api/profiles/route.ts`): `mayTriggerCost` voor
`merk_onderzoeken` (alleen beheerder, anders 403), `checkBudget` (402 bij een vol plafond),
`checkUrlFormat` en `isReachable` (met `force` om door te gaan). Rij in `profiles` met
`status = 'bezig'` en `account_id` van de beheerder; herkomst in `profile_field_sources` met
`source = 'consultant'`. Daarna `enqueue` van `profile_light_scan`. Het pakket wordt hier bewust niet
gezet; dat gebeurt bij het toewijzen (stap 4.3).

**Controleer**

- [ ] Het merk staat in de merkenlijst met de fase "Voorbereiden".
- [ ] `select type, status from jobs where profile_id = '<id>'` toont `profile_light_scan`.

---

## Fase 2. Het automatische onderzoek

*Wie: niemand, het loopt vanzelf. Duur: tot ongeveer 10 minuten vooronderzoek, daarna ongeveer 7,5
minuut. Kost: ongeveer 25 dollarcent.*

De taken hieronder lopen na elkaar. Elke taak plant de volgende in.

**2.1 Vooronderzoek.** De app bekijkt tot 1.000 pagina's van de site, alleen de titel en de korte
omschrijving. Geen AI, dus gratis, maar het kost tijd. Zo weet de volgende stap welke pagina's het
aanbod echt dragen. Mislukt dit, dan gaat de keten gewoon door.

**2.2 De site uitlezen.** De app leest tot 150 pagina's helemaal, verdeeld over alle delen van de
site. Hij haalt er ook telefoon, adres, e-mail en KvK-nummer uit, herkent het soort website (welk
systeem, hoe een FAQ daar getoond wordt) en kijkt of de tekst leesbaar is zonder JavaScript. Geen
AI, behalve één kleine aanroep van ongeveer 1 dollarcent als de site groter is dan wat gelezen mag
worden.

**2.3 Technische controle** (loopt naast de rest mee). Mogen de crawlers van AI-bedrijven de site
bezoeken, en is de naam overal hetzelfde? Geen AI.

**2.4 Het bedrijf leren kennen.** Een AI-aanroep met zoeken op het web bepaalt wie dit bedrijf is:
branche, soort bedrijf, werkgebied, toon, klantgroepen, concurrenten en bewijs. Wat een mens eerder
invulde, blijft staan. **Dit is de enige stap die de keten stopt als hij mislukt**, want alles daarna
bouwt erop.

**2.5 Het aanbod als boom.** Diensten en producten, met onder een hoofddienst de subdiensten. Elke
regel heeft een bronpagina; een regel zonder bron vervalt.

**2.6 Onderwerpen voorstellen.** Vijf tot acht onderwerpen, afgeleid uit de aanbodboom. Is er geen
aanbodboom, dan worden er bewust geen onderwerpen verzonnen. Dit zijn de kandidaten voor de clusters
van fase 5.

**2.7 De markt.** Waarom winnen de concurrenten, en welke websites bepalen deze markt.

**2.8 De kennistest.** Kent ChatGPT dit bedrijf, klopt wat hij zegt, welke bronnen noemt hij, zijn er
bedrijven met een bijna gelijke naam, en wordt het merk genoemd bij een koopvraag zonder merknaam.
Het oordeel velt de code, niet het model.

**2.9 Alles samenbrengen.** Eén dossier, de feiten die letterlijk op de site staan, en een lijst open
punten voor het gesprek. Die open punten komen ook als vragen voor het hele merk op "Openstaande
vragen".

**2.10 De fase springt naar "Klaar voor het gesprek".** Een stap die niets vindt, toont een
waarschuwing in plaats van een groen vinkje.

**Onder de motorkap.** De volgorde: `profile_light_scan` (plant zichzelf een paar rondes opnieuw in)
→ `profile_discover` (plant `technical_audit` en `profile_research` in) → `profile_research`
(`prepare-profile.ts`) → `profile_offering` (`offering.ts`, tabel `profile_offerings`) →
`propose_topics` (tabel `profile_topics`, status `voorgesteld`) en daarnaast `profile_market` →
`profile_llm_baseline` → `profile_synthesis` (het enige onderzoek op het dure model; schrijft
`brand_facts` en merkbrede `fact_requests`). De opvolgers staan in `lib/jobs/chain.ts`; faalt een
stap definitief, dan plant `scheduleFollowUpAfterFailure()` toch de opvolger in, behalve bij
`profile_research`. De fase van het merk wordt afgeleid in `lib/profile-stage.ts`.

**Controleer**

- [ ] Alle onderzoekstaken staan in `jobs` op `done` (of `failed` met een begrijpelijke `last_error`).
- [ ] `profiles.status = 'klaar'`, en het merk staat op "Klaar voor het gesprek".
- [ ] De aanbodboom (Admin, Aanbodboom) klopt met wat het bedrijf echt doet. Dit is de belangrijkste
      controle van deze fase: alles daarna leunt erop.
- [ ] Er staan vijf tot acht voorgestelde onderwerpen op het clusterscherm.
- [ ] De kosten in `ai_calls` voor dit merk liggen rond de 25 dollarcent.

---

## Fase 3. Het gesprek met de klant

*Wie: de consultant, met de klant erbij. Waar: Admin, Onboardinggesprek
(`/merk/[id]/admin/onboarding`). Kost: niets, behalve als je het onderzoek bijwerkt (stap 3.7).*

Dit scherm is het enige beheerscherm dat met de klant gedeeld wordt. Er staat geen bedrag, geen
taaknaam en geen foutmelding op.

**3.1 Bovenaan staat wat nog niet bekend is**, het zwaarste eerst. Het werkgebied staat vrijwel altijd
bovenaan: dat bepaalt of de meetvragen straks regionaal of landelijk gesteld worden.

**3.2 Het dossier wordt samen nagelopen, blok voor blok**: het bedrijf en de namen, het aanbod, de
markt, het bewijs, de klant en de toon, materiaal en veranderingen, techniek en koppelingen, en
afspraken. Elk veld slaat zichzelf op zodra je eruit klikt. Onder elk veld staat waar het antwoord
terechtkomt.

**3.3 De commerciële vragen**: waar wil de klant op groeien, wat wil hij juist niet meer, welke
klantgroepen, welke plaatsen, wat is een klant waard, het seizoen, veelgehoorde bezwaren, **verboden
onderwerpen en verboden woorden**, extra bewijs (certificaten, cijfers), gelijknamige bedrijven, en
waar hij over een jaar wil staan.

**3.4 Het tekstvak "Verhalen".** Twee of drie typische klussen, hoe het bedrijf werkt in eigen
woorden, bezwaren en wat de ondernemer dan zegt, wat het bewust niet doet, waarom het ooit begon. Dit
gaat letterlijk mee naar de schrijver van **elke** pagina. Hoe beter dit vak, hoe eigener elke tekst.

**3.5 De stemvoorbeelden.** Eén tot drie adressen van pagina's waarop de stem van het bedrijf goed te
horen is (mag ook een blog of een andere site van de ondernemer zijn). Na het opslaan haalt de app de
tekst op, tot 2.000 tekens per pagina. Lukt dat niet, dan staat er "Deze pagina konden we niet
lezen". Zonder stemvoorbeelden gebruikt de schrijver de tekst van de homepage.

**3.6 Optioneel**: een tarievenpagina, brochure of offertetekst plakken (daar komen feiten uit), of een
verandering vastleggen die niet op de site staat (een nieuwe naam, een vestiging, een dienst die
stopt).

**3.7 "Onderzoek bijwerken"**, als er iets veranderde dat het onderzoek raakt. De app toont eerst een
kostenschatting en herhaalt alleen de stappen die de wijziging raakt: een ander werkgebied geeft
nieuwe meetvragen en een nieuwe kennistest, een nieuwe concurrent alleen een nieuw marktonderzoek.

**3.8 Het gesprek vastleggen**, met aantekeningen. Het merk springt naar "Gesprek gehad".

**Onder de motorkap.** Scherm `app/(app)/merk/[id]/_components/onboarding-session.tsx`. Opslaan per
veld via `PATCH /api/profiles/[id]` (herkomst `gesprek`). `verhalen` gaat naar `profiles.verhalen`;
de stemadressen gaan naar `profiles.stem_voorbeelden`, opgehaald na het antwoord met `after()` in
`lib/pagina/stemvoorbeelden.ts`. Verboden woorden staan in `profiles.taboo_phrases`, verboden
onderwerpen in `forbidden_topics`. Bijwerken via `POST /api/profiles/[id]/refresh`
(`lib/pipeline/onboarding-refresh.ts` bepaalt welke stappen opnieuw draaien).

**Controleer**

- [ ] Een veld dat je invult, staat er nog na het verversen van de pagina.
- [ ] Na het opslaan van de stemadressen staat bij elk adres tekst, of een duidelijke foutmelding
      (`select stem_voorbeelden from profiles where id = '<id>'`).
- [ ] "Verhalen" is gevuld met echte, concrete voorbeelden.
- [ ] Verboden woorden zijn volledig. Bij de proef van 26 september 2026 schreef de app "gratis"
      omdat dat woord hier ontbrak: de schrijver kan alleen vermijden wat hier staat.
- [ ] Na het vastleggen staat het merk op "Gesprek gehad".

---

## Fase 4. De klant toegang geven

*Wie: de consultant. Waar: Admin, Toewijzen (`/merk/[id]/admin/toewijzen`). Kost: niets.*

**4.1 Een inlog voor de klant.** Twee manieren: een uitnodiging vanuit het account (de app geeft een
link terug die de consultant zelf doorstuurt, want e-mail staat uit; de klant kiest zelf een
wachtwoord), of een gebruiker die de eigenaar in Supabase aanmaakt. Zelf registreren kan niet.

**4.2 Het merk toewijzen aan de klant.** Het merk en alle clusters eronder verhuizen naar het account
van de klant. De consultant houdt volledige toegang.

**4.3 Het pakket kiezen**: hoeveel pagina's per maand (5, 10 of 20). Dit staat op hetzelfde scherm en
is nodig voor het contentplan (fase 8). Zonder pakket kan de app geen plan opstellen.

**4.4 Het merk springt naar "Overgedragen".**

Je mag deze fase ook later doen, bijvoorbeeld na de meting. Voor de test is het handig om het nu te
doen, zodat je in de volgende fasen ook als klant kunt meekijken.

**Onder de motorkap.** Uitnodigen: `POST /api/accounts/[id]/invites`, accepteren via
`/uitnodiging/[token]`. Toewijzen: `POST /api/profiles/[id]/assign` zet `profiles.user_id`,
`account_id` en `assigned_at`, en verplaatst `analyses.user_id` mee (alleen die twee tabellen hebben
`user_id`; de rest volgt via `analysis_id` en RLS). Pakket: `accounts.package_pages_per_month`
(`lib/package-sizes.ts`, `package-box.tsx`).

**Controleer**

- [ ] De klant kan inloggen en ziet zijn merk, zonder de Admin-onderdelen.
- [ ] Het pakket staat ingevuld op het toewijzingsscherm.

---

## Fase 5. Een cluster opzetten

*Wie: de consultant. Waar: Strategie, Clusters (`/merk/[id]/strategie/clusters`). Kost: een paar
dollarcent voor de voorbereiding.*

Een **cluster** is één onderwerp waarop het merk gemeten wordt, bijvoorbeeld "cv-ketel vervangen".
In de code heet een cluster een analyse.

**5.1 Een onderwerp kiezen.** Uit de voorgestelde onderwerpen van stap 2.6 keurt de consultant er één
goed, of hij typt zelf een onderwerp in.

**5.2 Het cluster starten.** Er komt een nieuwe analyse bij met de status "bezig".

**5.3 Het onderwerp onderzoeken.** Een AI-aanroep met zoeken op het web: wat zegt de eigen site al
over dit onderwerp, en wie zijn hier de concurrenten.

**5.4 De meetvragen opstellen.** Realistische vragen die iemand aan een AI-assistent stelt, verdeeld
over drie fases van de klantreis: oriëntatie, overweging en beslissing. Standaard tien per fase, dus
dertig. Zonder merknaam of concurrentnaam. Bij een lokaal bedrijf zijn alle vragen regionaal.

**5.5 De analyse gaat naar "concept klaar".** Daarna schat de app nog in hoe vaak elke vraag ongeveer
gesteld wordt; dat houdt niemand tegen.

**5.6 De goedkeuringspoort.** De consultant (samen met de klant) leest de vragen, past aan, zet uit wat
niet past, en klikt **"Bevestig en start meting"**. Dit is de eerste bewuste stop: er wordt pas
gemeten ná deze klik.

**Onder de motorkap.** Onderwerp goedkeuren: `PATCH /api/profiles/[id]/topics`; starten:
`POST /api/profiles/[id]/topics` (maakt de rij in `analyses`, `analyse_starten`, alleen beheerder).
Zelf intypen: `POST /api/analyses`. Taken: `prepare_analysis` → één `generate_prompts` per
funnelfase → de laatste zet de analyse op `concept_klaar` en plant `calibrate_volumes` in
(`lib/pipeline/prepare.ts`). Vragen staan in `prompts`. De poort is
`POST /api/analyses/[id]/confirm` (`meting_starten`, alleen beheerder, weigert als er nul vragen
aanstaan). Het conceptscherm is `/analyses/[id]/concept`.

**Controleer**

- [ ] Na het starten verschijnt het cluster op het clusterscherm.
- [ ] Binnen enkele minuten staat de analyse op `concept_klaar` met dertig vragen.
- [ ] De vragen klinken als echte vragen van klanten, bevatten geen merknaam, en zijn regionaal als
      het bedrijf lokaal werkt.

---

## Fase 6. De meting

*Wie: niemand, het loopt vanzelf. Kost: ongeveer 82 dollarcent per meetronde, waarvan ongeveer 95
procent in het stellen van de vragen zelf.*

**6.1 Na de bevestiging ga je terug naar de clusters**, met de melding "Cluster gelanceerd". De meting
loopt op de achtergrond; er is geen apart wachtscherm meer.

**6.2 Elke vraag wordt gesteld aan ChatGPT met zoeken op het web**, zodat het antwoord lijkt op wat een
echte gebruiker ziet. De acht zwaarste vragen worden drie keer gemeten, omdat één antwoord toeval kan
zijn. Staan Google AI Overview of Gemini aan, dan meten die mee.

**6.3 Per antwoord beoordeelt de app** of het merk genoemd wordt, waar precies, en welke concurrenten
genoemd worden. Een vraag waarbij geen enkele aanbieder genoemd wordt, telt apart en niet als verlies.

**6.4 Alles wordt opgeteld tot één score**, met een marge die zegt hoe zeker die score is. De analyse
gaat naar "gemeten".

**6.5 Het concurrentprofiel**: per concurrent welke eigenschappen hem laten winnen, met een letterlijk
citaat als bewijs.

**Onder de motorkap.** `enqueueMeasurement` zet één `measure_prompt` per vraag in de rij (plus
`measure_ai_overview` en `measure_llm_response` als die bronnen aanstaan). De laatste afgeronde
meettaak plant `aggregate_week` in (`scheduleAggregateIfLastPrompt`), die plant
`profile_competitors` in, en die `generate_report`. Antwoorden staan in `tracking_runs`
(`raw_response`), de score in de weekaggregatie. Een definitief mislukte laatste meting trapt de
vervolgketen toch af.

**Controleer**

- [ ] Alle `measure_prompt`-taken van de analyse zijn `done`.
- [ ] De analyse staat op `gemeten` en daarna op `gereed`.
- [ ] Op Analytics, gefilterd op dit cluster, staan de score en de concurrenten, en ze kloppen met
      wat je zelf verwacht van dit bedrijf.

---

## Fase 7. Het rapport en de kansen

*Wie: niemand. Kost: een paar dollarcent.*

**7.1 De app zoekt waar concurrenten winnen**, met bewijs uit de antwoorden.

**7.2 De app legt de aanbodboom naast de bestaande pagina's** en bepaalt per dienst of er al een eigen
pagina is, een zwakke, of geen. Zo mist een dienst die de meting toevallig niet raakte niet
stilletjes.

**7.3 Het rapport met aanbevolen pagina's.** Elke aanbeveling heeft een titel, een soort pagina, de
bedoelde zoekintentie, een reden, de meetvragen waarop het merk gemist werd, en of het om een
**nieuwe** pagina gaat of om het **verbeteren** van een bestaande (dan met het adres erbij). Een
merknaam die niet in het bewijs van die vraag staat, haalt de code eruit.

**7.4 Daarna, op de achtergrond**: de potentie van alle onderwerpen van het merk wordt opnieuw
berekend, en er start een onderzoek naar externe websites waarop het merk wel of niet staat.

**Onder de motorkap.** `generate_report` (`lib/pipeline/report.ts`) schrijft `reports` met
`recommendations_json`; elke aanbeveling heeft `targets` met de vraagtekst en het `runId` van de
meting. Daarna `recalculate_potential` (per merk) en `offsite_scan`. De rapportmail slaat over zolang
`EMAILS_ENABLED` uit staat.

**Controleer**

- [ ] `select jsonb_array_length(recommendations_json) from reports where analysis_id = '<id>'`
      geeft een aantal aanbevelingen groter dan nul.
- [ ] De aanbevelingen gaan over diensten die het bedrijf echt levert.

---

## Fase 8. Het contentplan

*Wie: de consultant, samen met de klant. Waar: Strategie, Contentplan
(`/merk/[id]/strategie/plan`). Kost: niets tot het vrijgeven van een maand.*

**8.1 De kansen komen vanzelf in de voorraad.** Elke aanbeveling uit het laatste rapport van een
gemeten cluster wordt een kaart in de voorraad van het contentplan. Er wordt nooit een kaart gewist.

**8.2 Het plan opstellen.** Eén klik maakt twaalf lege maanden en zet de kaarten met de meeste
potentie in maand 1, tot het pakket vol is. De rest van het jaar stelt de consultant samen met de
klant samen.

**8.3 Kaarten verschuiven.** "Inplannen" zet een kaart uit de voorraad in een maand; "naar voorraad"
haalt hem terug. Dat kost niets en de klant mag het ook zelf. Elke pagina krijgt een publicatiedatum,
verspreid over de maand.

**8.4 De maand vrijgeven.** Dit is de knop die geld kost: alleen de beheerder. De klant zegt akkoord,
de consultant drukt. Direct daarna begint de voorbereiding van alle pagina's van die maand (fase 9).

**8.5 Een kaart die later in een al vrijgegeven maand komt**, start meteen zijn eigen voorbereiding.

**Onder de motorkap.** De voorraad is `planned_pages` met `plan_month_id = null`, gevuld door
`syncBacklog()` (`lib/plan-backlog-data.ts`) bij elke keer dat het plan geladen wordt. `source_ref`
is `<rapport-id>#<volgnummer>` en is de lijn terug naar de meetvragen. Plan opstellen:
`POST /api/profiles/[id]/plan` (`content_schrijven`, alleen beheerder; het pakket komt van het
account). Inplannen: `PATCH /api/profiles/[id]/plan/pages/[pageId]` met `actie: "inplannen"`, daarna
`bereidVoor()` (doet niets als de maand niet vrijgegeven is). Vrijgeven:
`PATCH .../plan/months/[monthId]` met `actie: "goedkeuren"` (`plan_goedkeuren`, dagplafond), zet
`plan_months.status = 'goedgekeurd'` en roept `bereidMaandVoor()` aan. Datumspreiding:
`spreadDates()` in `lib/plan-schedule.ts`.

**Controleer**

- [ ] De voorraad toont de aanbevelingen van fase 7.
- [ ] Na het opstellen staan er in maand 1 zoveel pagina's als het pakket zegt (of minder als er
      minder kansen zijn), met publicatiedata in de toekomst.
- [ ] Na het vrijgeven staat de maand op "vrijgegeven" en de pagina's op "Wordt voorbereid".

---

## Fase 9. De voorbereiding van de pagina's

*Wie: niemand. Duur: ongeveer een halve minuut per pagina, na elkaar. Kost: 6 tot 7,5 dollarcent per
pagina.*

Vanaf hier werkt de nieuwe contentketen, opnieuw gebouwd op 25 en 26 september 2026.

**9.1 Per pagina zoekt de app het cluster waar hij bij hoort.** Hangt een pagina aan geen gemeten
cluster, dan wordt hij niet voorbereid en toont het plan "Geen cluster".

**9.2 Er komt een paginarij** met de stand "voorbereiden". Staat er onder dat cluster al een pagina met
dezelfde titel, dan wordt die gebruikt.

**9.3 De vaste open vraag komt klaar te staan**: "Wat wil je zelf op deze pagina vertellen?", met
uitleg en voorbeelden. Deze vraag maakt de code, geen AI. Hij is er dus altijd, ook als de volgende
stap mislukt, en nooit dubbel.

**9.4 Het feitenregister van het merk wordt bijgewerkt.** Een feit waarover twee versies bestaan, gaat
daardoor niet mee naar de schrijver.

**9.5 De pagina's komen in een rij, op volgorde van publicatiedatum.** De content brief (stap 9.6)
draait per pagina, **na elkaar**. Zo ziet elke volgende brief de vragen die de vorige al stelde, en
krijgt de klant niet vijf keer dezelfde vraag in andere woorden.

**9.6 De content brief** (AI-aanroep 1 van de pagina). Het sterkste model doet onderzoek op het web.
Het krijgt mee:
- de titel, de soort pagina, de zoekintentie en de reden uit het plan;
- de meetvragen van deze aanbeveling, met wat ChatGPT nu antwoordt (namen van concurrenten
  weggehaald);
- de merknaam en het werkgebied;
- **de bedrijfskennis**: tot 150 feiten die bij deze pagina passen (het sterkste bewijs eerst, nooit
  een betwist of vervangen feit), waar het bedrijf voor staat, wat het anders doet, bewijs dat niet
  op de site staat, de Verhalen, de bezwaren met het antwoord van de ondernemer, en eerder
  beantwoorde vragen voor het hele merk;
- de 200 nieuwste vragen die het merk al kreeg;
- bij "verbeteren": de huidige tekst van de pagina, één keer van de site opgehaald.

Het levert: wat de bezoeker zoekt in zijn eigen woorden, wat hij verder wil weten, wat goede pagina's
doen en laten liggen, vakkennis met een bron, wat klanten vaak verkeerd begrijpen, **tot acht vragen
aan de ondernemer** (elk met een uitleg waarom), en welke al openstaande vragen ook voor deze pagina
gelden. De brief maakt geen keuzes voor de schrijver: geen opbouw, geen lengte.

**9.7 De code ruimt op.** Vakkennis zonder webadres valt weg. Een vraag die het merk al eens kreeg, ook
in iets andere woorden, valt weg. Er blijven er hooguit acht. Een keuzevraag zonder keuzes wordt een
korte tekstvraag.

**9.8 Eerst de vragen opslaan, dan de brief.** Andersom zou de app heel even denken dat er nul vragen
zijn en te vroeg gaan schrijven. Een vraag die voor het hele merk geldt, hangt aan geen cluster: het
antwoord gaat daarna mee naar elke pagina. Een al openstaande vraag krijgt deze pagina erbij en wordt
niet opnieuw gesteld.

**9.9 De volgende pagina van de rij is aan de beurt**, en voor deze pagina vraagt de app of hij al
geschreven mag worden (fase 11).

**9.10 Mislukt de brief vier keer**, dan krijgt de pagina een brief zonder onderzoek en gaat hij door
met alleen de open vraag. De tekst wordt minder goed, maar de pagina blijft niet hangen, en de rij
gaat door.

**Onder de motorkap.** `bereidVoor()` en `bereidMaandVoor()` in `lib/pagina/start.ts`: rij in
`content_pieces` (`status = 'briefing'`), `planned_pages.content_piece_id` gezet, `maakOpenVraag()`
(`lib/pagina/open-vraag.ts`, rij in `fact_requests` met `open_vraag = true`), `fact_register` per
merk, dan `planBriefs()` met de rij in de payload. Taak `pagina_brief` → `maakBrief()` in
`lib/pagina/brief.ts`: invoer uit `lib/pagina/context.ts`, bedrijfskennis uit
`lib/pagina/bedrijfskennis.ts` (`kiesFeiten`, `blokA`), opdracht in `brief-opdracht.ts`, schema en
nabewerking in `brief-regels.ts` (`BRIEF_VERSIE = 3`, `MAX_BRIEFVRAGEN = 8`), `webSearch: true`,
werksoort `analytical`. Opslag: `content_pieces.brief_json = { onderzoek, bedrijf, versie }`, vragen
in `fact_requests` (`reason` is het waarom, `scope` is `pagina` of `merk`, de soort in `raw_json`).
Bestaat `brief_json` al, dan geen aanroep. Definitief mislukt: `briefGafOp()` →
`markeerBriefMislukt()`.

**Controleer**

- [ ] Elke pagina van de maand heeft precies één open vraag
      (`select count(*) from fact_requests where open_vraag and '<piece-id>' = any(content_piece_ids)`).
- [ ] Binnen ongeveer tien minuten heeft elke pagina een `brief_json`.
- [ ] De gerichte vragen gaan over wat alleen deze ondernemer weet (zijn werkwijze, voorbeelden,
      prijzen, twijfels van klanten), niet over algemene kennis.
- [ ] Bij de tweede en volgende pagina worden geen vragen herhaald die al bij de eerste stonden.
- [ ] De kosten per brief in `ai_calls` (`kind = 'pagina_brief'`) liggen rond 6 tot 7,5 dollarcent.

---

## Fase 10. De vragen aan de klant

*Wie: de klant, of de consultant samen met de klant in een gesprek. Waar: Strategie, Openstaande
vragen (`/merk/[id]/strategie/vragen`), of het scherm van de pagina zelf. Kost: niets.*

**Dit is het belangrijkste moment van de hele keten.** Wat de ondernemer hier vertelt, maakt het
verschil tussen een eigen pagina en een algemene AI-tekst.

**10.1 De vragen staan per pagina bij elkaar.** De open vraag staat bovenaan, met een groot tekstvak
tot 3.000 tekens. Bij elke gerichte vraag staat in één zin waarom we hem stellen. Een vraag voor het
hele merk staat er één keer.

**10.2 De consultant mag de vragen samen met de ondernemer invullen**, in diens woorden. Vooral de open
vraag: dat is het belangrijkste stuk invoer, en het mag niet afhangen van of de klant zelf gaat typen.

**10.3 Beantwoorden of overslaan.** Een gerichte vraag heeft ruimte voor 500 tekens. Overslaan mag
altijd en telt als antwoord.

**10.4 Wat er met een antwoord gebeurt.** Het antwoord op de open vraag gaat letterlijk naar de
schrijver; het wordt niet in losse feiten geknipt. Een antwoord op een gerichte vraag gaat naar de
schrijver van die pagina. Een antwoord op een vraag voor het hele merk gaat naar elke volgende pagina.
Een antwoord kan nog aangepast worden tot het schrijven begint.

**10.5 Na elk antwoord kijkt de app of de pagina geschreven mag worden** (fase 11). Er is geen knop
"schrijf nu": het laatste antwoord is de handeling.

**Onder de motorkap.** `PATCH /api/profiles/[id]/facts` (eigenaarschap via `getOwnedProfile`): met
`skip: true` wordt `status = 'overgeslagen'`, anders `answerFact()` in `lib/facts.ts` (de open vraag
wordt alleen opgeslagen; een gewoon antwoord kan ook naar `proof_points`). Daarna, na het antwoord
aan de klant, `after(() => probeerNaAntwoord(...))`, dat voor elke pagina in `content_piece_ids` de
schrijfpoort vraagt. Het vragenscherm is `components/pagina/vragenlijst.tsx`.

**Controleer**

- [ ] Beantwoorden en overslaan werken, en een beantwoorde vraag verdwijnt uit de open vragen.
- [ ] Een lang verhaal van meer dan 500 tekens in de open vraag wordt volledig bewaard.
- [ ] Na de laatste vraag van een pagina meldt het scherm "We beginnen nu met schrijven" of de dag
      waarop het schrijven begint.

---

## Fase 11. Het schrijven

*Wie: niemand. Duur: ongeveer een minuut per pagina. Kost: 3 tot 4 dollarcent per pagina.*

**11.1 De schrijfpoort.** Een pagina mag geschreven worden als aan twee regels is voldaan, en niet
meer:
- de brief is klaar en er staat precies nul vragen open (weet de app het aantal niet zeker, dan telt
  dat als "nog niet");
- de publicatiedatum ligt binnen tien dagen.

Er komt nooit een schrijftaak met een openstaande vraag, en er is geen uiterste datum waarna de app
toch schrijft. Laat de klant zijn vragen liggen, dan blijft de pagina wachten.

**11.2 Elke ochtend om 04:00 UTC controleert de app hetzelfde** voor alle vrijgegeven maanden. Dat is
het vangnet: een voorbereiding die niet startte, start dan alsnog, een pagina die aan de beurt is,
gaat schrijven, en een pagina waarvan het schrijven mislukte, krijgt een nieuwe kans.

**11.3 "Nu laten schrijven"** (beheerder, in het menu van een pagina in het plan). De maand en de
datum tellen dan niet, de vragen wel. Staan er nog vragen open, dan zegt het scherm dat.

**11.4 Precies één schrijftaak per pagina.** De pagina springt van "voorbereiden" naar "schrijven", en
alleen wie die sprong maakt, plant de taak in. Twee antwoorden die tegelijk binnenkomen, leveren dus
één tekst op.

**11.5 Wat de schrijver krijgt**, in deze volgorde:
- **Zoekintentie**: wat de bezoeker wil, met de meetvragen.
- **Wat we zeker weten over het bedrijf**: de bedrijfskennis van stap 9.6.
- **Wat de ondernemer vertelde**: de open vraag letterlijk, en de antwoorden op de gerichte vragen.
- **Wat een goede pagina behandelt**: het onderzoek uit de brief, met de melding dat dit algemene
  kennis is en niet zegt wat dit bedrijf doet.
- **Zo klinkt dit bedrijf**: de stemvoorbeelden, of de homepage.
- De titels van tot 60 andere pagina's van het merk, om overlap te voorkomen, en bij "verbeteren" de
  huidige tekst.

**11.6 De schrijfopdracht** (versie 3) vraagt de beste pagina voor deze vraag: volledig, natuurlijk,
concreet, zo lang als nodig. Algemene kennis mag uitleggen, maar mag nooit klinken als een werkwijze
of belofte van dit bedrijf. Niets verzinnen: wat de schrijver niet weet, laat hij weg. Daarbij de
huisregels: de aanspreekvorm, de verboden onderwerpen en woorden, geen gedachtestreepjes, een
veelgestelde vraag alleen met een antwoord dat uit de informatie blijkt, en een praktijkvoorbeeld
alleen op de pagina waar het over gaat. Geen woordenbudget, geen verplichte opbouw, geen
bronverwijzingen.

**11.7 Het sterkste model schrijft met veel denktijd, op de achtergrond.** De app start de aanroep,
bewaart meteen het nummer ervan, en haalt het resultaat later op. Is het nog niet klaar, dan volgt een
nieuwe ophaalronde zonder opnieuw te betalen. Breekt OpenAI de aanroep af, dan mag hij één keer
opnieuw starten.

**11.8 De schrijver levert**: een titel, een metatitel, een metabeschrijving, de tekst, nul tot vijf
veelgestelde vragen, en een notitie met wat hij nog had willen weten.

**11.9 De code repareert alleen mechanisch**: gedachtestreepjes eruit, metatitel tot 60 en
metabeschrijving tot 160 tekens. Repareren, nooit tegenhouden.

**11.10 Opslaan**: de tekst, de metadata, de veelgestelde vragen, gestructureerde gegevens voor
zoekmachines, en de volledige ruwe uitvoer met het versienummer van de opdracht. De titel uit het
plan blijft de titel van de pagina.

**11.11 Geeft het schrijven op**, dan gaat de pagina terug naar "voorbereiden" en toont het plan
"Schrijven mislukt". De ochtendronde probeert het de volgende dag opnieuw.

**Onder de motorkap.** Schrijfpoort: `schrijfpoort()` in `lib/pagina/schrijfpoort.ts` (puur;
`SCHRIJFVOORSPRONG_DAGEN = 10` in `lib/plan-status.ts`), aangeroepen via `probeerTeSchrijven()` in
`start.ts` (voorwaardelijke update `briefing` → `draft`, dan `pagina_schrijven`, plan-pagina naar
`schrijven`). Ochtendronde: `ochtendronde()`, via `pg_cron` `orbit-engine-plan-writer` naar
`/api/cron/plan`. "Nu laten schrijven": `actie: "schrijf_nu"` op de plan-pagina-route
(`negeerMaand`, `negeerDatum`). Schrijven: `voerSchrijvenUit()` in `lib/pagina/taken.ts`, invoer uit
`laadSchrijfbasis()` in `schrijven.ts`, opdracht in `schrijfopdracht.ts`
(`SCHRIJFOPDRACHT_VERSIE = 3`), werksoort `redactioneel`, achtergrondmodus via
`startStructuredAchtergrond` en `haalStructuredOp`. Reparatie: `repareerMechanisch()` in
`mechanisch.ts`. Opslag in `content_pieces`: `body_markdown`, `meta_title`, `meta_description`,
`faq_json`, `schema_jsonld`, `raw_json` (met `schrijfopdracht_versie` en de ruwe `uitvoer`).
Definitief mislukt: `schrijvenGafOp()`.

**Controleer**

- [ ] Een pagina met open vragen krijgt geen schrijftaak, ook niet via "nu laten schrijven".
- [ ] Na de laatste vraag staat er binnen een paar minuten een `pagina_schrijven`-taak, en even later
      tekst in `body_markdown`.
- [ ] `raw_json->>'schrijfopdracht_versie'` is 3.
- [ ] De tekst bevat geen gedachtestreepjes en de metatitel is hooguit 60 tekens.

---

## Fase 12. De controle en hooguit één herschrijving

*Wie: niemand. Kost: 1 tot 1,5 dollarcent voor de controle, 2,6 tot 4,3 dollarcent voor een
herschrijving.*

**12.1 De code zoekt harde beweringen**: bedragen, getallen met een eenheid, jaartallen, en woorden als
"garantie", "gecertificeerd", "altijd" of "de beste" in een zin over het bedrijf. Voor elke bewering
kijkt de code of hij terugkomt in de bedrijfskennis, de antwoorden van de ondernemer, de
stemvoorbeelden of de vakkennis uit de brief. Staat er ergens een ontkenning bij ("geen garantie"),
dan telt hij niet als gedekt. Telefoonnummers, postcodes en huisnummers tellen niet. Bij twijfel
liever onterecht geel dan onterecht goed.

**12.2 De code zoekt de verboden woorden** van het merk.

**12.3 Eén beoordeling door het sterkste model, als eindredacteur** (AI-aanroep 3). Twee vragen:
- *Klopt het?* Staan er claims over het bedrijf in die niet uit de informatie blijken? Algemene kennis
  die klinkt als iets wat dit bedrijf doet of belooft, telt ook als verzonnen.
- *Is het goed?* Is de hoofdvraag meteen beantwoord, is het natuurlijk, klinkt het als het bedrijf, is
  er genoeg diepgang, staat er iets in dat echt van dit bedrijf komt?

De uitkomst is "goed" of "niet goed", de letterlijke verzonnen zinnen, en hooguit vijf concrete
punten. Geen cijfer.

**12.4 De beslissing is regelwerk.** Herschrijven als het oordeel "niet goed" is, of als er verzonnen,
onbewezen of verboden zinnen zijn. Anders gaat de pagina direct naar de klant (stap 12.8).

**12.5 De herschrijving** (AI-aanroep 4, niet altijd). Dezelfde schrijver en dezelfde opdracht, plus de
vorige versie en de feedback: de punten, de verzonnen en onbewezen zinnen ("haal weg of schrijf zonder
de bewering") en de zinnen met een verboden woord. Ook op de achtergrond.

**12.6 De code kiest welke versie blijft.** De nieuwe, tenzij die meer onbewezen zinnen heeft dan de
vorige. Die keuze wordt vastgelegd.

**12.7 Er komt geen tweede beoordeling en geen tweede herschrijving.**

**12.8 Gele zinnen.** Zinnen die daarna nog onbewezen zijn, een verboden woord bevatten, of door de
eindredacteur verzonnen genoemd werden en er nog staan, worden geel. Een gele zin houdt de pagina niet
tegen, maar de klant moet hem bevestigen of aanpassen voor hij goedkeurt.

**12.9 De pagina staat op "Lees en keur goed"**, en in het plan op "ter goedkeuring".

**12.10 Mislukt de beoordeling helemaal**, dan komt er geen herschrijving: de onbewezen zinnen worden
geel en de pagina gaat toch naar de klant. Mislukt de herschrijving, dan blijft de eerste versie
staan met de gele zinnen.

**Onder de motorkap.** `voerControleUit()` in `lib/pagina/taken.ts`: `controleerHardeBeweringen()` en
`geleZinnen()` uit `harde-beweringen.ts`, `zinnenMetVerbodenWoord()` uit `controle-regels.ts`, dan
`callStructured` met `CONTROLE_SYSTEEM`, werksoort `judging`, directe aanroep. `moetHerschrijven()`
beslist; bij ja komt `controle_json` alvast in de rij en volgt `pagina_herschrijven`. Herschrijven:
`voerHerschrijvenUit()` met `herschrijfInvoer()`, versiekeuze `kiesVersie()`, gele zinnen
`geleZinnenNa()`. Klaar: `zetKlaar()` zet `status = 'ready'`, `needs_review = true`, `controle_json`
(met `ongedekt`, `verboden`, `beoordeling`, `herschreven`, `herschrijving`, `gele_zinnen`,
`bevestigd`) en `planned_pages.status = 'ter_goedkeuring'`. Mislukt: `controleGafOp()`,
`herschrijvenGafOp()`.

**Controleer**

- [ ] `controle_json` is gevuld, met een `beoordeling` (of `null` als die mislukte).
- [ ] Er is hooguit één `pagina_herschrijven`-taak per pagina (zonder wens van de klant).
- [ ] Elke gele zin is een zin die je zelf ook zou willen nalopen. Tel de valse alarmen.
- [ ] Alle kosten van deze pagina samen (`select sum(cost_usd) from ai_calls where content_piece_id =
      '<piece-id>'`) liggen onder de 50 dollarcent. Op de proef was het 10 tot 17.

---

## Fase 13. Lezen, goedkeuren en opleveren

*Wie: de klant, eventueel met de consultant. Waar: het scherm van de pagina
(`/merk/[id]/strategie/bibliotheek/[paginaId]`), te bereiken vanuit het plan, de bibliotheek of de
startpagina. Kost: een aanpassing kost ongeveer 3 dollarcent.*

**13.1 De klant leest de tekst opgemaakt**, met koppen en lijsten. Bovenaan staat de notitie van de
schrijver als die er is ("wat ik nog had willen weten").

**13.2 De gele zinnen staan geel in de tekst**, met per zin "Klopt" en "Pas aan". De punten van de
eindredacteur staan erbij als "Wat we nog zien", maar alleen als er niet herschreven is.

**13.3 "Klopt"** bevestigt een gele zin. **Zelf aanpassen**: de klant kan de tekst bewerken; een gele
zin die daarna niet meer in de tekst staat, hoeft niet meer bevestigd te worden.

**13.4 "Vraag een aanpassing"** (tot 2.000 tekens). De schrijver maakt een nieuwe versie met die wens
erin, zonder nieuwe beoordeling. De oude versie blijft bewaard, de wens wordt bij de nieuwe versie
opgeslagen, en het plan en de vragen wijzen daarna naar de nieuwe versie. Onbewezen zinnen in de nieuwe
versie worden meteen geel.

**13.5 "Keur goed"** werkt pas als elke gele zin bevestigd of weggeschreven is. Daarna staat de pagina
in het plan op "goedgekeurd" en op het scherm op "Plaats hem op je site".

**13.6 Opleveren.** De klant neemt de goedgekeurde tekst over op zijn eigen website. ORBIT ENGINE
publiceert nooit zelf; er is geen koppeling met het systeem van de klant. **Let op**: zie bijlage A,
punt 1. Op dit moment ziet de klant alleen de tekst zelf, niet de metatitel, de metabeschrijving, de
veelgestelde vragen en de gestructureerde gegevens.

**13.7 Daarna** vult de klant het live-adres in ("Deze pagina staat live"). De app controleert of de
tekst er echt staat en plant de nameting na 14 en 28 dagen. Dat deel staat in
[`processtappen-nieuwe-pagina.md`](./processtappen-nieuwe-pagina.md) fase 14 en 15.

**Onder de motorkap.** Scherm: `app/(app)/merk/[id]/strategie/bibliotheek/[paginaId]/page.tsx` met
`components/pagina/goedkeuren.tsx` en `publish-box.tsx`. Een zin bevestigen:
`POST /api/profiles/[id]/paginas/[pieceId]/zinnen` (`bevestigZin()`, alleen zinnen die echt geel
zijn). Goedkeuren en aanpassing: `POST /api/profiles/[id]/paginas/[pieceId]` met `actie: "goedkeuren"`
(`keurGoed()` in `lib/pagina/goedkeuren.ts`: `needs_review = false`, `reviewed_at`, `reviewed_by`,
plan-pagina naar `goedgekeurd`) of `actie: "aanpassing"` (dagplafond, `pagina_herschrijven` met
`klantNotitie`; `nieuweVersie()` maakt een rij met `version + 1`, `supersedes_id` en
`revision_note`). Handmatig bewerken gaat via de bestaande contentroute
(`/api/analyses/[id]/content/[pieceId]`); de tekst van het model blijft in
`raw_json.uitvoer.tekst_markdown` staan, zodat je later kunt zien wat de klant veranderde.

**Controleer**

- [ ] De gele zinnen zijn geel, en "Keur goed" werkt niet zolang er één onbevestigd is.
- [ ] Een aanpassing levert versie 2 op met de wens erin, en het plan wijst naar versie 2.
- [ ] Na goedkeuren staat de pagina op "Plaats hem op je site".
- [ ] Vraag de ondernemer per pagina: zou je deze zo op je site zetten ("ja, zo", "met kleine
      wijzigingen" of "nee")? Dat is de enige maatstaf die telt.
- [ ] Maak daarna het rapport van wat de ondernemer veranderde, volgens
      [`tasks/meting-eerste-klant.md`](./tasks/meting-eerste-klant.md).

---

## Bijlage A. Wat nog niet af is, of anders werkt dan je zou denken

Gevonden bij het nalopen van de code voor dit document, 26 september 2026. Houd hier rekening mee
tijdens de doorloop.

1. **De klant kan de metadata, de veelgestelde vragen en de gestructureerde gegevens niet
   meenemen.** De app maakt ze wel en slaat ze op (`meta_title`, `meta_description`, `faq_json`,
   `schema_jsonld`), maar het paginascherm toont alleen de tekst. De exportfunctie die de inhoud
   omzet naar de vorm van de site van de klant (`lib/pipeline/content-export.ts`) bestaat nog, maar
   hangt sinds de ombouw van de contentketen aan geen enkel scherm. Gevolg voor de test: het opleveren
   (stap 13.6) is nu handwerk van de consultant, die de velden uit de database haalt.
2. **Alles wat geld kost, is sinds 2 september 2026 alleen voor de beheerder**: ook een cluster starten,
   de meting bevestigen en het plan opstellen. `docs/architecture.md` §2 en
   `processtappen-nieuwe-pagina.md` fase 4 zeggen op sommige plekken nog dat de klant dat zelf kan.
   De klant ziet de knoppen wel, maar krijgt bij het klikken de melding dat zijn consultant het doet.
3. **`docs/architecture.md` §5, rij 15 tot en met 16b**, beschrijft nog de oude contentketen
   (feitenkaart, vier beoordelaars, kwaliteitslab). De huidige keten staat in fase 9 tot en met 12
   van dit document.
4. **Een pagina zonder gemeten cluster wordt nooit voorbereid.** Een kaart die handmatig in het plan
   komt zonder cluster, blijft op "Geen cluster" staan.
5. **Een klant die zijn vragen laat liggen, houdt zijn eigen pagina onbeperkt tegen.** Dat is een
   bewuste keuze (besluit B5): er is geen uiterste datum.
6. **Kleine beweringen zonder getal** ("een ouder mag meekomen") vangt de controle in code niet; die
   hangen af van de eindredacteur en van de ondernemer.
7. **Verliest een herschrijving op het aantal onbewezen zinnen**, dan blijft de eerste versie staan,
   ook met een taalfout die de herschrijving had verbeterd.

---

## Bijlage B. Statussen

| Wat | Tabel en kolom | Waarden, in volgorde |
|---|---|---|
| Merk, onderzoek | `profiles.status` | `bezig` → `klaar` (of `mislukt`) |
| Merk, fase op het scherm | afgeleid in `lib/profile-stage.ts` | Voorbereiden → Klaar voor het gesprek → Gesprek gehad → Overgedragen |
| Voorgesteld onderwerp | `profile_topics.status` | `voorgesteld` → `goedgekeurd` (of `afgewezen`) |
| Cluster | `analyses.status` | `bezig` → `concept_klaar` → `meten` → `gemeten` → `gereed` (of `mislukt`) |
| Maand in het plan | `plan_months.status` | `concept` → `ter_goedkeuring` → `goedgekeurd` (op het scherm "vrijgegeven"), of `afgewezen` |
| Pagina in het plan | `planned_pages.status` | `gepland` → `schrijven` → `ter_goedkeuring` → `goedgekeurd` → `geplaatst` (of `mislukt`, `afgewezen`) |
| Tekst | `content_pieces.status` | `briefing` → `draft` → `ready` (met `needs_review`) → `published` |
| Vraag | `fact_requests.status` | `open` → `beantwoord` of `overgeslagen` |
| Taak | `jobs.status` | `queued` → `running` → `done` (of `failed` na vier pogingen) |

De stand van een pagina op het scherm ("Wordt voorbereid", "Jouw antwoorden nodig", "Wordt
geschreven", "Lees en keur goed", "Plaats hem op je site", "Schrijven mislukt", "Geen cluster") wordt
afgeleid in `lib/pagina-stand.ts`.

---

## Bijlage C. Kosten en tijd

| Stap | Kost | Duur | Bron |
|---|---|---|---|
| Onderzoek van een nieuw merk (fase 2) | ongeveer 25 dollarcent | tot 10 minuten vooronderzoek, dan ongeveer 7,5 minuut | `README.md` |
| Eén meetronde van een cluster (fase 6) | ongeveer 82 dollarcent | afhankelijk van de wachtrij | `CLAUDE.md` |
| Content brief per pagina | 6 tot 7,5 dollarcent | 21 tot 30 seconden | proef 26 september 2026 |
| Schrijven per pagina | 3 tot 4 dollarcent | ongeveer een minuut | proef 26 september 2026 |
| Controle per pagina | 1 tot 1,5 dollarcent | enkele seconden | proef 26 september 2026 |
| Herschrijven (5 van de 9 pagina's) | 2,6 tot 4,3 dollarcent | ongeveer een minuut | proef 26 september 2026 |
| Totaal per pagina | 10 tot 17 dollarcent | | proef 26 september 2026 |
| Een maand vrijgeven bij pakket 10 | ruwweg $1 tot $1,70 | | `plan/months/[monthId]/route.ts` |

De grens is 50 dollarcent per pagina (besluit B4). Er is dus ruimte om de keten duurder te maken als
dat de kwaliteit helpt. De proefcijfers komen uit
`docs/tasks/kwaliteitsdoorlichting/contentketen-proef/` en `contentketen-opnieuw.md` §12.

---

## Bijlage D. Handige query's tijdens de doorloop

Vervang `<profiel-id>` door het id van het testmerk (staat in de adresbalk: `/merk/<id>`).

**Wat draait er, en wat ging er mis?**

```sql
select j.type, j.status, j.attempts, j.last_error, j.scheduled_for, j.finished_at
from jobs j
left join analyses a on a.id = j.analysis_id
where j.profile_id = '<profiel-id>' or a.profile_id = '<profiel-id>'
order by j.created_at desc
limit 50;
```

**Wat kostte het tot nu toe, per soort aanroep?**

```sql
select c.kind, count(*) as aanroepen, round(sum(c.cost_usd)::numeric, 3) as dollar
from ai_calls c
left join analyses a on a.id = c.analysis_id
where c.profile_id = '<profiel-id>' or a.profile_id = '<profiel-id>'
group by c.kind
order by dollar desc;
```

**Waar staan de pagina's?**

```sql
select p.title, p.status as plan, p.scheduled_for, c.status as tekst, c.needs_review,
       (c.brief_json is not null) as brief,
       (select count(*) from fact_requests f
         where f.status = 'open' and c.id = any(f.content_piece_ids)) as open_vragen,
       jsonb_array_length(coalesce(c.controle_json->'gele_zinnen', '[]'::jsonb)) as geel
from planned_pages p
left join content_pieces c on c.id = p.content_piece_id
where p.profile_id = '<profiel-id>' and p.plan_month_id is not null
order by p.scheduled_for;
```

**Welke vragen staan er per pagina?**

```sql
select c.title, f.open_vraag, f.scope, f.status, f.question, f.reason
from fact_requests f
join content_pieces c on c.id = any(f.content_piece_ids)
join analyses a on a.id = c.analysis_id
where a.profile_id = '<profiel-id>' and c.is_current
order by c.title, f.open_vraag desc, f.created_at;
```
