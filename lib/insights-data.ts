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
import { brandScorePerPeriod, type BrandPeriod, type BrandScoreRow } from "@/lib/brand-score";
import { opportunities, type Opportunity } from "@/lib/opportunities";
import { loadRecommendationPotential } from "@/lib/potential-data";

type Admin = ReturnType<typeof createAdminClient>;

export interface LoopBundle {
  insights: Insight[];
  opportunities: Opportunity[];
  /**
   * Het merkcijfer per meetperiode, oplopend.
   *
   * ⚠️ Zit in deze bundel en niet in een eigen query op de pagina. De startpagina
   * haalde dezelfde rijen nóg een keer op om zijn hoofdgetal te berekenen, en
   * berekende ze anders. Eén ophaalactie, één som, drie blokken.
   */
  periods: BrandPeriod[];
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
          // ⚠️ Ook de gewogen kolommen. Deze functie middelde tot 25 augustus
          // 2026 de ONGEWOGEN `score` ongewogen over de clusters, terwijl de
          // standkaart op hetzelfde scherm de gewogen som toonde. Zie
          // `lib/brand-score.ts` voor waarom dat drie cijfers voor één ding
          // opleverde.
          .select(
            "analysis_id, week_no, score, weighted_score, score_stderr, weighted_stderr, winnable_runs, judged_runs, computed_at",
          )
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
    // De vragen per cluster, voor de noemer onder een kans ("raakt 3 van de 30
    // gemeten vragen"). De onzekerheid van het merkcijfer komt hier niet meer
    // vandaan: die staat opgeslagen bij de score zelf (`lib/brand-score.ts`).
    analysisIds.length > 0
      ? admin
          .from("tracking_runs")
          .select("analysis_id, week_no, purpose")
          .in("analysis_id", analysisIds)
      : Promise.resolve({ data: [] }),
  ]);

  const alleRuns = (runRows ?? []) as {
    analysis_id: string;
    week_no: number;
    purpose: string | null;
  }[];
  // ── De noemer bij een kans: hoeveel vragen zijn er in dit cluster gemeten ──
  //
  // Alleen de gewone meting telt, net als in het rapport zelf
  // (`computeMissedPrompts`): impact- en controlemetingen gaan over een handvol
  // vragen en zouden de noemer laten schommelen zonder dat er iets veranderd is.
  // De laatste periode, want daar komen de aanbevelingen van het laatste rapport
  // uit.
  const laatstePeriode = new Map<string, number>();
  for (const r of alleRuns) {
    if (r.purpose !== "periodic") continue;
    const huidig = laatstePeriode.get(r.analysis_id);
    if (huidig === undefined || r.week_no > huidig) laatstePeriode.set(r.analysis_id, r.week_no);
  }
  const gemetenPerAnalyse = new Map<string, number>();
  for (const r of alleRuns) {
    if (r.purpose !== "periodic") continue;
    if (r.week_no !== laatstePeriode.get(r.analysis_id)) continue;
    gemetenPerAnalyse.set(r.analysis_id, (gemetenPerAnalyse.get(r.analysis_id) ?? 0) + 1);
  }

  // ── Het merkcijfer per periode ────────────────────────────────────────────
  //
  // ⚠️ Eén rekensom voor de hele startpagina (`lib/brand-score.ts`). Deze
  // functie deed hem hier zelf, ongewogen, en de standkaart deed hem gewogen:
  // dat scheelde bij Gasservice Brabant 3 punten (57 tegen 60) en de klant zag
  // beide cijfers tegelijk op één scherm.
  //
  // De onzekerheid komt nu uit de opgeslagen standaardfout in plaats van uit een
  // hertelling van de metingen. Dat is dezelfde grootheid waar `aggregate_week`
  // hem mee heeft weggeschreven, dus er valt niets meer uit de pas te lopen.
  const scores = brandScorePerPeriod((scoreRows ?? []) as BrandScoreRow[]);

  // ── De aanbevelingen van het laatste rapport per analyse ──────────────────
  const gezien = new Set<string>();
  const recommendations: {
    title: string;
    why: string;
    action?: string | null;
    existingUrl?: string | null;
    targets?: { weight?: number | null; promptId?: string | null }[] | null;
    /** Voor de potentiescore hieronder: welke analyse deze aanbeveling voedt. */
    analysisId: string;
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
          ? (item.targets as { weight?: number | null; promptId?: string | null }[])
          : null,
        analysisId: r.analysis_id,
      });
    }
  }

  // ── De potentiescore per aanbeveling (fase 2, docs/tasks/potentiescore.md) ──
  //
  // Zelfde rekenkern als bij een voorgestelde pagina in hoofdstuk 03
  // (`werk.tsx`): de doelvragen van de aanbeveling plus het zoekvolume van het
  // onderwerp erachter. Eén aanroep per aanbeveling, parallel: bij een merk
  // met tien openstaande aanbevelingen tien lichte leesqueries, geen AI-call.
  const potenties = await Promise.all(
    recommendations.map((r) =>
      loadRecommendationPotential(
        admin,
        r.analysisId,
        (r.targets ?? []).map((t) => t.promptId ?? null),
      ),
    ),
  );

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
    recommendations: recommendations.map((r, i) => ({
      ...r,
      potential: potenties[i].potential,
      measured: gemetenPerAnalyse.get(r.analysisId) ?? null,
    })),
    unmeasuredTopics: ((topicRows ?? []) as { id: string; title: string; analysis_id: string | null }[])
      .filter((t) => !t.analysis_id)
      .map((t) => ({ id: t.id, title: t.title })),
    crawlerBlocked,
    readyToPublish: klaarOmTePubliceren,
    hasPlan: Boolean(planRow),
  });

  return {
    periods: scores,
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
