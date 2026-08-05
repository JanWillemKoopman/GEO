import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { buildAnalysisName } from "@/lib/url";
import type { ProfileTopic } from "@/lib/types/database";

/**
 * Core topics beheren (docs/tasks/onboarding-2.0.md, blok D).
 *
 * PATCH — een topic bijstellen: goedkeuren, afwijzen, of de notitie uit het
 * gesprek vastleggen.
 * POST  — een goedgekeurd topic omzetten in een echte analyse.
 *
 * ── WAAROM POST DE BESTAANDE ANALYSEPIJPLIJN AANROEPT ───────────────────────
 *
 * Een goedgekeurd topic is niet meer dan een onderwerp met een onderbouwing. De
 * analyse die eruit volgt is exact dezelfde als wanneer de klant het onderwerp
 * zelf had ingetypt op /analyses/new: dezelfde tabellen, dezelfde taken,
 * dezelfde goedkeuringspoort. Deze route dupliceert dus niets — hij vult het
 * tekstveld in dat de klant anders zelf had gevuld.
 */

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { topicId?: string; status?: string; clientNote?: string | null; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (!body.topicId) return NextResponse.json({ error: "Geen onderwerp." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.status) {
    if (!["voorgesteld", "goedgekeurd", "afgewezen"].includes(body.status)) {
      return NextResponse.json({ error: "Onbekende status." }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.clientNote !== undefined) patch.client_note = body.clientNote?.trim() || null;
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "Een onderwerp mag niet leeg zijn." }, { status: 400 });
    patch.title = title;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Niets te wijzigen." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("profile_topics")
    .update(patch)
    .eq("id", body.topicId)
    // Ook op profile_id filteren: zonder dat zou een topic-id uit een ánder
    // profiel bijgewerkt kunnen worden door iemand die dít profiel bezit.
    .eq("profile_id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    // De unieke index op (profile_id, lower(title)) uit migratie 0040.
    const dubbel = error.message.includes("profile_topics_unique_title");
    return NextResponse.json(
      { error: dubbel ? "Er is al een onderwerp met deze naam." : "Opslaan is niet gelukt." },
      { status: dubbel ? 409 : 500 },
    );
  }
  if (!data) return NextResponse.json({ error: "Onderwerp niet gevonden." }, { status: 404 });

  return NextResponse.json({ topic: data as ProfileTopic });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  if (profile.status !== "klaar") {
    return NextResponse.json({ error: "Aura is nog bezig met dit merk. Wacht tot het onderzoek klaar is." }, { status: 409 });
  }

  let body: { topicId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  if (!body.topicId) return NextResponse.json({ error: "Geen onderwerp." }, { status: 400 });

  const { data: topicRow } = await admin
    .from("profile_topics")
    .select("*")
    .eq("id", body.topicId)
    .eq("profile_id", id)
    .maybeSingle();
  if (!topicRow) return NextResponse.json({ error: "Onderwerp niet gevonden." }, { status: 404 });
  const topic = topicRow as ProfileTopic;

  // Twee keer starten op hetzelfde topic levert twee analyses over dezelfde 30
  // vragen op — dubbele meetkosten zonder extra inzicht.
  if (topic.analysis_id) {
    return NextResponse.json({ id: topic.analysis_id, existing: true });
  }

  const { data: created, error } = await admin
    .from("analyses")
    .insert({
      // De EIGENAAR van het profiel, niet de ingelogde gebruiker: een beheerder
      // die een analyse start voor een toegewezen klant zou hem anders op zijn
      // eigen naam zetten, en dan ziet de klant hem niet.
      user_id: profile.user_id,
      profile_id: profile.id,
      url: profile.url,
      topic: topic.title,
      name: buildAnalysisName(profile.url, topic.title),
      status: "bezig",
      content_brief: topic.client_note,
      notify_by_email: true,
    })
    .select("id")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: "De analyse kon niet worden aangemaakt." }, { status: 500 });
  }

  const analysisId = created.id as string;
  await admin
    .from("profile_topics")
    .update({ analysis_id: analysisId, status: "goedgekeurd" })
    .eq("id", topic.id);

  await enqueue(admin, {
    type: "prepare_analysis",
    payload: {},
    analysisId,
    dedupeKey: dedupe.prepareAnalysis(analysisId),
  });

  return NextResponse.json({ id: analysisId }, { status: 201 });
}
