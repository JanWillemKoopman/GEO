import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/staff";
import { maakNotificatie, telOngelezen, type Notificatie, type NotificatieRij } from "@/lib/notificaties";

/**
 * GET /api/notificaties?merk=<id>: de meldingen voor de lijst en de kleine
 * melding rechtsonder (migratie 0131, `lib/notificaties.ts`).
 *
 * Lezen via de gewone client en niet via de service role: de RLS-regel op
 * `notificaties` laat alleen merken en accounts door waar deze gebruiker bij
 * mag. Het merk in het adres is dus een filter, geen toegangsbewijs.
 *
 * 50 rijen is ruim een maand bij het drukste merk op productie (op 29 september
 * 2026 ongeveer 16 metingen en 84 schrijftaken in 30 dagen, samen met de
 * samengevoegde vragen). Ouder dan dat zoekt niemand in een meldingenlijst.
 */
const LIMIET = 50;

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const merk = new URL(request.url).searchParams.get("merk");
  // Alleen een uuid in het filter: de waarde gaat in een `or()`-uitdrukking.
  const geldigMerk = merk && /^[0-9a-f-]{36}$/i.test(merk) ? merk : null;

  const supabase = await createClient();
  let query = supabase
    .from("notificaties")
    .select("id, profile_id, account_id, soort, object_id, gegevens, aantal, alleen_beheer, aangemaakt_op")
    .order("aangemaakt_op", { ascending: false })
    .limit(LIMIET);
  query = geldigMerk ? query.or(`profile_id.eq.${geldigMerk},profile_id.is.null`) : query.is("profile_id", null);

  const [{ data, error }, { data: gezien }, staff] = await Promise.all([
    query,
    supabase.from("notificaties_gezien").select("gezien_tot").eq("user_id", user.id).maybeSingle(),
    isStaff(user.id),
  ]);
  if (error) return NextResponse.json({ error: "Ophalen lukte niet." }, { status: 500 });

  // De RLS-regel kijkt naar het échte beheerdersrecht. Staat de klantweergave
  // aan, dan hoort de beheerder te zien wat de klant ziet: `isStaff` is het
  // effectieve recht (lib/staff.ts).
  const meldingen = ((data ?? []) as NotificatieRij[])
    .filter((r) => staff || !r.alleen_beheer)
    .map(maakNotificatie)
    .filter((m): m is Notificatie => m !== null);

  const gezienTot = (gezien?.gezien_tot as string | undefined) ?? null;
  return NextResponse.json({ meldingen, ongelezen: telOngelezen(meldingen, gezienTot), gezienTot });
}
