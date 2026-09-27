import { NextResponse } from "next/server";
import { emailsEnabled, serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPublishReminder } from "@/lib/email/publish-reminder";
import { sendQuestionReminder } from "@/lib/email/question-reminder";
import type { Analysis } from "@/lib/types/database";
import { activeOnly } from "@/lib/archive";

/**
 * GET /api/cron/reminders, twee vriendelijke herinneringen in één wekelijkse
 * ronde: klaarliggende content die niet gepubliceerd wordt (optimalisatie.md
 * 5.8), en sinds A5 (`docs/tasks/van-pijplijn-naar-kennissysteem.md`) een
 * pagina die op de antwoorden van de klant wacht (status `briefing`) en
 * daardoor niet geschreven wordt.
 *
 * Wekelijks. Blijven er pagina's steken, dan is dát het probleem, en dan moet
 * de app daarop sturen in plaats van meer content aan te bieden.
 *
 * De grens ligt bij een week. Korter is opdringerig (een ondernemer reageert
 * niet dezelfde dag), langer is te laat om nog te helpen.
 *
 * ⚠️ Deze cron staat uit in `vercel.json` (Hobby-limiet: max twee taken, zie
 * `docs/architecture.md` §1). De vraagherinnering rijdt daarom mee op dezelfde,
 * nu uitgeschakelde route in plaats van een derde cron te worden.
 */
export const maxDuration = 60;

const WAITING_DAYS = 7;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.cronSecret}`) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  // Deze cron bestaat alleen om te mailen. Staat de mail uit, dan stoppen we
  // hier, vóór het zetten van `publish_reminder_sent_at`. Zouden we die vlag
  // wél zetten, dan is de enige herinnering die een analyse ooit krijgt stil
  // opgebrand aan een mail die nooit verstuurd is.
  if (!emailsEnabled()) {
    return NextResponse.json({ sent: 0, skipped: "emails_disabled", details: [] });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - WAITING_DAYS * 86_400_000).toISOString();

  // Analyses die nog nooit een herinnering kregen. Eén keer, niet zeurend,
  // vandaar dat dit filter vóór al het andere komt.
  // Geen herinnering over een gearchiveerde analyse (migratie 0044): een mail
  // over werk dat in de app niet meer bestaat, is de vervelendste vorm van
  // "onzichtbaar maar nog actief".
  const { data: analysisRows } = await activeOnly(
    admin
      .from("analyses")
      .select("*")
      .is("publish_reminder_sent_at", null)
      .eq("status", "gereed"),
  );

  const sent: { id: string; waiting: number }[] = [];

  for (const row of (analysisRows ?? []) as Analysis[]) {
    // ⚠️ Herstelplan na audit T1.2: `status: "ready"` alleen is niet genoeg. Een
    // pagina waarvan de eindredactie nog iets zag (`needs_review = true`) is
    // niet klaar om te publiceren, en een herinnering "je hebt pagina's die
    // wachten op publiceren" zou de klant dan naar iets sturen dat een mens nog
    // moet nakijken (zie §S6 in de approve-route).
    const { data: waitingRows } = await admin
      .from("content_pieces")
      .select("id")
      .eq("analysis_id", row.id)
      .eq("is_current", true)
      .eq("status", "ready")
      .eq("needs_review", false)
      .is("published_at", null)
      .lt("created_at", cutoff);

    const waiting = waitingRows?.length ?? 0;
    if (waiting === 0) continue;

    // De vlag zetten vóór het versturen. Gaat de mail stuk, dan is de kans dat
    // hij tóch aankwam groter dan nul, en twee keer dezelfde herinnering is
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

  // A5: pagina's die op antwoorden wachten. Een eigen kolom
  // (`question_reminder_sent_at`, migratie 0128) en een eigen query: een
  // analyse die de publicatieherinnering al kreeg, mag deze nog krijgen, en
  // andersom.
  const { data: questionRows } = await activeOnly(
    admin.from("analyses").select("*").is("question_reminder_sent_at", null),
  );

  const sentQuestions: { id: string; waiting: number }[] = [];

  for (const row of (questionRows ?? []) as Analysis[]) {
    const { data: waitingRows } = await admin
      .from("content_pieces")
      .select("id")
      .eq("analysis_id", row.id)
      .eq("is_current", true)
      .eq("status", "briefing")
      .lt("created_at", cutoff);

    const waiting = waitingRows?.length ?? 0;
    if (waiting === 0) continue;

    await admin
      .from("analyses")
      .update({ question_reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id);

    const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
    const email = authUser?.user?.email;
    if (!email) continue;

    await sendQuestionReminder(row, email, waiting).catch((err) =>
      console.error(`Vraagherinnering versturen mislukt voor analyse ${row.id}:`, err),
    );
    sentQuestions.push({ id: row.id, waiting });
  }

  return NextResponse.json({
    sent: sent.length,
    details: sent,
    sentQuestions: sentQuestions.length,
    questionDetails: sentQuestions,
  });
}
