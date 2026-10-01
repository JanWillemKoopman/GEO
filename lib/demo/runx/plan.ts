/**
 * Het contentplan van het voorbeeldaccount RunX: 150 pagina's, 10 per maand.
 *
 * Plan: `docs/tasks/demo-account-runx.md` §6. Maanden zijn relatief aan de
 * lopende maand (M0 = 0): -12 tot en met -1 zijn voorbij en geplaatst, 0 loopt,
 * 1 en 2 staan klaar. De volgorde binnen een maand is de publicatievolgorde.
 *
 * De seizoenen volgen het hardloopjaar zoals het op 1 oktober 2026 staat
 * (M-12 = oktober 2025). Wordt het account later verjongd, dan schuiven de
 * maanden mee; zie §6.1 van het plan voor wat dat met de events doet.
 *
 * Puur, zonder `server-only`.
 */

import type { ContentType, PageType } from "@/lib/types/database";

export interface DemoPagina {
  /** Stabiele sleutel, voor vaste id's en om de tekst te vinden (`teksten.ts`). */
  sleutel: string;
  maand: number;
  cluster: string;
  titel: string;
  soort: ContentType;
  type: PageType;
  /** Pad op runx.nl waar de pagina live staat of komt te staan. */
  pad: string;
  /** Een van de twaalf pagina's die in de demo getoond worden (§6.4). */
  pronk?: boolean;
}

type Rij = [string, string, ContentType, PageType, string, boolean?];

const advies = (slug: string) => `/advies/${slug}/`;
const blog = (slug: string) => `/nieuws/blog/${slug}/`;

/** Per maand tien rijen: [cluster, titel, soort, type, pad, pronk]. */
const MAANDEN: Record<number, Rij[]> = {
  [-12]: [
    ["loopanalyse", "Loopanalyse in Apeldoorn: wat er gebeurt en wat je eraan hebt", "landing", "dienst", advies("loopanalyse-apeldoorn"), true],
    ["loopanalyse", "Loopanalyse in Groningen: vijf testbanen en video", "landing", "dienst", advies("loopanalyse-groningen"), true],
    ["loopanalyse", "Loopanalyse in Haarlem: zo werkt het bij RunX", "landing", "dienst", advies("loopanalyse-haarlem"), true],
    ["loopanalyse", "Loopanalyse bij de fysio of in de winkel?", "comparison", "informatief", advies("loopanalyse-fysio-of-winkel")],
    ["loopanalyse", "Neutrale of stabiele hardloopschoen: zo weet je het", "gids", "informatief", advies("neutraal-of-stabiel")],
    ["stad", "De mooiste hardlooprondes rond Apeldoorn", "article", "informatief", blog("hardlooprondes-apeldoorn")],
    ["stad", "Hardlopen in Groningen: routes, groepen en de winkel", "article", "informatief", blog("hardlopen-in-groningen")],
    ["schoenen", "Hoe vaak vervang je je hardloopschoenen?", "faq", "informatief", advies("hardloopschoenen-vervangen")],
    ["blessures", "Scheenbeenklachten bij hardlopen: oorzaken en wat een schoen kan doen", "gids", "informatief", advies("scheenbeenklachten"), true],
    ["schoenen", "Hardloopschoenen voor brede voeten", "gids", "categorie", advies("brede-voeten")],
  ],
  [-11]: [
    ["schoenen", "Hardlopen in de winter: zo kleed je je in lagen", "gids", "informatief", advies("winterkleding-lagen")],
    ["schoenen", "Verlichting voor hardlopen: gezien worden in het donker", "article", "categorie", advies("verlichting-hardlopen")],
    ["loopanalyse", "Loopanalyse in Tilburg: het nieuwe systeem uitgelegd", "landing", "dienst", advies("loopanalyse-tilburg"), true],
    ["loopanalyse", "Loopanalyse in Twente: met podologisch advies", "landing", "dienst", advies("loopanalyse-twente"), true],
    ["loopanalyse", "Loopanalyse in Zaandam: advies van wedstrijdlopers", "landing", "dienst", advies("loopanalyse-zaandam"), true],
    ["blessures", "Hoe snel mag je je kilometers opbouwen?", "article", "informatief", advies("kilometers-opbouwen")],
    ["stad", "Hardlooproutes in de duinen bij Haarlem", "article", "informatief", blog("duinroutes-haarlem")],
    ["stad", "Hardlopen in Tilburg: van de Reeshof tot de Oisterwijkse vennen", "article", "informatief", blog("hardlopen-in-tilburg")],
    ["schoenen", "Hardloopschoenen met grip op natte straten", "comparison", "categorie", advies("grip-natte-straten")],
    ["blessures", "Pijn aan de buitenkant van je knie: de IT-band", "gids", "informatief", advies("it-band-knie")],
  ],
  [-10]: [
    ["schoenen", "Een sporthorloge kiezen voor hardlopen", "gids", "categorie", advies("sporthorloge-kiezen")],
    ["schoenen", "Garmin of Coros: welk horloge past bij jouw training?", "comparison", "categorie", advies("garmin-of-coros")],
    ["stad", "Mooie hardlooproutes in Twente", "article", "informatief", blog("hardlooproutes-twente")],
    ["stad", "Hardlopen in de Zaanstreek: rondjes langs de Zaan", "article", "informatief", blog("hardlopen-zaanstreek")],
    ["blessures", "Werken compressiekousen echt?", "faq", "categorie", advies("compressiekousen"), true],
    ["schoenen", "Hardloopcadeaus voor lopers die al alles hebben", "article", "categorie", blog("hardloopcadeaus")],
    ["loopanalyse", "Wat is overpronatie en hoe weet je of je het hebt?", "faq", "informatief", advies("overpronatie")],
    ["blessures", "Krachttraining voor hardlopers: tien minuten thuis", "gids", "informatief", advies("krachttraining-hardlopers")],
    ["beginnen", "Beginnen met hardlopen: je plan voor januari", "gids", "informatief", advies("beginnen-in-januari")],
    ["schoenen", "Twee paar hardloopschoenen afwisselen: waarom het werkt", "article", "informatief", advies("twee-paar-afwisselen")],
  ],
  [-9]: [
    ["beginnen", "Beginnen met hardlopen: je eerste acht weken", "gids", "informatief", advies("beginnen-met-hardlopen"), true],
    ["beginnen", "Hardloopschoenen voor beginners: waar let je op?", "gids", "categorie", advies("schoenen-voor-beginners")],
    ["beginnen", "Trainingsgroep voor beginners in Haarlem", "landing", "dienst", advies("beginnersgroep-haarlem")],
    ["beginnen", "Beginnersgroep hardlopen in Groningen", "landing", "dienst", advies("beginnersgroep-groningen")],
    ["beginnen", "Hoe vaak per week hardlopen als beginner?", "faq", "informatief", advies("hoe-vaak-hardlopen")],
    ["beginnen", "Waarom raak je zo snel buiten adem bij hardlopen?", "faq", "informatief", advies("buiten-adem")],
    ["beginnen", "Hardlopen met overgewicht: verantwoord beginnen", "gids", "informatief", advies("hardlopen-met-overgewicht")],
    ["beginnen", "Wat heb je echt nodig om te beginnen met hardlopen?", "article", "categorie", advies("wat-heb-je-nodig")],
    ["loopanalyse", "Moet je een afspraak maken voor een loopanalyse?", "faq", "dienst", advies("afspraak-loopanalyse")],
    ["blessures", "Spierpijn na het hardlopen: doorgaan of rusten?", "faq", "informatief", advies("spierpijn")],
  ],
  [-8]: [
    ["beginnen", "Beginnersgroep hardlopen in Apeldoorn", "landing", "dienst", advies("beginnersgroep-apeldoorn")],
    ["beginnen", "Beginnen met hardlopen in Tilburg", "landing", "dienst", advies("beginnersgroep-tilburg")],
    ["beginnen", "Beste hardloopapp voor beginners", "comparison", "informatief", advies("hardloopapp-beginners")],
    ["stad", "Loopgroep in Apeldoorn voor de Midwinter Marathon", "landing", "dienst", advies("loopgroep-apeldoorn")],
    ["schoenen", "Hardloopschoenen voor zwaardere lopers", "gids", "categorie", advies("zwaardere-lopers")],
    ["blessures", "Hielpijn bij hardlopers: wat helpt?", "gids", "informatief", advies("hielpijn")],
    ["wedstrijd", "De Midwinter Marathon lopen: voorbereiding, schoenen en kleding", "gids", "informatief", blog("midwinter-marathon"), true],
    ["wedstrijd", "Wanneer kies je een carbon wedstrijdschoen?", "gids", "categorie", advies("carbon-wedstrijdschoen"), true],
    ["wedstrijd", "Wat doet een carbon plaat in een hardloopschoen?", "faq", "informatief", advies("carbon-plaat")],
    ["wedstrijd", "Een wedstrijdschoen inlopen: zo doe je het", "article", "informatief", advies("wedstrijdschoen-inlopen")],
  ],
  [-7]: [
    ["blessures", "Achillespeesklachten voorkomen", "gids", "informatief", advies("achillespees")],
    ["blessures", "Inlegzolen voor hardlopers: wanneer helpen ze?", "faq", "categorie", advies("inlegzolen")],
    ["blessures", "Hardlopen met een blessure: wanneer moet je stoppen?", "article", "informatief", advies("stoppen-bij-blessure")],
    ["wedstrijd", "Zandvoort en de voorjaarslopen: je eerste halve marathon", "article", "informatief", blog("eerste-halve-marathon")],
    ["wedstrijd", "Je wedstrijdtempo bepalen voor een halve marathon", "gids", "informatief", advies("wedstrijdtempo-halve")],
    ["schoenen", "Hoka of On: het verschil voor een recreatieve loper", "comparison", "categorie", advies("hoka-of-on")],
    ["schoenen", "Brooks Ghost of Asics Novablast voor dagelijkse trainingen", "comparison", "categorie", advies("ghost-of-novablast")],
    ["beginnen", "Beginnen met hardlopen in Enschede", "landing", "dienst", advies("beginnersgroep-twente")],
    ["beginnen", "Beginnen met hardlopen in Zaandam", "landing", "dienst", advies("beginnersgroep-zaandam")],
    ["stad", "Hardloopgroepen in Haarlem en omgeving", "landing", "dienst", advies("loopgroepen-haarlem")],
  ],
  [-6]: [
    ["wedstrijd", "Je marathon in Enschede: de laatste vier weken", "gids", "informatief", blog("enschede-marathon")],
    ["wedstrijd", "Energiegels tijdens een marathon: hoeveel en wanneer", "faq", "categorie", advies("energiegels-marathon")],
    ["wedstrijd", "Taperen: minder trainen voor een betere wedstrijd", "article", "informatief", advies("taperen")],
    ["wedstrijd", "Saucony Endorphin Elite of Adidas Adios Pro?", "comparison", "categorie", advies("endorphin-of-adios-pro")],
    ["wedstrijd", "Wat eet je de avond voor een halve marathon?", "faq", "informatief", advies("avond-voor-de-wedstrijd")],
    ["blessures", "Herstel na een marathon: de eerste twee weken", "gids", "informatief", advies("herstel-na-marathon")],
    ["blessures", "Foamrollen of massage voor hardlopers?", "comparison", "informatief", advies("foamrollen-of-massage")],
    ["loopanalyse", "Hoeveel demping heb je nodig?", "gids", "informatief", advies("hoeveel-demping")],
    ["stad", "Hardloopwinkel in de buurt van Amsterdam-Noord", "landing", "dienst", advies("hardloopwinkel-amsterdam-noord")],
    ["schoenen", "Een halve maat groter kopen: wel of niet?", "faq", "informatief", advies("halve-maat-groter")],
  ],
  [-5]: [
    ["wedstrijd", "Asics Metaspeed Sky of Edge: wat is het verschil?", "comparison", "categorie", advies("metaspeed-sky-of-edge")],
    ["schoenen", "Zijn schoenen met maximale demping beter voor je knieën?", "faq", "informatief", advies("maximale-demping")],
    ["schoenen", "Wat is de drop van een hardloopschoen?", "faq", "informatief", advies("drop-hardloopschoen")],
    ["stad", "Hardlopen in Apeldoorn: de mooiste lopen van het jaar", "article", "informatief", blog("lopen-apeldoorn")],
    ["blessures", "Hardlopen na je veertigste: wat verandert er?", "gids", "informatief", advies("hardlopen-na-veertig")],
    ["trail", "Trailrunning op de Veluwe: routes en uitrusting", "gids", "informatief", blog("trailrunning-veluwe"), true],
    ["trail", "Trailschoenen kiezen: grip, demping en drop", "gids", "categorie", advies("trailschoenen-kiezen")],
    ["trail", "Beginnen met trailrunning", "article", "informatief", advies("beginnen-met-trail")],
    ["trail", "Trailrunnen in Twente: van de Holterberg tot het Lemelerveld", "article", "informatief", blog("trail-twente")],
    ["trail", "Hardlooprugzak of heuptas voor een trail?", "comparison", "categorie", advies("rugzak-of-heuptas")],
  ],
  [-4]: [
    ["schoenen", "Intervaltraining voor recreatieve lopers", "gids", "informatief", advies("intervaltraining")],
    ["blessures", "Je hardlooptechniek verbeteren zonder blessures", "gids", "informatief", advies("techniek-verbeteren")],
    ["trail", "Hoka Speedgoat of Salomon Speedcross voor modder?", "comparison", "categorie", advies("speedgoat-of-speedcross")],
    ["trail", "Trailschoenen kopen in Apeldoorn", "landing", "dienst", advies("trailschoenen-apeldoorn")],
    ["trail", "Trailschoenen kopen in Enschede", "landing", "dienst", advies("trailschoenen-enschede")],
    ["wedstrijd", "Supershoe of tempo schoen voor een halve marathon?", "comparison", "categorie", advies("supershoe-of-tempo")],
    ["beginnen", "Van vijf naar tien kilometer: de volgende stap", "gids", "informatief", advies("van-vijf-naar-tien")],
    ["loopanalyse", "Online of in de winkel hardloopschoenen kopen?", "comparison", "informatief", advies("online-of-winkel")],
    ["stad", "Hardlopen in Groningen in de zomer: vroeg of laat?", "article", "informatief", blog("zomer-groningen")],
    ["schoenen", "Brooks Glycerin of Hoka Bondi voor lange duurlopen", "comparison", "categorie", advies("glycerin-of-bondi")],
  ],
  [-3]: [
    ["schoenen", "Hardlopen in de hitte: drinken, tempo en tijdstip", "gids", "informatief", advies("hardlopen-in-de-hitte")],
    ["wedstrijd", "Hardlopen en drinken: hoeveel, wanneer en wat", "gids", "informatief", advies("hardlopen-en-drinken")],
    ["blessures", "Herstelschoenen na het hardlopen: zin of onzin?", "faq", "categorie", advies("herstelschoenen")],
    ["trail", "Trailrun op de Posbank: hoe zwaar is het?", "article", "informatief", blog("posbank")],
    ["trail", "Waterdichte trailschoenen: wel of niet?", "faq", "categorie", advies("waterdichte-trailschoenen")],
    ["schoenen", "Zijn waterdichte hardloopschoenen het waard?", "faq", "categorie", advies("waterdichte-hardloopschoenen")],
    ["stad", "Hardloopwinkel open op zondag in Haarlem", "faq", "dienst", advies("zondag-haarlem")],
    ["beginnen", "Een eerste wedstrijd kiezen als beginner", "article", "informatief", advies("eerste-wedstrijd")],
    ["loopanalyse", "Loopanalyse op de band of buiten: wat is betrouwbaarder?", "comparison", "informatief", advies("band-of-buiten")],
    ["blessures", "Compressiekousen of sleeves voor herstel?", "comparison", "categorie", advies("kousen-of-sleeves")],
  ],
  [-2]: [
    ["wedstrijd", "Trainen voor de Dam tot Damloop", "gids", "informatief", blog("dam-tot-damloop")],
    ["wedstrijd", "Tien Engelse mijl lopen: schema en wedstrijdtempo", "gids", "informatief", blog("tien-engelse-mijl")],
    ["trail", "Beste trailschoen voor beginners", "comparison", "categorie", advies("trailschoen-beginners")],
    ["stad", "Hardloopgroepen in Tilburg op doordeweekse avonden", "landing", "dienst", advies("loopgroepen-tilburg")],
    ["schoenen", "Hardloopschoenen van vorig seizoen kopen: slim of niet?", "faq", "informatief", advies("vorig-seizoen")],
    ["blessures", "Hardlopen na je vijftigste: schoenen en opbouw", "gids", "informatief", advies("hardlopen-na-vijftig")],
    ["beginnen", "Interval of rustig doorlopen als beginner?", "faq", "informatief", advies("interval-of-rustig")],
    ["hyrox", "HYROX-schoenen: hardloopschoen of trainingsschoen?", "comparison", "categorie", advies("hyrox-schoenen"), true],
    ["hyrox", "Wat is HYROX en hoe werkt een wedstrijd?", "faq", "informatief", blog("wat-is-hyrox")],
    ["hyrox", "Je eerste HYROX: twaalf weken voorbereiding", "gids", "informatief", advies("eerste-hyrox")],
  ],
  [-1]: [
    ["wedstrijd", "Na de Dam tot Damloop: herstel in de eerste week", "article", "informatief", blog("herstel-dam-tot-dam")],
    ["wedstrijd", "Tilburg Ten Miles: snel parcours of niet?", "article", "informatief", blog("tilburg-ten-miles")],
    ["hyrox", "HYROX-schema voor lopers die al tien kilometer lopen", "gids", "informatief", advies("hyrox-schema-lopers")],
    ["hyrox", "HYROX-schoenen kopen in Zaandam", "landing", "dienst", advies("hyrox-schoenen-zaandam")],
    ["trail", "Trailschoenen voor de Loonse en Drunense Duinen", "landing", "categorie", advies("trail-loonse-duinen")],
    ["stad", "Hardloopwinkel in de Zaanstreek met loopanalyse", "landing", "dienst", advies("hardloopwinkel-zaanstreek")],
    ["loopanalyse", "Asics Gel-Kayano of Brooks Adrenaline?", "comparison", "categorie", advies("kayano-of-adrenaline")],
    ["schoenen", "Welke hardloopjas is echt waterdicht?", "comparison", "categorie", advies("waterdichte-hardloopjas")],
    ["blessures", "Fysiotherapeut of hardloopwinkel bij scheenbeenklachten?", "faq", "informatief", advies("fysio-of-winkel")],
    ["beginnen", "Hardlopen in de ochtend of in de avond?", "faq", "informatief", advies("ochtend-of-avond")],
  ],
};

/**
 * De lopende maand en de twee daarna. De status van elke pagina volgt uit zijn
 * publicatiedatum ten opzichte van de dag van inladen (`statusOp()` in
 * `jaar.ts`), zodat de demo op elke dag van de maand klopt: op de 1e staat er
 * nog niets van deze maand live, op de 20e al de helft.
 */
const KOMEND: Record<number, Rij[]> = {
  0: [
    ["wedstrijd", "De 4 Mijl van Groningen: zo loop je hem snel en blessurevrij", "gids", "informatief", blog("4-mijl-van-groningen")],
    ["schoenen", "Hardloopkleding voor de herfst: wat heb je echt nodig?", "gids", "categorie", advies("herfstkleding")],
    ["loopanalyse", "Loopanalyse en hardloopschoenen kopen in Groningen", "landing", "dienst", advies("hardloopschoenen-groningen")],
    ["schoenen", "Hardlopen in de regen: schoenen, jas en grip", "gids", "categorie", advies("hardlopen-in-de-regen")],
    ["blessures", "Herstel na een najaarsmarathon: de eerste twee weken", "article", "informatief", advies("herstel-najaarsmarathon")],
    ["trail", "Trailrunnen in de herfst op de Veluwe", "article", "informatief", blog("trail-herfst-veluwe")],
    ["hyrox", "HYROX-training combineren met hardlopen", "gids", "informatief", advies("hyrox-en-hardlopen")],
    ["blessures", "Hardlopen na je veertigste: herstel en rustdagen", "faq", "informatief", advies("rustdagen-na-veertig")],
    ["schoenen", "Wanneer zijn je hardloopschoenen op?", "faq", "informatief", advies("schoenen-op")],
    ["trail", "Een hardlooprugzak of heuptas kiezen", "comparison", "categorie", advies("rugzak-kiezen")],
  ],
  1: [
    ["schoenen", "Winterhardlopen: de lagen die je warm en droog houden", "gids", "categorie", advies("winterlagen")],
    ["schoenen", "Reflecterende kleding en verlichting voor de donkere maanden", "article", "categorie", advies("reflecterend")],
    ["beginnen", "Hardlopen op de loopband of buiten in de winter?", "comparison", "informatief", advies("loopband-of-buiten")],
    ["trail", "Trailschoenen voor modder en natte bladeren", "gids", "categorie", advies("trail-modder")],
    ["loopanalyse", "Hardloopschoenen kopen in Tilburg met loopanalyse", "landing", "dienst", advies("hardloopschoenen-tilburg")],
    ["wedstrijd", "Je basis opbouwen voor een voorjaarsmarathon", "gids", "informatief", advies("basis-voorjaarsmarathon")],
    ["schoenen", "Het verschil tussen een gewone en een hardloopsok", "faq", "categorie", advies("hardloopsokken")],
    ["schoenen", "Een sporthorloge kopen voor de feestdagen", "comparison", "categorie", advies("horloge-feestdagen")],
    ["blessures", "Kracht en mobiliteit voor hardlopers, thuis te doen", "gids", "informatief", advies("kracht-mobiliteit")],
    ["hyrox", "HYROX-schoenen vergeleken", "comparison", "categorie", advies("hyrox-schoenen-vergeleken")],
  ],
  2: [
    ["beginnen", "Beginnen met hardlopen in januari: je plan voor de eerste maand", "gids", "informatief", advies("eerste-maand")],
    ["beginnen", "De beste hardloopschoen voor beginners dit jaar", "comparison", "categorie", advies("beste-beginnersschoen")],
    ["schoenen", "Hardloopcadeaus voor de feestdagen", "article", "categorie", blog("cadeaus-feestdagen")],
    ["beginnen", "Trainingsgroepen voor beginners in alle zes RunX-steden", "landing", "dienst", advies("beginnersgroepen")],
    ["wedstrijd", "Je voorbereiding op de Midwinter Marathon begint nu", "gids", "informatief", blog("midwinter-voorbereiding")],
    ["beginnen", "Hardlopen tijdens de feestdagen: zo blijf je in ritme", "article", "informatief", blog("feestdagen-ritme")],
    ["schoenen", "Een hartslagband of polsmeting: wat is nauwkeuriger?", "comparison", "categorie", advies("hartslagband-of-pols")],
    ["blessures", "Hardlopen in kou en wind: je ademhaling", "faq", "informatief", advies("ademhaling-kou")],
    ["loopanalyse", "Hardloopschoenen kopen in Zaandam met loopanalyse", "landing", "dienst", advies("hardloopschoenen-zaandam")],
    ["beginnen", "Je hardloopdoelen voor het nieuwe jaar", "article", "informatief", blog("doelen-nieuw-jaar")],
  ],
};

/** Status van de komende maanden zelf (§6.3): oktober en november vrijgegeven, december nog niet. */
export const MAANDSTATUS: Record<number, "goedgekeurd" | "ter_goedkeuring"> = { 0: "goedgekeurd", 1: "goedgekeurd", 2: "ter_goedkeuring" };

function slug(pad: string): string {
  return pad.split("/").filter(Boolean).pop() ?? pad;
}

export const PAGINAS: DemoPagina[] = [
  ...Object.entries(MAANDEN).flatMap(([m, rijen]) =>
    rijen.map(([cluster, titel, soort, type, pad, pronk]) => ({
      sleutel: slug(pad),
      maand: Number(m),
      cluster,
      titel,
      soort,
      type,
      pad,
      pronk: pronk === true,
    })),
  ),
  ...Object.entries(KOMEND).flatMap(([m, rijen]) =>
    rijen.map(([cluster, titel, soort, type, pad, pronk]) => ({
      sleutel: slug(pad),
      maand: Number(m),
      cluster,
      titel,
      soort,
      type,
      pad,
      pronk: pronk === true,
    })),
  ),
].sort((a, b) => a.maand - b.maand);

/**
 * De voorraad: kansen uit de laatste rapporten die nog niet ingepland zijn
 * (§6.3). Ze staan als aanbeveling in het laatste rapport van hun cluster, en
 * `syncBacklog()` maakt er bij het inladen kaarten van, zoals bij een echte
 * klant. Twaalf, zodat zichtbaar is dat er meer te doen is dan het pakket toelaat.
 */
export const VOORRAAD: Omit<DemoPagina, "maand" | "pad" | "sleutel">[] = [
  { cluster: "loopanalyse", titel: "Loopanalyse voor kinderen en jonge atleten", soort: "faq", type: "dienst" },
  { cluster: "loopanalyse", titel: "Wat neem je mee naar een loopanalyse?", soort: "faq", type: "dienst" },
  { cluster: "schoenen", titel: "Hardloopschoenen voor smalle voeten", soort: "gids", type: "categorie" },
  { cluster: "schoenen", titel: "Saucony Endorphin Azura of Speed: het verschil", soort: "comparison", type: "categorie" },
  { cluster: "blessures", titel: "Hardlopen met een zwangerschap: wat verandert er?", soort: "gids", type: "informatief" },
  { cluster: "stad", titel: "Hardloopwinkel open op zondag in Groningen", soort: "faq", type: "dienst" },
  { cluster: "beginnen", titel: "Start to run of een loopgroep van de winkel?", soort: "comparison", type: "informatief" },
  { cluster: "wedstrijd", titel: "Wedstrijdschoenen in de uitverkoop: waar let je op?", soort: "faq", type: "categorie" },
  { cluster: "trail", titel: "Trailrunnen met stokken: wanneer zinvol?", soort: "faq", type: "informatief" },
  { cluster: "trail", titel: "Een horloge met navigatie voor trailrunning", soort: "comparison", type: "categorie" },
  { cluster: "hyrox", titel: "Doubles of solo bij je eerste HYROX", soort: "faq", type: "informatief" },
  { cluster: "hyrox", titel: "Wat trek je aan bij een HYROX-wedstrijd?", soort: "gids", type: "categorie" },
];
