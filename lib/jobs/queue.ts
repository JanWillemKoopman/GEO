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
  calibrateVolumes: (analysisId: string) => `volumes:${analysisId}`,
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
 * Deze functie draait zelf synchroon in de confirm-route (bevestigen ís het
 * startsein, zie route-commentaar). Met tot 30 actieve prompts liep een
 * sequentiële lus — twee awaits per prompt, dus tot 60 keer heen-en-weer naar
 * Supabase — de functie-tijdslimiet van die route plat, waardoor de fetch op
 * de knop "Bevestig en start de meting" strandde zonder ooit een response te
 * krijgen ("Bevestigen mislukt. Probeer het opnieuw."). Nu twee bulk-queries
 * in plaats van 2×N sequentiële round-trips.
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
  if (list.length === 0) return { planned: 0, totalPrompts: 0 };

  // Al gemeten? Dan niet opnieuw plannen — meten is de duurste stap die er is
  // (de web-zoekactie is ~94% van de meetkosten). Eén query voor alle prompts
  // tegelijk in plaats van één query per prompt.
  const { data: measuredRows } = await admin
    .from("tracking_runs")
    .select("prompt_id")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo)
    .not("mention_json", "is", null);

  const alreadyMeasured = new Set((measuredRows ?? []).map((r) => r.prompt_id as string));
  const candidates = list.filter((p) => !alreadyMeasured.has(p.id as string));
  if (candidates.length === 0) return { planned: 0, totalPrompts: list.length };

  // Openstaand werk (van een eerdere, deels mislukte poging) er ook in één
  // query uit filteren — dat is precies het scenario dat de dedupe-index
  // (migratie 0013, alleen voor status queued/running) moet afvangen. De
  // index is PARTIEEL, dus `.upsert(..., { onConflict })` kan hem niet als
  // ON CONFLICT-doel gebruiken (Postgres eist dezelfde WHERE-clausule); dit
  // filtert vooraf i.p.v. op de index te vertrouwen.
  const candidateKeys = candidates.map((p) => dedupe.measurePrompt(analysisId, p.id as string, weekNo));
  const { data: openRows } = await admin
    .from("jobs")
    .select("dedupe_key")
    .in("dedupe_key", candidateKeys)
    .in("status", ["queued", "running"]);

  const alreadyQueued = new Set((openRows ?? []).map((r) => r.dedupe_key as string));
  const rows = candidates
    .filter((p) => !alreadyQueued.has(dedupe.measurePrompt(analysisId, p.id as string, weekNo)))
    .map((p) => ({
      promptId: p.id as string,
      type: "measure_prompt" as const,
      payload_json: { promptId: p.id as string, weekNo } as never,
      analysis_id: analysisId,
      dedupe_key: dedupe.measurePrompt(analysisId, p.id as string, weekNo),
      status: "queued" as const,
      scheduled_for: new Date().toISOString(),
    }));

  if (rows.length === 0) return { planned: 0, totalPrompts: list.length };

  // Eén bulk-insert i.p.v. een taak per prompt (was tot 2×N sequentiële
  // round-trips, genoeg om de confirm-route over de functie-tijdslimiet te
  // duwen — zie de doc-comment op deze functie). Een echte race met een
  // gelijktijdige tweede poging is zeldzaam (de knop staat uit tijdens
  // 'pending'); mocht de index dan alsnog botsen, valt dit terug op de oude,
  // per-rij-veilige weg voor precies dat restant.
  const { data: inserted, error } = await admin
    .from("jobs")
    .insert(rows.map(({ promptId: _promptId, ...row }) => row))
    .select("id");
  if (!error) return { planned: (inserted ?? []).length, totalPrompts: list.length };
  if (error.code !== UNIQUE_VIOLATION) throw new Error(`Meting inplannen mislukt: ${error.message}`);

  let planned = 0;
  for (const row of rows) {
    const { created } = await enqueue(admin, {
      type: "measure_prompt",
      payload: { promptId: row.promptId, weekNo },
      analysisId,
      dedupeKey: row.dedupe_key,
    });
    if (created) planned++;
  }
  return { planned, totalPrompts: list.length };
}
