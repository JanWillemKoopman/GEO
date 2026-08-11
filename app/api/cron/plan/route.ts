import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { planContentDraft } from "@/lib/jobs/content-jobs";
import { writeDecision, planBriefing, type WriteBlock } from "@/lib/plan-writing";
import { SCHRIJFVOORSPRONG_DAGEN } from "@/lib/plan-status";
import type { AnalysisStatus, PageType, PlanMonthStatus } from "@/lib/types/database";

/**
 * GET /api/cron/plan, de motor onder het contentplan (fase 4, `docs/Nova.md` §7).
 *
 * ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
 *
 * Zonder deze cron is een goedgekeurde maand een lijst die niets doet. Nova
 * schrijft "about 10 days before its scheduled post date"; dit is die tien
 * dagen. De pagina's van een goedgekeurde maand die binnen dat venster vallen
 * krijgen een schrijftaak, en gaan op `schrijven` tot de tekst er is.
 *
 * DAGELIJKS, niet vaker. Een plan denkt in dagen: twee keer per dag kijken kan
 * hooguit een pagina een halve dag eerder starten, en die halve dag is
 * betekenisloos bij een voorsprong van tien dagen.
 *
 * ── DE ROUTE PLANT, HIJ SCHRIJFT NIET ───────────────────────────────────────
 *
 * Net als `/api/cron/tracking`: hier worden alleen taken klaargezet, het echte
 * werk doet de werker. Deze route is in milliseconden klaar, hoeveel merken er
 * ook zijn.
 *
 * ⚠️ Wat niet geschreven kan worden, wordt geteld en niet weggemoffeld. Bij Van
 * den Udenhout hebben zes van de acht onderwerpen nog geen analyse, en dus geen
 * meting om op te schrijven. Die zes staan in het antwoord onder `geblokkeerd`,
 * en op het scherm staat per pagina waarom. Een cron die stil overslaat, laat
 * pagina's een jaar lang op "Gepland" staan zonder dat iemand weet waarom.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Rijvorm van de query hieronder. Supabase geeft de joins als geneste objecten. */
interface PageRow {
  id: string;
  profile_id: string;
  title: string;
  page_type: PageType;
  status: string;
  scheduled_for: string | null;
  is_buffer: boolean;
  topic_id: string | null;
  plan_months: { month_number: number; status: PlanMonthStatus } | null;
  profile_funnel_stages: { label: string } | null;
  profile_topics: {
    title: string;
    analysis_id: string | null;
    analyses: { status: AnalysisStatus; user_id: string } | null;
  } | null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.cronSecret}`) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  const admin = createAdminClient();
  const nu = new Date();

  // Het venster is de enige grens die in de query hoort: alles wat verder in de
  // toekomst ligt is niet aan de beurt, en dat zijn er bij twaalf maanden vér de
  // meeste. De rest van de beslissing staat in `writeDecision()`, want daar is
  // hij te testen.
  const grens = new Date(nu);
  grens.setDate(grens.getDate() + SCHRIJFVOORSPRONG_DAGEN);

  const { data, error } = await admin
    .from("planned_pages")
    .select(
      `id, profile_id, title, page_type, status, scheduled_for, is_buffer, topic_id,
       plan_months!inner(month_number, status),
       profile_funnel_stages(label),
       profile_topics(title, analysis_id, analyses(status, user_id))`,
    )
    .eq("status", "gepland")
    .eq("is_buffer", false)
    .not("scheduled_for", "is", null)
    .lte("scheduled_for", grens.toISOString().slice(0, 10))
    .eq("plan_months.status", "goedgekeurd")
    .order("scheduled_for");

  if (error) {
    console.error("Plan-cron: pagina's ophalen mislukt:", error.message);
    return NextResponse.json({ error: "Ophalen mislukt.", detail: error.message }, { status: 500 });
  }

  const pages = (data ?? []) as unknown as PageRow[];
  const geblokkeerd: Record<string, number> = {};
  let ingepland = 0;
  let alBezig = 0;

  for (const page of pages) {
    const maand = page.plan_months;
    if (!maand) continue;

    const topic = page.profile_topics;
    const besluit = writeDecision(
      {
        status: "gepland",
        scheduled_for: page.scheduled_for,
        is_buffer: page.is_buffer,
        topic_id: page.topic_id,
      },
      maand.status,
      topic
        ? {
            analysis_id: topic.analysis_id,
            analysis_status: topic.analyses?.status ?? null,
          }
        : null,
      nu,
    );

    if (!besluit.schrijven) {
      tel(geblokkeerd, besluit.reden);
      continue;
    }

    // De EIGENAAR van de analyse schrijft, niet de cron: de contentpijplijn legt
    // `user_id` vast bij de pagina, en die moet van de klant zijn. Zonder deze
    // regel zou een pagina op naam van niemand komen te staan.
    const userId = topic?.analyses?.user_id;
    if (!userId) {
      tel(geblokkeerd, "geen_analyse");
      continue;
    }

    const briefing = planBriefing({
      title: page.title,
      pageType: page.page_type,
      topicTitle: topic?.title ?? null,
      funnelLabel: page.profile_funnel_stages?.label ?? null,
      monthNumber: maand.month_number,
    });

    try {
      const { created, alreadyDone } = await planContentDraft(admin, {
        analysisId: besluit.analysisId,
        userId,
        plannedPageId: page.id,
        recommendation: {
          ...briefing,
          action: "nieuw",
          existingUrl: null,
          reportId: null,
        },
      });

      if (alreadyDone) {
        // Er stond al een afgeronde tekst met deze titel onder deze analyse.
        // Dan is er niets te schrijven, maar moet het plan dat wel weten.
        alBezig++;
        await admin
          .from("planned_pages")
          .update({ status: "ter_goedkeuring" })
          .eq("id", page.id)
          .eq("status", "gepland");
        continue;
      }

      if (created) {
        ingepland++;
        await admin
          .from("planned_pages")
          .update({ status: "schrijven" })
          .eq("id", page.id)
          .eq("status", "gepland");
      } else {
        // De dedupe-sleutel bestond al: de taak staat in de rij van een eerdere
        // ronde. Geen fout, en ook geen tweede taak.
        alBezig++;
      }
    } catch (err) {
      console.error(`Plan-cron: schrijftaak voor pagina ${page.id} mislukte:`, err);
      tel(geblokkeerd, "inplannen_mislukt");
    }
  }

  return NextResponse.json({
    bekeken: pages.length,
    ingepland,
    alBezig,
    geblokkeerd,
  });
}

function tel(teller: Record<string, number>, sleutel: WriteBlock | "inplannen_mislukt"): void {
  teller[sleutel] = (teller[sleutel] ?? 0) + 1;
}
