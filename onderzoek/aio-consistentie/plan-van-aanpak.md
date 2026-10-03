# Hoe betrouwbaar is een meting van Google AI Overview?

Plan van aanpak voor een zelfstandig onderzoek, los van ORBIT ENGINE. Status: plan, nog niets
uitgevoerd, nog geen enkele betaalde aanroep gedaan (3 oktober 2026).

## 1. Aanleiding en kernvraag

Steeds meer bedrijven verkopen een "AI-zichtbaarheidsscore": hoe vaak wordt jouw merk genoemd in
AI-antwoorden. Zo'n score is maar zo goed als de meting eronder. Als Google bij dezelfde vraag, op
hetzelfde moment, vanaf dezelfde plek, telkens andere bedrijven noemt, dan zegt één meting weinig
en een verschil tussen twee maanden misschien niets.

**Kernvraag:** hoe consistent is Google AI Overview in welke bedrijven het noemt, in welke
volgorde, hoeveel, en op welke toon, wanneer iemand in Amsterdam zoekt naar een marketingbureau
voor Google Ads, op desktop en op mobiel?

**De praktische vraag erachter, die de blog moet beantwoorden:** hoeveel metingen heb je nodig
voordat een zichtbaarheidscijfer iets betekent, en hoe groot moet een verandering zijn voordat je
mag zeggen dat er echt iets veranderd is?

### Wat we al weten (eigen voormeting, ander onderwerp)

In ORBIT ENGINE is op 20 september 2026 een kleine meting gedaan op 90 vragen van een autobedrijf
(`docs/logbook.md`, zoek op "De aanname over Google AI Overview is weerlegd"). Twee rondes met een
half uur ertussen:

- bij 17 van de 28 vragen waar het merk ooit genoemd werd, wisselde de uitkomst (61%);
- van de 418 bronnen kwam ongeveer de helft terug (49%);
- bij 1 op de 5 vragen wisselde zelfs óf er een AI Overview verscheen;
- een AI Overview kostte gemiddeld $0,0037 per meting via DataForSEO, inclusief herkansingen.

Dat is een aanwijzing, geen bewijs: twee rondes, één branche, landelijk gemeten en alleen desktop.
Dit onderzoek maakt er een opgezette proef van. Gevolg voor het ontwerp: we verwachten veel
wisseling, dus het onderzoek moet vooral goed kunnen scheiden wáár die wisseling vandaan komt.

## 2. Onderzoeksvragen en verwachtingen

Vooraf vastgelegd, zodat we achteraf niet het verhaal kiezen dat het best uitkomt.

| # | Vraag | Verwachting (hypothese) |
|---|---|---|
| V1 | Hoe vaak verschijnt er überhaupt een AI Overview? | Per zoekzin vrij vast: sommige zinnen vrijwel altijd, andere vrijwel nooit. |
| V2 | Noemt Google bij herhaling dezelfde bureaus? | Nee: zelfs binnen tien minuten is de overlap tussen twee antwoorden gemiddeld kleiner dan 80%. |
| V3 | Is de volgorde stabiel? | De eerste plek is stabieler dan de rest van de lijst. |
| V4 | Hoeveel bureaus worden genoemd, en schommelt dat? | Het aantal schommelt merkbaar, ook bij dezelfde zoekzin. |
| V5 | In welk sentiment worden bureaus genoemd? | Vrijwel altijd neutraal tot positief; negatief is zeldzaam. |
| V6 | Verschillen desktop en mobiel? | Ja, voor een deel van de bureaus, maar minder dan het verschil tussen zoekzinnen. |
| V7 | Verandert het beeld over vier weken meer dan het toeval binnen een kwartier? | Ja: er is een langzame verschuiving bovenop het directe toeval. |
| V8 | Wat weegt het zwaarst: de formulering, het apparaat, het moment of puur toeval? | De formulering weegt het zwaarst, toeval op twee. |
| V9 | Zijn de genoemde bureaus dezelfde als in de gewone zoekresultaten en de kaart? | Grote overlap, maar niet volledig. |

## 3. Opzet van de proef

### 3.1 De zoekzinnen

Twaalf zoekzinnen, in vier soorten van drie. Zo kunnen we zien of de formulering het antwoord
meer bepaalt dan het apparaat of het moment.

| Soort | Voorbeelden (definitief na de pilot) |
|---|---|
| Kort zoekwoord | "google ads bureau amsterdam", "sea bureau amsterdam", "google ads specialist amsterdam" |
| Vergelijkend | "beste google ads bureau amsterdam", "top 10 google ads bureaus amsterdam", "goed sea bureau in amsterdam voor mkb" |
| Vraag | "welk bureau in amsterdam kan mijn google ads advertenties beheren?", "wie kan in amsterdam mijn google ads campagne verbeteren?", "welk marketingbureau in amsterdam is goed in google ads?" |
| Opdracht met context | "google ads uitbesteden amsterdam kosten", "google ads beheer laten doen klein bedrijf amsterdam", "google ads bureau amsterdam ervaringen" |

Exacte schrijfwijze (hoofdletters, vraagteken) blijft gedurende het hele onderzoek gelijk.

### 3.2 Apparaat en locatie

- **Desktop:** `device: desktop`, `os: windows`.
- **Mobiel:** `device: mobile`, `os: ios` (in de pilot ook `android`, om te zien of dat verschil maakt).
- **Locatie Amsterdam:** via een coördinaat in het centrum (`location_coordinate`) of de
  DataForSEO-locatie voor Amsterdam. De precieze code halen we op via hun locatielijst; niet
  overnemen uit een voorbeeld. Taal `nl`.
- **Controle op de locatie (klein):** dezelfde zoekzinnen een paar keer met Utrecht en met heel
  Nederland. Komt daar hetzelfde uit, dan doet de locatie-instelling weinig, en dat is zelf een
  bevinding die de blog moet melden.

### 3.3 Drie metingen in één onderzoek

**A. Toeval op één moment (de "kwartierproef").** Per zoekzin en apparaat tien aanroepen binnen
ongeveer tien minuten, op drie verschillende dagen. Dit meet het zuivere toeval: alles is gelijk
behalve het moment van de aanroep. 12 × 2 × 10 × 3 = **720 aanroepen**.

**B. Verloop over vier weken (de tijdreeks).** Elke vier uur elke zoekzin op beide apparaten,
28 dagen lang, op wisselende minuten om vaste patronen te vermijden. Dit meet verschuiving over
tijd en verschil tussen dag en nacht, werkdag en weekend. 12 × 2 × 6 × 28 = **4.032 aanroepen**.

**C. Echte gebruikers als ijkpunt (klein, maar belangrijk).** DataForSEO is een nagebootste
zoekopdracht vanaf een server, niet een echte Amsterdammer met een telefoon. Daarom vijf tot tien
mensen in Amsterdam die op afgesproken momenten drie zoekzinnen intikken (incognito, uitgelogd) en
een schermafbeelding maken, terwijl op dezelfde minuut de API dezelfde zinnen opvraagt. Doel: niet
statistisch bewijzen dat het hetzelfde is, maar laten zien hóe ver het uit elkaar ligt. Zonder deze
stap kan de blog alleen iets zeggen over meettools, niet over wat een zoeker echt ziet.

### 3.4 Wat er per aanroep bewaard wordt

- De **volledige ruwe JSON** van DataForSEO, ongewijzigd, met tijdstip, zoekzin, apparaat,
  locatie, kosten en eventuele foutcode.
- Uit de JSON: of er een AI Overview is, de volledige tekst, de bronnen (adres, domein, titel), de
  organische top 10 en de bedrijven in het kaartblok.
- Een mislukte aanroep telt als mislukt, niet als "geen AI Overview". Uit de voormeting: bijna een
  derde faalt de eerste keer met een serverfout en slaagt bij een herkansing. Herkansingen en
  mislukkingen worden apart geteld, anders verandert de noemer per ronde.

## 4. Van tekst naar gegevens: de codering

Dit is de stap waar zulke onderzoeken het vaakst op onderuit gaan, dus hij krijgt een eigen
controle.

1. **Bureaulijst opbouwen.** Na de pilot een lijst van alle genoemde bureaus met hun
   schrijfvarianten en domein ("Bureau X", "Bureau X B.V.", bureaux.nl). Elke nieuwe naam in de
   hoofdmeting wordt aan die lijst toegevoegd, nooit stil samengevoegd.
2. **Automatisch herkennen.** Per AI Overview haalt een taalmodel met een vaste instructie de
   genoemde bureaus eruit, in volgorde van eerste vermelding, met per bureau het sentiment. De
   uitkomst gaat als vaste structuur (JSON) terug en wordt tegen de bureaulijst gelegd. Het
   tellen, de volgorde en de vergelijking doet daarna gewone code, niet het model.
3. **Sentiment in vier standen:** *aanbevolen* (expliciet aangeraden, "bekend om", "sterk in"),
   *neutraal genoemd* (in een opsomming zonder oordeel), *met voorbehoud* ("al zijn de kosten
   hoog"), *negatief*. Plus het kenmerk waarmee het bureau wordt neergezet ("gespecialiseerd in
   mkb", "Google Partner"), want dat zegt meer dan positief of negatief.
4. **Controle door mensen.** Een willekeurige steekproef van 10% (minimaal 200 antwoorden) wordt
   door twee mensen los van elkaar gecodeerd. We rapporteren hoe vaak het model een bureau mist of
   verzint, en hoe goed mensen en model het eens zijn over het sentiment (Cohens kappa; vanaf 0,8
   noemen we het betrouwbaar). Haalt het model dat niet, dan wordt alles met de hand gecodeerd.
   Bij ongeveer 4.000 antwoorden is dat veel werk, maar het is beter dan een onbetrouwbare telling.

## 5. Analyse

Per vraag één hoofdmaat, zodat er niet achteraf gezocht wordt naar de maat die het mooiste
resultaat geeft.

| Vraag | Hoofdmaat | In gewone taal |
|---|---|---|
| V1 | Aandeel aanroepen met een AI Overview, met betrouwbaarheidsmarge | "In 7 van de 10 zoekopdrachten verschijnt een overzicht" |
| V2 | Overlap tussen twee antwoorden (Jaccard: gedeelde bureaus gedeeld door alle genoemde) | "Twee antwoorden op dezelfde vraag delen gemiddeld de helft van de bureaus" |
| V3 | Gelijkenis van de volgorde, met meer gewicht voor bovenaan (rank-biased overlap) en de kans dat nummer 1 nummer 1 blijft | "Het bureau op plek 1 staat er de volgende keer in 4 van de 10 gevallen weer" |
| V4 | Mediaan en spreiding van het aantal genoemde bureaus | "Meestal 4 bureaus, maar alles tussen 2 en 8 komt voor" |
| V5 | Verdeling van de vier sentimentstanden per bureau | "Bureau X wordt in 9 van de 10 vermeldingen aanbevolen" |
| V6 | Verschil in vermeldingskans per bureau tussen desktop en mobiel, gepaard per tijdstip | "Op mobiel wordt bureau Y half zo vaak genoemd" |
| V7 | Overlap binnen een kwartier tegenover overlap tussen dagen en weken | "Over vier weken verschuift het beeld meer dan toeval verklaart" |
| V8 | Verdeling van de variatie over formulering, apparaat, moment en toeval (statistisch model met deze vier als factoren) | "Hoe je het vraagt bepaalt het antwoord twee keer zo sterk als je apparaat" |
| V9 | Overlap tussen bureaus in AI Overview, de organische top 10 en het kaartblok | "8 van de 10 genoemde bureaus staan ook in de gewone zoekresultaten" |

### De rekenproef voor meettools

Het onderdeel dat de blog het meest bruikbaar maakt. Met de 4.032 metingen als "volledige
werkelijkheid" trekken we steekproeven zoals een meettool dat doet (1, 3, 5, 10, 30 metingen per
zoekzin) en kijken we hoe ver de score van zo'n tool afwijkt van de werkelijke vermeldingskans.

Een eerste schatting laat zien waarom dit ertoe doet. Wordt een bureau in werkelijkheid in 30% van
de antwoorden genoemd, dan is de foutmarge van een gemeten score ongeveer:

| Metingen | Foutmarge (ruwe benadering) | Gevolg |
|---|---|---|
| 1 | niet te zeggen | De score is 0% of 100%, nooit 30% |
| 5 | ongeveer 40 procentpunt | Bijna elke uitkomst is mogelijk |
| 10 | ongeveer 28 procentpunt | 10% en 50% zijn allebei "normaal" |
| 30 | ongeveer 16 procentpunt | Grote verschillen worden zichtbaar |
| 100 | ongeveer 9 procentpunt | Bruikbaar voor een trend |

Uit de echte data volgt dan hoe vaak een tool die één keer per week of per maand meet een
"stijging" of "daling" rapporteert die puur toeval is. Dat is de zin waar de blog om draait.

### Hoeveel metingen is genoeg?

Met 168 tijdreeksmetingen per zoekzin en apparaat is de marge op een vermeldingskans hooguit
ongeveer 8 procentpunt; opgeteld over twaalf zoekzinnen per apparaat ongeveer 2 procentpunt. Dat is
ruim genoeg om verschillen tussen desktop en mobiel van 5 procentpunt of meer te zien. Kleinere
verschillen kan dit onderzoek niet aantonen, en dat zeggen we dan ook.

## 6. Valkuilen en hoe we ze afvangen

| Valkuil | Wat we doen |
|---|---|
| **Een API is geen mens.** Een server met een locatie-instelling is niet hetzelfde als een telefoon in Amsterdam, met een zoekgeschiedenis en een ingelogd Google-account. | Meting C als ijkpunt, en in de blog expliciet: dit onderzoek meet wat meettools zien. |
| **Caching bij de leverancier.** Twee identieke antwoorden kunnen betekenen dat DataForSEO een oud antwoord teruggeeft. | Tijdstempel van Google in de respons vergelijken; letterlijk identieke antwoorden apart tellen en navragen bij DataForSEO. |
| **Google verandert tijdens de proef.** Een modelupdate in week 3 lijkt dan op "verschuiving". | Logboek bijhouden van aangekondigde Google-updates; tijdreeks bekijken op plotselinge sprongen. |
| **Het AI-overzicht laadt apart.** Zonder `load_async_ai_overview: true` komt het blok zonder inhoud terug (vastgesteld in de voormeting). | Vlag altijd aan; in de pilot controleren dat het aandeel lege blokken nul is. |
| **Lokale zoekvragen geven een kaart in plaats van een overzicht.** | De pilot bepaalt per zoekzin hoe vaak er een overzicht komt. Weinig overzichten is zelf een uitkomst (V1), geen reden om de zin stil te schrappen. |
| **Achteraf de mooiste maat kiezen.** | Dit plan met hoofdmaten wordt vóór de hoofdmeting vastgelegd met een commit (tijdstempel in git), eventueel ook op OSF. Extra analyses heten in de blog "verkennend". |
| **Belangenverstrengeling.** Outer Orbit verkoopt zelf AI-zichtbaarheidsmeting. | In de blog melden, de ruwe data en de code openbaar maken, zodat iedereen het kan narekenen. |

## 7. Bedrijfsnamen in de blog

Het onderzoek gaat over de betrouwbaarheid van de meting, niet over welk bureau het beste is. Twee
opties:

- **Met naam:** concreter en geloofwaardiger, maar een bureau dat "met voorbehoud" genoemd wordt
  kan zich benadeeld voelen. Dan alleen letterlijke citaten van Google, geen eigen oordeel.
- **Geanonimiseerd** (Bureau A tot en met Z): veiliger, de boodschap blijft overeind.

Advies: geanonimiseerd in de grafieken, met de opmerking dat de volledige lijst op aanvraag
beschikbaar is. Dit is een keuze voor de eigenaar.

## 8. Fasering en kosten

Kosten op basis van de voormeting ($0,0037 per AI Overview inclusief herkansingen). Prijzen van
DataForSEO en het taalmodel vlak voor de start opnieuw nakijken.

| Fase | Wat | Duur | Kosten (schatting) |
|---|---|---|---|
| 0. Voorbereiding | Zoekzinnen concept, locatiecode opzoeken, script voor ophalen en opslaan, codeerinstructie | 2 tot 3 dagen | $0 |
| 1. Pilot | Alle 12 zoekzinnen × 2 apparaten (plus android en de locatiecontrole), ±200 aanroepen; bureaulijst opbouwen; zoekzinnen definitief maken | 2 dagen | ongeveer $1 |
| 2. Vastleggen | Plan definitief, commit als vooraf vastgelegd onderzoeksplan | 1 dag | $0 |
| 3. Hoofdmeting | Kwartierproef (720) en tijdreeks (4.032) automatisch, plus de ijkmeting met echte gebruikers | 4 weken | ongeveer $18 |
| 4. Codering | Automatische herkenning, menselijke controle van de steekproef | 1 week | enkele dollars aan het taalmodel, en vooral tijd |
| 5. Analyse | Hoofdmaten, rekenproef, grafieken | 1 week | $0 |
| 6. Blog | Schrijven, laten meelezen, data en code openbaar | 1 week | $0 |

Totaal: ongeveer zeven weken doorlooptijd en minder dan $30 aan aanroepen. De echte kosten zitten
in de menselijke controle van de codering en het regelen van de ijkmeting.

**Waar het draait:** een klein zelfstandig script in deze map, niet in de app. Het elke vier uur
laten draaien kan met een geplande taak (bijvoorbeeld GitHub Actions); het werkelijke tijdstip van
elke aanroep wordt bewaard, want zo'n planner loopt soms minuten uit. De analyse in Python
(pandas, statsmodels) of R, zodat de statistiek met standaardgereedschap na te rekenen is.

## 9. De blog

Werktitel: **"Vraag het Google twee keer: hoe betrouwbaar is je AI-zichtbaarheidsscore?"**

1. **Aanleiding.** Iedereen meet AI-zichtbaarheid; wij wilden weten hoe hard zo'n cijfer is.
2. **De proef in één alinea.** Twaalf zoekzinnen, Amsterdam, desktop en mobiel, vier weken,
   bijna 5.000 zoekopdrachten.
3. **Wat er gebeurt als je hetzelfde twee keer vraagt.** De kwartierproef, met één grafiek: per
   bureau in hoeveel van de antwoorden het genoemd wordt.
4. **Formulering, apparaat of toeval?** De verdeling uit V8, in één staafje.
5. **Wat dit betekent voor een meettool.** De rekenproef: hoeveel metingen je nodig hebt, en hoe
   vaak een maandrapport een schijnverandering laat zien.
6. **Wat je als ondernemer wél kunt doen.** Kijk naar kansen over veel metingen, niet naar één
   positie; vraag je meetleverancier hoe vaak per vraag er gemeten wordt.
7. **Beperkingen.** API tegenover echte gebruiker, één branche, één stad, vier weken.
8. **Methode en data.** Link naar de ruwe data, de code en dit plan.

Grafieken die het verhaal dragen: een raster van bureau tegen meting (gekleurd vlak is genoemd), dat
in één oogopslag laat zien hoe grillig het is; de vermeldingskans over vier weken met marge; de
staaf met de verdeling van de variatie.

## 10. Wat de eigenaar nog moet beslissen

1. **Bedrijfsnamen:** met naam of geanonimiseerd (§7).
2. **De ijkmeting met echte gebruikers:** wie in Amsterdam doet mee, en hoeveel momenten?
3. **De zoekzinnen:** kloppen deze twaalf met hoe een mkb-ondernemer echt zoekt? De eigenaar kent
   die zoeker beter dan dit plan.
4. **Openbaar maken van data en code:** ja of nee. Advies: ja, het is de sterkste bescherming tegen
   het verwijt dat een meetbedrijf zijn eigen gelijk onderzoekt.

## 11. Raakvlak met ORBIT ENGINE

Los onderzoek, maar de uitkomst is direct bruikbaar voor de app: de rekenproef zegt hoeveel
herhalingen per vraag nodig zijn voor een betrouwbaar cijfer. Wordt dat iets voor de app, dan is
dat een aparte beslissing met een eigen alinea in `docs/logbook.md`. Er verandert nu niets aan de app.
