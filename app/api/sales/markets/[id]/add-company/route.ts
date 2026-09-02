import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSales } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { normaliseerDomein, isGeenProspect, isGeenBedrijfsnaam } from "@/lib/sales/discovery";

/**
 * POST /api/sales/markets/[id]/add-company, een gemist bedrijf alsnog toevoegen.
 *
 * ── WAAROM DEZE ROUTE BESTAAT (1 september 2026) ────────────────────────────
 *
 * Het vangnet uit plan 9.1 legt vast welke bedrijven de AI noemde die niet in
 * onze lijst stonden. Bij de eerste markt was dat onder andere **Feenstra, drie
 * keer genoemd**: de best zichtbare partij van die markt, en tegelijk de enige
 * die niet meedeed. Het scherm toonde die naam wel, maar er was geen manier om
 * er iets mee te doen. Informatie die je niet kunt gebruiken, is geen vangnet.
 *
 * ⚠️ Het bedrijf komt binnen met zekerheid `middel` en niet `laag`, en dat is
 * geen slordigheid. Een naam die tijdens de meting uit een AI-antwoord over déze
 * markt kwam, is beter onderbouwd dan een naam die alleen in een gidsje stond:
 * hij is aantoonbaar zichtbaar in precies de vragen die deze markt definiëren.
 *
 * ⚠️ Wat deze route NIET doet: meten. Het bedrijf doet mee vanaf de volgende
 * ronde. Een bedrijf halverwege een lopende ronde toevoegen zou betekenen dat
 * zijn cijfer op minder vragen rust dan dat van de rest, en dan vergelijkt het
 * Opportunities-scherm twee dingen die niet vergelijkbaar zijn.
 */
interface Body {
  naam?: string;
  domein?: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isSales(user.id))) return new NextResponse(null, { status: 404 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const naam = (body.naam ?? "").trim();
  if (naam.length < 2 || isGeenBedrijfsnaam(naam)) {
    return NextResponse.json(
      { error: "Dat is geen bedrijfsnaam. Vul de naam in zoals het bedrijf zichzelf noemt." },
      { status: 400 },
    );
  }

  const domein = normaliseerDomein(body.domein ?? null);
  if (domein && isGeenProspect(domein)) {
    return NextResponse.json(
      { error: `${domein} is een platform of een bron en geen prospect in deze markt.` },
      { status: 409 },
    );
  }

  const admin = createAdminClient();

  const { data: markt } = await admin
    .from("sales_markets")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!markt) return NextResponse.json({ error: "Deze markt bestaat niet." }, { status: 404 });

  // Bestaat dit bedrijf al? Op domein als dat er is, anders op naam. Dezelfde
  // volgorde als de ontdubbeling in `lib/sales/discovery.ts`.
  const zoek = admin.from("sales_companies").select("id, name");
  const { data: bestaand } = domein
    ? await zoek.eq("domain", domein).maybeSingle()
    : await zoek.ilike("name", naam).maybeSingle();

  let companyId = (bestaand as { id: string } | null)?.id ?? null;

  if (!companyId) {
    const { data: nieuw, error } = await admin
      .from("sales_companies")
      .insert({
        name: naam,
        domain: domein,
        name_source: "handmatig",
        crawl_status: domein ? "open" : "geen_website",
      })
      .select("id")
      .single();
    if (error || !nieuw) {
      console.error(`Bedrijf toevoegen mislukt (${naam}):`, error?.message);
      return NextResponse.json({ error: "Het toevoegen is niet gelukt." }, { status: 500 });
    }
    companyId = nieuw.id as string;
  }

  // Zit hij al in deze markt? Dan is dit een no-op met een leesbaar antwoord in
  // plaats van een tweede rij.
  const { data: lid } = await admin
    .from("sales_market_companies")
    .select("company_id, included")
    .eq("market_id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (lid) {
    if (lid.included === false) {
      await admin
        .from("sales_market_companies")
        .update({ included: true, excluded_reason: null })
        .eq("market_id", id)
        .eq("company_id", companyId);
      return NextResponse.json({ ok: true, hersteld: true });
    }
    return NextResponse.json({ error: `${naam} staat al in deze markt.` }, { status: 409 });
  }

  const { error: koppelFout } = await admin.from("sales_market_companies").insert({
    market_id: id,
    company_id: companyId,
    discovery_sources: ["ai_meting"],
    confidence: "middel",
    included: true,
    is_prospect: true,
    discovery_note: `Met de hand toegevoegd: de AI noemde dit bedrijf in de meting van deze markt.`,
    decided_by: user.id,
    decided_at: new Date().toISOString(),
  });

  if (koppelFout) {
    console.error(`Bedrijf koppelen mislukt (${naam}):`, koppelFout.message);
    return NextResponse.json({ error: "Het toevoegen is niet gelukt." }, { status: 500 });
  }

  // De crawl mag meteen, die kost niets. Meten gebeurt pas bij de volgende
  // ronde, zie de kop van dit bestand.
  if (domein) {
    const { enqueue, dedupe } = await import("@/lib/jobs/queue");
    await enqueue(admin, {
      type: "sales_company_enrich",
      payload: { marketId: id, companyId },
      salesMarketId: id,
      dedupeKey: dedupe.salesEnrich(id, companyId),
    });
  }

  return NextResponse.json({ ok: true, companyId }, { status: 201 });
}

/**
 * PATCH, de naam van een bedrijf corrigeren.
 *
 * ⚠️ Bij de eerste markt heetten twee ECHTE installateurs "Open website", omdat
 * onze crawler de tekst van een link als naam overnam. Die naam liep door tot in
 * de kans, de score en de conceptmail. Het filter uit `isGeenBedrijfsnaam()`
 * voorkomt dat voortaan, maar wat er al staat moet ook te repareren zijn, en een
 * naam is precies het veld waar een mens beter is dan een crawler.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isSales(user.id))) return new NextResponse(null, { status: 404 });

  let body: { companyId?: string; naam?: string };
  try {
    body = (await request.json()) as { companyId?: string; naam?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const naam = (body.naam ?? "").trim();
  if (typeof body.companyId !== "string" || naam.length < 2 || isGeenBedrijfsnaam(naam)) {
    return NextResponse.json(
      { error: "Vul een echte bedrijfsnaam in." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Alleen een bedrijf dat in DEZE markt zit. Zonder die controle is dit een
  // route waarmee je elk bedrijf in de database kunt hernoemen.
  const { data: lid } = await admin
    .from("sales_market_companies")
    .select("company_id")
    .eq("market_id", id)
    .eq("company_id", body.companyId)
    .maybeSingle();
  if (!lid) {
    return NextResponse.json({ error: "Dit bedrijf zit niet in deze markt." }, { status: 404 });
  }

  const { error } = await admin
    .from("sales_companies")
    .update({ name: naam, name_source: "handmatig" })
    .eq("id", body.companyId);

  if (error) {
    console.error(`Naam wijzigen mislukt (${body.companyId}):`, error.message);
    return NextResponse.json({ error: "Het wijzigen is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
