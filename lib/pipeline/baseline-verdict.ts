/**
 * Klopt wat een AI-assistent over dit merk zegt?
 * (docs/tasks/onboarding-2.0.md, blok B fase 3, blok B)
 *
 * ── WAAROM DIT IN CODE GEBEURT EN NIET IN EEN PROMPT ────────────────────────
 *
 * De verleiding is om het model te vragen "klopt jouw antwoord?". Dat is in dit
 * project drie keer geprobeerd en drie keer misgegaan: `content-gate.ts` (de
 * vijf zelfbeoordeelde GEO-booleans gaven 100/100 op tien pagina's, óók op de
 * pagina waarvan dezelfde call in zijn eigen verbeterpunten schreef dat de
 * hoofdvraag niet beantwoord werd), `validate-claims.ts` en `isSupported()`.
 *
 * Hier is het bezwaar nog sterker: we meten juist of het model het bij het
 * verkeerde eind heeft. Datzelfde model laten oordelen of het klopt, is de
 * meting aan de gemetene vragen.
 *
 * Dus: het antwoord is vrije tekst, en deze module legt hem naast de feiten die
 * fase 0 LETTERLIJK uit de website heeft gelezen. Puur, dus testbaar
 * (conventie 2).
 *
 * ── DRIE UITKOMSTEN, EN "ONBEKEND" IS ER ÉÉN VAN ────────────────────────────
 *
 * `bevestigd` · `tegengesproken` · `niet_genoemd`. Die derde is geen gebrek maar
 * een echt antwoord (conventie 3): dat ChatGPT je openingstijden niet noemt, is
 * iets anders dan dat hij ze fout heeft.
 *
 * `tegengesproken` wordt alleen gemeld waar het STRUCTUREEL vast te stellen is,
 * een ander telefoonnummer, een ander jaartal, een andere postcode, een ander
 * domein. Bij vrije tekst ("wat voor bedrijf is dit") kan deze module het
 * verschil tussen "anders geformuleerd" en "onjuist" niet zien, en dan is
 * zwijgen beter dan een beschuldiging.
 */
import { textContainsName } from "@/lib/entities/normalize";

export type FactVerdict = "bevestigd" | "tegengesproken" | "niet_genoemd";

export interface KnownFact {
  /** 'telefoon', 'adres', 'opgericht', 'naam', …, de sleutel uit fase 0. */
  key: string;
  value: string;
  /** Uit welk schema-type het feit komt ('Organization', 'WebPage', …). */
  fromType?: string;
}

/**
 * Schema-typen die iets over de PAGINA zeggen en niets over het bedrijf. Hun
 * `name` is de paginatitel, "Tarieven | Fysi-Unique", en die als feit
 * controleren levert alleen ruis op.
 */
const PAGE_LEVEL_TYPES = new Set([
  "WebPage",
  "Article",
  "BlogPosting",
  "ImageObject",
  "OpenGraph",
  "BreadcrumbList",
  "CollectionPage",
  "ItemPage",
]);

/**
 * Welke geoogste feiten zich lenen voor een kennistest, en welke niet.
 *
 * ── WAAROM DIT EEN EIGEN FUNCTIE IS, EN GEEN FILTER TER PLEKKE ──────────────
 *
 * Bij Fysi-Unique (3 aug 2026) gingen er 19 feiten de controle in. Zeventien
 * daarvan waren paginatitels uit `WebPage`-opmaak ("Vacature: Algemeen
 * Fysiotherapeut - Fysi-Unique"), en de twee die als `bevestigd` uit de bus
 * kwamen waren de merknaam zelf. Die staat in het antwoord omdat hij in de
 * VRAAG staat, een controle die niet kán mislukken meet niets, en telde hier
 * wél mee als bewijs dat het model het merk kent.
 *
 * Twee regels dus, allebei deterministisch:
 *   1. Weg met paginaniveau-opmaak: alleen feiten over de ENTITEIT tellen.
 *   2. Weg met de merknaam en zijn aliassen: circulair bewijs.
 *
 * Blijft er niets over, dan is dat een echt antwoord (conventie 3): deze site
 * zet geen adres, telefoonnummer of oprichtingsjaar in zijn opmaak, en dan valt
 * er niets na te rekenen.
 */
export function checkableFacts(
  facts: KnownFact[],
  brandNames: string[],
): KnownFact[] {
  const eigen = new Set(
    brandNames.filter(Boolean).map((n) => normalize(n)).filter((n) => n !== ""),
  );

  return facts.filter((f) => {
    if (f.fromType && PAGE_LEVEL_TYPES.has(f.fromType)) return false;
    if (f.key === "naam" || f.key === "naam_opengraph") {
      return !eigen.has(normalize(f.value));
    }
    return true;
  });
}

export interface FactCheck {
  key: string;
  expected: string;
  verdict: FactVerdict;
  /** Wat het model in plaats daarvan zei. Alleen bij `tegengesproken`. */
  found: string | null;
}

export interface BaselineVerdict {
  /** Weet het model iets substantieels over dit merk? */
  knowsBrand: boolean;
  /** Zegt het model met zoveel woorden dat het dit merk niet kent? */
  admitsUnknown: boolean;
  checks: FactCheck[];
  confirmed: number;
  contradicted: number;
  notMentioned: number;
}

/** Losse leestekens en dubbele spaties weg, alles klein. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Alleen de cijfers, voor telefoonnummers, die op tien manieren geschreven worden. */
function digitsOnly(s: string): string {
  return s.replace(/\D+/g, "");
}

/**
 * Zinnen waarmee een model toegeeft het merk niet te kennen. Bewust een korte,
 * expliciete lijst: elke "voorzichtige" formulering meetellen zou elk genuanceerd
 * antwoord als onbekend markeren, en juist de nuance is wat een goed antwoord
 * onderscheidt van een verzonnen antwoord.
 *
 * ⚠️ DE TWEEDE GROEP GAAT OVER IDENTITEIT, NIET OVER DETAILS (3 aug 2026)
 *
 * Bij Fysi-Unique antwoordde het model op béíde `kent`-vragen "zonder plaatsnaam
 * of website kan ik niet met zekerheid zeggen WELKE ORGANISATIE je bedoelt" en
 * "ik weet niet zeker welke organisatie je bedoelt: er zijn mogelijk MEERDERE
 * BEDRIJVEN MET DE NAAM Fysi-Unique". Geen van de zinnen hierboven kwam daarin
 * voor, dus `admitsUnknown` gaf false, dus `knowsBrand` gaf true, enkel omdat de
 * merknaam in het antwoord stond, en die stond er omdat hij in de VRAAG stond.
 * Het profielscherm meldde "ChatGPT kent Fysi-Unique" en de synthese schreef het
 * over als "ChatGPT kent het bedrijf al".
 *
 * De eerste reparatie voegde óók losse fragmenten toe, "niet met zekerheid",
 * "ik weet niet zeker". Die zijn er dezelfde dag weer uit gehaald, want de
 * hermeting liet zien dat ze te veel vangen. Toen het werkgebied eenmaal in de
 * vraag zat, antwoordde het model: *"Fysi-Unique in Amersfoort is een
 * fysiotherapiepraktijk. (…) Ik kan zonder actuele website-informatie niet met
 * zekerheid zeggen welke SPECIALISATIES zij momenteel aanbieden."* Dat is een
 * model dat het merk wél kent en alleen de details niet, en dat werd zo als
 * "kent Fysi-Unique niet" gemeld. Vals negatief in plaats van vals positief.
 *
 * De grens ligt dus bij IDENTITEIT: "ik weet niet wélk bedrijf je bedoelt" is het
 * tegendeel van kennen, "ik weet de openingstijden niet" is een detail dat
 * `checkFacts()` afhandelt. Alleen zinnen van de eerste soort horen hier.
 */
const UNKNOWN_PHRASES = [
  "geen informatie",
  "geen betrouwbare informatie",
  "niet bekend",
  "ik ken",
  "kan ik niet vinden",
  "geen gegevens",
  "weet ik niet",
  "geen resultaten",
  "onvoldoende informatie",
  "i don't have",
  "no information",
  "not familiar",
  // Het model kan de naam niet aan één organisatie koppelen. Bewust alléén
  // formuleringen over WELK bedrijf bedoeld wordt. Geen losse hedges als "niet
  // met zekerheid", want die slaan net zo vaak op een detail als op de identiteit.
  "welke organisatie je bedoelt",
  "welk bedrijf je bedoelt",
  "welke organisatie bedoel je",
  "welk bedrijf bedoel je",
  "meerdere bedrijven met de naam",
  "meerdere organisaties met de naam",
];

/**
 * Zo kort dat er onmogelijk iets in kan staan. Dezelfde drempel als
 * `MIN_ANSWER_CHARS` bij de meting: onder de 40 tekens is het een meetfout en
 * geen antwoord.
 */
const MIN_SUBSTANTIVE_CHARS = 40;

export function admitsUnknown(answer: string): boolean {
  const n = normalize(answer);
  return UNKNOWN_PHRASES.some((p) => n.includes(normalize(p)));
}

/**
 * Kent het model dit merk?
 *
 * Drie voorwaarden, en alle drie moeten waar zijn: het antwoord is lang genoeg,
 * de merknaam (of een alias) staat erin, en het model zegt niet met zoveel
 * woorden dat het niets weet. Die laatste is nodig omdat "Ik ken Fysi-Unique
 * niet" de merknaam wél bevat. Zonder deze controle zou elk eerlijk
 * niet-weten-antwoord als herkenning tellen.
 */
export function knowsBrand(
  answer: string,
  brandName: string,
  aliases: string[] = [],
): boolean {
  if (answer.trim().length < MIN_SUBSTANTIVE_CHARS) return false;
  if (admitsUnknown(answer)) return false;

  const n = normalize(answer);
  return [brandName, ...aliases]
    .map(normalize)
    .filter((b) => b.length >= 3)
    .some((b) => n.includes(b));
}

/**
 * Welke feiten laten zich structureel controleren, en hoe je ze in vrije tekst
 * terugvindt. Alleen deze soorten kunnen `tegengesproken` opleveren; de rest
 * blijft bij `bevestigd` of `niet_genoemd`.
 */
const PATTERNS: Record<string, RegExp> = {
  // Nederlandse nummers in alle gangbare schrijfwijzen.
  telefoon: /(?:\+31|0031|0)\s?\d(?:[\s.-]?\d){7,9}/g,
  // 1234 AB, met of zonder spatie.
  adres: /\b\d{4}\s?[a-zA-Z]{2}\b/g,
  opgericht: /\b(1[89]\d{2}|20[0-4]\d)\b/g,
};

function findCandidates(answer: string, key: string): string[] {
  const re = PATTERNS[key];
  if (!re) return [];
  return [...answer.matchAll(new RegExp(re.source, re.flags))].map((m) => m[0]);
}

/** Zijn twee waarden van dit soort feitelijk hetzelfde? */
function equivalent(key: string, a: string, b: string): boolean {
  if (key === "telefoon") {
    const da = digitsOnly(a).replace(/^0031|^31/, "0");
    const db = digitsOnly(b).replace(/^0031|^31/, "0");
    // Laatste 9 cijfers vergelijken: dat vangt +31 6 … tegen 06 … af.
    return da.slice(-9) === db.slice(-9) && da.length >= 9;
  }
  if (key === "adres")
    return digitsOnly(a) === digitsOnly(b) && normalize(a) === normalize(b);
  return normalize(a) === normalize(b);
}

export function checkFacts(answer: string, facts: KnownFact[]): FactCheck[] {
  const n = normalize(answer);

  return facts.map((fact) => {
    const expected = fact.value.trim();

    // 1. Staat de waarde er letterlijk (genormaliseerd) in? Dan klaar.
    if (expected && n.includes(normalize(expected))) {
      return {
        key: fact.key,
        expected,
        verdict: "bevestigd" as const,
        found: null,
      };
    }

    // 2. Voor telefoon/postcode/jaartal: staat er een ÁNDERE waarde van dat
    //    soort? Dan spreekt het model ons tegen, en dat is de bevinding waar
    //    het hier om draait.
    const kandidaten = findCandidates(answer, fact.key);
    const afwijkend = kandidaten.find(
      (k) => !equivalent(fact.key, k, expected),
    );
    if (afwijkend) {
      return {
        key: fact.key,
        expected,
        verdict: "tegengesproken" as const,
        found: afwijkend,
      };
    }
    // Een kandidaat die wél equivalent is telt alsnog als bevestiging, een
    // telefoonnummer als "+31 33 123 45 67" tegenover "033 1234567" is hetzelfde
    // nummer, en dat als "niet genoemd" tellen zou de score onterecht drukken.
    if (kandidaten.length > 0) {
      return {
        key: fact.key,
        expected,
        verdict: "bevestigd" as const,
        found: null,
      };
    }

    return {
      key: fact.key,
      expected,
      verdict: "niet_genoemd" as const,
      found: null,
    };
  });
}

export function buildVerdict(
  answer: string,
  brandName: string,
  aliases: string[],
  facts: KnownFact[],
): BaselineVerdict {
  const checks = checkFacts(answer, facts);
  return {
    knowsBrand: knowsBrand(answer, brandName, aliases),
    admitsUnknown: admitsUnknown(answer),
    checks,
    confirmed: checks.filter((c) => c.verdict === "bevestigd").length,
    contradicted: checks.filter((c) => c.verdict === "tegengesproken").length,
    notMentioned: checks.filter((c) => c.verdict === "niet_genoemd").length,
  };
}

/**
 * Wat de klant hierover leest. Bewust in gewone taal en met de cijfers erbij:
 * "ChatGPT kent je merk, noemt 2 van je 5 gegevens goed en spreekt er 1 tegen"
 * is bruikbaar; "hallucinatiescore 0,4" niet.
 */
export function describeVerdict(
  v: BaselineVerdict,
  engineLabel: string,
  brandName: string,
): string {
  if (!v.knowsBrand) {
    return v.admitsUnknown
      ? `${engineLabel} zegt ${brandName} niet te kennen.`
      : `${engineLabel} komt niet met een herkenbaar antwoord over ${brandName}.`;
  }

  const delen = [`${engineLabel} kent ${brandName}`];
  if (v.confirmed > 0) delen.push(`${v.confirmed} gegeven(s) kloppen`);
  if (v.contradicted > 0) {
    delen.push(`**${v.contradicted} gegeven(s) worden tegengesproken**`);
  }
  if (v.notMentioned > 0) delen.push(`${v.notMentioned} niet genoemd`);
  return `${delen.join(" · ")}.`;
}

// ════════════════════════════════════════════════════════════════════════════
// HET CATEGORIEBLOK: de nulmeting die tot 4 augustus 2026 geen getal opleverde
// ════════════════════════════════════════════════════════════════════════════
//
// Het profielscherm zette boven dit blok de kop "Word je genoemd bij
// koopvragen?" en beantwoordde hem nergens. `askOne()` bouwde alleen een oordeel
// voor het blok `kent`; de drie categorie-antwoorden werden opgeslagen als ruwe
// tekst in een uitklapper en verder niet aangeraakt.
//
// Terwijl dat de op één na duurste post van de hele onboarding is: drie vragen
// mét web search, $0,044 van de $0,2463 die een volledige ronde kostte, 18%.
// En het is precies het getal waar een ondernemer op wacht: "bij geen van je
// drie kerndiensten word je genoemd, deze drie concurrenten wel."
//
// ── WAAROM DIT DETERMINISTISCH KAN, EN DUS MOET ─────────────────────────────
//
// De vraag "staat mijn merknaam in dit antwoord" is geen oordeel maar een
// tekstcontrole. `textContainsName()` doet hem al voor de betaalde meting, juist
// omdát de LLM-beoordeling van `mentioned` daar soms `true` gaf terwijl het merk
// nergens in het antwoord stond. Dezelfde functie, dezelfde reden, nul kosten.

export interface CategoryVerdict {
  /** Staat het merk (of een alias) letterlijk in het antwoord? */
  mentioned: boolean;
  /** Welke bekende concurrenten wél genoemd worden. Dat is de scherpe regel. */
  competitorsFound: string[];
}

/**
 * De kale naam uit een concurrentregel halen.
 *
 * `profiles.competitors` is een mengsel van twee bronnen. `market.ts` schrijft
 * er kale namen in ("SMC Amersfoort"), maar `prepare-profile.ts`. Die eerder
 * draait, zet er de hele onderbouwing in die het profielonderzoek teruggaf:
 *
 *   "Fysio Amersfoort, lokale fysiotherapiepraktijk met onder meer manuele
 *    therapie en algemene fysiotherapie in Amersfoort.
 *    ([fysioamersfoort.nl](https://fysioamersfoort.nl/...))"
 *
 * Zo'n regel als naam door `textContainsName()` halen levert altijd `false` op.
 * Dit knipt hem terug tot wat er vóór het gedachtestreepje staat.
 *
 * Blijft er iets over dat te lang is om een bedrijfsnaam te zijn, dan geven we
 * `null` terug in plaats van een gok (conventie 3), een halve zin die
 * toevallig in een antwoord voorkomt, zou een concurrentvermelding verzinnen.
 */
const MAX_COMPETITOR_NAME_CHARS = 60;

export function cleanCompetitorName(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;

  // Markdown-links en alles wat tussen haakjes staat weg.
  s = s.replace(/\(\[[^\]]*\]\([^)]*\)\)/g, "").replace(/\([^)]*\)/g, "");
  // De onderbouwing achter een gedachtestreepje of dubbele punt weg.
  s = s.split(/\s[—–-]\s|:\s/)[0];
  // Afsluitende leestekens en opsommingstekens weg.
  s = s.replace(/^[-*•\s]+/, "").replace(/[.,;\s]+$/, "").trim();

  if (!s || s.length > MAX_COMPETITOR_NAME_CHARS) return null;
  return s;
}

/**
 * Eén merkneutrale koopvraag beoordelen.
 *
 * De concurrentenlijst komt uit het marktonderzoek van dezelfde onboarding, dus
 * dit vergelijkt appels met appels: het zijn de partijen waarvan wij al vonden
 * dat ze in deze markt meedoen.
 */
export function scoreCategoryAnswer(
  answer: string,
  brandNames: string[],
  competitorNames: string[] = [],
): CategoryVerdict {
  const mentioned = brandNames
    .filter((n) => n && n.trim().length >= 3)
    .some((n) => textContainsName(answer, n));

  const competitorsFound = competitorNames
    .filter((n) => n && n.trim().length >= 3)
    .filter((n) => textContainsName(answer, n))
    // Ontdubbelen op kleine letters: het marktonderzoek levert soms twee
    // schrijfwijzen van dezelfde partij.
    .filter(
      (n, i, all) =>
        all.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i,
    );

  return { mentioned, competitorsFound };
}

/**
 * De regel die de klant leest boven het categorieblok.
 *
 * "0 van de 3" is bewust de kop en niet "je bent niet zichtbaar": een getal met
 * een noemer laat zien hoe hard de uitspraak is. Bij één vraag is nul geen
 * conclusie, bij drie begint het er een te worden.
 */
export function describeCategory(
  verdicts: CategoryVerdict[],
  brandName: string,
): string {
  if (verdicts.length === 0) return "Nog geen koopvragen gemeten.";

  const genoemd = verdicts.filter((v) => v.mentioned).length;
  const kop = `${brandName} wordt genoemd bij ${genoemd} van de ${verdicts.length} koopvragen.`;

  if (genoemd === verdicts.length) return kop;

  const concurrenten = [
    ...new Set(verdicts.flatMap((v) => v.competitorsFound)),
  ].slice(0, 5);

  return concurrenten.length > 0
    ? `${kop} Wél genoemd: ${concurrenten.join(", ")}.`
    : kop;
}

// ════════════════════════════════════════════════════════════════════════════
// HOE STELLIG IS "KENT HIJ JE MERK"?
// ════════════════════════════════════════════════════════════════════════════
//
// Twee meetronden op dezelfde site, dezelfde dag, gaven het tegenovergestelde
// antwoord. Ronde 1 vroeg "Wat weet je over Fysi-Unique?", het model kon de
// naam aan geen enkele organisatie koppelen. Ronde 2 vroeg "Wat weet je over
// Fysi-Unique uit Amersfoort?", en kreeg een correcte omschrijving terug.
//
// Twee woorden verschil, en het was de KOPREGEL van het profielscherm die
// omsloeg. Een blok dat $0,0003 kost voor twee vragen (geen zoekfunctie, korte
// antwoorden) hoort er niet twee te stellen maar zes, en geen ja of nee te
// rapporteren maar een verhouding.
//
// Geen drempel: 0 van de 6 is "kent je niet", 6 van de 6 is "kent je", en alles
// daartussen is "wisselend", wat het dan ook echt is. Een grens op 50% zou een
// getal verzinnen dat de meting niet draagt.

export type KnowsLevel = "kent" | "wisselend" | "kent_niet";

export interface KnowsSummary {
  level: KnowsLevel;
  recognised: number;
  asked: number;
}

export function summariseKnows(verdicts: BaselineVerdict[]): KnowsSummary {
  const asked = verdicts.length;
  const recognised = verdicts.filter((v) => v.knowsBrand).length;

  if (asked === 0) return { level: "kent_niet", recognised: 0, asked: 0 };
  if (recognised === 0) return { level: "kent_niet", recognised, asked };
  if (recognised === asked) return { level: "kent", recognised, asked };
  return { level: "wisselend", recognised, asked };
}

/** Wat er als chip op het profielscherm komt te staan. */
export function describeKnows(s: KnowsSummary, brandName: string): string {
  switch (s.level) {
    case "kent":
      return `kent ${brandName}`;
    case "kent_niet":
      return `kent ${brandName} niet`;
    default:
      return `herkent ${brandName} wisselend (${s.recognised} van de ${s.asked} vragen)`;
  }
}

// ── Is de kennistest eigenlijk wel gedaan? ─────────────────────────────────
//
// ⚠️ 19 augustus 2026. `runLlmBaseline()` schreef het facet `llm_kennis` altijd
// weg, ook als het budget op was en er nul vragen gesteld waren. De samenvatting
// werd dan "Nog niet vastgesteld wat AI-assistenten over dit merk weten", en dat
// is een gevulde tekst. `research-steps.ts` leest precies dat veld en zette de
// stap daarmee op `klaar`. De duurste stap van de onboarding, de enige die
// meet wat ChatGPT van het merk weet, toonde dus als geslaagd terwijl er niets
// gebeurd was.
//
// De regel: geen enkel gemeten antwoord betekent geen samenvatting. Het facet
// zelf blijft wél staan, met het aantal overgeslagen vragen erin, want alles
// bewaren is conventie 8. Een leeg `summary` laat de stap op `overgeslagen`
// vallen, en dat is wat er werkelijk gebeurde.

export interface BaselineFacetState {
  /** Er staat minstens één gemeten antwoord, uit deze ronde of een eerdere. */
  gemeten: boolean;
  /** Er is niets gemeten terwijl er wel vragen klaarstonden. */
  allesOvergeslagen: boolean;
}

export function baselineFacetState(input: {
  /** Antwoorden die deze ronde zijn opgeslagen. */
  measured: number;
  /** Antwoorden die er al stonden uit een eerdere ronde (idempotentie). */
  eerder: number;
  /** Vragen die niet gesteld zijn: budget op, of de aanroep mislukte. */
  skipped: number;
}): BaselineFacetState {
  const gemeten = input.measured > 0 || input.eerder > 0;
  return { gemeten, allesOvergeslagen: !gemeten && input.skipped > 0 };
}
