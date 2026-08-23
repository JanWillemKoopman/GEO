/**
 * Van een volgorde naar een plaats en een score (§3.1 en §4.4).
 *
 * Bewust ZONDER `server-only` (conventie 2).
 *
 * ── WAAROM DE PLAATS EEN PLAATS BLIJFT EN GEEN VIERDE PERCENTAGE WORDT ──────
 *
 * "Tweede van vier" is een andere soort uitspraak dan "68 op 100", en die twee
 * horen niet naast elkaar te staan alsof ze hetzelfde zeggen. Op het scherm
 * leidt daarom de plaats. De onderliggende score bestaat wél, want er moet mee
 * gerekend worden over criteria, rotaties en aanbodknopen heen, en dat kan niet
 * met "tweede van vier" en "eerste van drie" naast elkaar.
 *
 * De formule:
 *
 *     score = (aantal partijen - plaats) / (aantal partijen - 1) × 100
 *
 * Eerste van vier levert 100, laatste van vier levert 0, tweede van vier levert
 * 66,7. Bij drie partijen is tweede 50. Dat verschil is precies waarom
 * `of_parties` per RIJ wordt bewaard en niet per run: kende het model bij
 * prijs-kwaliteit maar drie van de vier partijen, dan is een tweede plaats daar
 * iets anders waard.
 *
 * ── DE DRIE VANGNETTEN (§4.4), EN ALLE DRIE STAAN ZE HIER EN NIET IN EEN PROMPT
 *
 *   1. Een partij die niet in de gevraagde set zat, wordt genegeerd. Modellen
 *      voegen graag een vijfde bedrijf toe; dat is geen antwoord op de vraag en
 *      het verstoort de noemer.
 *   2. Ontbreekt de klant zelf in de volgorde, dan is er GEEN plaats en GEEN
 *      score. Niet "laatste". Het model heeft dan geen oordeel geveld, en dat is
 *      iets anders dan een slecht oordeel (conventie 3).
 *   3. Blijven er na het wegvallen van onbekende partijen minder dan twee over,
 *      dan vervalt de hele vergelijking voor dat criterium. Eerste van één is
 *      geen uitslag.
 */
import type { ReputationCriterion } from "@/lib/types/database";

/** Wat het model over één partij op één criterium zei. */
export interface PartyPlacement {
  party: string;
  /** Zei het model deze partij te kennen? `false` haalt hem uit de noemer. */
  known: boolean;
  /** De plaats zoals het model hem gaf, vanaf 1. Null bij `known: false`. */
  position: number | null;
}

/** Eén criterium uit één vergelijkingsantwoord, na de vangnetten. */
export interface CriterionOutcome {
  criterion: ReputationCriterion;
  /** Alle partijen, ook de onbekende: die gaan als rij de database in met `known: false`. */
  placements: (PartyPlacement & { ofParties: number; adjusted: number | null })[];
  /** De plaats van de klant, vanaf 1. Null = geen plaats (vangnet 2 of 3). */
  ownPosition: number | null;
  /** Hoeveel partijen er in DIT oordeel meededen. */
  ofParties: number;
  /** 0 tot 100. Null zodra `ownPosition` null is. */
  ownScore: number | null;
}

/**
 * Van plaats naar score.
 *
 * ⚠️ Bij één partij is de noemer nul. Dan is er geen score, en niet 100: eerste
 * van één zegt niets over de markt.
 */
export function positionToScore(position: number, ofParties: number): number | null {
  if (ofParties < 2) return null;
  if (position < 1 || position > ofParties) return null;
  return round1(((ofParties - position) / (ofParties - 1)) * 100);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Losse namen vergelijken zonder over hoofdletters of spaties te struikelen. */
function sleutel(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface ScoreCriterionArgs {
  criterion: ReputationCriterion;
  /** Wat het model teruggaf, ongefilterd. */
  raw: PartyPlacement[];
  /** De partijen die de vraag daadwerkelijk in gingen. Alles daarbuiten valt af. */
  askedParties: string[];
  /** De naam van de klant zoals die de vraag in ging. */
  ownParty: string;
}

/**
 * Eén criterium beoordelen, met alle drie de vangnetten erop.
 *
 * De teruggegeven plaatsen zijn HERNUMMERD over de partijen die overbleven. Doe
 * je dat niet, dan levert "plaats 3 van de 4, maar partij 2 was onbekend" een
 * score op die uitgaat van vier partijen terwijl het model er over drie oordeelde.
 */
export function scoreCriterion(args: ScoreCriterionArgs): CriterionOutcome {
  const gevraagd = new Map(args.askedParties.map((p) => [sleutel(p), p]));
  const eigen = sleutel(args.ownParty);

  // ── Vangnet 1: alleen partijen die de vraag in gingen ────────────────────
  const gezien = new Set<string>();
  const binnen: PartyPlacement[] = [];
  for (const p of args.raw) {
    const k = sleutel(p.party);
    if (!gevraagd.has(k) || gezien.has(k)) continue;
    gezien.add(k);
    // De naam zoals wij hem stelden, niet zoals het model hem schreef: dan
    // matchen de rijen straks op de vaste set van de run.
    binnen.push({ ...p, party: gevraagd.get(k) as string });
  }

  // Partijen die het model helemaal niet noemde, tellen als niet-gekend. Ze gaan
  // wél als rij de database in, want "het model liet je weg" is een bevinding.
  for (const [k, naam] of gevraagd) {
    if (!gezien.has(k)) binnen.push({ party: naam, known: false, position: null });
  }

  // ── Vangnet 3: hernummeren over wie er overbleef ─────────────────────────
  const bekend = binnen
    .filter((p) => p.known && typeof p.position === "number" && p.position >= 1)
    .sort((a, b) => (a.position as number) - (b.position as number));

  const ofParties = bekend.length;
  const nieuwePlaats = new Map<string, number>();
  bekend.forEach((p, i) => nieuwePlaats.set(sleutel(p.party), i + 1));

  const placements = binnen.map((p) => {
    const plaats = nieuwePlaats.get(sleutel(p.party)) ?? null;
    return {
      ...p,
      ofParties,
      adjusted: plaats,
    };
  });

  // Minder dan twee bekende partijen: de hele vergelijking vervalt voor dit
  // criterium. De rijen blijven bestaan (alles bewaren, conventie 8), maar er
  // komt geen score uit.
  if (ofParties < 2) {
    return { criterion: args.criterion, placements, ownPosition: null, ofParties, ownScore: null };
  }

  // ── Vangnet 2: geen klant in de volgorde is geen laatste plaats ──────────
  const ownPosition = nieuwePlaats.get(eigen) ?? null;
  const ownScore = ownPosition === null ? null : positionToScore(ownPosition, ofParties);

  return { criterion: args.criterion, placements, ownPosition, ofParties, ownScore };
}

/** Eén beoordeeld criterium zoals het uit de database komt, voor het middelen. */
export interface RankSample {
  criterion: ReputationCriterion;
  /** De plaats van de klant, vanaf 1. Null telt niet mee. */
  position: number | null;
  ofParties: number;
}

export interface RankSummary {
  /** 0 tot 100. Null als er niets te middelen viel. */
  score: number | null;
  /** De gemiddelde plaats, bijvoorbeeld 2,3. Null als er geen plaats was. */
  position: number | null;
  /** Van hoeveel partijen. De meest voorkomende noemer, niet het gemiddelde. */
  of: number | null;
  /** Op welke criteria de klant bovengemiddeld en ondergemiddeld scoort. */
  winsOn: ReputationCriterion[];
  losesOn: ReputationCriterion[];
  /** Hoeveel bruikbare oordelen eronder liggen. Bepaalt mede `rank_indicative`. */
  samples: number;
}

/**
 * Middelt over criteria, rotaties en aanbodknopen heen.
 *
 * ⚠️ De score wordt gemiddeld en de plaats apart. Je kunt de gemiddelde plaats
 * niet uit de gemiddelde score terugrekenen zodra de noemer per oordeel
 * verschilt, en juist dan is het verschil betekenisvol.
 *
 * `winsOn` en `losesOn` gaan over de eigen score per criterium ten opzichte van
 * het eigen gemiddelde, niet ten opzichte van 50. Een merk dat overal derde van
 * vier staat wint nergens, en dat hoort er ook zo uit te komen; een merk dat
 * overal eerste staat behalve op prijs, verliest op prijs.
 */
export function summariseRanks(samples: RankSample[]): RankSummary {
  const bruikbaar = samples.filter(
    (s) => s.position !== null && s.ofParties >= 2,
  );
  if (bruikbaar.length === 0) {
    return { score: null, position: null, of: null, winsOn: [], losesOn: [], samples: 0 };
  }

  const scores = bruikbaar
    .map((s) => positionToScore(s.position as number, s.ofParties))
    .filter((v): v is number => v !== null);

  if (scores.length === 0) {
    return { score: null, position: null, of: null, winsOn: [], losesOn: [], samples: 0 };
  }

  const score = round1(scores.reduce((a, b) => a + b, 0) / scores.length);
  const position = round1(
    bruikbaar.reduce((a, s) => a + (s.position as number), 0) / bruikbaar.length,
  );

  // De meest voorkomende noemer. Het gemiddelde van 4 en 3 is 3,5, en "derde van
  // 3,5 partijen" is geen zin die je aan een klant laat zien.
  const noemers = new Map<number, number>();
  for (const s of bruikbaar) noemers.set(s.ofParties, (noemers.get(s.ofParties) ?? 0) + 1);
  const of = [...noemers.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];

  // Per criterium het gemiddelde, afgezet tegen het eigen totaalgemiddelde.
  const perCriterium = new Map<ReputationCriterion, number[]>();
  for (const s of bruikbaar) {
    const v = positionToScore(s.position as number, s.ofParties);
    if (v === null) continue;
    const lijst = perCriterium.get(s.criterion) ?? [];
    lijst.push(v);
    perCriterium.set(s.criterion, lijst);
  }

  const winsOn: ReputationCriterion[] = [];
  const losesOn: ReputationCriterion[] = [];
  // Tien punten speling, anders staat elk criterium in een van beide lijsten en
  // zegt "je wint op dienstverlening" niets meer.
  const MARGE = 10;
  for (const [criterium, waarden] of perCriterium) {
    const gem = waarden.reduce((a, b) => a + b, 0) / waarden.length;
    if (gem > score + MARGE) winsOn.push(criterium);
    else if (gem < score - MARGE) losesOn.push(criterium);
  }

  return { score, position, of, winsOn, losesOn, samples: bruikbaar.length };
}
