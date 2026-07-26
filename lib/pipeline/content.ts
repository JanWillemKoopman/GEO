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
import { MODELS, TEMPERATURES } from "@/lib/openai/models";
import { ContentPiece } from "@/lib/schemas/content-piece";
import { Critique } from "@/lib/schemas/critique";
import { validateOrRebuildJsonLd } from "@/lib/schema-jsonld";
import type {
  Analysis,
  Profile,
  ProfilePage,
  TopicResearch,
  ContentAction,
  ContentType,
  // De databaserij heet ook ContentPiece; hernoemd om te botsen met het Zod-schema.
  ContentPiece as ContentPieceRow,
} from "@/lib/types/database";

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

/**
 * De context die beide contentstappen nodig hebben. Puur databasewerk, geen
 * AI-aanroepen — dus goedkoop om in stap 2 opnieuw op te bouwen.
 */
async function loadContentContext(
  admin: ReturnType<typeof createAdminClient>,
  analysisId: string,
  userId: string,
  recommendation: RecommendationInput,
): Promise<{ analysis: Analysis; baseInput: string }> {
  const { data: analysisRow } = await admin.from("analyses").select("*").eq("id", analysisId).single();
  if (!analysisRow || analysisRow.user_id !== userId) throw new Error("Analyse niet gevonden.");
  const analysis = analysisRow as Analysis;

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

  return {
    analysis,
    baseInput: buildContentInput({
      analysis,
      profile,
      topicResearch,
      existingPage,
      competitors,
      rec: recommendation,
      evidencePrompts,
    }),
  };
}

/** Zet de opgeslagen kolommen terug om naar de vorm die de prompts verwachten. */
function pieceFromRow(row: ContentPieceRow): ContentPiece {
  return {
    title: row.title,
    metaTitle: row.meta_title ?? "",
    metaDescription: row.meta_description ?? "",
    bodyMarkdown: row.body_markdown ?? "",
    faq: (row.faq_json ?? []) as { q: string; a: string }[],
    schemaJsonLd: row.schema_jsonld ?? "",
    targetIntent: row.target_intent ?? "",
    cluster: row.cluster ?? "",
  };
}

export interface DraftResult {
  contentPieceId: string;
  /** Moet er een herschrijfronde komen? Zo ja, met welke verbeterpunten? */
  needsRevise: boolean;
  issues: string[];
}

/**
 * ── STAP 1 — schrijven + beoordelen (optimalisatie.md 1.3) ──────────────────
 *
 * Contentgeneratie deed vier AI-aanroepen achter elkaar, waarvan twee een
 * volledige pagina schrijven. Dat past niet betrouwbaar in één taak: het is de
 * meest waarschijnlijke plek waar het op een tijdslimiet stukloopt, en dan is
 * het dure schrijfwerk wég.
 *
 * Daarom twee taken. Deze stap schrijft en beoordeelt, en zet het resultaat
 * hoe dan ook in de database — als 'draft' wanneer er nog een herschrijfronde
 * volgt, als 'ready' wanneer de eerste versie al door de poort komt. Loopt stap
 * 2 stuk, dan is het werk van stap 1 dus nog steeds bewaard.
 */
export async function draftContentPiece(args: {
  analysisId: string;
  userId: string;
  reportId: string | null;
  recommendation: RecommendationInput;
}): Promise<DraftResult> {
  const { analysisId, userId, reportId, recommendation } = args;
  const admin = createAdminClient();

  // Idempotent: bestaat deze pagina (zelfde analyse + titel) al, dan niets doen.
  const { data: existing } = await admin
    .from("content_pieces")
    .select("id, status")
    .eq("analysis_id", analysisId)
    .eq("title", recommendation.title)
    .maybeSingle();
  if (existing && existing.status !== "draft") {
    return { contentPieceId: existing.id as string, needsRevise: false, issues: [] };
  }

  const { analysis, baseInput } = await loadContentContext(admin, analysisId, userId, recommendation);

  // ── Draft (premium model) ────────────────────────────────────────────────
  const draft = await callStructured({
    model: MODELS.content,
    system: CONTENT_SYSTEM,
    user: baseInput,
    schema: ContentPiece,
    schemaName: "content_piece",
    webSearch: false,
    temperature: TEMPERATURES.content,
    meta: { kind: "content_draft", analysisId, profileId: analysis.profile_id },
  });

  // ── Redactie/kritiek (goedkoop model) ────────────────────────────────────
  const critique = await callStructured({
    model: MODELS.quality,
    system: CRITIQUE_SYSTEM,
    user: buildCritiqueInput(draft.parsed, recommendation),
    schema: Critique,
    schemaName: "content_critique",
    webSearch: false,
    temperature: TEMPERATURES.deterministic,
    meta: { kind: "content_critique", analysisId, profileId: analysis.profile_id },
  });

  const needsRevise =
    !critique.parsed.followsRules ||
    critique.parsed.qualityScore < REVIEW_THRESHOLD ||
    critique.parsed.issues.length > 0;

  const action = recommendation.action ?? "nieuw";
  const row = {
    analysis_id: analysisId,
    report_id: reportId,
    type: recommendation.type,
    title: draft.parsed.title,
    target_intent: draft.parsed.targetIntent,
    cluster: draft.parsed.cluster,
    body_markdown: draft.parsed.bodyMarkdown,
    meta_title: draft.parsed.metaTitle,
    meta_description: draft.parsed.metaDescription,
    schema_jsonld: validateOrRebuildJsonLd(draft.parsed.schemaJsonLd, {
      type: recommendation.type,
      title: draft.parsed.title,
      description: draft.parsed.metaDescription,
      url: analysis.url,
      faq: draft.parsed.faq,
    }),
    faq_json: draft.parsed.faq as never,
    raw_json: draft.raw as never,
    critique_raw_json: [critique.raw] as never,
    quality_score: critique.parsed.qualityScore,
    // Komt de eerste versie al door de poort, dan is dit meteen de eindstand.
    needs_review: needsRevise ? true : !critique.parsed.followsRules,
    status: needsRevise ? ("draft" as const) : ("ready" as const),
    word_count: countWords(draft.parsed.bodyMarkdown),
    action,
    existing_url: recommendation.existingUrl ?? null,
  };

  const contentPieceId = existing
    ? ((await admin.from("content_pieces").update(row).eq("id", existing.id).select("id").single()).data
        ?.id as string)
    : ((await admin.from("content_pieces").insert(row).select("id").single()).data?.id as string);

  if (!contentPieceId) throw new Error("Opslaan van de gegenereerde pagina mislukt.");

  return { contentPieceId, needsRevise, issues: critique.parsed.issues };
}

/**
 * ── STAP 2 — herschrijven + herbeoordelen ───────────────────────────────────
 *
 * Verwerkt de verbeterpunten uit stap 1 en bepaalt de eindscore. Faalt deze
 * stap definitief, dan blijft de draft uit stap 1 staan (als 'draft', met
 * needs_review) in plaats van dat het schrijfwerk verloren gaat.
 */
export async function reviseContentPiece(args: {
  analysisId: string;
  userId: string;
  contentPieceId: string;
  recommendation: RecommendationInput;
  issues: string[];
}): Promise<void> {
  const { analysisId, userId, contentPieceId, recommendation, issues } = args;
  const admin = createAdminClient();

  const { data: pieceRow } = await admin
    .from("content_pieces")
    .select("*")
    .eq("id", contentPieceId)
    .maybeSingle();
  if (!pieceRow) throw new Error(`Contentpagina ${contentPieceId} niet gevonden.`);
  if (pieceRow.status !== "draft") return; // al afgerond — niets te doen (idempotent)

  const { analysis, baseInput } = await loadContentContext(admin, analysisId, userId, recommendation);
  const draftPiece = pieceFromRow(pieceRow as ContentPieceRow);

  const revised = await callStructured({
    model: MODELS.content,
    system: CONTENT_SYSTEM,
    user: buildReviseInput(baseInput, draftPiece, issues),
    schema: ContentPiece,
    schemaName: "content_piece",
    webSearch: false,
    temperature: TEMPERATURES.content,
    meta: { kind: "content_revise", analysisId, profileId: analysis.profile_id },
  });

  // Herbeoordelen geeft een eerlijke eindscore voor de kwaliteitspoort.
  const critique = await callStructured({
    model: MODELS.quality,
    system: CRITIQUE_SYSTEM,
    user: buildCritiqueInput(revised.parsed, recommendation),
    schema: Critique,
    schemaName: "content_critique",
    webSearch: false,
    temperature: TEMPERATURES.deterministic,
    meta: { kind: "content_critique", analysisId, profileId: analysis.profile_id },
  });

  const final = revised.parsed;
  const needsReview = !critique.parsed.followsRules || critique.parsed.qualityScore < REVIEW_THRESHOLD;

  // Ruwe kritiek van BEIDE rondes bewaren (§5: we bewaren alles).
  const previousCritiques = Array.isArray(pieceRow.critique_raw_json) ? pieceRow.critique_raw_json : [];

  await admin
    .from("content_pieces")
    .update({
      title: final.title,
      target_intent: final.targetIntent,
      cluster: final.cluster,
      body_markdown: final.bodyMarkdown,
      meta_title: final.metaTitle,
      meta_description: final.metaDescription,
      schema_jsonld: validateOrRebuildJsonLd(final.schemaJsonLd, {
        type: recommendation.type,
        title: final.title,
        description: final.metaDescription,
        url: analysis.url,
        faq: final.faq,
      }),
      faq_json: final.faq as never,
      raw_json: revised.raw as never,
      critique_raw_json: [...previousCritiques, critique.raw] as never,
      quality_score: critique.parsed.qualityScore,
      needs_review: needsReview,
      status: "ready" as const,
      word_count: countWords(final.bodyMarkdown),
    })
    .eq("id", contentPieceId);
}
