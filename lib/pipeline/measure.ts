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
import { MODELS } from "@/lib/openai/models";
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

function buildMentionUser(ownLabel: string, competitors: string[], rawResponse: string): string {
  return [
    `Eigen merk: ${ownLabel}`,
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

async function measureOnePrompt(
  admin: Admin,
  analysis: Analysis,
  ownLabel: string,
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
    const a = await callPlain({
      model: MODELS.quality,
      system: SIMULATE_SYSTEM,
      user: prompt.text,
      webSearch: true,
    });

    const { data: inserted, error } = await admin
      .from("tracking_runs")
      .insert({
        analysis_id: analysis.id,
        prompt_id: prompt.id,
        prompt_text_snapshot: prompt.text,
        prompt_category_snapshot: prompt.category,
        engine: "openai",
        model_used: MODELS.quality,
        week_no: weekNo,
        raw_response: a.text,
        raw_response_received_at: new Date().toISOString(),
        openai_response_id: a.responseId,
        tokens_used: a.tokensUsed,
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
    user: buildMentionUser(ownLabel, competitors, run.raw_response ?? ""),
    schema: Mention,
    schemaName: "mention",
    webSearch: false,
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
    .select("id, prompt_category_snapshot")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo);
  const runs = runsFull ?? [];
  if (runs.length === 0) return;

  const runIds = runs.map((r) => r.id as string);
  const categoryByRun = new Map(runs.map((r) => [r.id as string, r.prompt_category_snapshot as string]));

  const { data: mentionRows } = await admin.from("tracking_run_mentions").select("*").in("tracking_run_id", runIds);
  const mentions = mentionRows ?? [];

  const ownByRun = new Map<string, (typeof mentions)[number]>();
  for (const m of mentions) if (m.is_own_brand) ownByRun.set(m.tracking_run_id, m);

  const totalRuns = runIds.length;
  const ownMentionedCount = Array.from(ownByRun.values()).filter((m) => m.mentioned).length;
  const score = totalRuns > 0 ? Math.round((ownMentionedCount / totalRuns) * 100) : 0;

  const competitorRows = mentions.filter((m) => !m.is_own_brand);
  const competitorMentionedTotal = competitorRows.filter((m) => m.mentioned).length;
  const shareOfVoice =
    ownMentionedCount + competitorMentionedTotal > 0
      ? Math.round((ownMentionedCount / (ownMentionedCount + competitorMentionedTotal)) * 100)
      : null;

  await admin
    .from("visibility_scores")
    .upsert(
      { analysis_id: analysisId, week_no: weekNo, score, share_of_voice: shareOfVoice },
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

  const { data: brandDna } = await admin
    .from("brand_dna")
    .select("competitors")
    .eq("analysis_id", id)
    .maybeSingle();
  const { data: activePrompts } = await admin
    .from("prompts")
    .select("*")
    .eq("analysis_id", id)
    .eq("active", true);

  const ownLabel = typedAnalysis.topic ? `${typedAnalysis.url} (${typedAnalysis.topic})` : typedAnalysis.url;
  const competitors: string[] = brandDna?.competitors ?? [];
  const prompts = (activePrompts ?? []) as Prompt[];

  try {
    const results = await Promise.allSettled(
      prompts.map((p) => measureOnePrompt(admin, typedAnalysis, ownLabel, competitors, p, weekNo)),
    );
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    if (failed.length > 0) {
      // De echte onderliggende reden meesturen (werd voorheen ingeslikt door allSettled).
      const reason = failed[0].reason;
      const detail = reason instanceof Error ? reason.message : String(reason);
      throw new Error(
        `${failed.length} van ${results.length} prompts mislukt tijdens meting. Eerste fout: ${detail}`,
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
