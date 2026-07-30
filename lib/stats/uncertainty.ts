/**
 * Hoe zeker is een score? (optimalisatie.md 2.2)
 *
 * De zichtbaarheidsscore is een steekproef: we stellen 30 vragen en tellen in
 * hoeveel antwoorden het merk voorkomt. Een andere set van 30 vragen — of
 * dezelfde 30 vragen op een andere dag — geeft een ander getal, zonder dat er
 * iets veranderd is aan de zichtbaarheid. Zonder die bandbreedte erbij leest de
 * klant ruis als vooruitgang, en dat is precies het soort fout waar een
 * meetinstrument z'n geloofwaardigheid op verliest.
 *
 * Bewust ZONDER `server-only`: pure rekenkunde, testbaar in een kaal script en
 * ook bruikbaar in de browser om een band te tekenen.
 */

/** z-waarde voor een 95%-betrouwbaarheidsinterval. */
export const Z95 = 1.96;

/**
 * Correctie op de geschatte kans vóórdat we de spreiding berekenen
 * (Agresti-Coull, de "plus vier"-regel).
 *
 * Zonder correctie geeft 0 van de 30 een standaardfout van precies 0: de app zou
 * beweren "0%, zonder enige onzekerheid" terwijl 0 van 30 in werkelijkheid
 * prima kan horen bij een echte zichtbaarheid van 5 à 10%. Datzelfde geldt aan
 * de bovenkant bij 30 van de 30. Door bij de berekening van de spreiding te doen
 * alsof er twee successen en twee mislukkingen extra waren, houden we ook aan de
 * randen een eerlijke band over. De GETOONDE score blijft ongecorrigeerd — het
 * gaat hier alleen om de onzekerheid eromheen.
 */
const PSEUDO_SUCCESSES = 2;
const PSEUDO_FAILURES = 2;

/** Op 2 decimalen, want zo staan de kolommen in de database (numeric(5,2)). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Standaardfout van een percentage-score, in PROCENTPUNTEN.
 *
 * `successes` = in hoeveel metingen het merk genoemd werd, `n` = hoeveel
 * metingen er beoordeeld zijn. De 95%-band rond de score is ±1,96 × dit getal.
 *
 * Voorbeeld: 12 van de 30 → score 40%, standaardfout ≈ 8,7 → band ≈ ±17 punten.
 * Dat is groot, en dat hóórt zo bij 30 metingen; het alternatief is niet een
 * smallere band maar meer metingen.
 */
export function binomialStderr(successes: number, n: number): number {
  if (n <= 0) return 0;
  const pAdjusted =
    (successes + PSEUDO_SUCCESSES) / (n + PSEUDO_SUCCESSES + PSEUDO_FAILURES);
  return round2(Math.sqrt((pAdjusted * (1 - pAdjusted)) / n) * 100);
}

/** Eén beoordeelde meting voor de gewogen score. */
export interface WeightedOutcome {
  /** Gewicht van de vraag (volume × commerciële waarde), bevroren op meetmoment. */
  weight: number;
  /** Werd het eigen merk in deze meting genoemd? */
  mentioned: boolean;
}

/**
 * Standaardfout van de GEWOGEN score, in procentpunten.
 *
 * De gewogen score telt niet elke vraag even zwaar mee, en is daardoor
 * onzekerder dan de ongewogen score bij hetzelfde aantal metingen: als één
 * zware vraag omslaat, beweegt het cijfer meer. Dat vangen we met het effectieve
 * aantal metingen (Kish):
 *
 *     n_eff = (Σ w)² / Σ w²
 *
 * Zijn alle gewichten gelijk, dan is n_eff gewoon n en komt er hetzelfde uit als
 * bij `binomialStderr`. Loopt één gewicht ver uit de pas, dan zakt n_eff — 30
 * metingen waarvan er één domineert gedragen zich statistisch als veel minder
 * dan 30 — en wordt de band terecht breder.
 */
export function weightedScoreStderr(outcomes: WeightedOutcome[]): number {
  const usable = outcomes.filter((o) => o.weight > 0);
  if (usable.length === 0) return 0;

  const sumW = usable.reduce((sum, o) => sum + o.weight, 0);
  const sumW2 = usable.reduce((sum, o) => sum + o.weight * o.weight, 0);
  if (sumW <= 0 || sumW2 <= 0) return 0;

  const nEff = (sumW * sumW) / sumW2;
  const p = usable.reduce((sum, o) => sum + (o.mentioned ? o.weight : 0), 0) / sumW;

  // Dezelfde "plus vier"-correctie als hierboven, maar uitgedrukt in het
  // effectieve aantal metingen in plaats van in hele successen.
  const pAdjusted =
    (p * nEff + PSEUDO_SUCCESSES) / (nEff + PSEUDO_SUCCESSES + PSEUDO_FAILURES);
  return round2(Math.sqrt((pAdjusted * (1 - pAdjusted)) / nEff) * 100);
}

/**
 * De ondergrens en bovengrens van de 95%-band, afgekapt op 0–100.
 * Voor de UI: "42% (tussen 25% en 59%)".
 */
export function confidenceBand(
  score: number,
  stderr: number,
): { low: number; high: number; margin: number } {
  const margin = Z95 * stderr;
  return {
    low: Math.max(0, Math.round(score - margin)),
    high: Math.min(100, Math.round(score + margin)),
    margin: Math.round(margin),
  };
}

/**
 * Is het verschil tussen twee periodes écht een verandering, of past het binnen
 * de ruis? (optimalisatie.md 2.3)
 *
 * Twee onafhankelijke metingen: de spreiding van het VERSCHIL is de wortel uit
 * de som van de kwadraten van de losse standaardfouten. Daardoor is de drempel
 * voor "er is echt iets veranderd" ruwweg 1,4× breder dan de band rond één
 * losse score — met 30 metingen zo'n 23 punten. Alles daaronder tonen we als
 * "gelijk gebleven"; een pijltje omhoog bij +4 punten is een leugen met een
 * grafiekje eromheen.
 */
export function changeIsMeaningful(
  current: { score: number; stderr: number },
  previous: { score: number; stderr: number },
): { changed: boolean; delta: number; threshold: number } {
  const delta = current.score - previous.score;
  const combined = Math.sqrt(current.stderr ** 2 + previous.stderr ** 2);
  const threshold = Z95 * combined;
  return {
    changed: Math.abs(delta) > threshold,
    delta: Math.round(delta),
    threshold: Math.round(threshold),
  };
}
