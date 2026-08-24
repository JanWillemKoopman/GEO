/**
 * Wanneer mag ORBIT ENGINE een geplande pagina gaan schrijven, en zo niet: waarom niet?
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * `shouldStartWriting()` in `lib/plan-status.ts` beantwoordt de tijdvraag: is de
 * maand goedgekeurd en zijn we binnen tien dagen van de publicatiedatum? Dat is
 * nodig maar niet genoeg. Schrijven leunt op een gemeten analyse: de
 * contentpijplijn gebruikt de gemiste vragen en de winnende antwoorden van de
 * meting als briefing. Zonder meting schrijft het model iets algemeens over het
 * onderwerp, en dat is precies het soort tekst waarvoor niemand betaalt.
 *
 * ⚠️ Dat is geen randgeval. Van den Udenhout heeft acht onderwerpen en twee
 * daarvan zijn ooit als analyse gestart. Zes van de tien pagina's in maand 1
 * kunnen dus vandaag niet geschreven worden. Een cron die dat stilzwijgend
 * overslaat, laat die zes pagina's een jaar lang op "Gepland" staan zonder dat
 * iemand weet waarom er niets gebeurt.
 *
 * Vandaar dat dit een BESLISSING met een REDEN oplevert, en geen boolean. De
 * reden gaat naar het scherm, in Nova's wie-is-aan-zet-taal: niet "geblokkeerd"
 * maar "start eerst de meting van dit onderwerp".
 *
 * Puur en zonder `server-only` (conventie 2): zowel de cron als de lijst leest dit.
 */
import type {
  AnalysisStatus,
  ContentType,
  PageType,
  PlannedPageStatus,
  PlanMonthStatus,
} from "@/lib/types/database";
import { SCHRIJFVOORSPRONG_DAGEN } from "@/lib/plan-status";
import type { WhoseTurn } from "@/lib/plan-status";

/**
 * Vanaf welke analysestatus is er genoeg gemeten om op te schrijven?
 *
 * `gemeten` = de score is binnen, `gereed` = het rapport ook. Beide dragen de
 * meting die de contentpijplijn nodig heeft. `concept_klaar` niet: daar staan de
 * vragen wel klaar maar is er nog niets gemeten, en `meten` betekent dat de
 * ronde nog loopt.
 */
export const SCHRIJFBARE_ANALYSE_STATUSSEN: ReadonlySet<AnalysisStatus> =
  new Set<AnalysisStatus>(["gemeten", "gereed"]);

export type WriteBlock =
  | "maand_niet_goedgekeurd"
  | "nog_niet_aan_de_beurt"
  | "is_buffer"
  | "geen_datum"
  | "al_onderweg"
  | "geen_onderwerp"
  | "geen_analyse"
  | "meting_nog_niet_klaar";

export type WriteDecision =
  | { schrijven: true; analysisId: string }
  | { schrijven: false; reden: WriteBlock };

export interface PageForWriting {
  status: PlannedPageStatus;
  scheduled_for: string | null;
  is_buffer: boolean;
  topic_id: string | null;
}

export interface TopicForWriting {
  analysis_id: string | null;
  analysis_status: AnalysisStatus | null;
}

/**
 * Hetzelfde gegeven, maar zoals het scherm het krijgt: per onderwerp of er een
 * analyse aan hangt en hoe ver die is. Staat hier en niet in `lib/plans.ts`,
 * want dat bestand is `server-only` en de plan-lijst draait in de browser.
 */
export interface TopicWritingState {
  topicId: string;
  title: string;
  analysisId: string | null;
  analysisStatus: AnalysisStatus | null;
}

/**
 * De volgorde van de controles is de volgorde waarin een mens ze zou stellen:
 * eerst of deze pagina überhaupt aan de beurt is, dan pas of het kán. Een buffer
 * die nog niet ingeschoven is heeft geen ontbrekende analyse, hij heeft gewoon
 * nog geen taak.
 */
export function writeDecision(
  page: PageForWriting,
  monthStatus: PlanMonthStatus,
  topic: TopicForWriting | null,
  now: Date = new Date(),
): WriteDecision {
  // ⚠️ Nooit schrijven voor een maand die de klant niet heeft goedgekeurd. Elke
  // pagina kost geld, en een afgewezen maand die toch geschreven is, is
  // weggegooid budget.
  if (monthStatus !== "goedgekeurd") {
    return { schrijven: false, reden: "maand_niet_goedgekeurd" };
  }
  if (page.is_buffer) return { schrijven: false, reden: "is_buffer" };
  if (page.status !== "gepland") {
    return { schrijven: false, reden: "al_onderweg" };
  }
  if (!page.scheduled_for) return { schrijven: false, reden: "geen_datum" };
  if (dagenTot(now, page.scheduled_for) > SCHRIJFVOORSPRONG_DAGEN) {
    return { schrijven: false, reden: "nog_niet_aan_de_beurt" };
  }

  if (!page.topic_id || !topic) return { schrijven: false, reden: "geen_onderwerp" };
  if (!topic.analysis_id) return { schrijven: false, reden: "geen_analyse" };
  if (
    !topic.analysis_status ||
    !SCHRIJFBARE_ANALYSE_STATUSSEN.has(topic.analysis_status)
  ) {
    return { schrijven: false, reden: "meting_nog_niet_klaar" };
  }

  return { schrijven: true, analysisId: topic.analysis_id };
}

/**
 * Wat een blokkade op het scherm zegt.
 *
 * Alleen de blokkades die om een handeling vragen krijgen tekst. "Nog niet aan
 * de beurt" en "is een buffer" zijn geen problemen maar de normale gang van
 * zaken, en die staan al in `planRunningDate()`. Een melding tonen bij iets wat
 * gewoon goed gaat, leert mensen meldingen negeren.
 */
export function writeBlockNotice(
  reden: WriteBlock,
): { text: string; whoseTurn: WhoseTurn } | null {
  switch (reden) {
    case "maand_niet_goedgekeurd":
      return { text: "ORBIT ENGINE schrijft pas als deze maand is vrijgegeven", whoseTurn: "klant" };
    case "geen_analyse":
      return {
        text: "Start eerst de meting van dit onderwerp, anders schrijft ORBIT ENGINE zonder cijfers",
        whoseTurn: "klant",
      };
    case "meting_nog_niet_klaar":
      return { text: "De meting van dit onderwerp loopt nog", whoseTurn: "orbit_engine" };
    case "geen_onderwerp":
      return { text: "Deze pagina hangt aan geen enkel onderwerp", whoseTurn: "klant" };
    default:
      return null;
  }
}

/**
 * Het paginatype van het plan → het contenttype van de schrijfpijplijn.
 *
 * Twee woordenlijsten die over hetzelfde gaan maar niet één op één passen. Het
 * plan denkt in de functie van een pagina op de site (Nova's vier), de
 * schrijfpijplijn in de vorm van de tekst. Een categorie- en een dienstpagina
 * zijn allebei een landingspagina; informatief en overig worden een artikel.
 */
export function contentTypeFor(pageType: PageType): ContentType {
  switch (pageType) {
    case "categorie":
    case "dienst":
      return "landing";
    default:
      return "article";
  }
}

/**
 * De briefing die met de schrijftaak meegaat.
 *
 * De contentpijplijn verwacht een aanbeveling: een titel, voor wie hij is, en
 * waarom hij er komt. Bij een aanbeveling uit een rapport komt dat uit de
 * gap-analyse; hier komt het uit het plan zelf. Bewust in dezelfde vorm, zodat
 * de pijplijn geen tweede ingang nodig heeft.
 */
export function planBriefing(input: {
  title: string;
  pageType: PageType;
  topicTitle: string | null;
  funnelLabel: string | null;
  monthNumber: number;
}): { title: string; type: ContentType; targetIntent: string; why: string } {
  const fase = input.funnelLabel ?? "de klantreis";
  const onderwerp = input.topicTitle ?? input.title;
  return {
    title: input.title,
    type: contentTypeFor(input.pageType),
    targetIntent: `Iemand die zich in de fase ${fase.toLowerCase()} bevindt rond ${onderwerp.toLowerCase()}`,
    why: `Staat in het contentplan, maand ${input.monthNumber}, onderwerp ${onderwerp}, fase ${fase}.`,
  };
}

/** Hele dagen tot een ISO-datum. Negatief als die dag al geweest is. */
function dagenTot(from: Date, iso: string): number {
  const to = new Date(iso);
  if (Number.isNaN(to.getTime())) return Number.POSITIVE_INFINITY;
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86400000);
}
