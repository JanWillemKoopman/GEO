import "server-only";

/**
 * DE PAGINA'S VAN EEN MERK, MET HUN ENE STAND (`docs/tasks/contentflow-een-lijn.md` §4.5 en §4.6).
 *
 * Eén lader voor de bibliotheek, "Jouw beurt", het contentplan en het
 * paginascherm. Vier schermen die elk zelf uitrekenden wat de stand van een
 * pagina was, gaven op 23 september 2026 bij Van den Udenhout vier
 * verschillende antwoorden over dezelfde pagina.
 *
 * Een pagina is hier óf een plan-pagina (met of zonder tekst), óf een tekst
 * die (nog) niet aan het plan hangt: de pagina's van vóór deze ombouw,
 * geschreven via de oude route vanuit een cluster. Die tweede soort verdwijnt
 * zodra hij aan het plan gekoppeld is (§5), maar tot dan hoort hij gewoon op
 * elk scherm te staan.
 *
 * ⚠️ De aanroeper doet de eigendomscontrole (`getOwnedProfile`); deze module
 * leest met de service-role omdat `content_quality_runs` en de telling van
 * vragen over meerdere tabellen gaan (conventie 6).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { paginaStand, standVolgorde, type PaginaStand } from "@/lib/pagina-stand";
import { paginaNaam } from "@/lib/pagina-naam";
import type { PlannedPageStatus } from "@/lib/types/database";

type Admin = SupabaseClient;

export interface PaginaRij {
  /** Het id waaronder de pagina een eigen adres heeft: de plan-pagina, anders de tekst. */
  routeId: string;
  plannedPageId: string | null;
  pieceId: string | null;
  analysisId: string | null;
  naam: string;
  /** "Landingspagina", "Artikel", ... */
  soort: string;
  cluster: string | null;
  /** Het cluster (analyse) waar deze pagina onder valt, ook als er nog geen tekst is. */
  clusterId: string | null;
  /** Publicatiedatum als `YYYY-MM-DD`, of null. */
  datum: string | null;
  /** Het kwaliteitscijfer, alleen zodra er tekst is die de klant moet beoordelen. */
  score: number | null;
  openVragen: number;
  stand: PaginaStand;
}

const SOORT: Record<string, string> = {
  article: "Artikel",
  faq: "Veelgestelde vragen",
  landing: "Landingspagina",
  comparison: "Vergelijking",
};
const PAGINASOORT: Record<string, string> = {
  categorie: "Categoriepagina",
  dienst: "Dienstpagina",
  informatief: "Artikel",
  overig: "Pagina",
};

/** Het adres van het paginascherm. Eén plek, zodat elke lijst hetzelfde linkt. */
export function paginaHref(profileId: string, routeId: string, van?: "plan" | "bibliotheek" | "taken"): string {
  return `/merk/${profileId}/strategie/bibliotheek/${routeId}${van ? `?van=${van}` : ""}`;
}

function dag(waarde: unknown): string | null {
  if (!waarde) return null;
  return String(waarde).slice(0, 10);
}

export async function laadPaginas(admin: Admin, profileId: string, nu: Date = new Date()): Promise<PaginaRij[]> {
  const vandaag = nu.toISOString().slice(0, 10);

  const { data: planRij } = await admin
    .from("content_plans")
    .select("id")
    .eq("profile_id", profileId)
    .neq("status", "gestopt")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: maanden }, { data: analyses }] = await Promise.all([
    planRij
      ? admin.from("plan_months").select("id, status").eq("plan_id", planRij.id as string)
      : Promise.resolve({ data: [] as { id: string; status: string }[] }),
    // Gearchiveerde clusters vallen weg, net als op elk ander scherm (`lib/archive.ts`).
    admin.from("analyses").select("id, name, topic").eq("profile_id", profileId).is("archived_at", null),
  ]);
  const maandStatus = new Map(((maanden ?? []) as { id: string; status: string }[]).map((m) => [m.id, m.status]));
  const analyseNaam = new Map(
    ((analyses ?? []) as { id: string; name: string | null; topic: string | null }[]).map((a) => [
      a.id,
      a.topic ?? a.name ?? null,
    ]),
  );
  const analyseIds = [...analyseNaam.keys()];

  const [{ data: planPaginas }, { data: teksten }, { data: vragen }, { data: effect }] = await Promise.all([
    maandStatus.size > 0
      ? admin
          .from("planned_pages")
          .select("id, title, page_type, status, scheduled_for, plan_month_id, content_piece_id, is_buffer, topic_id, profile_topics(title, analysis_id)")
          .eq("profile_id", profileId)
          .in("plan_month_id", [...maandStatus.keys()])
          .eq("is_buffer", false)
      : Promise.resolve({ data: [] }),
    analyseIds.length > 0
      ? admin
          .from("content_pieces")
          .select("id, analysis_id, title, meta_title, type, status, needs_review, briefing_snapshot_json, write_mode, quality_score, quality_json, updated_at")
          .in("analysis_id", analyseIds)
          .eq("is_current", true)
          .neq("status", "archived")
      : Promise.resolve({ data: [] }),
    admin.from("fact_requests").select("content_piece_ids").eq("profile_id", profileId).eq("status", "open"),
    analyseIds.length > 0
      ? admin.from("content_impact").select("content_piece_id, wave, verdict").in("analysis_id", analyseIds)
      : Promise.resolve({ data: [] }),
  ]);

  const open = new Map<string, number>();
  for (const v of (vragen ?? []) as { content_piece_ids: string[] | null }[]) {
    for (const id of v.content_piece_ids ?? []) open.set(id, (open.get(id) ?? 0) + 1);
  }
  const metOordeel = new Set(
    ((effect ?? []) as { content_piece_id: string; verdict: string | null }[])
      .filter((e) => e.verdict && e.verdict !== "te_weinig_data")
      .map((e) => e.content_piece_id),
  );

  type Tekst = {
    id: string;
    analysis_id: string;
    title: string;
    meta_title: string | null;
    type: string;
    status: string;
    needs_review: boolean;
    briefing_snapshot_json: unknown;
    write_mode: string | null;
    quality_score: number | null;
    quality_json: { score?: number | null } | null;
  };
  const tekstOpId = new Map(((teksten ?? []) as Tekst[]).map((t) => [t.id, t]));
  const gekoppeld = new Set<string>();
  const rijen: PaginaRij[] = [];

  for (const p of (planPaginas ?? []) as unknown as {
    id: string;
    title: string;
    page_type: string;
    status: PlannedPageStatus;
    scheduled_for: string | null;
    plan_month_id: string;
    content_piece_id: string | null;
    profile_topics: { title: string; analysis_id: string | null } | null;
  }[]) {
    const tekst = p.content_piece_id ? (tekstOpId.get(p.content_piece_id) ?? null) : null;
    if (tekst) gekoppeld.add(tekst.id);
    rijen.push(
      maakRij({
        routeId: p.id,
        plannedPageId: p.id,
        tekst,
        plan: {
          status: p.status,
          scheduled_for: dag(p.scheduled_for),
          maandVrij: maandStatus.get(p.plan_month_id) === "goedgekeurd",
        },
        planTitel: p.title,
        planSoort: PAGINASOORT[p.page_type] ?? "Pagina",
        cluster: tekst ? (analyseNaam.get(tekst.analysis_id) ?? null) : (p.profile_topics?.title ?? null),
        clusterId: tekst?.analysis_id ?? p.profile_topics?.analysis_id ?? null,
        open: tekst ? (open.get(tekst.id) ?? 0) : 0,
        effectBekend: tekst ? metOordeel.has(tekst.id) : false,
        vandaag,
      }),
    );
  }

  // De teksten zonder plan-pagina: de oude route vanuit een cluster.
  for (const tekst of tekstOpId.values()) {
    if (gekoppeld.has(tekst.id)) continue;
    rijen.push(
      maakRij({
        routeId: tekst.id,
        plannedPageId: null,
        tekst,
        plan: null,
        planTitel: tekst.title,
        planSoort: SOORT[tekst.type] ?? "Pagina",
        cluster: analyseNaam.get(tekst.analysis_id) ?? null,
        clusterId: tekst.analysis_id,
        open: open.get(tekst.id) ?? 0,
        effectBekend: metOordeel.has(tekst.id),
        vandaag,
      }),
    );
  }

  return rijen.sort(
    (a, b) =>
      standVolgorde(a.stand) - standVolgorde(b.stand) ||
      (a.datum ?? "9999").localeCompare(b.datum ?? "9999") ||
      a.naam.localeCompare(b.naam, "nl"),
  );

  function maakRij(i: {
    routeId: string;
    plannedPageId: string | null;
    tekst: Tekst | null;
    plan: { status: PlannedPageStatus; scheduled_for: string | null; maandVrij: boolean } | null;
    planTitel: string;
    planSoort: string;
    cluster: string | null;
    clusterId: string | null;
    open: number;
    effectBekend: boolean;
    vandaag: string;
  }): PaginaRij {
    const stand = paginaStand({
      plan: i.plan,
      tekst: i.tekst
        ? {
            status: i.tekst.status,
            needs_review: i.tekst.needs_review,
            voorbereid: Boolean(i.tekst.briefing_snapshot_json),
            write_mode: i.tekst.write_mode === "algemeen" ? "algemeen" : null,
          }
        : null,
      openVragen: i.open,
      effectBekend: i.effectBekend,
      vandaag: i.vandaag,
    });
    const heeftOordeel = stand.fase !== null && stand.fase >= 2;
    return {
      routeId: i.routeId,
      plannedPageId: i.plannedPageId,
      pieceId: i.tekst?.id ?? null,
      analysisId: i.tekst?.analysis_id ?? null,
      naam: i.tekst ? paginaNaam(i.tekst) : paginaNaam({ title: i.planTitel }),
      soort: i.tekst ? (SOORT[i.tekst.type] ?? i.planSoort) : i.planSoort,
      cluster: i.cluster,
      clusterId: i.clusterId,
      datum: i.plan?.scheduled_for ?? null,
      // Eén cijfer, uit één bron: dezelfde als de kwaliteitsrail op het
      // paginascherm (`quality_json.score`, anders `quality_score`). Op
      // 23 september 2026 toonde de bibliotheek 100 en de rail 74.
      score: heeftOordeel ? (i.tekst?.quality_json?.score ?? i.tekst?.quality_score ?? null) : null,
      openVragen: i.open,
      stand,
    };
  }
}

/** Precies één pagina, op zijn route-id. `null` als hij niet bij dit merk hoort. */
export async function laadPagina(admin: Admin, profileId: string, routeId: string): Promise<PaginaRij | null> {
  const alle = await laadPaginas(admin, profileId);
  return alle.find((r) => r.routeId === routeId || r.pieceId === routeId) ?? null;
}
