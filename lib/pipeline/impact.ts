import "server-only";

/**
 * Heeft het gewerkt? (optimalisatie.md 5.3/5.4/5.5)
 *
 * Dit is de fase waarin de belofte wordt ingelost — of weerlegd, en dan weten we
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
import { compare, deltaOf, thresholdOf, verdictOf } from "@/lib/pipeline/impact-math";
import type { ContentPieceTarget } from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Wanneer we hermeten, in dagen na publicatie.
 *
 * Niet meteen: AI-systemen nemen nieuwe content niet dezelfde dag op — een
 * pagina moet gecrawld en geïndexeerd worden, en bij zoekgestuurde assistenten
 * duurt dat dagen tot weken. Twee meetmomenten en niet één, omdat één moment
 * "opgepikt" niet van "toeval" kan onderscheiden.
 */
export const IMPACT_WAVES = [
  { wave: 1, days: 14 },
  { wave: 2, days: 28 },
] as const;

/**
 * Hoeveel controlevragen we per golf meebeten, als bovengrens.
 *
 * Even veel als er doelvragen zijn, want een controlegroep die veel kleiner is
 * dan de doelgroep heeft zo'n brede band dat de vergelijking niets zegt. En een
 * plafond, want elke controlevraag is een web-zoekactie die de klant betaalt.
 */
const MAX_CONTROL_PROMPTS = 5;

// ── 5.3 — Hermeting inplannen ───────────────────────────────────────────────

/**
 * Plant beide golven in zodra een pagina als gepubliceerd gemarkeerd is.
 *
 * De taken staan in de wachtrij met een `scheduled_for` in de toekomst; de
 * werker pikt ze vanzelf op als het zover is. Geen aparte planner nodig — dat
 * is precies waar de wachtrij uit fase 1 voor gebouwd is.
 */
export async function planImpactWaves(
  admin: Admin,
  args: { analysisId: string; contentPieceId: string; publishedAt: Date },
): Promise<{ planned: number }> {
  const targets = await loadTargets(admin, args.contentPieceId);
  if (targets.length === 0) {
    // Geen doelvragen (een pagina van vóór fase 4, of het model wees niets aan):
    // dan valt er niets te meten. Geen fout — wel iets om niet stil te laten.
    console.warn(`Pagina ${args.contentPieceId} heeft geen doelvragen; geen impactmeting ingepland.`);
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

async function loadTargets(admin: Admin, contentPieceId: string): Promise<ContentPieceTarget[]> {
  const { data } = await admin
    .from("content_piece_targets")
    .select("*")
    .eq("content_piece_id", contentPieceId);
  return ((data ?? []) as ContentPieceTarget[]).filter((t) => t.prompt_id);
}

/**
 * Kiest de controlegroep: actieve vragen uit dezelfde analyse waar GEEN
 * gepubliceerde pagina voor gemaakt is.
 *
 * "Geen pagina voor gemaakt" is de kern. Zou een vraag waarvoor wél
 * gepubliceerd is in de controlegroep zitten, dan meten we het effect deels
 * tegen zichzelf en verdwijnt precies het verschil dat we willen aantonen.
 *
 * Deterministisch gekozen (op id, niet willekeurig) zodat een herhaalde taak
 * dezelfde vragen pakt en de vergelijking tussen golf 1 en 2 klopt.
 */
async function pickControlPrompts(
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
      .from("content_piece_targets")
      .select("prompt_id")
      .in("content_piece_id", pieceIds);
    claimed = new Set([
      ...targetPromptIds,
      ...(claimedRows ?? []).map((r) => r.prompt_id as string).filter(Boolean),
    ]);
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
 * taken (met een impact-markering) en daarna de berekening — zelfde patroon als
 * de gewone meting, zodat één vraag per taak binnen de tijdslimiet blijft.
 */
export async function planImpactMeasurements(
  admin: Admin,
  args: { analysisId: string; contentPieceId: string; wave: number },
): Promise<{ planned: number }> {
  const targets = await loadTargets(admin, args.contentPieceId);
  const targetPromptIds = targets.map((t) => t.prompt_id!).filter(Boolean);
  if (targetPromptIds.length === 0) return { planned: 0 };

  const controlPromptIds = await pickControlPrompts(
    admin,
    args.analysisId,
    targetPromptIds,
    Math.min(targetPromptIds.length, MAX_CONTROL_PROMPTS),
  );

  let planned = 0;
  const plan = [
    ...targetPromptIds.map((id) => ({ id, purpose: "impact" as const })),
    ...controlPromptIds.map((id) => ({ id, purpose: "control" as const })),
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
    .select("published_at")
    .eq("id", args.contentPieceId)
    .maybeSingle();

  const publishedAt = pieceRow?.published_at as string | null;
  if (!publishedAt) {
    console.warn(`Pagina ${args.contentPieceId} is niet gepubliceerd; effect niet berekend.`);
    return;
  }

  const targets = await loadTargets(admin, args.contentPieceId);
  const targetPromptIds = targets.map((t) => t.prompt_id!).filter(Boolean);

  const [targetAfter, controlAfter] = await Promise.all([
    afterState(admin, args.contentPieceId, args.wave, "impact"),
    afterState(admin, args.contentPieceId, args.wave, "control"),
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
      computed_at: new Date().toISOString(),
    },
    { onConflict: "content_piece_id,wave" },
  );
}
