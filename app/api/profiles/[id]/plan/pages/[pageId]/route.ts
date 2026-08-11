import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { markPosted, removePage } from "@/lib/plans";
import { swapWithNeighbour, type OrderablePage } from "@/lib/plan-order";

/**
 * POST /api/profiles/[id]/plan/pages/[pageId], een handeling op één pagina.
 *
 * Eén route met een `actie` in de body en geen drie routes: de drie handelingen
 * delen dezelfde toegangscontrole en dezelfde foutafhandeling, en die drie keer
 * uitschrijven is drie plekken om uit elkaar te laten lopen.
 *
 * ⚠️ De controle op `profile_id` is geen dubbelop. Zonder die regel kan een
 * gebruiker met toegang tot merk A een pagina van merk B goedkeuren door het id
 * te raden.
 */
export const dynamic = "force-dynamic";

type Actie = "goedkeuren" | "afwijzen" | "geplaatst" | "verplaats";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const { id, pageId } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  // De pagina moet écht bij dít merk horen.
  const { data: page } = await admin
    .from("planned_pages")
    .select("id, profile_id, status, plan_month_id")
    .eq("id", pageId)
    .eq("profile_id", id)
    .maybeSingle();
  if (!page) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: { actie?: string; url?: string; richting?: string };
  try {
    body = (await request.json()) as { actie?: string; url?: string; richting?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const actie = body.actie as Actie | undefined;

  if (actie === "verplaats") {
    const richting = body.richting === "omhoog" ? "omhoog" : "omlaag";

    // De hele maand, want verwisselen gaat over twee rijen en welke tweede dat
    // is, hangt van de volgorde af.
    const { data: maandPaginas } = await admin
      .from("planned_pages")
      .select("id, sort_order, scheduled_for, is_buffer, status")
      .eq("plan_month_id", page.plan_month_id as string)
      .order("sort_order");

    const result = swapWithNeighbour(
      (maandPaginas ?? []) as OrderablePage[],
      pageId,
      richting,
    );
    if (result.problem) {
      return NextResponse.json({ error: result.problem }, { status: 409 });
    }

    // Twee losse updates en geen transactie: gaat de tweede mis, dan staan er
    // twee pagina's op dezelfde plek in de lijst. Vervelend, en zelf te
    // herstellen met nog een klik. Een transactie zou hier een databasefunctie
    // vragen voor iets wat de klant hooguit een verkeerde volgorde kost.
    for (const u of result.updates) {
      const { error } = await admin
        .from("planned_pages")
        .update({ sort_order: u.sort_order, scheduled_for: u.scheduled_for })
        .eq("id", u.id);
      if (error) {
        return NextResponse.json({ error: "Verplaatsen is niet gelukt." }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (actie === "goedkeuren") {
    const { error } = await admin
      .from("planned_pages")
      .update({ status: "goedgekeurd" })
      .eq("id", pageId)
      .eq("status", "ter_goedkeuring");
    if (error) {
      return NextResponse.json({ error: "Goedkeuren is niet gelukt." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (actie === "afwijzen") {
    const result = await removePage(admin, pageId);
    if (!result.ok) {
      return NextResponse.json({ error: "Verwijderen is niet gelukt." }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      // De klant hoort te weten dát er een reserve is ingeschoven, anders lijkt
      // het aantal pagina's van die maand ongewijzigd zonder verklaring.
      bufferUsed: result.bufferUsed,
    });
  }

  if (actie === "geplaatst") {
    const url = String(body.url ?? "").trim();
    if (!url) {
      return NextResponse.json(
        { error: "Vul het pad in waar de pagina live staat." },
        { status: 400 },
      );
    }
    const ok = await markPosted(admin, pageId, { url, userId: user.id });
    if (!ok) {
      return NextResponse.json({ error: "Markeren is niet gelukt." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Onbekende handeling." }, { status: 400 });
}
