/** Teksten van het cluster "Hardloopschoenen kiezen per loper", inclusief kleding en techniek. Zie `index.ts`. */
import type { DemoTekst } from "@/lib/demo/runx/teksten/type";

const t = (metaTitel: string, metaBeschrijving: string, tekst: string, faq: DemoTekst["faq"]): DemoTekst => ({ metaTitel, metaBeschrijving, tekst, faq });

export const SCHOENEN: Record<string, DemoTekst> = {
  "hardloopschoenen-vervangen": t(
    "Hoe vaak vervang je je hardloopschoenen?",
    "Na hoeveel kilometer zijn hardloopschoenen op? Hoe je het ziet aan de zool, de demping en je benen.",
    `## Meestal tussen de 600 en 1.000 kilometer

Dat is een richtlijn, geen regel. Een lichte loper op een bospad komt verder dan een zwaardere loper op asfalt. Daarom kijk je liever naar de schoen zelf dan naar de teller.

## Zo zie je het

1. **De zool.** Zie je gladde plekken, of is het profiel onder je hiel of voorvoet weg?
2. **De demping.** Druk met je duim in het schuim. Voelt het hard, of zie je diepe vouwen in de zijkant?
3. **De stand.** Zet je schoenen op tafel. Zakken ze naar één kant?
4. **Je benen.** Krijg je na een loop last die je eerder niet had? Dan kan het aan je schoenen liggen.

## Twee paar afwisselen

Wie twee paar afwisselt, geeft het schuim tijd om te herstellen. Elk paar gaat dan vaak langer mee.

## Laat ze nakijken

Twijfel je, neem je schoenen dan mee naar de winkel. Het advies kan ook zijn dat ze nog prima zijn.`,
    [
      { q: "Na hoeveel kilometer zijn hardloopschoenen op?", a: "Meestal tussen de 600 en 1.000 kilometer, maar kijk vooral naar de zool, de demping en hoe je benen zich voelen." },
      { q: "Kan ik mijn schoenen laten nakijken?", a: "Ja, neem ze mee naar de winkel. Soms zijn ze nog prima." },
    ],
  ),

  "brede-voeten": t(
    "Hardloopschoenen voor brede voeten",
    "Welke hardloopschoenen passen bij brede voeten? Waar je op let, welke merken brede leesten maken, en waarom passen hier extra belangrijk is.",
    `Met brede voeten is een hardloopschoen vinden lastiger. Te smal, en je krijgt drukplekken en blaren. Een paar tips.

## Waar let je op?

- **Ruimte bij de bal van je voet.** Je tenen moeten kunnen spreiden.
- **Een zachte, rekbare bovenkant.** Gebreide bovenkanten geven meer mee.
- **Geen harde naden** op de breedste plek van je voet.

## Brede leesten

Een aantal merken maakt populaire modellen ook in een brede uitvoering, vaak aangeduid met "wide" of "2E". Bij Brooks, Asics, New Balance en Hoka zijn veel modellen in een brede versie te krijgen.

## Veters slimmer strikken

Sla een veteroogje over op de breedste plek, dan drukt de veter minder.

## Passen is alles

Twee schoenen met dezelfde maat kunnen totaal anders vallen. In de winkel kun je verschillende modellen en breedtes achter elkaar passen.`,
    [
      { q: "Welke merken maken brede hardloopschoenen?", a: "Brooks, Asics, New Balance en Hoka maken veel modellen ook in een brede uitvoering." },
    ],
  ),

  "winterkleding-lagen": t(
    "Hardlopen in de winter: zo kleed je je in lagen",
    "Hardlopen in de winter zonder het koud te krijgen: het lagenprincipe, wat je bij welke temperatuur aantrekt en wat je niet moet vergeten.",
    `De grootste fout in de winter: te warm aankleden. Na tien minuten loop je te zweten, en daarna krijg je het koud.

## Het lagenprincipe

1. **Een basislaag** die vocht van je huid afvoert. Geen katoen.
2. **Een middenlaag** voor warmte, alleen als het echt koud is.
3. **Een buitenlaag** tegen wind en regen.

## Wat trek je aan bij welke temperatuur?

| Temperatuur | Bovenlichaam | Benen |
|---|---|---|
| Boven 10 °C | Shirt met korte of lange mouw | Korte broek |
| 5 tot 10 °C | Shirt met lange mouw, eventueel een windjack | Korte broek of driekwart |
| 0 tot 5 °C | Basislaag en jack | Lange tight |
| Onder 0 °C | Basislaag, middenlaag en jack | Lange, warmere tight |

## Vergeet niet

- Een muts en handschoenen: je verliest veel warmte via je hoofd en handen.
- Verlichting en reflectie: in de winter is het vaak donker.

## De vuistregel

Kleed je alsof het tien graden warmer is. Bij de start heb je het fris, na een kilometer niet meer.`,
    [
      { q: "Wat trek ik aan bij het hardlopen in de winter?", a: "Werk met lagen: een basislaag die vocht afvoert, bij echte kou een middenlaag, en een jack tegen wind en regen." },
    ],
  ),

  "verlichting-hardlopen": t(
    "Verlichting voor hardlopen: gezien worden in het donker",
    "Veilig hardlopen in het donker: welke verlichting je nodig hebt, waar je hem draagt en wat reflectie doet.",
    `Van oktober tot maart loop je vaak in het donker. Gezien worden is dan het belangrijkste.

## Wat heb je nodig?

- **Een hoofdlamp of borstlamp** om zelf te zien waar je loopt, zeker op onverlichte paden.
- **Een knipperlicht achter**, op je rug of aan je broek.
- **Reflectie** op bewegende delen: enkels, handen, schoenen. Beweging valt meer op.

## Hoofdlamp of borstlamp?

Een hoofdlamp schijnt waar je kijkt. Een borstlamp schudt minder en geeft een rustiger beeld. Beide werken; kies wat het prettigst voelt.

## Waar loop je?

Kies in het donker bekende routes, liefst met verlichting. Op de Veluwe of in de duinen is lopen in het donker mooi, maar alleen met een goede lamp en als je de route kent.

## In de winkel

In de RunX-winkels vind je lampen, knipperlichten en reflecterende kleding.`,
    [
      { q: "Welke verlichting heb ik nodig om in het donker te hardlopen?", a: "Een hoofd- of borstlamp om te zien, een knipperlicht achter en reflectie op enkels en handen." },
    ],
  ),

  "grip-natte-straten": t(
    "Hardloopschoenen met grip op natte straten",
    "Welke hardloopschoenen hebben goede grip op natte straten, klinkers en bladeren? Waar je op let bij de zool.",
    `Natte klinkers, gladde tegels en bladeren op het fietspad: in de herfst glijd je makkelijk weg.

## Waar zit de grip?

- **In het rubber.** Zacht rubber pakt beter op nat oppervlak dan hard schuim.
- **In het profiel.** Kleine, verspreide noppen of groeven geven meer houvast dan een gladde zool.
- **In het contactvlak.** Een bredere zool staat stabieler.

## Waar moet je op letten?

Veel lichte schoenen hebben op delen van de zool geen rubber, alleen schuim. Dat scheelt gewicht, maar op nat asfalt glijdt het sneller.

## Trailschoen in de stad?

Een lichte trailschoen met korte noppen werkt in de herfst ook in de stad. Zware trailschoenen met diepe noppen voelen op asfalt onrustig.

## Probeer het

In de winkel kun je de zool van verschillende schoenen naast elkaar bekijken en vragen welke het best grip houdt op nat wegdek.`,
    [
      { q: "Welke hardloopschoen heeft de beste grip op nat wegdek?", a: "Een schoen met zacht rubber over een groot deel van de zool en een fijn profiel. Vraag in de winkel om ze naast elkaar te vergelijken." },
    ],
  ),

  "sporthorloge-kiezen": t(
    "Een sporthorloge kiezen voor hardlopen",
    "Welk sporthorloge past bij jouw training? Wat je echt nodig hebt, wat handig is en waar je op let bij batterij en gps.",
    `Een sporthorloge houdt bij hoe ver, hoe snel en hoe lang je loopt. Maar de keuze is enorm.

## Wat heb je echt nodig?

1. **Goede gps.** Voor afstand en tempo.
2. **Hartslag.** Aan de pols is goed genoeg voor de meeste lopers.
3. **Een prettig scherm** dat je tijdens het lopen kunt lezen.

## Wat is handig?

- **Trainingen op je horloge**, zodat je intervallen kunt volgen.
- **Een lange batterij** als je lange afstanden of trails loopt.
- **Navigatie** voor wie onbekende routes loopt.

## Wat heb je waarschijnlijk niet nodig?

Muziek, betalen en tientallen sportprofielen. Leuk, maar het maakt je niet sneller.

## Merken

Garmin, Coros en Polar zijn de bekendste hardloopmerken. Elk heeft een eigen app en een eigen gevoel.

## Probeer het om je pols

In de winkel kun je horloges passen en het scherm bekijken.`,
    [
      { q: "Welk sporthorloge is goed voor beginners?", a: "Een eenvoudig model met goede gps en hartslag aan de pols. Meer is in het begin niet nodig." },
    ],
  ),

  "garmin-of-coros": t(
    "Garmin of Coros: welk horloge past bij jouw training?",
    "Garmin en Coros naast elkaar: de verschillen in app, batterij en bediening, en voor wie welk merk past.",
    `Garmin en Coros zijn twee van de populairste merken onder hardlopers. Allebei goed, maar met een ander karakter.

## Garmin

- **Veel keuze**, van eenvoudige modellen tot uitgebreide trainingshorloges.
- **Een uitgebreide app** met veel gegevens, trainingen en analyses.
- **Geschikt voor** lopers die van data houden en alles in één ecosysteem willen.

## Coros

- **Lange batterijduur**, vaak een sterk punt.
- **Een eenvoudige, overzichtelijke app.**
- **Geschikt voor** lopers die vooral willen lopen en minder willen instellen, en voor trailers.

## Wat is voor jou belangrijk?

1. Hoeveel data wil je zien?
2. Hoe lang loop je, en hoe vaak laad je op?
3. Welke app voelt prettig?

## Probeer ze allebei

In de winkel kun je beide merken om je pols proberen.`,
    [
      { q: "Wat is het grootste verschil tussen Garmin en Coros?", a: "Garmin heeft meer keuze en een uitgebreidere app; Coros staat bekend om een lange batterij en een eenvoudige app." },
    ],
  ),

  hardloopcadeaus: t(
    "Hardloopcadeaus voor lopers die al alles hebben",
    "Een cadeau voor een hardloper die al alles heeft: tien ideeën, van goede sokken tot een bon voor nieuwe schoenen.",
    `Een hardloper die al alles heeft, verras je niet met de zoveelste bidon. Tien ideeën die wel werken.

1. **Goede hardloopsokken.** Een loper kan er nooit genoeg hebben.
2. **Een hoofdlamp of knipperlicht** voor de donkere maanden.
3. **Een buff of muts** die ademt.
4. **Handschoenen** die je kunt gebruiken met een touchscreen.
5. **Een foamroller** voor na de training.
6. **Compressiekousen** voor het herstel.
7. **Sportvoeding** om uit te proberen op de lange duurloop.
8. **Een heuptas** voor telefoon en sleutels.
9. **Een inschrijving voor een wedstrijd** in de regio.
10. **Een cadeaubon** voor nieuwe schoenen, met de loopanalyse erbij.

## Twijfel je over de maat?

Bij kleding en schoenen is een bon vaak de beste keus. Dan kiest de loper zelf, en past hij of zij alles in de winkel.`,
    [
      { q: "Wat geef je een hardloper die al alles heeft?", a: "Goede sokken, verlichting, een foamroller of een cadeaubon voor nieuwe schoenen met loopanalyse." },
    ],
  ),

  "twee-paar-afwisselen": t(
    "Twee paar hardloopschoenen afwisselen: waarom het werkt",
    "Waarom veel lopers twee paar hardloopschoenen afwisselen, en hoe je ze kiest.",
    `Veel ervaren lopers hebben twee paar schoenen. Niet omdat het moet, maar omdat het werkt.

## Waarom?

- **Het schuim herstelt.** Na een loop is de demping een beetje ingedrukt. Een dag rust doet het goed.
- **Je benen krijgen variatie.** Twee verschillende schoenen belasten je net iets anders.
- **Je hebt altijd een droog paar.** Fijn in de herfst.

## Hoe kies je ze?

1. **Een rustige schoen** met veel demping voor duurlopen en herstel.
2. **Een lichtere schoen** voor tempotrainingen.

Of: een wegschoen en een trailschoen, als je ook in bos en duin loopt.

## Gaat het niet sneller op?

Nee: twee paar slijten over twee keer zoveel tijd. Per paar gaan ze vaak zelfs langer mee.`,
    [
      { q: "Is het zinvol om twee paar hardloopschoenen te hebben?", a: "Ja, het schuim krijgt tijd om te herstellen en je benen krijgen variatie. Elk paar gaat vaak langer mee." },
    ],
  ),

  "zwaardere-lopers": t(
    "Hardloopschoenen voor zwaardere lopers",
    "Hardloopschoenen voor zwaardere lopers: waarom demping en een stabiele basis belangrijk zijn, en hoe je de juiste schoen vindt.",
    `Ben je zwaarder, dan vraag je meer van je schoenen. Bij elke pas komt er meer kracht op het schuim en op je gewrichten.

## Waar let je op?

- **Ruime demping**, zodat de schoen niet doorzakt.
- **Een stabiele, brede basis**, zodat je niet wegrolt.
- **Een stevige bovenkant** die je voet op zijn plek houdt.

## Modellen die vaak goed vallen

Schoenen met veel demping en een brede zool, zoals de Hoka Bondi, de Brooks Glycerin of de Asics Gel-Nimbus. Rolt je voet naar binnen, dan kan een stabiele schoen zoals de Brooks Adrenaline rustiger voelen.

## Let op de slijtage

Een zwaardere loper slijt sneller door het schuim. Laat je schoenen eerder nakijken.

## Laat je adviseren

Bij een loopanalyse in de winkel zie je hoe je landt, en pas je een paar schoenen. De analyse is gratis bij aanschaf van nieuwe hardloopschoenen.`,
    [
      { q: "Welke hardloopschoen is goed voor zwaardere lopers?", a: "Een schoen met ruime demping en een stabiele, brede basis. Pas er een paar bij een loopanalyse." },
    ],
  ),

  "hoka-of-on": t(
    "Hoka of On: het verschil voor een recreatieve loper",
    "Hoka of On? Twee populaire merken naast elkaar: hoe ze lopen, voor wie ze passen en waarom je ze allebei moet passen.",
    `Hoka en On zie je overal, ook buiten het hardlopen. Maar ze lopen heel anders.

## Hoka

- **Veel demping** en een dikke zool.
- **Een rocker**: de zool is gebogen, zodat je makkelijk afrolt.
- **Voelt zacht en beschermend**, fijn voor lange afstanden.

## On

- **Een directer gevoel**, vaak steviger.
- **De herkenbare "wolkjes"** in de zool.
- **Voelt sneller en strakker**, fijn voor wie de grond wil voelen.

## Voor wie?

Wie veel comfort zoekt, voelt zich vaak thuis op een Hoka. Wie houdt van een stevig, responsief gevoel, eerder op een On. Maar welke past, hangt af van hoe je landt.

## Pas ze allebei

In de winkel loop je met beide merken kort na elkaar. Dan weet je het na een paar minuten.`,
    [
      { q: "Wat is het verschil tussen Hoka en On?", a: "Hoka voelt zacht en beschermend met een rocker; On voelt directer en steviger." },
    ],
  ),

  "ghost-of-novablast": t(
    "Brooks Ghost of Asics Novablast voor dagelijkse trainingen",
    "De Brooks Ghost en de Asics Novablast naast elkaar: twee populaire neutrale trainingsschoenen voor elke dag.",
    `Twee van de populairste neutrale trainingsschoenen. Allebei geschikt voor elke dag, maar met een ander karakter.

## Brooks Ghost

- **Rustig en betrouwbaar.** Een schoen die je bijna vergeet tijdens het lopen.
- **Gemiddelde demping**, prettig op alle afstanden.
- **Past bij** lopers die een veilige, comfortabele keuze zoeken.

## Asics Novablast

- **Speels en veerkrachtig.** Meer terugvering, het voelt sneller.
- **Zacht schuim**, met een iets hogere zool.
- **Past bij** lopers die van wat bounce houden, en ook af en toe sneller lopen.

## Welke kies je?

Rustig en voorspelbaar: de Ghost. Veerkrachtig en speels: de Novablast. Beide zijn neutraal; rolt je voet flink naar binnen, kijk dan ook naar een stabiele schoen.

## Pas ze allebei

Het verschil voel je pas als je erop loopt.`,
    [
      { q: "Is de Novablast zachter dan de Ghost?", a: "Voor de meeste lopers voelt de Novablast zachter en veerkrachtiger, de Ghost rustiger." },
    ],
  ),

  "halve-maat-groter": t(
    "Hardloopschoenen een halve maat groter kopen: wel of niet?",
    "Moet je hardloopschoenen een halve maat groter kopen dan je gewone schoenen? Waarom vaak wel, en hoe je het checkt.",
    `## Vaak wel

Tijdens het lopen zetten je voeten een beetje uit, en je tenen schuiven naar voren, zeker bergaf. Daarom kopen veel lopers hun hardloopschoenen een halve maat groter dan hun gewone schoenen.

## Zo check je het

- **Een duimbreedte ruimte** tussen je langste teen en de neus van de schoen.
- **Je hiel glijdt niet weg** als je loopt.
- **Je tenen kunnen bewegen.**

## Maten verschillen per merk

Een 42 bij het ene merk is niet altijd een 42 bij het andere. Pas daarom altijd.

## Pas aan het eind van de dag

Dan zijn je voeten iets dikker, net als tijdens het lopen.`,
    [
      { q: "Moet ik hardloopschoenen groter kopen?", a: "Vaak een halve maat, zodat je een duimbreedte ruimte hebt voor je tenen. Pas altijd, want maten verschillen per merk." },
    ],
  ),

  "maximale-demping": t(
    "Zijn schoenen met maximale demping beter voor je knieën?",
    "Beschermen hardloopschoenen met maximale demping je knieën? Wat demping wel en niet doet.",
    `## Niet per definitie

Veel demping voelt comfortabel, zeker op lange afstanden en op asfalt. Maar er is geen bewijs dat meer schuim je knieën beschermt tegen blessures.

## Wat demping wel doet

- Het maakt lange afstanden comfortabeler.
- Het helpt bij herstelloopjes.
- Het voelt prettig voor zwaardere lopers.

## Wat demping niet doet

- Het voorkomt geen blessures door te snel opbouwen.
- Het lost geen knieklachten op.

## Wat helpt je knieën wel?

1. Rustig opbouwen.
2. Kracht in je heupen en bovenbenen.
3. Een schoen die past bij hoe je loopt.

## Knieklachten?

Blijft de pijn, ga dan naar een fysiotherapeut. In de winkel kun je wel kijken of je schoenen nog goed zijn.`,
    [
      { q: "Helpt veel demping tegen knieklachten?", a: "Niet per definitie. Rustig opbouwen en kracht in je heupen en bovenbenen helpen meer. Bij aanhoudende pijn ga je naar een fysiotherapeut." },
    ],
  ),

  "drop-hardloopschoen": t(
    "Wat is de drop van een hardloopschoen?",
    "De drop van een hardloopschoen uitgelegd: wat het is, wat het verschil maakt en hoe je kiest.",
    `## Wat is de drop?

Het hoogteverschil tussen je hiel en je voorvoet in de schoen. Een schoen met een drop van 10 mm heeft een hiel die 10 mm hoger is dan de voorvoet.

## Wat doet het?

- **Een hoge drop (8 tot 12 mm)** maakt het makkelijk om op je hiel te landen, en ontlast je kuiten en achillespees.
- **Een lage drop (0 tot 6 mm)** stimuleert landen op je middenvoet, en vraagt meer van je kuiten.

## Welke kies je?

De meeste lopers lopen goed op een gemiddelde drop. Wissel je naar een lagere drop, doe dat dan geleidelijk: je kuiten en achillespees moeten wennen.

## Achillespeesklachten?

Dan voelt een hogere drop vaak prettiger. Laat aanhoudende klachten nakijken.`,
    [
      { q: "Is een lage drop beter?", a: "Niet voor iedereen. Wissel je naar een lagere drop, doe dat geleidelijk: je kuiten moeten wennen." },
    ],
  ),

  intervaltraining: t(
    "Intervaltraining voor recreatieve lopers",
    "Intervaltraining voor recreatieve lopers: waarom het werkt, hoe je begint en drie trainingen om mee te starten.",
    `Wil je sneller worden, dan helpt intervaltraining. Maar als recreant hoef je niet op de baan te staan.

## Waarom werkt het?

Door kort sneller te lopen, train je je hart en je benen om een hoger tempo vol te houden.

## Hoe begin je?

Eén intervaltraining per week, naast je rustige loopjes. Altijd met een warming-up en cooling-down van tien minuten rustig lopen.

## Drie trainingen om mee te starten

1. **Minuten.** 6 × 1 minuut stevig, 1 minuut wandelen of rustig lopen.
2. **Piramide.** 1, 2, 3, 2, 1 minuut stevig, met even lang rustig ertussen.
3. **Heuvels.** 6 × 30 seconden een heuvel op, rustig naar beneden.

## Stevig, niet voluit

Je loopt sneller dan normaal, maar je kunt het tempo de hele training volhouden.

## Schoenen

Een lichte schoen voelt bij intervaltraining prettig. Veel lopers hebben er een tweede paar voor.`,
    [
      { q: "Hoe vaak doe ik intervaltraining?", a: "Eén keer per week, naast je rustige loopjes." },
    ],
  ),

  "glycerin-of-bondi": t(
    "Brooks Glycerin of Hoka Bondi voor lange duurlopen",
    "De Brooks Glycerin en de Hoka Bondi naast elkaar: twee schoenen met veel demping voor lange, rustige kilometers.",
    `Voor lange duurlopen kiezen veel lopers een schoen met veel demping. De Glycerin en de Bondi zijn twee bekende keuzes.

## Brooks Glycerin

- **Zacht en vol**, met een vertrouwd gevoel.
- **Een vlakkere zool** dan de Bondi.
- **Past bij** lopers die veel comfort willen zonder het rocker-gevoel.

## Hoka Bondi

- **Maximale demping**, een hoge zool.
- **Een rocker** die het afrollen makkelijk maakt.
- **Past bij** lopers die maximale bescherming zoeken, en bij zwaardere lopers.

## Welke kies je?

Wil je zacht maar vertrouwd: de Glycerin. Wil je maximaal en rollend: de Bondi. Pas ze allebei.`,
    [
      { q: "Welke heeft meer demping: Glycerin of Bondi?", a: "De Bondi heeft een hogere zool en voelt voor de meeste lopers nog voller dan de Glycerin." },
    ],
  ),

  "hardlopen-in-de-hitte": t(
    "Hardlopen in de hitte: drinken, tempo en tijdstip",
    "Veilig hardlopen als het warm is: wanneer je loopt, hoe je je tempo aanpast en hoeveel je drinkt.",
    `Hardlopen in de zomer is heerlijk, als je rekening houdt met de warmte.

## Kies je tijdstip

Vroeg in de ochtend of laat in de avond. Midden op de dag is het warmst en is de zon het sterkst.

## Pas je tempo aan

In de warmte werkt je hart harder. Loop rustiger dan normaal en laat je horloge voor wat het is.

## Drink

Drink voor je vertrekt, en neem bij lopen langer dan een uur iets mee. Bij veel zweten helpt sportdrank met zout.

## Kleding

Licht, ademend en een pet. Vergeet zonnebrand niet.

## Kies schaduw

Bos en water zijn koeler dan asfalt. De Veluwe, de duinen en de Oisterwijkse bossen zijn in de zomer ideaal.

## Luister naar je lichaam

Duizelig, misselijk of hoofdpijn? Stop, zoek schaduw en drink.`,
    [
      { q: "Hoe loop ik veilig in de hitte?", a: "Vroeg of laat lopen, rustiger tempo, genoeg drinken en schaduwrijke routes kiezen." },
    ],
  ),

  "waterdichte-hardloopschoenen": t(
    "Zijn waterdichte hardloopschoenen het waard?",
    "Waterdichte hardloopschoenen met Gore-Tex: voor wie ze zinvol zijn en wanneer je beter een gewone schoen kiest.",
    `## Voor wie zijn ze?

Voor lopers die in de herfst en winter vaak lopen in koud, nat weer, op natte paden zonder diepe plassen.

## De voordelen

- Droge voeten bij regen en natte grasvelden.
- Warmer in de winter.

## De nadelen

- Minder ventilatie: in warm weer worden je voeten zweterig.
- Komt er water van boven in, dan droogt de schoen juist slechter.

## Het alternatief

Een gewone schoen met goede, wollen hardloopsokken. Ook als ze nat worden, blijven je voeten warm.

## In de winkel

Twijfel je, vraag dan in de winkel welke keuze bij jouw routes past.`,
    [
      { q: "Zijn waterdichte hardloopschoenen zinvol?", a: "Bij koud, nat weer zonder diepe plassen wel. Komt er water van boven in, dan drogen ze juist slechter." },
    ],
  ),

  "vorig-seizoen": t(
    "Hardloopschoenen van vorig seizoen kopen: slim of niet?",
    "Is een hardloopschoen van vorig seizoen een slimme keuze? Wanneer het prima is en waar je op let.",
    `## Vaak prima

Een nieuw model is meestal een kleine aanpassing van het vorige. Een schoen van vorig seizoen loopt vaak bijna hetzelfde.

## Waar let je op?

- **Pasvorm.** Soms verandert de bovenkant tussen versies, en zit een model net anders.
- **Je eigen model.** Liep je goed op een versie, dan is diezelfde versie een veilige keuze.
- **Leeftijd.** Schuim veroudert ook in de doos, maar een schoen van een jaar oud is prima.

## Pas altijd

Ook bij een vertrouwd model: pas hem even. Dan weet je zeker dat hij nog zit zoals je gewend bent.`,
    [
      { q: "Is een hardloopschoen van vorig jaar nog goed?", a: "Ja, meestal loopt hij bijna hetzelfde als het nieuwe model. Pas hem wel even, want de pasvorm kan net anders zijn." },
    ],
  ),

  "waterdichte-hardloopjas": t(
    "Welke hardloopjas is echt waterdicht?",
    "Waterdicht, waterafstotend of winddicht: welke hardloopjas past bij jouw rondes in de herfst en winter.",
    `Een hardloopjas moet regen tegenhouden en tegelijk ademen. Dat is lastiger dan het klinkt.

## Drie soorten

1. **Windjack.** Licht, houdt wind tegen, een buitje is geen probleem. Voor de meeste dagen genoeg.
2. **Waterafstotend jack.** Houdt lichte regen een tijd tegen, ademt goed.
3. **Waterdicht jack.** Houdt echte regen tegen, maar ademt minder.

## Waar let je op?

- **Ventilatie**: openingen onder de armen of op de rug.
- **Reflectie** voor in het donker.
- **Een kap** die meedraait als je je hoofd draait.

## Welke kies je?

Loop je in een stad als Groningen met veel wind, dan is een windjack vaak het fijnst. Loop je lang in de regen, kies dan een waterdicht jack met goede ventilatie.

## Probeer het

In de winkel kun je jacks passen en voelen hoe ze zitten als je beweegt.`,
    [
      { q: "Moet een hardloopjas waterdicht zijn?", a: "Niet altijd. Een windjack of waterafstotend jack is voor de meeste dagen genoeg en ademt beter." },
    ],
  ),

  herfstkleding: t(
    "Hardloopkleding voor de herfst: wat heb je echt nodig?",
    "Hardloopkleding voor de herfst: wat je echt nodig hebt als het kouder, natter en donkerder wordt.",
    `De herfst is een prachtig seizoen om te lopen. Met de juiste kleding blijf je warm, droog en zichtbaar.

## Wat heb je echt nodig?

1. **Een shirt met lange mouw** dat vocht afvoert.
2. **Een windjack** voor wind en buien.
3. **Een driekwart of lange tight** als het onder de tien graden komt.
4. **Verlichting en reflectie**, want het wordt vroeg donker.

## Handig

- Een buff voor je nek en oren.
- Dunne handschoenen.
- Een pet tegen de regen.

## De vuistregel

Kleed je alsof het tien graden warmer is. Na een kilometer heb je het warm genoeg.

## Schoenen in de herfst

Natte bladeren en klinkers zijn glad. Een schoen met goede grip maakt het verschil.`,
    [
      { q: "Wat trek ik aan bij het hardlopen in de herfst?", a: "Een shirt met lange mouw, een windjack, een tight als het kouder wordt, en verlichting voor het donker." },
    ],
  ),

  "hardlopen-in-de-regen": t(
    "Hardlopen in de regen: schoenen, jas en grip",
    "Hardlopen in de regen zonder koud en nat te worden: welke schoenen, jas en sokken je kiest, en hoe je je schoenen droogt.",
    `Regen is geen reden om thuis te blijven. Met de juiste uitrusting is het zelfs heerlijk.

## Schoenen

Kies een schoen met goede grip op nat wegdek: zacht rubber en een fijn profiel. Waterdichte schoenen houden lichte regen tegen, maar drogen slecht als er water in komt.

## Jas

Een licht, waterafstotend jack houdt je droog genoeg en ademt. Bij harde regen een waterdicht jack met ventilatie.

## Sokken

Wollen hardloopsokken houden je voeten warm, ook als ze nat zijn. Katoen niet.

## Na afloop

- Haal de inlegzolen eruit en prop krantenpapier in je schoenen.
- Droog ze niet op de verwarming: dat beschadigt het schuim.

## Veiligheid

Regen betekent minder zicht. Draag reflectie, ook overdag.`,
    [
      { q: "Hoe droog ik natte hardloopschoenen?", a: "Haal de zolen eruit en prop krantenpapier in je schoenen. Niet op de verwarming." },
    ],
  ),

  "schoenen-op": t(
    "Wanneer zijn je hardloopschoenen op?",
    "Vier signalen dat je hardloopschoenen op zijn, en waarom je beter naar de schoen kijkt dan naar de kilometerteller.",
    `## Vier signalen

1. **De zool is glad** op de plekken waar je landt of afzet.
2. **Het schuim voelt hard**, of heeft diepe vouwen aan de zijkant.
3. **De schoen zakt naar één kant** als je hem op tafel zet.
4. **Je benen voelen anders** na een loop: zwaarder, of met lichte pijntjes die eerder niet kwamen.

## De kilometerteller

Meestal zijn schoenen op tussen de 600 en 1.000 kilometer. Maar een lichte loper op bospaden komt verder dan een zware loper op asfalt.

## Twijfel je?

Neem ze mee naar de winkel. Het kan ook zijn dat ze nog prima zijn.`,
    [
      { q: "Hoe weet ik dat mijn hardloopschoenen op zijn?", a: "Een gladde zool, hard schuim, een schoen die scheef zakt of benen die anders aanvoelen na een loop." },
    ],
  ),

  winterlagen: t(
    "Winterhardlopen: de lagen die je warm en droog houden",
    "Hardlopen in de winter met drie lagen: welke kleding je kiest, wanneer je een laag weglaat en wat je aan je handen en hoofd draagt.",
    `In de winter is de juiste kleding het verschil tussen een heerlijke en een ellendige loop.

## Laag 1: de basis

Een nauwsluitend shirt dat vocht van je huid afvoert. Merinowol of een technische stof. Geen katoen.

## Laag 2: warmte

Een dunne fleece of thermoshirt. Alleen nodig als het vriest of hard waait.

## Laag 3: bescherming

Een windjack of waterafstotend jack tegen wind en regen.

## Benen

Een lange tight, en bij strenge vorst een tight met een warme binnenkant.

## Hoofd en handen

Een muts of buff, en handschoenen. Je verliest veel warmte via je hoofd en handen.

## De vuistregel

Kleed je alsof het tien graden warmer is. Bij de start voel je het, na tien minuten ben je blij.`,
    [
      { q: "Hoeveel lagen draag ik bij het hardlopen in de winter?", a: "Een basislaag, bij vorst een warme tweede laag, en een jack tegen wind en regen." },
    ],
  ),

  reflecterend: t(
    "Reflecterende kleding en verlichting voor de donkere maanden",
    "Gezien worden als je in het donker loopt: reflectie, lampen en waar je ze draagt.",
    `Van november tot februari loop je vaak in het donker. Automobilisten en fietsers moeten je op tijd zien.

## Reflectie

- **Op bewegende delen.** Enkels, polsen en schoenen vallen meer op dan je romp.
- **Aan voor- en achterkant.**
- **Een hesje** is licht en goedkoop, en maakt een groot verschil.

## Licht

- **Een hoofd- of borstlamp** om zelf te zien.
- **Een knipperlicht achter** om gezien te worden.

## Kies je route

Verlichte routes zijn veiliger. Loop je toch in het donker op onverlichte paden, ken dan de route en draag een sterke lamp.

## In de winkel

In de RunX-winkels vind je reflecterende kleding, hesjes en lampen.`,
    [
      { q: "Waar draag ik reflectie bij het hardlopen?", a: "Op bewegende delen zoals enkels en polsen, aan voor- en achterkant." },
    ],
  ),

  hardloopsokken: t(
    "Het verschil tussen een gewone en een hardloopsok",
    "Waarom een hardloopsok iets anders is dan een gewone sok, en hoe je blaren voorkomt.",
    `## Wat maakt een hardloopsok anders?

- **Geen of platte naden**, zodat er niets schuurt.
- **Ademende stof** die vocht afvoert. Geen katoen.
- **Een anatomische vorm**, soms met een linker- en rechtersok.
- **Extra demping** op de hiel en de bal van je voet.

## Waarom maakt het uit?

Katoen houdt vocht vast. Natte sokken schuren, en dan krijg je blaren.

## Dun of dik?

Een dunne sok geeft meer gevoel, een dikkere meer demping. Pas je schoenen met de sokken waarin je loopt.

## Merken

In de RunX-winkels vind je onder meer sokken van Falke, Feetures en RunX zelf.`,
    [
      { q: "Waarom zou ik hardloopsokken kopen?", a: "Ze voeren vocht af en hebben geen schurende naden, waardoor je minder snel blaren krijgt." },
    ],
  ),

  "horloge-feestdagen": t(
    "Een sporthorloge kopen voor de feestdagen",
    "Een sporthorloge cadeau doen of zelf kopen voor de feestdagen: waar je op let, en welk merk bij welke loper past.",
    `Een sporthorloge is een populair cadeau. Maar welk horloge past bij welke loper?

## Voor de beginner

Een eenvoudig model met goede gps en hartslag aan de pols. Meer is niet nodig.

## Voor de wedstrijdloper

Een horloge waarop je trainingen kunt zetten, met een goede app om je vooruitgang te volgen.

## Voor de trailloper

Een lange batterij en navigatie, zodat je ook op onbekende routes de weg vindt.

## Garmin, Coros of Polar?

Garmin heeft veel keuze en een uitgebreide app. Coros staat bekend om een lange batterij en eenvoud. Polar om goede hartslagmeting.

## Twijfel je?

Een cadeaubon is altijd raak. Dan kiest de loper zelf, en past hij of zij het horloge in de winkel.`,
    [
      { q: "Welk sporthorloge geef ik aan een beginnende loper?", a: "Een eenvoudig model met goede gps en hartslag aan de pols." },
    ],
  ),

  "cadeaus-feestdagen": t(
    "Hardloopcadeaus voor de feestdagen",
    "Cadeautips voor hardlopers voor de feestdagen, van kleine verrassingen tot een cadeaubon voor nieuwe schoenen.",
    `Een hardloper verrassen tijdens de feestdagen? Een paar ideeën, van klein tot groot.

## Klein

- Goede hardloopsokken.
- Een buff of muts.
- Energiegels om uit te proberen.

## Middel

- Een hoofdlamp voor de donkere ochtenden.
- Handschoenen die werken met een touchscreen.
- Een foamroller.

## Groot

- Een sporthorloge.
- Een nieuw windjack.
- Een cadeaubon voor nieuwe schoenen, met de loopanalyse erbij.

## Een inschrijving

Een startbewijs voor een wedstrijd in het voorjaar geeft een doel voor de winter.`,
    [
      { q: "Wat is een goed klein cadeau voor een hardloper?", a: "Goede hardloopsokken, een buff of energiegels om uit te proberen." },
    ],
  ),

  "hartslagband-of-pols": t(
    "Een hartslagband of polsmeting: wat is nauwkeuriger?",
    "Hartslag meten met een borstband of aan je pols: wat het verschil is, en wanneer een borstband de moeite waard is.",
    `## Aan de pols

Bijna elk sporthorloge meet je hartslag aan de pols. Handig: je hoeft niets extra's te dragen.

**Nauwkeurig genoeg** voor rustige duurlopen.

**Minder nauwkeurig** bij intervallen, in de kou en bij een losse band: de meting loopt dan soms achter.

## Met een borstband

Een borstband meet de elektrische signalen van je hart, en is daardoor nauwkeuriger en sneller.

**Handig voor** wie traint op hartslagzones, of intervallen doet.

## Wat kies je?

Loop je vooral rustig: de pols is genoeg. Train je serieus op zones: een borstband. Veel lopers combineren het.

## In de winkel

Hartslagbanden van Garmin, Polar en Coros werken samen met de horloges van die merken.`,
    [
      { q: "Is een hartslagband nauwkeuriger dan meten aan de pols?", a: "Ja, zeker bij intervallen en in de kou. Voor rustige duurlopen is de pols nauwkeurig genoeg." },
    ],
  ),
};
