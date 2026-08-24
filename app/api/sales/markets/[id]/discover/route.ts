import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSalesAdmin } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { checkBudget } from "@/lib/spend-limit";
import { beoordeelBudget, besteedAanMarkt } from "@/lib/sales/budget";
import { magOvergaan, isMarktStand } from "@/lib/sales/market";

/**
 * POST /api/sales/markets/[id]/discover, het marktonderzoek starten
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 9).
 *
 * ── DRIE REMMEN, EN ZE STAAN LOS VAN ELKAAR ─────────────────────────────────
 *
 * Dezelfde opzet als de reputatieroute, en om dezelfde reden: elke dure route
 * stelt dezelfde vragen aan dezelfde functies, zodat er geen tweede oordeel
 * ontstaat dat kan afdrijven (conventie P2).
 *
 *   1. **Wie mag dit starten?** `isSalesAdmin`. Niet `mayTriggerCost`, want dat
 *      is `isStaff` en een sales admin hoeft geen beheerder te zijn. Dit is de
 *      Sales-versie van hetzelfde besluit: wie de rekening draagt, beslist
 *      wanneer er betaald wordt (plan §4.2).
 *   2. **Is er nog dagbudget over?** `checkBudget(null)`, het plafond over alle
 *      klanten samen. Er is hier geen account om op af te rekenen: een markt is
 *      geen klant.
 *   3. **Past het binnen het plafond van deze markt?** `beoordeelBudget`, tien
 *      euro per markt (plan 21.3).
 *
 * De derde rem staat er óók in de taak zelf. Dat is geen verdubbeling: tussen de
 * klik en het draaien van de taak kan er van alles gebeuren, en de taak is de
 * enige plek die het weet op het moment dat het geld wordt uitgegeven.
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
  // 404 en geen 403: een 403 bevestigt dat deze route bestaat (plan §4.3).
  if (!(await isSalesAdmin(user.id))) {
    return new NextResponse(null, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: markt } = await admin
    .from("sales_markets")
    .select("id, status, label")
    .eq("id", id)
    .maybeSingle();

  if (!markt) {
    return NextResponse.json({ error: "Deze markt bestaat niet." }, { status: 404 });
  }

  // ⚠️ De statusmachine beslist, niet de route. Zou hier een eigen `if` staan,
  // dan is er een tweede plek die weet welke overgang mag, en die twee lopen
  // gegarandeerd uit elkaar (conventie P2).
  const huidig = markt.status as string;
  if (!isMarktStand(huidig) || !magOvergaan(huidig, "bedrijven_gevonden")) {
    return NextResponse.json(
      {
        error:
          huidig === "mislukt"
            ? "Deze markt staat op 'niet gelukt'. Zet hem eerst terug op concept."
            : "Het onderzoek voor deze markt is al gestart.",
      },
      { status: 409 },
    );
  }

  // ── Rem 2: het dagplafond over alle klanten samen ────────────────────────
  const dag = await checkBudget(null);
  if (!dag.ok) {
    return NextResponse.json({ error: dag.message }, { status: 402 });
  }

  // ── Rem 3: het plafond van deze markt ────────────────────────────────────
  const oordeel = beoordeelBudget(await besteedAanMarkt(admin, id), "discover");
  if (!oordeel.ok) {
    return NextResponse.json({ error: oordeel.melding }, { status: 402 });
  }

  const { created } = await enqueue(admin, {
    type: "sales_market_discover",
    payload: { marketId: id },
    salesMarketId: id,
    dedupeKey: dedupe.salesDiscover(id),
  });

  if (!created) {
    return NextResponse.json(
      { error: "Het onderzoek voor deze markt loopt al." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
