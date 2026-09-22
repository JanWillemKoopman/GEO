import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { determineStage } from "@/lib/pipeline/stage";
import {
  enqueue,
  dedupe,
  enqueueMeasurement,
  enqueueAiOverviewMeasurement,
  enqueueLlmResponseMeasurement,
} from "@/lib/jobs/queue";
import { describeError, classifyError } from "@/lib/errors";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { checkBudgetForProfile } from "@/lib/spend-limit";

/**
 * POST /api/analyses/[id]/hervatten, een vastgelopen cluster opnieuw op gang
 * helpen.
 *
 * ── WAAROM DEZE ROUTE ER IS ─────────────────────────────────────────────────
 *
 * De knop "probeer het opnieuw" stond op de resultatenpagina van een cluster,
 * die op 22 september 2026 is weggehaald
 * (`docs/tasks/clusterresultaat-zonder-eigen-scherm.md`). Daar wist het scherm
 * zelf in welke fase het misging, want het toonde per fase een ander
 * voortgangscomponent. Op het clusteroverzicht staat die kennis niet, en die
 * hoort daar ook niet: een kaartje in een lijst kan niet weten of het onderzoek
 * of de meting struikelde.
 *
 * Deze route beantwoordt die vraag op de server met `determineStage()` en plant
 * precies de fase in die aan de beurt is. Dezelfde afleiding als het oude
 * scherm maakte, nu op één plek in plaats van in drie voortgangscomponenten.
 *
 * ⚠️ Beide remmen staan er nog: opnieuw proberen is opnieuw betalen. De
 * voorbereiding valt onder `analyse_starten`, de meting onder `meting_starten`
 * (besluit 18), en het dagplafond geldt onverkort (`lib/spend-limit.ts`).
 *
 * Al gemeten vragen worden overgeslagen (conventie 9): opnieuw proberen pakt
 * alleen op wat nog mist en kost dus geen tweede volledige ronde.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  if (analysis.status !== "mislukt") {
    // Geen fout: twee mensen die tegelijk op de knop drukken horen allebei een
    // normaal antwoord te krijgen, niet één een storing.
    return NextResponse.json({ hervat: false, status: analysis.status });
  }

  const budget = await checkBudgetForProfile(analysis.profile_id);
  if (!budget.ok) return NextResponse.json({ error: budget.message }, { status: 402 });

  const fase = await determineStage(admin, id);

  try {
    if (fase === "prepare") {
      if (!(await mayTriggerCost(user.id, "analyse_starten"))) {
        return NextResponse.json({ error: COST_DENIED.analyse_starten }, { status: 403 });
      }
      await admin.from("analyses").update({ status: "bezig" }).eq("id", id);
      await enqueue(admin, {
        type: "prepare_analysis",
        payload: {},
        analysisId: id,
        dedupeKey: dedupe.prepareAnalysis(id),
      });
      return NextResponse.json({ hervat: true, fase, status: "bezig" });
    }

    if (!(await mayTriggerCost(user.id, "meting_starten"))) {
      return NextResponse.json({ error: COST_DENIED.meting_starten }, { status: 403 });
    }

    if (fase === "report") {
      // De meting staat er al, alleen het rapport ontbreekt. Opnieuw meten zou
      // hier de duurste stap van de app overdoen voor niets.
      //
      // ⚠️ De periode is de LAATSTE waarvoor gemeten is en niet altijd 0. Dat
      // is precies de fout die de losse rapportroute op 12 augustus 2026 al
      // eens had: een taak voor periode 0 zag dat dát rapport allang bestond,
      // zette de status op 'gereed' en deed verder niets, en de klant zag na
      // het klikken niets gebeuren.
      const { data: laatste } = await admin
        .from("visibility_scores")
        .select("week_no")
        .eq("analysis_id", id)
        .order("week_no", { ascending: false })
        .limit(1)
        .maybeSingle();
      const weekNo = (laatste?.week_no as number | undefined) ?? 0;

      await admin.from("analyses").update({ status: "gemeten" }).eq("id", id);
      await enqueue(admin, {
        type: "generate_report",
        payload: { weekNo },
        analysisId: id,
        dedupeKey: dedupe.generateReport(id, weekNo),
      });
      return NextResponse.json({ hervat: true, fase, weekNo, status: "gemeten" });
    }

    // Fase 'measure' betekent per definitie de nulmeting: bestond er een score
    // voor periode 0, dan had `determineStage()` 'report' gezegd.
    await admin.from("analyses").update({ status: "meten" }).eq("id", id);
    const { planned } = await enqueueMeasurement(admin, id, 0);
    const google = await enqueueAiOverviewMeasurement(admin, id, 0);
    const gemini = await enqueueLlmResponseMeasurement(admin, id, 0);
    return NextResponse.json({
      hervat: true,
      fase,
      status: "meten",
      planned: planned + google.planned + gemini.planned,
    });
  } catch (err) {
    console.error(`hervatten mislukt voor ${id}:`, err);
    return NextResponse.json(
      {
        error: "ORBIT ENGINE kon dit cluster niet opnieuw starten.",
        detail: describeError(err),
        problem: classifyError(err),
      },
      { status: 500 },
    );
  }
}
