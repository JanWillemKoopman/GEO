import "server-only";

/**
 * De ophaalkant van de contentvoorraad. De filter- en sorteerkant staat in
 * `lib/plan-backlog.ts`, zonder `server-only`, conventie 2.
 *
 * ── WAT SYNCHRONISEREN BETEKENT ─────────────────────────────────────────────
 *
 * De voorraad is een AFGELEIDE van de rapporten: elke aanbeveling uit het
 * laatste rapport van een gemeten cluster hoort er als kaart in te staan. Die
 * afleiding wordt niet bij elk scherm opnieuw uitgerekend maar één keer
 * vastgelegd, en dat is met opzet: zodra iemand een kaart in een maand sleept,
 * hangt er werk aan (een status, straks een geschreven tekst, een
 * publicatiedatum). Een lijst die bij elke herberekening van vorm verandert kan
 * dat niet dragen.
 *
 * Vandaar `source_ref`: "<rapport-id>#<volgnummer>". Draait de synchronisatie
 * twee keer, dan herkent hij wat er al staat en voegt hij niets dubbel toe
 * (conventie 9). Wat de klant al ingepland heeft blijft staan waar het staat.
 *
 * ⚠️ Er wordt NOOIT iets verwijderd. Verdwijnt een aanbeveling uit een nieuw
 * rapport omdat hij is opgelost, dan blijft de kaart staan (conventie 8). Hem
 * weghalen zou betekenen dat werk dat iemand voor volgende maand had ingepland
 * zonder melding uit zijn plan verdwijnt.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRecommendationPotential } from "@/lib/potential-data";
import { readRecommendations, type RecommendationTarget } from "@/lib/pipeline/recommendation";
import type { BacklogItem, BacklogHandeling } from "@/lib/plan-backlog";
import type { PageType } from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

/** Eén aanbeveling zoals hij in `reports.recommendations_json` staat. */
interface RuweAanbeveling {
  title?: unknown;
  why?: unknown;
  type?: unknown;
  action?: unknown;
  existingUrl?: unknown;
  targetIntent?: unknown;
  targets?: unknown;
}

/**
 * Het contenttype van het rapport → het paginatype van het plan.
 *
 * Twee woordenlijsten die over hetzelfde gaan maar niet één op één passen; de
 * omgekeerde vertaling staat in `contentTypeFor()` in `lib/plan-writing.ts`. Een
 * landingspagina is in planwoorden een dienstpagina, een vergelijking een
 * categoriepagina, en de rest is informatief.
 */
function pageTypeVoor(type: unknown): PageType {
  switch (type) {
    case "landing":
      return "dienst";
    case "comparison":
      return "categorie";
    default:
      return "informatief";
  }
}

/** `action` uit het rapport → de twee handelingen die de voorraad kent. */
function handelingVoor(action: unknown): BacklogHandeling {
  return action === "verbeteren" ? "verbeteren" : "nieuw";
}

/**
 * ⚠️ `existingUrl` is niet te vertrouwen. In het rapport van Gasservice Brabant
 * staat bij twee van de zeven aanbevelingen letterlijk `":"` als adres, omdat
 * het model bij een nieuwe pagina tóch iets moest invullen. Een kaart die
 * "verbeter :" zegt is erger dan een kaart zonder adres (conventie 3).
 */
function schoonAdres(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const schoon = url.trim();
  if (schoon.length < 8) return null;
  if (!schoon.startsWith("http") && !schoon.startsWith("/")) return null;
  return schoon;
}

function tekst(waarde: unknown): string | null {
  return typeof waarde === "string" && waarde.trim() ? waarde.trim() : null;
}

interface Doelvraag {
  promptId: string | null;
  weight: number | null;
}

function doelvragen(targets: unknown): Doelvraag[] {
  if (!Array.isArray(targets)) return [];
  return (targets as Record<string, unknown>[]).map((t) => ({
    promptId: typeof t?.promptId === "string" ? t.promptId : null,
    weight: typeof t?.weight === "number" ? t.weight : null,
  }));
}

export interface SyncResult {
  toegevoegd: number;
  bijgewerkt: number;
  /** Clusters waarvan een rapport is gelezen. */
  clusters: number;
}

/**
 * Haalt de gemeten kansen op en zet ze in de voorraad.
 *
 * Draait bij elke opening van het planscherm. Dat mag, want hij is idempotent
 * en leest maar twee tabellen: bij Gasservice Brabant zijn dat één rapport en
 * zeven potentieberekeningen.
 */
export async function syncBacklog(
  admin: Admin,
  profileId: string,
): Promise<SyncResult> {
  const { data: analysisRows } = await admin
    .from("analyses")
    .select("id, topic")
    .eq("profile_id", profileId)
    .is("archived_at", null);

  const analyses = (analysisRows ?? []) as { id: string; topic: string | null }[];
  if (analyses.length === 0) return { toegevoegd: 0, bijgewerkt: 0, clusters: 0 };

  const analysisIds = analyses.map((a) => a.id);

  const [{ data: reportRows }, { data: topicRows }, { data: bestaandRows }] =
    await Promise.all([
      // Alleen het LAATSTE rapport per cluster telt, net als bij de kansenlijst
      // (`lib/insights-data.ts`): een aanbeveling uit de nulmeting die in periode
      // 2 niet meer terugkomt, is opgelost of achterhaald.
      admin
        .from("reports")
        .select("id, analysis_id, recommendations_json, generated_at")
        .in("analysis_id", analysisIds)
        .order("generated_at", { ascending: false }),
      admin
        .from("profile_topics")
        .select("id, analysis_id")
        .eq("profile_id", profileId)
        .not("analysis_id", "is", null),
      admin
        .from("planned_pages")
        .select("id, source_ref")
        .eq("profile_id", profileId)
        .not("source_ref", "is", null),
    ]);

  const topicVanAnalyse = new Map(
    ((topicRows ?? []) as { id: string; analysis_id: string | null }[])
      .filter((t) => t.analysis_id)
      .map((t) => [t.analysis_id as string, t.id]),
  );

  const bestaand = new Map(
    ((bestaandRows ?? []) as { id: string; source_ref: string | null }[])
      .filter((r) => r.source_ref)
      .map((r) => [r.source_ref as string, r.id]),
  );

  const gezien = new Set<string>();
  const kandidaten: {
    sourceRef: string;
    analysisId: string;
    title: string;
    why: string | null;
    targetIntent: string | null;
    pageType: PageType;
    handeling: BacklogHandeling;
    existingUrl: string | null;
    vragen: Doelvraag[];
  }[] = [];

  for (const r of (reportRows ?? []) as {
    id: string;
    analysis_id: string;
    recommendations_json: unknown;
  }[]) {
    if (gezien.has(r.analysis_id)) continue;
    gezien.add(r.analysis_id);

    const lijst = Array.isArray(r.recommendations_json) ? r.recommendations_json : [];
    for (const [i, ruw] of (lijst as RuweAanbeveling[]).entries()) {
      const title = tekst(ruw?.title);
      if (!title) continue;
      kandidaten.push({
        // ⚠️ Het volgnummer hoort in de sleutel. Twee aanbevelingen uit hetzelfde
        // rapport kunnen dezelfde titel dragen, en dan zou een sleutel op titel
        // de tweede stilzwijgend laten verdwijnen.
        sourceRef: `${r.id}#${i}`,
        analysisId: r.analysis_id,
        title,
        why: tekst(ruw?.why),
        targetIntent: tekst(ruw?.targetIntent),
        pageType: pageTypeVoor(ruw?.type),
        handeling: handelingVoor(ruw?.action),
        existingUrl: schoonAdres(ruw?.existingUrl),
        vragen: doelvragen(ruw?.targets),
      });
    }
  }

  if (kandidaten.length === 0) {
    return { toegevoegd: 0, bijgewerkt: 0, clusters: gezien.size };
  }

  // Eén potentieberekening per kans, parallel. Zelfde aanpak als de kansenlijst:
  // lichte leesqueries, geen AI-call.
  const potenties = await Promise.all(
    kandidaten.map((k) =>
      loadRecommendationPotential(
        admin,
        k.analysisId,
        k.vragen.map((v) => v.promptId),
      ),
    ),
  );

  const nieuw: Record<string, unknown>[] = [];
  const bijwerken: { id: string; potential: number | null; target_count: number | null }[] = [];

  for (const [i, k] of kandidaten.entries()) {
    const gewicht = k.vragen.reduce((som, v) => som + (v.weight ?? 0), 0);
    const raakt = k.vragen.length > 0 ? k.vragen.length : null;
    const potential = potenties[i].potential;

    const bestaandeId = bestaand.get(k.sourceRef);
    if (bestaandeId) {
      // De kaart staat er al, ook als hij inmiddels ingepland of geschreven is.
      // Alleen het cijfer ververst: een nieuwe meetronde verandert de potentie,
      // en dan moet de kaart dat tonen.
      bijwerken.push({ id: bestaandeId, potential, target_count: raakt });
      continue;
    }

    nieuw.push({
      plan_month_id: null,
      profile_id: profileId,
      title: k.title,
      page_type: k.pageType,
      topic_id: topicVanAnalyse.get(k.analysisId) ?? null,
      status: "gepland",
      sort_order: 0,
      is_buffer: false,
      scheduled_for: null,
      source: "aanbeveling",
      source_analysis_id: k.analysisId,
      source_ref: k.sourceRef,
      recommendation_action: k.handeling,
      existing_url: k.existingUrl,
      why: k.why,
      target_intent: k.targetIntent,
      target_count: raakt,
      target_weight: gewicht > 0 ? gewicht : null,
      potential,
    });
  }

  if (nieuw.length > 0) {
    // `upsert` op de unieke index en geen kale `insert`: draaien er twee sessies
    // tegelijk, dan is de tweede een no-op in plaats van een foutmelding op het
    // scherm van een klant die alleen maar een pagina opende.
    const { error } = await admin
      .from("planned_pages")
      .upsert(nieuw, { onConflict: "profile_id,source_ref", ignoreDuplicates: true });
    if (error) {
      console.error("Voorraad vullen mislukt:", error.message);
      return { toegevoegd: 0, bijgewerkt: 0, clusters: gezien.size };
    }
  }

  for (const b of bijwerken) {
    await admin
      .from("planned_pages")
      .update({ potential: b.potential, target_count: b.target_count })
      .eq("id", b.id);
  }

  return { toegevoegd: nieuw.length, bijgewerkt: bijwerken.length, clusters: gezien.size };
}

/**
 * Hoeveel vragen zijn er per cluster gemeten? De noemer onder "raakt 4 van de
 * 30 gemeten vragen".
 *
 * Alleen de gewone periodieke meting telt, net als in het rapport zelf: impact-
 * en controlemetingen gaan over een handvol vragen en zouden de noemer laten
 * schommelen zonder dat er iets veranderd is.
 */
export async function meetbareVragenPerAnalyse(
  admin: Admin,
  analysisIds: string[],
): Promise<Map<string, number>> {
  if (analysisIds.length === 0) return new Map();

  const { data } = await admin
    .from("tracking_runs")
    .select("analysis_id, week_no, purpose")
    .in("analysis_id", analysisIds);

  const runs = ((data ?? []) as { analysis_id: string; week_no: number; purpose: string | null }[])
    .filter((r) => r.purpose === "periodic");

  const laatste = new Map<string, number>();
  for (const r of runs) {
    const huidig = laatste.get(r.analysis_id);
    if (huidig === undefined || r.week_no > huidig) laatste.set(r.analysis_id, r.week_no);
  }

  const teller = new Map<string, number>();
  for (const r of runs) {
    if (r.week_no !== laatste.get(r.analysis_id)) continue;
    teller.set(r.analysis_id, (teller.get(r.analysis_id) ?? 0) + 1);
  }
  return teller;
}

/**
 * Hoeveel kansen staan er klaar om in te plannen?
 *
 * Voor het scherm dat nog géén plan heeft: dat moet kunnen zeggen of het plan
 * opgesteld kan worden, en de voorwaarde daarvoor is niet meer "er zijn
 * onderwerpen" maar "er is minstens één cluster gemeten". Synchroniseert eerst,
 * anders telt hij een voorraad die nog niet gevuld is.
 */
export async function backlogCount(admin: Admin, profileId: string): Promise<number> {
  await syncBacklog(admin, profileId);
  const { count } = await admin
    .from("planned_pages")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .is("plan_month_id", null)
    .eq("status", "gepland");
  return count ?? 0;
}

/**
 * Leest de doelvragen van een gemeten kans terug uit het rapport waar ze
 * vandaan komen (doorloop-huyberts.md punt 2).
 *
 * `sourceRef` is "<rapport-id>#<volgnummer>", dezelfde sleutel als hierboven in
 * `syncBacklog()` wordt opgebouwd. `/api/cron/plan` gebruikt hem om de
 * schrijftaak van een kans de doelvragen mee te geven; zonder die vragen
 * schrijft `saveTargets()` in content.ts nul rijen in `content_piece_targets`,
 * en slaat `planImpactWaves()` de effectmeting stilzwijgend over.
 *
 * `readRecommendations()` leest defensief: een onbekend of leeg rapport levert
 * gewoon een lege doelvragenlijst op, nooit een gooi. Dan valt de schrijfstap
 * terug op het oude gedrag (thematische inspiratie zonder doelvragen), minder
 * scherp maar niet stuk.
 */
export async function targetsFromSourceRef(
  admin: Admin,
  sourceRef: string | null,
): Promise<{ reportId: string | null; targets: RecommendationTarget[] }> {
  const leeg = { reportId: null, targets: [] as RecommendationTarget[] };
  if (!sourceRef) return leeg;

  const [reportId, volgnummerRaw] = sourceRef.split("#");
  const volgnummer = Number(volgnummerRaw);
  if (!reportId || !Number.isInteger(volgnummer) || volgnummer < 0) return leeg;

  const { data } = await admin
    .from("reports")
    .select("recommendations_json")
    .eq("id", reportId)
    .maybeSingle();
  if (!data) return leeg;

  const aanbevelingen = readRecommendations(data.recommendations_json);
  const aanbeveling = aanbevelingen[volgnummer];
  return aanbeveling ? { reportId, targets: aanbeveling.targets } : leeg;
}
