import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/analyses/[id]/report — plant het rapport in (optimalisatie.md 1.4).
 *
 * Normaal gesproken hóéft deze route niet aangeroepen te worden: de aggregatie-
 * taak ketent zelf door naar het rapport zodra de meting klaar is (1.5). Dit is
 * de handmatige ingang voor een retry nadat het rapport definitief mislukte.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  try {
    if (analysis.status === "mislukt") {
      await admin.from("analyses").update({ status: "gemeten" }).eq("id", id);
    }

    const { created } = await enqueue(admin, {
      type: "generate_report",
      payload: { weekNo: 0 },
      analysisId: id,
      dedupeKey: dedupe.generateReport(id, 0),
    });

    return NextResponse.json({ queued: true, created, status: "gemeten" });
  } catch (err) {
    console.error(`rapport inplannen mislukt voor ${id}:`, err);
    return NextResponse.json(
      { error: "Rapport inplannen mislukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
