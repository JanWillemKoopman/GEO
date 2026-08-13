/**
 * De concurrentietabel: alle merken op één rangorde, inclusief jezelf.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS, EN NIET DE BALKJES UITBREIDT ────────────
 *
 * `score-panel.tsx` (`CompetitorCard`) zet "Jij" altijd als eerste balk neer,
 * met het percentage van de hoofdscore (`score.score`, genoemd ÷ WINBARE
 * vragen). De concurrenten daaronder krijgen een ander percentage: genoemd ÷
 * ALLE gemeten vragen (`measuredRunCount`). Dat is geen bug, "Jij" moet
 * hetzelfde getal tonen als de rest van de pagina, maar het betekent dat de
 * balkjes twee verschillende schalen door elkaar tonen. Voor een grafiek die
 * jou nooit ergens anders dan bovenaan zet, valt dat niet op.
 *
 * Een rangorde-tabel belooft iets anders: "hier sta je ÉCHT, tussen de rest".
 * Die belofte houdt alleen stand als elk merk op dezelfde manier geteld wordt.
 * Daarom rekent deze module iedereen, inclusief jezelf, over precies dezelfde
 * noemer (`measuredRunCount`), en komt "Jij" op de plek terecht die de cijfers
 * aanwijzen, niet vast bovenaan.
 *
 * ── PUUR, DUS TESTBAAR (conventie 2) ─────────────────────────────────────────
 *
 * Alleen rekenwerk op al opgehaalde rijen, geen database, geen netwerk.
 */

export interface OwnBrandInput {
  name: string;
  /** `visibility_scores.score`, 0-100. */
  score: number;
  /** `visibility_scores.winnable_runs`. */
  winnableRuns: number;
  avgPosition: number | null;
  firstMentionCount: number | null;
  citationCount: number | null;
}

export interface CompetitorInput {
  name: string;
  mentionsCount: number;
  avgPosition: number | null;
  firstMentionCount: number | null;
  /**
   * `null` = deze periode is aangemaakt vóór migratie 0058 of nog niet
   * opnieuw geaggregeerd, NIET "geen citaties gevonden" (conventie 3). Zie
   * `citesOwnSite()` in `lib/entities/normalize.ts`.
   */
  citationCount: number | null;
}

export interface BrandRankingsInput {
  own: OwnBrandInput;
  competitors: CompetitorInput[];
  /** Aantal daadwerkelijk gemeten vragen deze periode, de gedeelde noemer. */
  measuredRunCount: number;
  /**
   * Onder dit aantal vermeldingen telt een concurrent als toeval, niet als
   * patroon (zelfde grens als `CompetitorCard`, optimalisatie.md R4.1).
   */
  minMentionsToShow?: number;
}

export interface BrandRankingRow {
  name: string;
  isOwnBrand: boolean;
  mentions: number;
  /** % van `measuredRunCount`, dezelfde noemer voor elk merk. */
  mentionRate: number | null;
  avgPosition: number | null;
  /** % van `measuredRunCount` waarin dit merk als EERSTE aanbevolen werd. */
  recommendationRate: number | null;
  /**
   * % van `measuredRunCount` waarin de EIGEN site als bron werd gebruikt, op
   * naam herkend (`citesOwnSite()`, migratie 0058). `null` = nog niet
   * berekend voor deze periode (oude data, of nog niet opnieuw gemeten), niet
   * "geen citaties gevonden".
   */
  citationRate: number | null;
  /** % aandeel binnen jij + bevestigde concurrenten samen (share of voice). */
  shareOfVoice: number | null;
}

/**
 * `null` blijft `null` (onbekend), een echte 0 blijft 0 (gemeten, geen enkele
 * citatie). `pct(teller ?? 0, ...)` zou beide op "0%" laten uitkomen, en dan is
 * "nog nooit berekend" niet meer te onderscheiden van "berekend en nul"
 * (conventie 3, bij zowel het eigen merk als een concurrent: `citation_count`
 * is bij allebei pas sinds een bepaalde migratie gevuld).
 */
function pctOrUnknown(teller: number | null, noemer: number): number | null {
  return teller == null ? null : pct(teller, noemer);
}

export interface BrandRankings {
  rows: BrandRankingRow[];
  /** Concurrenten die wegvielen omdat ze minder dan `minMentionsToShow` scoorden. */
  omitted: number;
  /** Geen enkele concurrent kwam vaker dan één keer voor: een versnipperde markt. */
  fragmented: boolean;
}

const DEFAULT_MIN_MENTIONS = 2;

function pct(teller: number, noemer: number): number | null {
  if (noemer <= 0) return null;
  return Math.round((teller / noemer) * 100);
}

/**
 * Hoeveel vragen leverden een vermelding van het eigen merk op.
 *
 * `visibility_scores` bewaart alleen het PERCENTAGE (`score`, ÷ winbare
 * vragen), geen kale telling. Zelfde afleiding als `lib/dashboard.ts`
 * (`buildCardMetrics`); hier als eigen, benoemde functie zodat de twee
 * plekken niet stilzwijgend uit elkaar kunnen lopen.
 */
export function ownMentionCount(score: number, winnableRuns: number): number {
  return Math.round((score / 100) * winnableRuns);
}

export function buildBrandRankings(input: BrandRankingsInput): BrandRankings {
  const drempel = input.minMentionsToShow ?? DEFAULT_MIN_MENTIONS;
  const noemer = input.measuredRunCount;

  const ownMentions = ownMentionCount(input.own.score, input.own.winnableRuns);

  const terugkerend = input.competitors.filter((c) => c.mentionsCount >= drempel);
  const fragmented = terugkerend.length === 0 && input.competitors.length > 0;
  const omitted = input.competitors.length - terugkerend.length;

  // Aandeel (share of voice): jij + bevestigde concurrenten vormen samen de
  // taart. Alleen concurrenten die ook echt getoond worden tellen mee in de
  // noemer, anders zou een weggesnoeide eenmalige vermelding toch het aandeel
  // van de getoonde merken drukken (measure.ts telt dit exact zo: alleen de
  // basis van bevestigde concurrenten, zie de toelichting daar).
  const totaalVoorAandeel = ownMentions + terugkerend.reduce((sum, c) => sum + c.mentionsCount, 0);

  const ownRow: BrandRankingRow = {
    name: input.own.name,
    isOwnBrand: true,
    mentions: ownMentions,
    mentionRate: pct(ownMentions, noemer),
    avgPosition: input.own.avgPosition,
    recommendationRate: pctOrUnknown(input.own.firstMentionCount, noemer),
    citationRate: pctOrUnknown(input.own.citationCount, noemer),
    shareOfVoice: pct(ownMentions, totaalVoorAandeel),
  };

  const competitorRows: BrandRankingRow[] = terugkerend.map((c) => ({
    name: c.name,
    isOwnBrand: false,
    mentions: c.mentionsCount,
    mentionRate: pct(c.mentionsCount, noemer),
    avgPosition: c.avgPosition,
    recommendationRate: pctOrUnknown(c.firstMentionCount, noemer),
    // Herkend op naam (citesOwnSite, migratie 0058). `null` = nog niet
    // berekend voor deze periode, niet "geen citaties gevonden".
    citationRate: pctOrUnknown(c.citationCount, noemer),
    shareOfVoice: pct(c.mentionsCount, totaalVoorAandeel),
  }));

  // Aandeel is de rangorde, niet de vermeldingen: een merk dat vaker genoemd
  // wordt maar bij minder mensen "wint" (want vaker náást een grotere partij)
  // zou anders boven een merk staan dat het feitelijk beter doet. Bij gelijk
  // aandeel wint het aantal vermeldingen, voor een stabiele volgorde.
  const rows = [ownRow, ...competitorRows].sort((a, b) => {
    const sa = a.shareOfVoice ?? -1;
    const sb = b.shareOfVoice ?? -1;
    if (sa !== sb) return sb - sa;
    return b.mentions - a.mentions;
  });

  return { rows, omitted, fragmented };
}
