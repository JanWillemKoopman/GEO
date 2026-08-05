import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { profileProgress, formatEta } from "@/lib/jobs/progress";
import { buildSteps } from "@/lib/pipeline/research-steps";

/**
 * GET /api/profiles/[id]/status — poll-endpoint voor het onderzoeksscherm.
 * Zie de analyse-variant: voortgang komt uit de taakstand (optimalisatie.md 1.6).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile)
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const progress = await profileProgress(admin, id);

  // De stappen mét tussenresultaten (docs/tasks/onboarding-2.0.md §8). Het
  // profiel gaat al op `klaar` na de tweede van zes taken, dus zonder dit ziet
  // de klant lege kaarten terwijl er nog vier taken draaien.
  const [{ data: facetRows }, { count: topics }, { data: auditRow }] =
    await Promise.all([
      admin
        .from("profile_facets")
        .select("facet, summary")
        .eq("profile_id", id),
      admin
        .from("profile_topics")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", id),
      admin
        .from("technical_audits")
        .select("checks_json")
        .eq("profile_id", id)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const facetSummaries: Record<string, string | null> = {};
  for (const row of facetRows ?? []) {
    facetSummaries[row.facet as string] =
      (row.summary as string | null) ?? null;
  }

  const steps = buildSteps({
    pendingByType: progress.pendingByType,
    facetSummaries,
    counts: {
      topics: topics ?? 0,
      auditChecks: Array.isArray(auditRow?.checks_json)
        ? auditRow.checks_json.length
        : 0,
      researchDone: profile.status === "klaar",
    },
  });

  return NextResponse.json({
    status: profile.status,
    pendingJobs: progress.pending,
    runningJobs: progress.running,
    failedJobs: progress.failed,
    retrying: progress.retrying,
    etaText: formatEta(progress.etaSeconds),
    steps,
  });
}
