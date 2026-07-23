import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";

/**
 * PATCH /api/profiles/[id] — klantprofiel bewerken. Geen AI-call: pure CRUD op
 * al bestaande data. Zet edited_by_user = true. Zelfde patroon als de vroegere
 * brand-dna-route.
 */
const EDITABLE_FIELDS = [
  "name",
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
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

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

  const { error } = await admin.from("profiles").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
