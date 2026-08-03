import "server-only";
import { maySkip } from "@/lib/pipeline/elicit-rate";

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
import { promptWeight } from "@/lib/pipeline/prompt-weight";
import { volumeBandOf } from "@/lib/pipeline/volume";
import { measureRepeats, repeatedPromptCount } from "@/lib/config";

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
  profileDiscover: (profileId: string) => `profile_discover:${profileId}`,
  profileResearch: (profileId: string) => `profile_research:${profileId}`,
  profileOffering: (profileId: string) => `profile_offering:${profileId}`,
  prepareAnalysis: (analysisId: string) => `prepare:${analysisId}`,
  generatePrompts: (analysisId: string) => `prompts:${analysisId}`,
  calibrateVolumes: (analysisId: string) => `volumes:${analysisId}`,
  // De herhalingsindex hoort in de sleutel (R6.1): drie metingen van dezelfde
  // vraag in dezelfde periode zijn drie verschillende taken, geen duplicaat.
  // Index 0 houdt bewust de OUDE sleutelvorm, zodat taken die al in de wachtrij
  // stonden bij het uitrollen van R6.1 niet ineens als nieuw werk gelden.
  measurePrompt: (analysisId: string, promptId: string, weekNo: number, repeat = 0) =>
    repeat === 0
      ? `measure:${analysisId}:${promptId}:w${weekNo}`
      : `measure:${analysisId}:${promptId}:w${weekNo}:r${repeat}`,
  aggregateWeek: (analysisId: string, weekNo: number) => `aggregate:${analysisId}:w${weekNo}`,
  competitorIntel: (analysisId: string, weekNo: number) => `compintel:${analysisId}:w${weekNo}`,
  generateReport: (analysisId: string, weekNo: number) => `report:${analysisId}:w${weekNo}`,
  // Content is idempotent op de aanbeveling, niet op de pagina: twee keer op
  // dezelfde knop drukken mag niet twee pagina's opleveren.
  contentDraft: (analysisId: string, title: string) => `content:${analysisId}:${title}`,
  // Eén briefing per BATCH (contentbriefing.md §2), dus de sleutel is de set
  // gekozen titels — niet één titel. Kiest de klant dezelfde drie pagina's nog
  // een keer, dan is dat dezelfde briefing; kiest hij er een vierde bij, dan is
  // het een nieuwe vragenronde.
  contentBrief: (analysisId: string, titles: string[]) =>
    `brief:${analysisId}:${[...titles].sort().join("|")}`,
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
    .select("id, brand_eliciting, elicit_successes, elicit_samples, volume_band, volume_estimate, intent_type")
    .eq("analysis_id", analysisId)
    .eq("active", true);

  const all = prompts ?? [];
  if (all.length === 0) return { planned: 0, totalPrompts: 0 };

  // ── Structureel merkloze vragen overslaan (R2.4, herzien in R7) ────────────
  //
  // Elke meting is een betaalde web-zoekactie, dus een vraag die nooit iets
  // oplevert is verspild geld. De vraag is alleen: wannéér weet je dat?
  //
  // De oude regel zei "na twee metingen zonder aanbieder". Die bleek te scherp.
  // De verificatieronde van 31 juli mat dezelfde acht vragen drie keer in
  // dezelfde week en zag de winbaarheid bij vier ervan wisselen; bij een vraag
  // die één op de drie keer raak is, is de kans op twee nullen achtereen 44%.
  // Zo kromp de winbare basis van 17 naar 5 vragen en werd de score betekenisloos
  // (95%-band ±42 punten).
  //
  // Nu beslist het betrouwbaarheidsinterval: overslaan mag pas bij genoeg
  // metingen én een bovengrens die laag genoeg is (`maySkip`). Op productie staan
  // negen vragen op 'nee' — alle negen op basis van precies twee metingen, en die
  // komen met deze regel dus terug in de meting.
  //
  // Elke vierde periode tóch de volledige set, zodat een markt die verandert
  // (er ontstaat wél een standaardpartij) niet voorgoed onopgemerkt blijft.
  const volledigeRonde = weekNo === 0 || weekNo % 4 === 0;
  const list = volledigeRonde
    ? all
    : all.filter(
        (p) =>
          !maySkip({
            successes: (p.elicit_successes as number | null) ?? 0,
            samples: (p.elicit_samples as number | null) ?? 0,
          }),
      );

  if (list.length < all.length) {
    console.log(
      `Analyse ${analysisId} periode ${weekNo}: ${all.length - list.length} structureel merkloze ` +
        `vragen overgeslagen; die leverden twee metingen lang geen enkele aanbieder op.`,
    );
  }
  if (list.length === 0) return { planned: 0, totalPrompts: all.length };

  // ── Gelaagd hermeten (implementatieplan.md R6.1) ──────────────────────────
  //
  // Eén meting per vraag bleek te onbetrouwbaar: dezelfde analyse leverde twee
  // periodes achter elkaar 17 en 11 meetbare vragen op, met scores 18 en 36,
  // zonder dat er iets veranderd was. Alles vaker meten kan niet — de meting is
  // 95% van de kosten — dus meten we de ZWAARSTWEGENDE vragen vaker en de rest
  // één keer. Precisie waar het geld zit.
  const gewicht = (p: (typeof list)[number]) =>
    promptWeight(volumeBandOf(p), p.intent_type as string | null);

  const teHerhalen = new Set(
    [...list]
      // Gelijk gewicht? Dan op id, zodat elke periode dezelfde vragen herhaalt.
      // Zonder die vaste volgorde bepaalt de toevallige rijvolgorde uit Postgres
      // wie er herhaald wordt, en dan verandert de nauwkeurigheid van een vraag
      // van periode tot periode — precies de ruis die R6.1 moet wegnemen.
      .sort((a, b) => gewicht(b) - gewicht(a) || (a.id as string).localeCompare(b.id as string))
      .slice(0, repeatedPromptCount)
      .map((p) => p.id as string),
  );

  // Elke te plannen meting als (vraag, hoeveelste keer).
  const gepland = list.flatMap((p) => {
    const keren = teHerhalen.has(p.id as string) ? measureRepeats : 1;
    return Array.from({ length: keren }, (_, r) => ({ promptId: p.id as string, repeat: r }));
  });

  // Al gemeten? Dan niet opnieuw plannen — meten is de duurste stap die er is
  // (de web-zoekactie is ~94% van de meetkosten). Eén query voor alle prompts
  // tegelijk in plaats van één query per prompt.
  const { data: measuredRows } = await admin
    .from("tracking_runs")
    .select("prompt_id, repeat_index")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo)
    .not("mention_json", "is", null);

  const alreadyMeasured = new Set(
    (measuredRows ?? []).map((r) => `${r.prompt_id as string}:${(r.repeat_index as number) ?? 0}`),
  );
  const candidates = gepland.filter((g) => !alreadyMeasured.has(`${g.promptId}:${g.repeat}`));
  if (candidates.length === 0) return { planned: 0, totalPrompts: list.length };

  // Openstaand werk (van een eerdere, deels mislukte poging) er ook in één
  // query uit filteren — dat is precies het scenario dat de dedupe-index
  // (migratie 0013, alleen voor status queued/running) moet afvangen. De
  // index is PARTIEEL, dus `.upsert(..., { onConflict })` kan hem niet als
  // ON CONFLICT-doel gebruiken (Postgres eist dezelfde WHERE-clausule); dit
  // filtert vooraf i.p.v. op de index te vertrouwen.
  const candidateKeys = candidates.map((c) =>
    dedupe.measurePrompt(analysisId, c.promptId, weekNo, c.repeat),
  );
  const { data: openRows } = await admin
    .from("jobs")
    .select("dedupe_key")
    .in("dedupe_key", candidateKeys)
    .in("status", ["queued", "running"]);

  const alreadyQueued = new Set((openRows ?? []).map((r) => r.dedupe_key as string));
  const rows = candidates
    .filter((c) => !alreadyQueued.has(dedupe.measurePrompt(analysisId, c.promptId, weekNo, c.repeat)))
    .map((c) => ({
      promptId: c.promptId,
      repeat: c.repeat,
      type: "measure_prompt" as const,
      payload_json: { promptId: c.promptId, weekNo, repeatIndex: c.repeat } as never,
      analysis_id: analysisId,
      dedupe_key: dedupe.measurePrompt(analysisId, c.promptId, weekNo, c.repeat),
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
    .insert(rows.map(({ promptId: _promptId, repeat: _repeat, ...row }) => row))
    .select("id");
  if (!error) return { planned: (inserted ?? []).length, totalPrompts: list.length };
  if (error.code !== UNIQUE_VIOLATION) throw new Error(`Meting inplannen mislukt: ${error.message}`);

  let planned = 0;
  for (const row of rows) {
    const { created } = await enqueue(admin, {
      type: "measure_prompt",
      payload: { promptId: row.promptId, weekNo, repeatIndex: row.repeat },
      analysisId,
      dedupeKey: row.dedupe_key,
    });
    if (created) planned++;
  }
  return { planned, totalPrompts: list.length };
}
