import "server-only";

/**
 * Wat er veranderd is sinds de vorige periode (optimalisatie.md 6.2).
 *
 * Het periodieke rapport moet vooral het VERSCHIL beschrijven: welke vragen
 * erbij gekomen zijn, welke verloren, welke concurrent oprukt. Een rapport dat
 * elke maand opnieuw de stand beschrijft, wordt na twee keer niet meer gelezen —
 * en dan zijn alle meetkosten daarna weggegooid geld.
 *
 * Dit is pure database-vergelijking, geen AI-aanroep. De uitkomst gaat als
 * gestructureerd blok de rapportopdracht in, zodat het model niet zelf twee
 * periodes hoeft te vergelijken (dat gaat mis) maar alleen hoeft te verwoorden
 * wat er staat.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { changeIsMeaningful } from "@/lib/stats/uncertainty";
import type { VisibilityScore, CompetitorBreakdown } from "@/lib/types/database";
import type { PeriodChange } from "@/lib/pipeline/period-change-format";

export type { PeriodChange } from "@/lib/pipeline/period-change-format";
export { buildChangeBlock, isWorthEmailing } from "@/lib/pipeline/period-change-format";

type Admin = SupabaseClient;

/**
 * Vergelijkt deze periode met de vorige. Geeft null als er geen vorige is —
 * dan is er niets te vergelijken en blijft het rapport een beschrijving.
 */
export async function computePeriodChange(
  admin: Admin,
  analysisId: string,
  weekNo: number,
): Promise<PeriodChange | null> {
  if (weekNo <= 0) return null;

  const { data: scoreRows } = await admin
    .from("visibility_scores")
    .select("*")
    .eq("analysis_id", analysisId)
    .lte("week_no", weekNo)
    .order("week_no", { ascending: false })
    .limit(2);

  const scores = (scoreRows ?? []) as VisibilityScore[];
  const current = scores.find((s) => s.week_no === weekNo);
  const previous = scores.find((s) => s.week_no < weekNo);
  if (!current || !previous) return null;

  // Dezelfde regel als op het dashboard (2.3): een verschil telt pas als het
  // buiten de ruis valt. Anders schrijft het rapport over een stijging die er
  // statistisch niet is — precies de overclaim die het ongeloofwaardig maakt.
  const lead = (s: VisibilityScore) => s.weighted_score ?? s.score;
  const stderr = (s: VisibilityScore) =>
    (s.weighted_score != null ? s.weighted_stderr : s.score_stderr) ?? 0;

  const change = changeIsMeaningful(
    { score: lead(current), stderr: stderr(current) },
    { score: lead(previous), stderr: stderr(previous) },
  );

  const [won, lost] = await comparePrompts(admin, analysisId, previous.week_no, weekNo);
  const competitors = await compareCompetitors(admin, analysisId, previous.week_no, weekNo);

  return {
    previousWeek: previous.week_no,
    scoreDelta: change.delta,
    scoreMeaningful: change.changed,
    scoreThreshold: change.threshold,
    won,
    lost,
    ...competitors,
  };
}

/** Per vraag: nu wél genoemd terwijl het eerder niet zo was, en andersom. */
async function comparePrompts(
  admin: Admin,
  analysisId: string,
  fromWeek: number,
  toWeek: number,
): Promise<[string[], string[]]> {
  const [before, after] = await Promise.all([
    promptMentionState(admin, analysisId, fromWeek),
    promptMentionState(admin, analysisId, toWeek),
  ]);

  const won: string[] = [];
  const lost: string[] = [];

  for (const [text, mentioned] of after) {
    const was = before.get(text);
    // Alleen vragen die in BEIDE periodes beoordeeld zijn (0.2): een vraag die
    // vorige keer niet beoordeeld werd, is geen gewonnen of verloren vraag maar
    // een dataprobleem.
    if (was === undefined) continue;
    if (mentioned && !was) won.push(text);
    if (!mentioned && was) lost.push(text);
  }

  return [won, lost];
}

/**
 * Per vraagTEKST of het eigen merk genoemd werd.
 *
 * Op de tekst en niet op `prompt_id`, want de snapshot is wat er gemeten is en
 * de prompt kan intussen aangepast of verwijderd zijn. De tekst is bovendien wat
 * er in het rapport moet komen te staan.
 */
async function promptMentionState(
  admin: Admin,
  analysisId: string,
  weekNo: number,
): Promise<Map<string, boolean>> {
  const { data: runs } = await admin
    .from("tracking_runs")
    .select("id, prompt_text_snapshot")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo)
    .eq("purpose", "periodic");

  const list = runs ?? [];
  if (list.length === 0) return new Map();

  const { data: mentions } = await admin
    .from("tracking_run_mentions")
    .select("tracking_run_id, mentioned")
    .eq("is_own_brand", true)
    .in(
      "tracking_run_id",
      list.map((r) => r.id as string),
    );

  const byRun = new Map<string, boolean>();
  for (const m of mentions ?? []) {
    const id = m.tracking_run_id as string;
    byRun.set(id, byRun.get(id) === true || Boolean(m.mentioned));
  }

  const out = new Map<string, boolean>();
  for (const r of list) {
    const judged = byRun.get(r.id as string);
    if (judged !== undefined) out.set(r.prompt_text_snapshot as string, judged);
  }
  return out;
}

/** Welke concurrenten rukten op, welke zakten weg, welke zijn nieuw? */
async function compareCompetitors(
  admin: Admin,
  analysisId: string,
  fromWeek: number,
  toWeek: number,
): Promise<Pick<PeriodChange, "competitorsUp" | "competitorsDown" | "newCompetitors">> {
  const { data } = await admin
    .from("competitor_breakdown")
    .select("competitor_name, mentions_count, week_no")
    .eq("analysis_id", analysisId)
    .in("week_no", [fromWeek, toWeek]);

  const rows = (data ?? []) as Pick<
    CompetitorBreakdown,
    "competitor_name" | "mentions_count" | "week_no"
  >[];

  const before = new Map(
    rows.filter((r) => r.week_no === fromWeek).map((r) => [r.competitor_name, r.mentions_count]),
  );
  const after = new Map(
    rows.filter((r) => r.week_no === toWeek).map((r) => [r.competitor_name, r.mentions_count]),
  );

  const up: { name: string; delta: number }[] = [];
  const down: { name: string; delta: number }[] = [];
  const newOnes: string[] = [];

  for (const [name, count] of after) {
    if (!before.has(name)) {
      newOnes.push(name);
      continue;
    }
    const delta = count - before.get(name)!;
    if (delta > 0) up.push({ name, delta });
    if (delta < 0) down.push({ name, delta });
  }

  return {
    competitorsUp: up.sort((a, b) => b.delta - a.delta),
    competitorsDown: down.sort((a, b) => a.delta - b.delta),
    newCompetitors: newOnes,
  };
}
