import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { membershipsOf } from "@/lib/accounts";
import { createInvite } from "@/lib/invites";
import { mayInvite, naamOk, schoonNaam } from "@/lib/invite-rules";
import { publicEnv } from "@/lib/env";
import type { AccountRole } from "@/lib/types/database";

/**
 * POST /api/accounts/[id]/invites, iemand uitnodigen voor een account.
 *
 * ⚠️ Dit is een poort die toegang uitdeelt, dus de controle is expliciet en in
 * stappen, net als in `getOwnedProfile()`: ingelogd, lid van dít account, en
 * met de juiste rol. Nooit één samengestelde voorwaarde.
 *
 * Elk lid van het account en de admin mag uitnodigen (`mayInvite`). Sinds
 * 30 september 2026 is er één klantrol met alle rechten, en wie in het account
 * zit is dus altijd een volwaardige klant.
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: accountId } = await params;

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
      { error: "Alleen een beheerder van dit account kan iemand uitnodigen." },
      { status: 403 },
    );
  }

  let body: { email?: string; firstName?: string; lastName?: string; role?: string };
  try {
    body = (await request.json()) as { email?: string; firstName?: string; lastName?: string; role?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  // Bewust een ruime controle en geen strenge reguliere expressie: e-mailadressen
  // zijn in de praktijk raarder dan elke expressie aankan, en de echte toets is
  // of de mail aankomt.
  if (!email || !email.includes("@") || email.length < 5) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }

  const firstName = schoonNaam(body.firstName);
  const lastName = schoonNaam(body.lastName);
  if (!naamOk(firstName, lastName)) {
    return NextResponse.json({ error: "Vul een voornaam en een achternaam in." }, { status: 400 });
  }

  // Elke klant heeft dezelfde rechten (migratie 0137), dus geen keuze meer.
  const role: AccountRole = "admin";

  const result = await createInvite({
    accountId,
    email,
    firstName,
    lastName,
    role,
    invitedBy: user.id,
  });
  if (!result) {
    return NextResponse.json(
      { error: "De uitnodiging kon niet worden aangemaakt. Probeer het opnieuw." },
      { status: 500 },
    );
  }

  // De link gaat terug naar de aanroeper en wordt NIET opgeslagen. Zolang er
  // geen uitnodigingsmail is (EMAILS_ENABLED staat standaard uit), kopieert de
  // consultant hem zelf. Dat is bewust de eerste versie: een link die je zelf
  // doorstuurt werkt altijd, ook als de mail in een spamfilter blijft hangen.
  const link = `${publicEnv.siteUrl}/uitnodiging/${result.token}`;

  return NextResponse.json({
    invite: {
      id: result.invite.id,
      email: result.invite.email,
      firstName: result.invite.first_name,
      lastName: result.invite.last_name,
      role: result.invite.role,
      expires_at: result.invite.expires_at,
    },
    link,
  });
}
