import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { enqueueMeasurement } from "@/lib/jobs/queue";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/analyses/[id]/measure, plant de nulmeting in (optimalisatie.md 1.4).
 *
 * Zet één taak per actieve prompt in de wachtrij in plaats van alles synchroon
 * te draaien. Daarmee vervalt het 60-secondenplafond dat de meting bij 30 vragen
 * (en straks 3 metingen per vraag) onhaalbaar maakte.
 *
 * Al gemeten vragen worden overgeslagen: meten is de duurste stap die er is.
 * De aggregatie en het rapport worden door de laatste meettaak zelf ingepland
 *, de browser hoeft daar niets meer voor te doen.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  // Alleen vanuit 'meten' (na goedkeuring) of 'mislukt' (retry).
  if (analysis.status !== "meten" && analysis.status !== "mislukt") {
    return NextResponse.json({ queued: false, status: analysis.status });
  }

  try {
    if (analysis.status === "mislukt") {
      await admin.from("analyses").update({ status: "meten" }).eq("id", id);
    }

    const { planned, totalPrompts } = await enqueueMeasurement(admin, id, 0);
    return NextResponse.json({ queued: true, planned, totalPrompts, status: "meten" });
  } catch (err) {
    console.error(`meting inplannen mislukt voor ${id}:`, err);
    return NextResponse.json(
      { error: "Aura kon de meting niet inplannen.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
