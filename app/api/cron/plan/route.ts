import { NextResponse } from "next/server";
import { cronAuthOk } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { planContentDraft } from "@/lib/jobs/content-jobs";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { writeDecision, planBriefing, type WriteBlock } from "@/lib/plan-writing";
import { SCHRIJFVOORSPRONG_DAGEN } from "@/lib/plan-status";
import { targetsFromSourceRef } from "@/lib/plan-backlog-data";
import type { AnalysisStatus, PageType, PlanMonthStatus } from "@/lib/types/database";

/**
 * GET /api/cron/plan, de motor onder het contentplan (fase 4, zie `docs/logbook.md`).
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
  /** De velden van een gemeten kans (migratie 0065). Leeg bij een oude planpagina. */
  source: string | null;
  why: string | null;
  target_intent: string | null;
  recommendation_action: string | null;
  existing_url: string | null;
  /** "<rapport-id>#<volgnummer>", wijst naar de aanbeveling met de doelvragen. */
  source_ref: string | null;
  plan_months: { month_number: number; status: PlanMonthStatus } | null;
  profile_funnel_stages: { label: string } | null;
  profile_topics: {
    title: string;
    analysis_id: string | null;
    analyses: { status: AnalysisStatus; user_id: string } | null;
  } | null;
}

export async function GET(request: Request) {
  if (!cronAuthOk(request.headers.get("authorization"))) {
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
       source, why, target_intent, recommendation_action, existing_url, source_ref,
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

    // ── DE BRIEFING KOMT UIT DE KANS ZELF ALS DIE ER IS ──────────────────
    //
    // Een voorraaditem draagt de reden, de doelgroep en het adres van de
    // aanbeveling mee (migratie 0065). Die zijn geschreven op basis van gemiste
    // vragen uit een echte meting en dus scherper dan wat `planBriefing()` uit
    // een onderwerp en een funnelfase kan afleiden.
    //
    // ⚠️ En het verschil is niet cosmetisch: bij een kans met handeling
    // "verbeteren" hoort de schrijfstap een BESTAANDE pagina aan te vullen. Tot
    // 25 augustus 2026 stond hier onvoorwaardelijk `action: "nieuw"` met
    // `existingUrl: null`, dus vier van de zeven kansen van Gasservice Brabant
    // zouden een tweede pagina hebben opgeleverd naast de pagina die ze hadden
    // moeten verbeteren.
    const briefing = planBriefing({
      title: page.title,
      pageType: page.page_type,
      topicTitle: topic?.title ?? null,
      funnelLabel: page.profile_funnel_stages?.label ?? null,
      monthNumber: maand.month_number,
    });
    const uitKans = page.source === "aanbeveling";

    // ── DE DOELVRAGEN KOMEN UIT HETZELFDE RAPPORT ALS DE KANS ─────────────
    //
    // `source_ref` wijst als "<rapport-id>#<volgnummer>" rechtstreeks naar de
    // aanbeveling in `reports.recommendations_json` waar de doelvragen in
    // staan (lib/plan-backlog-data.ts, dezelfde sleutel als de voorraad
    // gebruikt). Zonder dit bleef `targets` hier leeg: `saveTargets()` in
    // content.ts schreef dan nul rijen in `content_piece_targets`, en
    // `planImpactWaves()` sloeg de effectmeting over met "geen doelvragen".
    // Fase 5 bestond zo niet voor een pagina die via het contentplan
    // geschreven is, en dat is sinds migratie 0065 de normale route.
    const { reportId, targets } = uitKans
      ? await targetsFromSourceRef(admin, page.source_ref)
      : { reportId: null, targets: [] };

    try {
      const { created, alreadyDone } = await planContentDraft(admin, {
        analysisId: besluit.analysisId,
        userId,
        plannedPageId: page.id,
        recommendation: {
          ...briefing,
          why: uitKans && page.why ? page.why : briefing.why,
          targetIntent:
            uitKans && page.target_intent ? page.target_intent : briefing.targetIntent,
          action: page.recommendation_action === "verbeteren" ? "verbeteren" : "nieuw",
          existingUrl: page.recommendation_action === "verbeteren" ? page.existing_url : null,
          reportId,
          targets,
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

  // ── De zoekcijfers, in dezelfde dagelijkse ronde ──────────────────────────
  //
  // Bewust géén tweede cron. Beide taken zijn dagelijks, allebei plannen ze
  // alleen werk in, en twee pg_cron-taken die een minuut na elkaar hetzelfde
  // doen zijn twee dingen om te vergeten bij de volgende migratie.
  const zoekdata = await planSearchConsoleSync(admin, nu);

  return NextResponse.json({
    bekeken: pages.length,
    ingepland,
    alBezig,
    geblokkeerd,
    zoekdata,
  });
}

/**
 * Zet voor elk gekoppeld merk een ophaaltaak klaar (fase 5, migratie 0052).
 *
 * Eén per merk per dag; de dedupe-sleutel draagt de datum, want twee rondes op
 * dezelfde dag halen exact dezelfde cijfers op (Google levert pas definitieve
 * data met twee dagen vertraging).
 */
async function planSearchConsoleSync(
  admin: ReturnType<typeof createAdminClient>,
  nu: Date,
): Promise<{ merken: number; ingepland: number }> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .not("gsc_property", "is", null)
    .is("archived_at", null);

  const merken = (data ?? []) as { id: string }[];
  const dag = nu.toISOString().slice(0, 10);
  let ingepland = 0;

  for (const m of merken) {
    const { created } = await enqueue(admin, {
      type: "gsc_sync",
      payload: {},
      profileId: m.id,
      dedupeKey: dedupe.gscSync(m.id, dag),
    });
    if (created) ingepland++;
  }

  return { merken: merken.length, ingepland };
}

function tel(teller: Record<string, number>, sleutel: WriteBlock | "inplannen_mislukt"): void {
  teller[sleutel] = (teller[sleutel] ?? 0) + 1;
}
