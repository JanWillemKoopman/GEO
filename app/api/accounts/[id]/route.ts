import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { membershipsOf } from "@/lib/accounts";
import { isStaff } from "@/lib/staff";
import { EDITABLE_ACCOUNT_FIELDS } from "@/lib/account-editable";

/**
 * PATCH /api/accounts/[id], de bedrijfsgegevens van één account.
 *
 * ⚠️ Alleen een ADMIN van dit account, of een beheerder van Aura. Een `member`
 * mag meelezen maar niet wijzigen: het factuuradres van een klant is niet iets
 * wat een meekijkende collega van een bureau hoort te kunnen veranderen.
 *
 * Opzeggen loopt via dezelfde route met `cancel: true`. Besluit 14: dat zet een
 * datum en verwijdert niets.
 */
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  const [memberships, staff] = await Promise.all([membershipsOf(user.id), isStaff(user.id)]);
  const rol = memberships.find((m) => m.accountId === id)?.role ?? null;
  if (rol !== "admin" && !staff) {
    // 404 en geen 403: bestaat het account niet voor jou, dan hoort het scherm
    // ook niet te bevestigen dát het bestaat.
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (body.cancel === true) {
    const { error } = await admin
      .from("accounts")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", id)
      .is("cancelled_at", null);
    if (error) {
      return NextResponse.json({ error: "Opzeggen is niet gelukt." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Alleen de velden die het scherm ook echt toont. De lijst staat in een eigen
  // pure module, precies zoals bij het merkprofiel: daar bleek een veld in de
  // wizard te staan dat niet in de bewerkbare lijst zat, en dat sloeg stil niets op.
  const update: Record<string, unknown> = {};
  for (const veld of EDITABLE_ACCOUNT_FIELDS) {
    if (!(veld in body)) continue;
    const waarde = body[veld];
    if (veld === "vat_not_applicable") {
      update[veld] = Boolean(waarde);
      continue;
    }
    if (typeof waarde !== "string") continue;
    const schoon = waarde.trim();
    // Leeg is een geldige waarde: het veld wissen moet kunnen. `null` en niet
    // een lege tekst, zodat "niet ingevuld" overal hetzelfde is.
    update[veld] = schoon.length === 0 ? null : schoon;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Er is niets om op te slaan." }, { status: 400 });
  }

  const { error } = await admin.from("accounts").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
