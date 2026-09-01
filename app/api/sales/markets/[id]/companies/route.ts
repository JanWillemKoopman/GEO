import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSales } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PATCH /api/sales/markets/[id]/companies, één bedrijf in of uit de markt zetten.
 *
 * Dit is het handwerk van poort 1 (plan §8.1): de admin loopt de lijst langs en
 * vinkt weg wat er niet in hoort. De goedkeuring van de hele lijst is een aparte
 * route, want dat is een besluit en dit is een correctie.
 *
 * ⚠️ **`isSales` en niet `isSalesAdmin`.** Deze handeling kost niets en zet niets
 * in gang; hij maakt de lijst beter. Een salesmedewerker die ziet dat er een
 * bedrijf uit de verkeerde plaats tussen staat, moet dat kunnen wegvinken zonder
 * op iemand te wachten. Het GOEDKEUREN van de lijst blijft wel bij de admin: dat
 * is het besluit dat de keten verder laat lopen.
 *
 * ⚠️ **Uitzetten is niet weggooien** (plan 9.5, laatste alinea). Het bedrijf
 * blijft in de markt staan met de reden erbij. Zou de rij verdwijnen, dan komt
 * hetzelfde bedrijf bij de volgende meetronde weer boven als nieuwe kans.
 */
interface Body {
  companyId?: string;
  included?: boolean;
  reason?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }
  if (!(await isSales(user.id))) {
    return new NextResponse(null, { status: 404 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (typeof body.companyId !== "string" || typeof body.included !== "boolean") {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const admin = createAdminClient();

  // ⚠️ Een uitsluiting uit 9.5 mag NIET met de hand teruggezet worden. Een
  // bestaande klant of een bedrijf dat zich heeft afgemeld, hoort er niet in,
  // en dat is geen oordeel van de verkoper die toevallig dit scherm openheeft.
  // Zou dat wel kunnen, dan is de hele uitsluitingslaag een suggestie.
  if (body.included) {
    const { data: uitsluiting } = await admin
      .from("sales_suppressions")
      .select("kind, reason")
      .eq("company_id", body.companyId)
      .limit(1)
      .maybeSingle();

    if (uitsluiting) {
      return NextResponse.json(
        {
          error:
            `Dit bedrijf staat op de uitsluitingslijst en kan niet worden toegevoegd. ` +
            `${uitsluiting.reason as string}`,
        },
        { status: 409 },
      );
    }
  }

  const { error } = await admin
    .from("sales_market_companies")
    .update({
      included: body.included,
      excluded_reason: body.included ? null : (body.reason?.trim() || "Handmatig weggehaald."),
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("market_id", id)
    .eq("company_id", body.companyId);

  if (error) {
    console.error(`Bedrijf ${body.companyId} bijwerken mislukt:`, error.message);
    return NextResponse.json({ error: "Het opslaan is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
