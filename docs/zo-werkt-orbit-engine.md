# Zo werkt ORBIT ENGINE, van begin tot eind

> **Voor wie dit is.** Iedereen die ORBIT ENGINE nog niet kent en wil begrijpen wat de app doet,
> voor wie, en hoe hij dat stap voor stap aanpakt. Je hebt er geen technische kennis voor nodig.
> Waar een technisch woord onvermijdelijk is, staat de uitleg erbij, en achterin staat een
> begrippenlijst.
>
> **Peildatum: 28 september 2026**, nagelopen tegen de code en de documentatie in deze repository.
> Wijkt de app af van wat hier staat, dan is de app leidend. Dit document beschrijft wat de app
> vandaag doet; waar iets nog niet af is, staat dat er eerlijk bij.
>
> **Wil je dieper?** De technische doorloop per stap, met wat de AI precies meekrijgt, staat in
> [`doorloop-van-klant-tot-content.md`](./doorloop-van-klant-tot-content.md). Waarom iets is zoals
> het is, staat in [`logbook.md`](./logbook.md).

---

## Inhoud

**Deel I. Het grote plaatje**
1. [Het probleem en het antwoord](#1-het-probleem-en-het-antwoord)
2. [Wie werken er met de app](#2-wie-werken-er-met-de-app)
3. [De hele reis op één bladzijde](#3-de-hele-reis-op-één-bladzijde)
4. [Hoe de app achter de schermen werkt](#4-hoe-de-app-achter-de-schermen-werkt)

**Deel II. De reis, stap voor stap**

5. [Een merk aanmaken](#5-een-merk-aanmaken)
6. [Het automatische onderzoek](#6-het-automatische-onderzoek)
7. [Het gesprek met de klant](#7-het-gesprek-met-de-klant)
8. [De klant toegang geven](#8-de-klant-toegang-geven)
9. [Een cluster opzetten: bepalen wat we meten](#9-een-cluster-opzetten-bepalen-wat-we-meten)
10. [De meting](#10-de-meting)
11. [Het rapport en de kansen](#11-het-rapport-en-de-kansen)
12. [Het contentplan](#12-het-contentplan)
13. [Een pagina voorbereiden](#13-een-pagina-voorbereiden)
14. [De vragen aan de klant](#14-de-vragen-aan-de-klant)
15. [Het schrijven](#15-het-schrijven)
16. [De controle](#16-de-controle)
17. [Lezen, goedkeuren en opleveren](#17-lezen-goedkeuren-en-opleveren)
18. [Publiceren en controleren](#18-publiceren-en-controleren)
19. [Het effect meten](#19-het-effect-meten)

**Deel III. Wat er verder in de app zit**

20. [Wat maandelijks vanzelf doorloopt](#20-wat-maandelijks-vanzelf-doorloopt)
21. [De schermen met cijfers](#21-de-schermen-met-cijfers)
22. [Extra onderdelen: clusters ontdekken, reputatie, externe bronnen](#22-extra-onderdelen-clusters-ontdekken-reputatie-externe-bronnen)
23. [De Sales-module (alleen intern)](#23-de-sales-module-alleen-intern)

**Deel IV. Grenzen, kosten en begrippen**

24. [Wat de app bewust niet doet, en wat nog niet af is](#24-wat-de-app-bewust-niet-doet-en-wat-nog-niet-af-is)
25. [Kosten en tijd](#25-kosten-en-tijd)
26. [Begrippenlijst](#26-begrippenlijst)

---

# Deel I. Het grote plaatje

## 1. Het probleem en het antwoord

Steeds meer mensen stellen hun vragen niet meer aan Google, maar aan een AI-assistent zoals
ChatGPT. Iemand typt bijvoorbeeld: "welke installateur in Eindhoven kan mijn cv-ketel vervangen?".
De assistent geeft een antwoord en noemt daarin een paar bedrijven. Wordt jouw bedrijf daar niet
genoemd, dan besta je voor die persoon niet. Zichtbaar zijn in die antwoorden heet **GEO**
(Generative Engine Optimization), zoals zichtbaar zijn in Google SEO heet.

ORBIT ENGINE is de app van Outer Orbit die dit voor mkb-bedrijven meet en verbetert. Hij doet dat
in vier bewegingen:

- **Meten.** Wordt het bedrijf genoemd als een koper een vraag stelt? Hoe vaak, vergeleken met de
  concurrenten? En waar haalt de AI zijn informatie vandaan?
- **Adviseren.** Welke pagina's ontbreken op de website, of zijn te zwak, waardoor een
  AI-assistent het bedrijf niet noemt?
- **Schrijven.** Die pagina's samen met de ondernemer maken. De app haalt op wat alleen de
  ondernemer weet, en een sterke AI-schrijver maakt er een pagina van die zo op de eigen site kan.
- **Effect bewijzen.** Na publicatie opnieuw meten, naast een controlegroep, om te zien of de
  pagina echt iets opleverde.

Het uitgangspunt van het schrijven is: de app probeert niet de mooiste AI-tekst te maken, maar de
kennis van de ondernemer zo goed mogelijk bij een goede AI-schrijver te krijgen. Daarom zijn de
vragen aan de ondernemer geen bijzaak, maar de kern van het product.

Het onderscheidende punt is de **gesloten lus**: meten, verklaren, maken, publiceren en daarna
opnieuw meten met een vergelijkingsgroep. De app zegt nooit "het heeft gewerkt" zonder die laatste
stap.

## 2. Wie werken er met de app

De app wordt niet door klanten zelf gestart. Outer Orbit verkoopt eerst, en pas daarna krijgt de
klant toegang. Dat heet **sales-led** (in plaats van self-serve, waarbij een klant zich zelf
aanmeldt). Er zijn vier rollen:

- **De consultant** (in de app "beheerder"). Een medewerker van Outer Orbit. Zet het merk klaar
  vóór het eerste gesprek, voert het gesprek, en start alles wat geld kost. Ziet alles, ook de
  beheerschermen onder "Admin".
- **De klant.** Het bedrijf dat de dienst afneemt. Ziet alleen het eigen merk, zonder de
  beheerschermen. Beantwoordt vragen, leest teksten, keurt ze goed en zet ze op de eigen site. Kan
  zelf niets starten wat geld kost; drukt de klant op zo'n knop, dan zegt de app dat de consultant
  dat regelt.
- **De salesmedewerker.** Werkt alleen in de interne Sales-module (hoofdstuk 23) en ziet daar
  mogelijke nieuwe klanten.
- **De sales admin.** Als salesmedewerker, maar mag ook een marktonderzoek starten, omdat dat geld
  kost.

Een klant kan geen account aanmaken. De consultant nodigt de klant uit, of maakt de inlog aan.

## 3. De hele reis op één bladzijde

```
 CONSULTANT                     APP (vanzelf)                          KLANT
 ──────────                     ─────────────                          ─────
 Merk aanmaken  ──────────────▶ Onderzoek: site lezen, aanbod,
 (3 velden)                     markt, kennistest, dossier
                                (ongeveer 7,5 min, ongeveer $0,25)
 Gesprek met de klant ◀──────────────────────────────────────────────▶ meepraten, aanvullen
 Toegang geven + pakket ─────────────────────────────────────────────▶ kan inloggen
 Cluster starten ─────────────▶ 30 meetvragen opstellen
 Vragen goedkeuren ◀─────────── (pas meten na akkoord)
                                Meten: de vragen aan ChatGPT stellen
                                (ongeveer $0,82 per ronde)
                                Rapport: waar win je, waar verlies je,
                                welke pagina's zijn nodig
 Contentplan: kansen in
 maanden zetten, maand
 vrijgeven ───────────────────▶ Per pagina: onderzoek + vragen
                                                                  ───▶ vragen beantwoorden
                                Schrijven, controleren,
                                hooguit één keer herschrijven
                                                                  ───▶ lezen, twijfelzinnen
                                                                       nalopen, goedkeuren,
                                                                       op eigen site zetten
                                Controleren of de pagina live staat
                                Na 14 en 28 dagen opnieuw meten,
                                naast een controlegroep
                                Elke maand: nieuwe meetronde
```

## 4. Hoe de app achter de schermen werkt

Voordat we de stappen doorlopen, helpt het om vier dingen te weten over hoe de app werkt. Ze komen
bij elke stap terug.

**De wachtrij met taken**

- Bijna alles gebeurt op de achtergrond. Een scherm zet een **taak** klaar en geeft meteen
  antwoord. Je mag het scherm daarna sluiten.
- Elke minuut kijkt een **werker** (een automatisch proces op de server) welke taken klaarstaan, en
  voert ze uit.
- Elke taak zet zelf de volgende taak klaar. Zo loopt een hele reeks stappen vanzelf door.
- Mislukt een taak, dan probeert de werker het tot vier keer, met steeds langere pauzes (2, 4, 8
  en 16 minuten).
- Een taak kijkt altijd eerst of het resultaat al bestaat. Zo wordt nooit twee keer voor hetzelfde
  werk betaald.

**Twee remmen op de kosten**

- **Wie mag het starten?** Alles wat geld kost (een merk onderzoeken, een cluster starten, een
  meting starten, een plan opstellen, een maand vrijgeven, een reputatieonderzoek, extra clusters
  zoeken) start alleen de consultant.
- **Hoeveel is er nog?** Er is een dagplafond: €20 per klantaccount en €50 voor alle accounts
  samen. Werk dat al in de wachtrij staat, loopt altijd af; een meetronde wordt nooit halverwege
  afgebroken.

**De AI die de app gebruikt**

- De app gebruikt twee modellen van OpenAI, die vast in de code staan:
  - **Luna**, het goedkopere model, voor onderzoek, meten, indelen en rapporteren;
  - **Sol**, het sterkste model, voor alles rond het schrijven van pagina's en voor de
    samenvatting van het onderzoek.
- Per opdracht bepaalt de app hoeveel het model mag nadenken en hoe vrij het mag formuleren.
  Beoordelen of een merk genoemd wordt, gebeurt zo strak mogelijk; meetvragen bedenken juist met
  veel variatie; schrijven met veel denktijd.
- Bij sommige opdrachten mag het model op internet zoeken, bij andere bewust niet.

**Drie vaste regels**

- **Harde feiten krijgen altijd een controle in de code.** Bedragen, getallen, termijnen,
  garanties en keurmerken worden nagerekend door de app zelf, niet alleen aan de AI overgelaten.
  Stijl, toon en lengte bewust niet: dat maakt teksten star.
- **Onbekend is beter dan fout.** Kan de AI iets niet vaststellen, dan wordt het "onbekend", nooit
  een gok en nooit 0.
- **Alles wordt bewaard.** Elk antwoord van de AI wordt volledig opgeslagen, met de kosten. Zo is
  achteraf altijd na te gaan waar een uitkomst vandaan kwam.

**Eén plek voor wat we van de klant weten**

- Alles wat de app over een bedrijf weet, staat in één **kennislaag**: het aanbod, de feiten, de
  verhalen, de stem, wat niet mag. Elk stukje kennis heeft een herkomst:
  - **waargenomen**: staat letterlijk op de website, en de app heeft dat citaat teruggevonden;
  - **verklaard**: gezegd door de ondernemer of de consultant;
  - **afgeleid**: een vermoeden van de AI. Een vermoeden gaat niet mee naar de schrijver.
- Zegt de ene bron iets anders dan de andere (twee prijzen voor hetzelfde), dan gaat geen van
  beide naar de schrijver tot de consultant gekozen heeft welke klopt.

---

# Deel II. De reis, stap voor stap

## 5. Een merk aanmaken

Een nieuwe klant begint met een merk. Met zo weinig mogelijk invoer legt de consultant het bedrijf
vast, zodat de app het onderzoek kan doen vóór er een gesprek met de klant is. De klant merkt hier
nog niets van.

- De consultant gaat naar **Merken** en kiest **"+ Nieuw merk"**.
- De consultant vult **drie velden** in:
  - het webadres;
  - de bedrijfsnaam;
  - eventueel andere schrijfwijzen van de naam (een afkorting, een veelgemaakte spelfout).
    Dat lijkt een detail, maar de meting telt later alleen namen die de app kent. Een ontbrekende
    schrijfwijze geeft een te lage score.
- De app controleert het webadres. Is het ongeldig, dan staat de melding bij het veld. Is de site
  niet bereikbaar, dan zegt de app dat, en mag de consultant toch doorgaan (sommige sites weren
  automatische bezoekers).
- Het merk wordt opgeslagen op het account van de consultant. De klant ziet het nog niet.
- Wat de consultant intypte, krijgt het label "ingevuld door de consultant". Het onderzoek mag dat
  tegenspreken, maar overschrijft het nooit stilletjes.
- De app zet de eerste onderzoekstaak klaar en het onderzoek begint vanzelf. Het merk staat nu op
  de fase **"Voorbereiden"**.

## 6. Het automatische onderzoek

Vóór het eerste gesprek wil de consultant weten wie dit bedrijf is, wat het aanbiedt, wie de
concurrenten zijn en wat AI-assistenten er al over weten. Dat zoekt de app helemaal zelf uit, in
een reeks taken die na elkaar lopen. Het vooronderzoek duurt tot ongeveer 10 minuten, daarna
ongeveer 7,5 minuut voor de rest, voor ongeveer 25 dollarcent. Zo kan de consultant het gesprek
voeren op basis van wat de app gevonden heeft.

- **Vooronderzoek.** De app bekijkt tot 1.000 pagina's van de site, alleen de titel en de korte
  omschrijving. Daaruit kiest hij welke pagina's het aanbod echt dragen. Hier komt geen AI aan te
  pas.
- **De site uitlezen.** De app leest tot 150 pagina's helemaal, verdeeld over alle delen van de
  site. Hij haalt er telefoon, adres, e-mail en KvK-nummer uit, herkent welk websitesysteem er
  gebruikt wordt (bijvoorbeeld WordPress), en kijkt of de tekst leesbaar is zonder dat de pagina
  eerst code moet uitvoeren. Bij een grote site bepaalt de AI eerst welke delen voorrang krijgen.
- **Technische controle.** Tegelijk kijkt de app of AI-bedrijven de site mogen bezoeken, of de
  bedrijfsnaam overal hetzelfde geschreven wordt, en of er gestructureerde informatie voor
  zoekmachines op de site staat. Geen AI nodig.
- **Het bedrijf leren kennen.** De AI bepaalt met zoeken op internet de branche, het kernaanbod,
  de toon, de klantgroepen, waar het bedrijf goed in is, het werkgebied en drie tot vijf
  concurrenten. Weet de AI het werkgebied niet, dan moet hij "onbekend" zeggen in plaats van te
  gokken. Wat de consultant invulde, blijft staan. Dit is de enige stap die de hele reeks stopt als
  hij mislukt, want alles daarna bouwt erop.
- **Het aanbod als boom.** De AI zet alle diensten en producten in een boom (hoofdgroepen met
  onderdelen eronder). De harde regel: elke dienst moet een bronpagina hebben én een citaat dat
  letterlijk op die pagina staat. De app loopt elk citaat na; een dienst zonder bewijs valt af. Wat
  de AI niet kon vaststellen, wordt een open punt voor het gesprek. Deze stap zoekt bewust niet op
  internet, anders neemt de AI aanbod van concurrenten over.
- **Onderwerpen voorstellen.** Uit het aanbod stelt de AI vijf tot acht onderwerpen voor waarop het
  bedrijf gemeten kan worden. Niet te breed ("fysiotherapie"), niet te smal ("dry needling bij
  frozen shoulder"), maar zoals iemand met een probleem zoekt ("hardloopblessure behandelen"). Is
  er geen aanbodboom, dan slaat de app deze stap over in plaats van algemene onderwerpen te
  verzinnen.
- **De markt.** De AI zoekt op internet uit waarom concurrenten winnen (bereik, prijs,
  specialisatie) en welke andere websites in deze markt gezag hebben, zoals vergelijkers,
  reviewplatforms en vakbladen.
- **De kennistest.** De app stelt een reeks korte vragen aan de AI, zoals een gewone gebruiker dat
  zou doen:
  - Kent de AI het merk, zonder op internet te zoeken? ("Wat weet je over [merk] uit [plaats]?")
  - Klopt wat hij zegt? De app vergelijkt het antwoord zelf met de feiten van de site.
  - Welke bronnen vindt hij als hij wel zoekt?
  - Zijn er andere bedrijven met dezelfde naam? Die worden een voorstel voor de lijst "niet ons
    merk", zodat ze later niet als het eigen merk geteld worden.
  - Wie beveelt de AI aan bij een vraag naar deze dienst in deze plaats, zonder merknaam? Dat is
    een eerste nulmeting.

  Het oordeel (bekend, klopt, genoemd) velt de app zelf, nooit de AI over zichzelf. "ChatGPT denkt
  dat je in Eindhoven zit" is voor een ondernemer vaak de meest alarmerende uitkomst.
- **Alles samenbrengen.** Het sterkste model maakt er één dossier van: vier tot acht zinnen zonder
  vakjargon, een lijst citeerbare feiten (elk met een bronpagina en een letterlijk citaat), en open
  punten die in dertig seconden te beantwoorden zijn. Een feit waarvan het citaat niet letterlijk
  op de bronpagina staat, gooit de app weg.
- Het merk springt naar **"Klaar voor het gesprek"**. Een stap die niets vond, toont een
  waarschuwing in plaats van een groen vinkje.

## 7. Het gesprek met de klant

Een website vertelt nooit alles. In het gesprek vult de consultant samen met de klant aan wat
ontbreekt: commerciële keuzes, verhalen uit de praktijk, de stem van het bedrijf en wat niet mag.
Wat hier wordt ingevuld, gaat letterlijk mee naar de schrijver van elke pagina. Dit gesprek bepaalt
dus voor een groot deel hoe goed alle latere teksten worden.

- De consultant opent **Admin, Onboardinggesprek**.
- Bovenaan staat wat nog niet bekend is, het belangrijkste eerst. Het werkgebied staat bijna altijd
  bovenaan, want dat bepaalt of de meetvragen over een regio gaan of over heel Nederland.
- Staan er al pagina's gepland, dan toont het scherm ook per onderwerp wat de app voor die pagina's
  nog niet weet. Zo kan de consultant daar in het gesprek meteen naar vragen.
- Het dossier wordt samen nagelopen, blok voor blok: het bedrijf en de namen, het aanbod, de markt,
  het bewijs, de klant en de toon, materiaal en veranderingen, techniek, en afspraken. Elk veld
  slaat zichzelf op zodra je eruit klikt, en onder elk veld staat waar het antwoord terechtkomt.
- De commerciële vragen: waar wil de klant op groeien, wat juist niet meer, welke klantgroepen en
  plaatsen, wat is een klant waard, het seizoen, veelgehoorde bezwaren, **verboden onderwerpen en
  verboden woorden**, extra bewijs (certificaten, cijfers), en gelijknamige bedrijven.
- **De verhalen**, in losse vakken: twee of drie typische klussen (elk in een eigen alinea), hoe het
  bedrijf werkt in eigen woorden, de bezwaren die de ondernemer hoort met wat hij dan zegt, wat het
  bedrijf bewust niet doet, en waarom het ooit begon. Elke klus gaat los mee, zodat hij op de
  pagina komt waar hij past; de werkwijze gaat één keer mee naar elke pagina. Een vak "Nog meer
  verhalen" vangt de rest op.
- **Stemvoorbeelden**: één tot drie adressen van pagina's waarop de stem van het bedrijf goed te
  horen is. De app haalt die tekst op. Zonder stemvoorbeelden gebruikt de schrijver de homepage.
- Optioneel: een tarievenpagina, brochure of offertetekst plakken, of een verandering vastleggen
  die nog niet op de site staat (een nieuwe vestiging, een dienst die stopt).
- Is "Verhalen" leeg of heel kort, is er geen enkel stemvoorbeeld opgehaald, of staan er geen
  verboden woorden, dan toont het scherm daar een aparte melding over, met een link naar elk zwak
  veld. De melding houdt niets tegen, maar laat zien dat de teksten later minder eigen worden.
- Is er iets veranderd dat het onderzoek raakt, dan kiest de consultant **"Onderzoek bijwerken"**.
  De app toont eerst wat het kost, en herhaalt alleen de stappen die geraakt worden. Een ander
  werkgebied geeft bijvoorbeeld nieuwe meetvragen en een nieuwe kennistest; een nieuwe concurrent
  alleen een nieuw marktonderzoek.
- De consultant legt het gesprek vast. Het merk springt naar **"Gesprek gehad"**.
- Achteraf kan de consultant alles wat de app weet nalopen op het **kennisoverzicht** (Admin,
  Kennis): bevestigen, aanpassen, "klopt niet" of "staat niet op de site". Tegenstrijdige feiten
  staan op een eigen lijst (Admin, Feiten), waar de consultant kiest welke klopt.

## 8. De klant toegang geven

Na de verkoop gaat het merk van de consultant naar de klant. Vanaf dat moment kan de klant
inloggen, vragen beantwoorden en teksten goedkeuren.

- **Het merk toewijzen** (Admin, Toewijzen). De consultant vult het e-mailadres van de klant in.
  Het merk en alles eronder verhuist naar het account van de klant. De consultant houdt volledige
  toegang.
- **Een inlog voor de klant.** Heeft de klant al een inlog, dan heeft die meteen toegang. Zo niet,
  dan maakt de app een nieuw account aan en geeft een uitnodigingslink terug. Omdat de app
  standaard geen e-mail verstuurt, stuurt de consultant die link zelf door. De klant kiest daarmee
  een wachtwoord. Zelf registreren kan niet.
- **Het pakket kiezen**: hoeveel pagina's per maand er verkocht zijn (5, 10 of 20). Zonder pakket
  kan de app geen contentplan maken.
- Het merk springt naar **"Overgedragen"**.
- Deze stap mag ook later, bijvoorbeeld pas na de eerste meting.

## 9. Een cluster opzetten: bepalen wat we meten

Een **cluster** is één onderwerp waarop het merk gemeten wordt, bijvoorbeeld "cv-ketel vervangen".
Per cluster stelt de app dertig vragen op die kopers echt aan een AI-assistent stellen. Die vragen
zijn de meetlat: de score, het rapport en de pagina's gaan allemaal over deze vragen. Er wordt pas
gemeten nadat iemand ze heeft goedgekeurd.

- De consultant opent **Mijn clusters**. Daar staan de voorgestelde onderwerpen uit het onderzoek.
- De consultant keurt een onderwerp goed, of typt zelf een onderwerp in. Dit kost een paar
  dollarcent.
- **Het onderwerp onderzoeken.** De AI kijkt wat de eigen site al over dit onderwerp zegt, en wie
  hier de concurrenten zijn. Dat kunnen andere zijn dan voor het hele bedrijf.
- **De meetvragen opstellen.** De AI bedenkt tien vragen per fase van de klantreis:
  - *oriëntatie*: iemand die zich net inleest en nog geen aanbieder kent;
  - *overweging*: iemand die opties vergelijkt;
  - *beslissing*: iemand die een aanbieder wil kiezen.

  De harde regel: nooit de eigen merknaam en nooit een concurrent bij naam, want de meting moet
  laten zien of het merk vanzelf genoemd wordt. Werkt het bedrijf lokaal, dan bevat elke vraag een
  plaats uit het werkgebied, en wel zo dat de vraag echt lokaal wordt. Minstens één vraag gaat over
  een twijfel die klanten in het verkoopgesprek hebben.
- De app haalt dubbele vragen eruit (ook als ze alleen in de plaatsnaam verschillen), en laat de AI
  aanvullen als er te weinig vragen, te weinig lokale vragen of te weinig vragen over een
  groeiregio zijn.
- **Hoe vaak wordt elke vraag gesteld?** De AI schat per vraag hoe populair hij is, vergeleken met
  de andere. Populaire vragen tellen straks zwaarder mee. Let op: dit is een schatting van de AI,
  geen echte zoekdata.
- **De goedkeuringspoort.** Het cluster staat op "concept klaar". De consultant leest de vragen,
  bij voorkeur samen met de klant, past ze aan, zet uit wat niet past, en klikt **"Bevestig en
  start meting"**. Dit is de eerste bewuste stop: zonder deze klik wordt er niets gemeten en
  niets betaald.

## 10. De meting

Nu stelt de app de dertig vragen echt aan een AI-assistent en kijkt of het merk genoemd wordt, hoe
prominent, en wie er in plaats van het merk genoemd wordt. Dit is de nulmeting: het vertrekpunt
waartegen later het effect van de pagina's gemeten wordt. Een meetronde kost ongeveer 82
dollarcent, bijna helemaal voor het stellen van de vragen zelf.

- Na de bevestiging keert de consultant terug naar de clusters, met de melding "Cluster
  gelanceerd". De meting loopt op de achtergrond.
- **Elke vraag wordt gesteld** zoals een gewone gebruiker dat doet, met zoeken op internet aan.
  De opdracht aan de AI is: je bent een behulpzame assistent, zoek actuele informatie, noem
  concrete bedrijven of bronnen waar dat past, en antwoord in het Nederlands.
- De acht zwaarste vragen worden drie keer gesteld, omdat één antwoord toeval kan zijn.
- Naast ChatGPT meet ook **Google AI Overview** mee (het AI-antwoord bovenaan in Google). Gemini
  kan als derde bron meemeten, maar staat sinds 25 september 2026 uit omdat de leverancier te veel
  metingen tegelijk weigerde.
- **Wie wordt er genoemd?** Per antwoord beoordeelt de AI, zo strak mogelijk, of het eigen merk
  genoemd wordt, op welke plek, en in welke rol: als eerste aanbeveling, als een van meerdere, of
  zijdelings. Elk ander bedrijf dat bij naam genoemd wordt, komt erbij, met de bronnen die de AI
  aanhaalde. Gelijknamige bedrijven tellen niet als het eigen merk.
- **Echte concurrent of niet?** De gevonden namen worden ingedeeld: een echte concurrent (hetzelfde
  aanbod, dezelfde klanten), of iets anders zoals een marktplaats, vergelijker, brancheorganisatie
  of leverancier. Een indeling die de klant zelf maakte, wordt nooit overschreven.
- **Eén score met een marge.** Alles wordt opgeteld tot één zichtbaarheidsscore, met een marge die
  zegt hoe zeker die score is. Een vraag waarbij de AI geen enkele aanbieder noemt, telt apart en
  niet als verlies.
- **Waarom wint een concurrent?** Per belangrijke concurrent haalt de AI uit de antwoorden waarom
  die genoemd wordt, met bij elke eigenschap een letterlijk citaat als bewijs.
- Belangrijk om te weten: de meting is een **nabootsing**. De app stelt de vraag via de
  koppeling met OpenAI, niet in de ChatGPT-app zelf. Wat een echte gebruiker ziet, kan verschillen
  (geen gespreksgeschiedenis, geen locatie).

## 11. Het rapport en de kansen

Na de meting zet de app de cijfers om in een besluit: waar verliest het merk, waarom, en welke
pagina's zijn nodig om dat te veranderen. Die aanbevolen pagina's heten **kansen** en worden later
de kaarten in het contentplan.

- **De gaten.** De AI zoekt waar concurrenten vaker genoemd worden, met bewijs uit de antwoorden,
  en begint bij de vragen die het zwaarst wegen. Een concurrent mag alleen bij een vraag genoemd
  worden als die naam echt in het antwoord op die vraag stond.
- **De structuur.** De app legt de aanbodboom naast de bestaande pagina's van de site en bepaalt
  per dienst of er al een eigen pagina is, een zwakke, of geen. Dat is rekenwerk, geen AI.
- **Het rapport.** De AI schrijft een kort rapport zonder jargon, dat eindigt in aanbevelingen. Per
  aanbeveling staat:
  - of het een **nieuwe** pagina is of een bestaande die **verbeterd** moet worden (met het adres);
  - welke gemiste meetvragen de pagina moet winnen;
  - voor wie de pagina is, in één zin, bijvoorbeeld: "iemand met water door het plafond die
    vandaag hulp zoekt en wil weten wat een reparatie kost";
  - de titel als onderwerp zoals een bezoeker het zoekt, niet als opdracht;
  - de rol van de pagina: wat hij doet dat de andere pagina's van het merk niet doen;
  - de kernvraag: de ene vraag die de pagina moet beantwoorden.
- Het rapport ziet de open kansen van het hele merk, ook uit andere clusters. Dekt een gemis een
  pagina die er al als kans ligt, dan wijst het die kans aan.
- Een aanbeveling komt er alleen als er een gemeten gemis is, de klant er iets echts over kan
  zeggen, geen bestaande pagina het al dekt en hij niet overlapt met een andere. Wat afvalt, staat
  er met de reden bij.
- De app controleert het rapport: een bedrijfsnaam die niet in het bewijs van die vraag staat, gaat
  eruit.
- **Elke aanbeveling wordt een kans**, met per bron het bewijs uit de meting (bijvoorbeeld: bij
  hoeveel vragen een concurrent genoemd werd, en of de eigen site als bron werd aangehaald). Bij
  elke kans houdt de app ook bij wat hij voor die pagina nog niet over het bedrijf weet: het
  **kennisgat**.
- **Eén kaart per pagina.** Wil een nieuwe kans een pagina verbeteren waar al een open kans voor is,
  wees het rapport een open kans aan, of is het een nieuwe pagina die op één meetvraag rust die een
  open kans al heeft, dan wordt het extra bewijs bij die kans in plaats van een tweede kaart. Een
  vraag telt daarbij nooit twee keer mee.
- Op de kaart in het plan ziet de consultant: "voorrang van de klant" als een dienst met voorrang
  letterlijk in de kans staat, "rust op één meetvraag" bij een dunne kans, en of de kernvraag van de
  pagina beantwoord, nog open of overgeslagen is.
- Heeft het merk een Search Console-koppeling, dan krijgt een kans er ook bewijs uit Google bij:
  de zoekopdrachten over dezelfde dienst of plaats, met hun vertoningen en klikken. Dat gebeurt
  vanzelf na elke nieuwe ophaalronde van Search Console.
- Daarna, op de achtergrond:
  - schat de AI opnieuw hoeveel potentie alle onderwerpen van het merk hebben;
  - start een onderzoek naar externe websites waarop het merk wel of niet staat (hoofdstuk 22).
- De consultant kan ook zelf een kans toevoegen zonder gemeten cluster. Die krijgt het label "Niet
  gemeten".

## 12. Het contentplan

Van losse kansen naar een planning: welke pagina's komen in welke maand, binnen het verkochte
pakket. Het vrijgeven van een maand is het moment waarop de klant akkoord geeft en het schrijfwerk
begint.

- De consultant opent **Contentplan**.
- **De voorraad.** Elke kans uit het laatste rapport van een gemeten cluster komt vanzelf als kaart
  in de voorraad. Er wordt nooit een kaart gewist. Bij elke kaart staat waarom hij er staat, het
  bewijs uit de meting, en wat er nog niet bekend is.
- **Het plan opstellen.** Eén klik maakt twaalf lege maanden en zet de kaarten met de meeste
  potentie in maand 1, tot het pakket vol is. De rest van het jaar stellen consultant en klant
  samen op.
- **Kaarten verschuiven.** "Inplannen" zet een kaart in een maand, "naar voorraad" haalt hem terug.
  Dat kost niets, en de klant mag het ook zelf. Elke pagina krijgt een publicatiedatum, verspreid
  over de maand (dag 1 tot en met 28, in de lopende maand vanaf morgen).
- **De maand vrijgeven.** Dit is de knop die geld kost, dus alleen voor de consultant. De klant zegt
  akkoord, de consultant drukt. Meteen daarna begint de voorbereiding van alle pagina's van die
  maand.
- Een kaart die later in een al vrijgegeven maand komt, start meteen zijn eigen voorbereiding.

## 13. Een pagina voorbereiden

Per pagina zoekt de app uit wat een goede pagina over dit onderwerp moet behandelen, en welke
vragen de ondernemer moet beantwoorden om de pagina eigener te maken dan wat een concurrent of een
AI zonder die ondernemer kan schrijven. Dit heet de **content brief**. Het kost 6 tot 7,5
dollarcent per pagina en duurt ongeveer een halve minuut.

- De app zoekt per pagina het cluster waar hij bij hoort. Hoort een pagina bij geen enkel cluster,
  dan wordt hij niet voorbereid en toont het plan "Geen cluster".
- De app zet altijd één vaste vraag klaar: **"Wat wil je zelf op deze pagina vertellen?"**, met
  uitleg en voorbeelden. Die vraag maakt de app zelf, zonder AI, dus hij is er altijd.
- Nieuwe feiten van de site worden ingedeeld (prijs, termijn, werkgebied, en zo verder), zodat de
  app kan zien wanneer twee bronnen iets anders zeggen over hetzelfde gegeven.
- De pagina's van een maand worden **na elkaar** voorbereid, op volgorde van publicatiedatum. Zo
  ziet elke volgende brief welke vragen er al gesteld zijn, en krijgt de klant niet vijf keer
  dezelfde vraag in andere woorden.
- **De content brief.** Het sterkste model krijgt de titel, de zoekintentie, de gemiste meetvragen
  met wat ChatGPT er nu op antwoordt, alles wat de app al zeker weet over het bedrijf, alle
  vragen die het bedrijf al kreeg met hun antwoord, en bij een verbeterpagina de huidige tekst.
  Is een eerdere vraag ook voor deze pagina nuttig, dan koppelt de brief hem, en krijgt de
  schrijver het antwoord erbij in plaats van dat de klant het opnieuw moet vertellen. Met zoeken op internet
  levert het twee dingen:
  - **onderzoek**: wat de bezoeker wil weten, vakkennis over het onderwerp (met het webadres waar
    die gevonden is, nooit van de eigen site en nooit over het bedrijf zelf), en wat klanten vaak
    verkeerd begrijpen;
  - **hooguit acht vragen aan de ondernemer**, over feiten, voorbeelden uit de praktijk, de
    werkwijze, twijfels van klanten en wat het bedrijf anders doet. Alleen vragen waarvan de
    schrijver het antwoord kan gebruiken en die niet al bekend of op te zoeken zijn. Nul vragen is
    een goed antwoord.
- De app ruimt op: vakkennis zonder bron valt weg, een vraag die al eerder gesteld is valt weg, en
  er blijven er hooguit acht over.
- Mislukt de brief vier keer, dan gaat de pagina door met alleen de vaste open vraag. De tekst
  wordt dan minder goed, maar de pagina blijft niet hangen.

## 14. De vragen aan de klant

Dit is het belangrijkste moment van de hele reis. Wat de ondernemer hier vertelt, maakt het
verschil tussen een eigen pagina en een algemene AI-tekst. Beantwoorden kost niets.

- De klant (of de consultant samen met de klant) opent **Openstaande vragen**, of het scherm van
  de pagina zelf.
- De vragen staan per pagina bij elkaar. De open vraag staat bovenaan, met ruimte voor 3.000
  tekens. Bij elke andere vraag staat in één zin waarom hij gesteld wordt.
- De consultant mag de vragen samen met de ondernemer invullen, in diens woorden. Zeker bij de open
  vraag: het belangrijkste stuk invoer mag niet afhangen van of de klant zelf gaat typen.
- Elke vraag kan **beantwoord** of **overgeslagen** worden. Overslaan telt ook als antwoord.
- Waar een antwoord terechtkomt:
  - de open vraag gaat letterlijk naar de schrijver van die pagina;
  - een antwoord op een vraag van deze pagina gaat naar de schrijver van die pagina, en geldt ook
    voor andere pagina's over dezelfde dienst;
  - een antwoord dat voor het hele bedrijf geldt, gaat mee naar elke volgende pagina.
- Een antwoord kan nog aangepast worden tot het schrijven begint.
- Na elk antwoord kijkt de app of de pagina geschreven mag worden. Er is geen knop "schrijf nu":
  het laatste antwoord is de handeling.
- Laat de klant vragen liggen, dan wacht de pagina, zonder uiterste datum. Op het startscherm van
  de klant staat dan "Wacht sinds ...", en de consultant ziet het in het overzicht "Wacht op de
  klant". Een herinneringsmail is gebouwd, maar staat uit zolang e-mail uit staat.

## 15. Het schrijven

Eén sterke schrijfbeurt zet de kennis van de ondernemer, het onderzoek en de stem van het bedrijf
om in een pagina die de ondernemer zo op de eigen site kan zetten. Dat kost 3 tot 4 dollarcent en
ongeveer een minuut per pagina.

- **De schrijfpoort.** Een pagina wordt pas geschreven als:
  - de brief klaar is en er **nul vragen** open staan (twijfelt de app over het aantal, dan telt
    het als "nog niet");
  - de publicatiedatum binnen **tien dagen** ligt.
- Elke ochtend om 04:00 (UTC) loopt de app alle vrijgegeven maanden na. Een voorbereiding die niet
  startte, start dan alsnog; een pagina die aan de beurt is, wordt geschreven; en een pagina
  waarvan het schrijven mislukte, krijgt een nieuwe kans.
- De consultant heeft de knop **"Nu laten schrijven"**. Die slaat de datum over, maar nooit de
  vragen.
- Er komt altijd precies één schrijftaak per pagina, ook als twee antwoorden tegelijk binnenkomen.
- **Wat de schrijver meekrijgt**, in deze volgorde:
  - de pagina: titel, soort, nieuw of verbeteren;
  - de zoekintentie: wat de bezoeker wil, en de meetvragen;
  - wat we zeker weten over het bedrijf (feiten, verhalen, bezwaren met het antwoord erop);
  - wat de ondernemer voor deze pagina vertelde, met de open vraag letterlijk;
  - wat een goede pagina behandelt, uit het onderzoek, met de waarschuwing dat dit algemene kennis
    is en niet zegt wat dit bedrijf doet of belooft;
  - de stemvoorbeelden, met de opdracht de toon over te nemen, maar niet de zinnen;
  - de rol van de pagina en de kernvraag uit het rapport;
  - de vragen die de ondernemer oversloeg, zodat de schrijver er niet omheen schrijft;
  - de andere pagina's uit hetzelfde cluster met hun rol, zodat de schrijver ernaast schrijft en
    niet eroverheen;
  - bij verbeteren: de huidige tekst.
- **De opdracht** in het kort: schrijf als een ervaren vakschrijver de beste pagina die iemand met
  deze vraag kan lezen. Beantwoord de vraag meteen. Verzin geen claims, cijfers, garanties, prijzen,
  keurmerken of termijnen; weet je iets niet, laat het weg. Schrijf zo lang als nodig is, niet
  langer.
- Huisregels gaan mee: je of u, verboden onderwerpen, verboden woorden, geen gedachtestreepjes, een
  titel voor zoekmachines tot 60 tekens en een omschrijving tot 160 tekens, en nul tot vijf
  veelgestelde vragen.
- Bewust **niet** meegegeven: een aantal woorden, een verplichte opbouw, of een lijst punten die
  erin moeten. Dat maakte teksten in het verleden star.
- Na het schrijven repareert de app alleen mechanisch (gedachtestreepjes eruit, titel en
  omschrijving op lengte) en maakt hij de gestructureerde gegevens voor zoekmachines. Hij bewaart
  ook welke kennis er in deze versie zat.
- Mislukt het schrijven, dan toont het plan "Schrijven mislukt" en probeert de ochtendronde het de
  volgende dag opnieuw.

## 16. De controle

De controle moet voorkomen dat er iets verzonnens over het bedrijf op de site komt, en een tekst
die duidelijk niet goed is één keer laten verbeteren. Wat daarna nog twijfelachtig is, legt de app
aan de ondernemer voor, in plaats van het zelf te beslissen.

- **Controle in de code: harde beweringen.** Per zin zoekt de app naar bedragen, getallen met een
  eenheid, jaartallen, en woorden als "garantie", "gecertificeerd", "altijd", "24/7" of "de beste".
  Voor elke bewering kijkt de app of die terug te vinden is in wat de schrijver meekreeg. Dat
  gebeurt in de hoofdtekst, de omschrijving voor zoekmachines en de antwoorden bij de veelgestelde
  vragen. Het principe: liever onterecht twijfel dan onterecht goedgekeurd.
- **Controle in de code: verboden woorden** van dit bedrijf.
- **De beoordeling.** Het sterkste model leest als eindredacteur mee, met precies dezelfde
  informatie die de schrijver had. Het herschrijft niets, maar beantwoordt twee vragen:
  - *Klopt het?* Welke zinnen over het bedrijf blijken niet uit de informatie?
  - *Is het goed?* Wordt de vraag meteen beantwoord, klinkt het als het bedrijf, staat er iets in
    wat de lezer niet helpt, heeft de lezer er iets aan?

  Een verbeterpunt haalt weg, corrigeert, verplaatst of maakt korter. Het vraagt nooit om een
  bedrag, voorwaarde of belofte die niet al in de informatie staat.

  Het oordeel is "goed" of "niet goed", met hooguit vijf concrete verbeterpunten. Geen cijfer.
- **De beslissing** is een vaste regel in de code: herschrijven als het oordeel "niet goed" is, of
  als er een verzonnen zin of een verboden woord in staat. Een zin die alleen de code niet kon
  terugvinden, is geen reden: die wordt geel en de klant beslist. Anders gaat de pagina direct naar
  de klant.
- **Hooguit één herschrijving.** De schrijver krijgt de vorige versie met de feedback. Daarna
  controleert de code opnieuw. De nieuwe versie blijft altijd; een onbewezen zin die hij bijzette,
  wordt geel. Er komt geen tweede beoordeling en geen tweede herschrijving.
- **Bij een verbeterpagina** zoekt de code welke harde gegevens van de huidige pagina (bedragen,
  termijnen, telefoonnummers, keurmerken) niet in de nieuwe tekst staan. De klant ziet die lijst bij
  het goedkeuren. Hij houdt niets tegen: soms is weglaten juist de bedoeling.
- **Gele zinnen.** Zinnen die daarna nog twijfelachtig zijn, worden geel gemarkeerd. Een gele zin
  houdt de pagina niet tegen, maar de klant moet hem bevestigen of aanpassen voordat de pagina
  goedgekeurd kan worden.
- De pagina staat nu op **"Lees en keur goed"**.
- Gaat de beoordeling helemaal mis, dan komt er geen herschrijving: de twijfelachtige zinnen worden
  geel en de pagina gaat toch naar de klant.

## 17. Lezen, goedkeuren en opleveren

De ondernemer beslist: klopt het, klinkt het als mijn bedrijf, en zet ik dit zo op mijn site? Dat
is de enige maatstaf die telt. Na goedkeuring krijgt de klant alles wat nodig is om de pagina zelf
op de site te zetten.

- De klant leest de tekst opgemaakt, met koppen en lijsten. Bovenaan staat, als die er is, wat de
  schrijver nog had willen weten.
- De gele zinnen staan geel in de tekst, met per zin **"Klopt"** en **"Pas aan"**.
- De klant kan de tekst ook zelf bewerken. Een gele zin die daarna niet meer in de tekst staat,
  hoeft niet meer bevestigd te worden.
- **"Vraag een aanpassing"**: de klant beschrijft wat anders moet (tot 2.000 tekens), en de
  schrijver maakt een nieuwe versie. De oude versie blijft bewaard. Twijfelachtige zinnen in de
  nieuwe versie worden meteen geel. Een aanpassing kost ongeveer 3 dollarcent.
- Onder de tekst staan de titel en omschrijving voor zoekmachines en de veelgestelde vragen. Die
  horen bij wat de klant goedkeurt.
- **"Keur goed"** werkt pas als elke gele zin bevestigd of weggeschreven is. De pagina staat daarna
  op **"Plaats hem op je site"**.
- Na goedkeuring komt het **publicatiepakket** beschikbaar:
  - titel en omschrijving kopiëren, voor de SEO-velden van de site;
  - de tekst kopiëren als HTML, als platte tekst of als Markdown, met per vorm voor welk soort site
    die handig is;
  - de veelgestelde vragen kopiëren, in dezelfde drie vormen;
  - **alles in één bestand** downloaden, handig om aan een webbouwer te geven;
  - de gestructureerde gegevens voor zoekmachines apart kopiëren;
  - als de app het websitesysteem herkende: een versie in de vorm van die site, bijvoorbeeld
    "Kopieer voor WordPress";
  - een voorgesteld webadres voor de pagina, en voorstellen voor links naar andere pagina's van de
    eigen site;
  - een korte handleiding "Wat doe je hiermee?".
- De app bewaart zowel de tekst van de AI als de goedgekeurde tekst. Zo is later te zien wat de
  klant veranderde, en dat is de beste bron om de schrijver te verbeteren.

## 18. Publiceren en controleren

ORBIT ENGINE publiceert nooit zelf; er is geen koppeling met het websitesysteem van de klant. De
klant zet de pagina zelf online en meldt dat in de app. De app controleert daarna of de pagina er
echt staat.

- De klant plaatst de tekst op de eigen website.
- De klant vult in de app het live-adres in: **"Deze pagina staat live"**.
- De app markeert de pagina meteen als gepubliceerd, met datum en adres. De klant hoeft niet te
  wachten.
- Op de achtergrond haalt de app die pagina op en controleert:
  - of de pagina bereikbaar is;
  - of de tekst er echt op staat (een steekproef van acht zinnen, waarvan minstens 60 procent
    herkend moet worden, zodat kleine opmaakverschillen geen vals alarm geven);
  - of de gegevens voor zoekmachines erop staan;
  - of het adres doorstuurt naar een andere pagina. Zo ja, dan krijgt de klant het juiste adres te
    zien met het verzoek dat in te vullen.
- De klant ziet de uitkomst in gewone taal: wat er mis is, of dat alles klopt.

## 19. Het effect meten

Hier sluit de lus. Een score die na publicatie stijgt, bewijst op zich niets: zichtbaarheid
beweegt ook vanzelf, en de toevalsmarge van een meting met dertig vragen is al gauw even groot als
een gewone stijging. Daarom meet de app twee groepen naast elkaar: de vragen waarvoor de pagina
gemaakt is, en een controlegroep van vragen waarvoor geen pagina gemaakt is. Stijgt alles even
hard, dan lag het niet aan de pagina.

- Zodra een pagina gepubliceerd is, plant de app vanzelf twee hermetingen: **na 14 dagen** en **na
  28 dagen**. Niet eerder, omdat een AI-assistent een nieuwe pagina niet dezelfde dag vindt.
- Op dat moment verzamelt de app:
  - de **doelvragen**: precies de meetvragen waarvoor deze pagina bedoeld was;
  - een **controlegroep**: tot vijf vragen uit hetzelfde cluster waarvoor geen enkele pagina
    gepubliceerd is. Steeds dezelfde, zodat beide hermetingen eerlijk vergelijkbaar zijn.
- De app stelt al die vragen opnieuw, op precies dezelfde manier als bij de eerste meting, en
  telt ook mee of Google AI Overview het merk noemt.
- Als vertrekpunt gebruikt de app per vraag de laatste gewone meting van vóór de publicatie, niet
  de allereerste meting.
- De app berekent het verschil, apart voor de doelvragen en de controlegroep, en trekt een streng
  oordeel: **gestegen**, **gelijk** of **gedaald**. Valt het verschil binnen de marge, dan is het
  "gelijk". Zijn er te weinig vragen om iets te zeggen, dan is het oordeel "nog te weinig
  gegevens" in plaats van een gok.
- De app kijkt ook of de AI de nieuwe pagina zelf als bron aanhaalt.
- De meting na 28 dagen weegt zwaarder dan die na 14 dagen.
- De klant ziet op **Zoekverkeer** per pagina de **bewijsladder**, zeven treden van publicatie tot
  omzet:
  1. gepubliceerd en gecontroleerd;
  2. zichtbaar in Google (uit Search Console, als die gekoppeld is);
  3. genoemd door AI;
  4. geciteerd door AI;
  5. verkeer (uit Search Console);
  6. conversie;
  7. omzet.

  Elke trede staat op "bewezen", "geen verandering", "te weinig gegevens" of "geen gegevens".
  Conversie en omzet staan altijd op "geen gegevens": de app heeft geen koppeling met een
  webstatistiekpakket of een klantsysteem, en doet daar dus geen uitspraak over.

---

# Deel III. Wat er verder in de app zit

## 20. Wat maandelijks vanzelf doorloopt

Na de eerste meting blijft de app meten, zodat er een trendlijn ontstaat en de klant ziet hoe het
merk zich ontwikkelt, los van één pagina.

- Op de **eerste van elke maand** zet de app voor elk actief cluster een nieuwe meetronde klaar.
  Maandelijks en niet wekelijks: zichtbaarheid verandert zelden per week, en het verschil tussen
  twee weken is bijna altijd toeval.
- Tegelijk draait per merk opnieuw de **technische controle** van de site. Een blokkade kan er
  ineens zijn na een aanpassing door de webbouwer.
- Na elke meetronde volgen opnieuw de concurrentanalyse en het rapport, en komen nieuwe kansen in de
  voorraad van het contentplan.
- Gearchiveerde merken en clusters worden niet meer gemeten, zodat er geen kosten lopen voor iets
  wat niemand meer bekijkt.

## 21. De schermen met cijfers

De klant ziet de uitkomsten op een paar vaste plekken. Alle cijfers zijn door te klikken tot het
bewijs eronder: de vraag, het antwoord van de AI en wie daarin genoemd werd.

- **Hoe sta je ervoor.** Het startscherm van een merk: de stand van zaken en wat er op de klant
  wacht (vragen, teksten om te lezen, pagina's om te plaatsen).
- **Zichtbaarheid in AI.** De zichtbaarheidsscore met marge, de trend per maand, te filteren per
  cluster, en per vraag het bewijs.
- **Zoekverkeer.** Voor merken met een Search Console-koppeling: vertoningen, klikken en positie in
  Google per pagina, en per gepubliceerde pagina de bewijsladder uit hoofdstuk 19. Search Console
  koppelt de consultant per merk (Instellingen, Search Console).
- **Concurrenten.** Wie er wordt genoemd in plaats van het eigen merk, hoe vaak, en waarom.
- **Mijn reputatie.** Zie hoofdstuk 22.
- **Merkdossier.** Wat de app over het bedrijf weet, om na te lezen en aan te vullen.

Onder **Admin** heeft alleen de consultant nog: het gespreksscherm, de 0-meting (de kennistest), de
aanbodboom, een diagnosescherm, concurrenten indelen, het kennisoverzicht, de feitenconflicten en
het toewijzen.

## 22. Extra onderdelen: clusters ontdekken, reputatie, externe bronnen

Naast de hoofdreis heeft de app drie onderdelen die de consultant apart inzet.

**Clusters ontdekken**

- Na de eerste onderwerpen wil je later gestructureerd meer clusters vinden die bij het merk
  passen. Dat is dit scherm.
- De app combineert daarvoor Search Console, alles uit het onderzoek en het gesprek, de bestaande
  clusters, ChatGPT en echte zoekvolumes van een externe leverancier.
- De uitkomst is een lijst voorgestelde onderwerpen, geen zoekwoordenlijst. De consultant kiest
  welke een cluster worden.
- Alleen de consultant kan dit starten. Het is één keer echt gedraaid; of het doet wat het moet
  doen, is nog niet getoetst.

**Mijn reputatie**

- Een los onderzoek dat een klant apart kan afnemen: wat zeggen AI-assistenten over dit bedrijf?
- De app stelt vragen over het merk, het aanbod, een vergelijking met concurrenten, en de bronnen.
  Daaruit haalt hij de toon, plus- en minpunten, en reviewcijfers.
- Reviewcijfers controleert de app zelf op de bronpagina. Pas dan staan ze als bevestigd op het
  scherm; anders als onbevestigd.
- Alle rekenwerk (scores, rangorde) doet de code, niet de AI. De AI schrijft alleen de uitleg bij
  cijfers die al vaststaan.
- Kost ongeveer 50 dollarcent per keer en duurt ongeveer 10 minuten tot een halfuur, afhankelijk
  van hoe druk de wachtrij is.

**Externe bronnen**

- Na elk rapport kijkt de app welke websites de AI in deze markt aanhaalt (vergelijkers,
  reviewplatforms, vakbladen), en of het merk daarop staat.
- Wat ontbreekt, wordt een concrete taak met een status, zodat het niet blijft bij "je zou eens naar
  reviewplatforms moeten kijken".

## 23. De Sales-module (alleen intern)

De Sales-module is een intern hulpmiddel voor Outer Orbit om nieuwe klanten te vinden. Een klant
ziet er niets van; de scheiding zit in de database zelf en niet alleen in de schermen. De module
zoekt in een markt de beste saleskansen, onderbouwt ze met meetgegevens en zet een conceptmail
klaar. Twee regels gelden overal: **de app verstuurt nooit zelf een openingsmail**, en **elk getal
in een zin die naar buiten gaat, wordt gecontroleerd tegen de meting**.

- De sales admin kiest een markt: een branche, een plaats en een straal (bijvoorbeeld "warmtepomp,
  Eindhoven").
- De app zoekt welke bedrijven die markt vormen, ontdubbelt ze, en haalt bestaande klanten en
  lopende trajecten eruit.
- **Poort 1:** de sales admin keurt de lijst bedrijven goed en haalt eruit wat er niet in hoort.
- De app leest de sites van die bedrijven uit (zonder AI), bepaalt waar kopers in deze markt naar
  zoeken, en stelt daar vragen bij, per fase van de klantreis.
- **Poort 2:** de sales admin ziet de vragen met een kostenraming, en geeft akkoord.
- De app stelt de vragen aan de AI, beoordeelt per antwoord welke bedrijven genoemd worden, en
  telt alles op per bedrijf.
- De code (niet de AI) zoekt per bedrijf naar acht soorten kansen, bijvoorbeeld:
  - **onzichtbaar**: het bedrijf wordt nergens genoemd, terwijl het aantoonbaar bestaat;
  - **concurrent gap**: een concurrent wordt veel vaker genoemd;
  - **verlies**: het bedrijf is sinds de vorige meting gezakt.
- Elke kans krijgt een score. De AI schrijft er een uitleg bij en één reden om contact op te
  nemen, met bewijs.
- Pas als een salesmedewerker een kans oppakt, zoekt de app een contactpersoon en schrijft hij een
  **conceptmail** en een **belvoorbereiding**.
- De salesmedewerker leest de mail, past hem aan en verstuurt hem **zelf** vanuit de eigen
  mailbox. In de app meldt die daarna wat er gebeurde: gemaild, gereageerd, gebeld, gesprek, klant.
- Wordt een bedrijf klant, dan maakt de app er een merk van, en begint de reis van hoofdstuk 5.
- Stand van zaken: één echte markt is er op 1 september 2026 doorheen gegaan, voor ongeveer 60
  dollarcent. De vier ernstigste fouten daaruit zijn gerepareerd, maar de criteria om de module als
  geverifieerd te beschouwen zijn nog niet gehaald.

---

# Deel IV. Grenzen, kosten en begrippen

## 24. Wat de app bewust niet doet, en wat nog niet af is

Een eerlijk beeld hoort erbij. Sommige dingen doet de app bewust niet, andere zijn nog niet
gebouwd of staan uit.

**Bewust niet**

- Zelf publiceren op de site van de klant. Er is geen koppeling met het websitesysteem.
- Zoekwoordenonderzoek als los product.
- Tien of meer AI-assistenten tegelijk meten.
- Rapportages in de huisstijl van een ander bureau.
- Zelf openingsmails versturen in de Sales-module.

**Nog niet af, of anders dan je zou denken**

- **Gemini** kan meemeten, maar staat uit sinds 25 september 2026.
- **E-mail** staat standaard uit. Uitnodigingen en herinneringen gaan dus niet vanzelf de deur uit.
- **Het zoekvolume per meetvraag** is een schatting van de AI, geen echte zoekdata. Echte
  zoekvolumes gebruikt de app alleen bij "Clusters ontdekken".
- **Search Console levert alleen bewijs bij een kans die er al is.** Zoekopdrachten uit Google worden
  aan een bestaande kans gekoppeld, maar de app maakt er zelf nog geen nieuwe kans van. Op een echt
  merk is dit nog niet in werking gezien.
- **Conversie en omzet** meet de app niet. Op de bewijsladder staan ze altijd op "geen gegevens".
- **De meting is een nabootsing** via de koppeling met OpenAI. Hoe dicht die bij de ervaring van een
  echte ChatGPT-gebruiker zit, is niet gemeten.
- **Een pagina zonder gemeten cluster** wordt niet voorbereid. De uitzondering is een kans die de
  consultant met de hand toevoegt.
- **De eerste echte klant** moet de hele reis nog doorlopen. Het nieuwe schrijfproces is getest op
  proefmerken, en wat een echte ondernemer aan de teksten verandert, is de maatstaf die nog komt.

## 25. Kosten en tijd

Kosten zijn in deze app een ontwerpkeuze: bij elke stap is bewust gekozen hoeveel die mag kosten.
De bedragen hieronder zijn wat de AI kost; het uur consultancy staat er los van.

| Wat | Kost ongeveer | Duurt ongeveer |
|---|---|---|
| Onderzoek van een nieuw merk | 25 dollarcent | tot 10 minuten vooronderzoek, daarna 7,5 minuut |
| Een cluster opzetten (meetvragen) | een paar dollarcent | enkele minuten |
| Eén meetronde van een cluster | 82 dollarcent | afhankelijk van de wachtrij |
| Content brief per pagina | 6 tot 7,5 dollarcent | een halve minuut |
| Schrijven per pagina | 3 tot 4 dollarcent | een minuut |
| Controle per pagina | 1 tot 1,5 dollarcent | enkele seconden |
| Herschrijven (niet altijd) | 2,6 tot 4,3 dollarcent | een minuut |
| **Totaal per pagina** | **10 tot 17 dollarcent** | |
| Aanpassing op verzoek van de klant | 3 dollarcent | een minuut |
| Reputatieonderzoek | 50 dollarcent | 10 minuten tot een halfuur |
| Eén markt in de Sales-module | 60 dollarcent | |

De grens per pagina is 50 dollarcent. Er is dus ruimte om het schrijven duurder te maken als dat de
kwaliteit helpt. Het dagplafond is €20 per klantaccount en €50 over alle accounts samen.

Wat een klant per maand kost, hangt vooral af van het aantal clusters (elk cluster kost elke maand
een meetronde) en het pakket (5, 10 of 20 pagina's).

## 26. Begrippenlijst

| Begrip | Betekenis |
|---|---|
| **GEO** | Generative Engine Optimization: zichtbaar zijn in de antwoorden van AI-assistenten |
| **AI-assistent** | Een chatbot zoals ChatGPT, Gemini of het AI-antwoord in Google (AI Overview) |
| **Merk** | Eén klantbedrijf met zijn website |
| **Consultant** | Medewerker van Outer Orbit die het merk klaarzet, het gesprek voert en betaald werk start |
| **Aanbodboom** | Alle diensten en producten van het bedrijf als boom, elk met een bronpagina en citaat |
| **Kennislaag** | De ene plek waar alles staat wat de app over een bedrijf weet, met de herkomst erbij |
| **Kennistest** | De test die kijkt wat AI-assistenten al over het bedrijf weten, en of dat klopt |
| **Onderwerp** | Een voorstel voor een cluster, afgeleid uit het aanbod |
| **Cluster** | Eén onderwerp waarop het merk gemeten wordt, bijvoorbeeld "cv-ketel vervangen" |
| **Meetvraag** | Een vraag die een koper aan een AI-assistent stelt, zonder merknaam |
| **Klantreis** | De fases oriëntatie, overweging en beslissing waarin een koper zich bevindt |
| **Goedkeuringspoort** | Het moment waarop iemand de meetvragen goedkeurt; pas daarna wordt er gemeten |
| **Meting** | De meetvragen aan de AI stellen en per antwoord vastleggen wie er genoemd wordt |
| **Zichtbaarheidsscore** | Het cijfer dat zegt hoe vaak het merk genoemd wordt, met een marge voor toeval |
| **Rapport** | De uitslag van een meting, met aanbevolen pagina's |
| **Kans** | Een aanbevolen pagina, met het bewijs uit de meting en wat we nog niet weten |
| **Kennisgat** | Wat de app voor een bepaalde pagina nog niet over het bedrijf weet |
| **Contentplan** | Twaalf maanden plus een voorraad met kansen, binnen het pakket |
| **Pakket** | Hoeveel pagina's per maand er verkocht zijn: 5, 10 of 20 |
| **Content brief** | Het onderzoek vóór het schrijven van één pagina, plus de vragen aan de ondernemer |
| **Open vraag** | De vaste vraag per pagina: "Wat wil je zelf op deze pagina vertellen?" |
| **Stemvoorbeelden** | Eén tot drie pagina's waarop de stem van het bedrijf goed te horen is |
| **Gele zin** | Een zin die de klant moet bevestigen of aanpassen voordat de pagina goedgekeurd kan worden |
| **Publicatiepakket** | Alles wat de klant na goedkeuring krijgt om de pagina zelf online te zetten |
| **Controlegroep** | Meetvragen waarvoor geen pagina gemaakt is, als vergelijking bij de effectmeting |
| **Bewijsladder** | De zeven treden van "gepubliceerd" tot "omzet", elk met de stand van het bewijs |
| **Search Console** | Het gratis hulpmiddel van Google dat laat zien hoe een site in Google gevonden wordt |
| **Taak** | Eén stap die de app op de achtergrond uitvoert |
| **Wachtrij** | De lijst taken die de app één voor één afwerkt, elke minuut opnieuw |
| **Dagplafond** | Het maximale bedrag dat de app per dag aan AI mag uitgeven |
| **Luna en Sol** | De twee AI-modellen van OpenAI die de app gebruikt: Luna goedkoper, Sol het sterkst |
