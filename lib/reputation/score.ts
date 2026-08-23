/**
 * De drie getallen: toon, bewijskracht en eenduidigheid (§3.1).
 *
 * Bewust ZONDER `server-only` (conventie 2). Dit is de rekenkunde die bepaalt
 * wat de klant bovenaan zijn scherm leest, dus hij hoort testbaar te zijn
 * zonder database en zonder sleutel.
 *
 * ── DE CODE REKENT, HET MODEL NIET ──────────────────────────────────────────
 *
 * Het model geeft per antwoord een label en de onderbouwing. Alles hieronder is
 * daarna deterministisch. Precies zoals `baseline-verdict.ts` het oordeel over
 * de kennistest velt in plaats van het model. Zou je het omdraaien, dan
 * verschilt het cijfer per keer dat je het vraagt en is geen enkele vergelijking
 * over de tijd nog iets waard.
 *
 * ── ⚠️ TOON ZONDER BEWIJS IS GEEN REPUTATIE ─────────────────────────────────
 *
 * Dit is de belangrijkste regel van dit bestand, en hij komt uit §2.1. Een
 * taalmodel is standaard vriendelijk: vraag je naar een onbekend bedrijf, dan
 * krijg je een welwillend, inhoudsloos antwoord. Zonder rem levert dat een mooie
 * score op voor een merk waar AI helemaal niets van weet, en dat is de
 * gevaarlijkste uitkomst die dit product kan geven: een gerustgesteld bedrijf
 * dat onzichtbaar is.
 *
 * Twee remmen daartegen, allebei hier in code:
 *
 *   1. Een antwoord met `grounding: "geen"` telt NIET mee in de toonindex. Het
 *      wordt wel bewaard (conventie 8), en het scherm zegt letterlijk dat AI hier
 *      geen beeld van heeft.
 *   2. De bewijskracht staat er altijd naast op het scherm. Een toon van +65 bij
 *      een bewijskracht van 10 is geen compliment maar lucht, en dat is de meest
 *      voorkomende uitkomst bij een MKB-bedrijf.
 */
import { binomialStderr } from "@/lib/stats/uncertainty";
import type { ReputationGrounding } from "@/lib/types/database";

/**
 * Antwoorden zonder controleerbare bron wegen mee met deze factor.
 *
 * ⚠️ Niet 0 en niet 1. Nul zou betekenen dat een antwoord waarin het model uit
 * eigen kennis iets zegt helemaal niet bestaat, en juist dat parametrische beeld
 * is blok 2 van het scherm. Eén zou betekenen dat een verzonnen compliment even
 * zwaar telt als een compliment met drie bronnen eronder. Dertig procent: ze
 * zeggen iets, maar minder.
 *
 * ⚠️ Dit geldt voor `eigen_site`, `sociale_media` en `onbekend`. `geen` valt er
 * helemaal buiten, zie `usableForTone()`.
 */
export const WEAK_WEIGHT = 0.3;

/** Grondslagen die als volwaardig bewijs tellen. */
const STERKE_GRONDSLAG = new Set<ReputationGrounding>(["reviews", "pers"]);

/** Eén beoordeeld antwoord, zoals het uit de oordeelslaag komt. */
export interface ScoredAnswer {
  /** -2 tot +2. Null = geen oordeel te vellen. */
  toneScore: number | null;
  grounding: ReputationGrounding | null;
  /** Ging dit antwoord überhaupt over dit merk? */
  mentionsBrand: boolean | null;
}

/**
 * Telt dit antwoord mee in de toonindex?
 *
 * ⚠️ `grounding === "geen"` valt eruit. Dat is de harde regel uit §2.1: levert
 * een antwoord geen enkele controleerbare bron op, dan wordt de toon vastgelegd
 * maar telt hij niet mee in het merkcijfer.
 */
export function usableForTone(a: ScoredAnswer): boolean {
  if (a.toneScore === null) return false;
  if (a.mentionsBrand === false) return false;
  return a.grounding !== "geen";
}

/** Hoe zwaar dit antwoord meeweegt. */
function weight(a: ScoredAnswer): number {
  return a.grounding && STERKE_GRONDSLAG.has(a.grounding) ? 1 : WEAK_WEIGHT;
}

/**
 * De toonindex, -100 tot +100.
 *
 * ⚠️ Geeft `null` terug als er geen enkel bruikbaar antwoord is, en NIET 0. Nul
 * betekent neutraal: er wordt zakelijk over je gepraat. Null betekent: er valt
 * niets over te zeggen. Dat zijn verschillende uitkomsten met verschillende
 * adviezen, en dit is de plek waar het verschil het meest kost als je hem
 * vergeet (conventie 3).
 */
export function toneIndex(answers: ScoredAnswer[]): number | null {
  const bruikbaar = answers.filter(usableForTone);
  if (bruikbaar.length === 0) return null;

  const somGewicht = bruikbaar.reduce((s, a) => s + weight(a), 0);
  if (somGewicht <= 0) return null;

  const som = bruikbaar.reduce(
    (s, a) => s + (a.toneScore as number) * weight(a),
    0,
  );
  // Van de schaal -2..+2 naar -100..+100.
  return Math.round((som / somGewicht) * 50);
}

/** Eén bron die in de run is aangehaald. */
export interface EvidenceSource {
  domain: string;
  /** Is dit de eigen site van de klant? Die telt niet als extern bewijs. */
  isOwn: boolean;
  /** Is dit een reviewplatform? */
  isReview: boolean;
  /** Is het cijfer erop bevestigd door de eigen crawler plus JSON-LD (§2.4)? */
  verifiedRating: boolean;
}

/**
 * De bewijskracht, 0 tot 100.
 *
 * ⚠️ Nul is hier een ECHTE uitkomst en geen ontbrekende waarde: AI praat over je
 * zonder één controleerbare bron. Dat is precies wat de klant moet weten, en
 * daarom is dit getal niet nullable.
 *
 * Drie delen, en de weging is op wat een klant eraan heeft:
 *
 *   • 50 punten voor het aantal unieke EXTERNE bronnen. Vijf externe bronnen is
 *     vol. Meer telt niet extra: het verschil tussen vijf en tien externe
 *     bronnen verandert geen advies, het verschil tussen nul en twee wel.
 *   • 30 punten voor het aandeel dat níet de eigen site is. Een merk waar AI
 *     alles van de eigen site haalt, heeft geen reputatie maar een website.
 *   • 20 punten voor een reviewplatform met een BEVESTIGD cijfer. Bevestigd, niet
 *     genoemd: een cijfer uit een AI-antwoord is een gok tot het bewezen is
 *     (§2.4).
 */
export function evidenceScore(sources: EvidenceSource[]): number {
  if (sources.length === 0) return 0;

  const uniek = new Map<string, EvidenceSource>();
  for (const s of sources) {
    const bestaand = uniek.get(s.domain);
    // Bij dubbele domeinen wint de rijkste variant: één bevestigde vermelding
    // maakt het domein bevestigd, ook als hij elders zonder cijfer voorkwam.
    uniek.set(s.domain, {
      ...s,
      isReview: (bestaand?.isReview ?? false) || s.isReview,
      verifiedRating: (bestaand?.verifiedRating ?? false) || s.verifiedRating,
    });
  }
  const lijst = [...uniek.values()];

  const extern = lijst.filter((s) => !s.isOwn);
  const aantalDeel = Math.min(1, extern.length / 5) * 50;
  const aandeelDeel = (extern.length / lijst.length) * 30;
  const reviewDeel = extern.some((s) => s.isReview && s.verifiedRating) ? 20 : 0;

  return Math.round(aantalDeel + aandeelDeel + reviewDeel);
}

/**
 * De eenduidigheid, 0 tot 100: krijg je elke keer hetzelfde antwoord?
 *
 * ⚠️ `null` bij minder dan twee herhalingen. Met één meting is er geen spreiding
 * te berekenen, en 100 invullen ("volledig eenduidig") zou een zekerheid
 * suggereren die alleen bestaat omdat er niets vergeleken is. Alleen de diepe
 * modus vult dit getal (§2.3).
 *
 * Rekent met `binomialStderr()` uit `lib/stats/uncertainty.ts`, waar de meting
 * ook al mee rekent: hoeveel van de herhalingen kwamen op hetzelfde toonlabel
 * uit? Dezelfde "plus vier"-correctie zorgt dat drie van de drie niet als
 * "volstrekt zeker" wegkomt, want dat is het bij drie metingen niet.
 */
export function consistency(toneLabelsPerQuestion: (string | null)[][]): number | null {
  const reeksen = toneLabelsPerQuestion.filter((r) => r.filter(Boolean).length >= 2);
  if (reeksen.length === 0) return null;

  const perReeks = reeksen.map((labels) => {
    const gevuld = labels.filter((l): l is string => Boolean(l));
    const tellingen = new Map<string, number>();
    for (const l of gevuld) tellingen.set(l, (tellingen.get(l) ?? 0) + 1);
    const meest = Math.max(...tellingen.values());

    // Het aandeel dat op het meest voorkomende label uitkwam, min de
    // onzekerheidsmarge die bij dit aantal herhalingen hoort.
    //
    // ⚠️ ÉÉN standaardfout en niet 1,96. Dat is bewust anders dan de
    // 95%-band die de meting om haar score tekent, en de reden is dat dit
    // getal iets anders doet. De band bij de meting is een uitspraak over waar
    // de echte score ligt; dit is een AFTREK voor dun bewijs. Met de volle
    // 1,96 komt drie van de drie dezelfde antwoorden op 49 uit, en "49%
    // eenduidig" bij drie identieke antwoorden is precies zo misleidend als
    // 100 zou zijn, alleen de andere kant op. Met één standaardfout komt
    // hetzelfde geval op 74: hoog, maar niet zeker, en dat is wat drie
    // metingen waard zijn.
    const aandeel = (meest / gevuld.length) * 100;
    const marge = binomialStderr(meest, gevuld.length);
    return Math.max(0, aandeel - marge);
  });

  return Math.round(perReeks.reduce((a, b) => a + b, 0) / perReeks.length);
}

/**
 * Was er genoeg om een uitspraak op te baseren? (§3.3, staat "Mislukt")
 *
 * Onder deze drempel toont het scherm geen half cijfer maar wat er misging, en
 * de knop om opnieuw te proberen. Een cijfer op twee antwoorden is geen cijfer,
 * en zo eentje één keer tonen kost het vertrouwen in alle volgende.
 */
export const MIN_USABLE_ANSWERS = 3;

export function runIsUsable(answers: ScoredAnswer[]): boolean {
  return answers.filter((a) => a.toneScore !== null || a.grounding !== null).length
    >= MIN_USABLE_ANSWERS;
}
