import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";

/**
 * PATCH /api/analyses/[id], analyse-instellingen bewerken. Alleen de
 * content-brief (§6/§7/§8): de gewenste hoek en doelgroep van de content. `url` en
 * `topic` blijven bewust gelockt (die maken bij wijziging het onderzoek en de
 * prompts met terugwerkende kracht ongeldig, zie §3.3). Geen AI-call.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { content_brief?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (!("content_brief" in body)) {
    return NextResponse.json({ error: "Niets om bij te werken." }, { status: 400 });
  }
  const raw = typeof body.content_brief === "string" ? body.content_brief.trim() : "";

  const { error } = await admin.from("analyses").update({ content_brief: raw || null }).eq("id", id);
  if (error) return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
