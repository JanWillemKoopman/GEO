import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { planContentDraft, VALID_CONTENT_TYPES } from "@/lib/jobs/content-jobs";
import { describeError, classifyError } from "@/lib/errors";
import type { ContentAction } from "@/lib/types/database";
import type { RecommendationPayload } from "@/lib/jobs/types";
import type { RecommendationTarget } from "@/lib/pipeline/recommendation";

/**
 * POST /api/analyses/[id]/generate — plant het schrijven van één pagina in
 * (optimalisatie.md 1.4, Fase C).
 *
 * Was de meest waarschijnlijke plek om op de tijdslimiet stuk te lopen: vier
 * AI-aanroepen achter elkaar, waarvan twee een volledige pagina schrijven. Nu
 * twee taken (schrijven+beoordelen, dan herschrijven+herbeoordelen) die elk
 * ruim binnen één werker-aanroep passen, met de tussenstand in de database.
 *
 * Sinds fase 4 draagt de aanvraag de DOELVRAGEN mee (4.1): welke gemiste vragen
 * deze pagina moet gaan winnen. En met `regenerate: true` mag er een nieuwe
 * versie bovenop een afgeronde pagina (4.7) — voorheen liep een pagina met
 * "check nodig" dood, omdat de idempotentie op de titel zat.
 */

/** Doelvragen uit de aanvraag lezen, defensief: dit komt van de client. */
function readTargets(value: unknown): RecommendationTarget[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((t) => {
      const target = (t ?? {}) as Partial<RecommendationTarget>;
      return {
        promptId: typeof target.promptId === "string" ? target.promptId : null,
        runId: typeof target.runId === "string" ? target.runId : null,
        text: typeof target.text === "string" ? target.text : "",
        cluster: typeof target.cluster === "string" ? target.cluster : null,
        weight: typeof target.weight === "number" ? target.weight : 0,
      };
    })
    .filter((t) => t.text.trim().length > 0);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: Partial<RecommendationPayload> & { reportId?: string; regenerate?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Titel ontbreekt." }, { status: 400 });

  const recommendation: RecommendationPayload = {
    title,
    type: body.type && VALID_CONTENT_TYPES.includes(body.type) ? body.type : "article",
    targetIntent: body.targetIntent ?? "",
    why: body.why ?? "",
    action: (body.action === "verbeteren" ? "verbeteren" : "nieuw") as ContentAction,
    existingUrl: body.existingUrl ?? null,
    reportId: body.reportId ?? null,
    targets: readTargets(body.targets),
    revisionNote: typeof body.revisionNote === "string" ? body.revisionNote : null,
  };

  try {
    const { created, alreadyDone } = await planContentDraft(admin, {
      analysisId: id,
      userId: user.id,
      recommendation,
      regenerate: body.regenerate === true,
    });

    if (alreadyDone) return NextResponse.json({ queued: false, done: true });
    return NextResponse.json({ queued: true, created }, { status: 202 });
  } catch (err) {
    console.error(`content inplannen mislukt voor ${id}:`, err);
    return NextResponse.json(
      { error: "Genereren inplannen mislukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
