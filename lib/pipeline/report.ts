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
import { NEUTRAL_WEIGHT } from "@/lib/pipeline/prompt-weight";
import { resolveTargets } from "@/lib/pipeline/recommendation";
import { buildEvidenceDossier, loadBrandsByRun, loadKnownBrandNames } from "@/lib/pipeline/evidence";
import { formatEvidenceDossier, type EvidenceEntry } from "@/lib/pipeline/evidence-format";
import { validateField, type StrippedClaim } from "@/lib/pipeline/validate-claims";
import { computePeriodChange, buildChangeBlock, isWorthEmailing } from "@/lib/pipeline/period-change";
import { sendReportEmail } from "@/lib/email/report-email";
import { emailsEnabled } from "@/lib/env";
import { enqueue, dedupe } from "@/lib/jobs/queue";
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
  "waardevolste kansen. Werk uitsluitend met de aangeleverde cijfers — verzin niets. " +
  // R1.2 — het model VERWOORDT het bewijsdossier, het leidt niets af. Zonder deze
  // regel koppelde het concurrenten aan vragen waarin ze niet voorkwamen.
  "BEWIJSREGEL: het bewijsdossier vermeldt per vraag welke bedrijven in dát antwoord genoemd werden. " +
  "Noem een concurrent alleen bij een specifieke vraag als die naam ONDER DIE VRAAG in het dossier " +
  "staat. Staat er dat er geen enkel bedrijf genoemd werd, dan is dat je bevinding — haal er geen " +
  "concurrent bij uit een andere vraag of uit het marktbeeld. Antwoord in het Nederlands.";

const REPORT_SYSTEM =
  "Je schrijft een kort, jargonvrij rapport voor een ondernemer zonder SEO-achtergrond over hun " +
  "zichtbaarheid in AI-assistenten (GEO). Gebruik geen vaktermen als 'share of voice' — leg uit in " +
  "gewone taal. " +
  // R1.2 — zie GAP_SYSTEM. Dit ving eerder "noem in elk probleem expliciet welke
  // concurrent het betreft", wat het model dwong een naam te noemen óók als het
  // dossier er geen gaf — precies de aanleiding om er dan maar een te verzinnen.
  "BEWIJSREGEL: noem een concurrent alleen bij een specifieke vraag als die naam ONDER DIE VRAAG in " +
  "het bewijsdossier staat. Staat er dat er geen enkel bedrijf genoemd werd, schrijf dan dat de AI bij " +
  "die vraag geen enkele aanbieder noemt — dat is een kans om de eerste te zijn, niet een concurrent " +
  "die wint. Het marktbeeld onderaan gaat over de hele meting en mag NOOIT gebruikt worden om te " +
  "zeggen wie een specifieke vraag wint. PRIORITEER je aanbevelingen " +
  "op de zwaarwegende vragen (populair en/of koopklaar) waar de klant slecht scoort — die leveren het " +
  "meeste op. Eindig met concrete, uitvoerbare aanbevelingen. Bepaal per aanbeveling of dit een BESTAANDE " +
  "pagina van de klant verbetert (kies dan de meest relevante URL uit de meegegeven paginalijst, action = " +
  "\"verbeteren\") of dat er een GEHEEL NIEUWE pagina nodig is (action = \"nieuw\", existingUrl = null) — kies " +
  "alleen \"verbeteren\" als een pagina uit de lijst daadwerkelijk over hetzelfde onderwerp gaat. " +
  // Fase 4: de aanbeveling moet aanwijzen WELKE gemiste vraag hij gaat winnen.
  // Zonder die koppeling weet de schrijver later niet waarvoor hij schrijft, en
  // is achteraf niet te zeggen of de pagina iets uithaalde.
  "Wijs bij ELKE aanbeveling met de codes (V1, V2, …) aan welke gemiste vragen die pagina moet gaan " +
  "winnen — minimaal één, en alleen vragen die inhoudelijk bij die pagina horen. Eén pagina mag " +
  "meerdere verwante vragen bedienen; verdeel de zwaarste vragen over de aanbevelingen en laat geen " +
  "zware vraag onbenoemd. " +
  "Vraag daarnaast in factRequests om CONCRETE FEITEN die je mist en die de content aantoonbaar beter " +
  "zouden maken (bv. 'Hoeveel jaar bestaan jullie?', 'Wat is jullie levertijd?', 'Hoeveel klanten per " +
  "jaar?'). Alleen feiten die een ondernemer uit zijn hoofd weet, en alleen als ze deze pagina's echt " +
  "concreter maken — geen vragenlijst om het vragen. Antwoord in het Nederlands.";

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
export interface MissedPrompt {
  /** Korte code (V1, V2, …) waarmee het rapport deze vraag kan aanwijzen (4.1). */
  code: string;
  promptId: string | null;
  /** De meting die aantoont dát deze vraag gemist werd — het bewijs. */
  runId: string;
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
      ? ` — GEWOGEN naar volumeband × koopwaarde: ${score.weighted_score}/100`
      : "";
  const sov =
    score?.share_of_voice != null
      ? ` (${score.share_of_voice}% van de vermeldingen, over ${score.share_basis_count ?? "?"} bevestigde merken)`
      : "";

  // De onzekerheid meegeven aan de schrijver (optimalisatie.md 2.2). Zonder dit
  // getal formuleert het model conclusies alsof de score exact is — "jullie
  // zichtbaarheid is 42%" in plaats van "ergens rond de 40%" — en dat is precies
  // de overclaim die het rapport ongeloofwaardig maakt.
  const uncertainty =
    score?.score_stderr != null && score.judged_runs
      ? `\nBETROUWBAARHEID: de score rust op ${score.judged_runs} metingen; de 95%-marge is ` +
        `±${Math.round(1.96 * Number(score.score_stderr))} punten. Presenteer de score dus als een ` +
        `ORDE VAN GROOTTE, niet als een exact cijfer, en trek geen conclusies uit verschillen die ` +
        `binnen die marge vallen.`
      : "";

  return base + weighted + sov + uncertainty;
}

/**
 * Het blok gemiste vragen is vervangen door het BEWIJSDOSSIER
 * (lib/pipeline/evidence.ts, implementatieplan.md R1.1).
 *
 * De oude vorm gaf per vraag alleen code, gewicht, categorie en tekst — géén
 * run-ID. De concurrentiedata eronder had wél run-ID's. Daarmee was de koppeling
 * "welke concurrent wint wélke vraag" nergens gelegd, en dat is precies wat het
 * model moest opschrijven. Het gokte dus, en schreef concurrenten bij vragen
 * waarin ze niet voorkwamen (kwaliteitsanalyse-5-testcases.md §2.2).
 *
 * Het dossier levert die koppeling kant-en-klaar aan, uit de database.
 */

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
  dossier: EvidenceEntry[],
): string {
  const lines = [
    `Eigen merk: ${ownLabel(analysis, profile)}`,
    `Branche: ${profile?.industry ?? "onbekend"}`,
    ...briefLine(analysis),
    ...(topicResearch?.content_summary
      ? [`Wat de website al zegt over dit onderwerp: ${topicResearch.content_summary}`]
      : []),
    scoreLine(score),
    formatEvidenceDossier(dossier),
    "",
    // Bewust ná het dossier, en met een expliciet label: dit zijn totalen over de
    // hele meting. Zonder dat onderscheid leest het model deze cijfers als
    // uitspraken over de vragen hierboven, en dat is precies de verwarring waar
    // het dossier een eind aan maakt.
    "MARKTBEELD over de HELE meting (niet per vraag — gebruik dit alleen voor algemene " +
      "uitspraken over de markt, nooit om te zeggen wie een specifieke vraag wint):",
  ];
  if (competitors.length === 0) {
    lines.push("(geen concurrentiedata beschikbaar)");
  }
  for (const c of competitors) {
    // Het gedestilleerde "waarom" (R4.2) staat vooraan: dát is wat de klant wil
    // weten en waar de aanbeveling op moet sturen. De ruwe cijfers erachter.
    const waarom = c.why_summary ? ` WAAROM GENOEMD: ${c.why_summary}` : "";
    const eigenschappen = Array.isArray(c.attributes_json) && c.attributes_json.length > 0
      ? ` Genoemd op: ${(c.attributes_json as { attribute: string }[]).map((a) => a.attribute).join(", ")}.`
      : "";
    lines.push(
      `- ${c.competitor_name}: ${c.mentions_count} vermeldingen` +
        (c.avg_position != null ? `, gemiddelde positie ${c.avg_position}` : "") +
        `.${waarom}${eigenschappen} ` +
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
  dossier: EvidenceEntry[],
  changeBlock: string,
): string {
  return [
    `Eigen merk: ${ownLabel(analysis, profile)}`,
    ...briefLine(analysis),
    scoreLine(score),
    changeBlock,
    formatEvidenceDossier(dossier),
    "",
    "Concurrentie-gap-analyse (JSON):",
    JSON.stringify(gap, null, 2),
    "",
    "Bestaande pagina's op de website van de klant (voor de nieuw/verbeteren-beslissing):",
    buildPagesBlock(pages),
    "",
    "Schrijf op basis hiervan een kort, jargonvrij rapport. Noem in elk gap-item expliciet welke " +
      "concurrent het betreft. PRIORITEER de aanbevelingen op de zwaarwegende gemiste vragen hierboven " +
      "(hoog gewicht = populair en/of koopklaar). Geef 5 tot 8 concrete, geprioriteerde aanbevelingen — " +
      "genoeg om de zwaarste gemiste vragen te dekken, niet zoveel dat het een boodschappenlijst wordt. " +
      "Koppel elke aanbeveling aan de vraagcodes (V1, V2, …) die hij moet winnen.",
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
    .select("id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, prompt_weight, brands_in_answer")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo)
    // Alleen de gewone meting; impact- en controlemetingen (5.3) betreffen een
    // handvol vragen en zouden de lijst gemiste kansen vertekenen.
    .eq("purpose", "periodic");
  const allRuns = runRows ?? [];
  if (allRuns.length === 0) return [];

  // Kansloze vragen eruit (implementatieplan.md R2.3). Waar de AI géén enkele
  // aanbieder noemt, is niet-genoemd-worden geen gemiste kans — er valt niets te
  // winnen. Zulke vragen als contentdoel opvoeren is de duurste fout die het
  // product kan maken: bij Van der Valk was de aanbeveling met prioriteit 1
  // gebouwd op precies zo'n vraag, en die zou als eerste door gpt-4.1 geschreven
  // worden. `null` (nog niet geteld, oude meting) laten we staan — dat is
  // onbekend, geen bewijs van kansloosheid.
  const runs = allRuns.filter((r) => r.brands_in_answer !== 0);
  if (runs.length < allRuns.length) {
    console.log(
      `Analyse ${analysisId} periode ${weekNo}: ${allRuns.length - runs.length} vragen zonder ` +
        `enige genoemde aanbieder tellen niet als gemiste kans.`,
    );
  }
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
        // De code wordt hierna toegekend, ná het sorteren, zodat V1 ook echt de
        // zwaarste gemiste vraag is en de nummering betekenis heeft.
        code: "",
        promptId: (r.prompt_id as string | null) ?? null,
        runId: r.id as string,
        text: r.prompt_text_snapshot as string,
        category: r.prompt_category_snapshot as string,
        weight: Number(r.prompt_weight ?? NEUTRAL_WEIGHT),
        cluster: (tag?.cluster as string | null) ?? null,
        intent_type: (tag?.intent_type as string | null) ?? null,
      };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MISSED_CAP)
    .map((m, i) => ({ ...m, code: `V${i + 1}` }));
}

/**
 * Bewaart de feitenvragen bij het PROFIEL (optimalisatie.md 4.6).
 *
 * Bij het profiel en niet bij de analyse, want "hoeveel jaar bestaan jullie?"
 * is één keer beantwoorden en daarna weten we het voor elke pagina van dit merk.
 * De unieke index op (profile_id, question) zorgt dat een tweede rapport
 * dezelfde vraag niet opnieuw stelt — ook niet als de klant hem al oversloeg.
 */
async function saveFactRequests(
  admin: ReturnType<typeof createAdminClient>,
  analysis: Analysis,
  requests: Report["factRequests"],
): Promise<void> {
  if (!requests || requests.length === 0) return;

  const rows = requests
    .filter((r) => r.question?.trim())
    .slice(0, FACT_REQUEST_CAP)
    .map((r) => ({
      profile_id: analysis.profile_id,
      analysis_id: analysis.id,
      question: r.question.trim(),
      reason: r.reason?.trim() || null,
    }));

  // Botsingen (de vraag stond er al) negeren in plaats van de hele insert laten
  // klappen; het rapport mag niet mislukken op een dubbele feitenvraag.
  const { error } = await admin.from("fact_requests").upsert(rows, {
    onConflict: "profile_id,question",
    ignoreDuplicates: true,
  });
  if (error) console.warn(`Feitenvragen opslaan mislukt voor analyse ${analysis.id}: ${error.message}`);
}

/** Meer dan een handvol vragen is geen uitnodiging meer maar een formulier. */
const FACT_REQUEST_CAP = 6;

/**
 * Toetst de concurrentnamen in het rapport tegen het bewijs
 * (implementatieplan.md R1.3).
 *
 * Per aanbeveling zijn de toegestane namen die uit de antwoorden van háár
 * doelvragen; per gap die uit z'n `evidenceRunIds`. Een naam die daar niet in
 * voorkomt, is een bewering die de meting niet draagt — de zin gaat eruit.
 *
 * Waarom hier en niet in `validate-claims.ts`: die module is bewust puur en
 * testbaar zonder database. Dit is het stukje dat wél de database nodig heeft.
 */
async function validateReportClaims(
  admin: ReturnType<typeof createAdminClient>,
  args: {
    profileId: string;
    recommendations: ReturnType<typeof resolveTargets>;
    gaps: Report["gaps"];
    dossier: EvidenceEntry[];
  },
): Promise<{
  recommendations: ReturnType<typeof resolveTargets>;
  gaps: Report["gaps"];
  stripped: StrippedClaim[];
}> {
  const { profileId, recommendations, gaps, dossier } = args;

  // Alle metingen waar het rapport naar verwijst: de doelvragen van de
  // aanbevelingen plus het bewijs onder de gaps. Die laatste hoeven niet in het
  // dossier te staan (dat is afgekapt op de vijftien zwaarste), dus we halen ze
  // er in één keer bij.
  const referenced = new Set<string>();
  for (const rec of recommendations) {
    for (const t of rec.targets) if (t.runId) referenced.add(t.runId);
  }
  for (const gap of gaps) {
    for (const runId of gap.evidenceRunIds ?? []) if (runId) referenced.add(runId);
  }

  const [knownNames, brandsByRun] = await Promise.all([
    loadKnownBrandNames(admin, profileId),
    loadBrandsByRun(admin, profileId, Array.from(referenced)),
  ]);

  // Het dossier heeft de merken al; die hergebruiken scheelt niets aan queries
  // maar houdt beide bronnen gelijk als een run in allebei zit.
  const namesForRun = (runId: string): string[] => {
    const fromDossier = dossier.find((d) => d.runId === runId);
    if (fromDossier) return fromDossier.brandsInAnswer.map((b) => b.name);
    return (brandsByRun.get(runId) ?? []).map((b) => b.name);
  };

  const stripped: StrippedClaim[] = [];

  const checkedRecommendations = recommendations.map((rec) => {
    const allowed = rec.targets.flatMap((t) => (t.runId ? namesForRun(t.runId) : []));
    const result = validateField(rec.why, {
      knownNames,
      allowedNames: allowed,
      where: `aanbeveling: ${rec.title}`,
    });
    stripped.push(...result.stripped);
    return { ...rec, why: result.text };
  });

  const checkedGaps = gaps.map((gap) => {
    const allowed = (gap.evidenceRunIds ?? []).flatMap((runId) => namesForRun(runId));
    const result = validateField(gap.problem, {
      knownNames,
      allowedNames: allowed,
      where: `gap: ${gap.cluster}`,
    });
    stripped.push(...result.stripped);
    return { ...gap, problem: result.text };
  });

  return { recommendations: checkedRecommendations, gaps: checkedGaps, stripped };
}

export async function generateReport(id: string, weekNo = 0): Promise<AnalysisStatus> {
  const admin = createAdminClient();

  const { data: analysisRow } = await admin.from("analyses").select("*").eq("id", id).single();
  if (!analysisRow) throw new Error(`Analyse ${id} niet gevonden.`);
  const analysis = analysisRow as Analysis;

  // De nulmeting brengt de analyse op 'gemeten'; latere periodes draaien terwijl
  // hij al 'gereed' is. Beide moeten een rapport kunnen opleveren (6.1).
  const eligible =
    analysis.status === "gemeten" || analysis.status === "mislukt" || (weekNo > 0 && analysis.status === "gereed");
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

  // Idempotent PER PERIODE (optimalisatie.md 6.1). Stond hier als "bestaat er
  // al een rapport voor deze analyse" — waardoor er na de nulmeting nooit meer
  // een rapport kwam en twaalf periodes aan meetkosten in het niets verdwenen.
  const { count: existingReport } = await admin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("analysis_id", id)
    .eq("week_no", weekNo);
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

  // Het bewijsdossier: per gemiste vraag welke bedrijven er in DÁT antwoord
  // stonden (implementatieplan.md R1.1). Deterministisch uit de database, zodat
  // het model de koppeling vraag↔concurrent niet hoeft af te leiden — en hem dus
  // ook niet verkeerd kán afleiden.
  const dossier = await buildEvidenceDossier(admin, analysis.profile_id, missed);

  // Wat er veranderd is sinds de vorige periode (optimalisatie.md 6.2). Puur
  // databasewerk: het model hoeft niet zelf twee periodes te vergelijken — dat
  // gaat mis — maar alleen te verwoorden wat er staat.
  const change = await computePeriodChange(admin, id, weekNo);
  const changeBlock = buildChangeBlock(change, weekNo);

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
        dossier,
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
      user: buildReportInput(
        analysis,
        profileTyped,
        score as VisibilityScore | null,
        gap.parsed,
        pages,
        dossier,
        changeBlock,
      ),
      schema: Report,
      schemaName: "report",
      webSearch: false,
      temperature: TEMPERATURES.analytical,
      meta: { kind: "report", analysisId: id, profileId: analysis.profile_id },
    });

    // De vraagcodes (V1, V2, …) omzetten naar echte verwijzingen vóór opslag
    // (optimalisatie.md 4.1). Vanaf hier werkt de rest van de app met prompt- en
    // meting-id's; de codes bestaan alleen binnen deze ene aanroep.
    const enriched = resolveTargets(report.parsed.recommendations, missed);

    // ── Claimvalidatie (implementatieplan.md R1.3) ─────────────────────────
    // Het deterministische vangnet onder R1.1/R1.2: elke concurrentnaam moet
    // voorkomen in het bewijs van de vraag waaraan hij hangt. Wat dat niet
    // haalt, gaat eruit — en wordt bewaard, zodat te zien is of de instructie
    // uit R1.2 streng genoeg is.
    const { recommendations, gaps, stripped } = await validateReportClaims(admin, {
      profileId: analysis.profile_id,
      recommendations: enriched,
      gaps: report.parsed.gaps,
      dossier,
    });
    if (stripped.length > 0) {
      console.warn(
        `Analyse ${id} periode ${weekNo}: ${stripped.length} niet-onderbouwde bewering(en) ` +
          `uit het rapport verwijderd. Zie reports.stripped_claims_json.`,
      );
    }

    const { data: reportRow, error: reportError } = await admin.from("reports").insert({
      analysis_id: id,
      week_no: weekNo,
      period: weekNo === 0 ? "nulmeting" : `periode ${weekNo}`,
      change_json: change as never,
      summary: report.parsed.summary,
      gaps_json: gaps as never,
      recommendations_json: recommendations as never,
      stripped_claims_json: stripped as never,
      gap_analysis_raw_json: gap.raw as never, // volledige ruwe OpenAI-output B1 (§5)
      raw_json: report.raw as never, // volledige ruwe OpenAI-output B2 (§5)
    }).select("id").single();

    // Zonder deze controle liep de code door naar status 'gereed' terwijl er
    // geen rapport in de database stond: de analyse meldde zich klaar, het
    // rapporttabblad bleef leeg en "schrijf alle pagina's" antwoordde dat er nog
    // geen rapport was. Gooien betekent dat de wachtrij het gewoon opnieuw
    // probeert — het dure denkwerk is dan hooguit één keer voor niets geweest.
    if (reportError || !reportRow) {
      throw new Error(
        `Rapport opslaan mislukt voor analyse ${id} (periode ${weekNo}): ` +
          `${reportError?.message ?? "geen rij teruggekregen"}`,
      );
    }

    await saveFactRequests(admin, analysis, report.parsed.factRequests);

    // Off-site scan erachteraan (optimalisatie.md fase 7). Pas nu, want hij
    // leidt het bronnenlandschap af uit de meetdata. Losse taak: faalt hij, dan
    // mist de klant het off-site advies maar houdt hij zijn rapport.
    await enqueue(admin, {
      type: "offsite_scan",
      payload: {},
      analysisId: id,
      dedupeKey: dedupe.offsiteScan(id),
    });

    await admin.from("analyses").update({ status: "gereed" }).eq("id", id);

    // Bericht als het klaar is (optimalisatie.md 1.8). Nu het werk op de
    // achtergrond draait, is de mail vaak het moment waarop de klant het hoort —
    // vandaar dat het een keuze bij het starten is, geen automatisme.
    // Zwijgen als er niets te melden valt (optimalisatie.md 6.7). Een mail die
    // elke periode hetzelfde zegt, wordt na drie keer niet meer geopend — en dan
    // mist de klant ook de mail die er wél toe doet.
    // Staat de mail uit (EMAILS_ENABLED), dan slaan we het hele blok over: geen
    // opzoeken van het e-mailadres, en vooral geen `emailed_at` zetten. Dat veld
    // moet blijven kloppen — anders lijkt er later een mail verstuurd te zijn
    // die er nooit was.
    const worthEmailing = isWorthEmailing(change);
    if (!emailsEnabled()) {
      console.log(`E-mail staat uit (EMAILS_ENABLED) — geen rapport-mail voor analyse ${id}.`);
    } else if (analysis.notify_by_email && worthEmailing) {
      const { data: authUser } = await admin.auth.admin.getUserById(analysis.user_id);
      if (authUser?.user?.email) {
        await sendReportEmail(analysis, authUser.user.email, report.parsed, change).catch((err) =>
          console.error(`Rapport-mail versturen mislukt voor analyse ${id}:`, err),
        );
        await admin
          .from("reports")
          .update({ emailed_at: new Date().toISOString() })
          .eq("id", reportRow.id);
      }
    } else if (!worthEmailing) {
      console.log(`Analyse ${id} periode ${weekNo}: niets betekenisvols veranderd, geen mail verstuurd.`);
    }

    return "gereed";
  } catch (err) {
    await admin.from("analyses").update({ status: "mislukt" }).eq("id", id);
    throw err;
  }
}
