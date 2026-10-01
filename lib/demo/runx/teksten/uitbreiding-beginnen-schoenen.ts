/** Extra secties voor de clusters beginnen en schoenen. Zie `uitbreiden()` in `index.ts`. */
import type { Uitbreiding } from "@/lib/demo/runx/teksten/type";

const groep: Uitbreiding = {
  tekst: `## Wat beginners vaak vragen

**Ben ik niet te oud om te beginnen?** Nee. In de beginnersgroepen lopen mensen van twintig tot zeventig.

**Ik ben niet fit, kan ik wel meedoen?** Ja. Je begint met afwisselend wandelen en hardlopen, op je eigen tempo.

**Wat als ik een training mis?** Dan sluit je de week erna gewoon weer aan, en loop je thuis een keer extra.

## Na de beginnersgroep

Na tien weken loop je een halfuur. Veel lopers stromen daarna door naar een vaste loopgroep, of kiezen een eerste loop van vijf kilometer als doel.`,
  faq: [{ q: "Ben ik niet te oud om te beginnen met hardlopen?", a: "Nee, in de beginnersgroepen lopen mensen van twintig tot zeventig." }],
};

export const UITBREIDING_BEGINNEN_SCHOENEN: Record<string, Uitbreiding> = {
  "beginnen-in-januari": {
    tekst: `## Waarom februari het moeilijkst is

Na de eerste weken is de nieuwigheid eraf, het is nog steeds donker en koud, en de vooruitgang lijkt traag. Juist dan helpt het om een groep of maatje te hebben, en een doel in het voorjaar.

## Een doel voor het voorjaar

Kies een loop van vijf kilometer in maart of april, in je eigen regio. Dan heb je in februari een reden om door te gaan.`,
  },
  "schoenen-voor-beginners": {
    tekst: `## Wat je in de winkel moet vertellen

- Dat je net begint, en hoe vaak je wilt lopen.
- Waar je loopt: straat, bos of loopband.
- Of je klachten hebt of had, aan knieën, voeten of rug.

## Hoe lang gaat je eerste schoen mee?

Bij drie keer per week lopen meestal een tot anderhalf jaar. Laat hem dan nakijken: je bent in dat jaar anders gaan lopen, en je tweede schoen kan heel anders uitvallen dan je eerste.`,
  },
  "beginnersgroep-haarlem": groep,
  "beginnersgroep-groningen": groep,
  "beginnersgroep-apeldoorn": groep,
  "beginnersgroep-tilburg": groep,
  "beginnersgroep-twente": groep,
  "beginnersgroep-zaandam": groep,
  "hoe-vaak-hardlopen": {
    tekst: `## Een voorbeeldweek voor beginners

| Dag | Wat |
|---|---|
| Maandag | Hardlopen |
| Dinsdag | Rust of wandelen |
| Woensdag | Hardlopen |
| Donderdag | Rust of fietsen |
| Vrijdag | Rust |
| Zaterdag | Hardlopen |
| Zondag | Rust of wandelen |

## Signalen dat het te veel is

Je blijft moe, je slaapt slechter, je hebt zin om over te slaan, of je krijgt pijntjes op dezelfde plek. Neem dan een paar dagen extra rust.`,
  },
  "buiten-adem": {
    tekst: `## Ademhalen tijdens het hardlopen

Er is geen vaste techniek die je moet leren. Adem door je mond en neus samen, rustig en diep. Sommige lopers vinden een ritme prettig, bijvoorbeeld drie passen in en twee passen uit. Probeer het, maar forceer het niet.

## Steken in je zij

Krijg je steken, loop dan even langzamer of wandel, en adem diep uit. Eet niet vlak voor het lopen een grote maaltijd.`,
  },
  "hardlopen-met-overgewicht": {
    tekst: `## Een voorbeeld van de eerste weken

| Week | Per training |
|---|---|
| 1 en 2 | 30 minuten stevig wandelen |
| 3 en 4 | 6 × 1 minuut hardlopen, 3 minuten wandelen |
| 5 en 6 | 6 × 2 minuten hardlopen, 2 minuten wandelen |
| 7 tot 10 | Langzaam verder opbouwen |

## Niet de weegschaal, maar de vooruitgang

Kijk naar wat je kunt: langer lopen, makkelijker ademen, sneller herstellen. Dat is de vooruitgang die telt.`,
  },
  "wat-heb-je-nodig": {
    tekst: `## Kleding per seizoen

- **Zomer:** shirt en korte broek, een pet.
- **Herfst en voorjaar:** shirt met lange mouw, een licht jack.
- **Winter:** lagen, handschoenen en een muts, en verlichting.

## Waar je op bespaart en waar niet

Bezuinig gerust op kleding: een eenvoudig sportshirt doet het prima. Bezuinig niet op schoenen: die bepalen of je pijnvrij begint.`,
  },
  "hardloopapp-beginners": {
    tekst: `## Data en motivatie

Zie je elke week een stijgende lijn, dan helpt dat. Maar laat je niet gek maken door snelheid of hartslag: als beginner gaat het om regelmaat, niet om cijfers.

## Een paar tips

1. Zet meldingen voor je trainingen aan.
2. Deel je loopjes met een vriend of de groep.
3. Kijk na een maand terug: je ziet hoeveel je al kunt.`,
  },
  "van-vijf-naar-tien": {
    tekst: `## Een voorbeeld van de lange duurloop per week

| Week | Lange loop |
|---|---|
| 1 | 5 km |
| 2 | 6 km |
| 3 | 7 km |
| 4 | 6 km (rustig) |
| 5 | 8 km |
| 6 | 9 km |
| 7 | 7 km (rustig) |
| 8 | 10 km |

## Eten en drinken

Bij loopjes tot een uur heb je onderweg niets nodig. Eet een paar uur voor je loopt iets lichts.`,
  },
  "eerste-wedstrijd": {
    tekst: `## Wat je meeneemt op de dag

- Je startnummer en veiligheidsspelden.
- Kleding die je kent, ook als het weer anders is dan gedacht.
- Iets warms voor na de finish.
- Water en iets kleins te eten.

## De sfeer

Een eerste wedstrijd is spannend en feestelijk. Geniet ervan, kijk om je heen en vergeet even je horloge.`,
  },
  "interval-of-rustig": {
    tekst: `## Hoe rustig is rustig?

Zo rustig dat je in hele zinnen kunt praten. Voor veel beginners voelt dat bijna als wandelen. Dat is goed: het grootste deel van je training hoort zo te voelen, ook later.

## De verhouding

Ook ervaren lopers lopen het grootste deel van hun kilometers rustig, en maar een klein deel snel. Wie elke training hard loopt, raakt vroeg of laat overbelast.`,
  },
  "ochtend-of-avond": {
    tekst: `## Lopen en slapen

Een zware training laat op de avond kan je slaap verstoren. Loop je 's avonds, kies dan voor een rustige loop, en laat een uur tussen lopen en slapen.

## Lopen en werk

Veel lopers combineren het: in de ochtend een rustige loop, in het weekend de lange duurloop. Kijk wat in jouw week past.`,
  },
  "loopband-of-buiten": {
    tekst: `## Een winterweek

- **Doordeweeks in het donker:** intervallen op de loopband.
- **In het weekend bij daglicht:** een lange duurloop buiten.
- **Bij ijzel of storm:** een extra dag binnen.

## Schoenen voor binnen en buiten

Op de loopband kun je prima in je gewone schoenen lopen. Buiten in de winter is grip op natte straten belangrijker.`,
  },
  "eerste-maand": {
    tekst: `## Na de eerste maand

Na vier weken loop je twintig minuten hardlopen per training, afgewisseld met wandelen. In de tweede maand bouw je verder op naar een halfuur. Kies dan een doel: een loop van vijf kilometer in maart of april.

## Wat je opschrijft

Houd een eenvoudig logboek bij: datum, wat je deed, hoe het voelde. Na een maand zie je hoeveel je al gegroeid bent.`,
  },
  "beste-beginnersschoen": {
    tekst: `## Waar je beter niet mee begint

- **Een carbon wedstrijdschoen.** Gemaakt voor snelheid, niet voor beginnen.
- **Een minimalistische schoen.** Te weinig demping voor iemand die net begint.
- **Een modeschoen die op een hardloopschoen lijkt.** Mooi, maar niet gemaakt voor kilometers.

## Na een half jaar

Laat je schoenen na een half jaar nakijken. Je loopt dan vaak anders dan bij de start, en je tweede schoen kan een ander model worden.`,
  },
  beginnersgroepen: groep,
  "feestdagen-ritme": {
    tekst: `## Een feestdagenweek

| Dag | Wat |
|---|---|
| Kerstavond | Rustig loopje van twintig minuten |
| Eerste kerstdag | Rust |
| Tweede kerstdag | Kerstloop met familie of vrienden |
| Oudejaarsdag | Een laatste loop van het jaar |
| Nieuwjaarsdag | Rust, of een rustige eerste loop |

## Eten en lopen

Een grote maaltijd en daarna lopen gaat zelden goed. Loop liever in de ochtend.`,
  },
  "doelen-nieuw-jaar": {
    tekst: `## Doelen per niveau

- **Beginner:** een halfuur hardlopen, en een eerste loop van vijf kilometer.
- **Gevorderd:** een tien kilometer of de Dam tot Damloop.
- **Ervaren:** een halve of hele marathon, of een trailloop.

## Een doel naast de tijd

Niet elk doel hoeft over snelheid te gaan. Het hele jaar drie keer per week lopen, of een nieuwe route per maand, zijn net zo goed.`,
  },
  "hardloopschoenen-vervangen": {
    tekst: `## Een logboek helpt

Noteer in je horloge of app welke schoen je bij elke loop draagt. Dan zie je precies hoeveel kilometers een paar heeft gelopen.

## Oude schoenen een tweede leven geven

Een paar dat op is voor hardlopen, is vaak nog prima om in te wandelen of in de tuin te werken.`,
  },
  "brede-voeten": {
    tekst: `## Hoe weet je of je brede voeten hebt?

- Je schoenen drukken aan de zijkant, bij de bal van je voet.
- Je kleine teen schuurt.
- De bovenkant van je schoen bolt aan de zijkant uit.

## Een halve maat groter is niet de oplossing

Een grotere maat maakt de schoen ook langer, waardoor je voet gaat schuiven. Een brede leest in je eigen maat werkt beter.`,
  },
  "winterkleding-lagen": {
    tekst: `## Wat je in de winter vaak vergeet

- **Je oren.** Een buff of hoofdband.
- **Je nek.** Een buff die je omhoog kunt trekken.
- **Je handen.** Dunne handschoenen zijn vaak genoeg.

## Na de loop

Trek direct droge kleding aan. Met natte kleding koel je snel af, ook binnen.`,
  },
  "verlichting-hardlopen": {
    tekst: `## Hoe sterk moet je lamp zijn?

In de stad met straatverlichting is een lichte lamp genoeg om gezien te worden. Op onverlichte paden in het bos wil je een lamp die het pad voor je goed verlicht. Kijk naar het aantal lumen en de batterijduur.

## Opladen

Laad je lamp na elke loop op. Niets zo vervelend als een lege lamp halverwege een bospad.`,
  },
  "grip-natte-straten": {
    tekst: `## Hoe loop je veilig op natte straten?

- Maak kortere passen.
- Pas op voor putdeksels, markeringen en metalen platen: die zijn extra glad.
- Neem bochten rustig.

## Grip slijt

Het profiel van je schoen slijt. Is je zool glad op de plekken waar je landt, dan verlies je grip. Een reden om je schoenen te laten nakijken.`,
  },
  "sporthorloge-kiezen": {
    tekst: `## Batterij

Een gewoon hardloophorloge gaat met gps meestal een paar dagen tot een week mee. Wie lange trails of ultra's loopt, kijkt naar modellen met een langere batterij.

## Het scherm

Een groot, helder scherm lees je makkelijker tijdens het lopen, zeker in de zon. Pas het horloge in de winkel en kijk of je de cijfers goed kunt lezen.`,
  },
  "garmin-of-coros": {
    tekst: `## Samenwerken met je app

Beide merken werken samen met Strava en andere trainingsapps. Gebruik je al een app, kijk dan of je horloge daar makkelijk mee koppelt.

## Overstappen

Stap je over van het ene merk naar het andere, dan kun je je oude loopjes meestal via je trainingsapp bewaren.`,
  },
  hardloopcadeaus: {
    tekst: `## Cadeaus voor elk budget

- **Klein:** sokken, een buff, een paar gels.
- **Middel:** een lamp, handschoenen, een foamroller.
- **Groot:** een horloge, een jack, een cadeaubon voor schoenen.

## Het beste cadeau

Een gezamenlijke loop of een startbewijs voor een wedstrijd. Een herinnering die langer blijft dan een product.`,
  },
  "twee-paar-afwisselen": {
    tekst: `## Hoe je afwisselt

- **Twee keer per week:** de rustige schoen.
- **Een keer per week:** de snellere schoen voor tempo.
- **In het weekend:** de rustige schoen voor de lange duurloop.

## Twee keer hetzelfde model?

Kan ook. Dan heeft elk paar een dag rust, en heb je altijd een droog paar.`,
  },
  "zwaardere-lopers": {
    tekst: `## Opbouwen als zwaardere loper

Je lichaam vangt bij elke pas meer op. Bouw daarom extra rustig op, en wissel af met fietsen of zwemmen. Je conditie groeit dan snel, terwijl je gewrichten kunnen wennen.

## Ondergrond

Een bospad of gravelpad is zachter dan asfalt, en voor zwaardere lopers in het begin prettig.`,
  },
  "hoka-of-on": {
    tekst: `## Voor welke training?

- **Lange, rustige duurlopen:** veel lopers kiezen Hoka.
- **Tempo en kortere loopjes:** veel lopers kiezen On.

## Wat ze gemeen hebben

Beide merken zijn de afgelopen jaren sterk gegroeid, ook buiten het hardlopen. Laat je niet leiden door hoe ze eruitzien: kies op hoe ze lopen.`,
  },
  "ghost-of-novablast": {
    tekst: `## Hoe lang gaan ze mee?

Beide zijn gebouwd voor veel kilometers. Bij normaal gebruik gaan ze lang mee; laat ze nakijken als het schuim hard aanvoelt of de zool glad wordt.

## Als tweede schoen

Veel lopers hebben de een als rustige schoen en de ander als snellere. Het verschil in gevoel maakt ze een goede combinatie.`,
  },
  "halve-maat-groter": {
    tekst: `## Signalen dat je schoen te klein is

- Blauwe of zwarte teennagels.
- Blaren op je tenen.
- Pijn bij bergaf lopen.

## Signalen dat hij te groot is

- Je hiel glijdt omhoog.
- Je voet schuift naar voren in een bocht.
- Je moet je veters heel strak trekken.`,
  },
  "maximale-demping": {
    tekst: `## Voor wie is maximale demping wel fijn?

- Lopers die lange, rustige afstanden lopen.
- Zwaardere lopers.
- Lopers die na een blessure weer opbouwen, als hun zorgverlener dat goed vindt.

## Waar je op let

Een hoge zool is minder stabiel. Kies een model met een brede basis, en loop er eerst rustig op.`,
  },
  "drop-hardloopschoen": {
    tekst: `## Hoe wissel je naar een lagere drop?

1. Gebruik de nieuwe schoen eerst voor korte loopjes.
2. Bouw in een paar weken op naar langere afstanden.
3. Let op je kuiten en achillespees: worden ze stijf, ga dan terug.

## De drop staat op de doos

De meeste merken vermelden de drop in millimeters. Vraag in de winkel als je twijfelt.`,
  },
  intervaltraining: {
    tekst: `## Hoe snel is stevig?

Ongeveer het tempo dat je een halfuur tot een uur zou kunnen volhouden in een wedstrijd. Niet voluit sprinten.

## Herstel tussen de blokken

Wandel of jog rustig. Je hart moet een beetje tot rust komen voor het volgende blok.

## Waar?

Een atletiekbaan, een vlak stuk langs het water, of de loopband in de winter.`,
  },
  "glycerin-of-bondi": {
    tekst: `## Voor welke loper?

- **Zwaardere lopers** kiezen vaak de Bondi, voor zijn brede basis.
- **Lopers die een vertrouwd gevoel zoeken** kiezen vaak de Glycerin.

## Als tweede schoen

Beide werken goed als herstelschoen naast een snellere trainingsschoen.`,
  },
  "hardlopen-in-de-hitte": {
    tekst: `## Wennen aan warmte

Je lichaam past zich in een week of twee aan warmte aan. Bouw je trainingen in die weken rustig op.

## Signalen om te stoppen

Duizeligheid, misselijkheid, hoofdpijn, kippenvel of ophouden met zweten. Stop, zoek schaduw, drink en koel af.`,
  },
  "waterdichte-hardloopschoenen": {
    tekst: `## Hoe test je of je ze nodig hebt?

Loop een week met wollen sokken in je gewone schoenen. Heb je het nog steeds koud en nat, dan kan een waterdichte schoen het verschil maken.

## Onderhoud

Spoel modder eraf met lauw water, en laat ze drogen zonder verwarming.`,
  },
  "vorig-seizoen": {
    tekst: `## Waarom veranderen modellen elk jaar?

Merken passen hun schoenen aan: een ander schuim, een andere bovenkant, soms een andere vorm. Soms is dat een verbetering, soms gewoon een andere smaak.

## Je vertrouwde model is veranderd?

Pas het nieuwe model en vergelijk het met je oude. Voelt het anders, laat je dan adviseren over een alternatief.`,
  },
  "waterdichte-hardloopjas": {
    tekst: `## Zo blijf je droog én loop je niet te zweten

- Kies een jas met ventilatie.
- Draag eronder een dunne basislaag die vocht afvoert.
- Doe de rits een stukje open als je het warm krijgt.

## Onderhoud

Was je jas volgens het label, zonder wasverzachter. Zo blijft de waterafstotende laag langer werken.`,
  },
  herfstkleding: {
    tekst: `## Een herfstoutfit per temperatuur

| Temperatuur | Wat |
|---|---|
| Boven 12 °C | Shirt met korte mouw, korte broek |
| 8 tot 12 °C | Shirt met lange mouw, korte broek of driekwart |
| 4 tot 8 °C | Lange mouw, windjack, tight |

## Natte herfstdagen

Een pet houdt de regen uit je ogen, en een licht jack houdt de wind tegen.`,
  },
  "hardlopen-in-de-regen": {
    tekst: `## Voordelen van lopen in de regen

- Het is rustig op straat.
- Je lichaam koelt goed af.
- Je wordt mentaal sterker, en een wedstrijd in de regen schrikt je niet meer af.

## Na afloop

Neem direct een warme douche, en trek droge kleding aan. Een natte loper koelt snel af.`,
  },
  "schoenen-op": {
    tekst: `## Waarom het uitmaakt

Een schoen die op is, dempt minder en geeft minder steun. Je merkt dat niet in één loop, maar wel na een paar weken: zwaardere benen, en soms pijntjes die je niet kunt verklaren.

## Wat je met oude schoenen doet

Gebruik ze om in te wandelen of te tuinieren, of lever ze in voor hergebruik.`,
  },
  winterlagen: {
    tekst: `## Lopen in sneeuw en ijzel

- Maak kortere passen.
- Kies paden met sneeuw boven gladde stukken asfalt.
- Overweeg een trailschoen voor meer grip.
- Bij ijzel: de loopband.

## Opwarmen binnen

Warm binnen een paar minuten op voor je de kou in gaat. Je spieren zijn dan soepeler.`,
  },
  reflecterend: {
    tekst: `## Hoe ver word je gezien?

In donkere kleding word je door een automobilist pas op korte afstand gezien. Met reflectie op enkels en polsen al van veel verder. Dat geeft tijd om te remmen of uit te wijken.

## Overdag in de winter

Ook overdag is het in de winter vaak grijs en donker. Een felle kleur jas helpt.`,
  },
  hardloopsokken: {
    tekst: `## Blaren voorkomen

1. Draag hardloopsokken zonder naden.
2. Zorg dat je schoenen de juiste maat hebben.
3. Houd je voeten droog.
4. Smeer gevoelige plekken in met een anti-schuurmiddel bij lange lopen.

## Hoe lang gaan ze mee?

Zie je dunne plekken of gaten, vervang ze dan. Een versleten sok schuurt sneller.`,
  },
  "horloge-feestdagen": {
    tekst: `## Een horloge voor elk budget

- **Instap:** gps, hartslag en een overzichtelijke app.
- **Middenklasse:** trainingen, langere batterij, meer data.
- **Top:** navigatie, kaarten en de langste batterij.

## Na het uitpakken

Koppel het horloge aan de app, stel je hartslagzones in en loop eerst een paar keer rustig om te wennen aan het scherm.`,
  },
  "cadeaus-feestdagen": {
    tekst: `## Cadeaus voor elke loper

- **Beginner:** goede sokken en een buff.
- **Wedstrijdloper:** energiegels en een startbewijs.
- **Trailloper:** een hardloopvest of hoofdlamp.
- **HYROX-sporter:** een stevige schoen voor training.

## Inpakken met een plan

Een startbewijs voor een loop in het voorjaar, met een briefje "ik loop mee": het cadeau dat de hele winter motiveert.`,
  },
  "hartslagband-of-pols": {
    tekst: `## Trainen op hartslag

Met hartslagzones train je op gevoel met een getal erbij. De meeste trainingen loop je in een lage zone, waarin je makkelijk kunt praten. Een paar trainingen per week hoger.

## Je zones bepalen

Je maximale hartslag verschilt per persoon. Een inspanningstest is het nauwkeurigst; een stevige test op de baan geeft een goede schatting.`,
  },
};
