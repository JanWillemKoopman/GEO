import "server-only";

/**
 * Heeft het gewerkt? (optimalisatie.md 5.3/5.4/5.5)
 *
 * Dit is de fase waarin de belofte wordt ingelost, of weerlegd, en dan weten we
 * dat tenminste. Tot nu toe eindigde de keten bij "hier is je tekst".
 *
 * De moeilijkheid zit niet in het meten maar in de UITSPRAAK. "Je score steeg
 * met 18 punten" is geen bewijs dat de pagina werkte: zichtbaarheid beweegt ook
 * vanzelf, en met 30 vragen is de ruis alleen al ±18 punten. Daarom twee dingen:
 *
 *   1. We meten alleen de vragen die bij DEZE pagina horen, vóór en ná.
 *   2. We meten tegelijk een CONTROLEGROEP: even veel vragen waar géén pagina
 *      voor gemaakt is. Steeg alles even hard, dan lag het niet aan de pagina.
 *
 * Die tweede stap kost extra metingen, en dat is hem waard: "op de vragen
 * waarvoor je publiceerde +18, op de rest +3" is een verdedigbare uitspraak.
 * "Je score steeg" is dat niet.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { citeertEigenPagina, compare, deltaOf, IMPACT_WAVES, thresholdOf, verdictOf } from "@/lib/pipeline/impact-math";

type Admin = SupabaseClient;

// `IMPACT_WAVES` staat in `impact-math.ts` (puur), zodat ook de uitleg op het
// klantscherm (`lib/impact-uitleg.ts`) weet hoeveel dagen een golf is.
export { IMPACT_WAVES } from "@/lib/pipeline/impact-math";

/**
 * Hoeveel controlevragen we per golf meebeten, als bovengrens.
 *
 * Even veel als er doelvragen zijn, want een controlegroep die veel kleiner is
 * dan de doelgroep heeft zo'n brede band dat de vergelijking niets zegt. En een
 * plafond, want elke controlevraag is een web-zoekactie die de klant betaalt.
 *
 * Geëxporteerd: `lib/pipeline/meetplan.ts` gebruikt dezelfde grens bij het
 * bevriezen van de controlegroep (M1).
 */
export const MAX_CONTROL_PROMPTS = 5;

// ── 5.3 — Hermeting inplannen ───────────────────────────────────────────────

/**
 * Plant beide golven in zodra een pagina als gepubliceerd gemarkeerd is.
 *
 * De taken staan in de wachtrij met een `scheduled_for` in de toekomst; de
 * werker pikt ze vanzelf op als het zover is. Geen aparte planner nodig. Dat
 * is precies waar de wachtrij uit fase 1 voor gebouwd is.
 */
export async function planImpactWaves(
  admin: Admin,
  args: { analysisId: string; contentPieceId: string; publishedAt: Date },
): Promise<{ planned: number }> {
  const meetplan = await loadMeetplan(admin, args.contentPieceId);
  if (!meetplan || meetplan.doelvragen.length === 0) {
    // Geen meetplan of geen doelvragen (een pagina zonder kans, of het rapport
    // wees niets aan): dan valt er niets te meten. Geen fout, wel iets om niet
    // stil te laten.
    console.warn(`Pagina ${args.contentPieceId} heeft geen meetplan met doelvragen; geen impactmeting ingepland.`);
    return { planned: 0 };
  }

  let planned = 0;
  for (const { wave, days } of IMPACT_WAVES) {
    const at = new Date(args.publishedAt.getTime() + days * 86_400_000);
    const { created } = await enqueue(admin, {
      type: "measure_impact",
      payload: { contentPieceId: args.contentPieceId, wave },
      analysisId: args.analysisId,
      dedupeKey: dedupe.measureImpact(args.contentPieceId, wave),
      scheduledFor: at,
    });
    if (created) planned++;
  }
  return { planned };
}

/**
 * Het meetplan van deze pagina (M1): de doelvragen en de controlegroep zoals
 * die bevroren zijn bij het goedkeuren (`lib/pipeline/meetplan.ts`), en welke
 * bronnen toen meededen. `null` zonder meetplan (een pagina van vóór M1, of
 * zonder doelvragen om te bevriezen).
 */
async function loadMeetplan(
  admin: Admin,
  contentPieceId: string,
): Promise<{ doelvragen: string[]; controlegroep: string[]; bronnen: string[] } | null> {
  const { data } = await admin
    .from("meetplannen")
    .select("doelvragen, controlegroep, bronnen")
    .eq("content_piece_id", contentPieceId)
    .maybeSingle();
  if (!data) return null;
  const r = data as { doelvragen: unknown; controlegroep: unknown; bronnen: string[] | null };
  const ids = (v: unknown): string[] =>
    (Array.isArray(v) ? v : [])
      .map((x) => (x as { promptId?: unknown })?.promptId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  return { doelvragen: ids(r.doelvragen), controlegroep: ids(r.controlegroep), bronnen: r.bronnen ?? [] };
}

/**
 * Kiest de controlegroep: actieve vragen uit dezelfde analyse waar GEEN
 * gepubliceerde pagina voor gemaakt is.
 *
 * "Geen pagina voor gemaakt" is de kern. Zou een vraag waarvoor wél
 * gepubliceerd is in de controlegroep zitten, dan meten we het effect deels
 * tegen zichzelf en verdwijnt precies het verschil dat we willen aantonen.
 *
 * Deterministisch gekozen (op id, niet willekeurig) zodat een herhaalde
 * berekening dezelfde vragen pakt. Geëxporteerd: `lib/pipeline/meetplan.ts`
 * roept hem één keer aan bij het goedkeuren (M1), en bevriest de uitkomst.
 */
export async function pickControlPrompts(
  admin: Admin,
  analysisId: string,
  targetPromptIds: string[],
  limit: number,
): Promise<string[]> {
  const [{ data: allPrompts }, { data: publishedPieces }] = await Promise.all([
    admin.from("prompts").select("id").eq("analysis_id", analysisId).eq("active", true).order("id"),
    admin
      .from("content_pieces")
      .select("id")
      .eq("analysis_id", analysisId)
      .not("published_at", "is", null),
  ]);

  const pieceIds = (publishedPieces ?? []).map((p) => p.id as string);
  let claimed = new Set(targetPromptIds);

  if (pieceIds.length > 0) {
    const { data: claimedRows } = await admin
      .from("meetplannen")
      .select("doelvragen")
      .in("content_piece_id", pieceIds);
    const geclaimd = ((claimedRows ?? []) as { doelvragen: unknown }[]).flatMap((r) =>
      (Array.isArray(r.doelvragen) ? r.doelvragen : []).map((d) => (d as { promptId?: unknown })?.promptId),
    );
    claimed = new Set([...targetPromptIds, ...geclaimd.filter((id): id is string => typeof id === "string")]);
  }

  return (allPrompts ?? [])
    .map((p) => p.id as string)
    .filter((id) => !claimed.has(id))
    .slice(0, limit);
}

/**
 * Zet de meettaken voor één golf klaar: de doelvragen én de controlegroep.
 *
 * Dit is wat een `measure_impact`-taak doet. Hij plant losse `measure_prompt`-
 * taken (met een impact-markering) en daarna de berekening, zelfde patroon als
 * de gewone meting, zodat één vraag per taak binnen de tijdslimiet blijft.
 *
 * M1: de doelvragen, de controlegroep en welke bronnen meedoen komen nu uit
 * het meetplan (bevroren bij het goedkeuren, `lib/pipeline/meetplan.ts`), niet
 * meer vers uitgerekend bij elke golf. Dat maakt golf 1 en golf 2 vergelijkbaar
 * (dezelfde controlegroep), en immuun voor een prompt die tussen de golven
 * door door een andere pagina geclaimd wordt.
 *
 * M3: AI Overview krijgt zijn eigen `measure_ai_overview`-taak als "ai_overview"
 * bij de bevroren bronnen van dit meetplan zit, met dezelfde impact-markering.
 */
export async function planImpactMeasurements(
  admin: Admin,
  args: { analysisId: string; contentPieceId: string; wave: number },
): Promise<{ planned: number }> {
  const meetplan = await loadMeetplan(admin, args.contentPieceId);
  if (!meetplan || meetplan.doelvragen.length === 0) return { planned: 0 };

  let planned = 0;
  const plan = [
    ...meetplan.doelvragen.map((id) => ({ id, purpose: "impact" as const })),
    ...meetplan.controlegroep.map((id) => ({ id, purpose: "control" as const })),
  ];

  for (const { id, purpose } of plan) {
    const { created } = await enqueue(admin, {
      type: "measure_prompt",
      payload: {
        promptId: id,
        weekNo: 0, // niet gebruikt bij een impactmeting; de sleutel is (pagina, golf)
        impact: { purpose, contentPieceId: args.contentPieceId, wave: args.wave },
      },
      analysisId: args.analysisId,
      dedupeKey: dedupe.measureImpactPrompt(args.contentPieceId, args.wave, id),
    });
    if (created) planned++;

    if (meetplan.bronnen.includes("ai_overview")) {
      const { created: createdAio } = await enqueue(admin, {
        type: "measure_ai_overview",
        payload: {
          promptId: id,
          weekNo: 0,
          impact: { purpose, contentPieceId: args.contentPieceId, wave: args.wave },
        },
        analysisId: args.analysisId,
        dedupeKey: dedupe.measureImpactAiOverview(args.contentPieceId, args.wave, id),
      });
      if (createdAio) planned++;
    }
  }

  return { planned };
}

// ── 5.4/5.5 — Effect berekenen ──────────────────────────────────────────────

/** Werd het eigen merk genoemd in deze metingen? Per prompt, uit de mentions. */
async function ownMentionsByPrompt(
  admin: Admin,
  runIds: string[],
): Promise<Map<string, boolean>> {
  if (runIds.length === 0) return new Map();

  const [{ data: runs }, { data: mentions }] = await Promise.all([
    admin.from("tracking_runs").select("id, prompt_id").in("id", runIds),
    admin
      .from("tracking_run_mentions")
      .select("tracking_run_id, mentioned")
      .eq("is_own_brand", true)
      .in("tracking_run_id", runIds),
  ]);

  // Zelfde regel als in de aggregatie (0.3): genoemd wint van niet-genoemd.
  const byRun = new Map<string, boolean>();
  for (const m of mentions ?? []) {
    const id = m.tracking_run_id as string;
    byRun.set(id, byRun.get(id) === true || Boolean(m.mentioned));
  }

  const out = new Map<string, boolean>();
  for (const r of runs ?? []) {
    const promptId = r.prompt_id as string | null;
    const judged = byRun.get(r.id as string);
    // Niet beoordeeld = onbekend, niet "niet genoemd" (optimalisatie.md 0.2).
    if (promptId && judged !== undefined) out.set(promptId, judged);
  }
  return out;
}

/**
 * De stand VÓÓR publicatie: de laatste periodieke meting van deze prompts die
 * dateert van vóór het publicatiemoment.
 *
 * Bewust "vóór het publicatiemoment" en niet "de nulmeting": publiceert de klant
 * pas na drie maanden, dan is de nulmeting geen eerlijk vertrekpunt meer.
 */
async function beforeState(
  admin: Admin,
  analysisId: string,
  promptIds: string[],
  publishedAt: string,
): Promise<Map<string, boolean>> {
  if (promptIds.length === 0) return new Map();

  const { data: runs } = await admin
    .from("tracking_runs")
    .select("id, prompt_id, ran_at")
    .eq("analysis_id", analysisId)
    .eq("purpose", "periodic")
    .in("prompt_id", promptIds)
    .lt("ran_at", publishedAt)
    .order("ran_at", { ascending: false });

  // Per prompt de MEEST RECENTE meting van vóór publicatie.
  const latestByPrompt = new Map<string, string>();
  for (const r of runs ?? []) {
    const promptId = r.prompt_id as string;
    if (!latestByPrompt.has(promptId)) latestByPrompt.set(promptId, r.id as string);
  }

  return ownMentionsByPrompt(admin, Array.from(latestByPrompt.values()));
}

/** De stand NÁ publicatie: de impact-/controlemeting van deze golf. */
async function afterState(
  admin: Admin,
  contentPieceId: string,
  wave: number,
  purpose: "impact" | "control",
): Promise<Map<string, boolean>> {
  const { data: runs } = await admin
    .from("tracking_runs")
    .select("id")
    .eq("content_piece_id", contentPieceId)
    .eq("impact_wave", wave)
    .eq("purpose", purpose);

  return ownMentionsByPrompt(admin, (runs ?? []).map((r) => r.id as string));
}

/**
 * Is het gepubliceerde adres van de pagina geciteerd in minstens één antwoord
 * op de doelvragen van deze golf (M3)? `null` zonder gepubliceerd adres of
 * zonder gemeten doelvragen dat cluster: onbekend is geen "nee" (conventie 3).
 * Werkt over beide bronnen tegelijk (ChatGPT en, als hij aanstaat, AI
 * Overview): `runIds` komt uit `tracking_runs` zonder filter op `engine`.
 */
async function ownPageCited(
  admin: Admin,
  contentPieceId: string,
  wave: number,
  publishedUrl: string | null,
): Promise<boolean | null> {
  if (!publishedUrl) return null;
  const { data: runs } = await admin
    .from("tracking_runs")
    .select("id")
    .eq("content_piece_id", contentPieceId)
    .eq("impact_wave", wave)
    .eq("purpose", "impact");
  const runIds = (runs ?? []).map((r) => r.id as string);
  if (runIds.length === 0) return null;

  const { data: mentions } = await admin
    .from("tracking_run_mentions")
    .select("cited_sources")
    .eq("is_own_brand", true)
    .in("tracking_run_id", runIds);
  const bronnen = ((mentions ?? []) as { cited_sources: string[] | null }[]).flatMap((m) => m.cited_sources ?? []);
  return bronnen.some((b) => citeertEigenPagina(b, publishedUrl));
}

/**
 * Berekent en bewaart het effect van één gepubliceerde pagina, voor één golf.
 *
 * Het oordeel is streng. Met een handvol vragen is de band breed, en een
 * stijging die daarbinnen valt is geen stijging. Liever "nog niet te zeggen" dan
 * een cijfer waar de klant een beslissing op baseert die het niet draagt.
 */
export async function computeImpact(
  admin: Admin,
  args: { analysisId: string; contentPieceId: string; wave: number },
): Promise<void> {
  const { data: pieceRow } = await admin
    .from("content_pieces")
    .select("published_at, published_url")
    .eq("id", args.contentPieceId)
    .maybeSingle();

  const publishedAt = pieceRow?.published_at as string | null;
  if (!publishedAt) {
    console.warn(`Pagina ${args.contentPieceId} is niet gepubliceerd; effect niet berekend.`);
    return;
  }
  const publishedUrl = (pieceRow?.published_url as string | null) ?? null;

  const meetplan = await loadMeetplan(admin, args.contentPieceId);
  const targetPromptIds = meetplan?.doelvragen ?? [];

  const [targetAfter, controlAfter, targetCitedOwnPage] = await Promise.all([
    afterState(admin, args.contentPieceId, args.wave, "impact"),
    afterState(admin, args.contentPieceId, args.wave, "control"),
    ownPageCited(admin, args.contentPieceId, args.wave, publishedUrl),
  ]);

  const [targetBefore, controlBefore] = await Promise.all([
    beforeState(admin, args.analysisId, targetPromptIds, publishedAt),
    beforeState(admin, args.analysisId, Array.from(controlAfter.keys()), publishedAt),
  ]);

  const target = compare(targetBefore, targetAfter);
  const control = compare(controlBefore, controlAfter);

  const targetDelta = deltaOf(target);
  const controlDelta = control.total > 0 ? deltaOf(control) : null;
  const threshold = thresholdOf(target);
  const verdict = verdictOf(target);

  await admin.from("content_impact").upsert(
    {
      content_piece_id: args.contentPieceId,
      analysis_id: args.analysisId,
      wave: args.wave,
      target_total: target.total,
      target_before_mentioned: target.beforeMentioned,
      target_after_mentioned: target.afterMentioned,
      control_total: control.total,
      control_before_mentioned: control.beforeMentioned,
      control_after_mentioned: control.afterMentioned,
      target_delta: Math.round(targetDelta * 100) / 100,
      control_delta: controlDelta == null ? null : Math.round(controlDelta * 100) / 100,
      delta_threshold: Math.round(threshold * 100) / 100,
      verdict,
      target_cited_own_page: targetCitedOwnPage,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "content_piece_id,wave" },
  );
}
