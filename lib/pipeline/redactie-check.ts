/**
 * De vangnetten op de eindredactie (docs/tasks/contentpijplijn-publicatiewaardig.md
 * §5 L8, WP5).
 *
 * Een eindredacteur maakt een tekst beter zonder feiten toe te voegen. Het model
 * belooft dat; deze module rekent het na (conventie 1):
 *
 *   1. Geen nieuw getal. Een bedrag, termijn of aantal dat niet in het concept
 *      stond en ook in geen enkel feit op de kaart, is verzonnen. Dan wordt de
 *      hele redactie teruggedraaid naar het concept: een half teruggedraaide
 *      tekst is niet na te lezen.
 *   2. Geen dekking die niet bestaat. Een bewering met een F-nummer dat niet op
 *      de kaart staat: ook terugdraaien.
 *   3. Niet langer dan het budget. Maakt de redactie de tekst langer dan het
 *      budget plus 15 procent, en langer dan het concept, dan terugdraaien.
 *   4. Geen prioriteitsfeit weg. Tot de nameting van fase 1 werd dat alleen
 *      gemeld, in de verwachting dat de keuring het als blokkade zou zien en de
 *      reparatie het zou terugzetten. Op 25 september 2026 schrapte de redactie
 *      bij Best de vaste ploeg, de doorlooptijd en het gratis gesprek (345 naar
 *      115 woorden), en twee reparatierondes brachten er maar een deel van
 *      terug (199 woorden). Nu: terugdraaien naar het concept.
 *   5. Niet leegschrappen. Haalt de redactie meer dan 40 procent van het
 *      concept weg en komt ze onder 60 procent van het budget, dan terugdraaien.
 *      Bij de kostenpagina van dezelfde dag ging 227 naar 165 woorden (27 procent
 *      eraf, herhaling en vulzinnen); dat blijft staan.
 *
 * Puur (conventie 2).
 */

/** Tot zoveel boven het budget geldt nog als binnen het budget (§12.2: waarschuwing boven 15 procent). */
export const BUDGET_MARGE = 1.15;

/** Onder deze fractie van het budget is een tekst leeggeschrapt, als de redactie er ook veel af haalde. */
export const ONDER_BUDGET = 0.6;
/** Zoveel mag de redactie van het concept weghalen voordat de ondergrens telt. */
export const MAX_GESCHRAPT = 0.4;

export interface RedactieTekst {
  bodyMarkdown: string;
  faq: { q: string; a: string }[];
  claims: { factRef: string }[];
}

export interface RedactieUitslag {
  akkoord: boolean;
  redenen: string[];
  nieuweGetallen: string[];
  onbekendeRefs: string[];
  verdwenenPrioriteit: string[];
  woordenVoor: number;
  woordenNa: number;
}

function woorden(tekst: string): number {
  return tekst.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * De getallen in een tekst, als genormaliseerde tekenreeks: "€ 2.200" en
 * "2200" zijn hetzelfde getal, "4,9" blijft "4.9". Alleen cijfers; een telwoord
 * ("vijf man") zegt de redacteur vaak anders dan het concept, en "een" staat in
 * elke zin.
 */
export function getalReeksen(tekst: string): Set<string> {
  const uit = new Set<string>();
  for (const m of tekst.matchAll(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g)) {
    const n = Number(m[0].replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(n)) uit.add(String(n));
  }
  return uit;
}

function heleTekst(t: RedactieTekst): string {
  return [t.bodyMarkdown, ...t.faq.map((f) => `${f.q} ${f.a}`)].join("\n");
}

function refsVan(claims: { factRef: string }[]): Set<string> {
  return new Set(
    claims.flatMap((c) =>
      (c.factRef ?? "")
        .toUpperCase()
        .split(/[^A-Z0-9]+/)
        .filter((r) => /^F\d+$/.test(r)),
    ),
  );
}

export function controleerRedactie(args: {
  concept: RedactieTekst;
  redactie: RedactieTekst;
  /** De teksten en F-nummers van de HELE kaart: een getal mag uit elk feit komen. */
  feiten: { ref: string; text: string }[];
  budget: number | null;
  prioriteit: readonly string[];
}): RedactieUitslag {
  const { concept, redactie, feiten, budget } = args;
  const redenen: string[] = [];

  const bekend = getalReeksen(heleTekst(concept));
  for (const f of feiten) for (const g of getalReeksen(f.text)) bekend.add(g);
  const nieuweGetallen = Array.from(getalReeksen(heleTekst(redactie))).filter((g) => !bekend.has(g));
  if (nieuweGetallen.length) {
    redenen.push(`De redactie voegde een getal toe dat nergens op de kaart staat: ${nieuweGetallen.join(", ")}.`);
  }

  const kaart = new Set(feiten.map((f) => f.ref.toUpperCase()));
  const onbekendeRefs = Array.from(refsVan(redactie.claims)).filter((r) => !kaart.has(r));
  if (onbekendeRefs.length) {
    redenen.push(`De redactie verwijst naar feiten die niet op de kaart staan: ${onbekendeRefs.join(", ")}.`);
  }

  const woordenVoor = woorden(concept.bodyMarkdown);
  const woordenNa = woorden(redactie.bodyMarkdown);
  if (budget && woordenNa > budget * BUDGET_MARGE && woordenNa > woordenVoor) {
    redenen.push(`De redactie maakte de tekst langer dan het budget: ${woordenNa} woorden tegen ${budget}.`);
  }

  const voor = refsVan(concept.claims);
  const na = refsVan(redactie.claims);
  const verdwenenPrioriteit = args.prioriteit.map((r) => r.toUpperCase()).filter((r) => voor.has(r) && !na.has(r));
  if (verdwenenPrioriteit.length) {
    redenen.push(`De redactie haalde een prioriteitsfeit weg: ${verdwenenPrioriteit.join(", ")}.`);
  }
  if (
    budget &&
    woordenNa < budget * ONDER_BUDGET &&
    woordenVoor > 0 &&
    (woordenVoor - woordenNa) / woordenVoor > MAX_GESCHRAPT
  ) {
    redenen.push(`De redactie schrapte de tekst leeg: ${woordenVoor} naar ${woordenNa} woorden, budget ${budget}.`);
  }

  return {
    akkoord: redenen.length === 0,
    redenen,
    nieuweGetallen,
    onbekendeRefs,
    verdwenenPrioriteit,
    woordenVoor,
    woordenNa,
  };
}
