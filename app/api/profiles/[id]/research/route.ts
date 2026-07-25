import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { prepareProfile } from "@/lib/pipeline/prepare-profile";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/profiles/[id]/research — draait het grondige, eenmalige
 * profielonderzoek (crawl → merk/branche/concurrenten/persona's). Synchroon,
 * zelfde patroon als POST /api/analyses/[id]/prepare.
 */
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  try {
    const status = await prepareProfile(id);
    return NextResponse.json({ status });
  } catch (err) {
    console.error(`prepareProfile(${id}) mislukt:`, err);
    return NextResponse.json(
      { status: "mislukt", error: "Onderzoek mislukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
