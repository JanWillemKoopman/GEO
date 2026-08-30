import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSales } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { beoordeelStatus, isOutreachStand, type OutreachStand } from "@/lib/sales/workflow";

/**
 * PATCH /api/sales/outreach/[id], de stand van een outreach bijwerken
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 17).
 *
 * ── WAT DEZE ROUTE WEL EN NIET DOET ─────────────────────────────────────────
 *
 * Wel: de stand bijwerken, de tekst bewaren die daadwerkelijk verstuurd is, een
 * follow-up plannen, een notitie toevoegen, en dat allemaal vastleggen in het
 * logboek.
 *
 * ⚠️ **Niet: versturen.** `status: "gemaild"` betekent "de medewerker heeft
 * gemeld dat hij hem zelf verstuurd heeft" (plan 16.3). Er is geen code achter
 * deze route die een verbinding met een mailserver maakt, en die komt er ook
 * niet. Dat is een vaste regel en geen ontwerpoptie.
 *
 * ── EN WAAROM DE OVERGANG GETOETST WORDT EN NIET ALLEEN OPGESLAGEN ──────────
 *
 * Twee standen hebben gevolgen buiten deze tabel. `afgewezen` zet de score van
 * dit bedrijf twaalf maanden op nul (plan 13.1), en `klant` maakt straks een
 * merkprofiel aan (plan 17.4). Een stand die per ongeluk gezet wordt kost dus
 * meer dan een verkeerd etiket, en `lib/sales/workflow.ts` is de garantie.
 */
interface Body {
  status?: string;
  /** Verplicht bij een afwijzing, uit de vaste lijst. */
  reden?: string;
  /** Wat er daadwerkelijk verstuurd is. Alleen bij "gemaild". */
  verstuurdeTekst?: string;
  followUpAt?: string;
  notitie?: string;
  sentiment?: string;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const admin = createAdminClient();

  const { data: outreach } = await admin
    .from("sales_outreach")
    .select("id, company_id, opportunity_id, market_id, owner_user_id, status, body_draft")
    .eq("id", id)
    .maybeSingle();

  if (!outreach) {
    return NextResponse.json({ error: "Deze outreach bestaat niet." }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const nu = new Date().toISOString();
  const vanStand = outreach.status as OutreachStand;

  // ── De statuswijziging ───────────────────────────────────────────────────
  if (body.status) {
    const oordeel = beoordeelStatus(vanStand, body.status, body.reden ?? null);
    if (!oordeel.ok) {
      return NextResponse.json({ error: oordeel.melding }, { status: 409 });
    }
    if (!isOutreachStand(body.status)) {
      return NextResponse.json({ error: "Deze stand kent ORBIT ENGINE niet." }, { status: 400 });
    }

    patch.status = body.status;

    if (body.status === "gemaild") {
      patch.sent_at = nu;
      patch.sent_via = "eigen mailbox";
      // Wat er echt uitging, apart van het concept. Bij een acquisitiemail wil
      // je maanden later kunnen zien wat er precies verstuurd is en waarop dat
      // gebaseerd was (plan 15.3).
      patch.body_sent = (body.verstuurdeTekst ?? outreach.body_draft ?? "").trim() || null;
      await telVerstuurd(admin, outreach.owner_user_id as string | null);
    }
    if (body.status === "gereageerd") {
      patch.reply_at = nu;
      patch.reply_sentiment = body.sentiment ?? null;
    }
    if (body.status === "gebeld") patch.call_at = nu;
    if (body.status === "gesprek") patch.meeting_at = nu;
    if (body.status === "afgewezen") {
      patch.lost_reason = body.reden;
      patch.outcome = "afgewezen";
      patch.outcome_at = nu;
      // ⚠️ Het bedrijf onthoudt zijn nee. Binnen twaalf maanden zet dat de
      // opportunityscore op nul in plaats van hem te verlagen (plan 13.1): een
      // score van 30 op een bedrijf dat nee zei, staat nog steeds in de lijst en
      // wordt uiteindelijk toch gebeld.
      await admin
        .from("sales_companies")
        .update({ last_rejected_at: nu })
        .eq("id", outreach.company_id as string);
    }
    if (body.status === "klant") {
      patch.outcome = "klant";
      patch.outcome_at = nu;
    }
  }

  if (body.followUpAt) patch.follow_up_at = body.followUpAt;
  if (typeof body.notitie === "string") patch.notes = body.notitie.trim() || null;

  const { error } = await admin.from("sales_outreach").update(patch).eq("id", id);
  if (error) {
    console.error(`Outreach ${id} bijwerken mislukt:`, error.message);
    return NextResponse.json({ error: "Het opslaan is niet gelukt." }, { status: 500 });
  }

  await admin.from("sales_events").insert({
    company_id: outreach.company_id as string,
    opportunity_id: outreach.opportunity_id as string | null,
    outreach_id: id,
    market_id: outreach.market_id as string | null,
    kind: body.status ? "status" : "notitie",
    van_status: body.status ? vanStand : null,
    naar_status: body.status ?? null,
    actor_user_id: user.id,
    detail: body.reden ? ({ reden: body.reden } as Record<string, unknown>) : null,
  });

  return NextResponse.json({ ok: true });
}

/**
 * Eén mail erbij op de teller van vandaag.
 *
 * ⚠️ Dit telt wat de MEDEWERKER meldt en niet wat de app verstuurde, want de app
 * verstuurt niets. Het is de enige manier om het plafond uit plan 16.6 te
 * voeden, en daarmee de enige bescherming van het maildomein die er is.
 */
async function telVerstuurd(
  admin: ReturnType<typeof createAdminClient>,
  userId: string | null,
): Promise<void> {
  if (!userId) return;
  const dag = new Date().toISOString().slice(0, 10);

  const { data } = await admin
    .from("sales_send_stats")
    .select("id, verstuurd")
    .eq("user_id", userId)
    .eq("dag", dag)
    .maybeSingle();

  if (data) {
    await admin
      .from("sales_send_stats")
      .update({ verstuurd: Number(data.verstuurd ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", data.id as string);
    return;
  }

  await admin.from("sales_send_stats").insert({ user_id: userId, dag, verstuurd: 1 });
}
