import "server-only";

/**
 * Taken in de wachtrij zetten (optimalisatie.md fase 1).
 *
 * Alles loopt via `enqueue`, dat een `dedupeKey` afdwingt. Die sleutel is geen
 * detail: zonder dat zou dubbelklikken, een herladen scherm of twee werkers die
 * tegelijk hetzelfde vervolg plannen, dezelfde dure meting twee keer draaien.
 * De unieke index uit migratie 0013 vangt dat af op databaseniveau — dus ook
 * bij een echte race tussen twee processen, niet alleen bij netjes gedrag.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { type JobType, type JobPayloads } from "@/lib/jobs/types";

type Admin = SupabaseClient;

/** Postgres-foutcode voor een schending van een unieke index. */
const UNIQUE_VIOLATION = "23505";

export interface EnqueueArgs<T extends JobType> {
  type: T;
  payload: JobPayloads[T];
  /** Analyse waar de taak bij hoort (of profileId — precies één van beide). */
  analysisId?: string | null;
  profileId?: string | null;
  /**
   * Sleutel die dit specifieke werk identificeert. Bestaat er al een OPENSTAANDE
   * taak met dezelfde sleutel, dan doet deze aanroep niets. Klaar of definitief
   * mislukt werk blokkeert niet — anders zou een retry onmogelijk zijn.
   */
  dedupeKey: string;
  /** Pas later uitvoeren (bv. een hermeting over twee weken). */
  scheduledFor?: Date;
}

export interface EnqueueResult {
  /** Is er daadwerkelijk een nieuwe taak aangemaakt, of stond hij er al? */
  created: boolean;
  jobId: string | null;
}

export async function enqueue<T extends JobType>(
  admin: Admin,
  args: EnqueueArgs<T>,
): Promise<EnqueueResult> {
  const { data, error } = await admin
    .from("jobs")
    .insert({
      type: args.type,
      payload_json: args.payload as never,
      analysis_id: args.analysisId ?? null,
      profile_id: args.profileId ?? null,
      dedupe_key: args.dedupeKey,
      status: "queued" as const,
      scheduled_for: (args.scheduledFor ?? new Date()).toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    // Al ingepland — dat is geen fout maar precies wat de sleutel moet doen.
    if (error.code === UNIQUE_VIOLATION) return { created: false, jobId: null };
    throw new Error(`Taak inplannen mislukt (${args.type}): ${error.message}`);
  }

  return { created: true, jobId: data.id as string };
}

// ── Sleutels op één plek ────────────────────────────────────────────────────
// Zodat "wanneer is dit hetzelfde werk?" één keer beantwoord wordt en niet per
// aanroepplek opnieuw bedacht.

export const dedupe = {
  profileResearch: (profileId: string) => `profile_research:${profileId}`,
  prepareAnalysis: (analysisId: string) => `prepare:${analysisId}`,
  generatePrompts: (analysisId: string) => `prompts:${analysisId}`,
  measurePrompt: (analysisId: string, promptId: string, weekNo: number) =>
    `measure:${analysisId}:${promptId}:w${weekNo}`,
  aggregateWeek: (analysisId: string, weekNo: number) => `aggregate:${analysisId}:w${weekNo}`,
  generateReport: (analysisId: string, weekNo: number) => `report:${analysisId}:w${weekNo}`,
  // Content is idempotent op de aanbeveling, niet op de pagina: twee keer op
  // dezelfde knop drukken mag niet twee pagina's opleveren.
  contentDraft: (analysisId: string, title: string) => `content:${analysisId}:${title}`,
  contentRevise: (contentPieceId: string) => `content_revise:${contentPieceId}`,
  // Per DAG, niet per profiel: de audit draait bij het aanmaken én maandelijks,
  // en moet dan echt opnieuw kijken. Zonder de datum erin zou een afgeronde
  // audit van vorig jaar de hermeting van deze maand blokkeren.
  technicalAudit: (profileId: string, day = new Date().toISOString().slice(0, 10)) =>
    `audit:${profileId}:${day}`,
  // Publicatie en effect (optimalisatie.md fase 5). De golf zit in de sleutel:
  // golf 1 en golf 2 zijn twee verschillende metingen van dezelfde vragen.
  verifyPublication: (contentPieceId: string) => `verify:${contentPieceId}`,
  measureImpact: (contentPieceId: string, wave: number) => `impact:${contentPieceId}:w${wave}`,
  measureImpactPrompt: (contentPieceId: string, wave: number, promptId: string) =>
    `impact_run:${contentPieceId}:w${wave}:${promptId}`,
  computeImpact: (contentPieceId: string, wave: number) => `impact_calc:${contentPieceId}:w${wave}`,
  // Per DAG: de scan mag opnieuw draaien na een nieuwe meting, maar niet twee
  // keer op dezelfde dag — de aanwezigheidscontrole kost een web-zoekactie.
  offsiteScan: (analysisId: string, day = new Date().toISOString().slice(0, 10)) =>
    `offsite:${analysisId}:${day}`,
};

/**
 * Zet voor elke ACTIEVE prompt van een analyse een meettaak klaar
 * (optimalisatie.md 1.3). Eén taak per prompt: dat is wat de meting binnen de
 * tijdslimiet houdt en wat fase 2 (meerdere metingen per vraag) straks
 * schaalbaar maakt.
 *
 * Geeft terug hoeveel taken er daadwerkelijk bij kwamen — bij een tweede poging
 * na een gedeeltelijke mislukking is dat alleen het restant.
 */
export async function enqueueMeasurement(
  admin: Admin,
  analysisId: string,
  weekNo: number,
): Promise<{ planned: number; totalPrompts: number }> {
  const { data: prompts } = await admin
    .from("prompts")
    .select("id")
    .eq("analysis_id", analysisId)
    .eq("active", true);

  const list = prompts ?? [];
  let planned = 0;

  for (const p of list) {
    const promptId = p.id as string;
    // Al gemeten? Dan niet opnieuw plannen — meten is de duurste stap die er is
    // (de web-zoekactie is ~94% van de meetkosten).
    const { count: alreadyMeasured } = await admin
      .from("tracking_runs")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", analysisId)
      .eq("prompt_id", promptId)
      .eq("week_no", weekNo)
      .not("mention_json", "is", null);
    if (alreadyMeasured) continue;

    const { created } = await enqueue(admin, {
      type: "measure_prompt",
      payload: { promptId, weekNo },
      analysisId,
      dedupeKey: dedupe.measurePrompt(analysisId, promptId, weekNo),
    });
    if (created) planned++;
  }

  return { planned, totalPrompts: list.length };
}
