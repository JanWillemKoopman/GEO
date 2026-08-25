/**
 * Het merkcijfer per meetperiode: één rekensom voor drie blokken.
 *
 * ── ⚠️ WAAROM DIT BESTAAT (25 AUGUSTUS 2026) ────────────────────────────────
 *
 * Op het overzicht van Gasservice Brabant stond de zichtbaarheid in drie
 * getallen tegelijk: "57%" in de standkaart, "je zichtbaarheid steeg van 30 naar
 * 60" in de regel eronder, en "+30 punten, van 30 naar 60" in het opbrengstblok.
 * Eén onderwerp, drie cijfers, en geen enkele aanwijzing welk cijfer nu zijn
 * zichtbaarheid was.
 *
 * De oorzaak was niet een tikfout maar drie rekensommen. De standkaart nam
 * `weighted_score` en woog de clusters op `winnable_runs`; `lib/insights-data.ts`
 * en `lib/milestones-data.ts` namen allebei de ONGEWOGEN `score` en middelden
 * de clusters ongewogen. Bij één cluster verschilt dat al 3 punten (57 tegen
 * 60), bij meerdere clusters loopt het verder uiteen.
 *
 * Hier valt de som één keer. Wie het merkcijfer nodig heeft, roept dit aan.
 *
 * ── DE GEWOGEN SCORE IS DE MAAT, EN DAT IS EEN KEUZE ────────────────────────
 *
 * `weighted_score` weegt elke vraag met haar volumeband en koopwaarde
 * (`lib/pipeline/prompt-weight.ts`): genoemd worden bij een vraag die vaak
 * gesteld wordt telt zwaarder dan bij een vraag die bijna niemand stelt. Dat is
 * het getal dat Analytics toont en dus het getal dat de klant kent. De
 * ongewogen `score` blijft de basis voor de potentiescore, want die zou anders
 * het zoekvolume dubbel meetellen (zie `lib/potential.ts`).
 *
 * Ontbreekt de gewogen score, dan valt de som terug op de ongewogen, met de
 * bijbehorende onzekerheid. Nooit de een met de onzekerheid van de ander.
 *
 * Puur, dus testbaar (conventie 2). Geen `server-only`.
 */

/** Precies de kolommen die de som gebruikt. Smal, zodat een test geen hele rij nabouwt. */
export interface BrandScoreRow {
  analysis_id: string;
  week_no: number;
  score: number | string;
  weighted_score?: number | string | null;
  score_stderr?: number | string | null;
  weighted_stderr?: number | string | null;
  /** Vragen waarbij dit merk kón winnen. De weegfactor tussen clusters. */
  winnable_runs?: number | null;
  /** Vragen die daadwerkelijk beoordeeld zijn. Dit is wat het scherm noemt. */
  judged_runs?: number | null;
  computed_at?: string | null;
}

export interface BrandPeriod {
  /** `week_no`, oplopend. Ondanks de naam is dit een maandelijkse ronde. */
  period: number;
  /** 0 tot 100, gewogen over de clusters. */
  score: number;
  /** De standaardfout van dat gemiddelde. Nul betekent: niet bekend. */
  stderr: number;
  /** Hoeveel vragen er in deze periode beoordeeld zijn, over alle clusters. */
  vragen: number;
  /** Wanneer deze ronde doorgerekend werd. De laatste binnen de periode. */
  gemetenOp: string | null;
}

/**
 * Het merkcijfer per periode, gewogen op het aantal vragen per cluster.
 *
 * ⚠️ Een cluster met vijf metingen telt lichter mee dan een met negentig. Zonder
 * die weging bepaalt een piepklein cluster met een toevallige uitschieter het
 * merkcijfer, en dan beweegt de startpagina op ruis.
 */
export function brandScorePerPeriod(rows: BrandScoreRow[]): BrandPeriod[] {
  const perPeriode = new Map<number, BrandScoreRow[]>();
  for (const r of rows) {
    const lijst = perPeriode.get(r.week_no) ?? [];
    lijst.push(r);
    perPeriode.set(r.week_no, lijst);
  }

  const uitkomst: BrandPeriod[] = [];
  for (const [period, lijst] of perPeriode) {
    let som = 0;
    let gewicht = 0;
    let varianceSom = 0;
    let vragen = 0;
    let gemetenOp: string | null = null;

    for (const r of lijst) {
      const gewogen = getal(r.weighted_score);
      const waarde = gewogen ?? getal(r.score) ?? 0;
      // De onzekerheid hoort bij de waarde die gekozen is. Een gewogen score met
      // de ongewogen standaardfout ernaast is een marge die nergens over gaat.
      const se = (gewogen !== null ? getal(r.weighted_stderr) : getal(r.score_stderr)) ?? 0;
      const w = Math.max(1, r.winnable_runs ?? 1);

      som += waarde * w;
      gewicht += w;
      varianceSom += (se * w) ** 2;
      vragen += r.judged_runs ?? 0;
      if (r.computed_at && (gemetenOp === null || r.computed_at > gemetenOp)) {
        gemetenOp = r.computed_at;
      }
    }

    if (gewicht === 0) continue;
    uitkomst.push({
      period,
      score: som / gewicht,
      stderr: Math.sqrt(varianceSom) / gewicht,
      vragen,
      gemetenOp,
    });
  }

  return uitkomst.sort((a, b) => a.period - b.period);
}

/**
 * De numerieke kolommen komen als string uit Postgres. `null` blijft `null`:
 * conventie 3, een ontbrekende gewogen score mag geen 0 worden, want dan zou
 * een merk dat overal genoemd wordt plotseling op nul staan.
 */
function getal(waarde: number | string | null | undefined): number | null {
  if (waarde === null || waarde === undefined) return null;
  const n = Number(waarde);
  return Number.isFinite(n) ? n : null;
}
