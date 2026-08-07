import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { analysisProgress, formatEta } from "@/lib/jobs/progress";

/**
 * GET /api/analyses/[id]/status, poll-endpoint voor de voortgangsschermen.
 *
 * Leest nu ook de TAAKSTAND (optimalisatie.md 1.6). Dat is het verschil tussen
 * "voortgang omdat deze browser het werk startte" en "voortgang omdat er werk
 * loopt", de tweede klopt ook als de klant het scherm nooit opende.
 *
 * `jobs` staat op deny-all in RLS, dus dit gaat via de service-role client mét
 * expliciete eigenaarscontrole (zelfde patroon als de kosten-route).
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const [{ count: researchCount }, { count: promptCount }, { count: activePromptCount }, { count: measuredCount }, progress] =
    await Promise.all([
      admin.from("topic_research").select("id", { count: "exact", head: true }).eq("analysis_id", id),
      admin.from("prompts").select("id", { count: "exact", head: true }).eq("analysis_id", id),
      admin
        .from("prompts")
        .select("id", { count: "exact", head: true })
        .eq("analysis_id", id)
        .eq("active", true),
      admin
        .from("tracking_runs")
        .select("id", { count: "exact", head: true })
        .eq("analysis_id", id)
        .eq("week_no", 0)
        // Alleen de gewone meting telt in "Vragen stellen (x van y)". Een
        // hermeting ná publicatie draagt ook week_no 0 en zou de teller boven
        // het totaal aantal vragen kunnen duwen.
        .eq("purpose", "periodic")
        .not("mention_json", "is", null),
      analysisProgress(admin, id),
    ]);

  return NextResponse.json({
    status: analysis.status,
    hasTopicResearch: (researchCount ?? 0) > 0,
    promptCount: promptCount ?? 0,
    activePromptCount: activePromptCount ?? 0,
    measuredCount: measuredCount ?? 0,
    // Taakstand: klopt ook als dit scherm het werk nooit gestart heeft.
    pendingJobs: progress.pending,
    runningJobs: progress.running,
    failedJobs: progress.failed,
    retrying: progress.retrying,
    attempts: progress.attempts,
    etaText: formatEta(progress.etaSeconds),
  });
}
