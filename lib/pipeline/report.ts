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
import { MODELS, TEMPERATURES } from "@/lib/openai/models";
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
  "worden dan het eigen merk, mét bewijs (run-ID's, bronnen). PRIORITEER de gaps op de vragen met het " +
  "HOOGSTE GEWICHT (populair en/of koopklaar) waar het eigen merk niet genoemd wordt — daar liggen de " +
  "waardevolste kansen. Werk uitsluitend met de aangeleverde cijfers — verzin niets. Antwoord in het Nederlands.";

const REPORT_SYSTEM =
  "Je schrijft een kort, jargonvrij rapport voor een ondernemer zonder SEO-achtergrond over hun " +
  "zichtbaarheid in AI-assistenten (GEO). Gebruik geen vaktermen als 'share of voice' — leg uit in " +
  "gewone taal. Noem in elk probleem expliciet welke concurrent het betreft. PRIORITEER je aanbevelingen " +
  "op de zwaarwegende vragen (populair en/of koopklaar) waar de klant slecht scoort — die leveren het " +
  "meeste op. Eindig met concrete, uitvoerbare aanbevelingen. Bepaal per aanbeveling of dit een BESTAANDE " +
  "pagina van de klant verbetert (kies dan de meest relevante URL uit de meegegeven paginalijst, action = " +
  "\"verbeteren\") of dat er een GEHEEL NIEUWE pagina nodig is (action = \"nieuw\", existingUrl = null) — kies " +
  "alleen \"verbeteren\" als een pagina uit de lijst daadwerkelijk over hetzelfde onderwerp gaat. Antwoord in het Nederlands.";

// De volledige URL-lijst helpt de nieuw/verbeteren-keuze; cap houdt de prompt beheersbaar.
const REPORT_PAGES_CAP = 150;

function buildPagesBlock(pages: ProfilePage[]): string {
  if (pages.length === 0) return "(geen pagina's bekend van deze website)";
  return pages
    .slice(0, REPORT_PAGES_CAP)
    .map((p) => `- ${p.url}${p.title ? ` — "${p.title}"` : ""}`)
    .join("\n");
}

function ownLabel(analysis: Analysis, profile: Profile | null): string {
  return `${profile?.brand_name ?? analysis.url} (${analysis.topic})`;
}

/** Een gemiste vraag (klant niet genoemd) met z'n gewicht + tags, voor prioritering. */
interface MissedPrompt {
  text: string;
  category: string;
  weight: number;
  cluster: string | null;
  intent_type: string | null;
}

function scoreLine(score: VisibilityScore | null): string {
  const base = `Eigen zichtbaarheidsscore: ${score?.score ?? 0}/100 (elke vraag telt gelijk)`;
  const weighted =
    score?.weighted_score != null
      ? ` — GEWOGEN naar volume × koopwaarde: ${score.weighted_score}/100`
      : "";
  const sov = score?.share_of_voice != null ? ` (${score.share_of_voice}% van alle vermeldingen)` : "";
  return base + weighted + sov;
}

function buildMissedBlock(missed: MissedPrompt[]): string {
  if (missed.length === 0) return "";
  const lines = missed.map(
    (m) =>
      `- [gewicht ${m.weight.toFixed(2)}, ${m.category}` +
      `${m.intent_type ? `, ${m.intent_type}` : ""}${m.cluster ? `, cluster: ${m.cluster}` : ""}] "${m.text}"`,
  );
  return (
    `\nBelangrijkste GEMISTE vragen — hier word jij NIET genoemd, gesorteerd op gewicht (hoog gewicht = ` +
    `populair en/of koopklaar; dáár liggen de waardevolste kansen):\n${lines.join("\n")}`
  );
}

function briefLine(analysis: Analysis): string[] {
  return analysis.content_brief?.trim()
    ? [`Gewenste content-richting van de klant: ${analysis.content_brief.trim()} — laat de aanbevelingen hierop aansluiten.`]
    : [];
}

function buildGapInput(
  analysis: Analysis,
  profile: Profile | null,
  topicResearch: TopicResearch | null,
  score: VisibilityScore | null,
  competitors: CompetitorBreakdown[],
  missed: MissedPrompt[],
): string {
  const lines = [
    `Eigen merk: ${ownLabel(analysis, profile)}`,
    `Branche: ${profile?.industry ?? "onbekend"}`,
    ...briefLine(analysis),
    ...(topicResearch?.content_summary
      ? [`Wat de website al zegt over dit onderwerp: ${topicResearch.content_summary}`]
      : []),
    scoreLine(score),
    buildMissedBlock(missed),
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
  missed: MissedPrompt[],
): string {
  return [
    `Eigen merk: ${ownLabel(analysis, profile)}`,
    ...briefLine(analysis),
    scoreLine(score),
    buildMissedBlock(missed),
    "",
    "Concurrentie-gap-analyse (JSON):",
    JSON.stringify(gap, null, 2),
    "",
    "Bestaande pagina's op de website van de klant (voor de nieuw/verbeteren-beslissing):",
    buildPagesBlock(pages),
    "",
    "Schrijf op basis hiervan een kort, jargonvrij rapport. Noem in elk gap-item expliciet welke " +
      "concurrent het betreft. PRIORITEER de aanbevelingen op de zwaarwegende gemiste vragen hierboven " +
      "(hoog gewicht = populair en/of koopklaar). Eindig met 1-3 concrete, geprioriteerde aanbevelingen.",
  ].join("\n");
}

const MISSED_CAP = 15;

/**
 * Bouwt de lijst van GEMISTE vragen (eigen merk niet genoemd), gesorteerd op het
 * bevroren gewicht (volume × waarde) — de waardevolste kansen bovenaan. Verrijkt
 * met de prompt-tags (cluster/intent_type) via prompt_id.
 */
async function computeMissedPrompts(
  admin: ReturnType<typeof createAdminClient>,
  analysisId: string,
  weekNo: number,
): Promise<MissedPrompt[]> {
  const { data: runRows } = await admin
    .from("tracking_runs")
    .select("id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, prompt_weight")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo);
  const runs = runRows ?? [];
  if (runs.length === 0) return [];

  const runIds = runs.map((r) => r.id as string);
  const { data: ownRows } = await admin
    .from("tracking_run_mentions")
    .select("tracking_run_id, mentioned")
    .eq("is_own_brand", true)
    .in("tracking_run_id", runIds);

  // Drie toestanden, geen twee (optimalisatie.md 0.2):
  //   true  = beoordeeld en genoemd
  //   false = beoordeeld en NIET genoemd  → dit is een echte gemiste kans
  //   afwezig = niet beoordeeld (3b faalde, of gaf geen eigen-merk-rij terug)
  //             → een DATAPROBLEEM, geen gemiste kans.
  // Voorheen liepen die laatste twee door elkaar: een mislukte classificatie
  // werd als gemiste kans het rapport in geduwd en leverde een aanbeveling op
  // voor een vraag waar de klant misschien juist wél genoemd werd.
  const ownMentioned = new Map((ownRows ?? []).map((m) => [m.tracking_run_id as string, m.mentioned as boolean]));
  const unjudged = runs.filter((r) => !ownMentioned.has(r.id as string)).length;
  if (unjudged > 0) {
    console.warn(
      `Analyse ${analysisId} week ${weekNo}: ${unjudged} van ${runs.length} metingen zonder ` +
        `eigen-merk-oordeel. Die tellen NIET als gemiste kans; ze wijzen op een mislukte 3b.`,
    );
  }

  const { data: tagRows } = await admin
    .from("prompts")
    .select("id, cluster, intent_type")
    .eq("analysis_id", analysisId);
  const tagByPrompt = new Map((tagRows ?? []).map((p) => [p.id as string, p]));

  return runs
    // Alleen expliciet beoordeeld-en-niet-genoemd telt als gemiste kans.
    .filter((r) => ownMentioned.get(r.id as string) === false)
    .map((r) => {
      const tag = r.prompt_id ? tagByPrompt.get(r.prompt_id as string) : undefined;
      return {
        text: r.prompt_text_snapshot as string,
        category: r.prompt_category_snapshot as string,
        weight: Number(r.prompt_weight ?? 0.1),
        cluster: (tag?.cluster as string | null) ?? null,
        intent_type: (tag?.intent_type as string | null) ?? null,
      };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MISSED_CAP);
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

  // Gemiste hoog-gewicht vragen (klant niet genoemd), gesorteerd op gewicht — zodat
  // B1/B2 de aanbevelingen richten op de waardevolste kansen (§6 A3 / §7).
  const missed = await computeMissedPrompts(admin, id, weekNo);

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
        missed,
      ),
      schema: GapAnalysis,
      schemaName: "gap_analysis",
      webSearch: false,
      temperature: TEMPERATURES.analytical,
      meta: { kind: "gap_analysis", analysisId: id, profileId: analysis.profile_id },
    });

    // B2 — leesbaar rapport + aanbevelingen
    const report = await callStructured({
      model: MODELS.quality,
      system: REPORT_SYSTEM,
      user: buildReportInput(analysis, profileTyped, score as VisibilityScore | null, gap.parsed, pages, missed),
      schema: Report,
      schemaName: "report",
      webSearch: false,
      temperature: TEMPERATURES.analytical,
      meta: { kind: "report", analysisId: id, profileId: analysis.profile_id },
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
