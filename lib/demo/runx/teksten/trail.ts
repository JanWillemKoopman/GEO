/** Teksten van de clusters "Trailrunning" en "HYROX". Zie `index.ts`. */
import type { DemoTekst } from "@/lib/demo/runx/teksten/type";

const t = (metaTitel: string, metaBeschrijving: string, tekst: string, faq: DemoTekst["faq"]): DemoTekst => ({ metaTitel, metaBeschrijving, tekst, faq });

export const TRAIL: Record<string, DemoTekst> = {
  "trailrunning-veluwe": t(
    "Trailrunning op de Veluwe: routes en uitrusting",
    "Trailrunning op de Veluwe: de mooiste gebieden rond Apeldoorn, wat je meeneemt, welke schoenen passen en hoe je veilig loopt.",
    `De Veluwe is het grootste aaneengesloten natuurgebied van Nederland, en voor trailrunners een speeltuin. Zand, heide, bos en de hoogtemeters van de Veluwezoom: vanuit Apeldoorn ben je er binnen een kwartier.

## Waar loop je?

- **Berg en Bos en het Kroondomein.** Brede bospaden aan de rand van Apeldoorn. Een goede plek om te beginnen.
- **De heide ten westen van Apeldoorn.** Open, met zandpaden en wind. Zwaarder dan het lijkt.
- **De Veluwezoom en de Posbank.** De echte hoogtemeters van de Veluwe, met steile klimmen en afdalingen.
- **Rond Hoog Soeren.** Rustige paden door het bos, ideaal voor lange tochten.

Let op: delen van de Veluwe zijn in bepaalde periodes of na zonsondergang afgesloten. Kijk vooraf bij de beheerder van het gebied wat er mag.

## Wat neem je mee?

Voor een trail van een uur:

1. Je telefoon, met de route offline opgeslagen.
2. Water bij warm weer.

Voor langer dan anderhalf uur:

1. Een hardloopvest of heuptas met water.
2. Iets te eten: een gel of reep.
3. Een licht windjack.

## Welke schoenen?

Op de Veluwe wissel je tussen hard bospad, los zand en boomwortels. Een trailschoen met een gemiddeld profiel (noppen van drie tot vier millimeter) werkt hier het best. Diepe noppen zijn voor modder; op droog zand en hard bospad voelen ze onrustig.

Daarnaast is bescherming belangrijk: een stevige neus tegen wortels en stenen, en een zool die je voet niet laat wegrollen.

Bij RunX Apeldoorn kun je trailschoenen passen en ze ook buiten uitproberen.

## Lopen op zand

Los zand kost kracht. Maak kortere passen, en loop een helling op met kleine stappen. Je kuiten zullen het de eerste keren merken.

## Bergaf

Kijk een paar meter voor je, niet naar je voeten. Houd je passen kort en je armen iets breder voor je balans.

## Samen

Vanuit RunX Apeldoorn zijn er in het voorjaar en de zomer om de week trailtrainingen op de Veluwe. Een mooie manier om nieuwe routes te leren kennen.`,
    [
      { q: "Waar kun je trailrunnen op de Veluwe?", a: "In Berg en Bos, op de heide rond Apeldoorn, rond Hoog Soeren en op de Veluwezoom en Posbank." },
      { q: "Welke trailschoen past bij de Veluwe?", a: "Een schoen met een gemiddeld profiel en een stevige neus, voor de afwisseling van bospad, zand en wortels." },
      { q: "Zijn er trailtrainingen vanuit Apeldoorn?", a: "Ja, in het voorjaar en de zomer om de week vanuit RunX Apeldoorn." },
    ],
  ),

  "trailschoenen-kiezen": t(
    "Trailschoenen kiezen: grip, demping en drop",
    "Waar let je op bij het kiezen van trailschoenen? Grip, bescherming, demping en drop uitgelegd, voor de Nederlandse ondergrond.",
    `Een trailschoen is meer dan een hardloopschoen met noppen. Vier dingen om op te letten.

## 1. Grip

- **Korte noppen (2 tot 3 mm)** voor hard bospad en gemengd terrein.
- **Gemiddelde noppen (3 tot 4 mm)** voor de meeste Nederlandse trails.
- **Lange noppen (5 mm of meer)** voor modder en natte heuvels.

## 2. Bescherming

Een stevige neus tegen stenen en wortels, en soms een plaat in de zool tegen scherpe stenen.

## 3. Demping

Meer demping voor lange afstanden, minder voor gevoel met de grond.

## 4. Drop

Veel trailschoenen hebben een lagere drop dan wegschoenen. Wissel geleidelijk, want je kuiten moeten wennen.

## Voor Nederland

Veel Nederlandse trails zijn gemengd: bospad, zand en af en toe asfalt. Een veelzijdige schoen met gemiddelde noppen is dan de beste start.

## Passen

In Apeldoorn en Enschede kun je trailschoenen passen en advies krijgen van lopers die zelf in de bossen lopen.`,
    [{ q: "Hoeveel profiel heeft een trailschoen nodig?", a: "Voor de meeste Nederlandse trails is een gemiddeld profiel van drie tot vier millimeter genoeg." }],
  ),

  "beginnen-met-trail": t(
    "Beginnen met trailrunning",
    "Beginnen met trailrunning: waar je start, wat je nodig hebt en hoe je wendt aan onverhard terrein.",
    `Trailrunning is hardlopen op onverhard terrein: bos, heide, duin en heuvel. Het is rustiger, mooier en zwaarder dan lopen op asfalt.

## Begin dichtbij

Een bospad in je eigen omgeving is een prima start. In Apeldoorn is dat Berg en Bos, in Haarlem de duinen, in Tilburg de Oisterwijkse bossen, in Twente de Lonnekermeer.

## Vergeet je tempo

Op een trail loop je langzamer. Loop op gevoel, niet op je horloge. Wandelen op steile stukken is heel normaal.

## Je eerste trailschoen

Een veelzijdige schoen met gemiddelde noppen is een goede start. Een wegschoen kan op droge bospaden ook, maar in zand en modder mis je grip.

## Wat neem je mee?

Bij een loop van een uur: je telefoon. Bij langer: water en iets te eten.

## Bouw rustig op

Je enkels en kuiten moeten wennen aan oneffen terrein. Begin met een of twee trails per week.

## Samen

In Apeldoorn en Twente zijn trailtrainingen en clinics. Een mooie manier om te beginnen.`,
    [{ q: "Heb ik trailschoenen nodig om te beginnen met trailrunning?", a: "Op droge bospaden kan een wegschoen, maar in zand en modder geeft een trailschoen veel meer grip." }],
  ),

  "trail-twente": t(
    "Trailrunnen in Twente: van de Holterberg tot het Lemelerveld",
    "Trailrunnen in Twente en omgeving: de Holterberg, het Lemelerveld, de Tankenberg en het Buurserzand.",
    `Twente en de rand van Salland hebben de mooiste glooiingen van Oost-Nederland.

## De Holterberg

Op de grens van Twente en Salland. Steile klimmen, bospaden en heide. Hier trainen veel trailers uit de regio.

## Het Lemelerveld en de Lemelerberg

Heide, zand en uitzicht. Een mooie lange trail, zeker in augustus als de heide bloeit.

## De Tankenberg

Bij Oldenzaal, een van de hoogste punten van Twente. Goed voor heuveltraining.

## Het Buurserzand

Bij Haaksbergen: stuifzand, heide en bos. Zwaar, maar prachtig.

## Schoenen

Een trailschoen met gemiddeld profiel werkt op de meeste paden. Bij RunX Twente aan de Kuipersdijk kun je ze passen.

## Clinics

Vanuit RunX Twente is er maandelijks een trailclinic voor beginners.`,
    [{ q: "Waar kun je trailrunnen in Twente?", a: "Op de Holterberg, het Lemelerveld, de Tankenberg en in het Buurserzand." }],
  ),

  "rugzak-of-heuptas": t(
    "Hardlooprugzak of heuptas voor een trail?",
    "Een hardlooprugzak of een heuptas voor je trail? Wanneer welke handig is, en waar je op let.",
    `## Heuptas

- **Voor:** loopjes tot anderhalf uur.
- **Past:** telefoon, sleutels, een gel, eventueel een kleine bidon.
- **Voordeel:** licht en je merkt hem nauwelijks.

## Hardloopvest

- **Voor:** lange trails, warm weer, of als je een jas mee moet nemen.
- **Past:** water, eten, jas, telefoon.
- **Voordeel:** het gewicht zit dicht op je lichaam en schudt niet.

## Waar let je op?

1. Hij moet strak zitten zonder te knellen.
2. Je moet je water pakken zonder te stoppen.
3. Probeer hem met gewicht erin.

## In de winkel

Pas een vest met gewicht, en loop er even mee op de band.`,
    [{ q: "Wanneer heb ik een hardloopvest nodig?", a: "Bij trails langer dan anderhalf uur, bij warm weer of als je een jas mee moet nemen." }],
  ),

  "speedgoat-of-speedcross": t(
    "Hoka Speedgoat of Salomon Speedcross voor modder?",
    "Twee bekende trailschoenen naast elkaar: de Hoka Speedgoat en de Salomon Speedcross, en welke beter past bij modder of gemengd terrein.",
    `Twee van de bekendste trailschoenen. Allebei goed, maar voor ander terrein.

## Hoka Speedgoat

- **Veel demping** en een brede zool.
- **Een veelzijdig profiel** voor gemengd terrein.
- **Past bij** lange trails en wie comfort zoekt.

## Salomon Speedcross

- **Diepe, agressieve noppen.**
- **Een smallere, nauwsluitende pasvorm.**
- **Past bij** echte modder en natte hellingen. Op hard bospad en asfalt voelt hij onrustig.

## Voor Nederland

Veel Nederlandse trails zijn gemengd. Dan is een veelzijdige schoen vaak de betere keuze. Loop je in de winter veel door modder, dan helpt een dieper profiel.

## In de winkel

In de RunX-winkels vind je vooral trailschoenen van Hoka, Saucony en Brooks. Vraag welke het best bij jouw routes past.`,
    [{ q: "Welke trailschoen is beter voor modder?", a: "Een schoen met diepe noppen, zoals de Speedcross. Voor gemengd terrein is een veelzijdige schoen als de Speedgoat vaak prettiger." }],
  ),

  "trailschoenen-apeldoorn": t(
    "Trailschoenen kopen in Apeldoorn",
    "Trailschoenen kopen in Apeldoorn, aan de rand van de Veluwe: passen, buiten testen en advies van lopers die zelf in de bossen lopen.",
    `Apeldoorn ligt aan de Veluwe, en dat merk je in de winkel aan de Marktstraat: veel lopers zoeken een schoen voor het bos.

## Passen en buiten testen

In Apeldoorn kun je trailschoenen passen en ze daarna ook buiten uitproberen. Op straat en op een stukje onverhard voel je meer dan op de band.

## Welke schoen?

Voor de Veluwe werkt een trailschoen met gemiddeld profiel en een stevige neus het best. Loop je ook stukken op de weg naar het bos, kies dan een veelzijdige schoen.

## Trailtrainingen

In het voorjaar en de zomer om de week vanuit de winkel, de Veluwe op.

## Ook voor de weg

Veel lopers kopen een trail- en een wegschoen. Bij nieuwe hardloopschoenen is de loopanalyse gratis.`,
    [{ q: "Waar koop ik trailschoenen in Apeldoorn?", a: "Bij RunX Apeldoorn aan de Marktstraat, waar je ze ook buiten kunt testen." }],
  ),

  "trailschoenen-enschede": t(
    "Trailschoenen kopen in Enschede",
    "Trailschoenen kopen in Enschede bij RunX Twente: passen, podologisch advies en een maandelijkse trailclinic.",
    `Twente is trailland. Bij RunX Twente aan de Kuipersdijk kun je trailschoenen passen met advies van lopers die zelf de heuvels in gaan.

## Wat je vindt

- Trailschoenen voor gemengd terrein en voor modder.
- Hardloopvesten en heuptassen.
- Podologisch advies, en zolen die in de winkel worden aangepast.

## Trailclinic

Maandelijks is er een trailclinic voor beginners. Een goede manier om de routes en de techniek te leren.

## Weg en trail

Veel Twentse lopers wisselen tussen weg en trail. Pas allebei in één bezoek.`,
    [{ q: "Waar koop ik trailschoenen in Enschede?", a: "Bij RunX Twente aan de Kuipersdijk 52." }],
  ),

  posbank: t(
    "Trailrun op de Posbank: hoe zwaar is het?",
    "Een trailrun op de Posbank: wat je kunt verwachten, hoe je de klimmen aanpakt en wat je meeneemt.",
    `De Posbank, op de Veluwezoom bij Rheden, is een van de bekendste trailplekken van Nederland.

## Hoe zwaar?

Voor Nederlandse begrippen zwaar: steile klimmen en afdalingen op zand en bospad, met een paar honderd hoogtemeters in een ronde van tien tot vijftien kilometer.

## Klimmen

Korte passen, armen mee, en wandel als het te steil wordt. Dat doen de meeste trailers.

## Dalen

Kijk vooruit, houd je passen kort en laat je niet meeslepen door de snelheid.

## Wat neem je mee?

Water, iets te eten en een jasje. Op de top waait het vaak.

## Schoenen

Een trailschoen met goede grip en een stevige neus. Bij RunX Apeldoorn kun je ze passen.`,
    [{ q: "Is de Posbank zwaar om te lopen?", a: "Voor Nederlandse begrippen wel: steile klimmen en afdalingen op zand en bospad." }],
  ),

  "waterdichte-trailschoenen": t(
    "Waterdichte trailschoenen: wel of niet?",
    "Wanneer waterdichte trailschoenen zinvol zijn en wanneer je beter een schoen kiest die snel droogt.",
    `## Wel als

- je in de winter loopt bij kou en nat gras;
- je weinig door diepe plassen of beekjes loopt.

## Niet als

- je door water moet: komt het van boven in, dan blijft het erin;
- het warm is: je voeten worden zweterig.

## Het alternatief

Een schoen die snel droogt, met wollen sokken. Ook nat blijven je voeten warm.

## Wat de winkel zegt

Waterdicht alleen als je vooral in koud nat weer loopt zonder diepe plassen. Anders liever een schoen die snel droogt.`,
    [{ q: "Zijn waterdichte trailschoenen een goed idee?", a: "Bij koud, nat weer zonder diepe plassen wel. Anders is een schoen die snel droogt vaak beter." }],
  ),

  "trailschoen-beginners": t(
    "Beste trailschoen voor beginners",
    "Welke trailschoen past bij een beginnende trailrunner? Waar je op let en drie soorten om te passen.",
    `Je eerste trailschoen hoeft niet extreem te zijn. Een veelzijdige schoen is de beste start.

## Waar let je op?

- **Een gemiddeld profiel** voor gemengd terrein.
- **Genoeg demping** voor comfort.
- **Een stevige neus** tegen wortels.
- **Een drop die niet te veel afwijkt** van je wegschoen.

## Drie soorten om te passen

1. **Een veelzijdige trailschoen**, zoals de Saucony Peregrine of de Brooks Cascadia.
2. **Een gedempte trailschoen**, zoals de Hoka Speedgoat of Challenger, fijn als je ook stukken weg loopt.
3. **Een hybride**, voor wie van weg naar bos loopt.

## In de winkel

In Apeldoorn en Enschede is de keuze in trailschoenen het grootst.`,
    [{ q: "Welke trailschoen past bij een beginner?", a: "Een veelzijdige schoen met gemiddeld profiel, genoeg demping en een stevige neus." }],
  ),

  "trail-loonse-duinen": t(
    "Trailschoenen voor de Loonse en Drunense Duinen",
    "Trailrunnen in de Loonse en Drunense Duinen: lopen in mul zand, welke schoen past en de trailgroep vanuit Tilburg.",
    `De Loonse en Drunense Duinen zijn een van de grootste stuifzandgebieden van Europa. Voor trailers een unieke plek.

## Lopen in mul zand

Zand kost kracht. Maak kortere passen, en kies paden met wat vastere grond als je benen moe worden.

## Welke schoen?

Een trailschoen met een gemiddeld profiel en een brede zool. Diepe noppen helpen in zand minder dan je denkt; een stabiele basis wel. Hoge sokken of slobbers houden het zand buiten.

## De trailgroep

Vanuit RunX Tilburg loopt op zaterdag een trailgroep in de duinen.

## Passen

Bij RunX Tilburg aan de Schouwburgring kun je trailschoenen passen.`,
    [{ q: "Welke schoen past bij de Loonse en Drunense Duinen?", a: "Een trailschoen met gemiddeld profiel en een brede, stabiele zool." }],
  ),

  "trail-herfst-veluwe": t(
    "Trailrunnen in de herfst op de Veluwe",
    "De herfst is het mooiste seizoen voor trailrunning op de Veluwe. Waar je op let: grip, licht en de bronsttijd.",
    `In de herfst is de Veluwe op zijn mooist: gekleurde bossen, mist over de heide en koele lucht.

## Grip

Natte bladeren en boomwortels zijn glad. Kies een trailschoen met goede grip.

## Licht

Het wordt vroeg donker. Ga op tijd, en neem een lamp mee als je laat vertrekt.

## De bronsttijd

In september en oktober is het bronsttijd van de edelherten. Sommige gebieden zijn dan beperkt toegankelijk. Kijk vooraf bij de beheerder wat er mag.

## Kleding

Lagen, en een licht jack voor de wind op de heide.

## Samen

Vraag in de winkel aan de Marktstraat naar de routes en trainingen van dit seizoen.`,
    [{ q: "Mag je in de herfst overal lopen op de Veluwe?", a: "Niet overal: in de bronsttijd zijn sommige gebieden beperkt toegankelijk. Kijk vooraf bij de beheerder." }],
  ),

  "rugzak-kiezen": t(
    "Een hardlooprugzak of heuptas kiezen",
    "Een hardlooprugzak, vest of heuptas kiezen: inhoud, pasvorm en waar je op let.",
    `## Hoeveel liter?

- **Heuptas:** voor de basis, telefoon en sleutels.
- **Vest van 5 liter:** voor trails tot drie uur.
- **Vest van 10 liter of meer:** voor ultra's en lange tochten.

## Pasvorm

Een vest moet als een tweede huid zitten. Probeer hem met gewicht erin.

## Water

Zachte flessen voorop of een drinkzak achterin. De meeste lopers vinden flessen voorop handiger.

## Extra's

Lussen voor stokken, een fluitje, reflectie.

## In de winkel

Pas verschillende vesten met gewicht, en loop er even mee.`,
    [{ q: "Hoe groot moet mijn hardloopvest zijn?", a: "Een vest van ongeveer vijf liter is genoeg voor trails tot drie uur." }],
  ),

  "trail-modder": t(
    "Trailschoenen voor modder en natte bladeren",
    "Trailschoenen voor de winter: grip in modder en op natte bladeren, en hoe je je schoenen na afloop schoonmaakt.",
    `In de winter worden veel trails modderig. Dan maakt je schoen het verschil.

## Diepere noppen

Noppen van vijf millimeter of meer, met ruimte ertussen, zodat de modder eruit valt.

## Een nauwsluitende pasvorm

Je voet mag niet schuiven in de schoen.

## Rubber

Zacht, kleverig rubber pakt beter op natte wortels en stenen.

## Na afloop

Spoel je schoenen af met lauw water, haal de zolen eruit en laat ze drogen met krantenpapier. Niet op de verwarming.

## Een tweede paar

Veel trailers hebben een winterschoen met dieper profiel naast hun gewone trailschoen.`,
    [{ q: "Welke trailschoen past bij modder?", a: "Een schoen met diepe noppen, ruimte ertussen en zacht rubber." }],
  ),
};

export const HYROX: Record<string, DemoTekst> = {
  "hyrox-schoenen": t(
    "HYROX-schoenen: hardloopschoen of trainingsschoen?",
    "Welke schoen draag je bij HYROX: een hardloopschoen, een trainingsschoen of iets ertussenin? Waar je op let bij de oefeningen en het lopen.",
    `Bij HYROX loop je acht keer een kilometer, en doe je tussendoor acht oefeningen: van de sled push tot wall balls. Je schoen moet dus twee dingen kunnen die niet vanzelf samengaan: goed lopen én stabiel staan.

## Wat vraagt HYROX van je schoen?

1. **Lopen.** Acht kilometer in totaal, vaak op een harde vloer in een hal. Demping is welkom.
2. **Duwen en trekken.** Bij de sled push en sled pull wil je grip op de vloer en een zool die niet inzakt.
3. **Springen en squatten.** Bij burpee broad jumps, lunges en wall balls wil je stabiliteit.

## Hardloopschoen

**Voordeel:** de acht kilometer gaan lekker.

**Nadeel:** veel demping en een hoge zool voelen wiebelig bij de oefeningen. Carbon wedstrijdschoenen zijn hier meestal niet ideaal.

## Trainingsschoen

**Voordeel:** stabiel bij de oefeningen.

**Nadeel:** weinig demping voor het lopen.

## Het beste van beide

De meeste HYROX-sporters kiezen een stevige hardloopschoen met gemiddelde demping, een niet te hoge zool en een brede basis. Zo loop je prettig én sta je stabiel. Veel merken hebben inmiddels ook schoenen die speciaal voor dit soort wedstrijden zijn gemaakt.

## Waar let je op bij het passen?

- **Grip op een gladde vloer**, voor de sled.
- **Een stevige hiel**, voor lunges en squats.
- **Een pasvorm die vastzit**, ook bij zijwaartse bewegingen.

## Passen in de winkel

In alle zes RunX-winkels kun je schoenen voor HYROX passen. In Zaandam en Haarlem is de keuze het grootst, en lopen sinds augustus ook HYROX-trainingen.`,
    [
      { q: "Welke schoenen draag je bij HYROX?", a: "De meeste sporters kiezen een stevige hardloopschoen met gemiddelde demping en een brede basis: goed voor het lopen en stabiel bij de oefeningen." },
      { q: "Is een carbon schoen goed voor HYROX?", a: "Meestal niet: hoog en smal voelt wiebelig bij de oefeningen." },
      { q: "Waar kan ik HYROX-schoenen passen?", a: "In alle zes RunX-winkels; in Zaandam en Haarlem is de keuze het grootst." },
    ],
  ),

  "wat-is-hyrox": t(
    "Wat is HYROX en hoe werkt een wedstrijd?",
    "HYROX uitgelegd: acht keer een kilometer lopen afgewisseld met acht oefeningen. Hoe een wedstrijd werkt en voor wie het is.",
    `## Wat is HYROX?

Een fitnesswedstrijd waarin hardlopen en functionele oefeningen samenkomen. Wereldwijd is het snel gegroeid, ook in Nederland.

## Hoe werkt een wedstrijd?

Acht keer loop je een kilometer, en na elke kilometer doe je een oefening:

1. SkiErg
2. Sled push
3. Sled pull
4. Burpee broad jumps
5. Roeien
6. Farmers carry
7. Sandbag lunges
8. Wall balls

## Categorieën

Je kunt solo meedoen, met z'n tweeën (doubles) of in een team. Er zijn lichtere en zwaardere gewichten.

## Voor wie?

Voor iedereen die hardlopen en kracht wil combineren. Hardlopers hebben een voorsprong op het lopen, krachtsporters op de oefeningen.

## Beginnen

Bij RunX Zaandam en Haarlem zijn sinds augustus HYROX-trainingen, samen met een sportschool in de buurt.`,
    [
      { q: "Hoeveel kilometer loop je bij HYROX?", a: "Acht keer een kilometer, dus acht kilometer in totaal." },
      { q: "Kun je HYROX met z'n tweeën doen?", a: "Ja, in de categorie doubles." },
    ],
  ),

  "eerste-hyrox": t(
    "Je eerste HYROX: twaalf weken voorbereiding",
    "Je voorbereiden op je eerste HYROX in twaalf weken: lopen, kracht en de overgang tussen de twee.",
    `Twaalf weken is een goede voorbereiding voor je eerste HYROX, als je al een basis hebt in lopen of fitness.

## Week 1 tot 4: basis

- Twee keer per week lopen, waarvan één rustige duurloop.
- Twee keer per week kracht: squats, lunges, duwen en trekken.

## Week 5 tot 8: combineren

- Eén training waarin je lopen en oefeningen afwisselt.
- Eén intervaltraining op de loopband of baan.
- Eén krachttraining.

## Week 9 tot 11: wedstrijdspecifiek

- Een paar keer de hele wedstrijd in delen nabootsen.
- Oefen de overgangen: na een sled push direct lopen.

## Week 12: rust

Minder volume, wel scherp blijven.

## Schoenen

Een stevige hardloopschoen met gemiddelde demping. Pas hem in Zaandam of Haarlem.`,
    [{ q: "Hoe lang train ik voor mijn eerste HYROX?", a: "Twaalf weken is een goede voorbereiding als je al een basis hebt." }],
  ),

  "hyrox-schema-lopers": t(
    "HYROX-schema voor lopers die al tien kilometer lopen",
    "Een HYROX-schema voor hardlopers: je hebt de conditie, nu de kracht en de overgangen.",
    `Loop je al tien kilometer, dan heb je voor HYROX een voorsprong. Je zwakke punt zijn waarschijnlijk de oefeningen.

## De opbouw per week

1. **Een rustige duurloop**, om je basis te houden.
2. **Twee krachttrainingen**: benen, duwen en trekken.
3. **Eén combinatietraining**: een kilometer lopen, een oefening, en weer lopen.

## Waar verliezen lopers tijd?

- Bij de sled push en sled pull.
- Bij de wall balls aan het eind.
- Bij de eerste kilometer na een zware oefening.

## De overgang trainen

Loop direct na een krachtoefening. Je benen voelen als lood; het went.

## Schoenen

Een stevigere schoen dan je wedstrijdschoen.`,
    [{ q: "Wat moet een hardloper vooral trainen voor HYROX?", a: "Kracht voor de oefeningen, en de overgang van oefening naar lopen." }],
  ),

  "hyrox-schoenen-zaandam": t(
    "HYROX-schoenen kopen in Zaandam",
    "HYROX-schoenen kopen in Zaandam bij RunX: de grootste keuze, advies en HYROX-trainingen vanuit de winkel.",
    `RunX Zaandam aan de Gedempte Gracht heeft de grootste keuze in schoenen voor HYROX.

## Wat je vindt

Stevige hardloopschoenen met gemiddelde demping en een brede basis, van merken als Asics, Puma en On.

## Passen met advies

Je loopt even op de band, en test hoe stabiel je staat bij een squat of lunge.

## HYROX-trainingen

Sinds augustus zijn er vanuit Zaandam HYROX-trainingen, samen met een sportschool in de buurt.

## Voor de Zaanstreek en Amsterdam

Veel HYROX-sporters komen uit Amsterdam-Noord en Purmerend.`,
    [{ q: "Waar koop ik HYROX-schoenen in Zaandam?", a: "Bij RunX Zaandam aan de Gedempte Gracht 58." }],
  ),

  "hyrox-en-hardlopen": t(
    "HYROX-training combineren met hardlopen",
    "Hoe je HYROX-training combineert met hardlopen zonder overbelast te raken: een weekindeling en tips.",
    `HYROX en hardlopen gaan goed samen. Maar wie alles tegelijk doet, raakt overbelast.

## Een weekindeling

| Dag | Training |
|---|---|
| Maandag | Kracht |
| Dinsdag | Rustige loop |
| Woensdag | Rust |
| Donderdag | Combinatietraining: lopen en oefeningen |
| Vrijdag | Rust of mobiliteit |
| Zaterdag | Lange, rustige loop |
| Zondag | Rust |

## Let op

- Doe je zwaarste beentraining niet de dag voor een lange loop.
- Bouw je volume rustig op.
- Slaap en eet genoeg.

## Schoenen

Een schoen voor HYROX en een voor je duurlopen. Zo heb je voor allebei wat je nodig hebt.

## Samen trainen

Vanuit Zaandam en Haarlem zijn er HYROX-trainingen.`,
    [{ q: "Kan ik HYROX en hardlopen combineren?", a: "Ja, met een goede weekindeling en genoeg rust tussen zware beentrainingen en lange loopjes." }],
  ),

  "hyrox-schoenen-vergeleken": t(
    "HYROX-schoenen vergeleken",
    "Drie soorten schoenen voor HYROX naast elkaar: een stevige hardloopschoen, een hybride en een trainingsschoen.",
    `Er is niet één HYROX-schoen. Drie soorten naast elkaar.

## Stevige hardloopschoen

Gemiddelde demping, een brede basis. Goed voor het lopen, redelijk stabiel bij de oefeningen. De keuze van de meeste sporters.

## Hybride schoen

Speciaal gemaakt voor dit soort wedstrijden: een lagere zool, veel grip, en toch demping voor het lopen.

## Trainingsschoen

Heel stabiel, weinig demping. Prettig bij de oefeningen, zwaar bij acht kilometer lopen.

## Wat kies je?

Ben je vooral loper: een stevige hardloopschoen. Ben je vooral krachtsporter: een hybride.

## Pas ze

In Zaandam en Haarlem kun je ze naast elkaar passen.`,
    [{ q: "Wat is de beste schoen voor HYROX?", a: "Voor de meeste sporters een stevige hardloopschoen met gemiddelde demping; voor krachtsporters vaak een hybride schoen." }],
  ),
};
