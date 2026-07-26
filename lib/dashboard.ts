import "server-only";

/**
 * Eén overzicht over alle analyses heen (optimalisatie.md bijlage A10).
 *
 * Alles was per analyse: elke analyse had een eigen bibliotheek, eigen rapport,
 * eigen score. Een klant met drie analyses had geen enkel scherm dat antwoord
 * gaf op de enige vraag waarmee hij inlogt: *"hoe sta ik ervoor en wat moet ik
 * deze week doen?"*
 *
 * Dit bouwt dat antwoord op uit wat er al ligt. Geen nieuwe tabellen: het is een
 * andere doorsnede van dezelfde data.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUS_META } from "@/lib/analysis-status";
import { changeIsMeaningful } from "@/lib/stats/uncertainty";
import type { Analysis, VisibilityScore } from "@/lib/types/database";

type Db = SupabaseClient;

/** Eén ding dat de klant kan doen, met de reden erbij. */
export interface ActionItem {
  /** Waar de actie naartoe leidt. */
  href: string;
  title: string;
  detail: string;
  /** Laag = eerst. De volgorde IS het advies. */
  priority: number;
  analysisName: string;
}

export interface DashboardData {
  analyses: Analysis[];
  actions: ActionItem[];
  stats: {
    /** Pagina's die deze maand live zijn gegaan. */
    publishedThisMonth: number;
    /** Klaargezette pagina's die nog niet gepubliceerd zijn. */
    waitingToPublish: number;
    /** Openstaande off-site taken. */
    openOffsiteTasks: number;
  };
  /** De grootste betekenisvolle verandering over alle analyses heen. */
  biggestChange: {
    analysisId: string;
    analysisName: string;
    delta: number;
  } | null;
}

/**
 * Prioriteiten. Lager is eerder, en de nummering laat ruimte tussen de stappen
 * zodat er later iets tussen kan zonder alles te herschikken.
 *
 * De volgorde is niet willekeurig: hij loopt van "hier ligt de app stil te
 * wachten op jou" naar "hier valt iets te winnen". Een klant die bovenaan begint
 * en naar beneden werkt, doet automatisch het juiste eerst.
 */
const PRIORITY = {
  blocked: 10, // technische blokkade — hierdoor werkt al het andere niet
  approval: 20, // de app wacht op de klant
  failed: 30, // er is iets misgegaan
  publish: 40, // tekst ligt klaar maar staat niet online
  offsite: 50, // buiten de eigen site
  facts: 60, // feitenvragen beantwoorden
} as const;

export async function loadDashboard(db: Db, userId: string): Promise<DashboardData> {
  const { data: analysisRows } = await db
    .from("analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const analyses = (analysisRows ?? []) as Analysis[];
  if (analyses.length === 0) {
    return {
      analyses,
      actions: [],
      stats: { publishedThisMonth: 0, waitingToPublish: 0, openOffsiteTasks: 0 },
      biggestChange: null,
    };
  }

  const ids = analyses.map((a) => a.id);
  const profileIds = Array.from(new Set(analyses.map((a) => a.profile_id)));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { data: pieceRows },
    { data: offsiteRows },
    { data: factRows },
    { data: auditRows },
    { data: scoreRows },
  ] = await Promise.all([
    db
      .from("content_pieces")
      .select("id, analysis_id, title, status, published_at")
      .in("analysis_id", ids)
      .eq("is_current", true),
    db.from("offsite_tasks").select("id, analysis_id, title").in("analysis_id", ids).eq("status", "open"),
    db.from("fact_requests").select("id, profile_id").in("profile_id", profileIds).eq("status", "open"),
    db
      .from("technical_audits")
      .select("profile_id, blockers, checked_at")
      .in("profile_id", profileIds)
      .order("checked_at", { ascending: false }),
    db.from("visibility_scores").select("*").in("analysis_id", ids).order("week_no"),
  ]);

  const pieces = pieceRows ?? [];
  const byAnalysis = new Map(analyses.map((a) => [a.id, a]));

  // ── De acties ─────────────────────────────────────────────────────────────
  const actions: ActionItem[] = [];

  // Alleen de NIEUWSTE audit per profiel telt; de query gaf ze aflopend terug.
  const latestAudit = new Map<string, { blockers: number }>();
  for (const row of auditRows ?? []) {
    if (!latestAudit.has(row.profile_id as string)) {
      latestAudit.set(row.profile_id as string, { blockers: row.blockers as number });
    }
  }

  for (const analysis of analyses) {
    const blockers = latestAudit.get(analysis.profile_id)?.blockers ?? 0;
    if (blockers > 0) {
      actions.push({
        href: `/profielen/${analysis.profile_id}#techniek`,
        title: "Je website houdt AI-assistenten buiten",
        detail:
          blockers === 1
            ? "Er is één blokkade gevonden. Zolang die er is, kan geen enkele pagina die je publiceert geciteerd worden."
            : `Er zijn ${blockers} blokkades gevonden. Zolang die er zijn, kan geen enkele pagina die je publiceert geciteerd worden.`,
        priority: PRIORITY.blocked,
        analysisName: analysis.name,
      });
    }

    if (STATUS_META[analysis.status].actionRequired) {
      actions.push({
        href: `/analyses/${analysis.id}/instellingen`,
        title: "Bekijk en bevestig het concept",
        detail: "De vragen en het onderzoek staan klaar. Zodra jij akkoord bent, start de meting.",
        priority: PRIORITY.approval,
        analysisName: analysis.name,
      });
    }

    if (analysis.status === "mislukt") {
      actions.push({
        href: `/analyses/${analysis.id}`,
        title: "Er is iets misgegaan",
        detail: "Open de analyse om te zien waar het spaak liep en het opnieuw te proberen.",
        priority: PRIORITY.failed,
        analysisName: analysis.name,
      });
    }
  }

  // Klaargezette pagina's die nog niet online staan. Per analyse één actie en
  // niet één per pagina: vijf regels over hetzelfde onderwerp is geen overzicht.
  const waitingByAnalysis = new Map<string, number>();
  let publishedThisMonth = 0;
  for (const p of pieces) {
    if (p.published_at) {
      if (new Date(p.published_at as string) >= monthStart) publishedThisMonth++;
      continue;
    }
    if (p.status === "ready") {
      waitingByAnalysis.set(p.analysis_id as string, (waitingByAnalysis.get(p.analysis_id as string) ?? 0) + 1);
    }
  }

  for (const [analysisId, count] of waitingByAnalysis) {
    const analysis = byAnalysis.get(analysisId);
    if (!analysis) continue;
    actions.push({
      href: `/analyses/${analysisId}/bibliotheek`,
      title: count === 1 ? "Er ligt een pagina klaar om te publiceren" : `Er liggen ${count} pagina's klaar`,
      detail:
        "Zolang de tekst niet op je website staat, verandert er niets aan je zichtbaarheid — " +
        "een AI kan alleen citeren wat gepubliceerd is.",
      priority: PRIORITY.publish,
      analysisName: analysis.name,
    });
  }

  const offsiteByAnalysis = new Map<string, number>();
  for (const t of offsiteRows ?? []) {
    offsiteByAnalysis.set(t.analysis_id as string, (offsiteByAnalysis.get(t.analysis_id as string) ?? 0) + 1);
  }
  for (const [analysisId, count] of offsiteByAnalysis) {
    const analysis = byAnalysis.get(analysisId);
    if (!analysis) continue;
    actions.push({
      href: `/analyses/${analysisId}/rapport`,
      title: `${count} ${count === 1 ? "punt" : "punten"} buiten je eigen site`,
      detail: "Bronnen waar AI-assistenten uit putten en waar jij nog niet op staat.",
      priority: PRIORITY.offsite,
      analysisName: analysis.name,
    });
  }

  // Feitenvragen: per PROFIEL, want daar horen ze. We hangen ze aan de eerste
  // analyse van dat profiel, puur om ergens naartoe te kunnen linken.
  const factsByProfile = new Map<string, number>();
  for (const f of factRows ?? []) {
    factsByProfile.set(f.profile_id as string, (factsByProfile.get(f.profile_id as string) ?? 0) + 1);
  }
  for (const [profileId, count] of factsByProfile) {
    const analysis = analyses.find((a) => a.profile_id === profileId);
    if (!analysis) continue;
    actions.push({
      href: `/profielen/${profileId}#feiten`,
      title: `${count} ${count === 1 ? "vraag" : "vragen"} over je bedrijf`,
      detail:
        "Concrete cijfers maken elke pagina die we schrijven citeerbaarder. Eén keer invullen, altijd profijt.",
      priority: PRIORITY.facts,
      analysisName: analysis.name,
    });
  }

  actions.sort((a, b) => a.priority - b.priority);

  return {
    analyses,
    actions,
    stats: {
      publishedThisMonth,
      waitingToPublish: Array.from(waitingByAnalysis.values()).reduce((n, c) => n + c, 0),
      openOffsiteTasks: offsiteRows?.length ?? 0,
    },
    biggestChange: findBiggestChange((scoreRows ?? []) as VisibilityScore[], byAnalysis),
  };
}

/**
 * De grootste BETEKENISVOLLE verandering over alle analyses heen.
 *
 * Betekenisvol, niet grootst: een sprong van veertig punten op een analyse met
 * vijf vragen is ruis, en die bovenaan een dashboard zetten is het tegendeel van
 * informeren. Dezelfde drempel als overal elders (2.3).
 */
function findBiggestChange(
  scores: VisibilityScore[],
  byAnalysis: Map<string, Analysis>,
): DashboardData["biggestChange"] {
  const byAnalysisId = new Map<string, VisibilityScore[]>();
  for (const s of scores) {
    byAnalysisId.set(s.analysis_id, [...(byAnalysisId.get(s.analysis_id) ?? []), s]);
  }

  let best: DashboardData["biggestChange"] = null;

  for (const [analysisId, list] of byAnalysisId) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.week_no - b.week_no);
    const current = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];

    const lead = (s: VisibilityScore) => s.weighted_score ?? s.score;
    const stderr = (s: VisibilityScore) =>
      (s.weighted_score != null ? s.weighted_stderr : s.score_stderr) ?? 0;

    const change = changeIsMeaningful(
      { score: lead(current), stderr: stderr(current) },
      { score: lead(previous), stderr: stderr(previous) },
    );
    if (!change.changed) continue;

    if (!best || Math.abs(change.delta) > Math.abs(best.delta)) {
      best = {
        analysisId,
        analysisName: byAnalysis.get(analysisId)?.name ?? "Analyse",
        delta: change.delta,
      };
    }
  }

  return best;
}
