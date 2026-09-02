import "server-only";

/**
 * Een hermeting starten, met de hand of op een geplande datum
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 22, sprint 7).
 *
 * ── WAAROM DIT UIT DE ROUTES GEHAALD IS (1 september 2026) ──────────────────
 *
 * De knop "Meet deze markt opnieuw" en de knop "Geef de meting akkoord" deden
 * hun werk in de routes zelf. Dat werkt zolang een mens erop drukt. Sinds de
 * eigenaar een hermeting vooruit kan zetten met een datum, moet dezelfde
 * handeling ook vanuit de wachtrij kunnen, en dan is code in een route
 * onbereikbaar. Twee keer hetzelfde opschrijven zou betekenen dat de geplande
 * hermeting op een dag iets anders doet dan de knop, en dat merk je pas als de
 * cijfers van twee rondes niet meer vergelijkbaar zijn.
 *
 * ── DE ENE INHOUDELIJKE REGEL ───────────────────────────────────────────────
 *
 * **Dezelfde vragen, letterlijk.** Type 8 ("gezakt sinds de vorige meting")
 * vergelijkt twee rondes, en dat mag alleen als het verschil aan de markt ligt
 * en niet aan de vraag. De nieuwe ronde krijgt daarom een kopie van de vragen
 * van de vorige, inclusief gewicht en intentielabel.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { availableEngineIds } from "@/lib/engines/registry";
import { beoordeelRonde, besteedAanMarkt, raamMeetronde } from "@/lib/sales/budget";
import type { EngineId } from "@/lib/engines/types";

type Admin = SupabaseClient;

export interface HermeetUitkomst {
  ok: boolean;
  /** Waarom het niet kon, in gewone taal. Leeg als het gelukt is. */
  melding: string | null;
  runId: string | null;
  ronde: number | null;
  vragen: number;
}

/**
 * Zet een nieuwe ronde klaar met de vragen van de vorige. Meet nog niet.
 *
 * De ronde eindigt op `vragen_klaar`, dus bij poort 2. Wie hem met de hand
 * start, ziet daar de kostenraming en drukt zelf door. Wie hem inplant, heeft
 * die raming bij het inplannen gezien, en dan zet `keurMetingGoed()` hem meteen
 * daarna in gang.
 */
export async function maakHermeting(
  admin: Admin,
  marketId: string,
  userId: string | null,
): Promise<HermeetUitkomst> {
  const { data: runs } = await admin
    .from("sales_runs")
    .select("id, round_no, status, intents_json, engines")
    .eq("market_id", marketId)
    .order("round_no", { ascending: false })
    .limit(1);

  const vorige = (runs ?? [])[0] as
    | { id: string; round_no: number; status: string; intents_json: Record<string, unknown> | null }
    | undefined;

  if (!vorige) {
    return {
      ok: false,
      melding: "Deze markt is nog nooit gemeten. Start eerst een eerste ronde.",
      runId: null,
      ronde: null,
      vragen: 0,
    };
  }
  if (vorige.status !== "klaar") {
    return {
      ok: false,
      melding:
        "De vorige ronde is nog niet afgerond. Wacht daarop, anders meet je door elkaar heen.",
      runId: null,
      ronde: null,
      vragen: 0,
    };
  }

  const { data: vragen } = await admin
    .from("sales_questions")
    .select("text, intent_stage, intent_label, weight, frequency_estimate, source, position")
    .eq("run_id", vorige.id)
    .eq("active", true)
    .order("position");

  const teKopieren = (vragen ?? []) as Record<string, unknown>[];
  if (teKopieren.length === 0) {
    return {
      ok: false,
      melding: "De vorige ronde heeft geen actieve vragen om over te nemen.",
      runId: null,
      ronde: null,
      vragen: 0,
    };
  }

  const engines = availableEngineIds();
  const oordeel = beoordeelRonde(
    await besteedAanMarkt(admin, marketId),
    teKopieren.length,
    engines.length,
  );
  if (!oordeel.ok) {
    return { ok: false, melding: oordeel.melding, runId: null, ronde: null, vragen: 0 };
  }

  const { data: nieuw, error } = await admin
    .from("sales_runs")
    .insert({
      market_id: marketId,
      round_no: vorige.round_no + 1,
      status: "vragen_klaar",
      intents_json: vorige.intents_json,
      question_count: teKopieren.length,
      engines,
      estimate_usd: raamMeetronde(teKopieren.length, engines.length),
      created_by: userId,
      notes: `Hermeting van ronde ${vorige.round_no}, met exact dezelfde vragen.`,
    })
    .select("id")
    .single();

  if (error || !nieuw) {
    console.error(`Hermeting van markt ${marketId} mislukt:`, error?.message);
    return {
      ok: false,
      melding: "De hermeting kon niet gestart worden.",
      runId: null,
      ronde: null,
      vragen: 0,
    };
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
    return {
      ok: false,
      melding: "De vragen konden niet overgenomen worden.",
      runId,
      ronde: vorige.round_no + 1,
      vragen: 0,
    };
  }

  await admin.from("sales_markets").update({ status: "vragen_klaar" }).eq("id", marketId);

  return {
    ok: true,
    melding: null,
    runId,
    ronde: vorige.round_no + 1,
    vragen: teKopieren.length,
  };
}

export interface GoedkeurUitkomst {
  ok: boolean;
  melding: string | null;
  /** HTTP-code voor de route die hem aanroept. 409 is "kan nu niet", 404 "bestaat niet". */
  code: number;
  vragen: number;
  engines: string[];
  ingepland: number;
}

/**
 * Poort 2: de meting goedkeuren en de vragen inplannen.
 *
 * ⚠️ Het plafond wordt VOORAF over de hele ronde beoordeeld en niet per vraag.
 * Per vraag beoordelen levert een ronde op die halverwege stopt: dertig van de
 * veertig vragen gemeten, een score op een willekeurige deelverzameling, en een
 * rekening die toch betaald is.
 */
export async function keurMetingGoed(
  admin: Admin,
  marketId: string,
  userId: string | null,
): Promise<GoedkeurUitkomst> {
  const leeg = { vragen: 0, engines: [] as string[], ingepland: 0 };

  const { data: markt } = await admin
    .from("sales_markets")
    .select("id")
    .eq("id", marketId)
    .maybeSingle();
  if (!markt) {
    return { ok: false, melding: "Deze markt bestaat niet.", code: 404, ...leeg };
  }

  const { data: runRijen } = await admin
    .from("sales_runs")
    .select("id, status, approved_at, question_count")
    .eq("market_id", marketId)
    .order("round_no", { ascending: false })
    .limit(1);

  const run = (runRijen ?? [])[0] as
    | { id: string; status: string; approved_at: string | null }
    | undefined;

  if (!run) {
    return {
      ok: false,
      melding: "Er staat nog geen vragenlijst klaar voor deze markt.",
      code: 409,
      ...leeg,
    };
  }
  if (run.status !== "vragen_klaar") {
    return {
      ok: false,
      melding: "De vragen van deze markt staan nog niet klaar om goed te keuren.",
      code: 409,
      ...leeg,
    };
  }
  if (run.approved_at) {
    return { ok: false, melding: "Deze meting is al goedgekeurd.", code: 409, ...leeg };
  }

  const { data: vraagRijen } = await admin
    .from("sales_questions")
    .select("id")
    .eq("run_id", run.id)
    .eq("active", true)
    .order("position");

  const vragen = (vraagRijen ?? []) as { id: string }[];
  if (vragen.length === 0) {
    return {
      ok: false,
      melding: "Er staat geen enkele vraag meer in deze lijst. Zet er eerst een terug.",
      code: 409,
      ...leeg,
    };
  }

  const engines = availableEngineIds();
  if (engines.length === 0) {
    return {
      ok: false,
      melding: "Er is geen enkele AI-assistent beschikbaar om te meten.",
      code: 409,
      ...leeg,
    };
  }

  const oordeel = beoordeelRonde(
    await besteedAanMarkt(admin, marketId),
    vragen.length,
    engines.length,
  );
  if (!oordeel.ok) {
    return { ok: false, melding: oordeel.melding, code: 409, ...leeg };
  }

  const nu = new Date().toISOString();
  await admin
    .from("sales_runs")
    .update({
      status: "meet",
      approved_at: nu,
      approved_by: userId,
      started_at: nu,
      question_count: vragen.length,
      engines,
      estimate_usd: raamMeetronde(vragen.length, engines.length),
    })
    .eq("id", run.id);

  await admin.from("sales_markets").update({ status: "meet" }).eq("id", marketId);

  // Eén taak per vraag per engine. Dezelfde vragen naar beide engines, zodat het
  // verschil aan de engine ligt en niet aan de vraag (plan hoofdstuk 11).
  let ingepland = 0;
  for (const vraag of vragen) {
    for (const engine of engines as EngineId[]) {
      const { created } = await enqueue(admin, {
        type: "sales_measure_question",
        payload: { marketId, runId: run.id, questionId: vraag.id, engine },
        salesMarketId: marketId,
        salesRunId: run.id,
        dedupeKey: dedupe.salesMeasure(run.id, vraag.id, engine),
      });
      if (created) ingepland++;
    }
  }

  return {
    ok: true,
    melding: null,
    code: 202,
    vragen: vragen.length,
    engines,
    ingepland,
  };
}

/**
 * De geplande hermetingen die vandaag aan de beurt zijn, uitvoeren.
 *
 * ⚠️ **Deze meet ECHT, zonder tweede bevestiging.** Dat is het verschil met de
 * knop, en het is bewust: wie een datum zet, ziet op dat moment de kostenraming
 * en zegt daarmee ja tegen die ene ronde. Zou de app op de geplande dag alsnog
 * op poort 2 blijven staan, dan is "vooruit plannen" niets waard: je moet er
 * dan alsnog op het juiste moment bij zijn.
 *
 * Het plafond per markt geldt onverkort. Loopt een markt daar tegenaan, dan
 * gebeurt er niets en staat de reden in `remeasure_note`.
 *
 * ⚠️ `remeasure_done_at` wordt gezet vóór het echte werk. Anders pakt de werker
 * dezelfde markt een minuut later opnieuw op, en dat is de duurste lus die dit
 * systeem kan maken: veertig betaalde vragen per keer.
 */
export async function draaiGeplandeHermetingen(admin: Admin): Promise<number> {
  const nu = new Date().toISOString();

  const { data } = await admin
    .from("sales_markets")
    .select("id, label, remeasure_set_by")
    .not("remeasure_at", "is", null)
    .is("remeasure_done_at", null)
    .lte("remeasure_at", nu)
    .limit(5);

  const markten = (data ?? []) as { id: string; label: string; remeasure_set_by: string | null }[];
  let gestart = 0;

  for (const markt of markten) {
    await admin
      .from("sales_markets")
      .update({ remeasure_done_at: nu })
      .eq("id", markt.id);

    const nieuw = await maakHermeting(admin, markt.id, markt.remeasure_set_by);
    if (!nieuw.ok) {
      await admin
        .from("sales_markets")
        .update({ remeasure_note: `Geplande hermeting ging niet door: ${nieuw.melding ?? ""}` })
        .eq("id", markt.id);
      continue;
    }

    const meting = await keurMetingGoed(admin, markt.id, markt.remeasure_set_by);
    await admin
      .from("sales_markets")
      .update({
        remeasure_note: meting.ok
          ? `Geplande hermeting gestart op ${new Date(nu).toLocaleDateString("nl-NL")}: ` +
            `ronde ${nieuw.ronde}, ${meting.vragen} vragen.`
          : `De hermeting stond klaar maar de meting startte niet: ${meting.melding ?? ""}`,
      })
      .eq("id", markt.id);

    if (meting.ok) gestart++;
  }

  return gestart;
}
