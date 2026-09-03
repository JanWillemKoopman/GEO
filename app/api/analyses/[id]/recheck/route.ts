import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { recommendationFromSnapshot } from "@/lib/pipeline/briefing";
import { describeError, classifyError } from "@/lib/errors";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { checkBudgetForProfile } from "@/lib/spend-limit";
import type { ContentAction, ContentType } from "@/lib/types/database";
import type { RecommendationPayload } from "@/lib/jobs/types";

/**
 * POST /api/analyses/[id]/recheck, alle afgeronde pagina's van dit cluster
 * opnieuw keuren zonder ze te herschrijven (migratie 0092).
 *
 * ── WAAROM DIT EEN EIGEN ROUTE IS ───────────────────────────────────────────
 *
 * Een oordeel bijstellen kon tot 3 september 2026 alleen door de pagina opnieuw
 * te laten schrijven: ongeveer $1,00 per pagina tegen ongeveer $0,013 voor de
 * vier beoordelaars. Bijna honderd keer zoveel voor iets wat de tekst niet eens
 * verandert, en de vergelijking gaat er ook nog eens door verloren, want de
 * tekst is dan een andere.
 *
 * Twee gevallen waarin je dit nodig hebt:
 *
 *   1. Een controle is gerepareerd. R0 en R0b (3 september 2026) hielden alle
 *      twaalf benchmarkpagina's tegen op zinnen die geen zin waren; zonder deze
 *      route zou nameten $12 kosten in plaats van $0,16.
 *   2. De klant heeft zijn eigen tekst aangepast. Het oordeel bleef dan staan op
 *      de tekst van vóór die bewerking, dus er stond "klaar voor publicatie"
 *      onder een tekst die niemand beoordeeld had.
 *
 * ⚠️ Nog steeds achter beide kostenremmen. Goedkoop is niet gratis: twaalf
 * pagina's zijn twaalf taken van elk vier AI-aanroepen, en een lus die deze
 * route honderd keer aanroept kost wél geld.
 */
function recommendationVoor(piece: {
  id: string;
  title: string;
  type: string;
  action: string;
  existing_url: string | null;
  report_id: string | null;
  brief_instruction: string | null;
  target_intent: string | null;
  briefing_snapshot_json: unknown;
}): RecommendationPayload {
  // De bevroren aanbeveling wint: die draagt de doelvragen waar de keuring op
  // let. Ontbreekt hij, dan is dit een pagina van vóór R5.1 en valt hij terug op
  // de kolommen van de rij zelf. Minder goed, niet kapot.
  const bevroren = recommendationFromSnapshot(piece.briefing_snapshot_json);
  if (bevroren) return bevroren;
  return {
    title: piece.title,
    type: piece.type as ContentType,
    targetIntent: piece.target_intent ?? "",
    why: piece.brief_instruction ?? "",
    action: piece.action as ContentAction,
    existingUrl: piece.existing_url,
    reportId: piece.report_id,
    targets: [],
    revisionNote: null,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  if (!(await mayTriggerCost(user.id, "content_schrijven"))) {
    return NextResponse.json({ error: COST_DENIED.content_schrijven }, { status: 403 });
  }
  const budget = await checkBudgetForProfile(analysis.profile_id);
  if (!budget.ok) return NextResponse.json({ error: budget.message }, { status: 402 });

  // De reden hoort in de dedupe-sleutel: dezelfde pagina mag later nog eens
  // herkeurd worden om een andere reden, en zonder dat onderscheid zou die
  // tweede herkeuring stil als duplicaat wegvallen.
  let reden = "handmatig";
  try {
    const body = (await request.json()) as { reden?: unknown };
    if (typeof body.reden === "string" && body.reden.trim()) {
      reden = body.reden.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    }
  } catch {
    // Geen body is prima: dan is het gewoon een handmatige herkeuring.
  }

  const { data: pieces } = await admin
    .from("content_pieces")
    .select(
      "id, title, type, action, existing_url, report_id, brief_instruction, target_intent, briefing_snapshot_json",
    )
    .eq("analysis_id", id)
    .eq("status", "ready")
    .eq("is_current", true);

  const teKeuren = pieces ?? [];
  if (teKeuren.length === 0) {
    return NextResponse.json({ queued: 0, nothingToRecheck: true });
  }

  try {
    let queued = 0;
    for (const piece of teKeuren) {
      const { created } = await enqueue(admin, {
        type: "content_recheck",
        payload: {
          userId: user.id,
          contentPieceId: piece.id as string,
          recommendation: recommendationVoor(piece as never),
        },
        analysisId: id,
        dedupeKey: dedupe.contentRecheck(piece.id as string, reden),
      });
      if (created) queued++;
    }

    return NextResponse.json({ queued, pages: teKeuren.length, reden }, { status: 202 });
  } catch (err) {
    console.error(`herkeuring inplannen mislukt voor ${id}:`, err);
    return NextResponse.json(
      {
        error: "ORBIT ENGINE kon de herkeuring niet inplannen.",
        detail: describeError(err),
        problem: classifyError(err),
      },
      { status: 500 },
    );
  }
}
