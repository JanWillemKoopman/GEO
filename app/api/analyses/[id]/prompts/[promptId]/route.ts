import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { isVolumeBand } from "@/lib/pipeline/volume";

/**
 * PATCH/DELETE /api/analyses/[id]/prompts/[promptId], prompt wijzigen/verwijderen
 * (abcplan.md §3.5/§6 A2b). Geen AI-call. Ownership loopt via de analyse.
 */
const EDITABLE_FIELDS = ["text", "category", "active"] as const;

/**
 * De volumeband mag de klant ook zetten (optimalisatie.md 2.6), maar met een
 * eigen behandeling: hij wordt gevalideerd tegen de toegestane waarden, en
 * `volume_source` gaat op 'klant' zodat een volgende kalibratie de keuze van de
 * klant niet overschrijft. Hij weet beter dan het model welke vragen zijn omzet
 * opleveren.
 */
function volumeUpdate(body: Record<string, unknown>): Record<string, unknown> | "invalid" | null {
  if (!("volume_band" in body)) return null;
  if (!isVolumeBand(body.volume_band)) return "invalid";
  return { volume_band: body.volume_band, volume_source: "klant" };
}

async function assertOwnedPrompt(
  admin: ReturnType<typeof createAdminClient>,
  analysisId: string,
  promptId: string,
  userId: string,
) {
  const analysis = await getOwnedAnalysis(admin, analysisId, userId);
  if (!analysis) return false;
  const { data } = await admin
    .from("prompts")
    .select("id")
    .eq("id", promptId)
    .eq("analysis_id", analysisId)
    .maybeSingle();
  return Boolean(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; promptId: string }> },
) {
  const { id, promptId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  if (!(await assertOwnedPrompt(admin, id, promptId, user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }

  const volume = volumeUpdate(body);
  if (volume === "invalid") {
    return NextResponse.json({ error: "Onbekende volumeband." }, { status: 400 });
  }
  if (volume) Object.assign(update, volume);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Niets om op te slaan." }, { status: 400 });
  }

  const { error } = await admin.from("prompts").update(update).eq("id", promptId);
  if (error) return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; promptId: string }> },
) {
  const { id, promptId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  if (!(await assertOwnedPrompt(admin, id, promptId, user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  const { error } = await admin.from("prompts").delete().eq("id", promptId);
  if (error) return NextResponse.json({ error: "Verwijderen is niet gelukt." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
