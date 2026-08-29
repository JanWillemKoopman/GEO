import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSalesAdmin } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { availableEngineIds } from "@/lib/engines/registry";
import { beoordeelRonde, besteedAanMarkt, raamMeetronde } from "@/lib/sales/budget";
import type { EngineId } from "@/lib/engines/types";

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

  const admin = createAdminClient();

  const { data: markt } = await admin
    .from("sales_markets")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!markt) {
    return NextResponse.json({ error: "Deze markt bestaat niet." }, { status: 404 });
  }

  // De jongste ronde die op goedkeuring wacht.
  const { data: runRijen } = await admin
    .from("sales_runs")
    .select("id, status, approved_at, question_count")
    .eq("market_id", id)
    .order("round_no", { ascending: false })
    .limit(1);

  const run = (runRijen ?? [])[0] as
    | { id: string; status: string; approved_at: string | null; question_count: number }
    | undefined;

  if (!run) {
    return NextResponse.json(
      { error: "Er staat nog geen vragenlijst klaar voor deze markt." },
      { status: 409 },
    );
  }
  if (run.status !== "vragen_klaar") {
    return NextResponse.json(
      { error: "De vragen van deze markt staan nog niet klaar om goed te keuren." },
      { status: 409 },
    );
  }
  if (run.approved_at) {
    return NextResponse.json({ error: "Deze meting is al goedgekeurd." }, { status: 409 });
  }

  // Alleen de vragen die er na poort 2 nog in staan. Wie een vraag weghaalt,
  // haalt hem ook uit de kostenraming, en dat is precies waarom die keuze hier
  // en niet eerder gemaakt wordt.
  const { data: vraagRijen } = await admin
    .from("sales_questions")
    .select("id")
    .eq("run_id", run.id)
    .eq("active", true)
    .order("position");

  const vragen = (vraagRijen ?? []) as { id: string }[];
  if (vragen.length === 0) {
    return NextResponse.json(
      { error: "Er staat geen enkele vraag meer in deze lijst. Zet er eerst een terug." },
      { status: 409 },
    );
  }

  const engines = availableEngineIds();
  if (engines.length === 0) {
    return NextResponse.json(
      { error: "Er is geen enkele AI-assistent beschikbaar om te meten." },
      { status: 409 },
    );
  }

  const besteed = await besteedAanMarkt(admin, id);
  const oordeel = beoordeelRonde(besteed, vragen.length, engines.length);
  if (!oordeel.ok) {
    return NextResponse.json({ error: oordeel.melding }, { status: 409 });
  }

  await admin
    .from("sales_runs")
    .update({
      status: "meet",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      started_at: new Date().toISOString(),
      question_count: vragen.length,
      engines,
      estimate_usd: raamMeetronde(vragen.length, engines.length),
    })
    .eq("id", run.id);

  await admin.from("sales_markets").update({ status: "meet" }).eq("id", id);

  // Eén taak per vraag per engine. Dezelfde vragen naar beide engines, zodat het
  // verschil aan de engine ligt en niet aan de vraag (plan hoofdstuk 11, regel 1).
  let ingepland = 0;
  for (const vraag of vragen) {
    for (const engine of engines as EngineId[]) {
      const { created } = await enqueue(admin, {
        type: "sales_measure_question",
        payload: { marketId: id, runId: run.id, questionId: vraag.id, engine },
        salesMarketId: id,
        salesRunId: run.id,
        dedupeKey: dedupe.salesMeasure(run.id, vraag.id, engine),
      });
      if (created) ingepland++;
    }
  }

  return NextResponse.json(
    { ok: true, vragen: vragen.length, engines, ingepland },
    { status: 202 },
  );
}
