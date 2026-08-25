import "server-only";

/**
 * Het contentplan: aanmaken, lezen, goedkeuren, plaatsen.
 *
 * De rekenkant staat in `lib/plan-schedule.ts` (kalender en publicatiedata) en
 * `lib/plan-backlog.ts` (de voorraad), de statustaal in `lib/plan-status.ts`,
 * alle drie zonder `server-only` (conventie 2). Hier staat alles wat de database
 * raakt.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FUNNELS, MONTHS_AHEAD } from "@/lib/plan-constants";
import { resequenceMonth, spreadDates, type HerplanRij } from "@/lib/plan-schedule";
import { syncBacklog, meetbareVragenPerAnalyse } from "@/lib/plan-backlog-data";
import { sortBacklog, type BacklogItem } from "@/lib/plan-backlog";
import type { TopicWritingState } from "@/lib/plan-writing";
import type {
  AnalysisStatus,
  ContentPlan,
  FunnelStage,
  PlanMonth,
  PlannedPage,
} from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

export interface PlanBundle {
  plan: ContentPlan;
  months: PlanMonth[];
  /** Wat in een maand van DIT plan staat. */
  pages: PlannedPage[];
  /** Wat beschikbaar is maar nog geen maand heeft, op potentie gesorteerd. */
  backlog: BacklogItem[];
  /**
   * De clusters die al minstens één kans hebben opgeleverd, ingepland of niet.
   *
   * ⚠️ Niet af te leiden uit de voorraad alleen. Een cluster waarvan alle kansen
   * al in een maand staan, zou dan als "nog niet gemeten" op het scherm komen,
   * en dan staat er een meetknop bij een cluster dat net gemeten is.
   */
  metKansen: string[];
  funnels: FunnelStage[];
  topics: TopicWritingState[];
}

/**
 * Het lopende plan van een merk, met alles eromheen. Null als er nog geen is.
 *
 * ── DE VOORRAAD WORDT EERST BIJGEWERKT ──────────────────────────────────────
 *
 * `syncBacklog()` draait vóór het lezen, zodat een cluster dat gisteren gemeten
 * is vandaag zijn kansen in de lijst heeft staan zonder dat iemand op een knop
 * hoefde te drukken. Idempotent en licht (conventie 9); zet `sync` op false in
 * tests die de voorraad zelf klaarzetten.
 *
 * ⚠️ De pagina's worden begrensd tot de maanden van DIT plan. Dat was een stille
 * fout: `planned_pages` hangt aan het merk en niet aan de planversie, dus na een
 * tweede planversie las het scherm ook de 132 rijen van de eerste mee. Zichtbaar
 * werden ze niet (ze horen bij maanden die niet in dit plan zitten), maar de
 * teller bovenaan telde ze wél mee.
 */
export async function loadPlan(
  admin: Admin,
  profileId: string,
  opties: { sync?: boolean } = {},
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

  if (opties.sync !== false) await syncBacklog(admin, profileId);

  const { data: monthRows } = await admin
    .from("plan_months")
    .select("*")
    .eq("plan_id", plan.id)
    .order("month_number");

  const months = (monthRows ?? []) as PlanMonth[];
  const monthIds = months.map((m) => m.id);

  const [{ data: pages }, { data: voorraadRows }, { data: funnels }, { data: topics }] =
    await Promise.all([
      monthIds.length > 0
        ? admin
            .from("planned_pages")
            .select("*")
            .eq("profile_id", profileId)
            .in("plan_month_id", monthIds)
            .order("sort_order")
        : Promise.resolve({ data: [] }),
      // De voorraad hoort bij het MERK en niet bij de planversie: wat nog niet
      // geschreven is, is niet van een plan maar van de klant. `afgewezen`
      // blijft staan in de database (conventie 8) maar hoort niet in de lijst.
      admin
        .from("planned_pages")
        .select("*")
        .eq("profile_id", profileId)
        .is("plan_month_id", null)
        .neq("status", "afgewezen"),
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

  const voorraad = (voorraadRows ?? []) as unknown as VoorraadRow[];

  // De clusternamen apart ophalen in plaats van ze mee te joinen. Een geneste
  // selectie zou korter zijn, maar dit pad draagt het hele planscherm: gaat de
  // vorm van zo'n join ergens mis, dan valt het scherm om in plaats van dat er
  // één naam ontbreekt.
  const clusterIds = [
    ...new Set(voorraad.map((v) => v.source_analysis_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: clusterRows } = clusterIds.length
    ? await admin.from("analyses").select("id, topic").in("id", clusterIds)
    : { data: [] };
  const clusterNaam = new Map(
    ((clusterRows ?? []) as { id: string; topic: string | null }[]).map((c) => [c.id, c.topic]),
  );

  const { data: kansClusters } = await admin
    .from("planned_pages")
    .select("source_analysis_id")
    .eq("profile_id", profileId)
    .not("source_analysis_id", "is", null);
  const gemeten = await meetbareVragenPerAnalyse(
    admin,
    [...new Set(voorraad.map((v) => v.source_analysis_id).filter((id): id is string => Boolean(id)))],
  );

  return {
    plan,
    months,
    pages: (pages ?? []) as PlannedPage[],
    backlog: sortBacklog(voorraad.map((rij) => naarBacklogItem(rij, gemeten, clusterNaam))),
    metKansen: [
      ...new Set(
        ((kansClusters ?? []) as { source_analysis_id: string | null }[])
          .map((r) => r.source_analysis_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ],
    funnels: (funnels ?? []) as FunnelStage[],
    topics: ((topics ?? []) as unknown as TopicRow[]).map((t) => ({
      topicId: t.id,
      title: t.title,
      analysisId: t.analysis_id,
      analysisStatus: t.analyses?.status ?? null,
    })),
  };
}

/** Een voorraadrij zoals de query hem oplevert. */
interface VoorraadRow extends PlannedPage {
  source_analysis_id: string | null;
  recommendation_action: string | null;
  existing_url: string | null;
  why: string | null;
  target_intent: string | null;
  target_count: number | null;
  target_weight: number | null;
  potential: number | null;
}

function naarBacklogItem(
  rij: VoorraadRow,
  gemeten: Map<string, number>,
  clusterNaam: Map<string, string | null>,
): BacklogItem {
  return {
    id: rij.id,
    title: rij.title,
    why: rij.why,
    targetIntent: rij.target_intent,
    cluster: rij.source_analysis_id ? (clusterNaam.get(rij.source_analysis_id) ?? null) : null,
    clusterId: rij.source_analysis_id,
    handeling:
      rij.recommendation_action === "verbeteren"
        ? "verbeteren"
        : rij.recommendation_action === "nieuw"
          ? "nieuw"
          : null,
    existingUrl: rij.existing_url,
    // ⚠️ `Number()` en geen kale cast. Postgres levert `numeric` als tekst aan de
    // JS-client, en een tekst sorteert alfabetisch: dan komt "9" boven "80".
    potentie: rij.potential === null ? null : Number(rij.potential),
    raakt: rij.target_count,
    gemeten: rij.source_analysis_id ? (gemeten.get(rij.source_analysis_id) ?? null) : null,
    gewicht: rij.target_weight === null ? null : Number(rij.target_weight),
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
 * Stelt een nieuw plan op: twaalf lege maanden en een voorzet voor de eerste.
 *
 * ── WAT HIER OP 25 AUGUSTUS 2026 IS VERDWENEN ───────────────────────────────
 *
 * De jaarverdeling. `buildPlan()` vulde alle twaalf maanden vooruit door elk
 * cluster met elke funnelfase te combineren. Bij Gasservice Brabant leverde dat
 * 120 rijen op uit 28 unieke titels: elke titel stond er vier tot vijf keer in.
 * En van die 120 waren er 17 daadwerkelijk te schrijven, want zes van de zeven
 * clusters zijn nooit gemeten en zonder meting heeft de schrijfstap geen
 * briefing.
 *
 * Een plan dat een jaar vooruit belooft wat het niet kan waarmaken, is geen
 * planning maar decor. Wat ervoor in de plaats komt: de voorraad
 * (`lib/plan-backlog-data.ts`) met alleen gemeten kansen, en een mens die zelf
 * bepaalt welke daarvan in welke maand terechtkomen.
 *
 * ── WAAROM MAAND 1 TOCH EEN VOORZET KRIJGT ──────────────────────────────────
 *
 * Twaalf lege maanden zijn eerlijk maar doen niets. Het systeem hoort de eerste
 * zet te doen en de mens hoort hem te kunnen overrulen (`docs/visie.md`: een
 * stap die het systeem zelfstandig kan zetten gaat voor een stap die weer een
 * handeling toevoegt). Dus: de kansen met de hoogste potentie vullen maand 1 tot
 * aan de quota, de rest blijft in de voorraad staan. Zijn er minder kansen dan
 * de quota, dan wordt maand 1 gewoon korter; er wordt niets bijverzonnen.
 *
 * ── WAAROM DE OUDE PLANVERSIE NIET WEGGEGOOID WORDT ─────────────────────────
 *
 * Conventie 8: alles bewaren. De vorige versie gaat op `gestopt` en blijft
 * staan, met zijn maanden en zijn pagina's. Als de klant halverwege zegt dat het
 * vorige plan beter was, moet dat terug te vinden zijn.
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
  if (input.pagesPerMonth < 1) {
    return {
      ok: false,
      problems: ["Er is geen pakket gekozen, dus ORBIT ENGINE weet niet hoeveel pagina's per maand."],
    };
  }

  // De funnelfasen blijven bestaan: ze zeggen nog steeds iets over waar een
  // pagina in de klantreis zit, ook nu ze de verdeling niet meer sturen.
  await ensureFunnels(admin, input.profileId);

  // ⚠️ Eerst de voorraad vullen, dan pas het plan aanmaken. Een leeg plan naast
  // een lege voorraad is niet te onderscheiden van een storing, en de klant
  // hoort het verschil te zien tussen "er is niets gemeten" en "er ging iets mis".
  await syncBacklog(admin, input.profileId);

  const { data: voorraadRows } = await admin
    .from("planned_pages")
    .select("id, potential, target_weight, title")
    .eq("profile_id", input.profileId)
    .is("plan_month_id", null)
    .eq("status", "gepland");

  const voorraad = (voorraadRows ?? []) as {
    id: string;
    potential: number | null;
    target_weight: number | null;
    title: string;
  }[];

  if (voorraad.length === 0) {
    return {
      ok: false,
      problems: [
        "Er zijn nog geen gemeten kansen om in te plannen. Meet eerst een cluster: ORBIT ENGINE haalt de kansen daarna uit het rapport.",
      ],
    };
  }

  const startedOn = input.startedOn ?? new Date();

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

  const eersteMaand = (monthRows as { id: string; month_number: number }[]).find(
    (m) => m.month_number === 1,
  );

  // De voorzet: de sterkste kansen bovenaan, tot aan de quota.
  const gesorteerd = [...voorraad].sort((a, b) => {
    const pa = a.potential === null ? null : Number(a.potential);
    const pb = b.potential === null ? null : Number(b.potential);
    if (pa !== null && pb !== null && pa !== pb) return pb - pa;
    if ((pa === null) !== (pb === null)) return pa === null ? 1 : -1;
    return Number(b.target_weight ?? 0) - Number(a.target_weight ?? 0);
  });
  const voorzet = gesorteerd.slice(0, input.pagesPerMonth);

  if (eersteMaand && voorzet.length > 0) {
    const data = spreadDates(startedOn.toISOString().slice(0, 10), 1, voorzet.length);
    for (const [i, kaart] of voorzet.entries()) {
      const { error } = await admin
        .from("planned_pages")
        .update({
          plan_month_id: eersteMaand.id,
          sort_order: i,
          scheduled_for: data[i] ?? null,
        })
        .eq("id", kaart.id)
        // ⚠️ Alleen als hij op dit moment nog in de voorraad staat. Zonder deze
        // voorwaarde kan een gelijktijdige sleepactie overschreven worden.
        .is("plan_month_id", null);
      if (error) {
        console.error("Voorzet inplannen mislukt:", error.message);
        break;
      }
    }
  }

  return { ok: true, planId };
}

/**
 * Een kans uit de voorraad in een maand zetten.
 *
 * ── WAT ER PRECIES VERANDERT ────────────────────────────────────────────────
 *
 * De maand, de plek in de maand en de publicatiedatum. Verder niets: de kaart
 * houdt zijn titel, zijn cluster, zijn potentie en zijn geschiedenis. Dat is het
 * hele punt van één tabel voor twee toestanden (migratie 0065).
 *
 * ⚠️ Na het inplannen wordt de HELE maand opnieuw gedateerd. Een maand met vier
 * pagina's spreidt anders dan een maand met tien, en zonder herberekening staan
 * er vier pagina's op dag 1, 4, 7 en 10 met drie weken niets erachter.
 *
 * `index` is de plek waar de kaart terechtkomt; `null` betekent onderaan.
 */
export async function assignToMonth(
  admin: Admin,
  input: {
    profileId: string;
    pageId: string;
    monthId: string;
    index: number | null;
  },
): Promise<{ ok: boolean; probleem: string | null }> {
  const maand = await maandMetPlan(admin, input.monthId, input.profileId);
  if (!maand) return { ok: false, probleem: "Deze maand hoort niet bij dit merk." };

  // ⚠️ Een geplaatste pagina verhuist niet. Zijn publicatiedatum is de
  // werkelijkheid geworden; hem naar een andere maand slepen zou een leugen
  // opleveren over wanneer er iets live ging.
  const { data: kaartRow } = await admin
    .from("planned_pages")
    .select("id, status, plan_month_id")
    .eq("id", input.pageId)
    .eq("profile_id", input.profileId)
    .maybeSingle();

  const kaart = kaartRow as { id: string; status: string; plan_month_id: string | null } | null;
  if (!kaart) return { ok: false, probleem: "Deze pagina bestaat niet." };
  if (kaart.status === "geplaatst") {
    return { ok: false, probleem: "Een pagina die al live staat, blijft in zijn eigen maand." };
  }

  const vorigeMaand = kaart.plan_month_id;

  const { error } = await admin
    .from("planned_pages")
    .update({ plan_month_id: input.monthId })
    .eq("id", input.pageId);
  if (error) {
    console.error("Inplannen mislukt:", error.message);
    return { ok: false, probleem: "Inplannen is niet gelukt." };
  }

  await herplanMaand(admin, maand, { verplaatst: input.pageId, naarIndex: input.index });
  // Kwam de kaart uit een andere maand, dan klopt de spreiding daar nu ook niet
  // meer: er is een gat gevallen.
  if (vorigeMaand && vorigeMaand !== input.monthId) {
    const oud = await maandMetPlan(admin, vorigeMaand, input.profileId);
    if (oud) await herplanMaand(admin, oud, null);
  }

  return { ok: true, probleem: null };
}

/**
 * Een pagina uit een maand halen en terugleggen in de voorraad.
 *
 * Bewust géén verwijdering: de kaart komt gewoon weer beschikbaar. Dat is het
 * verschil met `removePage()` hieronder, en het is het verschil dat het scherm
 * ook maakt: "terug naar de voorraad" is iets anders dan "hier wil ik nooit meer
 * over schrijven".
 *
 * ⚠️ Alleen wat nog niet in beweging is. Staat er al een tekst geschreven of
 * loopt de schrijftaak, dan is teruggeven naar de voorraad betaald werk
 * weggooien.
 */
export async function moveToBacklog(
  admin: Admin,
  input: { profileId: string; pageId: string },
): Promise<{ ok: boolean; probleem: string | null }> {
  const { data: kaartRow } = await admin
    .from("planned_pages")
    .select("id, status, plan_month_id")
    .eq("id", input.pageId)
    .eq("profile_id", input.profileId)
    .maybeSingle();

  const kaart = kaartRow as { id: string; status: string; plan_month_id: string | null } | null;
  if (!kaart) return { ok: false, probleem: "Deze pagina bestaat niet." };
  if (!kaart.plan_month_id) return { ok: true, probleem: null };
  if (kaart.status !== "gepland") {
    return {
      ok: false,
      probleem:
        "ORBIT ENGINE is met deze pagina bezig of heeft hem al geschreven. Verwijderen kan wel, terugleggen niet.",
    };
  }

  const maand = await maandMetPlan(admin, kaart.plan_month_id, input.profileId);

  const { error } = await admin
    .from("planned_pages")
    .update({ plan_month_id: null, scheduled_for: null, sort_order: 0 })
    .eq("id", input.pageId)
    .eq("status", "gepland");
  if (error) {
    console.error("Terugleggen mislukt:", error.message);
    return { ok: false, probleem: "Terugleggen is niet gelukt." };
  }

  if (maand) await herplanMaand(admin, maand, null);
  return { ok: true, probleem: null };
}

interface MaandMetPlan {
  id: string;
  month_number: number;
  started_on: string;
}

/**
 * De maand plus de startdatum van zijn plan, en de controle of hij bij dit merk
 * hoort.
 *
 * ⚠️ Die controle is geen dubbelop. Zonder deze regel kan iemand met toegang tot
 * merk A een kaart in een maand van merk B laten zetten door het id te raden.
 *
 * Twee losse queries en geen geneste `!inner`-select: die tweede vorm leest
 * korter maar is niet na te bootsen door de shim waarmee `scripts/test-chain.ts`
 * tegen echte Postgres draait, en een pad dat niet in de ketentest past is een
 * pad waarvan niemand weet of het werkt.
 */
async function maandMetPlan(
  admin: Admin,
  monthId: string,
  profileId: string,
): Promise<MaandMetPlan | null> {
  const { data: maandRij } = await admin
    .from("plan_months")
    .select("id, month_number, plan_id")
    .eq("id", monthId)
    .maybeSingle();

  const maand = maandRij as { id: string; month_number: number; plan_id: string } | null;
  if (!maand) return null;

  const { data: planRij } = await admin
    .from("content_plans")
    .select("profile_id, started_on")
    .eq("id", maand.plan_id)
    .maybeSingle();

  const plan = planRij as { profile_id: string; started_on: string } | null;
  if (!plan || plan.profile_id !== profileId) return null;

  return {
    id: maand.id,
    month_number: maand.month_number,
    started_on: plan.started_on,
  };
}

/**
 * Eén maand opnieuw nummeren en dateren.
 *
 * `verplaatst` zet die ene kaart eerst op de gevraagde plek; de rest schuift
 * eromheen. Zonder dat argument houdt de bestaande volgorde stand en worden
 * alleen de gaten dichtgetrokken.
 */
async function herplanMaand(
  admin: Admin,
  maand: MaandMetPlan,
  verplaatsing: { verplaatst: string; naarIndex: number | null } | null,
): Promise<void> {
  const { data } = await admin
    .from("planned_pages")
    .select("id, sort_order, scheduled_for, status")
    .eq("plan_month_id", maand.id)
    .eq("is_buffer", false)
    .neq("status", "afgewezen")
    .order("sort_order");

  let rijen = (data ?? []) as HerplanRij[];

  if (verplaatsing) {
    const kaart = rijen.find((r) => r.id === verplaatsing.verplaatst);
    if (kaart) {
      const zonder = rijen.filter((r) => r.id !== kaart.id);
      const doel =
        verplaatsing.naarIndex === null
          ? zonder.length
          : Math.max(0, Math.min(zonder.length, verplaatsing.naarIndex));
      rijen = [...zonder.slice(0, doel), kaart, ...zonder.slice(doel)];
    }
  }

  const updates = resequenceMonth(maand.started_on, maand.month_number, rijen);
  for (const u of updates) {
    await admin
      .from("planned_pages")
      .update({ sort_order: u.sort_order, scheduled_for: u.scheduled_for })
      .eq("id", u.id);
  }
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
 *
 * ── DE WEDSTRIJDCONDITIE, EN WAAROM DE UPDATE HET SLOT BEPAALT ─────────────
 *
 * ⚠️ Gevonden op 12 augustus 2026 bij het narekenen van wat er misgaat als twee
 * dingen tegelijk gebeuren. De eerste versie las eerst `status` (`gepland` of
 * niet) en besliste daarna, op die verouderde lezing, of de buffer moest
 * inschuiven. Precies tussen die lezing en die beslissing kan de content-taak
 * klaar zijn gekomen en de pagina op `geschreven` gezet hebben: dan schuift de
 * buffer alsnog in voor een slot dat al gevuld was, en staat er een
 * verweesde geschreven pagina naast een buffer die er niet had hoeven komen.
 *
 * De oplossing: de voorwaardelijke `UPDATE ... WHERE status = 'gepland'` zelf
 * bepaalt of de buffer inschuift, niet een lezing ervoor. Matcht de update geen
 * rij, dan was de pagina op dat exacte moment al iets anders dan `gepland`
 * (geschreven, geplaatst, of al verwijderd), en dan is er niets te vervangen.
 * Zelfde patroon als `approveMonth()` hierboven.
 */
export async function removePage(
  admin: Admin,
  pageId: string,
): Promise<{ ok: boolean; bufferUsed: boolean }> {
  // De atomaire poging: matcht alleen als de pagina op dit exacte moment nog
  // `gepland` is. Dat is de enige toestand waarin een buffer iets te vervangen
  // heeft.
  const { data: nogGepland, error: geplandError } = await admin
    .from("planned_pages")
    .update({ status: "afgewezen" })
    .eq("id", pageId)
    .eq("status", "gepland")
    .select("plan_month_id, sort_order, scheduled_for")
    .maybeSingle();

  if (geplandError) {
    console.error("Pagina verwijderen mislukt:", geplandError.message);
    return { ok: false, bufferUsed: false };
  }

  if (!nogGepland) {
    // Was al iets anders dan `gepland` (geschreven, geplaatst) of bestaat niet.
    // Gewoon afwijzen, zonder buffer: die had hier niets te vervangen.
    const { data: bestaatWel, error } = await admin
      .from("planned_pages")
      .update({ status: "afgewezen" })
      .eq("id", pageId)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("Pagina verwijderen mislukt:", error.message);
      return { ok: false, bufferUsed: false };
    }
    return { ok: Boolean(bestaatWel), bufferUsed: false };
  }

  const p = nogGepland as Pick<PlannedPage, "plan_month_id" | "sort_order" | "scheduled_for">;

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

  // ⚠️ Dezelfde soort race, één stap verderop: twee pagina's die vrijwel
  // tegelijk verwijderd worden in dezelfde maand kunnen allebei DEZELFDE buffer
  // uitkiezen (de `select` hierboven is geen lock). Zonder de `is_buffer`-guard
  // hier zou de tweede update de eerste stilzwijgend overschrijven, en denkt
  // één van de twee verwijderde pagina's dat hij is opgevuld terwijl dat niet
  // zo is. De guard maakt ook déze stap een voorwaardelijke update: matcht hij
  // niet, dan greep een gelijktijdige aanroep de buffer al weg.
  const { data: geclaimd } = await admin
    .from("planned_pages")
    .update({
      is_buffer: false,
      sort_order: p.sort_order,
      scheduled_for: p.scheduled_for,
    })
    .eq("id", buffer.id as string)
    .eq("is_buffer", true)
    .select("id")
    .maybeSingle();

  return { ok: true, bufferUsed: Boolean(geclaimd) };
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
