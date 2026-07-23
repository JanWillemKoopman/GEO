import "server-only";

/**
 * Orchestratie van halte 1 + 2 (abcplan.md §6 A1/A2): crawl → Brand DNA → prompts.
 * Draait met de service-role client (schrijven, §5/§12.20). Idempotent en
 * resumebaar: elke stap checkt of z'n resultaat al bestaat, zodat een refresh of
 * retry geen dubbel werk of dubbele kosten oplevert. Faalt er iets, dan gaat de
 * analyse naar 'mislukt' (retry-knop in Mijn analyses).
 *
 * NB: dit draait synchroon in de prepare-route (maxDuration 60s). De echte
 * job-queue/cron komt pas bij de wekelijkse lus in Sprint 4.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlSite } from "@/lib/crawler";
import { generateBrandDna } from "@/lib/pipeline/brand-dna";
import { generatePrompts, type BrandContext } from "@/lib/pipeline/prompts";
import type { AnalysisStatus } from "@/lib/types/database";

export async function prepareAnalysis(id: string): Promise<AnalysisStatus> {
  const admin = createAdminClient();

  const { data: analysis } = await admin.from("analyses").select("*").eq("id", id).single();
  if (!analysis) throw new Error(`Analyse ${id} niet gevonden.`);

  // Al voorbij de conceptfase? Niets te doen (voorkomt herverwerking).
  if (analysis.status !== "bezig" && analysis.status !== "mislukt") {
    return analysis.status as AnalysisStatus;
  }

  // 'mislukt' kan ook een mislukte MÉTING zijn (halte 3, na confirm) — die
  // draait pas nadat A1+A2 al succesvol prompts hebben aangemaakt. Als die er
  // al zijn, is dit dus geen mislukte voorbereiding: niet aankomen, anders zou
  // deze functie een mislukte meting stilletjes terugzetten naar 'concept_klaar'.
  if (analysis.status === "mislukt") {
    const { count } = await admin
      .from("prompts")
      .select("*", { count: "exact", head: true })
      .eq("analysis_id", id);
    if (count) return "mislukt";
  }

  try {
    // ── A1: Brand DNA (skip als 'ie er al is) ──────────────────────────────
    let brand: BrandContext;
    const { data: existingDna } = await admin
      .from("brand_dna")
      .select("*")
      .eq("analysis_id", id)
      .maybeSingle();

    if (existingDna) {
      brand = {
        industry: existingDna.industry,
        products: existingDna.products ?? [],
        competitors: existingDna.competitors ?? [],
        toneOfVoice: existingDna.tone_of_voice,
        summary: existingDna.summary,
      };
    } else {
      const crawl = await crawlSite(analysis.url);
      const dna = await generateBrandDna({
        url: analysis.url,
        topic: analysis.topic,
        siteText: crawl.text,
      });
      const p = dna.parsed;

      await admin.from("brand_dna").upsert(
        {
          analysis_id: id,
          industry: p.industry,
          tone_of_voice: p.toneOfVoice,
          summary: p.summary,
          products: p.products,
          value_props: p.valueProps,
          competitors: p.competitors,
          personas: p.personas,
          raw_json: dna.raw as never, // volledige ruwe OpenAI-output (§5)
        },
        { onConflict: "analysis_id" },
      );

      brand = {
        industry: p.industry,
        products: p.products,
        competitors: p.competitors,
        toneOfVoice: p.toneOfVoice,
        summary: p.summary,
      };
    }

    // ── A2: prompts (skip als er al prompts zijn) ──────────────────────────
    const { count } = await admin
      .from("prompts")
      .select("*", { count: "exact", head: true })
      .eq("analysis_id", id);

    if (!count) {
      const prompts = await generatePrompts({
        url: analysis.url,
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
