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
    return {
      toon: "overwegend_positief",
      noemt_merk: true,
      grondslag: "reviews",
      pluspunten: ["Klanten noemen de deskundigheid", "De levertijd valt tegen"],
      minpunten: ["De levertijd valt tegen"],
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
        questionIfMissing: null,
        reason: "Een cijfer maakt de pagina geloofwaardig.",
        kind: "verificatie",
        answerType: "tekst_kort",
        options: [],
        suggestedAnswer: null,
        scope: "merk",
      },
      {
        claim: "Fysi-Unique biedt een preventief nazorgprogramma na herstel.",
        neededFor: "Waar kan ik in Amersfoort terecht voor een hardloopblessure?",
        supported: false,
        sourceRef: null,
        supportQuote: null,
        importance: "kern",
        questionIfMissing: "Biedt Fysi-Unique een preventief nazorgprogramma na herstel?",
        reason: "Zonder dit kan de pagina zijn eigen vraag niet beantwoorden.",
        kind: "verificatie",
        answerType: "ja_nee",
        options: [],
        suggestedAnswer: "ja",
        scope: "analyse",
      },
    ],
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

  source_analysis: () => ({ sources: [], whatIsMissing: null }),

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
export function createPlainStub(log: StubLog[]) {
  return async (opts: {
    system: string;
    user: string;
    webSearch?: boolean;
  }): Promise<{ text: string; raw: unknown }> => {
    log.push({ schemaName: "plain", user: opts.user });

    if (opts.user.includes("Vergelijk ")) {
      return {
        text:
          "Op het gebied van dienstverlening en kwaliteit zet ik ze in deze volgorde. " +
          "Van één van de genoemde bedrijven weet ik te weinig om er iets over te zeggen. " +
          "Bron: https://trustpilot.com/review/fysi-unique.nl",
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
