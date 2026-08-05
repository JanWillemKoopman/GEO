import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";

/**
 * PATCH /api/analyses/[id]/tracking, wekelijkse lus aan of uit (abcplan.md §6 A3,
 * §12.4). Per analyse instelbaar, standaard uit. Geen AI-call.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { tracking_enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (typeof body.tracking_enabled !== "boolean") {
    return NextResponse.json({ error: "De waarde voor wekelijks meten moet waar of onwaar zijn." }, { status: 400 });
  }

  const { error } = await admin
    .from("analyses")
    .update({ tracking_enabled: body.tracking_enabled })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
