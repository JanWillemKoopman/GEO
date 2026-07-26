import "server-only";

/**
 * De antwoorden van één meetperiode ophalen (optimalisatie.md 3A).
 *
 * De app slaat elk AI-antwoord volledig op in `tracking_runs.raw_response`. Dat
 * werd precies één keer gelezen — door de classificatie — en daarna nooit meer.
 * De klant zag alleen een score en balkjes, terwijl het letterlijke antwoord het
 * overtuigendste is wat het systeem bezit: "kijk, dít antwoordt ChatGPT op jouw
 * belangrijkste vraag, en het noemt drie keer je concurrent en jou niet."
 *
 * Eén query-set voor het hele tabblad, want per rij nabestellen zou bij 30
 * vragen 90 losse queries opleveren.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NEUTRAL_WEIGHT } from "@/lib/pipeline/prompt-weight";
import { volumeBandOf, type VolumeBand } from "@/lib/pipeline/volume";

export interface AnswerCompetitor {
  name: string;
  position: number | null;
}

export interface AnswerRow {
  runId: string;
  promptId: string | null;
  prompt: string;
  category: string;
  weight: number;
  volumeBand: VolumeBand;
  /** Null = de beoordeling is mislukt; dat is iets anders dan "niet genoemd". */
  ownMentioned: boolean | null;
  ownPosition: number | null;
  competitors: AnswerCompetitor[];
  sources: string[];
  answer: string | null;
}

export interface AnswersData {
  weekNo: number;
  rows: AnswerRow[];
  ownLabel: string;
  /** Alle namen waarop we in de tekst markeren dat het over het eigen merk gaat. */
  ownTerms: string[];
}

/**
 * Haalt de antwoorden op van de opgegeven periode, of van de LAATSTE periode als
 * er geen meegegeven is.
 */
export async function loadAnswers(
  supabase: SupabaseClient,
  analysisId: string,
  profileId: string,
  weekNo?: number,
): Promise<AnswersData | null> {
  let period = weekNo;
  if (period == null) {
    const { data: latest } = await supabase
      .from("tracking_runs")
      .select("week_no")
      .eq("analysis_id", analysisId)
      .order("week_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return null;
    period = latest.week_no as number;
  }

  const { data: runRows } = await supabase
    .from("tracking_runs")
    .select("id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, prompt_weight, raw_response")
    .eq("analysis_id", analysisId)
    .eq("week_no", period);

  const runs = runRows ?? [];
  if (runs.length === 0) return null;

  const runIds = runs.map((r) => r.id as string);

  const [{ data: mentionRows }, { data: promptRows }, { data: profileRow }] = await Promise.all([
    supabase.from("tracking_run_mentions").select("*").in("tracking_run_id", runIds),
    // Voor de volumeband: die staat op de prompt en niet op de meting, want de
    // klant kan hem bijstellen ná de meting.
    supabase.from("prompts").select("id, volume_band, volume_estimate").eq("analysis_id", analysisId),
    supabase.from("profiles").select("brand_name, aliases").eq("id", profileId).maybeSingle(),
  ]);

  const bandByPrompt = new Map(
    (promptRows ?? []).map((p) => [p.id as string, volumeBandOf(p as never)]),
  );

  const byRun = new Map<string, typeof mentionRows>();
  for (const m of mentionRows ?? []) {
    const list = byRun.get(m.tracking_run_id as string) ?? [];
    list.push(m);
    byRun.set(m.tracking_run_id as string, list);
  }

  const rows: AnswerRow[] = runs.map((run) => {
    const mentions = byRun.get(run.id as string) ?? [];
    const own = mentions.filter((m) => m.is_own_brand);
    // Zelfde regel als in de aggregatie (optimalisatie.md 0.3): genoemd wint van
    // niet-genoemd. Anders zou een tweede eigen-merk-rij hier een ander verhaal
    // vertellen dan de score op het overzicht, en dat ondermijnt allebei.
    const ownHit = own.find((m) => m.mentioned) ?? own[0] ?? null;

    const competitors = mentions
      .filter((m) => !m.is_own_brand && m.mentioned)
      .map((m) => ({ name: m.entity_name as string, position: (m.position as number | null) ?? null }))
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

    const sources = Array.from(new Set(mentions.flatMap((m) => (m.cited_sources ?? []) as string[])));

    return {
      runId: run.id as string,
      promptId: (run.prompt_id as string | null) ?? null,
      prompt: run.prompt_text_snapshot as string,
      category: run.prompt_category_snapshot as string,
      weight: Number(run.prompt_weight ?? NEUTRAL_WEIGHT),
      volumeBand: bandByPrompt.get(run.prompt_id as string) ?? "midden",
      ownMentioned: ownHit ? Boolean(ownHit.mentioned) : null,
      ownPosition: (ownHit?.position as number | null) ?? null,
      competitors,
      sources,
      answer: (run.raw_response as string | null) ?? null,
    };
  });

  const brandName = (profileRow?.brand_name as string | null) ?? null;
  const aliases = (profileRow?.aliases as string[] | null) ?? [];

  return {
    weekNo: period,
    rows,
    ownLabel: brandName ?? "Jouw merk",
    ownTerms: [brandName, ...aliases].filter((t): t is string => Boolean(t && t.trim())),
  };
}
