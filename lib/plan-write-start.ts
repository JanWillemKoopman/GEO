import "server-only";

/**
 * ÉÉN GEPLANDE PAGINA AAN HET SCHRIJVEN KRIJGEN.
 *
 * ── WAAROM DIT UIT DE CRON GETILD IS (22 september 2026) ───────────────────
 *
 * Deze stappen stonden alleen in `/api/cron/plan`: beslissen of er geschreven
 * mag worden, de briefing samenstellen, de doelvragen bij de kans zoeken, de
 * schrijftaak inplannen en de pagina op `schrijven` zetten. Sinds de beheerder
 * een pagina met de hand nu kan laten schrijven (het menu achter de drie
 * puntjes in het contentplan) zijn er twee aanroepers, en twee kopieën van deze
 * vijf stappen lopen gegarandeerd uit elkaar. Die van de cron zou dan wel de
 * doelvragen meesturen en die van de knop niet, en dan mist de effectmeting bij
 * precies de pagina's die iemand met spoed liet schrijven.
 *
 * ── HET VERSCHIL TUSSEN DE CRON EN DE KNOP ─────────────────────────────────
 *
 * Alleen `negeerPlanning`. De cron wacht op twee dingen die samen zeggen "de
 * klant wil dit en het is bijna zover": een goedgekeurde maand en een
 * publicatiedatum binnen tien dagen. De knop is een beheerder die nu iets wil,
 * expliciet, met zijn eigen hand, achter de kostenrem van besluit 18. Die twee
 * wachtregels gelden dan niet; alle andere wél. Een pagina zonder gemeten
 * cluster blijft ongeschreven, ook met de knop, want zonder meting schrijft het
 * model iets algemeens over het onderwerp en dat is precies de tekst waarvoor
 * niemand betaalt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { planContentDraft, planContentBriefing, currentPiece } from "@/lib/jobs/content-jobs";
import type { RecommendationPayload } from "@/lib/jobs/types";
import { ensureBriefingPieces } from "@/lib/pipeline/briefing";
import { beoordeelPagina } from "@/lib/pipeline/input-gate";
import { openVragenVanPagina } from "@/lib/open-questions";
import { schrijfpoort, type SchrijfReden } from "@/lib/content-write-gate";
import type { InputStand } from "@/lib/content-input-gate";
import { writeDecision, planBriefing, type WriteBlock } from "@/lib/plan-writing";
import { targetsFromSourceRef } from "@/lib/plan-backlog-data";
import type { AnalysisStatus, PageType, PlanMonthStatus, PlannedPageStatus } from "@/lib/types/database";

type Admin = SupabaseClient;

/** De kolommen die deze module nodig heeft, inclusief de joins. */
export interface TeSchrijvenPagina {
  id: string;
  profile_id: string;
  title: string;
  page_type: PageType;
  status: PlannedPageStatus;
  scheduled_for: string | null;
  is_buffer: boolean;
  topic_id: string | null;
  source: string | null;
  why: string | null;
  target_intent: string | null;
  recommendation_action: string | null;
  existing_url: string | null;
  related_url: string | null;
  source_ref: string | null;
  plan_months: { month_number: number; status: PlanMonthStatus } | null;
  profile_funnel_stages: { label: string } | null;
  profile_topics: {
    title: string;
    analysis_id: string | null;
    analyses: { status: AnalysisStatus; user_id: string } | null;
  } | null;
}

/** De selectie die bij `TeSchrijvenPagina` hoort. Eén plek, twee aanroepers. */
export const SCHRIJFPAGINA_KOLOMMEN = `id, profile_id, title, page_type, status, scheduled_for, is_buffer, topic_id,
   source, why, target_intent, recommendation_action, existing_url, related_url, source_ref,
   plan_months!inner(month_number, status),
   profile_funnel_stages(label),
   profile_topics(title, analysis_id, analyses(status, user_id))`;

/**
 * Dezelfde rijvorm als `SCHRIJFPAGINA_KOLOMMEN`, maar opgebouwd uit platte
 * uitvragen. Voor de plekken die per pagina laden (de schrijfpoort na elk
 * antwoord): die worden in `scripts/test-chain.ts` tegen een echte Postgres
 * getoetst, en de shim daar bootst geen `!inner` en geen dubbel geneste select
 * na. Drie kleine uitvragen in plaats van één grote kost hier niets, want het
 * gaat om één pagina tegelijk.
 */
export async function laadSchrijfpagina(
  admin: Admin,
  filter: { id: string } | { contentPieceId: string },
): Promise<(TeSchrijvenPagina & { content_piece_id: string | null; plan_month_id: string }) | null> {
  let q = admin
    .from("planned_pages")
    .select(
      "id, profile_id, title, page_type, status, scheduled_for, is_buffer, topic_id, source, why, " +
        "target_intent, recommendation_action, existing_url, related_url, source_ref, " +
        "plan_month_id, funnel_stage_id, content_piece_id",
    );
  q = "id" in filter ? q.eq("id", filter.id) : q.eq("content_piece_id", filter.contentPieceId).eq("status", "gepland");
  const { data } = await q.limit(1).maybeSingle();
  const rij = data as unknown as Record<string, unknown> | null;
  if (!rij) return null;

  const [{ data: maand }, { data: fase }, { data: topic }] = await Promise.all([
    admin.from("plan_months").select("month_number, status").eq("id", rij.plan_month_id as string).maybeSingle(),
    rij.funnel_stage_id
      ? admin.from("profile_funnel_stages").select("label").eq("id", rij.funnel_stage_id as string).maybeSingle()
      : Promise.resolve({ data: null }),
    rij.topic_id
      ? admin.from("profile_topics").select("title, analysis_id").eq("id", rij.topic_id as string).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const analysisId = (topic as { analysis_id?: string | null } | null)?.analysis_id ?? null;
  const { data: analyse } = analysisId
    ? await admin.from("analyses").select("status, user_id").eq("id", analysisId).maybeSingle()
    : { data: null };

  return {
    ...(rij as unknown as TeSchrijvenPagina),
    content_piece_id: (rij.content_piece_id as string | null) ?? null,
    plan_month_id: rij.plan_month_id as string,
    plan_months: (maand as TeSchrijvenPagina["plan_months"]) ?? null,
    profile_funnel_stages: (fase as TeSchrijvenPagina["profile_funnel_stages"]) ?? null,
    profile_topics: topic
      ? {
          title: (topic as { title: string }).title,
          analysis_id: analysisId,
          analyses: (analyse as { status: AnalysisStatus; user_id: string } | null) ?? null,
        }
      : null,
  };
}

export type SchrijfUitkomst =
  /** De schrijftaak staat in de wachtrij en de pagina staat op 'schrijven'. */
  | { uitkomst: "ingepland" }
  /** De taak stond al in de rij van een eerdere ronde. Geen tweede taak. */
  | { uitkomst: "al_bezig" }
  /** Er stond al een afgeronde tekst met deze titel onder dit cluster. */
  | { uitkomst: "al_klaar" }
  /** Er mag (nog) niet geschreven worden, met de reden erbij. */
  | { uitkomst: "geblokkeerd"; reden: WriteBlock }
  | { uitkomst: "mislukt" };

/** Een schrijf- of voorbereidingsopdracht voor één plan-pagina, of waarom die er niet is. */
export type Opdracht =
  | { ok: true; analysisId: string; userId: string; recommendation: RecommendationPayload }
  | { ok: false; reden: WriteBlock };

/**
 * Wat ORBIT ENGINE over deze pagina moet weten om hem voor te bereiden of te
 * schrijven. Eén plek, zodat de voorbereiding en het schrijven exact dezelfde
 * aanbeveling zien: de titel is de sleutel waarop `currentPiece()` de rij met
 * de vragen terugvindt, en een titel die tussen die twee stappen verschilt levert
 * een tweede, lege pagina op.
 *
 * `negeerPlanning` slaat alleen de twee wachtregels van `writeDecision()` over
 * (de vrijgegeven maand en het tiendaagse venster). Het tiendaagse venster staat
 * sinds 23 september 2026 in de schrijfpoort (`lib/content-write-gate.ts`).
 */
export async function bouwOpdracht(
  admin: Admin,
  pagina: TeSchrijvenPagina,
  nu: Date,
  opties: { negeerPlanning?: boolean } = {},
): Promise<Opdracht> {
  const maand = pagina.plan_months;
  if (!maand) return { ok: false, reden: "geen_datum" };
  const topic = pagina.profile_topics;
  const besluit = writeDecision(
    {
      status: pagina.status,
      // De datumregel valt hier altijd weg: de schrijfpoort weegt hem, en de
      // voorbereiding hoort juist ruim vóór die datum te beginnen. Een datum
      // verzinnen zou een publicatiedatum vervalsen; daarom wordt de regel
      // overgeslagen en niet de waarde vervangen.
      scheduled_for: pagina.scheduled_for ? nu.toISOString().slice(0, 10) : null,
      is_buffer: pagina.is_buffer,
      topic_id: pagina.topic_id,
    },
    opties.negeerPlanning ? "goedgekeurd" : maand.status,
    topic ? { analysis_id: topic.analysis_id, analysis_status: topic.analyses?.status ?? null } : null,
    nu,
  );
  if (!besluit.schrijven) return { ok: false, reden: besluit.reden };

  // De EIGENAAR van de analyse schrijft, niet de cron en niet de beheerder: de
  // contentpijplijn legt `user_id` vast bij de pagina, en die moet van de klant zijn.
  const userId = topic?.analyses?.user_id;
  if (!userId) return { ok: false, reden: "geen_analyse" };

  const briefing = planBriefing({
    title: pagina.title,
    pageType: pagina.page_type,
    topicTitle: topic?.title ?? null,
    funnelLabel: pagina.profile_funnel_stages?.label ?? null,
    monthNumber: maand.month_number,
  });
  const uitKans = pagina.source === "aanbeveling";
  // `source_ref` wijst naar de aanbeveling met de doelvragen. Zonder dit blijft
  // `targets` leeg en slaat `planImpactWaves()` de effectmeting over.
  const { reportId, targets } = uitKans
    ? await targetsFromSourceRef(admin, pagina.source_ref)
    : { reportId: null, targets: [] };

  return {
    ok: true,
    analysisId: besluit.analysisId,
    userId,
    recommendation: {
      ...briefing,
      why: uitKans && pagina.why ? pagina.why : briefing.why,
      targetIntent: uitKans && pagina.target_intent ? pagina.target_intent : briefing.targetIntent,
      // Bij "verbeteren" hoort de schrijfstap een BESTAANDE pagina aan te vullen
      // (25 augustus 2026: vier van de zeven kansen van Gasservice Brabant
      // zouden anders een tweede pagina hebben opgeleverd).
      action: pagina.recommendation_action === "verbeteren" ? "verbeteren" : "nieuw",
      existingUrl: pagina.recommendation_action === "verbeteren" ? pagina.existing_url : null,
      relatedUrl: pagina.recommendation_action === "verbeteren" ? null : pagina.related_url,
      reportId,
      targets,
    },
  };
}

/**
 * ⚠️ `negeerPlanning` slaat ALLEEN de twee wachtregels over: de goedkeuring van
 * de maand en het tiendaagse venster. Alles wat over de inhoud gaat (is er een
 * onderwerp, hangt er een gemeten cluster aan, staat de pagina nog op 'gepland')
 * blijft staan, want daar komt anders een lege tekst uit.
 */
export async function startPaginaSchrijven(
  admin: Admin,
  pagina: TeSchrijvenPagina,
  nu: Date,
  opties: { negeerPlanning?: boolean } = {},
): Promise<SchrijfUitkomst> {
  const opdracht = await bouwOpdracht(admin, pagina, nu, opties);
  if (!opdracht.ok) return { uitkomst: "geblokkeerd", reden: opdracht.reden };

  try {
    const { created, alreadyDone } = await planContentDraft(admin, {
      analysisId: opdracht.analysisId,
      userId: opdracht.userId,
      plannedPageId: pagina.id,
      recommendation: opdracht.recommendation,
    });

    if (alreadyDone) {
      await admin
        .from("planned_pages")
        .update({ status: "ter_goedkeuring" })
        .eq("id", pagina.id)
        .eq("status", "gepland");
      return { uitkomst: "al_klaar" };
    }

    if (!created) return { uitkomst: "al_bezig" };

    await admin
      .from("planned_pages")
      .update({ status: "schrijven" })
      .eq("id", pagina.id)
      .eq("status", "gepland");
    return { uitkomst: "ingepland" };
  } catch (err) {
    console.error(`Schrijftaak voor pagina ${pagina.id} mislukte:`, err);
    return { uitkomst: "mislukt" };
  }
}

/**
 * Waarom er niet geschreven kan worden, in de taal van het scherm.
 *
 * Nova's wie-is-aan-zet-taal: niet "geblokkeerd" maar wat er moet gebeuren. Een
 * beheerder die op de knop drukt hoort te lezen wat hem tegenhoudt, niet een
 * sleutelwoord uit de code.
 */
export const SCHRIJFBLOKKADE_TEKST: Record<WriteBlock, string> = {
  maand_niet_goedgekeurd: "Deze maand is nog niet vrijgegeven.",
  nog_niet_aan_de_beurt: "Deze pagina is nog niet aan de beurt.",
  is_buffer: "Dit is een reservepagina; zet hem eerst in een maand.",
  geen_datum: "Deze pagina heeft nog geen publicatiedatum.",
  al_onderweg: "Deze pagina wordt al geschreven of is al klaar.",
  geen_onderwerp: "Deze pagina hangt nog aan geen enkel onderwerp.",
  geen_analyse: "Er is nog geen cluster gestart voor dit onderwerp, dus er is niets om op te schrijven.",
  meting_nog_niet_klaar:
    "De meting van dit cluster loopt nog. Zonder meting schrijft ORBIT ENGINE iets algemeens.",
};

// ════════════════════════════════════════════════════════════════════════════
// EERST VOORBEREIDEN, DAN PAS SCHRIJVEN (contentflow-een-lijn.md §3 en §4.3)
// ════════════════════════════════════════════════════════════════════════════
//
// Tot 23 september 2026 schreef het contentplan tien dagen vóór de datum, zonder
// één vraag te stellen. Nu gaat elke pagina door twee stappen:
//
//   1. VOORBEREIDEN, zodra de maand vrijgegeven is: contract, feitenkaart en
//      vragen. Alle pagina's van de maand tegelijk, zodat de klant één
//      vragenmoment per maand heeft en niet vijf losse (§3.1).
//   2. SCHRIJVEN, zodra de schrijfpoort (`lib/content-write-gate.ts`) opengaat:
//      elke vraag beantwoord of overgeslagen, genoeg om op te schrijven, en de
//      schrijfdatum bereikt. Het laatste antwoord is de handeling; er is geen knop.

export type VoorbereidUitkomst =
  | { uitkomst: "gestart"; pieceId: string }
  | { uitkomst: "al_voorbereid"; pieceId: string }
  | { uitkomst: "al_klaar"; pieceId: string }
  | { uitkomst: "geblokkeerd"; reden: WriteBlock };

/**
 * Start de voorbereiding voor een reeks plan-pagina's.
 *
 * Eén batch per cluster, want de briefing werkt per analyse en voegt binnen een
 * batch overlappende vragen samen: vijf pagina's over wagenparkbeheer leveren
 * dan één keer "wat kost het bij jullie" op en niet vijf keer.
 *
 * De plan-pagina krijgt meteen de id van zijn rij in `content_pieces`. Daar
 * hangen de vragen aan, en daaraan ziet `lib/pagina-stand.ts` dat hij in
 * voorbereiding is. Voorheen kreeg het plan die koppeling pas na het schrijven.
 */
export async function startVoorbereiding(
  admin: Admin,
  paginas: TeSchrijvenPagina[],
  nu: Date,
  opties: { negeerPlanning?: boolean } = {},
): Promise<Map<string, VoorbereidUitkomst>> {
  const uitkomsten = new Map<string, VoorbereidUitkomst>();
  const perCluster = new Map<string, { userId: string; items: { pagina: TeSchrijvenPagina; rec: RecommendationPayload }[] }>();

  for (const pagina of paginas) {
    if (pagina.status !== "gepland") continue;
    const opdracht = await bouwOpdracht(admin, pagina, nu, opties);
    if (!opdracht.ok) {
      uitkomsten.set(pagina.id, { uitkomst: "geblokkeerd", reden: opdracht.reden });
      continue;
    }

    // ⚠️ Staat er al een tekst met deze titel onder dit cluster, dan is er niets
    // voor te bereiden. `ensureBriefingPieces()` zou anders een nieuwe, lege
    // versie aanmaken naast een tekst die de klant al had.
    const bestaand = await currentPiece(admin, opdracht.analysisId, opdracht.recommendation.title);
    if (bestaand && bestaand.status !== "briefing" && bestaand.status !== "draft") {
      await admin
        .from("planned_pages")
        .update({ content_piece_id: bestaand.id, status: bestaand.status === "published" ? "geplaatst" : "ter_goedkeuring" })
        .eq("id", pagina.id)
        .eq("status", "gepland");
      uitkomsten.set(pagina.id, { uitkomst: "al_klaar", pieceId: bestaand.id });
      continue;
    }

    const groep = perCluster.get(opdracht.analysisId) ?? { userId: opdracht.userId, items: [] };
    groep.items.push({ pagina, rec: opdracht.recommendation });
    perCluster.set(opdracht.analysisId, groep);
  }

  for (const [analysisId, groep] of perCluster) {
    const ids = await ensureBriefingPieces(admin, analysisId, groep.items.map((i) => i.rec));
    const nogTeDoen: RecommendationPayload[] = [];

    for (const [n, item] of groep.items.entries()) {
      const pieceId = ids[n];
      await admin.from("planned_pages").update({ content_piece_id: pieceId }).eq("id", item.pagina.id);

      const { data: rij } = await admin
        .from("content_pieces")
        .select("briefing_snapshot_json")
        .eq("id", pieceId)
        .maybeSingle();
      if (rij?.briefing_snapshot_json) {
        // Al voorbereid (bijvoorbeeld via de oude route vanuit een cluster). De
        // vragen staan er al; opnieuw draaien zou geld kosten en dubbele vragen
        // riskeren. Wel meteen kijken of hij geschreven mag worden.
        uitkomsten.set(item.pagina.id, { uitkomst: "al_voorbereid", pieceId });
      } else {
        nogTeDoen.push(item.rec);
        uitkomsten.set(item.pagina.id, { uitkomst: "gestart", pieceId });
      }
    }

    if (nogTeDoen.length > 0) {
      await planContentBriefing(admin, { analysisId, userId: groep.userId, recommendations: nogTeDoen });
    }
  }

  for (const u of uitkomsten.values()) {
    if (u.uitkomst === "al_voorbereid") await probeerTeSchrijven(admin, u.pieceId, nu, opties);
  }
  return uitkomsten;
}

export type ProbeerUitkomst =
  | { uitkomst: "geschreven_ingepland" }
  | { uitkomst: "wacht"; reden: SchrijfReden | "maand_niet_vrij" | "geen_plan" | "niet_van_toepassing" }
  | { uitkomst: "geblokkeerd"; reden: WriteBlock }
  | { uitkomst: "mislukt" };

/**
 * Mag deze pagina nu geschreven worden? Zo ja: doen.
 *
 * Aangeroepen na elk antwoord of overgeslagen vraag, aan het eind van de
 * voorbereiding, en elke ochtend door de cron als vangnet (conventie 1): een
 * route die de aanroep vergeet, laat een pagina dan hooguit een dag liggen en
 * niet voorgoed.
 *
 * ⚠️ Alleen voor pagina's in het contentplan. Een losse pagina uit de oude
 * route vanuit een cluster wordt hier niet stil geschreven: dat zou geld
 * uitgeven waar niemand om vroeg. Die pagina's worden eerst aan het plan
 * gekoppeld (§5).
 */
export async function probeerTeSchrijven(
  admin: Admin,
  pieceId: string,
  nu: Date,
  opties: { negeerPlanning?: boolean } = {},
): Promise<ProbeerUitkomst> {
  const { data: piece } = await admin
    .from("content_pieces")
    .select("id, title, status, is_current, analysis_id, contract_json, write_mode, briefing_snapshot_json, target_intent, analyses(profile_id)")
    .eq("id", pieceId)
    .maybeSingle();
  // Een rij die niet meer de huidige is, is door de klant losgelaten ("laat
  // deze pagina vallen") of vervangen: die wordt nooit meer geschreven.
  if (!piece || piece.status !== "briefing" || piece.is_current === false) {
    return { uitkomst: "wacht", reden: "niet_van_toepassing" };
  }

  const pagina = await laadSchrijfpagina(admin, { contentPieceId: pieceId });
  if (!pagina) return { uitkomst: "wacht", reden: "geen_plan" };
  if (!opties.negeerPlanning && pagina.plan_months?.status !== "goedgekeurd") {
    return { uitkomst: "wacht", reden: "maand_niet_vrij" };
  }

  const voorbereid = Boolean(piece.briefing_snapshot_json);
  const open = voorbereid ? await openVragenVanPagina(admin, pieceId) : Number.NaN;

  // De inputpoort pas wegen als alles gedaan is: daarvóór verandert het oordeel
  // nog met elk antwoord, en de berekening bouwt een feitenkaart op.
  let inputStand: InputStand | null = null;
  if (voorbereid && open === 0 && piece.contract_json) {
    const profileId = (piece as { analyses?: { profile_id?: string } | null }).analyses?.profile_id;
    if (profileId) {
      const oordeel = await beoordeelPagina(admin, {
        analysisId: piece.analysis_id as string,
        profileId,
        piece: piece as never,
      });
      inputStand = oordeel.stand;
    }
  }

  const poort = schrijfpoort({
    openVragen: open,
    voorbereidingKlaar: voorbereid,
    inputStand,
    writeMode: piece.write_mode === "algemeen" ? "algemeen" : null,
    publicatiedatum: opties.negeerPlanning ? null : alsDag(pagina.scheduled_for),
    vandaag: nu.toISOString().slice(0, 10),
  });
  if (!poort.mag) return { uitkomst: "wacht", reden: poort.reden! };

  const start = await startPaginaSchrijven(admin, pagina, nu, { negeerPlanning: true });
  if (start.uitkomst === "ingepland" || start.uitkomst === "al_bezig") return { uitkomst: "geschreven_ingepland" };
  if (start.uitkomst === "geblokkeerd") return { uitkomst: "geblokkeerd", reden: start.reden };
  if (start.uitkomst === "al_klaar") return { uitkomst: "wacht", reden: "niet_van_toepassing" };
  return { uitkomst: "mislukt" };
}

/** Na een antwoord: probeer elke pagina waar deze vragen aan hangen. */
export async function probeerNaAntwoord(admin: Admin, vraagIds: string[], nu: Date = new Date()): Promise<void> {
  if (vraagIds.length === 0) return;
  const { data } = await admin.from("fact_requests").select("content_piece_ids").in("id", vraagIds);
  const pieceIds = new Set(
    ((data ?? []) as { content_piece_ids: string[] | null }[]).flatMap((r) => r.content_piece_ids ?? []),
  );
  for (const pieceId of pieceIds) {
    try {
      await probeerTeSchrijven(admin, pieceId, nu);
    } catch (err) {
      // Het antwoord is opgeslagen; dat mag niet mislukken omdat het inplannen
      // daarna haperde. De cron pakt de pagina morgenochtend alsnog op.
      console.error(`Schrijven na antwoord voor pagina ${pieceId} mislukte:`, err);
    }
  }
}

/**
 * Een datumkolom als `YYYY-MM-DD`. PostgREST geeft een string, een rechtstreekse
 * Postgres-verbinding (de ketentest) een `Date`; beide horen hetzelfde op te leveren.
 */
function alsDag(waarde: unknown): string | null {
  if (!waarde) return null;
  if (waarde instanceof Date) {
    // Een kale datum komt als lokale middernacht binnen; de lokale getters geven
    // dan dezelfde dag terug die in de database staat.
    const j = waarde.getFullYear();
    const m = String(waarde.getMonth() + 1).padStart(2, "0");
    const d = String(waarde.getDate()).padStart(2, "0");
    return `${j}-${m}-${d}`;
  }
  return String(waarde).slice(0, 10);
}
