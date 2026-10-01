/**
 * Teksten van het cluster "Blessures voorkomen en herstel". Zie `index.ts`.
 *
 * ⚠️ De grens uit het merkprofiel geldt hier het strengst: geen diagnose,
 * geen belofte dat iets een klacht oplost, en bij pijn die blijft altijd
 * doorverwijzen naar een fysiotherapeut, podotherapeut of sportarts.
 */
import type { DemoTekst } from "@/lib/demo/runx/teksten/type";

const t = (metaTitel: string, metaBeschrijving: string, tekst: string, faq: DemoTekst["faq"]): DemoTekst => ({ metaTitel, metaBeschrijving, tekst, faq });

const GRENS = `## Wanneer laat je het nakijken?

Is de pijn er ook in rust, wordt hij erger tijdens het lopen, of is hij er na een week rust nog steeds? Ga dan naar een fysiotherapeut of sportarts. In de winkel kun je kijken of je schoenen nog passen bij hoe je loopt, maar een diagnose stellen kan alleen een zorgverlener.`;

export const BLESSURES: Record<string, DemoTekst> = {
  scheenbeenklachten: t(
    "Scheenbeenklachten bij hardlopen: oorzaken en wat een schoen kan doen",
    "Pijn aan je scheenbeen bij het hardlopen: de meest voorkomende oorzaken, wat je zelf kunt doen en wat een andere schoen wel en niet oplost.",
    `Pijn langs de binnenkant van je scheenbeen is een van de klachten die lopers het vaakst hebben, zeker in het eerste jaar. Vaak wordt het "shin splints" genoemd. Het goede nieuws: met de juiste aanpak gaat het meestal over.

## Wat voel je?

Een zeurende of stekende pijn langs de binnenrand van je scheenbeen, vaak aan het begin van een loop. Soms zakt hij weg als je warm bent, en komt hij na afloop terug.

## De meest voorkomende oorzaken

1. **Te snel opbouwen.** Je conditie groeit sneller dan je botten en spieren. Wie elke week flink meer loopt, overbelast het scheenbeen.
2. **Harde ondergrond.** Veel kilometers op asfalt en klinkers.
3. **Versleten of verkeerde schoenen.** Als de demping op is, of als de schoen niet past bij hoe je landt.
4. **Je looppatroon.** Lopers die flink naar binnen rollen of met grote passen ver voor hun lichaam landen, hebben er vaker last van.

## Wat kun je zelf doen?

- **Minder lopen, niet stoppen.** Halveer je kilometers en loop rustiger, of wissel een paar dagen met fietsen of zwemmen.
- **Kies zachtere ondergrond.** Een bospad of gravelpad in plaats van asfalt.
- **Bouw daarna rustig weer op.** Een paar kilometer per week erbij, niet meer.
- **Train je kuiten.** Sterke kuitspieren vangen een deel van de klap op.

## Wat een schoen kan doen

Een andere schoen lost geen scheenbeenklacht op, maar hij kan wel een deel van de oorzaak wegnemen. Zijn je schoenen op, dan is nieuwe demping een logische stap. Rol je voet flink naar binnen, dan kan een stabielere schoen helpen. Bij een loopanalyse in de winkel kijk je samen naar je landing, en naar de slijtage van je oude schoenen.

## Wat de winkel zegt

Komt een loper met scheenbeenklachten binnen, dan kijkt het team naar de schoen en hoe oud hij is, en naar hoe snel iemand zijn kilometers heeft opgebouwd. Is de pijn er ook in rust of wordt hij erger, dan sturen ze je door naar een fysio.

${GRENS}`,
    [
      { q: "Wat zijn shin splints?", a: "Een verzamelnaam voor pijn langs de binnenkant van het scheenbeen, meestal door overbelasting bij te snel opbouwen." },
      { q: "Helpt een andere hardloopschoen tegen scheenbeenklachten?", a: "Soms neemt hij een deel van de oorzaak weg, bijvoorbeeld als je schoenen op zijn. Het lost de klacht niet alleen op: rustig opbouwen hoort erbij." },
      { q: "Moet ik stoppen met lopen?", a: "Vaak is minder en rustiger lopen genoeg. Is de pijn er ook in rust of wordt hij erger, laat het dan nakijken." },
    ],
  ),

  "kilometers-opbouwen": t(
    "Hoe snel mag je je kilometers opbouwen?",
    "Hoeveel kilometer mag je per week erbij doen zonder blessures? De vuistregels, en waarom rustweken belangrijk zijn.",
    `De meeste hardloopblessures hebben dezelfde oorzaak: te snel te veel. Een paar vuistregels.

## Ongeveer tien procent per week

Een bekende richtlijn: niet meer dan tien procent per week erbij. Loop je dertig kilometer, dan is volgende week drieëndertig genoeg.

## Elke derde of vierde week rustiger

Na twee of drie weken opbouwen een week met minder kilometers. Dan krijgt je lichaam tijd om sterker te worden.

## Eén ding tegelijk

Verhoog niet in dezelfde week je afstand én je tempo. Kies er één.

## Luister naar je lichaam

Lichte stijfheid is normaal. Pijn op één plek die steeds terugkomt, is een signaal om terug te schakelen.

## Na een pauze

Heb je een paar weken niet gelopen, begin dan lager dan waar je stopte.`,
    [{ q: "Hoeveel kilometer mag ik per week erbij doen?", a: "Een bekende vuistregel is ongeveer tien procent per week, met elke derde of vierde week een rustigere week." }],
  ),

  "it-band-knie": t(
    "Pijn aan de buitenkant van je knie: de IT-band",
    "Pijn aan de buitenkant van je knie bij het hardlopen: wat de IT-band is, wanneer de pijn optreedt en wat je kunt doen.",
    `Pijn aan de buitenkant van je knie, die na een paar kilometer opkomt en steeds erger wordt? Bij lopers wordt dat vaak in verband gebracht met de iliotibiale band, kortweg de IT-band.

## Wat is de IT-band?

Een stevige peesplaat langs de buitenkant van je bovenbeen, van je heup tot net onder je knie.

## Wanneer heb je er last van?

Vaak na een vast aantal kilometers, en meer bij bergaf lopen of op een schuine weg.

## Mogelijke oorzaken

- Te snel opbouwen.
- Zwakke heupspieren, waardoor je knie naar binnen beweegt.
- Altijd dezelfde kant van een schuine weg.

## Wat kun je doen?

- Minder lopen en de pijn niet negeren.
- Je heupen en billen sterker maken.
- Variëren in route en ondergrond.

${GRENS}`,
    [{ q: "Waarom krijg ik pijn aan de buitenkant van mijn knie bij het hardlopen?", a: "Bij lopers hangt dat vaak samen met overbelasting rond de IT-band. Laat aanhoudende pijn nakijken door een fysiotherapeut." }],
  ),

  compressiekousen: t(
    "Werken compressiekousen echt?",
    "Wat compressiekousen doen bij het hardlopen en herstel, wat wel en niet bewezen is, en hoe je de goede maat kiest.",
    `Je ziet ze steeds vaker: lopers in lange, strakke kousen. Werken ze?

## Wat doen ze?

Compressiekousen oefenen druk uit op je kuiten, die van je enkel naar boven afneemt. Dat ondersteunt de bloedsomloop en houdt je spieren stabieler.

## Waar merken lopers het?

- **Bij herstel.** Veel lopers voelen na een lange loop of wedstrijd minder zware benen als ze compressie dragen.
- **Tijdens lange lopen.** Sommige lopers vinden dat hun kuiten minder trillen en minder vermoeid raken.

## Wat doen ze niet?

Ze maken je niet sneller, en ze voorkomen geen blessures door te snel opbouwen. Het effect verschilt per loper.

## De juiste maat

Compressie werkt alleen als de druk klopt. Daarvoor meet je de omtrek van je kuit. In alle RunX-winkels kun je je kuit laten meten en de maat laten kiezen.

## Ons advies

Probeer ze bij een lange duurloop of erna. Merk je verschil, dan zijn ze de moeite waard.`,
    [
      { q: "Helpen compressiekousen bij hardlopen?", a: "Veel lopers merken vooral bij herstel minder zware benen. Het effect verschilt per loper." },
      { q: "Kan ik compressiekousen laten aanmeten?", a: "Ja, in alle RunX-winkels meten ze je kuit en kiezen ze de juiste maat." },
    ],
  ),

  "krachttraining-hardlopers": t(
    "Krachttraining voor hardlopers: tien minuten thuis",
    "Krachttraining voor hardlopers in tien minuten, zonder sportschool: vijf oefeningen voor kuiten, heupen en romp.",
    `Krachttraining is voor veel lopers het ontbrekende stukje. Sterkere spieren vangen de klap van elke pas beter op.

## Vijf oefeningen, tien minuten

1. **Kuitheffen.** Op een traptree, langzaam omhoog en omlaag. 3 × 15.
2. **Squats.** Voeten op heupbreedte, rustig naar beneden. 3 × 12.
3. **Lunges.** Een grote stap naar voren, knie boven je enkel. 3 × 10 per been.
4. **Bruggetje.** Op je rug, billen omhoog. 3 × 12.
5. **Plank.** Op je ellebogen, lichaam recht. 3 × 30 seconden.

## Hoe vaak?

Twee keer per week, op een dag dat je rustig loopt of niet loopt.

## Waarom het werkt

Sterke kuiten ontlasten je scheenbenen en achillespees. Sterke heupen houden je knieën op hun plek. Een stevige romp houdt je houding goed als je moe wordt.`,
    [{ q: "Hoe vaak moet een hardloper krachttraining doen?", a: "Twee keer per week tien minuten is al een goed begin." }],
  ),

  spierpijn: t(
    "Spierpijn na het hardlopen: doorgaan of rusten?",
    "Spierpijn na het hardlopen: wanneer je gewoon kunt doorgaan, en wanneer het verstandiger is om te rusten.",
    `## Spierpijn is normaal

Na een nieuwe of zwaardere training krijg je spierpijn, vaak een tot twee dagen later. Je spieren passen zich aan.

## Doorgaan of rusten?

- **Lichte spierpijn:** een rustig loopje of fietsen helpt juist.
- **Flinke spierpijn:** neem een rustdag of wandel.

## Het verschil met een blessure

Spierpijn voel je in de hele spier, aan beide kanten, en het wordt minder als je warm bent. Pijn op één plek, in een gewricht of pees, of pijn die erger wordt tijdens het lopen, is iets anders.

${GRENS}`,
    [{ q: "Mag ik hardlopen met spierpijn?", a: "Bij lichte spierpijn helpt een rustig loopje. Pijn op één plek of in een gewricht is iets anders: dan rust je en laat je het zo nodig nakijken." }],
  ),

  hielpijn: t(
    "Hielpijn bij hardlopers: wat helpt?",
    "Pijn onder je hiel bij het hardlopen: wat er vaak achter zit, wat je zelf kunt doen en wanneer zolen of tapen helpen.",
    `Pijn onder je hiel, vooral bij de eerste stappen in de ochtend? Veel lopers hebben er een keer last van.

## Wat zit erachter?

Vaak de peesplaat onder je voet, die van je hiel naar je tenen loopt. Overbelasting kan die irriteren.

## Wat kun je zelf doen?

- Minder lopen, en een tijd geen snelle trainingen.
- Je kuiten en voetzool rekken en masseren.
- Schoenen met voldoende demping, ook buiten het lopen.

## Zolen en tapen

Soms helpt een zool die je voet ondersteunt. Bij RunX Twente kunnen zolen in de winkel worden aangepast en wordt er bij hielklachten getapet. Dat is een hulpmiddel, geen behandeling.

${GRENS}`,
    [{ q: "Wat helpt tegen hielpijn bij hardlopen?", a: "Minder lopen, kuiten en voetzool rekken, en goede demping. Zolen of tapen kunnen helpen. Blijft het, ga dan naar een fysio of podotherapeut." }],
  ),

  achillespees: t(
    "Achillespeesklachten voorkomen",
    "Zo verklein je de kans op achillespeesklachten: rustig opbouwen, sterke kuiten en voorzichtig met een lagere drop.",
    `De achillespees moet bij elke pas veel opvangen. Klachten ontstaan meestal geleidelijk, en verdwijnen langzaam. Voorkomen is dus het beste.

## Vijf manieren

1. **Bouw rustig op**, zeker met heuvels en snelheid.
2. **Maak je kuiten sterk.** Langzaam kuitheffen op een traptree, twee keer per week.
3. **Wees voorzichtig met een lagere drop.** Wissel geleidelijk, want een lage drop vraagt meer van je achillespees.
4. **Warm op**, zeker in de kou.
5. **Neem stijfheid serieus.** Een stijve pees in de ochtend is een signaal om terug te schakelen.

## Schoenen

Een schoen met een gemiddelde tot hogere drop voelt bij klachten vaak prettiger.

${GRENS}`,
    [{ q: "Hoe voorkom ik achillespeesklachten?", a: "Rustig opbouwen, sterke kuiten, voorzichtig wisselen naar een lagere drop en goed opwarmen." }],
  ),

  inlegzolen: t(
    "Inlegzolen voor hardlopers: wanneer helpen ze?",
    "Wanneer inlegzolen voor hardlopers zinvol zijn, welke soorten er zijn en waarom je ze beter laat aanmeten.",
    `## Wanneer helpen ze?

- Als je voet extra ondersteuning nodig heeft, bijvoorbeeld bij een lage voetboog.
- Bij sommige klachten, als een zorgverlener dat adviseert.
- Als je meer comfort zoekt in een schoen die verder goed past.

## Soorten

1. **Standaard zolen**, die bij de schoen zitten.
2. **Sportzolen** met wat extra steun of demping.
3. **Zolen op maat**, aangemeten door een podotherapeut of podoloog.

## Laat ze aanmeten

Een zool die niet bij je voet past, kan meer kwaad dan goed doen. Bij RunX Twente kun je podologisch advies krijgen en worden zolen in de winkel aangepast.

## Geen wondermiddel

Een zool lost geen overbelasting op. Rustig opbouwen blijft het belangrijkste.`,
    [{ q: "Heb ik inlegzolen nodig om te hardlopen?", a: "De meeste lopers niet. Bij een lage voetboog of bij klachten kunnen ze helpen; laat ze dan aanmeten." }],
  ),

  "stoppen-bij-blessure": t(
    "Hardlopen met een blessure: wanneer moet je stoppen?",
    "Doorlopen of stoppen bij pijn? Een eenvoudige vuistregel, en wanneer je het laat nakijken.",
    `## De vuistregel

- **Pijn die tijdens het lopen minder wordt**, en de dag erna niet erger is: vaak kun je rustig doorgaan.
- **Pijn die tijdens het lopen erger wordt**: stop.
- **Pijn in rust**, of pijn waardoor je anders gaat lopen: stop en laat het nakijken.

## Mank lopen is een stopteken

Ga je anders lopen om de pijn te ontwijken, dan belast je andere delen van je lichaam en wordt het probleem groter.

## Alternatieven

Fietsen, zwemmen of crosstrainen houden je conditie op peil terwijl je herstelt.

${GRENS}`,
    [{ q: "Wanneer moet ik stoppen met hardlopen bij pijn?", a: "Als de pijn tijdens het lopen erger wordt, als hij er ook in rust is, of als je anders gaat lopen." }],
  ),

  "herstel-na-marathon": t(
    "Herstel na een marathon: de eerste twee weken",
    "Herstellen na een marathon: wat je de eerste dagen doet, wanneer je weer gaat lopen en hoe je rustig opbouwt.",
    `Je hebt een marathon gelopen. Je lichaam heeft nu rust nodig, ook als je je na een paar dagen alweer goed voelt.

## De eerste dagen

- Wandel, eet goed, slaap veel.
- Compressiekousen voelen voor veel lopers prettig.
- Niet hardlopen.

## Week één

Niet of heel rustig lopen. Fietsen of wandelen is prima.

## Week twee

Korte, rustige loopjes. Geen tempo.

## Daarna

Bouw langzaam op naar je normale kilometers. Een nieuw doel plannen mag, maar niet te snel.

## Luister naar je lichaam

Blijft er ergens pijn, laat het dan nakijken voor je weer gaat trainen.`,
    [{ q: "Hoe lang rust ik na een marathon?", a: "De eerste week niet of heel rustig lopen, daarna langzaam opbouwen." }],
  ),

  "foamrollen-of-massage": t(
    "Foamrollen of massage voor hardlopers?",
    "Foamrollen en sportmassage naast elkaar: wat ze doen, wanneer je welke kiest en hoe je goed foamrolt.",
    `## Foamrollen

Je rolt je spieren over een stevige rol. Het voelt als een massage die je zelf doet.

**Voordelen:** elke dag mogelijk, thuis, en het kost een paar minuten.

**Hoe:** rustig, een tot twee minuten per spiergroep. Niet over gewrichten of botten.

## Sportmassage

Een masseur werkt dieper en gerichter.

**Voordelen:** grondiger, en een getraind oog ziet waar je vastzit.

**Wanneer:** na een zware periode of een wedstrijd.

## Wat kies je?

Allebei. Foamrollen voor elke dag, massage af en toe. In verschillende RunX-teams werken mensen met een achtergrond in sportmassage; vraag in de winkel naar tips.`,
    [{ q: "Is foamrollen goed voor hardlopers?", a: "Ja, veel lopers vinden het prettig voor hun herstel. Rol rustig en niet over gewrichten." }],
  ),

  "hardlopen-na-veertig": t(
    "Hardlopen na je veertigste: wat verandert er?",
    "Wat verandert er als je na je veertigste hardloopt? Herstel, kracht en schoenen, en waarom het nog steeds een prachtige sport is.",
    `Na je veertigste kun je prima hardlopen. Veel lopers lopen dan zelfs hun beste tijden. Wel verandert er iets.

## Herstel duurt langer

Na een zware training heb je een dag extra nodig. Plan meer rustige dagen.

## Kracht wordt belangrijker

Je spieren worden met de jaren minder sterk als je ze niet traint. Twee keer per week krachttraining maakt een groot verschil.

## Warm op

Een goede warming-up voorkomt veel klachten aan kuiten en achillespees.

## Schoenen

Veel lopers kiezen na hun veertigste voor wat meer demping. Bij een loopanalyse in de winkel kijk je wat bij je past.

## Luister naar je lichaam

Pijntjes die steeds terugkomen, neem je serieus. Laat ze nakijken.`,
    [{ q: "Kun je na je veertigste nog beginnen met hardlopen?", a: "Zeker. Plan wat meer herstel, doe aan krachttraining en warm goed op." }],
  ),

  "techniek-verbeteren": t(
    "Je hardlooptechniek verbeteren zonder blessures",
    "Je looptechniek verbeteren: drie eenvoudige aandachtspunten, oefeningen en waarom je het geleidelijk doet.",
    `Een goede techniek maakt lopen efficiënter. Maar wie ineens alles verandert, krijgt juist klachten.

## Drie aandachtspunten

1. **Land onder je lichaam**, niet ver ervoor.
2. **Kortere, snellere passen.** Een hogere cadans verkleint de klap per pas.
3. **Ontspannen schouders**, armen die naar voren en achteren zwaaien.

## Oefeningen

Loopscholing: knieheffen, hakken-billen en skippings, twee keer per week na je warming-up.

## Geleidelijk

Verander één ding tegelijk, en doe het een paar minuten per loop. Je lichaam moet wennen.

## Laat het zien

Bij een loopanalyse in de winkel zie je jezelf op video. In Tilburg kun je ook naar je looptechniek laten kijken.`,
    [{ q: "Hoe verbeter ik mijn looptechniek?", a: "Land onder je lichaam, loop met kortere passen en ontspannen schouders, en verander één ding tegelijk." }],
  ),

  herstelschoenen: t(
    "Herstelschoenen na het hardlopen: zin of onzin?",
    "Herstelschoenen en slippers na het hardlopen: wat ze doen en voor wie ze prettig zijn.",
    `## Wat zijn het?

Zachte schoenen of slippers met veel demping en een gevormd voetbed, voor na de training.

## Wat doen ze?

Ze geven je voeten na een lange loop rust en comfort. Veel lopers vinden het prettig om ze na een wedstrijd of lange duurloop te dragen.

## Zin of onzin?

Ze maken je niet sneller en voorkomen geen blessures. Maar als je voeten na een lange loop moe zijn, voelen ze heerlijk. Zie het als comfort, niet als medicijn.`,
    [{ q: "Hebben herstelschoenen zin?", a: "Ze geven comfort na een lange loop. Ze maken je niet sneller en voorkomen geen blessures." }],
  ),

  "kousen-of-sleeves": t(
    "Compressiekousen of sleeves voor herstel?",
    "Compressiekousen of compressiesleeves: het verschil, en welke past bij jouw training en herstel.",
    `## Kousen

Bedekken je voet en kuit. De druk loopt van je enkel naar boven af.

**Prettig voor** herstel en lange lopen.

## Sleeves

Alleen om je kuit, zonder voet. Je draagt je eigen sokken.

**Prettig voor** wie de sokken wil houden waarin hij loopt, en in de zomer.

## Wat kies je?

Voor herstel na een lange loop kiezen veel lopers kousen. Tijdens het lopen is het een kwestie van voorkeur.

## De maat

Compressie werkt alleen met de juiste maat. In alle RunX-winkels kun je je kuit laten meten.`,
    [{ q: "Wat is het verschil tussen compressiekousen en sleeves?", a: "Kousen bedekken voet en kuit, sleeves alleen de kuit. Voor herstel kiezen veel lopers kousen." }],
  ),

  "hardlopen-na-vijftig": t(
    "Hardlopen na je vijftigste: schoenen en opbouw",
    "Hardlopen na je vijftigste: rustiger opbouwen, meer herstel, krachttraining en een schoen met genoeg demping.",
    `Hardlopen na je vijftigste is gezond en leuk. Met een paar aanpassingen blijf je het lang doen.

## Opbouw

Bouw rustiger op dan je gewend bent, en neem na zware trainingen twee rustige dagen.

## Kracht en balans

Twee keer per week krachttraining, met aandacht voor je kuiten, heupen en balans.

## Schoenen

Veel lopers kiezen voor wat meer demping en een stabiele basis. Bij een loopanalyse in de winkel pas je een paar schoenen.

## Variatie

Wissel hardlopen af met fietsen of zwemmen. Je conditie blijft groeien, en je gewrichten krijgen rust.

## Laat je checken

Ga je na lange tijd weer beginnen, of heb je klachten aan hart of gewrichten, overleg dan eerst met de huisarts.`,
    [{ q: "Waar let ik op als ik na mijn vijftigste hardloop?", a: "Rustiger opbouwen, meer herstel, krachttraining en een schoen met genoeg demping." }],
  ),

  "fysio-of-winkel": t(
    "Fysiotherapeut of hardloopwinkel bij scheenbeenklachten?",
    "Waar begin je bij scheenbeenklachten: bij de fysiotherapeut of in de hardloopwinkel? Zo kies je.",
    `## Begin in de winkel als

- je schoenen oud zijn of veel kilometers hebben;
- de pijn mild is en alleen tijdens het lopen opkomt;
- je net meer bent gaan lopen.

In de winkel kijk je naar je schoenen, je looppatroon en hoe snel je hebt opgebouwd.

## Begin bij de fysiotherapeut als

- de pijn er ook in rust is;
- de pijn erger wordt tijdens het lopen;
- het na een paar weken minder lopen niet beter wordt.

## Allebei

Vaak is de oplossing een combinatie: de fysiotherapeut behandelt de klacht, de winkel zorgt voor een schoen die je niet extra belast. In Tilburg is op afspraak een sportfysiotherapeut in de winkel.`,
    [{ q: "Ga ik bij scheenbeenklachten naar de fysio of de winkel?", a: "Bij milde pijn en oude schoenen eerst de winkel. Bij pijn in rust of pijn die erger wordt eerst de fysio." }],
  ),

  "herstel-najaarsmarathon": t(
    "Herstel na een najaarsmarathon: de eerste twee weken",
    "Herstellen na een marathon in het najaar: de eerste dagen, de eerste weken en hoe je de winter goed in gaat.",
    `Een najaarsmarathon is een mooie afsluiting van het seizoen. Daarna komt het herstel, en de winter.

## De eerste dagen

- Wandel, slaap en eet goed.
- Draag warme kleding: na een marathon is je weerstand even lager.
- Compressiekousen voelen voor veel lopers prettig.

## Week één

Niet of heel rustig lopen. Fietsen en wandelen zijn prima.

## Week twee

Korte, rustige loopjes, zonder tempo.

## Daarna: de winter

Gebruik de winter om rustig een basis op te bouwen, met kracht en veel rustige kilometers. Het voorjaar komt vanzelf.

## Pijn?

Blijft er ergens pijn, laat het nakijken voor je weer gaat trainen.`,
    [{ q: "Wanneer kan ik na een marathon weer lopen?", a: "De eerste week niet of heel rustig, in de tweede week korte, rustige loopjes." }],
  ),

  "rustdagen-na-veertig": t(
    "Hardlopen na je veertigste: herstel en rustdagen",
    "Waarom rustdagen na je veertigste belangrijker worden, en hoe je ze slim inplant.",
    `## Herstel duurt langer

Na je veertigste herstelt je lichaam langzamer van zware trainingen. Dat is normaal.

## Plan je rustdagen

- Na een zware training een rustige dag.
- Na een lange duurloop of wedstrijd twee.
- Elke vierde week een rustigere week.

## Actief herstel

Wandelen, fietsen of zwemmen op rustdagen houdt je soepel.

## Slaap

Goed slapen is de beste hersteltraining die er is.

## Luister naar je lichaam

Voel je je moe of stijf, neem dan een extra rustdag. Dat is slim, geen zwakte.`,
    [{ q: "Hoeveel rustdagen heb ik nodig na mijn veertigste?", a: "Na een zware training een rustige dag, na een lange loop of wedstrijd twee." }],
  ),

  "kracht-mobiliteit": t(
    "Kracht en mobiliteit voor hardlopers, thuis te doen",
    "Een korte routine voor kracht en mobiliteit, thuis te doen, voor hardlopers die blessures willen voorkomen.",
    `Een kwartier, twee keer per week. Meer is niet nodig.

## Mobiliteit (5 minuten)

1. Heupcirkels, tien per kant.
2. Beenzwaaien voor en achter, tien per been.
3. Kuitrek tegen de muur, dertig seconden per been.

## Kracht (10 minuten)

1. Kuitheffen op een traptree, 3 × 15.
2. Squats, 3 × 12.
3. Zijwaartse lunges, 3 × 10 per kant.
4. Bruggetje op één been, 3 × 8 per kant.
5. Zijplank, 3 × 20 seconden per kant.

## Wanneer?

Op een dag dat je rustig loopt, of na een rustige loop.`,
    [{ q: "Hoe vaak doe ik kracht en mobiliteit als hardloper?", a: "Twee keer per week een kwartier is genoeg." }],
  ),

  "ademhaling-kou": t(
    "Hardlopen in kou en wind: je ademhaling",
    "Hardlopen in de kou zonder dat je ademhaling stokt: warm opwarmen, een buff en een rustiger tempo.",
    `## Waarom voelt het zwaar?

Koude, droge lucht prikkelt je luchtwegen. Dat kan een benauwd of branderig gevoel geven.

## Wat helpt?

- **Een buff voor je mond.** De lucht wordt een beetje opgewarmd.
- **Langer opwarmen**, eerst binnen of rustig wandelen.
- **Een rustiger tempo.** Intervaltraining doe je bij strenge vorst liever op de band.
- **Door je neus ademen** waar het kan.

## Wind

Loop de eerste helft tegen de wind in, dan heb je hem op de terugweg mee.

## Wanneer stoppen?

Word je echt benauwd, piept je ademhaling of heb je pijn op de borst, stop dan en laat het nakijken.`,
    [{ q: "Hoe adem ik makkelijker als ik hardloop in de kou?", a: "Gebruik een buff voor je mond, warm langer op en loop rustiger." }],
  ),
};
