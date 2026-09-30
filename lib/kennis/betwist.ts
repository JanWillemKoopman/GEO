/**
 * WELKE KENNIS NU NIET NAAR DE SCHRIJVER MAG, EN WAAROM (K7 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Puur, zonder `server-only` (conventie 2); het ophalen staat in
 * `voor-pagina.ts` en op het kennisoverzicht.
 *
 * ⚠️ Gevonden bij K7 (27 september 2026): tot K6 hield blok A betwiste en
 * vervangen feiten tegen (`kiesFeiten()` op `brand_facts.stand`). Sinds K6 leest
 * blok A uit de kennislaag, en die wist niets van de conflictlijst: twee feiten
 * die elkaar tegenspreken gingen dan allebei naar de schrijver. Op productie
 * stond er op dat moment geen conflict open, dus er is niets mis geschreven.
 *
 * Een harde regel, geen oordeel (conventie 1). Een item gaat niet mee als het
 * op een open botsing in de kennislaag staat (`kennis_ids`, besluit V14),
 * zolang er van die botsing nog twee items actueel zijn: wees de consultant er
 * een af, dan is dat de keuze.
 *
 * Tot K8 deel 2 hield dit ook tegen wat in het oude feitenregister betwist of
 * vervangen was, of op een conflict tussen feiten stond (`feit_ids`). Dat
 * register is weg; op productie stond op 27 september 2026 geen feit op
 * betwist of vervangen en geen conflict tussen feiten open.
 */

export type Blokkade = "conflict";

export const BLOKKADE_ZIN: Record<Blokkade, string> = {
  conflict: "ORBIT ENGINE schrijft hier nu niet mee: dit spreekt iets anders tegen en wacht op een keuze op de conflictlijst.",
};

export interface BlokkadeKennis {
  id: string;
  vervangen_door?: string | null;
  afgewezen_op?: string | null;
}

export interface BlokkadeConflict {
  status: string;
  echt_conflict: boolean;
  kennis_ids: readonly string[] | null;
}

/** Per item dat nu niet mee mag: waarom. Items die wel mogen, staan er niet in. */
export function blokkadesVan(kennis: readonly BlokkadeKennis[], conflicten: readonly BlokkadeConflict[]): Map<string, Blokkade> {
  const actueel = new Set(kennis.filter((k) => !k.vervangen_door && !k.afgewezen_op).map((k) => k.id));
  const uit = new Map<string, Blokkade>();
  for (const c of conflicten) {
    if (!c.echt_conflict || c.status !== "open") continue;
    const levend = (c.kennis_ids ?? []).filter((id) => actueel.has(id));
    if (levend.length >= 2) for (const id of levend) uit.set(id, "conflict");
  }
  return uit;
}
