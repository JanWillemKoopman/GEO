import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSalesAdmin } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { controleerMarktInvoer, uniekeSlug } from "@/lib/sales/market";

/**
 * POST /api/sales/markets, een markt aanmaken (plan §5.4).
 *
 * ── DE DRIE REGELS DIE HIER SAMENKOMEN ──────────────────────────────────────
 *
 * 1. **Schrijven loopt nooit rechtstreeks vanaf de client** (conventie 6). De
 *    RLS-policies op de Sales-tabellen zijn select-only; deze route schrijft met
 *    de service-role key en doet daarom zelf de rechtencontrole.
 * 2. **De rechtencontrole is `is_sales_admin` en niet `is_sales`.** Een markt
 *    aanmaken is de opmaat naar werk dat geld kost, en dat hoort bij dezelfde
 *    persoon te liggen als het budget. Zie het commentaar op het scherm.
 * 3. **De invoercontrole staat in een pure module** (conventie 2), zodat de
 *    browser en de server hetzelfde oordeel vellen en `scripts/test-unit.ts`
 *    het kan narekenen zonder database.
 *
 * ⚠️ **Deze route kost nog niets.** Er komt geen `mayTriggerCost` en geen
 * `checkBudget` aan te pas, want er wordt niets gestart: er komt één rij in de
 * database. De marktontdekking is een aparte stap (sprint 2) en dáár horen de
 * twee remmen bij horen, samen met een kostenraming die de admin ziet vóór hij
 * akkoord geeft. Een budgetcontrole op een handeling die niets kost zou de
 * indruk wekken dat dit al iets in gang zet.
 */
interface MarktBody {
  branche?: string;
  plaats?: string;
  straalKm?: number;
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  // ⚠️ 404 en geen 403, net als de schermen (plan §4.3). Een 403 bevestigt dat
  // deze route bestaat, en dat is precies wat we niet willen prijsgeven aan
  // iemand die niet bij Sales hoort.
  if (!(await isSalesAdmin(user.id))) {
    return new NextResponse(null, { status: 404 });
  }

  let body: MarktBody;
  try {
    body = (await request.json()) as MarktBody;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const uitkomst = controleerMarktInvoer({
    branche: typeof body.branche === "string" ? body.branche : "",
    plaats: typeof body.plaats === "string" ? body.plaats : "",
    straalKm: typeof body.straalKm === "number" ? body.straalKm : Number.NaN,
  });
  if (!uitkomst.ok) {
    return NextResponse.json({ error: uitkomst.melding, veld: uitkomst.veld }, { status: 400 });
  }

  const admin = createAdminClient();

  // Het adres moet uniek zijn, want het wordt straks het publieke adres van de
  // markt (sprint 6). Twee markten met dezelfde branche en plaats mogen bestaan,
  // bijvoorbeeld met een andere straal; ze mogen alleen niet hetzelfde adres
  // krijgen. Vandaar een volgnummer en geen weigering.
  const { data: bestaande, error: leesFout } = await admin
    .from("sales_markets")
    .select("slug")
    .like("slug", `${uitkomst.slug}%`);
  if (leesFout) {
    console.error("Markten lezen mislukt:", leesFout.message);
    return NextResponse.json({ error: "Het opslaan is niet gelukt." }, { status: 500 });
  }
  const slug = uniekeSlug(
    uitkomst.slug,
    (bestaande ?? []).map((r) => r.slug as string),
  );

  const { data, error } = await admin
    .from("sales_markets")
    .insert({
      slug,
      label: uitkomst.label,
      industry: uitkomst.branche,
      location: uitkomst.plaats,
      radius_km: uitkomst.straalKm,
      created_by: user.id,
    })
    .select("id, slug, label")
    .single();

  if (error) {
    // De unieke index op `slug` kan alsnog afgaan als twee mensen tegelijk
    // dezelfde markt aanmaken. Dat is geen storing maar een botsing, en het
    // antwoord zegt wat de gebruiker moet doen in plaats van "er ging iets mis".
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Iemand maakte deze markt net aan. Ververs het scherm.", veld: "branche" },
        { status: 409 },
      );
    }
    console.error("Markt aanmaken mislukt:", error.message);
    return NextResponse.json({ error: "Het opslaan is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, slug: data.slug, label: data.label }, { status: 201 });
}
