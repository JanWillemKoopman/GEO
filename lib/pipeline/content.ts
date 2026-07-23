import "server-only";

/**
 * FASE C — Genereren (abcplan.md §8): op klant-verzoek schrijft de app één
 * kant-en-klare pagina per aanbeveling. Model mini, GEEN web_search
 * (§10 kostenknop). Input = de aanbeveling + Brand DNA (voor on-brand tone,
 * incl. het onderwerp) + de bewijs-prompts. Verschijnt in de Content Bibliotheek.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ContentPiece } from "@/lib/schemas/content-piece";
import type { Analysis, BrandDna, ContentType } from "@/lib/types/database";

const CONTENT_SYSTEM =
  "Je bent een ervaren contentschrijver die pagina's schrijft die zowel klassieke zoekmachines als " +
  "AI-assistenten (GEO) winnen. Schrijf on-brand, expert-niveau, in het Nederlands. Begin met het " +
  "directe antwoord op de vraag, gebruik heldere koppen en concrete datapunten, en voeg een FAQ en " +
  "geldige schema.org JSON-LD toe. Geen dunne 'AI-slop' — elke alinea moet waarde toevoegen.";

export interface RecommendationInput {
  title: string;
  type: ContentType;
  targetIntent: string;
  why: string;
}

function countWords(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}

function buildContentInput(
  analysis: Analysis,
  brandDna: BrandDna | null,
  rec: RecommendationInput,
  evidencePrompts: string[],
): string {
  return [
    `Merk/website: ${analysis.url}`,
    `Onderwerp/scope: ${analysis.topic ?? "(hele website)"}`,
    `Branche: ${brandDna?.industry ?? "onbekend"}`,
    `Tone of voice: ${brandDna?.tone_of_voice ?? "professioneel, helder"}`,
    `Producten/diensten: ${(brandDna?.products ?? []).join(", ") || "onbekend"}`,
    "",
    `Te schrijven pagina: "${rec.title}"`,
    `Type: ${rec.type}`,
    `Doel-intentie (waar moet de pagina op scoren): ${rec.targetIntent}`,
    `Waarom deze pagina (de gap die 'ie dicht): ${rec.why}`,
    evidencePrompts.length
      ? `\nVoorbeeldvragen waarop het merk nu niet genoemd wordt (waarop deze pagina moet aansluiten):\n- ${evidencePrompts.join("\n- ")}`
      : "",
    "",
    "Schrijf de volledige pagina in Markdown, plus meta-title, meta-description, FAQ en schema.org JSON-LD.",
  ].join("\n");
}

export async function generateContentPiece(args: {
  analysisId: string;
  userId: string;
  reportId: string | null;
  recommendation: RecommendationInput;
}): Promise<string> {
  const { analysisId, userId, reportId, recommendation } = args;
  const admin = createAdminClient();

  const { data: analysisRow } = await admin.from("analyses").select("*").eq("id", analysisId).single();
  if (!analysisRow || analysisRow.user_id !== userId) throw new Error("Analyse niet gevonden.");
  const analysis = analysisRow as Analysis;

  // Idempotent: bestaat deze pagina (zelfde analyse + titel) al, dan die teruggeven.
  const { data: existing } = await admin
    .from("content_pieces")
    .select("id")
    .eq("analysis_id", analysisId)
    .eq("title", recommendation.title)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: brandDna } = await admin.from("brand_dna").select("*").eq("analysis_id", analysisId).maybeSingle();

  // Bewijs-prompts: actieve prompts in dezelfde cluster/categorie waar het merk zwak staat.
  const { data: promptRows } = await admin
    .from("prompts")
    .select("text")
    .eq("analysis_id", analysisId)
    .eq("active", true)
    .limit(5);
  const evidencePrompts = (promptRows ?? []).map((p) => p.text as string);

  const result = await callStructured({
    model: MODELS.quality,
    system: CONTENT_SYSTEM,
    user: buildContentInput(analysis, brandDna as BrandDna | null, recommendation, evidencePrompts),
    schema: ContentPiece,
    schemaName: "content_piece",
    webSearch: false,
  });

  const c = result.parsed;
  const { data: inserted, error } = await admin
    .from("content_pieces")
    .insert({
      analysis_id: analysisId,
      report_id: reportId,
      type: recommendation.type,
      title: c.title,
      target_intent: c.targetIntent,
      cluster: c.cluster,
      body_markdown: c.bodyMarkdown,
      meta_title: c.metaTitle,
      meta_description: c.metaDescription,
      schema_jsonld: c.schemaJsonLd,
      faq_json: c.faq as never,
      raw_json: result.raw as never, // volledige ruwe OpenAI-output (§5)
      status: "ready",
      word_count: countWords(c.bodyMarkdown),
    })
    .select("id")
    .single();

  if (error || !inserted) throw new Error("Opslaan van de gegenereerde pagina mislukt.");
  return inserted.id as string;
}
