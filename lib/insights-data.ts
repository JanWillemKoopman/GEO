import "server-only";

/**
 * De gegevens onder het inzichtenblok en de kansenlijst (fase 6).
 *
 * De rekenkant staat in `lib/insights.ts` en `lib/opportunities.ts`, allebei
 * zonder `server-only` (conventie 2). Hier staat alleen het ophalen.
 *
 * ── ÉÉN LAADFUNCTIE VOOR TWEE BLOKKEN ───────────────────────────────────────
 *
 * Ze delen vrijwel alles: de scores, de aanbevelingen, de audit, wat er
 * klaarstaat. Twee losse laadfuncties zouden dezelfde vijf query's twee keer
 * doen op één pagina.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { insights, type Insight } from "@/lib/insights";
import { opportunities, type Opportunity } from "@/lib/opportunities";
import { binomialStderr } from "@/lib/stats/uncertainty";

type Admin = ReturnType<typeof createAdminClient>;

export interface LoopBundle {
  insights: Insight[];
  opportunities: Opportunity[];
}

export async function loadLoop(admin: Admin, profileId: string): Promise<LoopBundle> {
  const { data: analysisRows } = await admin
    .from("analyses")
    .select("id")
    .eq("profile_id", profileId)
    .is("archived_at", null);

  const analysisIds = ((analysisRows ?? []) as { id: string }[]).map((a) => a.id);

  const [
    { data: scoreRows },
    { data: reportRows },
    { data: topicRows },
    { data: auditRow },
    { data: pageRows },
    { data: planRow },
    { data: runRows },
  ] = await Promise.all([
    analysisIds.length > 0
      ? admin
          .from("visibility_scores")
          .select("analysis_id, week_no, score")
          .in("analysis_id", analysisIds)
          .order("week_no")
      : Promise.resolve({ data: [] }),
    // Alleen het laatste rapport per analyse telt: een aanbeveling uit de
    // nulmeting die in periode 2 niet meer terugkomt, is opgelost of achterhaald.
    analysisIds.length > 0
      ? admin
          .from("reports")
          .select("analysis_id, recommendations_json, generated_at")
          .in("analysis_id", analysisIds)
          .order("generated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    admin
      .from("profile_topics")
      .select("id, title, analysis_id, status")
      .eq("profile_id", profileId)
      .neq("status", "afgewezen"),
    // ⚠️ `blockers` en niet zelf de crawlers nalopen. Die teller bevat het
    // oordeel al: bij Van den Udenhout staan de zoek-crawlers (OAI-SearchBot,
    // ChatGPT-User, Perplexity) toe en zijn alleen de trainings-crawlers
    // geweigerd, en dat telt daar terecht als waarschuwing en niet als blokkade.
    // Zelf op `severity` gaan filteren zou dat onderscheid opnieuw bedenken en
    // vroeg of laat anders uitkomen dan de auditpagina zelf.
    admin
      .from("technical_audits")
      .select("blockers")
      .eq("profile_id", profileId)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("planned_pages")
      .select("status, posted_at")
      .eq("profile_id", profileId)
      .eq("is_buffer", false),
    admin
      .from("content_plans")
      .select("id")
      .eq("profile_id", profileId)
      .neq("status", "gestopt")
      .limit(1)
      .maybeSingle(),
    // ⚠️ Hoeveel metingen er onder elke score liggen. Dat is geen detail: de
    // onzekerheid hangt er volledig van af, en `insights()` beslist daarmee of
    // een verschil ruis is of een echte verandering.
    analysisIds.length > 0
      ? admin.from("tracking_runs").select("analysis_id, week_no").in("analysis_id", analysisIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Aantal beoordeelde metingen per periode, over alle analyses van het merk.
  const metingenPerPeriode = new Map<number, number>();
  for (const r of (runRows ?? []) as { week_no: number }[]) {
    metingenPerPeriode.set(r.week_no, (metingenPerPeriode.get(r.week_no) ?? 0) + 1);
  }

  // ── De scores, gemiddeld per periode over alle analyses van het merk ───────
  const perPeriode = new Map<number, number[]>();
  for (const r of (scoreRows ?? []) as { week_no: number; score: number | string }[]) {
    const lijst = perPeriode.get(r.week_no) ?? [];
    lijst.push(Number(r.score));
    perPeriode.set(r.week_no, lijst);
  }
  const scores = [...perPeriode.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([period, waarden]) => {
      const gemiddelde = waarden.reduce((a, b) => a + b, 0) / waarden.length;
      // ⚠️ De onzekerheid mag niet weggelaten worden. `insights()` beslist er
      // mee of een verschil ruis is, en een stderr van 0 zou élk verschil een
      // echte verandering noemen. Hij komt uit het WERKELIJKE aantal metingen
      // van die periode: bij dertig vragen is de band ±17 punten, bij tien is
      // hij bijna twee keer zo breed, en dat verschil moet de zin dragen.
      const n = metingenPerPeriode.get(period) ?? 0;
      return {
        period,
        score: gemiddelde,
        stderr: binomialStderr((gemiddelde / 100) * n, n),
      };
    });

  // ── De aanbevelingen van het laatste rapport per analyse ──────────────────
  const gezien = new Set<string>();
  const recommendations: {
    title: string;
    why: string;
    action?: string | null;
    existingUrl?: string | null;
    targets?: { weight?: number | null }[] | null;
  }[] = [];
  for (const r of (reportRows ?? []) as {
    analysis_id: string;
    recommendations_json: unknown;
  }[]) {
    if (gezien.has(r.analysis_id)) continue;
    gezien.add(r.analysis_id);
    const lijst = Array.isArray(r.recommendations_json) ? r.recommendations_json : [];
    for (const item of lijst as Record<string, unknown>[]) {
      if (typeof item?.title !== "string") continue;
      recommendations.push({
        title: item.title,
        why: typeof item.why === "string" ? item.why : "",
        action: typeof item.action === "string" ? item.action : null,
        existingUrl: typeof item.existingUrl === "string" ? item.existingUrl : null,
        targets: Array.isArray(item.targets)
          ? (item.targets as { weight?: number | null }[])
          : null,
      });
    }
  }

  const paginas = (pageRows ?? []) as { status: string; posted_at: string | null }[];
  const klaarOmTePubliceren = paginas.filter((p) => p.status === "goedgekeurd").length;

  const eersteVanDeMaand = new Date();
  eersteVanDeMaand.setUTCDate(1);
  const gepubliceerdDezeMaand = paginas.filter(
    (p) => p.posted_at && p.posted_at.slice(0, 10) >= eersteVanDeMaand.toISOString().slice(0, 10),
  ).length;

  const crawlerBlocked = ((auditRow?.blockers as number | null) ?? 0) > 0;

  const kansen = opportunities({
    profileId,
    recommendations,
    unmeasuredTopics: ((topicRows ?? []) as { id: string; title: string; analysis_id: string | null }[])
      .filter((t) => !t.analysis_id)
      .map((t) => ({ id: t.id, title: t.title })),
    crawlerBlocked,
    readyToPublish: klaarOmTePubliceren,
    hasPlan: Boolean(planRow),
  });

  return {
    insights: insights({
      scores,
      gepubliceerdDezeMaand,
      klaarOmTePubliceren,
      openKansen: kansen.length,
      crawlerBlocked,
    }),
    opportunities: kansen,
  };
}
