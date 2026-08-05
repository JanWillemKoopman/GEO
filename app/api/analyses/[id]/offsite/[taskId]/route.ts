import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import type { OffsiteTaskStatus } from "@/lib/types/database";

/**
 * PATCH /api/analyses/[id]/offsite/[taskId], de status van een off-site taak
 * bijwerken (optimalisatie.md 7.6).
 *
 * Zonder status blijft off-site advies hangen als goede bedoeling. "Je zou eens
 * naar reviewplatforms moeten kijken" is geen advies maar een gevoel; een taak
 * die je op 'gedaan' zet, is werk.
 */
const VALID: OffsiteTaskStatus[] = ["open", "bezig", "gedaan", "niet_relevant"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  if (!(await getOwnedAnalysis(admin, id, user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const status = body.status as OffsiteTaskStatus;
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "Onbekende status." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("offsite_tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("analysis_id", id)
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });
  return NextResponse.json(data);
}
