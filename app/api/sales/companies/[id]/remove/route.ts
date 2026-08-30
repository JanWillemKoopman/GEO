import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSales } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/sales/companies/[id]/remove, een verwijderverzoek uitvoeren
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 20 en 16.4).
 *
 * ── ZONDER DISCUSSIE, EN IN ÉÉN HANDELING ───────────────────────────────────
 *
 * "Een bedrijf dat vraagt om verwijdering wordt verwijderd, zonder discussie, en
 * krijgt tegelijk `do_not_contact`." Die twee horen bij elkaar: iemand die vraagt
 * of zijn naam van een pagina af kan, vraagt niet om volgende maand alsnog
 * gebeld te worden.
 *
 * ⚠️ **Het bedrijf verdwijnt niet uit de meting**, en dat is geen halfheid. Zou
 * de rij weggegooid worden, dan vindt de marktontdekking hem bij de volgende
 * ronde gewoon opnieuw en staat hij er weer op. Nu blijft hij staan met twee
 * vlaggen erop, en die vlaggen zijn permanent en gelden over alle markten heen.
 *
 * ⚠️ `isSales` en niet `isSalesAdmin`: dit is de handeling die het snelst moet
 * kunnen. Wie een boze telefoon krijgt, moet hem meteen kunnen uitvoeren en niet
 * eerst iemand hoeven zoeken die de rechten heeft.
 */
interface Body {
  reden?: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isSales(user.id))) return new NextResponse(null, { status: 404 });

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    // Een leeg verzoek is geldig: de reden is prettig en niet verplicht. Wie
    // belt zegt niet altijd waarom, en dat mag het uitvoeren niet ophouden.
  }

  const admin = createAdminClient();
  const nu = new Date().toISOString();
  const reden = body.reden?.trim() || "Op verzoek van het bedrijf.";

  const { data: bedrijf, error } = await admin
    .from("sales_companies")
    .update({
      hidden_from_report: true,
      hidden_reason: reden,
      do_not_contact: true,
      do_not_contact_reason: reden,
      do_not_contact_at: nu,
    })
    .eq("id", id)
    .select("id, name")
    .single();

  if (error || !bedrijf) {
    console.error(`Verwijderverzoek voor ${id} mislukt:`, error?.message);
    return NextResponse.json({ error: "Het verwijderen is niet gelukt." }, { status: 500 });
  }

  // Lopende outreach stopt, met de reden erbij. Een concept dat blijft staan
  // wordt uiteindelijk toch verstuurd, en dat is precies wat dit verzoek moet
  // voorkomen.
  await admin
    .from("sales_outreach")
    .update({
      status: "afgewezen",
      lost_reason: "geen_interesse",
      outcome: "afgemeld",
      outcome_at: nu,
      notes: `Afgemeld op eigen verzoek: ${reden}`,
    })
    .eq("company_id", id)
    .not("status", "in", "(afgewezen,klant,niet_nu)");

  await admin.from("sales_events").insert({
    company_id: id,
    kind: "verwijderverzoek",
    actor_user_id: user.id,
    detail: { reden } as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, bedrijf: bedrijf.name });
}
