import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { planContentDraft, toPayload } from "@/lib/jobs/content-jobs";
import { readRecommendations } from "@/lib/pipeline/recommendation";
import { describeError, classifyError } from "@/lib/errors";
import type { ContentPiece, ContentPieceTarget } from "@/lib/types/database";
import type { StoredRecommendation } from "@/lib/pipeline/recommendation";

/**
 * POST /api/analyses/[id]/content/[pieceId] — herschrijven met feedback van de
 * klant (optimalisatie.md 4.8).
 *
 * De belangrijkste ontbrekende knop in de hele app. Een pagina die er bijna was
 * kon alleen geaccepteerd of genegeerd worden; "maak hem korter", "de toon is te
 * formeel" of "noem onze levertijd erbij" was nergens te zeggen.
 *
 * Het resultaat is een NIEUWE VERSIE (4.7), geen overschrijving: de vorige
 * versie blijft bewaard zodat de klant terug kan als het slechter werd.
 */
const MAX_NOTE_LENGTH = 2000;

/**
 * PATCH — de klant schaaft de tekst zelf bij (optimalisatie.md 4.12).
 *
 * Tot nu toe kon hij alleen kopiëren of downloaden. Een tekst die je niet kunt
 * bijschaven, publiceer je niet — dan blijft hij in de bibliotheek liggen en
 * gebeurt er niets, hoe goed hij ook is.
 *
 * Geen nieuwe versie: dit is de klant die zíjn tekst aanpast, niet de app die
 * iets nieuws schrijft. Wel `edited_by_user`, zodat zichtbaar is dat de tekst
 * niet meer één-op-één is wat het model opleverde.
 */
const EDITABLE_FIELDS = ["body_markdown", "meta_title", "meta_description", "title"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  if (!(await getOwnedAnalysis(admin, id, user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const update: Record<string, unknown> = { edited_by_user: true };
  for (const field of EDITABLE_FIELDS) {
    if (typeof body[field] === "string") update[field] = (body[field] as string).trim();
  }
  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "Niets om op te slaan." }, { status: 400 });
  }

  // Het woordental meteen bijwerken: anders staat er in de bibliotheek een
  // getal dat niet meer klopt met de tekst die eronder staat.
  if (typeof update.body_markdown === "string") {
    update.word_count = (update.body_markdown as string).trim().split(/\s+/).filter(Boolean).length;
  }

  const { error } = await admin
    .from("content_pieces")
    .update(update)
    .eq("id", pieceId)
    .eq("analysis_id", id);

  if (error) return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const { data: pieceRow } = await admin
    .from("content_pieces")
    .select("*")
    .eq("id", pieceId)
    .eq("analysis_id", id)
    .maybeSingle();
  if (!pieceRow) return NextResponse.json({ error: "Pagina niet gevonden." }, { status: 404 });
  const piece = pieceRow as ContentPiece;

  let body: { note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE_LENGTH) : "";
  if (!note) {
    return NextResponse.json({ error: "Schrijf even wat er anders moet." }, { status: 400 });
  }

  // De doelvragen van de vorige versie meenemen (4.1). Zonder dat zou een
  // herschrijving de koppeling met de meting verliezen, en schrijft versie 2
  // ineens zonder te weten welke vraag hij moet winnen.
  const { data: targetRows } = await admin
    .from("content_piece_targets")
    .select("*")
    .eq("content_piece_id", pieceId);

  const targets = ((targetRows ?? []) as ContentPieceTarget[]).map((t) => ({
    promptId: t.prompt_id,
    runId: t.tracking_run_id,
    text: t.prompt_text,
    cluster: t.cluster,
    weight: 0,
  }));

  // De oorspronkelijke aanbeveling terugzoeken in het rapport, zodat "waarom
  // deze pagina" en de nieuw/verbeteren-keuze bewaard blijven. Staat hij er niet
  // meer in (rapport vervangen), dan reconstrueren we uit de pagina zelf.
  const { data: report } = await admin
    .from("reports")
    .select("id, recommendations_json")
    .eq("id", piece.report_id ?? "")
    .maybeSingle();

  const fromReport = readRecommendations(report?.recommendations_json).find(
    (r) => r.title === piece.title,
  );

  const recommendation: StoredRecommendation = fromReport ?? {
    title: piece.title,
    type: piece.type,
    targetIntent: piece.target_intent ?? "",
    why: "",
    priority: 1,
    action: piece.action,
    existingUrl: piece.existing_url,
    targets,
  };

  try {
    const { created } = await planContentDraft(admin, {
      analysisId: id,
      userId: user.id,
      recommendation: toPayload(
        { ...recommendation, targets: targets.length > 0 ? targets : recommendation.targets },
        piece.report_id,
        note,
      ),
      // Altijd een nieuwe versie: de klant vraagt om iets ánders, niet om
      // hetzelfde nog eens.
      regenerate: true,
    });

    return NextResponse.json({ queued: true, created }, { status: 202 });
  } catch (err) {
    console.error(`herschrijven inplannen mislukt voor pagina ${pieceId}:`, err);
    return NextResponse.json(
      { error: "Herschrijven inplannen mislukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
