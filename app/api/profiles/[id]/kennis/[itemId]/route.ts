import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { OVERZICHT_ACTIES, type OverzichtActie } from "@/lib/kennis/overzicht";
import { handelOpOverzicht } from "@/lib/kennis/uit-overzicht";

/**
 * Een handeling op het kennisoverzicht (K7 van van-pijplijn-naar-kennissysteem.md).
 *
 * Alleen voor medewerkers (besluit V6: de klant ziet het kennisoverzicht niet).
 * Een klant krijgt een 404 en geen 403, zelfde patroon als `fact-conflicts`: een
 * 403 bevestigt dat er iets bestaat. Schrijven loopt hier, met de service-role
 * key (conventie 6); `handelOpOverzicht()` filtert op merk en item samen, dus een
 * item van een ander merk bestaat hier niet.
 *
 * POST `{ actie: "bevestigen" | "aanpassen" | "afwijzen" | "terugzetten" | "niet_op_site", bewering? }`
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isStaff(user.id))) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { actie?: unknown; bewering?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  const actie = OVERZICHT_ACTIES.find((a) => a === body.actie) as OverzichtActie | undefined;
  if (!actie) return NextResponse.json({ error: "Onbekende handeling." }, { status: 400 });

  const uitkomst = await handelOpOverzicht(
    createAdminClient(),
    { profileId: id, itemId, actie, bewering: typeof body.bewering === "string" ? body.bewering : null },
    user.id,
  );
  if (!uitkomst.ok) return NextResponse.json({ error: uitkomst.fout }, { status: 400 });
  return NextResponse.json({ ok: true, id: uitkomst.item.id });
}
