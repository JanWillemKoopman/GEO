import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { createPlan } from "@/lib/plans";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { checkBudgetForProfile } from "@/lib/spend-limit";

/**
 * POST /api/profiles/[id]/plan, een contentplan opstellen.
 *
 * Geen AI-aanroep: `createPlan()` maakt twaalf lege maanden, haalt de gemeten
 * kansen op uit de rapporten en vult daarmee alleen maand 1. De rest van het jaar
 * stelt de gebruiker zelf samen. Zie de toelichting bovenaan `lib/plans.ts`.
 *
 * ⚠️ Het aantal pagina's per maand komt uit het pakket op het ACCOUNT en niet
 * uit het verzoek. Zou de client dat mogen meesturen, dan is de quota een
 * suggestie in plaats van een afspraak, en dan kan iemand met een pakket van 10
 * er 40 vragen.
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  // ⚠️ Betaald werk start alleen de beheerder (besluit 18). Zie lib/cost-guard.ts
  // voor de rekensom eronder: zonder deze regel kan een klant op één middag
  // dollars uitgeven zonder dat iemand het merkt.
  if (!(await mayTriggerCost(user.id))) {
    return NextResponse.json({ error: COST_DENIED.content_schrijven }, { status: 403 });
  }

  // ⚠️ De TWEEDE rem, en hij staat los van de eerste (F1, lib/spend-limit.ts).
  // Besluit 18 hierboven haalde de klant weg als risicobron. Wat het niet
  // wegneemt: een beheerder die zich vergist in een lus, of een cron die
  // twintig keer vuurt. Die vragen niemand om toestemming.
  const budget = await checkBudgetForProfile(id);
  if (!budget.ok) {
    return NextResponse.json({ error: budget.message }, { status: 402 });
  }

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  if (!profile.account_id) {
    return NextResponse.json(
      { error: "Dit merk hangt nog niet aan een account, dus er is geen pakket." },
      { status: 400 },
    );
  }

  const { data: account } = await admin
    .from("accounts")
    .select("package_pages_per_month")
    .eq("id", profile.account_id)
    .maybeSingle();

  const quota = account?.package_pages_per_month as number | null | undefined;
  if (!quota) {
    return NextResponse.json(
      {
        error:
          "Er is nog geen pakket gekozen voor dit account. Kies eerst 10, 20 of 40 pagina's per maand.",
      },
      { status: 400 },
    );
  }

  let body: { strategyNote?: string };
  try {
    body = (await request.json().catch(() => ({}))) as { strategyNote?: string };
  } catch {
    body = {};
  }

  const result = await createPlan(admin, {
    profileId: id,
    pagesPerMonth: quota,
    strategyNote: body.strategyNote?.trim() || null,
  });

  if (!result.ok) {
    // 422 en geen 500: dit zijn ontbrekende voorwaarden (geen onderwerpen, te
    // weinig funnelfasen), geen storing. Het verschil bepaalt of de gebruiker
    // iets kan doen of moet wachten.
    return NextResponse.json({ error: result.problems.join(" ") }, { status: 422 });
  }

  return NextResponse.json({ planId: result.planId });
}
