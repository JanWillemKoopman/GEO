import "server-only";

/**
 * Het contentplan: aanmaken, lezen, goedkeuren, plaatsen.
 *
 * De rekenkant staat in `lib/pipeline/plan-build.ts` en de statustaal in
 * `lib/plan-status.ts`, allebei zonder `server-only` (conventie 2). Hier staat
 * alles wat de database raakt.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPlan, DEFAULT_FUNNELS, MONTHS_AHEAD } from "@/lib/pipeline/plan-build";
import type { TopicWritingState } from "@/lib/plan-writing";
import type {
  AnalysisStatus,
  ContentPlan,
  FunnelStage,
  PlanMonth,
  PlannedPage,
  ProfileTopic,
} from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

export interface PlanBundle {
  plan: ContentPlan;
  months: PlanMonth[];
  pages: PlannedPage[];
  funnels: FunnelStage[];
  topics: TopicWritingState[];
}

/** Het lopende plan van een merk, met alles eromheen. Null als er nog geen is. */
export async function loadPlan(
  admin: Admin,
  profileId: string,
): Promise<PlanBundle | null> {
  const { data: planRow } = await admin
    .from("content_plans")
    .select("*")
    .eq("profile_id", profileId)
    .neq("status", "gestopt")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!planRow) return null;
  const plan = planRow as ContentPlan;

  const [{ data: months }, { data: pages }, { data: funnels }, { data: topics }] = await Promise.all([
    admin
      .from("plan_months")
      .select("*")
      .eq("plan_id", plan.id)
      .order("month_number"),
    admin
      .from("planned_pages")
      .select("*")
      .eq("profile_id", profileId)
      .order("sort_order"),
    admin
      .from("profile_funnel_stages")
      .select("*")
      .eq("profile_id", profileId)
      .order("sort_order"),
    // Schrijven leunt op een gemeten analyse (`lib/plan-writing.ts`). Zonder
      // deze query kan het scherm alleen "Gepland" tonen bij een pagina die
      // nooit aan de beurt komt, en dat is de stilste manier om iemand te laten
      // wachten op iets wat niet gaat gebeuren.
    admin
      .from("profile_topics")
      .select("id, title, analysis_id, analyses(status)")
      .eq("profile_id", profileId),
  ]);

  return {
    plan,
    months: (months ?? []) as PlanMonth[],
    pages: (pages ?? []) as PlannedPage[],
    funnels: (funnels ?? []) as FunnelStage[],
    topics: ((topics ?? []) as unknown as TopicRow[]).map((t) => ({
      topicId: t.id,
      title: t.title,
      analysisId: t.analysis_id,
      analysisStatus: t.analyses?.status ?? null,
    })),
  };
}

interface TopicRow {
  id: string;
  title: string;
  analysis_id: string | null;
  analyses: { status: AnalysisStatus } | null;
}

/**
 * Zorgt dat een merk funnelfasen heeft.
 *
 * Vier standaardfasen als er nog geen zijn. Nova laat de CSM ze met de hand
 * invullen en blokkeert de generatie tot dat gebeurd is
 * (`admin.errors.funnelsRequired`). Dat is een drempel die hier niets oplevert:
 * de vier standaardfasen kloppen voor vrijwel elk MKB-bedrijf, en wie ze wil
 * wijzigen doet dat achteraf. Een lege lijst die je eerst moet vullen voordat er
 * iets gebeurt is precies de "inspanning vóór de waarde" die `ux-design.md`
 * verbiedt.
 */
export async function ensureFunnels(
  admin: Admin,
  profileId: string,
): Promise<FunnelStage[]> {
  const { data: bestaand } = await admin
    .from("profile_funnel_stages")
    .select("*")
    .eq("profile_id", profileId)
    .order("sort_order");

  if (bestaand && bestaand.length > 0) return bestaand as FunnelStage[];

  const { data: nieuw, error } = await admin
    .from("profile_funnel_stages")
    .insert(
      DEFAULT_FUNNELS.map((label, i) => ({
        profile_id: profileId,
        label,
        sort_order: i,
      })),
    )
    .select("*");

  if (error) {
    console.error("Funnelfasen aanmaken mislukt:", error.message);
    return [];
  }
  return (nieuw ?? []) as FunnelStage[];
}

export type CreatePlanResult =
  | { ok: true; planId: string }
  | { ok: false; problems: string[] };

/**
 * Stelt een nieuw plan op.
 *
 * ── WAAROM DE OUDE NIET WEGGEGOOID WORDT ────────────────────────────────────
 *
 * Conventie 8: alles bewaren. Een vorige versie gaat op `gestopt` en blijft
 * staan. Nova doet dit ook (`purgeStrategyDescription`: "Posted and approved
 * content is kept"), en de reden is praktisch: als de klant halverwege zegt dat
 * het vorige plan beter was, moet dat terug te vinden zijn.
 *
 * ⚠️ Geplaatste en goedgekeurde pagina's van het oude plan blijven óók staan.
 * Ze horen bij hun oude maand, en die maand blijft bestaan. Alleen wat nog
 * `gepland` was wordt door het nieuwe plan vervangen.
 */
export async function createPlan(
  admin: Admin,
  input: {
    profileId: string;
    pagesPerMonth: number;
    startedOn?: Date;
    strategyNote?: string | null;
  },
): Promise<CreatePlanResult> {
  const [{ data: topicRows }, funnels] = await Promise.all([
    admin
      .from("profile_topics")
      .select("id, title, priority, status")
      .eq("profile_id", input.profileId)
      .neq("status", "afgewezen")
      .order("priority", { ascending: false }),
    ensureFunnels(admin, input.profileId),
  ]);

  const topics = ((topicRows ?? []) as ProfileTopic[]).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
  }));

  const startedOn = input.startedOn ?? new Date();
  const gebouwd = buildPlan({
    startedOn,
    pagesPerMonth: input.pagesPerMonth,
    topics,
    funnels: funnels.map((f) => ({ id: f.id, label: f.label, sortOrder: f.sort_order })),
  });

  if (gebouwd.problems.length > 0) return { ok: false, problems: gebouwd.problems };

  // Vorige versie stoppen, niet verwijderen.
  const { data: vorige } = await admin
    .from("content_plans")
    .select("version")
    .eq("profile_id", input.profileId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = ((vorige?.version as number | undefined) ?? 0) + 1;

  await admin
    .from("content_plans")
    .update({ status: "gestopt" })
    .eq("profile_id", input.profileId)
    .neq("status", "gestopt");

  const { data: planRow, error: planError } = await admin
    .from("content_plans")
    .insert({
      profile_id: input.profileId,
      pages_per_month: input.pagesPerMonth,
      started_on: startedOn.toISOString().slice(0, 10),
      strategy_note: input.strategyNote ?? null,
      version,
      status: "concept",
    })
    .select("id")
    .single();

  if (planError || !planRow) {
    console.error("Plan aanmaken mislukt:", planError?.message);
    return { ok: false, problems: ["Het plan kon niet worden aangemaakt."] };
  }
  const planId = planRow.id as string;

  const { data: monthRows, error: monthError } = await admin
    .from("plan_months")
    .insert(
      Array.from({ length: MONTHS_AHEAD }, (_, i) => ({
        plan_id: planId,
        month_number: i + 1,
        // Maand 1 gaat meteen naar de klant; de rest blijft concept tot hij
        // eraan toe is. Twaalf maanden tegelijk ter goedkeuring aanbieden is
        // twaalf beslissingen vragen voor iets wat pas over een jaar speelt.
        status: i === 0 ? "ter_goedkeuring" : "concept",
      })),
    )
    .select("id, month_number");

  if (monthError || !monthRows) {
    console.error("Maanden aanmaken mislukt:", monthError?.message);
    return { ok: false, problems: ["De maanden konden niet worden aangemaakt."] };
  }

  const maandId = new Map(
    monthRows.map((m) => [m.month_number as number, m.id as string]),
  );

  const { error: pageError } = await admin.from("planned_pages").insert(
    gebouwd.pages.map((p) => ({
      plan_month_id: maandId.get(p.monthNumber)!,
      profile_id: input.profileId,
      title: p.title,
      page_type: p.pageType,
      funnel_stage_id: p.funnelStageId,
      topic_id: p.topicId,
      sort_order: p.sortOrder,
      is_buffer: p.isBuffer,
      scheduled_for: p.scheduledFor || null,
    })),
  );

  if (pageError) {
    console.error("Pagina's aanmaken mislukt:", pageError.message);
    return { ok: false, problems: ["De pagina's konden niet worden aangemaakt."] };
  }

  return { ok: true, planId };
}

/**
 * Een maand goedkeuren.
 *
 * Zet de maand op `goedgekeurd` en het plan op `actief`. Vanaf dat moment mag
 * de cron pagina's van die maand oppakken (`shouldStartWriting` weigert het
 * anders, en dat is de duurste regel van de module: elke pagina kost geld).
 */
export async function approveMonth(
  admin: Admin,
  monthId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("plan_months")
    .update({
      status: "goedgekeurd",
      approved_at: new Date().toISOString(),
      approved_by_user_id: userId,
    })
    .eq("id", monthId)
    .neq("status", "goedgekeurd")
    .select("plan_id")
    .maybeSingle();

  if (error) {
    console.error("Maand goedkeuren mislukt:", error.message);
    return false;
  }
  if (!data) return true; // was al goedgekeurd, geen fout

  await admin
    .from("content_plans")
    .update({ status: "actief" })
    .eq("id", data.plan_id as string);

  return true;
}

/**
 * Een pagina verwijderen, met de buffer die inschuift.
 *
 * Nova's `deleteUrl.body`: "A buffer URL for its month will backfill the slot if
 * one is available." Precies dat gebeurt hier: de pagina gaat op `afgewezen`
 * (niet weg, conventie 8), en de eerste buffer van diezelfde maand neemt zijn
 * plaats en zijn datum over.
 *
 * ⚠️ Zonder deze logica daalt het maandtotaal stilzwijgend onder wat de klant
 * betaalt, en dat merkt niemand tot het einde van de maand.
 */
export async function removePage(
  admin: Admin,
  pageId: string,
): Promise<{ ok: boolean; bufferUsed: boolean }> {
  const { data: page } = await admin
    .from("planned_pages")
    .select("*")
    .eq("id", pageId)
    .maybeSingle();

  if (!page) return { ok: false, bufferUsed: false };
  const p = page as PlannedPage;

  const { error } = await admin
    .from("planned_pages")
    .update({ status: "afgewezen" })
    .eq("id", pageId);
  if (error) {
    console.error("Pagina verwijderen mislukt:", error.message);
    return { ok: false, bufferUsed: false };
  }

  // Een buffer schuift alleen in voor een pagina die nog niet geschreven was.
  // Bij een geschreven of geplaatste pagina is er niets te vervangen: het werk
  // is al gedaan.
  if (p.status !== "gepland") return { ok: true, bufferUsed: false };

  const { data: buffer } = await admin
    .from("planned_pages")
    .select("id")
    .eq("plan_month_id", p.plan_month_id)
    .eq("is_buffer", true)
    .eq("status", "gepland")
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  if (!buffer) return { ok: true, bufferUsed: false };

  await admin
    .from("planned_pages")
    .update({
      is_buffer: false,
      sort_order: p.sort_order,
      scheduled_for: p.scheduled_for,
    })
    .eq("id", buffer.id as string);

  return { ok: true, bufferUsed: true };
}

/**
 * Markeren als geplaatst.
 *
 * Besluit 8: zowel de eigenaar als de klant mag dit, en we leggen vast wie.
 * Nova noemt dit onomkeerbaar (`cannotBeUndoneDescription`) en dat is het hier
 * ook: de status gaat naar `geplaatst` en de datum staat vast. Het scherm zegt
 * dat vooraf, in een eigen blok.
 */
export async function markPosted(
  admin: Admin,
  pageId: string,
  input: { url: string; userId: string },
): Promise<boolean> {
  const { error } = await admin
    .from("planned_pages")
    .update({
      status: "geplaatst",
      posted_at: new Date().toISOString(),
      posted_url: input.url,
      posted_by_user_id: input.userId,
      url_path: input.url,
    })
    .eq("id", pageId)
    .neq("status", "geplaatst");

  if (error) {
    console.error("Markeren als geplaatst mislukt:", error.message);
    return false;
  }
  return true;
}
