import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/profiles/[id]/research — plant het profielonderzoek in
 * (optimalisatie.md 1.4). Zelfde patroon als de andere routes: inplannen en
 * direct antwoorden, de werker doet het werk.
 *
 * Dit is de zwaarste enkele taak in het systeem (sitemap-crawl van tot 150
 * pagina's + AI-onderzoek met web_search), en juist daarom hoort hij op de
 * achtergrond en niet in een route waar een browser op wacht.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  try {
    if (profile.status === "mislukt") {
      await admin.from("profiles").update({ status: "bezig" }).eq("id", id);
    }

    const { created } = await enqueue(admin, {
      type: "profile_research",
      payload: {},
      profileId: id,
      dedupeKey: dedupe.profileResearch(id),
    });

    return NextResponse.json({ queued: true, created, status: "bezig" });
  } catch (err) {
    console.error(`profielonderzoek inplannen mislukt voor ${id}:`, err);
    return NextResponse.json(
      { error: "Onderzoek inplannen mislukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
