import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { RATES_CHECKED_ON } from "@/lib/openai/pricing";
import type { AiCall } from "@/lib/types/database";

/**
 * GET /api/analyses/[id]/costs, wat heeft deze analyse aan AI-kosten gemaakt
 * (optimalisatie.md 0.6)?
 *
 * `ai_calls` staat op deny-all in RLS (het is exploitatie-informatie, geen
 * klantinformatie), dus lezen gaat via de service-role client mét expliciete
 * eigenaarscontrole, hetzelfde patroon als de andere schrijfroutes.
 *
 * Bedoeld om te kunnen rekenen vóórdat we het aantal metingen per vraag
 * verdrievoudigen (fase 2): zonder dit cijfer is die planning giswerk.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  // Kosten van de analyse zelf + die van het profielonderzoek waar 'ie aan hangt.
  // Het profiel is gedeeld over meerdere analyses, dus dat bedrag wordt apart
  // gerapporteerd in plaats van bij het analysetotaal opgeteld. Anders zou je
  // het bij elke analyse van hetzelfde profiel opnieuw meetellen.
  const [{ data: analysisRows }, { data: profileRows }] = await Promise.all([
    admin.from("ai_calls").select("*").eq("analysis_id", id),
    admin.from("ai_calls").select("*").eq("profile_id", analysis.profile_id).is("analysis_id", null),
  ]);

  const calls = (analysisRows ?? []) as AiCall[];
  const profileCalls = (profileRows ?? []) as AiCall[];

  const sum = (rows: AiCall[]) => Number(rows.reduce((t, c) => t + Number(c.cost_usd ?? 0), 0).toFixed(6));

  // Uitsplitsing per pijplijnstap: laat meteen zien waar het geld heen gaat
  // (in de praktijk: measure_simulate, door de web_search).
  const byKind: Record<string, { calls: number; costUsd: number; tokens: number }> = {};
  for (const c of calls) {
    const entry = (byKind[c.kind] ??= { calls: 0, costUsd: 0, tokens: 0 });
    entry.calls += 1;
    entry.costUsd = Number((entry.costUsd + Number(c.cost_usd ?? 0)).toFixed(6));
    entry.tokens += c.total_tokens ?? 0;
  }

  return NextResponse.json({
    analysisId: id,
    totalCostUsd: sum(calls),
    totalCalls: calls.length,
    byKind,
    profileResearch: {
      profileId: analysis.profile_id,
      costUsd: sum(profileCalls),
      calls: profileCalls.length,
      note: "Eenmalig per klantprofiel, gedeeld over alle analyses van dat profiel.",
    },
    disclaimer: `Schatting op basis van de tarieven in lib/openai/pricing.ts (gecontroleerd op ${RATES_CHECKED_ON}).`,
  });
}
