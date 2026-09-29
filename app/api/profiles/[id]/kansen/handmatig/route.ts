import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { getOwnedProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { voegHandmatigeKansToe } from "@/lib/kansen/handmatig";
import { KANS_HANDELINGEN, type KansHandeling } from "@/lib/kansen/prioriteit";
import { isContentType } from "@/lib/plan-writing";

export const dynamic = "force-dynamic";

/**
 * POST /api/profiles/[id]/kansen/handmatig, een kans van de consultant zonder
 * gemeten cluster (N5, besluit V2). Alleen de beheerder: net als het aanmaken
 * van een plan zelf gaat dit om wat er geschreven gaat worden, niet om het
 * inplannen ervan (besluit 18).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  if (!(await isStaff(user.id))) {
    return NextResponse.json({ error: "Alleen een beheerder kan een handmatige kans toevoegen." }, { status: 403 });
  }

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: {
    titel?: string;
    lezer?: string | null;
    handeling?: string;
    bestaandeUrl?: string | null;
    geldtVoor?: string[];
    doelvragen?: string[];
    contentType?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const handeling = body.handeling as KansHandeling | undefined;
  if (!handeling || !KANS_HANDELINGEN.includes(handeling)) {
    return NextResponse.json({ error: "Kies 'nieuwe pagina' of 'pagina verbeteren'." }, { status: 400 });
  }

  const uitkomst = await voegHandmatigeKansToe(admin, {
    profileId: id,
    titel: String(body.titel ?? ""),
    lezer: typeof body.lezer === "string" ? body.lezer : null,
    handeling,
    bestaandeUrl: typeof body.bestaandeUrl === "string" ? body.bestaandeUrl : null,
    geldtVoor: Array.isArray(body.geldtVoor) ? body.geldtVoor.filter((v) => typeof v === "string") : [],
    doelvragen: Array.isArray(body.doelvragen) ? body.doelvragen.filter((v) => typeof v === "string") : [],
    contentType: isContentType(body.contentType) ? body.contentType : null,
    gebruikerId: user.id,
  });

  if (!uitkomst.ok) return NextResponse.json({ error: uitkomst.probleem }, { status: 409 });
  return NextResponse.json({ ok: true, kansId: uitkomst.kansId });
}
