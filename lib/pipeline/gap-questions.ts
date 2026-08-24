/**
 * De open punten uit de synthese omzetten in vragen die de klant kán
 * beantwoorden.
 *
 * ── WAAROM DEZE MODULE BESTAAT ──────────────────────────────────────────────
 *
 * De synthese schrijft in `gaps` wat het onderzoek niet kon vaststellen. De
 * prompt noemt dat letterlijk "de agenda van het gesprek met de klant", en zo
 * kwam het ook op het scherm: als platte tekst. Bij Van den Udenhout stonden er
 * op die manier tien vragen onder de kop "10 open" zonder één invoerveld
 * eronder. De teller vroeg iets, het scherm nam niets aan.
 *
 * Een open punt is dus geen aparte soort. Het is een feitenvraag die alleen
 * nergens als rij bestond. Sinds 24 augustus 2026 landen ze in `fact_requests`,
 * merkbreed (`analysis_id is null`, `scope: 'merk'`), en dan pakt het bestaande
 * scherm ze op met invoerveld, opslaan en overslaan, via de route die er al lag.
 *
 * Bewust ZONDER `server-only`: de normalisatie hieronder bepaalt wat er in de
 * database belandt, dus hij hoort toetsbaar te zijn vanuit `scripts/test-unit.ts`
 * (conventie 2).
 */

/**
 * Waarom ORBIT ENGINE het vraagt. De synthese levert alleen de vraag, dus deze
 * regel is voor alle open punten dezelfde.
 *
 * ⚠️ Bewust vier woorden. Wat een antwoord oplevert staat al boven het blok
 * ("Wat je hier invult gebruikt ORBIT ENGINE in élke pagina die het schrijft"),
 * en diezelfde zin tien keer onder elkaar herhalen maakt de lijst langer zonder
 * hem duidelijker te maken. Wat hier staat is het enige wat per vraag verschilt
 * van de andere feitenvragen: deze komt niet uit een contentbriefing maar uit
 * wat er niet op de site stond.
 */
export const GAP_REASON = "ORBIT ENGINE kon dit niet op je site vinden.";

/**
 * Hoogstens twaalf. De synthese leverde bij Van den Udenhout tien vragen; een
 * model dat er dertig maakt levert geen agenda meer op maar een formulier, en
 * dan wordt de hele lijst genegeerd.
 */
export const MAX_GAP_QUESTIONS = 12;

/** Langer dan dit is geen vraag van dertig seconden maar een alinea. */
const MAX_QUESTION_CHARS = 200;

/**
 * Het merkje in `raw_json` waaraan je een omgezet open punt herkent. Nodig omdat
 * het antwoord op zo'n vraag ánders opgeslagen wordt, zie `isGapQuestion()`.
 */
export const GAP_SOURCE = "synthese-gap";

/** Eén open punt, klaar om als `fact_requests`-rij weggeschreven te worden. */
export interface GapQuestion {
  question: string;
  reason: string;
  /** Alles wat hier binnenkomt is een open vraag; er is geen keuzelijst. */
  answerType: "tekst_kort";
}

/**
 * De opsomtekens die een model voor een vraag zet. Ze horen niet in de kolom:
 * de rij is de opsomming al, en een streepje in de tekst komt terug in élke
 * plek die de vraag later toont.
 */
const BULLET = /^\s*(?:[-*•–—]|\d+[.)])\s+/;

/** Kleine, veilige normalisatie: witruimte weg, opsomteken weg, meer niet. */
function schoon(tekst: string): string {
  return tekst.replace(BULLET, "").replace(/\s+/g, " ").trim();
}

/**
 * Van ruwe modeluitvoer naar vragen. `raw` is met opzet `unknown`: dit komt uit
 * `raw_json` en dat is precies de plek waar een vorm kan afwijken van wat het
 * schema beloofde (conventie 1, een promptinstructie is een intentie).
 */
export function gapQuestions(
  raw: unknown,
  limit: number = MAX_GAP_QUESTIONS,
): GapQuestion[] {
  if (!Array.isArray(raw)) return [];

  const gezien = new Set<string>();
  const vragen: GapQuestion[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const vraag = schoon(item);
    if (vraag.length === 0 || vraag.length > MAX_QUESTION_CHARS) continue;

    // Hoofdletterongevoelig ontdubbelen. De unieke index in de database staat
    // op de letterlijke tekst, dus twee vragen die alleen in hoofdletters
    // verschillen zouden er allebei in komen en twee keer gesteld worden.
    const sleutel = vraag.toLowerCase();
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);

    vragen.push({ question: vraag, reason: GAP_REASON, answerType: "tekst_kort" });
    if (vragen.length >= limit) break;
  }

  return vragen;
}

/**
 * Komt deze vraag uit een open punt van de synthese?
 *
 * ── WAAROM DAT UITMAAKT ─────────────────────────────────────────────────────
 *
 * Een beantwoorde feitenvraag wordt óók als regel aan `profiles.proof_points`
 * toegevoegd. Dat is voor briefingvragen zinnig, maar voor deze niet, om twee
 * redenen.
 *
 * 1. Het antwoord bereikt de schrijver toch al. `buildFactBase()` leest de
 *    beantwoorde `fact_requests` rechtstreeks, met bron "klant, bevestigd
 *    <datum>". Een proof point krijgt daar de bron "site <url>" mee, en dat is
 *    onwaar: de klant heeft het net verteld, het stond nergens op zijn site.
 * 2. Niet elk open punt is een publiceerbaar feit. De synthese vraagt ook naar
 *    dingen als "welke drie klantgroepen krijgen komend jaar prioriteit", en dat
 *    hoort geen citeerbare bewering in een gepubliceerde pagina te worden.
 *
 * Het antwoord raakt dus niets kwijt; alleen de tweede, slechter gelabelde kopie
 * blijft achterwege.
 */
export function isGapQuestion(rawJson: unknown): boolean {
  return (
    typeof rawJson === "object" &&
    rawJson !== null &&
    (rawJson as { bron?: unknown }).bron === GAP_SOURCE
  );
}
