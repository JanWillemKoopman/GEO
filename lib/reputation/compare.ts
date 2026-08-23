/**
 * TWEE METINGEN NAAST ELKAAR (§8, sprint R5).
 *
 * Bewust ZONDER `server-only` (conventie 2): dit bepaalt wat de klant als
 * vooruitgang leest, dus het hoort testbaar te zijn in `scripts/test-unit.ts`.
 *
 * ── ⚠️ DE HELE WAARDE VAN DIT ONDERDEEL ZIT IN WAT HET WEIGERT TE ZEGGEN ────
 *
 * Dit product wordt verkocht op herhaling: over een kwartaal nog een keer, en
 * dan het verschil. Dat maakt dit bestand het gevaarlijkste van de hele module,
 * want een pijltje omhoog bij een verschil dat ruis is, is een leugen met een
 * grafiekje eromheen. De toonindex van de run op Gasservice Brabant had een
 * standaardfout van 2,6 punten; twee van zulke metingen naast elkaar hebben een
 * drempel van ongeveer 7 punten. Alles daaronder is "gelijk gebleven", hoe
 * graag een consultant ook iets anders zou voorlezen.
 *
 * Daarom drie sloten, en ze staan alle drie in code en niet in een prompt:
 *
 * 1. Andere meetlat, geen uitspraak. `comparableRuns()` weigert twee runs met
 *    een verschillende `instrument_version`. Werkt OpenAI het model bij, dan
 *    verschuift de lat en niet de reputatie.
 * 2. Geen marge, geen uitspraak. Zonder standaardfout aan beide kanten valt niet
 *    te zeggen of een verschil buiten de ruis valt, en dan blijft de uitspraak
 *    leeg (conventie 3: onbekend is beter dan verkeerd).
 * 3. Andere scope, een kanttekening. Zijn er andere diensten gemeten, dan is het
 *    verschil deels een ander vraagstuk. Dat is precies waarvoor `scope_json`
 *    bij de start wordt vastgelegd.
 */
import { changeIsMeaningful, binomialStderr } from "@/lib/stats/uncertainty";
import { comparableRuns, instrumentWarning } from "@/lib/reputation/instrument";

/** Wat er van een run nodig is om hem met een andere te vergelijken. */
export interface RunSnapshot {
  startedAt: string;
  instrumentVersion: string | null;
  toneIndex: number | null;
  toneStderr: number | null;
  evidenceScore: number | null;
  marketHitRate: number | null;
  /** De noemer onder die trefkans. Zonder noemer geen vergelijking. */
  marketAnswers: number | null;
  marketPosition: number | null;
  strengths: string[];
  weaknesses: string[];
  marketRivals: string[];
  /** De id's van de aanbodknopen die meegingen, uit `scope_json`. */
  nodeIds: string[];
}

/**
 * Hoeveel punten bewijskracht een verschil moet zijn voordat we het tonen.
 *
 * De bewijskracht is een samengesteld cijfer uit vier termen (40/25/25/10 in
 * `score.ts`), zonder standaardfout. Eén reviewplatform dat deze keer wél
 * aangehaald wordt schuift hem al met 8 punten, en dat is geen verbeterde
 * reputatie maar een andere zoekopdracht. Tien punten is ruwweg "een hele bron
 * erbij of eraf", en dat is het kleinste dat de klant iets zegt.
 */
export const EVIDENCE_MIN_DELTA = 10;

/**
 * ⚠️ HIER STOND EEN VASTE DREMPEL VAN 0,66 EN DIE WAS FOUT.
 *
 * De redenering erachter klopte niet: de marktvraag zou drie keer gesteld
 * worden, dus zou de kleinste stap 33 procentpunt zijn. In werkelijkheid telt
 * de trefkans ook de marktvraag per dienst mee, dus bij een standaardanalyse
 * gaat het over ongeveer vijftien antwoorden en is de kleinste stap 7
 * procentpunt. Met een drempel van 0,66 zou de sprong van 0,17 naar 0,36 die
 * de twee runs op Gasservice Brabant lieten zien onzichtbaar zijn gebleven, en
 * dat is precies het getal waar dit product op verkocht wordt: word je genoemd
 * als een koper vraagt wie hij moet hebben.
 *
 * De trefkans is een aandeel over een bekend aantal antwoorden, en daar bestaat
 * echte rekenkunde voor. `binomialStderr()` uit `lib/stats/uncertainty.ts` geeft
 * hem zijn bandbreedte, dezelfde functie die de zichtbaarheidsscore op het
 * scherm ernaast zijn marge geeft. Vandaar dat er nu een noemer wordt
 * meegegeven (`marketAnswers`, migratie 0064) in plaats van een vuistregel.
 *
 * Gevonden door de uitkomst van twee echte runs naast elkaar te leggen, niet
 * door een test (conventie 10).
 */

export interface RunComparison {
  previousAt: string;
  /** Rusten beide metingen op dezelfde meetlat? */
  comparable: boolean;
  /** Wat de klant leest als dat niet zo is. Null als er niets aan de hand is. */
  warning: string | null;
  /** Het toonverschil. ⚠️ null = geen uitspraak mogelijk, niet "gelijk gebleven". */
  tone: { delta: number; meaningful: boolean; threshold: number } | null;
  /** Waarom er geen toonuitspraak is, in gewone taal. Null als er wel een is. */
  toneUnknown: string | null;
  /** Verschil in bewijskracht, alleen gevuld als het boven de drempel uitkomt. */
  evidenceDelta: number | null;
  /** Verschil in trefkans op de marktvraag, in procentpunten, boven de drempel. */
  hitRateDelta: number | null;
  newWeaknesses: string[];
  goneWeaknesses: string[];
  newStrengths: string[];
  newRivals: string[];
  goneRivals: string[];
  /** Zijn er andere diensten gemeten dan de vorige keer? */
  scopeChanged: boolean;
}

function schoon(lijst: string[]): string[] {
  return lijst.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Wat staat er in a en niet in b, hoofdletterongevoelig vergeleken. */
function nieuwIn(a: string[], b: string[]): string[] {
  const bekend = new Set(schoon(b).map((s) => s.toLowerCase()));
  return schoon(a).filter((s) => !bekend.has(s.toLowerCase()));
}

export function compareRuns(current: RunSnapshot, previous: RunSnapshot): RunComparison {
  const comparable = comparableRuns(current.instrumentVersion, previous.instrumentVersion);

  // ── De toon ───────────────────────────────────────────────────────────────
  //
  // ⚠️ `meaningful` kan alleen waar zijn als de meetlat gelijk is. Anders zou
  // een modelwijziging bij OpenAI op het scherm komen als "je reputatie is
  // gestegen", en daar neemt iemand een beslissing op.
  let tone: RunComparison["tone"] = null;
  let toneUnknown: string | null = null;
  if (current.toneIndex === null || previous.toneIndex === null) {
    toneUnknown =
      "Bij een van beide metingen kwam er te weinig bruikbaars terug om een toon te bepalen, " +
      "dus er valt niets te vergelijken.";
  } else if (current.toneStderr === null || previous.toneStderr === null) {
    toneUnknown =
      "Een van beide metingen heeft geen betrouwbaarheidsmarge. Zonder marge is niet te zeggen " +
      "of een verschil echt is of toeval, en dan noemen we het liever niets.";
  } else {
    const uitkomst = changeIsMeaningful(
      { score: current.toneIndex, stderr: current.toneStderr },
      { score: previous.toneIndex, stderr: previous.toneStderr },
    );
    tone = { ...uitkomst, meaningful: comparable && uitkomst.changed };
  }

  // ── De twee cijfers zonder marge ──────────────────────────────────────────
  //
  // Voor bewijskracht en trefkans bestaat geen standaardfout, dus daar geldt een
  // vaste drempel. Onder die drempel geven we `null` en niet het getal: een
  // verschil tonen en er "maar het stelt niets voor" bij zetten leest als een
  // verschil, hoe je het ook opschrijft.
  const evidenceRuw =
    current.evidenceScore !== null && previous.evidenceScore !== null
      ? current.evidenceScore - previous.evidenceScore
      : null;
  const evidenceDelta =
    evidenceRuw !== null && comparable && Math.abs(evidenceRuw) >= EVIDENCE_MIN_DELTA
      ? Math.round(evidenceRuw)
      : null;

  // De trefkans is een aandeel, dus hij krijgt de binomiale marge van de
  // zichtbaarheidsscore. Ontbreekt de noemer aan één kant, dan is er geen
  // uitspraak; runs van vóór migratie 0064 hebben hem niet.
  let hitRateDelta: number | null = null;
  if (
    comparable &&
    current.marketHitRate !== null &&
    previous.marketHitRate !== null &&
    current.marketAnswers !== null &&
    previous.marketAnswers !== null &&
    current.marketAnswers > 0 &&
    previous.marketAnswers > 0
  ) {
    const nu = current.marketHitRate * 100;
    const toen = previous.marketHitRate * 100;
    const uitkomst = changeIsMeaningful(
      {
        score: nu,
        stderr: binomialStderr(
          Math.round(current.marketHitRate * current.marketAnswers),
          current.marketAnswers,
        ),
      },
      {
        score: toen,
        stderr: binomialStderr(
          Math.round(previous.marketHitRate * previous.marketAnswers),
          previous.marketAnswers,
        ),
      },
    );
    if (uitkomst.changed) hitRateDelta = uitkomst.delta;
  }

  // ── De scope ──────────────────────────────────────────────────────────────
  const nu = [...new Set(current.nodeIds)].sort();
  const toen = [...new Set(previous.nodeIds)].sort();
  const scopeChanged =
    nu.length > 0 && toen.length > 0 && (nu.length !== toen.length || nu.some((n, i) => n !== toen[i]));

  return {
    previousAt: previous.startedAt,
    comparable,
    warning: instrumentWarning(current.instrumentVersion, previous.instrumentVersion),
    tone,
    toneUnknown,
    evidenceDelta,
    hitRateDelta,
    newWeaknesses: nieuwIn(current.weaknesses, previous.weaknesses),
    goneWeaknesses: nieuwIn(previous.weaknesses, current.weaknesses),
    newStrengths: nieuwIn(current.strengths, previous.strengths),
    newRivals: nieuwIn(current.marketRivals, previous.marketRivals),
    goneRivals: nieuwIn(previous.marketRivals, current.marketRivals),
    scopeChanged,
  };
}

/**
 * De ene zin die boven het vergelijkingsblok staat.
 *
 * ⚠️ Zegt bij twijfel "gelijk gebleven" en niet "licht gestegen". Richtlijn 8
 * van `docs/schrijfstijl.md`: bewijs boven belofte.
 */
export function compareSentence(c: RunComparison, merk: string): string {
  const datum = new Date(c.previousAt).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (c.tone === null) {
    return `Er is een eerdere meting van ${datum}, maar de toon is niet te vergelijken. ${c.toneUnknown ?? ""}`.trim();
  }

  if (!c.comparable) {
    return (
      `Sinds ${datum} staat de toon over ${merk} ${c.tone.delta > 0 ? "hoger" : c.tone.delta < 0 ? "lager" : "gelijk"}, ` +
      `${Math.abs(c.tone.delta)} punten. Wat dat verschil betekent is niet te zeggen: er is met een andere ` +
      `versie van de meting gewerkt.`
    );
  }

  if (!c.tone.meaningful) {
    return (
      `Sinds ${datum} is de toon over ${merk} gelijk gebleven. Het verschil is ${Math.abs(c.tone.delta)} ` +
      `punten en dat valt binnen de meetruis; er is ${c.tone.threshold} punten nodig voordat je van een ` +
      `verandering kunt spreken.`
    );
  }

  return (
    `Sinds ${datum} is de toon over ${merk} echt ${c.tone.delta > 0 ? "beter" : "slechter"} geworden: ` +
    `${c.tone.delta > 0 ? "+" : ""}${c.tone.delta} punten, buiten de meetruis van ${c.tone.threshold} punten.`
  );
}

/**
 * Een opgeslagen run omzetten naar wat de vergelijking nodig heeft.
 *
 * Staat hier en niet in het scherm, zodat het uitlezen van `scope_json` één
 * eigenaar heeft. Dat veld is vrije JSON, dus een defensieve lezing: wat er niet
 * in staat levert een lege lijst op en daarmee géén scope-kanttekening, in
 * plaats van een valse.
 */
export function snapshotFromRun(run: {
  started_at: string;
  instrument_version: string | null;
  tone_index: number | null;
  tone_stderr: number | null;
  evidence_score: number | null;
  market_hit_rate: number | null;
  market_answers: number | null;
  market_position: number | null;
  strengths: string[];
  weaknesses: string[];
  market_rivals: string[];
  scope_json: unknown | null;
}): RunSnapshot {
  const scope = run.scope_json as { nodes?: { id?: unknown }[] } | null;
  const nodeIds = Array.isArray(scope?.nodes)
    ? scope.nodes.map((n) => (typeof n?.id === "string" ? n.id : "")).filter(Boolean)
    : [];

  return {
    startedAt: run.started_at,
    instrumentVersion: run.instrument_version,
    toneIndex: run.tone_index,
    toneStderr: run.tone_stderr,
    evidenceScore: run.evidence_score,
    marketHitRate: run.market_hit_rate,
    marketAnswers: run.market_answers,
    marketPosition: run.market_position,
    strengths: run.strengths ?? [],
    weaknesses: run.weaknesses ?? [],
    marketRivals: run.market_rivals ?? [],
    nodeIds,
  };
}
