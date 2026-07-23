import "server-only";

/**
 * FASE B — Adviseren (abcplan.md §7): B1 concurrentie-gap-analyse → B2 rapport
 * + aanbevelingen. Draait automatisch na de nulmeting (géén klant-klik nodig —
 * in tegenstelling tot Fase C content-generatie, die wél op klik wacht).
 * Idempotent: bestaat er al een report-rij, dan wordt nooit opnieuw
 * gegenereerd (geen dubbele kosten) — alleen de status bijgewerkt.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { GapAnalysis } from "@/lib/schemas/gap-analysis";
import { Report } from "@/lib/schemas/report";
import { sendReportEmail } from "@/lib/email/report-email";
import type {
  Analysis,
  AnalysisStatus,
  Profile,
  ProfilePage,
  TopicResearch,
  VisibilityScore,
  CompetitorBreakdown,
} from "@/lib/types/database";

const GAP_SYSTEM =
  "Je bent een GEO-analist (Generative Engine Optimization). Op basis van meetdata identificeer je " +
  "concrete zichtbaarheids-gaps: categorieën waarin concurrenten vaker door AI-assistenten genoemd " +
  "worden dan het eigen merk, mét bewijs (run-ID's, bronnen). Werk uitsluitend met de aangeleverde " +
  "cijfers — verzin niets. Antwoord in het Nederlands.";

const REPORT_SYSTEM =
  "Je schrijft een kort, jargonvrij rapport voor een ondernemer zonder SEO-achtergrond over hun " +
  "zichtbaarheid in AI-assistenten (GEO). Gebruik geen vaktermen als 'share of voice' — leg uit in " +
  "gewone taal. Noem in elk probleem expliciet welke concurrent het betreft. Eindig met concrete, " +
  "uitvoerbare aanbevelingen. Bepaal per aanbeveling of dit een BESTAANDE pagina van de klant verbetert " +
  "(kies dan de meest relevante URL uit de meegegeven paginalijst, action = \"verbeteren\") of dat er een " +
  "GEHEEL NIEUWE pagina nodig is (action = \"nieuw\", existingUrl = null) — kies alleen \"verbeteren\" als " +
  "een pagina uit de lijst daadwerkelijk over hetzelfde onderwerp gaat. Antwoord in het Nederlands.";

function buildPagesBlock(pages: ProfilePage[]): string {
  if (pages.length === 0) return "(geen pagina's bekend van deze website)";
  return pages.map((p) => `- ${p.url}${p.title ? ` — "${p.title}"` : ""}`).join("\n");
}

function ownLabel(analysis: Analysis, profile: Profile | null): string {
  return `${profile?.brand_name ?? analysis.url} (${analysis.topic})`;
}

function buildGapInput(
  analysis: Analysis,
  profile: Profile | null,
  topicResearch: TopicResearch | null,
  score: VisibilityScore | null,
  competitors: CompetitorBreakdown[],
): string {
  const lines = [
    `Eigen merk: ${ownLabel(analysis, profile)}`,
    `Branche: ${profile?.industry ?? "onbekend"}`,
    ...(topicResearch?.content_summary
      ? [`Wat de website al zegt over dit onderwerp: ${topicResearch.content_summary}`]
      : []),
    `Eigen zichtbaarheidsscore: ${score?.score ?? 0}/100` +
      (score?.share_of_voice != null ? ` (${score.share_of_voice}% van alle vermeldingen)` : ""),
    "",
    "Concurrentiedata (per concurrent, uit dezelfde meting):",
  ];
  if (competitors.length === 0) {
    lines.push("(geen concurrentiedata beschikbaar)");
  }
  for (const c of competitors) {
    lines.push(
      `- ${c.competitor_name}: ${c.mentions_count} vermeldingen. ` +
        `Per categorie: ${JSON.stringify(c.mentions_by_category_json ?? {})}. ` +
        `Meest geciteerde bronnen: ${(c.top_cited_sources ?? []).join(", ") || "geen"}. ` +
        `Gewonnen van ons (evidenceRunIds): ${(c.winning_run_ids ?? []).join(", ") || "geen"}. ` +
        `Verloren van ons: ${(c.losing_run_ids ?? []).length} keer.`,
    );
  }
  return lines.join("\n");
}

function buildReportInput(
  analysis: Analysis,
  profile: Profile | null,
  score: VisibilityScore | null,
  gap: GapAnalysis,
  pages: ProfilePage[],
): string {
  return [
    `Eigen merk: ${ownLabel(analysis, profile)}`,
    `Zichtbaarheidsscore: ${score?.score ?? 0}/100`,
    "",
    "Concurrentie-gap-analyse (JSON):",
    JSON.stringify(gap, null, 2),
    "",
    "Bestaande pagina's op de website van de klant (voor de nieuw/verbeteren-beslissing):",
    buildPagesBlock(pages),
    "",
    "Schrijf op basis hiervan een kort, jargonvrij rapport. Noem in elk gap-item expliciet welke " +
      "concurrent het betreft. Eindig met 1-3 concrete, geprioriteerde aanbevelingen (content die de gap zou dichten).",
  ].join("\n");
}

export async function generateReport(id: string, weekNo = 0): Promise<AnalysisStatus> {
  const admin = createAdminClient();

  const { data: analysisRow } = await admin.from("analyses").select("*").eq("id", id).single();
  if (!analysisRow) throw new Error(`Analyse ${id} niet gevonden.`);
  const analysis = analysisRow as Analysis;

  const eligible = analysis.status === "gemeten" || analysis.status === "mislukt";
  if (!eligible) return analysis.status;

  if (analysis.status === "mislukt") {
    // Alleen aanpakken als de METING al gelukt is — anders is dit geen mislukt rapport.
    const { data: score } = await admin
      .from("visibility_scores")
      .select("id")
      .eq("analysis_id", id)
      .eq("week_no", weekNo)
      .maybeSingle();
    if (!score) return "mislukt";
  }

  // Idempotent: al een rapport? Nooit opnieuw genereren, alleen status herstellen.
  const { count: existingReport } = await admin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("analysis_id", id);
  if (existingReport) {
    await admin.from("analyses").update({ status: "gereed" }).eq("id", id);
    return "gereed";
  }

  const [{ data: profile }, { data: topicResearch }, { data: score }, { data: competitors }, { data: pageRows }] =
    await Promise.all([
      admin.from("profiles").select("*").eq("id", analysis.profile_id).maybeSingle(),
      admin.from("topic_research").select("*").eq("analysis_id", id).maybeSingle(),
      admin.from("visibility_scores").select("*").eq("analysis_id", id).eq("week_no", weekNo).maybeSingle(),
      admin.from("competitor_breakdown").select("*").eq("analysis_id", id).eq("week_no", weekNo),
      admin.from("profile_pages").select("*").eq("profile_id", analysis.profile_id),
    ]);
  const profileTyped = profile as Profile | null;
  const pages = (pageRows ?? []) as ProfilePage[];

  try {
    // B1 — concurrentie-gap-analyse
    const gap = await callStructured({
      model: MODELS.quality,
      system: GAP_SYSTEM,
      user: buildGapInput(
        analysis,
        profileTyped,
        topicResearch as TopicResearch | null,
        score as VisibilityScore | null,
        (competitors ?? []) as CompetitorBreakdown[],
      ),
      schema: GapAnalysis,
      schemaName: "gap_analysis",
      webSearch: false,
    });

    // B2 — leesbaar rapport + aanbevelingen
    const report = await callStructured({
      model: MODELS.quality,
      system: REPORT_SYSTEM,
      user: buildReportInput(analysis, profileTyped, score as VisibilityScore | null, gap.parsed, pages),
      schema: Report,
      schemaName: "report",
      webSearch: false,
    });

    await admin.from("reports").insert({
      analysis_id: id,
      period: `week ${weekNo}`,
      summary: report.parsed.summary,
      gaps_json: report.parsed.gaps as never,
      recommendations_json: report.parsed.recommendations as never,
      gap_analysis_raw_json: gap.raw as never, // volledige ruwe OpenAI-output B1 (§5)
      raw_json: report.raw as never, // volledige ruwe OpenAI-output B2 (§5)
    });

    await admin.from("analyses").update({ status: "gereed" }).eq("id", id);

    const { data: authUser } = await admin.auth.admin.getUserById(analysis.user_id);
    if (authUser?.user?.email) {
      await sendReportEmail(analysis, authUser.user.email, report.parsed).catch((err) =>
        console.error(`Rapport-mail versturen mislukt voor analyse ${id}:`, err),
      );
    }

    return "gereed";
  } catch (err) {
    await admin.from("analyses").update({ status: "mislukt" }).eq("id", id);
    throw err;
  }
}
