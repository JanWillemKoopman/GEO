import "server-only";

/**
 * FASE C — Genereren (abcplan.md §8): op klant-verzoek schrijft de app één
 * kant-en-klare pagina per aanbeveling, als een kleine REDACTIONELE PIJPLIJN
 * i.p.v. één blinde call:
 *
 *   1. Draft         — premium model (gpt-4.1), on-brand, geground op de
 *                      concrete feiten uit het klantprofiel.
 *   2. Redactie      — goedkope call (mini) scoort de draft op een rubric,
 *                      checkt de harde regels én de GEO-criteria.
 *   3. Herschrijven  — premium model verwerkt de feedback (alleen als nodig).
 *   4. Kwaliteitspoort — onder de drempel of met regel-risico → needs_review.
 *   5. Schema.org    — programmatisch gevalideerd/gerepareerd (geen LLM-string).
 *
 * ── WAT ER IN FASE 4 VERANDERDE (optimalisatie.md) ──────────────────────────
 *
 * De app mat wél en schreef wél, maar de twee helften raakten elkaar niet. De
 * schrijfaanroep kreeg het merkprofiel en VIJF WILLEKEURIGE vraagteksten "alleen
 * ter inspiratie". Wat hij niet kreeg: welke vraag hij moest winnen, wat de AI
 * antwoordde toen de concurrent won, en welke bronnen daarbij geciteerd werden.
 *
 * Nu krijgt hij dat alle drie:
 *   • de concrete GEMISTE VRAGEN uit de meting, letterlijk (4.2)
 *   • het WINNENDE ANTWOORD als context, met concurrentnamen eruit (4.3)
 *   • wat de GECITEERDE BRONNEN inhoudelijk doen — de lat (4.4)
 *
 * En de beoordelaar kijkt niet meer alleen redactioneel maar ook of een AI deze
 * pagina zou citeren (4.5).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { currentPiece } from "@/lib/jobs/content-jobs";
import { callStructured } from "@/lib/openai/structured";
import { MODELS, TEMPERATURES } from "@/lib/openai/models";
import { ContentPiece } from "@/lib/schemas/content-piece";
import { Critique, geoScore, geoIssues } from "@/lib/schemas/critique";
import { validateOrRebuildJsonLd } from "@/lib/schema-jsonld";
import { redactCompetitors, containsCompetitor } from "@/lib/pipeline/redact";
import { analyzeCitedSources } from "@/lib/pipeline/source-analysis";
import { contentWebSearchEnabled, minProofPointsForConcreteContent } from "@/lib/config";
import type { RecommendationTarget } from "@/lib/pipeline/recommendation";
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
 * Onder deze GEO-score is de pagina misschien prima geschreven, maar niet
 * geschikt voor het doel waarvoor hij gemaakt is. 60 = drie van de vijf criteria;
 * daaronder ontbreekt er iets fundamenteels (meestal: de doelvraag wordt niet
 * meteen beantwoord, of het bedrijf staat er nergens met naam in).
 */
const GEO_THRESHOLD = 60;

/**
 * Doellengte per paginatype (optimalisatie.md 4.10).
 *
 * Er ging nooit een maximum mee; het aantal woorden werd achteraf geteld. Dat
 * levert bij elk type dezelfde middelmatige lap tekst op, terwijl een FAQ geen
 * artikel is. Een AI-assistent citeert bovendien liever een compacte, precieze
 * passage dan een uitgesponnen betoog — lengte is hier geen kwaliteitsmaat.
 */
const TARGET_WORDS: Record<ContentType, { min: number; max: number }> = {
  faq: { min: 250, max: 500 }, // korte inleiding; het werk zit in de vraag-antwoordparen
  landing: { min: 400, max: 700 }, // overtuigen kost ruimte, uitweiden niet
  article: { min: 700, max: 1200 }, // het enige type waar diepte echt telt
  comparison: { min: 500, max: 900 },
};

/**
 * Harde regels — dit staat op de EIGEN website van de klant:
 * 1. Nooit concurrenten of andere bedrijven bij naam noemen.
 * 2. Geen specifieke feiten verzinnen. WEL toegestaan: de meegegeven,
 *    geverifieerde feiten uit "Feiten over dit bedrijf".
 * 3. Direct antwoord eerst; heldere koppen; scanbaar; geen AI-slop.
 *
 * De GEO-regels (4-6) zijn nieuw in fase 4 en gaan over iets anders dan
 * leesbaarheid: ze gaan over de vraag of een AI-assistent deze pagina kán
 * aanhalen. Regel 5 is de belangrijkste en de minst intuïtieve — "wij leveren
 * binnen 24 uur" is voor een lezer duidelijk en voor een model waardeloos,
 * omdat het niet weet wie "wij" is.
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
  "(3) Schrijf in dezelfde stijl als de meegegeven voorbeeldzinnen van de site. " +
  "REGELS VOOR VINDBAARHEID IN AI-ASSISTENTEN (net zo belangrijk als de rest): " +
  "(4) Beantwoord de DOELVRAAG letterlijk en volledig in de eerste twee zinnen van de pagina, vóór " +
  "elke inleiding. Een AI die een antwoord zoekt, leest de opwarmer niet uit. " +
  "(5) Noem het BEDRIJF EXPLICIET bij naam op de plekken waar je iets over jezelf zegt, in plaats van " +
  "'wij' en 'ons'. Schrijf dus niet 'wij leveren binnen 24 uur' maar '[Bedrijfsnaam] levert binnen 24 uur'. " +
  "Een AI-assistent die 'wij' leest, weet niet wie hij moet noemen in zijn antwoord — en noemt je dus niet. " +
  "(6) Zorg dat elke sectie minstens één zin bevat die LOSSTAAND te begrijpen is, zonder de rest van de " +
  "pagina: één zin die het complete antwoord op één deelvraag geeft. Dat is de eenheid waarin een " +
  "AI-assistent knipt. " +
  "(7) Beantwoord naast de hoofdvraag ook de logische vervolgvragen die iemand daarna stelt. " +
  "(8) Voeg geldige schema.org JSON-LD toe passend bij het type. " +
  "Vermijd generieke 'AI-slop' en cliché-vulzinnen ('in de snel veranderende wereld van…') — elke zin moet iets toevoegen.";

/**
 * Vangnet-instructie als de klant te weinig geverifieerde feiten heeft
 * (optimalisatie.md 4.6). Alleen actief bij een dunne feitenlijst, en alleen
 * met web-zoeken aan.
 *
 * De spanning die dit oplost: "verzin niets" + "wees concreet" is bij een dunne
 * website een tegenspraak, en het model kiest dan altijd voor algemeen. Door
 * ALGEMENE vakkennis te laten opzoeken (geen bedrijfsclaims — die kunnen we niet
 * controleren) krijgt de pagina toch iets concreets om op te staan.
 */
const FACT_FINDING_ADDENDUM =
  " AANVULLENDE OPDRACHT: er zijn weinig geverifieerde feiten over dit bedrijf beschikbaar. Zoek daarom " +
  "op internet naar ALGEMEEN GELDENDE, verifieerbare feiten over het ONDERWERP (normen, termijnen, " +
  "richtprijzen in de markt, wettelijke eisen, technische standaarden) en verwerk die met bronvermelding. " +
  "Doe dit NOOIT voor claims over dit specifieke bedrijf — die mag je alleen uit de aangeleverde feitenlijst " +
  "halen. Een marktfeit met bron is waardevol; een verzonnen bedrijfsfeit is schadelijk.";

/** Redacteur-rol voor de kritiek-stap — redactioneel én GEO (optimalisatie.md 4.5). */
const CRITIQUE_SYSTEM =
  "Je bent een strenge eindredacteur én GEO-specialist. Beoordeel de aangeleverde webpagina voor de " +
  "EIGEN site van een ondernemer. " +
  "REDACTIONEEL: scoor 0-100 op begint-met-het-directe-antwoord, on-brand, concreet-waar-mogelijk " +
  "(zonder verzinsels), scanbaar, en waardevol (geen AI-slop/vulzinnen). " +
  "HARDE REGELS: zet followsRules op false als de tekst een concurrent/ander bedrijf bij naam noemt, " +
  "feiten lijkt te verzinnen, of niet met het directe antwoord begint. " +
  "GEO — zou een AI-assistent deze pagina CITEREN? Beoordeel elk criterium streng en apart: " +
  "wordt de DOELVRAAG hierboven letterlijk beantwoord in de eerste twee zinnen; bevat elke sectie een zin " +
  "die LOSSTAAND te begrijpen is; wordt het bedrijf EXPLICIET bij naam genoemd in plaats van 'wij'/'ons'; " +
  "staan er concrete cijfers/jaartallen/feiten in; worden de logische vervolgvragen beantwoord. " +
  "Bij twijfel: false. Een te milde beoordeling levert een pagina op die niemand citeert. " +
  "Geef concrete, korte verbeterpunten. Antwoord in het Nederlands.";

/** Type-specifieke instructie — bepaalt wat voor pagina er echt uitkomt. */
const TYPE_GUIDANCE: Record<ContentType, string> = {
  faq:
    "Schrijf ECHTE veelgestelde klantvragen + antwoorden: dingen die klanten willen weten vóór ze " +
    "langskomen of boeken (bv. hoe maak ik een afspraak of kan ik zonder afspraak langskomen, welke " +
    "diensten zijn er, hoe lang duurt een behandeling, wat kan ik verwachten, hoe kan ik betalen). " +
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
  /** De gemiste vragen die deze pagina moet winnen (optimalisatie.md 4.1/4.2). */
  targets?: RecommendationTarget[];
  /** Wat de klant zelf anders wil (optimalisatie.md 4.8). */
  revisionNote?: string | null;
}

function countWords(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * De doelvragen als blok. Dit vervangt de "vijf willekeurige vraagteksten ALLEEN
 * ter inspiratie" — een instructie die het model expliciet vertelde de vragen
 * níét serieus te nemen, terwijl ze het enige waren wat de meting bijdroeg.
 */
function buildTargetBlock(targets: RecommendationTarget[]): string {
  if (targets.length === 0) return "";
  const lines = targets.map((t) => `- "${t.text}"`);
  return (
    `\nDOELVRAGEN — dit zijn de vragen waarop een AI-assistent jouw klant NU NIET noemt. Deze pagina ` +
    `moet ze expliciet en direct beantwoorden; dat is het hele doel van deze pagina:\n${lines.join("\n")}`
  );
}

/**
 * Het antwoord waarin de concurrent won, als context (optimalisatie.md 4.3).
 *
 * Concurrentnamen zijn er al uit (redactCompetitors), en er staat een vangnet
 * omheen: zit er ná het opschonen tóch nog een naam in, dan laten we het blok
 * weg. Liever minder context dan de harde regel breken — een pagina die een
 * concurrent noemt is onbruikbaar voor de klant, hoe goed hij verder ook is.
 */
function buildWinningAnswerBlock(answers: string[], competitors: string[]): string {
  const safe = answers
    .map((a) => redactCompetitors(a, competitors))
    .filter((a) => a.trim() && !containsCompetitor(a, competitors))
    .slice(0, 2);

  if (safe.length === 0) return "";

  return (
    `\nWAT DE AI NU ANTWOORDT op deze vragen (bedrijfsnamen zijn vervangen door een neutrale ` +
    `aanduiding). Dit is het antwoord waarin jouw klant NIET voorkwam. Jouw pagina moet de informatie ` +
    `bevatten die hier ontbreekt, of dezelfde informatie concreter en directer geven. Neem hier NIETS ` +
    `letterlijk uit over:\n` +
    safe.map((a, i) => `--- ANTWOORD ${i + 1} ---\n${a}`).join("\n\n")
  );
}

function buildContentInput(args: {
  analysis: Analysis;
  profile: Profile | null;
  topicResearch: TopicResearch | null;
  existingPage: ProfilePage | null;
  competitors: string[];
  rec: RecommendationInput;
  targets: RecommendationTarget[];
  winningAnswers: string[];
  sourceBlock: string;
  answeredFacts: string[];
}): string {
  const {
    analysis,
    profile,
    topicResearch,
    existingPage,
    competitors,
    rec,
    targets,
    winningAnswers,
    sourceBlock,
    answeredFacts,
  } = args;

  // Feiten van de site + feiten die de klant zelf aanleverde (4.6). Die tweede
  // groep is doorgaans waardevoller: het zijn precies de cijfers die nergens op
  // de website stonden.
  const proofPoints = [...(profile?.proof_points ?? []), ...answeredFacts];
  const styleSamples = profile?.style_samples ?? [];
  const words = TARGET_WORDS[rec.type];
  const brandName = profile?.brand_name ?? analysis.url;

  return [
    `Bedrijf: ${brandName}`,
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
      ? `Feiten over dit bedrijf (geverifieerd — deze mag en MOET je gebruiken waar ze passen):\n- ${proofPoints.join("\n- ")}`
      : "Feiten over dit bedrijf: (geen harde feiten bekend — blijf algemeen, verzin niets).",
    // ✅ Stijl-grounding: letterlijke voorbeeldzinnen om de toon na te bootsen.
    styleSamples.length ? `Voorbeeldzinnen in de merkstem (toon nabootsen):\n- ${styleSamples.join("\n- ")}` : "",
    topicResearch?.content_summary ? `Wat de website al zegt over dit onderwerp: ${topicResearch.content_summary}` : "",
    competitors.length ? `NIET noemen op deze pagina (concurrenten): ${competitors.join(", ")}` : "",
    "",
    `Te maken pagina: "${rec.title}" (type: ${rec.type})`,
    `Doel: ${rec.targetIntent}`,
    `Achtergrond: ${rec.why}`,
    TYPE_GUIDANCE[rec.type],
    // 4.10 — lengte sturen in plaats van achteraf tellen.
    `Doellengte: ${words.min}-${words.max} woorden in bodyMarkdown. Een AI-assistent citeert liever een ` +
      `compacte, precieze passage dan een uitgesponnen betoog; ga niet over het maximum heen om vol te maken.`,
    // 4.2 — de doelvraag letterlijk.
    buildTargetBlock(targets),
    // 4.3 — het winnende antwoord als context.
    buildWinningAnswerBlock(winningAnswers, competitors),
    // 4.4 — wat de geciteerde bronnen doen.
    sourceBlock,
    existingPage
      ? `\nBESTAANDE PAGINA om te verbeteren/aanvullen (${existingPage.url}) — bouw hierop voort, herschrijf ` +
        `niet vanaf nul, behoud wat al goed is en vul alleen de ontbrekende delen aan:\n"""\n${existingPage.text_excerpt ?? ""}\n"""`
      : "",
    "",
    `Schrijf de volledige pagina in Markdown (zonder concurrentnamen), plus meta-title (max 60 tekens), ` +
      `meta-description (max 160 tekens), FAQ en schema.org JSON-LD. Noem "${brandName}" expliciet bij naam ` +
      `waar je iets over het bedrijf zegt.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Input voor de redactie-stap. Krijgt sinds fase 4 de DOELVRAAG mee — zonder die
 * vraag kon de beoordelaar onmogelijk vaststellen of de pagina hem beantwoordt,
 * en beoordeelde hij dus alleen of de tekst lekker las.
 */
function buildCritiqueInput(
  piece: ContentPiece,
  rec: RecommendationInput,
  targets: RecommendationTarget[],
  brandName: string,
): string {
  return [
    `Type pagina: ${rec.type}. Doel: ${rec.targetIntent}.`,
    `Bedrijfsnaam die expliciet genoemd moet worden: ${brandName}`,
    targets.length
      ? `DOELVRAGEN die deze pagina moet beantwoorden:\n- ${targets.map((t) => t.text).join("\n- ")}`
      : "DOELVRAAG: niet opgegeven — beoordeel dan of de pagina zijn eigen titel als vraag beantwoordt.",
    `Titel: ${piece.title}`,
    "",
    "Pagina-inhoud (Markdown):",
    piece.bodyMarkdown,
    piece.faq.length ? `\nFAQ:\n${piece.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Input voor de herschrijf-stap: de originele opdracht + de feedback. */
function buildReviseInput(
  baseInput: string,
  piece: ContentPiece,
  issues: string[],
  revisionNote?: string | null,
): string {
  return [
    baseInput,
    "",
    "── HERSCHRIJF-OPDRACHT ──",
    "Hieronder je eigen eerdere versie én de opmerkingen. Herschrijf de pagina zodat álle opmerkingen " +
      "zijn verwerkt, met behoud van de harde regels.",
    // De klant gaat vóór de redacteur. Dit is zijn website; vraagt hij om een
    // andere toon of een ander accent, dan is dat geen suggestie (4.8).
    revisionNote?.trim()
      ? `\nWAT DE KLANT ZELF VRAAGT (dit weegt het ZWAARST — dit is zijn website):\n"""\n${revisionNote.trim()}\n"""`
      : "",
    issues.length ? `\nVerbeterpunten van de eindredacteur:\n${issues.map((i) => `- ${i}`).join("\n")}` : "",
    "",
    "Je eerdere versie (Markdown):",
    piece.bodyMarkdown,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * De context die beide contentstappen nodig hebben. Puur databasewerk plus
 * hooguit één bronanalyse-aanroep.
 */
interface ContentContext {
  analysis: Analysis;
  profile: Profile | null;
  competitors: string[];
  targets: RecommendationTarget[];
  baseInput: string;
  /** Web-zoeken aanzetten voor déze aanroep, omdat de feitenlijst te dun is (4.6). */
  needsFactFinding: boolean;
  brandName: string;
}

async function loadContentContext(
  admin: ReturnType<typeof createAdminClient>,
  analysisId: string,
  userId: string,
  recommendation: RecommendationInput,
): Promise<ContentContext> {
  const { data: analysisRow } = await admin.from("analyses").select("*").eq("id", analysisId).single();
  if (!analysisRow || analysisRow.user_id !== userId) throw new Error("Analyse niet gevonden.");
  const analysis = analysisRow as Analysis;

  const [{ data: profileRow }, { data: topicResearchRow }, { data: factRows }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", analysis.profile_id).maybeSingle(),
    admin.from("topic_research").select("*").eq("analysis_id", analysisId).maybeSingle(),
    // Feiten die de klant zelf aanleverde (4.6) — vaak precies de cijfers die
    // nergens op de website stonden.
    admin
      .from("fact_requests")
      .select("question, answer")
      .eq("profile_id", analysis.profile_id)
      .eq("status", "beantwoord"),
  ]);
  const profile = profileRow as Profile | null;
  const topicResearch = topicResearchRow as TopicResearch | null;

  const answeredFacts = (factRows ?? [])
    .filter((f) => (f.answer as string | null)?.trim())
    .map((f) => `${f.question}: ${(f.answer as string).trim()}`);

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

  const targets = recommendation.targets ?? [];

  // ── De metingen achter de doelvragen ophalen (4.3/4.4) ────────────────────
  // Het letterlijke antwoord waarin de concurrent won, plus de bronnen die
  // daarbij geciteerd werden. Beide stonden al in de database en werden nooit
  // gebruikt.
  const runIds = targets.map((t) => t.runId).filter((id): id is string => Boolean(id));
  let winningAnswers: string[] = [];
  let citedSources: string[] = [];

  if (runIds.length > 0) {
    const [{ data: runRows }, { data: mentionRows }] = await Promise.all([
      admin.from("tracking_runs").select("id, raw_response").in("id", runIds),
      admin
        .from("tracking_run_mentions")
        .select("cited_sources, is_own_brand, mentioned")
        .in("tracking_run_id", runIds),
    ]);
    winningAnswers = (runRows ?? [])
      .map((r) => (r.raw_response as string | null) ?? "")
      .filter(Boolean);
    citedSources = Array.from(
      new Set(
        (mentionRows ?? [])
          // Alleen de bronnen bij een merk dat WÉL genoemd werd: dat zijn de
          // pagina's die de AI overtuigend genoeg vond om aan te halen.
          .filter((m) => m.mentioned && !m.is_own_brand)
          .flatMap((m) => (m.cited_sources ?? []) as string[]),
      ),
    );
  }

  const sources = await analyzeCitedSources({
    urls: citedSources,
    targetQuestions: targets.map((t) => t.text),
    competitors,
    analysisId,
    profileId: analysis.profile_id,
  });

  const proofCount = (profile?.proof_points?.length ?? 0) + answeredFacts.length;

  return {
    analysis,
    profile,
    competitors,
    targets,
    brandName: profile?.brand_name ?? analysis.url,
    needsFactFinding: contentWebSearchEnabled && proofCount < minProofPointsForConcreteContent,
    baseInput: buildContentInput({
      analysis,
      profile,
      topicResearch,
      existingPage,
      competitors,
      rec: recommendation,
      targets,
      winningAnswers,
      sourceBlock: sources.block,
      answeredFacts,
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

/**
 * Legt vast welke gemiste vragen deze pagina moet winnen (optimalisatie.md 4.1).
 *
 * Delete-then-insert zodat een herschreven versie geen dubbele rijen oplevert.
 * Dit is de spil van de fase: zonder deze koppeling is achteraf niet te zeggen
 * of een pagina iets uithaalde, en kan fase 5 (effect meten) niet bestaan.
 */
async function saveTargets(
  admin: ReturnType<typeof createAdminClient>,
  contentPieceId: string,
  targets: RecommendationTarget[],
): Promise<void> {
  await admin.from("content_piece_targets").delete().eq("content_piece_id", contentPieceId);
  if (targets.length === 0) return;

  const rows = targets.map((t) => ({
    content_piece_id: contentPieceId,
    prompt_id: t.promptId,
    tracking_run_id: t.runId,
    prompt_text: t.text,
    cluster: t.cluster,
  }));
  const { error } = await admin.from("content_piece_targets").insert(rows);
  if (error) console.warn(`Doelvragen koppelen mislukt voor pagina ${contentPieceId}: ${error.message}`);
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
 * Daarom twee taken. Deze stap schrijft en beoordeelt, en zet het resultaat hoe
 * dan ook in de database — als 'draft' wanneer er nog een herschrijfronde volgt,
 * als 'ready' wanneer de eerste versie al door de poort komt.
 */
export async function draftContentPiece(args: {
  analysisId: string;
  userId: string;
  reportId: string | null;
  recommendation: RecommendationInput;
  /**
   * Opnieuw genereren, ook al staat er al een afgeronde versie (optimalisatie.md 4.7).
   * De bestaande versie blijft bewaard; dit wordt versie n+1.
   */
  regenerate?: boolean;
}): Promise<DraftResult> {
  const { analysisId, userId, reportId, recommendation, regenerate = false } = args;
  const admin = createAdminClient();

  // ── Bestaat er al een versie? (optimalisatie.md 4.7) ──────────────────────
  // De idempotentie zat op de titel en blokkeerde opnieuw genereren volledig:
  // een pagina met "check nodig" liep dood. Nu is de huidige versie het
  // aanknopingspunt — hervatten bij een draft, of een nieuwe versie beginnen.
  //
  // Via dezelfde helper als de inplanroute (lib/jobs/content-jobs.ts). Stond
  // hier als een eigen query ZONDER `order`/`limit`, terwijl de helper daar
  // juist voor bestaat: met meerdere versies onder één titel geeft
  // `maybeSingle()` een fout, en die werd hier niet uitgelezen — dan leek er
  // geen huidige versie te zijn en kwam er een duplicaat bij.
  const current = await currentPiece(admin, analysisId, recommendation.title);

  if (current && current.status !== "draft" && !regenerate) {
    return { contentPieceId: current.id, needsRevise: false, issues: [] };
  }

  // Hervatten mag alleen op een draft van dezelfde poging; bij een expliciete
  // herstart schrijven we een nieuwe rij zodat het oude werk bewaard blijft.
  const resumeId = current && current.status === "draft" && !regenerate ? current.id : null;
  const nextVersion = resumeId ? current!.version : (current?.version ?? 0) + 1;

  const ctx = await loadContentContext(admin, analysisId, userId, recommendation);
  const { analysis, targets, baseInput, brandName } = ctx;

  // ── Draft (premium model) ────────────────────────────────────────────────
  const draft = await callStructured({
    model: MODELS.content,
    // Vangnet bij een dunne feitenlijst (4.6): dan mag hij marktfeiten opzoeken.
    system: ctx.needsFactFinding ? CONTENT_SYSTEM + FACT_FINDING_ADDENDUM : CONTENT_SYSTEM,
    user: baseInput,
    schema: ContentPiece,
    schemaName: "content_piece",
    webSearch: ctx.needsFactFinding,
    temperature: TEMPERATURES.content,
    meta: { kind: "content_draft", analysisId, profileId: analysis.profile_id },
  });

  // ── Redactie/kritiek (goedkoop model) ────────────────────────────────────
  const critique = await callStructured({
    model: MODELS.quality,
    system: CRITIQUE_SYSTEM,
    user: buildCritiqueInput(draft.parsed, recommendation, targets, brandName),
    schema: Critique,
    schemaName: "content_critique",
    webSearch: false,
    temperature: TEMPERATURES.deterministic,
    meta: { kind: "content_critique", analysisId, profileId: analysis.profile_id },
  });

  const geo = critique.parsed.geo;
  const geo_score = geoScore(geo);
  // De GEO-tekortkomingen worden gewone verbeterpunten: de herschrijfronde weet
  // dan precies wát er moet veranderen in plaats van "beter maken".
  const issues = [...critique.parsed.issues, ...geoIssues(geo)];

  const needsRevise =
    !critique.parsed.followsRules ||
    critique.parsed.qualityScore < REVIEW_THRESHOLD ||
    geo_score < GEO_THRESHOLD ||
    issues.length > 0;

  const action = recommendation.action ?? "nieuw";
  const row = {
    analysis_id: analysisId,
    report_id: reportId,
    type: recommendation.type,
    // ⚠️ De titel van de AANBEVELING, niet die van het model. Het model mag zijn
    // eigen titel voorstellen (hij staat in raw_json), maar de hele app zoekt
    // deze pagina op de titel uit het rapport: de poll-route van de knop, de
    // "al gegenereerd"-markering op het rapportscherm, en de dedupe-sleutel van
    // de schrijftaak. Wijkt de opgeslagen titel daarvan af, dan vindt geen van
    // die drie de pagina nog — de knop blijft eeuwig "bezig", de teller loopt
    // niet terug, en elke volgende klik maakt een duplicaat met volle
    // gpt-4.1-kosten. Eén bron van waarheid, en dat is het rapport.
    title: recommendation.title,
    target_intent: draft.parsed.targetIntent,
    cluster: draft.parsed.cluster,
    body_markdown: draft.parsed.bodyMarkdown,
    meta_title: draft.parsed.metaTitle,
    meta_description: draft.parsed.metaDescription,
    schema_jsonld: validateOrRebuildJsonLd(draft.parsed.schemaJsonLd, {
      type: recommendation.type,
      title: recommendation.title,
      description: draft.parsed.metaDescription,
      url: analysis.url,
      faq: draft.parsed.faq,
    }),
    faq_json: draft.parsed.faq as never,
    raw_json: draft.raw as never,
    critique_raw_json: [critique.raw] as never,
    quality_score: critique.parsed.qualityScore,
    geo_score,
    geo_json: geo as never,
    // Wat er nog aan schort, in gewone taal (4.13). Stond alleen in de ruwe
    // API-respons, en die laat je een klant niet lezen.
    review_notes: issues,
    // Komt de eerste versie al door de poort, dan is dit meteen de eindstand.
    needs_review: needsRevise ? true : !critique.parsed.followsRules,
    status: needsRevise ? ("draft" as const) : ("ready" as const),
    word_count: countWords(draft.parsed.bodyMarkdown),
    action,
    existing_url: recommendation.existingUrl ?? null,
    version: nextVersion,
    is_current: true,
    supersedes_id: resumeId ? null : (current?.id ?? null),
    revision_note: recommendation.revisionNote ?? null,
  };

  let contentPieceId: string | undefined;
  if (resumeId) {
    const { data, error } = await admin
      .from("content_pieces")
      .update(row)
      .eq("id", resumeId)
      .select("id")
      .single();
    if (error) throw new Error(`Opslaan van de gegenereerde pagina mislukt: ${error.message}`);
    contentPieceId = data?.id as string | undefined;
  } else {
    // De oude versie EERST afvlaggen, dan pas de nieuwe invoegen. Migratie 0023
    // dwingt af dat er maar één huidige versie per (analyse, titel) bestaat —
    // precies om de duplicaten te voorkomen die eerder ontstonden — en dus zou
    // invoegen-vóór-afvlaggen op die index botsen.
    //
    // Wat het oude commentaar hier terecht wilde beschermen (de klant mag nooit
    // zonder huidige pagina komen te staan als het invoegen stukloopt) doen we
    // nu expliciet: bij een mislukking zetten we de vlag terug.
    if (current) {
      await admin.from("content_pieces").update({ is_current: false }).eq("id", current.id);
    }

    const { data, error } = await admin.from("content_pieces").insert(row).select("id").single();
    if (error || !data) {
      if (current) {
        await admin.from("content_pieces").update({ is_current: true }).eq("id", current.id);
      }
      throw new Error(
        `Opslaan van de gegenereerde pagina mislukt: ${error?.message ?? "geen rij teruggekregen"}`,
      );
    }
    contentPieceId = data.id as string;
  }

  if (!contentPieceId) throw new Error("Opslaan van de gegenereerde pagina mislukt.");

  await saveTargets(admin, contentPieceId, targets);

  return { contentPieceId, needsRevise, issues };
}

/**
 * ── STAP 2 — herschrijven + herbeoordelen ───────────────────────────────────
 *
 * Verwerkt de verbeterpunten uit stap 1 (en eventueel wat de klant zelf vroeg)
 * en bepaalt de eindscore. Faalt deze stap definitief, dan blijft de draft uit
 * stap 1 staan in plaats van dat het schrijfwerk verloren gaat.
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

  const ctx = await loadContentContext(admin, analysisId, userId, recommendation);
  const { analysis, targets, baseInput, brandName } = ctx;
  const draftPiece = pieceFromRow(pieceRow as ContentPieceRow);

  const revised = await callStructured({
    model: MODELS.content,
    system: ctx.needsFactFinding ? CONTENT_SYSTEM + FACT_FINDING_ADDENDUM : CONTENT_SYSTEM,
    user: buildReviseInput(baseInput, draftPiece, issues, recommendation.revisionNote),
    schema: ContentPiece,
    schemaName: "content_piece",
    webSearch: ctx.needsFactFinding,
    temperature: TEMPERATURES.content,
    meta: { kind: "content_revise", analysisId, profileId: analysis.profile_id },
  });

  // Herbeoordelen geeft een eerlijke eindscore voor de kwaliteitspoort.
  const critique = await callStructured({
    model: MODELS.quality,
    system: CRITIQUE_SYSTEM,
    user: buildCritiqueInput(revised.parsed, recommendation, targets, brandName),
    schema: Critique,
    schemaName: "content_critique",
    webSearch: false,
    temperature: TEMPERATURES.deterministic,
    meta: { kind: "content_critique", analysisId, profileId: analysis.profile_id },
  });

  const final = revised.parsed;
  const geo = critique.parsed.geo;
  const geo_score = geoScore(geo);
  const needsReview =
    !critique.parsed.followsRules ||
    critique.parsed.qualityScore < REVIEW_THRESHOLD ||
    geo_score < GEO_THRESHOLD;

  // Ruwe kritiek van BEIDE rondes bewaren (§5: we bewaren alles).
  const previousCritiques = Array.isArray(pieceRow.critique_raw_json) ? pieceRow.critique_raw_json : [];

  await admin
    .from("content_pieces")
    .update({
      // `title` bewust NIET bijwerken: de titel uit het rapport is de sleutel
      // waarop de rest van de app deze pagina terugvindt (zie de toelichting bij
      // het invoegen in draftContentPiece). De herschrijfronde mag de inhoud
      // veranderen, niet waar de pagina heet.
      target_intent: final.targetIntent,
      cluster: final.cluster,
      body_markdown: final.bodyMarkdown,
      meta_title: final.metaTitle,
      meta_description: final.metaDescription,
      schema_jsonld: validateOrRebuildJsonLd(final.schemaJsonLd, {
        type: recommendation.type,
        title: recommendation.title,
        description: final.metaDescription,
        url: analysis.url,
        faq: final.faq,
      }),
      faq_json: final.faq as never,
      raw_json: revised.raw as never,
      critique_raw_json: [...previousCritiques, critique.raw] as never,
      quality_score: critique.parsed.qualityScore,
      geo_score,
      geo_json: geo as never,
      review_notes: needsReview ? [...critique.parsed.issues, ...geoIssues(geo)] : [],
      needs_review: needsReview,
      status: "ready" as const,
      word_count: countWords(final.bodyMarkdown),
    })
    .eq("id", contentPieceId);

  // De titel kan in de herschrijfronde veranderd zijn; de koppeling met de
  // doelvragen moet blijven staan.
  await saveTargets(admin, contentPieceId, targets);
}
