import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUrl, buildAnalysisName } from "@/lib/url";

/**
 * POST /api/analyses — nieuwe analyse aanmaken (abcplan.md §6 A0).
 * Schrijven loopt via de service-role client MET expliciete ownership: we zetten
 * user_id op de ingelogde user (§5/§12.20). Nooit rechtstreeks vanaf de client.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  let body: { url?: string; topic?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const url = normalizeUrl(body.url ?? "");
  if (!url) {
    return NextResponse.json(
      { error: "Vul een geldige website in, bijvoorbeeld mediamarkt.nl." },
      { status: 400 },
    );
  }

  const topic = body.topic?.trim() ? body.topic.trim() : null;
  const name = buildAnalysisName(url, topic);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("analyses")
    .insert({ user_id: user.id, url, topic, name, status: "bezig" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Aanmaken mislukt. Probeer het opnieuw." }, { status: 500 });
  }

  // NB: de meet-pipeline (crawler → Brand DNA → prompts) wordt in Sprint 2B
  // aan deze aanmaakstap gekoppeld. Nu blijft de analyse op status 'bezig' staan.
  return NextResponse.json({ id: data.id }, { status: 201 });
}
