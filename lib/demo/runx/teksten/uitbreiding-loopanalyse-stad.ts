/** Extra secties voor de clusters loopanalyse en stad. Zie `uitbreiden()` in `index.ts`. */
import type { Uitbreiding } from "@/lib/demo/runx/teksten/type";

export const UITBREIDING_LOOPANALYSE_STAD: Record<string, Uitbreiding> = {
  "loopanalyse-fysio-of-winkel": {
    tekst: `## Wat je bij elk van de twee kunt verwachten

| | Fysiotherapeut | Hardloopwinkel |
|---|---|---|
| Waarom je gaat | Een klacht | Nieuwe schoenen of twijfel over je schoenen |
| Waar wordt naar gekeken | Je lichaam: spieren, gewrichten, beweging | Je voet en je schoen: landing, afrol, afzet |
| Wat je meekrijgt | Een behandeling en oefeningen | Een schoen die past, met uitleg |
| Afspraak nodig | Meestal wel | Meestal niet |

## Een voorbeeld

Een loper krijgt na een paar maanden pijn aan de binnenkant van zijn knie. In de winkel blijkt dat zijn schoenen veel kilometers hebben en dat zijn voet flink naar binnen rolt. Hij kiest een stabielere schoen. De pijn wordt minder, maar verdwijnt niet helemaal. De fysiotherapeut ziet daarna dat zijn heupspieren zwak zijn, en geeft oefeningen. Samen lossen ze het op.`,
    faq: [{ q: "Moet ik voor een loopanalyse in de winkel een afspraak maken?", a: "Meestal niet: in alle RunX-winkels kun je binnenlopen." }],
  },
  "neutraal-of-stabiel": {
    tekst: `## Een snelle zelftest

Zet je oude hardloopschoenen op een tafel en kijk er van achteren naar.

- **Staan ze recht?** Dan rol je waarschijnlijk normaal af.
- **Zakken ze naar binnen?** Dan rol je vermoedelijk flink naar binnen.
- **Zakken ze naar buiten?** Dan land je meer op de buitenkant.

Kijk ook naar de zool: waar is hij het meest versleten? Het is een eerste aanwijzing, geen oordeel.

## Stabiel is niet hetzelfde als stijf

Moderne stabiele schoenen sturen minder hard bij dan vroeger. Veel merken werken met een bredere basis of steun aan beide kanten van de hiel, in plaats van een harde wig aan de binnenkant. Daardoor voelen ze minder als een correctie en meer als een rustige begeleiding.`,
  },
  overpronatie: {
    tekst: `## Overpronatie en vermoeidheid

Veel lopers proneren aan het begin van een loop normaal, en meer naarmate ze moe worden. Daarom loop je bij een loopanalyse een paar minuten, en niet een paar passen. Soms is het verschil pas zichtbaar na een paar minuten op tempo.

## Wat je zelf kunt trainen

Sterke voet-, kuit- en heupspieren houden je beenas beter op zijn plek. Drie eenvoudige oefeningen:

1. **Kuitheffen**, langzaam en gecontroleerd.
2. **Op één been staan**, bijvoorbeeld tijdens het tandenpoetsen.
3. **Een bruggetje op één been**, voor je bilspieren.`,
  },
  "afspraak-loopanalyse": {
    tekst: `## Wat er gebeurt als je binnenloopt

1. Iemand vraagt wat je zoekt en hoe je loopt.
2. Je trekt je huidige schoenen uit en loopt even op de band.
3. Je kijkt samen terug, en past daarna een paar schoenen.

Is het druk, dan krijg je te horen hoe lang het duurt, of je kunt een moment later terugkomen.

## De beste momenten

Doordeweeks overdag en vroeg in de avond is het meestal rustig. Op zaterdag en in januari, als veel mensen beginnen met hardlopen, is het drukker.`,
  },
  "hoeveel-demping": {
    tekst: `## Demping en tempo

Voor snelle trainingen kiezen veel lopers juist een lichtere schoen met iets minder demping: die voelt directer. Voor rustige duurlopen en herstelloopjes kiezen ze een schoen met meer demping. Wie twee paar heeft, verdeelt ze zo.

## Demping slijt

Het schuim verliest na verloop van tijd zijn veerkracht. Een schoen die in de winkel zacht voelde, kan na een jaar hard aanvoelen. Druk met je duim in de zijkant van de zool: zie je diepe vouwen, dan is de demping grotendeels op.`,
  },
  "online-of-winkel": {
    tekst: `## De echte kosten van een verkeerde schoen

Een schoen die niet past, kost meer dan het bedrag op de bon. Blaren, pijnlijke scheenbenen, een paar weken niet kunnen lopen: dat is waar de meeste beginners afhaken. Een goede eerste schoen is daarom de beste investering die je als loper doet.

## Wat je in de winkel ook nog vraagt

- Hoe strik ik mijn schoen zodat mijn hiel niet glijdt?
- Hoe vaak moet ik hem vervangen?
- Welke sokken passen erbij?

Vragen die een webshop niet beantwoordt.`,
  },
  "band-of-buiten": {
    tekst: `## Hoe je het meeste uit de analyse haalt

- **Loop op je gewone tempo**, niet sneller omdat er iemand kijkt.
- **Loop lang genoeg**, zodat je ontspant. De eerste minuut loopt bijna iedereen onnatuurlijk.
- **Draag de sokken waarin je loopt**, want die veranderen de pasvorm.

## Wat de band niet laat zien

Op de band loop je recht en vlak. Bochten, heuvels en een schuine weg zie je er niet. Vertel daarom waar je loopt, zodat het advies ook daarmee rekening houdt.`,
  },
  "kayano-of-adrenaline": {
    tekst: `## Wat ze gemeen hebben

Beide schoenen zijn gemaakt voor lopers die extra steun prettig vinden, beide hebben ruime demping en beide gaan bij normaal gebruik lang mee. Ze zijn allebei geschikt voor dagelijkse trainingen en voor lange duurlopen.

## Waar je het verschil voelt

Het verschil merk je vooral in de eerste stappen en aan het eind van een lange loop. De een voelt vol en beschermend, de ander iets lichter en vrijer. Welke "beter" is, hangt helemaal af van wat jij prettig vindt.`,
  },
  "hardloopschoenen-groningen": {
    tekst: `## Waarom een grote winkel handig is

Met een groot aanbod kun je verschillende merken en modellen naast elkaar passen. Twijfel je tussen neutraal en stabiel, of tussen een zachte en een directe schoen, dan loop je ze kort na elkaar op de testbaan. Het verschil voel je dan meteen.

## Voor elk seizoen

In het voorjaar zoeken lopers in Groningen vaak een schoen voor hun eerste halve marathon, in de zomer een lichtere voor de 4 Mijl, en in de winter grip en warmte. In de winkel ligt per seizoen wat erbij past, van windjacks tot verlichting.`,
  },
  "hardloopschoenen-tilburg": {
    tekst: `## Wat je meeneemt

Neem je huidige schoenen en de sokken waarin je loopt mee. Weet je voor welke loop je traint, vertel het: een schoen voor de Ten Miles is een andere keuze dan een schoen voor duurlopen in de Oisterwijkse bossen.

## Een tweede paar

Veel lopers uit Tilburg kiezen naast hun trainingsschoen een tweede paar: een snellere schoen voor tempotrainingen en wedstrijden, of een trailschoen voor de duinen. Elk paar gaat dan langer mee.`,
  },
  "hardloopschoenen-zaandam": {
    tekst: `## Wat Zaanse lopers vaak vragen

- **"Welke schoen voor de Dam tot Damloop?"** Meestal je vertrouwde trainingsschoen, of een snellere die je hebt ingelopen.
- **"Kan ik met één schoen alles?"** Voor de meeste recreanten wel.
- **"Wanneer moet ik nieuwe?"** Laat ze nakijken als ze ouder zijn dan een jaar of veel kilometers hebben.

## Na de aankoop

Merk je na de eerste loopjes dat er iets niet goed voelt, kom dan terug en vertel het. Een andere manier van strikken of een andere sok lost vaak al veel op.`,
  },
  "hardlooprondes-apeldoorn": {
    tekst: `## Welke ronde voor welke training?

| Training | Waar |
|---|---|
| Rustige duurloop | Langs het kanaal of de lanen rond Het Loo |
| Heuveltraining | Berg en Bos |
| Krachttraining | Op de heide, in het zand |
| Lange duurloop in het weekend | Richting de Veluwezoom |

## Lopen in het donker

In de winter is het in de bossen vroeg donker. Kies dan verlichte routes in de stad of langs het kanaal, en neem een lamp mee.`,
  },
  "hardlopen-in-groningen": {
    tekst: `## Groningen per seizoen

- **Voorjaar:** de eerste lange duurlopen naar het Paterswoldsemeer.
- **Zomer:** vroeg lopen in het Stadspark, als het nog koel is.
- **Herfst:** de voorbereiding op de 4 Mijl, en lopen tussen de vallende bladeren in het Noorderplantsoen.
- **Winter:** wind, regen en donker. Een windjack, verlichting en schoenen met grip.

## Samen lopen

In Groningen lopen veel groepen, van atletiekverenigingen tot groepen vanuit de winkel. In januari start er een beginnersgroep.`,
  },
  "duinroutes-haarlem": {
    tekst: `## Tips voor lopen in de duinen

1. **Loop op de paden.** De duinen zijn kwetsbaar.
2. **Houd rekening met wind.** Aan de kust waait het bijna altijd harder dan in de stad.
3. **Neem water mee bij lange lopen.** Er zijn weinig plekken om onderweg te drinken.
4. **Verwacht mul zand.** Maak dan kortere passen.

## Na regen

Na een flinke bui zijn de bospaden zacht en de schelpenpaden juist prettig hard. Kies je route op het weer.`,
  },
  "hardlopen-in-tilburg": {
    tekst: `## Welke route voor welk doel?

- **Snelheid:** de vlakke rondes in de Reeshof.
- **Duurloop:** de Oisterwijkse bossen en vennen.
- **Kracht:** het zand van de Loonse en Drunense Duinen.
- **Korte loop:** het Leijpark.

## Lopen met de groep

Vanuit RunX Tilburg loopt een groep op doordeweekse avonden, en op zaterdag een trailgroep in de duinen. Een goede manier om nieuwe routes te leren kennen.`,
  },
  "hardlooproutes-twente": {
    tekst: `## Heuvels trainen in Twente

Geen bergen, wel glooiingen. Een paar keer per maand een heuveltraining maakt je sterker en sneller op de vlakke weg:

1. Warm tien minuten rustig op.
2. Loop zes keer een helling van een minuut stevig op.
3. Wandel of jog rustig terug naar beneden.
4. Loop tien minuten rustig uit.

De Tankenberg en de Holterberg zijn hier ideaal voor.`,
  },
  "hardlopen-zaanstreek": {
    tekst: `## Lopen in de polder

De Zaanstreek is plat en open, en dat betekent wind. Loop de eerste helft tegen de wind in, dan heb je hem op de terugweg mee. In de winter maakt een windjack dat ademt een groot verschil.

## Rondes van vijf tot vijftien kilometer

- **Vijf kilometer:** een rondje langs de Zaan, over twee bruggen.
- **Tien kilometer:** langs de Zaanse Schans en terug door Wormerveer.
- **Vijftien kilometer:** door het Twiske en terug langs het water.`,
  },
  "loopgroep-apeldoorn": {
    tekst: `## Een week met de loopgroep

- **Een doordeweekse avond:** samen trainen vanuit de winkel, met tempo of heuvels.
- **Het weekend:** een lange duurloop, vaak op de Veluwe.
- **De andere dagen:** een rustig loopje op eigen gelegenheid.

## Ook voor de halve afstand

Je hoeft niet de hele marathon te lopen om mee te trainen. Veel lopers in de groep trainen voor de halve afstand of een kortere afstand.`,
  },
  "loopgroepen-haarlem": {
    tekst: `## Hoe een training verloopt

Je verzamelt bij de winkel, loopt samen in, en dan volgt een training op tempo of in de duinen. Na afloop is er tijd voor een vraag over schoenen of kleding. Er is altijd iemand die je tempo loopt.

## Wat neem je mee?

Je hardloopkleding, en in de winter verlichting en reflectie. In de duinen is een jas tegen de wind handig.`,
  },
  "hardloopwinkel-amsterdam-noord": {
    tekst: `## Combineer het met een loop

Veel lopers uit Noord fietsen naar Zaandam, passen hun schoenen en lopen daarna een rondje langs de Zaan. Of andersom: met de trein heen, en hardlopend via het Twiske terug.

## Wat je verder vindt

Naast schoenen ook kleding, horloges, voeding en compressie. En in de zomer advies voor de Dam tot Damloop, die in Zaandam finisht.`,
  },
  "lopen-apeldoorn": {
    tekst: `## Je eerste loop in Apeldoorn kiezen

- **Ben je beginner:** een korte afstand bij de Midwinter Marathon, of een vijf kilometer in de zomer.
- **Loop je al een tijd:** de halve marathon van de Midwinter.
- **Hou je van bos:** een trailloop op de Veluwe.

## Trainen voor een loop

Vanuit de winkel aan de Marktstraat traint in de winter een loopgroep voor de Midwinter Marathon. In het voorjaar en de zomer zijn er trailtrainingen.`,
  },
  "zomer-groningen": {
    tekst: `## Signalen dat het te warm is

Stop en zoek schaduw als je duizelig wordt, misselijk bent, hoofdpijn krijgt of ophoudt met zweten. Drink, koel af, en loop die dag niet meer.

## Trainen in de warmte

Je lichaam went in een week of twee aan warmte. Bouw rustig op, en verplaats in de heetste weken je snelle trainingen naar de vroege ochtend.`,
  },
  "zondag-haarlem": {
    tekst: `## Op zondag langs na de duinloop

Op zondagochtend loopt vanuit de winkel een duurloop in de duinen. Wie meeloopt en daarna nieuwe schoenen zoekt, kan direct door naar de winkel. Je schoenen zijn dan net gebruikt, en de slijtage is goed te zien.

## Wat je kunt regelen

Een loopanalyse, schoenen passen, kleding en compressie. Voor een loopanalyse hoef je geen afspraak te maken.`,
  },
  "loopgroepen-tilburg": {
    tekst: `## Voorbereiden op de Ten Miles

In de zomer traint een deel van de groep voor de Tilburg Ten Miles. De trainingen bouwen dan op naar zestien kilometer, met tempowerk op de vlakke rondes in de Reeshof.

## Ook in de winter

De groep loopt het hele jaar door. In de winter met verlichting en reflectie, en op verlichte routes.`,
  },
  "hardloopwinkel-zaanstreek": {
    tekst: `## Wat Zaanse lopers zoeken

- **Een schoen voor de rondjes langs de Zaan** en door het Twiske.
- **Een snellere schoen voor de Dam tot Damloop.**
- **Windjacks**, want in de polder waait het.
- **HYROX-schoenen**, sinds de trainingen in augustus begonnen.

## Een team dat de regio kent

Het team loopt zelf in de Zaanstreek, en kent de routes, de wind en de wedstrijden.`,
  },
};
