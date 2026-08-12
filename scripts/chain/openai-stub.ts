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
};
