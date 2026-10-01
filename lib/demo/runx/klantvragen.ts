/**
 * De vragen die ORBIT ENGINE het afgelopen jaar aan RunX stelde, met de
 * antwoorden. Plan: `docs/tasks/demo-account-runx.md` §7.
 *
 * ⚠️ Alle antwoorden zijn fictief: zo zou een ondernemer van RunX ze geven,
 * maar RunX heeft ze nooit gegeven. Bewust zonder prijzen, percentages of
 * beloftes, want die zouden als harde feiten in een pagina kunnen belanden
 * (conventie 1, en route A van het plan).
 *
 * Een beantwoorde vraag gaat bij het inladen door `answerFact()` (`lib/facts.ts`),
 * dezelfde weg als een antwoord van een echte klant: zo wordt het verklaarde
 * kennis met de reikwijdte van de vraag.
 *
 * Puur, zonder `server-only`.
 */

import type { FactRequest } from "@/lib/types/database";

export interface DemoKlantvraag {
  sleutel: string;
  /** Maand waarin de vraag gesteld is, relatief aan M0. */
  maand: number;
  /** Cluster (sleutel uit `vragen.ts`) of `null` voor het hele merk. */
  cluster: string | null;
  soort: NonNullable<FactRequest["kind"]>;
  antwoordType: NonNullable<FactRequest["answer_type"]>;
  vraag: string;
  reden: string;
  status: "beantwoord" | "overgeslagen" | "open";
  antwoord?: string;
  /** De open vraag van een pagina die op goedkeuring wacht (§7). */
  openPagina?: boolean;
}

type Rij = [number, string | null, DemoKlantvraag["soort"], DemoKlantvraag["antwoordType"], string, string, string];

const BEANTWOORD: Rij[] = [
  [-13, null, "verificatie", "ja_nee", "Is de loopanalyse gratis bij elke aankoop van nieuwe hardloopschoenen, in alle zes de winkels?", "Dit staat op de site en wordt de kern van de stadspagina's.", "Ja. In alle zes de winkels is de loopanalyse gratis als je nieuwe hardloopschoenen koopt."],
  [-13, null, "praktisch", "tekst_lang", "Kun je ook een loopanalyse laten doen zonder schoenen te kopen?", "Lopers vragen dit vaak aan AI. Een eerlijk antwoord maakt de pagina geloofwaardiger.", "Dat kan, maar het is niet het standaardaanbod. Vraag het in de winkel; de meeste ondernemers rekenen dan een vergoeding die je terugkrijgt als je later toch schoenen koopt."],
  [-13, null, "praktisch", "ja_nee", "Moet je een afspraak maken voor een loopanalyse?", "Bepaalt de oproep onderaan elke stadspagina.", "Nee, binnenlopen kan altijd. Op zaterdag is het druk, dan is een afspraak handig. In Twente en Groningen kun je online een tijd kiezen."],
  [-13, null, "onderscheid", "tekst_lang", "Wat doen jullie bij een loopanalyse wat een webwinkel niet kan?", "Het bezwaar 'online is goedkoper' komt in bijna elke vergelijking terug.", "We kijken hoe je loopt, op de band en op video, en je loopt daarna met twee of drie schoenen die passen. Je voelt het verschil zelf. Een webwinkel kan je een maat sturen, maar niet zien hoe je voet landt."],
  [-13, null, "grenzen", "tekst_kort", "Hoe willen jullie omgaan met blessures in de content?", "Een grens in de schrijfopdracht voorkomt medische beloftes.", "Nooit een diagnose stellen. Bij pijn die blijft altijd doorverwijzen naar een fysiotherapeut of sportarts."],
  [-13, null, "grenzen", "ja_nee", "Mogen er prijzen in de pagina's staan?", "Prijzen veranderen per seizoen en per winkel.", "Nee. Geen prijzen en geen kortingen in de content."],
  [-13, "loopanalyse", "aanvulling", "tekst_lang", "Hoe verloopt een loopanalyse in Groningen precies?", "Groningen heeft een grotere winkel met meer testbanen; dat verdient een eigen pagina.", "Eerst een kort gesprek over hoe en waar je loopt. Daarna loop je op een van de vijf testbanen, we filmen je voetlanding en kijken naar de drukverdeling. Dan pas je twee of drie schoenen en loop je ermee."],
  [-13, "loopanalyse", "aanvulling", "tekst_lang", "Wat is er anders aan de loopanalyse in Twente?", "De Twentse winkel noemt podologisch advies op zijn pagina.", "In Twente kunnen we zolen aanpassen en podologisch advies geven. Bij hielklachten tapen we ook in de winkel."],
  [-13, "stad", "verificatie", "lijst", "Welke plaatsen rond de winkels horen echt bij jullie werkgebied?", "De meting stelt vragen met plaatsnamen; die moeten kloppen.", "Apeldoorn, Deventer, Zutphen, Epe; Groningen, Haren, Assen; Haarlem, Heemstede, Bloemendaal, Zandvoort; Tilburg, Breda, Waalwijk, Oisterwijk; Enschede, Hengelo, Almelo, Oldenzaal; Zaandam, Purmerend, Wormerveer, Amsterdam-Noord."],
  [-12, "blessures", "grenzen", "tekst_lang", "Wat zeggen jullie tegen een loper met scheenbeenklachten die in de winkel komt?", "De pagina over scheenbeenklachten moet het advies van de winkel volgen.", "We kijken naar de schoen en hoe oud hij is, en naar hoe snel iemand zijn kilometers heeft opgebouwd. Is de pijn er ook in rust of wordt hij erger, dan sturen we door naar een fysio."],
  [-12, "schoenen", "praktisch", "tekst_kort", "Na hoeveel kilometer raden jullie nieuwe schoenen aan?", "Een veelgestelde vraag; het antwoord moet het advies van de winkel zijn, niet een algemeen getal.", "Meestal tussen de 600 en 1.000 kilometer, maar we kijken liever naar de schoen zelf: de demping en de zool."],
  [-12, "loopanalyse", "bewijs", "tekst_lang", "Hebben de medewerkers zelf een achtergrond in hardlopen of sport?", "Bewijs van deskundigheid maakt een pagina sterker dan een bewering.", "In elke winkel werken lopers. Verschillende teams hebben wedstrijdlopers, sportmasseurs of een achtergrond in fysiotherapie. Liever geen namen in de content."],
  [-11, "stad", "aanvulling", "tekst_lang", "Welke routes raden jullie aan rond Apeldoorn?", "Voor de pagina over hardlooprondes.", "Het Berg en Bos-gebied, de rondes over de Apeldoornse heide en voor langere duurlopen richting de Veluwezoom."],
  [-11, "stad", "aanvulling", "tekst_lang", "Welke routes raden jullie aan in de duinen bij Haarlem?", "Voor de pagina over duinroutes.", "Het Kennemerduin vanaf Overveen, de Kennemerduinen richting Bloemendaal aan Zee, en de Amsterdamse Waterleidingduinen voor langere rondes."],
  [-11, "loopanalyse", "verificatie", "ja_nee", "Klopt het dat Tilburg een vernieuwd loopanalysesysteem heeft?", "Staat op de site; we willen het noemen op de stadspagina.", "Ja, sinds de verbouwing."],
  [-10, "schoenen", "onderscheid", "tekst_lang", "Welke horloges laten jullie het meest zien aan lopers die twijfelen?", "Voor de pagina over sporthorloges.", "Garmin en Coros, en voor wie vooral hartslag wil ook Polar. We vragen eerst wat iemand wil meten; vaak is een eenvoudig model genoeg."],
  [-10, "blessures", "praktisch", "tekst_kort", "Kun je compressiekousen in de winkel laten aanmeten?", "Lopers vragen dit aan AI met een plaatsnaam erbij.", "Ja, we meten de kuit en kiezen de maat. Dat kan in alle winkels."],
  [-10, "beginnen", "aanvulling", "tekst_lang", "Starten er in januari beginnersgroepen vanuit de winkels?", "De pagina over beginnen in januari verwijst ernaar.", "In Haarlem, Groningen, Apeldoorn en Tilburg wel. Twente en Zaandam werken met een vaste groep waar beginners kunnen aansluiten."],
  [-9, "beginnen", "praktisch", "tekst_kort", "Hoe lang duurt een beginnerstraject bij jullie?", "Voor de pagina's over beginnersgroepen.", "Ongeveer acht tot tien weken, één keer per week samen."],
  [-9, "beginnen", "grenzen", "tekst_kort", "Wat raden jullie beginners met overgewicht aan?", "Een gevoelig onderwerp; de toon moet kloppen.", "Rustig opbouwen met wandelen en hardlopen afwisselen, een schoen met genoeg demping, en bij twijfel eerst langs de huisarts."],
  [-9, "beginnen", "onderscheid", "tekst_lang", "Waarom zou een beginner naar een speciaalzaak gaan en niet gewoon iets online bestellen?", "Het belangrijkste bezwaar in dit cluster.", "Omdat de eerste schoen bepaalt of je het volhoudt. Een schoen die niet past geeft blaren of pijn, en dan stop je. Bij ons loop je eerst en kies je daarna."],
  [-8, "wedstrijd", "aanvulling", "tekst_lang", "Hoe adviseren jullie iemand die twijfelt over een carbon schoen?", "Voor de pagina over carbon wedstrijdschoenen.", "We vragen naar het doel en het tempo. Onder een tempo van ongeveer zes minuten per kilometer heb je er weinig aan. Voor wie snel wil lopen: inlopen op een paar tempotrainingen en daarna alleen voor wedstrijden gebruiken."],
  [-8, "wedstrijd", "verificatie", "ja_nee", "Zijn jullie aanwezig bij de Midwinter Marathon in Apeldoorn?", "Voor de eventpagina.", "Ja, met een stand bij de start."],
  [-8, "wedstrijd", "praktisch", "tekst_kort", "Hoe lang van tevoren moet je een wedstrijdschoen kopen?", "Een vraag die lopers aan AI stellen vóór een marathon.", "Minstens drie weken, zodat je hem een paar keer kunt inlopen."],
  [-7, "blessures", "aanvulling", "tekst_lang", "Wat doen jullie bij hielpijn?", "Voor de pagina over hielpijn.", "We kijken naar de schoen en de zool. In Twente kunnen we tapen en zolen aanpassen. Blijft de pijn, dan sturen we door naar een fysio of podotherapeut."],
  [-7, "stad", "praktisch", "tekst_lang", "Wanneer trainen de loopgroepen in Haarlem?", "Voor de pagina over loopgroepen.", "Op dinsdag- en donderdagavond vanuit de winkel, en op zondagochtend een duurloop in de duinen."],
  [-7, "schoenen", "onderscheid", "tekst_lang", "Wat is jullie eerlijke verschil tussen Hoka en On?", "Voor de vergelijkingspagina; geen merk afkraken.", "Hoka heeft meestal meer demping en een rocker die het afrollen makkelijk maakt. On voelt vaak steviger en directer. Welke beter is hangt af van hoe je landt, daarom laten we je met allebei lopen."],
  [-6, "wedstrijd", "aanvulling", "tekst_lang", "Welke sportvoeding raden jullie aan voor een marathon?", "Voor de pagina over energiegels.", "Maurten, SiS en Torq. Belangrijkste advies: probeer het uit op je lange duurlopen, nooit voor het eerst op de wedstrijddag."],
  [-6, "blessures", "grenzen", "tekst_kort", "Hoe lang raden jullie rust aan na een marathon?", "Voor de herstelpagina.", "De eerste week niet of heel rustig lopen. Daarna langzaam opbouwen; luister naar je lijf."],
  [-6, "stad", "verificatie", "ja_nee", "Zijn er klanten uit Amsterdam-Noord die naar Zaandam komen?", "Bepaalt of Amsterdam-Noord in het werkgebied hoort.", "Ja, een flink deel van de klanten in Zaandam komt uit Amsterdam-Noord en Purmerend."],
  [-5, "trail", "aanvulling", "tekst_lang", "Welke trailgebieden zijn het dichtst bij Apeldoorn en Enschede?", "Voor de trailpagina's.", "Vanuit Apeldoorn de Veluwe en de Posbank. Vanuit Enschede de Holterberg, het Lemelerveld en de Lonnekermeer."],
  [-5, "trail", "onderscheid", "tekst_lang", "Wat moet een beginnende trailloper als eerste kopen?", "Voor de pagina over beginnen met trail.", "Een trailschoen met goede grip. Een rugzak of heuptas pas als je langer dan anderhalf uur loopt."],
  [-5, "trail", "verificatie", "ja_nee", "Organiseren jullie trailtrainingen vanuit Apeldoorn of Twente?", "Voor de oproep op de trailpagina.", "Ja, in het voorjaar en de zomer om de week vanuit Apeldoorn, en maandelijks een trailclinic in Twente."],
  [-4, "trail", "praktisch", "tekst_kort", "Kun je trailschoenen buiten testen bij jullie?", "Een vraag die lopers aan AI stellen.", "In Apeldoorn kun je een rondje buiten lopen. Elders testen we op de band en op een schuine plaat."],
  [-4, "loopanalyse", "onderscheid", "tekst_lang", "Wat is het verschil tussen een loopanalyse bij jullie en bij een fysiotherapeut?", "Voor de vergelijkingspagina.", "Een fysiotherapeut kijkt naar je lichaam en een klacht. Wij kijken naar hoe je loopt in relatie tot de schoen. Bij klachten werken die twee juist goed samen."],
  [-4, "beginnen", "aanvulling", "tekst_kort", "Wat is een goed doel na de eerste vijf kilometer?", "Voor de pagina over van vijf naar tien kilometer.", "Een loop van tien kilometer in de eigen regio, zoals de Dam tot Damloop of een lokale tien kilometer."],
  [-3, "schoenen", "grenzen", "tekst_kort", "Mogen we noemen dat hardlopen in de hitte gevaarlijk kan zijn?", "Het onderwerp vraagt om voorzichtigheid.", "Ja, maar zonder te overdrijven: vroeg of laat lopen, rustiger tempo, genoeg drinken."],
  [-3, "stad", "verificatie", "ja_nee", "Is de winkel in Haarlem open op zondag?", "Er is een vraag over zondagopening in de meting.", "Ja, op koopzondagen. Kijk voor de tijden op de winkelpagina."],
  [-3, "trail", "onderscheid", "tekst_lang", "Raden jullie waterdichte trailschoenen aan?", "Voor de pagina over waterdichte trailschoenen.", "Alleen als je vooral in koud nat weer loopt zonder diepe plassen. Komt er water van boven in, dan droogt een waterdichte schoen juist slechter."],
  [-2, "hyrox", "aanvulling", "tekst_lang", "Welke schoenen zien jullie het meest bij HYROX-sporters?", "Voor de pagina over HYROX-schoenen.", "Een stevige hardloopschoen met niet te veel demping, zodat je stabiel staat bij de oefeningen. Asics, Puma en On zien we het vaakst."],
  [-2, "hyrox", "verificatie", "ja_nee", "Bieden jullie HYROX-trainingen aan?", "Voor de oproep op de HYROX-pagina's.", "Ja, sinds augustus vanuit Zaandam en Haarlem, samen met een sportschool in de buurt."],
  [-2, "wedstrijd", "aanvulling", "tekst_lang", "Wat adviseren jullie voor de laatste week voor de Dam tot Damloop?", "Voor de eventpagina.", "Niets nieuws meer proberen, ook geen nieuwe schoenen. Twee korte rustige loopjes en een paar versnellingen."],
  [-1, null, "onderscheid", "tekst_lang", "Wat is er na een jaar veranderd in hoe klanten jullie vinden?", "Uit het jaargesprek; gaat in het verhaal van het merk.", "Klanten zeggen vaker dat ze ons via ChatGPT of Google vonden bij een vraag over een loopanalyse. Vooral in Haarlem en Groningen noemen nieuwe klanten dat."],
  [-1, "hyrox", "praktisch", "tekst_kort", "Kun je HYROX-schoenen passen in alle winkels?", "Voor de stadspagina's in het HYROX-cluster.", "Ja, in alle zes. In Zaandam en Haarlem is de keuze het grootst."],
  [-1, "trail", "verificatie", "ja_nee", "Lopen er trailers vanuit Tilburg naar de Loonse en Drunense Duinen?", "Voor de nieuwe trailpagina vanuit Tilburg.", "Ja, de winkel in Tilburg heeft een trailgroep die daar op zaterdag loopt."],
  [-1, "wedstrijd", "aanvulling", "tekst_kort", "Zijn jullie bij de 4 Mijl van Groningen?", "Voor de eventpagina van oktober.", "Ja, met een stand in de stad op de dag zelf en een uitlooprondje de week ervoor."],
];

const OVERGESLAGEN: Rij[] = [
  [-12, null, "bewijs", "getal", "Hoeveel loopanalyses doen jullie per jaar in alle winkels samen?", "Een getal maakt de stadspagina's sterker.", ""],
  [-10, null, "bewijs", "getal", "Hoeveel leden heeft de RunX Club?", "Bewijs voor de community.", ""],
  [-8, "wedstrijd", "bewijs", "url", "Is er een pagina met resultaten van jullie loopgroepen bij wedstrijden?", "Voor de eventpagina's.", ""],
  [-6, "stad", "aanvulling", "tekst_kort", "Hebben de winkels eigen parkeerplaatsen?", "Er is een vraag over parkeren in de meting.", ""],
  [-3, "blessures", "bewijs", "tekst_lang", "Werken jullie samen met vaste fysiotherapeuten per stad?", "Voor de doorverwijzing op de blessurepagina's.", ""],
];

export const KLANTVRAGEN: DemoKlantvraag[] = [
  ...BEANTWOORD.map(([maand, cluster, soort, antwoordType, vraag, reden, antwoord], i) => ({
    sleutel: `beantwoord-${i + 1}`,
    maand,
    cluster,
    soort,
    antwoordType,
    vraag,
    reden,
    status: "beantwoord" as const,
    antwoord,
  })),
  ...OVERGESLAGEN.map(([maand, cluster, soort, antwoordType, vraag, reden], i) => ({
    sleutel: `overgeslagen-${i + 1}`,
    maand,
    cluster,
    soort,
    antwoordType,
    vraag,
    reden,
    status: "overgeslagen" as const,
  })),
  {
    // De open vraag van een pagina (besluit B3): het verhaal van de ondernemer
    // over déze pagina. Hangt bij het inladen aan de eerste pagina die op
    // goedkeuring wacht (`paginaVoorOpenVraag()` in `jaar.ts`).
    sleutel: "open-pagina",
    maand: 0,
    cluster: null,
    soort: "aanvulling",
    antwoordType: "tekst_lang",
    vraag: "Wat wil je dat lezers van deze pagina weten over hoe dit bij RunX gaat?",
    reden: "Een ervaring uit de winkel maakt de pagina herkenbaar. Zonder antwoord blijft de tekst algemener.",
    status: "open",
    openPagina: true,
  },
  {
    sleutel: "open-club",
    maand: -1,
    cluster: null,
    soort: "aanvulling",
    antwoordType: "tekst_lang",
    vraag: "Wat staat er dit najaar op het programma van de RunX Club?",
    reden: "Uit het jaargesprek. Komt terug op de pagina's over loopgroepen en beginnen in januari.",
    status: "open",
  },
  {
    sleutel: "open-twente",
    maand: -1,
    cluster: "stad",
    soort: "verificatie",
    antwoordType: "ja_nee",
    vraag: "Loopt de trailgroep in Twente ook in de winter door?",
    reden: "De novemberpagina over trailschoenen voor modder verwijst naar de groep.",
    status: "open",
  },
  {
    sleutel: "open-hyrox",
    maand: 0,
    cluster: "hyrox",
    soort: "praktisch",
    antwoordType: "tekst_kort",
    vraag: "Op welke dagen zijn de HYROX-trainingen in Zaandam?",
    reden: "Voor de pagina over HYROX-training en hardlopen van deze maand.",
    status: "open",
  },
];

