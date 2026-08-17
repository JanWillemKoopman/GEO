import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/analyses/[id]/report, plant het rapport in (optimalisatie.md 1.4).
 *
 * Normaal gesproken hóéft deze route niet aangeroepen te worden: de aggregatie-
 * taak ketent zelf door naar het rapport zodra de meting klaar is (1.5). Dit is
 * de handmatige ingang voor een retry nadat het rapport definitief mislukte.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  try {
    // De periode waarvoor het rapport ontbreekt, is de LAATSTE waarvoor gemeten
    // is, niet altijd de nulmeting. Dit stond hard op 0, waardoor de retryknop
    // bij een mislukt maandrapport een taak voor periode 0 inplande; die zag dat
    // dat rapport allang bestond, zette de status op 'gereed' en deed verder
    // niets. De klant drukte dan op "opnieuw" en er gebeurde zichtbaar niets.
    const { data: latestScore } = await admin
      .from("visibility_scores")
      .select("week_no")
      .eq("analysis_id", id)
      .order("week_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    const weekNo = (latestScore?.week_no as number | undefined) ?? 0;

    if (analysis.status === "mislukt") {
      await admin.from("analyses").update({ status: "gemeten" }).eq("id", id);
    }

    const { created } = await enqueue(admin, {
      type: "generate_report",
      payload: { weekNo },
      analysisId: id,
      dedupeKey: dedupe.generateReport(id, weekNo),
    });

    return NextResponse.json({ queued: true, created, weekNo, status: "gemeten" });
  } catch (err) {
    console.error(`rapport inplannen mislukt voor ${id}:`, err);
    return NextResponse.json(
      { error: "ORBIT ENGINE kon het rapport niet inplannen.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
