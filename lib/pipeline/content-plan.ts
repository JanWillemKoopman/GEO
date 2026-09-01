import "server-only";

/**
 * De PLANSTAP: eerst uitzoeken wat deze pagina nodig heeft, dan pas schrijven
 * (docs/tasks/contentpijplijn-herontwerp.md A1 + A2, migratie 0082).
 *
 * ── WAAROM DIT EEN EIGEN TAAK IS ────────────────────────────────────────────
 *
 * Conventie 7: één taak is hooguit één zware AI-aanroep, en een nieuwe zware
 * stap wordt een eigen jobtype. Het onderzoek doet een web-zoekactie (20 tot 40
 * seconden) plus het opstellen van het contract; daarachter komt de
 * schrijfaanroep die zelf al tot 150 seconden mag duren. Samen in één taak zou
 * dat tegen de routelimiet van 300 seconden aanlopen, en dan is het dure
 * schrijfwerk kwijt door een stap die er niets mee te maken had.
 *
 * ── WAT HIJ AFLEVERT ────────────────────────────────────────────────────────
 *
 *   1. het ITEMDOSSIER: deelvragen, vervolgvragen, twijfels, uitleg met bron;
 *   2. de bronverificatie op die uitleg (alleen wat klopt gaat door);
 *   3. het CONTENTCONTRACT: de secties die de pagina moet hebben.
 *
 * Alle drie worden op de contentpagina bewaard én meegegeven in de payload van
 * de schrijftaak. Dubbelop met opzet: lukt het wegschrijven niet, dan schrijft
 * de volgende stap alsnog mét contract in plaats van zonder.
 *
 * ── KOSTEN ──────────────────────────────────────────────────────────────────
 *
 * Twee aanroepen op de goedkope tier, waarvan één met een web-zoekactie
 * ($0,01 op een redeneermodel). Samen ongeveer twee cent per pagina, tegenover
 * $0,15 voor de schrijfaanroep erna. Nagerekend tegen de tarieven in
 * lib/openai/pricing.ts en de gemeten tokenaantallen in `ai_calls`.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { currentPiece } from "@/lib/jobs/content-jobs";
import { researchItem } from "@/lib/pipeline/item-dossier";
import { buildContentContract } from "@/lib/pipeline/content-contract";
import { factsFromSnapshot, planFromSnapshot } from "@/lib/pipeline/briefing";
import { buildFactBase } from "@/lib/pipeline/factbase";
import { TARGET_WORDS, TYPE_GUIDANCE, type RecommendationInput } from "@/lib/pipeline/content";
import type { ContentContract } from "@/lib/schemas/content-contract";
import type { ItemDossier } from "@/lib/schemas/item-dossier";
import type { VerifiedExplainer } from "@/lib/pipeline/explainer-verify";
import type { Analysis, Profile } from "@/lib/types/database";

export interface PlanResult {
  contract: ContentContract | null;
  dossier: ItemDossier | null;
  explainers: VerifiedExplainer[];
  /** Kwam dit uit de database in plaats van uit twee verse aanroepen? */
  hergebruikt: boolean;
}

/**
 * Hoeveel tekens van het winnende antwoord meegaan naar het onderzoek. Zelfde
 * maat als in `briefing.ts`: genoeg om de lat te zien, niet genoeg om de prompt
 * te vullen.
 */
const ANSWER_EXCERPT_CHARS = 700;

/**
 * Bereidt één contentitem voor.
 *
 * Idempotent (conventie 9): staat er al een contract op de huidige versie van
 * deze pagina, dan doen we geen enkele aanroep en geven we dat terug. Anders
 * zou een taak die opnieuw geprobeerd wordt de web-zoekactie nog eens betalen.
 */
export async function planContentPiece(args: {
  analysisId: string;
  userId: string;
  recommendation: RecommendationInput;
  /** Opnieuw onderzoeken, ook als er al een contract ligt (bij opnieuw genereren). */
  force?: boolean;
}): Promise<PlanResult> {
  const { analysisId, userId, recommendation, force = false } = args;
  const admin = createAdminClient();

  const { data: analysisRow } = await admin
    .from("analyses")
    .select("*")
    .eq("id", analysisId)
    .single();
  if (!analysisRow || analysisRow.user_id !== userId) throw new Error("Analyse niet gevonden.");
  const analysis = analysisRow as Analysis;

  const piece = await currentPiece(admin, analysisId, recommendation.title);

  // ── Ligt het er al? ───────────────────────────────────────────────────────
  if (piece && !force) {
    const { data: row } = await admin
      .from("content_pieces")
      .select("contract_json, dossier_json")
      .eq("id", piece.id)
      .maybeSingle();
    const bestaand = (row?.contract_json ?? null) as ContentContract | null;
    if (bestaand && bestaand.sections?.length > 0) {
      const opgeslagen = (row?.dossier_json ?? null) as
        | { dossier?: ItemDossier; explainers?: VerifiedExplainer[] }
        | null;
      return {
        contract: bestaand,
        dossier: opgeslagen?.dossier ?? null,
        explainers: opgeslagen?.explainers ?? [],
        hergebruikt: true,
      };
    }
  }

  const { data: profileRow } = await admin
    .from("profiles")
    .select("*")
    .eq("id", analysis.profile_id)
    .maybeSingle();
  const profile = profileRow as Profile | null;

  const targets = recommendation.targets ?? [];

  // Het winnende antwoord uit de meting: dat is wat de lat laat zien. Dezelfde
  // bron als `loadContentContext` gebruikt, hier alleen om het onderzoek te
  // richten.
  const runIds = targets.map((t) => t.runId).filter((id): id is string => Boolean(id));
  let winningAnswers: string[] = [];
  if (runIds.length > 0) {
    const { data: runRows } = await admin
      .from("tracking_runs")
      .select("id, raw_response")
      .in("id", runIds);
    winningAnswers = ((runRows ?? []) as { raw_response: string | null }[])
      .map((r) => (r.raw_response ?? "").slice(0, ANSWER_EXCERPT_CHARS))
      .filter(Boolean);
  }

  const competitors = Array.from(new Set(profile?.competitors ?? []));

  // ── 1. Het itemdossier (A1) ───────────────────────────────────────────────
  const { dossier, explainers } = await researchItem({
    title: recommendation.title,
    type: recommendation.type,
    targetIntent: recommendation.targetIntent,
    why: recommendation.why,
    industry: profile?.industry ?? null,
    cluster: analysis.topic ?? null,
    targets,
    winningAnswers,
    competitors,
    analysisId,
    profileId: analysis.profile_id,
  });

  // ── 2. De feitenkaart en het paginaplan ───────────────────────────────────
  //
  // Bij voorkeur de bevroren kaart uit de briefing, precies zoals de
  // schrijfstap hem straks pakt: het contract moet naar dezelfde F-nummers
  // verwijzen als de schrijver ziet. Is er geen snapshot (een pagina buiten de
  // briefing om), dan bouwen we de kaart op met de doelvragen als sturing (S1).
  const { data: pieceRow } = piece
    ? await admin
        .from("content_pieces")
        .select("briefing_snapshot_json")
        .eq("id", piece.id)
        .maybeSingle()
    : { data: null };

  const bevroren = factsFromSnapshot(pieceRow?.briefing_snapshot_json);
  const facts =
    bevroren.length > 0
      ? bevroren
      : await buildFactBase(
          admin,
          analysis.profile_id,
          analysisId,
          targets.map((t) => t.text),
        );
  const plan = planFromSnapshot(pieceRow?.briefing_snapshot_json);

  // ── 3. Het contract (A2) ──────────────────────────────────────────────────
  const { contract } = await buildContentContract({
    title: recommendation.title,
    type: recommendation.type,
    targetIntent: recommendation.targetIntent,
    targets,
    facts,
    plan,
    dossier,
    explainers,
    targetWords: TARGET_WORDS[recommendation.type],
    typeGuidance: TYPE_GUIDANCE[recommendation.type],
    analysisId,
    profileId: analysis.profile_id,
  });

  console.info(
    `Contentplan voor "${recommendation.title}": ${contract.sections.length} secties, ` +
      `${dossier.subQuestions.length} deelvragen, ` +
      `${explainers.filter((e) => e.verified).length} van ${explainers.length} uitleg met bron bevestigd.`,
  );

  // ── 4. Bewaren bij de pagina ──────────────────────────────────────────────
  //
  // Faalt dit, dan gaat het schrijven gewoon door: de schrijftaak krijgt
  // dezelfde uitkomst mee in zijn payload. Een mislukt wegschrijven mag geen
  // pagina zonder contract opleveren.
  if (piece) {
    const { error } = await admin
      .from("content_pieces")
      .update({
        contract_json: contract as never,
        dossier_json: { dossier, explainers } as never,
      })
      .eq("id", piece.id);
    if (error) {
      console.warn(`Contract niet kunnen bewaren bij pagina ${piece.id}: ${error.message}`);
    }
  }

  return { contract, dossier, explainers, hergebruikt: false };
}
