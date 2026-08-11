import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { syncSearchConsole } from "@/lib/search-console/sync";
import { normalizeProperty } from "@/lib/search-console/property";

/**
 * POST /api/profiles/[id]/search-console, de koppeling instellen en controleren.
 *
 * Eén route en één knop: opslaan én meteen proberen te lezen. Nova splitst dit
 * in twee handelingen; dat levert een scherm op waar je iets kunt bewaren dat
 * niet werkt en dat pas de volgende dag blijkt. Hier is opslaan zonder controle
 * geen bruikbare uitkomst, dus doet dezelfde knop allebei.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { property?: string };
  try {
    body = (await request.json()) as { property?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const genormaliseerd = normalizeProperty(body.property ?? "");
  if (!genormaliseerd.ok) {
    return NextResponse.json({ error: genormaliseerd.reason }, { status: 400 });
  }

  const { error } = await admin
    .from("profiles")
    .update({
      gsc_property: genormaliseerd.property,
      // De vorige fout hoort weg zodra iemand iets nieuws probeert; anders staat
      // er straks een melding over een property die niet meer ingesteld is.
      gsc_last_error: null,
      gsc_verified_at: null,
    })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });
  }

  // Meteen proberen. Dat is de controle: lukt het lezen, dan is de koppeling
  // aantoonbaar goed, en anders staat de reden in `gsc_last_error`.
  const result = await syncSearchConsole(admin, id);

  return NextResponse.json({
    ok: result.ok,
    property: genormaliseerd.property,
    reason: result.reason,
    rijen: result.rijen,
  });
}
