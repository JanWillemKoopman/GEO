import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { planContentBriefing, toPayload } from "@/lib/jobs/content-jobs";
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
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

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
    return NextResponse.json({ error: "Voor deze analyse is nog geen rapport geschreven." }, { status: 409 });
  }

  const recommendations = readRecommendations(report.recommendations_json);
  if (recommendations.length === 0) {
    return NextResponse.json({ error: "Het rapport bevat geen aanbevelingen." }, { status: 409 });
  }

  try {
    // Sinds R5.1 gaat de hele batch éérst door de contentbriefing
    // (contentbriefing.md §2). Juist hier telt dat: bij drie pagina's tegelijk
    // overlappen de vragen ("wat zit er in het pakket?") en levert het
    // ontdubbelen het meeste op. Drie keer los dezelfde vraag beantwoorden is
    // precies de wrijving die README.md §2 verbiedt.
    const { created, pages } = await planContentBriefing(admin, {
      analysisId: id,
      userId: user.id,
      recommendations: recommendations.map((rec) => toPayload(rec, report.id as string)),
    });

    return NextResponse.json(
      { briefing: true, created, pages, total: recommendations.length },
      { status: created ? 202 : 200 },
    );
  } catch (err) {
    console.error(`alle content inplannen mislukt voor ${id}:`, err);
    return NextResponse.json(
      { error: "Aura kon het schrijven niet inplannen.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
