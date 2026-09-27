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
 * Een harde regel, geen oordeel (conventie 1). Een item gaat niet mee als:
 *
 *   conflict  het op een open of aan de ondernemer gevraagd conflict staat: zijn
 *             feit (`feit_ids`) of hijzelf (`kennis_ids`). Een botsing tussen
 *             kennisitems blokkeert alleen zolang er nog twee van actueel zijn:
 *             wees de consultant er een af, dan is dat de keuze;
 *   betwist   zijn feit in het register betwist is (vangnet naast het conflict);
 *   vervangen zijn feit in het register het verloor: de consultant of de
 *             ondernemer koos het andere, of de ondernemer schreef zelf iets
 *             anders. Het item blijft staan tot de consultant het afwijst; de
 *             schrijver krijgt het niet.
 */

export type Blokkade = "conflict" | "betwist" | "vervangen";

export const BLOKKADE_ZIN: Record<Blokkade, string> = {
  conflict: "Gaat nu niet naar de schrijver: dit spreekt iets anders tegen en wacht op een keuze op de conflictlijst.",
  betwist: "Gaat nu niet naar de schrijver: dit feit is betwist.",
  vervangen: "Gaat niet naar de schrijver: bij een tegenstrijdigheid is voor iets anders gekozen. Wijs het af als het niet klopt.",
};

export interface BlokkadeKennis {
  id: string;
  herkomst_tabel: string | null;
  herkomst_id: string | null;
  vervangen_door?: string | null;
  afgewezen_op?: string | null;
}

export interface BlokkadeConflict {
  status: string;
  echt_conflict: boolean;
  feit_ids: readonly string[] | null;
  kennis_ids: readonly string[] | null;
}

export interface BlokkadeFeit {
  id: string;
  stand: string | null;
}

const OPEN = new Set(["open", "gevraagd"]);

/** Per item dat nu niet mee mag: waarom. Items die wel mogen, staan er niet in. */
export function blokkadesVan(
  kennis: readonly BlokkadeKennis[],
  conflicten: readonly BlokkadeConflict[],
  feiten: readonly BlokkadeFeit[],
): Map<string, Blokkade> {
  const actueel = new Set(kennis.filter((k) => !k.vervangen_door && !k.afgewezen_op).map((k) => k.id));
  const openFeiten = new Set<string>();
  const openKennis = new Set<string>();
  for (const c of conflicten) {
    if (!c.echt_conflict || !OPEN.has(c.status)) continue;
    for (const f of c.feit_ids ?? []) openFeiten.add(f);
    const levend = (c.kennis_ids ?? []).filter((id) => actueel.has(id));
    if (levend.length >= 2) for (const id of levend) openKennis.add(id);
  }
  const stand = new Map(feiten.map((f) => [f.id, f.stand]));

  const uit = new Map<string, Blokkade>();
  for (const k of kennis) {
    const feit = k.herkomst_tabel === "brand_facts" ? k.herkomst_id : null;
    if (openKennis.has(k.id) || (feit && openFeiten.has(feit))) uit.set(k.id, "conflict");
    else if (feit && stand.get(feit) === "betwist") uit.set(k.id, "betwist");
    else if (feit && stand.get(feit) === "vervangen") uit.set(k.id, "vervangen");
  }
  return uit;
}
