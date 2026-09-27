import "server-only";

/**
 * HET MEETPLAN: vastgelegd zodra een pagina wordt goedgekeurd
 * (M1, `docs/tasks/van-pijplijn-naar-kennissysteem.md` §6.4, migratie 0122).
 *
 * ── WAAROM DIT MOEST ─────────────────────────────────────────────────────────
 *
 * Sinds de contentketen opnieuw gebouwd is (WP1, 25 september 2026) schrijft
 * niemand meer in `content_piece_targets`: de oude schrijver (`content.ts`,
 * `saveTargets()`) bestaat niet meer, en `targetsFromSourceRef()` in
 * `lib/plan-backlog-data.ts` wordt sindsdien nooit meer aangeroepen. Elke
 * pagina die via de nieuwe keten (WP6) geschreven is, had daardoor STIL geen
 * doelvragen: `planImpactWaves()` meldde "geen doelvragen" in de logs en er is
 * sinds WP6 geen enkele effectmeting meer gestart. Dit bestand repareert die
 * ketting opnieuw, en bevriest meteen de controlegroep: `impact.ts` koos hem
 * vroeger bij elke golf opnieuw, en kon dan tussen golf 1 en golf 2 een andere
 * controlegroep pakken (een prompt die intussen door een andere pagina
 * geclaimd werd), waardoor de twee golven niet meer eerlijk te vergelijken
 * waren.
 *
 * ── WAT HIER GEBEURT, EN WAT NIET ───────────────────────────────────────────
 *
 * `maakMeetplan()` leest de doelvragen terug uit het rapport (dezelfde bron als
 * `laadDoelvragen()` in `lib/pagina/context.ts`, maar dan met het prompt-id
 * erbij, dat de schrijver niet nodig heeft maar de meting wel), bevriest de
 * controlegroep met dezelfde regels als `impact.ts` altijd al gebruikte, en
 * legt vast welke bronnen op dat moment aanstonden. Geen nieuwe AI-aanroep
 * (§4 regel 1): dit is puur administratie over metingen die al gedaan waren of
 * nog gedaan gaan worden.
 *
 * Regio en Search Console-zoekopdrachten (`§6.4` in het plan) horen bij M2, dat
 * nog niet gebouwd is: de kolommen bestaan al (voor die ene migratie die anders
 * nodig zou zijn), maar blijven leeg tot M2 ze vult.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiOverviewEnabled } from "@/lib/ai-overview/registry";
import { MAX_CONTROL_PROMPTS, pickControlPrompts } from "@/lib/pipeline/impact";

type Admin = SupabaseClient;

export interface MeetplanVraag {
  promptId: string;
  tekst: string;
}

export type MeetplanUitkomst = { ok: true; bestondAl: boolean } | { ok: false; reden: string };

/**
 * De doelvragen van deze pagina, met hun prompt-id: dezelfde bron als
 * `laadDoelvragen()` (`lib/pagina/context.ts`), maar met het prompt-id in
 * plaats van het ruwe antwoord, want dat heeft de meting nodig en de schrijver
 * niet. Ontdubbeld op prompt-id: `targets` in het rapport kan dezelfde vraag
 * meer dan eens noemen (bijvoorbeeld voor twee delen van dezelfde aanbeveling).
 */
async function doelvragenUitRapport(admin: Admin, sourceRef: string | null): Promise<MeetplanVraag[]> {
  if (!sourceRef) return [];
  const [reportId, nr] = sourceRef.split("#");
  const volgnummer = Number(nr);
  if (!reportId || !Number.isInteger(volgnummer) || volgnummer < 0) return [];

  const { data } = await admin.from("reports").select("recommendations_json").eq("id", reportId).maybeSingle();
  const lijst = (data as { recommendations_json?: unknown } | null)?.recommendations_json;
  const aanbeveling = Array.isArray(lijst) ? (lijst[volgnummer] as { targets?: unknown } | undefined) : undefined;
  const doelen = (Array.isArray(aanbeveling?.targets) ? aanbeveling.targets : []) as { text?: unknown; runId?: unknown }[];
  const runIds = doelen.map((d) => d.runId).filter((id): id is string => typeof id === "string" && id.length > 0);
  if (runIds.length === 0) return [];

  const { data: runs } = await admin.from("tracking_runs").select("id, prompt_id").in("id", Array.from(new Set(runIds)));
  const promptPerRun = new Map<string, string>();
  for (const r of (runs ?? []) as { id: string; prompt_id: string | null }[]) {
    if (r.prompt_id) promptPerRun.set(r.id, r.prompt_id);
  }

  const gezien = new Set<string>();
  const uit: MeetplanVraag[] = [];
  for (const d of doelen) {
    const tekst = typeof d.text === "string" ? d.text.trim() : "";
    const promptId = typeof d.runId === "string" ? promptPerRun.get(d.runId) : undefined;
    if (!tekst || !promptId || gezien.has(promptId)) continue;
    gezien.add(promptId);
    uit.push({ promptId, tekst });
  }
  return uit;
}

/**
 * Legt het meetplan van deze pagina vast: doelvragen, de bevroren
 * controlegroep, en welke bronnen op dit moment meten. Idempotent: bestaat het
 * meetplan al (een tweede keer goedkeuren, of een aanpassing die een nieuwe
 * versie maakt maar dezelfde pagina blijft), dan gebeurt er niets.
 *
 * Geen doelvragen gevonden (een pagina zonder kans, of een handmatige kans
 * zonder gemeten cluster, besluit V2): geen meetplan, geen fout. Dat is
 * hetzelfde "onbekend, geen 0"-gedrag dat `planImpactWaves()` al had.
 */
export async function maakMeetplan(admin: Admin, contentPieceId: string): Promise<MeetplanUitkomst> {
  const { data: bestaand } = await admin
    .from("meetplannen")
    .select("id")
    .eq("content_piece_id", contentPieceId)
    .maybeSingle();
  if (bestaand) return { ok: true, bestondAl: true };

  const { data: stuk } = await admin
    .from("content_pieces")
    .select("analysis_id")
    .eq("id", contentPieceId)
    .maybeSingle();
  const analysisId = (stuk as { analysis_id: string } | null)?.analysis_id;
  if (!analysisId) return { ok: false, reden: "pagina niet gevonden" };

  const { data: planRij } = await admin
    .from("planned_pages")
    .select("source_ref")
    .eq("content_piece_id", contentPieceId)
    .maybeSingle();
  const doelvragen = await doelvragenUitRapport(admin, (planRij as { source_ref: string | null } | null)?.source_ref ?? null);
  if (doelvragen.length === 0) return { ok: false, reden: "geen doelvragen gevonden" };

  const controlePromptIds = await pickControlPrompts(
    admin,
    analysisId,
    doelvragen.map((d) => d.promptId),
    Math.min(doelvragen.length, MAX_CONTROL_PROMPTS),
  );
  const { data: controleRijen } = controlePromptIds.length
    ? await admin.from("prompts").select("id, text").in("id", controlePromptIds)
    : { data: [] as { id: string; text: string }[] };
  const controlegroep: MeetplanVraag[] = ((controleRijen ?? []) as { id: string; text: string }[]).map((r) => ({
    promptId: r.id,
    tekst: r.text,
  }));

  const bronnen = ["openai", ...(aiOverviewEnabled() ? ["ai_overview"] : [])];

  const { error } = await admin.from("meetplannen").insert({
    content_piece_id: contentPieceId,
    analysis_id: analysisId,
    doelvragen,
    controlegroep,
    bronnen,
  });
  if (error) {
    // Een gelijktijdige tweede goedkeuring (dubbelklik) botst op de unieke
    // index; dat is geen fout, het meetplan staat er dan al.
    if (error.code === "23505") return { ok: true, bestondAl: true };
    return { ok: false, reden: error.message };
  }
  return { ok: true, bestondAl: false };
}

/** Zet het gepubliceerde adres op het meetplan (M1: "bij publicatie komt het adres erbij"). */
export async function koppelAdresAanMeetplan(admin: Admin, contentPieceId: string, url: string): Promise<void> {
  await admin
    .from("meetplannen")
    .update({ adres: url, gepubliceerd_op: new Date().toISOString() })
    .eq("content_piece_id", contentPieceId);
}
