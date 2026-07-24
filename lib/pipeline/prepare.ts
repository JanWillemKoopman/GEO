import "server-only";

/**
 * Orchestratie van halte 1'+2 (abcplan.md §6 A1'/A2, na de klantprofiel-refactor):
 * onderwerp-onderzoek → prompts. Het bedrijfsbrede onderzoek (merknaam, branche,
 * tone-of-voice, persona's) gebeurt niet meer hier maar eenmalig in het
 * klantprofiel (lib/pipeline/prepare-profile.ts) — deze analyse hangt daaraan
 * via analyses.profile_id en moet dus een profiel met status 'klaar' hebben.
 *
 * Draait met de service-role client (schrijven, §5/§12.20). Idempotent en
 * resumebaar: elke stap checkt of z'n resultaat al bestaat, zodat een refresh of
 * retry geen dubbel werk of dubbele kosten oplevert. Faalt er iets, dan gaat de
 * analyse naar 'mislukt' (retry-knop in Mijn analyses).
 *
 * NB: dit draait synchroon in de prepare-route (maxDuration 60s). De echte
 * job-queue/cron komt pas bij de wekelijkse lus in Sprint 4.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTopicResearch } from "@/lib/pipeline/topic-research";
import { generatePrompts, type BrandContext } from "@/lib/pipeline/prompts";
import type { AnalysisStatus, Profile, ProfilePage } from "@/lib/types/database";

export async function prepareAnalysis(id: string): Promise<AnalysisStatus> {
  const admin = createAdminClient();

  const { data: analysis } = await admin.from("analyses").select("*").eq("id", id).single();
  if (!analysis) throw new Error(`Analyse ${id} niet gevonden.`);

  // Al voorbij de conceptfase? Niets te doen (voorkomt herverwerking).
  if (analysis.status !== "bezig" && analysis.status !== "mislukt") {
    return analysis.status as AnalysisStatus;
  }

  // 'mislukt' kan ook een mislukte MÉTING zijn (halte 3, na confirm) — die
  // draait pas nadat A1'+A2 al succesvol prompts hebben aangemaakt. Als die er
  // al zijn, is dit dus geen mislukte voorbereiding: niet aankomen, anders zou
  // deze functie een mislukte meting stilletjes terugzetten naar 'concept_klaar'.
  if (analysis.status === "mislukt") {
    const { count } = await admin
      .from("prompts")
      .select("*", { count: "exact", head: true })
      .eq("analysis_id", id);
    if (count) return "mislukt";
  }

  const { data: profileRow } = await admin
    .from("profiles")
    .select("*")
    .eq("id", analysis.profile_id)
    .single();
  if (!profileRow) throw new Error(`Klantprofiel ${analysis.profile_id} niet gevonden.`);
  const profile = profileRow as Profile;
  if (profile.status !== "klaar") {
    throw new Error(`Klantprofiel "${profile.name}" is nog niet klaar met onderzoek.`);
  }

  try {
    // ── A1': onderwerp-onderzoek (skip als 'ie er al is) ───────────────────
    let topicCompetitors: string[];
    const { data: existingResearch } = await admin
      .from("topic_research")
      .select("*")
      .eq("analysis_id", id)
      .maybeSingle();

    if (existingResearch) {
      topicCompetitors = existingResearch.competitors ?? [];
    } else {
      const { data: pageRows } = await admin
        .from("profile_pages")
        .select("*")
        .eq("profile_id", profile.id);
      const research = await generateTopicResearch({
        topic: analysis.topic,
        pages: (pageRows ?? []) as ProfilePage[],
        profile,
      });
      const r = research.parsed;

      await admin.from("topic_research").upsert(
        {
          analysis_id: id,
          content_summary: r.contentSummary,
          competitors: r.competitors,
          raw_json: research.raw as never, // volledige ruwe OpenAI-output (§5)
        },
        { onConflict: "analysis_id" },
      );

      topicCompetitors = r.competitors;
    }

    // ── A2: prompts (skip als er al prompts zijn) ──────────────────────────
    const { count } = await admin
      .from("prompts")
      .select("*", { count: "exact", head: true })
      .eq("analysis_id", id);

    if (!count) {
      const brand: BrandContext = {
        brandName: profile.brand_name,
        industry: profile.industry,
        products: profile.products,
        // Gededupliceerde unie: onderwerp-specifieke concurrenten eerst, aangevuld
        // met de algemene bedrijfsconcurrenten uit het profiel.
        competitors: Array.from(new Set([...topicCompetitors, ...profile.competitors])),
        toneOfVoice: profile.tone_of_voice,
        summary: profile.summary,
        serviceScope: profile.service_scope,
        serviceRegions: profile.service_regions,
        marketLanguage: profile.market_language,
      };

      const prompts = await generatePrompts({
        url: profile.url,
        topic: analysis.topic,
        brand,
      });
      const rows = prompts.map((p) => ({
        analysis_id: id,
        text: p.text,
        category: p.category,
        intent: p.intent,
        active: true,
        created_by: "system" as const,
        source_raw_json: p.sourceRawJson as never,
      }));
      await admin.from("prompts").insert(rows);
    }

    // ── Klaar → wacht op klant-goedkeuring (review-gate, Sprint 3) ─────────
    await admin.from("analyses").update({ status: "concept_klaar" }).eq("id", id);
    return "concept_klaar";
  } catch (err) {
    await admin.from("analyses").update({ status: "mislukt" }).eq("id", id);
    throw err;
  }
}
