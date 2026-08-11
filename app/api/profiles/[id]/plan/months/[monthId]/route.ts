import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { approveMonth } from "@/lib/plans";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";

/**
 * POST /api/profiles/[id]/plan/months/[monthId], een hele maand goedkeuren of
 * afwijzen.
 *
 * ── WAAROM AFWIJZEN GEEN "NEE" IS MAAR "OPNIEUW" ────────────────────────────
 *
 * Nova is hier expliciet over (`approveMonthly.declineNote`: "Declining
 * discards this strategy and generates a new one"). Afwijzen is geen discussie
 * maar een nieuwe ronde van de machine. Dat is hier overgenomen: de maand gaat
 * op `afgewezen`, en het scherm biedt daarna aan een nieuw plan op te stellen.
 *
 * Bewust NIET automatisch hergenereren in deze route: dat zou betekenen dat één
 * klik het hele jaarplan vervangt, inclusief maanden die de klant al had
 * goedgekeurd. Twee handelingen, twee bevestigingen.
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; monthId: string }> },
) {
  const { id, monthId } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  // ⚠️ Een maand goedkeuren is de duurste knop van de app: hij zet tien pagina's
  // op het premium model in gang, ~$2,80 bij pakket 10. Alleen de beheerder
  // (besluit 18). De klant zegt akkoord, de consultant drukt.
  //
  // Afwijzen valt hier bewust ook onder. Dat kost niets, maar het gaat over
  // dezelfde maand en dezelfde afspraak, en twee verschillende rechten op één
  // scherm is precies het soort verschil dat niemand kan uitleggen.
  if (!(await mayTriggerCost(user.id))) {
    return NextResponse.json({ error: COST_DENIED.plan_goedkeuren }, { status: 403 });
  }

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  // De maand moet bij een plan van dít merk horen. Zonder deze controle kan
  // iemand met toegang tot merk A een maand van merk B goedkeuren.
  const { data: month } = await admin
    .from("plan_months")
    .select("id, plan_id, content_plans!inner(profile_id)")
    .eq("id", monthId)
    .maybeSingle();

  const hoortErbij =
    (month as { content_plans?: { profile_id?: string } } | null)?.content_plans
      ?.profile_id === id;
  if (!month || !hoortErbij) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: { actie?: string };
  try {
    body = (await request.json()) as { actie?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  if (body.actie === "goedkeuren") {
    const ok = await approveMonth(admin, monthId, user.id);
    if (!ok) {
      return NextResponse.json({ error: "Goedkeuren is niet gelukt." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.actie === "afwijzen") {
    const { error } = await admin
      .from("plan_months")
      .update({ status: "afgewezen" })
      .eq("id", monthId);
    if (error) {
      return NextResponse.json({ error: "Afwijzen is niet gelukt." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Onbekende handeling." }, { status: 400 });
}
