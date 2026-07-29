import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { buildAnalysisName } from "@/lib/url";

/**
 * POST /api/analyses — nieuwe analyse aanmaken (abcplan.md §6 A0, na de
 * klantprofiel-refactor). Vereist een bestaand, klaar klantprofiel + een
 * onderwerp (verplicht: zonder onderwerp voegt een analyse niets toe aan wat
 * het profiel al dekt). `url` wordt overgenomen van het profiel (snapshot).
 * Schrijven loopt via de service-role client MET expliciete ownership.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  let body: { profileId?: string; topic?: string; content_brief?: string; notify_by_email?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const topic = body.topic?.trim() ? body.topic.trim() : null;
  if (!topic) {
    return NextResponse.json({ error: "Vul een product of onderwerp in." }, { status: 400 });
  }

  const contentBrief = body.content_brief?.trim() ? body.content_brief.trim() : null;
  // Standaard aan: wie een analyse start wil weten wanneer die klaar is.
  const notifyByEmail = body.notify_by_email !== false;

  const admin = createAdminClient();

  if (!body.profileId) {
    return NextResponse.json({ error: "Kies een merk." }, { status: 400 });
  }
  const profile = await getOwnedProfile(admin, body.profileId, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Merk niet gevonden." }, { status: 404 });
  }
  if (profile.status !== "klaar") {
    return NextResponse.json(
      { error: "Dit merk is nog niet klaar met onderzoeken." },
      { status: 409 },
    );
  }

  const name = buildAnalysisName(profile.url, topic);

  const { data, error } = await admin
    .from("analyses")
    .insert({
      notify_by_email: notifyByEmail,
      user_id: user.id,
      profile_id: profile.id,
      url: profile.url,
      topic,
      name,
      status: "bezig",
      content_brief: contentBrief,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Aanmaken mislukt. Probeer het opnieuw." }, { status: 500 });
  }

  // Werk meteen inplannen (optimalisatie.md 1.5). Voorheen startte het
  // voortgangsscherm de voorbereiding; sloot de klant de tab direct na het
  // aanmaken, dan gebeurde er nooit iets. Nu hangt het aan de wachtrij.
  await enqueue(admin, {
    type: "prepare_analysis",
    payload: {},
    analysisId: data.id as string,
    dedupeKey: dedupe.prepareAnalysis(data.id as string),
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
