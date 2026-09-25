import "server-only";

/**
 * DE TWEE INGANGEN VAN HET CONTENTPLAN (`docs/tasks/contentketen-opnieuw.md` WP6).
 *
 * Het contentplan roept alleen deze twee aan:
 *
 *   - `bereidVoor(paginas)`: een rij in `content_pieces`, de open vraag, en de
 *     brief. Bij het vrijgeven van een maand, en bij het inplannen in een al
 *     vrijgegeven maand.
 *   - `probeerTeSchrijven(pagina)`: de schrijfpoort (§6.8), en als die open is
 *     de schrijftaak. Na de brief, na elk antwoord, en elke ochtend.
 *
 * Er is geen derde ingang. Alles wat de brief en de schrijver nodig hebben,
 * lezen zij zelf uit de database (`context.ts`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { contentTypeFor } from "@/lib/plan-writing";
import { maakOpenVraag } from "@/lib/pagina/open-vraag";
import { poortVoor } from "@/lib/pagina/brief";
import type { SchrijfReden } from "@/lib/pagina/schrijfpoort";
import type { PageType, PlanMonthStatus } from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Een brief inplannen voor de eerste pagina van `rij`; de rest reist mee in de
 * payload, zodat de briefs van een maand na elkaar draaien (§6.1). Een pagina
 * die niet (meer) bestaat, wordt overgeslagen.
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

interface PlanRij {
  id: string;
  profile_id: string;
  title: string;
  page_type: PageType;
  status: string;
  is_buffer: boolean;
  topic_id: string | null;
  source_analysis_id: string | null;
  source_ref: string | null;
  recommendation_action: string | null;
  existing_url: string | null;
  related_url: string | null;
  target_intent: string | null;
  content_piece_id: string | null;
  plan_month_id: string;
  sort_order: number | null;
  scheduled_for: string | null;
}

export type Voorbereiding =
  | { pieceId: string; nieuw: boolean }
  | { pieceId: null; reden: "geen_cluster" | "maand_niet_vrijgegeven" | "niet_aan_de_beurt" };

/** Aan welk cluster hangt deze plan-pagina? De kans zelf, anders het onderwerp. */
async function clusterVan(admin: Admin, p: PlanRij): Promise<string | null> {
  if (p.source_analysis_id) return p.source_analysis_id;
  if (!p.topic_id) return null;
  const { data } = await admin.from("profile_topics").select("analysis_id").eq("id", p.topic_id).maybeSingle();
  return (data as { analysis_id?: string | null } | null)?.analysis_id ?? null;
}

/** De rij in `content_pieces` voor een plan-pagina, en de open vraag erbij. */
async function paginaVoor(admin: Admin, p: PlanRij, negeerMaand: boolean): Promise<Voorbereiding> {
  if (p.is_buffer || !["gepland", "mislukt"].includes(p.status)) return { pieceId: null, reden: "niet_aan_de_beurt" };
  const { data: maand } = await admin.from("plan_months").select("status").eq("id", p.plan_month_id).maybeSingle();
  if (!negeerMaand && (maand as { status?: PlanMonthStatus } | null)?.status !== "goedgekeurd") {
    return { pieceId: null, reden: "maand_niet_vrijgegeven" };
  }
  const analysisId = await clusterVan(admin, p);
  if (!analysisId) return { pieceId: null, reden: "geen_cluster" };

  let pieceId = p.content_piece_id;
  let nieuw = false;
  if (!pieceId) {
    // Staat er onder dit cluster al een actuele pagina met deze titel, dan is
    // dat deze pagina: de unieke index uit migratie 0023 laat geen tweede toe.
    const { data: bestaand } = await admin
      .from("content_pieces")
      .select("id")
      .eq("analysis_id", analysisId)
      .eq("title", p.title)
      .eq("is_current", true)
      .limit(1)
      .maybeSingle();
    pieceId = (bestaand as { id?: string } | null)?.id ?? null;
    if (!pieceId) {
      const verbeteren = p.recommendation_action === "verbeteren";
      const { data: rij, error } = await admin
        .from("content_pieces")
        .insert({
          analysis_id: analysisId,
          report_id: p.source_ref?.split("#")[0] || null,
          title: p.title,
          type: contentTypeFor(p.page_type),
          target_intent: p.target_intent,
          action: verbeteren ? "verbeteren" : "nieuw",
          existing_url: verbeteren ? p.existing_url : null,
          related_url: verbeteren ? null : p.related_url,
          status: "briefing",
          version: 1,
          is_current: true,
          needs_review: false,
        })
        .select("id")
        .single();
      if (error || !rij) throw new Error(`Pagina aanmaken voor plan-pagina ${p.id} mislukte: ${error?.message}`);
      pieceId = (rij as { id: string }).id;
      nieuw = true;
    }
    await admin.from("planned_pages").update({ content_piece_id: pieceId }).eq("id", p.id).is("content_piece_id", null);
  }

  await maakOpenVraag(admin, {
    profileId: p.profile_id,
    analysisId,
    pieceId,
    paginaTitel: p.title,
    onderwerp: p.title,
  });
  return { pieceId, nieuw };
}

const PLAN_KOLOMMEN =
  "id, profile_id, title, page_type, status, is_buffer, topic_id, source_analysis_id, source_ref, " +
  "recommendation_action, existing_url, related_url, target_intent, content_piece_id, plan_month_id, sort_order, scheduled_for";

export interface Voorbereidingsuitslag {
  voorbereid: number;
  zonderCluster: number;
}

/**
 * De voorbereiding van een reeks plan-pagina's: rijen, open vragen, en de
 * briefs na elkaar in de volgorde van de publicatiedatum. Idempotent: een
 * tweede aanroep (de ochtendcontrole na het vrijgeven) maakt niets dubbel, en
 * een pagina met een brief slaat de brief over (conventie 9).
 */
export async function bereidVoor(
  admin: Admin,
  planPaginaIds: string[],
  opties: { negeerMaand?: boolean } = {},
): Promise<Voorbereidingsuitslag> {
  if (planPaginaIds.length === 0) return { voorbereid: 0, zonderCluster: 0 };
  const { data } = await admin.from("planned_pages").select(PLAN_KOLOMMEN).in("id", planPaginaIds);
  const rijen = ((data ?? []) as unknown as PlanRij[]).sort(
    (a, b) =>
      (a.scheduled_for ?? "9999").localeCompare(b.scheduled_for ?? "9999") || (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

  const rij: string[] = [];
  let zonderCluster = 0;
  const merken = new Set<string>();
  for (const p of rijen) {
    const v = await paginaVoor(admin, p, Boolean(opties.negeerMaand));
    if (v.pieceId === null) {
      if (v.reden === "geen_cluster") zonderCluster++;
      continue;
    }
    merken.add(p.profile_id);
    const { data: stuk } = await admin.from("content_pieces").select("brief_json").eq("id", v.pieceId).maybeSingle();
    if (!(stuk as { brief_json?: unknown } | null)?.brief_json) rij.push(v.pieceId);
  }

  // Het feitenregister bijwerken vóór de briefs: een betwist feit gaat dan niet
  // mee in blok A (§4). Licht werk op het goedkope model.
  for (const profileId of merken) {
    await enqueue(admin, { type: "fact_register", payload: {}, profileId, dedupeKey: dedupe.factRegister(profileId) });
  }
  await planBriefs(admin, rij);
  return { voorbereid: rij.length, zonderCluster };
}

/** Alle plan-pagina's van een maand voorbereiden (bij het vrijgeven). */
export async function bereidMaandVoor(admin: Admin, monthId: string): Promise<Voorbereidingsuitslag> {
  const { data } = await admin
    .from("planned_pages")
    .select("id")
    .eq("plan_month_id", monthId)
    .eq("status", "gepland")
    .eq("is_buffer", false);
  return bereidVoor(admin, ((data ?? []) as { id: string }[]).map((r) => r.id));
}

export type Schrijfuitkomst =
  | { uitkomst: "ingepland" }
  | { uitkomst: "wacht"; reden: SchrijfReden }
  | { uitkomst: "al_bezig" }
  | { uitkomst: "geen_pagina" };

/**
 * De schrijfpoort vragen, en als die open is de schrijftaak inplannen.
 *
 * `negeerDatum` is voor de beheerder die een pagina nu wil laten schrijven: de
 * datumregel vervalt, de vragen blijven gelden. Er komt nooit een schrijftaak
 * met een open vraag (klaar-als van WP6).
 *
 * Eén schrijftaak per pagina: de pagina gaat van `briefing` naar `draft` met
 * een voorwaardelijke update, en alleen wie die wint plant de taak in. Twee
 * antwoorden die tegelijk binnenkomen leveren zo één tekst op.
 */
export async function probeerTeSchrijven(
  admin: Admin,
  pieceId: string,
  opties: { negeerDatum?: boolean } = {},
): Promise<Schrijfuitkomst> {
  const { data: stuk } = await admin
    .from("content_pieces")
    .select("id, analysis_id, status")
    .eq("id", pieceId)
    .maybeSingle();
  const s = stuk as { id: string; analysis_id: string; status: string } | null;
  if (!s) return { uitkomst: "geen_pagina" };
  if (s.status !== "briefing") return { uitkomst: "al_bezig" };

  const { data: plan } = await admin
    .from("planned_pages")
    .select("id, scheduled_for")
    .eq("content_piece_id", pieceId)
    .limit(1)
    .maybeSingle();
  const p = plan as { id: string; scheduled_for: string | null } | null;
  const poort = await poortVoor(admin, {
    pieceId,
    publicatiedatum: opties.negeerDatum ? null : (p?.scheduled_for ?? null),
  });
  if (!poort.mag) return { uitkomst: "wacht", reden: poort.reden ?? "voorbereiding_loopt" };

  const { data: gewonnen } = await admin
    .from("content_pieces")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", pieceId)
    .eq("status", "briefing")
    .select("id");
  if (((gewonnen ?? []) as unknown[]).length === 0) return { uitkomst: "al_bezig" };

  await enqueue(admin, {
    type: "pagina_schrijven",
    payload: { pieceId },
    analysisId: s.analysis_id,
    dedupeKey: dedupe.paginaSchrijven(pieceId),
  });
  if (p) {
    await admin.from("planned_pages").update({ status: "schrijven" }).eq("id", p.id).in("status", ["gepland", "mislukt"]);
  }
  return { uitkomst: "ingepland" };
}

/** Na een antwoord of een overgeslagen vraag: elke pagina waar die vraag bij hoort. */
export async function probeerNaAntwoord(admin: Admin, factId: string): Promise<void> {
  const { data } = await admin.from("fact_requests").select("content_piece_ids").eq("id", factId).maybeSingle();
  const ids = ((data as { content_piece_ids?: string[] | null } | null)?.content_piece_ids ?? []) as string[];
  for (const pieceId of ids) await probeerTeSchrijven(admin, pieceId);
}

/**
 * De ochtendronde van `/api/cron/plan`: het vangnet onder de twee ingangen.
 * Een vrijgegeven maand waarvan de voorbereiding niet startte, krijgt hem
 * alsnog; een pagina waarvan de vragen klaar zijn en de datum nadert, gaat
 * schrijven. Idempotent: een tweede ronde op dezelfde dag doet niets dubbel.
 */
export async function ochtendronde(admin: Admin): Promise<{ voorbereid: number; schrijven: number; zonderCluster: number }> {
  const { data: maanden } = await admin.from("plan_months").select("id").eq("status", "goedgekeurd");
  const maandIds = ((maanden ?? []) as { id: string }[]).map((m) => m.id);
  if (maandIds.length === 0) return { voorbereid: 0, schrijven: 0, zonderCluster: 0 };

  const { data: paginas } = await admin
    .from("planned_pages")
    .select("id, content_piece_id")
    .in("plan_month_id", maandIds)
    // "mislukt" ook: het scherm belooft bij een mislukte pagina dat we het
    // opnieuw proberen, en dit is waar dat gebeurt (één keer per dag).
    .in("status", ["gepland", "mislukt"])
    .eq("is_buffer", false);
  const rijen = (paginas ?? []) as { id: string; content_piece_id: string | null }[];
  const uitslag = await bereidVoor(admin, rijen.map((r) => r.id));

  const { data: gekoppeld } = await admin
    .from("planned_pages")
    .select("content_piece_id")
    .in("id", rijen.map((r) => r.id));
  let schrijven = 0;
  for (const r of (gekoppeld ?? []) as { content_piece_id: string | null }[]) {
    if (!r.content_piece_id) continue;
    const u = await probeerTeSchrijven(admin, r.content_piece_id);
    if (u.uitkomst === "ingepland") schrijven++;
  }
  return { voorbereid: uitslag.voorbereid, schrijven, zonderCluster: uitslag.zonderCluster };
}
