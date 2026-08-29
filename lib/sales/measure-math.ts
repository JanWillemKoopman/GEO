/**
 * De rekensom over de vermeldingen: wie is hoe zichtbaar in deze markt?
 * (`docs/tasks/geo-prospect-engine.md` §7.2, hoofdstuk 10, 11 en 13)
 *
 * ── WAAROM DIT PUUR IS EN GEEN QUERY ────────────────────────────────────────
 *
 * Conventie 2, en scherper dan elders. Deze getallen dragen straks een zin in
 * een verkoopmail: "bij de negen vragen over aankoopbegeleiding word je nul keer
 * genoemd". Zo'n zin gaat naar een ondernemer die zijn eigen markt kent en die
 * hem naast zijn eigen beeld legt. Een rekenfout hier is niet een verkeerd
 * cijfer op een scherm, het is een verkoper die met de mond vol tanden staat.
 *
 * Vandaar: geen SQL met aggregaties, maar rijen inlezen en de som hier maken,
 * waar `scripts/test-unit.ts` hem regel voor regel kan narekenen tegen een vaste
 * meetset.
 *
 * ── DE ENE FOUT DIE HIER HET VAAKST GEMAAKT WORDT ───────────────────────────
 *
 * De noemer. Een vraag die niet gemeten is, is géén vraag waarin het bedrijf
 * niet genoemd werd. Viel de meting van vier van de veertig vragen om, dan is de
 * noemer zesendertig en niet veertig, anders zakt elk bedrijf in de markt even
 * hard en lijkt de markt onzichtbaarder dan hij is. Elke deling in dit bestand
 * telt daarom ANTWOORDEN en geen vragen.
 *
 * ── DE EENHEID ──────────────────────────────────────────────────────────────
 *
 * Alle aandelen en marges zijn breuken van 0 tot 1, ook `stderr`. De helpers in
 * `lib/stats/uncertainty.ts` rekenen in procentpunten (0 tot 100); dat wordt hier
 * één keer omgerekend en verder nergens meer, zodat er geen twee eenheden door
 * de module lopen.
 */
import { binomialStderr, weightedScoreStderr } from "@/lib/stats/uncertainty";
import { INTENT_STAGES, type IntentStage } from "@/lib/sales/intents";

/** Één gestelde vraag, zoals hij in de meting stond. */
export interface MeetVraag {
  id: string;
  intentLabel: string;
  stage: IntentStage;
  /** Bevroren op het moment dat de vragen zijn vastgesteld. */
  weight: number;
}

/** Één antwoord van één engine op één vraag. */
export interface MeetAntwoord {
  id: string;
  questionId: string;
  engine: string;
  /** De brondomeinen die deze engine bij dit antwoord aanhaalde. */
  sources?: string[];
}

/** Eén oordeel: is dit bedrijf in dit antwoord genoemd? */
export interface MeetVermelding {
  answerId: string;
  companyId: string;
  mentioned: boolean;
  position?: number | null;
  role?: string | null;
  /** De bronnen die specifiek dít bedrijf onderbouwen. */
  sources?: string[];
}

/** Wat er per intentie of per fase te zeggen valt. */
export interface DeelScore {
  vragen: number;
  vermeldingen: number;
  /** Breuk van 0 tot 1. */
  share: number;
}

export interface BedrijfScore {
  companyId: string;
  /** De engine, of `alle` voor het gecombineerde beeld. */
  engine: string;
  questionsTotal: number;
  mentions: number;
  /** Breuk van 0 tot 1. */
  share: number;
  /** Hetzelfde aandeel, gewogen naar de commerciële waarde van de vragen. */
  weightedShare: number;
  /** De onzekerheidsmarge van de gewogen score, als breuk van 0 tot 1. */
  stderr: number;
  /** Gemiddelde plek in het antwoord, of `null` als het bedrijf nooit genoemd is. */
  avgPosition: number | null;
  perIntent: Record<string, DeelScore>;
  perStage: Record<string, DeelScore>;
  /** De brondomeinen die dit bedrijf onderbouwen, met hun frequentie. */
  sources: { domain: string; count: number }[];
}

/** De vaste naam van de rij die alle engines samen neemt. */
export const ENGINE_ALLE = "alle";

/**
 * Het gecombineerde beeld hoort een RIJ te zijn en geen som op het scherm.
 *
 * Het gecombineerde cijfer is de noemer van bijna elke opportunityregel uit
 * hoofdstuk 12. Zou het scherm hem zelf uitrekenen, dan zijn er twee plekken die
 * hetzelfde getal maken, en twee plekken die hetzelfde getal maken lopen uit
 * elkaar. Dat is niet theoretisch: precies dat ging bij de klantmeting mis met
 * het aandeel per vraag.
 */
function leegScore(companyId: string, engine: string): BedrijfScore {
  return {
    companyId,
    engine,
    questionsTotal: 0,
    mentions: 0,
    share: 0,
    weightedShare: 0,
    stderr: 0,
    avgPosition: null,
    perIntent: {},
    perStage: {},
    sources: [],
  };
}

function afgerond(waarde: number): number {
  return Number(waarde.toFixed(5));
}

/**
 * De scores van één ronde: per bedrijf per engine, plus de rij `alle`.
 *
 * `bedrijven` is de volledige lijst uit de markt en niet alleen de genoemde
 * bedrijven. Dat is wezenlijk: een bedrijf dat in geen enkel antwoord voorkomt
 * is precies de prospect waar deze module naar zoekt (opportunitytype 1), en dat
 * bedrijf heeft geen enkele vermeldingsrij. Zou de functie over de vermeldingen
 * lopen in plaats van over de bedrijven, dan verdwijnt hij uit de uitkomst en is
 * hij onvindbaar in plaats van onzichtbaar.
 */
export function rekenScores(
  bedrijven: string[],
  vragen: MeetVraag[],
  antwoorden: MeetAntwoord[],
  vermeldingen: MeetVermelding[],
): BedrijfScore[] {
  const vraagPerId = new Map(vragen.map((v) => [v.id, v]));

  // Alleen antwoorden op vragen die we kennen. Een antwoord op een vraag die
  // niet meer bestaat, hoort niet in de noemer.
  const bruikbaar = antwoorden.filter((a) => vraagPerId.has(a.questionId));

  const engines = Array.from(new Set(bruikbaar.map((a) => a.engine))).sort();
  const perAntwoord = new Map(bruikbaar.map((a) => [a.id, a]));

  // De vermeldingen per bedrijf, en alleen de vermeldingen die bij een bruikbaar
  // antwoord horen.
  const perBedrijf = new Map<string, MeetVermelding[]>();
  for (const m of vermeldingen) {
    if (!perAntwoord.has(m.answerId)) continue;
    const lijst = perBedrijf.get(m.companyId) ?? [];
    lijst.push(m);
    perBedrijf.set(m.companyId, lijst);
  }

  const uit: BedrijfScore[] = [];
  for (const companyId of bedrijven) {
    const vanBedrijf = perBedrijf.get(companyId) ?? [];
    const genoemdIn = new Map(vanBedrijf.map((m) => [m.answerId, m]));

    for (const engine of [...engines, ENGINE_ALLE]) {
      const relevant =
        engine === ENGINE_ALLE ? bruikbaar : bruikbaar.filter((a) => a.engine === engine);
      if (relevant.length === 0) {
        uit.push(leegScore(companyId, engine));
        continue;
      }
      uit.push(rekenEen(companyId, engine, relevant, vraagPerId, genoemdIn));
    }
  }
  return uit;
}

function rekenEen(
  companyId: string,
  engine: string,
  antwoorden: MeetAntwoord[],
  vraagPerId: Map<string, MeetVraag>,
  genoemdIn: Map<string, MeetVermelding>,
): BedrijfScore {
  const score = leegScore(companyId, engine);
  score.questionsTotal = antwoorden.length;

  const gewogen: { weight: number; mentioned: boolean }[] = [];
  const posities: number[] = [];
  const bronnen = new Map<string, number>();

  // De deelscores per intentie en per fase. Ze worden hier opgebouwd en niet
  // achteraf gefilterd, zodat de noemer per intentie exact de antwoorden telt
  // die er waren, en niet de vragen die er hadden moeten zijn.
  const intentTeller = new Map<string, { vragen: number; vermeldingen: number }>();
  const stageTeller = new Map<string, { vragen: number; vermeldingen: number }>();

  for (const antwoord of antwoorden) {
    const vraag = vraagPerId.get(antwoord.questionId);
    if (!vraag) continue;

    const m = genoemdIn.get(antwoord.id);
    const genoemd = Boolean(m?.mentioned);

    if (genoemd) {
      score.mentions += 1;
      if (typeof m?.position === "number" && m.position > 0) posities.push(m.position);
      for (const bron of m?.sources ?? []) {
        const d = bron.trim().toLowerCase();
        if (d) bronnen.set(d, (bronnen.get(d) ?? 0) + 1);
      }
    }

    gewogen.push({ weight: vraag.weight, mentioned: genoemd });

    const i = intentTeller.get(vraag.intentLabel) ?? { vragen: 0, vermeldingen: 0 };
    i.vragen += 1;
    if (genoemd) i.vermeldingen += 1;
    intentTeller.set(vraag.intentLabel, i);

    const s = stageTeller.get(vraag.stage) ?? { vragen: 0, vermeldingen: 0 };
    s.vragen += 1;
    if (genoemd) s.vermeldingen += 1;
    stageTeller.set(vraag.stage, s);
  }

  score.share = afgerond(score.mentions / score.questionsTotal);

  const somGewicht = gewogen.reduce((som, g) => som + g.weight, 0);
  const somGenoemd = gewogen.reduce((som, g) => som + (g.mentioned ? g.weight : 0), 0);
  score.weightedShare = somGewicht > 0 ? afgerond(somGenoemd / somGewicht) : 0;

  // De marge van de GEWOGEN score, want dat is het cijfer waarop de detectie in
  // sprint 4 draait. Van procentpunten naar een breuk, één keer, hier.
  score.stderr = afgerond(weightedScoreStderr(gewogen) / 100);

  score.avgPosition =
    posities.length > 0
      ? Number((posities.reduce((s, p) => s + p, 0) / posities.length).toFixed(2))
      : null;

  for (const [label, t] of intentTeller) {
    score.perIntent[label] = {
      vragen: t.vragen,
      vermeldingen: t.vermeldingen,
      share: afgerond(t.vermeldingen / t.vragen),
    };
  }
  // De fases in de volgorde van de klantreis en niet in de volgorde waarin ze
  // toevallig langskwamen: dit object gaat zo het scherm op.
  for (const stage of INTENT_STAGES) {
    const t = stageTeller.get(stage);
    if (!t) continue;
    score.perStage[stage] = {
      vragen: t.vragen,
      vermeldingen: t.vermeldingen,
      share: afgerond(t.vermeldingen / t.vragen),
    };
  }

  score.sources = Array.from(bronnen.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    .slice(0, 25);

  return score;
}

/**
 * De ongewogen marge, voor een scherm dat "18 van de 36" toont.
 *
 * Apart van `stderr` op de score, want die is gewogen. Twee marges door elkaar
 * halen is een subtiele fout met een luid gevolg: de gewogen marge is bijna
 * altijd breder, en wie hem naast een ongewogen cijfer zet, toont een band die
 * niet bij dat cijfer hoort.
 */
export function ongewogenMarge(vermeldingen: number, antwoorden: number): number {
  return afgerond(binomialStderr(vermeldingen, antwoorden) / 100);
}

/**
 * Het brondomeinlandschap van de hele markt: welke domeinen haalt de AI hier
 * structureel aan?
 *
 * Dit is de noemer onder opportunitytype 6 (source gap): een bedrijf dat niet
 * voorkomt in de bronnen die deze markt bepalen, mist iets buiten zijn eigen
 * website. Zonder dit marktbeeld is "jouw bedrijf staat in geen van de bronnen"
 * een bewering zonder maatstaf.
 */
export function marktBronnen(antwoorden: MeetAntwoord[]): { domain: string; count: number }[] {
  const teller = new Map<string, number>();
  for (const a of antwoorden) {
    // Per antwoord telt een domein één keer. Een engine die dezelfde bron drie
    // keer aanhaalt in één antwoord maakt die bron niet drie keer belangrijker.
    const uniek = new Set((a.sources ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean));
    for (const d of uniek) teller.set(d, (teller.get(d) ?? 0) + 1);
  }
  return Array.from(teller.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}
