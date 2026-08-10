import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { membershipsOf } from "@/lib/accounts";
import { mayInvite } from "@/lib/invite-rules";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/accounts/[id]/invites/[inviteId]/revoke, een uitnodiging intrekken.
 *
 * ── WAAROM INTREKKEN EN NIET VERWIJDEREN ────────────────────────────────────
 *
 * Conventie 8: alles bewaren. "Deze link werkte ooit en is toen ingetrokken" is
 * navraagbaar; een verwijderde rij is dat niet, en dan is de enige mogelijke
 * conclusie bij een klant die klaagt dat zijn link niet werkt: geen idee.
 *
 * Vandaar ook een eigen `revoke`-pad en geen DELETE: die methode belooft iets
 * anders dan er gebeurt.
 *
 * ⚠️ Dezelfde rolcontrole als uitnodigen. Wie niet mag uitnodigen, mag ook geen
 * uitnodiging van een ander wegnemen.
 */
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  const { id: accountId, inviteId } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  const staff = await isStaff(user.id);
  const lidmaatschap = (await membershipsOf(user.id)).find(
    (m) => m.accountId === accountId,
  );
  if (!staff && !lidmaatschap) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }
  if (!mayInvite(lidmaatschap?.role ?? null, staff)) {
    return NextResponse.json(
      { error: "Alleen een beheerder van dit account kan een uitnodiging intrekken." },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  // `eq("account_id")` erbij is geen overbodige controle maar de echte: zonder
  // die regel zou een beheerder van account A een uitnodiging van account B
  // kunnen intrekken door het id te raden.
  const { error } = await admin
    .from("account_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("account_id", accountId)
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
