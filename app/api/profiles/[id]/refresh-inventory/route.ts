import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { refreshInventory } from "@/lib/pipeline/refresh-inventory";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/profiles/[id]/refresh-inventory, crawlt de content-inventaris
 * opnieuw met de huidige crawl-instellingen. Synchroon, kan tientallen seconden
 * duren. Raakt het merkonderzoek niet.
 */
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  try {
    const count = await refreshInventory(id);
    return NextResponse.json({ count });
  } catch (err) {
    console.error(`refreshInventory(${id}) mislukt:`, err);
    return NextResponse.json({ error: "Vernieuwen is niet gelukt.", detail: describeError(err), problem: classifyError(err) }, { status: 500 });
  }
}
