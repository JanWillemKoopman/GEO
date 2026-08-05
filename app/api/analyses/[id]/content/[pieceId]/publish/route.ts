import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { markPublished, markUnpublished } from "@/lib/pipeline/publish";
import { checkUrlFormat } from "@/lib/url";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST/DELETE /api/analyses/[id]/content/[pieceId]/publish — de klant zegt dat
 * de pagina live staat (optimalisatie.md 5.1/5.2/5.3).
 *
 * Dit is het scharnierpunt van fase 5. Vanaf hier weet de app dat er iets te
 * volgen valt: hij controleert of de pagina er echt staat, en plant twee
 * hermetingen van precies de vragen waarvoor deze pagina gemaakt is.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  if (!(await getOwnedAnalysis(admin, id, user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const raw = typeof body.url === "string" ? body.url.trim() : "";
  if (!raw) return NextResponse.json({ error: "Geef de link naar de gepubliceerde pagina." }, { status: 400 });

  // Zelfde vormcontrole als bij het aanmaken van een profiel (0.12): een
  // typefout hier kost de klant weken wachten op een effect dat nooit komt.
  const format = checkUrlFormat(raw);
  if (!format.ok) return NextResponse.json({ error: format.message }, { status: 400 });

  const url = raw.startsWith("http") ? raw : `https://${raw}`;

  const { data: piece } = await admin
    .from("content_pieces")
    .select("id, status")
    .eq("id", pieceId)
    .eq("analysis_id", id)
    .maybeSingle();
  if (!piece) return NextResponse.json({ error: "Pagina niet gevonden." }, { status: 404 });

  try {
    const result = await markPublished(admin, { analysisId: id, contentPieceId: pieceId, url });
    return NextResponse.json(result, { status: 202 });
  } catch (err) {
    console.error(`publicatie vastleggen mislukt voor pagina ${pieceId}:`, err);
    return NextResponse.json(
      { error: "Opslaan is niet gelukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  if (!(await getOwnedAnalysis(admin, id, user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  await markUnpublished(admin, { analysisId: id, contentPieceId: pieceId });
  return NextResponse.json({ ok: true });
}
