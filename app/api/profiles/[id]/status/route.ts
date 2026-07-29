import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { profileProgress, formatEta } from "@/lib/jobs/progress";

/**
 * GET /api/profiles/[id]/status — poll-endpoint voor het onderzoeksscherm.
 * Zie de analyse-variant: voortgang komt uit de taakstand (optimalisatie.md 1.6).
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const progress = await profileProgress(admin, id);

  return NextResponse.json({
    status: profile.status,
    pendingJobs: progress.pending,
    runningJobs: progress.running,
    failedJobs: progress.failed,
    retrying: progress.retrying,
    etaText: formatEta(progress.etaSeconds),
  });
}
