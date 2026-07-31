/**
 * Per VRAAG tellen in plaats van per meting (implementatieplan.md R6.1,
 * migratie 0031).
 *
 * ── HET PROBLEEM ────────────────────────────────────────────────────────────
 *
 * Sinds R6.1 wordt niet elke vraag even vaak gemeten: de zwaarstwegende vragen
 * gaan drie keer door de meting, de rest één keer. Dat is precies waar we de
 * precisie nodig hebben — maar als de aggregatie blijft tellen in METINGEN, dan
 * gaat een driemaal gemeten vraag ook driemaal zo zwaar meewegen in de score.
 * Dat is het tegenovergestelde van de bedoeling: we wilden die vraag
 * nauwkeuriger meten, niet belangrijker maken.
 *
 * ── DE REGEL ────────────────────────────────────────────────────────────────
 *
 * Elke VRAAG weegt precies 1, hoe vaak hij ook gemeten is. Een meting van een
 * vraag die drie keer gemeten is telt dus voor 1/3. Overal waar de aggregatie
 * metingen telt — winbare vragen, vermeldingen, citaties, concurrentievermeldingen
 * — wordt vanaf nu dit AANDEEL opgeteld in plaats van 1 per rij.
 *
 * Gevolg: een vraag die drie keer gemeten is en twee keer een vermelding
 * opleverde, draagt 2/3 bij. Precies wat je wilt weten — "hier word ik meestal
 * genoemd, maar niet altijd" — in plaats van de munt-worp die één meting is.
 *
 * Zonder herhalingen (alles repeat_index 0) is elk aandeel 1 en komt er
 * getalsmatig exact hetzelfde uit als vóór deze wijziging. Dat is bewust: de
 * historische scores blijven vergelijkbaar met de nieuwe.
 *
 * ── WAAROM EEN APART BESTAND ────────────────────────────────────────────────
 *
 * measure.ts importeert de Supabase-adminclient en is daardoor niet te
 * importeren vanuit het testscript. Deze regel is pure rekenkunde en de kern van
 * hoe de score tot stand komt, dus hoort hij testbaar te zijn — zelfde patroon
 * als period-change.ts / evidence-format.ts.
 */

/** Eén beoordeelde meting, zoals de aggregatie hem kent. */
export interface RunRef {
  runId: string;
  /** Null wanneer de vraag inmiddels verwijderd is; die meting staat dan op zichzelf. */
  promptId: string | null;
}

/**
 * Het gewicht van elke meting binnen z'n eigen vraag: 1 gedeeld door het aantal
 * beoordeelde metingen van diezelfde vraag.
 *
 * Alleen de meegegeven (beoordeelde) metingen tellen als deler. Faalt de
 * beoordeling van herhaling 2 van 3, dan wegen de twee geslaagde elk 1/2 — de
 * vraag blijft in totaal 1 wegen in plaats van 2/3 te verdampen.
 */
export function shareByRun(runs: RunRef[]): Map<string, number> {
  const perPrompt = new Map<string, number>();
  for (const r of runs) {
    const key = r.promptId ?? `run:${r.runId}`;
    perPrompt.set(key, (perPrompt.get(key) ?? 0) + 1);
  }

  const shares = new Map<string, number>();
  for (const r of runs) {
    const key = r.promptId ?? `run:${r.runId}`;
    shares.set(r.runId, 1 / (perPrompt.get(key) ?? 1));
  }
  return shares;
}

/** Som van de aandelen van deze metingen — oftewel: hoeveel VRAGEN is dit? */
export function sumShare(runIds: string[], shares: Map<string, number>): number {
  return runIds.reduce((sum, id) => sum + (shares.get(id) ?? 1), 0);
}

/**
 * Een aantal vragen om aan de klant te tonen (`winnable_runs`, `citation_count`
 * …). De optelling is fractioneel, de kolommen zijn integer, en "2,67 vragen"
 * zegt een klant niets. Afronden op hele vragen dus — maar nooit naar 0 zolang
 * er écht iets geteld is, want "0 keer geciteerd" is een ander bericht dan
 * "zelden geciteerd".
 */
export function roundQuestions(total: number): number {
  if (total <= 0) return 0;
  return Math.max(1, Math.round(total));
}
