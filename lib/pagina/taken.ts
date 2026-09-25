import "server-only";

/**
 * DE TAKEN VAN DE CONTENTKETEN (`docs/tasks/contentketen-opnieuw.md` §7.4).
 *
 * Eén bestand met wat elke taaksoort doet; `lib/jobs/handlers.ts` roept alleen
 * deze functies aan. Het inplannen van de volgende stap staat hier ook, zodat
 * de volgorde van de keten op één plek te lezen is:
 *
 *   pagina_brief (de briefs van een maand na elkaar) → schrijfpoort
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import type { Job } from "@/lib/types/database";
import { maakBrief, markeerBriefMislukt, type BriefUitkomst } from "@/lib/pagina/brief";

type Admin = SupabaseClient;

/**
 * Een brief inplannen voor de eerste pagina van `rij`; de rest reist mee in de
 * payload. Een pagina die niet (meer) bestaat, wordt overgeslagen.
 */
export async function planBriefs(admin: Admin, rij: string[]): Promise<void> {
  for (let i = 0; i < rij.length; i++) {
    const pieceId = rij[i];
    const { data } = await admin.from("content_pieces").select("analysis_id").eq("id", pieceId).maybeSingle();
    const analysisId = (data as { analysis_id?: string } | null)?.analysis_id;
    if (!analysisId) continue;
    await enqueue(admin, {
      type: "pagina_brief",
      payload: { pieceId, rij: rij.slice(i + 1) },
      analysisId,
      dedupeKey: dedupe.paginaBrief(pieceId),
    });
    return;
  }
}

/** Na de brief, gelukt of definitief mislukt: de rij gaat door. */
async function naBrief(admin: Admin, uitkomst: BriefUitkomst, rij: string[]): Promise<void> {
  if (rij.length > 0) await planBriefs(admin, rij);
  if (uitkomst.uitkomst === "geen_pagina") return;
  // WP6: mag de pagina volgens de schrijfpoort geschreven worden, dan komt
  // hier de schrijftaak (`probeerTeSchrijven`).
}

export async function voerBriefUit(admin: Admin, payload: { pieceId: string; rij?: string[] }): Promise<void> {
  const uitkomst = await maakBrief(admin, payload.pieceId);
  await naBrief(admin, uitkomst, payload.rij ?? []);
}

/**
 * De brief gaf na vier pogingen op. De pagina gaat door met alleen de open
 * vraag, en de rij gaat door met de volgende pagina (§6.1).
 */
export async function briefGafOp(admin: Admin, job: Job): Promise<void> {
  const payload = (job.payload_json ?? {}) as { pieceId?: string; rij?: string[] };
  if (!payload.pieceId) return;
  const uitkomst = await markeerBriefMislukt(admin, payload.pieceId);
  await naBrief(admin, uitkomst, payload.rij ?? []);
}
