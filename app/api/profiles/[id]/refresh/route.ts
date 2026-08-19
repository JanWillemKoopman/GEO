import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { checkBudgetForProfile } from "@/lib/spend-limit";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { planRefresh, type RefreshTask } from "@/lib/pipeline/onboarding-refresh";
import { PROMPT_CATEGORIES } from "@/lib/types/database";

/**
 * POST /api/profiles/[id]/refresh: het onderzoek bijwerken ná het gesprek
 * (onboarding 3.0, fase 4).
 *
 * ── WAAROM DEZE ROUTE BESTAAT ───────────────────────────────────────────────
 *
 * Zonder deze stap is de onboardingsessie een archief: de consultant legt vast
 * dat het merk landelijk werkt in plaats van lokaal, en de vragen die de meting
 * straks stelt zijn nog steeds gegenereerd op de gok van het model.
 *
 * ── WAAROM HIJ NIET ALLES OPNIEUW DRAAIT ────────────────────────────────────
 *
 * `onboarding-refresh.ts` rekent per gewijzigd veld uit welke stappen er écht
 * anders van worden. Van de vijftien velden uit migratie 0060 veranderen er acht
 * niets aan wat er te onderzoeken valt; die worden pas bij de volgende meting of
 * contentronde gelezen.
 *
 * ── WAT "GEWIJZIGD" BETEKENT ────────────────────────────────────────────────
 *
 * Elke rij in `profile_field_sources` met een mensbron die is gezet ná de laatste
 * onderzoeksronde (`profiles.deep_research_at`). Dat is precies wat de sessie
 * wegschrijft, en het vraagt geen tweede administratie.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile)
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  // ⚠️ Betaald werk start alleen de beheerder (besluit 18), en het budget van
  // het account is de tweede, onafhankelijke rem (F1).
  if (!(await mayTriggerCost(user.id))) {
    return NextResponse.json(
      { error: COST_DENIED.merk_onderzoeken },
      { status: 403 },
    );
  }
  const budget = await checkBudgetForProfile(id);
  if (!budget.ok) {
    return NextResponse.json({ error: budget.message }, { status: 402 });
  }

  const veranderd = await changedSinceResearch(admin, id, profile.deep_research_at);

  // Alleen analyses waar nog geen meting op gedraaid heeft. Bij een analyse die
  // al gemeten is zou een nieuwe vragenset de trendlijn breken, en dat is een
  // beslissing die niemand onbedoeld hoort te nemen vanaf een gespreksscherm.
  const { data: analyseRijen } = await admin
    .from("analyses")
    .select("id")
    .eq("profile_id", id)
    .is("archived_at", null)
    .in("status", ["bezig", "concept_klaar"]);
  const analyses = (analyseRijen ?? []).map((a) => a.id as string);

  const plan = planRefresh(veranderd, { analyses: analyses.length });
  if (plan.tasks.length === 0) {
    return NextResponse.json({
      ok: true,
      planned: 0,
      tasks: [],
      message: "Er is niets veranderd waar het onderzoek anders van wordt.",
    });
  }

  let planned = 0;
  for (const taak of plan.tasks) {
    planned += await schedule(admin, taak, id, analyses);
  }

  return NextResponse.json({ ok: true, planned, tasks: plan.tasks, changed: veranderd });
}

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Welke velden zijn er sinds de laatste onderzoeksronde door een mens gezet?
 *
 * `deep_research_at` leeg betekent dat er nog nooit onderzoek gedraaid heeft.
 * Dan is er ook niets bij te werken: de eerste ronde neemt alles vanzelf mee.
 */
async function changedSinceResearch(
  admin: Admin,
  profileId: string,
  since: string | null,
): Promise<string[]> {
  if (!since) return [];
  const { data } = await admin
    .from("profile_field_sources")
    .select("field, source, set_at")
    .eq("profile_id", profileId)
    .gt("set_at", since);
  return ((data ?? []) as { field: string; source: string }[])
    .filter((r) => r.source !== "ai")
    .map((r) => r.field);
}

/**
 * Eén stap inplannen.
 *
 * ⚠️ `chain: false` op alles wat in de eerste ronde een opvolger had. Zonder dat
 * sleept één gewijzigde concurrent de kennistest en de synthese mee, en dat zijn
 * de twee duurste stappen van de onboarding.
 */
async function schedule(
  admin: Admin,
  taak: RefreshTask,
  profileId: string,
  analyses: string[],
): Promise<number> {
  if (taak === "markt") {
    const r = await enqueue(admin, {
      type: "profile_market",
      payload: { chain: false },
      profileId,
      dedupeKey: dedupe.profileMarket(profileId),
    });
    return r.created ? 1 : 0;
  }

  if (taak === "kennistest") {
    const r = await enqueue(admin, {
      type: "profile_llm_baseline",
      payload: { chain: false },
      profileId,
      dedupeKey: dedupe.llmBaseline(profileId),
    });
    return r.created ? 1 : 0;
  }

  if (taak === "onderwerpen") {
    const r = await enqueue(admin, {
      type: "propose_topics",
      payload: {},
      profileId,
      dedupeKey: dedupe.proposeTopics(profileId),
    });
    return r.created ? 1 : 0;
  }

  // De vragen: één taak per funnelfase per analyse, net als bij de eerste
  // voorbereiding. `regenerate` zet de oude vragen op inactief in plaats van ze
  // te verwijderen, anders gaan de metingen via de foreign key mee.
  let n = 0;
  for (const analysisId of analyses) {
    for (const fase of PROMPT_CATEGORIES) {
      const r = await enqueue(admin, {
        type: "generate_prompts",
        payload: { category: fase, regenerate: true },
        analysisId,
        dedupeKey: dedupe.generatePrompts(analysisId, fase),
      });
      if (r.created) n++;
    }
  }
  return n;
}
