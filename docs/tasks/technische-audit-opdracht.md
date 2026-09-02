# Opdracht: technische audit van de keten, van klant aanmaken tot opgeleverde content

Geschreven op 2 september 2026 in opdracht van de eigenaar. Bedoeld om uitgevoerd te worden door
iemand die deze app niet gebouwd heeft.

---

## De opdracht in één alinea

Onderzoek als onafhankelijke externe partij of de technische keten van ORBIT ENGINE productiewaardig
is. Je loopt de volledige weg van een klant af op productie, van het aanmaken van het merk tot de
tekst die aan de klant wordt opgeleverd, en je stelt bij elke stap één vraag: **doet dit wat het
hoort te doen, en is dat aantoonbaar?** Je levert een audit op met alle bevindingen, elk met bewijs,
een oordeel over de ernst en wat er moet gebeuren om hem productiewaardig te maken.

---

## Vier regels over hoe je kijkt

**1. Lees de documentatie niet.** Geen `docs/`, geen `README.md`, geen `APP_FLOW_DOCUMENTATION.md`,
geen logboek, geen taakbestanden. Die documenten beschrijven wat de bouwers dachten dat er staat, en
precies dat mag je niet overnemen. Je bronnen zijn de code, de database op productie, de logboeken
van de draaiende app en wat de app doet als je hem gebruikt. `CLAUDE.md` lees je wel, maar alleen
voor de commando's en de werkwijze, niet als beschrijving van het product.

**2. Test alles even zwaar.** Er is geen lijst met "nieuwe functies" die extra aandacht krijgt. Wat
er vorige week is gebouwd en wat er drie maanden geleden is gebouwd draaien allebei bij een echte
klant, dus ze wegen even zwaar. De oudste code is bovendien het langst niet bekeken.

**3. Techniek, niet vormgeving.** Of een knop mooi staat interesseert deze audit niet. Of de
gegevens kloppen, de taken slagen, de rechten sluiten en de cijfers narekenbaar zijn wél. Een tekst
telt alleen mee als hij feitelijk onjuist is, bijvoorbeeld een getal dat de database tegenspreekt.

**4. Elk cijfer narekenen.** Een getal op een scherm of in een tabel is een bewering tot je hem uit
de ruwe data hebt gereconstrueerd. Dat geldt voor de zichtbaarheidsscore, de kosten, de tellingen,
de percentages en de statussen.

---

## Wat er onderzocht moet worden

De keten in acht schakels. Per schakel staat hieronder wat er minimaal beantwoord moet zijn. Dat is
een ondergrens en geen afvinklijst: kom je iets tegen wat er niet staat, dan onderzoek je dat ook.

### Schakel 1: het account en het merk

- Wordt een merk correct aangemaakt: alle verplichte velden gevuld, de juiste eigenaar, de juiste
  begintoestand, geen halve rij als er iets misgaat?
- Wat gebeurt er bij dubbel indienen, bij een ongeldig webadres, bij een site die niet bestaat, bij
  een naam die al bestaat?
- Wie mag dit? Controleer per route of de rechtencontrole in de server zit en niet alleen in het
  scherm. Probeer als klantaccount elke route te raken die van de beheerder is.
- Kloppen de rechten in de database zelf, los van de app? Kan een ingelogde klant met de sleutel uit
  zijn eigen browser data van een ander account lezen of schrijven?

### Schakel 2: de onderzoekspijplijn

- Slaagt elke taak, en wat gebeurt er met de keten als er één faalt? Loopt de rest door, wordt er
  opnieuw geprobeerd, en hoe vaak?
- Wordt het resultaat van elke stap volledig opgeslagen, inclusief de ruwe modeluitvoer, en is het
  terug te vinden bij de juiste rij?
- Wat doet de pijplijn als de site van de klant klein is, traag is, JavaScript nodig heeft, of de
  crawler weigert? Kies zo nodig een tweede merk om dat te zien.
- Klopt wat er gecrawld is met wat er op de site staat, of zit de opslag vol met navigatiemenu's en
  cookiemeldingen?
- Hoe lang duurt elke taak echt, en waar zit de wachttijd: in het model of in de planning van de
  wachtrij?

### Schakel 3: de wachtrij zelf

Dit is de motor van de hele app en verdient een eigen onderzoek.

- Hoe wordt de werker aangeroepen, hoe vaak, en wat gebeurt er als een aanroep uitvalt?
- Kan dezelfde taak twee keer tegelijk opgepakt worden? Zoek de vergrendeling op en toets hem.
- Wat gebeurt er met een taak die de tijdslimiet raakt? Blijft hij op "bezig" hangen, en is er iets
  dat hem terugzet?
- Zoek in de takentabel over de hele geschiedenis: welke taaksoorten faalden hoe vaak, met welke
  fout, en welke daarvan zijn nooit opgemerkt?
- Zijn er taken die eeuwig wachten, kringlopen die zichzelf voeden, of taken die geen opvolger meer
  krijgen?

### Schakel 4: het cluster en de vragen

- Wordt een cluster of analyse correct opgezet, met de juiste koppeling aan het merk, en wat gebeurt
  er bij twee tegelijk?
- Hoe komen de vragen tot stand, hoeveel worden er echt gegenereerd tegenover hoeveel er beloofd
  worden, en wat gebeurt er als het model er minder of meer teruggeeft?
- Zijn de vragen technisch bruikbaar: geen dubbelen, geen lege, geen merknaam erin als dat de meting
  vervuilt, en de verdeling over de fases zoals de code hem bedoelt?
- Blijft een bewerkte of verwijderde vraag correct staan in de meting die erop volgt?
- Wordt er echt niets duurs gestart vóór de goedkeuring? Toets dat aan de kostenregels, niet aan het
  scherm.

### Schakel 5: de meting

- Wordt elke vraag echt gesteld, en wat gebeurt er bij een time-out, een geweigerd antwoord of een
  antwoord dat niet in het verwachte formaat komt?
- Wordt het antwoord volledig bewaard, met bronnen en tijdstip?
- **Reken de beoordeling na met de hand.** Neem een aantal antwoorden, bepaal zelf of het merk
  genoemd wordt, en leg dat naast wat de app ervan maakte. Zoek naar zowel gemiste vermeldingen als
  vermeldingen die er niet zijn.
- Reconstrueer de score uit de ruwe rijen. Klopt de teller, klopt de noemer, klopt de foutmarge, en
  klopt het cijfer op het scherm met de tabel eronder?
- Worden schrijfwijzen van dezelfde naam samengenomen, en worden gelijknamige andere bedrijven
  uitgesloten?
- Is de meting herhaalbaar? Wat gebeurt er als dezelfde vraag twee keer gemeten wordt, en welke
  sleutel houdt dubbel werk tegen?

### Schakel 6: rapport, kansen en aanbevelingen

- Klopt elk getal in het rapport met de meting eronder? Reken ze allemaal na, niet één.
- Hoe ontstaan de kansen en de aanbevelingen, en is dat reproduceerbaar? Draai dezelfde stap twee
  keer op dezelfde meting en vergelijk.
- Bij een aanbeveling die naar een bestaande pagina wijst: wijst hij naar de juiste, bestaat die
  pagina, en wat gebeurt er als hij niet bestaat of het adres onzin is?
- Verdwijnt er informatie tussen de meting en het rapport, of komt er informatie bij die nergens op
  steunt?

### Schakel 7: de contentpijplijn

- Loopt de weg van aanbeveling naar tekst zonder handmatige duw, en wat gebeurt er als de klant
  halverwege stopt?
- Welke feiten mag de tekst gebruiken, en wordt dat afgedwongen in code of alleen in de opdracht aan
  het model? Toets dat door te zoeken naar beweringen in de opgeleverde tekst die nergens op steunen.
- Wat gebeurt er als een stap faalt: blijft de pagina in een tussentoestand hangen, en komt hij daar
  weer uit?
- Klopt de eindtoestand van een pagina met de controles die hem daar brachten? Reken een score na.
- Bij een verbetering van een bestaande pagina: wordt de echte huidige tekst opgehaald, en is
  vast te stellen wat de klant kwijtraakt als hij de nieuwe tekst plaatst?
- Wat kost een pagina echt, en klopt dat met wat er vooraf werd gezegd?

### Schakel 8: oplevering aan de klant

- Klopt wat de klant te zien krijgt met wat er in de database staat: statussen, aantallen, data,
  openstaande punten?
- Wordt het publiceren correct vastgelegd, en wat gebeurt er bij een adres dat niet bestaat?
- Wat is er ingepland na de publicatie, en staat dat er echt in de wachtrij?
- Ziet de klant iets wat niet van hem is: kosten, modelnamen, interne velden, data van een ander
  merk?

---

## Vier onderzoeken dwars door de keten heen

**Rechten.** Loop elke serverroute in de app langs en stel per route vast: wordt er
geauthenticeerd, wordt eigendom gecontroleerd, en wordt de rol gecontroleerd bij alles wat geld
kost of intern is. Toets steekproefsgewijs met een echt klantaccount. Controleer ook de rechten in
de database zelf.

**Geld.** Reconstrueer wat deze doorloop echt gekost heeft uit het kostenlogboek, en leg dat naast
de schattingen die de app vooraf toont. Zoek naar plekken waar een klant kosten kan starten zonder
rem, en naar plafonds die niet werken zoals ze bedoeld zijn.

**Gegevensintegriteit.** Zoek naar rijen die niet kunnen kloppen: verweesde verwijzingen, statussen
die nergens meer heen gaan, tellingen die niet overeenkomen met de onderliggende rijen, dubbele
rijen die uniek hadden moeten zijn. Doe dat over de hele productiedatabase en niet alleen over je
eigen testmerk.

**Falen.** Wat gebeurt er echt als het misgaat? Laat minstens één stap opzettelijk mislukken en
volg wat de app daarna doet: wordt het opgemerkt, wordt het gemeld, wordt het hersteld, of gaat het
stil verloren en denkt de klant dat alles klaar is.

---

## Grenzen

1. Raak geen data van bestaande klanten aan. Lezen om te controleren mag, schrijven niet.
2. Publiceer niets op een website die niet van ons is en verstuur geen mail naar een echt bedrijf.
3. Verwijder aan het eind niets op eigen initiatief.
4. Zet geen wijziging op productie zonder toestemming van de eigenaar.
5. Echte, betaalde AI-aanroepen zijn toegestaan. Een test met de dure stap uitgeschakeld meet niet
   wat een klant krijgt.

---

## Wat je oplevert

Een audit in het Nederlands, leesbaar voor de eigenaar zonder technische kennis, met per bevinding:

1. **Wat er mis is**, in één zin.
2. **Het bewijs**: de query, de logregel, het antwoord van de route, de rij in de database. Geen
   bevinding zonder bewijs.
3. **Het gevolg voor een echte klant.** Wat merkt hij, en wanneer.
4. **Waar het zit**, bestand en regel.
5. **Wat er moet gebeuren**, en hoe zeker je daarvan bent.
6. **De ernst**: blokkerend voor ingebruikname, moet snel, of kan wachten.

Sluit af met één oordeel: is deze keten vandaag productiewaardig, en zo nee, wat is de kortste weg
ernaartoe. Zet erbij wat je niet hebt kunnen onderzoeken en waarom, zodat niemand een gat voor een
groen vinkje aanziet.
