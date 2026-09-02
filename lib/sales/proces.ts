/**
 * Waar staat deze markt, en wat gebeurt er nu?
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 8, de dertien taken.)
 *
 * ── WAAROM DIT BESTAAT (1 september 2026) ───────────────────────────────────
 *
 * De pijplijn doet negen dingen achter elkaar en de gebruiker zag er één zin
 * van: "ORBIT ENGINE stelt de vragen aan de AI-assistenten. Je kunt dit scherm
 * sluiten." Dertien minuten lang, zonder teller, zonder wat er af was en zonder
 * wat er mislukt was. Bij de eerste echte markt mislukten zestien schrijftaken
 * definitief en er stond nergens iets over op het scherm.
 *
 * Dat is niet alleen ongemakkelijk, het is duur: wie niet ziet dat een stap is
 * blijven hangen, drukt nog een keer op de knop, en elke druk is een rekening.
 *
 * ── DE OPZET ────────────────────────────────────────────────────────────────
 *
 * Eén pure functie die een momentopname omzet in negen fases met een stand, een
 * cijfer en een zin in gewone taal. Geen database, geen `server-only`, zodat
 * `scripts/test-unit.ts` elke overgang kan nalezen (conventie 2). De pagina
 * haalt de momentopname op, deze module bepaalt wat er staat.
 *
 * ── DE VIER STANDEN, EN WAAROM "WACHT OP JOU" APART IS ──────────────────────
 *
 * `klaar`, `bezig`, `wacht_op_jou` en `mislukt`. Die derde is het hele punt van
 * dit scherm: de keten stopt op twee plekken met opzet (poort 1 en poort 2, plan
 * §8.1), en zonder onderscheid tussen "de app werkt eraan" en "de app wacht op
 * jou" ziet stilstand er hetzelfde uit als voortgang. Dat is precies de
 * verwarring die je met een voortgangsbalk wilt wegnemen.
 */

export type FaseStand = "klaar" | "bezig" | "wacht_op_jou" | "wacht" | "mislukt";

export interface Fase {
  sleutel: string;
  /** Wat er gebeurt, in de taal van de gebruiker. */
  titel: string;
  stand: FaseStand;
  /** Het cijfer erbij: "18 van de 40 vragen gemeten". Leeg als er niets te tellen valt. */
  detail: string | null;
  /** Wat de gebruiker nu moet doen, alleen bij `wacht_op_jou` en `mislukt`. */
  actie: string | null;
}

/** Wat een taaksoort in de wachtrij aan het doen is. */
export interface TaakTelling {
  wachtend: number;
  bezig: number;
  klaar: number;
  mislukt: number;
}

export interface ProcesMoment {
  marktStatus: string;
  /** De stand van de jongste meetronde, of `null` als er nog geen ronde is. */
  rondeStatus: string | null;
  rondeNr: number;
  bedrijvenGevonden: number;
  bedrijvenMee: number;
  /** Bedrijven waar nog niemand naar gekeken heeft bij poort 1. */
  bedrijvenOnbeoordeeld: number;
  crawlKlaar: number;
  crawlMislukt: number;
  vragen: number;
  /** Hoeveel antwoorden er binnen zijn, en hoeveel er verwacht worden. */
  antwoorden: number;
  antwoordenVerwacht: number;
  kansen: number;
  /** Kansen waarvan de haak door het model geschreven is in plaats van uit het sjabloon. */
  kansenGeschreven: number;
  taken: Record<string, TaakTelling>;
  isPublic: boolean;
  heeftRapport: boolean;
}

/** Optelling over alle taaksoorten van deze markt. */
function tel(moment: ProcesMoment, ...soorten: string[]): TaakTelling {
  const uit: TaakTelling = { wachtend: 0, bezig: 0, klaar: 0, mislukt: 0 };
  for (const soort of soorten) {
    const t = moment.taken[soort];
    if (!t) continue;
    uit.wachtend += t.wachtend;
    uit.bezig += t.bezig;
    uit.klaar += t.klaar;
    uit.mislukt += t.mislukt;
  }
  return uit;
}

/** Draait er nog iets van deze soorten? */
function loopt(t: TaakTelling): boolean {
  return t.bezig > 0 || t.wachtend > 0;
}

/**
 * De negen fases van een markt, met hun stand op dit moment.
 *
 * De volgorde is die van de pijplijn en verandert nooit: een gebruiker die deze
 * lijst twee keer ziet, hoort dezelfde stappen op dezelfde plek te zien staan.
 */
export function bouwFases(m: ProcesMoment): Fase[] {
  const fases: Fase[] = [];

  // ── 1. De markt zelf ──────────────────────────────────────────────────────
  fases.push({
    sleutel: "markt",
    titel: "Markt aangemaakt",
    stand: "klaar",
    detail: null,
    actie: null,
  });

  // ── 2. Bedrijven zoeken ───────────────────────────────────────────────────
  const zoeken = tel(m, "sales_market_discover", "sales_market_verify", "sales_market_suppress");
  fases.push({
    sleutel: "ontdekken",
    titel: "Bedrijven zoeken",
    stand:
      m.bedrijvenGevonden > 0
        ? "klaar"
        : zoeken.mislukt > 0 && !loopt(zoeken)
          ? "mislukt"
          : loopt(zoeken)
            ? "bezig"
            : m.marktStatus === "concept"
              ? "wacht_op_jou"
              : "wacht",
    detail:
      m.bedrijvenGevonden > 0
        ? `${m.bedrijvenGevonden} bedrijven gevonden`
        : loopt(zoeken)
          ? "ORBIT ENGINE zoekt in openbare bronnen"
          : null,
    actie:
      m.bedrijvenGevonden === 0 && m.marktStatus === "concept"
        ? "Start het onderzoek. Dit kost ongeveer vijf cent."
        : zoeken.mislukt > 0 && m.bedrijvenGevonden === 0
          ? "Het zoeken is mislukt. Start het onderzoek opnieuw."
          : null,
  });

  // ── 3. Poort 1 ────────────────────────────────────────────────────────────
  const poort1Gedaan = m.marktStatus !== "wacht_op_goedkeuring" && m.bedrijvenGevonden > 0;
  fases.push({
    sleutel: "poort1",
    titel: "Jij keurt de bedrijvenlijst goed",
    stand:
      m.bedrijvenGevonden === 0 ? "wacht" : poort1Gedaan ? "klaar" : "wacht_op_jou",
    detail: poort1Gedaan
      ? `${m.bedrijvenMee} van de ${m.bedrijvenGevonden} bedrijven doen mee`
      : m.bedrijvenOnbeoordeeld > 0
        ? `${m.bedrijvenOnbeoordeeld} bedrijven wachten op jouw oordeel`
        : null,
    actie: !poort1Gedaan && m.bedrijvenGevonden > 0
      ? "Haal eruit wat geen bedrijf in deze markt is, en keur de lijst daarna goed."
      : null,
  });

  // ── 4. De websites uitlezen ───────────────────────────────────────────────
  const crawl = tel(m, "sales_company_enrich");
  fases.push({
    sleutel: "crawl",
    titel: "Websites uitlezen",
    stand: !poort1Gedaan
      ? "wacht"
      : loopt(crawl)
        ? "bezig"
        : crawl.klaar > 0 || m.crawlKlaar > 0
          ? "klaar"
          : "wacht",
    detail: loopt(crawl)
      ? `${crawl.klaar} van de ${crawl.klaar + crawl.wachtend + crawl.bezig} sites gelezen`
      : m.crawlKlaar > 0
        ? `${m.crawlKlaar} sites gelezen${m.crawlMislukt > 0 ? `, ${m.crawlMislukt} niet te lezen` : ""}`
        : null,
    // Een site die niet te lezen is, is geen storing die iemand moet oplossen:
    // het bedrijf doet gewoon mee, alleen zonder wat er op zijn site staat.
    actie: null,
  });

  // ── 5. Onderwerpen en vragen ──────────────────────────────────────────────
  const vragenTaken = tel(m, "sales_market_intents", "sales_market_questions");
  fases.push({
    sleutel: "vragen",
    titel: "Onderwerpen en vragen bepalen",
    stand:
      m.vragen > 0
        ? "klaar"
        : loopt(vragenTaken)
          ? "bezig"
          : vragenTaken.mislukt > 0
            ? "mislukt"
            : "wacht",
    detail: m.vragen > 0 ? `${m.vragen} vragen klaar` : loopt(vragenTaken) ? "ORBIT ENGINE schrijft de vragen" : null,
    actie:
      m.vragen === 0 && vragenTaken.mislukt > 0
        ? "Het schrijven van de vragen is mislukt. Keur de bedrijvenlijst opnieuw goed om het opnieuw te proberen."
        : null,
  });

  // ── 6. Poort 2 ────────────────────────────────────────────────────────────
  const wachtOpMeting = m.rondeStatus === "vragen_klaar";
  const gemeten = m.antwoorden > 0 || m.rondeStatus === "meet" || m.rondeStatus === "klaar";
  fases.push({
    sleutel: "poort2",
    titel: "Jij geeft de meting akkoord",
    stand: m.vragen === 0 ? "wacht" : wachtOpMeting ? "wacht_op_jou" : gemeten ? "klaar" : "wacht",
    detail: null,
    actie: wachtOpMeting
      ? "Lees de vragen na en geef de meting akkoord. Dit is de stap die geld kost."
      : null,
  });

  // ── 7. Meten ──────────────────────────────────────────────────────────────
  const meten = tel(m, "sales_measure_question");
  const meetKlaar = m.rondeStatus === "klaar" || (m.antwoorden > 0 && !loopt(meten));
  fases.push({
    sleutel: "meten",
    titel: "Vragen stellen aan de AI-assistent",
    stand: !gemeten ? "wacht" : loopt(meten) ? "bezig" : meetKlaar ? "klaar" : "wacht",
    detail:
      m.antwoordenVerwacht > 0
        ? `${m.antwoorden} van de ${m.antwoordenVerwacht} vragen gemeten` +
          (meten.mislukt > 0 ? `, ${meten.mislukt} mislukt` : "")
        : null,
    actie:
      meten.mislukt > 0 && !loopt(meten)
        ? `${meten.mislukt} ${meten.mislukt === 1 ? "vraag is" : "vragen zijn"} niet gemeten. De uitkomst rust dus op minder vragen.`
        : null,
  });

  // ── 8. Optellen en kansen bepalen ─────────────────────────────────────────
  const rekenen = tel(m, "sales_market_aggregate", "sales_detect_opportunities");
  fases.push({
    sleutel: "kansen",
    titel: "Optellen en kansen bepalen",
    stand: !meetKlaar
      ? "wacht"
      : loopt(rekenen)
        ? "bezig"
        : m.kansen > 0
          ? "klaar"
          : rekenen.mislukt > 0
            ? "mislukt"
            : "wacht",
    detail: m.kansen > 0 ? `${m.kansen} kansen gevonden` : loopt(rekenen) ? "ORBIT ENGINE rekent" : null,
    actie:
      m.kansen === 0 && meetKlaar && !loopt(rekenen) && rekenen.mislukt === 0
        ? "Er kwam geen enkele kans uit deze meting. Kijk of de vragen deze markt echt meten."
        : null,
  });

  // ── 9. De teksten ─────────────────────────────────────────────────────────
  const schrijven = tel(m, "sales_opportunity_explain");
  fases.push({
    sleutel: "teksten",
    titel: "Redenen schrijven",
    stand:
      m.kansen === 0
        ? "wacht"
        : loopt(schrijven)
          ? "bezig"
          : schrijven.mislukt > 0
            ? "mislukt"
            : "klaar",
    detail:
      m.kansen > 0
        ? `${m.kansenGeschreven} van de ${m.kansen} kansen ${m.kansen === 1 ? "heeft" : "hebben"} een geschreven reden` +
          (schrijven.mislukt > 0 ? `, ${schrijven.mislukt} mislukt` : "")
        : null,
    actie:
      schrijven.mislukt > 0
        ? "Bij deze kansen staat de vaste sjabloonzin. Die klopt met de meting, hij is alleen zakelijker dan nodig."
        : null,
  });

  return fases;
}

/** De fase waar het nu op wacht, voor de samenvatting bovenaan. */
export function huidigeFase(fases: readonly Fase[]): Fase | null {
  return (
    fases.find((f) => f.stand === "mislukt") ??
    fases.find((f) => f.stand === "wacht_op_jou") ??
    fases.find((f) => f.stand === "bezig") ??
    null
  );
}

/** Draait er op dit moment iets? Dan mag het scherm zichzelf verversen. */
export function loopterIets(fases: readonly Fase[]): boolean {
  return fases.some((f) => f.stand === "bezig");
}

/** Eén zin die de hele stand samenvat, voor bovenaan het scherm. */
export function procesSamenvatting(fases: readonly Fase[]): string {
  const nu = huidigeFase(fases);
  const klaar = fases.filter((f) => f.stand === "klaar").length;

  if (!nu) return `Alle ${fases.length} stappen zijn klaar.`;
  if (nu.stand === "mislukt") return `Stap ${klaar + 1} van de ${fases.length} liep vast: ${nu.titel.toLowerCase()}.`;
  if (nu.stand === "wacht_op_jou") return `Het wacht op jou: ${nu.titel.toLowerCase()}.`;
  return `Bezig met stap ${klaar + 1} van de ${fases.length}: ${nu.titel.toLowerCase()}.`;
}
