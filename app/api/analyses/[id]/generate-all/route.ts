import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { planAllRecommendations } from "@/lib/jobs/content-jobs";
import { readRecommendations } from "@/lib/pipeline/recommendation";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/analyses/[id]/generate-all — alle aanbevelingen in één keer
 * (optimalisatie.md 4.9).
 *
 * De belofte van het product heet "1-click content generatie", maar het waren
 * *n* klikken over maximaal drie aanbevelingen. Sinds fase 1 is elke pagina een
 * losse taak in de wachtrij, dus in één keer inplannen legt niets plat: de
 * werker pakt ze één voor één op en de klant kan het scherm sluiten.
 *
 * De route leest de aanbevelingen zélf uit het rapport in plaats van ze van de
 * client aan te nemen. Dat scheelt niet alleen een grote request-body — het
 * voorkomt ook dat een verouderd scherm pagina's laat schrijven voor een rapport
 * dat inmiddels vervangen is.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const { data: report } = await admin
    .from("reports")
    .select("id, recommendations_json")
    .eq("analysis_id", id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report) {
    return NextResponse.json({ error: "Er is nog geen rapport voor deze analyse." }, { status: 409 });
  }

  const recommendations = readRecommendations(report.recommendations_json);
  if (recommendations.length === 0) {
    return NextResponse.json({ error: "Het rapport bevat geen aanbevelingen." }, { status: 409 });
  }

  try {
    const { planned, skipped } = await planAllRecommendations(admin, {
      analysisId: id,
      userId: user.id,
      reportId: report.id as string,
      recommendations,
    });

    return NextResponse.json(
      { planned, skipped, total: recommendations.length },
      { status: planned > 0 ? 202 : 200 },
    );
  } catch (err) {
    console.error(`alle content inplannen mislukt voor ${id}:`, err);
    return NextResponse.json(
      { error: "Genereren inplannen mislukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
