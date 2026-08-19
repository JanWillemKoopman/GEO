# Wat ik de afgelopen weken heb gebouwd

## Het probleem waar dit over gaat

Vroeger zocht iedereen via Google. Je typte "goede fysiotherapeut Tilburg" en je kreeg tien blauwe
links. Bedrijven besteedden daar jarenlang veel geld aan, want hoger in die lijst staan betekende
meer klanten.

Dat verandert nu razendsnel. Steeds meer mensen stellen die vraag gewoon aan ChatGPT. En ChatGPT
geeft geen tien links, maar één antwoord met drie namen erin. Sta je daar niet bij, dan besta je
voor die klant niet. Er is geen tweede pagina meer waar je nog gevonden kunt worden.

Het gekke is: bijna geen enkel bedrijf weet of het genoemd wordt. Ze kunnen het niet meten, want er
is geen lijstje meer om in te kijken. Ze weten niet waaróm de concurrent wel wordt genoemd. En ze
weten al helemaal niet wat ze eraan moeten doen.

Dat is precies het gat waar ik in ben gaan bouwen.

## Wat ik heb gemaakt

De app heet **ORBIT ENGINE**. Hij doet vijf dingen achter elkaar, en juist die volgorde is het hele
punt.

**1. Hij leert het bedrijf kennen.** Je vult drie dingen in: de bedrijfsnaam, de website en hoe de
naam nog meer geschreven wordt. Daarna gaat de app zelf aan het werk. Hij leest tot 150 pagina's van
de website, zoekt uit wat het bedrijf verkoopt, wie de concurrenten zijn, of de site technisch
toegankelijk is voor AI, en test wat ChatGPT nú al over dit bedrijf weet. Dat duurt zeven en een
halve minuut en kost ongeveer 25 dollarcent. Je mag je laptop dichtklappen, hij loopt door.

**2. Hij bedenkt de vragen.** De app stelt dertig realistische koopvragen op die echte klanten
zouden stellen. Niet "wat is fysiotherapie", maar de vragen waar geld achter zit. Je ziet elke vraag
en mag ze aanpassen voordat er ook maar iets gemeten wordt.

**3. Hij meet.** Alle dertig vragen worden echt aan een AI-assistent gesteld, mét live internet, net
zoals een klant het zou doen. Van elk antwoord wordt bijgehouden welke bedrijven genoemd worden en
in welke rol. Daar komt een cijfer uit, met een eerlijke foutmarge erbij. Plus: wie wint hier wel,
en waaróp.

**4. Hij schrijft de oplossing.** Op basis van de gaten die hij vindt, schrijft de app de pagina's
die het bedrijf mist. Compleet publicatieklaar. En hier zit iets waar ik best trots op ben: de app
mag niets verzinnen. Elke bewering over het bedrijf moet terug te voeren zijn op een feit dat
bevestigd is. Kan iets niet onderbouwd worden, dan gaat het de tekst niet in. Dat is de reden dat
een ondernemer zijn naam eronder durft te zetten.

**5. Hij bewijst of het gewerkt heeft.** Nadat de pagina online staat, meet de app na twee weken en
na vier weken opnieuw. En, dit is het slimme deel, hij meet niet alleen de vragen waarvoor je
publiceerde, maar ook een controlegroep van vragen waar je níets aan gedaan hebt. Zo weet je zeker
dat een stijging door jouw werk komt en niet doordat het toevallig een goede maand was. De uitkomst
klinkt als: "op de vragen waarvoor je publiceerde plus 18, op de rest plus 3."

Die laatste stap is waar bijna alle marketingtools stilvallen. Die laten je een mooi dashboard zien
en laten jou uitzoeken of het iets heeft opgeleverd. Deze app durft te zeggen dat het níet gewerkt
heeft, als het niet gewerkt heeft. Dat klinkt als een nadeel en het is het sterkste verkooppunt dat
er is.

## Hoeveel werk hier in zit

Eerlijk gezegd meer dan ik van tevoren had ingeschat.

- Zo'n **78.000 regels code**, verdeeld over ruim 500 bestanden.
- **34 schermen** in de app en **50 koppelingen** naar de achterkant.
- **65 stappen** waarmee de database is opgebouwd, allemaal netjes na elkaar en terug te draaien.
- Ruim **1.500 automatische controles** die na elke wijziging draaien en meteen roepen als ik per
  ongeluk iets sloop. Plus een tweede laag tests die de hele keten van begin tot eind naspeelt tegen
  een echte database.
- Ruim **80 losse onderdelen** die samen de motor vormen: van het uitlezen van een website tot het
  narekenen of een stijging statistisch gezien echt bestaat.
- En daarnaast een flinke stapel documentatie, zodat over drie maanden nog te achterhalen is waaróm
  een keuze zo gemaakt is, met de cijfers erbij die die keuze droegen.

Het meeste werk zat niet in "iets laten werken". Dat is het makkelijke deel. Het zat in ervoor
zorgen dat het altijd klopt. Een voorbeeld: ik had de AI de instructie gegeven om bij een bedrijf
dat niet genoemd werd geen rol in te vullen. Toch deed hij dat bij 10 van de 27 gevallen alsnog. Dus
staat er nu code omheen die dat hard afvangt. Dat patroon zit door de hele app: een instructie aan
de AI is een intentie, code is een garantie. En als de app iets niet zeker weet, zegt hij "onbekend"
in plaats van een gokje te doen dat er overtuigend uitziet.

## Waarom dit vooruitstrevend is

Dit vakgebied bestaat nog nauwelijks. Er is een handvol partijen wereldwijd dat meet of je genoemd
wordt in AI-antwoorden, en die stoppen daar ook. Ze verkopen een cijfer.

Deze app maakt de cirkel rond: meten, verklaren waarom, de oplossing schrijven, publiceren, en
opnieuw meten om te bewijzen dat het geholpen heeft. Voor zover ik kan overzien is er in Nederland
niemand die dat hele rondje aanbiedt. En het timing-argument is misschien nog belangrijker: over
twee jaar wil iedere ondernemer dit weten. Nu weet bijna niemand nog dát hij het moet weten.

Financieel is het bovendien mooi. Een volledige meetronde voor een klant kost me ongeveer 85
dollarcent aan AI-kosten. Voor een dienst waar een bedrijf makkelijk honderden euro's per maand voor
betaalt. De app draait volledig automatisch op de server, dus een tiende klant kost me niet tien
keer zoveel tijd als de eerste. Dat is precies het verschil tussen een adviesbureau en een product.

## Waar het naartoe gaat

Wat er nu staat is bewust smal gehouden: alleen zichtbaarheid in AI-antwoorden, voor het MKB, met
mijn hand er nog bij op de belangrijke momenten. Dat is een keuze, geen tekortkoming. Eerst iets dat
echt werkt voor een echte klant.

Daarna gaat het twee kanten op groeien. Ten eerste de klassieke Google-kant erbij, zodat het één
platform wordt voor alle manieren waarop je gevonden wordt. Ten tweede meer zelfstandigheid: dat het
systeem zelf kansen ontdekt, zelf besluit wat er moet gebeuren en het werk uitvoert, terwijl de mens
de richting bepaalt. Een groeimotor die altijd aan staat, in plaats van een tool die je moet
bedienen.

Twee dingen kan hij nu nog niet, en die noem ik er eerlijk bij: teksten worden nog met de hand op de
website van de klant gezet, want de directe koppeling met websitesystemen bestaat nog niet. En de
Google-kant is nog toekomst.

Maar het fundament staat, het draait live, en het doet echt wat het belooft.
