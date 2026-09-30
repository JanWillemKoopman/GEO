import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { getOwnedProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { voegHandmatigeKansToe } from "@/lib/kansen/handmatig";
import { KANS_HANDELINGEN, type KansHandeling } from "@/lib/kansen/prioriteit";
import { isContentType } from "@/lib/plan-writing";
import { assignToMonth } from "@/lib/plans";
import { bereidVoor } from "@/lib/pagina/start";

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
    /** Het venster "Nieuw pagina-idee": meteen in deze maand zetten. Leeg = de ideeënlijst. */
    maandId?: string | null;
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

  // Meteen inplannen, met dezelfde regels en dezelfde voorbereiding als het
  // inplannen op het bord (`plan/pages/[pageId]`, actie "inplannen"). Lukt het
  // niet, dan bestaat het idee toch: het staat dan in de ideeënlijst, en dat
  // zegt het antwoord.
  const maandId = typeof body.maandId === "string" ? body.maandId.trim() : "";
  if (!maandId) return NextResponse.json({ ok: true, kansId: uitkomst.kansId, ingepland: false });
  const { data: kaart } = await admin
    .from("planned_pages")
    .select("id")
    .eq("kans_id", uitkomst.kansId)
    .eq("profile_id", id)
    .maybeSingle();
  const pageId = (kaart as { id?: string } | null)?.id;
  if (!pageId) return NextResponse.json({ ok: true, kansId: uitkomst.kansId, ingepland: false });
  const plaatsing = await assignToMonth(admin, { profileId: id, pageId, monthId: maandId, index: null });
  if (!plaatsing.ok) {
    return NextResponse.json({ ok: true, kansId: uitkomst.kansId, ingepland: false, melding: plaatsing.probleem });
  }
  try {
    await bereidVoor(admin, [pageId]);
  } catch (err) {
    console.error(`Voorbereiding van plan-pagina ${pageId} mislukte, de ochtendronde pakt hem op:`, err);
  }
  return NextResponse.json({ ok: true, kansId: uitkomst.kansId, ingepland: true });
}
