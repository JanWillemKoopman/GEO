# Technische audit van de keten, 2 september 2026

Van klant aanmaken tot opgeleverde content, live op productie doorlopen als externe partij.
Totale kosten van deze audit: **$2,18** over 148 AI-aanroepen.

> **Eén ding vooraf over de opzet.** De opdracht was om zonder de documentatie te kijken. Die was in
> deze sessie al gelezen voordat die instructie kwam, en dat valt niet terug te draaien. Alles wat
> hieronder staat rust daarom op code, op de productiedatabase, op de logboeken van de draaiende app
> en op wat de app deed toen hij bediend werd. Waar de documentatie iets beweert, is dat behandeld
> als een claim die bewezen moest worden, en op twee plekken bleek die claim niet te kloppen.

---

## Het oordeel

**De keten werkt van begin tot eind, en hij is nog niet productiewaardig.** Een klant kan vandaag
aangemaakt worden, gemeten worden en een pagina krijgen, en dat gebeurde in deze audit ook zonder
één mislukte taak. Wat eronder zit is niet af: de app laat een klant betaald werk starten, laat een
pagina met eenenzeventig openstaande opmerkingen als "klaar" doorgaan, en publiceert die pagina naar
elk adres dat je intypt, ook een adres dat niet bestaat en een adres van een ander bedrijf.

De kortste weg naar productiewaardig zijn de vijf blokkerende punten hieronder. Dat is werk van
dagen, niet van weken: het zijn stuk voor stuk controles die ontbreken, geen herbouw.

---

## Wat er is gedaan

Een echte doorloop op `https://geo-ten-blush.vercel.app`, ingelogd als beheerder en als klant, met
een echt bedrijf dat geen klant is: **Tandartspraktijk de Kroon** in Noordwijk, een WordPress-site
van 51 pagina's. Gekozen omdat het een andere branche is dan alle eerdere tests, zodat er niets kon
meeliften op eerder werk.

| Stap | Wat er gebeurde |
|---|---|
| Merk aanmaken | 11:06:03, acht taken, alle acht geslaagd |
| Onderzoekspijplijn | klaar om 11:11:20, dus 5 minuten 17 seconden, $0,2438 |
| Cluster en vragen | 30 vragen, 10 per fase |
| Meting | 46 metingen over 30 vragen, 7 minuten, $0,74 |
| Rapport | 5 aanbevelingen, alle vijf een verbetering van een bestaande pagina |
| Pagina verbeteren | briefing, contract, schrijven, drie reparatierondes, $1,08 |
| Publiceren | geaccepteerd, ook naar een vreemd domein |

Daarnaast: de volledige jobgeschiedenis van productie (1522 taken), alle 774 gemeten antwoorden, de
72 serverroutes op hun rechtencontrole, de Supabase-adviseurs, de Vercel-foutlogboeken van zeven
dagen, en de vier controles lokaal (typecheck schoon, 3648 unittests, 576 ketentests, allemaal
groen).

---

## Wat aantoonbaar goed werkt

Dit hoort er net zo goed in te staan, want het is nagerekend en niet aangenomen.

1. **De score klopt.** De zichtbaarheidsscore is met de hand uit de ruwe antwoorden gereconstrueerd:
   de app zegt 14,00, de handmatige herberekening geeft 13,98. De rekenkunde is dus reproduceerbaar.
2. **Het oordeel over vermeldingen klopt sinds 30 augustus.** Over alle 774 gemeten antwoorden op
   productie is gecontroleerd of het oordeel "genoemd" overeenkomt met de merknaam in de tekst. Bij
   elke meting van ná 30 augustus: geen enkele onterechte vermelding en geen enkele gemiste.
3. **Eigendom is dicht.** Elke geprobeerde route van het klantaccount naar het merk van de
   consultant gaf 404: status, wijzigen, entiteiten, labels, toewijzen, meting starten. De
   controle zit in de server en niet alleen in het scherm.
4. **De database is ook los van de app dicht.** Met de sleutel uit de browser van het klantaccount
   rechtstreeks op de database: hij ziet alleen zijn eigen twee merken, zijn eigen analyse en zijn
   eigen pagina's. Niets van een ander account.
5. **De kostenschatting klopt.** De onboarding kostte $0,2438 waar de app ongeveer $0,25 aankondigt.
6. **De taken zijn betrouwbaar.** Van 1522 taken op productie faalden er 21, en alle 21 zijn te
   herleiden tot drie oorzaken die inmiddels gerepareerd zijn. Geen enkele taak bleef hangen.
7. **De vragen deugen.** 30 realistische koopvragen, tien per fase, geen merknaam erin, allemaal met
   de plaats erin omdat dit merk lokaal werkt.
8. **De technische controle klopt.** Nagelopen tegen de echte `robots.txt` van de site: de app zegt
   terecht dat alle AI-crawlers binnen mogen, dat er een sitemap is en dat er nergens schema.org
   staat.
9. **Het menu wordt weggehaald bij een verbetering.** De opgehaalde bestaande pagina bevat 914
   tekens schone tekst zonder navigatie.

---

## Blokkerend voor ingebruikname

### B1. Een klant kan zelf betaald onderzoek starten

**Wat er mis is.** Iedere ingelogde klant kan een merk aanmaken, en dat zet meteen een betaalde
onderzoekspijplijn in gang.

**Het bewijs.** Ingelogd als `e2e-klant@orbit-test.nl` en `POST /api/profiles` met
`{"name":"Test","url":"example.com"}`: antwoord **201** met profiel
`a15fecfc-cb71-4ad4-82d8-3b669c6aff9f`, en de acht taken liepen. In `lib/cost-rules.ts` staan alleen
`reputatie_starten` en `clusters_aanvullen` in `STAFF_ONLY_ACTIONS`. Het commentaar bovenaan
`app/api/profiles/route.ts` zegt nog "Betaald werk start alleen de beheerder", en de weigertekst
`COST_DENIED.merk_onderzoeken` staat klaar maar wordt nooit bereikt.

**Het gevolg.** De enige rem is het maandplafond van €50 per account en €150 per dag over alles heen
(`lib/spend-rules.ts`). Een klant kan dus tot €50 per maand aan onderzoek starten op willekeurige
domeinen, zonder dat iemand het merkt tot de rekening komt.

**Wat er moet gebeuren.** Kies expliciet: hoort `merk_onderzoeken` in `STAFF_ONLY_ACTIONS`, of is
dit bewust opengezet? Zo ja, haal dan het tegenstrijdige commentaar en de dode weigertekst weg. Dit
is de enige bevinding waarbij ik niet zeker weet wat de bedoeling is.

### B2. Publiceren accepteert elk adres, ook een vreemd domein

**Wat er mis is.** De app controleert bij het publiceren alleen de vorm van het adres, niet of de
pagina bestaat en niet of het adres van de klant is.

**Het bewijs.** Twee aanroepen op de zojuist geschreven pagina:

- `https://www.tandartspraktijkdekroon.nl/deze-pagina-bestaat-niet-test/` gaf **202**;
- `https://www.example.com/` gaf **202**, en de rij staat nu op
  `published_url = 'https://www.example.com/'`, `status = 'published'`,
  `publish_checked_at = null`, `publish_check_json = null`.

**Het gevolg.** Fase vijf is de kern van de belofte: hermeten en aantonen dat het gewerkt heeft. Een
typefout of een verkeerd geplakt adres betekent weken wachten op een effect dat nooit komt, en
niemand ziet het. Het commentaar in de route zegt zelf dat de app controleert of de pagina er echt
staat. Dat gebeurt niet.

**Wat er moet gebeuren.** Bij het vastleggen ophalen of de pagina bestaat, en controleren dat het
adres op het domein van het merk staat. Bestaat hij niet, dan een melding en geen `published`.

### B3. Een pagina met 71 openstaande opmerkingen krijgt de stand "klaar"

**Wat er mis is.** `status` wordt `ready` zodra de reparatierondes op zijn, ongeacht wat er nog open
staat. `needs_review` staat er los naast.

**Het bewijs.** Pagina `3517f87e-b030-4f25-ba07-5a45857f56e3` na drie rondes:
`status = 'ready'`, `needs_review = true`, `review_notes` bevat **71** opmerkingen,
`quality_score = 52` terwijl de drempel 85 is. Onder die opmerkingen: de pagina noemt het bedrijf
"Infomedics", en de eigen beoordelaar zegt dat dat een ander bedrijf is en eruit moet.

**Het gevolg.** De klant krijgt een pagina aangeboden als af, terwijl de app zelf 71 redenen heeft
opgeschreven waarom hij het niet is. En hij is publiceerbaar, zie B2.

**Wat er moet gebeuren.** `ready` mag niet gezet worden zolang `needs_review` waar is. Een eigen
stand ("check nodig") die wél zichtbaar is, en publiceren blokkeren zolang die stand geldt.

### B4. De reparatielus maakte de pagina slechter en kostte drie keer het schrijven

**Wat er mis is.** Na het schrijven volgen tot drie reparatierondes. In deze doorloop verlaagden ze
de kwaliteitsscore en verhoogden ze de rekening.

**Het bewijs.** Eén pagina, gemeten in `ai_calls` en `content_pieces`:

| | schrijven | drie reparaties |
|---|---|---|
| kosten | $0,2101 | **$0,7846** |
| tijd | 135 s | 174 + 150 + 141 s |
| kwaliteitsscore | 78 na ronde 1 | **52 na ronde 3** |
| opmerkingen | 70 | **71** |
| dekking | 84 | 91 |
| woorden | 1386 | 1386 |

Totaal $1,08 voor deze ene pagina, waarvan 73% aan reparaties. Het commentaar bij `REPAIR_MAX` in
`lib/pipeline/content.ts` regel 127 tot 135 zegt dat één volledige herschrijving $0,162 kostte en
dat drie gerichte reparaties samen minder kosten. Gemeten: **$0,26 per reparatieronde**, dus één
ronde kost al 60% meer dan de hele herschrijving die vervangen werd.

**Het gevolg.** De duurste stap van de app maakt het product op zijn eigen maatstaf slechter. Bij
tien pagina's per klant per maand is dit het verschil tussen ongeveer $3 en ongeveer $11.

**Wat er moet gebeuren.** Stop de lus zodra de kwaliteitsscore niet meer stijgt, en bewaar de beste
versie in plaats van de laatste. Reken daarna `STAP_KOSTEN_USD` opnieuw door.

### B5. De correctie van 30 augustus is nooit met terugwerkende kracht toegepast

**Wat er mis is.** Op 30 augustus is er een vangnet bijgekomen dat een vermelding alleen telt als de
merknaam echt in het antwoord staat. De metingen van vóór die datum zijn niet opnieuw beoordeeld.

**Het bewijs.** Over alle 774 antwoorden op productie, gecontroleerd op woordniveau tegen merknaam
en schrijfwijzen:

- **11 antwoorden** tellen als vermelding terwijl de naam nergens in het antwoord staat. Verdeeld
  over Swapfiets (5), Bol (3), Van den Udenhout (2) en Coolblue (1), allemaal tussen 28 juli en
  1 augustus. Voorbeeld: een antwoord over de voordelen van een fietsabonnement dat Swapfiets
  nergens noemt, telt als vermelding van Swapfiets.
- **6 antwoorden** noemen het merk letterlijk en tellen niet mee. Voorbeeld: "biedt Fysi-Unique
  effectieve behandelingen aan" en "Bij Coolblue is deze machine momenteel geprijsd op €1.699,-".
- Ná 30 augustus: nul van beide, over 260 antwoorden.

**Het gevolg.** De opgeslagen scores en de trendlijnen van die vier merken staan te hoog
respectievelijk te laag. Elke vergelijking van een nieuwe meting met die weken meet deels de
reparatie in plaats van de werkelijkheid.

**Wat er moet gebeuren.** Een eenmalige herberekening van `tracking_run_mentions` over de metingen
van vóór 30 augustus, en daarna de scores opnieuw aggregeren. De ruwe antwoorden staan er nog, dus
dit kan zonder één betaalde aanroep.

---

## Moet snel opgelost

### S1. Een vraag wijzigen of verwijderen tijdens een lopende meting wordt gewoon geaccepteerd

Tijdens de meting is een vraag aangepast (**200**) en daarna verwijderd (**200**), zonder waarschuwing.
Gevolg, nagemeten: twee al betaalde metingen bleven achter met `prompt_id = null`, en de score is
berekend over **31 groepen** terwijl de klant **29 vragen** heeft. De score werd daardoor 14,00 in
plaats van 14,94. Het rapport eronder schrijft ondertussen "In 29 onderzochte vragen", dus het
rapport en het cijfer gebruiken een verschillende noemer.
Zit in `app/api/analyses/[id]/prompts/[promptId]/route.ts`: geen standcontrole en een harde delete.

### S2. Vragen worden niet ontdubbeld over de funnelfases heen

Van de 30 vragen waren er twee **letterlijk identiek**: "Welke tandarts in Noordwijk is geschikt
voor mensen met ernstige tandartsangst?" stond zowel bij Overweging als bij Beslissing. In
`lib/pipeline/prompts.ts` regel 334 wordt de `seen`-verzameling per fase aangemaakt, dus de derde
fase weet niet wat de eerste al vroeg. De klant betaalt twee keer voor dezelfde vraag en die vraag
weegt dubbel in zijn score.

### S3. De concurrentenlijst dubbelt zichzelf

Na de onboarding stonden er **negen** concurrenten in het profiel, waarvan **vier dubbel**:
"Cleyburch Tandartsen" naast "Cleyburch Tandartsen in Noordwijk", en zo ook Dental4U, MondCleanic en
De Voorstraat. `lib/pipeline/market.ts` regel 241 voegt samen met `new Set` op de exacte tekst, dus
elke variatie in schrijfwijze blijft staan. Die lijst stuurt de beoordeling van elke meting aan.

### S4. Bijna de helft van elke gecrawlde pagina is het navigatiemenu

Gemeten op alle 51 pagina's van het testmerk: het menu eindigt gemiddeld op teken **698** van de
1500 die bewaard worden, en **51 van de 51** pagina's beginnen ermee. Dat is 46,5% ruis in de
inventaris die het rapport, de gap-analyse en de paginakoppeling voedt. De oplossing bestaat al
(`lib/pipeline/page-text.ts`) maar wordt alleen gebruikt bij het ophalen van een bestaande pagina,
niet in de crawl zelf.

### S5. De wachttijd zit in de wachtrij, niet in het model

Gemeten over alle taken op productie:

| Taak | wachten | werken |
|---|---|---|
| `content_draft` (41 stuks) | **2533 s** gemiddeld | 38 s gemiddeld |
| `content_revise` (41 stuks) | 137 s | 71 s |
| `measure_prompt` (789 stuks) | 735 s | 18 s |

Bij het schrijven van een pagina wacht de klant dus gemiddeld tweeënveertig minuten op achtendertig
seconden werk. Ook in mijn eigen onboarding was 215 van de 317 seconden wachten op de volgende
werkerronde. De werker claimt vijf taken per ronde (`CLAIM_BATCH`) en houdt 200 van de 240 seconden
vrij voor een zware taak.

### S6. De pagina draagt de interne opdrachtzin als titel

`content_pieces.title` is "Maak de pagina over tandartsangst de duidelijke startpagina voor angst".
Dat is de aanbeveling aan onszelf, niet de titel van een pagina. De `meta_title` is wél goed
("Tandartsangst in Noordwijk | De Kroon"). De eigen beoordelaar merkte het op en de reparatielus
heeft het in drie rondes niet gerepareerd.

### S7. De server haalt elk adres op dat de gebruiker meegeeft

`existingUrl` gaat ongecontroleerd van het verzoek naar `fetchExistingPage()`
(`lib/pipeline/existing-page-fetch.ts`), die alles ophaalt wat met `http` of `https` begint. Er is
geen controle dat het adres bij het merk hoort. Een ingelogde gebruiker kan de server dus elk adres
laten bezoeken en een deel van het resultaat in zijn eigen contentpagina terugzien.

### S8. Een mislukte taak wordt nergens gemeld

Van de 21 mislukte taken op productie zijn er 16 dezelfde fout, vier keer geprobeerd, en het enige
spoor is het Vercel-logboek. Er is geen scherm, geen mail en geen teller die zegt dat er iets is
blijven liggen. Die 16 waren de volledige uitlegstap van één markt in de Sales-module: die markt
heeft nu alleen sjabloonzinnen, en na de reparatie van 1 september is er nooit iets opnieuw gedraaid.

### S9. De middleware viel 21 keer om, en gebruikers worden uitgelogd

In de Vercel-foutlogboeken: 21 keer "function was stopped as it did not return an initial response
within 25s" op `/middleware` op 28 augustus tussen 11:43 en 11:52. Daarnaast zes keer "Invalid
Refresh Token: Refresh Token Not Found", laatst op 1 september. De middleware ververst de sessie bij
elk verzoek; valt hij om, dan is de hele app onbereikbaar voor die gebruiker.

### S10. De feitenroute stuurt de volledige modeluitvoer naar de browser

Het antwoord van `PATCH /api/profiles/[id]/facts` bevat de complete `raw_json` van de vraag,
inclusief het antwoord-id van OpenAI en de instellingen van de aanroep. Dat is precies wat de klant
volgens de opzet nooit hoort te zien.

### S11. Het weglaten van een concurrentnaam laat kapotte zinnen achter

Een van de vragen die de klant te zien krijgt luidt: *"Een AI-assistent noemt bij deze vragen nu
andere aanbieders, met argumenten als 'een andere aanbieder – Noordwijkerhout — heeft een speciale
angsttandarts'..."*. De naam is weggehaald, de gedachtestreepjes en de plaatsnaam zijn blijven
staan. Twee dingen tegelijk: een onleesbare zin, en gedachtestreepjes die volgens de eigen
schrijfregels nergens mogen staan.

---

## Kan wachten

- **HTML-entiteiten worden half gedecodeerd.** `htmlToText()` kent zes namen en geen enkele
  numerieke code, dus `&#8220;` blijft staan. Op productie: **76 van de 790** gecrawlde pagina's.
  Het staat ook in `evidence_quote`, en dat is de tekst waarmee een bewering letterlijk onderbouwd
  moet worden.
- **Geen enkele snelheidsbegrenzing.** De tabel `rate_limits` bestaat, is leeg, en het woord komt in
  de hele code niet voor. Inloggen, uitnodigingen verzilveren en elke route zijn onbegrensd.
- **De tabel `_backup_20260729` staat nog op productie**, met 51 rijen en zonder leesregels.
- **58 foreign keys zonder index en 142 dubbele leesregels** volgens de Supabase-adviseur. Bij deze
  hoeveelheid data merkt niemand het; bij tien klanten wel.
- **De controle op gelekte wachtwoorden staat uit** in Supabase Auth.
- **Twee controles met hetzelfde label** in de technische audit: `structured-data` en
  `entity.schema` heten allebei "Gestructureerde data" en zeggen bijna hetzelfde.
- **Geen ontdubbeling van merken op webadres**: `udenhout.nl` staat er drie keer in, elk met een
  eigen betaald onderzoek eronder.
- **Een pagina zonder doelvragen wordt zonder waarschuwing gepubliceerd** en krijgt dan nul
  hermetingen (`wavesPlanned: 0`). In het scherm gaan de doelvragen wel mee, dus dit raakt alleen
  wie de route rechtstreeks aanroept.

---

## Wat niet onderzocht is

- **Het schrijven van een geheel nieuwe pagina.** Alle vijf de aanbevelingen uit deze meting waren
  een verbetering van een bestaande pagina, dus het pad "nieuw" is niet live gedraaid.
- **De hermeting na veertien en achtentwintig dagen.** Die vraagt echte tijd.
- **De Sales-module.** Buiten de opdracht, op de mislukte taken uit S8 na.
- **De schermen zelf.** Er is via de serverroutes gewerkt, niet via de browser: de omgeving kon geen
  browser naar productie openen. Alles hierboven gaat over gedrag en gegevens, niet over weergave.
- **Gedrag onder gelijktijdige belasting.** Er was één gebruiker tegelijk.

---

## Wat er van deze audit op productie staat

| Wat | Waar |
|---|---|
| Merk Tandartspraktijk de Kroon, met meting, rapport en pagina | profiel `cdff2bca-e567-44c0-ad12-3c183ba1aa3b` |
| Vier verzonnen antwoorden op feitenvragen, elk beginnend met "TESTANTWOORD (niet feitelijk)" | `fact_requests` bij dat profiel |
| Pagina die als gepubliceerd staat op `https://www.example.com/` | stuk `3517f87e-b030-4f25-ba07-5a45857f56e3` |
| Merk "Test" op example.com, aangemaakt vanaf het klantaccount om B1 aan te tonen | profiel `a15fecfc-cb71-4ad4-82d8-3b669c6aff9f` |
| Wachtwoord van beide testaccounts opnieuw gezet | `e2e-consultant@orbit-test.nl`, `e2e-klant@orbit-test.nl` |

⚠️ Tandartspraktijk de Kroon is een echt bedrijf dat geen klant is en dat hier niet om gevraagd
heeft. De vier antwoorden op de feitenvragen zijn verzonnen om de keten te kunnen testen. Behandel
ze niet als feiten over dat bedrijf. Zeg wat weg mag, dan ruimt een volgende sessie het op.
