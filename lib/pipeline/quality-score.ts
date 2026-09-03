/**
 * SCORE, ZEKERHEID en BLOKKADE: drie getallen die niet één getal mogen worden
 * (docs/tasks/contentkwaliteit-framework.md §4.4, punt 15 van de opdracht)
 *
 * ── WAAROM ZE UIT ELKAAR MOETEN ─────────────────────────────────────────────
 *
 * Tot 2 september 2026 zat alles in één boolean, `needs_review`. Die stond aan
 * bij een te lage score, bij een verboden woord, bij een onbewezen bewering én
 * bij "er is nog een verbeterpunt open". Vier verschillende situaties met vier
 * verschillende gevolgen, samengeperst tot ja of nee.
 *
 * Wat daardoor niet te zeggen was, en nu wel:
 *
 *   Kwaliteit 91 · zekerheid 72 · één kritieke claim zonder bewijs → niet publiceren.
 *   Kwaliteit 74 · zekerheid 95 · geen blokkade                     → publiceren mag.
 *
 * De eerste pagina is beter geschreven en toch de gevaarlijkere. Zonder drie
 * getallen is dat verschil niet uit te drukken.
 *
 * ── WAAROM DE BLOKKADELIJST KORT MOET BLIJVEN ───────────────────────────────
 *
 * Zes soorten, en niet meer (`UNIVERSELE_REGELS` in `quality-profile.ts`). Elke
 * blokkade erbij is een pagina die niet uitgeleverd wordt, en de eigenaar heeft
 * vastgelegd dat content direct door moet kunnen naar de klant. Blokkeren is
 * daarom voorbehouden aan wat de ondernemer echt schaadt: een onwaarheid over
 * zijn bedrijf, een woord dat hij verboden heeft, of een concurrent op zijn
 * eigen site. Alles wat "kan beter" is, is `REPAIR` en geen `BLOCK`.
 *
 * ── EN WAAROM BLOKKEREN GEEN MUUR IS ────────────────────────────────────────
 *
 * `BLOCK` betekent precies één ding: ORBIT ENGINE noemt deze pagina niet klaar.
 * De klant kan hem lezen, bewerken, kopiëren en zelf publiceren, en de melding
 * noemt in dezelfde zin wat hij eraan kan doen. Dat is dezelfde grens die
 * `content-input-gate.ts` en `content-final-gate.ts` trekken.
 *
 * Bewust ZONDER `server-only` (conventie 2).
 */
import {
  UNIVERSELE_DIMENSIES,
  type QualityDimension,
} from "@/lib/pipeline/quality-dimensions";
import { blokkerendeIssues, type QualityIssue } from "@/lib/pipeline/quality-issue";
import { dimensiesVan, type ContentQualityProfile } from "@/lib/pipeline/quality-profile";

export type QualityVerdict = "pass" | "repair" | "block";

/** Eén dimensie met zijn cijfer. `null` = niet te bepalen, telt nergens in mee. */
export type DimensionScores = Partial<Record<QualityDimension, number | null>>;

export interface QualityEvaluation {
  /** Het gewogen totaal, 0-100. `null` als geen enkele dimensie een cijfer had. */
  score: number | null;
  /** Per dimensie het cijfer dat meewoog. Alleen de dimensies van dit profiel. */
  dimensies: DimensionScores;
  /**
   * Hoe zeker de app van dit oordeel is, 0-100.
   *
   * Het gewogen deel van de dimensies dat een cijfer kreeg. Valt een beoordelaar
   * uit, dan daalt dit getal, en dan zegt de app dat in plaats van te doen alsof
   * de pagina gekeurd is (scenario 11 van de opdracht).
   */
  confidence: number;
  /** Het oordeel. */
  verdict: QualityVerdict;
  /** De bevindingen die publicatie tegenhouden. Leeg bij `pass` en `repair`. */
  blokkades: QualityIssue[];
  /** Waarom dit oordeel, in gewone taal. Altijd gevuld, ook bij `pass`. */
  redenen: string[];
  /** Welke dimensies onder hun eigen ondergrens bleven. */
  onderDeMaat: QualityDimension[];
  /** Welk profiel gewogen heeft. Voor de audit-trail. */
  profiel: string;
}

export interface QualityInput {
  profiel: ContentQualityProfile;
  dimensies: DimensionScores;
  issues: readonly QualityIssue[];
  /**
   * Hoeveel van de beoordelaars een antwoord gaven, en hoeveel er gevraagd zijn.
   *
   * Apart van de dimensies, want een gevallen beoordelaar laat soms wél een
   * dimensie achter (een andere bron vulde hem) en zou de zekerheid dan niet
   * verlagen. Dat is precies de stilte die scenario 11 verbiedt.
   */
  beoordelaars: { geslaagd: number; gevraagd: number };
}

/**
 * Onder deze zekerheid noemt de app een pagina nooit zonder voorbehoud klaar.
 *
 * 60 procent: minder dan drie vijfde van het gewicht kon gemeten worden. Dan is
 * het cijfer geen oordeel meer maar een steekproef, en dat is iets om te melden
 * in plaats van te verzwijgen.
 */
export const MIN_ZEKERHEID = 60;

/**
 * Weegt de dimensies tot één cijfer.
 *
 * Alleen dimensies die dit profiel meeweegt én die een cijfer hebben tellen mee.
 * Een dimensie zonder cijfer verlaagt het gemiddelde dus NIET; hij verlaagt de
 * zekerheid. Dat is het verschil tussen "deze pagina is slecht" en "dit weten we
 * niet", en conventie 3 zegt welke van die twee je mag opschrijven.
 */
export function weegDimensies(
  profiel: ContentQualityProfile,
  dimensies: DimensionScores,
): { score: number | null; gewichtGemeten: number; gewichtTotaal: number } {
  let som = 0;
  let gewichtGemeten = 0;
  let gewichtTotaal = 0;

  for (const dimensie of dimensiesVan(profiel)) {
    const gewicht = profiel.gewichten[dimensie] ?? 0;
    gewichtTotaal += gewicht;
    const cijfer = dimensies[dimensie];
    if (cijfer === null || cijfer === undefined || !Number.isFinite(cijfer)) continue;
    som += Math.min(100, Math.max(0, cijfer)) * gewicht;
    gewichtGemeten += gewicht;
  }

  return {
    score: gewichtGemeten === 0 ? null : Math.round((som / gewichtGemeten) * 10) / 10,
    gewichtGemeten,
    gewichtTotaal,
  };
}

/**
 * Het volledige oordeel over één versie van een pagina.
 *
 * De volgorde is niet willekeurig: eerst blokkades (die winnen altijd), dan de
 * ondergrenzen per dimensie, dan het totaal. Een pagina met een blokkade krijgt
 * dus nooit `pass`, hoe hoog het cijfer ook is.
 */
export function beoordeelKwaliteit(input: QualityInput): QualityEvaluation {
  const { profiel, dimensies, issues, beoordelaars } = input;

  const { score, gewichtGemeten, gewichtTotaal } = weegDimensies(profiel, dimensies);
  const blokkades = blokkerendeIssues(issues);

  // ── Zekerheid ──────────────────────────────────────────────────────────────
  //
  // Twee dingen bepalen hem, en ze vermenigvuldigen: welk deel van het gewicht
  // een cijfer kreeg, en welk deel van de beoordelaars antwoord gaf. Vielen er
  // twee van de vier uit, dan is de helft van het oordeel een gok, ook al staat
  // er toevallig voor elke dimensie een deterministisch cijfer.
  const deelGemeten = gewichtTotaal === 0 ? 0 : gewichtGemeten / gewichtTotaal;
  const deelBeoordeeld =
    beoordelaars.gevraagd === 0 ? 1 : beoordelaars.geslaagd / beoordelaars.gevraagd;
  const confidence = Math.round(deelGemeten * deelBeoordeeld * 100);

  // ── Ondergrenzen per dimensie ─────────────────────────────────────────────
  const onderDeMaat: QualityDimension[] = [];
  for (const [dimensie, ondergrens] of Object.entries(profiel.minimumPerDimensie)) {
    const cijfer = dimensies[dimensie as QualityDimension];
    if (cijfer === null || cijfer === undefined || !Number.isFinite(cijfer)) continue;
    if (cijfer < (ondergrens ?? 0)) onderDeMaat.push(dimensie as QualityDimension);
  }

  const redenen: string[] = [];

  if (blokkades.length > 0) {
    for (const blokkade of blokkades.slice(0, 3)) {
      redenen.push(blokkade.finding);
    }
    if (blokkades.length > 3) {
      redenen.push(`En nog ${blokkades.length - 3} punten die publicatie tegenhouden.`);
    }
    return {
      score,
      dimensies,
      confidence,
      verdict: "block",
      blokkades,
      redenen,
      onderDeMaat,
      profiel: profiel.type,
    };
  }

  const totaalTeLaag = score !== null && score < profiel.minimumTotaal;

  if (totaalTeLaag) {
    redenen.push(
      `De pagina haalt ${Math.round(score!)} van de ${profiel.minimumTotaal} punten die ` +
        `dit soort pagina nodig heeft.`,
    );
  }
  for (const dimensie of onderDeMaat) {
    redenen.push(`Te zwak op één punt dat voor dit soort pagina zwaar telt: ${dimensie}.`);
  }
  if (confidence < MIN_ZEKERHEID) {
    redenen.push(
      `We konden maar een deel van deze pagina beoordelen. Het cijfer is daarom een indicatie.`,
    );
  }

  if (totaalTeLaag || onderDeMaat.length > 0) {
    return {
      score,
      dimensies,
      confidence,
      verdict: "repair",
      blokkades: [],
      redenen,
      onderDeMaat,
      profiel: profiel.type,
    };
  }

  if (redenen.length === 0) {
    redenen.push(
      score === null
        ? "Er zijn geen problemen gevonden."
        : `De pagina voldoet aan de kwaliteitseisen voor dit soort pagina (${Math.round(score)} punten).`,
    );
  }

  return {
    score,
    dimensies,
    confidence,
    verdict: "pass",
    blokkades: [],
    redenen,
    onderDeMaat,
    profiel: profiel.type,
  };
}

/**
 * Eén versie, zoals de versiekeuze hem ziet.
 *
 * `ronde` 0 is het eerste concept; 1, 2, 3 zijn de reparatierondes.
 */
export interface VersieKandidaat {
  ronde: number;
  score: number | null;
  verdict: QualityVerdict;
  blokkades: number;
  confidence: number;
}

/**
 * Welke versie houden we?
 * (punt 20 van de opdracht)
 *
 * ── WAAROM NIET GEWOON DE HOOGSTE SCORE ─────────────────────────────────────
 *
 * De opdracht zegt het zelf: een versie met een iets lagere totaalscore maar
 * zonder blokkade is beter dan een versie met een hogere score en een
 * feitelijkheidsblokkade. Een verzonnen belofte kost de ondernemer zijn
 * geloofwaardigheid; drie punten redactionele kwaliteit kosten hem niets.
 *
 * Vandaar deze volgorde:
 *
 *   1. zo min mogelijk blokkades
 *   2. dan de hoogste score
 *   3. dan de hoogste zekerheid
 *   4. dan de LAAGSTE ronde
 *
 * Die laatste regel is de belangrijkste en de minst vanzelfsprekende: bij
 * gelijke stand wint het OUDSTE concept. Een reparatie die niets verbeterde
 * heeft de tekst wel aangeraakt, en een aanraking zonder verbetering is verlies.
 * Dat is dezelfde regel die `beslisReparatieRonde()` al hanteerde; hier staat
 * hij over alle rondes tegelijk in plaats van tussen twee opeenvolgende.
 */
export function kiesBesteVersie(kandidaten: readonly VersieKandidaat[]): VersieKandidaat | null {
  if (kandidaten.length === 0) return null;
  return [...kandidaten].sort(
    (a, b) =>
      a.blokkades - b.blokkades ||
      (b.score ?? -1) - (a.score ?? -1) ||
      b.confidence - a.confidence ||
      a.ronde - b.ronde,
  )[0];
}

/**
 * Mag deze nieuwe ronde de vorige tekst vervangen?
 *
 * ── ⚠️ DIT IS EEN ANDERE VRAAG DAN `kiesBesteVersie` ────────────────────────
 *
 * Die functie kiest uit een LIJST en breekt een gelijke stand op de laagste
 * ronde, want tussen twee even goede versies is de oudste de betrouwbaarste.
 * Hier gaat het om BEWAREN, en daar geldt de regel die `content-repair-decision.ts`
 * al hanteerde: een gelijk gebleven score is geen verlies, dus de nieuwe versie
 * mag blijven staan. Zou deze functie ook op de laagste ronde breken, dan zou
 * elke reparatie die een concreet punt oplost maar het cijfer niet beweegt,
 * weggegooid worden, en dat is precies de reparatie die je wél wilt.
 *
 * Wat er WÉL bij komt ten opzichte van de oude regel: blokkades gaan vóór de
 * score. Een versie met een punt minder en één blokkade minder is de betere,
 * en andersom is een hogere score met een nieuwe feitelijkheidsblokkade een
 * verslechtering (punt 20 van de opdracht).
 *
 * Geen meetpunt (score `null`) telt als "niet slechter": onbekend is geen
 * onvoldoende (conventie 3).
 */
export function nietSlechterDan(nieuw: VersieKandidaat, beste: VersieKandidaat | null): boolean {
  if (!beste) return true;
  if (nieuw.blokkades !== beste.blokkades) return nieuw.blokkades < beste.blokkades;
  if (nieuw.score === null || beste.score === null) return true;
  return nieuw.score >= beste.score;
}

/**
 * Wat de KLANT leest over deze pagina. Eén alinea, geen cijfers uit het model.
 * (punt 24 en punt 30 van de opdracht)
 *
 * De klantweergave noemt bewust geen dimensiescores. Die zijn voor de adviseur;
 * de klant wil weten of hij kan publiceren en zo niet, waarom niet en wat hij
 * eraan doet. Dat is dezelfde regel die `docs/ux-design.md` §4 stelt: een
 * melding die alleen zegt wat er niet kan, is een dood einde.
 */
export function klantOordeel(evaluatie: QualityEvaluation, informatieDekking: number | null): string {
  const dekking =
    informatieDekking === null
      ? ""
      : ` Van wat deze pagina over jouw bedrijf zegt, kunnen we ${Math.round(informatieDekking)}% onderbouwen.`;

  if (evaluatie.verdict === "block") {
    const eerste = evaluatie.blokkades[0]?.finding ?? "Er staat iets in de tekst dat eerst weg moet.";
    return (
      `Deze pagina kan nog niet naar je site. ${eerste} ` +
      `Pas de tekst zelf aan, of beantwoord de vraag die eronder staat, dan kijken we opnieuw.${dekking}`
    );
  }

  if (evaluatie.verdict === "repair") {
    return (
      `Deze pagina is bijna klaar. ORBIT ENGINE zag nog punten die beter kunnen en werkt eraan. ` +
      `Je kunt hem intussen lezen en zelf aanpassen.${dekking}`
    );
  }

  const voorbehoud =
    evaluatie.confidence < MIN_ZEKERHEID
      ? " We konden niet alles controleren, dus loop hem zelf nog even door."
      : "";
  return `Deze pagina is klaar voor publicatie. De belangrijkste punten zijn gecontroleerd en er zijn geen kritieke problemen gevonden.${dekking}${voorbehoud}`;
}

/**
 * Wat de ADVISEUR leest: dezelfde pagina, met de cijfers erbij.
 *
 * Losse regels en geen alinea, want dit scherm wordt gescand en niet gelezen.
 */
export function adviseurOordeel(
  evaluatie: QualityEvaluation,
  extra: { bewijsdekking: number | null; kritiekeDekking: number | null; ronde: number; besteRonde: number },
): string[] {
  const regels: string[] = [];
  regels.push(
    `Kwaliteit: ${evaluatie.score === null ? "niet te bepalen" : Math.round(evaluatie.score)}` +
      ` (drempel ${evaluatie.profiel})`,
  );
  regels.push(`Zekerheid: ${evaluatie.confidence}%`);
  regels.push(`Oordeel: ${evaluatie.verdict}`);
  if (extra.bewijsdekking !== null) {
    regels.push(`Bewijsdekking: ${Math.round(extra.bewijsdekking)}%`);
  }
  if (extra.kritiekeDekking !== null) {
    regels.push(`Kritieke claims onderbouwd: ${Math.round(extra.kritiekeDekking)}%`);
  }
  regels.push(`Blokkerend: ${evaluatie.blokkades.length}`);
  if (extra.ronde > 0) {
    const rondes = `${extra.ronde} ${extra.ronde === 1 ? "herstelronde" : "herstelrondes"}`;
    regels.push(
      extra.besteRonde === extra.ronde
        ? `${rondes}; de laatste versie is de beste en is behouden.`
        : `${rondes}; versie uit ronde ${extra.besteRonde} was beter en is behouden.`,
    );
  }
  return regels;
}

/**
 * Rekent na dat elke dimensie die dit profiel zwaar laat wegen ook echt gemeten
 * kán worden. Puur, voor `scripts/test-unit.ts`.
 */
export function ongemetenZwareDimensies(
  profiel: ContentQualityProfile,
  dimensies: DimensionScores,
): QualityDimension[] {
  return dimensiesVan(profiel).filter((d) => {
    if ((profiel.gewichten[d] ?? 0) < 3 && !UNIVERSELE_DIMENSIES.includes(d)) return false;
    const cijfer = dimensies[d];
    return cijfer === null || cijfer === undefined;
  });
}
