import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPublishReminder } from "@/lib/email/publish-reminder";
import type { Analysis } from "@/lib/types/database";

/**
 * GET /api/cron/reminders — één vriendelijke herinnering bij klaarliggende
 * content (optimalisatie.md 5.8).
 *
 * Wekelijks. Blijven er pagina's steken bij "geschreven", dan is dát het
 * probleem — en dan moet de app daarop sturen in plaats van meer content aan te
 * bieden.
 *
 * De grens ligt bij een week. Korter is opdringerig (een ondernemer publiceert
 * niet dezelfde dag), langer is te laat om nog te helpen.
 */
export const maxDuration = 60;

const WAITING_DAYS = 7;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - WAITING_DAYS * 86_400_000).toISOString();

  // Analyses die nog nooit een herinnering kregen. Eén keer, niet zeurend —
  // vandaar dat dit filter vóór al het andere komt.
  const { data: analysisRows } = await admin
    .from("analyses")
    .select("*")
    .is("publish_reminder_sent_at", null)
    .eq("status", "gereed");

  const sent: { id: string; waiting: number }[] = [];

  for (const row of (analysisRows ?? []) as Analysis[]) {
    const { data: waitingRows } = await admin
      .from("content_pieces")
      .select("id")
      .eq("analysis_id", row.id)
      .eq("is_current", true)
      .eq("status", "ready")
      .is("published_at", null)
      .lt("created_at", cutoff);

    const waiting = waitingRows?.length ?? 0;
    if (waiting === 0) continue;

    // De vlag zetten vóór het versturen. Gaat de mail stuk, dan is de kans dat
    // hij tóch aankwam groter dan nul — en twee keer dezelfde herinnering is
    // erger dan hem missen.
    await admin
      .from("analyses")
      .update({ publish_reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id);

    const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
    const email = authUser?.user?.email;
    if (!email) continue;

    await sendPublishReminder(row, email, waiting).catch((err) =>
      console.error(`Herinnering versturen mislukt voor analyse ${row.id}:`, err),
    );
    sent.push({ id: row.id, waiting });
  }

  return NextResponse.json({ sent: sent.length, details: sent });
}
