import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSalesAdmin } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { keurMetingGoed } from "@/lib/pipeline/sales-remeasure";

/**
 * POST /api/sales/markets/[id]/measure, poort 2
 * (`docs/tasks/geo-prospect-engine.md` §8.1).
 *
 * ── WAAROM DEZE POORT BESTAAT ───────────────────────────────────────────────
 *
 * "De vragenlijst plus een kostenraming. Dit spiegelt de goedkeuringspoort die
 * vandaag vóór elke klantmeting zit, en om dezelfde reden: geen kosten zonder
 * akkoord, en de vragen bepalen alles wat erna komt."
 *
 * Dit is de duurste knop van de hele module. Veertig vragen maal twee engines is
 * ~95% van wat een marktronde kost (plan 21.1), en alles daarna, de
 * opportunities, de hooks, de mails, rust op wat hier gemeten wordt. Vandaar dat
 * de keten ná het schrijven van de vragen ECHT stopt: `sales_market_questions`
 * plant niets in, en alleen deze route zet de meting in gang.
 *
 * ── DE TWEE REMMEN ──────────────────────────────────────────────────────────
 *
 * 1. Alleen een sales admin, want dit kost geld (plan 4.2).
 * 2. Het plafond per markt wordt VOORAF over de hele ronde beoordeeld en niet
 *    per vraag. Per vraag beoordelen levert een ronde op die halverwege stopt:
 *    dertig van de veertig vragen gemeten, een score op een willekeurige
 *    deelverzameling, en een rekening die toch betaald is.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }
  if (!(await isSalesAdmin(user.id))) {
    // 404 en geen 403: een 403 bevestigt dat het scherm bestaat (plan 4.3).
    return new NextResponse(null, { status: 404 });
  }

  // Het werk zelf staat in `lib/pipeline/sales-remeasure.ts`, gedeeld met de
  // geplande hermeting.
  const uit = await keurMetingGoed(createAdminClient(), id, user.id);
  if (!uit.ok) {
    return NextResponse.json({ error: uit.melding }, { status: uit.code });
  }

  return NextResponse.json(
    { ok: true, vragen: uit.vragen, engines: uit.engines, ingepland: uit.ingepland },
    { status: 202 },
  );
}
