/**
 * DE KENNISVELDEN VAN HET MERKPROFIEL (K8 deel 3 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`, besluit V22).
 *
 * De kolommen van `profiles` die klantkennis zijn: wat de inventaris (F0.2) op
 * "meenemen" zette. Sinds K8 deel 3 zijn ze een kopie van de kennislaag: alleen
 * `lib/kennis/profielkopie.ts` schrijft ze, en een test in `scripts/test-unit.ts`
 * faalt als iets anders dat doet. De meting, het rapport en de onderwerpen lezen
 * de kopie (besluit V9 en V22).
 *
 * Puur en zonder `server-only` (conventie 2): de test en de schrijvers lezen
 * dezelfde lijst.
 */
import { LIJSTVELDEN, PROFIEL_MEENEMEN, TEKSTVELDEN, type BronProfiel, type VeldRegel } from "@/lib/kennis/terugvullen";
import type { Klantkennis } from "@/lib/types/database";

/** Alle kennisvelden van `profiles`. `proof_points` niet: die staat op "niet meer gebruiken". */
export const KENNISVELDEN: readonly string[] = PROFIEL_MEENEMEN.filter((v) => v !== "proof_points").map(String);

export function isKennisveld(kolom: string): boolean {
  return KENNISVELDEN.includes(kolom);
}

/** Splitst een update in de kennisvelden en de rest (crawl, koppelingen, boekhouding). */
export function splitsKennisvelden(kolommen: Record<string, unknown>): { kennis: Record<string, unknown>; overig: Record<string, unknown> } {
  const kennis: Record<string, unknown> = {};
  const overig: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(kolommen)) (isKennisveld(k) ? kennis : overig)[k] = v;
  return { kennis, overig };
}

// ── De kopie volgt de consultant op het kennisoverzicht ──────────────────────

/** Een veld waar dit item uit kan komen: dezelfde domein en soort als bij het terugvullen. */
function veldenVoor(item: Pick<Klantkennis, "domein" | "soort">): VeldRegel[] {
  return [...TEKSTVELDEN, ...LIJSTVELDEN].filter((r) => r.domein === item.domein && r.soort === item.soort);
}

function gelijk(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export interface KopieWijziging {
  veld: keyof BronProfiel;
  waarde: string | string[] | null;
}

/**
 * Wat er op `profiles` moet veranderen nu een mens op het kennisoverzicht een
 * item afwees (`nieuw` null) of aanpaste (`nieuw` de nieuwe bewering). Alleen als
 * de oude bewering letterlijk in precies één veld staat; anders niets, en blijft
 * de kopie zoals hij was. Liever een kopie die één keer achterloopt dan een
 * waarde die in het verkeerde veld belandt: de meting telt op deze velden.
 *
 * Een lijstveld verliest of vervangt die ene waarde, een tekstveld wordt leeg of
 * de nieuwe tekst.
 */
export function kopieNaHandeling(
  profiel: Partial<Record<keyof BronProfiel, unknown>>,
  oud: Pick<Klantkennis, "domein" | "soort" | "bewering" | "herkomst_tabel">,
  nieuw: string | null,
): KopieWijziging | null {
  if (oud.herkomst_tabel !== "profiles" && oud.herkomst_tabel !== "profile_facets") return null;
  const treffers: KopieWijziging[] = [];
  for (const r of veldenVoor(oud)) {
    const huidig = profiel[r.veld];
    if (Array.isArray(huidig)) {
      const lijst = huidig.filter((w): w is string => typeof w === "string");
      const i = lijst.findIndex((w) => gelijk(w, oud.bewering));
      if (i < 0) continue;
      const nieuweLijst = nieuw === null ? lijst.filter((_, j) => j !== i) : lijst.map((w, j) => (j === i ? nieuw : w));
      treffers.push({ veld: r.veld, waarde: [...new Set(nieuweLijst)] });
    } else if (typeof huidig === "string" && gelijk(huidig, oud.bewering)) {
      treffers.push({ veld: r.veld, waarde: nieuw });
    }
  }
  return treffers.length === 1 ? treffers[0] : null;
}

/**
 * Wat er op `profiles` moet veranderen nu een mens een afgewezen item terugzet:
 * de omgekeerde weg van `kopieNaHandeling(.., null)`. Alleen als er precies één
 * veld bij dit item hoort, want anders is niet te zeggen waar de waarde terug
 * moet. Een lijstveld krijgt de waarde er weer bij (als hij er niet al staat), een
 * tekstveld alleen als het leeg is: een waarde die intussen door iets anders is
 * gezet, wordt nooit overschreven.
 */
export function kopieNaTerugzetten(
  profiel: Partial<Record<keyof BronProfiel, unknown>>,
  item: Pick<Klantkennis, "domein" | "soort" | "bewering" | "herkomst_tabel">,
): KopieWijziging | null {
  if (item.herkomst_tabel !== "profiles" && item.herkomst_tabel !== "profile_facets") return null;
  const velden = veldenVoor(item);
  if (velden.length !== 1) return null;
  const veld = velden[0]!.veld;
  const huidig = profiel[veld];
  if (Array.isArray(huidig)) {
    const lijst = huidig.filter((w): w is string => typeof w === "string");
    if (lijst.some((w) => gelijk(w, item.bewering))) return null;
    return { veld, waarde: [...lijst, item.bewering] };
  }
  if (huidig == null || (typeof huidig === "string" && huidig.trim() === "")) return { veld, waarde: item.bewering };
  return null;
}
