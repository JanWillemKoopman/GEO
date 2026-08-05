import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/analyses/[id]/prepare, plant het voorbereidingswerk in
 * (optimalisatie.md 1.4).
 *
 * Voert niets meer zelf uit: de route zet een taak in de wachtrij en antwoordt
 * direct. Dat is wat de belofte "je kunt dit scherm sluiten" waarmaakt, het
 * werk hangt niet meer aan een openstaande browsertab. Dubbel inplannen kan
 * niet: de dedupe-sleutel laat maar één openstaande taak per analyse toe.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  try {
    // Retry na een mislukking: terug naar 'bezig' zodat de UI voortgang toont.
    if (analysis.status === "mislukt") {
      await admin.from("analyses").update({ status: "bezig" }).eq("id", id);
    }

    const { created } = await enqueue(admin, {
      type: "prepare_analysis",
      payload: {},
      analysisId: id,
      dedupeKey: dedupe.prepareAnalysis(id),
    });

    return NextResponse.json({ queued: true, created, status: "bezig" });
  } catch (err) {
    console.error(`prepare inplannen mislukt voor ${id}:`, err);
    return NextResponse.json(
      { error: "Voorbereiden inplannen mislukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
