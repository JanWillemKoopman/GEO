/**
 * Welke aanbodknopen gaan mee in de reputatieanalyse? (§4.1)
 *
 * Bewust ZONDER `server-only` (conventie 2): dit bepaalt waar de klant op
 * gemeten wordt, en dat hoort testbaar te zijn.
 *
 * ── WAAROM ER GEKOZEN MOET WORDEN ───────────────────────────────────────────
 *
 * De aanbodboom mag tot 60 knopen hebben (`MAX_NODES` in
 * `lib/pipeline/offering.ts`). Alles meten is duur, traag, en levert een scherm
 * op dat niemand leest. Twaalf regels lees je; zestig scan je weg.
 *
 * ── ⚠️ NIET DE EERSTE TWAALF VAN DE BOOM, EN DIE FOUT IS AL EEN KEER GEMAAKT ─
 *
 * `llm-baseline.ts` nam tot 4 augustus 2026 `slice(0, 3)` op `sort_order`. Die
 * volgorde komt van de website, en die zet de algemeenste diensten bovenaan.
 * Bij Fysi-Unique leverde dat fysiotherapie, manuele therapie en
 * sportfysiotherapie op: precies de drie waar élke praktijk op concurreert,
 * terwijl het marktonderzoek van dezelfde ronde bekkenfysiotherapie en
 * zwangerschapsbegeleiding als het onderscheidende profiel aanwees. Die zijn
 * nooit gevraagd.
 *
 * Deze selectie doet hetzelfde als de reparatie van toen: de consultant en de
 * onderwerpen wegen zwaarder dan de boomvolgorde. De weging bestaat al, hij is
 * per merk gemaakt, en hij verdient het om gebruikt te worden.
 */
import type { ProfileOffering, ProfileTopic } from "@/lib/types/database";

/** Hoeveel knopen er in de standaardmodus meegaan. */
export const MAX_NODES_STANDARD = 12;
/** En in de diepe modus (§2.3). */
export const MAX_NODES_DEEP = 25;

/**
 * ⚠️ `merk` en `vestiging` gaan er NOOIT in.
 *
 * Bij een retailer zijn de gevoerde merken niet zijn reputatie maar die van
 * iemand anders: "wat is de reputatie van Van den Udenhout op het gebied van
 * Volkswagen" meet Volkswagen. En een vestiging is een plaats, geen dienst; daar
 * valt geen reputatie op te hebben die los staat van het merk als geheel.
 */
const MEETBARE_SOORTEN = new Set(["dienst", "product", "categorie"]);

/** Waarom deze knoop erin zit. Gaat mee naar `scope_json`, zodat een herhaling te vergelijken is. */
export type NodeReason = "prioriteit" | "onderwerp" | "aanvulling";

export interface SelectedNode {
  offering: ProfileOffering;
  reason: NodeReason;
  /** Hoe zwaar deze knoop weegt. Bepaalt in de diepe modus wie drie rotaties krijgt. */
  weight: number;
}

export interface SelectNodesArgs {
  offerings: ProfileOffering[];
  topics: ProfileTopic[];
  /** `profiles.priority_offerings`, wat de consultant vooropzette (migratie 0060). */
  priorityNames: string[];
  /** `profiles.deprioritised_offerings`, wat de consultant wegzette. */
  deprioritisedNames: string[];
  limit?: number;
}

/**
 * Losjes vergelijken: de consultant typt "onderhoud", de boom zegt "Onderhoud
 * en APK", en dat hoort dezelfde knoop te zijn.
 *
 * ⚠️ Op HELE WOORDEN en niet op losse tekens. Een kale `includes()` laat
 * "dienst-4" matchen op "dienst-40", en dan zet een prioriteit van de consultant
 * de verkeerde knoop bovenaan zonder dat iemand het merkt. Dat is geen
 * bedacht geval: knoopnamen als "Onderhoud", "Onderhoud 2.0" en "APK 1" komen
 * gewoon voor in een aanbodboom die uit een website is afgeleid.
 */
function woorden(input: string): string[] {
  return input
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

/** Komt `korter` als aaneengesloten reeks woorden voor in `langer`? */
function bevatWoordreeks(langer: string[], korter: string[]): boolean {
  if (korter.length === 0 || korter.length > langer.length) return false;
  for (let i = 0; i + korter.length <= langer.length; i++) {
    if (korter.every((w, j) => langer[i + j] === w)) return true;
  }
  return false;
}

function matchesName(name: string, list: string[]): boolean {
  const n = woorden(name);
  if (n.length === 0) return false;
  return list.some((raw) => {
    const l = woorden(raw);
    if (l.length === 0) return false;
    return bevatWoordreeks(n, l) || bevatWoordreeks(l, n);
  });
}

/**
 * De selectie, deterministisch en in deze volgorde:
 *
 *   1. wat de consultant als prioriteit invulde, altijd erin;
 *   2. wat hij wegzette, altijd eraf;
 *   3. knopen waar een GOEDGEKEURD onderwerp naar wijst, op de prioriteit die
 *      `propose_topics` aan dat onderwerp gaf;
 *   4. aanvullen met `dienst` en `product` op `sort_order`, en pas als die op
 *      zijn met `categorie`;
 *   5. afkappen op de grens van de gekozen diepte.
 *
 * ⚠️ Stap 3 kijkt alleen naar GOEDGEKEURDE onderwerpen. Een voorgesteld onderwerp
 * is een mening van het model die nog niemand bevestigd heeft, en die zou hier
 * de boomvolgorde overrulen zonder dat er een mens naar gekeken heeft. Bij een
 * merk zonder goedgekeurde onderwerpen valt deze stap gewoon weg en doet stap 4
 * het werk.
 */
export function selectNodes(args: SelectNodesArgs): SelectedNode[] {
  const limit = args.limit ?? MAX_NODES_STANDARD;
  if (limit <= 0) return [];

  const meetbaar = args.offerings.filter((o) => MEETBARE_SOORTEN.has(o.kind));

  // Stap 2 eerst, want wat weggezet is mag ook niet via de prioriteitenlijst of
  // via een onderwerp alsnog binnenkomen. Wegzetten is een expliciete beslissing.
  const bruikbaar = meetbaar.filter(
    (o) => !matchesName(o.name, args.deprioritisedNames),
  );

  const gekozen: SelectedNode[] = [];
  const gezien = new Set<string>();

  const voegToe = (o: ProfileOffering, reason: NodeReason, weight: number) => {
    if (gezien.has(o.id) || gekozen.length >= limit) return;
    gezien.add(o.id);
    gekozen.push({ offering: o, reason, weight });
  };

  // ── 1. Prioriteiten ───────────────────────────────────────────────────────
  // Zwaarst: dit is het enige signaal waar een mens naar deze klant heeft
  // gekeken en gezegd "hier zit mijn marge".
  for (const o of bruikbaar) {
    if (matchesName(o.name, args.priorityNames)) voegToe(o, "prioriteit", 100);
  }

  // ── 3. Waar goedgekeurde onderwerpen naar wijzen ──────────────────────────
  const perId = new Map(bruikbaar.map((o) => [o.id, o]));
  const goedgekeurd = args.topics
    .filter((t) => t.status === "goedgekeurd")
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));

  for (const t of goedgekeurd) {
    for (const id of t.offering_ids) {
      const o = perId.get(id);
      if (o) voegToe(o, "onderwerp", Math.max(1, Math.min(99, t.priority)));
    }
  }

  // ── 4. Aanvullen ──────────────────────────────────────────────────────────
  // Bladeren eerst, categorieën pas als die op zijn. Een categorie is per
  // definitie algemener, en op algemeen concurreert iedereen.
  const bladeren = bruikbaar.filter((o) => o.kind === "dienst" || o.kind === "product");
  const categorieen = bruikbaar.filter((o) => o.kind === "categorie");
  const opVolgorde = (a: ProfileOffering, b: ProfileOffering) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name);

  for (const o of [...bladeren].sort(opVolgorde)) voegToe(o, "aanvulling", 10);
  for (const o of [...categorieen].sort(opVolgorde)) voegToe(o, "aanvulling", 5);

  return gekozen;
}

/**
 * De zwaarstwegende knopen, voor de diepe modus: die krijgen drie rotaties op de
 * vergelijking en verliezen daarmee de chip `indicatief` (§4.4, maatregel 3).
 *
 * Bij gelijk gewicht beslist de naam en niet de rijvolgorde uit Postgres. Zonder
 * die vaste tiebreak zou twee keer dezelfde run twee verschillende sets zwaarste
 * knopen kunnen opleveren, en dan is de chip `indicatief` niet reproduceerbaar.
 */
export function heaviestNodes(nodes: SelectedNode[], count: number): SelectedNode[] {
  return [...nodes]
    .sort(
      (a, b) =>
        b.weight - a.weight || a.offering.name.localeCompare(b.offering.name),
    )
    .slice(0, Math.max(0, count));
}
