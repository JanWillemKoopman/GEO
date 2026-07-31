import "server-only";

/**
 * De contentbriefing — de vragenronde vóór het schrijven
 * (contentbriefing.md, implementatieplan.md R5.1).
 *
 * Deze stap zit tussen "de klant kiest welke pagina's geschreven worden" en "de
 * app schrijft ze". Hij doet drie dingen:
 *
 *   1. de FEITENINDEX opbouwen — alles wat we met bron over deze klant weten
 *   2. de CLAIM-AUDIT draaien — welke beweringen heeft de pagina nodig, en welke
 *      daarvan kunnen we niet onderbouwen?
 *   3. van elk gat een VRAAG maken, ontdubbeld over de gekozen pagina's
 *
 * Daarna stopt de pijplijn bewust en wacht op de klant — precies het patroon van
 * de review-gate tussen halte 2 en 3 (abcplan.md §3.6), toegepast op FASE C.
 *
 * ── WAAROM DIT DE BELANGRIJKSTE STAP VAN FASE C IS ──────────────────────────
 *
 * Niet vanwege de verzinsels alleen. De klant heeft interne kennis die nergens op
 * zijn site staat en die voor een AI-assistent dus onzichtbaar is: precieze
 * voorwaarden, aantallen, waarom klanten écht voor hem kiezen. Dat is exact het
 * materiaal waarmee zijn content zich onderscheidt van de generieke vergelijkers
 * die nu wél genoemd worden. De vragenronde is niet alleen een rem op
 * verzinsels; het is de belangrijkste bron van onderscheidend vermogen die we
 * hebben.
 *
 * Eén AI-aanroep per BATCH (mini, geen web_search): ongeveer $0,002, ongeacht
 * hoeveel pagina's de klant koos.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { callStructured } from "@/lib/openai/structured";
import { MODELS, TEMPERATURES } from "@/lib/openai/models";
import { ClaimAudit } from "@/lib/schemas/claim-audit";
import { buildFactBase } from "@/lib/pipeline/factbase";
import { formatFactCard, isSupported, claimKey, type FactItem } from "@/lib/pipeline/factcard";
import {
  selectBriefingQuestions,
  slotQuestions,
  MAX_QUESTIONS,
  type BriefingQuestion,
} from "@/lib/pipeline/briefing-select";
import { redactCompetitors } from "@/lib/pipeline/redact";
import type { RecommendationPayload } from "@/lib/jobs/types";
import type { ContentType } from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Hoeveel van het winnende AI-antwoord er per doelvraag meegaat.
 *
 * Dit voedt de meest waardevolle vraagsoort — 'onderscheid' (contentbriefing.md
 * §5). We laten het model letterlijk zien wat de AI nu over de winnende partij
 * zegt, zodat het kan vragen: wat is jouw antwoord daarop? Dat is de enige
 * informatie die principieel niet uit een crawl te halen is.
 */
const ANSWER_EXCERPT_CHARS = 700;

const AUDIT_SYSTEM =
  "Je bent een kritische redacteur die vóór het schrijven controleert of een pagina waargemaakt " +
  "kan worden. Je schrijft GEEN tekst. " +
  "Je krijgt: (a) welke pagina's geschreven gaan worden en welke vraag elke pagina moet winnen, " +
  "(b) wat een AI-assistent nu antwoordt op die vragen, en (c) een FEITENKAART met alles wat we " +
  "met bron over dit bedrijf weten. " +
  "OPDRACHT: noem de concrete BEWERINGEN die deze pagina's moeten doen om hun vraag geloofwaardig " +
  "te beantwoorden. Per bewering: wordt hij gedekt door een feit op de kaart (geef dan het " +
  "F-nummer), of niet? " +
  "HARDE REGELS: " +
  "(1) Verzin GEEN beweringen die je aannemelijk vindt — noem alleen wat de pagina echt nodig heeft. " +
  "(2) Markeer een bewering ALLEEN als gedekt wanneer je een concreet F-nummer kunt noemen dat hem " +
  "echt dekt. Bij twijfel: niet gedekt. Een vraag te veel stellen kost de klant dertig seconden; " +
  "een verzonnen feit kost hem zijn geloofwaardigheid. " +
  "(3) Een feit onder 'MAG JE NIET BEWEREN' dekt niets — het verbiedt juist. " +
  "(4) Voor elke ONGEDEKTE bewering formuleer je de vraag die het gat dicht. Die vraag moet in " +
  "maximaal 30 seconden te beantwoorden zijn zonder iets op te zoeken, en gaat over ÉÉN feit. " +
  "Niet 'welke voorwaarden en opties biedt u?' maar 'zit pechhulp in het maandbedrag?'. " +
  "(5) Schrijf de vraag en de reden in gewone taal, gericht aan de ondernemer. Geen jargon, geen " +
  "verwijzing naar 'de analyse' of 'de doelvraag'. " +
  "(6) Heb je uit de gegeven informatie een waarschijnlijk antwoord, zet dat dan in suggestedAnswer " +
  "en maak er een verificatievraag van. Bevestigen is voor de klant veel goedkoper dan formuleren. " +
  "(7) importance 'kern' betekent: zonder dit feit kan de pagina zijn vraag niet eerlijk " +
  "beantwoorden. Wees streng — als alles kern is, is niets het.";

/** De doelvragen en het winnende antwoord per gekozen pagina. */
async function buildPageBlocks(
  admin: Admin,
  recommendations: RecommendationPayload[],
  pieceIds: string[],
  competitors: string[],
): Promise<string> {
  const runIds = recommendations
    .flatMap((rec) => rec.targets ?? [])
    .map((t) => t.runId)
    .filter((id): id is string => Boolean(id));

  const antwoordPerRun = new Map<string, string>();
  if (runIds.length > 0) {
    const { data } = await admin
      .from("tracking_runs")
      .select("id, raw_response")
      .in("id", Array.from(new Set(runIds)));
    for (const row of data ?? []) {
      antwoordPerRun.set(row.id as string, (row.raw_response as string | null) ?? "");
    }
  }

  return recommendations
    .map((rec, i) => {
      const targets = rec.targets ?? [];
      const doelvragen = targets.length
        ? targets.map((t) => `    - "${t.text}"`).join("\n")
        : "    (geen concrete doelvraag meegegeven)";

      // Concurrentnamen eruit: dit voedt straks een vraag aan de klant, en de
      // harde regel dat klantcontent nooit een concurrent noemt geldt ook voor
      // wat we de klant voorschotelen (optimalisatie.md 4.3).
      const winnend = targets
        .map((t) => (t.runId ? antwoordPerRun.get(t.runId) : null))
        .filter((a): a is string => Boolean(a?.trim()))
        .slice(0, 2)
        .map((a) => redactCompetitors(a, competitors).slice(0, ANSWER_EXCERPT_CHARS))
        .join("\n    ---\n");

      return [
        `PAGINA ${i + 1} [id: ${pieceIds[i]}] — "${rec.title}" (type: ${rec.type})`,
        `  Doel: ${rec.targetIntent || "onbekend"}`,
        `  Achtergrond: ${rec.why || "onbekend"}`,
        `  Moet deze vragen gaan winnen:`,
        doelvragen,
        winnend ? `  Wat een AI-assistent nu antwoordt (concurrentnamen weggehaald):\n    """${winnend}"""` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

/**
 * Maakt de placeholder-rijen aan: gekozen, nog niet geschreven.
 *
 * Deze rijen zijn wat de Content Bibliotheek toont als "wacht op jouw input", en
 * hun id's zijn waar de vragen aan hangen (`fact_requests.content_piece_ids`).
 * Bestaat er al een rij met deze titel die nog niet geschreven is, dan wordt die
 * hergebruikt — twee keer op "genereer" drukken mag geen twee pagina's opleveren.
 */
async function ensureBriefingPieces(
  admin: Admin,
  analysisId: string,
  recommendations: RecommendationPayload[],
): Promise<string[]> {
  const ids: string[] = [];

  for (const rec of recommendations) {
    const { data: bestaand } = await admin
      .from("content_pieces")
      .select("id, status, version")
      .eq("analysis_id", analysisId)
      .eq("title", rec.title)
      .eq("is_current", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bestaand && (bestaand.status === "briefing" || bestaand.status === "draft")) {
      ids.push(bestaand.id as string);
      continue;
    }

    const { data: nieuw, error } = await admin
      .from("content_pieces")
      .insert({
        analysis_id: analysisId,
        report_id: rec.reportId,
        type: rec.type,
        title: rec.title,
        // De oorspronkelijke opdracht uit het rapport, apart van de titel. Bij
        // Udenhout waren titels instructies ("Maak een overzichtelijke pagina
        // met…") in plaats van koppen; door ze te scheiden kan het briefingscherm
        // de titel als bevestigingsvraag tonen zonder de opdracht kwijt te raken.
        brief_instruction: rec.why || null,
        action: rec.action,
        existing_url: rec.existingUrl,
        status: "briefing" as const,
        version: bestaand ? (bestaand.version as number) + 1 : 1,
        is_current: true,
        needs_review: false,
      })
      .select("id")
      .single();

    if (error || !nieuw) throw new Error(`Briefing-rij aanmaken mislukt: ${error?.message}`);
    if (bestaand) {
      await admin.from("content_pieces").update({ is_current: false }).eq("id", bestaand.id as string);
    }
    ids.push(nieuw.id as string);
  }

  return ids;
}

/** Claim-sleutels die we al kennen: beantwoord, of al als open vraag klaar. */
async function loadKnownClaimKeys(
  admin: Admin,
  profileId: string,
  analysisId: string,
): Promise<Set<string>> {
  const { data } = await admin
    .from("fact_requests")
    .select("claim_key, status, scope, analysis_id")
    .eq("profile_id", profileId)
    .not("claim_key", "is", null);

  const bekend = new Set<string>();
  for (const row of data ?? []) {
    const status = row.status as string;
    // 'verlopen' hoort er NIET bij: een verlopen feit moet juist opnieuw
    // bevestigd worden (contentbriefing.md §7).
    if (status !== "open" && status !== "beantwoord" && status !== "overgeslagen") continue;
    const scope = row.scope as string;
    if (scope !== "merk" && row.analysis_id !== analysisId) continue;
    bekend.add(row.claim_key as string);
  }
  return bekend;
}

export interface BriefingResult {
  contentPieceIds: string[];
  /** Aantal nieuw gestelde vragen. 0 = alles al bekend, er valt niets te vragen. */
  questions: number;
  facts: number;
}

/**
 * Draait de briefing voor één batch gekozen pagina's.
 *
 * Idempotent: bestaande briefing-rijen worden hergebruikt en vragen die al
 * gesteld zijn worden niet opnieuw gesteld. Een mislukte poging kan dus gewoon
 * opnieuw — dat is wat de wachtrij doet.
 */
export async function runBriefing(args: {
  analysisId: string;
  recommendations: RecommendationPayload[];
}): Promise<BriefingResult> {
  const { analysisId, recommendations } = args;
  const admin = createAdminClient();

  const { data: analysis } = await admin
    .from("analyses")
    .select("id, profile_id, url, topic")
    .eq("id", analysisId)
    .single();
  if (!analysis) throw new Error(`Analyse ${analysisId} bestaat niet.`);
  const profileId = analysis.profile_id as string;

  const pieceIds = await ensureBriefingPieces(admin, analysisId, recommendations);

  // ── 1. De feitenindex (geen AI-aanroep) ──────────────────────────────────
  const facts = await buildFactBase(admin, profileId, analysisId);

  const { data: profile } = await admin
    .from("profiles")
    .select("brand_name, industry")
    .eq("id", profileId)
    .maybeSingle();
  const { data: topic } = await admin
    .from("topic_research")
    .select("competitors")
    .eq("analysis_id", analysisId)
    .maybeSingle();
  const competitors = ((topic?.competitors as string[] | null) ?? []).filter(Boolean);

  const pageBlocks = await buildPageBlocks(admin, recommendations, pieceIds, competitors);

  // ── 2. De claim-audit (één mini-aanroep voor de hele batch) ───────────────
  const auditInput = [
    `Bedrijf: ${(profile?.brand_name as string | null) ?? analysis.url}`,
    `Branche: ${(profile?.industry as string | null) ?? "onbekend"}`,
    `Onderwerp van deze analyse: ${analysis.topic as string}`,
    "",
    pageBlocks,
    "",
    formatFactCard(facts),
  ].join("\n");

  const audit = await callStructured({
    model: MODELS.quality,
    system: AUDIT_SYSTEM,
    user: auditInput,
    schema: ClaimAudit,
    schemaName: "claim_audit",
    webSearch: false,
    temperature: TEMPERATURES.deterministic,
    meta: { kind: "claim_audit", analysisId, profileId },
  });

  // ── 3. Dekking in CODE bepalen, niet door het model ───────────────────────
  //
  // Het model mag zichzelf niet vrijpleiten (contentbriefing.md §3.2). Zegt het
  // `supported: true` maar wijst `sourceRef` nergens naar op de kaart, dan is de
  // claim onbewezen — anders verdwijnt juist de vraag die het gat moest dichten.
  const ongedekt = audit.parsed.claims.filter(
    (c) => !isSupported(c.sourceRef, facts) && Boolean(c.questionIfMissing?.trim()),
  );
  const zelfverklaard = audit.parsed.claims.filter(
    (c) => c.supported && !isSupported(c.sourceRef, facts),
  ).length;
  if (zelfverklaard > 0) {
    console.log(
      `Briefing ${analysisId}: ${zelfverklaard} van de ${audit.parsed.claims.length} beweringen ` +
        `noemde zichzelf onderbouwd zonder geldig F-nummer; die tellen als onbewezen.`,
    );
  }

  // ── 4. Van gaten naar vragen ─────────────────────────────────────────────
  //
  // Alle gekozen pagina's krijgen elke ongedekte claim toebedeeld die uit hun
  // doelvraag voortkomt. Het model geeft niet betrouwbaar terug bij wélke pagina
  // een claim hoort, dus koppelen we op de pagina waarvan de doelvraag in
  // `neededFor` genoemd wordt — en anders aan alle pagina's, want dan raakt het
  // de hele batch.
  const paginaVanClaim = (neededFor: string): string[] => {
    const treffers = recommendations
      .map((rec, i) => ({ rec, id: pieceIds[i] }))
      .filter(({ rec }) =>
        (rec.targets ?? []).some((t) => neededFor.toLowerCase().includes(t.text.toLowerCase().slice(0, 30))),
      )
      .map(({ id }) => id);
    return treffers.length > 0 ? treffers : pieceIds;
  };

  const kandidaten: BriefingQuestion[] = ongedekt.map((c) => ({
    claimKey: claimKey(c.claim),
    question: c.questionIfMissing!.trim(),
    reason: c.reason,
    kind: c.kind,
    answerType: c.answerType,
    options: c.options,
    suggestedAnswer: c.suggestedAnswer,
    required: c.importance === "kern",
    scope: c.scope,
    contentPieceIds: paginaVanClaim(c.neededFor),
    priority: c.importance === "kern" ? 2 : 1,
  }));

  // De vaste slots per type erbij (contentbriefing.md §3.3).
  for (const [i, rec] of recommendations.entries()) {
    kandidaten.push(...slotQuestions(rec.type as ContentType, pieceIds[i], rec.existingUrl));
  }

  const bekend = await loadKnownClaimKeys(admin, profileId, analysisId);
  const gekozen = selectBriefingQuestions({ candidates: kandidaten, alreadyKnown: bekend });

  if (kandidaten.length > gekozen.length + bekend.size) {
    console.log(
      `Briefing ${analysisId}: ${kandidaten.length} kandidaatvragen teruggebracht tot ` +
        `${gekozen.length} (grens ${MAX_QUESTIONS}). De rest komt bij een volgende batch terug.`,
    );
  }

  // ── 5. Wegschrijven ──────────────────────────────────────────────────────
  //
  // Eén voor één en fouttolerant: de unieke index op (analyse, claim_key) is
  // PARTIEEL (alleen status 'open'), dus `.upsert(..., { onConflict })` kan hem
  // niet als doel gebruiken — Postgres eist daar dezelfde WHERE-clausule. Botst
  // hij toch, dan staat de vraag er al en is er niets aan de hand.
  let geschreven = 0;
  for (const vraag of gekozen) {
    const { error } = await admin.from("fact_requests").insert({
      profile_id: profileId,
      analysis_id: vraag.scope === "merk" ? null : analysisId,
      question: vraag.question,
      reason: vraag.reason,
      status: "open",
      scope: vraag.scope,
      content_piece_ids: vraag.contentPieceIds,
      kind: vraag.kind,
      answer_type: vraag.answerType,
      options: vraag.options,
      suggested_answer: vraag.suggestedAnswer,
      required: vraag.required,
      claim_key: vraag.claimKey,
      raw_json: audit.raw as never,
    });
    if (!error) geschreven++;
    else if (!error.message.includes("duplicate key")) {
      console.warn(`Briefingvraag opslaan mislukt (${vraag.claimKey}): ${error.message}`);
    }
  }

  // De feitenkaart bevriezen op de gekozen pagina's, net als prompt_text_snapshot
  // (abcplan.md §5): wijzigt de klant later een feit, dan blijft achterhaalbaar
  // op basis waarvan de bestaande pagina destijds geschreven is.
  //
  // De AANBEVELING gaat mee in dezelfde snapshot, en dat is geen bijvangst: de
  // doelvragen (welke gemiste vraag deze pagina moet winnen, R4.1) zitten niet
  // in de kolommen van content_pieces. Zonder ze hier te bewaren zou de
  // schrijftaak die de klant straks start ze kwijt zijn, en dan schrijft de app
  // weer een pagina zonder te weten welke vraag hij moet winnen — precies het
  // gat dat fase 4 dichtte.
  for (const [i, pieceId] of pieceIds.entries()) {
    await admin
      .from("content_pieces")
      .update({
        briefing_snapshot_json: {
          facts,
          recommendation: recommendations[i],
          generatedAt: new Date().toISOString(),
        } as never,
      })
      .eq("id", pieceId);
  }

  return { contentPieceIds: pieceIds, questions: geschreven, facts: facts.length };
}

/** De bevroren feitenkaart van een pagina teruglezen (voor het schrijven, R5.3). */
export function factsFromSnapshot(snapshot: unknown): FactItem[] {
  const snap = (snapshot ?? {}) as { facts?: unknown };
  if (!Array.isArray(snap.facts)) return [];
  return snap.facts.filter(
    (f): f is FactItem =>
      Boolean(f) && typeof (f as FactItem).ref === "string" && typeof (f as FactItem).text === "string",
  );
}

/**
 * De bevroren aanbeveling teruglezen — inclusief de doelvragen.
 *
 * Geeft null als de snapshot er niet is (een pagina van vóór R5.1, of een
 * briefing die halverwege strandde). De aanroeper valt dan terug op de kolommen
 * van de rij zelf; dat levert een pagina zonder doelvragen op, wat minder goed
 * is maar niet kapot.
 */
export function recommendationFromSnapshot(snapshot: unknown): RecommendationPayload | null {
  const snap = (snapshot ?? {}) as { recommendation?: unknown };
  const rec = snap.recommendation as RecommendationPayload | undefined;
  return rec && typeof rec.title === "string" ? rec : null;
}
