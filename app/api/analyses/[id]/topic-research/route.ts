import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";

/**
 * PATCH /api/analyses/[id]/topic-research — het onderwerp-onderzoek van déze
 * analyse bewerken (contentSummary + concurrenten voor dit onderwerp). Geen
 * AI-call: pure CRUD, zet edited_by_user = true. Het bedrijfsbrede Brand DNA
 * zit in het klantprofiel en wordt bewerkt via /api/profiles/[id].
 */
const EDITABLE_FIELDS = ["content_summary", "competitors"] as const;

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

  const update: Record<string, unknown> = { edited_by_user: true };
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }

  const { error } = await admin.from("topic_research").update(update).eq("analysis_id", id);
  if (error) {
    return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
