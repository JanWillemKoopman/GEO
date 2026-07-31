/**
 * De deterministische kwaliteitspoort onder de geschreven pagina
 * (implementatieplan.md R8.2, R8.7, R8.8).
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De GEO-beoordeling was tot nu toe een zelfrapportage: dezelfde AI-aanroep die
 * de tekst beoordeelde vulde vijf booleans in over de vraag of die tekst wel
 * citeerbaar is. In de contentronde van 31 juli gaven die vijf booleans op ALLE
 * TIEN de pagina's 100/100 — inclusief de Coolblue-pagina waarvan diezelfde
 * aanroep in `review_notes` schreef: "Het directe antwoord op de hoofdvraag is
 * niet expliciet en concreet genoeg in de eerste twee zinnen." Eén aanroep, twee
 * tegenstrijdige oordelen, en het cijfer koos de gunstige.
 *
 * Dat is dezelfde fout die dit traject al vier keer eerder maakte, nu op de
 * laatste plek waar hij nog zat: een promptinstructie is een intentie, code is
 * een garantie (status-doorontwikkeling.md §2.1). Een model dat zijn eigen werk
 * beoordeelt is geen poort.
 *
 * ── WAT HIER WEL EN NIET KAN ────────────────────────────────────────────────
 *
 * Deze module toetst uitsluitend wat je zonder oordeel kunt vaststellen: staan
 * de woorden van de doelvraag in de opening, is een ja/nee-vraag ook echt met ja
 * of nee beantwoord, wordt er doorverwezen in plaats van geantwoord, staat de
 * merknaam er expliciet, staan er cijfers in, is er een zin die losstaand te
 * citeren valt, en is het onderscheidende antwoord van de klant daadwerkelijk
 * gebruikt.
 *
 * Wat hier NIET kan: beoordelen of een tekst goed geschreven is. Dat blijft aan
 * de redactieronde. De twee vullen elkaar aan — deze poort vangt precies de
 * gevallen waarin het model zichzelf te mild beoordeelt.
 *
 * ── ONBEKEND IS GEEN ONVOLDOENDE ────────────────────────────────────────────
 *
 * Is een controle niet van toepassing (geen doelvraag meegegeven, geen ja/nee-
 * vraag, geen onderscheidend antwoord beschikbaar), dan is de uitkomst `null` en
 * telt hij niet mee in de score. Een pagina afrekenen op een toets die niet
 * uitgevoerd kon worden zou hetzelfde zijn als een verkeerde waarde invullen
 * waar `null` hoort (status-doorontwikkeling.md §2.4).
 *
 * Bewust ZONDER `server-only`: pure tekstanalyse, testbaar in een kaal script —
 * zelfde patroon als factcard.ts, question-share.ts en evidence-format.ts.
 */

/** Hoeveel tekens van de opening als "de eerste twee zinnen" gelden. */
const OPENING_CHARS = 400;

/** Zoveel van de kernwoorden uit de doelvraag moet de opening delen. */
const ECHO_DREMPEL = 0.5;

/**
 * Nederlandse functiewoorden. Bewust ruim: ze mogen de overlap tussen doelvraag
 * en opening niet kunstmatig opkrikken ("de", "van" en "een" komen in élke zin
 * voor en zeggen dus niets over of de vraag beantwoord wordt).
 */
const STOPWOORDEN = new Set([
  "aan", "als", "bij", "dan", "dat", "deze", "die", "dit", "door", "een", "eens", "een",
  "elke", "erg", "het", "hoe", "ick", "iets", "ook", "over", "per", "als", "kan", "kun",
  "kunt", "kunnen", "mag", "met", "moet", "naar", "niet", "nog", "van", "voor", "waar",
  "wat", "welke", "wel", "wie", "wij", "zijn", "zeer", "zo", "hun", "haar", "onze", "ons",
  "the", "and", "for", "you", "jouw", "jullie", "meest", "beste", "goede", "veel", "meer",
  "heeft", "hebben", "biedt", "bieden", "worden", "wordt", "word", "maken", "maakt",
]);

/** Werkwoorden waarmee een gesloten (ja/nee-)vraag begint. */
const JA_NEE_START =
  /^(kan|kun|kunt|kunnen|is|zijn|was|waren|heeft|hebben|heb|biedt|bieden|mag|mogen|doet|doen|klopt|bestaat|zit|zitten|krijg|krijgt|wordt|worden)\b/i;

/** Woorden die een expliciet ja/nee-antwoord vormen. */
const BEVESTIGING = /\b(ja|jazeker|zeker|inderdaad|klopt|nee|neen|helaas niet)\b/i;

/**
 * Formuleringen die de vraag doorschuiven in plaats van hem te beantwoorden.
 *
 * Dit is de enige controle die niet over vorm maar over inhoud gaat, en hij is
 * er omdat de contentronde precies dit gedrag opleverde: de Coolblue-pagina over
 * "kan ik online bestellen en in de winkel afhalen" schreef in de body én in de
 * FAQ "kijk voor de actuele mogelijkheden op coolblue.nl". Dat is geen antwoord;
 * dat is de vraag teruggeven aan de lezer — en een AI-assistent citeert een
 * doorverwijzing niet als antwoord.
 */
const ONTWIJKING = [
  /voor (de )?(actuele|meest actuele|laatste|exacte|precieze) (mogelijkheden|informatie|voorwaarden|prijzen|details)/i,
  /kijk (dan )?(voor .{0,40})?op (de )?(website|site|onze site)/i,
  /raadpleeg (de|onze|je)/i,
  /neem (dan )?contact (met ons )?op voor (meer|de juiste|actuele)/i,
  /informeer (naar|bij)/i,
  /vraag (dit )?na (bij|in)/i,
  /(dit|dat) (kan )?verschill(en|t) per/i,
];

/** Eén uitgevoerde controle. `null` = niet van toepassing, telt niet mee. */
export type CheckUitkomst = boolean | null;

export interface GateChecks {
  /** R8.2 — komen de kernwoorden van de doelvraag terug in de opening? */
  doelvraagInOpening: CheckUitkomst;
  /** R8.2 — is een ja/nee-vraag ook echt met ja of nee beantwoord? */
  directAntwoord: CheckUitkomst;
  /** R8.2 — wordt er doorverwezen in plaats van geantwoord? */
  geenOntwijking: CheckUitkomst;
  /** R8.7 — staat de merknaam expliciet in de opening (niet alleen "wij")? */
  merknaamExpliciet: CheckUitkomst;
  /** R8.7 — bevat de tekst concrete cijfers/bedragen/jaartallen? */
  concreteFeiten: CheckUitkomst;
  /** R8.7 — is er minstens één losstaand citeerbare zin? */
  citeerbareZin: CheckUitkomst;
  /** R8.8 — is het onderscheidende antwoord van de klant echt gebruikt? */
  onderscheidGebruikt: CheckUitkomst;
}

export interface GateResult {
  checks: GateChecks;
  /** Percentage van de UITVOERBARE controles dat geslaagd is. `null` als er niets te toetsen viel. */
  score: number | null;
  /** Concrete verbeterpunten in gewone taal, klaar voor `review_notes`. */
  issues: string[];
}

export interface GateInput {
  bodyMarkdown: string;
  faq: { q: string; a: string }[];
  brandName: string;
  /** De gemiste vragen die deze pagina moet winnen. */
  targetQuestions: string[];
  /**
   * Antwoorden van de klant op 'onderscheid'-vragen: wat kan hij dat een
   * concurrent niet kan. Leeg = niets te toetsen (R8.8 wordt dan `null`).
   */
  distinctiveAnswers: string[];
}

/** Markdown-opmaak eraf, zodat de tekstanalyse over woorden gaat en niet over tekens. */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~>#]/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * De opening: de eerste zinnen die daadwerkelijk iets beweren.
 *
 * Kopregels gaan er eerst uit, en dat is geen detail. De Coolblue-pagina opende
 * met de doelvraag als kop ("### Kan ik een wasmachine online bestellen en hem
 * daarna in de winkel afhalen?"). Zou die meetellen, dan zou elke pagina die
 * zijn eigen vraag als titel herhaalt automatisch slagen op "beantwoordt de
 * doelvraag" — terwijl een vraag herhalen precies het tegenovergestelde van een
 * antwoord is.
 */
export function openingVan(bodyMarkdown: string): string {
  const zonderKoppen = bodyMarkdown
    .split("\n")
    .filter((regel) => !/^\s{0,3}#{1,6}\s/.test(regel))
    .join("\n");
  return stripMarkdown(zonderKoppen).slice(0, OPENING_CHARS);
}

/** Betekenisdragende woorden: kleine letters, geen leestekens, geen functiewoorden. */
function kernwoorden(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWOORDEN.has(w)),
    ),
  );
}

/**
 * Staat dit woord (of een duidelijke variant ervan) in de tekst?
 *
 * Ruwe stam-vergelijking op de eerste zes tekens: "aantekeningen" en
 * "aantekening" horen te matchen, "vergaderlocatie" en "vergaderen" ook. Dat is
 * grover dan een echte stemmer, maar de fout die het maakt (twee verwante
 * woorden als hetzelfde zien) is hier de goedkope kant: hij laat een pagina
 * eerder slagen dan hem onterecht afkeuren.
 */
function bevatWoord(genormaliseerdeTekst: string, woord: string): boolean {
  const stam = woord.slice(0, 6);
  return genormaliseerdeTekst.includes(stam);
}

function normaliseer(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ");
}

/** Zinnen uit een stuk tekst, zonder de vraagzinnen (die beweren niets). */
function bewerendeZinnen(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((z) => z.trim())
    .filter((z) => z.length > 0 && !z.endsWith("?"));
}

/**
 * Toetst één geschreven pagina tegen de deterministische criteria.
 *
 * Elke controle staat los en levert een eigen verbeterpunt op — dat is wat de
 * herschrijfronde kan gebruiken. "De GEO-score is 60" zegt niets; "de doelvraag
 * wordt in de opening niet met ja of nee beantwoord" is een instructie.
 */
export function checkContentGate(input: GateInput): GateResult {
  const { bodyMarkdown, faq, brandName, targetQuestions, distinctiveAnswers } = input;

  const opening = openingVan(bodyMarkdown);
  const openingNorm = normaliseer(opening);
  const heleTekstNorm = normaliseer(stripMarkdown(bodyMarkdown));
  const vragen = targetQuestions.filter((v) => v.trim().length > 0);

  const issues: string[] = [];

  // ── R8.2a — komen de kernwoorden van de doelvraag terug in de opening? ────
  let doelvraagInOpening: CheckUitkomst = null;
  if (vragen.length > 0) {
    // De best scorende doelvraag telt: een pagina die twee vragen moet winnen,
    // hoeft ze niet allebei in de eerste twee zinnen te proppen.
    const dekking = vragen.map((vraag) => {
      const woorden = kernwoorden(vraag);
      if (woorden.length === 0) return 1;
      const gevonden = woorden.filter((w) => bevatWoord(openingNorm, w)).length;
      return gevonden / woorden.length;
    });
    doelvraagInOpening = Math.max(...dekking) >= ECHO_DREMPEL;
    if (!doelvraagInOpening) {
      issues.push(
        "De opening gaat niet duidelijk over de vraag die deze pagina moet winnen. " +
          `Beantwoord "${vragen[0]}" in de eerste twee zinnen, in de woorden van de vraag zelf.`,
      );
    }
  }

  // ── R8.2b — is een gesloten vraag ook echt met ja of nee beantwoord? ──────
  const geslotenVraag = vragen.find((v) => JA_NEE_START.test(v.trim()));
  let directAntwoord: CheckUitkomst = null;
  if (geslotenVraag) {
    const openingsZinnen = bewerendeZinnen(opening).slice(0, 3).join(" ");
    // Ofwel een letterlijk ja/nee, ofwel het werkwoord van de vraag komt
    // bevestigend terug ("Kan ik … bestellen?" → "Je kunt … bestellen").
    const werkwoord = (geslotenVraag.trim().match(JA_NEE_START)?.[0] ?? "").toLowerCase();
    const werkwoordTerug =
      werkwoord.length > 0 && bevatWoord(normaliseer(openingsZinnen), werkwoord.slice(0, 3));
    directAntwoord = BEVESTIGING.test(openingsZinnen) || werkwoordTerug;
    if (!directAntwoord) {
      issues.push(
        `"${geslotenVraag}" is een ja/nee-vraag. Begin de pagina met een expliciet ` +
          "ja of nee — een AI-assistent citeert geen antwoord dat hij zelf moet afleiden.",
      );
    }
  }

  // ── R8.2c — wordt er doorverwezen in plaats van geantwoord? ───────────────
  //
  // Naast de opening ook de FAQ-antwoorden die bij een doelvraag horen: daar
  // stond de Coolblue-ontwijking, en juist het FAQ-blok is wat een AI-assistent
  // als kant-en-klaar antwoordpaar oppikt.
  const relevanteFaq = faq.filter((item) =>
    vragen.some((vraag) => {
      const woorden = kernwoorden(vraag);
      if (woorden.length === 0) return false;
      const q = normaliseer(item.q);
      return woorden.filter((w) => bevatWoord(q, w)).length / woorden.length >= ECHO_DREMPEL;
    }),
  );
  const teToetsenOpOntwijking = [opening, ...relevanteFaq.map((f) => f.a)].join("\n");
  const ontwijking = ONTWIJKING.find((p) => p.test(teToetsenOpOntwijking));
  const geenOntwijking: CheckUitkomst = !ontwijking;
  if (ontwijking) {
    issues.push(
      "De pagina verwijst voor het antwoord door naar de website of naar contact opnemen, " +
        "in plaats van de vraag zelf te beantwoorden. Schrijf op wat er wél geldt, of laat " +
        "de passage weg als het feit ontbreekt.",
    );
  }

  // ── R8.7a — staat de merknaam expliciet in de opening? ────────────────────
  let merknaamExpliciet: CheckUitkomst = null;
  if (brandName.trim().length > 0) {
    merknaamExpliciet = normaliseer(opening).includes(normaliseer(brandName).trim());
    if (!merknaamExpliciet) {
      issues.push(
        `Noem "${brandName}" expliciet in de eerste zinnen. Een model dat "wij" leest, ` +
          "weet niet wie het aan moet bevelen.",
      );
    }
  }

  // ── R8.7b — staan er concrete cijfers in? ─────────────────────────────────
  const concreteFeiten: CheckUitkomst = /\d/.test(stripMarkdown(bodyMarkdown));
  if (!concreteFeiten) {
    issues.push(
      "De pagina bevat geen enkel getal, bedrag of jaartal. Zonder concreet feit is er " +
        "niets te citeren dat deze pagina van elke andere onderscheidt.",
    );
  }

  // ── R8.7c — is er minstens één losstaand citeerbare zin? ──────────────────
  //
  // Losstaand citeerbaar = de zin noemt het bedrijf bij naam en begint niet met
  // een verwijzing naar de vorige zin. Dat is de eenheid waarin een
  // AI-assistent knipt: wie "Dat doen zij ook voor grotere groepen" citeert,
  // citeert iets onbruikbaars.
  const merkNorm = normaliseer(brandName).trim();
  const citeerbareZin: CheckUitkomst =
    merkNorm.length === 0
      ? null
      : bewerendeZinnen(stripMarkdown(bodyMarkdown)).some(
          (zin) =>
            normaliseer(zin).includes(merkNorm) &&
            !/^\s*(dat|dit|die|deze|hij|zij|ze|het|hierdoor|daarmee|daarnaast|ook|bovendien)\b/i.test(
              zin,
            ),
        );
  if (citeerbareZin === false) {
    issues.push(
      "Er is geen zin die op zichzelf te citeren valt. Zorg dat minstens één zin per sectie " +
        `"${brandName}" noemt en zonder de rest van de pagina te begrijpen is.`,
    );
  }

  // ── R8.8 — is het onderscheidende antwoord van de klant echt gebruikt? ────
  //
  // De briefing vraagt expliciet naar onderscheid (contentbriefing.md §5,
  // vraagsoort 3) — de enige informatie die principieel niet uit een crawl te
  // halen is. Tot nu toe controleerde niets of dat antwoord ook in de tekst
  // belandde. In de contentronde bevatte geen van de tien pagina's iets dat een
  // concurrent niet had kunnen schrijven.
  const bruikbaar = distinctiveAnswers.map((a) => kernwoorden(a)).filter((w) => w.length >= 2);
  let onderscheidGebruikt: CheckUitkomst = null;
  if (bruikbaar.length > 0) {
    onderscheidGebruikt = bruikbaar.some((woorden) => {
      const gevonden = woorden.filter((w) => bevatWoord(heleTekstNorm, w)).length;
      return gevonden / woorden.length >= ECHO_DREMPEL;
    });
    if (!onderscheidGebruikt) {
      issues.push(
        "Wat de klant als onderscheidend heeft opgegeven, komt niet terug in de tekst. " +
          "Juist dat is het enige dat een concurrent niet kan overschrijven — verwerk het.",
      );
    }
  }

  const checks: GateChecks = {
    doelvraagInOpening,
    directAntwoord,
    geenOntwijking,
    merknaamExpliciet,
    concreteFeiten,
    citeerbareZin,
    onderscheidGebruikt,
  };

  const uitvoerbaar = Object.values(checks).filter((v): v is boolean => v !== null);
  const score =
    uitvoerbaar.length === 0
      ? null
      : Math.round((uitvoerbaar.filter(Boolean).length / uitvoerbaar.length) * 100);

  return { checks, score, issues };
}

// ── Weergave voor de klant ──────────────────────────────────────────────────

/** Wat elke controle betekent, in de taal van de klant — geen jargon. */
export const GATE_LABELS: Record<keyof GateChecks, string> = {
  doelvraagInOpening: "gaat meteen over de vraag die je wilt winnen",
  directAntwoord: "geeft direct antwoord op een ja/nee-vraag",
  geenOntwijking: "beantwoordt de vraag zelf, zonder door te verwijzen",
  merknaamExpliciet: "noemt je bedrijf expliciet bij naam",
  concreteFeiten: "gebruikt concrete cijfers of feiten",
  citeerbareZin: "bevat losstaand citeerbare zinnen",
  onderscheidGebruikt: "gebruikt wat jou onderscheidt van de rest",
};

/** Waaróm het uitmaakt. Alleen getoond bij een controle die niet geslaagd is. */
export const GATE_UITLEG: Record<keyof GateChecks, string> = {
  doelvraagInOpening:
    "Een AI die een antwoord zoekt, leest de inleiding niet uit. Staat het antwoord pas in alinea drie, dan wordt het niet gevonden.",
  directAntwoord:
    "Op een ja/nee-vraag verwacht een AI-assistent een ja of een nee. Een antwoord dat hij zelf moet afleiden, citeert hij niet.",
  geenOntwijking:
    "\"Kijk voor de actuele mogelijkheden op onze site\" is geen antwoord maar een doorverwijzing — en die wordt nooit aangehaald.",
  merknaamExpliciet:
    "Een model dat 'wij leveren binnen 24 uur' leest, weet niet wie 'wij' is — en noemt je dus niet in het antwoord.",
  concreteFeiten:
    "Cijfers, jaartallen en termijnen zijn wat een AI aanhaalt. Algemene beloftes worden overgeslagen.",
  citeerbareZin:
    "AI-assistenten knippen zinnen uit een pagina. Een zin die alleen klopt als je de rest gelezen hebt, is onbruikbaar om te citeren.",
  onderscheidGebruikt:
    "Wat je in de briefing als onderscheidend opgaf, is het enige dat een concurrent niet kan overschrijven. Staat het er niet in, dan had elke concurrent deze pagina kunnen publiceren.",
};

/** Eén regel op de scorekaart. `ok: null` = niet van toepassing, geen onvoldoende. */
export interface GeoRegel {
  label: string;
  uitleg: string;
  ok: boolean | null;
}

/**
 * `content_pieces.geo_json` omzetten naar wat de klant te zien krijgt.
 *
 * Kent twee vormen, en dat is bewust: pagina's van vóór R8.7 hebben de kale
 * zelfrapportage van het model in dit veld staan (vijf booleans), daarna staat
 * er `{zelfrapportage, deterministisch}`. Een oude pagina mag niet ineens leeg
 * of fout renderen omdat het formaat veranderd is — dus lezen we allebei.
 */
export function geoRegels(raw: unknown): GeoRegel[] {
  const value = (raw ?? {}) as Record<string, unknown>;

  const deterministisch = value.deterministisch as Partial<GateChecks> | undefined;
  if (deterministisch && typeof deterministisch === "object") {
    return (Object.keys(GATE_LABELS) as (keyof GateChecks)[]).map((key) => ({
      label: GATE_LABELS[key],
      uitleg: GATE_UITLEG[key],
      ok: (deterministisch[key] ?? null) as boolean | null,
    }));
  }

  // Terugval: de oude zelfrapportage-vorm.
  return LEGACY_GEO_LABELS.map(({ key, label, uitleg }) => ({
    label,
    uitleg,
    ok: typeof value[key] === "boolean" ? (value[key] as boolean) : null,
  }));
}

/** De vijf zelfbeoordeelde criteria van vóór R8.7, voor bestaande pagina's. */
const LEGACY_GEO_LABELS: { key: string; label: string; uitleg: string }[] = [
  {
    key: "answersTargetQuestionUpFront",
    label: "beantwoordt de doelvraag meteen",
    uitleg: GATE_UITLEG.doelvraagInOpening,
  },
  {
    key: "hasStandaloneCitableSentences",
    label: "bevat losstaand citeerbare zinnen",
    uitleg: GATE_UITLEG.citeerbareZin,
  },
  {
    key: "namesTheBusinessExplicitly",
    label: "noemt het bedrijf expliciet",
    uitleg: GATE_UITLEG.merknaamExpliciet,
  },
  { key: "usesConcreteFacts", label: "gebruikt concrete feiten", uitleg: GATE_UITLEG.concreteFeiten },
  {
    key: "answersFollowUpQuestions",
    label: "beantwoordt vervolgvragen",
    uitleg:
      "Wie de hoofdvraag én de vervolgvragen beantwoordt, wordt bij meer verschillende vragen genoemd.",
  },
];
