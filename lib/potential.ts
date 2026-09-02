/**
 * De potentiescore: drie getallen, allemaal 0-100 (docs/tasks/potentiescore.md).
 *
 * ── DE DRIE METRIEKEN ────────────────────────────────────────────────────────
 *
 * 1. **Zichtbaarheid.** Van de gemeten vragen die hierbij horen: bij welk
 *    aandeel wordt dit merk in de laatste meting genoemd? 100 = overal
 *    genoemd, 0 = nergens. Ongewogen: dit getal mag NIET de gewogen
 *    zichtbaarheidsscore zijn die al op het scherm staat
 *    (`visibility_scores.weighted_score`, via `promptWeight()`), want die is al
 *    vermenigvuldigd met de grove volumeband. Zou de potentiescore daarop
 *    verder rekenen, dan telt zoekvolume twee keer.
 * 2. **Zoekvolume.** Hoe vaak dit onderwerp gezocht wordt, 0-100, herberekend
 *    over alle onderwerpen van het merk (`lib/pipeline/search-demand.ts`).
 *    Nooit de ruwe uitkomst van één op zichzelf staande AI-aanroep.
 * 3. **Potentie.** Het product van de twee, herschaald naar 0-100: hoeveel is
 *    hier te winnen, gewogen naar hoe vaak het gezocht wordt.
 *
 * Bewust ZONDER `server-only`: puur rekenwerk, testbaar vanuit
 * `scripts/test-unit.ts`. Het ophalen staat in `lib/potential-data.ts`.
 */
import { Z95 } from "@/lib/stats/uncertainty";

/** De drie getallen samen, zoals ze op het scherm komen. */
export interface PotentialTriple {
  /** 0-100, of null zolang er geen gemeten vraag bij hoort. */
  visibility: number | null;
  /** 0-100, of null zolang de profielbrede herkalibratie nog nooit draaide. */
  volume: number | null;
  /** 0-100, of null zolang één van beide helften onbekend is. */
  potential: number | null;
  /**
   * Staat `visibility` stevig genoeg, of is hij nog op te weinig metingen
   * gebaseerd om als vaststaand te tonen (Teamsessie 1 september 2026)?
   *
   * `true` zolang onbekend: een `null`-zichtbaarheid toont toch al een
   * streepje (conventie 3), dus dit veld hoeft daar niets aan toe te voegen.
   */
  confident: boolean;
}

/**
 * Boven welke foutmarge (procentpunten, 95%-band) een zichtbaarheidscijfer als
 * "nog een meetronde nodig" geldt, in plaats van als stevig genoeg om er een
 * kans of een pagina-aanbeveling op te bouwen.
 *
 * ── WAAROM 25 ────────────────────────────────────────────────────────────────
 *
 * Een volledig gemeten onderwerp (~30 vragen) heeft van zichzelf al een band
 * van ±16,4 punten (docs/architecture.md §6), dat is de gewone onzekerheid van
 * één meetronde en geen reden om iets als onzeker te bestempelen. Een
 * voorgestelde pagina die maar 1 tot 3 specifieke doelvragen target, heeft een
 * veel kleinere steekproef en dus een veel bredere band (rond de 100 punten bij
 * 1 vraag, rond de 40 bij 5). 25 punten ligt tussen die twee in: een volledig
 * gemeten onderwerp haalt hem niet, een kans op een handvol doelvragen wel.
 *
 * Bewust géén AI-aanroep en géén tweede meetronde nodig: de onderliggende
 * standaardfout (`binomialStderr`/`score_stderr`) ligt al in de database.
 */
export const CONFIDENCE_MARGIN_LIMIT = 25;

/** Tekst voor op het scherm, één plek zodat hij overal hetzelfde is. */
export const CONFIDENCE_LOW_LABEL = "Nog een meetronde nodig";

/**
 * Is de standaardfout achter een zichtbaarheidscijfer smal genoeg om het als
 * stevig te tonen? `stderr` is `null` zolang er niets gemeten is; dan is er
 * ook geen `visibility`-getal om iets van te beweren, dus telt dat als
 * "voldoende" in plaats van als een ongefundeerde waarschuwing.
 *
 * ⚠️ Dit filtert nooit een kans weg en blokkeert nooit het schrijven van een
 * pagina: het is uitsluitend een label. Een kans met een lage `confident`
 * blijft even bruikbaar als daarvoor (Teamsessie 1 september 2026).
 */
export function isConfident(stderr: number | null): boolean {
  if (stderr === null) return true;
  return Z95 * stderr <= CONFIDENCE_MARGIN_LIMIT;
}

/**
 * Zichtbaarheid van een set vragen: het aandeel waarbij dit merk in de laatste
 * meting genoemd wordt. `null` zolang er geen enkele gemeten vraag bij hoort,
 * conventie 3: onbekend is een betere waarde dan een gegokte 0.
 */
export function visibilityIndex(mentionedCount: number, totalCount: number): number | null {
  if (totalCount <= 0) return null;
  return Math.round((Math.max(0, mentionedCount) / totalCount) * 100);
}

/**
 * De potentiescore: (1 − zichtbaarheid/100) × zoekvolume, dus een product en
 * geen gemiddelde.
 *
 * ⚠️ Bewust vermenigvuldigen. Een onderwerp waar dit merk al overal genoemd
 * wordt (zichtbaarheid 100) heeft potentie 0, hoe hoog het zoekvolume ook is:
 * er is niets meer te winnen. Een onderwerp met een enorm gat maar vrijwel geen
 * zoekvolume (index 5) blijft laag: winnen wat bijna niemand vraagt is geen
 * prioriteit. Alleen de combinatie van beide geeft een hoge score.
 *
 * `null` zolang één van beide helften onbekend is: een potentiescore die op de
 * helft van zijn invoer gokt, is precies de schijnprecisie die dit hele
 * ontwerp probeert te vermijden.
 */
export function potentialScore(visibility: number | null, volumeIndex: number | null): number | null {
  if (visibility === null || volumeIndex === null) return null;
  const gap = (100 - clamp(visibility)) / 100;
  return Math.round(gap * clamp(volumeIndex));
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/**
 * Onderscheidt kansen die toevallig exact dezelfde potentiescore delen
 * (doorloop-huyberts.md punt 4).
 *
 * ── WAAROM DIT NODIG IS ──────────────────────────────────────────────────────
 *
 * Het zoekvolume in `potentialScore()` komt per ONDERWERP (`profile_topics.
 * search_volume_index`), dus alle kansen van hetzelfde onderwerp delen dat
 * getal. Is de zichtbaarheid bij elke kans ook nul, en dat is bij elke nieuwe
 * klant zo, dan valt er niets meer te onderscheiden: `(1 - 0/100) ×
 * volumeIndex` is voor elke kans identiek. Bij Huyberts Keukens kwamen alle
 * zeven kansen van hetzelfde cluster op exact 58 uit.
 *
 * ── DE OPLOSSING ─────────────────────────────────────────────────────────────
 *
 * De onderliggende cijfers die wél verschillen liggen er al:
 * `content_piece_targets`/`planned_pages.target_weight`, het opgetelde gewicht
 * (vraagvolume × koopklaarheid, `promptWeight()`) van de doelvragen die DEZE
 * specifieke kans zou winnen. Binnen een groep kansen die exact dezelfde
 * potentiescore delen, herverdeelt deze functie die score naar rato van dat
 * gewicht: de zwaarste kans in de groep is het ANKER en behoudt zijn score
 * ongewijzigd, de rest krijgt een evenredig lager deel.
 *
 * ⚠️ Bewust ALLEEN binnen een groep met een IDENTIEKE score, en nooit
 * groepsoverstijgend: heeft een kans al een eigen, andere score (omdat zijn
 * doelvragen al deels wél gemeten zichtbaarheid hebben, zoals bij een deel van
 * Gasservice Brabant), dan is dat een echt gemeten verschil en blijft die kans
 * onaangeraakt. Dit vangnet raakt dus nooit een score die al onderscheidt.
 *
 * Een kans zonder bekend gewicht (`null`, of een gewicht ≤ 0) behoudt de
 * groepsscore: onbekend gewicht als nul behandelen zou hem onterecht onderaan
 * duwen, en conventie 3 zegt dat onbekend een betere waarde is dan een
 * gegokte.
 */
export interface WeightedPotential {
  id: string;
  /** Kansen worden alleen binnen dezelfde analyse (hetzelfde onderwerp) met elkaar vergeleken. */
  analysisId: string;
  potential: number | null;
  /** Het opgetelde gewicht van de doelvragen die deze kans zou winnen (`planned_pages.target_weight`). */
  targetWeight: number | null;
}

export function distributePotentialByWeight(
  items: WeightedPotential[],
): Map<string, number | null> {
  const uitkomst = new Map<string, number | null>();
  for (const item of items) uitkomst.set(item.id, item.potential);

  const groepen = new Map<string, WeightedPotential[]>();
  for (const item of items) {
    if (item.potential === null) continue;
    const sleutel = `${item.analysisId}:${item.potential}`;
    const groep = groepen.get(sleutel) ?? [];
    groep.push(item);
    groepen.set(sleutel, groep);
  }

  for (const groep of groepen.values()) {
    if (groep.length < 2) continue; // geen botsing, niets te herverdelen

    const gewichten = groep
      .map((g) => g.targetWeight)
      .filter((w): w is number => w !== null && w > 0);
    if (gewichten.length === 0) continue; // geen enkel gewicht bekend in deze groep

    const maxGewicht = Math.max(...gewichten);
    for (const item of groep) {
      if (item.targetWeight === null || item.targetWeight <= 0) continue; // onbekend: houdt de groepsscore
      const aandeel = Math.min(1, item.targetWeight / maxGewicht);
      uitkomst.set(item.id, Math.round((item.potential as number) * aandeel));
    }
  }

  return uitkomst;
}

export type PotentialBand = "hoog" | "gemiddeld" | "beperkt" | "onbekend";

/** Grenzen zijn een keuze, geen meting: ruwweg in drieën, zoals `volume.ts` dat ook doet. */
export function potentialBand(score: number | null): PotentialBand {
  if (score === null) return "onbekend";
  if (score >= 55) return "hoog";
  if (score >= 25) return "gemiddeld";
  return "beperkt";
}

export const POTENTIAL_BAND_LABEL: Record<PotentialBand, string> = {
  hoog: "hoge potentie",
  gemiddeld: "gemiddelde potentie",
  beperkt: "beperkte potentie",
  onbekend: "nog niet te bepalen",
};

/** Eén zin die de twee helften uitlegt, voor onder het getal of in een tooltip. */
export function potentialExplanation(visibility: number | null, volumeIndex: number | null): string {
  if (visibility === null && volumeIndex === null) {
    return "Nog geen zichtbaarheid en nog geen zoekvolume bekend.";
  }
  if (visibility === null) {
    return "Nog geen gemeten vragen bij dit onderwerp, dus de zichtbaarheid is nog onbekend.";
  }
  if (volumeIndex === null) {
    return "Het zoekvolume is nog niet herberekend. Dat gebeurt zodra er een analyse van dit merk klaar is.";
  }
  const gemist = 100 - clamp(visibility);
  return `${gemist}% van de vragen mist dit merk nu nog, bij een zoekvolume van ${clamp(volumeIndex)}/100 binnen dit merk.`;
}
