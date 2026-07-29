import "server-only";

/**
 * Halte A3 — Monitoring (abcplan.md §6 A3): voor elke actieve prompt een
 * nulmeting (of wekelijkse meting): 3a (vraag stellen, web_search) → 3b
 * (antwoord beoordelen, per entiteit) → 3c (aggregatie, geen AI-call).
 *
 * Idempotent per prompt: bestaat er al een tracking_run met raw_response voor
 * deze prompt/week, dan wordt 3a NOOIT herhaald (kostenbescherming, §12.18) —
 * alleen een ontbrekende 3b (mention_json) wordt opnieuw geprobeerd.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { callPlain, callStructured } from "@/lib/openai/structured";
import { MODELS, TEMPERATURES, SIMULATION_TEMPERATURE } from "@/lib/openai/models";
import { measureWebSearchEnabled } from "@/lib/config";
import { promptWeight, NEUTRAL_WEIGHT } from "@/lib/pipeline/prompt-weight";
import { volumeBandOf } from "@/lib/pipeline/volume";
import { Mention } from "@/lib/schemas/mention";
import { ensureKnownEntities, resolveEntity } from "@/lib/entities/resolve";
import { binomialStderr, weightedScoreStderr } from "@/lib/stats/uncertainty";
// Gedeeld met scripts/eval-mention.ts, zodat de test exact de productie-prompt
// beoordeelt en niet een kopie die kan gaan afwijken (optimalisatie.md 0.7).
import { MENTION_SYSTEM, buildMentionUser } from "@/lib/openai/mention-prompt";
import type { Analysis, AnalysisStatus, Prompt, TrackingRun } from "@/lib/types/database";

const SIMULATE_SYSTEM =
  "Je bent een behulpzame AI-assistent (zoals ChatGPT) die vragen van gebruikers beantwoordt. " +
  "Gebruik web search om actuele, feitelijke informatie te vinden. Noem concrete merken, bedrijven " +
  "of bronnen waar relevant voor het antwoord. Antwoord in het Nederlands, zoals je dat voor een " +
  "echte gebruiker zou doen die deze vraag stelt.";

type Admin = SupabaseClient;

/**
 * Welk deel van de prompts moet minimaal slagen voordat we de meting bruikbaar
 * noemen (optimalisatie.md 0.4b)? Onder deze drempel is de score gebaseerd op
 * te weinig vragen om iets te betekenen, en falen we liever eerlijk.
 *
 * Met de retries uit 0.4 zou een enkele mislukking al zeldzaam moeten zijn; deze
 * drempel is het vangnet daaronder, niet de eerste verdedigingslinie.
 */
const MIN_SUCCESS_RATIO = 0.7;

/**
 * Onder hoeveel tekens we een antwoord als MISLUKT beschouwen in plaats van als
 * meetresultaat (optimalisatie.md 0.2, doorgetrokken naar halte 3a).
 *
 * De simulatie-call kan een lege of afgekapte string teruggeven: een weigering,
 * een web_search die niets opleverde, of een respons die alleen uit een
 * tool-aanroep bestond. `output_text` is dan "" — en dat werd tot nu toe gewoon
 * opgeslagen. Stap 3b beoordeelt vervolgens een leeg antwoord, concludeert
 * volkomen terecht "niet genoemd", en dat oordeel gaat als echte meting de score
 * in. Het resultaat is een score die te laag is zonder dat iemand het kan zien,
 * plus een "gemiste vraag" in het rapport waar een pagina voor geschreven wordt.
 *
 * Een leeg antwoord is geen nulscore maar een meetfout. Gooien betekent dat de
 * wachtrij het opnieuw vraagt, en blijft het misgaan, dan valt deze ene vraag
 * netjes buiten de drempel hierboven in plaats van de uitslag te vertekenen.
 *
 * 40 tekens is ruim onder elk echt antwoord ("Daar kan ik je niet mee helpen."
 * is al 33) en ruim boven leeg.
 */
const MIN_ANSWER_CHARS = 40;

/**
 * Waarvoor deze meting gedaan wordt (optimalisatie.md 5.3).
 *
 * Een impactmeting betreft maar een handvol vragen en mag daarom NOOIT
 * meetellen in de zichtbaarheidsscore — anders gaat een meting van drie vragen
 * als score over drie vragen het dashboard op, en dat is een grafiek die liegt.
 */
export interface MeasurePurpose {
  purpose: "periodic" | "impact" | "control";
  contentPieceId: string;
  wave: number;
}

export async function measureOnePrompt(
  admin: Admin,
  analysis: Analysis,
  ownLabel: string,
  ownAliases: string[],
  competitors: string[],
  prompt: Prompt,
  weekNo: number,
  /** Weglaten voor de gewone (periodieke) meting. */
  impact?: MeasurePurpose,
): Promise<void> {
  // De idempotentie-sleutel verschilt per soort meting. Bij een periodieke
  // meting is (analyse, prompt, periode) genoeg; bij een impactmeting hangt hij
  // aan de pagina en de golf, want dezelfde prompt kan in dezelfde periode
  // zowel periodiek als voor twee verschillende pagina's gemeten worden.
  const query = admin
    .from("tracking_runs")
    .select("*")
    .eq("analysis_id", analysis.id)
    .eq("prompt_id", prompt.id);

  const { data: existing } = impact
    ? await query
        .eq("content_piece_id", impact.contentPieceId)
        .eq("impact_wave", impact.wave)
        .eq("purpose", impact.purpose)
        .maybeSingle()
    : await query.eq("week_no", weekNo).eq("purpose", "periodic").maybeSingle();

  let run = existing as TrackingRun | null;

  if (!run) {
    // 3a — de vraag stellen (duur, web_search). Wordt NOOIT herhaald zodra dit slaagt.
    // Model: gpt-4.1-mini i.p.v. nano. De web_search-tool werkt niet betrouwbaar
    // op nano (meting faalde 10/10 met web_search op nano); mini is bewezen (het
    // Brand DNA gebruikt dezelfde combinatie succesvol). Dit valt onder de
    // fallback-regel uit abcplan.md §2. De web_search-kosten (vast tarief per call)
    // domineren toch, dus het modelverschil is verwaarloosbaar (~$0,003/prompt).
    //
    // Grounding (web_search) is via MEASURE_WEB_SEARCH uitschakelbaar voor de
    // ontwikkelfase (kostenbesparend). Uit → de AI antwoordt uit eigen kennis.
    // Bewust GEEN temperature (SIMULATION_TEMPERATURE): we willen weten wat een
    // AI-assistent een echte gebruiker antwoordt, en die draait ook op de
    // standaardinstellingen. Zelf temperatuur forceren maakt de meting juist
    // onrealistisch. De ruis die dit oplevert lossen we op met méér metingen
    // per vraag (optimalisatie.md 2.1), niet met een lagere temperatuur.
    const a = await callPlain({
      model: MODELS.quality,
      system: SIMULATE_SYSTEM,
      user: prompt.text,
      webSearch: measureWebSearchEnabled,
      temperature: SIMULATION_TEMPERATURE,
      meta: { kind: "measure_simulate", analysisId: analysis.id, profileId: analysis.profile_id },
    });

    // Vóór het opslaan controleren, niet erna: eenmaal opgeslagen wordt 3a nooit
    // meer herhaald (de kostenbescherming hierboven), en dan zou een leeg
    // antwoord voorgoed als meting blijven staan.
    if (a.text.trim().length < MIN_ANSWER_CHARS) {
      throw new Error(
        `Lege of onbruikbaar korte respons bij het meten van prompt ${prompt.id} ` +
          `(${a.text.trim().length} tekens). Dit is een meetfout, geen nulscore.`,
      );
    }

    const { data: inserted, error } = await admin
      .from("tracking_runs")
      .insert({
        analysis_id: analysis.id,
        prompt_id: prompt.id,
        prompt_text_snapshot: prompt.text,
        prompt_category_snapshot: prompt.category,
        // Gewicht bevriezen op meetmoment (volumeband × waarde), voor de gewogen
        // score (§6 A3). Past de klant de band later aan, dan telt dat pas mee
        // vanaf de volgende meting — een score met terugwerkende kracht
        // veranderen maakt de trend onvergelijkbaar.
        prompt_weight: promptWeight(volumeBandOf(prompt), prompt.intent_type),
        engine: "openai",
        model_used: MODELS.quality,
        week_no: weekNo,
        purpose: impact?.purpose ?? "periodic",
        content_piece_id: impact?.contentPieceId ?? null,
        impact_wave: impact?.wave ?? null,
        raw_response: a.text,
        raw_response_received_at: new Date().toISOString(),
        openai_response_id: a.responseId,
        tokens_used: a.tokensUsed,
        // Kosten van 3a op de meting zelf (optimalisatie.md 0.6). De kolom
        // bestond al vanaf migratie 0001 maar werd nooit gevuld. De 3b-kosten
        // staan in het ai_calls-logboek; 3a is verreweg de grootste post omdat
        // daar de web_search in zit.
        cost_usd: a.costUsd,
      })
      .select("*")
      .single();

    if (error || !inserted) throw new Error(`Opslaan van 3a mislukt voor prompt ${prompt.id}.`);
    run = inserted as TrackingRun;
  }

  if (run.mention_json) return; // 3b al gedaan — niets te doen (idempotent)

  // Een eerder opgeslagen leeg antwoord (van vóór de controle hierboven) mag
  // niet alsnog als "niet genoemd" de score in. De rij weggooien en gooien:
  // de volgende poging stelt de vraag opnieuw. Dat is begrensd door het aantal
  // pogingen van de taak, dus het kan niet ontsporen in herhaalde kosten.
  if ((run.raw_response ?? "").trim().length < MIN_ANSWER_CHARS) {
    await admin.from("tracking_runs").delete().eq("id", run.id);
    throw new Error(
      `Opgeslagen meting van prompt ${prompt.id} bevat geen bruikbaar antwoord; ` +
        `de meting wordt opnieuw gedaan.`,
    );
  }

  // 3b — het antwoord beoordelen (goedkoop, geen web_search). Retry-safe: leunt
  // op het al opgeslagen raw_response, herhaalt 3a nooit.
  const b = await callStructured({
    model: MODELS.volume,
    system: MENTION_SYSTEM,
    user: buildMentionUser({ ownLabel, ownAliases, competitors, rawResponse: run.raw_response ?? "" }),
    schema: Mention,
    schemaName: "mention",
    webSearch: false,
    temperature: TEMPERATURES.deterministic,
    meta: { kind: "measure_mention", analysisId: analysis.id, profileId: analysis.profile_id },
  });

  // Genormaliseerd naar tracking_run_mentions (§5) — delete-then-insert voor idempotente retries.
  //
  // De VOLGORDE is hier wezenlijk: eerst de losse oordeelsrijen, dan pas
  // `mention_json`. Dat laatste veld is namelijk waaraan de rest van de app ziet
  // dat een vraag beoordeeld is (measurementIsUsable telt erop). Andersom kon de
  // vlag gezet worden terwijl de insert stukliep — dan telde de meting als
  // geslaagd voor de drempel, maar als ONBEOORDEELD in de score. Nu is
  // `mention_json` het sluitstuk: staat hij er, dan staat de rest er ook.
  await admin.from("tracking_run_mentions").delete().eq("tracking_run_id", run.id);
  const rows = b.parsed.mentions.map((m) => ({
    tracking_run_id: run!.id,
    entity_name: m.entity,
    is_own_brand: m.isOwnBrand,
    mentioned: m.mentioned,
    position: m.position,
    sentiment: m.sentiment,
    cited_sources: m.citedSources,
  }));
  if (rows.length > 0) {
    const { error: rowsError } = await admin.from("tracking_run_mentions").insert(rows);
    if (rowsError) {
      throw new Error(`Oordeel opslaan mislukt voor meting ${run.id}: ${rowsError.message}`);
    }
  }

  const { error: judgedError } = await admin
    .from("tracking_runs")
    .update({ mention_json: b.parsed as never })
    .eq("id", run.id);
  if (judgedError) {
    // Stil falen zou betekenen dat een al betaalde meting voorgoed onbeoordeeld
    // blijft en de meting onder de drempel kan duwen terwijl de data er is.
    throw new Error(`Beoordeling vastleggen mislukt voor meting ${run.id}: ${judgedError.message}`);
  }
}

/**
 * 3c — aggregatie (geen AI-aanroep): visibility_scores + competitor_breakdown.
 *
 * Doet sinds fase 2 drie dingen extra (optimalisatie.md 2.2/2.4/2.5):
 *   • merknamen samenvoegen tot één entiteit per bedrijf
 *   • de onzekerheid van de score berekenen en opslaan
 *   • het aandeel over een VASTE set entiteiten berekenen
 */
export async function computeAggregates(admin: Admin, analysisId: string, weekNo: number): Promise<void> {
  const { data: runsFull } = await admin
    .from("tracking_runs")
    .select("id, prompt_category_snapshot, prompt_weight")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo)
    // Impact- en controlemetingen (optimalisatie.md 5.3) horen hier niet bij:
    // die betreffen een handvol vragen en zouden de score vertekenen.
    .eq("purpose", "periodic");
  const runs = runsFull ?? [];
  if (runs.length === 0) return;

  const { data: analysisRow } = await admin
    .from("analyses")
    .select("profile_id")
    .eq("id", analysisId)
    .single();
  const profileId = analysisRow?.profile_id as string | undefined;
  if (!profileId) throw new Error(`Analyse ${analysisId} heeft geen profiel.`);

  const runIds = runs.map((r) => r.id as string);
  const categoryByRun = new Map(runs.map((r) => [r.id as string, r.prompt_category_snapshot as string]));
  // Gewicht per run (volume × waarde), bevroren op meetmoment. Ontbreekt het
  // (oude rij, of handmatige prompt zonder tags), dan het NEUTRALE gewicht —
  // niet de ondergrens, zie NEUTRAL_WEIGHT (optimalisatie.md 0.10).
  const weightByRun = new Map(runs.map((r) => [r.id as string, Number(r.prompt_weight ?? NEUTRAL_WEIGHT)]));

  const { data: mentionRows } = await admin.from("tracking_run_mentions").select("*").in("tracking_run_id", runIds);
  const mentions = mentionRows ?? [];

  // ── Entiteiten samenvoegen (optimalisatie.md 2.4) ──────────────────────────
  // De bekende concurrenten worden meteen bevestigd; die vormen de vaste noemer
  // van het aandeel. Namen die alleen uit een AI-antwoord komen zijn nieuw en
  // moeten eerst door de klant bevestigd worden.
  const [{ data: profileRow }, { data: topicRow }] = await Promise.all([
    admin.from("profiles").select("competitors").eq("id", profileId).maybeSingle(),
    admin.from("topic_research").select("competitors").eq("analysis_id", analysisId).maybeSingle(),
  ]);
  const knownCompetitors = Array.from(
    new Set([...(topicRow?.competitors ?? []), ...(profileRow?.competitors ?? [])]),
  );
  const index = await ensureKnownEntities(admin, profileId, knownCompetitors);

  // Elke gemeten naam koppelen aan z'n entiteit. Het eigen merk slaan we over:
  // dat is geen concurrent en heeft z'n eigen behandeling.
  const entityByMention = new Map<string, string>(); // mention.id → entity.id
  for (const m of mentions) {
    if (m.is_own_brand) continue;
    const entity = await resolveEntity(admin, profileId, index, m.entity_name as string);
    if (!entity) continue;
    entityByMention.set(m.id as string, entity.id);
    if (m.entity_id !== entity.id) {
      await admin.from("tracking_run_mentions").update({ entity_id: entity.id }).eq("id", m.id);
    }
  }
  const entityById = new Map(index.all.map((e) => [e.id, e]));

  // ── Eigen merk per run ─────────────────────────────────────────────────────
  // De classificatie hoort er precies één per run te geven, maar kan er meer
  // teruggeven (bv. merknaam én alias als losse entiteiten). Voorheen won dan
  // willekeurig de LAATSTE rij, wat betekende dat een "niet genoemd"-rij een
  // "wel genoemd"-rij kon overschrijven en de score stilletjes verlaagde. Nu een
  // expliciete regel (optimalisatie.md 0.3): genoemd wint van niet-genoemd; bij
  // twee keer genoemd telt de vroegste positie.
  const ownByRun = new Map<string, (typeof mentions)[number]>();
  for (const m of mentions) {
    if (!m.is_own_brand) continue;
    const current = ownByRun.get(m.tracking_run_id);
    if (!current) {
      ownByRun.set(m.tracking_run_id, m);
      continue;
    }
    if (m.mentioned && !current.mentioned) {
      ownByRun.set(m.tracking_run_id, m);
      continue;
    }
    if (m.mentioned && current.mentioned) {
      const currentPos = current.position ?? Number.MAX_SAFE_INTEGER;
      const candidatePos = m.position ?? Number.MAX_SAFE_INTEGER;
      if (candidatePos < currentPos) ownByRun.set(m.tracking_run_id, m);
    }
  }

  // Alleen BEOORDEELDE runs tellen mee (optimalisatie.md 0.2, zelfde regel als
  // in report.ts). Een run zonder eigen-merk-oordeel betekent dat 3b faalde —
  // dat is onbekend, niet "niet genoemd".
  const judgedRunIds = runIds.filter((id) => ownByRun.has(id));
  const judgedRuns = judgedRunIds.length;
  if (judgedRuns < runIds.length) {
    console.warn(
      `Analyse ${analysisId} periode ${weekNo}: ${runIds.length - judgedRuns} van ${runIds.length} ` +
        `metingen zonder eigen-merk-oordeel; die tellen niet mee in de score.`,
    );
  }

  const ownMentionedCount = Array.from(ownByRun.values()).filter((m) => m.mentioned).length;
  const score = judgedRuns > 0 ? Math.round((ownMentionedCount / judgedRuns) * 100) : 0;

  // Gewogen zichtbaarheid: Σ gewicht van beoordeelde runs waarin het merk
  // genoemd wordt ÷ Σ gewicht van alle beoordeelde runs.
  const totalWeight = judgedRunIds.reduce((sum, id) => sum + (weightByRun.get(id) ?? NEUTRAL_WEIGHT), 0);
  const ownWeight = judgedRunIds.reduce((sum, id) => {
    const own = ownByRun.get(id);
    return sum + (own?.mentioned ? (weightByRun.get(id) ?? NEUTRAL_WEIGHT) : 0);
  }, 0);
  const weightedScore = totalWeight > 0 ? Math.round((ownWeight / totalWeight) * 100) : 0;

  // ── Onzekerheid (optimalisatie.md 2.2) ─────────────────────────────────────
  const stderr = binomialStderr(ownMentionedCount, judgedRuns);
  const weightedStderr = weightedScoreStderr(
    judgedRunIds.map((id) => ({
      weight: weightByRun.get(id) ?? NEUTRAL_WEIGHT,
      mentioned: Boolean(ownByRun.get(id)?.mentioned),
    })),
  );

  // ── Aandeel over een VASTE set (optimalisatie.md 2.5) ──────────────────────
  // Voorheen: eigen ÷ (eigen + álle concurrentvermeldingen). Die noemer groeide
  // met elk merk dat de classificatie toevallig ontdekte, waardoor het aandeel
  // daalde zonder dat de klant iets verkeerd deed — en twee periodes niet
  // vergelijkbaar waren. Nu tellen alleen BEVESTIGDE, niet-weggezette
  // entiteiten mee; nieuw ontdekte merken wachten op de klant (2.7).
  const competitorRows = mentions.filter((m) => !m.is_own_brand);
  const inBasis = (m: (typeof mentions)[number]) => {
    const entityId = entityByMention.get(m.id as string);
    const entity = entityId ? entityById.get(entityId) : undefined;
    return Boolean(entity?.confirmed && !entity.dismissed);
  };
  const basisMentions = competitorRows.filter((m) => m.mentioned && inBasis(m)).length;
  const basisEntities = new Set(
    competitorRows.filter(inBasis).map((m) => entityByMention.get(m.id as string)),
  );
  const shareOfVoice =
    ownMentionedCount + basisMentions > 0
      ? Math.round((ownMentionedCount / (ownMentionedCount + basisMentions)) * 100)
      : null;

  await admin.from("visibility_scores").upsert(
    {
      analysis_id: analysisId,
      week_no: weekNo,
      score,
      weighted_score: weightedScore,
      share_of_voice: shareOfVoice,
      judged_runs: judgedRuns,
      score_stderr: stderr,
      weighted_stderr: weightedStderr,
      // +1 voor het eigen merk: de noemer is "wij plus de bevestigde concurrenten".
      share_basis_count: basisEntities.size + 1,
    },
    { onConflict: "analysis_id,week_no" },
  );

  // ── Uitsplitsing per concurrent, gegroepeerd op ENTITEIT ───────────────────
  const byEntity = new Map<string, typeof competitorRows>();
  for (const m of competitorRows) {
    const entityId = entityByMention.get(m.id as string);
    if (!entityId) continue;
    const list = byEntity.get(entityId) ?? [];
    list.push(m);
    byEntity.set(entityId, list);
  }

  await admin.from("competitor_breakdown").delete().eq("analysis_id", analysisId).eq("week_no", weekNo);

  const breakdownRows = Array.from(byEntity.entries()).map(([entityId, ms]) => {
    const byCategoryCounts: Record<string, number> = {};
    const sources = new Set<string>();
    const winningRunIds: string[] = [];
    const losingRunIds: string[] = [];

    for (const m of ms) {
      if (m.mentioned) {
        const cat = categoryByRun.get(m.tracking_run_id) ?? "Onbekend";
        byCategoryCounts[cat] = (byCategoryCounts[cat] ?? 0) + 1;
        for (const s of m.cited_sources ?? []) sources.add(s);
      }
      const own = ownByRun.get(m.tracking_run_id);
      if (m.mentioned && own && !own.mentioned) winningRunIds.push(m.tracking_run_id);
      if (!m.mentioned && own && own.mentioned) losingRunIds.push(m.tracking_run_id);
    }

    return {
      analysis_id: analysisId,
      week_no: weekNo,
      // De weergavenaam van de entiteit, niet de toevallige schrijfwijze uit
      // één antwoord — anders heet dezelfde concurrent elke periode anders.
      competitor_name: entityById.get(entityId)?.canonical_name ?? "Onbekend",
      mentions_count: ms.filter((m) => m.mentioned).length,
      mentions_by_category_json: byCategoryCounts,
      top_cited_sources: Array.from(sources).slice(0, 5),
      winning_run_ids: winningRunIds,
      losing_run_ids: losingRunIds,
    };
  });

  if (breakdownRows.length > 0) await admin.from("competitor_breakdown").insert(breakdownRows);
}

/**
 * De gedeelde context die elke meting nodig heeft: hoe heet het eigen merk, hoe
 * kan het nog meer genoemd worden, en wie zijn de concurrenten.
 *
 * Wordt per meettaak opnieuw geladen in plaats van meegegeven in de payload
 * (optimalisatie.md 1.3): past de klant halverwege z'n concurrentenlijst aan,
 * dan meten de resterende vragen meteen tegen de nieuwe lijst. Drie kleine
 * queries per prompt is die correctheid waard.
 */
export interface MeasureContext {
  analysis: Analysis;
  ownLabel: string;
  ownAliases: string[];
  competitors: string[];
}

export async function loadMeasureContext(admin: Admin, analysisId: string): Promise<MeasureContext> {
  const { data: analysisRow } = await admin.from("analyses").select("*").eq("id", analysisId).single();
  if (!analysisRow) throw new Error(`Analyse ${analysisId} niet gevonden.`);
  const analysis = analysisRow as Analysis;

  const [{ data: profile }, { data: topicResearch }] = await Promise.all([
    admin.from("profiles").select("brand_name, aliases, competitors").eq("id", analysis.profile_id).maybeSingle(),
    admin.from("topic_research").select("competitors").eq("analysis_id", analysisId).maybeSingle(),
  ]);

  // Gebruik de canonieke merknaam voor mention-detectie (een AI-antwoord noemt
  // "Golden Fingers", niet het domein) — nauwkeuriger dan alleen de URL.
  const base = profile?.brand_name ?? analysis.url;
  return {
    analysis,
    ownLabel: `${base} (${analysis.topic})`,
    // Aliassen (§12.24) tellen ook als het eigen merk — verbetert de detectie.
    ownAliases: (profile?.aliases as string[] | null) ?? [],
    // Gededupliceerde unie: onderwerp-specifieke + algemene bedrijfsconcurrenten.
    competitors: Array.from(
      new Set([...(topicResearch?.competitors ?? []), ...(profile?.competitors ?? [])]),
    ),
  };
}

/**
 * Meet één prompt binnen een analyse. Dit is wat een `measure_prompt`-taak doet.
 * Idempotent: is deze prompt voor deze week al gemeten, dan gebeurt er niets.
 */
export async function measurePromptById(
  analysisId: string,
  promptId: string,
  weekNo: number,
  impact?: MeasurePurpose,
): Promise<void> {
  const admin = createAdminClient();
  const ctx = await loadMeasureContext(admin, analysisId);

  const { data: promptRow } = await admin.from("prompts").select("*").eq("id", promptId).maybeSingle();
  if (!promptRow) {
    // Prompt verwijderd terwijl de taak in de rij stond — geen fout, niets te doen.
    console.warn(`Prompt ${promptId} bestaat niet meer; meting overgeslagen.`);
    return;
  }

  await measureOnePrompt(
    admin,
    ctx.analysis,
    ctx.ownLabel,
    ctx.ownAliases,
    ctx.competitors,
    promptRow as Prompt,
    weekNo,
    impact,
  );
}

/**
 * Zijn er genoeg vragen gemeten om een bruikbare score op te baseren
 * (optimalisatie.md 0.4b)? Onder de drempel is het geen meting meer maar een
 * steekproef met te weinig grond, en tonen we liever niets dan een misleidend
 * cijfer. Wordt aangeroepen door de aggregatietaak, die als laatste draait.
 */
export async function measurementIsUsable(
  admin: Admin,
  analysisId: string,
  weekNo: number,
): Promise<{ usable: boolean; measured: number; expected: number }> {
  const [{ count: expected }, { count: measured }] = await Promise.all([
    admin
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", analysisId)
      .eq("active", true),
    admin
      .from("tracking_runs")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", analysisId)
      .eq("week_no", weekNo)
      .eq("purpose", "periodic")
      .not("mention_json", "is", null),
  ]);

  const exp = expected ?? 0;
  const got = measured ?? 0;
  const ratio = exp > 0 ? got / exp : 0;
  return { usable: got > 0 && ratio >= MIN_SUCCESS_RATIO, measured: got, expected: exp };
}
