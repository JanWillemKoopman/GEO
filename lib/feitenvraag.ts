/**
 * Eén feitenvraag, zoals elk scherm hem hoort te tonen.
 *
 * ── WAT HIER MIS WAS ────────────────────────────────────────────────────────
 *
 * Dezelfde rij uit `fact_requests` werd op twee plekken getoond, en de twee
 * schermen wisten verschillend veel van dezelfde kolommen:
 *
 *   `briefing-form.tsx`  las `kind`, `answer_type`, `options`,
 *                        `suggested_answer` en `required`, en tekende dus een
 *                        ja-of-nee-keuze, een bedragveld, een keuzelijst.
 *   `fact-requests.tsx`  las die kolommen niet, en tekende voor élke vraag
 *                        hetzelfde tekstvak van drie regels.
 *
 * Voor de klant op "Openstaande vragen" betekende dat: een vraag die met ja of
 * nee te beantwoorden is, kreeg een leeg tekstvak. Een vraag waar ORBIT ENGINE
 * al een gok voor had, toonde die gok niet, terwijl bevestigen goedkoper is dan
 * formuleren. En een verplichte vraag, waar een kernsectie op wacht, zag eruit
 * als elke andere.
 *
 * Dat is geen opmaakverschil. Het bepaalt of iemand een vraag beantwoordt.
 *
 * ── WAAROM DIT EEN PURE MODULE IS, EN WAT ER NOG NIET IN ZIT ────────────────
 *
 * Conventie 2. Welk invoerveld bij een vraag hoort en onder welk kopje hij valt,
 * bepaalt wat de klant ziet en hoort dus onder test, niet verspreid over twee
 * `if`-ketens in twee clientcomponenten die uit elkaar lopen.
 *
 * ⚠️ **Dit is stap 1 van twee.** `docs/tasks/customer-journey-cluster-tot-schrijven.md`
 * punt 5 vraagt om één scherm voor een feitenvraag. Dit legt het gedeelde model
 * vast zodat de twee schermen niet meer uit elkaar kunnen lopen; het samenvoegen
 * van de twee componenten zelf is de tweede stap, en die vraagt een doorklik in
 * een draaiende app omdat de briefing een eigen poort en een eigen
 * verzendknop heeft. Wat daar nog aan vastzit staat in dat document.
 */

/** Het invoerveld dat bij een vraag hoort. */
export type Invoervorm = "keuze" | "tekstvak" | "regel" | "getal" | "bedrag" | "url";

export interface VraagBron {
  kind?: string | null;
  answer_type?: string | null;
  options?: string[] | null;
  suggested_answer?: string | null;
  required?: boolean | null;
}

export interface VraagVorm {
  vorm: Invoervorm;
  /** De knoppen bij `vorm === "keuze"`. Leeg bij elke andere vorm. */
  keuzes: string[];
  /** De hint in een leeg veld. Leeg betekent: geen hint. */
  hint: string;
}

/**
 * Welk invoerveld hoort bij deze vraag?
 *
 * ⚠️ Een onbekend of ontbrekend `answer_type` valt terug op een tekstvak en
 * nooit op een keuze. Rijen van vóór migratie 0024 hebben de kolom niet, en een
 * keuzelijst zonder opties is een vraag die je niet kúnt beantwoorden; een
 * tekstvak is in het slechtste geval onhandig (conventie 3).
 */
export function vraagVorm(bron: VraagBron): VraagVorm {
  const type = bron.answer_type ?? "tekst_kort";
  const opties = (bron.options ?? []).filter((o) => o.trim().length > 0);

  if (type === "ja_nee") return { vorm: "keuze", keuzes: ["Ja", "Nee"], hint: "" };
  if (type === "keuze" && opties.length > 0) return { vorm: "keuze", keuzes: opties, hint: "" };
  if (type === "lijst") return { vorm: "tekstvak", keuzes: [], hint: "Eén per regel" };
  if (type === "tekst_lang") return { vorm: "tekstvak", keuzes: [], hint: "" };
  if (type === "getal") return { vorm: "getal", keuzes: [], hint: "" };
  if (type === "bedrag") return { vorm: "bedrag", keuzes: [], hint: "" };
  if (type === "url") return { vorm: "url", keuzes: [], hint: "https://…" };
  return { vorm: "regel", keuzes: [], hint: "" };
}

export interface VraagsoortKop {
  titel: string;
  uitleg: string;
}

/**
 * Menselijke kopjes per vraagsoort.
 *
 * Niet "verificatie" maar "even bevestigen": de klant leest geen
 * categorieënmodel, hij leest een vraag van zijn leverancier. Deze teksten
 * stonden in `briefing-form.tsx` en gelden net zo goed op de vragenlijst, want
 * het zijn dezelfde rijen.
 */
export const VRAAGSOORT_KOP: Record<string, VraagsoortKop> = {
  verificatie: {
    titel: "Even bevestigen",
    uitleg: "Dit vond ORBIT ENGINE op je site. Klopt het nog?",
  },
  aanvulling: {
    titel: "Wat ORBIT ENGINE niet kan weten",
    uitleg: "Dit staat nergens online. Zonder jouw antwoord blijft het uit de tekst.",
  },
  onderscheid: {
    titel: "Waarom jij",
    uitleg:
      "Dit is het antwoord dat geen enkele concurrent kan geven, en het meest waardevolle wat je hier invult.",
  },
  bewijs: {
    titel: "Cijfers en voorbeelden",
    uitleg: "Eén eigen getal maakt een pagina geloofwaardiger dan tien mooie zinnen.",
  },
  praktisch: {
    titel: "Praktisch",
    uitleg: "Adres, telefoon, links. Zonder deze gegevens blijven er gaten in de pagina.",
  },
  grenzen: {
    titel: "Wat ORBIT ENGINE juist niet mag beweren",
    uitleg: "Zeg je hier nee, dan schrijft ORBIT ENGINE het niet. Ook niet voorzichtig.",
  },
};

/** De kop bij een vraagsoort, of `null` bij een rij zonder soort. */
export function vraagsoortKop(kind: string | null | undefined): VraagsoortKop | null {
  if (!kind) return null;
  return VRAAGSOORT_KOP[kind] ?? null;
}

/**
 * De volgorde waarin de soorten op het scherm komen.
 *
 * ⚠️ Overgenomen uit `briefing-form.tsx`, waar hij als `KIND_ORDER` stond, en
 * met opzet niet "verbeterd": deze volgorde staat al op het scherm van klanten.
 * Hij begint bij het makkelijkste ("even bevestigen", één klik) en zet daar
 * direct het waardevolste achter ("waarom jij"), zodat iemand die in beweging is
 * meteen bij het antwoord komt dat geen concurrent kan geven. Het praktische
 * werk en de grenzen staan achteraan.
 */
export const VRAAGSOORT_VOLGORDE = [
  "verificatie",
  "onderscheid",
  "aanvulling",
  "bewijs",
  "praktisch",
  "grenzen",
] as const;

/**
 * Vragen groeperen op soort, in de vaste volgorde. Vragen zonder bekende soort
 * komen als laatste groep, met een lege sleutel.
 */
export function groepeerOpSoort<T extends { kind?: string | null }>(
  vragen: T[],
): { kind: string; kop: VraagsoortKop | null; vragen: T[] }[] {
  const perSoort = new Map<string, T[]>();
  for (const v of vragen) {
    const sleutel = v.kind && VRAAGSOORT_KOP[v.kind] ? v.kind : "";
    perSoort.set(sleutel, [...(perSoort.get(sleutel) ?? []), v]);
  }
  const gesorteerd: { kind: string; kop: VraagsoortKop | null; vragen: T[] }[] = [];
  for (const kind of VRAAGSOORT_VOLGORDE) {
    const groep = perSoort.get(kind);
    if (groep?.length) gesorteerd.push({ kind, kop: VRAAGSOORT_KOP[kind], vragen: groep });
  }
  const rest = perSoort.get("");
  if (rest?.length) gesorteerd.push({ kind: "", kop: null, vragen: rest });
  return gesorteerd;
}

/**
 * Wat er onder een verplichte vraag staat.
 *
 * Verplicht betekent hier niet "je kunt niet door": overslaan mag altijd
 * (`README.md` §2). Het betekent dat er een kernsectie op wacht, en dat hoort de
 * klant te weten vóórdat hij besluit hem over te slaan, niet erna.
 */
export const VERPLICHT_UITLEG =
  "Zonder dit antwoord blijft een kernstuk van de pagina onbewezen. Overslaan mag, dan laat ORBIT ENGINE dat stuk weg.";
