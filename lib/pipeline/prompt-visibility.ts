import "server-only";

/**
 * De zichtbaarheid per PROMPT, over alle zichtbare clusters heen, voor de
 * prompttabel op Analytics → Zichtbaarheid in AI (22 september 2026).
 *
 * ── WAAROM DIT NIET GEWOON `loadAnswers()` IS ───────────────────────────────
 *
 * `loadAnswers()` (`lib/pipeline/answers.ts`) geeft één rij per METING, voor
 * één cluster. Deze tabel toont één rij per VRAAG, over alle clusters die de
 * filterbalk toont, gesorteerd op zichtbaarheid. Bij herhaalde metingen
 * (`repeat_index`) van dezelfde vraag zou `loadAnswers()` die vraag meerdere
 * keren tonen; hier tellen ze samen tot één percentage.
 *
 * ── WELKE RONDE PER CLUSTER ──────────────────────────────────────────────
 *
 * De aanroeper geeft per cluster de week mee die ook de clustertabel toont
 * (`r.laatste.week_no`, al bepaald door de periode- en bronfilter op
 * `page.tsx`). Zo staat hier nooit een ander getal dan in "Per cluster"
 * ernaast.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NEUTRAL_WEIGHT } from "@/lib/pipeline/prompt-weight";

export interface PromptVisibilityCompetitor {
  name: string;
  position: number | null;
}

export interface PromptVisibilityRow {
  /** `null` als de vraag zelf niet meer bestaat; de tekst blijft bevroren op de meting. */
  promptId: string | null;
  prompt: string;
  category: string;
  clusterId: string;
  clusterName: string;
  weight: number;
  /** Aantal metingen met een geoordeeld eigen-merk-resultaat (conventie 3: ongeoordeeld telt niet mee). */
  judgedRuns: number;
  mentionedRuns: number;
  /** Percentage van `judgedRuns` waarin het eigen merk genoemd werd, of `null` zonder geoordeelde meting. */
  score: number | null;
  /** Van de meest recente meting van deze vraag, voor het uitklapbare antwoord. */
  ownMentioned: boolean | null;
  answer: string | null;
  competitors: PromptVisibilityCompetitor[];
  sources: string[];
}

export interface PromptVisibilityRonde {
  analysisId: string;
  clusterName: string;
  weekNo: number;
}

export async function loadPromptVisibility(
  supabase: SupabaseClient,
  rondes: PromptVisibilityRonde[],
  bronnen: string[],
): Promise<PromptVisibilityRow[]> {
  if (rondes.length === 0) return [];

  const weekByAnalysis = new Map(rondes.map((r) => [r.analysisId, r.weekNo]));
  const clusterNameByAnalysis = new Map(rondes.map((r) => [r.analysisId, r.clusterName]));

  const { data: runRows } = await supabase
    .from("tracking_runs")
    .select(
      "id, analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, prompt_weight, week_no, repeat_index, raw_response",
    )
    .in(
      "analysis_id",
      rondes.map((r) => r.analysisId),
    )
    .eq("purpose", "periodic")
    .in("engine", bronnen);

  // Per cluster hoort maar één week mee te tellen: de week die de
  // clusterrij ernaast ook toont. `.in("analysis_id", …)` haalt alle weken op,
  // dus die selectie moet hier in JS, niet in de query.
  const runs = (runRows ?? []).filter((r) => r.week_no === weekByAnalysis.get(r.analysis_id as string));
  if (runs.length === 0) return [];

  const runIds = runs.map((r) => r.id as string);
  const { data: mentionRows } = await supabase
    .from("tracking_run_mentions")
    .select("tracking_run_id, is_own_brand, mentioned, entity_name, position, cited_sources")
    .in("tracking_run_id", runIds);

  const mentionsByRun = new Map<string, NonNullable<typeof mentionRows>>();
  for (const m of mentionRows ?? []) {
    const list = mentionsByRun.get(m.tracking_run_id as string) ?? [];
    list.push(m);
    mentionsByRun.set(m.tracking_run_id as string, list);
  }

  interface Acc {
    clusterId: string;
    clusterName: string;
    prompt: string;
    category: string;
    weight: number;
    judged: number;
    mentioned: number;
    /** De meest recente meting van deze vraag, voor het uitklapbare antwoord. */
    beste: { repeatIndex: number; runId: string } | null;
  }
  const perPrompt = new Map<string, Acc>();

  for (const run of runs) {
    const key = (run.prompt_id as string | null) ?? `run:${run.id as string}`;
    const mentions = mentionsByRun.get(run.id as string) ?? [];
    const own = mentions.filter((m) => m.is_own_brand);
    const ownHit = own.find((m) => m.mentioned) ?? own[0] ?? null;

    let acc = perPrompt.get(key);
    if (!acc) {
      acc = {
        clusterId: run.analysis_id as string,
        clusterName: clusterNameByAnalysis.get(run.analysis_id as string) ?? "",
        prompt: run.prompt_text_snapshot as string,
        category: run.prompt_category_snapshot as string,
        weight: Number(run.prompt_weight ?? NEUTRAL_WEIGHT),
        judged: 0,
        mentioned: 0,
        beste: null,
      };
      perPrompt.set(key, acc);
    }
    if (ownHit) {
      acc.judged += 1;
      if (ownHit.mentioned) acc.mentioned += 1;
    }
    const repeatIndex = (run.repeat_index as number | null) ?? 0;
    if (!acc.beste || repeatIndex >= acc.beste.repeatIndex) {
      acc.beste = { repeatIndex, runId: run.id as string };
    }
  }

  return [...perPrompt.entries()].map(([key, acc]) => {
    const representatief = runs.find((r) => r.id === acc.beste?.runId) ?? null;
    const mentions = representatief ? mentionsByRun.get(representatief.id as string) ?? [] : [];
    const own = mentions.filter((m) => m.is_own_brand);
    const ownHit = own.find((m) => m.mentioned) ?? own[0] ?? null;
    const competitors = mentions
      .filter((m) => !m.is_own_brand && m.mentioned)
      .map((m) => ({ name: m.entity_name as string, position: (m.position as number | null) ?? null }))
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    const sources = Array.from(new Set(mentions.flatMap((m) => (m.cited_sources ?? []) as string[])));

    return {
      promptId: key.startsWith("run:") ? null : key,
      prompt: acc.prompt,
      category: acc.category,
      clusterId: acc.clusterId,
      clusterName: acc.clusterName,
      weight: acc.weight,
      judgedRuns: acc.judged,
      mentionedRuns: acc.mentioned,
      score: acc.judged > 0 ? Math.round((acc.mentioned / acc.judged) * 100) : null,
      ownMentioned: ownHit ? Boolean(ownHit.mentioned) : null,
      answer: (representatief?.raw_response as string | null) ?? null,
      competitors,
      sources,
    };
  });
}
