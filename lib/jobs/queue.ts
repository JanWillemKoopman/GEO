import "server-only";
import { maySkip } from "@/lib/pipeline/elicit-rate";
import { aiOverviewEnabled } from "@/lib/ai-overview/registry";
import { AI_OVERVIEW_ENGINE, AI_OVERVIEW_REPEATS } from "@/lib/ai-overview/types";
import { llmResponseGeminiEnabled } from "@/lib/llm-responses/registry";
import { LLM_RESPONSE_GEMINI_ENGINE, LLM_RESPONSE_REPEATS } from "@/lib/llm-responses/types";

/**
 * Taken in de wachtrij zetten (optimalisatie.md fase 1).
 *
 * Alles loopt via `enqueue`, dat een `dedupeKey` afdwingt. Die sleutel is geen
 * detail: zonder dat zou dubbelklikken, een herladen scherm of twee werkers die
 * tegelijk hetzelfde vervolg plannen, dezelfde dure meting twee keer draaien.
 * De unieke index uit migratie 0013 vangt dat af op databaseniveau, dus ook
 * bij een echte race tussen twee processen, niet alleen bij netjes gedrag.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { type JobType, type JobPayloads } from "@/lib/jobs/types";
import { promptWeight } from "@/lib/pipeline/prompt-weight";
import { volumeBandOf } from "@/lib/pipeline/volume";
import { measureRepeats, repeatedPromptCount } from "@/lib/config";
import { dedupe } from "@/lib/jobs/dedupe";

type Admin = SupabaseClient;

/** Postgres-foutcode voor een schending van een unieke index. */
const UNIQUE_VIOLATION = "23505";

export interface EnqueueArgs<T extends JobType> {
  type: T;
  payload: JobPayloads[T];
  /**
   * Waar deze taak bij hoort. Precies één van de drie.
   *
   * ⚠️ `salesMarketId` is de derde soort eigenaar (migratie 0070). Een markt uit
   * de Sales-module is geen merk: een prospect is per definitie nog geen klant,
   * en er is dus geen `profiles`-rij om de taak aan op te hangen. De constraint
   * `jobs_has_owner` eist er één van de drie, dus een Sales-taak die geen markt
   * meegeeft wordt door de database geweigerd.
   */
  analysisId?: string | null;
  profileId?: string | null;
  salesMarketId?: string | null;
  /**
   * Bij welke MEETRONDE hoort deze taak (migratie 0071)? Alleen voor de
   * meetstappen, en altijd naast `salesMarketId`: de markt draagt het plafond,
   * de ronde draagt de voortgang. Zonder dit veld is niet te zien hoeveel
   * metingen er van rónde twee nog open staan, en dan weet de aggregatie niet
   * wanneer ze aan de beurt is.
   */
  salesRunId?: string | null;
  /**
   * Sleutel die dit specifieke werk identificeert. Bestaat er al een OPENSTAANDE
   * taak met dezelfde sleutel, dan doet deze aanroep niets. Klaar of definitief
   * mislukt werk blokkeert niet. Anders zou een retry onmogelijk zijn.
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
      sales_market_id: args.salesMarketId ?? null,
      sales_run_id: args.salesRunId ?? null,
      dedupe_key: args.dedupeKey,
      status: "queued" as const,
      scheduled_for: (args.scheduledFor ?? new Date()).toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    // Al ingepland. Dat is geen fout maar precies wat de sleutel moet doen.
    if (error.code === UNIQUE_VIOLATION) return { created: false, jobId: null };
    throw new Error(`Taak inplannen mislukt (${args.type}): ${error.message}`);
  }

  return { created: true, jobId: data.id as string };
}

// ── Sleutels op één plek ────────────────────────────────────────────────────
// Zodat "wanneer is dit hetzelfde werk?" één keer beantwoord wordt en niet per
// aanroepplek opnieuw bedacht.

export { dedupe } from "@/lib/jobs/dedupe";

/**
 * Zet voor elke ACTIEVE prompt van een analyse een meettaak klaar
 * (optimalisatie.md 1.3). Eén taak per prompt: dat is wat de meting binnen de
 * tijdslimiet houdt en wat fase 2 (meerdere metingen per vraag) straks
 * schaalbaar maakt.
 *
 * Deze functie draait zelf synchroon in de confirm-route (bevestigen ís het
 * startsein, zie route-commentaar). Met tot 30 actieve prompts liep een
 * sequentiële lus. Twee awaits per prompt, dus tot 60 keer heen-en-weer naar
 * Supabase, de functie-tijdslimiet van die route plat, waardoor de fetch op
 * de knop "Bevestig en start de meting" strandde zonder ooit een response te
 * krijgen ("Bevestigen mislukt. Probeer het opnieuw."). Nu twee bulk-queries
 * in plaats van 2×N sequentiële round-trips.
 *
 * Geeft terug hoeveel taken er daadwerkelijk bij kwamen, bij een tweede poging
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
  // negen vragen op 'nee', alle negen op basis van precies twee metingen, en die
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
  // zonder dat er iets veranderd was. Alles vaker meten kan niet, de meting is
  // 95% van de kosten, dus meten we de ZWAARSTWEGENDE vragen vaker en de rest
  // één keer. Precisie waar het geld zit.
  const gewicht = (p: (typeof list)[number]) =>
    promptWeight(volumeBandOf(p), p.intent_type as string | null);

  const teHerhalen = new Set(
    [...list]
      // Gelijk gewicht? Dan op id, zodat elke periode dezelfde vragen herhaalt.
      // Zonder die vaste volgorde bepaalt de toevallige rijvolgorde uit Postgres
      // wie er herhaald wordt, en dan verandert de nauwkeurigheid van een vraag
      // van periode tot periode. Precies de ruis die R6.1 moet wegnemen.
      .sort((a, b) => gewicht(b) - gewicht(a) || (a.id as string).localeCompare(b.id as string))
      .slice(0, repeatedPromptCount)
      .map((p) => p.id as string),
  );

  // Elke te plannen meting als (vraag, hoeveelste keer).
  const gepland = list.flatMap((p) => {
    const keren = teHerhalen.has(p.id as string) ? measureRepeats : 1;
    return Array.from({ length: keren }, (_, r) => ({ promptId: p.id as string, repeat: r }));
  });

  // Al gemeten? Dan niet opnieuw plannen, meten is de duurste stap die er is
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
  // query uit filteren. Dat is precies het scenario dat de dedupe-index
  // (migratie 0013, alleen voor status queued/running) moet afvangen. De
  // index is PARTIEEL, dus `.upsert(..., { onConflict })` kan hem niet als
  // ON CONFLICT-doel gebruiken (Postgres eist dezelfde WHERE-clausule); dit
  // filtert vooraf i.p.v. op de index te vertrouwen.
  // ── WAAROM HIER (NOG) GEEN UITWAAIERING PER ENGINE STAAT ─────────────────
  //
  // ✅ De blokkade die hier stond is op 20 september 2026 weggenomen. De
  // aggregatie is engine-bewust: `computeAggregates`, `measurementIsUsable` en
  // `countOpenPeriodicMeasurements` rekenen op `PRIMARY_ENGINE`
  // (`lib/engines/types.ts`), en de andere bronnen landen in
  // `visibility_scores.per_engine_json`. Het scenario in `test-chain.ts` legt
  // vast dat een tweede bron de score niet halveert.
  //
  // Wat er nog wél ontbreekt vóór hier per engine ingepland mag worden:
  //   1. een tweede bron die iets oplevert. Er is geen `GEMINI_API_KEY`, dus
  //      uitwaaieren zou vandaag alleen mislukte taken produceren;
  //   2. de tarieven van die bron in `lib/openai/pricing.ts`, anders staat er
  //      een meetronde in het kostenoverzicht met een prijs van nul.
  //
  // Zodra allebei geregeld zijn, is `enginesForProfile()` hier genoeg.
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
  // duwen, zie de doc-comment op deze functie). Een echte race met een
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

/**
 * De metingen via Google AI Overview inplannen voor één periode.
 *
 * ── WAAROM DIT EEN EIGEN PLANNER IS EN GEEN TAK IN `enqueueMeasurement` ─────
 *
 * Drie verschillen die geen van alle met een vlaggetje op te lossen zijn:
 *
 *   1. **Elke vraag gaat drie keer**, niet alleen de acht zwaarste. Bij ChatGPT
 *      kost dat $1,54 per cluster en hier $0,38, en daar zit precies de reden
 *      dat deze bron de moeite is (`lib/ai-overview/types.ts`).
 *   2. **Geen overslaanregel.** `maySkip()` rust op `elicit_samples`, en die
 *      tellers gaan sinds 20 september 2026 alleen over de primaire engine.
 *      Een vraag die bij ChatGPT structureel niets oplevert kan bij Google prima
 *      aanbieders noemen; die hier overslaan zou een aanname zijn in plaats van
 *      een meting.
 *   3. **Dit blokkeert de aggregatie niet.** De taken ketenen nergens heen, dus
 *      ze mogen later landen dan de ronde die de klant ziet.
 *
 * Doet niets zonder `AI_OVERVIEW_ENABLED=true`. Dat is een bewuste grendel en
 * geen voorzorg: zie `lib/ai-overview/registry.ts` voor waarom de sleutel hier
 * niet de schakelaar mag zijn.
 */
export async function enqueueAiOverviewMeasurement(
  admin: Admin,
  analysisId: string,
  weekNo: number,
): Promise<{ planned: number; totalPrompts: number }> {
  if (!aiOverviewEnabled()) return { planned: 0, totalPrompts: 0 };

  const { data: prompts } = await admin
    .from("prompts")
    .select("id")
    .eq("analysis_id", analysisId)
    .eq("active", true);

  const all = prompts ?? [];
  if (all.length === 0) return { planned: 0, totalPrompts: 0 };

  const gepland = all.flatMap((p) =>
    Array.from({ length: AI_OVERVIEW_REPEATS }, (_, r) => ({ promptId: p.id as string, repeat: r })),
  );

  // Al gemeten? Dan niet opnieuw inplannen. Zelfde kostenbescherming als bij de
  // ChatGPT-meting: een aanroep die al betaald is, doen we niet nog eens.
  const { data: gemeten } = await admin
    .from("tracking_runs")
    .select("prompt_id, repeat_index")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo)
    .eq("engine", AI_OVERVIEW_ENGINE)
    .not("mention_json", "is", null);

  const alGemeten = new Set(
    (gemeten ?? []).map((r) => `${r.prompt_id as string}:${(r.repeat_index as number) ?? 0}`),
  );
  const kandidaten = gepland.filter((g) => !alGemeten.has(`${g.promptId}:${g.repeat}`));
  if (kandidaten.length === 0) return { planned: 0, totalPrompts: all.length };

  const sleutels = kandidaten.map((c) =>
    dedupe.measureAiOverview(analysisId, c.promptId, weekNo, c.repeat),
  );
  const { data: openRows } = await admin
    .from("jobs")
    .select("dedupe_key")
    .in("dedupe_key", sleutels)
    .in("status", ["queued", "running"]);
  const alIngepland = new Set((openRows ?? []).map((r) => r.dedupe_key as string));

  const rows = kandidaten
    .filter((c) => !alIngepland.has(dedupe.measureAiOverview(analysisId, c.promptId, weekNo, c.repeat)))
    .map((c) => ({
      type: "measure_ai_overview" as const,
      payload_json: { promptId: c.promptId, weekNo, repeatIndex: c.repeat } as never,
      analysis_id: analysisId,
      dedupe_key: dedupe.measureAiOverview(analysisId, c.promptId, weekNo, c.repeat),
      status: "queued" as const,
      scheduled_for: new Date().toISOString(),
    }));

  if (rows.length === 0) return { planned: 0, totalPrompts: all.length };

  const { data: inserted, error } = await admin.from("jobs").insert(rows).select("id");
  if (error && error.code !== UNIQUE_VIOLATION) {
    throw new Error(`AI Overview-meting inplannen mislukt: ${error.message}`);
  }
  return { planned: (inserted ?? []).length, totalPrompts: all.length };
}

/**
 * De metingen via Gemini (DataForSEO) inplannen voor één periode. Zelfde
 * opzet als `enqueueAiOverviewMeasurement()`, met twee verschillen die uit
 * de besluiten van de eigenaar volgen
 * (docs/tasks/vier-meetbronnen-en-ai-zoekvolume.md):
 *
 *   1. **Eén meting per vraag, niet drie** (`LLM_RESPONSE_REPEATS`, keuze 2):
 *      bij $0,02 tot $0,065 per meting is drie keer meten al snel duurder dan
 *      de rest van de meetronde samen.
 *   2. **Geen overslaanregel**, zelfde reden als bij AI Overview: `maySkip()`
 *      rust op tellers die alleen over de primaire engine gaan.
 *
 * Doet niets zonder `DATAFORSEO_LLM_ENABLED=true`.
 */
export async function enqueueLlmResponseMeasurement(
  admin: Admin,
  analysisId: string,
  weekNo: number,
): Promise<{ planned: number; totalPrompts: number }> {
  if (!llmResponseGeminiEnabled()) return { planned: 0, totalPrompts: 0 };

  const { data: prompts } = await admin
    .from("prompts")
    .select("id")
    .eq("analysis_id", analysisId)
    .eq("active", true);

  const all = prompts ?? [];
  if (all.length === 0) return { planned: 0, totalPrompts: 0 };

  const gepland = all.flatMap((p) =>
    Array.from({ length: LLM_RESPONSE_REPEATS }, (_, r) => ({ promptId: p.id as string, repeat: r })),
  );

  // Al gemeten? Dan niet opnieuw inplannen. Zelfde kostenbescherming als bij
  // de andere twee bronnen.
  const { data: gemeten } = await admin
    .from("tracking_runs")
    .select("prompt_id, repeat_index")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo)
    .eq("engine", LLM_RESPONSE_GEMINI_ENGINE)
    .not("mention_json", "is", null);

  const alGemeten = new Set(
    (gemeten ?? []).map((r) => `${r.prompt_id as string}:${(r.repeat_index as number) ?? 0}`),
  );
  const kandidaten = gepland.filter((g) => !alGemeten.has(`${g.promptId}:${g.repeat}`));
  if (kandidaten.length === 0) return { planned: 0, totalPrompts: all.length };

  const sleutels = kandidaten.map((c) =>
    dedupe.measureLlmResponse(analysisId, c.promptId, weekNo, c.repeat),
  );
  const { data: openRows } = await admin
    .from("jobs")
    .select("dedupe_key")
    .in("dedupe_key", sleutels)
    .in("status", ["queued", "running"]);
  const alIngepland = new Set((openRows ?? []).map((r) => r.dedupe_key as string));

  const rows = kandidaten
    .filter((c) => !alIngepland.has(dedupe.measureLlmResponse(analysisId, c.promptId, weekNo, c.repeat)))
    .map((c) => ({
      type: "measure_llm_response" as const,
      payload_json: { promptId: c.promptId, weekNo, repeatIndex: c.repeat } as never,
      analysis_id: analysisId,
      dedupe_key: dedupe.measureLlmResponse(analysisId, c.promptId, weekNo, c.repeat),
      status: "queued" as const,
      scheduled_for: new Date().toISOString(),
    }));

  if (rows.length === 0) return { planned: 0, totalPrompts: all.length };

  const { data: inserted, error } = await admin.from("jobs").insert(rows).select("id");
  if (error && error.code !== UNIQUE_VIOLATION) {
    throw new Error(`Gemini-via-DataForSEO-meting inplannen mislukt: ${error.message}`);
  }
  return { planned: (inserted ?? []).length, totalPrompts: all.length };
}
