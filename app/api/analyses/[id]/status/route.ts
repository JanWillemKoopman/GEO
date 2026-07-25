import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/analyses/[id]/status — lichte poll-endpoint voor de voortgangsschermen.
 * Leest via de user-sessie (RLS = ownership). Geeft de status + coarse voortgang
 * (onderwerp-onderzoek/prompts voor A1'-A2, gemeten prompts voor A3) zodat de UI server-
 * state-gedreven is (abcplan.md §3.7), niet client-animatie.
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const [{ count: researchCount }, { count: promptCount }, { count: activePromptCount }, { count: measuredCount }] =
    await Promise.all([
      supabase.from("topic_research").select("id", { count: "exact", head: true }).eq("analysis_id", id),
      supabase.from("prompts").select("id", { count: "exact", head: true }).eq("analysis_id", id),
      supabase
        .from("prompts")
        .select("id", { count: "exact", head: true })
        .eq("analysis_id", id)
        .eq("active", true),
      supabase
        .from("tracking_runs")
        .select("id", { count: "exact", head: true })
        .eq("analysis_id", id)
        .eq("week_no", 0)
        .not("mention_json", "is", null),
    ]);

  return NextResponse.json({
    status: analysis.status,
    hasTopicResearch: (researchCount ?? 0) > 0,
    promptCount: promptCount ?? 0,
    activePromptCount: activePromptCount ?? 0,
    measuredCount: measuredCount ?? 0,
  });
}
