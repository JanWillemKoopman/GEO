# De hele keten doorgelicht: van merk aanmaken tot opgeleverde pagina

> **Wat dit is.** De grondige pijplijnanalyse uit §8 van `contentkwaliteit-ronde-1-vervolg.md`,
> uitgevoerd op 29 september 2026 op de echte gegevens van ronde 1: drie merken, negen clusters,
> achttien pagina's. Per stap: wat erin gaat, welke opdracht het model krijgt, wat de code ermee
> doet, wat eruit komt, en of dat de volgende stap goed voedt. Daarna één verbeterplan.
>
> **Status: voorstel, er is niets gebouwd.** Na akkoord van de eigenaar gaan we bouwen, in de
> volgorde van §5. Alles wat `contentketen-opnieuw.md` §2 of §3 raakt, staat apart als besluit in §6.
>
> **De maatstaf voor elk voorstel** (opdracht van de eigenaar): het moet voor alle toekomstige klanten
> betere kwaliteit opleveren, of de keten stabieler en logischer maken. Geen pleister op één klant,
> één cluster of één artikel. Liever een bestaande stap beter, eenvoudiger of overbodig maken dan er
> een bij bouwen. Wat ik bewust níet voorstel, staat in §7.
>
> **Bronnen.** `ai_calls` (de volledige invoer en uitvoer van elke aanroep), `content_pieces`,
> `fact_requests`, `klantkennis`, `jobs`, de logs in `content-reviews/fase1-klant-a/`,
> `fase2-klant-b/` en `fase2-klant-c/`, de feedback in `content-reviews/ronde-1-feedback/` en de
> patronen in `content-reviews/ronde-1-patronen.md`. Elk getal hieronder is op 29 september 2026 op de
> database nagerekend, tenzij er "uit het log" bij staat.
>
> **Voorbehoud.** Of de feedback van een mens of van een AI komt, is nog open. Deze analyse leunt
> daar weinig op: de meeste bevindingen komen uit de invoer en uitvoer van de stappen zelf, niet uit
> het oordeel over de tekst.
>
> **Tweede ronde (29 september 2026, op verzoek van de eigenaar).** Een extra, diepere doorlichting
> met nadruk op de clusters, de kansen en de voorgestelde pagina's, plus de uitvoer van de schrijver,
> de vragen aan de klant, de verbeterpagina's en het opleveren. Die leverde één nieuwe rode draad op
> (R7) en de voorstellen V17 tot en met V23. Ze staan op hun plek in de keten; alles uit de eerste
> ronde blijft staan.

---

## 1. Het grote plaatje

De keten schrijft al behoorlijke teksten, en bij rijke invoer herkenbaar eigen teksten ("klinkt als
dit bedrijf" 5,0 bij klant A). Wat ronde 1 laat zien, zit bijna nergens in het schrijven zelf. Het zit
**vóór** het schrijven (wat voor pagina we eigenlijk vragen, en hoe de kennis over het bedrijf bij de
schrijver aankomt) en **ná** het schrijven (een controle die per ronde voorzichtigheid toevoegt en
nooit iets weghaalt). Dat past precies bij het principe van `contentketen-opnieuw.md` §0: maak de
keten slimmer door de schrijver betere informatie te geven, niet door er beslissingen omheen te
bouwen. De verbeteringen hieronder gaan dus vooral over de kwaliteit van de invoer en over het
opruimen van wat de tekst stroever maakt.

De tweede ronde voegde daar een laag onder toe: **de clusters en kansen zelf**. Een cluster dat
de consultant intypt, hangt niet aan het aanbod van het bedrijf, en de clusters van één merk
overlappen zonder dat iemand het ziet. Daardoor klopt het kennisgat niet, telt de voorrang van de
klant niet mee, en wijzen meerdere rapporten naar dezelfde pagina. Dat is het fundament onder de
rest, en het gaat daarom vroeg in de bouwvolgorde.

## 2. Zeven rode draden (de oorzaken die in meerdere stappen terugkomen)

Dit zijn geen losse klachten maar mechanismen. Elk mechanisme verklaart een deel van meerdere
patronen uit de feedback, en elk komt in meer dan één stap voor. Het verbeterplan (§4) is op deze
draden gebouwd, niet op de losse pagina's.

### R1. Een pagina wordt als opdracht gedefinieerd, vóór we weten wat de klant erover kan zeggen

- **Alle achttien** plantitels zijn een opdracht aan een redacteur, geen paginatitel: "Maak de pagina
  over mollenbestrijding concreet over prijzen", "Versterk de spoedpagina voor Houten met vooraf
  afgesproken totaalprijs", "Vergelijk zelf boekhouden met uitbesteden". Die zin gaat letterlijk als
  "De pagina: ..." naar de brief én naar de schrijver.
- Het veld `why` van de aanbeveling bevat de eigenlijke inhoudelijke richting ("leg ook uit dat
  jullie alleen Tedee PRO leveren en altijd monteren", "geef een eerlijke uitleg over de keuze om
  geen PKVW-bedrijf te zijn"). Dat gaat wel naar de brief, maar **niet naar de schrijver**
  (`schrijfInvoer()` kent het veld niet). De schrijver krijgt de opdracht als titel en mist de uitleg.
- Het rapport wist bij de mollenprijspagina (C4) al dat er geen prijs bekend was: het kennisgat van
  die kans noemde "een prijsindicatie". Toch werd het een prijspagina, de prijsvraag werd
  overgeslagen, en de schrijver kreeg dat **niet te horen**: blok B bevat alleen beantwoorde vragen
  (`klantinput()` in `lib/pagina/schrijven.ts`). Hij zag de titel "concreet over prijzen" en geen
  prijs, en schreef een pagina over waarom er geen prijs staat. Dat is patroon 4, en het is een
  mechanisme dat bij elke klant met een overgeslagen kernvraag terugkomt.

### R2. Blok A is een stapel, geen dossier

Blok A ("wat we zeker weten over het bedrijf") is bij een rijke klant de grootste invoer van de
schrijver: bij klant A 8.400 tot 13.000 tekens per pagina, op een totale invoer van 24.000 tot 35.000
tekens. Wat erin zit:

- **Antwoorden van andere pagina's, als ruwe vraag en antwoord.** De Houten-pagina kreeg de
  Tedee-vragen, de beslagvraag en de PKVW-vraag met de volledige vraagtekst erboven. Bij de
  mollenprijspagina stond een antwoord over Aziatische hoornaars.
- **Het hele verhalenveld op elke pagina.** "Verhalen" van klant A (3.169 tekens: oorsprong, drie
  typische klussen, werkwijze, wat we bewust niet doen, wat nog niet op de site staat) is één
  kennisitem dat merkbreed geldt, dus op alle zes pagina's volledig meegaat.
- **Dezelfde boodschap vijf keer.** "Prijs vooraf, die verandert aan de deur niet, je spreekt de
  vakman die komt" staat bij klant A in het onderscheid, in twee bewijsregels, in de verhalen, in de
  open vraag en in de antwoorden. De schrijver ziet het als vijf aparte feiten en gebruikt het vaak.
  Dat verklaart een groot deel van patroon 2 ("dezelfde kernboodschap op drie of vier plekken"),
  los van de schrijfopdracht.
- **Bezwaren zonder antwoord** onder een kop die "met het antwoord van de ondernemer" belooft
  (klant C: "Is het niet duur?", verder niets).
- **Dubbelingen** (de vestiging in Houten twee keer) en **ruis uit het onderzoek** ("Wespenbestrijding:
  scherpe prijs; geen bedrag genoemd" als prijsfeit).
- **Wat er níet in zit: de contactgegevens.** In de bedrijfskennis van **nul van de achttien**
  pagina's stond een telefoonnummer, terwijl de crawler het wel oogst. Twee beoordelingen van de
  eindredacteur gingen precies daarover ("voor iemand die nu buitengesloten is, staat nergens welk
  nummer die moet bellen"), en de copywriter vroeg bij C om "een duidelijke contactroute".
- **En wat er stil wegvalt: de antwoorden zelf.** Een gericht antwoord wordt zonder melding op 500
  tekens afgekapt (`MAX_ANSWER_LENGTH` in `app/api/profiles/[id]/facts/route.ts`). Bij klant A zijn
  **14 van de 21** gerichte antwoorden midden in een zin afgebroken ("een SKG\*\*\*-cil"). Het invulveld
  in het scherm heeft geen grens en geen teller, dus een echte klant merkt dit ook niet. Dit raakt
  precies de klant die de moeite neemt om uitgebreid te antwoorden, terwijl B13 dat juist vraagt.

### R3. De grens tussen "over het bedrijf" en "over het onderwerp" lekt op drie plekken

- **In de brief.** Het webonderzoek hoort over het onderwerp te gaan, maar van de 77 vakkennispunten
  in ronde 1 kwamen er 6 van de eigen site van het merk, en noemden er bij Myfinance 5 het bedrijf
  zelf. Zo kwam de €79,95 binnen (§7.1 van het vervolgplan). Daarnaast staan er schrijfinstructies en
  twijfels van de brief zelf in de vakkennis: "Een marktprijs mag daarom niet als tarief van dit
  bedrijf worden gepresenteerd", "De huidige bedrijfspagina bevestigt niet hoeveel bezoeken De Waard
  uitvoert". Dat is de bron van de app-taal in de tekst ("geen tarief of richtprijs bevestigd",
  waarneming 1.2): de schrijver neemt de voorzichtige formulering van de brief over.
- **In de controle in code.** `harde-beweringen.ts` telt de vakkennis mee als bron voor elke zin,
  ook voor een zin over het bedrijf. Een bedrag in de vakkennis maakt een bedrijfsclaim dus "gedekt".
- **In de herschrijving.** Een verbeterpunt als "geef direct de totaalprijzen" laat de schrijver een
  nieuwe bewering maken, die daarna niet opnieuw beoordeeld wordt.

### R4. Na het schrijven komt er alleen voorzichtigheid bij

- De eindredacteur heeft in **nul van de achttien** beoordelingen een zin als verzonnen gemeld. De
  vraag "klopt het?" leverde in deze ronde dus niets op; wat er aan feitencontrole gebeurde, deed de
  code.
- De verbeterpunten die hij wél gaf, gaan grotendeels over **meer voorbehouden**: "vermeld dat de
  bedragen gelden voor een standaarddeurdikte", "noem de factuurgrens bij het tarief", "maak
  onderscheid tussen advies binnen het pakket en fiscaal advies op maat". Elk punt is op zich redelijk,
  maar de herschrijving voegt ze allemaal toe en haalt niets weg. Dat is precies patroon 2 ("veel
  geschreven om uitzonderingen en randgevallen af te dekken") en waarneming 1.1.
- **Drie van de tien** herschrijvingen kwamen er alleen omdat de code een zin niet in de bronnen
  terugvond, terwijl de eindredacteur de pagina "goed" vond (de noodopening bij A, twee pagina's bij
  B). Bij de noodopening verloor de pagina daarbij drie bruikbare veelgestelde vragen. Zo'n zin wordt
  volgens B1 toch al geel voor de ondernemer; de herschrijving voegt dan vooral risico toe.
- Twee herschrijvingen werden mede veroorzaakt door een **opmaakfout**: "SKG\*\*" botst met vetgedrukt in
  Markdown. Dat is een mechanisch probleem dat een model niet hoeft op te lossen.

### R5. Niemand kijkt naar de set

- Het rapport kijkt per cluster, zonder de aanbevelingen van de andere clusters van hetzelfde merk.
  Zo kwamen bij A Zeist en Nieuwegein uit twee rapporten tegelijk, en bij B twee pagina's over "zelf
  boekhouden of uitbesteden".
- Binnen één rapport ook: drie mollenpagina's (prijs, aanvragen, zelf doen) voor een klant die over
  mollen niets aanleverde, en twee aangiftepagina's waarvan de tweede "vooral een verkorte versie van
  de eerste" is (B).
- De schrijver krijgt een lijst "andere pagina's, schrijf er niet overheen" met tot 60 titels van
  het hele merk, maar dat zijn dezelfde opdrachttitels (R1). Hij weet niet wat die pagina's
  behandelen, dus kan hij er ook niet bewust omheen schrijven.

### R6. Stille kwaliteitsverliezen in de techniek

Naast het afkappen van antwoorden (R2):

- **Menu en voettekst in de "stem" en de "huidige tekst".** Zonder stemvoorbeelden (B en C) krijgt
  de schrijver de homepage als stem, en die begint met "Overlast van ongedierte? 0184-701084 ...
  Menu Home Nieuws Diensten Wespenbestrijding ...". De huidige tekst van een verbeterpagina ook. De
  schrijver moet de stem dus afleiden uit navigatie.
- **Meettaken die definitief mislukken** op een antwoord dat geen geldige JSON is ("We need ou..."):
  negen in deze ronde, bij ChatGPT en bij Google AI Overview, allebei in dezelfde beoordeling van
  het antwoord. Die vragen vallen uit de score en uit het rapport.
- **Verificatie zonder gereedschap.** Een al geschreven pagina opnieuw laten schrijven met dezelfde
  brief en antwoorden kan niet via de app (stap 6 van het vervolgplan). Dat maakt elke
  verbetering lastig te toetsen, en conventie 10 vraagt juist om die toets.
- **Een vangnet dat bij de ombouw is losgeraakt.** `functieblok()` in
  `lib/pipeline/paginafunctie.ts` zorgde dat een verbeterde pagina zijn functie houdt (een
  prijzenpagina blijft een prijzenpagina). Het werd gebouwd na precies die fout op 24 september, en
  wordt sinds de ombouw van de contentketen nergens meer aangeroepen. In ronde 1 gebeurde het
  opnieuw: `myfinance.nl/prijzen/` is de prijspagina van de software (pakketten vanaf €10), en de
  keten schreef hem om naar een pagina over de boekhoudservice. Het vanafbedrag van €89,95 van die
  pagina verdween daarbij uit de tekst.
- **Verbeterpagina's afgekapt op 6.000 tekens.** Twee van de twaalf verbeterpagina's stonden precies
  op die grens. De schrijver verbetert dan een pagina waarvan hij het einde niet heeft gezien.

### R7. Clusters en kansen staan los van het aanbod en van elkaar

Dit is de belangrijkste vondst van de tweede ronde, en hij verklaart een deel van R1, R2 en R5.

- **Een cluster dat de consultant zelf intypt, hangt nergens aan.** De app koppelt een kans alleen
  aan een dienst als het cluster uit een voorgesteld onderwerp komt (`profile_topics.offering_ids`).
  Alle negen clusters van ronde 1 zijn ingetypt, ook als er een bijna gelijk voorstel lag
  ("Buitengesloten: deur laten openen" tegenover het ingetypte "Buitengesloten? Deur laten
  openen"). Gevolg: **geen van de 29 kansen hangt aan een dienst**; bij Myfinance hangt geen enkele
  kans ergens aan, bij de slotenmaker alleen aan een plaats. Intypen is een gewone route in de app
  (hoofdstuk 9), dus dit geldt voor elke klant die zo werkt.
- **Wat daardoor stil misgaat:**
  - het **kennisgat** is bij bijna elke kans hetzelfde lijstje ("werkwijze, prijs, termijn, voor wie
    niet"), ook bij de slotenmaker, die zijn prijzen en werkwijze uitgebreid gaf. De code telt
    alleen kennis die aan de dienst van de kans hangt, en die is er niet. De brief krijgt de
    opdracht "vraag eerst daarnaar", en vraagt dus opnieuw naar wat al bekend is. Dat is de
    eigenlijke oorzaak van de herhaalde vragen bij IJsselstein (waarneming 1.5);
  - de **commerciële waarde** is bij alle 29 kansen "gewoon": wat de klant in het gesprek als
    voorrang aangaf (de noodopening, wespennesten), telt niet mee bij het ordenen van het plan;
  - een antwoord op een vraag wordt **niet gedeeld** met de andere pagina's over dezelfde dienst, en
    blok A kiest bij gebrek aan een dienst op losse woorden (vandaar het hoornaarantwoord op de
    mollenpagina).
- **De clusters van één merk overlappen, en niemand ziet het.** Bij Myfinance staan "is zelf
  boekhouden goedkoper dan een online boekhouder", "is een online boekhouder persoonlijk genoeg" en
  "te laat aanleveren" in alle drie de clusters. Die vragen worden drie keer gemeten, tellen drie
  keer mee in de score, en leiden in drie rapporten tot dezelfde aanbeveling: "vergelijk zelf
  boekhouden met uitbesteden" staat in **alle drie** de rapporten.
- **Het plan laat twee kaarten voor dezelfde pagina toe.** Drie bestaande pagina's (Nieuwegein,
  /prijzen/, /online-boekhouder/) staan twee keer in het plan, in twee verschillende maanden. In de
  tweede maand zou de app dezelfde pagina opnieuw en anders herschrijven, en krijgt de klant twee
  vervangingen voor één adres.
- **Dunne kansen.** Negen van de 29 kansen rusten op één meetvraag. Ze komen achteraan in het plan,
  maar ze vullen de voorraad en blijven daar als losse kaart staan.

---

## 3. Stap voor stap

Per stap: invoer, opdracht en verwerking, uitvoer, hoe hij de volgende stap voedt, en het oordeel.
De verbeteringen staan hier kort; de uitwerking in §4 (met de code tussen haakjes).

### 3.1 Merk aanmaken (hoofdstuk 5)

- **Invoer:** webadres, naam, andere schrijfwijzen. **Uitvoer:** een merk en de eerste onderzoekstaak.
- **Oordeel:** doet zijn werk; drie velden is goed. De schrijfwijzen werken door in de meting en zijn
  bij alle drie gebruikt.
- **Beter:** niets nodig voor de contentkwaliteit.

### 3.2 Het automatische onderzoek (hoofdstuk 6)

- **Invoer:** tot 150 pagina's van de site. **Opdrachten:** branche, aanbod, werkgebied,
  concurrenten, markt, kennistest, dossier. **Uitvoer:** kennisitems met citaat, aanbodboom, open
  punten.
- **Wat goed gaat:** het citaat-vangnet werkt; er komt geen aanbod van concurrenten binnen.
- **Wat de volgende stappen mist:**
  1. **Praktijkvoorbeelden van de site worden niet geoogst.** De site van De Waard heeft een reeks
     "recente werkzaamheden" (een nest in een bootje in de jachthaven van Streefkerk, een zolder in
     Hardinxveld, een vogelhuisje in Alblasserdam). In de kennislaag staan er twee van. De copywriter
     zei letterlijk: "de huidige website heeft daar al materiaal voor". Juist bij een klant met
     weinig tijd is dat de enige bron van eigenheid.
  2. **Contactgegevens** (telefoon, e-mail, adres) worden geoogst maar bereiken de schrijver niet (R2).
  3. **Werkgebied als regio's** ("Alblasserwaard", "regio Gouda") in plaats van plaatsen: alle 90
     meetvragen van C noemen daardoor een regio (waarneming 2.3). Een klein bedrijf dat "de regio"
     zegt, bedoelt een handvol dorpen, en daar zoekt een klant op.
  4. **Bedrijfsmodel** (Myfinance als "fabrikant", waarneming 2.4): klein, maar het stuurt welke
     vragen de brief stelt.
- **Beter:** V9 en V10 in §4.

### 3.3 Het gesprek (hoofdstuk 7)

- **Invoer:** het dossier en de open punten. **Uitvoer:** commerciële velden, verhalen,
  stemvoorbeelden, verboden woorden.
- **Oordeel:** het gesprek bepaalt het meest hoe eigen de teksten worden ("klinkt als dit bedrijf"
  volgt de rijkheid: A 5,0, C 3,2, B 2,5). Maar de vorm waarin het wordt vastgelegd, werkt tegen de
  schrijver in:
  - **"Verhalen" is één tekstvak** dat in de kennislaag één item wordt. De hulptekst vraagt al om vijf
    verschillende dingen (typische klussen, werkwijze, bezwaren met antwoord, wat we niet doen,
    waarom begonnen), maar alles gaat als één blok naar elke pagina (R2). Een klus over een VvE met
    meerpuntssluitingen hoort op de meerpuntssluitingspagina, niet op de noodopening in Houten.
  - **Bezwaren zonder antwoord.** Het veld vraagt alleen het bezwaar. De schrijver krijgt "Is het
    niet duur?" en moet zelf een antwoord bedenken, of het namens de ondernemer laten liggen.
- **Beter:** V5 in §4 (de vorm van het vastleggen, geen extra vragen).

### 3.4 Clusters en meetvragen (hoofdstuk 9)

- **Invoer:** onderwerp, merkgegevens, bezwaren, werkgebied. **Opdracht:** tien vragen per fase,
  zonder merknamen, lokaal waar nodig, "minstens één vraag over een twijfel".
- **Wat opviel:** de bezwaarregel geldt per fase (oriëntatie en overweging), en de bezwaren zijn
  merkbreed. Drie clusters maal twee fasen is zes keer "minstens één", ook als het bezwaar niet bij
  het onderwerp past. Bij B kwam "te laat aanleveren" vijf keer terug in 90 vragen, ook in het
  aangiftecluster; bij A spiegelden twee uitgezette vragen een werkwijze uit het gesprek (waarneming
  1.7). Dan meet de meetlat deels het eigen verkoopverhaal.
- **Tweede ronde:** hier begint R7. Een ingetypt cluster krijgt geen diensten mee, en de
  meetvragen worden alleen binnen één cluster ontdubbeld, niet over de clusters van het merk heen.
  Het scherm waarschuwt ook niet als een nieuw cluster bijna gelijk is aan een bestaand cluster of
  aan een voorgesteld onderwerp.
- **Beter:** V11 in §4: hooguit één bezwaarvraag per cluster, en alleen een bezwaar dat bij het
  onderwerp past. Plaatsen in plaats van regio's volgt uit V10. Uit de tweede ronde: V17 (elk
  cluster hangt aan het aanbod) en V18 (meetvragen en clusters ontdubbelen over het merk).

### 3.5 De meting (hoofdstuk 10)

- **Oordeel:** doet zijn werk en is 70% van de kosten. Eén stabiliteitsprobleem: de beoordeling van
  een antwoord ("wie wordt er genoemd") levert soms tekst in plaats van JSON, en na vier pogingen
  valt de vraag uit (R6).
- **Beter:** V12 in §4.

### 3.6 Het rapport en de kansen (hoofdstuk 11)

Dit is de stap met de meeste invloed op de uiteindelijke pagina's, en hij krijgt de minste denkkracht.

- **Invoer:** de meetdata, het bewijsdossier, de paginalijst, het aanbod. **Model:** Luna met
  redeneerinspanning "laag", ongeveer $0,003 per rapport. Ter vergelijking: de brief, die per pagina
  onderzoek doet, draait op Sol en kost $0,07.
- **Uitvoer:** aanbevelingen met `title`, `targetIntent`, `why`, doelvragen, nieuw of verbeteren.
- **Wat de volgende stappen erdoor krijgen:**
  - een opdracht als titel en een schrijfinstructie in `why` (R1);
  - aanbevelingen die de klant niet kan vullen (C4), ondanks eis 2 "de klant heeft er iets echts over
    te zeggen": het rapport ziet het kennisgat niet, dat rekent de code pas daarna uit;
  - overlap tussen clusters en binnen één cluster (R5);
  - bij A zeven plaatspagina's van de twaalf aanbevelingen, waar besluit B12 (de plaatsregel) al een
    antwoord op heeft dat nog niet gebouwd is.
- **Tweede ronde, de negen rapporten naast elkaar:** 29 aanbevelingen, waarvan 23 een bestaande
  pagina verbeteren. Bij Myfinance komen 11 aanbevelingen neer op ongeveer zes verschillende
  pagina's: /prijzen/ en /online-boekhouder/ worden elk door twee clusters aanbevolen, en "zelf
  boekhouden of uitbesteden" door alle drie. Bij de slotenmaker gaan zeven van de twaalf over een
  plaatspagina, en Zeist en Nieuwegein komen elk uit twee rapporten. Het rapport kiest ook
  bestaande pagina's met een andere functie om te verbeteren: een nieuwsbericht, een tipspagina,
  een kennisbankartikel en de prijspagina van de software.
- **Beter:** V6, V7 en V8 in §4. Dit is de grootste verandering in het plan, en ze zit in een
  bestaande aanroep. Uit de tweede ronde: V17 (kansen aan het aanbod) en V21 (de functie van een
  bestaande pagina).

### 3.7 Het contentplan (hoofdstuk 12)

- **Oordeel:** de mechaniek werkt (voorraad, maanden, vrijgeven). Het plan vult op potentie en kijkt
  niet naar overlap of naar wat we per kans al weten.
- **Tweede ronde:** de potentiescore is bij **alle 29** kaarten leeg, omdat er geen zoekvolume
  bekend is. Dat is terecht (onbekend is beter dan verkeerd, conventie 3), maar het betekent dat het
  plan in de praktijk alleen op de geschatte weging van de meetvragen ordent. De commerciële waarde
  had dan het verschil kunnen maken, maar die is door R7 overal "gewoon". De wensen van de klant uit
  het gesprek bepalen de volgorde dus niet. Daarnaast staan drie pagina's twee keer in het plan.
- **Beter:** de set-regels van V7 gelden ook bij het vullen. De consultant ziet op de kaart welke
  kernvraag nog openstaat (V8), zodat hij een kaart kan wisselen vóór hij de maand vrijgeeft. Uit de
  tweede ronde: V17 geeft de voorrang van de klant weer gewicht, en V20 houdt één kaart per pagina aan.

### 3.8 De brief (hoofdstuk 13)

- **Invoer:** titel (de opdracht), `why`, doelvragen met wat een assistent nu antwoordt, blok A, het
  kennisgat, de huidige tekst, alle eerder gestelde vragen. **Model:** Sol met zoeken op het web.
- **Uitvoer:** zoekintentie, deelvragen, concurrentie (goed en gaten), vakkennis met bron,
  valkuilen, tot acht vragen.
- **Wat goed gaat:** de vragen zijn vaak scherp en per pagina gericht; het kennisgat stuurt ze goed.
- **Wat de schrijver erdoor krijgt:**
  - vakkennis over het bedrijf zelf, en vakkennis die eigenlijk een instructie of een twijfel is
    (R3);
  - `concurrentie.goed` werkt als een verborgen schrijfopdracht die botst met wat er bekend is: bij
    de mollenprijspagina "goede pagina's noemen een prijs per bezoek", terwijl er geen prijs was. Dit
    is het veld waarvan §6.1 van `contentketen-opnieuw.md` al zei dat het eruit moet als het niets
    toevoegt;
  - "valkuilen" die geen misverstanden van klanten zijn maar voorzichtigheid van de brief ("de
    vermelding van mollentabletten lezen als bevestiging dat De Waard die gebruikt").
- **Wat de klant erdoor krijgt:** herhaalde vragen met een plaatsnaam erin (A6, waarneming 1.5). De
  oorzaak is dat een antwoord op de vraag van een andere pagina wel "eerder gesteld" is, maar pas via
  blok A bij deze pagina komt als het aan dezelfde dienst hangt. De brief ziet dan een vraag die
  gesteld is én een gat, en stelt hem opnieuw. Dit lost zich grotendeels op met V3 (antwoorden als
  bewering in blok A) en V7 (één pagina per zoekdoel).
- **Beter:** V2 en V4 in §4.

### 3.9 De vragen aan de klant (hoofdstuk 14)

- **Oordeel:** de open vraag werkt: bij A leverde hij de sterkste passages. De zwakste klant kreeg
  de meeste vragen (C 31, A 28, B 25, waarneming 1.6), omdat het aantal vragen het gat volgt en bij C
  het gat het grootst is. Dat is verklaarbaar, maar het werkt tegen de klant die het minst tijd heeft.
- **Een stil gat:** het afkappen op 500 tekens (R2).
- **Tweede ronde, de vragen zelf:** van de 66 gerichte vragen bestaan er 59 uit meerdere vragen in
  één zin ("wat trof je aan, wat heb je gedaan, hoeveel bezoeken waren nodig en wat betaalde de
  klant? Mag dit voorbeeld zonder naam op de pagina?"), en 32 zijn langer dan 200 tekens. Een
  drukke ondernemer slaat zo'n vraag over of beantwoordt een deel. In 19 van de uitlegzinnen die
  de klant ziet, staat "de schrijver", in 5 "verzinnen": de klant leest hoe de machine werkt in
  plaats van wat zijn antwoord oplevert. En De Waard kreeg drie bijna gelijke vragen om bewijs of
  toestemming voor foto's, één per dienst, terwijl dat voor het hele bedrijf één antwoord is.
- **Beter:** V1 (niet meer afkappen), en V8 (de kernvraag herkenbaar maken, zodat een drukke klant
  weet welke ene vraag er echt toe doet). Uit de tweede ronde: V22 (korte, enkelvoudige vragen in
  de taal van de klant). Het aantal vragen zelf laat ik bewust staan: B13 zegt dat
  vragen de kern is, en een beter gedefinieerde pagina (V6) vraagt vanzelf gerichter.

### 3.10 Het schrijven (hoofdstuk 15)

- **Invoer:** zie R1 en R2. **Model:** Sol, denktijd hoog. **Opdracht:** `schrijfopdracht.ts`
  versie 4.
- **Wat goed gaat:** bij rijke invoer eigen, geloofwaardige teksten; bij arme invoer verzint hij
  nauwelijks iets ("opvallend terughoudend met onbewezen claims").
- **Wat botst in de opdracht:** "wees inhoudelijk volledig" en "schrijf zo uitgebreid als nodig is"
  trekken naar lengte; "herhaal niets" en "weet je iets niet, laat het weg" de andere kant op. Bij een
  input vol herhaling (R2) en een opdrachttitel die iets belooft wat er niet is (R1), wint lengte.
  Dat is K3 uit het vervolgplan, en die blijft staan. Maar het meeste van patroon 2, 4 en 5 lost zich
  eerder op in de invoer (V3, V4, V6) dan in de opdracht.
- **Tweede ronde, bij een verbeterpagina:** de schrijver krijgt alleen "dit is een bestaande pagina;
  schrijf een betere versie". Hij hoort niet welke functie de pagina heeft (R6: het vangnet is
  losgeraakt), en niet dat de concrete gegevens van de huidige pagina moeten blijven staan tenzij
  ze niet meer kloppen. Op de prijspagina van Myfinance verdween zo een bedrag van de huidige pagina,
  zonder dat iemand dat te zien kreeg.
- **Tweede ronde, de notities van de schrijver:** bij Myfinance vroegen vier pagina's los van
  elkaar hetzelfde ("is €69,95 inclusief of exclusief btw?"), bij De Waard twee keer "welk
  telefoonnummer mag erop?". Een gegeven dat ontbreekt, ontbreekt voor alle pagina's tegelijk.
- **Beter:** V13 in §4. Uit de tweede ronde: V21 (de functie en de gegevens van een verbeterpagina
  blijven staan).

### 3.11 De controle en de herschrijving (hoofdstuk 16)

- **Controle in code:** vindt harde beweringen, repareert mechanisch. Telt vakkennis mee als bron (R3).
- **De beoordeling:** Sol, "klopt het?" en "is het goed?". In ronde 1: nul zinnen als verzonnen
  gemeld, zeven keer "niet goed", met punten die vooral voorbehouden toevoegen (R4).
- **De beslisregel:** herschrijven bij "niet goed" of bij een ongedekte zin. Tien van de achttien
  pagina's zijn herschreven; drie alleen door de code.
- **De versiekeuze:** de herschrijving blijft, tenzij hij meer ongedekte zinnen heeft. Bij A6 ging
  daardoor een herschrijving weg die het ontbrekende telefoonnummer had opgelost. Een telling van
  ongedekte zinnen zegt weinig over welke versie beter is.
- **Beter:** V14 en V15 in §4. Dit is K4 uit het vervolgplan, aangescherpt.

### 3.12 Lezen, goedkeuren en opleveren (hoofdstuk 17)

- **Oordeel:** de mechaniek is compleet (gele zinnen, aanpassing vragen, publicatiepakket).
- **Een gemiste lus:** de schrijver vult per pagina `notitie_voor_ondernemer` in: wat hij nog had
  willen weten. Dat is precies de informatie die de volgende pagina beter maakt, maar het blijft een
  notitie op het scherm. Het antwoord komt nergens in de kennislaag.
- **Tweede ronde, de gestructureerde gegevens:** voor een product dat om zichtbaarheid in
  AI-antwoorden draait, is dit het deel dat een AI-assistent vertelt wie het bedrijf is. Nu staat er
  alleen een "Organization" met naam, webadres en sociale profielen, en een "Service" zonder
  werkgebied. Geen adres, geen telefoonnummer, geen werkgebied, geen
  openingstijden, terwijl de app die gegevens wel kent. De beschrijving erin is de metabeschrijving,
  dus ook de app-taal ("voor mollenbestrijding bij De Waard is geen richtprijs bevestigd"). En de
  publicatiedatum is het moment van schrijven, niet van publiceren.
- **Beter:** V16 in §4 (klein, geen AI). Uit de tweede ronde: V23 (de gestructureerde gegevens uit
  de kennislaag).

---

## 4. Het verbeterplan

Vijfentwintig voorstellen (V0 tot en met V23, plus V3a), geordend naar waar ze in de keten
ingrijpen; groep F komt uit de tweede ronde. Per voorstel: wat, waarom het voor elke klant helpt, waar in de code, en of het een besluit van de eigenaar vraagt (§6). "Code" betekent
een deterministische regel (conventie 1), "opdracht" een wijziging in een bestaande opdracht aan een
model. Geen enkel voorstel voegt een AI-aanroep of een taaksoort toe.

### A. Fundament: stille verliezen dichten (stabiliteit, geen besluit nodig)

**V1. Antwoorden niet meer stil afkappen.** *Code, klein.*
De grens voor een gericht antwoord gaat van 500 naar 1.500 tekens, met een teller in het invulveld,
zodat de klant ziet waar de grens ligt. Nooit meer knippen zonder dat de gebruiker het ziet. Helpt
elke klant die uitgebreid antwoordt, en dat is precies wat B13 vraagt. (`app/api/profiles/[id]/facts/route.ts`,
`components/antwoordveld.tsx`.)

**V2. Menu, voettekst en herhaalde blokken uit de sitetekst halen.** *Code, middel.*
Een stuk tekst dat op het grootste deel van de pagina's van dezelfde site terugkomt (menu,
telefoonbalk, voettekst, "Ook last van ongedierte? Neem contact op"), is geen inhoud. Weghalen bij het
opslaan van de paginatekst, zodat de stem, de huidige tekst van een verbeterpagina, het onderzoek en
het rapport schone tekst krijgen. Eén regel, voor elke klant en elke stap die sitetekst leest.
(`lib/crawler.ts` of `lib/pipeline/page-text.ts`, en `lib/pagina/stemvoorbeelden-regels.ts`.)

**V3a. Sterretjes in keurmerken mechanisch repareren.** *Code, klein.*
"SKG\*\*" en "SKG\*\*\*" (en elk ander keurmerk met sterren) worden bij de mechanische reparatie zo
geschreven dat Markdown ze niet als vetgedrukt leest. Scheelt herschrijvingen om een opmaakfout.
(`lib/pagina/mechanisch.ts`.)

**V12. De beoordeling van meetantwoorden altijd als geldige JSON.** *Code, klein tot middel.*
Nagaan waarom de beoordeling soms gewone tekst teruggeeft ("We need ou...": het model begint hardop
te denken), en die aanroep in de strikte gestructureerde modus zetten. Lukt dat niet volledig, dan
bij een tweede poging met een andere redeneerinspanning in plaats van vier keer hetzelfde.
(`judgeRun()` in `lib/pipeline/measure.ts`.) Negen uitgevallen meetvragen per drie klanten lijkt
weinig, maar ze vallen ongemerkt uit de score en het rapport.

**V0. Een pagina opnieuw kunnen laten schrijven met dezelfde invoer.** *Code, beheer, middel.*
Een beheeractie (alleen voor de eigenaar en consultants) die een nieuwe versie van een geschreven
pagina laat schrijven met de huidige keten, de bestaande brief en dezelfde antwoorden, zonder nieuwe
brief en zonder de klant iets te laten doen. Geen tweede route naar het schrijven voor klanten
(§3 regel 7 gaat over het plannen van pagina's, dit is gereedschap om te verifiëren), maar wel een
besluit waard, zie §6. Zonder dit is elke verbetering hieronder alleen te toetsen met nieuwe
pagina's, en dan vergelijk je twee dingen tegelijk.

### B. De invoer van de schrijver: van stapel naar dossier

**V3. Blok A opschonen, in code.** *Code, middel. Het hart van dit plan.*
Vier deterministische regels in `kiesVoorBlokA()` en `blokAUitKennis()` (`lib/kennis/blok-a.ts`):
1. **Een antwoord als bewering, zonder de vraag.** Een antwoord op een vraag van een andere pagina
   gaat alleen mee als het bij dezelfde dienst hoort, en dan zonder de volledige vraagtekst erboven.
   Hooguit een kort onderwerp ("Over de noodopening:"), niet "Welke actuele totaalprijs mag de
   schrijver noemen ...". De vraag was voor de ondernemer, niet voor de schrijver.
2. **Geen dubbelingen.** Twee items die na normaliseren gelijk zijn, worden één.
3. **Een bezwaar alleen met het antwoord van de ondernemer.** Zonder antwoord onder een eigen,
   eerlijke kop ("twijfels die klanten hebben, zonder antwoord van de ondernemer"), zodat de schrijver
   weet dat hij er geen antwoord namens het bedrijf bij mag verzinnen.
4. **Een vast contactblok.** Telefoon, e-mail, adres en openingstijden uit het onderzoek, altijd
   bovenaan blok A. Een pagina die de lezer laat bellen, moet het nummer kunnen noemen.

Dit is een wijziging in de invoer (`contentketen-opnieuw.md` §0 regel 5), geen stap. Het blijft
binnen besluit B20. Wat het oplost voor elke klant: minder herhaling in de tekst (de schrijver ziet
één keer wat er één keer is), geen verkeerde antwoorden op een andere pagina, en altijd een
contactroute.

**V4. De brief onderzoekt het onderwerp, niet het bedrijf.** *Opdracht en code. Neemt K1 op.*
1. *Code* (K1 punt 1): vakkennis waarvan de bron op het eigen domein staat, of die het merk bij naam
   noemt, valt weg in `verwerkBrief()` (`lib/pagina/brief-regels.ts`). Wat het bedrijf zelf zegt,
   komt via de kennislaag, waar tegenstrijdigheden worden tegengehouden.
2. *Code* (K1 punt 2): in `harde-beweringen.ts` telt de vakkennis niet meer als bron voor een zin
   over het bedrijf (wij-vorm of bedrijfsnaam). Algemene uitleg met een getal blijft mogen.
3. *Opdracht*: de brief schrijft vakkennis als feit over het vak, zonder aanwijzingen voor de
   schrijver en zonder twijfels over het bedrijf. Wat per bedrijf verschilt en niet bekend is, wordt
   een vraag aan de ondernemer (dat staat er al, versie 3), niet een waarschuwing in de vakkennis.
4. *Besluit* (§6, B-a): het veld `concurrentie` (goed en gaten) eruit. In ronde 1 werkte het als een
   verborgen schrijfopdracht ("goede pagina's noemen een prijs per bezoek") en voegde het geen
   eigen inhoud toe. Wat er nuttig aan is, zit al in de deelvragen. Eén veld minder in de brief, dus
   ook een eenvoudiger invoer voor de schrijver.

**V5. Het gesprek vastleggen in de vorm waarin de schrijver het nodig heeft.** *Scherm en code, middel.*
Het tekstvak "Verhalen" wordt vier kleinere vakken met dezelfde hulpteksten die er nu al in één vak
staan: typische klussen (elk apart), hoe we werken, wat we bewust niet doen, en waarom we begonnen.
Bezwaren worden paren: het bezwaar en wat de ondernemer dan zegt. Geen extra vragen aan de klant,
geen AI: alleen een andere vorm, zodat de kennislaag een klus aan een dienst kan hangen (en die klus
dus op de juiste pagina komt) en de werkwijze één keer merkbreed meegaat in plaats van vijf keer.
Het bestaande veld blijft staan (conventie 4); een bestaand merk houdt zijn tekst als één item tot
de consultant het opsplitst. Dit sluit aan op §13.2 van `contentketen-opnieuw.md` (één leesbaar
bedrijfsboek) zonder dat hele plan nu te bouwen.

### C. De pagina definiëren: onderwerp, lezer, rol in de set, kernvraag

**V6. Het rapport beschrijft een pagina, geen opdracht.** *Opdracht en schema in een bestaande
aanroep. Grote verandering; besluit nodig (§6, B-b).*
De aanbeveling krijgt in plaats van een opdrachttitel vier heldere velden:
- **onderwerp**: de werktitel zoals een bezoeker hem zou zoeken ("Mollenbestrijding in de
  Alblasserwaard"), geen gebiedende wijs;
- **lezer**: wie er komt en wat hij wil (`targetIntent`, bestaat al);
- **rol in de set**: in één zin wat deze pagina doet dat de andere pagina's van het merk niet doen;
- **kernvraag**: de ene vraag die de pagina móet beantwoorden om bestaansrecht te hebben (bij een
  prijspagina: wat kost het).

`why` blijft de onderbouwing uit de meting voor de consultant, zonder schrijfinstructies. De schrijver
krijgt onderwerp, lezer en rol mee (dat is blok D, zoekintentie, dus geen vijfde blok), en kiest zelf
de titel op basis van wat hij weet. Dat laatste doet hij nu al (de titel staat in `raw_json`); het
verschil is dat hij geen belofte meer meekrijgt die de invoer niet kan waarmaken.

Daarnaast: **het rapport draait met meer denktijd** (werksoort van "laag" naar "gemiddeld"). Het is de
beslissing welke pagina's er komen; die kost nu $0,003. Ook met meer denktijd blijft het een fractie
van één brief. (`lib/pipeline/report.ts`, `lib/schemas/report.ts`, `lib/openai/sampling.ts`.)

**V7. Eén set per merk: geen overlap tussen en binnen clusters.** *Opdracht en code. Neemt K2 op.*
1. *Opdracht* (K2 punt 1): het rapport krijgt onderwerp en rol van de open kansen van hetzelfde merk
   mee, en eis 4 ("overlapt niet") geldt over het hele merk. Een aanbeveling die een bestaande kans
   versterkt, wordt bewijs bij die kans in plaats van een nieuwe.
2. *Code* (K2 punt 2): twee kansen die dezelfde bestaande pagina willen verbeteren, worden één kans
   met het bewijs van beide clusters (`lib/kansen/uit-rapport.ts`).
3. *Code*: de schrijver krijgt bij "andere pagina's" niet 60 titels van het merk, maar onderwerp en
   rol van de pagina's over dezelfde dienst of hetzelfde cluster. Dan kan hij bewust naast zijn buren
   schrijven.
4. *Later, al besloten*: de plaatsregel B12 (§13.1 van `contentketen-opnieuw.md`) is het set-antwoord
   op de plaatspagina's. Hij staat klaar als besluit en past na dit plan; ik stel voor hem direct na
   fase C in te plannen, niet eerder.

**V8. De kernvraag zichtbaar van rapport tot schrijver.** *Code, klein; één veld in de brief is een
besluit (§6, B-c).*
1. De brief markeert welke van zijn vragen de kernvraag van V6 beantwoordt. De klant ziet die vraag
   bovenaan de pagina, met de zin "zonder dit antwoord wordt deze pagina zwak". Dat helpt juist de
   drukke klant (C) om de ene vraag te beantwoorden die ertoe doet.
2. Wordt de kernvraag overgeslagen, dan ziet de consultant dat op de kaart in het plan ("kernvraag
   niet beantwoord") vóór het schrijven. Niets houdt de pagina tegen (B5 en §3 regel 2 blijven), maar
   de consultant kan de kaart wisselen of de klant nog even bellen. Dat is wat de copywriter bij C
   beschreef: "teruggaan naar de opdrachtgever".
3. De schrijver krijgt in blok B ook **welke vragen de ondernemer oversloeg** (nu ziet hij alleen de
   beantwoorde). Met de zin uit de schrijfopdracht (V13): schrijf daar niet omheen, en kies een
   invalshoek die je wel kunt waarmaken. (`klantinput()` in `lib/pagina/schrijven.ts`.)

Samen met V6 lost dit patroon 4 op bij elke klant, zonder dat de keten ergens op wacht.

### D. Onderzoek, gesprek en meting: betere grondstof voor alles daarna

**V9. Praktijkvoorbeelden van de site oogsten.** *Opdracht in een bestaande aanroep.*
Het dossier (de samenvattende stap van het onderzoek) haalt ook de concrete klussen van de site op
(projecten, "recente werkzaamheden", cases, nieuwsberichten over een klus), elk met plaats en citaat,
als kennis met herkomst "website" in het domein "verhaal". Het citaat-vangnet bestaat al. Helpt elke
klant, maar vooral de klant die in het gesprek weinig vertelt: dan heeft zijn eigen site nog
verhalen. (`lib/pipeline/dossier.ts`, `lib/kennis/uit-onderzoek.ts`.)

**V10. Werkgebied in plaatsen, niet in regio's.** *Code en onderzoek, klein.*
Noemt het onderzoek alleen regio's, dan zet het de grootste plaatsen van die regio's als voorstel
klaar en wordt "welke plaatsen precies?" het eerste open punt van het gesprek. Zo krijgen de
meetvragen plaatsen waar mensen echt op zoeken. Het bedrijfsmodel wordt bij twijfel ook een open
punt in plaats van een stille keuze. (`lib/pipeline/profile-research.ts`, `lib/kennis/open-punten.ts`.)

**V11. Hooguit één bezwaarvraag per cluster, en alleen een passend bezwaar.** *Opdracht en code, klein.*
De bezwaarregel geldt voor het hele cluster in plaats van per fase, en alleen voor een bezwaar dat
over het onderwerp gaat. Het vangnet voor dubbele vragen weegt een tweede variant van hetzelfde
bezwaar als dubbel. (`lib/pipeline/prompts.ts`.) Zo blijft de meetlat een meting van de markt en niet
van het eigen verkoopverhaal.

### E. Na het schrijven: de controle haalt weg, voegt niet toe

**V13. De schrijfopdracht: de lezer als maatstaf.** *Opdracht (`schrijfopdracht.ts` versie 5). Neemt K3
op.*
1. "Wees inhoudelijk volledig" en "schrijf zo uitgebreid als nodig is" worden één zin vanuit de
   lezer: beantwoord wat deze bezoeker wil weten, zo kort als dat kan, en zeg elk punt één keer.
2. Een overgeslagen vraag (V8): schrijf er niet omheen. Geen alinea over wat de lezer zelf moet
   navragen of wat niet bekend is. Kies een invalshoek die je met de informatie wel kunt waarmaken.
3. Algemene vakkennis alleen waar die de lezer helpt kiezen of handelen, niet om te laten zien wat
   je weet (de woorden van de copywriter bij A).

Minder regels, geen extra. Het gewicht van de verbetering zit in V3, V4 en V6: als de invoer de
boodschap één keer bevat en de pagina een waarmaakbare rol heeft, hoeft de opdracht niet tegen de
invoer in te duwen.

**V14. De eindredacteur beoordeelt, en een verbeterpunt mag niets toevoegen.** *Opdracht in
`controle-regels.ts`. Neemt K4 punt 1 en 2 op; besluit B-d voor de tekst van §6.6.*
1. Een verbeterpunt schrapt, corrigeert, verplaatst of maakt korter. Het vraagt nooit om een nieuw
   bedrag, een totaal, een voorwaarde, een uitzondering of een belofte die niet al in de informatie
   staat.
2. "Is er genoeg diepgang?" gaat uit de beoordeling; "is er onnodige herhaling" en "zijn er zinnen
   die de lezer niet helpen" blijven. De beoordeling kijkt dan naar wat eruit kan, zoals een
   eindredacteur dat doet.
3. De herschrijfopdracht krijgt één zin: voer de punten uit en laat de rest van de tekst staan,
   inclusief de veelgestelde vragen. Bij de noodopening ging dat mis.

**V15. De beslisregel en de versiekeuze eenvoudiger.** *Code in `controle-regels.ts`; besluit B-e.*
1. **Alleen een ongedekte zin is geen reden om te herschrijven.** Die zin wordt geel (B1), de
   ondernemer beslist. Herschrijven alleen bij het oordeel "niet goed" of bij een zin die de
   eindredacteur verzonnen noemt. In ronde 1 had dat drie van de tien herschrijvingen gescheeld,
   inclusief de enige waarvan we zeker weten dat hij de pagina slechter maakte.
2. **De versiekeuze kijkt niet meer alleen naar het aantal ongedekte zinnen.** De herschrijving blijft,
   tenzij hij een ongedekte zin heeft die er in de vorige versie niet stond; die ene zin wordt dan
   geel, in plaats van de hele betere versie weg te gooien.
3. K4 punt 3 (alleen herschrijven bij een feitelijk probleem) blijft een vraag voor na T1: dit
   voorstel is de kleinere stap ervoor.

**V16. De notitie van de schrijver wordt een vraag.** *Code, klein, geen AI.*
Wat de schrijver in `notitie_voor_ondernemer` zet ("hoe lang duurt een montage?"), komt als open
vraag van het merk in "Jouw beurt", gekoppeld aan de dienst van de pagina. Het antwoord gaat de
kennislaag in en helpt elke volgende pagina over die dienst, en de klant kan met dat antwoord "Vraag
een aanpassing" doen. Eén lus die er al half ligt, zonder nieuwe aanroep. (Raakt §3 regel 8 niet:
dat gaat over de vaste open vraag.) Uit de tweede ronde: vraagt een tweede pagina hetzelfde ("is
€69,95 inclusief btw?"), dan wordt het geen tweede vraag maar hangt de pagina aan de bestaande,
met dezelfde ontdubbeling als de brief al heeft.

### F. Tweede ronde: clusters, kansen, verbeterpagina's, vragen en opleveren

**V17. Elk cluster hangt aan het aanbod.** *Code en een bestaande aanroep, middel. De wortel van R7.*
1. Typt de consultant een onderwerp in dat bijna gelijk is aan een voorgesteld onderwerp, dan stelt
   het scherm voor dat voorstel te gebruiken, met zijn diensten.
2. Anders kiest het onderwerponderzoek (`topic_research`, dat al kijkt wat de eigen site over het
   onderwerp zegt) de passende diensten uit de aanbodboom. De code neemt alleen diensten over die
   echt bestaan. De consultant ziet ze bij het bevestigen van de meetvragen en kan ze aanpassen.
3. Voor de bestaande merken één keer bijwerken: de clusters koppelen en het kennisgat en de
   commerciële waarde van de kansen opnieuw uitrekenen.

Wat het oplost voor elke klant: het kennisgat klopt weer (dus minder en betere vragen), de voorrang
die de klant in het gesprek gaf telt mee in het plan, een antwoord helpt alle pagina's over dezelfde
dienst, en blok A kiest op dienst in plaats van op losse woorden.
(`lib/pipeline/topic-research.ts`, `lib/kansen/uit-rapport.ts`, het clusterscherm.)

**V18. Meetvragen en clusters ontdubbelen over het hele merk.** *Code en opdracht, klein tot middel.
Besluit B-i.*
1. Het opstellen van de meetvragen krijgt de vragen van de andere clusters van het merk mee, en het
   bestaande vangnet voor dubbele vragen loopt over alle clusters van het merk, niet alleen binnen
   één cluster.
2. Bij het aanmaken van een cluster waarschuwt het scherm als het onderwerp dicht bij een bestaand
   cluster ligt ("lijkt op: Online boekhouder met vaste prijs"). Het houdt niets tegen.

Wat het oplost: één vraag wordt één keer gemeten en telt één keer mee, en drie rapporten wijzen niet
meer naar dezelfde pagina. Het scheelt ook meetkosten. (`lib/pipeline/prompts.ts`,
`lib/pipeline/prompt-dedupe.ts`.)

**V19. Het kennisgat eerlijk maken.** *Code, klein.*
Volgt grotendeels uit V17 en V5. Daarnaast: het gat wordt na elk antwoord opnieuw uitgerekend, en
"hoe we werken" uit het gesprek telt als werkwijze voor elke dienst. Een kennisgat dat bijna altijd
hetzelfde lijstje geeft, stuurt de brief de verkeerde kant op; een eerlijk gat is precies wat B21
bedoelde. (`lib/kansen/kennisgat.ts`.)

**V20. Eén kaart per pagina, en dunne kansen worden bewijs.** *Code, klein.*
1. Staat er voor een bestaande pagina al een kaart in het plan of de voorraad, dan wordt een nieuwe
   kans voor dezelfde pagina daaraan toegevoegd als extra bewijs, in plaats van een tweede kaart.
   Twee vervangingen voor één adres kunnen dan niet meer.
2. Een kans die op één meetvraag rust en bij de dienst van een bestaande kans past, wordt bewijs bij
   die kans. Past hij nergens bij, dan blijft hij in de voorraad, met "rust op één meetvraag" op de
   kaart.

Dit is V7 punt 2 doorgetrokken naar het plan. (`lib/plans.ts`, `lib/kansen/uit-rapport.ts`.)

**V21. Een verbeterpagina houdt zijn functie en zijn gegevens.** *Code, klein tot middel. Punt 3 is
besluit B-h.*
1. `functieblok()` weer aansluiten: de schrijver krijgt bij een verbeterpagina de functie van de
   pagina mee (prijzenpagina, overzicht, onderwerp). Dat vangnet bestond al en is bij de ombouw
   losgeraakt. De lijst krijgt er twee soorten bij: een nieuwsbericht en een tips- of
   kennisbankpagina worden niet vervangen door een dienstpagina; dan wordt het een nieuwe pagina met
   die pagina als verwante pagina, zoals nu al bij de homepage.
2. De grens van 6.000 tekens voor de huidige tekst omhoog, zodat de schrijver de hele pagina ziet.
3. Na het schrijven zoekt de code welke harde gegevens van de huidige pagina (bedragen,
   telefoonnummers, termijnen, keurmerken) niet meer in de nieuwe tekst staan, en toont die aan de
   ondernemer: "deze gegevens staan op je huidige pagina en niet in de nieuwe". Niets houdt de pagina
   tegen; het is dezelfde soort controle op harde feiten als de gele zinnen (conventie 1).
(`lib/pipeline/paginafunctie.ts`, `lib/pagina/schrijfopdracht.ts`, `lib/pipeline/existing-page-match.ts`.)

**V22. Korte vragen, één ding per vraag, in de taal van de klant.** *Opdracht in de brief, klein.*
1. Eén vraag vraagt één ding. Wil de brief een voorbeeld én toestemming om het te noemen, dan zijn
   dat twee korte vragen, of één vraag met een ja-of-nee erachter.
2. De uitleg bij een vraag zegt wat het antwoord de lezer van de pagina oplevert, in de taal van de
   ondernemer. Geen "de schrijver", geen "verzinnen".
3. Een vraag naar bewijs (reviews, foto's, toestemming om een klus te noemen) is merkbreed: die
   geldt voor het hele bedrijf en wordt één keer gesteld.

Wat het oplost: juist de drukke klant beantwoordt meer vragen, en beter. Dit past bij B13: de klant
ziet waarom we het vragen. (`lib/pagina/brief-opdracht.ts`.)

**V23. De gestructureerde gegevens uit de kennislaag.** *Code, middel. Geen besluit nodig.*
De organisatie krijgt het passende type (bij een lokaal bedrijf een lokaal bedrijf) met adres,
telefoon, werkgebied en openingstijden uit de kennislaag; de dienst krijgt de aanbieder en het
werkgebied. De publicatiedatum komt pas bij "deze pagina staat live". Dit is geen tekst en geen
oordeel, maar het deel van de pagina dat een AI-assistent helpt het bedrijf te herkennen, en dus de
kern van wat ORBIT ENGINE belooft. (`lib/schema-jsonld.ts`, `lib/pagina/organisatie.ts`.)

---

## 5. Volgorde van bouwen, en hoe we toetsen

Elke fase is los te bouwen en los te toetsen. Na elke fase de vier controles (`tsc`, `test:unit`,
`test:chain`, `build`) en per wijziging een test (§ Werkwijze in `CLAUDE.md`).

| Fase | Voorstellen | Waarom in deze volgorde | Toets |
|---|---|---|---|
| **1. Fundament** | V1, V2, V3a, V12, V0, V21 punt 1 en 2, V23 | Stille verliezen en het losgeraakte vangnet eerst: elke latere toets is anders vervuild door afgekapte antwoorden, menu-tekst en pagina's die hun functie verliezen. V0 maakt de rest toetsbaar. V23 is los werk met direct nut voor de zichtbaarheid. | Eenheidstests; V2 op de opgeslagen pagina's van de drie merken nagerekend (conventie 10) |
| **2. Invoer** | V17, V19, V3, V4, V5, V22 | V17 eerst: zonder koppeling aan het aanbod kiezen blok A en het kennisgat op losse woorden. Daarna het grootste effect op herhaling en feitelijkheid, zonder de schrijfopdracht aan te raken. Zo zien we wat de invoer alleen al doet. | Met V0 dezelfde achttien pagina's opnieuw laten schrijven, zonder nieuwe brief (ongeveer $0,20 per pagina) |
| **3. Pagina-definitie en set** | V6, V7, V8, V18, V20 | Raakt het rapport, dus pas na de invoer: anders verandert er te veel tegelijk. | Rapporten opnieuw op de bestaande metingen (geen nieuwe meting nodig, het rapport leest opgeslagen data), dan een nieuwe maand van twee pagina's per klant |
| **4. Na het schrijven** | V13, V14, V15, V21 punt 3, en T1 uit het vervolgplan | Als de invoer schoon is, is pas te zien wat de controle nog toevoegt. | T1 (eerste en herschreven versie naast elkaar), daarna T2 |
| **5. Onderzoek en meting** | V9, V10, V11, V16 | Verandert wat er gemeten en aanbevolen wordt; eigen verificatie op opgeslagen data, zoals groep 2 van het vervolgplan al zei. | Bij de volgende nieuwe klant van de testmethode |

De verificatie volgt `docs/contentkwaliteit-testmethode.md` §8: dezelfde beoordelaar, hetzelfde
formulier, oud naast nieuw. De stopregel blijft: hooguit twee pogingen per patroon.

---

## 6. Besluiten voor de eigenaar

Deze punten raken `contentketen-opnieuw.md` §2, §3, §5 of §6, of zijn om een andere reden jouw keuze.
De rest van het plan valt binnen wat al besloten is (§0 regel 5: de invoer en de opdrachten
verbeteren).

| # | Besluit | Mijn advies | Raakt |
|---|---|---|---|
| **B-a** | Het veld `concurrentie` (goed en gaten) uit de brief (V4 punt 4) | Ja. Het stuurde de schrijver zonder dat de invoer het kon dragen, en §6.1 voorzag dit al | §6.1: een veld eruit gaat via een besluit |
| **B-b** | De aanbeveling beschrijft onderwerp, lezer, rol in de set en kernvraag in plaats van een opdrachttitel; het rapport krijgt meer denktijd (V6) | Ja. Dit is de grootste winst per pagina, en het is een bestaande aanroep | Rapport en kansen; §5 (blok D krijgt de rol in de set) |
| **B-c** | De brief markeert welke vraag de kernvraag beantwoordt, en de schrijver ziet welke vragen zijn overgeslagen (V8) | Ja. Geen wachten, geen tegenhouden: alleen zichtbaar maken | §6.1 (één veld erbij) en §5 (blok B) |
| **B-d** | De eindredacteur vraagt niet meer naar diepgang, en een verbeterpunt mag niets toevoegen (V14) | Ja | §6.6 (de tekst van de twee vragen) |
| **B-e** | Niet herschrijven bij alleen een ongedekte zin; die wordt geel. De versiekeuze op nieuwe ongedekte zinnen in plaats van op het aantal (V15) | Ja. K4 punt 3 pas na T1 | §6.6 en §6.7 (de beslisregel) |
| **B-f** | Een beheeractie om een pagina opnieuw te laten schrijven met dezelfde invoer, alleen voor verificatie (V0) | Ja, alleen voor de eigenaar en consultants | §3 regel 7 (geen tweede route): dit plant geen pagina en is geen klantroute, maar het is jouw uitleg van die regel |
| **B-g** | "Verhalen" wordt vier vakken en bezwaren worden paren met een antwoord (V5) | Ja | §6.3 (het tekstvak Verhalen) |
| **B-h** | Na het schrijven ziet de ondernemer welke harde gegevens van zijn huidige pagina niet meer in de nieuwe tekst staan (V21 punt 3) | Ja. Een controle op harde feiten, geen oordeel over de tekst, en hij houdt niets tegen | §6.5 en §6.9 (een lijst op het goedkeuringsscherm, zoals de gele zinnen) |
| **B-i** | Meetvragen worden over alle clusters van een merk ontdubbeld (V18) | Ja. Bestaande clusters blijven zoals ze zijn; alleen nieuwe clusters meten anders | De meting: de merkscore telt een vraag voortaan één keer |

---

## 7. Wat ik bewust níet voorstel

Om de valkuil van de vorige keten te vermijden, en omdat de opdracht vraagt om algemene verbeteringen:

- **Geen regel voor één onderwerp.** Niets over montageduur bij Tedee, niets over het woord
  "pickset", geen lijst met normen (PKVW, SKG) die de schrijver niet mag noemen. Wat daar misging,
  lossen V3, V4 en V13 in het algemeen op.
- **Geen controle op feiten uit de buitenwereld.** De copywriter haalde de NVWA en Milieu Centraal
  aan. Een klantclaim die te stellig is ("agressiever dan een gewone wesp") is voor de ondernemer; hij
  keurt de tekst goed. Een factchecker op het web zou een nieuwe controlelaag zijn (§3 regel 4).
- **Geen extra beoordelaar, geen score, geen tweede herschrijving.** Het plan haalt juist weg:
  herschrijvingen (V15), een brief-veld (B-a), een vraag uit de beoordeling (V14).
- **Geen minimum of maximum aantal vragen.** Het aantal volgt het gat (B13). Wat de klant helpt is
  weten welke vraag ertoe doet (V8), niet minder vragen.
- **Geen andere modellen voor het schrijven.** Het schrijven is niet de zwakke schakel. Alleen het
  rapport krijgt meer denktijd (V6), omdat daar de keuze valt welke pagina's er komen.
- **Geen reviewscore in de gestructureerde gegevens.** De 5,0 van de slotenmaker is verleidelijk, maar Google staat een beoordeling die een bedrijf over zichzelf op de eigen site zet niet toe in deze gegevens. V23 houdt het bij feiten: adres, telefoon, werkgebied, openingstijden.
- **Geen automatisch samenvoegen van clusters.** V18 waarschuwt; de consultant beslist. Twee clusters die op elkaar lijken, kunnen een bewuste keuze zijn.
- **Methodepunten horen niet in de app.** M1 tot en met M5 en K5 van het vervolgplan gaan over de
  testmethode; die blijven daar.

---

## 8. Wat er met de startlijst gebeurt (K1 tot en met K5)

| Startpunt | Wordt | Wat er veranderde |
|---|---|---|
| K1 (bedrijfsfeiten alleen uit de kennislaag) | V4 punt 1 tot en met 3 | Blijft, plus de instructies en twijfels die de brief in de vakkennis zet (de bron van de app-taal) |
| K2 (aanbevelingen als set) | V7 | Blijft, plus de rol in de set voor de schrijver en de plaatsregel B12 in de planning |
| K3 (schrijven met wat er is) | V13, samen met V8 | Aangescherpt: de schrijver krijgt nu echt te zien welke vraag open bleef (de open vraag uit K3 punt 2 is beantwoord: dat kon hij niet zien) |
| K4 (de controle voegt niets toe) | V14 en V15 | Aangescherpt: ook de beslisregel bij alleen een ongedekte zin, en de versiekeuze. Punt 3 blijft na T1 |
| K5 (sjabloonversie 3) | Blijft in de testmethode | Geen pijplijnwerk |
| Nieuw | V0, V1, V2, V3, V3a, V5, V6, V8, V9, V10, V11, V12, V16 | Uit de invoer en uitvoer van de stappen zelf, niet uit de feedback alleen |
| Nieuw, tweede ronde | V17 tot en met V23 | Uit de clusters, de kansen, het plan, de vragen, de verbeterpagina's en het opleveren |

## 9. Kosten

Geen enkel voorstel voegt een AI-aanroep toe. Het rapport met meer denktijd kost per cluster een paar
dollarcent extra, op een meetronde van ongeveer $1. V15 scheelt herschrijvingen (in ronde 1 drie van
de tien, rond $0,05 per stuk). V4 punt 4 maakt de brief en de schrijfinvoer iets korter. V18 scheelt meetkosten: een vraag die nu in drie clusters staat, wordt één keer gemeten. V21 punt 2 maakt de invoer bij een lange verbeterpagina iets groter. Per saldo
blijven de kosten per pagina ruim onder de grens van $0,50 uit B4.
