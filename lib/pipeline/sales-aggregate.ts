import "server-only";

/**
 * Stap 8: de meting omrekenen naar zichtbaarheid per bedrijf
 * (`docs/tasks/geo-prospect-engine.md` §7.2 en hoofdstuk 13)
 *
 * Geen AI. Deze stap leest de vermeldingen, laat `lib/sales/measure-math.ts` de
 * som maken en schrijft het resultaat weg. De rekenkunde staat daar en niet
 * hier, want daar is hij testbaar zonder database (conventie 2).
 *
 * ── WAT DEZE STAP OOK DOET: EERLIJK ZIJN OVER WAT ER MIST ───────────────────
 *
 * Plan §8.2: valt een engine weg, dan gaat de ronde door op de andere, zichtbaar
 * op elk scherm dat de uitkomst toont. Deze stap is de plek waar dat vastgelegd
 * wordt: `sales_runs.engines` bevat alleen de engines die daadwerkelijk een
 * antwoord opleverden, en `notes` zegt in gewone taal wat er ontbreekt. Een
 * ronde die stil met de helft van zijn metingen afsluit, is de fout die je pas
 * ontdekt als een verkoper hem gebruikt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  rekenScores,
  ENGINE_ALLE,
  type MeetAntwoord,
  type MeetVermelding,
  type MeetVraag,
} from "@/lib/sales/measure-math";
import { isIntentStage } from "@/lib/sales/intents";
import { bedrijvenVanMarkt } from "@/lib/pipeline/sales-measure";

type Admin = SupabaseClient;

export interface AggregatieUitkomst {
  bedrijven: number;
  vragen: number;
  antwoorden: number;
  engines: string[];
  /** Wat er ontbreekt, in gewone taal. `null` als de ronde compleet is. */
  melding: string | null;
}

export async function aggregeerRonde(admin: Admin, runId: string): Promise<AggregatieUitkomst> {
  const { data: run } = await admin
    .from("sales_runs")
    .select("id, market_id, engines, question_count, notes")
    .eq("id", runId)
    .maybeSingle();
  if (!run) throw new Error(`Meetronde ${runId} bestaat niet.`);
  const marketId = run.market_id as string;

  const { data: vraagRijen } = await admin
    .from("sales_questions")
    .select("id, intent_label, intent_stage, weight, active")
    .eq("run_id", runId)
    .eq("active", true);

  const vragen: MeetVraag[] = ((vraagRijen ?? []) as Record<string, unknown>[])
    .filter((v) => isIntentStage(v.intent_stage))
    .map((v) => ({
      id: v.id as string,
      intentLabel: v.intent_label as string,
      stage: v.intent_stage as MeetVraag["stage"],
      weight: Number(v.weight ?? 1),
    }));

  const { data: antwoordRijen } = await admin
    .from("sales_answers")
    .select("id, question_id, engine, cited_sources")
    .eq("run_id", runId);

  const antwoorden: MeetAntwoord[] = ((antwoordRijen ?? []) as Record<string, unknown>[]).map((a) => ({
    id: a.id as string,
    questionId: a.question_id as string,
    engine: a.engine as string,
    sources: Array.isArray(a.cited_sources) ? (a.cited_sources as string[]) : [],
  }));

  const { data: vermeldingRijen } = await admin
    .from("sales_mentions")
    .select("answer_id, company_id, mentioned, position, mention_role")
    .eq("run_id", runId);

  // De bronnen per vermelding zitten op het antwoord en niet op de vermelding:
  // een engine zegt welke bronnen hij gebruikte voor het hele antwoord, niet per
  // genoemd bedrijf. Een bedrijf dat in dat antwoord genoemd wordt, wordt dus
  // door die bronnen gedragen, en dat is precies wat opportunitytype 6 nodig
  // heeft: staat dit bedrijf in de bronnen die deze markt bepalen.
  const bronPerAntwoord = new Map(antwoorden.map((a) => [a.id, a.sources ?? []]));
  const vermeldingen: MeetVermelding[] = ((vermeldingRijen ?? []) as Record<string, unknown>[]).map(
    (m) => ({
      answerId: m.answer_id as string,
      companyId: m.company_id as string,
      mentioned: Boolean(m.mentioned),
      position: (m.position as number | null) ?? null,
      role: (m.mention_role as string | null) ?? null,
      sources: m.mentioned ? bronPerAntwoord.get(m.answer_id as string) ?? [] : [],
    }),
  );

  const bedrijven = await bedrijvenVanMarkt(admin, marketId);
  const scores = rekenScores(
    bedrijven.map((b) => b.id),
    vragen,
    antwoorden,
    vermeldingen,
  );

  // Delete-then-insert, net als bij de vermeldingen: een tweede aggregatie moet
  // hetzelfde resultaat opleveren en niet een tweede set rijen (conventie 9).
  await admin.from("sales_company_scores").delete().eq("run_id", runId);
  if (scores.length > 0) {
    const { error } = await admin.from("sales_company_scores").insert(
      scores.map((s) => ({
        run_id: runId,
        company_id: s.companyId,
        engine: s.engine,
        questions_total: s.questionsTotal,
        mentions: s.mentions,
        share: s.share,
        weighted_share: s.weightedShare,
        stderr: s.stderr,
        avg_position: s.avgPosition,
        per_intent: s.perIntent as unknown as Record<string, unknown>,
        per_stage: s.perStage as unknown as Record<string, unknown>,
        sources: s.sources as unknown as Record<string, unknown>,
      })),
    );
    if (error) throw new Error(`Opslaan van de scores mislukt: ${error.message}`);
  }

  // Welke engines hebben er echt gemeten? Niet welke er gepland waren.
  const gemeten = Array.from(new Set(antwoorden.map((a) => a.engine))).sort();
  const gepland = ((run.engines as string[] | null) ?? []).slice().sort();
  const weggevallen = gepland.filter((e) => !gemeten.includes(e));

  const meldingen: string[] = [];
  if (weggevallen.length > 0) {
    meldingen.push(
      weggevallen.length === 1
        ? `${weggevallen[0]} heeft geen enkele vraag beantwoord. De uitkomst gaat alleen over ${gemeten.join(" en ")}.`
        : `Deze engines hebben niets opgeleverd: ${weggevallen.join(", ")}.`,
    );
  }

  // Hoeveel vragen zijn er per engine blijven liggen? Dat is de noemer die de
  // schermen moeten noemen, en het is de reden dat een cijfer soms op 34 van de
  // 40 vragen rust in plaats van op 40.
  for (const engine of gemeten) {
    const gedaan = antwoorden.filter((a) => a.engine === engine).length;
    if (gedaan < vragen.length) {
      meldingen.push(
        `${engine} beantwoordde ${gedaan} van de ${vragen.length} vragen. De cijfers voor deze ` +
          "engine rusten dus op minder vragen.",
      );
    }
  }

  const melding = meldingen.length > 0 ? meldingen.join(" ") : null;

  await admin
    .from("sales_runs")
    .update({
      engines: gemeten,
      notes: [run.notes as string | null, melding].filter(Boolean).join(" ") || null,
      status: gemeten.length > 0 ? "klaar" : "mislukt",
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);

  await admin
    .from("sales_markets")
    .update({ status: gemeten.length > 0 ? "klaar" : "mislukt" })
    .eq("id", marketId);

  return {
    bedrijven: bedrijven.length,
    vragen: vragen.length,
    antwoorden: antwoorden.length,
    engines: gemeten,
    melding,
  };
}

/** Alleen voor de schermen: de rij met het gecombineerde beeld van één bedrijf. */
export function isGecombineerd(engine: string): boolean {
  return engine === ENGINE_ALLE;
}
