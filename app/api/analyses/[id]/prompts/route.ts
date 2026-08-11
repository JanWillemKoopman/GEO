import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { regionGateMessage } from "@/lib/pipeline/geo-share";

/**
 * POST /api/analyses/[id]/prompts, nieuwe prompt toevoegen door de klant
 * (abcplan.md §3.5/§6 A2b). created_by = 'user', geen AI-call.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { text?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const text = body.text?.trim();
  const category = body.category?.trim();
  if (!text || !category) {
    return NextResponse.json({ error: "Vul een prompt-tekst en categorie in." }, { status: 400 });
  }

  // Dezelfde regionale regel als de generator, want een handmatige vraag telt
  // net zo hard mee in de noemer van de score (zie lib/pipeline/geo-share.ts).
  const { data: profile } = await admin
    .from("profiles")
    .select("service_scope, service_regions")
    .eq("id", analysis.profile_id)
    .maybeSingle();
  const gate = regionGateMessage(
    profile?.service_scope as string | null,
    (profile?.service_regions as string[] | null) ?? [],
    text,
  );
  if (gate) return NextResponse.json({ error: gate }, { status: 400 });

  const { data, error } = await admin
    .from("prompts")
    .insert({ analysis_id: id, text, category, active: true, created_by: "user" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Toevoegen is niet gelukt." }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
