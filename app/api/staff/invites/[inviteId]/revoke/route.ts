import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSuperuser } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/staff/invites/[inviteId]/revoke, een uitnodiging voor een
 * consultant intrekken. Intrekken en niet verwijderen (conventie 8): "deze link
 * werkte ooit" blijft navraagbaar. Alleen de superuser.
 */
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  const { inviteId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isSuperuser(user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  const { error } = await createAdminClient()
    .from("staff_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .is("accepted_at", null);

  if (error) {
    console.error("Uitnodiging intrekken mislukt:", error.message);
    return NextResponse.json(
      { error: "Intrekken is niet gelukt. Probeer het opnieuw." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
