import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { generateContentPiece, type RecommendationInput } from "@/lib/pipeline/content";
import { describeError } from "@/lib/errors";
import type { ContentType } from "@/lib/types/database";

/**
 * POST /api/analyses/[id]/generate — genereert één pagina op klant-verzoek
 * (abcplan.md §8, Fase C). Body = de aanbeveling. Idempotent op titel.
 */
export const maxDuration = 60;

const VALID_TYPES: ContentType[] = ["article", "faq", "landing", "comparison"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: Partial<RecommendationInput> & { reportId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const title = body.title?.trim();
  const type = body.type && VALID_TYPES.includes(body.type) ? body.type : "article";
  if (!title) {
    return NextResponse.json({ error: "Titel ontbreekt." }, { status: 400 });
  }

  try {
    const contentId = await generateContentPiece({
      analysisId: id,
      userId: user.id,
      reportId: body.reportId ?? null,
      recommendation: {
        title,
        type,
        targetIntent: body.targetIntent ?? "",
        why: body.why ?? "",
      },
    });
    return NextResponse.json({ id: contentId }, { status: 201 });
  } catch (err) {
    console.error(`generateContentPiece(${id}) mislukt:`, err);
    return NextResponse.json({ error: "Genereren mislukt.", detail: describeError(err) }, { status: 500 });
  }
}
