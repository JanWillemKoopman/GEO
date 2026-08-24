import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSalesAdmin } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueue, dedupe } from "@/lib/jobs/queue";

/**
 * POST /api/sales/markets/[id]/approve, poort 1 (`docs/tasks/geo-prospect-engine.md` §8.1).
 *
 * ── WAAROM DEZE POORT BESTAAT ───────────────────────────────────────────────
 *
 * "De duurste fout die dit systeem kan maken is een verkeerd afgebakende markt.
 * Vijftien bedrijven doormeten waarvan er vier in een andere plaats zitten kost
 * geld en levert een gesprek op dat begint met een correctie."
 *
 * Vandaar dat de keten hier ECHT stopt: `sales_market_suppress` plant niets in.
 * Alleen deze route zet het vervolg in gang, en hij kan alleen door een mens
 * aangeroepen worden.
 *
 * ── WAT ER GEBEURT BIJ GOEDKEUREN ───────────────────────────────────────────
 *
 * Alles wat nog op "nog niet beoordeeld" staat, telt als goedgekeurd: de admin
 * heeft de lijst gezien en alleen weggehaald wat er niet in hoorde. Daarna krijgt
 * elk goedgekeurd bedrijf een crawltaak.
 *
 * ⚠️ Dat "nog niet beoordeeld telt als ja" is een keuze en geen slordigheid.
 * Andersom zou betekenen dat de admin dertig vinkjes moet zetten om te bevestigen
 * wat hij al gelezen heeft, en dan wordt het afvinken de handeling in plaats van
 * het beoordelen. De poort bewijst dat er iemand gekeken heeft; hij bewijst niet
 * dat er per bedrijf geklikt is.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }
  if (!(await isSalesAdmin(user.id))) {
    return new NextResponse(null, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: markt } = await admin
    .from("sales_markets")
    .select("id, status, approved_at")
    .eq("id", id)
    .maybeSingle();

  if (!markt) {
    return NextResponse.json({ error: "Deze markt bestaat niet." }, { status: 404 });
  }
  if (markt.status !== "wacht_op_goedkeuring") {
    return NextResponse.json(
      { error: "Deze markt heeft nog geen bedrijvenlijst om goed te keuren." },
      { status: 409 },
    );
  }
  if (markt.approved_at) {
    return NextResponse.json(
      { error: "Deze lijst is al goedgekeurd." },
      { status: 409 },
    );
  }

  // Alles wat niemand heeft weggehaald, gaat mee.
  const { error: bijwerkFout } = await admin
    .from("sales_market_companies")
    .update({ included: true, decided_by: user.id, decided_at: new Date().toISOString() })
    .eq("market_id", id)
    .is("included", null);

  if (bijwerkFout) {
    console.error(`Lijst van markt ${id} goedkeuren mislukt:`, bijwerkFout.message);
    return NextResponse.json({ error: "Het goedkeuren is niet gelukt." }, { status: 500 });
  }

  const { data: goedgekeurd } = await admin
    .from("sales_market_companies")
    .select("company_id")
    .eq("market_id", id)
    .eq("included", true);

  const bedrijven = (goedgekeurd ?? []) as { company_id: string }[];
  if (bedrijven.length === 0) {
    return NextResponse.json(
      { error: "Er staat geen enkel bedrijf meer in deze markt. Zet er eerst een terug." },
      { status: 409 },
    );
  }

  await admin
    .from("sales_markets")
    .update({ approved_at: new Date().toISOString(), approved_by: user.id })
    .eq("id", id);

  // Eén crawltaak per bedrijf. Geen AI, dus dit kost niets; wat het kost is tijd,
  // en die is verdeeld over evenveel taken als er bedrijven zijn.
  let ingepland = 0;
  for (const b of bedrijven) {
    const { created } = await enqueue(admin, {
      type: "sales_company_enrich",
      payload: { marketId: id, companyId: b.company_id },
      salesMarketId: id,
      dedupeKey: dedupe.salesEnrich(id, b.company_id),
    });
    if (created) ingepland++;
  }

  return NextResponse.json({ ok: true, bedrijven: bedrijven.length, ingepland }, { status: 202 });
}
