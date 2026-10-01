/** Teksten van het cluster loopanalyse, deel 2. Zie `index.ts` voor de afspraken. */
import type { DemoTekst } from "@/lib/demo/runx/teksten/type";

export const LOOPANALYSE_2: Record<string, DemoTekst> = {
  "loopanalyse-fysio-of-winkel": {
    metaTitel: "Loopanalyse bij de fysio of in de winkel: het verschil",
    metaBeschrijving: "Een loopanalyse bij de fysiotherapeut of in een hardloopwinkel: wat de twee doen, wanneer je welke kiest, en waarom ze elkaar aanvullen.",
    tekst: `Loopanalyse klinkt als één ding, maar het woord betekent bij een fysiotherapeut iets anders dan in een hardloopwinkel. Weet je wat het verschil is, dan weet je ook waar je met jouw vraag moet beginnen.

## Bij de fysiotherapeut: kijken naar je lichaam

Een fysiotherapeut kijkt naar hoe je lichaam beweegt, meestal omdat er een klacht is. Waar komt de pijn vandaan? Is er een spier te zwak, een gewricht te stijf, een beweging die steeds misgaat? De analyse is onderdeel van een behandeling, met oefeningen en een plan. Daar is een verwijzing of een afspraak voor nodig, en vaak zijn er meerdere sessies.

## In de hardloopwinkel: kijken naar je voet en je schoen

Bij RunX kijk je naar hoe je loopt in relatie tot je schoen. Hoe land je, hoe rol je af, kantelt je voet naar binnen bij het afzetten? Op basis daarvan pas je schoenen die bij je looppatroon passen. Dat is geen diagnose en geen behandeling. Het doel is een schoen die je laat lopen zonder dat hij je hindert.

## Wanneer kies je wat?

- **Je wilt nieuwe schoenen en hebt geen klachten:** begin in de winkel.
- **Je hebt pijn die in rust blijft, of die erger wordt:** begin bij de fysiotherapeut of sportarts.
- **Je hebt af en toe last, en je schoenen zijn oud:** begin in de winkel, en vertel over de klacht. Gaat het met nieuwe schoenen niet over, dan is de fysio de volgende stap.

## Ze vullen elkaar aan

Het mooiste is als die twee samenwerken. Een fysiotherapeut ziet een zwakke heupspier, de winkel zorgt voor een schoen die je niet extra belast terwijl je eraan werkt. In Tilburg is op vrijdag en zaterdag zelfs een sportfysiotherapeut in de winkel aanwezig, op afspraak. Elders verwijst het team je door als dat beter is.

## Wat je meeneemt

Neem naar allebei je huidige hardloopschoenen mee. De slijtage van je zool vertelt de fysio en de schoenadviseur allebei iets over hoe je loopt.`,
    faq: [
      { q: "Is een loopanalyse in de winkel een medisch onderzoek?", a: "Nee. In de winkel kijk je naar je looppatroon in relatie tot je schoen. Bij klachten is een fysiotherapeut of sportarts de juiste plek." },
      { q: "Kan ik met een klacht ook naar de winkel?", a: "Ja, vertel het dan. Blijft de pijn of wordt hij erger, ga dan eerst naar een fysiotherapeut." },
    ],
  },

  "neutraal-of-stabiel": {
    metaTitel: "Neutrale of stabiele hardloopschoen? Zo weet je het",
    metaBeschrijving: "Het verschil tussen een neutrale en een stabiele hardloopschoen, hoe je weet welke je nodig hebt, en waarom een loopanalyse daarbij helpt.",
    tekst: `Bijna elk merk verdeelt zijn hardloopschoenen in twee groepen: neutraal en stabiel. Welke je nodig hebt, hangt af van wat je voet doet tussen landen en afzetten.

## Wat je voet doet

Als je voet de grond raakt, rolt hij een beetje naar binnen. Dat heet pronatie, en het is normaal: zo vangt je voet de klap op. Bij sommige lopers rolt de voet verder naar binnen dan gemiddeld. Dat heet overpronatie. Bij anderen rolt hij juist weinig, en landt je meer op de buitenkant.

## Neutrale schoenen

Een neutrale schoen laat je voet zijn eigen gang gaan. Hij dempt, maar stuurt niet bij. Voor de meeste lopers is dit de goede keuze. Bekende voorbeelden zijn de Brooks Ghost, de Asics Novablast en de Hoka Clifton.

## Stabiele schoenen

Een stabiele schoen heeft aan de binnenkant iets meer steun, zodat je voet minder ver naar binnen rolt. Lopers die flink overproneren voelen zich daar vaak zekerder op, vooral als ze moe worden aan het eind van een duurloop. Voorbeelden zijn de Asics Gel-Kayano en de Brooks Adrenaline.

## Hoe weet je het?

1. **Kijk naar je oude schoenen.** Is de zool aan de binnenkant van de hiel en de voorvoet duidelijk meer versleten, dan rol je waarschijnlijk flink naar binnen.
2. **Let op hoe je je voelt.** Zakken je enkels aan het eind van een loop naar binnen? Krijg je last aan de binnenkant van je knie of scheenbeen?
3. **Laat het zien.** Bij een loopanalyse op de band met video zie je het zelf. Dat is betrouwbaarder dan raden.

## Twijfel is normaal

Veel lopers zitten ertussenin. Dan is het passen het beslissende moment: loop met een neutrale en een stabiele schoen, en kies wat het rustigst voelt. Bij RunX krijg je bij de loopanalyse daarom altijd een paar schoenen om te vergelijken.

## Wat een schoen niet doet

Een stabiele schoen lost geen blessure op. Heb je pijn die blijft, laat het dan eerst nakijken door een fysiotherapeut.`,
    faq: [
      { q: "Is overpronatie slecht?", a: "Niet per se. Pronatie is normaal; bij flinke overpronatie voelt een stabiele schoen voor veel lopers prettiger." },
      { q: "Kan ik zelf zien of ik overproneer?", a: "De slijtage van je oude schoenen geeft een eerste aanwijzing. Een loopanalyse met video laat het duidelijker zien." },
    ],
  },

  overpronatie: {
    metaTitel: "Wat is overpronatie en hoe weet je of je het hebt?",
    metaBeschrijving: "Overpronatie uitgelegd: wat het is, hoe je het herkent aan je schoenen en je lichaam, en wat je eraan kunt doen.",
    tekst: `## Wat is overpronatie?

Pronatie is het naar binnen rollen van je voet nadat hij de grond raakt. Dat hoort zo: het vangt de klap op. Bij overpronatie rolt je voet verder naar binnen dan gemiddeld, waardoor je enkel en knie meer naar binnen bewegen.

## Hoe herken je het?

- **Aan je schoenen.** De zool is aan de binnenkant van de hiel en onder je grote teen duidelijk meer versleten. Zet je schoenen op tafel: zakken ze naar binnen?
- **Aan je lichaam.** Je krijgt bij langere lopen last aan de binnenkant van je scheenbeen of knie.
- **Op video.** Bij een loopanalyse zie je van achteren hoe je hiel naar binnen kantelt bij het landen en afzetten.

## Is het erg?

Niet altijd. Veel lopers proneren flink en lopen er jaren zonder klachten mee. Het wordt pas iets om op te letten als je klachten krijgt, of als je flink meer gaat lopen.

## Wat kun je doen?

1. **Kies een schoen die past.** Voor lopers die flink overproneren voelt een stabiele schoen vaak rustiger.
2. **Bouw rustig op.** De meeste klachten ontstaan doordat je te snel te veel loopt.
3. **Train je kuiten en heupen.** Sterkere spieren houden je beenas beter op zijn plek.
4. **Laat klachten nakijken.** Blijft de pijn, ga dan naar een fysiotherapeut of podotherapeut. Zolen kunnen dan een deel van de oplossing zijn.

Bij een loopanalyse in een van de zes RunX-winkels zie je het zelf terug op video, en pas je schoenen die erbij passen.`,
    faq: [
      { q: "Moet ik met overpronatie altijd een stabiele schoen kopen?", a: "Niet altijd. Loop je zonder klachten op een neutrale schoen, dan kan dat prima. Pas allebei en kies wat het rustigst voelt." },
      { q: "Helpen inlegzolen tegen overpronatie?", a: "Soms. Laat dat beoordelen door een podotherapeut of, in Twente, in de winkel met podologisch advies." },
    ],
  },

  "afspraak-loopanalyse": {
    metaTitel: "Moet je een afspraak maken voor een loopanalyse?",
    metaBeschrijving: "Binnenlopen of een afspraak maken voor een loopanalyse bij RunX: wanneer het handig is, hoe lang het duurt en wat je meeneemt.",
    tekst: `## Kort antwoord: nee

Bij alle zes RunX-winkels kun je zonder afspraak binnenlopen voor een loopanalyse. De analyse is gratis als je nieuwe hardloopschoenen koopt.

## Wanneer een afspraak wel handig is

- **Op zaterdag.** Dan is het het drukst. Wil je de tijd nemen, kom dan doordeweeks of bel even.
- **Als je meer wilt dan schoenen.** Heb je klachten, of wil je ook zolen laten aanpassen in Twente of de sportfysiotherapeut spreken in Tilburg, dan is een afspraak verstandig.
- **In Groningen en Twente** kun je online een tijd kiezen. Dan weet je zeker dat er iemand voor je klaarstaat.

## Hoe lang duurt het?

Reken op ongeveer een half uur: een kort gesprek, een paar minuten lopen op de band, samen terugkijken en schoenen passen. Twijfel je tussen twee paar, neem dan gerust wat langer de tijd.

## Wat neem je mee?

1. Je huidige hardloopschoenen.
2. De sokken waarin je meestal loopt.
3. Kleding waarin je kunt lopen, of een korte broek.
4. Je plannen: welke afstand, welke wedstrijd, welke ondergrond.`,
    faq: [
      { q: "Kan ik zonder afspraak een loopanalyse doen?", a: "Ja, in alle zes RunX-winkels kun je binnenlopen." },
      { q: "Waar kan ik online een tijd kiezen?", a: "In Groningen en Twente. In de andere winkels kun je bellen." },
    ],
  },

  "hoeveel-demping": {
    metaTitel: "Hoeveel demping heb je nodig in een hardloopschoen?",
    metaBeschrijving: "Weinig, gemiddeld of maximale demping: wat het verschil is, voor wie welke schoen past en waarom meer demping niet altijd beter is.",
    tekst: `Demping is het eerste waar veel lopers naar kijken. Meer voelt zachter, dus beter? Zo eenvoudig is het niet.

## Drie soorten demping

- **Weinig demping.** Een directe schoen waarmee je de grond goed voelt. Licht en snel, maar je benen doen meer werk. Fijn voor korte, snelle trainingen.
- **Gemiddelde demping.** De meeste trainingsschoenen. Comfortabel voor duurlopen en tempo, voor de meeste lopers een goede basis.
- **Maximale demping.** Hoge, zachte schoenen zoals de Hoka Bondi of de Brooks Glycerin. Fijn voor lange, rustige kilometers en voor lopers die veel comfort willen.

## Waar hangt het van af?

1. **Je gewicht.** Zwaardere lopers hebben vaak baat bij wat meer demping.
2. **Je afstand.** Hoe langer je loopt, hoe meer je de demping waardeert in de laatste kilometers.
3. **Je ondergrond.** Op asfalt en klinkers wil je meer demping dan op een bospad.
4. **Je gevoel.** Sommige lopers voelen zich onzeker op een hele zachte schoen. Dan is minder beter.

## Meer demping is niet altijd beter

Een hele zachte schoen kan wiebelig voelen, zeker als je moe wordt. En demping is geen bescherming tegen blessures: de meeste klachten komen door te snel opbouwen, niet door te weinig schuim.

## Probeer het zelf

Het verschil tussen gemiddeld en maximaal voel je pas als je erop loopt. Bij een loopanalyse in de winkel loop je daarom met verschillende schoenen, en kies je wat bij jou past.`,
    faq: [
      { q: "Zijn schoenen met veel demping beter voor je knieën?", a: "Niet per definitie. Ze voelen comfortabel op lange afstanden, maar de belangrijkste bescherming is rustig opbouwen." },
      { q: "Welke demping is goed voor een beginner?", a: "Meestal gemiddelde demping. Pas verschillende schoenen en kies wat stabiel en prettig voelt." },
    ],
  },

  "online-of-winkel": {
    metaTitel: "Hardloopschoenen online of in de winkel kopen?",
    metaBeschrijving: "De voor- en nadelen van hardloopschoenen online of in een hardloopwinkel kopen, en wanneer welke keuze verstandig is.",
    tekst: `Online is het aanbod groot en bestel je met één klik. In de winkel kun je passen en lopen. Wat is slim?

## Online kopen

**Voordelen:** een groot aanbod, makkelijk vergelijken, thuis bezorgd.

**Nadelen:** je weet pas of een schoen past als je erop loopt, en dan is hij vaak al buiten gebruikt. Maten verschillen per merk en per model. En niemand kijkt hoe je loopt.

**Slim als:** je precies weet welk model en welke maat je wilt, omdat je hetzelfde model al eerder liep.

## In de hardloopwinkel kopen

**Voordelen:** je loopt eerst op de band en ziet hoe je landt en afrolt. Je past meerdere schoenen achter elkaar, en iemand die zelf loopt helpt je kiezen. Bij RunX is de loopanalyse gratis als je nieuwe hardloopschoenen koopt.

**Nadelen:** je moet ervoor naar de winkel, en het aanbod is wat kleiner dan het hele internet.

**Slim als:** je je eerste echte hardloopschoenen koopt, als je van model wilt wisselen, of als je klachten hebt gehad.

## Het verschil zit in de eerste kilometers

Een schoen die niet past, merk je niet in de woonkamer maar na vijf kilometer. Daar zit het echte verschil: in de winkel loop je die eerste meters vóór je kiest.

## Een tussenweg

Veel lopers combineren het: de eerste keer een loopanalyse en advies in de winkel, en daarna hetzelfde model opnieuw kopen. Ook dan is het slim om af en toe opnieuw te laten kijken, want modellen veranderen per jaar.`,
    faq: [
      { q: "Is online kopen goedkoper?", a: "Soms. Maar een schoen die niet past, is geen besparing. Wie zijn model kent, kan prima online kopen." },
      { q: "Wanneer moet ik zeker naar de winkel?", a: "Bij je eerste echte hardloopschoenen, als je van model wisselt, of na klachten." },
    ],
  },

  "band-of-buiten": {
    metaTitel: "Loopanalyse op de band of buiten: wat is betrouwbaarder?",
    metaBeschrijving: "Een loopanalyse op de loopband of buiten: de verschillen, waarom de band handig is en waarom buiten testen het beeld compleet maakt.",
    tekst: `## De loopband

Op de band loop je op een constant tempo, en de camera kan je voeten van dichtbij filmen. Dat maakt het makkelijk om je voetlanding en afrol terug te kijken en te vergelijken tussen schoenen.

**Nadeel:** lopen op een band voelt iets anders dan buiten. Sommige lopers zetten korter af, of lopen voorzichtiger.

## Buiten

Buiten loop je zoals je echt loopt: op je eigen ritme, op een harde ondergrond, met een bocht en een stoeprand.

**Nadeel:** filmen is lastiger, en het tempo wisselt.

## Het beste van allebei

De betrouwbaarste aanpak combineert ze. Eerst op de band om te zien wat je voet doet, daarna een stukje buiten om te voelen of de schoen daar ook klopt. In Apeldoorn kun je na de analyse op de band ook buiten testen.

## Waar het echt om gaat

Een analyse is een hulpmiddel. Het beslissende moment blijft hoe een schoen voelt als je erop loopt. Daarom pas je bij RunX altijd meerdere schoenen, en kies je zelf.`,
    faq: [
      { q: "Waar kan ik schoenen buiten testen?", a: "In Apeldoorn kun je na de analyse op de band ook buiten lopen. Elders test je op de band." },
    ],
  },

  "kayano-of-adrenaline": {
    metaTitel: "Asics Gel-Kayano of Brooks Adrenaline? Het verschil",
    metaBeschrijving: "Twee bekende stabiele hardloopschoenen naast elkaar: hoe de Asics Gel-Kayano en de Brooks Adrenaline lopen, en voor wie welke past.",
    tekst: `De Asics Gel-Kayano en de Brooks Adrenaline zijn al jaren de bekendste stabiele hardloopschoenen. Allebei bedoeld voor lopers die extra steun prettig vinden. Toch lopen ze anders.

## Asics Gel-Kayano

- **Gevoel:** zacht en vol, met veel demping onder de hiel.
- **Steun:** voelt als een brede, rustige basis.
- **Geschikt voor:** lange, rustige kilometers en lopers die veel comfort willen.

## Brooks Adrenaline

- **Gevoel:** iets directer en lichter dan de Kayano.
- **Steun:** Brooks werkt met steun aan beide kanten van de hiel, waardoor de schoen minder "stuurt" en meer begeleidt.
- **Geschikt voor:** lopers die stabiliteit willen maar ook af en toe wat sneller lopen.

## Welke past bij jou?

Dat hangt minder af van wat op papier staat dan van hoe je voet erin landt. Twee lopers met dezelfde overpronatie kunnen een totaal andere voorkeur hebben.

1. Pas ze allebei, met je eigen sokken.
2. Loop er een paar minuten mee op de band.
3. Let op hoe je enkels voelen als je iets sneller gaat.

## Of toch neutraal?

Twijfel je, pas dan ook een neutrale schoen. Veel lopers die denken een stabiele schoen nodig te hebben, lopen prima op een neutrale. Bij een loopanalyse zie je het zelf.`,
    faq: [
      { q: "Is de Kayano zachter dan de Adrenaline?", a: "Voor de meeste lopers voelt de Kayano voller en zachter, de Adrenaline iets directer." },
      { q: "Kan ik beide passen bij RunX?", a: "In de winkels liggen meestal beide modellen. Vraag ernaar bij je loopanalyse." },
    ],
  },

  "hardloopschoenen-groningen": {
    metaTitel: "Hardloopschoenen kopen in Groningen | RunX Groningen",
    metaBeschrijving: "Hardloopschoenen kopen in Groningen met een gratis loopanalyse: vijf testbanen, ruim twintig merken en advies van lopers aan het Hoornsediep.",
    tekst: `Zoek je hardloopschoenen in Groningen, dan wil je meer dan een rek met dozen. Bij RunX Groningen aan het Hoornsediep loop je eerst, en kies je daarna.

## Eerst lopen, dan kiezen

Bij aankoop van nieuwe hardloopschoenen is de loopanalyse gratis. Op een van de vijf testbanen wordt je voetlanding gefilmd, en samen kijk je terug wat je voet doet. Daarna pas je twee of drie schoenen die daarbij passen.

## Ruim twintig merken

Asics, Brooks, Hoka, On, Saucony, New Balance, Mizuno en Adidas: de grote hardloopmerken liggen naast elkaar. Dat maakt vergelijken makkelijk. Twijfel je tussen een Brooks Ghost en een Asics Novablast, dan loop je ze kort na elkaar.

## Voor elke loper

- **Beginners** die hun eerste echte schoenen zoeken.
- **Wedstrijdlopers** die zich voorbereiden op de 4 Mijl of een voorjaarsmarathon.
- **Wandelaars**: de winkel heeft een eigen wandelafdeling.

## Praktisch

- Binnenlopen kan, en online een tijd kiezen ook.
- Neem je oude schoenen mee.
- Kom je uit Haren, Assen of Leek, dan is de winkel goed bereikbaar.`,
    faq: [
      { q: "Waar kan ik hardloopschoenen kopen in Groningen met advies?", a: "Bij RunX Groningen aan het Hoornsediep 127, met een gratis loopanalyse bij aankoop van nieuwe hardloopschoenen." },
      { q: "Welke merken verkoopt RunX Groningen?", a: "Onder meer Asics, Brooks, Hoka, On, Saucony, New Balance, Mizuno en Adidas." },
    ],
  },

  "hardloopschoenen-tilburg": {
    metaTitel: "Hardloopschoenen kopen in Tilburg | RunX Tilburg",
    metaBeschrijving: "Hardloopschoenen kopen in Tilburg met een gratis loopanalyse op het vernieuwde systeem van RunX Tilburg aan de Schouwburgring.",
    tekst: `Hardloopschoenen kopen in Tilburg begint bij RunX aan de Schouwburgring met lopen. Het vernieuwde analysesysteem laat je zien hoe je landt en afrolt, en daarna pas je schoenen die daarbij passen.

## Zo gaat het

1. Een kort gesprek over hoeveel en waar je loopt.
2. Lopen op de band, met je looppatroon in beeld.
3. Twee of drie schoenen passen en vergelijken.
4. Zelf kiezen, met uitleg over het verschil.

De loopanalyse is gratis bij aankoop van nieuwe hardloopschoenen.

## Voor de Ten Miles en daarna

In de zomer bereiden veel lopers zich voor op de Tilburg Ten Miles. Dan gaat het vaak over een snellere schoen, of een wedstrijdschoen die je moet inlopen. In de winter verschuift de vraag naar grip, warmte en de basis voor het voorjaar.

## Met een sportfysiotherapeut op afspraak

Op vrijdag en zaterdag is er op afspraak een sportfysiotherapeut in de winkel. Handig als je twijfelt of een klacht met je schoen te maken heeft.

## Voor Tilburg en omgeving

Breda, Waalwijk en Oisterwijk liggen op korte afstand. Loop je in de Oisterwijkse bossen of in de Loonse en Drunense Duinen, vraag dan ook naar trailschoenen.`,
    faq: [
      { q: "Waar zit RunX Tilburg?", a: "Aan de Schouwburgring 51 in Tilburg." },
      { q: "Is de loopanalyse gratis?", a: "Ja, bij aankoop van nieuwe hardloopschoenen." },
    ],
  },

  "hardloopschoenen-zaandam": {
    metaTitel: "Hardloopschoenen kopen in Zaandam | RunX Zaandam",
    metaBeschrijving: "Hardloopschoenen kopen in Zaandam met een gratis loopanalyse en advies van wedstrijdlopers, aan de Gedempte Gracht.",
    tekst: `Al 25 jaar koop je in Zaandam hardloopschoenen aan de Gedempte Gracht. Bij RunX Zaandam loop je eerst op de band, en kies je daarna uit schoenen die bij je looppatroon passen.

## Advies van lopers

Een deel van het team loopt zelf wedstrijden. Dat helpt als je vragen hebt over een snellere schoen, over je eerste halve marathon of over de Dam tot Damloop, die in Zaandam finisht.

## Zo gaat het

1. Vertel wat je loopt en waar je naartoe wilt.
2. Loop een paar minuten op de band.
3. Kijk samen terug hoe je landt en afzet.
4. Pas een paar schoenen en kies zelf.

De loopanalyse is gratis als je nieuwe hardloopschoenen koopt.

## Voor de Zaanstreek en Amsterdam-Noord

Veel klanten komen uit Purmerend, Wormerveer en Amsterdam-Noord. Wie in Noord woont, is met de pont en de fiets snel in Zaandam.

## Ook voor HYROX

Sinds augustus zijn er vanuit Zaandam ook HYROX-trainingen. In de winkel kun je schoenen passen die goed lopen en stabiel staan bij de oefeningen.`,
    faq: [
      { q: "Waar zit RunX Zaandam?", a: "Aan de Gedempte Gracht 58 in Zaandam." },
      { q: "Kan ik in Zaandam ook HYROX-schoenen passen?", a: "Ja, in Zaandam is de keuze in HYROX-schoenen groot." },
    ],
  },
};
