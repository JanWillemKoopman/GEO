import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSales } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueue, dedupe } from "@/lib/jobs/queue";

/**
 * POST /api/sales/opportunities/[id]/assign, een kans oppakken
 * (`docs/tasks/geo-prospect-engine.md` §8.2b en hoofdstuk 17).
 *
 * ── DIT IS DE KNOP DIE DE DURE STAPPEN IN GANG ZET ──────────────────────────
 *
 * Toewijzen is meer dan een naam eraan hangen: het is het moment waarop ORBIT
 * ENGINE de contactpersoon gaat zoeken en het concept gaat schrijven. Plan
 * §8.2b: die twee stappen draaien bewust niet voor de hele markt. "Voor dertig
 * bedrijven een contactpersoon uitzoeken terwijl er acht benaderd worden, is
 * werk en geld dat niemand gebruikt."
 *
 * ── ÉÉN ACTIEVE OUTREACH PER BEDRIJF ────────────────────────────────────────
 *
 * De database dwingt dat af met een gedeeltelijke unieke index (migratie 0073),
 * en deze route geeft er een leesbare zin bij. Twee verkopers die hetzelfde
 * bedrijf tegelijk benaderen is de pijnlijkste fout die deze module kan maken na
 * het benaderen van een bestaande klant.
 *
 * ⚠️ `isSales` en niet `isSalesAdmin`: een kans oppakken is het gewone werk van
 * een salesmedewerker. Wat geld kost is de meting, en die zit achter poort 2.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }
  if (!(await isSales(user.id))) {
    return new NextResponse(null, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: kans } = await admin
    .from("sales_opportunities")
    .select("id, company_id, market_id, superseded_by, sales_companies(do_not_contact, name)")
    .eq("id", id)
    .maybeSingle();

  type Rij = {
    id: string;
    company_id: string;
    market_id: string;
    superseded_by: string | null;
    sales_companies: { do_not_contact: boolean; name: string } | null;
  };
  const rij = kans as unknown as Rij | null;

  if (!rij) {
    return NextResponse.json({ error: "Deze kans bestaat niet." }, { status: 404 });
  }
  if (rij.superseded_by) {
    return NextResponse.json(
      { error: "Deze kans komt uit een oudere meting. Pak de actuele versie op." },
      { status: 409 },
    );
  }
  // ⚠️ De laatste controle vóór er iemand benaderd wordt (plan 16.4). Een
  // bedrijf dat zich heeft afgemeld staat wel in het systeem, maar er gaat
  // niets meer naartoe, over alle markten heen en permanent.
  if (rij.sales_companies?.do_not_contact) {
    return NextResponse.json(
      {
        error: `${rij.sales_companies.name} wil niet benaderd worden. Deze kans kan niet opgepakt worden.`,
      },
      { status: 409 },
    );
  }

  const { data: bestaand } = await admin
    .from("sales_outreach")
    .select("id, owner_user_id, status")
    .eq("company_id", rij.company_id)
    .not("status", "in", "(afgewezen,klant,niet_nu)")
    .maybeSingle();

  if (bestaand) {
    const vanJou = bestaand.owner_user_id === user.id;
    return NextResponse.json(
      {
        error: vanJou
          ? "Je hebt dit bedrijf al opgepakt."
          : "Een collega heeft dit bedrijf al opgepakt. Twee mails uit hetzelfde bedrijf is de " +
            "snelste manier om een prospect te verliezen.",
      },
      { status: 409 },
    );
  }

  const { data: nieuw, error } = await admin
    .from("sales_outreach")
    .insert({
      company_id: rij.company_id,
      opportunity_id: rij.id,
      market_id: rij.market_id,
      owner_user_id: user.id,
      status: "toegewezen",
    })
    .select("id")
    .single();

  if (error || !nieuw) {
    console.error(`Toewijzen van kans ${id} mislukt:`, error?.message);
    return NextResponse.json({ error: "Het oppakken is niet gelukt." }, { status: 500 });
  }

  // Het logboek. Elke statuswijziging is een eigen rij, want zonder dat is de
  // trechter uit hoofdstuk 18 achteraf niet te reconstrueren.
  await admin.from("sales_events").insert({
    company_id: rij.company_id,
    opportunity_id: rij.id,
    outreach_id: nieuw.id as string,
    market_id: rij.market_id,
    kind: "toegewezen",
    van_status: "nieuw",
    naar_status: "toegewezen",
    actor_user_id: user.id,
  });

  await enqueue(admin, {
    type: "sales_contact_find",
    payload: {
      marketId: rij.market_id,
      companyId: rij.company_id,
      outreachId: nieuw.id as string,
    },
    salesMarketId: rij.market_id,
    dedupeKey: dedupe.salesContact(rij.company_id),
  });

  return NextResponse.json({ ok: true, outreachId: nieuw.id }, { status: 202 });
}
