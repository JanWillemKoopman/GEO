/** Teksten van het cluster "Wedstrijdschoenen en racen". Zie `index.ts`. Geen exacte data van evenementen: die verschillen per jaar. */
import type { DemoTekst } from "@/lib/demo/runx/teksten/type";

const t = (metaTitel: string, metaBeschrijving: string, tekst: string, faq: DemoTekst["faq"]): DemoTekst => ({ metaTitel, metaBeschrijving, tekst, faq });

export const WEDSTRIJD: Record<string, DemoTekst> = {
  "midwinter-marathon": t(
    "De Midwinter Marathon lopen: voorbereiding, schoenen en kleding",
    "Je voorbereiden op de Midwinter Marathon in Apeldoorn: het parcours, trainen in de winter, de juiste schoenen en kleding, en de laatste week.",
    `De Midwinter Marathon in Apeldoorn is elk jaar in februari een van de mooiste lopen van Nederland. Een parcours over de Veluwe, in de winter, met afstanden van een paar kilometer tot de hele marathon. Juist dat winterse maakt de voorbereiding anders dan voor een loop in het voorjaar.

## Het parcours

Je loopt door Apeldoorn en over de Veluwe, met glooiingen die je in de rest van Nederland niet tegenkomt. Niet zwaar voor een trailloper, maar wel voelbaar in de laatste kilometers. Het weer is elk jaar een verrassing: van zachte motregen tot vorst, sneeuw en wind.

## Trainen in de winter

1. **Begin op tijd.** Voor de hele marathon heb je minstens vier maanden nodig, voor de halve twee tot drie. De voorbereiding begint dus in de herfst.
2. **Train op glooiingen.** Neem een deel van je duurlopen naar Berg en Bos of de Veluwezoom.
3. **Loop in het donker.** Met verlichting en reflectie, en liefst op bekende routes.
4. **Doe intervallen op een veilige plek.** Op een gladde weg is snelheid gevaarlijk. Een atletiekbaan of loopband is dan beter.
5. **Train samen.** Vanuit RunX Apeldoorn traint in de aanloop een loopgroep. Lange duurlopen in januari gaan samen een stuk makkelijker.

## Welke schoenen?

Bij een wintermarathon tellen grip en demping meer dan een paar seconden winst. Natte bladeren, plassen en soms sneeuw vragen om een zool die houvast geeft. Veel lopers kiezen daarom voor hun vertrouwde trainingsschoen, of een snellere schoen met goede grip. Een carbon wedstrijdschoen kan, maar test hem dan op een natte dag voordat je ermee aan de start staat.

Neem je wedstrijdschoen minstens drie weken van tevoren in gebruik, en loop er een paar tempotrainingen en één lange duurloop op.

## Welke kleding?

- **Een basislaag** die vocht afvoert.
- **Een licht windjack** dat je kunt uittrekken en om je middel kunt binden.
- **Een tight of driekwart**, afhankelijk van de temperatuur.
- **Handschoenen en een buff**: die kun je onderweg afdoen en in je zak stoppen.
- **Een oud shirt over alles heen** bij de start, dat je weggooit als je warm bent.

Kleed je alsof het tien graden warmer is. Bij de start heb je het koud, na drie kilometer niet meer.

## Voeding en drinken

Ook in de kou verlies je vocht. Drink bij de posten, en oefen in je lange duurlopen met de gels die je wilt gebruiken. Neem in de winter je gels mee in een binnenzak: koude gels worden stroperig.

## De laatste week

- Minder kilometers, wel een paar korte versnellingen.
- Niets nieuws: geen nieuwe schoenen, geen nieuwe kleding.
- Leg je spullen de avond van tevoren klaar, en kijk naar het weerbericht.

## Op de dag zelf

RunX staat met een stand bij de start. Kom gerust langs voor een laatste vraag, of om je veters te laten dubbel knopen.`,
    [
      { q: "Wanneer is de Midwinter Marathon?", a: "Elk jaar in februari, in Apeldoorn. Kijk voor de exacte datum op de site van de organisatie." },
      { q: "Welke schoenen draag ik bij de Midwinter Marathon?", a: "Een schoen met goede grip en demping. Een carbon schoen kan, maar test hem eerst op een natte dag." },
      { q: "Is er een loopgroep voor de Midwinter Marathon?", a: "Ja, vanuit RunX Apeldoorn traint in de aanloop een loopgroep." },
      { q: "Is RunX bij de Midwinter Marathon?", a: "Ja, met een stand bij de start." },
    ],
  ),

  "carbon-wedstrijdschoen": t(
    "Wanneer kies je een carbon wedstrijdschoen?",
    "Een carbon wedstrijdschoen: voor wie hij zinvol is, bij welk tempo je er iets aan hebt, en hoe je hem kiest en inloopt.",
    `Carbon schoenen zijn de grootste verandering in het hardlopen van de afgelopen jaren. Bijna elk merk heeft er een. Maar heb jij er een nodig?

## Wat is een carbon wedstrijdschoen?

Een lichte schoen met een veerkrachtig schuim en een stijve plaat van koolstofvezel in de zool. Samen geven ze bij elke pas wat energie terug, en houden ze je benen langer fris.

## Wanneer heb je er iets aan?

1. **Bij een stevig tempo.** De plaat werkt het best als je snel afzet. Onder een tempo van ongeveer zes minuten per kilometer merk je er weinig van.
2. **Bij lange afstanden.** Op een halve of hele marathon zijn je benen aan het eind minder kapot.
3. **Bij een doel.** Loop je voor een tijd, dan is het verschil het grootst.

## Wanneer niet?

- **Bij rustige duurlopen.** Daar heb je meer aan een comfortabele trainingsschoen.
- **Als je net begint.** Je benen moeten eerst wennen aan het lopen zelf.
- **Bij instabiele enkels.** Carbon schoenen zijn hoog en smal. Wie veel steun nodig heeft, voelt zich er vaak onzeker op.

## Hoe kies je?

| Wat je zoekt | Waar je op let |
|---|---|
| Maximale snelheid | Veel schuim, een agressieve rocker, laag gewicht |
| Stabiliteit op de marathon | Een bredere zool en iets minder agressief |
| Gevoel voor de grond | Een lagere zool |

Bekende modellen zijn de Saucony Endorphin Elite, de Asics Metaspeed, de Adidas Adios Pro en de Hoka Rocket X. Ze lopen allemaal anders.

## Inlopen

Neem een carbon schoen minstens drie weken voor je wedstrijd in gebruik. Loop er een paar tempotrainingen en een deel van een lange duurloop op. Zo weet je of hij goed zit, en wennen je kuiten aan het andere gevoel.

## Een tweede schoen

Veel lopers gebruiken een carbon schoen alleen voor wedstrijden en snelle trainingen, en een gewone trainingsschoen voor de rest. Zo gaat hij langer mee.

## Passen

In de winkel kun je verschillende carbon schoenen passen en op de band uitproberen. Het team in Zaandam bestaat voor een deel uit wedstrijdlopers en weet hoe deze schoenen aanvoelen na twintig kilometer.`,
    [
      { q: "Is een carbon schoen zinvol voor een recreatieve loper?", a: "Vooral als je op een stevig tempo een wedstrijd loopt. Onder ongeveer zes minuten per kilometer merk je er weinig van." },
      { q: "Hoe lang van tevoren koop ik een wedstrijdschoen?", a: "Minstens drie weken, zodat je hem kunt inlopen." },
      { q: "Kan ik carbon schoenen passen in de winkel?", a: "Ja, en je kunt ze op de band uitproberen." },
    ],
  ),

  "carbon-plaat": t(
    "Wat doet een carbon plaat in een hardloopschoen?",
    "Hoe een carbon plaat in een hardloopschoen werkt, wat het schuim eromheen doet en waarom het samen sneller voelt.",
    `## De plaat

Een dunne, stijve plaat van koolstofvezel, verwerkt in het schuim van de zool. Hij loopt meestal van de hiel tot de tenen, en is gebogen.

## Wat doet hij?

- **Stijfheid.** Je voet buigt minder, waardoor je makkelijker afrolt.
- **Een rocker-effect.** Door de vorm rol je soepel van landing naar afzet.
- **Stabiliteit** aan het zachte schuim eromheen.

## Het schuim doet het meeste

Het veerkrachtige schuim geeft energie terug. De plaat zorgt dat dat schuim efficiënt werkt.

## Voor wie?

Voor lopers die op een stevig tempo een wedstrijd willen lopen. Bij rustige loopjes merk je er weinig van.`,
    [{ q: "Maakt een carbon plaat je sneller?", a: "Samen met het veerkrachtige schuim helpt hij vooral bij een stevig tempo. Bij rustig lopen merk je weinig verschil." }],
  ),

  "wedstrijdschoen-inlopen": t(
    "Een wedstrijdschoen inlopen: zo doe je het",
    "Hoe je een nieuwe wedstrijdschoen inloopt: hoe lang van tevoren, welke trainingen en wat je in de laatste week niet meer doet.",
    `Nooit nieuwe schoenen op de wedstrijddag. Zo loop je een wedstrijdschoen goed in.

## Drie weken van tevoren

Koop hem minstens drie weken voor je wedstrijd.

## Eerst kort

Loop er een rustig loopje van vijf kilometer op. Let op drukplekken.

## Dan tempo

Gebruik hem bij een tempotraining of intervallen. Zo voel je hoe hij werkt op wedstrijdtempo.

## Eén langere test

Loop een deel van een lange duurloop op wedstrijdtempo. Dan weet je hoe je benen zich voelen na vijftien kilometer.

## De laatste week

Niet meer gebruiken, behalve misschien een korte loop met versnellingen. Bewaar de rest voor de wedstrijd.

## Sokken en veters

Loop in met de sokken die je op de wedstrijd draagt, en zet de veters vast zoals je ze wilt hebben.`,
    [{ q: "Hoeveel kilometer loop ik een wedstrijdschoen in?", a: "Twee tot drie trainingen, samen zo'n twintig tot dertig kilometer, is meestal genoeg." }],
  ),

  "eerste-halve-marathon": t(
    "Zandvoort en de voorjaarslopen: je eerste halve marathon",
    "Je eerste halve marathon lopen in het voorjaar: een loop kiezen, je voorbereiding en wat je op de dag zelf doet.",
    `Het voorjaar is het moment voor je eerste halve marathon. In Noord-Holland is de Circuit Run in Zandvoort voor veel lopers een mooie eerste stap: een korte afstand op het circuit, of een langere route langs de kust.

## Kies je loop

- **Een vlak parcours** voor je eerste keer.
- **Niet te groot**, of juist groot als je van sfeer houdt.
- **Dichtbij huis**, dan train je op de routes waar je ook loopt.

## Je voorbereiding

Reken op twaalf weken, als je al tien kilometer kunt lopen. Elke week één lange duurloop die langzaam groeit naar achttien kilometer.

## Je tempo

Loop je eerste halve marathon rustig. Uitlopen is het doel, de tijd komt de volgende keer.

## Je schoenen

Je vertrouwde trainingsschoen is prima. Laat hem nakijken als hij al veel kilometers heeft.

## Op de dag zelf

- Ontbijt zoals je dat voor je lange duurlopen deed.
- Begin rustig.
- Drink bij de posten.`,
    [{ q: "Hoe lang train ik voor mijn eerste halve marathon?", a: "Ongeveer twaalf weken, als je al tien kilometer kunt lopen." }],
  ),

  "wedstrijdtempo-halve": t(
    "Je wedstrijdtempo bepalen voor een halve marathon",
    "Hoe bepaal je je wedstrijdtempo voor een halve marathon? Vanuit je tien kilometer, je trainingen en je gevoel.",
    `## Vanuit je tien kilometer

Een veelgebruikte schatting: je halve marathon loop je ongeveer vijftien tot twintig seconden per kilometer langzamer dan je tien kilometer.

## Vanuit je trainingen

Kun je tien tot twaalf kilometer op een bepaald tempo ontspannen volhouden, dan is dat een goede richting.

## Vanuit je gevoel

Wedstrijdtempo voelt de eerste helft "stevig maar beheersbaar". Kun je nog korte zinnen zeggen, dan zit je goed.

## Begin rustig

De eerste kilometers liever vijf seconden te langzaam dan te snel. Wie te snel begint, betaalt na vijftien kilometer.

## Een horloge helpt

Met een sporthorloge houd je je tempo in de gaten. Kijk wel ook naar je gevoel: wind, warmte en hoogteverschil maken een tempo zwaarder.`,
    [{ q: "Hoe bereken ik mijn tempo voor een halve marathon?", a: "Een schatting: vijftien tot twintig seconden per kilometer langzamer dan je tien kilometer." }],
  ),

  "enschede-marathon": t(
    "Je marathon in Enschede: de laatste vier weken",
    "De laatste vier weken voor de Enschede Marathon: je langste duurloop, taperen, voeding en de dag zelf.",
    `De Enschede Marathon is een van de oudste marathons van Nederland. De laatste vier weken bepalen hoe je aan de start staat.

## Week 4: je laatste lange duurloop

Je langste loop, meestal tussen de dertig en vijfendertig kilometer. Rustig, en oefen met je wedstrijdvoeding.

## Week 3: nog één keer stevig

Een tempotraining en een lange loop van rond de vijfentwintig kilometer.

## Week 2: minder

Je kilometers gaan omlaag. Houd wel wat korte versnellingen.

## Week 1: rust

Weinig lopen, veel slapen, goed eten. Leg je spullen klaar.

## Schoenen

Je wedstrijdschoen is ingelopen. Twijfel je, dan kun je bij RunX Twente aan de Kuipersdijk nog een laatste vraag stellen.

## De dag zelf

Begin rustig, drink bij elke post en neem je gels op de momenten die je hebt geoefend.`,
    [{ q: "Wanneer loop ik mijn laatste lange duurloop voor een marathon?", a: "Meestal drie tot vier weken voor de wedstrijd." }],
  ),

  "energiegels-marathon": t(
    "Energiegels tijdens een marathon: hoeveel en wanneer",
    "Hoeveel energiegels heb je nodig tijdens een marathon, wanneer neem je ze en waarom je ze vooraf test.",
    `## Waarom gels?

Na ongeveer anderhalf uur raken je koolhydraatvoorraden op. Gels vullen ze aan.

## Hoeveel?

Een veelgebruikte richtlijn is één gel per dertig tot vijfenveertig minuten, vanaf ongeveer het eerste halfuur. Bij een marathon zijn dat er voor de meeste lopers vier tot zes. Lees de verpakking: de hoeveelheid koolhydraten verschilt per gel.

## Met water

De meeste gels neem je met een paar slokken water.

## Test ze

Probeer gels altijd uit tijdens je lange duurlopen. Niet elke maag verdraagt elke gel.

## Merken

In de RunX-winkels vind je onder meer gels van Maurten, SiS en Torq. Probeer er een paar, en kies wat je maag het best verdraagt.`,
    [{ q: "Hoeveel gels neem ik tijdens een marathon?", a: "Voor de meeste lopers vier tot zes, ongeveer één per dertig tot vijfenveertig minuten. Test ze eerst in je trainingen." }],
  ),

  taperen: t(
    "Taperen: minder trainen voor een betere wedstrijd",
    "Taperen uitgelegd: waarom je voor een wedstrijd minder traint, hoe lang en hoeveel.",
    `## Wat is taperen?

De laatste weken voor een wedstrijd train je minder. Je lichaam herstelt van alle training, en staat fris aan de start.

## Hoe lang?

- Tien kilometer: een week.
- Halve marathon: tien dagen tot twee weken.
- Marathon: twee tot drie weken.

## Hoeveel minder?

Je kilometers gaan stap voor stap omlaag, naar ongeveer de helft in de laatste week. Houd wel korte versnellingen: dan blijven je benen scherp.

## Wat je voelt

Veel lopers voelen zich tijdens het taperen onrustig of zwaar. Dat is normaal. Op de wedstrijddag ben je fris.`,
    [{ q: "Hoe lang taper ik voor een marathon?", a: "Twee tot drie weken, met de kilometers stap voor stap omlaag." }],
  ),

  "endorphin-of-adios-pro": t(
    "Saucony Endorphin Elite of Adidas Adios Pro?",
    "Twee carbon wedstrijdschoenen naast elkaar: de Saucony Endorphin Elite en de Adidas Adios Pro. Hoe ze lopen en voor wie ze passen.",
    `Twee snelle schoenen met een plaat, allebei gemaakt voor de wedstrijd. Toch voelen ze anders.

## Saucony Endorphin Elite

- **Veel veerkracht** en een uitgesproken rocker.
- **Licht en agressief.**
- **Past bij** lopers die snel willen afzetten en van een levendig gevoel houden.

## Adidas Adios Pro

- **Een stevigere basis**, met staafjes in plaats van één plaat.
- **Voelt stabieler** voor veel lopers.
- **Past bij** lopers die over de hele marathon een rustig, betrouwbaar gevoel willen.

## Welke kies je?

Levendig en agressief: de Endorphin. Rustig en stabiel: de Adios Pro. Maar ook hier beslist het passen.

## Inlopen

Welke je ook kiest: minstens drie weken voor je wedstrijd in gebruik nemen.`,
    [{ q: "Welke is stabieler: Endorphin Elite of Adios Pro?", a: "De meeste lopers ervaren de Adios Pro als stabieler, de Endorphin Elite als levendiger." }],
  ),

  "avond-voor-de-wedstrijd": t(
    "Wat eet je de avond voor een halve marathon?",
    "De avond voor een halve marathon: wat je eet, hoeveel en wat je beter laat staan.",
    `## Koolhydraten, maar niet te veel

Een normale maaltijd met wat meer koolhydraten: pasta, rijst of aardappelen. Niet zo veel dat je met een vol gevoel naar bed gaat.

## Bekend eten

Eet wat je kent. De avond voor een wedstrijd is geen moment om iets nieuws te proberen.

## Laat staan

- Zware, vette maaltijden.
- Veel vezels of peulvruchten.
- Alcohol.

## Drinken

Drink gewoon voldoende water, verspreid over de dag.

## Het ontbijt

Eet twee tot drie uur voor de start, wat je ook voor je lange duurlopen at.`,
    [{ q: "Wat eet ik de avond voor een halve marathon?", a: "Een normale maaltijd met wat meer koolhydraten, en vooral wat je kent." }],
  ),

  "metaspeed-sky-of-edge": t(
    "Asics Metaspeed Sky of Edge: wat is het verschil?",
    "De Asics Metaspeed Sky en Edge naast elkaar: twee versies van dezelfde wedstrijdschoen, voor twee soorten lopers.",
    `Asics maakt zijn wedstrijdschoen in twee versies. Het verschil zit in hoe je loopt.

## Metaspeed Sky

Voor lopers die vooral **langere passen** maken als ze sneller gaan. Meer schuim, en een plaat die daarop is afgestemd.

## Metaspeed Edge

Voor lopers die vooral **sneller stappen** als ze versnellen: een hogere cadans. Een iets andere vorm van zool en plaat.

## Hoe weet je wat jij doet?

Kijk op je horloge: gaat bij een hoger tempo vooral je paslengte omhoog, of je cadans? Of laat het zien bij een loopanalyse in de winkel.

## Pas ze allebei

Ook hier geldt: het gevoel beslist.`,
    [{ q: "Wat is het verschil tussen de Metaspeed Sky en Edge?", a: "De Sky is gemaakt voor lopers die langere passen maken als ze versnellen, de Edge voor lopers die vooral sneller stappen." }],
  ),

  "supershoe-of-tempo": t(
    "Supershoe of tempo schoen voor een halve marathon?",
    "Een carbon supershoe of een lichtere tempo schoen zonder plaat voor je halve marathon: wat past bij jouw tempo en doel?",
    `## Supershoe

Veel schuim en een carbon plaat. Het snelst bij een stevig tempo, en je benen blijven frisser.

## Tempo schoen

Licht en responsief, zonder of met een flexibele plaat. Veelzijdiger: je kunt hem ook gebruiken voor tempotrainingen en kortere wedstrijden.

## Wat kies je?

- **Loop je op een stevig tempo, voor een tijd:** een supershoe.
- **Loop je rustiger, of wil je één snelle schoen voor alles:** een tempo schoen.
- **Heb je veel steun nodig:** een tempo schoen voelt vaak stabieler.

## Probeer ze

In de winkel kun je beide soorten passen.`,
    [{ q: "Heb ik een supershoe nodig voor een halve marathon?", a: "Vooral als je op een stevig tempo voor een tijd loopt. Anders is een lichte tempo schoen een veelzijdige keuze." }],
  ),

  "hardlopen-en-drinken": t(
    "Hardlopen en drinken: hoeveel, wanneer en wat",
    "Hoeveel moet je drinken bij het hardlopen? Voor, tijdens en na een loop, en wanneer sportdrank zinvol is.",
    `## Voor je loopt

Drink gewoon voldoende verspreid over de dag. Een glas water een uur voor je loopt is genoeg.

## Tijdens het lopen

- **Korter dan een uur:** meestal niets nodig, behalve bij warm weer.
- **Langer dan een uur:** neem water mee of plan een route langs een kraan.
- **Bij warmte of veel zweten:** sportdrank met zout.

## Na het lopen

Drink rustig bij. Je urine is een goede graadmeter: lichtgeel is goed.

## Niet te veel

Ook te veel drinken kan problemen geven. Drink op je dorst.

## Meenemen

Een heuptas met een bidon, of een loopvest bij langere lopen. In de winkel vind je beide.`,
    [{ q: "Moet ik drinken tijdens het hardlopen?", a: "Bij lopen korter dan een uur meestal niet. Bij langere lopen of warmte wel." }],
  ),

  "dam-tot-damloop": t(
    "Trainen voor de Dam tot Damloop",
    "Je voorbereiden op de Dam tot Damloop van Amsterdam naar Zaandam: de afstand, de IJtunnel en de finish in Zaandam.",
    `De Dam tot Damloop gaat van Amsterdam naar Zaandam, met de IJtunnel als bekende klim en een finish in het centrum van Zaandam. Voor veel lopers in Noord-Holland het doel van het jaar.

## De afstand

Tien Engelse mijl, ongeveer zestien kilometer. Langer dan een tien kilometer, korter dan een halve marathon.

## Je voorbereiding

- Kun je tien kilometer lopen, reken dan op acht tot tien weken.
- Eén lange duurloop per week die groeit naar zestien tot achttien kilometer.
- Een paar keer een heuvel op lopen, voor de IJtunnel.

## De IJtunnel

Na de start loop je de tunnel in, en aan de overkant weer omhoog. Begin rustig: wie te snel de tunnel uit komt, betaalt dat later.

## De laatste week

Rust, korte versnellingen en niets nieuws.

## In Zaandam

RunX Zaandam aan de Gedempte Gracht ligt in de buurt van de finish. In de weken ervoor kun je er terecht voor schoenen en advies van een team dat de loop zelf kent.`,
    [
      { q: "Hoe lang is de Dam tot Damloop?", a: "Tien Engelse mijl, ongeveer zestien kilometer." },
      { q: "Waar finisht de Dam tot Damloop?", a: "In Zaandam." },
    ],
  ),

  "tien-engelse-mijl": t(
    "Tien Engelse mijl lopen: schema en wedstrijdtempo",
    "Tien Engelse mijl (ongeveer zestien kilometer) lopen: een schema van acht weken en hoe je je tempo kiest.",
    `Tien Engelse mijl is een mooie afstand: langer dan tien kilometer, nog niet zo zwaar als een halve marathon. De Dam tot Damloop en de Tilburg Ten Miles zijn bekende voorbeelden.

## Een schema van acht weken

| Week | Lange duurloop | Andere trainingen |
|---|---|---|
| 1 | 10 km | 2 × rustig 6 km |
| 2 | 11 km | rustig + 5 × 3 min stevig |
| 3 | 12 km | rustig + heuvels |
| 4 | 10 km (rustweek) | 2 × rustig |
| 5 | 13 km | rustig + 4 × 5 min stevig |
| 6 | 15 km | rustig + tempo 20 min |
| 7 | 12 km | rustig + korte versnellingen |
| 8 | wedstrijd | 2 × kort en rustig |

## Je tempo

Ongeveer tien seconden per kilometer langzamer dan je tien kilometer. Begin rustig en versnel als je je goed voelt.

## Schoenen

Je vertrouwde schoen, of een snellere die je hebt ingelopen.`,
    [{ q: "Hoe lang is tien Engelse mijl?", a: "Ongeveer zestien kilometer." }],
  ),

  "herstel-dam-tot-dam": t(
    "Na de Dam tot Damloop: herstel in de eerste week",
    "Herstellen na de Dam tot Damloop: wat je de eerste dagen doet en wanneer je weer gaat lopen.",
    `Je hebt de Dam tot Damloop gelopen. Gefeliciteerd! Nu het herstel.

## Dag 1 en 2

Wandel, eet goed en drink voldoende. Stijve benen zijn normaal.

## Dag 3 tot 5

Een kort, rustig loopje of fietsen. Je merkt vanzelf of je benen al willen.

## Rest van de week

Weer rustig lopen, zonder tempo.

## Wat helpt?

- Compressiekousen voelen voor veel lopers prettig.
- Foamrollen, rustig.
- Slapen.

## Een volgend doel?

Gebruik het najaar voor een tien kilometer of een halve marathon, of kies een doel voor het voorjaar.`,
    [{ q: "Wanneer kan ik weer lopen na de Dam tot Damloop?", a: "Na een paar dagen een kort, rustig loopje, daarna rustig weer opbouwen." }],
  ),

  "tilburg-ten-miles": t(
    "Tilburg Ten Miles: snel parcours of niet?",
    "De Tilburg Ten Miles: wat het parcours snel maakt, waar je op let en hoe je je voorbereidt.",
    `De Tilburg Ten Miles trekt elk jaar in september duizenden lopers. Is het een snelle loop?

## Het parcours

Vlak en door de stad, zonder grote klimmen. Dat maakt het geschikt voor een snelle tijd.

## Waar let je op?

- **Het weer.** September kan warm zijn. Begin dan rustiger.
- **De drukte.** In de eerste kilometers is het vol. Laat je niet meeslepen.
- **De bochten** in de stad: neem ze ruim.

## Je voorbereiding

Acht weken met een lange duurloop die groeit naar zestien kilometer, plus tempotrainingen.

## Schoenen

Een vlak parcours is een goed moment voor een snellere schoen, als je hem hebt ingelopen. Bij RunX Tilburg aan de Schouwburgring kun je in de zomer een snellere schoen passen.`,
    [{ q: "Is de Tilburg Ten Miles een snel parcours?", a: "Ja, het is vlak en gaat door de stad. Let wel op het weer en de drukte bij de start." }],
  ),

  "4-mijl-van-groningen": t(
    "De 4 Mijl van Groningen: zo loop je hem snel en blessurevrij",
    "De 4 Mijl van Groningen: de afstand, het parcours, je voorbereiding en hoe je hem snel en blessurevrij loopt.",
    `De 4 Mijl van Groningen is een van de grootste lopen van het noorden, en voor veel Groningers het hoogtepunt van het najaar.

## De afstand

Vier Engelse mijl, ongeveer 6,4 kilometer. Kort genoeg om voluit te gaan, lang genoeg om het tempo te moeten verdelen.

## Je voorbereiding

- Kun je vijf kilometer lopen, dan is de afstand goed te doen.
- Wil je snel zijn: één intervaltraining per week, bijvoorbeeld 5 × 1 kilometer op wedstrijdtempo.
- Train een keer op het parcours, of op een vergelijkbare route door de stad.

## Je tempo

Begin niet te snel in de drukte. De eerste kilometer liever iets te rustig, dan versnellen.

## Blessurevrij

- Bouw je snelheid rustig op in de weken ervoor.
- Warm goed op, zeker als het koud is.
- Loop niets nieuws op de dag zelf.

## Schoenen

Een lichte, snelle schoen kan helpen, als je hem hebt ingelopen. Bij RunX Groningen aan het Hoornsediep kun je ze passen op een van de vijf testbanen.

## Op de dag

RunX Groningen staat met een stand in de stad, en in de week ervoor is er een uitlooprondje vanuit de winkel.`,
    [
      { q: "Hoe lang is de 4 Mijl van Groningen?", a: "Vier Engelse mijl, ongeveer 6,4 kilometer." },
      { q: "Is RunX bij de 4 Mijl van Groningen?", a: "Ja, met een stand in de stad, en de week ervoor is er een uitlooprondje vanuit de winkel." },
    ],
  ),

  "basis-voorjaarsmarathon": t(
    "Je basis opbouwen voor een voorjaarsmarathon",
    "Een voorjaarsmarathon begint in de winter: hoe je in november en december je basis opbouwt.",
    `Een marathon in april begint niet in februari, maar in november.

## Wat is een basis?

Veel rustige kilometers, zodat je lichaam gewend raakt aan de belasting. Daarop bouw je later tempo en lange duurlopen.

## November en december

- Drie tot vier keer per week rustig lopen.
- Eén duurloop per week die langzaam groeit.
- Twee keer per week krachttraining.

## Geen haast

Snelheid komt vanaf januari. Nu gaat het om regelmaat.

## Winterlopen

Kleding in lagen, verlichting en schoenen met grip. In de winkel vind je alles voor de donkere maanden.

## Een doel

De Enschede Marathon in het voorjaar, of een andere loop in je regio. Zet hem in je agenda, dan heb je een reden om ook in december te gaan.`,
    [{ q: "Wanneer begin ik met trainen voor een voorjaarsmarathon?", a: "Met een rustige basis in november en december, en het echte schema vanaf januari." }],
  ),

  "midwinter-voorbereiding": t(
    "Je voorbereiding op de Midwinter Marathon begint nu",
    "Wil je in februari de Midwinter Marathon lopen? Zo begin je in december met je voorbereiding.",
    `De Midwinter Marathon in februari lijkt ver weg. Maar wie de halve of hele afstand wil lopen, begint nu.

## December

- Drie tot vier keer per week lopen.
- Een duurloop die groeit naar vijftien kilometer voor de halve, of vijfentwintig voor de hele.
- Heuvels in Berg en Bos of op de Veluwezoom.

## Januari

- Je langste duurlopen.
- Een tempotraining per week.

## Februari

- Taperen in de laatste week of twee.
- Niets nieuws.

## Samen trainen

Vanuit RunX Apeldoorn traint in de aanloop een loopgroep. Samen gaan de lange duurlopen in het donker makkelijker.

## Schoenen met grip

Een wintermarathon vraagt om grip. Laat je schoenen nu nakijken, dan heb je nog tijd om nieuwe in te lopen.`,
    [{ q: "Wanneer begin ik met trainen voor de Midwinter Marathon?", a: "In december, als je de halve of hele afstand wilt lopen." }],
  ),
};
