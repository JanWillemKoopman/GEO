/**
 * Het CSM-paneel: waar lopen we achter?
 *
 * ── WAT NOVA HIER DOET, EN WAT AURA ANDERS MOET ─────────────────────────────
 *
 * Nova heeft twee beheerschermen (`docs/Nova.md` §3.8): een klantentabel met
 * zeven segmenten die elk zeggen wát jij moet doen, en een CSM-overzicht met
 * vier KPI's onder de kop "where we are falling behind on generating and
 * posting client content". Het is nadrukkelijk een OPERATIONEEL scherm, geen
 * analytisch: het bestaat om te zien waar het vastloopt.
 *
 * Aura's segmenten zijn niet Nova's segmenten. Nova's zeven gaan over funnels,
 * talen en doellanden invullen; die velden vult Aura zelf in tijdens het
 * onderzoek (besluit 13: alleen Nederlands, en de vier standaardfasen komen uit
 * `plan-build.ts`). Wat hier overblijft is de vraag die er wél toe doet: bij wie
 * ligt de bal, en hoe lang al?
 *
 * ── WAAROM DIT EEN PURE MODULE IS ───────────────────────────────────────────
 *
 * Conventie 2. Dit bepaalt welk merk bovenaan een lijst komt te staan en welke
 * waarschuwing er getoond wordt, en dat hoort onder test. Het haalt zelf niets
 * op; `lib/csm-data.ts` doet de queries en geeft de rijen door.
 */
import type { AnalysisStatus, ProfileStatus } from "@/lib/types/database";

/**
 * De zeven segmenten, op volgorde van "vraagt iets van jou" naar "loopt".
 *
 * De volgorde is de prioriteit: een merk valt in het EERSTE segment dat past.
 * Zonder die regel zou een merk met zowel een pijplijnfout als een openstaand
 * akkoord in twee lijsten staan, en dan telt hij dubbel in elke teller.
 */
export const CSM_SEGMENTS = [
  "vastgelopen",
  "onderzoek_loopt",
  "nakijken",
  "geen_meting",
  "wacht_op_klant",
  "geen_plan",
  "loopt",
] as const;

export type CsmSegment = (typeof CSM_SEGMENTS)[number];

export interface SegmentMeta {
  label: string;
  /** Nova's banner: wat jij moet doen, in één zin. */
  banner: string;
  /** Wat er staat als het segment leeg is. Een leeg segment is goed nieuws. */
  leeg: string;
  /** Vraagt dit segment een handeling van de eigenaar? Bepaalt de vlag. */
  actie: boolean;
}

export const CSM_SEGMENT_META: Record<CsmSegment, SegmentMeta> = {
  vastgelopen: {
    label: "Vastgelopen",
    banner: "Hier is iets misgegaan. Kijk wat er faalde en start het opnieuw.",
    leeg: "Niets vastgelopen.",
    actie: true,
  },
  onderzoek_loopt: {
    label: "Onderzoek loopt",
    banner: "Aura is bezig. Je hoeft niets te doen tot het onderzoek klaar is.",
    leeg: "Geen onderzoek onderweg.",
    actie: false,
  },
  nakijken: {
    label: "Wacht op jouw nakijkwerk",
    banner: "Het onderzoek is klaar en het merkprofiel is nog niet nagekeken. Doe dat vóór het demogesprek.",
    leeg: "Alle merkprofielen zijn nagekeken.",
    actie: true,
  },
  geen_meting: {
    label: "Nog niet gemeten",
    banner: "Er is nog geen enkele meting gestart. Zonder meting is er geen cijfer om over te praten.",
    leeg: "Elk merk heeft minstens één meting.",
    actie: true,
  },
  wacht_op_klant: {
    label: "Wacht op de klant",
    banner: "De bal ligt bij de klant. Bel als het te lang duurt.",
    leeg: "Niemand wacht op een klant.",
    actie: false,
  },
  geen_plan: {
    label: "Geen contentplan",
    banner: "Dit merk is gemeten maar heeft nog geen contentplan. Dat is de stap die het abonnement waarmaakt.",
    leeg: "Elk gemeten merk heeft een plan.",
    actie: true,
  },
  loopt: {
    label: "Loopt",
    banner: "Hier gaat alles zoals het hoort.",
    leeg: "Nog geen merk dat volledig loopt.",
    actie: false,
  },
};

/**
 * Eén afgeronde taak, alleen wat nodig is om te bepalen of een mislukking nog
 * telt.
 */
export interface JobOutcome {
  type: string;
  /** `profile:<id>` of `analysis:<id>`. Twee eigenaren, één sleutel. */
  ownerKey: string;
  status: "failed" | "done";
  /** ISO-tijd waarop de taak eindigde. */
  at: string;
}

/**
 * Welke mislukkingen tellen nog?
 *
 * ── DE FOUT DIE DIT REPAREERT, GEVONDEN OP PRODUCTIE ────────────────────────
 *
 * Het CSM-paneel telde eerst álle taken met status `failed`, zonder grens. Bij
 * het eerste merk dat het scherm liet zien ging dat meteen mis: het merkonderzoek
 * van Van den Udenhout faalde op 5 en 6 augustus drie keer met "You have no
 * credits remaining", en op 9 augustus liep precies datzelfde onderzoek gewoon
 * door tot en met de synthese. Het merk is dus af, maar stond in het paneel
 * eeuwig onder "Vastgelopen", bovenaan, met een rode teller.
 *
 * Een teller die nooit meer op nul komt, is een teller die je leert negeren, en
 * daarmee zou het duurste segment van het scherm waardeloos zijn geworden.
 *
 * ── DE REGEL ────────────────────────────────────────────────────────────────
 *
 * Een mislukte taak telt alleen als er daarná geen geslaagde taak van hetzélfde
 * soort voor dezelfde eigenaar is. Dat is precies wat "vastgelopen" hoort te
 * betekenen: het werk is nooit alsnog gelukt. Geen tijdvenster van zoveel dagen,
 * want dat is een gok; dit is een feit uit de wachtrij zelf.
 */
export function unresolvedFailures(jobs: JobOutcome[]): JobOutcome[] {
  const laatsteSucces = new Map<string, string>();
  for (const j of jobs) {
    if (j.status !== "done") continue;
    const sleutel = `${j.ownerKey}|${j.type}`;
    const huidig = laatsteSucces.get(sleutel);
    if (!huidig || j.at > huidig) laatsteSucces.set(sleutel, j.at);
  }

  return jobs.filter((j) => {
    if (j.status !== "failed") return false;
    const succes = laatsteSucces.get(`${j.ownerKey}|${j.type}`);
    return !succes || succes <= j.at;
  });
}

/** Eén merk, zoals het CSM-paneel het ziet. */
export interface CsmBrand {
  profileId: string;
  name: string;
  accountName: string | null;
  profileStatus: ProfileStatus;
  /** Is het merkprofiel nagekeken en compleet genoeg om te delen? */
  profielCompleet: boolean;
  /** Statussen van alle analyses van dit merk. Leeg = nooit gemeten. */
  analyseStatussen: AnalysisStatus[];
  /** Pakket van het account. `null` = nog niet gekozen. */
  quota: number | null;
  heeftPlan: boolean;
  /** Maanden die op akkoord van de klant wachten. */
  maandenTerGoedkeuring: number;
  /** Pagina's die geschreven zijn en op akkoord wachten. */
  paginasTerGoedkeuring: number;
  /** Pagina's die goedgekeurd zijn maar nog niet live staan. */
  paginasTePlaatsen: number;
  /** Pagina's waarvan de publicatiedatum voorbij is en die nog niets zijn. */
  paginasTeLaat: number;
  /** Deze maand geplaatst. */
  geplaatstDezeMaand: number;
  /** Wanneer er voor het laatst iets live ging. */
  laatstGeplaatst: string | null;
  /** Definitief mislukte taken van dit merk. */
  pijplijnfouten: number;
}

/**
 * In welk segment valt dit merk?
 *
 * ⚠️ De vololgorde van de controles ÍS de prioriteit. Zie de opmerking bij
 * `CSM_SEGMENTS`: een merk hoort in precies één segment, anders telt hij dubbel.
 */
export function segmentOf(b: CsmBrand): CsmSegment {
  if (b.profileStatus === "mislukt" || b.pijplijnfouten > 0) return "vastgelopen";
  if (b.profileStatus !== "klaar") return "onderzoek_loopt";
  if (!b.profielCompleet) return "nakijken";
  if (b.analyseStatussen.length === 0) return "geen_meting";

  // Wacht de klant op iets? Dat is belangrijker dan wat er verder nog ontbreekt:
  // zolang hij niet reageert, kun jij niets bouwen.
  const wachtOpKlant =
    b.maandenTerGoedkeuring > 0 ||
    b.paginasTerGoedkeuring > 0 ||
    b.analyseStatussen.includes("concept_klaar");
  if (wachtOpKlant) return "wacht_op_klant";

  if (!b.heeftPlan) return "geen_plan";
  return "loopt";
}

/**
 * De vlaggen naast een merk in de tabel.
 *
 * Nova's "flags"-kolom. Kort, en alleen wat om een handeling vraagt: een tabel
 * waarin elke rij een vlag heeft, is een tabel zonder vlaggen.
 */
export function flagsOf(b: CsmBrand): string[] {
  const vlaggen: string[] = [];
  if (b.pijplijnfouten > 0) {
    vlaggen.push(
      b.pijplijnfouten === 1 ? "1 taak mislukt" : `${b.pijplijnfouten} taken mislukt`,
    );
  }
  if (b.quota === null && b.heeftPlan === false && b.profileStatus === "klaar") {
    vlaggen.push("Geen pakket");
  }
  if (b.paginasTeLaat > 0) vlaggen.push(`${b.paginasTeLaat} over de datum`);
  if (b.paginasTePlaatsen > 0) vlaggen.push(`${b.paginasTePlaatsen} klaar om te plaatsen`);
  if (b.maandenTerGoedkeuring > 0) {
    vlaggen.push(
      b.maandenTerGoedkeuring === 1
        ? "1 maand wacht op akkoord"
        : `${b.maandenTerGoedkeuring} maanden wachten op akkoord`,
    );
  }
  // Het pakket is een belofte per maand. Blijft de teller eronder, dan levert
  // Aura minder dan waarvoor betaald wordt, en dat is de stilste manier om een
  // klant kwijt te raken.
  if (b.quota !== null && b.heeftPlan && b.geplaatstDezeMaand < b.quota) {
    vlaggen.push(`${b.geplaatstDezeMaand} van ${b.quota} deze maand geplaatst`);
  }
  return vlaggen;
}

/** Vraagt dit merk iets van jou? Bepaalt het filter "alleen waarschuwingen". */
export function needsAttention(b: CsmBrand): boolean {
  return CSM_SEGMENT_META[segmentOf(b)].actie || flagsOf(b).length > 0;
}

export interface CsmTotals {
  /** Nova's "behind on posting": klaar, maar staat niet live. */
  achterOpPlaatsen: number;
  /** Nova's "behind on generating": de datum is voorbij en er is niets geschreven. */
  achterOpSchrijven: number;
  /** Nova's "awaiting approval", maanden en pagina's bij elkaar. */
  wachtOpAkkoord: number;
  /** Nova's "pipeline failures". */
  pijplijnfouten: number;
  merken: number;
  /** Merken die iets van jou vragen. */
  merkenMetActie: number;
}

export function totals(brands: CsmBrand[]): CsmTotals {
  return {
    achterOpPlaatsen: som(brands, (b) => b.paginasTePlaatsen),
    achterOpSchrijven: som(brands, (b) => b.paginasTeLaat),
    wachtOpAkkoord: som(brands, (b) => b.maandenTerGoedkeuring + b.paginasTerGoedkeuring),
    pijplijnfouten: som(brands, (b) => b.pijplijnfouten),
    merken: brands.length,
    merkenMetActie: brands.filter(needsAttention).length,
  };
}

/**
 * De volgorde van de tabel: wat schreeuwt om aandacht staat bovenaan.
 *
 * Sorteren op naam zou betekenen dat een merk dat vastloopt onderaan kan staan
 * omdat het toevallig met een Z begint. Bij gelijke urgentie wint de naam, zodat
 * de lijst niet danst tussen twee keer verversen.
 */
export function sortForCsm(brands: CsmBrand[]): CsmBrand[] {
  const rang = new Map(CSM_SEGMENTS.map((s, i) => [s, i]));
  return [...brands].sort((a, b) => {
    const va = rang.get(segmentOf(a)) ?? 99;
    const vb = rang.get(segmentOf(b)) ?? 99;
    if (va !== vb) return va - vb;
    const fa = flagsOf(a).length;
    const fb = flagsOf(b).length;
    if (fa !== fb) return fb - fa;
    return a.name.localeCompare(b.name, "nl");
  });
}

function som(brands: CsmBrand[], f: (b: CsmBrand) => number): number {
  return brands.reduce((t, b) => t + f(b), 0);
}
