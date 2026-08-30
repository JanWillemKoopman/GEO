import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSalesAdmin } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { availableEngineIds } from "@/lib/engines/registry";
import { beoordeelRonde, besteedAanMarkt, raamMeetronde } from "@/lib/sales/budget";

/**
 * POST /api/sales/markets/[id]/remeasure, dezelfde markt opnieuw meten
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 22, sprint 7).
 *
 * ── DIT IS DE STAP DIE DE ECONOMIE VAN DE MODULE VERANDERT ──────────────────
 *
 * "Zonder opportunitytype 8 is een marktanalyse een eenmalige oogst: je haalt er
 * acht kansen uit en daarna is die markt leeg. Met dit type levert elke hermeting
 * een nieuwe lichting belaanleidingen op uit dezelfde markt, zonder nieuwe
 * marktontdekking en tegen alleen de meetkosten."
 *
 * ⚠️ **DEZELFDE VRAGEN, LETTERLIJK.** Type 8 vergelijkt twee rondes met elkaar,
 * en dat mag alleen als het verschil aan de markt ligt en niet aan de vraag. De
 * nieuwe ronde krijgt daarom een kopie van de vragen van de vorige ronde,
 * inclusief hun gewicht en hun intentielabel. Zou hij nieuwe vragen genereren,
 * dan meet je het verschil tussen twee vragenlijsten en presenteer je dat als een
 * daling van het bedrijf. Dat is de fout die een verkoper voor schut zet bij een
 * ondernemer die vraagt wat er precies veranderd is.
 *
 * ⚠️ En daarom slaat deze route de intentie- en vragenstap over, maar NIET poort
 * 2: meten kost geld, dus er komt een mens aan te pas (plan §8.1).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isSalesAdmin(user.id))) return new NextResponse(null, { status: 404 });

  const admin = createAdminClient();

  const { data: runs } = await admin
    .from("sales_runs")
    .select("id, round_no, status, intents_json, engines")
    .eq("market_id", id)
    .order("round_no", { ascending: false })
    .limit(1);

  const vorige = (runs ?? [])[0] as
    | {
        id: string;
        round_no: number;
        status: string;
        intents_json: Record<string, unknown> | null;
        engines: string[];
      }
    | undefined;

  if (!vorige) {
    return NextResponse.json(
      { error: "Deze markt is nog nooit gemeten. Start eerst een eerste ronde." },
      { status: 409 },
    );
  }
  if (vorige.status !== "klaar") {
    return NextResponse.json(
      { error: "De vorige ronde is nog niet afgerond. Wacht daarop, anders meet je door elkaar heen." },
      { status: 409 },
    );
  }

  const { data: vragen } = await admin
    .from("sales_questions")
    .select("text, intent_stage, intent_label, weight, frequency_estimate, source, position")
    .eq("run_id", vorige.id)
    .eq("active", true)
    .order("position");

  const teKopieren = (vragen ?? []) as Record<string, unknown>[];
  if (teKopieren.length === 0) {
    return NextResponse.json(
      { error: "De vorige ronde heeft geen actieve vragen om over te nemen." },
      { status: 409 },
    );
  }

  const engines = availableEngineIds();
  const oordeel = beoordeelRonde(await besteedAanMarkt(admin, id), teKopieren.length, engines.length);
  if (!oordeel.ok) {
    return NextResponse.json({ error: oordeel.melding }, { status: 409 });
  }

  const { data: nieuw, error } = await admin
    .from("sales_runs")
    .insert({
      market_id: id,
      round_no: vorige.round_no + 1,
      status: "vragen_klaar",
      // De intenties gaan mee, want de vragen dragen hun labels en die moeten
      // naar dezelfde intentie blijven wijzen.
      intents_json: vorige.intents_json,
      question_count: teKopieren.length,
      engines,
      estimate_usd: raamMeetronde(teKopieren.length, engines.length),
      created_by: user.id,
      notes: `Hermeting van ronde ${vorige.round_no}, met exact dezelfde vragen.`,
    })
    .select("id")
    .single();

  if (error || !nieuw) {
    console.error(`Hermeting van markt ${id} mislukt:`, error?.message);
    return NextResponse.json({ error: "De hermeting kon niet gestart worden." }, { status: 500 });
  }

  const runId = nieuw.id as string;
  const { error: kopieerFout } = await admin.from("sales_questions").insert(
    teKopieren.map((v) => ({
      run_id: runId,
      text: v.text,
      intent_stage: v.intent_stage,
      intent_label: v.intent_label,
      weight: v.weight,
      frequency_estimate: v.frequency_estimate,
      source: v.source,
      position: v.position,
    })),
  );
  if (kopieerFout) {
    console.error(`Vragen kopiëren mislukt voor ronde ${runId}:`, kopieerFout.message);
    return NextResponse.json({ error: "De vragen konden niet overgenomen worden." }, { status: 500 });
  }

  // De markt wacht weer op poort 2. Meten kost geld, ook de tweede keer.
  await admin.from("sales_markets").update({ status: "vragen_klaar" }).eq("id", id);

  return NextResponse.json(
    { ok: true, runId, ronde: vorige.round_no + 1, vragen: teKopieren.length },
    { status: 202 },
  );
}
