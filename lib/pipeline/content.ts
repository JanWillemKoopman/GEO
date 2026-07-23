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
import { brandNameFromRawJson } from "@/lib/pipeline/brand-name";
import type { Analysis, BrandDna, ContentType } from "@/lib/types/database";

/**
 * Harde regels — dit staat op de EIGEN website van de klant:
 * 1. Nooit concurrenten of andere bedrijven bij naam noemen.
 * 2. Geen specifieke feiten verzinnen (prijzen, cijfers, productmerken, technieken,
 *    keurmerken) die niet uit de gegeven context blijken.
 * 3. Direct antwoord/kernboodschap eerst; heldere koppen; scanbaar; geen AI-slop.
 */
const CONTENT_SYSTEM =
  "Je bent een ervaren contentschrijver die pagina's schrijft voor de EIGEN website van een lokale " +
  "ondernemer, klaar om te publiceren. On-brand, Nederlands. " +
  "HARDE REGELS: " +
  "(1) Noem NOOIT concurrenten of andere bedrijven bij naam — dit is de site van de klant zelf; " +
  "vergelijkingen met bij naam genoemde bedrijven zijn absoluut verboden. " +
  "(2) Verzin GEEN specifieke feiten (prijzen, cijfers, productmerken, technieken, keurmerken, " +
  "openingstijden) die niet uit de gegeven context blijken. Blijf bij algemeen-ware uitspraken en " +
  "vermijd holle superlatieven. Waar een concreet detail zou horen dat je niet weet, houd het algemeen. " +
  "(3) Begin met het directe antwoord/de kernboodschap; heldere koppen; scanbaar. " +
  "(4) Voeg geldige schema.org JSON-LD toe passend bij het type. " +
  "Vermijd generieke 'AI-slop' — elke zin moet iets toevoegen.";

/** Type-specifieke instructie — bepaalt wat voor pagina er echt uitkomt. */
const TYPE_GUIDANCE: Record<ContentType, string> = {
  faq:
    "Schrijf ECHTE veelgestelde klantvragen + antwoorden: dingen die klanten willen weten vóór ze " +
    "langskomen of boeken (bv. hoe maak ik een afspraak of kan ik zonder afspraak langskomen, welke " +
    "diensten zijn er, hoe lang duurt een behandeling, wat kan ik verwachten, hoe kan ik betalen). " +
    "Neem de voorbeeld-/zoekvragen NIET letterlijk over — die zijn alleen thematische input. " +
    "Zet de vraag-antwoord-paren in het FAQ-veld en houd bodyMarkdown kort (alleen een korte inleiding), " +
    "zodat de vragen niet dubbel op de pagina verschijnen.",
  landing:
    "Schrijf een overtuigende landingspagina voor deze dienst/dit onderwerp: heldere waardepropositie " +
    "bovenaan, wat de klant krijgt, waarom voor deze aanbieder kiezen, en een duidelijke call-to-action.",
  article:
    "Schrijf een informatief, waardevol artikel dat het onderwerp echt beantwoordt met correcte, " +
    "concrete-waar-mogelijk informatie (zonder iets te verzinnen).",
  comparison:
    "Vergelijk OPTIES of AANPAKKEN in algemene zin (bv. types dienstverleners of methoden). " +
    "Vergelijk NOOIT met concrete, bij naam genoemde bedrijven.",
};

export interface RecommendationInput {
  title: string;
  type: ContentType;
  targetIntent: string;
  why: string;
}

function countWords(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}

function buildContentInput(args: {
  analysis: Analysis;
  brandDna: BrandDna | null;
  brandName: string | null;
  competitors: string[];
  rec: RecommendationInput;
  evidencePrompts: string[];
}): string {
  const { analysis, brandDna, brandName, competitors, rec, evidencePrompts } = args;
  return [
    `Bedrijf: ${brandName ?? analysis.url}`,
    `Website: ${analysis.url}`,
    `Onderwerp/scope: ${analysis.topic ?? "(hele website)"}`,
    `Branche: ${brandDna?.industry ?? "onbekend"}`,
    `Tone of voice: ${brandDna?.tone_of_voice ?? "professioneel, helder"}`,
    `Diensten/producten: ${(brandDna?.products ?? []).join(", ") || "onbekend"}`,
    competitors.length
      ? `NIET noemen op deze pagina (concurrenten): ${competitors.join(", ")}`
      : "",
    "",
    `Te maken pagina: "${rec.title}" (type: ${rec.type})`,
    `Doel: ${rec.targetIntent}`,
    `Achtergrond: ${rec.why}`,
    TYPE_GUIDANCE[rec.type],
    evidencePrompts.length
      ? `\nWaar klanten naar zoeken (ALLEEN ter inspiratie voor de onderwerpen — niet letterlijk ` +
        `overnemen, en herschrijf naar echte, merkneutrale klantinhoud zonder concurrentnamen):\n- ${evidencePrompts.join("\n- ")}`
      : "",
    "",
    "Schrijf de volledige pagina in Markdown (zonder concurrentnamen), plus meta-title (max 60 tekens), " +
      "meta-description (max 160 tekens), FAQ en schema.org JSON-LD.",
  ]
    .filter(Boolean)
    .join("\n");
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

  const { data: brandDnaRow } = await admin
    .from("brand_dna")
    .select("*")
    .eq("analysis_id", analysisId)
    .maybeSingle();
  const brandDna = brandDnaRow as BrandDna | null;
  const brandName = brandNameFromRawJson(brandDna?.raw_json);
  const competitors = brandDna?.competitors ?? [];

  // Actieve prompts als thematische inspiratie (NIET letterlijk overnemen — zie system prompt).
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
    user: buildContentInput({ analysis, brandDna, brandName, competitors, rec: recommendation, evidencePrompts }),
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
