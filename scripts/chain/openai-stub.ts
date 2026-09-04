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

/**
 * De feitenkaart uit de prompt teruglezen.
 *
 * Een echt model leest de kaart die het krijgt en verwijst naar de nummers die
 * daar staan. Een stub met hardgecodeerde F-nummers doet dat niet, en dan test je
 * of je die nummers goed geraden hebt in plaats van of de dekkingscontrole werkt.
 *
 * Dat is geen theorie: de eerste versie van deze stub noemde "F1, F2", terwijl de
 * kaart in het scenario inmiddels bij F5 en F6 zat omdat de klantantwoorden
 * vooraan komen te staan (`SOURCE_ORDER`). De test viel daarop om, terecht.
 *
 * De vorm komt uit `formatFactCard()`: `${ref}  ${text}` opgevuld tot 60 tekens,
 * gevolgd door `bron: …`.
 */
function leesFeitenkaart(user: string): { ref: string; text: string }[] {
  const feiten: { ref: string; text: string }[] = [];
  for (const regel of user.split("\n")) {
    const m = /^(F\d+)\s\s+(.*?)\s*bron:\s/.exec(regel);
    if (m) feiten.push({ ref: m[1], text: m[2].trim() });
  }
  return feiten;
}

/** De eerste paar woorden van een feit, het letterlijke citaat dat de claim dekt. */
function citaatUit(tekst: string, woorden = 6): string {
  return tekst.split(/\s+/).slice(0, woorden).join(" ");
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
   * De atomiseerstap (S1). Geeft één zin terug die letterlijk in de gecrawlde
   * pagina van het scenario staat, plus één die er NIET in staat, zodat de
   * test aantoont dat het vangnet in `atom-verify.ts` de tweede weggooit.
   */
  fact_atoms: () => ({
    atoms: [
      {
        sentence: "Fysi-Unique behandelt hardloopblessures zoals runnersknie en shin splints.",
        pageIndex: 1,
      },
      { sentence: "Fysi-Unique is de beste praktijk van Nederland.", pageIndex: 1 },
    ],
  }),

  /**
   * De claim-audit (R5.1). Twee beweringen: één gedekt door een proof point, één
   * ongedekt. Die laatste wordt de vraag aan de klant, en beide horen straks in
   * het paginaplan te staan (S2).
   */
  claim_audit: () => ({
    claims: [
      {
        claim: "Fysi-Unique wordt met een 9,4 beoordeeld op Zorgkaart.",
        neededFor: "Waar kan ik in Amersfoort terecht voor een hardloopblessure?",
        supported: true,
        sourceRef: "F1",
        supportQuote: "Wordt met een 9,4 beoordeeld op Zorgkaart",
        importance: "ondersteunend",
        // Migratie 0091: welk SOORT bewering dit is. Bedrijfsspecifiek, dus er
        // hoort bewijs van de klant achter te zitten.
        claimClass: "bedrijfsspecifiek",
        questionIfMissing: null,
        reason: "Een cijfer maakt de pagina geloofwaardig.",
        kind: "verificatie",
        answerType: "tekst_kort",
        options: [],
        suggestedAnswer: null,
        scope: "merk",
        sectionId: null,
      },
      {
        claim: "Fysi-Unique biedt een preventief nazorgprogramma na herstel.",
        neededFor: "Waar kan ik in Amersfoort terecht voor een hardloopblessure?",
        supported: false,
        sourceRef: null,
        supportQuote: null,
        importance: "kern",
        claimClass: "bedrijfsspecifiek",
        questionIfMissing: "Biedt Fysi-Unique een preventief nazorgprogramma na herstel?",
        reason: "Zonder dit kan de pagina zijn eigen vraag niet beantwoorden.",
        kind: "verificatie",
        answerType: "ja_nee",
        options: [],
        suggestedAnswer: "ja",
        scope: "analyse",
        // De sectie waar deze vraag bij hoort (migratie 0087). "P1-s2" is de
        // tweede sectie van de eerste pagina van de batch, en dat is precies
        // wat het contract van de stub hieronder ook aanlevert. Zonder deze
        // koppeling valt de vraag terug op de tekstvergelijking met
        // `neededFor`, en dan raakt overslaan geen enkele sectie.
        sectionId: "P1-s2",
      },
    ],
    // Leeg is de norm (S9): dit testgeval noemt geen term die algemene,
    // niet-bedrijfsspecifieke uitleg nodig heeft.
    generalContextGaps: [],
  }),

  /**
   * De geschreven pagina. Drie dingen zijn met opzet zo gekozen:
   *
   *   • de eerste bewering krijgt een SAMENGESTELDE verwijzing ("F1, F2"), de
   *     vorm die vóór R8.3 als onbewezen telde en 2 van de 10 pagina's van
   *     31 juli vertekende;
   *   • de tweede verwijst naar één feit, als controlegroep;
   *   • de derde zin in de body ("binnen 24 uur") wordt NIET getagd. Dat is de
   *     categorie waarin beide fabricages van de contentronde vielen, en S3 moet
   *     hem alsnog opmerken.
   */
  content_piece: (user: string) => {
    const kaart = leesFeitenkaart(user);
    if (kaart.length < 2) {
      throw new Error(
        `openai-stub: de feitenkaart in de schrijfprompt heeft ${kaart.length} feiten; ` +
          `er zijn er minstens 2 nodig om een samengestelde verwijzing te maken.`,
      );
    }

    // De twee feiten waar de beweringen naar wijzen. Bewust de LAATSTE twee:
    // dat zijn in dit scenario het proof point en de geatomiseerde sitezin, en
    // door ze op te zoeken in plaats van te nummeren blijft de stub kloppen als
    // er een feit bij komt.
    const eerste = kaart[kaart.length - 2];
    const tweede = kaart[kaart.length - 1];

    const zin1 = "Fysi-Unique behandelt hardloopblessures in Amersfoort en werkt met een vast team.";
    const zin2 = "Fysi-Unique behandelt hardloopblessures zoals runnersknie en shin splints.";

    return {
      title: "Fysiotherapie bij hardloopblessures in Amersfoort",
      metaTitle: "Hardloopblessure in Amersfoort",
      metaDescription: "Fysi-Unique behandelt hardloopblessures in Amersfoort.",
      bodyMarkdown:
        `${zin1}\n\n### Welke klachten\n\n${zin2}\n\n### Afspraak maken\n\n` +
        "Bij Fysi-Unique kun je binnen 24 uur terecht voor een intake.\n",
      faq: [{ q: "Heb ik een verwijzing nodig?", a: "Nee, je kunt direct een afspraak maken." }],
      schemaJsonLd: '{"@context":"https://schema.org","@type":"WebPage"}',
      targetIntent: "Waar kan ik in Amersfoort terecht voor een hardloopblessure?",
      cluster: "hardloopblessure",
      // V9 (migratie 0093): per gekozen feit wat het voor de lezer betekent.
      // De betekeniszinnen staan hierboven ook echt in `bodyMarkdown`, want de
      // controle rekent dat na.
      proofPoints: [
        // `relevantie` is de derde stap van optimalisatie 7 (4 september 2026):
        // feit, betekenis, en waarom dat voor DEZE lezer telt.
        { factRef: eerste.ref, betekenis: zin1, relevantie: "deze lezer wil weten waar hij aan toe is" },
        { factRef: tweede.ref, betekenis: zin2, relevantie: "hij wil snel verder kunnen met hardlopen" },
        {
          factRef: tweede.ref,
          betekenis: "Bij Fysi-Unique kun je binnen 24 uur terecht voor een intake",
          relevantie: "wachten is precies waar deze lezer bang voor is",
        },
      ],
      claims: [
        {
          claim: zin1,
          factRef: `${eerste.ref}, ${tweede.ref}`,
          quote: citaatUit(eerste.text),
        },
        { claim: zin2, factRef: tweede.ref, quote: citaatUit(tweede.text) },
      ],
    };
  },

  content_critique: () => ({
    qualityScore: 88,
    followsRules: true,
    geo: {
      answersTargetQuestionUpFront: true,
      hasStandaloneCitableSentences: true,
      namesTheBusinessExplicitly: true,
      usesConcreteFacts: true,
      answersFollowUpQuestions: true,
    },
    issues: [],
  }),

  /**
   * De vierde beoordelaar: vakmanschap (migratie 0091).
   *
   * Bewust ruim voldoende en niet perfect: de keten moet kunnen aantonen dat een
   * pagina die op alle vier de beoordelaars goed scoort tóch geblokkeerd wordt
   * zodra een KERNsectie geen bewijs heeft. Zou deze stub laag scoren, dan zou
   * die blokkade ook uit de score kunnen komen en bewijst de test niets.
   */
  content_craft: () => ({
    specificiteit: {
      score: 78,
      evidence: "Bij Fysi-Unique kun je binnen 24 uur terecht voor een intake.",
      why: "De pagina noemt het bedrijf met naam en geeft een concrete termijn.",
    },
    expertise: {
      score: 74,
      evidence: "Welke klachten",
      why: "De uitleg is correct maar niet uitgebreid.",
    },
    diepgang: { score: 70, evidence: "Welke klachten", why: "Twee secties, beide kort." },
    originaliteit: {
      score: 72,
      evidence: "Afspraak maken",
      why: "Geen standaardzinnen, wel een gangbare opzet.",
    },
    toon: { score: 80, evidence: "Afspraak maken", why: "Past bij de stijlvoorbeelden." },
    // V11: het cijfer bestaat en telt nog niet mee in het profiel.
    herkenning: {
      score: 55,
      evidence: "Bij Fysi-Unique kun je binnen 24 uur terecht voor een intake.",
      why: "De pagina begint bij het aanbod en niet bij wat de lezer meemaakt.",
    },
    overtuiging: {
      score: 68,
      evidence: "Afspraak maken",
      why: "Er staat een vervolgstap in, zonder aandrang.",
    },
    wouldSendToClient: true,
    firstThingToChange: "",
    firstThingSection: "",
  }),

  source_analysis: () => ({ sources: [], whatIsMissing: null }),

  /**
   * Het vergelijkende oordeel tussen twee versies (optimalisatie 11).
   *
   * Kiest B, de gerepareerde versie: dat is het pad waarin de reparatie bewaard
   * wordt, en dus het pad dat de keten moet kunnen laten zien. Draait alleen bij
   * een gelijkspel, dus deze stub wordt niet in elke ronde aangeroepen.
   */
  version_compare: () => ({
    beter: "B",
    waarom: "De gerepareerde versie beantwoordt de vraag concreter en blijft even zorgvuldig.",
  }),

  /**
   * De schrijfopdracht (optimalisatie 5 en 6, migratie 0094).
   *
   * De F-nummers worden uit de feitenkaart in de prompt gelezen, net als bij
   * `content_piece`: een stub met hardgecodeerde nummers zou testen of we goed
   * geraden hebben in plaats van of de opdracht bij de kaart past. Levert de
   * kaart te weinig feiten, dan blijft de lijst korter dan drie en levert
   * `bruikbareOpdracht()` terecht `null`: ook dat pad hoort de keten te kunnen
   * laten zien.
   */
  writer_brief: (user: string) => {
    const kaart = leesFeitenkaart(user);
    return {
      lezer: "Iemand die na het hardlopen pijn aan de buitenkant van zijn knie houdt",
      hoofdvraag: "Kan ik hiermee doorlopen of moet ik langskomen?",
      kernantwoord: "Kom langs voor een intake, dan weet je binnen een week waar je aan toe bent.",
      waaromDezePagina: "Een AI-assistent noemt bij deze vraag nu alleen andere praktijken.",
      // ⚠️ Met OPZET in het formaat dat het echte model op 4 september 2026
      // teruggaf: het hele feit in plaats van alleen het nummer, en een
      // samengestelde verwijzing bij de keuzereden. De eerste versie van deze
      // stub gaf keurige F-nummers terug en dekte daarmee de fout toe die alle
      // zes de opdrachten van de eerste echte ronde weggooide.
      kernfeiten: kaart.slice(0, 3).map((f) => `${f.ref}: ${f.text}`),
      keuzeredenen: [
        {
          factRef: kaart.length > 1 ? `${kaart[0].ref} en ${kaart[1].ref}` : (kaart[0]?.ref ?? ""),
          reden: "deze lezer wil snel duidelijkheid en kan daarom binnen 24 uur terecht",
        },
      ],
      eigenWoorden: "",
      moetErIn: ["wat de intake kost"],
      nietDoen: ["geen checklist om fysiotherapeuten te vergelijken"],
      blijftHangen: "deze praktijk begrijpt mijn klacht en ik kan er snel terecht",
    };
  },

  /**
   * Het itemdossier (A1, migratie 0082).
   *
   * Eén uitleg mét bron, en die bron is met opzet onbereikbaar in de ketentest:
   * `verifyExplainers()` haalt hem op en keurt hem af, dus de keten toetst
   * precies wat hij moet toetsen, namelijk dat niet-geverifieerde uitleg de
   * schrijfprompt NIET haalt (A7). Uitleg die wél door de controle komt, is
   * werk voor een test met een echte bron.
   */
  item_dossier: () => ({
    subQuestions: [
      { question: "Wat kost een behandeling?", why: "dit is de eerste vraag die iedereen stelt" },
      { question: "Heb ik een verwijzing nodig?", why: "onzekerheid houdt mensen tegen" },
    ],
    followUps: ["Hoe lang duurt het herstel?"],
    concerns: ["Ik weet niet of het vergoed wordt."],
    explainers: [
      {
        term: "runnersknie",
        explanation: "Pijn aan de buitenkant van de knie door overbelasting bij hardlopen.",
        sourceUrl: "https://voorbeeld.test/runnersknie",
        quote: "Runnersknie is pijn aan de buitenkant van de knie door overbelasting.",
      },
    ],
  }),

  /**
   * Het contentcontract (A2). De koppen komen letterlijk overeen met wat
   * `content_piece` hierboven schrijft, zodat de dekkingspoort in de keten een
   * echte uitslag geeft in plaats van alles af te keuren op een stub die zichzelf
   * tegenspreekt.
   */
  content_contract: () => ({
    openingAnswer:
      "Fysi-Unique behandelt hardloopblessures in Amersfoort en werkt met een vast team.",
    sections: [
      {
        id: "s1",
        heading: "Welke klachten",
        subQuestion: "Welke hardloopblessures behandelt Fysi-Unique?",
        mustCover: ["de klachten die behandeld worden"],
        factRefs: ["F1"],
        explainerTerms: [],
        targetWords: 120,
        rol: "uitleg",
        // Gedekt: er staat een F-nummer bij dat op de kaart bestaat, dus deze
        // sectie levert geen vraag op.
        needsBrandFact: true,
        // Migratie 0091: ondersteunend, dus een ontbrekend feit hier is een
        // verbeterpunt en geen blokkade. Zie lib/pipeline/evidence-weight.ts.
        importance: "ondersteunend",
        successCriterion: "Er staat welke blessures behandeld worden.",
        // O4: bij een NIEUWE pagina is er geen bestaande pagina om tegen af te
        // zetten. `normaliseerContract()` dwingt dit deterministisch af, maar de
        // stub hoort te leveren wat het schema vraagt (zie de kop van dit
        // bestand: een stub die stilletjes van het schema afwijkt verbergt
        // precies de fout die de keten moet vinden).
        presentOnExisting: "niet_van_toepassing",
        whatToChange: "",
      },
      {
        id: "s2",
        heading: "Afspraak maken",
        subQuestion: "Hoe snel kan ik terecht voor een intake?",
        mustCover: ["hoe je een afspraak maakt"],
        factRefs: [],
        explainerTerms: [],
        targetWords: 100,
        rol: "uitleg",
        // ONGEDEKT en merkgebonden: dit is het gat waar de briefing zijn vraag
        // uit haalt, en de sectie die vervalt als de klant hem overslaat
        // (docs/tasks/vragen-voor-het-schrijven.md §4 en §6).
        needsBrandFact: true,
        // KERN en ongedekt: dit is precies het geval uit punt 15 van de
        // opdracht. De pagina kan hoog scoren en toch niet publiceerbaar zijn,
        // want zonder dit feit bereikt hij zijn doel niet.
        importance: "kern",
        successCriterion: "Er staat een concrete termijn voor de intake.",
        presentOnExisting: "niet_van_toepassing",
        whatToChange: "",
      },
    ],
    faqQuestions: ["Heb ik een verwijzing nodig?"],
    pageObjective: "Iemand met een hardloopblessure in Amersfoort laten zien waar hij terechtkan.",
    targetAudience: "Een hardloper met een blessure die een fysiotherapeut zoekt.",
    avoid: [],
    reasoning: "Twee deelvragen, plus de vraag over de verwijzing als FAQ.",
  }),

  /** De feitelijkheidsbeoordelaar (A5): in de keten vindt hij niets. */
  content_factuality: () => ({
    unsupportedSentences: [],
    overreachingClaims: [],
    allClaimsCovered: true,
  }),

  /** De citeerbaarheidsbeoordelaar (A5): idem, alles beantwoord. */
  content_citability: () => ({
    subQuestionAnswers: [],
    remainingReaderQuestions: [],
    issues: [],
  }),

  /**
   * De gerichte reparatie (A6).
   *
   * Geeft één sectie terug met de kop die `content_piece` ook gebruikt, zodat de
   * keten toetst wat de bedoeling is: `applySectionPatch()` zet hem op zijn
   * plek en laat de rest van de pagina letterlijk staan.
   */
  content_patch: () => ({
    sections: [
      {
        heading: "Afspraak maken",
        markdown:
          "Bij Fysi-Unique kun je binnen 24 uur terecht voor een intake. Bel of mail voor een afspraak.",
      },
    ],
    faq: [{ q: "Heb ik een verwijzing nodig?", a: "Nee, je kunt direct een afspraak maken." }],
    claims: [],
    metaTitle: "Hardloopblessure in Amersfoort",
    metaDescription: "Fysi-Unique behandelt hardloopblessures in Amersfoort.",
    notes: ["De sectie over de afspraak is aangevuld."],
  }),

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
 * Dezelfde reden als bij `leesFeitenkaart` hierboven: een stub met vaste
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
