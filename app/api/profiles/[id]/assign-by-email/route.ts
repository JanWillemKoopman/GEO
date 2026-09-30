import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { findUserByEmail } from "@/lib/invites";
import { naamOk, schoonNaam } from "@/lib/invite-rules";
import { wijsToeAanGebruiker, wijsToeAanNieuwAccount } from "@/lib/profile-assign";

/**
 * POST /api/profiles/[id]/assign-by-email, het profiel koppelen aan een
 * e-mailadres in plaats van aan een account dat al in de keuzelijst van
 * `AssignBox` staat (`lib/profile-assign.ts` legt uit waarom dit erbij kwam).
 *
 * Bestaat er al een gebruiker met dit adres (bijvoorbeeld een tweede merk voor
 * hetzelfde bureau), dan is dit hetzelfde als hem uit de lijst kiezen. Bestaat
 * hij nog niet, dan komt er een nieuw klantaccount en een uitnodigingslink,
 * net als `POST /api/accounts/[id]/invites` die al voor `/instellingen` doet.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  // Zelfde regel als /assign: toewijzen is een beheerdersactie.
  if (!(await isStaff(user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: { email?: string; firstName?: string; lastName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  // Zelfde ruime controle als /api/accounts/[id]/invites: een strenge
  // reguliere expressie wijst vaker een geldig adres af dan een typefout aan.
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length < 5) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }

  const firstName = schoonNaam(body.firstName);
  const lastName = schoonNaam(body.lastName);
  if (!naamOk(firstName, lastName)) {
    return NextResponse.json({ error: "Vul een voornaam en een achternaam in." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const bestaandeUserId = await findUserByEmail(email);
  const result = bestaandeUserId
    ? await wijsToeAanGebruiker(admin, id, bestaandeUserId)
    : await wijsToeAanNieuwAccount(admin, {
        profileId: id,
        profileName: profile.name as string,
        email,
        firstName,
        lastName,
        invitedBy: user.id,
      });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Toewijzen is niet gelukt." }, { status: 500 });
  }
  if (result.unchanged) {
    return NextResponse.json({ ok: true, unchanged: true, bestaandeGebruiker: true });
  }

  return NextResponse.json({
    ok: true,
    email: result.email ?? email,
    assignedAt: result.assignedAt,
    inviteLink: result.inviteLink ?? null,
    bestaandeGebruiker: Boolean(bestaandeUserId),
  });
}
