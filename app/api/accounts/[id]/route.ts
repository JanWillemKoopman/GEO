import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { membershipsOf } from "@/lib/accounts";
import { isStaff } from "@/lib/staff";
import { EDITABLE_ACCOUNT_FIELDS } from "@/lib/account-editable";
import { deletionPlan, deleteAccount } from "@/lib/deletion";
import {
  confirmationMatches,
  deletionBlockade,
  deletionWarning,
  DELETION_BLOCKED,
} from "@/lib/deletion-rules";

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

/**
 * GET /api/accounts/[id]?plan=verwijderen, wat verdwijnt er als je dit weggooit?
 *
 * Verandert niets. Staat er zodat het scherm de aantallen kan tonen vóór de
 * bevestiging: "dit verwijdert 3 merken, 5 analyses en 412 metingen" is een
 * ander besluit dan "dit verwijdert een account".
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  if (new URL(request.url).searchParams.get("plan") !== "verwijderen") {
    return NextResponse.json({ error: "Onbekende opvraag." }, { status: 400 });
  }

  // Verwijderen is uitsluitend een handeling van de beheerder van Aura, ook al
  // mag een account-admin de bedrijfsgegevens wél wijzigen. Het verschil: een
  // wijziging draai je terug, dit niet.
  if (!(await isStaff(user.id))) {
    return NextResponse.json({ error: DELETION_BLOCKED.niet_gevonden }, { status: 404 });
  }

  const plan = await deletionPlan(id);
  if (!plan) return NextResponse.json({ error: DELETION_BLOCKED.niet_gevonden }, { status: 404 });

  const memberships = await membershipsOf(user.id);
  const blokkade = deletionBlockade({
    accountId: id,
    eigenAccountIds: memberships.map((m) => m.accountId),
  });

  return NextResponse.json({
    accountName: plan.accountName,
    regels: plan.regels,
    counts: plan.counts,
    waarschuwing: deletionWarning(plan.accountName, plan.counts),
    blokkade,
  });
}

/**
 * DELETE /api/accounts/[id], een klant volledig verwijderen (F4, AVG).
 *
 * ⚠️ ONOMKEERBAAR, en dat is het hele punt. Archiveren bestaat al en is het
 * normale pad (besluit 14: opzeggen zet een datum en verwijdert niets). Dit is
 * de uitzondering voor het geval dat de AVG afdwingt, en hij is met opzet
 * omslachtig: alleen een beheerder van Aura, niet je eigen account, en de naam
 * moet worden overgetypt.
 *
 * De naamcontrole staat hier en niet alleen in het scherm. Een bevestiging die
 * je met een rechtstreekse aanroep kunt overslaan, is geen bevestiging.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  if (!(await isStaff(user.id))) {
    return NextResponse.json({ error: DELETION_BLOCKED.niet_gevonden }, { status: 404 });
  }

  const plan = await deletionPlan(id);
  if (!plan) return NextResponse.json({ error: DELETION_BLOCKED.niet_gevonden }, { status: 404 });

  const memberships = await membershipsOf(user.id);
  const blokkade = deletionBlockade({
    accountId: id,
    eigenAccountIds: memberships.map((m) => m.accountId),
  });
  if (blokkade) return NextResponse.json({ error: blokkade }, { status: 409 });

  let body: { bevestiging?: string };
  try {
    body = (await request.json()) as { bevestiging?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (!confirmationMatches(body.bevestiging ?? "", plan.accountName)) {
    return NextResponse.json({ error: DELETION_BLOCKED.naam_klopt_niet }, { status: 400 });
  }

  try {
    const resultaat = await deleteAccount(id);
    // Loggen en niet alleen antwoorden: dit is de enige handeling in de app
    // waarvan het spoor niet in de database terug te vinden is, want de rijen
    // die het bewijs zouden zijn, zijn juist weg.
    console.warn(
      `Account ${id} ("${plan.accountName}") verwijderd door ${user.id}: ` +
        `${resultaat.merken} merken, ${resultaat.gebruikersVerwijderd} inlogaccounts.`,
    );
    return NextResponse.json({ ok: true, ...resultaat });
  } catch (err) {
    console.error(`Account ${id} verwijderen mislukt:`, err);
    return NextResponse.json(
      {
        error:
          "Het verwijderen is halverwege gestopt. Een deel kan al weg zijn. Probeer het opnieuw, " +
          "de handeling maakt af wat er nog staat.",
      },
      { status: 500 },
    );
  }
}
