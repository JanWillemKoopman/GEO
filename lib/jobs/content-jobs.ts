import "server-only";

/**
 * Contenttaken inplannen (optimalisatie.md 4.7/4.8/4.9).
 *
 * Eén plek, omdat er nu vier ingangen zijn die allemaal hetzelfde werk starten:
 * de knop per aanbeveling, "genereer alles", opnieuw genereren, en herschrijven
 * met feedback van de klant. Als die vier hun eigen payload in elkaar zetten,
 * lopen ze uit elkaar, en dan schrijft de ene ingang mét doelvragen en de
 * andere zonder, zonder dat iemand dat merkt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { requireCount } from "@/lib/require-count";
import { ensureBriefingPieces } from "@/lib/pipeline/briefing";
import type { RecommendationPayload } from "@/lib/jobs/types";
import type { StoredRecommendation } from "@/lib/pipeline/recommendation";
import type { ContentType, ContentAction } from "@/lib/types/database";

type Admin = SupabaseClient;

export const VALID_CONTENT_TYPES: ContentType[] = ["article", "faq", "landing", "comparison"];

/** Een opgeslagen aanbeveling → de payload van een schrijftaak. */
export function toPayload(
  rec: StoredRecommendation,
  reportId: string | null,
  revisionNote: string | null = null,
): RecommendationPayload {
  return {
    title: rec.title,
    type: VALID_CONTENT_TYPES.includes(rec.type) ? rec.type : "article",
    targetIntent: rec.targetIntent,
    why: rec.why,
    action: (rec.action === "verbeteren" ? "verbeteren" : "nieuw") as ContentAction,
    existingUrl: rec.existingUrl,
    reportId,
    targets: rec.targets,
    revisionNote,
  };
}

/**
 * De HUIDIGE versie van een pagina met deze titel.
 *
 * Sinds versiebeheer (4.7) kunnen er meerdere rijen met dezelfde titel zijn;
 * `maybeSingle()` op alleen de titel zou daar op klappen. Precies het soort
 * fout dat pas opduikt zodra iemand voor de tweede keer op "opnieuw" drukt.
 */
export async function currentPiece(
  admin: Admin,
  analysisId: string,
  title: string,
): Promise<{ id: string; status: string; version: number } | null> {
  const { data } = await admin
    .from("content_pieces")
    .select("id, status, version")
    .eq("analysis_id", analysisId)
    .eq("title", title)
    .eq("is_current", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string; status: string; version: number } | null) ?? null;
}

export interface PlanResult {
  planned: number;
  skipped: number;
}

/**
 * Plant het schrijven van één pagina in.
 *
 * De dedupe-sleutel bevat de versie, zodat opnieuw genereren niet botst op de
 * sleutel van de vorige poging. Zonder dat zou "opnieuw proberen" na een
 * geslaagde generatie stil niets doen, de sleutel bestond immers al.
 */
export async function planContentDraft(
  admin: Admin,
  args: {
    analysisId: string;
    userId: string;
    recommendation: RecommendationPayload;
    regenerate?: boolean;
    /** De pagina uit het contentplan, als deze taak daaruit voortkomt (fase 4). */
    plannedPageId?: string;
  },
): Promise<{ created: boolean; alreadyDone: boolean }> {
  const { analysisId, userId, recommendation, regenerate = false } = args;

  const existing = await currentPiece(admin, analysisId, recommendation.title);
  // 'briefing' telt hier als "nog niet geschreven" (R5.1): de rij bestaat al,
  // hij is aangemaakt toen de klant de pagina koos, maar er staat nog geen
  // tekst in. Zonder deze uitzondering zou het indrukken van "Schrijf mijn
  // pagina's" na de briefing stil niets doen, want de pagina lijkt dan al klaar.
  if (existing && existing.status !== "draft" && existing.status !== "briefing" && !regenerate) {
    return { created: false, alreadyDone: true };
  }

  const nextVersion = existing ? (regenerate ? existing.version + 1 : existing.version) : 1;

  // Het aantal beantwoorde briefingvragen telt mee in de dedupe-sleutel (R5.1).
  // "Schrijf met wat je hebt" en "schrijf nadat ik alsnog twee vragen beantwoord
  // heb" zijn twee verschillende opdrachten met een verschillende feitenkaart.
  // Zonder dit zou die tweede klik stil genegeerd worden, de sleutel bestond
  // immers al, en zou het antwoord van de klant nooit in de tekst belanden.
  //
  // ⚠️ De telling liep over `analysis_id`, en dat sloeg bijna de helft van de
  // antwoorden over: vragen met `scope = 'merk'` worden bewust met
  // `analysis_id = null` opgeslagen (briefing.ts), want ze gelden voor álle
  // analyses van dit profiel. In productie is dat 9 van de 21 beantwoorde vragen
  // (43%), inclusief BEIDE verplichte landing-slots (telefoon/adres en de
  // contact-URL). Een klant die alleen merkbrede vragen beantwoordde en opnieuw
  // op "Schrijf mijn pagina's" klikte, kreeg dus een taak die stil op de sleutel
  // sneuvelde: exact het scenario dat deze sleutel moest voorkomen.
  //
  // Nu tellen we met dezelfde reikwijdte die `buildFactBase()` hanteert:
  // merkbreed telt altijd mee, analyse-specifiek alleen bij deze analyse. Wat de
  // feitenkaart gebruikt, moet de sleutel zien.
  const { data: analyseRij } = await admin
    .from("analyses")
    .select("profile_id")
    .eq("id", analysisId)
    .maybeSingle();

  // ⚠️ Dit getal zit IN de dedupe-sleutel, en dat maakt een stille nul hier
  // erger dan hij lijkt. Faalt de telling en wordt hij 0, dan is de sleutel
  // gelijk aan die van een eerdere poging waarin er echt nul antwoorden waren.
  // De taak wordt dan als dubbel gezien en NIET ingepland: de klant heeft net
  // drie feitvragen beantwoord, verwacht een herschreven pagina, en er gebeurt
  // niets. Geen foutmelding, geen taak, niets om terug te vinden.
  const beantwoord = requireCount(
    analyseRij?.profile_id
      ? await admin
          .from("fact_requests")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", analyseRij.profile_id)
          .eq("status", "beantwoord")
          .or(`scope.eq.merk,analysis_id.eq.${analysisId}`)
      : await admin
          .from("fact_requests")
          .select("id", { count: "exact", head: true })
          .eq("analysis_id", analysisId)
          .eq("status", "beantwoord"),
    "de beantwoorde feitvragen van dit merk",
  );

  // ── De planstap gaat vóór het schrijven (A1/A2, migratie 0082) ────────────
  //
  // Deze functie plande vroeger rechtstreeks `content_draft`. Nu start hij
  // `content_plan`, en die taak plant het schrijven zelf in zodra het
  // itemdossier en het contract klaarstaan. Voor de vier ingangen die deze
  // functie aanroepen verandert er niets: ze vragen nog steeds "schrijf deze
  // pagina", alleen begint dat werk nu met uitzoeken wat erop moet.
  //
  // De dedupe-sleutel houdt dezelfde twee onderdelen als voorheen (de versie en
  // het aantal beantwoorde vragen), want die bepalen nog steeds of dit dezelfde
  // opdracht is of een nieuwe. Alleen het voorvoegsel verschilt, zodat een
  // plantaak nooit botst met een schrijftaak over dezelfde pagina.
  const { created } = await enqueue(admin, {
    type: "content_plan",
    payload: { userId, recommendation, regenerate, plannedPageId: args.plannedPageId },
    analysisId,
    dedupeKey:
      `${dedupe.contentPlan(analysisId, recommendation.title)}:v${nextVersion}` +
      `:f${beantwoord}`,
  });

  return { created, alreadyDone: false };
}

/**
 * Plant de CONTENTBRIEFING in voor een batch gekozen pagina's
 * (contentbriefing.md §2, implementatieplan.md R5.1).
 *
 * Dit vervangt de directe sprong naar `content_draft`. De briefing bouwt de
 * feitenkaart en stelt de vragen, daarna stopt de pijplijn en beslist de klant
 * wanneer er geschreven wordt.
 *
 * Eén briefing voor de hele batch, niet per pagina. Kiest de klant drie
 * pagina's, dan krijgt hij één vragenlijst waarin overlappende vragen zijn
 * samengevoegd. Drie keer los "wat is er inbegrepen?" beantwoorden is precies
 * het soort wrijving dat README.md §2 verbiedt.
 *
 * ── ⚠️ EERST PLANNEN, DAN PAS VRAGEN (docs/tasks/vragen-voor-het-schrijven.md) ──
 *
 * Tot 2 september 2026 startte deze functie meteen de briefing. De vragen kwamen
 * dus uit een stap die de pagina nog niet kende: de claim-audit bedacht welke
 * beweringen nodig waren zónder de inhoudsopgave, en pas dáárna onderzocht de
 * app wat de pagina echt moest behandelen. Gemeten op 1 september 2026 leverde
 * dat 16 vragen op voor vier pagina's, terwijl 18 van de 25 secties van één van
 * die pagina's op geen enkel feit over het bedrijf rustten.
 *
 * Nu start deze functie eerst één `content_plan` per pagina. Elke plantaak
 * levert het CONTRACT: de inhoudsopgave zoals de pagina hem écht nodig heeft,
 * met per sectie of daar een uitspraak over dit bedrijf voor nodig is. De
 * LAATSTE plantaak van de batch start de briefing, en die kan zijn vragen dan
 * uit het verschil tussen contract en feitenkaart halen.
 *
 * Wat dat kost: het itemdossier en het contract draaien nu ook voor pagina's die
 * de klant alsnog laat liggen. Gemeten op 1 september: $0,0172 plus $0,0047 per
 * pagina, samen negen cent voor vier pagina's, tegenover $4,52 voor het
 * schrijven. Dat is de investering die de dure stap goedkoper maakt.
 */
export async function planContentBriefing(
  admin: Admin,
  args: {
    analysisId: string;
    userId: string;
    recommendations: RecommendationPayload[];
  },
): Promise<{ created: boolean; pages: number }> {
  const recommendations = args.recommendations.filter((r) => r.title?.trim());
  if (recommendations.length === 0) return { created: false, pages: 0 };

  // De rijen moeten er zijn vóór de eerste plantaak: die zoekt zijn pagina op
  // met `currentPiece()` en hangt het contract eraan. Idempotent, dus opnieuw
  // proberen levert dezelfde id's op.
  await ensureBriefingPieces(admin, args.analysisId, recommendations);

  let created = false;
  for (const rec of recommendations) {
    const uitkomst = await enqueue(admin, {
      type: "content_plan",
      payload: {
        userId: args.userId,
        recommendation: rec,
        voorBriefing: { recommendations },
      },
      analysisId: args.analysisId,
      // Een eigen achtervoegsel, zodat een plantaak vóór de briefing nooit
      // botst met de plantaak die de klant later start door op "Schrijf mijn
      // pagina's" te drukken. Dat zijn twee verschillende opdrachten: de eerste
      // maakt het ideaal, de tweede schrijft wat daarvan haalbaar bleek.
      dedupeKey: `${dedupe.contentPlan(args.analysisId, rec.title)}:briefing`,
    });
    if (uitkomst.created) created = true;
  }

  return { created, pages: recommendations.length };
}

/**
 * Alles in één klik (optimalisatie.md 4.9).
 *
 * De belofte van het product heet "1-click content generatie", maar het waren n
 * klikken over maximaal drie aanbevelingen. Met de werkverdeler uit fase 1 kan
 * dat gewoon in één keer: alle aanbevelingen als losse taken in de rij. De
 * werker pakt ze één voor één op, dus dit legt niets plat en de klant kan het
 * scherm sluiten.
 */
export async function planAllRecommendations(
  admin: Admin,
  args: {
    analysisId: string;
    userId: string;
    reportId: string | null;
    recommendations: StoredRecommendation[];
  },
): Promise<PlanResult> {
  let planned = 0;
  let skipped = 0;

  for (const rec of args.recommendations) {
    if (!rec.title?.trim()) continue;
    const { created, alreadyDone } = await planContentDraft(admin, {
      analysisId: args.analysisId,
      userId: args.userId,
      recommendation: toPayload(rec, args.reportId),
    });
    if (created) planned++;
    else if (alreadyDone) skipped++;
  }

  return { planned, skipped };
}
