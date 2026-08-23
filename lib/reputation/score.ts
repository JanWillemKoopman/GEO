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

/**
 * De verdeling van de toonoordelen, en hoe verdeeld ze zijn.
 *
 * ── ⚠️ WAAROM HET GEMIDDELDE ALLEEN NIET VOLDOET ────────────────────────────
 *
 * Gemeten bij Van den Udenhout (23 augustus 2026): tien keer `gemengd`, drie
 * keer `overwegend_positief`, één keer `negatief`. Daar komt een toonindex van
 * +4 uit, en dat heet op het scherm "neutraal".
 *
 * Maar tien keer gemengd is iets compleet anders dan tien keer neutraal, en
 * allebei leveren ze 0 op. Neutraal betekent: er wordt zakelijk over je gepraat,
 * niemand heeft een uitgesproken mening. Gemengd betekent: er is lof én kritiek,
 * en die staan naast elkaar. Het eerste is een merk zonder profiel, het tweede
 * is een merk met een probleem dat je kunt oplossen. Het gemiddelde maakt die
 * twee identiek, en juist het tweede is waar een consultant een uur mee vult.
 *
 * Vandaar dit getal ernaast. Niet in plaats van de index: die blijft waarop je
 * vergelijkt over de tijd. Dit is wat je begrijpt.
 */
export interface ToneDistribution {
  /** Hoe vaak elk label voorkwam. Ook de nullen, want die zijn informatief. */
  counts: Record<string, number>;
  /**
   * 0 tot 100. Hoe verdeeld het beeld is.
   *
   * Nul betekent dat elk antwoord hetzelfde zei. Honderd betekent maximaal
   * verdeeld: even veel uitgesproken positief als uitgesproken negatief. Een
   * merk waar alles `gemengd` is, zit daar tussenin en hoog, want elk los
   * antwoord droeg zelf al twee kanten.
   */
  spread: number;
  /** Hoeveel antwoorden er meetelden. */
  n: number;
}

/**
 * Labels die zelf al twee kanten dragen. Die tellen mee als verdeeldheid, ook
 * als ze in hun eentje voorkomen: "gemengd" is per definitie geen eenstemmigheid.
 */
const GEMENGDE_LABELS = new Set(["gemengd"]);

export function toneDistribution(
  answers: (ScoredAnswer & { tone?: string | null })[],
): ToneDistribution {
  const bruikbaar = answers.filter(usableForTone);
  const counts: Record<string, number> = {};
  for (const a of bruikbaar) {
    const label = a.tone ?? "onbekend";
    counts[label] = (counts[label] ?? 0) + 1;
  }

  const n = bruikbaar.length;
  if (n === 0) return { counts, spread: 0, n: 0 };

  // De spreiding heeft twee bronnen, en ze tellen allebei mee:
  //
  //   1. VERSCHIL TUSSEN antwoorden. Gemeten als de gemiddelde afstand tot de
  //      gemiddelde toonscore, geschaald op de maximale afstand (2 op de schaal
  //      -2..+2). Zeggen alle antwoorden hetzelfde, dan is dit nul.
  //   2. VERDEELDHEID BINNEN een antwoord. Een `gemengd` oordeel droeg zelf al
  //      lof en kritiek. Tien keer gemengd is dus geen eenstemmigheid, ook al
  //      is de afstand tussen die tien nul.
  //
  // Zonder de tweede bron zou een merk waarover iedereen hetzelfde verdeelde
  // verhaal vertelt op spreiding 0 uitkomen, en dat is precies verkeerd om.
  const scores = bruikbaar
    .map((a) => a.toneScore)
    .filter((v): v is number => v !== null);

  let tussen = 0;
  if (scores.length > 1) {
    const gem = scores.reduce((x, y) => x + y, 0) / scores.length;
    const afstand = scores.reduce((s, v) => s + Math.abs(v - gem), 0) / scores.length;
    tussen = Math.min(1, afstand / 2);
  }

  const binnen =
    bruikbaar.filter((a) => GEMENGDE_LABELS.has(a.tone ?? "")).length / n;

  // De twee bronnen tellen even zwaar. Geen van beide alleen dekt de lading:
  // verdeeld tussen antwoorden en verdeeld binnen antwoorden zijn allebei
  // verdeeldheid, en een merk kan het op allebei de manieren zijn.
  return { counts, spread: Math.round(((tussen + binnen) / 2) * 100), n };
}

/**
 * Eén zin over de verdeling, voor onder het hoofdcijfer.
 *
 * ⚠️ Dit is de zin die het verschil maakt tussen een cijfer en een bevinding.
 * "Neutraal" laat een ondernemer schouderophalen; "ChatGPT is verdeeld over je"
 * laat hem doorlezen.
 */
export function spreadSentence(dist: ToneDistribution): string | null {
  if (dist.n < 3) return null;

  const gemengd = dist.counts["gemengd"] ?? 0;
  if (gemengd >= Math.ceil(dist.n / 2)) {
    return (
      `Bij ${gemengd} van de ${dist.n} vragen noemt ChatGPT zowel lof als kritiek. ` +
      `Je hebt dus geen vlak imago maar een verdeeld imago, en dat is iets om aan te werken.`
    );
  }
  if (dist.spread >= 50) {
    return `Het beeld loopt uiteen: niet elk antwoord zegt hetzelfde over je.`;
  }
  if (dist.spread <= 15) {
    return `Het beeld is eenduidig: vrijwel elk antwoord zegt hetzelfde over je.`;
  }
  return null;
}

/**
 * De standaardfout van de toonindex, in punten op de schaal -100..100.
 *
 * ⚠️ `null` bij minder dan drie bruikbare antwoorden. Met twee metingen is een
 * spreiding geen spreiding maar een verschil, en een marge die op niets rust
 * suggereert een precisie die er niet is.
 *
 * De meting op het scherm ernaast toont zijn band al sinds R6.1. Dit scherm
 * toonde "+4" zonder enige marge, en dat is een inconsistentie die een klant
 * ziet zodra hij beide opent.
 */
/**
 * Hoe ver de labels uit elkaar liggen op de schaal van -100 tot 100.
 *
 * De labels zijn 1 punt uit elkaar op de schaal -2..+2 van `tone.ts`, en die
 * wordt maal 50 gedaan. Vandaar 50.
 */
export const LABEL_STAP = 50;

export function toneStderr(answers: ScoredAnswer[]): number | null {
  const scores = answers
    .filter(usableForTone)
    .map((a) => a.toneScore)
    .filter((v): v is number => v !== null);

  if (scores.length < 3) return null;

  const gem = scores.reduce((x, y) => x + y, 0) / scores.length;
  const variantie =
    scores.reduce((s, v) => s + (v - gem) ** 2, 0) / (scores.length - 1);
  // Van de schaal -2..+2 naar -100..+100, dus maal 50.
  const stderrOpSchaal = Math.sqrt(variantie / scores.length) * 50;

  // ⚠️ NUL BESTAAT NIET, en dat is geen afronding maar een meetfeit.
  //
  // Bij de tweede run op Gasservice Brabant kregen alle 24 bruikbare antwoorden
  // hetzelfde label. De spreiding was daarmee exact 0 en de standaardfout dus
  // ook, en dat leest als "dit cijfer is tot op de punt nauwkeurig". Het
  // tegendeel is waar: het betekent dat het instrument geen verschil zág.
  //
  // De ondergrens komt uit de schaal zelf. Het model kiest een van de labels en
  // die liggen 50 punten uit elkaar; de echte toon van een antwoord wordt dus
  // afgerond op de dichtstbijzijnde 50. De spreiding van zo'n afronding is de
  // stapgrootte gedeeld door de wortel uit 12, en de standaardfout van het
  // gemiddelde daarvan is dat gedeeld door de wortel uit het aantal antwoorden.
  // Bij 24 antwoorden levert dat 2,9 punten op in plaats van 0. Die 2,9 is geen
  // sierrand: hij bepaalt of een volgende meting "echt veranderd" mag heten, en
  // met 0 zou elk verschil dat heten.
  const ondergrens = (LABEL_STAP / Math.sqrt(12)) / Math.sqrt(scores.length);
  return Math.round(Math.max(stderrOpSchaal, ondergrens) * 10) / 10;
}

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
  /**
   * Is dit een verzamelsite die zelf niets weet?
   *
   * Autoscout24, Marktplaats, bedrijvengidsen: die halen hun gegevens ergens
   * anders vandaan en tellen daarom niet als onafhankelijke waarneming. Drie
   * verzamelsites die alle drie hetzelfde Klantenvertellen-cijfer overnemen zijn
   * één bron, geen drie.
   */
  isAggregator?: boolean;
}

/**
 * Domeinen boven deze grens leveren geen extra bewijskracht meer op.
 *
 * ⚠️ VERHOOGD VAN 5 NAAR 8 NA DE EERSTE ECHTE RUN. Van den Udenhout kwam op 94
 * van de 100 uit, terwijl er een verzonnen domein tussen de bronnen stond. De
 * oude formule liep vol bij vijf externe domeinen, en vrijwel elk bedrijf met
 * een website haalt dat. Aan de onderkant werkte hij nog wel, dus het vangnet
 * tegen "AI kent je niet" stond overeind, maar aan de bovenkant onderscheidde
 * hij niets meer. Een cijfer dat bijna iedereen haalt, is geen cijfer.
 */
const VOLLE_BREEDTE = 8;

/**
 * De bewijskracht, 0 tot 100.
 *
 * ⚠️ Nul is hier een ECHTE uitkomst en geen ontbrekende waarde: AI praat over je
 * zonder één controleerbare bron. Dat is precies wat de klant moet weten, en
 * daarom is dit getal niet nullable.
 *
 * ── HERBOUWD OP ONAFHANKELIJKHEID (23 augustus 2026) ────────────────────────
 *
 * De oude formule telde bronnen. Dat is de verkeerde vraag, want drie bronnen
 * die allemaal het persbericht van de dealer overschrijven zijn geen drie
 * bronnen. Wat je wilt weten is of er ONAFHANKELIJKE waarnemingen onder het
 * oordeel liggen.
 *
 * Vier delen, en de weging is op wat een klant eraan heeft:
 *
 *   • 40 punten voor het aantal ONAFHANKELIJKE externe bronnen, dus zonder de
 *     eigen site en zonder verzamelsites. Vol bij acht.
 *   • 25 punten voor het aandeel dat niet de eigen site is. Een merk waar AI
 *     alles van de eigen site haalt, heeft geen reputatie maar een website.
 *   • 25 punten voor een reviewplatform met een BEVESTIGD cijfer. Bevestigd, niet
 *     genoemd: een cijfer uit een AI-antwoord is een gok tot de eigen crawler
 *     hem op de pagina heeft teruggevonden.
 *   • 10 punten voor spreiding over meerdere SOORTEN bron. Vijf reviewplatforms
 *     zeggen minder dan een reviewplatform plus vakpers plus een register: dat
 *     laatste is een beeld dat vanuit meerdere hoeken bevestigd wordt.
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
      isAggregator: (bestaand?.isAggregator ?? false) || (s.isAggregator ?? false),
    });
  }
  const lijst = [...uniek.values()];

  const extern = lijst.filter((s) => !s.isOwn);
  const onafhankelijk = extern.filter((s) => !s.isAggregator);

  const aantalDeel = Math.min(1, onafhankelijk.length / VOLLE_BREEDTE) * 40;
  const aandeelDeel = (extern.length / lijst.length) * 25;
  const reviewDeel = extern.some((s) => s.isReview && s.verifiedRating) ? 25 : 0;

  // Spreiding over soorten: hoeveel van de drie hoeken zijn vertegenwoordigd?
  // Een reviewplatform, iets dat geen reviewplatform is, en de eigen site.
  const hoeken = [
    onafhankelijk.some((s) => s.isReview),
    onafhankelijk.some((s) => !s.isReview),
    lijst.some((s) => s.isOwn),
  ].filter(Boolean).length;
  const spreidingDeel = (hoeken / 3) * 10;

  return Math.round(aantalDeel + aandeelDeel + reviewDeel + spreidingDeel);
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
