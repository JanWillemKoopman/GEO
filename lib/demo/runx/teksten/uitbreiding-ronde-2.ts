/** Tweede ronde extra secties, voor de pagina's die na de eerste ronde nog kort waren. Zie `uitbreiden()` in `index.ts`. */
import type { Uitbreiding } from "@/lib/demo/runx/teksten/type";

const u = (tekst: string): Uitbreiding => ({ tekst });

export const UITBREIDING_RONDE_2: Record<string, Uitbreiding> = {
  "kousen-of-sleeves": u(`## In het kort

- **Herstel na een lange loop of wedstrijd:** kousen.
- **Tijdens het lopen, met je eigen sokken:** sleeves.
- **Op reis na een wedstrijd:** kousen.

## Veelgemaakte fouten

1. Een maat kiezen op schoenmaat in plaats van kuitomvang.
2. Ze voor het eerst dragen tijdens een marathon.
3. Ze in de droger doen, waardoor de druk verloren gaat.`),
  herstelschoenen: u(`## Wat lopers in de winkel vragen

**"Kan ik ze ook de hele dag dragen?"** Veel lopers doen dat, zeker op dagen dat ze lang staan.

**"Helpen ze tegen hielpijn?"** Sommige lopers vinden ze prettig bij hielklachten. Laat aanhoudende pijn nakijken.

**"Zijn het gewoon dure slippers?"** Het verschil zit in het schuim en het voetbed. Probeer ze in de winkel, dan voel je het.`),
  "rugzak-kiezen": u(`## Wat lopers vaak vergeten

- Een fluitje, voor als je hulp nodig hebt.
- Een klein EHBO-setje met pleisters.
- Een zakje voor je afval.

## Voor vrouwen en mannen

Veel merken maken vesten in een dames- en herenpasvorm. Het verschil zit in de borstbandjes en de lengte. Pas allebei als je twijfelt.`),
  "hyrox-schoenen-zaandam": u(`## Wat Zaanse HYROX-sporters vragen

**"Kan ik in mijn hardloopschoen?"** Als hij niet te hoog en te zacht is, vaak wel.

**"Moet ik een speciale schoen?"** Niet per se. Een stevige hardloopschoen werkt voor de meesten.

**"Welke maat?"** Je eigen hardloopmaat, met een pasvorm die vastzit bij zijwaartse bewegingen.

## Voor Amsterdam-Noord

Ook HYROX-sporters uit Noord komen naar Zaandam. Met de pont en de fiets ben je er snel.`),
  "herstel-dam-tot-dam": u(`## Wat je voelt

Stijve kuiten, zware bovenbenen en soms een dag of twee moe: allemaal normaal na tien Engelse mijl op wedstrijdtempo.

## Wanneer je je zorgen maakt

Pijn op één plek die niet minder wordt, of pijn die erger wordt als je weer gaat lopen. Laat het dan nakijken.

## Een volgend doel

Veel lopers kiezen na de Dam tot Damloop een halve marathon in het najaar, of een rustige winter met een doel in het voorjaar.`),
  "kracht-mobiliteit": u(`## Voor wie weinig tijd heeft

Geen kwartier? Doe dan alleen kuitheffen en het bruggetje, elke dag twee minuten. Ook dat maakt verschil.

## Wat je nodig hebt

Een matje en een traptree. Een elastiek is handig, maar niet nodig.

## Veelgemaakte fouten

1. Te snel bewegen.
2. Alleen de benen trainen en je romp vergeten.
3. Na twee weken stoppen omdat je nog niets merkt.`),
  "glycerin-of-bondi": u(`## Wat lopers erover zeggen

Lopers die de Glycerin kiezen, noemen hem vaak "vertrouwd" en "rustig". Lopers die de Bondi kiezen, noemen het gevoel "beschermend" en "rollend". Beide zijn geen snelle schoenen: ze zijn gemaakt voor comfort.

## Gewicht

Schoenen met veel demping zijn vaak iets zwaarder. Op lange, rustige afstanden merk je dat nauwelijks.

## Passen

Loop met beide schoenen een paar minuten op de band. Het verschil in afrollen voel je meteen.`),
  "rustdagen-na-veertig": u(`## Een voorbeeldweek

| Dag | Wat |
|---|---|
| Maandag | Rust of wandelen |
| Dinsdag | Rustige loop |
| Woensdag | Krachttraining |
| Donderdag | Tempo of heuvels |
| Vrijdag | Rust |
| Zaterdag | Lange duurloop |
| Zondag | Fietsen of wandelen |

## Rust is ook training

Een rustdag is geen verloren dag: dat is het moment waarop je lichaam sterker wordt.`),
  "cadeaus-feestdagen": u(`## Wat je beter niet geeft

- Schoenen zonder dat de loper ze heeft gepast.
- Kleding in een maat die je gokt.
- Een horloge dat niet bij de telefoon past.

## De veilige keuze

Een cadeaubon. De loper kiest zelf, en past alles in de winkel. Bij nieuwe hardloopschoenen hoort de loopanalyse er gratis bij.`),
  "metaspeed-sky-of-edge": u(`## Wat ze gemeen hebben

Beide hebben een carbon plaat, een licht en veerkrachtig schuim en een agressieve vorm. Beide zijn gemaakt om snel te zijn op de weg.

## Wat lopers in de winkel vragen

**"Welke is sneller?"** Geen van beide in het algemeen. De beste is de schoen die past bij hoe jij versnelt.

**"Kan ik hem voor training gebruiken?"** Voor tempotrainingen, maar spaar hem vooral voor wedstrijden.`),
  "trail-modder": u(`## Welke routes in de winter

- **Veluwe:** de zandpaden blijven ook na regen redelijk begaanbaar.
- **Twente:** de bospaden kunnen flink modderig worden.
- **Duinen bij Haarlem:** het zand is na regen juist steviger.

## Veelgemaakte fouten

1. Met een wegschoen het bos in na een week regen.
2. Je schoenen op de verwarming drogen.
3. Te snel bergaf op natte wortels.`),
  "waterdichte-trailschoenen": u(`## Wat lopers in de winkel vragen

**"Zijn mijn voeten dan altijd droog?"** Niet als het water van boven in je schoen loopt, bijvoorbeeld bij een diepe plas of beek.

**"Is het niet te warm?"** In de zomer vaak wel. Dan is een ademende schoen prettiger.

**"Wat met sokken?"** Wollen sokken houden je voeten warm, ook als ze nat worden. Ze werken goed in elke trailschoen.`),
  "supershoe-of-tempo": u(`## Wat lopers vaak vergeten

Een supershoe vraagt meer van je kuiten en voeten dan je denkt, vooral als je eraan moet wennen. Loop hem op tijd in.

## Voor de korte afstanden

Voor een vijf of tien kilometer kiezen veel lopers juist een lichtere tempo schoen: die voelt directer bij een hoog tempo.

## Een tip

Probeer een supershoe eerst op een tempotraining van vijf kilometer. Dan weet je of hij bij je past.`),
  "avond-voor-de-wedstrijd": u(`## Een voorbeeld van een avondmaaltijd

Een bord pasta of rijst met wat kip of vis en een beetje groente, een glas water en iets lichts als toetje. Niet te pittig, niet te vet.

## Het ontbijt

Twee tot drie uur voor de start: brood met jam of honing, een banaan, en een kop thee of koffie als je dat gewend bent.

## Wat je meeneemt

Een flesje water en iets kleins te eten voor het wachten bij de start.`),
  "herstel-na-marathon": u(`## Wat je voelt

Spierpijn, vooral in je bovenbenen, en vaak twee tot drie dagen moe. Ook je weerstand is even lager.

## Wat helpt

- Wandelen in plaats van zitten.
- Een warm bad of douche.
- Rustig fietsen na een paar dagen.

## Wanneer je je zorgen maakt

Pijn op één plek die niet minder wordt, of zwelling. Laat het dan nakijken.`),
  "trailschoenen-enschede": u(`## Wat Twentse trailers vragen

**"Welke schoen voor de Holterberg?"** Een schoen met goede grip bij klimmen en dalen, en een stevige neus.

**"Kan ik met één schoen weg en trail?"** Met een veelzijdige trailschoen kun je beide, al voelt hij op asfalt minder soepel.

**"Hoe vaak moet ik ze vervangen?"** Laat ze nakijken als het profiel glad wordt.

## Clinic voor beginners

Elke maand een trailclinic vanuit de winkel aan de Kuipersdijk.`),
  "herstel-najaarsmarathon": u(`## Wat je de eerste dagen eet

Voldoende eiwitten en koolhydraten, veel water en groente. Je lichaam heeft veel te herstellen.

## Je weerstand

Na een marathon ben je vatbaarder voor een verkoudheid. Kleed je warm aan en slaap goed.

## Een nieuw doel

Kies je volgende doel pas na een paar weken. De winter is een mooie tijd om rustig te lopen en sterker te worden.`),
  "hyrox-schoenen-vergeleken": u(`## Een overzicht

| | Hardloopschoen | Hybride | Trainingsschoen |
|---|---|---|---|
| Lopen | Goed | Redelijk tot goed | Matig |
| Sled | Redelijk | Goed | Goed |
| Lunges en wall balls | Redelijk | Goed | Goed |
| Voor wie | Lopers | Allround | Krachtsporters |

## Pas ze naast elkaar

In Zaandam en Haarlem kun je de verschillende soorten achter elkaar passen.`),
  "waterdichte-hardloopschoenen": u(`## Voor wie ze het meest geschikt zijn

- Lopers die in de winter vroeg in de ochtend lopen, door nat gras.
- Lopers die op het platteland lopen, langs natte paden.
- Lopers die snel koude voeten krijgen.

## Een tussenweg

Er zijn ook schoenen met een waterafstotende bovenkant zonder membraan. Ze houden lichte regen tegen en ademen beter.`),
  "trail-loonse-duinen": u(`## Wat Tilburgse trailers vragen

**"Kan ik met mijn wegschoen de duinen in?"** Het kan, maar je schuift veel en het zand komt erin.

**"Hoe lang is een goede eerste ronde?"** Een paar kilometer. Zand is zwaarder dan je denkt.

**"Wanneer is het het mooist?"** In de vroege ochtend, als het nog stil is.

## Met de groep

Op zaterdag loopt vanuit de winkel een trailgroep in de duinen.`),
  hardloopsokken: u(`## Welke sok voor welk seizoen?

- **Zomer:** dun en ademend.
- **Winter:** merinowol, warm ook als hij nat wordt.
- **Trail:** iets hoger, zodat zand en steentjes buiten blijven.

## Hoeveel paar?

Minstens zoveel als je per week loopt, plus een paar extra. Zo heb je altijd een schoon paar.`),
  "hyrox-schema-lopers": u(`## Een voorbeeldweek

| Dag | Training |
|---|---|
| Maandag | Kracht |
| Dinsdag | Rustige loop |
| Woensdag | Rust |
| Donderdag | Combinatie: 4 × (1 km + oefening) |
| Vrijdag | Rust |
| Zaterdag | Duurloop |
| Zondag | Kracht, licht |

## Wat je meet

Houd je tijd per kilometer bij, ook tussen de oefeningen. Zo zie je waar je vooruitgaat.`),
  "vorig-seizoen": u(`## Wat lopers in de winkel vragen

**"Is het oude model niet minder goed?"** Meestal niet. Het verschil met het nieuwe model is vaak klein.

**"Hoe weet ik of het oud is?"** Vraag het. In de winkel weten ze welke versie het is.

**"Kan ik hem net zo lang gebruiken?"** Ja, een schoen van een jaar oud in de doos gaat net zo lang mee.`),
  "endorphin-of-adios-pro": u(`## Wat lopers in de winkel vragen

**"Welke is beter voor een eerste marathon op carbon?"** Veel lopers voelen zich op een stabielere schoen zekerder, zeker in de laatste kilometers.

**"Welke is lichter?"** Ze zijn allebei licht. Het verschil in gewicht merk je nauwelijks, het verschil in gevoel wel.

## Passen

Loop ze allebei op de band, ook op een hoger tempo.`),
  "ademhaling-kou": u(`## Lopen bij vorst

- Loop rustiger dan normaal.
- Kies paden zonder ijzel.
- Houd je trainingen korter als het hard vriest.

## Wat lopers vaak vragen

**"Is koude lucht slecht voor je longen?"** Voor de meeste lopers niet, maar het kan prikkelen. Een buff helpt.

**"Moet ik door mijn neus ademen?"** Waar het kan, verwarmt dat de lucht. Bij een hoger tempo adem je vanzelf door je mond.`),
  "energiegels-marathon": u(`## Een voorbeeld voor een marathon van vier uur

| Kilometer | Wat |
|---|---|
| 0 | Gel tien minuten voor de start |
| 8 | Gel met water |
| 16 | Gel met water |
| 24 | Gel met water |
| 32 | Gel met water |
| 38 | Gel of sportdrank als je die nog wilt |

Pas het aan op je eigen tempo en wat je in je training uitprobeerde.`),
  "trail-herfst-veluwe": u(`## Routes voor de herfst

- **Berg en Bos:** goed bereikbaar, met mooie kleuren.
- **De heide:** mist in de vroege ochtend.
- **Rond Hoog Soeren:** rustig en bosrijk.

## Wat je meeneemt

Je telefoon met de route offline, een licht jack en bij langere trails water en iets te eten.`),
  "foamrollen-of-massage": u(`## Wat lopers in de winkel vragen

**"Welke foamroller?"** Een gladde rol is zachter, een rol met noppen gaat dieper. Begin met een gladde.

**"Hoe vaak?"** Een paar keer per week een paar minuten is genoeg.

**"Doet het pijn?"** Het kan gevoelig zijn, maar het hoort geen pijn te doen.`),
  "halve-maat-groter": u(`## Hoe je meet

1. Ga staan op een stuk papier, met je gewicht op je voet.
2. Teken je voet om.
3. Meet van je hiel tot je langste teen.

Doe het met beide voeten: ze zijn vaak niet even lang. Kies op de langste voet.`),
  "hyrox-en-hardlopen": u(`## Wat lopers vaak vergeten

- Herstel na een zware combinatietraining.
- Voldoende eiwitten voor je spieren.
- Mobiliteit, voor je heupen en schouders.

## Je loopschoenen

Gebruik voor je lange duurloop je gewone hardloopschoen, en voor de combinatietrainingen je HYROX-schoen. Zo slijten ze minder snel.`),
  "schoenen-op": u(`## Wat lopers in de winkel vragen

**"Zijn mijn schoenen echt al op?"** Neem ze mee: aan de zool en het schuim is het goed te zien.

**"Kan ik zolen vervangen?"** Dat helpt soms bij comfort, maar de demping van de schoen zelf komt niet terug.

**"Waarom slijt de ene schoen sneller?"** Door hoe je landt, je gewicht en de ondergrond.`),
  "techniek-verbeteren": u(`## Drie oefeningen voor loopscholing

1. **Knieheffen:** tien meter, met hoge knieën en snelle passen.
2. **Hakken-billen:** tien meter, je hakken tegen je billen.
3. **Skippings:** tien meter, kleine sprongetjes op je voorvoet.

Doe ze twee keer per week na je warming-up.`),
  "rugzak-of-heuptas": u(`## Wat lopers in de winkel vragen

**"Schudt een heuptas niet?"** Een goede heuptas zit strak en schudt nauwelijks.

**"Hoeveel water past erin?"** In een heuptas vaak een kleine bidon, in een vest een tot twee liter.

**"Kan ik hem in de was?"** Meestal met de hand, zonder wasverzachter.`),
  posbank: u(`## Wat je onderweg ziet

Heide, bos en het uitzicht over de IJsselvallei. In augustus kleurt de heide paars.

## Wanneer is het het rustigst?

In de vroege ochtend en doordeweeks. In het weekend is het op de Posbank vaak druk met wandelaars en fietsers.`),
  "fysio-of-winkel": u(`## Wat lopers vaak vragen

**"Kan ik eerst een nieuwe schoen proberen?"** Bij milde klachten en oude schoenen is dat een logische eerste stap.

**"Hoe lang wacht ik voor ik naar de fysio ga?"** Wordt het in een paar weken minder lopen niet beter, of wordt het erger, ga dan.`),
  "trail-twente": u(`## Wat Twentse trailers vragen

**"Waar begin ik?"** Bij de Lonnekermeer of het Rutbeek: bospaden en korte glooiingen.

**"Waar zijn de echte heuvels?"** Op de Holterberg en de Tankenberg.

**"Welke schoen?"** Een veelzijdige trailschoen met gemiddeld profiel.`),
  "hardlopen-en-drinken": u(`## Wat lopers vaak vragen

**"Moet ik drinken tijdens een loop van een uur?"** Bij normaal weer meestal niet.

**"Wat is beter: water of sportdrank?"** Bij lange of warme lopen sportdrank, anders water.

**"Hoe neem ik water mee?"** In een heuptas, een loopvest of met een handbidon.`),
  "hardlopen-na-vijftig": u(`## Wat lopers vaak vragen

**"Is hardlopen slecht voor mijn knieën?"** Voor de meeste lopers niet, als je rustig opbouwt en sterk blijft.

**"Moet ik langzamer lopen?"** Loop in een tempo dat goed voelt. Veel lopers boven de vijftig worden nog sneller.`),
  "eerste-hyrox": u(`## Wat je meeneemt naar de wedstrijd

- Je schoenen, ingelopen.
- Kleding die je kent.
- Water en iets kleins te eten.
- Handschoenen, als je ze bij het trainen gebruikte.

## De dag zelf

Kom op tijd, warm goed op en begin rustig.`),
  reflecterend: u(`## Wat lopers vaak vragen

**"Is een lampje op mijn hoofd genoeg?"** Om te zien wel, om gezien te worden niet altijd. Een knipperlicht achter helpt.

**"Ook in de stad?"** Ja, ook met straatverlichting val je zonder reflectie weg tussen auto's en fietsers.`),
  "hardlopen-na-veertig": u(`## Wat lopers vaak vragen

**"Word ik langzamer?"** Op den duur misschien een beetje, maar met slim trainen kun je jaren vooruitgaan.

**"Moet ik andere schoenen?"** Niet per se. Laat je schoenen nakijken bij een loopanalyse.`),
  "hardlopen-in-de-regen": u(`## Wat lopers vaak vragen

**"Is lopen in de regen slecht voor mijn schoenen?"** Niet als je ze goed laat drogen.

**"Moet ik een waterdicht jack?"** Bij korte loopjes is een windjack vaak genoeg.`),
  "hartslagband-of-pols": u(`## Wat lopers vaak vragen

**"Waarom is mijn hartslag aan het begin zo hoog?"** Aan de pols loopt de meting soms achter of springt in de eerste minuten. Een borstband is dan nauwkeuriger.

**"Werkt een borstband met elk horloge?"** Meestal met de horloges van hetzelfde merk, en vaak ook met andere via bluetooth.`),
  "loopgroepen-tilburg": u(`## Wat lopers vaak vragen

**"Is het niet te snel voor mij?"** Er wordt in verschillende tempo's gelopen.

**"Moet ik lid zijn?"** Nee, je kunt gewoon aansluiten.

**"Wat met het weer?"** Er wordt in elk weer gelopen, behalve bij gevaar.`),
  "twee-paar-afwisselen": u(`## Wat lopers vaak vragen

**"Is het niet duurder?"** Op korte termijn wel, maar elk paar gaat langer mee.

**"Welke combinatie?"** Een rustige schoen en een snellere, of een wegschoen en een trailschoen.`),
  "wedstrijdtempo-halve": u(`## Een voorbeeld

Loop je tien kilometer in vijftig minuten, dan is een halve marathon rond de één uur en vijftig minuten een realistisch doel. Begin dan rond de vijf minuten en vijfentwintig seconden per kilometer.

## Wat lopers vergeten

Je tempo op een warme dag of met wind ligt lager. Pas je doel op de dag zelf aan.`),
  "trailschoen-beginners": u(`## Wat beginnende trailers vragen

**"Moet ik meteen een trailschoen kopen?"** Loop je een paar keer per maand op droge paden, dan kan je wegschoen.

**"Welke maat?"** Iets ruimer bij je tenen dan je wegschoen, voor bergaf.`),
  "wat-is-hyrox": u(`## Wat beginners vragen

**"Moet ik heel sterk zijn?"** Nee, er zijn categorieën met lichtere gewichten.

**"Moet ik heel snel kunnen lopen?"** Nee, je loopt in je eigen tempo.

**"Kan ik alleen meedoen?"** Ja, of met z'n tweeën in de categorie doubles.`),
  "carbon-plaat": u(`## Wat lopers vaak vragen

**"Is een carbon schoen moeilijk om op te lopen?"** Hij voelt anders, stijver en met meer veer. Na een paar loopjes went het.

**"Kan ik mijn kuiten overbelasten?"** Bij een te snelle overstap kan dat. Bouw rustig op.`),
  "zondag-haarlem": u(`## Wat Haarlemse lopers vragen

**"Is het druk op zondag?"** Op koopzondagen kan het druk zijn. Kom dan vroeg.

**"Kan ik mijn schoenen laten nakijken?"** Ja, neem ze mee.`),
  "tilburg-ten-miles": u(`## Wat lopers vaak vragen

**"Is het een goede eerste wedstrijd van zestien kilometer?"** Ja, het vlakke parcours maakt het goed te doen.

**"Welke schoen?"** Je vertrouwde schoen, of een snellere die je hebt ingelopen.`),
  "maximale-demping": u(`## Wat lopers vaak vragen

**"Voelen ze niet log?"** Sommige modellen wel. Pas ze en loop er een paar minuten op.

**"Kan ik er ook snel op lopen?"** Ze zijn vooral gemaakt voor rustige kilometers.`),
  winterlagen: u(`## Wat lopers vaak vragen

**"Moet ik een dikke jas?"** Nee, lagen werken beter.

**"Wat met mijn handen?"** Dunne handschoenen zijn vaak genoeg; bij strenge vorst wanten.`),
  "basis-voorjaarsmarathon": u(`## Wat lopers vaak vragen

**"Kan ik in de winter wel genoeg trainen?"** Ja, met de juiste kleding en verlichting.

**"Moet ik al tempo doen?"** In de basisperiode nog niet veel.`),
  "horloge-feestdagen": u(`## Wat lopers vaak vragen

**"Kan ik het horloge ook overdag dragen?"** De meeste modellen zijn gemaakt om de hele dag te dragen.

**"Welk merk past bij mijn telefoon?"** De meeste merken werken met zowel iPhone als Android.`),
  "garmin-of-coros": u(`## Wat lopers vaak vragen

**"Welk merk heeft de beste gps?"** Beide merken hebben goede gps voor hardlopen.

**"Kan ik mijn trainingen erop zetten?"** Ja, bij beide merken via de app.`),
  "hardlopen-in-de-hitte": u(`## Wat lopers vaak vragen

**"Is een pet beter dan niets?"** Ja, tegen de zon.

**"Moet ik zout nemen?"** Bij lange lopen in de warmte helpt sportdrank met zout.`),
  "interval-of-rustig": u(`## Een eerste intervaltraining voor later

Tien minuten rustig inlopen, zes keer een minuut iets sneller met twee minuten rustig ertussen, en tien minuten uitlopen. Alleen als je een paar maanden loopt.`),
  taperen: u(`## Wat lopers vaak vragen

**"Verlies ik geen conditie?"** In een paar weken niet. Je lichaam herstelt juist.

**"Wat doe ik met de vrije tijd?"** Slapen, goed eten en je spullen klaarleggen.`),
  "speedgoat-of-speedcross": u(`## Wat trailers vaak vragen

**"Kan ik met diepe noppen op asfalt?"** Het kan, maar het slijt snel en voelt onrustig.

**"Welke is comfortabeler?"** Voor de meeste lopers de schoen met meer demping.`),
  "trailschoenen-apeldoorn": u(`## Wat Apeldoornse trailers vragen

**"Kan ik ze echt buiten testen?"** Ja, in Apeldoorn kan dat.

**"Welke schoen voor zand?"** Een trailschoen met een brede, stabiele zool.`),
  "wedstrijdschoen-inlopen": u(`## Wat lopers vaak vragen

**"Is drie weken echt nodig?"** Het geeft je tijd om te wennen en om iets anders te kiezen als hij niet goed zit.

**"Mag ik hem daarna voor training gebruiken?"** Voor tempo wel, maar spaar hem vooral.`),
  inlegzolen: u(`## Wat lopers vaak vragen

**"Kan ik mijn zolen in elke schoen leggen?"** Meestal wel, maar check de pasvorm.

**"Hoe lang gaan ze mee?"** Vaak langer dan je schoenen.`),
  "hoka-of-on": u(`## Wat lopers vaak vragen

**"Welke is beter voor beginners?"** Beide kunnen; kies wat het comfortabelst voelt.

**"Welke gaat langer mee?"** Dat hangt af van het model en hoe je loopt.`),
  "loopband-of-buiten": u(`## Wat lopers vaak vragen

**"Is een loopband slecht voor je knieën?"** Nee, de band is vaak zelfs iets zachter dan asfalt.

**"Hoe voorkom ik verveling?"** Wissel van tempo en helling, of luister naar een podcast.`),
  hardloopcadeaus: u(`## Wat lopers zelf zeggen

Het cadeau dat lopers het vaakst noemen als favoriet: goede sokken. Klein, maar ze gebruiken ze elke loop.`),
  "drop-hardloopschoen": u(`## Wat lopers vaak vragen

**"Welke drop heb ik nu?"** Kijk op de doos of vraag het in de winkel.

**"Moet ik naar een lagere drop?"** Alleen als je een reden hebt, en dan geleidelijk.`),
  "ghost-of-novablast": u(`## Wat lopers vaak vragen

**"Welke is beter voor lange duurlopen?"** Beide werken, het is een kwestie van gevoel.

**"Welke is stabieler?"** Voor veel lopers voelt de Ghost iets rustiger.`),
  herfstkleding: u(`## Wat lopers vaak vragen

**"Moet ik al een tight aan?"** Onder de tien graden voelt een tight voor veel lopers prettig.

**"Heb ik een jack nodig?"** Een licht windjack is in de herfst handig.`),
  "krachttraining-hardlopers": u(`## Wat lopers vaak vragen

**"Word ik niet te zwaar?"** Nee, met deze oefeningen word je sterker, niet zwaarder.

**"Moet ik naar de sportschool?"** Nee, thuis is genoeg.`),
  "wat-heb-je-nodig": u(`## Wat beginners vaak vragen

**"Moet ik meteen alles kopen?"** Nee, begin met schoenen, en vul later aan.

**"Kan ik in een katoenen shirt?"** Het kan, maar een sportshirt voert vocht beter af.`),
  spierpijn: u(`## Wat lopers vaak vragen

**"Helpt rekken tegen spierpijn?"** Rustig bewegen helpt meer dan rekken.

**"Hoe lang duurt spierpijn?"** Meestal twee tot drie dagen.`),
  "waterdichte-hardloopjas": u(`## Wat lopers vaak vragen

**"Waarom word ik toch nat?"** Vaak door zweet, niet door regen. Ventilatie helpt.

**"Welke kleur?"** Een felle kleur, zodat je gezien wordt.`),
  "ochtend-of-avond": u(`## Wat lopers vaak vragen

**"Moet ik ontbijten voor een ochtendloop?"** Bij een korte, rustige loop hoeft het niet.

**"Kan ik na het eten lopen?"** Wacht een paar uur na een grote maaltijd.`),
  "enschede-marathon": u(`## Wat lopers vaak vragen

**"Is het parcours vlak?"** Grotendeels, met een paar glooiingen.

**"Waar haal ik mijn laatste advies?"** Bij RunX Twente aan de Kuipersdijk.`),
  "feestdagen-ritme": u(`## Wat lopers vaak vragen

**"Is het erg als ik een week niet loop?"** Nee, pak het daarna rustig weer op.

**"Hoe blijf ik gemotiveerd?"** Met een doel in het voorjaar.`),
  "eerste-wedstrijd": u(`## Wat beginners vaak vragen

**"Ben ik niet te langzaam?"** Bij de meeste lopen lopen alle tempo's mee.

**"Moet ik me van tevoren inschrijven?"** Bij de meeste lopen wel, soms kan het op de dag zelf.`),
  "zwaardere-lopers": u(`## Wat lopers vaak vragen

**"Moet ik een stabiele schoen?"** Alleen als je voet flink naar binnen rolt.

**"Gaat mijn schoen sneller op?"** Vaak wel. Laat hem eerder nakijken.`),
  "midwinter-voorbereiding": u(`## Wat lopers vaak vragen

**"Is het niet te vroeg?"** Voor de halve en hele afstand is december het goede moment.

**"Kan ik ook de korte afstand?"** Ja, daarvoor begin je in januari.`),
};
