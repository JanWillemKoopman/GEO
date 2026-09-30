import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSuperuser } from "@/lib/staff";
import { createStaffInvite } from "@/lib/invites";
import { naamOk, schoonNaam } from "@/lib/invite-rules";
import { publicEnv } from "@/lib/env";

/**
 * POST /api/staff/invites, een consultant uitnodigen.
 *
 * ⚠️ Alleen de superuser. Dit deelt staf-rechten uit (alle merken zien, klanten
 * aanmaken), dus een klant of consultant krijgt een 404 en geen 403: een 403
 * bevestigt dat de route bestaat. De link gaat terug naar de aanroeper en wordt
 * nergens bewaard, net als bij `POST /api/accounts/[id]/invites`.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isSuperuser(user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: { email?: string; firstName?: string; lastName?: string };
  try {
    body = (await request.json()) as { email?: string; firstName?: string; lastName?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length < 5) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }

  const firstName = schoonNaam(body.firstName);
  const lastName = schoonNaam(body.lastName);
  if (!naamOk(firstName, lastName)) {
    return NextResponse.json({ error: "Vul een voornaam en een achternaam in." }, { status: 400 });
  }

  const result = await createStaffInvite({ email, firstName, lastName, invitedBy: user.id });
  if (!result) {
    return NextResponse.json(
      { error: "De uitnodiging kon niet worden aangemaakt. Probeer het opnieuw." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    invite: { id: result.invite.id, email: result.invite.email, expires_at: result.invite.expires_at },
    link: `${publicEnv.siteUrl}/uitnodiging/${result.token}`,
  });
}
