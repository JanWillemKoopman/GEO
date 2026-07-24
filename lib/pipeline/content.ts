import "server-only";

/**
 * FASE C — Genereren (abcplan.md §8): op klant-verzoek schrijft de app één
 * kant-en-klare pagina per aanbeveling, als een kleine REDACTIONELE PIJPLIJN
 * i.p.v. één blinde call (zie contentkwaliteit-analyse.md):
 *
 *   1. Draft         — premium model (gpt-4.1), on-brand, geground op de
 *                      concrete feiten uit het klantprofiel (geen verzinsels).
 *   2. Redactie      — goedkope call (mini) scoort de draft op een rubric en
 *                      checkt de harde regels (merkneutraal, geen verzonnen feiten,
 *                      answer-first).
 *   3. Herschrijven  — premium model verwerkt de redactie-feedback (alleen als nodig).
 *   4. Kwaliteitspoort — onder de drempel of met regel-risico → needs_review = true.
 *   5. Schema.org    — programmatisch gevalideerd/gerepareerd (geen LLM-string).
 *
 * Grounding komt uit het klantprofiel (proof_points/style_samples) + het
 * onderwerp-onderzoek; GEEN web_search (§10 kostenknop). Bij `action: "verbeteren"`
 * (§12.23, bepaald door het rapport) gaat de bestaande pagina-tekst uit
 * `profile_pages` mee als basis om op voort te bouwen, i.p.v. vanaf nul te
 * schrijven. Verschijnt in de Content Bibliotheek — dit is een SUGGESTIE, geen
 * directe CMS-publicatie (die is expliciet Fase D, nog niet gebouwd).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ContentPiece } from "@/lib/schemas/content-piece";
import { Critique } from "@/lib/schemas/critique";
import { validateOrRebuildJsonLd } from "@/lib/schema-jsonld";
import type { Analysis, Profile, ProfilePage, TopicResearch, ContentAction, ContentType } from "@/lib/types/database";

/** Onder deze rubric-score markeren we een pagina voor menselijke controle (F1). */
const REVIEW_THRESHOLD = 80;

/**
 * Harde regels — dit staat op de EIGEN website van de klant:
 * 1. Nooit concurrenten of andere bedrijven bij naam noemen.
 * 2. Geen specifieke feiten verzinnen. WEL toegestaan: de meegegeven,
 *    geverifieerde feiten uit "Feiten over dit bedrijf".
 * 3. Direct antwoord/kernboodschap eerst; heldere koppen; scanbaar; geen AI-slop.
 */
const CONTENT_SYSTEM =
  "Je bent een ervaren contentschrijver die pagina's schrijft voor de EIGEN website van een lokale " +
  "ondernemer, klaar om te publiceren. On-brand, Nederlands. " +
  "HARDE REGELS: " +
  "(1) Noem NOOIT concurrenten of andere bedrijven bij naam — dit is de site van de klant zelf; " +
  "vergelijkingen met bij naam genoemde bedrijven zijn absoluut verboden. " +
  "(2) Je mag de CONCRETE FEITEN gebruiken die onder 'Feiten over dit bedrijf' staan (die zijn geverifieerd " +
  "van de eigen site). Verzin daarbuiten GEEN specifieke feiten (prijzen, cijfers, productmerken, technieken, " +
  "keurmerken, openingstijden). Waar een concreet detail zou horen dat je niet weet, houd het algemeen; " +
  "vermijd holle superlatieven. " +
  "(3) Begin met het directe antwoord/de kernboodschap; heldere koppen; scanbaar. " +
  "(4) Schrijf in dezelfde stijl als de meegegeven voorbeeldzinnen van de site. " +
  "(5) Voeg geldige schema.org JSON-LD toe passend bij het type. " +
  "Vermijd generieke 'AI-slop' en cliché-vulzinnen ('in de snel veranderende wereld van…') — elke zin moet iets toevoegen.";

/** Redacteur-rol voor de kritiek-stap. */
const CRITIQUE_SYSTEM =
  "Je bent een strenge eindredacteur. Beoordeel de aangeleverde webpagina voor de EIGEN site van een ondernemer. " +
  "Scoor 0-100 op: begint met het directe antwoord, on-brand, concreet-waar-mogelijk (zonder verzinsels), scanbaar, " +
  "en waardevol (geen AI-slop/vulzinnen). Zet followsRules op false als de tekst een concurrent/ander bedrijf bij naam " +
  "noemt, feiten lijkt te verzinnen, of niet met het directe antwoord begint. Geef concrete, korte verbeterpunten. " +
  "Antwoord in het Nederlands.";

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
  /** Uit het rapport (abcplan.md §12.23): bestaande pagina verbeteren of nieuw? */
  action?: ContentAction;
  existingUrl?: string | null;
}

function countWords(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}

function buildContentInput(args: {
  analysis: Analysis;
  profile: Profile | null;
  topicResearch: TopicResearch | null;
  existingPage: ProfilePage | null;
  competitors: string[];
  rec: RecommendationInput;
  evidencePrompts: string[];
}): string {
  const { analysis, profile, topicResearch, existingPage, competitors, rec, evidencePrompts } = args;
  const proofPoints = profile?.proof_points ?? [];
  const styleSamples = profile?.style_samples ?? [];
  return [
    `Bedrijf: ${profile?.brand_name ?? analysis.url}`,
    `Website: ${analysis.url}`,
    `Onderwerp/scope: ${analysis.topic}`,
    analysis.content_brief?.trim()
      ? `Gewenste richting/doelgroep van de content (van de klant — VOLG dit): ${analysis.content_brief.trim()}`
      : "",
    `Branche: ${profile?.industry ?? "onbekend"}`,
    `Tone of voice: ${profile?.tone_of_voice ?? "professioneel, helder"}`,
    `Diensten/producten: ${(profile?.products ?? []).join(", ") || "onbekend"}`,
    profile?.value_props?.length ? `Waardeproposities (waarom klanten kiezen): ${profile.value_props.join(", ")}` : "",
    profile?.customer_questions?.length
      ? `Veelgehoorde klantvragen (verwerk waar relevant): ${profile.customer_questions.join(" | ")}`
      : "",
    // ✅ Grounding: geverifieerde feiten die de schrijver WEL mag gebruiken.
    proofPoints.length
      ? `Feiten over dit bedrijf (geverifieerd van de eigen site — deze mag je gebruiken):\n- ${proofPoints.join("\n- ")}`
      : "Feiten over dit bedrijf: (geen harde feiten bekend — blijf algemeen, verzin niets).",
    // ✅ Stijl-grounding: letterlijke voorbeeldzinnen om de toon na te bootsen.
    styleSamples.length ? `Voorbeeldzinnen in de merkstem (toon nabootsen):\n- ${styleSamples.join("\n- ")}` : "",
    topicResearch?.content_summary ? `Wat de website al zegt over dit onderwerp: ${topicResearch.content_summary}` : "",
    competitors.length
      ? `NIET noemen op deze pagina (concurrenten): ${competitors.join(", ")}`
      : "",
    "",
    `Te maken pagina: "${rec.title}" (type: ${rec.type})`,
    `Doel: ${rec.targetIntent}`,
    `Achtergrond: ${rec.why}`,
    TYPE_GUIDANCE[rec.type],
    existingPage
      ? `\nBESTAANDE PAGINA om te verbeteren/aanvullen (${existingPage.url}) — bouw hierop voort, herschrijf ` +
        `niet vanaf nul, behoud wat al goed is en vul alleen de ontbrekende delen aan:\n"""\n${existingPage.text_excerpt ?? ""}\n"""`
      : "",
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

/** Input voor de redactie-stap: de te beoordelen draft, compact. */
function buildCritiqueInput(piece: ContentPiece, rec: RecommendationInput): string {
  return [
    `Type pagina: ${rec.type}. Doel: ${rec.targetIntent}.`,
    `Titel: ${piece.title}`,
    "",
    "Pagina-inhoud (Markdown):",
    piece.bodyMarkdown,
    piece.faq.length ? `\nFAQ:\n${piece.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Input voor de herschrijf-stap: de originele opdracht + de redactie-feedback. */
function buildReviseInput(baseInput: string, piece: ContentPiece, issues: string[]): string {
  return [
    baseInput,
    "",
    "── HERSCHRIJF-OPDRACHT ──",
    "Hieronder je eigen eerdere versie én de opmerkingen van de eindredacteur. " +
      "Herschrijf de pagina zodat álle opmerkingen zijn verwerkt, met behoud van de harde regels.",
    "",
    "Verbeterpunten:",
    ...issues.map((i) => `- ${i}`),
    "",
    "Je eerdere versie (Markdown):",
    piece.bodyMarkdown,
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

  const [{ data: profileRow }, { data: topicResearchRow }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", analysis.profile_id).maybeSingle(),
    admin.from("topic_research").select("*").eq("analysis_id", analysisId).maybeSingle(),
  ]);
  const profile = profileRow as Profile | null;
  const topicResearch = topicResearchRow as TopicResearch | null;
  // Gededupliceerde unie: onderwerp-specifieke concurrenten + algemene bedrijfsconcurrenten.
  const competitors = Array.from(
    new Set([...(topicResearch?.competitors ?? []), ...(profile?.competitors ?? [])]),
  );

  const action = recommendation.action ?? "nieuw";
  let existingPage: ProfilePage | null = null;
  if (action === "verbeteren" && recommendation.existingUrl) {
    const { data: pageRow } = await admin
      .from("profile_pages")
      .select("*")
      .eq("profile_id", analysis.profile_id)
      .eq("url", recommendation.existingUrl)
      .maybeSingle();
    existingPage = (pageRow as ProfilePage | null) ?? null;
  }

  // Actieve prompts als thematische inspiratie (NIET letterlijk overnemen — zie system prompt).
  const { data: promptRows } = await admin
    .from("prompts")
    .select("text")
    .eq("analysis_id", analysisId)
    .eq("active", true)
    .limit(5);
  const evidencePrompts = (promptRows ?? []).map((p) => p.text as string);

  const baseInput = buildContentInput({
    analysis,
    profile,
    topicResearch,
    existingPage,
    competitors,
    rec: recommendation,
    evidencePrompts,
  });

  // ── 1. Draft (premium model) ─────────────────────────────────────────────
  const draft = await callStructured({
    model: MODELS.content,
    system: CONTENT_SYSTEM,
    user: baseInput,
    schema: ContentPiece,
    schemaName: "content_piece",
    webSearch: false,
  });

  // ── 2. Redactie/kritiek (goedkoop model) ─────────────────────────────────
  const critique1 = await callStructured({
    model: MODELS.quality,
    system: CRITIQUE_SYSTEM,
    user: buildCritiqueInput(draft.parsed, recommendation),
    schema: Critique,
    schemaName: "content_critique",
    webSearch: false,
  });

  let final = draft.parsed;
  let finalContentRaw: unknown = draft.raw;
  let score = critique1.parsed.qualityScore;
  let followsRules = critique1.parsed.followsRules;
  const critiqueRaws: unknown[] = [critique1.raw];

  // ── 3. Herschrijven (alleen als nodig) + herbeoordelen ───────────────────
  const needsRewrite =
    !critique1.parsed.followsRules ||
    critique1.parsed.qualityScore < REVIEW_THRESHOLD ||
    critique1.parsed.issues.length > 0;

  if (needsRewrite) {
    const revised = await callStructured({
      model: MODELS.content,
      system: CONTENT_SYSTEM,
      user: buildReviseInput(baseInput, draft.parsed, critique1.parsed.issues),
      schema: ContentPiece,
      schemaName: "content_piece",
      webSearch: false,
    });
    final = revised.parsed;
    finalContentRaw = revised.raw;

    // Herbeoordelen geeft een eerlijke eindscore voor de kwaliteitspoort.
    const critique2 = await callStructured({
      model: MODELS.quality,
      system: CRITIQUE_SYSTEM,
      user: buildCritiqueInput(revised.parsed, recommendation),
      schema: Critique,
      schemaName: "content_critique",
      webSearch: false,
    });
    score = critique2.parsed.qualityScore;
    followsRules = critique2.parsed.followsRules;
    critiqueRaws.push(critique2.raw);
  }

  // ── 4. Kwaliteitspoort (F1) ──────────────────────────────────────────────
  const needsReview = !followsRules || score < REVIEW_THRESHOLD;

  // ── 5. Schema.org programmatisch valideren/repareren (E1) ────────────────
  const schemaJsonLd = validateOrRebuildJsonLd(final.schemaJsonLd, {
    type: recommendation.type,
    title: final.title,
    description: final.metaDescription,
    url: analysis.url,
    faq: final.faq,
  });

  const { data: inserted, error } = await admin
    .from("content_pieces")
    .insert({
      analysis_id: analysisId,
      report_id: reportId,
      type: recommendation.type,
      title: final.title,
      target_intent: final.targetIntent,
      cluster: final.cluster,
      body_markdown: final.bodyMarkdown,
      meta_title: final.metaTitle,
      meta_description: final.metaDescription,
      schema_jsonld: schemaJsonLd,
      faq_json: final.faq as never,
      raw_json: finalContentRaw as never, // ruwe output van de (her)schrijf-call (§5)
      critique_raw_json: critiqueRaws as never, // ruwe redactie-output(en) (§5)
      quality_score: score,
      needs_review: needsReview,
      status: "ready",
      word_count: countWords(final.bodyMarkdown),
      action,
      existing_url: existingPage?.url ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) throw new Error("Opslaan van de gegenereerde pagina mislukt.");
  return inserted.id as string;
}
