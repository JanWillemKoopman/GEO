/**
 * Vaste AI-antwoorden voor de ketentest (implementatieplan.md S7).
 *
 * ── WAAROM STUBBEN EN NIET ECHT AANROEPEN ───────────────────────────────────
 *
 * Een ketentest die OpenAI aanroept kost geld, duurt minuten en geeft elke keer
 * een ander antwoord. Dan test je het model in plaats van de bedrading, en de
 * bedrading is precies waar alle zeven fouten van dit traject zaten.
 *
 * De antwoorden hieronder zijn niet verzonnen maar nagebouwd op de vorm die in
 * `ai_calls` staat van de contentronde van 31 juli. Ze zijn met opzet
 * ONgemakkelijk gekozen: de claim-audit levert zowel een gedekte als een
 * ongedekte bewering op, en de geschreven pagina bevat een claim met een
 * SAMENGESTELDE bronverwijzing ("F1, F2") plus een zin die een uitspraak doet
 * zonder bron. Dat zijn de twee vormen waar de contentronde op stukliep.
 */
import type { StructuredCallOptions } from "@/lib/openai/structured";

/** Wat de stub teruggaf, zodat de test kan controleren dát er geschreven is. */
export interface StubLog {
  schemaName: string;
  /** De volledige gebruikersprompt, hierop toetsen we wat de schrijver zág. */
  user: string;
}

export function createOpenAiStub(log: StubLog[]) {
  return async <T>(opts: StructuredCallOptions<T>): Promise<{ parsed: T; raw: unknown }> => {
    log.push({ schemaName: opts.schemaName, user: opts.user });

    const antwoord = ANTWOORDEN[opts.schemaName];
    if (!antwoord) {
      throw new Error(
        `openai-stub: geen vast antwoord voor schema "${opts.schemaName}". ` +
          `Voeg het toe aan scripts/chain/openai-stub.ts.`,
      );
    }

    // Door het Zod-schema halen: dan faalt de test als de stub niet meer op het
    // contract past. Een stub die stilletijd afwijkt van het schema zou de
    // ketentest groen houden terwijl productie zou breken.
    const parsed = opts.schema.parse(antwoord(opts.user));
    return { parsed: parsed as T, raw: { stub: true, schema: opts.schemaName } };
  };
}

const ANTWOORDEN: Record<string, (user: string) => unknown> = {
  /**
   * De marktontdekking van de Sales-module (plan hoofdstuk 9).
   *
   * ⚠️ Met opzet ONGEMAKKELIJK gekozen, net als de andere antwoorden hier. Er
   * zitten vijf dingen in die stuk voor stuk een vangnet moeten raken:
   *
   *   1. Een bedrijf ZONDER website. Dat is precies de prospect die deze module
   *      zoekt, en het mag niet weggegooid worden.
   *   2. Hetzelfde bedrijf twee keer, één keer met `www.` en één keer zonder.
   *      Dat moet één bedrijf worden.
   *   3. Een platform (funda.nl) tussen de bedrijven. Dat is een bron en geen
   *      prospect, en het hoort eruit.
   *   4. Een bedrijf zonder naam. Dat is geen kandidaat.
   *   5. Een bedrijf dat ook op de bronpagina staat, zodat er iets is dat op
   *      twee onafhankelijke bronnen uitkomt en dus `middel` scoort.
   */
  sales_market_discovery: () => ({
    bedrijven: [
      {
        naam: "Van X Makelaars",
        website: "https://www.vanxmakelaars.nl/over-ons",
        plaats: "Eindhoven",
        bron_url: "https://nvm.nl/leden/eindhoven",
      },
      {
        naam: "Van X Makelaars",
        website: "vanxmakelaars.nl",
        plaats: "Eindhoven",
        bron_url: "https://eindhoven.nl/bedrijvengids",
      },
      {
        naam: "Y Makelaars",
        website: "https://ymakelaars.nl",
        plaats: "Eindhoven",
        bron_url: "https://nvm.nl/leden/eindhoven",
      },
      {
        naam: "Makelaardij Zonder Site",
        website: "",
        plaats: "Veldhoven",
        bron_url: "https://eindhoven.nl/bedrijvengids",
      },
      { naam: "Funda", website: "https://www.funda.nl", plaats: "", bron_url: "" },
      { naam: "", website: "https://naamloos.nl", plaats: "", bron_url: "" },
    ],
    bronpaginas: [
      { url: "https://nvm.nl/leden/eindhoven", wat: "ledenlijst NVM Eindhoven" },
      { url: "https://eindhoven.nl/bedrijvengids", wat: "gemeentelijke bedrijvengids" },
    ],
    kanttekening:
      "Kleine kantoren zonder eigen website zijn waarschijnlijk niet volledig in beeld.",
  }),

  /**
   * De commerciële intenties van de markt (sprint 3, plan hoofdstuk 10).
   *
   * ⚠️ Met opzet ELF intenties, en dat is er meer dan er in veertig vragen
   * passen. Zo toetst de keten wat er gebeurt als het model er te veel levert:
   * `schoonIntenties` hoort er acht over te houden en dat hardop te melden. Een
   * stub met precies vier intenties zou die hele laag ongetest laten.
   */
  sales_market_intents: () => ({
    intenties: [
      { label: "verkoopbegeleiding", naam: "Verkoopbegeleiding", uitleg: "Een woning verkopen levert de hoogste courtage op.", waarde: "hoog", frequentie: "hoog" },
      { label: "aankoopbegeleiding", naam: "Aankoopbegeleiding", uitleg: "Kopers zoeken vaker begeleiding dan vroeger.", waarde: "hoog", frequentie: "midden" },
      { label: "taxatie", naam: "Taxatie", uitleg: "Een taxatie is klein werk met een vaste prijs.", waarde: "midden", frequentie: "hoog" },
      { label: "nieuwbouw", naam: "Nieuwbouw", uitleg: "Nieuwbouwprojecten leveren meerdere opdrachten tegelijk op.", waarde: "hoog", frequentie: "laag" },
      { label: "verhuur", naam: "Verhuur", uitleg: "Verhuurbemiddeling is terugkerend werk.", waarde: "midden", frequentie: "midden" },
      { label: "expats", naam: "Expats", uitleg: "Expats betalen voor ontzorging.", waarde: "hoog", frequentie: "laag" },
      { label: "starters", naam: "Starters", uitleg: "Starters worden vaak klant voor het leven.", waarde: "midden", frequentie: "midden" },
      { label: "bedrijfspanden", naam: "Bedrijfspanden", uitleg: "Zakelijk vastgoed is een aparte markt.", waarde: "hoog", frequentie: "laag" },
      { label: "erfenis", naam: "Verkoop uit nalatenschap", uitleg: "Een nalatenschap vraagt begeleiding.", waarde: "midden", frequentie: "laag" },
      { label: "energielabel", naam: "Energielabel", uitleg: "Kleine klus, lage marge.", waarde: "laag", frequentie: "laag" },
      { label: "woningruil", naam: "Woningruil", uitleg: "Zeldzaam en bewerkelijk.", waarde: "laag", frequentie: "laag" },
    ],
    kanttekening: "De verhouding tussen koop en huur in deze plaats is een schatting.",
  }),

  /**
   * De vragen zelf.
   *
   * ⚠️ De stub LEEST de boodschappenlijst uit de prompt en levert precies wat er
   * gevraagd wordt. Een stub met vaste vragen zou de koppeling in
   * `koppelVragen()` ongetest laten, en juist daar zit de garantie dat een
   * intentie niet negen vragen krijgt terwijl een andere er één heeft.
   */
  sales_market_questions: (user: string) => ({
    vragen: leesVragenlijst(user),
  }),

  /**
   * Het oordeel over één marktantwoord (sprint 3, plan 15.2).
   *
   * Drie bedrijven: twee die in de markt zitten en één die er niet in zit. Dat
   * derde is het punt van plan 9.1, laatste rij: een naam die wij niet kennen is
   * informatie, geen afval.
   */
  sales_answer_judgement: () => ({
    bedrijven: [
      {
        naam: "Van X Makelaars",
        website: "vanxmakelaars.nl",
        positie: 1,
        rol: "eerste_aanbeveling",
        fragment: "Van X Makelaars wordt het vaakst genoemd in Eindhoven.",
      },
      {
        naam: "Q Makelaars",
        website: "",
        positie: 2,
        rol: "een_van_meerdere",
        fragment: "Q Makelaars is een goed alternatief.",
      },
      {
        naam: "Jansen Makelaardij",
        website: "",
        positie: 3,
        rol: "zijdelings",
        fragment: "Jansen Makelaardij wordt ook wel genoemd.",
      },
      // ⚠️ Een bedrijf dat NIET in de tekst staat. Het model doet dit echt: bij
      // de klantmeting vulde het bij 10 van de 27 niet-genoemde merken toch iets
      // in. Het vangnet in `sales-measure.ts` hoort deze eruit te gooien op grond
      // van de tekst zelf, en niet op grond van het woord van het model.
      {
        naam: "Bedrijf Dat Er Niet In Staat",
        website: "",
        positie: 4,
        rol: "zijdelings",
        fragment: "verzonnen",
      },
    ],
    bronnen: ["https://www.funda.nl/eindhoven", "nvm.nl"],
  }),

  /**
   * De uitleg en de haak bij één kans (sprint 4, plan hoofdstuk 14).
   *
   * ⚠️ De eerste zin bevat MET OPZET een verzonnen getal. Zo toetst de keten wat
   * er gebeurt als het model een cijfer bedenkt dat nergens uit de meting volgt:
   * de controle hoort hem te verwerpen en door te gaan naar het alternatief. Een
   * stub die netjes de goede cijfers gebruikt, zou precies het vangnet ongetest
   * laten waar dit hele hoofdstuk om draait.
   */
  sales_opportunity_text: () => ({
    haak: "Dit bedrijf wordt 97 keer minder genoemd dan de rest van de markt.",
    alternatieven: [
      "In deze markt wordt dit bedrijf bij geen van de gemeten vragen genoemd.",
      "De AI-assistenten noemen dit bedrijf niet als antwoord op vragen uit deze markt.",
    ],
    uitleg:
      "De meting laat zien dat dit bedrijf in deze markt nauwelijks voorkomt in de antwoorden " +
      "van AI-assistenten. De concurrenten worden wel genoemd. Dat verschil is niet te " +
      "verklaren uit de omvang van het bedrijf.",
  }),

  /**
   * De contactpersoon (sprint 5, plan 9.4).
   *
   * ⚠️ Drie personen, en twee daarvan horen NIET in de tabel te komen: een
   * administratief medewerker (verkeerde rol) en iemand met een adres op een
   * ander domein (het adres van de webbouwer). Een stub met alleen de goede
   * persoon zou beide vangnetten ongetest laten.
   */
  sales_contact_finding: (user: string) => {
    // De stub antwoordt over het bedrijf waar hij naar gevraagd is, net als een
    // echt model. Een vast domein zou de domeincontrole hieronder toevallig laten
    // slagen of falen, afhankelijk van welk bedrijf er in de test bovenaan staat.
    const domein = user.match(/^Website: (.+)$/m)?.[1]?.trim() ?? "onbekend.nl";
    return {
      personen: [
        {
          naam: "J. Jansen",
          rol: "Commercieel directeur",
          email: `j.jansen@${domein}`,
          telefoon: "040 123 4567",
          bron_url: `https://www.${domein}/over-ons`,
        },
        {
          naam: "A. de Boer",
          rol: "Administratief medewerker",
          email: `a.deboer@${domein}`,
          telefoon: "",
          bron_url: `https://www.${domein}/team`,
        },
        {
          naam: "P. Pietersen",
          rol: "Eigenaar",
          email: "p.pietersen@webbouwer.nl",
          telefoon: "",
          bron_url: `https://www.${domein}/contact`,
        },
      ],
      kanttekening: "Van één persoon staat de functie niet expliciet op de site.",
    };
  },

  /**
   * De conceptmail plus de gespreksvoorbereiding (sprint 5, plan 16.2 en 16.5).
   *
   * ⚠️ Het eerste bericht bevat MET OPZET twee verzonnen cijfers. De controle
   * hoort hem te verwerpen en het alternatief te nemen. Een stub die netjes
   * blijft, zou precies het vangnet ongetest laten waar hoofdstuk 16 om draait.
   */
  sales_outreach_draft: () => ({
    onderwerp: "Van X Makelaars in AI-antwoorden over makelaars",
    bericht:
      "Beste, jullie lopen 73% achter op de markt en missen daardoor 12 opdrachten per maand. " +
      "Dat kunnen wij oplossen. Tien minuten deze week?",
    alternatief_bericht:
      "Beste, wij stelden vragen aan AI-assistenten over makelaars in Eindhoven. Van X Makelaars " +
      "komt in die antwoorden nauwelijks voor, terwijl andere kantoren wel genoemd worden. Dat " +
      "zegt niets over jullie werk, wel over wat een AI-assistent over jullie weet. " +
      "Heb je tien minuten deze week om er even naar te kijken?",
    cijfers: ["Genoemd bij een klein deel van de gemeten vragen", "De concurrent scoort hoger"],
    openingen: [
      "Je hebt niet gereageerd op mijn mail, mag ik het kort toelichten?",
      "Fijn dat je reageerde. Zal ik laten zien waar het verschil zit?",
      "Je gaf aan dat je twijfelt of dit klopt. Dat snap ik, ik laat je de vragen zien.",
    ],
    bezwaren: [
      {
        bezwaar: "Wij krijgen onze klanten via mond-tot-mondreclame.",
        antwoord: "Dat klopt vaak, en dit gaat over de mensen die je zo niet bereikt.",
      },
    ],
    niet_zeggen: ["Hoeveel omzet dit misloopt weten we niet, dus dat zeggen we niet."],
  }),

  /**
   * Het publieke marktrapport (sprint 6, plan hoofdstuk 20).
   *
   * ⚠️ De bevindingen bevatten MET OPZET een oordeel over een bedrijf ("doet
   * slecht werk"). De controle hoort dat te weigeren en op het sjabloon terug te
   * vallen: deze pagina zegt wat de AI-assistenten antwoordden en niets over de
   * kwaliteit van een bedrijf, en de ondernemer over wie het gaat leest hem zelf.
   */
  sales_market_report: () => ({
    intro:
      "Steeds meer mensen vragen een AI-assistent om een aanbeveling. Deze pagina laat zien wie " +
      "er in deze markt genoemd wordt.",
    methode:
      "Wij stelden dezelfde vragen aan de beschikbare AI-assistenten en telden per antwoord welke " +
      "bedrijven genoemd werden.",
    bevindingen:
      "Een deel van de markt komt goed naar voren. De rest doet slecht werk aan zijn " +
      "zichtbaarheid en komt daardoor niet in beeld.",
  }),

  /**
   * De open marktvraag (blok M).
   *
   * ⚠️ De klant staat NIET vooraan, en dat is opzet. Dit blok moet aantonen dat
   * een merk dat wél genoemd wordt maar laag staat, ook als zodanig gemeten
   * wordt. Er zit bovendien een dubbele naam in: een model dat hetzelfde bedrijf
   * twee keer noemt heeft één bedrijf genoemd, en zonder ontdubbelen zakt de
   * plek van iedereen.
   */
  reputation_market: () => ({
    bedrijven: [
      { naam: "Feenstra", plek: 1, reden: "landelijk bekend en breed inzetbaar" },
      { naam: "Fysi-Unique", plek: 2, reden: "sterk in de regio" },
      { naam: "feenstra", plek: 3, reden: "dubbele vermelding van dezelfde partij" },
      { naam: "Van Dorp", plek: 4, reden: "grote installateur" },
    ],
  }),

  /**
   * Het opknippen van het onderzoek in fragmenten (blok E).
   *
   * ⚠️ Het derde fragment staat NIET in de aangeboden tekst. Dat is opzet: de
   * knipstap mag niets verzinnen, want zo'n fragment zou als bewijs alle
   * dienstvragen in gaan en dan rust blok B op fictie. De code controleert of
   * elk fragment letterlijk in het onderzoek voorkomt.
   */
  reputation_evidence: (user: string) => ({
    fragmenten: [
      {
        tekst: user.slice(0, Math.min(120, user.length)),
        bron_url: "https://trustpilot.com/review/fysi-unique.nl",
        onderwerp: "klantervaringen",
      },
      {
        tekst: "Klanten noemen het team deskundig en vriendelijk.",
        bron_url: "https://fysi-unique.nl/over-ons",
        onderwerp: "deskundigheid",
      },
      {
        tekst: "Dit fragment staat nergens in het aangeboden onderzoek en is verzonnen.",
        bron_url: "https://verzonnen.nl/x",
        onderwerp: "verzinsel",
      },
    ],
  }),

  // ── Mijn reputatie (docs/tasks/mijn-reputatie.md) ─────────────────────────
  //
  // ⚠️ De antwoorden zijn met opzet ONGEMAKKELIJK gekozen, net als de rest van
  // deze stub. Ze bevatten precies de gevallen waar dit onderdeel op stuk kan
  // lopen, zodat de ketentest de vangnetten toetst en niet het gelukkige pad:
  //
  //   • één antwoord zonder enige bron (`grondslag: "geen"`), dat NIET in het
  //     merkcijfer terecht mag komen;
  //   • één antwoord dat over een ander bedrijf gaat (`noemt_merk: false`),
  //     waarvan de toon altijd null moet worden;
  //   • een citaat dat NIET in de antwoordtekst staat en er dus uit hoort;
  //   • een vergelijking waarin het model een VIJFDE bedrijf toevoegt dat niet
  //     gevraagd is, en waarin één gevraagde partij onbekend is.
  reputation_verdict: (user: string) => {
    // Op de gestelde vraag reageren, zoals een echt model zou doen. Een vaste
    // uitkomst voor élke vraag zou de toonindex laten uitkomen op precies dat
    // ene label, en dan toetst de test zijn eigen stub.
    if (user.includes("nadelen")) {
      return {
        toon: "negatief",
        noemt_merk: true,
        grondslag: "reviews",
        pluspunten: [],
        minpunten: ["De levertijd valt tegen", "De prijs ligt boven het gemiddelde"],
        citaten: [{ tekst: "levertijd", bron_url: "https://trustpilot.com/review/fysi-unique.nl" }],
      };
    }
    // De ONGEGRONDE merkvraag: het model weet niets en is toch vriendelijk.
    // Precies het geval uit §2.1 waar dit product tegen beschermt.
    if (user.includes("Waar staan ze om bekend?") && !user.includes("Zoek het op")) {
      return {
        toon: "overwegend_positief",
        noemt_merk: true,
        grondslag: "geen",
        pluspunten: ["Maakt een professionele indruk"],
        minpunten: [],
        citaten: [],
      };
    }
    // ⚠️ HET SPIEGELBEELD, EN DAAROM STAAT HET HIER.
    //
    // Een "gemengd" label waarvan het enige bezwaar een opmerking over ONS
    // BEWIJS is. Dat is geen gemengd beeld maar lof met een openstaande vraag
    // over de bronnen. Gevonden in de tweede run op Gasservice Brabant, waar
    // 24 van de 24 antwoorden gemengd werden en dit soort regel meetelde als
    // kritiek. Het vangnet hoort dit op "overwegend_positief" te zetten, en de
    // regel zelf hoort niet in de zwakke punten te belanden.
    if (user.includes("Wat zeggen klanten")) {
      return {
        toon: "gemengd",
        noemt_merk: true,
        grondslag: "reviews",
        pluspunten: ["Klanten noemen de deskundigheid", "netjes werken en opruimen"],
        minpunten: ["weinig onafhankelijke reviews over deze dienst"],
        citaten: [],
      };
    }
    // Een antwoord over een gelijknamig bedrijf elders.
    if (user.includes("betrouwbaar")) {
      return {
        toon: "positief",
        noemt_merk: false,
        grondslag: "pers",
        pluspunten: ["Al veertig jaar actief"],
        minpunten: [],
        citaten: [],
      };
    }
    // ⚠️ Een vriendelijk label mét meerdere concrete bezwaren, precies het geval
    // dat op Gasservice Brabant 18 van de 19 antwoorden trof. Het vangnet hoort
    // dit op "gemengd" te zetten: er staat lof én kritiek.
    return {
      toon: "overwegend_positief",
      noemt_merk: true,
      grondslag: "reviews",
      pluspunten: ["Klanten noemen de deskundigheid", "De levertijd valt tegen"],
      minpunten: ["De levertijd valt tegen", "onverwacht hoge rekening", "geen prijsindicatie vooraf"],
      citaten: [
        // Staat letterlijk in de gestubde antwoordtekst hieronder.
        { tekst: "deskundig", bron_url: "https://trustpilot.com/review/fysi-unique.nl" },
        // ⚠️ Staat er NIET in: dit citaat hoort door het vangnet weggefilterd.
        { tekst: "de beste van Nederland", bron_url: "https://verzonnen.nl" },
      ],
    };
  },

  reputation_comparison: (user: string) => {
    // De gevraagde partijen uit de opdracht teruglezen, zodat de test blijft
    // kloppen als de rotatie een andere volgorde oplevert. Een stub met vaste
    // namen zou toetsen of je de rotatie goed geraden hebt in plaats van of de
    // vergelijking werkt.
    const m = /gevraagd zijn: (.*)/.exec(user);
    const partijen = (m?.[1] ?? "").split(",").map((p) => p.trim()).filter(Boolean);

    const volgorde = (criterium: string) => ({
      criterium,
      partijen: [
        ...partijen.map((naam, i) => ({
          naam,
          // ⚠️ De LAATSTE gevraagde partij kent het model niet. Die hoort uit de
          // noemer te vallen, zodat `of_parties` lager uitkomt dan het aantal
          // gevraagde partijen.
          ken_ik: i < partijen.length - 1,
          plaats: i < partijen.length - 1 ? i + 1 : 0,
          reden: `Onderbouwing voor ${naam} op ${criterium}.`,
          bronnen: ["https://trustpilot.com/review/fysi-unique.nl"],
        })),
        // ⚠️ Een VIJFDE bedrijf dat niet gevraagd is. Modellen doen dit, en het
        // verstoort de noemer. Vangnet 1 uit §4.4 hoort hem te negeren.
        {
          naam: "Niet Gevraagd BV",
          ken_ik: true,
          plaats: partijen.length + 1,
          reden: "Deze voegde het model er zelf bij.",
          bronnen: [],
        },
      ],
    });

    return {
      criteria: [
        volgorde("dienstverlening"),
        volgorde("kwaliteit"),
        volgorde("prijs_kwaliteit"),
        volgorde("betrouwbaarheid"),
      ],
    };
  },

  reputation_ratings: () => ({
    platforms: [
      {
        platform: "Trustpilot",
        url: "https://trustpilot.com/review/fysi-unique.nl",
        cijfer: 4.6,
        aantal: 128,
        zeker: true,
      },
      // ⚠️ Een cijfer ZONDER URL. Hoort weggegooid te worden: zonder URL valt er
      // niets te controleren, en een oncontroleerbaar cijfer op het scherm is
      // erger dan geen cijfer.
      { platform: "Een of ander platform", url: "", cijfer: 9.1, aantal: 3, zeker: false },
    ],
  }),

  reputation_source_kinds: (user: string) => ({
    domeinen: [...user.matchAll(/^- (.+)$/gm)].map((m) => ({
      domein: m[1].trim(),
      soort: "vakpers" as const,
    })),
  }),

  reputation_synthesis: () => ({
    samenvatting:
      "ChatGPT praat overwegend positief over je en baseert dat vooral op je eigen website.",
    sterk: ["Klanten noemen de deskundigheid"],
    kwetsbaar: ["De levertijd valt tegen"],
    per_dienst: [{ dienst: "Hardloopblessures", uitleg: "AI noemt je, met twee externe bronnen." }],
    vergelijking: "Je wint op betrouwbaarheid en verliest op prijs-kwaliteitverhouding.",
  }),

  /**
   * De promptgeneratie, per funnelfase (migratie 0054).
   *
   * ⚠️ Leest het GEVRAAGDE AANTAL en de FASE uit de opdracht terug, in plaats
   * van een vaste lijst terug te geven. Dat is het hele punt van de test: sinds
   * de verdeling per analyse instelbaar is, moet elke fase precies zoveel vragen
   * opleveren als er gevraagd zijn. Een stub met een vast aantal zou groen
   * blijven terwijl productie het verkeerde aantal genereert.
   *
   * De vragen bevatten bewust geen merk- of concurrentnaam, anders gooit het
   * vangnet in `prompts.ts` ze weg en gaat de generatie eindeloos bijvullen.
   */
  prompt_set: (user: string) => {
    const aantal = Number(/Genereer precies (\d+) prompts/.exec(user)?.[1] ?? 0);
    const fase = /FUNNELFASE "([^"]+)"/.exec(user)?.[1] ?? "Oriëntatie";
    return {
      prompts: Array.from({ length: aantal }, (_, i) => ({
        text: `Vraag ${i + 1} over dit onderwerp in de fase ${fase}?`,
        intent: "iets weten",
        intentType: "informational" as const,
        specificity: "long_tail" as const,
        purchaseIntent: false,
        cluster: fase.toLowerCase(),
      })),
    };
  },

  /**
   * De profielbrede zoekvolume-herkalibratie (docs/tasks/potentiescore.md, stap
   * B, `lib/pipeline/search-demand.ts`).
   *
   * ⚠️ Simuleert een ECHTE relatieve kalibratie, niet een vaste lijst: elke
   * onderwerptitel in de ketentest draagt zijn "ware omvang" in een `(getal)`
   * aan het eind, bijvoorbeeld "Kleine niche (20)". De stub berekent per
   * aanroep het volume relatief tot het ZWAARSTE onderwerp IN DIE AANROEP, net
   * als de echte instructie vraagt. Dat is precies wat de test moet bewijzen:
   * komt er een groter onderwerp bij, dan daalt het cijfer van een onderwerp
   * dat zelf niet veranderd is, want de noemer (het zwaarste onderwerp) is
   * groter geworden. Een vaste lijst zou dat gat niet kunnen laten zien.
   */
  search_demand_calibration: (user: string) => {
    const regels = user.split("\n").filter((r) => /^\d+\.\s/.test(r.trim()));
    const parsed = regels.map((r) => ({
      index: Number(/^(\d+)\./.exec(r.trim())?.[1] ?? 0),
      wareOmvang: Number(/\((\d+)\)/.exec(r)?.[1] ?? 50),
    }));
    const max = Math.max(1, ...parsed.map((p) => p.wareOmvang));
    return {
      scores: parsed.map((p) => ({
        index: p.index,
        volume: Math.round((p.wareOmvang / max) * 100),
        reasoning: `Testschatting: ware omvang ${p.wareOmvang} relatief tot het zwaarste onderwerp in deze aanroep (${max}).`,
      })),
    };
  },

  /**
   * Het profielonderzoek (`lib/pipeline/profile-research.ts`).
   *
   * ⚠️ Spreekt de consultant met OPZET tegen: het geeft een andere branche, een
   * ander bereik en andere concurrenten terug dan er vóór het gesprek is
   * ingevuld. Dat is precies wat een echt onderzoek mag doen met een aanname,
   * en het is de enige manier om te zien of `filterProtectedFields()` de
   * mensinvoer daadwerkelijk beschermt. Een stub die hetzelfde teruggeeft als
   * wat er al stond zou groen blijven terwijl de bescherming stuk is.
   */
  /**
   * De synthese. De `gaps` hieronder zijn met opzet ONgemakkelijk: een dubbele
   * vraag die alleen in hoofdletters verschilt, een opsomteken ervoor en een
   * lege regel. Precies de vormen waarop `gapQuestions()` moet ingrijpen vóór er
   * een rij in `fact_requests` belandt, want de unieke index staat op de
   * letterlijke tekst.
   */
  profile_synthesis: () => ({
    dossier:
      "Fysi-Unique is een fysiotherapiepraktijk in Amersfoort die zich richt op hardloopblessures.",
    gaps: [
      "Hoeveel behandelkamers heeft de praktijk?",
      "- In welk jaar is de praktijk opgericht?",
      "hoeveel behandelkamers heeft de praktijk?",
      "   ",
    ],
    facts: [
      {
        text: "De praktijk zit in Amersfoort.",
        sourceUrl: "https://fysi-unique.nl/hardloopklachten",
        quote: "Wij zitten in Amersfoort.",
      },
    ],
  }),

  /**
   * Halte 3b, het oordeel over een gesimuleerd antwoord (measureOnePrompt,
   * lib/pipeline/measure.ts). De metingscenario's van vóór "de impactmeting
   * bewaart nu beide golven" (0066) hadden dit nooit nodig: die bootsten hun
   * uitkomst na met voorgebakken rijen in tracking_runs. Wat hier gecontroleerd
   * wordt is de idempotentiesleutel, niet de classificatie, dus een leeg
   * oordeel is genoeg; het antwoord is lang genoeg om MIN_ANSWER_CHARS te halen.
   */
  mention: () => ({ mentions: [] }),

  profile_research: () => ({
    brandName: "Fysi-Unique",
    industry: "wellness en massage",
    businessModel: "dienstverlener" as const,
    products: ["dry needling"],
    serviceScope: "landelijk" as const,
    serviceRegions: [],
    marketLanguage: "Nederland, Nederlands",
    toneOfVoice: "Zakelijk en afstandelijk",
    personas: [{ name: "Sporter", needs: ["snel herstel"] }],
    valueProps: ["Ruime openingstijden"],
    competitors: ["SMC Amersfoort"],
    summary: "Een praktijk in Amersfoort, gevonden door het onderzoek.",
    proofPoints: ["Sinds 2011 gevestigd"],
    styleSamples: ["We kijken verder dan de klacht."],
  }),

  /**
   * De onderwerpvoorstellen (`lib/pipeline/propose-topics.ts`, migratie 0074).
   *
   * ⚠️ Het antwoord hangt af van de invoer: staat "UIT HET STRATEGISCH
   * GESPREK" in de aanroep, dan is dit de definitieve ronde ná het gesprek en
   * komen er andere titels uit dan de conceptronde ervoor. Zonder dat
   * onderscheid zou de ketentest niet kunnen zien of de definitieve ronde
   * echt iets anders opleverde, of toevallig hetzelfde teruggaf.
   */
  /**
   * Clusters ontdekken (lib/pipeline/cluster-discovery.ts, migratie 0109).
   *
   * De beginpunten bevatten bewust één term met de merknaam: die moet het
   * vangnet in code eruit halen. Het schiften geeft alles terug behalve de
   * homoniem ("capcut apk") en één nummer dat niet bestaat. Het bundelen geeft
   * één goede kandidaat, één die op een bestaand cluster lijkt, en één die
   * alleen uit verzonnen zoektermen bestaat en dus moet sneuvelen.
   */
  discovery_seeds: () => ({
    zoektermen: ["airco laten plaatsen", "cv ketel onderhoud", "klimaat bv airco"],
  }),
  discovery_sift: (user: string) => {
    const regels = user.split("\n").filter((r) => /^\d+\. /.test(r));
    return {
      relevant: [
        ...regels
          .filter((r) => !r.includes("capcut"))
          .map((r) => ({ nr: Number(r.split(".")[0]), pasvorm: "sterk" as const })),
        { nr: 999, pasvorm: "sterk" as const },
      ],
    };
  },
  discovery_bundle: (user: string) => {
    const termen = user
      .split("\n")
      .filter((r) => r.startsWith("- ") && r.includes(" · "))
      .map((r) => r.slice(2).split(" · ")[0]);
    return {
      kandidaten: [
        {
          titel: "Airco laten installeren",
          onderbouwing: "Mensen zoeken hier veel op en je staat net buiten de top.",
          diensten: ["Airco"],
          zoektermen: termen.filter((t) => t.includes("airco")),
        },
        {
          titel: "CV-ketel onderhoud in Tilburg",
          onderbouwing: "Past bij je aanbod.",
          diensten: ["CV-ketel onderhoud"],
          zoektermen: [...termen.filter((t) => t.includes("ketel")), "verzonnen ketelterm"],
        },
        {
          titel: "Zonnepanelen",
          onderbouwing: "Verzonnen door het model.",
          diensten: [],
          zoektermen: ["zonnepanelen kopen", "zonnepanelen prijs"],
        },
      ],
    };
  },
  topic_proposals: (user: string) => {
    const gesprek = user.includes("UIT HET STRATEGISCH GESPREK");
    return {
      topics: gesprek
        ? [
            {
              title: "Warmtepomp advies op maat",
              rationale: "Sluit aan op wat de klant in het gesprek vertelde.",
              offerings: ["Warmtepomp"],
              priority: 1,
            },
          ]
        : [
            {
              title: "CV-ketel onderhoud",
              rationale: "Volgt uit het aanbod op de website.",
              offerings: ["CV-ketel onderhoud"],
              priority: 1,
            },
            {
              title: "Airco laten installeren",
              rationale: "Volgt uit het aanbod op de website.",
              offerings: ["Airco"],
              priority: 2,
            },
          ],
    };
  },
  /**
   * L6, de FAQ-selectie (WP7). Houdt de eerste kandidaat met het eerste feit
   * van de kaart, en wijst de rest af op criterium 3: dan moeten die als vraag
   * aan de ondernemer terugkomen.
   */
  faq_selection: (user) => {
    const eersteFeit = /^(F\d+)\s\s/m.exec(user)?.[1] ?? "F1";
    const kandidaten = Array.from(user.matchAll(/^(\d+)\. /gm)).map((m) => Number(m[1]));
    return {
      kandidaten: kandidaten.map((nummer) =>
        nummer === 1
          ? { nummer, houden: true, criterium: null, reden: "Een bezwaar uit het gesprek.", onderbouwing: "feit", feiten: [eersteFeit], vakkennis: null }
          : { nummer, houden: false, criterium: "geen onderbouwing", reden: "Geen feit.", onderbouwing: "geen", feiten: [], vakkennis: null },
      ),
    };
  },
  /**
   * L8, de eindredactie (WP5). Leest het concept uit de opdracht terug, haalt
   * de relativering na een bewijsstuk weg (het voorbeeld van de zwemvijver in
   * §1.2) en houdt de beweringen met hun citaat. Staat er in het concept het
   * woord TESTBEDRAG, dan voegt de stub een bedrag toe dat nergens op de kaart
   * staat, zodat de ketentest het terugdraaien kan toetsen.
   */
  editorial_pass: (user) => {
    const concept = user.split("── HET CONCEPT ──")[1] ?? "";
    const metaTitle = /Metatitel: (.*)/.exec(concept)?.[1]?.slice(0, 60) ?? "Titel";
    const metaDescription = /Metabeschrijving: (.*)/.exec(concept)?.[1]?.slice(0, 160) ?? "Beschrijving";
    const na = concept.split(/Metabeschrijving: .*\n/)[1] ?? "";
    const body = na.split(/\n\[FAQ\]|\nBeweringen in het concept/)[0].trim();
    const faq = Array.from((na.split("[FAQ]")[1] ?? "").matchAll(/Q: (.*)\nA: (.*)/g)).map((m) => ({ q: m[1], a: m[2] }));
    const claims = Array.from(na.matchAll(/^- (F[\d, F]+): (.*) \(citaat: "(.*)"\)$/gm)).map((m) => ({
      factRef: m[1],
      claim: m[2],
      quote: m[3],
    }));
    const zonderRelativering = body.replace(/,? maar dat zegt op zichzelf niets[^.]*\./g, ".");
    return {
      bodyMarkdown: /TESTBEDRAG/.test(body) ? `${zonderRelativering}\n\nEen intake kost bij ons € 777.` : zonderRelativering,
      faq,
      metaTitle,
      metaDescription,
      claims,
      proofPoints: [],
      wijzigingen: [
        { was: "maar dat zegt op zichzelf niets", wordt: "", soort: "relativering", raaktFeit: false },
      ],
    };
  },
  /**
   * L5, de paginastrategie (WP3). Met opzet ongemakkelijk, zodat elk vangnet
   * in `strategie-check.ts` iets te doen krijgt: een F-nummer dat niet bestaat,
   * een kernonderwerp zonder feit, een voorbehoud zonder reden, en een budget
   * ver boven het plafond. Staat er een betwist feit in de opdracht, dan kiest
   * de stub het toch als prioriteitsfeit, zodat de conflictpoort het ziet.
   */
  page_strategy: (user) => {
    const refs = user
      .split("\n")
      .map((r) => /^(F\d+)\s\s+/.exec(r)?.[1])
      .filter((r): r is string => Boolean(r));
    const betwist = user
      .split("\n")
      .map((r) => /^(B\d+) \(/.exec(r)?.[1])
      .filter((r): r is string => Boolean(r));
    return {
      zoekintentie: "lokaal vinden",
      lezer: "Iemand met een hardloopblessure die snel geholpen wil worden",
      fase: "beslissing",
      paginadoel: "Een afspraak maken",
      kernboodschap: "Bij een hardloopblessure ben je hier snel en deskundig geholpen.",
      openingsantwoord: "Voor een hardloopblessure kun je in Amersfoort bij ons terecht.",
      hoek: "De pagina voor hardlopers met een blessure.",
      prioriteitsfeiten: [
        ...betwist.slice(0, 1).map((b) => ({ feit: b, betekenis: "betwist, hoort eruit" })),
        ...refs.slice(0, 3).map((f) => ({ feit: f, betekenis: "Dit telt voor deze lezer." })),
        { feit: "F99", betekenis: "bestaat niet" },
      ],
      optioneleFeiten: refs.slice(3, 5),
      uitgeslotenFeiten: [],
      onderwerpen: [
        { onderwerp: "Wat we behandelen", besluit: "opnemen", bron: "feit", feiten: refs.slice(0, 1), woorden: 150, vraag: null, uitleg: [], wachtOpConflict: [], kern: true, reden: "beslisvraag" },
        { onderwerp: "Wat een behandeling kost", besluit: "opnemen", bron: "geen", feiten: [], woorden: 80, vraag: null, uitleg: [], wachtOpConflict: betwist.slice(0, 1), kern: true, reden: "beslisvraag" },
        { onderwerp: "Vergelijk aanbieders", besluit: "weglaten", bron: "vakkennis", feiten: [], woorden: null, vraag: null, uitleg: [], wachtOpConflict: [], kern: false, reden: "consumentengids" },
      ],
      onzekerheden: [
        { punt: "Of er een wachtlijst is", bestemming: "B", reden: null, formulering: null, vraag: null },
        { punt: "Prijs verschilt per behandeling", bestemming: "B", reden: "geld", formulering: "De prijs hangt af van het aantal behandelingen.", vraag: null },
      ],
      bezwaar: null,
      lengtebudget: { woorden: 2000, onderbouwing: "veel te zeggen", redenBovenPlafond: null },
      oproep: "Maak een afspraak.",
      gevoelig: [],
    };
  },
  /**
   * L1, feiten indelen (WP2 van contentpijplijn-publicatiewaardig.md). Een
   * echt model leest de genummerde lijst; deze stub doet dat met een paar vaste
   * regels, zodat het scenario zelf bepaalt welke feiten botsen.
   */
  fact_classification: (user) => {
    const feiten = user
      .split("\n")
      .map((r) => /^(\d+)\.\s(.*)$/.exec(r))
      .filter((m): m is RegExpExecArray => Boolean(m));
    return {
      feiten: feiten.map((m) => {
        const tekst = m[2];
        const getallen = Array.from(tekst.matchAll(/\d{1,3}(?:\.\d{3})+|\d+/g)).map((g) =>
          Number(g[0].replace(/\./g, "")),
        );
        const prijs = /€|euro/i.test(tekst);
        const termijn = /week|weken|dag/i.test(tekst);
        const geldtVoor = /intake/i.test(tekst)
          ? "intake"
          : /ketel/i.test(tekst)
            ? "cv-ketel"
            : /levertijd/i.test(tekst)
              ? "levertijd"
              : null;
        return {
          nummer: Number(m[1]),
          soort: prijs ? "prijs" : termijn ? "termijn" : "overig",
          waardeMin: getallen[0] ?? null,
          waardeMax: getallen[1] ?? getallen[0] ?? null,
          eenheid: prijs ? "EUR" : termijn ? "week" : null,
          waardeTekst: null,
          geldtVoor,
          bewijskracht: "gewoon",
        };
      }),
    };
  },
  /**
   * L2, een conflict beoordelen. Het vaste oordeel dat het plan in §5 noemt:
   * de intake op kantoor en die in de auto zijn twee producten, geen conflict.
   * Al het andere is een echt conflict, met voorstel "onbekend".
   */
  conflict_judge: (user) => {
    const varianten = /kantoor/i.test(user) && /auto/i.test(user);
    return {
      echtConflict: !varianten,
      uitleg: varianten
        ? "Twee verschillende intakes: op kantoor en in de auto."
        : "Twee verschillende waarden voor hetzelfde.",
      voorstel: "onbekend",
      voorstelReden: "",
    };
  },
};


/**
 * De vrije-tekst-antwoorden voor Mijn reputatie.
 *
 * ── WAAROM DEZE STUB ER PAS NU IS ───────────────────────────────────────────
 *
 * Tot Mijn reputatie had geen enkele ketentest een `callPlain` nodig: de meting
 * bootst haar antwoorden na met voorgebakken rijen in `tracking_runs`. Mijn
 * reputatie kan dat niet, want daar is juist de SAMENHANG tussen zes taken wat
 * getest moet worden, en die begint bij het opslaan van een antwoord.
 *
 * ⚠️ De teksten bevatten letterlijk het woord "deskundig", want de
 * citaatcontrole in `reputation-verdict.ts` gooit elk citaat weg dat niet in de
 * antwoordtekst voorkomt. Zonder dat woord zou de test dat vangnet niet kunnen
 * onderscheiden van een stub die toevallig niets teruggeeft.
 */
/**
 * De boodschappenlijst uit de vragenprompt teruglezen.
 *
 * Een stub met vaste
 * antwoorden test of je goed geraden hebt, en niet of de bedrading klopt. De
 * vorm komt uit `bouwVragenVraag()`:
 *
 *   - Verkoopbegeleiding (label: verkoopbegeleiding): 2 in de fase selecteren, 1 in de fase contact
 */
function leesVragenlijst(user: string): { intent_label: string; fase: string; vraag: string }[] {
  const uit: { intent_label: string; fase: string; vraag: string }[] = [];
  for (const regel of user.split("\n")) {
    const kop = regel.match(/^- (.+) \(label: ([a-z0-9_]+)\): (.+)$/);
    if (!kop) continue;
    const [, naam, label, rest] = kop;
    for (const deel of rest.split(",")) {
      const m = deel.trim().match(/^(\d+) in de fase ([a-z]+)$/);
      if (!m) continue;
      const aantal = Number(m[1]);
      const fase = m[2];
      for (let i = 0; i < aantal; i++) {
        uit.push({
          intent_label: label,
          fase,
          vraag: `Wie kan mij helpen met ${naam.toLowerCase()} in Eindhoven (${fase} ${i + 1})?`,
        });
      }
    }
  }
  return uit;
}

export function createPlainStub(log: StubLog[]) {
  return async (opts: {
    system: string;
    user: string;
    webSearch?: boolean;
  }): Promise<{ text: string; raw: unknown }> => {
    log.push({ schemaName: "plain", user: opts.user });

    // ── De marktmeting van de Sales-module (sprint 3) ────────────────────────
    //
    // Herkend aan de systeemprompt en niet aan de vraagtekst: de vragen worden
    // door een andere stub gegenereerd en zouden dus mee veranderen. De
    // systeemprompt ligt vast in `lib/sales/measure-prompt.ts`.
    //
    // Het antwoord noemt twee bedrijven die in de markt zitten en één die er
    // niet in zit, precies zoals een echt antwoord dat doet.
    if (opts.system.includes("Noem concrete bedrijven of bronnen")) {
      return {
        text:
          "In Eindhoven wordt Van X Makelaars het vaakst genoemd voor dit soort werk. " +
          "Q Makelaars is een goed alternatief, zeker bij kleinere woningen. " +
          "Jansen Makelaardij wordt ook wel genoemd. Zie funda.nl en nvm.nl voor het aanbod.",
        raw: { stub: true },
      };
    }

    if (opts.user.includes("Vergelijk ")) {
      return {
        text:
          "Op het gebied van dienstverlening en kwaliteit zet ik ze in deze volgorde. " +
          "Van één van de genoemde bedrijven weet ik te weinig om er iets over te zeggen. " +
          "Bron: https://trustpilot.com/review/fysi-unique.nl",
        raw: { stub: true },
      };
    }

    if (opts.user.includes("Welke bedrijven raad je aan")) {
      return {
        text:
          "Voor dit soort werk zou ik kijken naar Feenstra, Fysi-Unique en Van Dorp. " +
          "Feenstra is landelijk bekend, Fysi-Unique is sterk in de regio en Van Dorp is een " +
          "grote installateur.",
        raw: { stub: true },
      };
    }

    if (opts.user.includes("Zoek alles wat er online") || opts.user.includes("Zoek beoordelingen") || opts.user.includes("Zoek klachten") || opts.user.includes("Zoek wat er online staat")) {
      return {
        text:
          "Klanten noemen het team deskundig en vriendelijk. Wel wordt de levertijd geregeld als " +
          "nadeel genoemd. Zie https://trustpilot.com/review/fysi-unique.nl en " +
          "https://fysi-unique.nl/over-ons.",
        raw: { stub: true },
      };
    }

    if (opts.user.includes("beoordelingen en reviews")) {
      return {
        text:
          "Op Trustpilot staat een 4,6 op basis van 128 beoordelingen: " +
          "https://trustpilot.com/review/fysi-unique.nl. Daarnaast staat er een vermelding op " +
          "https://vakblad.nl/artikel en op https://fysi-unique.nl/over-ons.",
        raw: { stub: true },
      };
    }

    // ⚠️ De ONGEGRONDE merkvraag geeft URL's terug die het model niet gezien kan
    // hebben, precies zoals op productie gebeurde: bij Van den Udenhout kwam er
    // een verzonnen domein uit een aanroep die niet mocht zoeken. Die adressen
    // horen niet in de bronnentelling, want ze blazen de bewijskracht op met
    // verzinsels.
    if (!opts.webSearch) {
      return {
        text:
          "Fysi-Unique is een fysiotherapiepraktijk. Klanten noemen het team deskundig. " +
          "Zie https://verzonnen-fysi-unique.nl/over-ons en https://ook-verzonnen.nl/praktijk.",
        raw: { stub: true },
      };
    }

    return {
      text:
        "Klanten noemen het team deskundig en vriendelijk. Wel wordt de levertijd geregeld als " +
        "nadeel genoemd. Zie https://trustpilot.com/review/fysi-unique.nl en " +
        "https://fysi-unique.nl/over-ons.",
      raw: { stub: true },
    };
  };
}
