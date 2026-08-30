import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSalesAdmin } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueue, dedupe } from "@/lib/jobs/queue";

/**
 * POST /api/sales/markets/[id]/report, het publieke rapport laten schrijven
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 20 en 21.2).
 *
 * ── WAAROM DIT EEN APARTE HANDELING IS EN GEEN STAP IN DE KETEN ─────────────
 *
 * De begroting in plan 21.2 zegt het letterlijk: "Publiek rapport schrijven,
 * alleen bij publicatie." Zou de meetketen dit vanzelf doen, dan schrijft ORBIT
 * ENGINE voor elke markt een pagina die misschien nooit online komt, en dat is
 * geld voor tekst die niemand leest.
 *
 * Het schrijven en het publiceren zijn bovendien twee besluiten. Eerst lees je
 * wat er staat, dan zet je het online. Een knop die allebei tegelijk doet, zet
 * een tekst online die niemand gelezen heeft, en op deze pagina staan de namen
 * van bedrijven die er niet om gevraagd hebben.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isSalesAdmin(user.id))) return new NextResponse(null, { status: 404 });

  const admin = createAdminClient();

  const { data: runs } = await admin
    .from("sales_runs")
    .select("id")
    .eq("market_id", id)
    .eq("status", "klaar")
    .order("round_no", { ascending: false })
    .limit(1);

  const run = (runs ?? [])[0] as { id: string } | undefined;
  if (!run) {
    return NextResponse.json(
      { error: "Er is nog geen afgeronde meting om over te schrijven." },
      { status: 409 },
    );
  }

  const { created } = await enqueue(admin, {
    type: "sales_market_report",
    payload: { marketId: id, runId: run.id },
    salesMarketId: id,
    salesRunId: run.id,
    dedupeKey: dedupe.salesReport(run.id),
  });

  return NextResponse.json({ ok: true, ingepland: created }, { status: 202 });
}
