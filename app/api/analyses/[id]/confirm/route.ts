import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { enqueueMeasurement } from "@/lib/jobs/queue";
import { describeError, classifyError } from "@/lib/errors";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { checkBudgetForProfile } from "@/lib/spend-limit";

/**
 * POST /api/analyses/[id]/confirm, de review-gate (abcplan.md §3.6/A2c).
 * De klant heeft Brand DNA + prompts gezien en (evt.) aangepast; dit is de
 * enige plek waar status concept_klaar → meten mag. Halte A3 (de meting zelf)
 * wordt in Sprint 4 gebouwd. Deze route zet alleen de status.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  if (analysis.status !== "concept_klaar") {
    return NextResponse.json(
      { error: "Deze analyse staat niet klaar om bevestigd te worden." },
      { status: 409 },
    );
  }

  // ⚠️ Betaald werk start alleen de beheerder (besluit 18). Zie lib/cost-guard.ts
  // voor de rekensom eronder: zonder deze regel kan een klant op één middag
  // dollars uitgeven zonder dat iemand het merkt.
  if (!(await mayTriggerCost(user.id))) {
    return NextResponse.json({ error: COST_DENIED.meting_starten }, { status: 403 });
  }

  // ⚠️ De TWEEDE rem, en hij staat los van de eerste (F1, lib/spend-limit.ts).
  // Besluit 18 hierboven haalde de klant weg als risicobron. Wat het niet
  // wegneemt: een beheerder die zich vergist in een lus, of een cron die
  // twintig keer vuurt. Die vragen niemand om toestemming.
  const budget = await checkBudgetForProfile(analysis.profile_id);
  if (!budget.ok) {
    return NextResponse.json({ error: budget.message }, { status: 402 });
  }

  // Zonder actieve vragen valt er niets te meten, en zou de analyse blijven
  // hangen op 'meten': er komen nul taken in de rij, dus de aggregatie en het
  // rapport worden nooit afgetrapt en het voortgangsscherm draait eindeloos.
  // De klant kan dit zelf veroorzaken door in het conceptscherm alle vragen uit
  // te zetten. Dan hoort hij te horen wat er mis is, niet een spinner te zien.
  const { count: activePrompts } = await admin
    .from("prompts")
    .select("id", { count: "exact", head: true })
    .eq("analysis_id", id)
    .eq("active", true);

  if (!activePrompts) {
    return NextResponse.json(
      { error: "Er staat geen enkele vraag aan. Zet minstens één vraag aan om de meting te starten." },
      { status: 409 },
    );
  }

  // Goedkeuring IS het startsein voor de meting (optimalisatie.md 1.5). Die
  // hier inplannen in plaats van in het voortgangsscherm: sloot de klant na het
  // bevestigen de tab, dan werd er voorheen nooit gemeten.
  //
  // Eerst inplannen, dan pas de status omzetten. Andersom kon de analyse op
  // 'meten' blijven staan terwijl het inplannen stukliep, een status die belooft
  // wat er niet gebeurt. Deze volgorde herstelt zichzelf: draaien de taken al
  // terwijl de status nog 'concept_klaar' is, dan zet de aggregatietaak hem
  // alsnog door.
  let planned: number;
  let totalPrompts: number;
  try {
    ({ planned, totalPrompts } = await enqueueMeasurement(admin, id, 0));
  } catch (err) {
    console.error(`meting inplannen mislukt bij bevestigen van ${id}:`, err);
    return NextResponse.json(
      { error: "ORBIT ENGINE kon de meting niet inplannen.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }

  const { error } = await admin.from("analyses").update({ status: "meten" }).eq("id", id);
  if (error) return NextResponse.json({ error: "Bevestigen is niet gelukt." }, { status: 500 });

  return NextResponse.json({ status: "meten", planned, totalPrompts });
}
