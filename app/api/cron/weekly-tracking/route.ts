import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { measureAnalysis } from "@/lib/pipeline/measure";

/**
 * GET /api/cron/weekly-tracking — de wekelijkse lus (abcplan.md §6 A3, §12.4).
 * Verwerkt alléén analyses met tracking_enabled = true, tot maximaal 10 weken.
 * Beveiligd met CRON_SECRET (Vercel Cron stuurt dit automatisch mee als
 * Authorization-header wanneer de env-variabele zo heet). Zie vercel.json.
 *
 * ⚠️ Vereenvoudiging: analyses worden hier SEQUENTIEEL verwerkt binnen één
 * functie-aanroep — prima op de huidige (kleine) schaal, maar bij veel actieve
 * analyses hoort dit op de al aanwezige `jobs`-tabel (§4) te draaien i.p.v.
 * synchroon in de cron zelf. Niet gebouwd vóórdat de schaal dat vereist.
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

  const results: { id: string; week: number; ok: boolean }[] = [];

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

    try {
      await measureAnalysis(a.id, nextWeek);
      results.push({ id: a.id, week: nextWeek, ok: true });
    } catch (err) {
      console.error(`weekly-tracking: analyse ${a.id} week ${nextWeek} mislukt:`, err);
      results.push({ id: a.id, week: nextWeek, ok: false });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
