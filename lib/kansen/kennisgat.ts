/**
 * HET KENNISGAT PER KANS (N6 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Wat weten we over het bedrijf dat deze pagina nodig heeft, en wat niet? Een
 * vaste lijst behoeften per soort pagina, gelegd naast de kennislaag. Puur,
 * zonder `server-only` (conventie 2), en zonder model (N6 "niet"): wat een
 * pagina nodig heeft is een redactionele afspraak, geen oordeel dat per
 * aanroep anders mag uitvallen.
 *
 * ── DRIE STANDEN PER BEHOEFTE ───────────────────────────────────────────────
 *
 *   bekend    er is een item dat op de pagina mag (`magInBlokA()`, dezelfde
 *             regel die straks blok A vult, K6)
 *   afgeleid  er is alleen een vermoeden: bruikbaar voor een vraag ("klopt
 *             het dat...?"), niet voor de pagina (P3)
 *   onbekend  er is niets
 *
 * Afgeleid telt als ontbrekend, want het mag niet op de pagina. Het verschil
 * met onbekend is wat voor vraag de klant krijgt (A1): bevestigen gaat sneller
 * dan formuleren.
 *
 * ── WANNEER EEN ITEM BIJ DEZE KANS HOORT ────────────────────────────────────
 *
 *   - voor één pagina (`content_piece_id`): alleen als dat een pagina van deze
 *     kans is. Het verhaal op de open vraag van pagina A hoort niet op pagina B
 *     (besluit B3 van de contentketen).
 *   - voor één cluster (`analysis_id`): alleen bij een kans uit dat cluster.
 *   - voor een dienst of regio (`geldt_voor`): alleen als de kans daarvoor geldt.
 *   - anders: merkbreed, dus altijd.
 */
import { magInBlokA, magVoorVragenEnKansen, type KennisRegelItem } from "@/lib/kennis/regels";

export type Behoefte = "werkwijze" | "prijs" | "termijn" | "voorbeeld" | "voor_wie_niet" | "bewijs";

/** Hoe de behoefte in een zin heet, voor het scherm en straks voor de brief (A1). */
export const BEHOEFTE_LABEL: Record<Behoefte, string> = {
  werkwijze: "hoe het in zijn werk gaat",
  prijs: "een prijsindicatie",
  termijn: "een termijn",
  voorbeeld: "een voorbeeld uit de praktijk",
  voor_wie_niet: "voor wie het niet is",
  bewijs: "bewijs",
};

/** Welke kennis een behoefte vervult: een heel domein, of bepaalde soorten. */
const VERVULD_DOOR: Record<Behoefte, { domein?: string; soorten?: readonly string[] }> = {
  werkwijze: { soorten: ["werkwijze"] },
  prijs: { soorten: ["prijs"] },
  termijn: { soorten: ["termijn"] },
  voorbeeld: { domein: "verhaal" },
  // Er bestaat op 26 september 2026 nog geen enkel item van deze soort. Dat is
  // precies het gat: niemand vroeg er ooit naar. A1 gaat ernaar vragen.
  voor_wie_niet: { soorten: ["voor wie niet"] },
  bewijs: { domein: "bewijs" },
};

/**
 * Wat een pagina van dit soort meestal nodig heeft (N6: "in code, als
 * uitgangspunt"). Het soort komt uit de aanbeveling (`type`); onbekend telt
 * als dienstpagina, de strengste lijst, zodat een gat niet stil verdwijnt.
 *
 * - landing (dienstpagina): alles, want de lezer beslist hier.
 * - comparison: waar de lezer tussen kiest, dus prijs, werkwijze en voor wie niet.
 * - article, gids en faq: uitleg; een prijs of termijn is daar een pluspunt, geen gat.
 */
export const BEHOEFTEN_PER_SOORT: Record<string, readonly Behoefte[]> = {
  landing: ["werkwijze", "prijs", "termijn", "voorbeeld", "voor_wie_niet", "bewijs"],
  comparison: ["werkwijze", "prijs", "voor_wie_niet", "bewijs"],
  article: ["werkwijze", "voorbeeld", "bewijs"],
  faq: ["werkwijze", "voorbeeld", "bewijs"],
  gids: ["werkwijze", "voorbeeld", "bewijs"],
};

export function behoeftenVoor(paginaSoort: string | null): readonly Behoefte[] {
  return BEHOEFTEN_PER_SOORT[paginaSoort ?? ""] ?? BEHOEFTEN_PER_SOORT.landing!;
}

/** Een kennisitem met wat nodig is om te bepalen of het bij de kans hoort. */
export interface KennisVoorGat extends KennisRegelItem {
  id: string;
  soort: string | null;
  geldt_voor: readonly string[];
  analysis_id: string | null;
  content_piece_id: string | null;
}

export interface KansVoorGat {
  analysisId: string | null;
  /** De kennisitems (dienst, regio) waarvoor de kans geldt. */
  geldtVoor: readonly string[];
  /** De pagina's (alle versies) die bij deze kans horen. */
  paginaIds: readonly string[];
  /** `type` uit de aanbeveling: landing, comparison, article, faq, of gids (B33). */
  paginaSoort: string | null;
}

export type Stand = "bekend" | "afgeleid" | "onbekend";

export interface Kennisgat {
  perBehoefte: { behoefte: Behoefte; stand: Stand; ids: string[] }[];
  /** De items die een behoefte vervullen en op de pagina mogen. */
  bekend: string[];
  /** De behoeften die niet bekend zijn (afgeleid of onbekend), in vaste volgorde. */
  ontbreekt: Behoefte[];
}

/** Hoort dit item bij deze kans? Zie de kop van dit bestand. */
export function hoortBijKans(item: KennisVoorGat, kans: KansVoorGat): boolean {
  if (item.content_piece_id) return kans.paginaIds.includes(item.content_piece_id);
  if (item.analysis_id && item.analysis_id !== kans.analysisId) return false;
  if (item.geldt_voor.length > 0) return item.geldt_voor.some((id) => kans.geldtVoor.includes(id));
  return true;
}

/**
 * Behoeften die alleen door kennis over déze dienst, dit cluster of deze pagina
 * vervuld worden, niet door iets wat voor het hele merk geldt.
 *
 * ⚠️ Gevonden op productie op 27 september 2026: bij Verstraaten ontbrak bij
 * geen enkele kans iets, omdat "een offerte aanvragen is gratis" (merkbreed,
 * soort prijs) als prijsindicatie telde en "offertes binnen vier uur" als
 * termijn. Een prijs of termijn van het hele bedrijf is zelden die van één
 * dienst; hetzelfde risico als bij besluit V16.
 */
const ALLEEN_SPECIFIEK: readonly Behoefte[] = ["prijs", "termijn"];

function isSpecifiek(item: KennisVoorGat): boolean {
  return item.geldt_voor.length > 0 || item.analysis_id !== null || item.content_piece_id !== null;
}

function vervult(item: KennisVoorGat, behoefte: Behoefte): boolean {
  if (ALLEEN_SPECIFIEK.includes(behoefte) && !isSpecifiek(item)) return false;
  const regel = VERVULD_DOOR[behoefte];
  if (regel.domein) return item.domein === regel.domein;
  return item.soort !== null && (regel.soorten ?? []).includes(item.soort);
}

export function kennisgatVan(kans: KansVoorGat, kennis: readonly KennisVoorGat[], nu: Date): Kennisgat {
  const relevant = kennis.filter((k) => hoortBijKans(k, kans));
  const perBehoefte = behoeftenVoor(kans.paginaSoort).map((behoefte) => {
    const passend = relevant.filter((k) => vervult(k, behoefte));
    const bruikbaar = passend.filter((k) => magInBlokA(k, nu)).map((k) => k.id);
    if (bruikbaar.length > 0) return { behoefte, stand: "bekend" as const, ids: bruikbaar };
    const vermoed = passend.filter((k) => magVoorVragenEnKansen(k, nu)).map((k) => k.id);
    if (vermoed.length > 0) return { behoefte, stand: "afgeleid" as const, ids: vermoed };
    return { behoefte, stand: "onbekend" as const, ids: [] };
  });
  return {
    perBehoefte,
    bekend: [...new Set(perBehoefte.filter((b) => b.stand === "bekend").flatMap((b) => b.ids))],
    ontbreekt: perBehoefte.filter((b) => b.stand !== "bekend").map((b) => b.behoefte),
  };
}

/**
 * De zin voor de consultant op het plan: "Nog niet bekend: een prijsindicatie
 * en voor wie het niet is." `null` als het gat nog niet is uitgerekend
 * (conventie 3); een lege lijst zegt dat er niets ontbreekt.
 */
export function kennisgatZin(ontbreekt: readonly string[] | null): string | null {
  if (ontbreekt === null) return null;
  const labels = ontbreekt.map((b) => BEHOEFTE_LABEL[b as Behoefte] ?? b);
  if (labels.length === 0) return "Alles wat deze pagina nodig heeft, weten we al.";
  const lijst = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} en ${labels[labels.length - 1]}`;
  return `Nog niet bekend: ${lijst}.`;
}
