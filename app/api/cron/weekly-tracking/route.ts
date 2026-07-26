import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueMeasurement } from "@/lib/jobs/queue";

/**
 * GET /api/cron/weekly-tracking — de wekelijkse lus (abcplan.md §6 A3, §12.4).
 *
 * Plant nu meettaken in plaats van de meting synchroon te draaien
 * (optimalisatie.md 1.4). Daarmee is ook de laatste plek weg waar het aantal
 * vragen tegen de tijdslimiet van één route aanliep: deze cron zet alleen taken
 * klaar en is in milliseconden klaar, hoeveel analyses er ook actief zijn.
 *
 * De aggregatie ketent zichzelf aan de laatste meettaak (1.5).
 */
export const maxDuration = 60;
const MAX_WEEKS = 10;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: analyses } = await admin
    .from("analyses")
    .select("id")
    .eq("tracking_enabled", true)
    .in("status", ["gemeten", "gereed"]);

  const results: { id: string; week: number; planned: number }[] = [];

  for (const a of analyses ?? []) {
    const { data: lastWeek } = await admin
      .from("visibility_scores")
      .select("week_no")
      .eq("analysis_id", a.id)
      .order("week_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextWeek = (lastWeek?.week_no ?? 0) + 1;
    if (nextWeek > MAX_WEEKS) continue; // klaar met de 10-weken-trend (§6 A3)

    const { planned } = await enqueueMeasurement(admin, a.id as string, nextWeek);
    results.push({ id: a.id as string, week: nextWeek, planned });
  }

  return NextResponse.json({ analyses: results.length, results });
}
