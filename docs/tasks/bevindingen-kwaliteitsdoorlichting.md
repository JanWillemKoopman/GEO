# Bevindingen uit de kwaliteitsdoorlichting, om op te lossen

> **Wat dit is.** De fouten en verbeterpunten die boven kwamen bij het doorlopen van de hele keten op
> productie (`docs/tasks/kwaliteitsdoorlichting-pijplijn.md`), vanaf 23 september 2026, met drie echte
> bedrijven uit de regio Eindhoven:
>
> | | Merk | Site | Profiel-id |
> |---|---|---|---|
> | A | Hans Verstraaten Hoveniers (Eindhoven) | hansverstraatenhoveniers.nl, ~70 pagina's | `f14e89ab-6db2-41ea-8bbc-0827d6025470` |
> | B | Wesley Keeris Installatietechniek (Geldrop) | wkinstallatie.nl, ~23 pagina's | `ca8313fb-3c2e-4b37-9985-0f8be8dc6e8b` |
> | C | Autorijschool Pompert (Eindhoven) | autorijschoolpompert.nl, ~15 pagina's in het menu | `467f8307-74dd-4e84-b443-40cc1ce88f9e` |
>
> Clusters: A "Complete tuin laten aanleggen met bestrating" (`2d4ce398-57d6-4f09-9ad3-faab83773870`),
> B "Hybride warmtepomp voor een bestaande woning" (`3dd41da2-ffbc-4676-9bc2-2866807366da`),
> C "Autorijles met faalangst" (`a3419688-ab38-4d8a-b03d-3ab0c78dc968`). Accounts:
> `demo-consultant@example.com` (beheerder) en `demo-klant@example.com` (klant). De data blijft staan.
>
> **Hoe te gebruiken.** Elk punt heeft wat er misgaat, wat de klant ervan merkt, waar het in de code
> zit, en een voorstel. Is een punt opgelost: de regel "Status" bijwerken met de datum en de PR, en
> een alinea in `docs/logbook.md`.
>
> **Doorlopend bijgewerkt** zolang de doorloop loopt. Stand: meting van de drie clusters loopt. Het
> stap-voor-stapdossier met cijfers per stap staat in `docs/tasks/kwaliteitsdoorlichting-stappen.md`.

## Overzicht

| # | Ernst | Onderwerp | Status |
|---|---|---|---|
| 1 | hoog | Gespreksscherm slaat de waarde van vóór de klik op | ✅ opgelost, PR #108 |
| 2 | hoog | Definitieve onderwerpenronde kan alle onderwerpen wissen | ✅ opgelost, PR #108 |
| 3 | hoog | Het merk zelf komt op de lijst "gelijknamige bedrijven die jij niet bent" | open |
| 4 | hoog | De crawl leest 1 pagina van een site van ~70, zonder waarschuwing | open |
| 5 | hoog | Meetvragen negeren de groeigebieden: de opdracht spreekt zichzelf tegen | open |
| 6 | middel | "Herkend door ChatGPT bij 5 van 6 vragen" telt gokken op de naam als herkenning | open |
| 7 | middel | Het sterkste bewijs van een bedrijf valt tussen crawl en dossier weg | open |
| 8 | middel | Meetvragen: veel dubbel, weinig realistisch, altijd een plaatsnaam | open |
| 9 | middel | Een adviesregel op de site wordt een dienst en een onderwerp | open |
| 10 | middel | Crawl neemt fotopagina's, tag- en auteurspagina's mee | open |
| 11 | middel | Blok met gecontroleerd te bevestigen voorstellen klapt dicht als het "compleet" is | open |
| 12 | laag | Klant ziet "Bevestig en start de meting" maar mag de meting niet starten | open |
| 13 | laag | Klant ziet "Nieuw merk" en het hele formulier, de server weigert pas na verzenden | open |
| 14 | laag | Voortgang zegt "klaar" en "nog minder dan een minuut" terwijl er nog stappen wachten | open |
| 15 | laag | Conceptscherm gaf één keer een foutpagina bij het openen, direct na het afronden | open, niet herhaald |
| 16 | laag | Een taak van een merk stond op "bezig" en daarna weer in de wachtrij met 0 pogingen | open, niet herhaald |
| 17 | hoog | Gemini-meting viel volledig uit op een limiet van de leverancier | open, wordt gevolgd |
| 18 | laag | Beoordeling "genoemd of niet" geeft soms platte tekst in plaats van JSON, en de mislukte uitvoer wordt niet bewaard | open |
| 19 | **hoog** | Een definitief mislukte Gemini- of Google-meting laat de analyse eeuwig op "meten" staan | ✅ opgelost, PR #110 |
| 20 | **hoog** | Het rapport schrapt elke zin over welke concurrent een vraag wint, ook de juiste | ✅ opgelost, PR #111 en #112 |
| 21 | middel | Een eigen product ("Hybride warmtepomp") telde in de naamcontrole als concurrent | ✅ opgelost, PR #112 |
| 23 | laag | Hetzelfde bedrijf staat twee keer in het namenregister, met en zonder "(VSB)" | open, gevolg opgevangen |
| 24 | laag | De rapportinstructie zegt niet of prioriteit 1 de belangrijkste is; de hovenier kreeg 6 tot 10 met de belangrijkste pagina's op 10 | open |
| 25 | middel | Een klaar cluster (status "gereed") heeft geen link op zijn kaart | ✅ opgelost, PR #113 |
| 26 | **hoog** | De consultant ziet de clusters van een klantmerk niet en krijgt "Start het eerste cluster" | open |
| 27 | **hoog** | Het rapport kent de groeidoelen en feiten uit het gesprek niet | open |
| 28 | **hoog** | De site-inventaris mist de hoofdpagina uit het menu en bevat fotobijlagen; het rapport adviseert een fotopagina te verbeteren | open |
| 29 | middel | Het planscherm zegt de klant "stel je het plan zelf op", maar alleen de consultant mag het | ✅ opgelost, PR #114 |
| 30 | **hoog** | Het plan gaf de zwaarste gemiste vraag potentie 0 en zette die pagina achteraan | ✅ opgelost, PR #114 (nog niet op een nieuw plan nagerekend, zie 32) |
| 31 | **hoog** | Het plan zet vier verbeteringen van dezelfde pagina in dezelfde week | open |
| 32 | **hoog** | "Opnieuw opzetten" van het plan faalt als alle kansen al in het huidige plan staan, en laat ze anders achter | open |
| 33 | middel | Een plan dat laat in de maand start, vraagt de klant zijn vragen te beantwoorden vóór een datum in het verleden | open |
| 34 | laag | De klant leest "wacht op jouw vrijgave" en in hetzelfde blok dat de consultant goedkeurt | open |
| 35 | **hoog** | Vragen die het gesprek al beantwoordde, blijven openstaan voor de klant | open |
| 36 | middel | Elk rapport zet zijn eigen vragen klaar; alleen letterlijk gelijke vragen worden samengevoegd | open |
| 37 | laag | Een vraag aan de klant bevat "en" en "of" met een schuine streep ertussen | open |
| 38 | middel | Het laatste antwoord van een pagina laat de klant 9 tot 30 seconden wachten | open |
| 39 | **hoog** | Een beantwoorde vraag maakt de bewering erachter nooit "onderbouwd": de keuring blijft "beantwoord deze vraag" zeggen | open |
| 40 | **hoog** | De keuring van een pagina blokkeert op beweringen van andere pagina's van hetzelfde merk | open |
| 41 | middel | Antwoorden van de klant op paginavragen worden opgeslagen als feit van de site | open |
| 42 | **hoog** | De klant krijgt "Tekst is klaar, keur hem goed" bij een tekst die de eigen keuring tegenhoudt | open |
| 43 | middel | De keuring noemt het bedrag van de klant "in strijd met de instructie", omdat de opzet van vóór zijn antwoord is | open |
| 44 | laag | Een tegengehouden pagina staat voor de klant als "Alle gegevens bekend, wordt nu geschreven" | open |
| 22 | **hoog** | Het rapport zegt "niet genoemd, 0 op 100" terwijl Google het merk wel noemde | ✅ opgelost, PR #111 en #112 |

---

## 1. Gespreksscherm slaat de waarde van vóór de klik op ✅

**Wat misging.** Bij een lijstveld of keuzeknop las `bewaarVeld()` in
`app/(app)/merk/[id]/_components/onboarding-session.tsx` de waarde uit de vorige weergave. Bij A
ging van 7 van 7 lijsten het laatste punt verloren en bleven 3 van 3 keuzes leeg, terwijl het scherm
"door jou vastgelegd" toonde.

**Status.** Opgelost op 23 september 2026 (PR #108), nagemeten: na de reparatie alle lijsten
volledig en alle keuzes gevuld bij A, B en C.

## 2. Definitieve onderwerpenronde kan alle onderwerpen wissen ✅

**Wat misging.** Het model gaf als prioriteit 0,95; `proposeTopics()` maakte daar 7,05 van in een
integerkolom; de insert mislukte nadat de concepten al gewist waren. A had nul onderwerpen, de taak
stond op "klaar".

**Status.** Opgelost op 23 september 2026 (PR #108): volgorde uit de positie in de lijst
(`lib/topic-volgorde.ts`), concepten terug bij een mislukte opslag, en de taak mislukt zichtbaar.
Nagemeten: A heeft na het gesprek vijf onderwerpen.

## 3. Het merk zelf komt op de lijst "gelijknamige bedrijven die jij niet bent"

**Wat misgaat.** Bij alle drie de merken zette het onderzoek eigen namen op `name_exclusions`. C:
"Autorijschool Pompert / Pompert", "Rijschool Peter Pompert", "Pompert Autorijschool". B: "Wesley Keeris
Installatiebedrijf B.V", "Wesley Keeris Beheer B.V". A: "Hovenier Eindhoven / hoveniereindhoven.nl" (een tweede
site van hetzelfde bedrijf) en "Hoveniersbedrijf Hans Verstraaten B.V".

**Gevolg.** De meting geeft deze lijst mee als "andere bedrijven" (`lib/pipeline/measure.ts:1123`,
`ownExclusions` naar `judgeRun()`). Vermeldingen van het merk zelf kunnen daardoor niet meetellen: de
score valt te laag uit, en elke pagina lijkt minder effect te hebben dan hij heeft.

**Oorzaak.** `extractConfusions()` in `lib/pipeline/baseline-verdict.ts` (rond regel 576) neemt elk
opsommingspunt uit het antwoord op de verwarringsvraag en filtert alleen een naam die exact gelijk
is aan de eigen naam of een alias. Het model somt ook schrijfwijzen en handelsnamen van het bedrijf
zelf op. Het veld wordt in `lib/pipeline/llm-baseline.ts:415` automatisch gevuld.

**Voorstel.** Een kandidaat die de volledige merknaam bevat, of die de AI zelf omschrijft als "ook
een handelsnaam van" of "dezelfde", niet opnemen. En deze voorstellen niet in het veld zelf zetten,
maar als voorstel dat de consultant moet bevestigen (zie punt 11). In dit document gecorrigeerd met
de hand, als consultant.

## 4. De crawl leest 1 pagina van een site van ~70, zonder waarschuwing

**Wat misgaat.** Bij A las de crawl alleen de homepage (`profile_pages`: 1). De sitemap is gezond en
bereikbaar vanaf hier, ook met de user-agent van de crawler; `robots.txt` staat alles toe. Er staat
geen fout in de Vercel-logs.

**Gevolg.** Het merkonderzoek kreeg 4.929 tekens sitetekst (C: 61.945). De aanbodboom werd bepaald op
1.354 invoertokens en mist volgens de blinde lezer ongeveer vijftien diensten met een eigen pagina.
Het voortgangsscherm meldt "1 pagina's gevonden" als gewoon resultaat.

**Oorzaak.** Nog niet vastgesteld. Vermoeden: de site weigert verzoeken van datacenter-IP's (Vercel)
en `collectPageUrls()` in `lib/crawler.ts:379` valt dan stil terug op de links van de homepage.

**Voorstel.** Eerst loggen wat `fetchText()` op de sitemap krijgt (status, lengte) zodat de oorzaak
zichtbaar wordt. Daarna: een waarschuwing op het scherm als de crawl veel minder pagina's vindt dan
de lichte scan of de sitemap aankondigt, met de uitweg "sitemap handmatig opgeven".

## 5. Meetvragen negeren de groeigebieden: de opdracht spreekt zichzelf tegen

**Wat misgaat.** B wil groeien in Mierlo, Heeze-Leende en Nuenen: 0 van de 30 meetvragen noemt een
van die plaatsen. C: Veldhoven en Son en Breugel 0 keer.

**Gevolg.** De meting zegt niets over de gebieden waar de klant wil groeien, dus ook de aanbevolen
pagina's en de nameting niet.

**Oorzaak, gevonden via de opname van opdrachten (migratie 0112).** De opdracht aan het model bevat
eerst, in hoofdletters: "Dit is een LOKAAL bedrijf dat UITSLUITEND werkt in: Geldrop, Eindhoven. ALLE
10 vragen moeten een van deze plaatsen bevatten", en direct daarna, zacht: "Dit bedrijf WIL groeien
in: Mierlo, Heeze-Leende, Nuenen … stel over deze plaatsen een deel van de vragen". Alle 7 aanroepen
kregen beide regels; het model volgde de harde. Plek: `lib/pipeline/prompts.ts:311-322` en
`growthRegionsRule()` in `lib/pipeline/commercial-context.ts:133`. Er is geen telling in code
(conventie 1).

**Voorstel.** De groeiplaatsen opnemen in de lijst toegestane plaatsen van de lokale regel, met een
aantal ("minstens 3 van de 10 vragen over …"), en in code tellen: haalt een ronde het minimum niet,
dan opnieuw of aanvullen.

## 6. "Herkend door ChatGPT bij 5 van 6 vragen" telt gokken op de naam als herkenning

**Wat misgaat.** Bij alle drie de merken meldt het dossier een hoge herkenning (5, 4 en 5 van 6),
terwijl meerdere antwoorden zeggen het bedrijf niet te kennen of alleen uit de naam afleiden wat het
doet ("lijkt de naam van een hoveniersbedrijf in Eindhoven te zijn").

**Gevolg.** De klant leest dat ChatGPT hem al kent. De teksten pakken het echte probleem, onbekendheid,
daardoor niet aan.

**Oorzaak.** `knowsBrand()` in `lib/pipeline/baseline-verdict.ts:207` telt een antwoord als herkend
zodra de merknaam erin staat en geen zin uit `UNKNOWN_PHRASES` voorkomt. Gokken op basis van de naam
staat niet in die lijst.

**Voorstel.** "lijkt … te zijn", "op basis van de naam", "vermoedelijk" en "ik kan niet bevestigen
wat voor bedrijf" toevoegen, met tests op de antwoorden van deze doorloop. Voorzichtig: de lijst is
eerder te ruim geweest (zie het commentaar boven `UNKNOWN_PHRASES`).

## 7. Het sterkste bewijs van een bedrijf valt tussen crawl en dossier weg

**Wat misgaat.** C noemt "93 procent geslaagd" op drie pagina's die de crawl wel las. Het getal staat
niet in het merkonderzoek en niet in het dossier. Ook de terugbetaling van examengeld en de BOVAG-
cover ontbreken.

**Gevolg.** De schrijver krijgt het argument niet mee dat een lezer het meest overtuigt.

**Voorstel.** Uitzoeken in welke stap het afvalt (onderzoek of dossier; de opname van opdrachten laat
nu zien wat elke stap te lezen kreeg). Een deterministische zoektocht naar percentages, jaartallen en
bedragen in de gelezen pagina's, als vangnet naast de AI.

## 8. Meetvragen: veel dubbel, weinig realistisch, altijd een plaatsnaam

**Wat misgaat.** Volgens de blinde lezer klinken 12, 10 en 17 van de 30 vragen als echte vragen aan
ChatGPT; 14 tot 16 per merk zijn in feite dubbel; alle 90 bevatten een plaatsnaam. Ontbrekende soorten:
vragen zonder plaats of met "in de buurt", prijs per eenheid, reviews, en de bezwaren uit het gesprek
(B: subsidie, besparing, geluid; C: het faalangstexamen van het CBR).

**Gevolg.** De score meet vooral kunstmatig gerichte, lokale naamvragen, en 30 vragen zijn in de
praktijk er 15.

**Voorstel.** Een ontdubbeling in code op betekenis (dezelfde vraag met een andere plaats telt als
één), een minimum aantal vragen zonder plaatsnaam, en de bezwaren uit het gesprek als bron voor
oriëntatievragen. Te meten tegen de blinde lezer.

## 9. Een adviesregel op de site wordt een dienst en een onderwerp

**Wat misgaat.** B's site zegt "het ventilatiesysteem moet regelmatig worden schoongemaakt" (advies).
De aanbodboom maakte er de dienst "ventilatie laten schoonmaken" van, en dat werd een onderwerp.

**Gevolg.** Een pagina die iets belooft wat het bedrijf niet doet.

**Voorstel.** In de aanbodstap alleen diensten opnemen met een aanbiedende formulering ("wij …",
"u kunt bij ons …"), en het bewijscitaat daarop controleren.

## 10. Crawl neemt fotopagina's, tag- en auteurspagina's mee

**Wat misgaat.** C: 108 gelezen adressen, waarvan tientallen bijlagepagina's van foto's
(`/whatsapp-image-…/`, `/cbr-peter-pompert-2/`), `/tag/…`, `/category/…` en `/author/…`.

**Gevolg.** Ze eten de grens van 150 pagina's op en verdunnen het merkonderzoek.

**Voorstel.** In `lib/crawl-urls.ts` WordPress-bijlagen, tags, categorieën en auteurs overslaan.

## 11. Blok met te bevestigen voorstellen klapt dicht als het "compleet" is

**Wat misgaat.** Op het gespreksscherm klapt een blok dicht zodra alle velden gevuld zijn
(`onboarding-session.tsx`, `defaultOpen={!p.compleet}`). Juist in blok 2 zet het onderzoek de
naamuitsluitingen van punt 3. Compleet betekent hier niet gecontroleerd.

**Voorstel.** Velden die door het onderzoek gevuld zijn en nog niet door de consultant bevestigd,
tellen niet als compleet; het blok blijft open met een zichtbare "controleer dit".

## 12. Klant ziet "Bevestig en start de meting" maar mag de meting niet starten

**Wat misgaat.** Het conceptscherm zegt de klant "Bevestigen is genoeg" en toont de knop; na de klik
verschijnt pas een rode regel dat de consultant de meting start.

**Voorstel.** Voor een klant een andere tekst en knop, bijvoorbeeld "Akkoord, laat mijn consultant
starten", of de knop weglaten.

## 13. Klant ziet "Nieuw merk"

**Wat misgaat.** De klant ziet de knop en het hele formulier; `app/api/profiles/route.ts:67` weigert
pas na verzenden (403).

**Voorstel.** Knop en pagina alleen voor beheerders tonen.

## 14. Voortgang zegt "klaar" terwijl er nog stappen wachten

**Wat misgaat.** De statusroute van een merk gaf "klaar" terwijl het aanbod bezig was en vijf stappen
wachtten; de technische controle stond op "wacht" met al een resultaat; de schatting zei "nog minder
dan een minuut" bij acht open stappen.

**Voorstel.** De status afleiden uit de openstaande taken, en de tijdschatting uit het aantal open
stappen.

## 15. Conceptscherm gaf één keer een foutpagina

Direct na het afronden van het cluster gaf `/analyses/[id]/concept` voor de klant één keer "Deze
pagina kon niet geladen worden"; een tweede keer laden werkte. Niet herhaald. Alleen oppakken als het
terugkomt.

## 16. Taak terug in de wachtrij met 0 pogingen

De lichte scan van B stond op "bezig" (gestart 21:28:17) en daarna weer in de wachtrij met 0
pogingen, en liep later gewoon door. Niet herhaald. Alleen oppakken als het terugkomt.

## 17. Gemini-meting viel volledig uit op een limiet van de leverancier

**Wat misgaat.** Alle 90 Gemini-aanroepen via DataForSEO (30 per cluster, A, B en C) gaven bij de
eerste poging "3rd Party API Service Unavailable (rate_limit_exceeded)" (`jobs.last_error`, type
`measure_llm_response`; `ai_calls.raw_json` bij A: 30 van 30 "mislukt"). De drie clusters werden
kort na elkaar gemeten. De Google AI-overzichten liepen via dezelfde leverancier wel, met 12
"Internal SE Server Error" die bij de tweede poging meestal lukten.

**Gevolg.** Een van de meetbronnen ontbreekt. Nog na te gaan: lukt de herhaling, en zegt het rapport
dat Gemini ontbrak, of rekent het stil zonder?

**Voorstel.** Gemini-verzoeken spreiden (een maximum per minuut in de takenlaag) en in het rapport
zichtbaar maken welke bronnen meetelden.

## 18. Beoordeling "genoemd of niet" geeft soms platte tekst in plaats van JSON

**Wat misgaat.** Een handvol taken (`measure_prompt` en `measure_ai_overview`, samen minstens 5 van
ruim 400 beoordelingen) faalde met "Unexpected token 'W', "We need ou"… is not valid JSON" of
"We need id…". De beoordeling draait op GPT-6 Luna met redeneerinspanning `none`
(`work: "deterministic"`, `lib/pipeline/measure.ts:314`); het model begon met hardop denken in
plaats van met het JSON-antwoord. Sinds 23 september 2026 op GPT-6; niet bekend of het daarvoor ook
gebeurde.

**Gevolg.** Klein: de takenlaag probeert opnieuw. Maar de mislukte uitvoer wordt nergens bewaard,
want de fout valt vóór `recordUsage()` in `callStructured()`; deze aanroepen kosten wel geld en staan
niet in `ai_calls`.

**Voorstel.** In `callStructured()` ook een mislukte parse loggen (met de ruwe tekst), zodat het
aandeel meetbaar wordt; nagaan of het vaker gebeurt op GPT-6 Luna met `none` dan op de vorige Luna.

## 19. Een definitief mislukte Gemini- of Google-meting laat de analyse eeuwig op "meten" staan ✅

**Wat misging.** Sinds 20 september 2026 wacht de aggregatie op alle drie de meetbronnen
(`scheduleAggregateIfLastPrompt()` in `lib/jobs/handlers.ts`). Maar `scheduleFollowUpAfterFailure()`
plande de aggregatie na een definitief opgegeven taak alleen in voor `measure_prompt`. Op 24
september gaven alle 90 Gemini-taken van A, B en C op (punt 17), en alle drie de analyses bleven op
"meten" staan: geen rapport, geen pagina's, geen melding.

**Status.** Opgelost: de tak kent nu alle drie de meetsoorten, met een unittest en een
ketentestscenario. De drie vastgelopen analyses zijn na de reparatie met de hand aangezet.

## 20. Het rapport schrapt elke zin over welke concurrent een vraag wint, ook de juiste ✅

**Wat misging.** Het bewijsdossier dat het rapportmodel krijgt, noemt de gemiste vragen V1, V2,
enzovoort, zonder meet-id. Het schema vraagt per gap wel om meet-id's (`evidenceRunIds`). Het model
gaf dus codes ("V1") terug (hovenier, rijschool) of een lege lijst (installateur). De naamcontrole
(`validateReportClaims()` in `lib/pipeline/report.ts`) zocht die codes als meet-id op, vond niets, en
had dus bij elke gap een lege lijst toegestane namen. Gevolg: elke zin met een concurrentnaam ging
eruit. Vandaag 17 (A), 17 (B) en 15 (C) zinnen, in `reports.stripped_claims_json`, alle 49 met
`supportedNames: []`. Juist het deel van het rapport dat de klant het meest wil lezen ("wie staat er
wel, en waarom") verdween.

**Nagerekend.** Met de reparatie had 47 van de 49 zinnen mogen blijven staan: de genoemde naam stond
echt onder die vraag in het dossier. De overige 2 zijn punt 21.

**Oplossing.** `resolveGapEvidence()` (`lib/pipeline/evidence-format.ts`) vertaalt codes naar
meet-id's vóór de naamcontrole, met als terugval de codes in de clusternaam en daarna de dossiervragen
met dezelfde clusternaam. `schoonGapCluster()` haalt ook de code voor de clusternaam weg: alle 15 gaps
van de rijschool begonnen met "V1" plus een kastlijntje, zichtbaar voor de klant.

## 21. Een eigen product telde in de naamcontrole als concurrent ✅

**Wat misging.** Bij de installateur werd twee keer een zin geschrapt omdat "Hybride warmtepomp" als
naam in het entiteitenregister van het profiel staat. Elke zin die het product noemt, telt daardoor
als een bewering over een concurrent. **Waar te zoeken:** de indeling van namen (`classify_entities`)
en `looksLikeBrandName()` in `lib/pipeline/evidence.ts`, die dit filter voor het dossier wel heeft
maar niet voor `knownNames` in de naamcontrole.

**Oorzaak en oplossing.** De naam staat in het register met de rol `eigen_product`: terecht, het is
het product van de klant zelf. `loadKnownBrandNames()` nam die rol mee als naam om te controleren.
Een eigen product is geen bewering over een concurrent, dus die rol valt er nu uit.

## 23. Hetzelfde bedrijf staat twee keer in het namenregister

Bij de installateur staan "Verwarming Service Brabant" en "Verwarming Service Brabant (VSB)" als twee
concurrenten, en ook "VSB Hybride" (als niet relevant). Het gevolg voor het rapport (een juiste zin
geschrapt) is opgevangen: de naamcontrole negeert nu een toevoeging tussen haakjes. De dubbeling zelf
staat nog open en telt de vermeldingen van dat bedrijf over twee namen uit. **Waar te zoeken:**
`isSameEntity()` in `lib/entities/normalize.ts`.

## 22. Het rapport zegt "niet genoemd, 0 op 100" terwijl Google het merk wel noemde ✅

**Wat misging.** Het rijschoolrapport opende met "Pompert werd niet genoemd bij de 30 onderzochte
vragen. De zichtbaarheid is daarmee ongeveer 0 op 100". In de meting stond Pompert in 17 van de 74
AI-overzichten van Google (score 23). Het rapportmodel kreeg alleen het ChatGPT-cijfer en kon het
verschil niet weten. De klant leest in de eerste zin dat hij onzichtbaar is, en dat klopt niet.

**Oplossing.** De schrijfinstructie zegt nu welke andere bronnen het merk wel noemden (zonder hun
cijfer, want de eigenaar wil naast de ChatGPT-score nergens een tweede getal), en `vulBronnenAan()`
(`lib/pipeline/report-summary.ts`) zet er één zin achter als de samenvatting toch "niet genoemd" zegt
zonder ChatGPT erbij.

**Nagerekend op productie (24 september 2026).** De drie rapporten opnieuw gemaakt (de oude staan
bewaard als periode -1). Geschrapte zinnen: van 17, 17 en 15 naar 0, 5 en 0; de 5 waren punt 21 (4)
en punt 23 (1), die daarna ook opgelost zijn. Geen gap meer zonder bewijs (was 15 van 15 bij de
installateur). De samenvatting van alle drie noemt nu dat de score over ChatGPT gaat en dat Google het
merk wel noemde. Bij de rijschool stond de rechtzetting er toen twee keer in (model en vangnet); het
vangnet zwijgt nu als de samenvatting de bron al noemt.

## 24. Prioriteit van de aanbevelingen heeft geen afgesproken richting

De code (`mergeOverlappingRecommendations()`, de rapportmail) leest "laagste getal is het
belangrijkst". De instructie aan het model zegt daar niets over. Installateur en rijschool kregen
1 tot en met 5 en 1 tot en met 8; de hovenier kreeg 9, 10, 10, 7 en 6, met de twee pagina's waar
de ondernemer op wil groeien (Best en Nuenen) op 10, dus achteraan. Gevolg nu klein: het getal
bepaalt alleen de top 3 in de rapportmail (standaard uit) en welke van twee dubbele adviezen blijft.
**Richting:** de volgorde uit de meting afleiden (som van de gewichten van de doelvragen), zoals
bij punt 2, en het getal van het model alleen als tweede sleutel.

## 25. Een klaar cluster heeft geen link op zijn kaart ✅

`cluster-kaart.tsx` gaf de kop en de links "Cijfers van dit cluster" en "Pagina's van dit cluster"
alleen bij status "gemeten". Na het rapport is de status "gereed", de eindtoestand. De klant zag bij
alle drie de merken een kaart waar niets op te klikken viel, behalve het menu met de drie puntjes.
Opgelost: "gereed" hoort er nu bij.

## 26. De consultant ziet de clusters van een klantmerk niet

`loadBrandWork()` (`lib/work.ts`) en de prullenbak op de clusterpagina filteren op
`user_id = de ingelogde gebruiker`. De database laat een consultant alles lezen, maar dit extra
filter verbergt precies de clusters van de klant: bij alle drie de merken zag de consultant
"Alle clusters (0)" en de knop "Start het eerste cluster", terwijl er een gereed cluster was. Een
consultant die daarop klikt, start een tweede cluster en betaalt de meting dubbel. **Waarom nog
niet opgelost:** het raakt aan wie wat mag zien. De veilige richting is filteren op merk en de
toegang aan de database laten (die staat dat al goed toe), maar dat verdient een eigen controle
van alle plekken die `loadBrandWork()` gebruiken (`app/(app)/merk/[id]/page.tsx` en de
clusterpagina).

## 27. Het rapport kent de groeidoelen en feiten uit het gesprek niet

**Gezien.** Drie blinde lezers (stap 13) kwamen onafhankelijk op hetzelfde uit: het rapport stuurt
op wat de meting laat zien, niet op wat de ondernemer wil. De rijschool kreeg pagina's voor Helmond,
Waalre en Geldrop (geen groeiplaatsen) en niets over autisme en ADHD (zijn eerste groeidoel). De
installateur kreeg niets over Mierlo en Nuenen (zijn groeiplaatsen) en niets over ketelvervanging en
het onderhoudscontract (zijn tweede groeidoel). Adviezen zeggen "noem alleen bedragen die je kunt
onderbouwen" terwijl de ondernemer die bedragen in het gesprek al gaf.

**Nagerekend.** In de invoer van het installateursrapport komen "Mierlo", "1.800", "Remeha",
"24 uur", "4.500" en "VvE" nul keer voor. `generateReport()` haalt `profile_strategy` op, maar geeft
alleen `context_factors` door (`lib/pipeline/report.ts`, de `strategyRow`).

**Richting.** De groeidoelen, groeiplaatsen, klantgroepen en verboden onderwerpen uit het gesprek
horen in de rapportinvoer, als weegfactor bij de volgorde en als filter (geen advies over een
verboden onderwerp). Het deel van punt 5 (de meetvragen negeren de groeiplaatsen) zit hier
stroomopwaarts van: vraagt de meting niet naar Mierlo, dan kan het rapport er ook niets over zeggen.

## 28. De site-inventaris mist de hoofdpagina uit het menu en bevat fotobijlagen

**Gezien bij de rijschool.** De pagina `/rijles-met-faalangst-autisme/` staat in het hoofdmenu en is
de belangrijkste pagina voor het cluster, maar zit niet tussen de 108 pagina's die de app van de
site kent. Wel bekend: vijf fotobijlagepagina's (`/cbr-peter-pompert-2/` tot en met `-5/`) en een
tagpagina. Het rapport adviseert daardoor de blog "angst voor autorijden" als faalangstpagina, en
wil een fotobijlage (`/autorijschool-pompert/cbr-peter-pompert-2/`) "verbeteren" met uitleg over het
faalangstexamen. **Bij de hovenier** kende de app één pagina (punt 4), dus adviseerde het rapport
"nieuwe pagina voor Best" en "voor Nuenen" terwijl `/hovenier-in-best/` en `/hovenier-in-nuenen/`
bestaan. Punt 4 en 10 hebben hier dus een direct zichtbaar gevolg in het advies aan de klant.

## 29. Het planscherm belooft de klant iets wat hij niet mag ✅

Als klant stond er "Zodra hieronder alles klaarstaat, stel je het plan zelf op" met een actieve knop
"Stel het contentplan op". Klikken gaf een 403 met de melding dat de consultant het schrijven in gang
zet (`content_schrijven` in `lib/cost-rules.ts`, sinds 2 september 2026 alleen voor de consultant).
Het scherm zei het dus pas achteraf. Nu staat de melding er vooraf, zoals bij "Geef deze maand vrij"
sinds de UX-audit van 23 september.

## 30. Het plan gaf de zwaarste gemiste vraag potentie 0 ✅

`loadPotentialForTargets()` (`lib/potential-data.ts`) telde een vraag als "genoemd" zodra het merk
in één meting van één bron stond. Het rapport gebruikt een meerderheidsregel (eerst per bron over de
herhalingen, dan één stem per bron, `lib/pipeline/missed-prompts.ts`). Bij de installateur noemde
ChatGPT hem bij de zwaarste vraag ("Welke installateur in Geldrop kan een hybride warmtepomp in mijn
bestaande woning plaatsen?", gewicht 0,50) in een van de drie herhalingen en Google in geen van de
drie. Het rapport: gemist, en de eerste aanbeveling. Het plan: potentie 0, dus de laatste pagina van
de maand. Bij de hovenier kregen twee pagina's om dezelfde reden 0. Nu volgt de potentie dezelfde
regel (`genoemdPerVraag()`).

## 31. Het plan zet vier verbeteringen van dezelfde pagina in dezelfde week

Bij de installateur gaan vier van de vijf geplande pagina's over `https://www.wkinstallatie.nl/warmtepomp`
(keuzehulp, controle vooraf, prijs, lokaal voor Geldrop), gepland op 25, 26, 27 en 28 september. Elk
wordt een aparte verbeteropdracht voor dezelfde pagina: vier herschrijvingen die elkaar overschrijven
of een klant die er zelf één pagina van moet maken. Bij de hovenier twee verbeteringen van de
homepage op dezelfde dag. De drie blinde lezers van stap 13 raadden alle drie aparte pagina's per
vraag aan. **Richting:** `mergeOverlappingRecommendations()` voegt adviezen al samen; dezelfde
`existingUrl` hoort daar als samenvoegreden bij, of het rapport moet bij een tweede advies voor
dezelfde pagina een nieuwe pagina voorstellen.

## 32. "Opnieuw opzetten" faalt, of laat de kansen van het oude plan achter

**Gezien.** Na de reparatie van punt 30 wilde ik het plan van de hovenier opnieuw opzetten om de
nieuwe volgorde na te rekenen. Het venster belooft "Je krijgt twaalf verse maanden terug, meteen
gevuld met de sterkste kansen uit je voorraad". De server antwoordde 422: "Er zijn nog geen gemeten
kansen om in te plannen." Het oude plan bleef ongewijzigd staan (geen schade).

**Oorzaak.** `createPlan()` (`lib/plans.ts`) telt als voorraad alleen `planned_pages` zonder maand
(`plan_month_id is null`). De vijf kansen van de hovenier stonden al in maand 1 van het huidige plan
en tellen dus niet. Bij een nieuwe klant staat alles in het eerste plan, dus faalt opnieuw opzetten
altijd. Is er wel losse voorraad, dan lukt het, maar de kansen in de niet vrijgegeven maanden van het
oude plan blijven daar hangen: `syncBacklog()` maakt ze niet opnieuw aan omdat ze al bestaan.

**Richting.** Bij opnieuw opzetten de pagina's uit de nog niet vrijgegeven maanden van het oude plan,
zonder tekst, terugzetten in de voorraad (maand en datum leeg) voordat de voorraad geteld wordt. Het
oude plan houdt dan zijn maanden maar niet die pagina's; het venster moet dat dan ook zo zeggen.

## 33. Een deadline in het verleden

Het vrijgeefvenster zei op 24 september: "Beantwoord ze graag vóór 13 september om op schema te
blijven." Het plan zette de eerste pagina op 25 september; met tien dagen schrijftijd en twee dagen
voor de vragen lag de deadline elf dagen terug. Details in stap 15 van
`docs/tasks/kwaliteitsdoorlichting-stappen.md`.

## 34. "Wacht op jouw vrijgave" terwijl de consultant vrijgeeft

Op het planscherm van de klant staat bovenaan "Deze maand wacht op jouw vrijgave. Daarna begint ORBIT
ENGINE te schrijven." en onderaan hetzelfde blok "Deze maand goedkeuren doet je consultant bij Outer
Orbit samen met jou." Beter: "Deze maand wacht op vrijgave door je consultant. Laat weten of je
akkoord bent."

## 35. Vragen die het gesprek al beantwoordde, blijven openstaan

Bij de installateur vraagt de app de klant onder "Vragen over je merk": "Hoeveel eigen monteurs werken
er momenteel bij het bedrijf?", "Kunnen klanten buiten kantoortijden een storing melden?", "Biedt u
onderhoudscontracten aan?" en "In welke plaatsen buiten Geldrop en Eindhoven neemt u opdrachten
aan?". Alle vier staan in het gesprek (`profiles.offline_proof`: "Twaalf monteurs in dienst",
"binnen 24 uur bij een storing, ook in het weekend", "Meer dan 1.800 onderhoudscontracten";
`profiles.growth_regions`: Mierlo, Heeze-Leende, Nuenen). De vragen zijn om 21:41 gemaakt tijdens het
onderzoek, het gesprek is om 22:00 opgeslagen (`profile_field_sources.set_at`), en niets sluit een
vraag af die het gesprek beantwoordt. Bij de rapportvragen hetzelfde: "Welke plaatsen bedient Wesley,
specifiek Geldrop, Mierlo en Nuenen?". **Gevolg:** de klant typt opnieuw wat hij net vertelde, en
leest daaruit dat er niet geluisterd is. **Richting:** na het opslaan van het gesprek de open
merkvragen langs de ingevulde velden leggen en een beantwoorde vraag sluiten met het antwoord uit het
gesprek.

## 36. Elk rapport zet zijn eigen vragen klaar

`saveFactRequests()` (`lib/pipeline/report.ts`) bewaart de feitvragen van het rapport per merk, met
een unieke sleutel op de letterlijke vraagtekst. Een nieuw rapport (volgende periode, of opnieuw
gemaakt) formuleert dezelfde vraag net anders en zet hem er dus opnieuw bij. Na drie rapportversies
had de installateur vier varianten van "welke controles doet u bij een woningbezoek" en drie van
"welke merken levert u". Ook zonder herhaling overlappen de rapportvragen met de vragen per pagina
("Wat is doorgaans de wachttijd voor een eerste gesprek" en "Wat is de gebruikelijke wachttijd voor
een eerste gesprek en voor de start van tuinaanleg" stonden allebei bij de hovenier). Voor de
doorlichting zijn de vragen van de twee gearchiveerde rapportversies op `verlopen` gezet (31 rijen,
niets verwijderd).

## 37. "En" en "of" met een schuine streep in een vraag aan de klant

"Voor welke begeleidingsvragen hebben instructeurs specifieke ervaring of scholing: faalangst, ADD,
ADHD" met daarna "en" en "of" met een schuine streep, en dan "autisme?". De schrijfregels
(`docs/schrijfstijl.md` §10) verbieden die combinatie overal; de
vraagtekst komt rechtstreeks uit het model zonder controle. Hetzelfde vangnet als voor de
gedachtestreepjes hoort ook over vraagteksten te gaan.

## 38. Het laatste antwoord van een pagina laat de klant wachten

Gemeten over 70 antwoorden: een gewoon antwoord kost 0,3 tot 1,3 seconden. Het laatste antwoord van
een pagina kost 9 tot 18 seconden, en het allereerste van de hovenier meer dan 30. De route
(`app/api/profiles/[id]/facts/route.ts`) roept na het opslaan `probeerNaAntwoord()` aan, en die
beoordeelt voor elke gekoppelde pagina de onderbouwing en start het schrijven, binnen dezelfde klik.
Een vraag die aan vijf pagina's hangt, doet dat vijf keer. **Richting:** het opslaan meteen
bevestigen en de beoordeling als taak inplannen.

## 39. Een beantwoorde vraag maakt de bewering erachter nooit "onderbouwd"

**Gezien bij de hovenier, pagina Best.** De klant beantwoordde de prijsband ("meestal tussen 12.000 en
35.000 euro"), de duur ("2 tot 3 weken uitvoering") en bestraten in de winter ("Ja"). De schrijver
gebruikte prijs en duur. Toch staan ze in de keuring als "Deze pagina leunt op een bewering die we
niet kunnen onderbouwen", met als oplossing "Beantwoord deze vraag: Hebben jullie een prijsvoorbeeld
of prijsband...". Dezelfde vraag die de klant net beantwoordde.

**Oorzaak.** `claimIsOnderbouwd()` (`lib/pipeline/evidence-weight.ts`) herkent een bewering alleen via
het bronnummer (`sourceRef`) of het citaat (`supportQuote`) dat de claim-audit tijdens de voorbereiding
meegaf. Een bewering zonder bron op dat moment heeft geen van beide; juist die wordt een vraag aan de
klant. Het antwoord komt als feit binnen (`brand_facts.origin_fact_request_id` wijst naar de vraag),
maar niets legt de lijn terug naar de bewering. `buildPlanBlock()` (`lib/pipeline/content.ts`) zegt de
schrijver daardoor ook "GEEN BRON: laat deze passage weg" over precies wat de klant aanleverde.
**Richting:** de vraag draagt al een `claim_key`; een feit uit een beantwoorde vraag dekt de bewering
met dezelfde sleutel.

## 40. De keuring blokkeert op beweringen van andere pagina's

In de keuring van de pagina voor Best staan blokkades als "nodig voor: De pagina moet laten zien dat
één hovenier ontwerp, bestrating en aanleg kan combineren voor een tuin in Nuenen" en "De bezoeker
vraagt om een ongeveer-bedrag voor ontwerp en aanleg" (bestrating in Eindhoven). **Oorzaak:**
`paginaVanClaim()` in `lib/pipeline/briefing.ts` koppelt een bewering die op geen enkele doelvraag
matcht bewust aan alle pagina's van de batch ("kost hooguit een dubbele vraag"). Dat is goed voor het
stellen van vragen, maar het paginaplan dat dezelfde koppeling gebruikt, gaat naar de schrijver en de
keuring, en daar wordt een bewering van een andere pagina een blokkade. Dezelfde bewering stond vier
keer in één keuring.

## 41. Antwoorden van de klant opgeslagen als feit van de site

In `brand_facts` staan de antwoorden op de paginavragen van de hovenier met `kind = site` en `source =
"site hansverstraatenhoveniers.nl"`, als aan elkaar geplakte vraag en antwoord ("Leggen jullie
bestrating ook in de winter aan? Ja, in de winter doen we vooral bestrating en ontwerp"). De
antwoorden op de merk- en rapportvragen staan wel goed als `kind = klant`, "klant, bevestigd
24-9-2026". Verkeerde herkomst maakt de audit-trail onbetrouwbaar en laat een schrijver een klantfeit
als sitefeit citeren.

## 42. "Tekst is klaar, keur hem goed" bij een tegengehouden tekst

Vier teksten van de hovenier stonden op `ready` met `quality_verdict = block` (100 procent zeker). De
klant ziet in de bibliotheek "Tekst is klaar: lees hem en keur hem goed" met "Kwaliteit 65 tot 73 op
100", en op de pagina "Er staan nog 15 punten open" met de knoppen "Los de 15 punten op" en "Keur toch
goed". Twaalf van die vijftien kan hij niet oplossen (punt 39 en 40). Gevolg: óf hij keurt toch goed en
leert dat de punten niets betekenen, óf hij blijft hangen.

## 43. Het bedrag van de klant "in strijd met de instructie"

De opzet van de pagina (`contract_json`) is gemaakt vóór de klant zijn prijsband gaf en zegt daarom
"geen prijsbedragen noemen". De schrijver kreeg daarna wel de prijsband en gebruikte hem. De keuring
toetst tegen de oude opzet: "De genoemde prijsband is in strijd met de instructie om geen
prijsbedragen op te nemen", en hetzelfde voor de doorlooptijd. De opzet hoort na de antwoorden bij te
werken, of de keuring hoort de feitenkaart boven de opzet te laten gaan.

## 44. Tegengehouden pagina: "Alle gegevens bekend, wordt nu geschreven"

"Leg op de bestaande pagina uit welke plaatsen en projecten het bedrijf bedient" werd niet geschreven
omdat de dekking 33 procent was (`te_weinig_onderbouwd`). De bibliotheek toont de klant "Alle
gegevens bekend, wordt nu geschreven". De melding uit `schrijfpoort()` ("er is te weinig over je
bedrijf bekend... kies of we hem algemeen schrijven") bereikt dat scherm niet.

---

## Wat goed ging, om niet kapot te maken

- **Het gesprek heeft aantoonbaar effect.** Na het vastleggen sloten de onderwerpen van alle drie de
  merken aan op de groeidoelen: C ging van "automaat" bovenaan naar "faalangst" en "autisme", B van
  "waterontharder" naar "hybride warmtepomp".
- **De crawl kwam binnen** bij twee van de drie sites die sommige automatische bezoekers weigeren.
