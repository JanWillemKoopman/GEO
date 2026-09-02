import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSalesAdmin } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/sales/markets/[id]/schedule, een hermeting vooruit zetten.
 *
 * ── WAAROM EEN DATUM EN GEEN VAST RITME ─────────────────────────────────────
 *
 * Het sterkste verkoopmoment dat deze module kent is een daling: "je bent sinds
 * juni gezakt van achttien naar negen" is een gebeurtenis, en die roept vanzelf
 * de vraag op wat er veranderd is. Dat type kan pas bestaan vanaf de tweede
 * ronde (plan hoofdstuk 12, type 8). Zonder tweede ronde is elke markt een
 * eenmalige oogst.
 *
 * Een vast maandritme over alle markten zou dat oplossen en tegelijk elke maand
 * geld uitgeven aan markten waar niemand mee werkt. Vandaar één datum per markt,
 * met de hand gezet, die één keer afgaat.
 *
 * ⚠️ **Op die datum wordt er ECHT gemeten, zonder tweede bevestiging.** Dat is
 * de hele bedoeling van vooruit plannen. Wie de datum zet, ziet op dat moment de
 * kostenraming, en dat is het akkoord uit poort 2 (plan §8.1) op een ander
 * moment gegeven. Het plafond per markt blijft gelden.
 */
interface Body {
  /** `YYYY-MM-DD`, of leeg om de geplande hermeting te annuleren. */
  datum?: string | null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  // Alleen een sales admin: dit is de knop die op een dag geld uitgeeft.
  if (!(await isSalesAdmin(user.id))) return new NextResponse(null, { status: 404 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Annuleren mag altijd en kost niets.
  const ruw = (body.datum ?? "").trim();
  if (ruw.length === 0) {
    await admin
      .from("sales_markets")
      .update({
        remeasure_at: null,
        remeasure_set_by: null,
        remeasure_done_at: null,
        remeasure_note: null,
      })
      .eq("id", id);
    return NextResponse.json({ ok: true, gepland: null });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(ruw)) {
    return NextResponse.json({ error: "Kies een datum." }, { status: 400 });
  }

  // Om zes uur 's ochtends, zodat de uitkomst er ligt als iemand die dag begint.
  const wanneer = new Date(`${ruw}T06:00:00.000Z`);
  if (Number.isNaN(wanneer.getTime())) {
    return NextResponse.json({ error: "Kies een datum." }, { status: 400 });
  }

  // ⚠️ Morgen op zijn vroegst. Een datum van vandaag of eerder zou binnen een
  // minuut afgaan, en dan is dit een dure knop met een datumkiezer ervoor in
  // plaats van een planning. Wie nu wil meten, gebruikt de knop ernaast.
  const morgen = new Date();
  morgen.setUTCHours(0, 0, 0, 0);
  morgen.setUTCDate(morgen.getUTCDate() + 1);
  if (wanneer < morgen) {
    return NextResponse.json(
      {
        error:
          "Kies een datum vanaf morgen. Wil je nu meten, gebruik dan de knop " +
          '"Meet deze markt opnieuw".',
      },
      { status: 400 },
    );
  }

  const { data: markt } = await admin
    .from("sales_markets")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!markt) return NextResponse.json({ error: "Deze markt bestaat niet." }, { status: 404 });

  const { error } = await admin
    .from("sales_markets")
    .update({
      remeasure_at: wanneer.toISOString(),
      remeasure_set_by: user.id,
      // Opnieuw plannen zet het slot terug: anders zou een markt die ooit
      // hermeten is, nooit meer een tweede geplande ronde krijgen.
      remeasure_done_at: null,
      remeasure_note: null,
    })
    .eq("id", id);

  if (error) {
    console.error(`Hermeting plannen mislukt (${id}):`, error.message);
    return NextResponse.json({ error: "Het plannen is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, gepland: wanneer.toISOString() });
}
