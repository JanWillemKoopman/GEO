import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";

/**
 * PATCH /api/analyses/[id]/brand-dna — Brand DNA bewerken (abcplan.md §3.5/§6 A2b).
 * Geen AI-call: pure CRUD op al bestaande data. Zet edited_by_user = true.
 */
const EDITABLE_FIELDS = [
  "industry",
  "tone_of_voice",
  "summary",
  "products",
  "value_props",
  "competitors",
  "personas",
] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  // Alleen expliciet toegestane velden doorlaten (kolom-niveau-controle, §5/§12.20).
  const update: Record<string, unknown> = { edited_by_user: true };
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }

  const { error } = await admin.from("brand_dna").update(update).eq("analysis_id", id);
  if (error) {
    return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
