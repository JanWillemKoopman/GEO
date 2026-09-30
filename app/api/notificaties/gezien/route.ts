import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/notificaties/gezien: de lijst is geopend, alles tot nu is gelezen.
 *
 * Eén tijdstip per gebruiker (`notificaties_gezien`, migratie 0133). De enige
 * rij die hier geschreven wordt is die van de ingelogde gebruiker zelf, dus de
 * eigendomscontrole is het `user.id` uit de sessie (conventie 6).
 */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const gezienTot = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("notificaties_gezien")
    .upsert({ user_id: user.id, gezien_tot: gezienTot }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "Opslaan lukte niet." }, { status: 500 });
  return NextResponse.json({ ok: true, gezienTot });
}
