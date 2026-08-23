/**
 * De budgetpoort van de reputatieanalyse (§2.3 en §7).
 *
 * Bewust ZONDER `server-only`, anders dan `lib/pipeline/onboarding-budget.ts`
 * (conventie 2). Het OORDEEL ("past deze stap er nog in, en wat schrijven we op
 * als hij niet past") bepaalt wat de klant op zijn scherm ziet, en dat hoort
 * testbaar te zijn vanuit `scripts/test-unit.ts`. Alleen het optellen zelf heeft
 * de database nodig, en dat is de laatste functie in dit bestand.
 *
 * ── HET PLAFOND IS EEN REM, GEEN DOEL ───────────────────────────────────────
 *
 * De volledige standaardanalyse landt op ongeveer $0,54, dus rond de €0,50 (§5).
 * Het plafond staat op €3. Dat is dus ruim, met opzet: het plafond is er niet om
 * de kosten te sturen maar om een ongeluk te vangen. Een merk met heel veel
 * online aanwezigheid laat elke gegronde vraag meer invoertokens ophalen, en een
 * vergelijking zoekt naar vier bedrijven in plaats van één. In het ongunstigste
 * scenario uit §5 komt de standaardmodus op €0,63 en de diepe op €1,55, en dan
 * is er nog steeds ruimte.
 *
 * ── ⚠️ DE VOLGORDE VAN DE STAPPEN IS OP DIT PLAFOND ONTWORPEN ───────────────
 *
 * De vergelijking per aanbodknoop draait als LAATSTE zware blok, ná de reputatie
 * per knoop. Loopt het budget onverwacht vol, dan valt de vergelijking weg en
 * blijft de basisanalyse overeind, in plaats van andersom. Dat is niet iets wat
 * deze module afdwingt maar wat `reputation_start` doet bij het inplannen; deze
 * module maakt het alleen mogelijk door vóór elke zware taak opnieuw te tellen
 * in plaats van alleen aan het begin.
 *
 * ── OVERSLAAN IS EEN UITKOMST, GEEN STILTE ──────────────────────────────────
 *
 * Wordt een stap overgeslagen, dan komt dat in `reputation_runs.notes` en gaat
 * de run op `budget_op` in plaats van op `klaar`. De klant ziet dan een cijfer
 * met een kanttekening in plaats van een cijfer dat doet alsof er niets aan de
 * hand was.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Het plafond per run, in euro. Hard in code, precies zoals §2.3 het vraagt. */
export const RUN_BUDGET_EUR = 3;

/**
 * Wisselkoers voor de vertaling van het plafond naar dollars.
 *
 * Bewust een vaste, licht conservatieve waarde en geen live koers: een
 * budgetplafond dat met de koers meebeweegt is niet uit te leggen en niet te
 * testen. Aan de veilige kant afgerond, zodat het plafond eerder iets te vroeg
 * dan iets te laat sluit.
 */
export const EUR_TO_USD = 1.08;

export function budgetUsd(eur: number = RUN_BUDGET_EUR): number {
  return Number((eur * EUR_TO_USD).toFixed(2));
}

/**
 * Wat een zware taak ongeveer kost, in USD. Uit de rekensom van §5.
 *
 * De schatting mag ruw zijn: hij hoeft alleen te voorkomen dat een dure stap
 * begint met een paar cent over. Te voorzichtig zijn kost een stap, te
 * optimistisch zijn kost geld, en bij twijfel wint voorzichtig.
 */
export const STEP_COST_USD = {
  /**
   * Blok A: 1 ongegronde plus 4 gegronde vragen, plus 5 beoordelingen.
   *
   * ⚠️ Alle bedragen hieronder zijn op 23 augustus 2026 NAGEREKEND tegen
   * `ai_calls` op de eerste echte run, en lagen hoger dan de schatting: een
   * gegronde vraag kost $0,021 tot $0,023 en niet $0,015. De oorzaak is dat
   * web-zoeken pagina's ophaalt die als invoer meetellen. Ze staan nu op de
   * gemeten waarde, want een budgetpoort die met te lage bedragen rekent, laat
   * een stap beginnen die er niet meer in past.
   */
  brand: 0.10,
  /** Blok B: één vraag tegen het gedeelde corpus plus de beoordeling. Ongegrond, dus goedkoop. */
  offering: 0.004,
  /** Blok V: één gegronde vergelijking plus de beoordeling. Per rotatie. */
  compare: 0.025,
  /** Blok C: twee gegronde vragen plus één indeling. De crawl is gratis. */
  sources: 0.045,
  /** Blok D: één aanroep op de kwaliteitstier. */
  synthesis: 0.008,
  /**
   * Blok M: de open marktvraag, per herhaling. Gegrond, dus zelfde orde als een
   * vergelijking. Gemeten op de eerste echte run: $0,021 tot $0,023 per gegronde
   * vraag, dus de oude schatting van $0,015 was te laag en die is bijgesteld.
   */
  market: 0.023,
  /** Blok E: één onderzoeksronde die het gedeelde corpus vult. Meerdere zoekacties. */
  evidence: 0.09,
} as const;

export type ReputationStep = keyof typeof STEP_COST_USD;

export interface BudgetDecision {
  /** Mag deze stap draaien? */
  ok: boolean;
  /** Wat er nog over is, in USD. Negatief betekent eroverheen. */
  remainingUsd: number;
  /** De notitie voor `reputation_runs.notes`. Leeg als de stap gewoon mag. */
  note: string | null;
}

/** Wat de klant leest per overgeslagen stap. Geen jargon, wel precies. */
const STAP_NAAM: Record<ReputationStep, string> = {
  brand: "de merkbrede vragen",
  offering: "de vragen per dienst",
  compare: "de vergelijking met je concurrenten",
  sources: "het onderzoek naar je bronnen",
  synthesis: "de samenvatting",
  market: "de vraag wie AI aanraadt in jouw markt",
  evidence: "het achtergrondonderzoek",
};

/**
 * Past deze stap er nog in?
 *
 * ⚠️ `spentUsd` mag `Infinity` zijn. Dat is wat de teller teruggeeft als hij niet
 * kán tellen, en dan sluit de poort. Nul teruggeven bij een storing zou de poort
 * juist stil openzetten, en dan is de rem er precies niet op het moment dat er
 * iets aan de hand is. Dezelfde keuze als in `onboarding-budget.ts`.
 */
export function decideStep(args: {
  step: ReputationStep;
  spentUsd: number;
  budgetEur?: number;
  /** Hoeveel keer deze stap nog moet draaien. Standaard één. */
  times?: number;
}): BudgetDecision {
  const plafond = budgetUsd(args.budgetEur ?? RUN_BUDGET_EUR);
  const nodig = STEP_COST_USD[args.step] * Math.max(1, args.times ?? 1);
  const over = Number.isFinite(args.spentUsd)
    ? Number((plafond - args.spentUsd).toFixed(6))
    : 0;

  if (over >= nodig) return { ok: true, remainingUsd: over, note: null };

  return {
    ok: false,
    remainingUsd: over,
    note:
      `Het budget van deze analyse was op, dus ${STAP_NAAM[args.step]} zijn overgeslagen. ` +
      `Het cijfer hieronder rust daardoor op minder vragen.`,
  };
}

/**
 * Wat er tot nu toe aan deze run is uitgegeven, in USD.
 *
 * Telt `ai_calls.cost_usd` waar `reputation_run_id` gevuld is. Die kolom is het
 * hele punt van migratie 0062: zonder hem is niet te tellen wat één run kostte
 * en is dit plafond niet af te dwingen.
 */
export async function spentOnRunUsd(
  admin: SupabaseClient,
  runId: string,
): Promise<number> {
  const { data, error } = await admin
    .from("ai_calls")
    .select("cost_usd")
    .eq("reputation_run_id", runId);

  if (error) {
    // Kan de poort niet tellen, dan doet hij niet alsof hij het weet: oneindig
    // uitgegeven laat hem sluiten. Zie de toelichting bij `decideStep`.
    console.error(`Kosten van reputatierun ${runId} optellen mislukt: ${error.message}`);
    return Number.POSITIVE_INFINITY;
  }

  return (data ?? []).reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);
}
