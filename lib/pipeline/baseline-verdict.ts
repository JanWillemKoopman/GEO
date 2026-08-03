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
 * `tegengesproken` wordt alleen gemeld waar het STRUCTUREEL vast te stellen is —
 * een ander telefoonnummer, een ander jaartal, een andere postcode, een ander
 * domein. Bij vrije tekst ("wat voor bedrijf is dit") kan deze module het
 * verschil tussen "anders geformuleerd" en "onjuist" niet zien, en dan is
 * zwijgen beter dan een beschuldiging.
 */

export type FactVerdict = "bevestigd" | "tegengesproken" | "niet_genoemd";

export interface KnownFact {
  /** 'telefoon', 'adres', 'opgericht', 'naam', … — de sleutel uit fase 0. */
  key: string;
  value: string;
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

/** Alleen de cijfers — voor telefoonnummers, die op tien manieren geschreven worden. */
function digitsOnly(s: string): string {
  return s.replace(/\D+/g, "");
}

/**
 * Zinnen waarmee een model toegeeft het merk niet te kennen. Bewust een korte,
 * expliciete lijst: elke "voorzichtige" formulering meetellen zou elk genuanceerd
 * antwoord als onbekend markeren, en juist de nuance is wat een goed antwoord
 * onderscheidt van een verzonnen antwoord.
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
 * niet" de merknaam wél bevat — zonder deze controle zou elk eerlijk
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
    // Een kandidaat die wél equivalent is telt alsnog als bevestiging — een
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
