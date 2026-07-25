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
import { promptWeight } from "@/lib/pipeline/prompt-weight";
import { Mention } from "@/lib/schemas/mention";
import type { Analysis, AnalysisStatus, Prompt, TrackingRun } from "@/lib/types/database";

const SIMULATE_SYSTEM =
  "Je bent een behulpzame AI-assistent (zoals ChatGPT) die vragen van gebruikers beantwoordt. " +
  "Gebruik web search om actuele, feitelijke informatie te vinden. Noem concrete merken, bedrijven " +
  "of bronnen waar relevant voor het antwoord. Antwoord in het Nederlands, zoals je dat voor een " +
  "echte gebruiker zou doen die deze vraag stelt.";

const MENTION_SYSTEM =
  "Je analyseert een AI-gegenereerd antwoord op vermeldingen van merken/bedrijven. Werk secuur en " +
  "feitelijk: baseer je uitsluitend op wat er daadwerkelijk in de tekst staat.";

function buildMentionUser(
  ownLabel: string,
  ownAliases: string[],
  competitors: string[],
  rawResponse: string,
): string {
  return [
    `Eigen merk: ${ownLabel}`,
    ownAliases.length
      ? `Het eigen merk kan ook zo genoemd worden (tel deze als het EIGEN merk): ${ownAliases.join(", ")}`
      : "",
    competitors.length ? `Bekende concurrenten: ${competitors.join(", ")}` : "Bekende concurrenten: (geen bekend)",
    "",
    "Evalueer voor het EIGEN MERK en voor ELK van de bekende concurrenten hierboven expliciet of ze in " +
      "onderstaand antwoord genoemd worden — ook als het antwoord ze niet noemt (geef dan mentioned: false, " +
      "position: null, sentiment: \"neutral\", citedSources: []). Voeg daarnaast als aparte entiteiten eventuele " +
      "andere merken toe die wél genoemd worden maar niet in de lijst hierboven staan.",
    "",
    "AI-antwoord om te analyseren:",
    '"""',
    rawResponse,
    '"""',
  ].join("\n");
}

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

async function measureOnePrompt(
  admin: Admin,
  analysis: Analysis,
  ownLabel: string,
  ownAliases: string[],
  competitors: string[],
  prompt: Prompt,
  weekNo: number,
): Promise<void> {
  const { data: existing } = await admin
    .from("tracking_runs")
    .select("*")
    .eq("analysis_id", analysis.id)
    .eq("prompt_id", prompt.id)
    .eq("week_no", weekNo)
    .maybeSingle();

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

    const { data: inserted, error } = await admin
      .from("tracking_runs")
      .insert({
        analysis_id: analysis.id,
        prompt_id: prompt.id,
        prompt_text_snapshot: prompt.text,
        prompt_category_snapshot: prompt.category,
        // Gewicht bevriezen op meetmoment (volume × waarde), voor de gewogen score (§6 A3).
        prompt_weight: promptWeight(prompt.volume_estimate, prompt.intent_type),
        engine: "openai",
        model_used: MODELS.quality,
        week_no: weekNo,
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

  // 3b — het antwoord beoordelen (goedkoop, geen web_search). Retry-safe: leunt
  // op het al opgeslagen raw_response, herhaalt 3a nooit.
  const b = await callStructured({
    model: MODELS.volume,
    system: MENTION_SYSTEM,
    user: buildMentionUser(ownLabel, ownAliases, competitors, run.raw_response ?? ""),
    schema: Mention,
    schemaName: "mention",
    webSearch: false,
    temperature: TEMPERATURES.deterministic,
    meta: { kind: "measure_mention", analysisId: analysis.id, profileId: analysis.profile_id },
  });

  await admin.from("tracking_runs").update({ mention_json: b.parsed as never }).eq("id", run.id);

  // Genormaliseerd naar tracking_run_mentions (§5) — delete-then-insert voor idempotente retries.
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
  if (rows.length > 0) await admin.from("tracking_run_mentions").insert(rows);
}

/** 3c — pure aggregatie (geen AI-call): visibility_scores + competitor_breakdown. */
async function computeAggregates(admin: Admin, analysisId: string, weekNo: number): Promise<void> {
  const { data: runsFull } = await admin
    .from("tracking_runs")
    .select("id, prompt_category_snapshot, prompt_weight")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo);
  const runs = runsFull ?? [];
  if (runs.length === 0) return;

  const runIds = runs.map((r) => r.id as string);
  const categoryByRun = new Map(runs.map((r) => [r.id as string, r.prompt_category_snapshot as string]));
  // Gewicht per run (volume × waarde), bevroren op meetmoment. Fallback 0,1 (ondergrens).
  const weightByRun = new Map(runs.map((r) => [r.id as string, Number(r.prompt_weight ?? 0.1)]));

  const { data: mentionRows } = await admin.from("tracking_run_mentions").select("*").in("tracking_run_id", runIds);
  const mentions = mentionRows ?? [];

  // Eigen-merk-rij per run. De classificatie hoort er precies één per run te
  // geven, maar kan er meer teruggeven (bv. merknaam én alias als losse
  // entiteiten). Voorheen won dan willekeurig de LAATSTE rij, wat betekende dat
  // een "niet genoemd"-rij een "wel genoemd"-rij kon overschrijven en de score
  // stilletjes verlaagde. Nu een expliciete samenvoegregel (optimalisatie.md 0.3):
  // genoemd wint van niet-genoemd; bij twee keer genoemd telt de vroegste positie.
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

  // Alleen BEOORDEELDE runs tellen mee in de score (optimalisatie.md 0.2, zelfde
  // regel als in report.ts). Een run zonder eigen-merk-oordeel betekent dat 3b
  // faalde — dat is onbekend, niet "niet genoemd". Meetellen als niet-genoemd
  // zou de score verlagen door een technisch probleem, en score en rapport
  // zouden elkaar tegenspreken.
  const judgedRunIds = runIds.filter((id) => ownByRun.has(id));
  const judgedRuns = judgedRunIds.length;
  if (judgedRuns < runIds.length) {
    console.warn(
      `Analyse ${analysisId} week ${weekNo}: ${runIds.length - judgedRuns} van ${runIds.length} ` +
        `metingen zonder eigen-merk-oordeel; die tellen niet mee in de score.`,
    );
  }

  const ownMentionedCount = Array.from(ownByRun.values()).filter((m) => m.mentioned).length;
  const score = judgedRuns > 0 ? Math.round((ownMentionedCount / judgedRuns) * 100) : 0;

  // Gewogen zichtbaarheid: Σ gewicht van beoordeelde runs waarin het merk
  // genoemd wordt ÷ Σ gewicht van alle beoordeelde runs.
  const totalWeight = judgedRunIds.reduce((sum, id) => sum + (weightByRun.get(id) ?? 0.1), 0);
  const ownWeight = judgedRunIds.reduce((sum, id) => {
    const own = ownByRun.get(id);
    return sum + (own?.mentioned ? (weightByRun.get(id) ?? 0.1) : 0);
  }, 0);
  const weightedScore = totalWeight > 0 ? Math.round((ownWeight / totalWeight) * 100) : 0;

  const competitorRows = mentions.filter((m) => !m.is_own_brand);
  const competitorMentionedTotal = competitorRows.filter((m) => m.mentioned).length;
  const shareOfVoice =
    ownMentionedCount + competitorMentionedTotal > 0
      ? Math.round((ownMentionedCount / (ownMentionedCount + competitorMentionedTotal)) * 100)
      : null;

  await admin
    .from("visibility_scores")
    .upsert(
      { analysis_id: analysisId, week_no: weekNo, score, weighted_score: weightedScore, share_of_voice: shareOfVoice },
      { onConflict: "analysis_id,week_no" },
    );

  const byCompetitor = new Map<string, typeof competitorRows>();
  for (const m of competitorRows) {
    const list = byCompetitor.get(m.entity_name) ?? [];
    list.push(m);
    byCompetitor.set(m.entity_name, list);
  }

  await admin.from("competitor_breakdown").delete().eq("analysis_id", analysisId).eq("week_no", weekNo);

  const breakdownRows = Array.from(byCompetitor.entries()).map(([competitor, ms]) => {
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
      competitor_name: competitor,
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
 * Voert de meting uit voor één analyse/week. Bij `weekNo = 0` (nulmeting) zet
 * dit ook de statusovergang meten → gemeten (abcplan.md §6 A3, MVP-versnelling).
 * Bij latere weken (wekelijkse lus, Sprint 4-cron) blijft de status ongemoeid.
 */
export async function measureAnalysis(id: string, weekNo = 0): Promise<AnalysisStatus> {
  const admin = createAdminClient();

  const { data: analysis } = await admin.from("analyses").select("*").eq("id", id).single();
  if (!analysis) throw new Error(`Analyse ${id} niet gevonden.`);
  const typedAnalysis = analysis as Analysis;

  const isNulmeting = weekNo === 0;
  if (isNulmeting) {
    const eligible = typedAnalysis.status === "meten" || typedAnalysis.status === "mislukt";
    if (!eligible) return typedAnalysis.status;

    if (typedAnalysis.status === "mislukt") {
      // Alleen aanpakken als dit een mislukte MÉTING is (prompts bestaan al —
      // een mislukte VOORBEREIDING heeft dat nog niet). Zie prepare.ts voor het spiegelbeeld.
      const { count } = await admin
        .from("prompts")
        .select("*", { count: "exact", head: true })
        .eq("analysis_id", id);
      if (!count) return "mislukt";
    }
  }

  const [{ data: profile }, { data: topicResearch }, { data: activePrompts }] = await Promise.all([
    admin.from("profiles").select("brand_name, aliases, competitors").eq("id", typedAnalysis.profile_id).maybeSingle(),
    admin.from("topic_research").select("competitors").eq("analysis_id", id).maybeSingle(),
    admin.from("prompts").select("*").eq("analysis_id", id).eq("active", true),
  ]);

  // Gebruik de canonieke merknaam voor mention-detectie (een AI-antwoord noemt
  // "Golden Fingers", niet het domein) — nauwkeuriger dan alleen de URL.
  const base = profile?.brand_name ?? typedAnalysis.url;
  const ownLabel = `${base} (${typedAnalysis.topic})`;
  // Aliassen (§12.24) tellen ook als het eigen merk — verbetert de mention-detectie.
  const ownAliases: string[] = profile?.aliases ?? [];
  // Gededupliceerde unie: onderwerp-specifieke concurrenten + algemene bedrijfsconcurrenten.
  const competitors: string[] = Array.from(
    new Set([...(topicResearch?.competitors ?? []), ...(profile?.competitors ?? [])]),
  );
  const prompts = (activePrompts ?? []) as Prompt[];

  try {
    const results = await Promise.allSettled(
      prompts.map((p) => measureOnePrompt(admin, typedAnalysis, ownLabel, ownAliases, competitors, p, weekNo)),
    );
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

    // Deels gelukt is GELUKT (optimalisatie.md 0.4b). Voorheen liet één mislukte
    // prompt de hele meting falen, inclusief de elf die wél slaagden: de klant
    // zag "mislukt" terwijl er bruikbare data lag, en een nieuwe poging kostte
    // opnieuw tijd. Nu bepaalt een drempel of het resultaat bruikbaar is.
    //
    // De al gemeten prompts blijven hoe dan ook bewaard (idempotent per prompt),
    // dus een volgende poging vult alleen de gaten en meet niets dubbel.
    if (failed.length > 0) {
      const reason = failed[0].reason;
      const detail = reason instanceof Error ? reason.message : String(reason);
      const succeeded = results.length - failed.length;

      // Onder de drempel is het geen meting meer maar een steekproef met te
      // weinig grond — dan liever eerlijk falen dan een misleidende score tonen.
      const ratio = results.length > 0 ? succeeded / results.length : 0;
      if (succeeded === 0 || ratio < MIN_SUCCESS_RATIO) {
        throw new Error(
          `${failed.length} van ${results.length} prompts mislukt tijdens meting. Eerste fout: ${detail}`,
        );
      }

      console.warn(
        `Analyse ${id} week ${weekNo}: ${failed.length} van ${results.length} prompts mislukt, ` +
          `meting gaat door met ${succeeded}. Eerste fout: ${detail}`,
      );
    }

    await computeAggregates(admin, id, weekNo);

    if (isNulmeting) {
      await admin.from("analyses").update({ status: "gemeten" }).eq("id", id);
      return "gemeten";
    }
    return typedAnalysis.status;
  } catch (err) {
    if (isNulmeting) {
      await admin.from("analyses").update({ status: "mislukt" }).eq("id", id);
    }
    throw err;
  }
}
