import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { describeError, classifyError } from "@/lib/errors";
import type { ContentType, ContentAction } from "@/lib/types/database";
import type { RecommendationPayload } from "@/lib/jobs/types";

/**
 * POST /api/analyses/[id]/generate — plant het schrijven van één pagina in
 * (optimalisatie.md 1.4, Fase C).
 *
 * Was de meest waarschijnlijke plek om op de tijdslimiet stuk te lopen: vier
 * AI-aanroepen achter elkaar, waarvan twee een volledige pagina schrijven. Nu
 * twee taken (schrijven+beoordelen, dan herschrijven+herbeoordelen) die elk
 * ruim binnen één werker-aanroep passen, met de tussenstand in de database.
 *
 * Idempotent op de aanbeveling: twee keer klikken levert één pagina op.
 */
const VALID_TYPES: ContentType[] = ["article", "faq", "landing", "comparison"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: Partial<RecommendationPayload> & { reportId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Titel ontbreekt." }, { status: 400 });

  const recommendation: RecommendationPayload = {
    title,
    type: body.type && VALID_TYPES.includes(body.type) ? body.type : "article",
    targetIntent: body.targetIntent ?? "",
    why: body.why ?? "",
    action: (body.action === "verbeteren" ? "verbeteren" : "nieuw") as ContentAction,
    existingUrl: body.existingUrl ?? null,
    reportId: body.reportId ?? null,
  };

  try {
    // Al geschreven? Dan meteen de bestaande pagina teruggeven.
    const { data: existing } = await admin
      .from("content_pieces")
      .select("id, status")
      .eq("analysis_id", id)
      .eq("title", title)
      .maybeSingle();
    if (existing && existing.status !== "draft") {
      return NextResponse.json({ queued: false, id: existing.id, done: true });
    }

    const { created } = await enqueue(admin, {
      type: "content_draft",
      payload: { userId: user.id, recommendation },
      analysisId: id,
      dedupeKey: dedupe.contentDraft(id, title),
    });

    return NextResponse.json({ queued: true, created }, { status: 202 });
  } catch (err) {
    console.error(`content inplannen mislukt voor ${id}:`, err);
    return NextResponse.json(
      { error: "Genereren inplannen mislukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
