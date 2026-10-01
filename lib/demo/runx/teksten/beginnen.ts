/** Teksten van het cluster "Beginnen met hardlopen". Zie `index.ts` voor de afspraken. */
import type { DemoTekst } from "@/lib/demo/runx/teksten/type";

const groep = (stad: string, winkel: string, adres: string, extra: string): DemoTekst => ({
  metaTitel: `Beginnen met hardlopen in ${stad} | ${winkel}`,
  metaBeschrijving: `Beginnen met hardlopen in ${stad}: samen starten in een groep, goede eerste schoenen met een gratis loopanalyse bij ${winkel}.`,
  tekst: `Alleen beginnen met hardlopen lukt prima, maar samen houd je het langer vol. Wie in ${stad} wil starten, kan terecht bij ${winkel} aan de ${adres}.

## Waarom in een groep beginnen?

- **Je gaat ook als het regent.** Er wacht iemand op je.
- **Je loopt niet te snel.** Beginners lopen alleen vaak te hard, en raken dan buiten adem of geblesseerd. In een groep loop je in een tempo waarin je kunt praten.
- **Je leert van anderen.** Over schoenen, kleding, ademhaling en wat je doet bij spierpijn.

## Hoe het gaat

${extra}

Je begint met korte stukken hardlopen, afgewisseld met wandelen. Elke week wordt het hardloopstuk iets langer. Na acht tot tien weken loop je een halfuur achter elkaar.

## Je eerste schoenen

Een goede schoen is het belangrijkste wat je koopt. Niet de duurste, wel een die past bij hoe je loopt. Bij aanschaf van nieuwe hardloopschoenen is de loopanalyse in de winkel gratis: je loopt even op de band, en daarna pas je een paar schoenen.

## Wat heb je verder nodig?

Een sportshirt dat vocht afvoert, een korte broek of tight, en goede sokken. Meer is in het begin niet nodig.

## Aansluiten

Vraag in de winkel wanneer de volgende groep start. De meeste groepen beginnen in januari, en wie later instapt is ook welkom.`,
  faq: [
    { q: `Is er een beginnersgroep hardlopen in ${stad}?`, a: `Ja, vanuit ${winkel}. Vraag in de winkel wanneer de volgende groep start.` },
    { q: "Hoe lang duurt het voor ik een halfuur kan hardlopen?", a: "Met een rustige opbouw meestal acht tot tien weken, bij één tot drie keer per week lopen." },
  ],
});

export const BEGINNEN: Record<string, DemoTekst> = {
  "beginnen-in-januari": {
    metaTitel: "Beginnen met hardlopen: je plan voor januari",
    metaBeschrijving: "Wil je in januari beginnen met hardlopen? Zo bereid je je in december voor: schoenen, een haalbaar doel en een groep om mee te starten.",
    tekst: `Januari is de maand waarin het meeste mensen beginnen met hardlopen. En februari de maand waarin de meeste weer stoppen. Met een goede voorbereiding in december hoor jij bij de groep die doorgaat.

## 1. Kies een haalbaar doel

Niet "fitter worden", maar "over tien weken een halfuur kunnen hardlopen". Een concreet doel geeft je een reden om te gaan als het donker en koud is.

## 2. Regel je schoenen vóór je begint

Begin niet op oude sportschoenen. Een hardloopschoen die past bij hoe je loopt, voorkomt pijn in de eerste weken. Bij een loopanalyse in de winkel loop je even op de band en pas je een paar schoenen. De analyse is gratis bij aanschaf van nieuwe hardloopschoenen.

## 3. Zoek een groep of een maatje

Samen beginnen is de beste garantie om door te gaan. In Haarlem, Groningen, Apeldoorn en Tilburg starten in januari beginnersgroepen vanuit de RunX-winkels. In Twente en Zaandam kun je aansluiten bij een vaste groep.

## 4. Plan je loopjes in je agenda

Drie vaste momenten per week, net als een afspraak. Zo hoef je niet elke keer opnieuw te beslissen.

## 5. Begin rustig

De eerste weken wissel je hardlopen af met wandelen. Kun je niet meer praten, dan loop je te snel.`,
    faq: [
      { q: "Wat moet ik regelen voor ik in januari begin?", a: "Goede schoenen, een concreet doel, vaste momenten in je agenda en bij voorkeur een groep of maatje." },
    ],
  },

  "beginnen-met-hardlopen": {
    metaTitel: "Beginnen met hardlopen: je eerste acht weken",
    metaBeschrijving: "Beginnen met hardlopen in acht weken: een rustig schema van wandelen en hardlopen, wat je nodig hebt en hoe je het volhoudt.",
    tekst: `Je hebt nog nooit hardgelopen, of het is lang geleden. Dan is de verleiding groot om meteen een rondje van vijf kilometer te lopen. Doe dat niet. Met dit schema loop je over acht weken een halfuur achter elkaar, zonder dat je er na een week mee stopt.

## Het principe: afwisselen

Je begint met korte stukken hardlopen en wandelt daartussen. Elke week wordt het hardloopstuk iets langer en het wandelstuk korter. Je loopt drie keer per week, met altijd een rustdag ertussen.

## Het schema

| Week | Per training |
|---|---|
| 1 | 8 × 1 minuut hardlopen, 2 minuten wandelen |
| 2 | 6 × 2 minuten hardlopen, 2 minuten wandelen |
| 3 | 5 × 3 minuten hardlopen, 2 minuten wandelen |
| 4 | 4 × 5 minuten hardlopen, 2 minuten wandelen |
| 5 | 3 × 8 minuten hardlopen, 2 minuten wandelen |
| 6 | 2 × 12 minuten hardlopen, 2 minuten wandelen |
| 7 | 20 minuten hardlopen, 5 minuten wandelen, 5 minuten hardlopen |
| 8 | 30 minuten hardlopen |

Begin en eindig elke training met vijf minuten wandelen. Lukt een week niet, doe hem dan gewoon nog een keer. Dat is geen achteruitgang.

## Het tempo

Loop zo rustig dat je kunt praten. Voelt dat belachelijk langzaam, dan doe je het goed. Je conditie groeit door de tijd die je loopt, niet door de snelheid.

## Wat heb je nodig?

1. **Hardloopschoenen die passen.** Het belangrijkste. Bij RunX is de loopanalyse gratis als je nieuwe hardloopschoenen koopt.
2. **Kleding die vocht afvoert.** Geen katoen.
3. **Een horloge of app** om de minuten bij te houden. Een eenvoudige app is genoeg.

## Spierpijn en klachten

Spierpijn in de eerste weken is normaal. Pijn in een gewricht, of pijn die erger wordt tijdens het lopen, niet. Stop dan en laat het nakijken.

## Samen gaat het makkelijker

Vanuit de zes RunX-winkels lopen beginnersgroepen of vaste groepen waar je kunt aansluiten. Samen beginnen is de beste manier om na acht weken nog te lopen.`,
    faq: [
      { q: "Hoe vaak moet ik lopen als beginner?", a: "Drie keer per week, met altijd een rustdag ertussen." },
      { q: "Wat als ik een week niet haal?", a: "Doe die week dan nog een keer. Rustig opbouwen is belangrijker dan het schema precies volgen." },
      { q: "Heb ik dure schoenen nodig?", a: "Je hebt schoenen nodig die passen bij hoe je loopt. Dat is niet per se de duurste." },
    ],
  },

  "schoenen-voor-beginners": {
    metaTitel: "Hardloopschoenen voor beginners: waar let je op?",
    metaBeschrijving: "Je eerste hardloopschoenen kiezen: waar je op let, welke soorten er zijn en waarom een loopanalyse juist voor beginners zinvol is.",
    tekst: `Je eerste echte hardloopschoenen kopen voelt als een grote stap. De keuze is enorm, en elk merk zegt dat zijn schoen de beste is. Vier dingen om op te letten.

## 1. Pasvorm gaat voor alles

Een schoen moet passen: genoeg ruimte voor je tenen (ongeveer een duimbreedte), een hiel die niet wegglijdt, en geen drukplekken. Een schoen die niet goed zit, gaat in de eerste weken pijn doen.

## 2. Genoeg demping

Als beginner loop je rustig en vaak op asfalt. Een schoen met gemiddelde tot ruime demping is dan prettig. Voorbeelden zijn de Brooks Ghost, de Asics Novablast en de Hoka Clifton.

## 3. Neutraal of stabiel

De meeste beginners lopen goed op een neutrale schoen. Rolt je voet flink naar binnen, dan kan een stabiele schoen rustiger voelen. Dat zie je bij een loopanalyse op video.

## 4. Niet te licht, niet te snel

Lichte, snelle schoenen zijn voor tempotrainingen en wedstrijden. Als beginner heb je meer aan comfort en steun.

## Waarom een loopanalyse juist voor beginners?

Ervaren lopers weten welk model ze willen. Beginners niet. Bij een loopanalyse zie je hoe je loopt en pas je een paar schoenen achter elkaar. Bij RunX is de analyse gratis als je nieuwe hardloopschoenen koopt.`,
    faq: [
      { q: "Welke hardloopschoen is goed voor beginners?", a: "Een schoen met goede pasvorm en genoeg demping. Pas er een paar bij een loopanalyse en kies wat het best voelt." },
      { q: "Moet ik als beginner een halve maat groter kopen?", a: "Vaak wel: je voeten zetten uit tijdens het lopen. Zorg voor ongeveer een duimbreedte ruimte voor je tenen." },
    ],
  },

  "beginnersgroep-haarlem": groep("Haarlem", "RunX Haarlem", "Kruisstraat", "In januari start vanuit de winkel in de Kruisstraat een beginnersgroep. Jullie lopen samen een vaste avond per week, en krijgen een schema mee voor de andere dagen. Een deel van de trainingen gaat naar de Haarlemmerhout."),
  "beginnersgroep-groningen": groep("Groningen", "RunX Groningen", "Hoornsediep", "In januari start vanuit RunX Groningen een beginnersgroep. Jullie trainen een vaste avond per week, vaak in het Stadspark of in Kardinge, en krijgen een schema mee voor thuis."),
  "beginnersgroep-apeldoorn": groep("Apeldoorn", "RunX Apeldoorn", "Marktstraat", "In januari start vanuit de winkel aan de Marktstraat een beginnersgroep. De trainingen gaan vaak naar Berg en Bos, waar je op zachte paden loopt."),
  "beginnersgroep-tilburg": groep("Tilburg", "RunX Tilburg", "Schouwburgring", "In januari start vanuit RunX Tilburg een beginnersgroep. Jullie lopen in het Leijpark en de Reeshof, en krijgen een schema mee voor de andere dagen."),
  "beginnersgroep-twente": groep("Enschede", "RunX Twente", "Kuipersdijk", "In Twente loopt een vaste groep waar beginners kunnen aansluiten. Je loopt in je eigen tempo, en er is altijd iemand die met je meeloopt."),
  "beginnersgroep-zaandam": groep("Zaandam", "RunX Zaandam", "Gedempte Gracht", "In Zaandam loopt een vaste groep waar beginners kunnen aansluiten. De rondjes langs de Zaan zijn plat en goed te doen als je net begint."),

  "hoe-vaak-hardlopen": {
    metaTitel: "Hoe vaak per week hardlopen als beginner?",
    metaBeschrijving: "Hoe vaak per week moet je hardlopen als beginner? Waarom drie keer genoeg is en waarom rustdagen net zo belangrijk zijn als de loopjes.",
    tekst: `## Drie keer per week

Voor de meeste beginners is drie keer per week ideaal. Vaak genoeg om vooruit te gaan, en met genoeg rust ertussen om te herstellen.

## Waarom niet elke dag?

Je conditie groeit sneller dan je pezen en botten. Na twee weken voelt het misschien makkelijk, maar je lichaam is nog niet gewend aan de belasting. Wie te snel te vaak loopt, krijgt last van scheenbenen, knieën of achillespees.

## Rustdagen zijn trainingsdagen

Op een rustdag wordt je lichaam sterker. Wandelen, fietsen of zwemmen mag gerust: dat helpt juist.

## Twee keer is ook goed

Lukt drie keer niet, dan is twee keer per week ook prima. Je gaat iets langzamer vooruit, maar je blijft lopen.

## Wanneer meer?

Na een paar maanden, als je een halfuur ontspannen kunt lopen, kun je naar vier keer. Bouw dan steeds rustig op: niet meer dan een paar kilometer per week erbij.`,
    faq: [
      { q: "Kan ik als beginner elke dag hardlopen?", a: "Liever niet. Je pezen en botten hebben rust nodig om te wennen. Drie keer per week is een goede start." },
    ],
  },

  "buiten-adem": {
    metaTitel: "Waarom raak je zo snel buiten adem bij hardlopen?",
    metaBeschrijving: "Snel buiten adem bij het hardlopen? De meest voorkomende oorzaak is te snel lopen. Zo los je het op.",
    tekst: `## De meest voorkomende oorzaak: te snel

Bijna elke beginner loopt te snel. Je lichaam vraagt meer zuurstof dan je kunt aanvoeren, en na een paar minuten sta je te hijgen.

## De oplossing: praattempo

Loop zo rustig dat je in hele zinnen kunt praten. Lukt dat niet, ga dan langzamer of wandel even. Het voelt in het begin bijna te langzaam, maar zo bouw je conditie op.

## Andere oorzaken

- **Geen warming-up.** Begin altijd met vijf minuten wandelen.
- **Te veel ineens.** Wissel in het begin hardlopen en wandelen af.
- **Kou.** Koude lucht kan je adem stokken. Loop rustiger en adem door een buff als het vriest.

## Wanneer naar de huisarts?

Word je kortademig bij heel weinig inspanning, heb je pijn op de borst of word je duizelig, stop dan en laat het nakijken.

## Het wordt beter

Na een paar weken rustig lopen merk je dat hetzelfde tempo makkelijker gaat. Dat is je conditie die groeit.`,
    faq: [
      { q: "Hoe voorkom ik dat ik buiten adem raak?", a: "Loop in praattempo, begin met een warming-up en wissel in het begin hardlopen af met wandelen." },
    ],
  },

  "hardlopen-met-overgewicht": {
    metaTitel: "Hardlopen met overgewicht: verantwoord beginnen",
    metaBeschrijving: "Beginnen met hardlopen als je zwaarder bent: rustig opbouwen, wandelen en lopen afwisselen, en een schoen met genoeg demping.",
    tekst: `Hardlopen is voor iedereen, ook als je zwaarder bent. Het vraagt wel een rustigere opbouw, zodat je lichaam kan wennen.

## Begin met wandelen

Wandel de eerste weken stevig, drie keer per week een halfuur. Daarna wissel je wandelen af met korte stukjes hardlopen: een minuut lopen, twee minuten wandelen.

## Bouw langzaam op

Je gewrichten en pezen hebben tijd nodig. Neem liever twaalf weken dan acht om naar een halfuur hardlopen te gaan.

## De juiste schoen

Een schoen met ruime demping en een stabiele basis maakt een groot verschil. Bij een loopanalyse in de winkel kijk je hoe je loopt en pas je een paar schoenen die daarbij passen.

## Kies je ondergrond

Een bospad of gravelpad is zachter dan asfalt. Ideaal voor de eerste maanden.

## Overleg bij twijfel

Heb je klachten aan hart, longen of gewrichten, of twijfel je, ga dan eerst langs de huisarts.

## Samen gaat het beter

In een beginnersgroep loop je in je eigen tempo, en is er altijd iemand die met je meeloopt.`,
    faq: [
      { q: "Kan ik hardlopen met overgewicht?", a: "Ja, met een rustige opbouw en een schoen met genoeg demping. Bij twijfel eerst langs de huisarts." },
    ],
  },

  "wat-heb-je-nodig": {
    metaTitel: "Wat heb je echt nodig om te beginnen met hardlopen?",
    metaBeschrijving: "De korte lijst: wat je echt nodig hebt om te beginnen met hardlopen, en wat je beter nog even laat liggen.",
    tekst: `## Wat je echt nodig hebt

1. **Hardloopschoenen die passen.** Het enige waar je niet op moet bezuinigen.
2. **Een shirt dat vocht afvoert.** Katoen wordt nat en zwaar.
3. **Een korte broek of tight.**
4. **Goede sokken.** Naadloos en ademend, tegen blaren.

## Handig, maar niet nodig

- Een sporthorloge. Een app op je telefoon is in het begin genoeg.
- Een hardloopjas. Pas nodig als je in de herfst en winter doorgaat.
- Verlichting. Wel nodig als je in het donker loopt.

## Laat nog even liggen

Compressiekousen, energiegels, wedstrijdschoenen: allemaal voor later. Eerst lopen, dan aanvullen.

## Waar begin je?

Bij de schoenen. In de winkel loop je even op de band, en pas je een paar schoenen. De loopanalyse is gratis bij aanschaf van nieuwe hardloopschoenen.`,
    faq: [
      { q: "Heb ik een sporthorloge nodig om te beginnen?", a: "Nee, een app op je telefoon is in het begin genoeg." },
    ],
  },

  "hardloopapp-beginners": {
    metaTitel: "De beste hardloopapp voor beginners",
    metaBeschrijving: "Welke hardloopapp past bij een beginner? Waar je op let, en wanneer een groep of een horloge handiger is dan een app.",
    tekst: `Een app helpt je om het schema bij te houden en je vooruitgang te zien. Welke het best past, hangt af van wat je zoekt.

## Waar let je op?

- **Een beginnersschema.** Met afwisselend wandelen en hardlopen, en een stem die zegt wanneer je moet wisselen.
- **Eenvoud.** In het begin wil je niet tien schermen met grafieken.
- **Werkt het zonder abonnement?** Veel apps hebben een gratis basis.

## Soorten apps

1. **Schema-apps** begeleiden je van nul naar vijf kilometer, met een stem in je oor.
2. **Registratie-apps** zoals Strava houden bij wat je loopt, en laten je vergelijken met vrienden.
3. **Horloge-apps** van Garmin of Coros werken samen met je horloge.

## App of groep?

Een app geeft structuur, een groep geeft motivatie. Wie alleen met een app begint, stopt sneller. Veel beginners combineren het: een app voor het schema, en één keer per week in een groep.

## Later een horloge?

Ga je na een paar maanden vaker lopen, dan is een sporthorloge handig. In de winkel kun je verschillende modellen bekijken.`,
    faq: [
      { q: "Is een app genoeg om te beginnen met hardlopen?", a: "Voor het schema wel. Voor de motivatie helpt een groep of maatje." },
    ],
  },

  "van-vijf-naar-tien": {
    metaTitel: "Van vijf naar tien kilometer: de volgende stap",
    metaBeschrijving: "Je loopt vijf kilometer en wilt naar tien. Zo bouw je in acht tot tien weken rustig op, zonder blessures.",
    tekst: `Je loopt vijf kilometer zonder te stoppen. Gefeliciteerd! Tien kilometer is een mooi volgend doel.

## Hoe lang duurt het?

Reken op acht tot tien weken, bij drie keer per week lopen.

## Het principe

- **Eén langere loop per week.** Elke week een kilometer erbij.
- **Twee kortere loopjes** van vijf tot zes kilometer.
- **Om de drie weken een rustigere week**, waarin je minder loopt.

## Tempo

Loop de lange loop rustig, in praattempo. Snelheid komt later.

## Schoenen

Loop je meer, dan vraag je meer van je schoenen. Zijn ze ouder dan een jaar of hebben ze veel kilometers, laat ze dan nakijken.

## Een doel

Een loop van tien kilometer in je eigen regio is een mooie stok achter de deur. De Dam tot Damloop is iets langer, maar voor veel lopers in Noord-Holland het volgende doel.`,
    faq: [
      { q: "Hoe lang duurt het om van vijf naar tien kilometer te gaan?", a: "Meestal acht tot tien weken, bij drie keer per week lopen." },
    ],
  },

  "eerste-wedstrijd": {
    metaTitel: "Een eerste wedstrijd kiezen als beginner",
    metaBeschrijving: "Je eerste hardloopwedstrijd: welke afstand, welke loop, en hoe je je voorbereidt.",
    tekst: `Een wedstrijd geeft je training een doel. En de sfeer van je eerste loop vergeet je nooit.

## Welke afstand?

- **Vijf kilometer** als je net een halfuur kunt lopen.
- **Tien kilometer** als je een paar maanden loopt.
- **Langer** pas als je een jaar of meer loopt.

## Welke loop?

Kies een loop in je eigen regio, op een vlak parcours. In de regio's van de RunX-winkels zijn er genoeg: van de 4 Mijl van Groningen tot de korte afstanden bij de Midwinter Marathon in Apeldoorn.

## Voorbereiding

1. Train op de afstand, niet op de tijd.
2. Loop niets nieuws op de wedstrijddag: geen nieuwe schoenen, geen nieuw ontbijt.
3. Begin rustig. Iedereen gaat te snel van start.

## Na afloop

Neem een paar rustige dagen, en kies dan je volgende doel.`,
    faq: [
      { q: "Welke afstand kies ik voor mijn eerste wedstrijd?", a: "Vijf kilometer als je net een halfuur kunt lopen, tien kilometer als je een paar maanden loopt." },
    ],
  },

  "interval-of-rustig": {
    metaTitel: "Interval of rustig doorlopen als beginner?",
    metaBeschrijving: "Moet je als beginner intervaltraining doen of rustig doorlopen? Wat het verschil is en wanneer je welke kiest.",
    tekst: `## Kort antwoord: eerst rustig

Als beginner bouw je je basis op met rustige loopjes. Je hart, je spieren en je pezen wennen aan het lopen.

## Wat is interval?

Afwisselend hard en rustig lopen. Het maakt je sneller, maar het is ook zwaarder voor je lichaam.

## Wanneer begin je ermee?

Als je een paar maanden loopt en een halfuur ontspannen kunt lopen. Begin dan met één korte intervaltraining per week, bijvoorbeeld zes keer een minuut iets sneller.

## Het beginnersschema is ook interval

Afwisselend hardlopen en wandelen is eigenlijk ook een vorm van interval: maar dan om je lichaam rustig te laten wennen, niet om snel te worden.`,
    faq: [
      { q: "Wanneer kan ik beginnen met intervaltraining?", a: "Als je een paar maanden loopt en een halfuur ontspannen kunt lopen." },
    ],
  },

  "ochtend-of-avond": {
    metaTitel: "Hardlopen in de ochtend of in de avond?",
    metaBeschrijving: "Is hardlopen in de ochtend of de avond beter? De voor- en nadelen, en waarom de beste tijd de tijd is die je volhoudt.",
    tekst: `## De ochtend

- Je hebt het gedaan voor de dag begint.
- In de zomer is het koel.
- Je lichaam is nog stijf: neem een rustige start.

## De avond

- Je lichaam is warm en soepel.
- Je kunt de dag van je af lopen.
- Er komt sneller iets tussen.

## Wat is beter?

De tijd die je volhoudt. Wie drie keer per week om zeven uur 's ochtends loopt, gaat sneller vooruit dan wie af en toe 's avonds gaat.

## Tips

- Loop je 's ochtends, eet dan iets kleins of loop nuchter als het een korte, rustige loop is.
- Loop je 's avonds, laat dan een paar uur tussen eten en lopen.
- In de winter: verlichting en reflecterende kleding, zowel 's ochtends als 's avonds.`,
    faq: [
      { q: "Is hardlopen in de ochtend beter?", a: "Niet per se. De beste tijd is de tijd die je volhoudt." },
    ],
  },

  "loopband-of-buiten": {
    metaTitel: "Hardlopen op de loopband of buiten in de winter?",
    metaBeschrijving: "In de winter op de loopband of gewoon buiten? De voor- en nadelen, en hoe je ze combineert.",
    tekst: `## De loopband

- Geen kou, regen of donker.
- Een constant tempo, makkelijk voor intervaltraining.
- Saaier, en het voelt anders dan buiten. Zet de band op één procent helling om het buiten na te bootsen.

## Buiten

- Frisse lucht en daglicht, ook in de winter goed voor je humeur.
- Je traint op de ondergrond van je wedstrijd.
- Kou, gladheid en donker vragen om de juiste kleding en verlichting.

## Combineren

Veel lopers doen hun intervaltraining op de band en hun duurloop buiten. Zo heb je het beste van beide.

## Buiten in de winter

Draag lagen, verlichting en reflecterende kleding, en kies een schoen met grip op natte straten. In de winkel vind je alles wat je nodig hebt.`,
    faq: [
      { q: "Is lopen op de loopband even goed als buiten?", a: "Voor de conditie wel. Zet de band op één procent helling om het buiten na te bootsen." },
    ],
  },

  "eerste-maand": {
    metaTitel: "Beginnen met hardlopen in januari: je plan voor de eerste maand",
    metaBeschrijving: "Je eerste maand hardlopen in januari: een concreet plan voor vier weken, met schoenen, kleding en een groep om mee te beginnen.",
    tekst: `De eerste maand bepaalt of je doorgaat. Dit is het plan.

## Week 1: begin klein

Drie keer per week twintig minuten: afwisselend een minuut hardlopen en twee minuten wandelen. Loop zo rustig dat je kunt praten.

## Week 2: een stapje verder

Twee minuten hardlopen, twee minuten wandelen. Nog steeds drie keer per week.

## Week 3: wennen

Drie minuten hardlopen, twee minuten wandelen. Spierpijn is normaal; pijn in een gewricht niet.

## Week 4: vijf minuten

Vier keer vijf minuten hardlopen, met twee minuten wandelen ertussen. Na een maand loop je al twintig minuten hard per training.

## Wat je nodig hebt in januari

- Hardloopschoenen die passen, met een gratis loopanalyse bij aanschaf in de winkel.
- Kleding in lagen en een muts.
- Verlichting voor het donker.

## Samen

In Haarlem, Groningen, Apeldoorn en Tilburg starten in januari beginnersgroepen vanuit de RunX-winkels. In Twente en Zaandam kun je aansluiten bij een vaste groep.`,
    faq: [
      { q: "Hoe begin ik met hardlopen in januari?", a: "Drie keer per week, afwisselend hardlopen en wandelen, met goede schoenen en bij voorkeur in een groep." },
    ],
  },

  "beste-beginnersschoen": {
    metaTitel: "De beste hardloopschoen voor beginners dit jaar",
    metaBeschrijving: "Welke hardloopschoenen passen bij beginners? Vier modellen die vaak goed vallen, en waarom passen belangrijker is dan een lijstje.",
    tekst: `Een lijstje met de beste schoen voor iedereen bestaat niet. Wel modellen die bij veel beginners goed vallen.

## Vier modellen om te passen

- **Brooks Ghost.** Neutraal, comfortabel, een schoen die je bijna nergens van afbrengt.
- **Asics Novablast.** Iets zachter en speelser, fijn als je van wat veerkracht houdt.
- **Hoka Clifton.** Veel demping bij een laag gewicht.
- **Saucony Ride.** Een rustige, veelzijdige schoen voor alle afstanden.

## En als je voet naar binnen rolt?

Dan kan een stabiele schoen zoals de Brooks Adrenaline of de Asics Gel-Kayano rustiger voelen.

## Waarom passen belangrijker is

Twee beginners met dezelfde maat kunnen een totaal andere voorkeur hebben. Bij een loopanalyse in de winkel loop je met een paar schoenen achter elkaar, en kies je wat het best voelt. De analyse is gratis bij aanschaf van nieuwe hardloopschoenen.`,
    faq: [
      { q: "Wat is de beste hardloopschoen voor beginners?", a: "Die bestaat niet voor iedereen. Modellen als de Brooks Ghost, Asics Novablast, Hoka Clifton en Saucony Ride vallen bij veel beginners goed." },
    ],
  },

  beginnersgroepen: {
    metaTitel: "Trainingsgroepen voor beginners in alle zes RunX-steden",
    metaBeschrijving: "Beginnen met hardlopen in een groep in Apeldoorn, Groningen, Haarlem, Tilburg, Enschede of Zaandam: wat er per stad is.",
    tekst: `Samen beginnen is de beste manier om door te gaan. In alle zes RunX-steden kun je in een groep starten.

## Per stad

| Stad | Wat er is |
|---|---|
| Apeldoorn | Beginnersgroep in januari, vaak in Berg en Bos |
| Groningen | Beginnersgroep in januari, in het Stadspark of Kardinge |
| Haarlem | Beginnersgroep in januari, vanuit de Kruisstraat |
| Tilburg | Beginnersgroep in januari, in het Leijpark en de Reeshof |
| Enschede | Vaste groep waar beginners kunnen aansluiten |
| Zaandam | Vaste groep waar beginners kunnen aansluiten |

## Hoe het gaat

Je begint met afwisselend hardlopen en wandelen, en na acht tot tien weken loop je een halfuur achter elkaar.

## Aanmelden

Vraag in de winkel van jouw stad wanneer de volgende groep start. Neem gelijk je schoenen mee: bij aanschaf van nieuwe hardloopschoenen is de loopanalyse gratis.`,
    faq: [
      { q: "In welke steden heeft RunX beginnersgroepen?", a: "In Apeldoorn, Groningen, Haarlem en Tilburg starten in januari beginnersgroepen; in Enschede en Zaandam kun je aansluiten bij een vaste groep." },
    ],
  },

  "feestdagen-ritme": {
    metaTitel: "Hardlopen tijdens de feestdagen: zo blijf je in ritme",
    metaBeschrijving: "Blijf lopen tijdens de feestdagen: kortere loopjes, vaste momenten en een doel voor januari.",
    tekst: `December is de maand waarin veel lopers hun ritme kwijtraken. Met een paar afspraken met jezelf blijf je lopen.

## Kort is ook goed

Twintig minuten is beter dan niets. Houd je ritme vast, ook als de trainingen korter zijn.

## Plan je loopjes

Zet ze in je agenda tussen de afspraken door. De ochtend is het veiligst: dan komt er nog niets tussen.

## Loop samen

Een kerstloop met familie of vrienden is een mooie traditie. Rustig, gezellig, en toch gelopen.

## Kijk vooruit

Kies een doel voor het voorjaar. Dan is december een opbouwmaand in plaats van een verloren maand.

## Laat het los als het moet

Een week minder lopen is geen ramp. Pak het daarna rustig weer op.`,
    faq: [
      { q: "Hoe blijf ik lopen tijdens de feestdagen?", a: "Korte loopjes, vaste momenten in je agenda en een doel voor het voorjaar." },
    ],
  },

  "doelen-nieuw-jaar": {
    metaTitel: "Je hardloopdoelen voor het nieuwe jaar",
    metaBeschrijving: "Hoe stel je hardloopdoelen die je volhoudt? Concreet, haalbaar en met een wedstrijd als stok achter de deur.",
    tekst: `Een nieuw jaar, een nieuw doel. Zo stel je er een die je ook in maart nog voor ogen hebt.

## Maak het concreet

Niet "meer lopen", maar "in april tien kilometer lopen" of "in juni een halve marathon".

## Maak het haalbaar

Een doel dat net iets verder ligt dan wat je nu kunt, werkt het best. Te ver weg en je haakt af.

## Zet een datum

Een wedstrijd in je agenda is de beste stok achter de deur.

## Plan de weg ernaartoe

Werk terug vanaf je doel: hoeveel weken heb je, en hoe bouw je op?

## Deel het

Vertel het aan je loopgroep of een maatje. Dan sta je er niet alleen voor.

## Een paar ideeën

- Je eerste vijf kilometer zonder stoppen.
- Je eerste tien kilometer.
- De Midwinter Marathon of de Enschede Marathon, op de halve of hele afstand.
- Je eerste trailloop op de Veluwe of in Twente.`,
    faq: [
      { q: "Hoe stel ik een hardloopdoel dat ik volhoud?", a: "Maak het concreet en haalbaar, zet een datum en plan de opbouw ernaartoe." },
    ],
  },
};
