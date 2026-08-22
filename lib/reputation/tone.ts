/**
 * De toonschaal: van een label naar een getal, en terug naar een zin.
 *
 * Bewust ZONDER `server-only` (conventie 2). Dit is rekenkunde die de uitkomst
 * bepaalt, dus hij hoort testbaar te zijn vanuit `scripts/test-unit.ts`.
 *
 * ── WAAROM HET MODEL EEN LABEL GEEFT EN GEEN CIJFER ─────────────────────────
 *
 * Vraag je een taalmodel om een cijfer tussen -100 en 100, dan krijg je bij
 * dezelfde tekst de ene keer 60 en de andere keer 75, zonder dat er iets
 * verandert. Vraag je om een van zes labels, dan is de spreiding veel kleiner en
 * is de vertaling naar een getal een keuze die wij maken en kunnen uitleggen.
 * Dezelfde reden waarom `mention_role` een enum is: de code rekent, het model
 * niet.
 *
 * ── DE ZES LABELS, EN WAAROM `gemengd` GEEN `neutraal` IS ───────────────────
 *
 * Allebei leveren ze 0 op de schaal, en toch zijn het verschillende
 * uitkomsten. `neutraal` betekent: er wordt zakelijk over je gepraat, zonder
 * oordeel. `gemengd` betekent: er is lof én kritiek, en die heffen elkaar op.
 * Voor het cijfer maakt dat niets uit, voor het advies alles: bij gemengd
 * staan er minpunten die je kunt aanpakken, bij neutraal staat er niets.
 * Vandaar `mixed: true` naast het getal, en niet twee verschillende getallen.
 *
 * `onbekend` levert `null` op en niet 0 (conventie 3). Nul is neutraal, en een
 * model dat niets over je weet is niet neutraal over je.
 */

/** De zes labels die de oordeelslaag mag teruggeven (§4.7). */
export const TONE_LABELS = [
  "positief",
  "overwegend_positief",
  "neutraal",
  "gemengd",
  "negatief",
  "onbekend",
] as const;

export type ToneLabel = (typeof TONE_LABELS)[number];

/**
 * Van label naar toonscore, op de schaal -2 tot +2.
 *
 * ⚠️ Er is geen -1. Dat is met opzet: een model dat kritiek benoemt, doet dat
 * zelden halfslachtig. Bij Van der Valk was de uitkomst in de proef ofwel lof
 * ofwel een concreet bezwaar, en een tussenstand "licht negatief" zou dan een
 * categorie zijn die alleen door twijfel gevuld wordt. `gemengd` vangt dat geval
 * al af, met de vlag erbij.
 */
const TONE_SCORE: Record<ToneLabel, number | null> = {
  positief: 2,
  overwegend_positief: 1,
  neutraal: 0,
  gemengd: 0,
  negatief: -2,
  onbekend: null,
};

/** Is dit een label dat we kennen? Alles anders wordt `onbekend`. */
export function isToneLabel(value: unknown): value is ToneLabel {
  return typeof value === "string" && (TONE_LABELS as readonly string[]).includes(value);
}

/**
 * De toonscore bij een label. Onbekend of onherkenbaar levert `null`.
 *
 * ⚠️ Dit is een van de plekken waar structured output stil fout gaat: bij twijfel
 * kiest hij de eerste waarde uit de lijst, en dat is hier `positief`. Het vangnet
 * daartegen staat niet hier maar in `reputation-verdict.ts`, want die kent de
 * context die het onderscheid maakt: ging het antwoord überhaupt over dit merk?
 */
export function toneScore(label: unknown): number | null {
  return isToneLabel(label) ? TONE_SCORE[label] : null;
}

/** Is dit label een gemengd oordeel? Dan staan er minpunten die je kunt aanpakken. */
export function isMixed(label: unknown): boolean {
  return label === "gemengd";
}

/**
 * Van de merkbrede toonindex (-100 tot 100) naar één woord voor op het scherm.
 *
 * De grenzen liggen bewust ruim uit elkaar. Een index van +12 is geen
 * "positief": dat is een handvol neutrale antwoorden met één compliment erin, en
 * dat als positief presenteren is precies het gerustgestelde bedrijf waar §2.1
 * voor waarschuwt.
 */
export function toneWord(index: number | null): string {
  if (index === null) return "geen beeld";
  if (index >= 60) return "positief";
  if (index >= 20) return "overwegend positief";
  if (index > -20) return "neutraal";
  if (index > -60) return "overwegend negatief";
  return "negatief";
}

/**
 * De hele zin voor blok 1, in gewone taal en zonder cijfer.
 *
 * De merknaam gaat er letterlijk in omdat de klant zijn eigen naam sneller leest
 * dan "je merk", en omdat deze zin bij het delen van een scherm los van zijn
 * context komt te staan.
 */
export function toneSentence(index: number | null, brand: string): string {
  if (index === null) {
    return `ChatGPT heeft geen beeld van ${brand}.`;
  }
  return `ChatGPT praat ${toneWord(index)} over ${brand}.`;
}
