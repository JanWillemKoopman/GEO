/**
 * De status van een geplande pagina, in drie talen tegelijk.
 *
 * ── NOVA'S SLIMSTE VONDST, EN DE ENIGE DIE ORBIT ENGINE NOG MISTE ───────────────────
 *
 * Nova heeft voor hetzelfde ding drie verzamelingen labels naast elkaar:
 *
 *   `status`        de toestandsmachine        `pendingReview`, `scheduled`, …
 *   `runningStatus` wie is er nu aan zet       "Needs your review", "Waiting in your CMS"
 *   `runningDate`   en wanneer                 "Publishes once approved", "Writing {date}"
 *
 * `lib/analysis-status.ts` nam de eerste twee al over voor analyses (7 augustus).
 * De derde ontbrak, en die telt pas als er pagina's zijn die over zes weken
 * verschijnen: bij een plan van twaalf maanden is het verschil tussen een lijst
 * en een agenda precies dat je ziet wánneer er iets gebeurt.
 *
 * Waarom dit ertoe doet: een klant die `ter_goedkeuring` ziet weet niet of hij
 * moet wachten of iets moet doen. Bij "Wacht op jouw akkoord" weet hij het wel.
 *
 * Puur, dus testbaar (conventie 2). Geen `server-only`: de lijst rendert dit in
 * de browser.
 */
import type { PlannedPageStatus, PlanMonthStatus } from "@/lib/types/database";

/** Bij wie ligt de bal? `null` = niemand hoeft iets, de staat is af. */
export type WhoseTurn = "klant" | "orbit_engine" | null;

export type StatusTone = "wacht" | "loopt" | "klaar" | "fout" | "neutraal";

export interface PlanStatusMeta {
  /** Wat het systeem weet, in gewone taal. */
  label: string;
  /** Wie er nu aan zet is, in de tweede persoon. */
  running: string;
  whoseTurn: WhoseTurn;
  tone: StatusTone;
  /** Vraagt dit een handeling van de klant? Bepaalt de sortering in de lijst. */
  actionRequired: boolean;
}

export const PLAN_STATUS_META: Record<PlannedPageStatus, PlanStatusMeta> = {
  gepland: {
    label: "Gepland",
    running: "ORBIT ENGINE schrijft dit later",
    whoseTurn: null,
    tone: "neutraal",
    actionRequired: false,
  },
  schrijven: {
    label: "Wordt geschreven",
    running: "ORBIT ENGINE is bezig",
    whoseTurn: "orbit_engine",
    tone: "loopt",
    actionRequired: false,
  },
  ter_goedkeuring: {
    label: "Klaar voor akkoord",
    running: "Wacht op jouw akkoord",
    whoseTurn: "klant",
    tone: "wacht",
    actionRequired: true,
  },
  goedgekeurd: {
    label: "Goedgekeurd",
    running: "Klaar om te plaatsen",
    whoseTurn: "klant",
    tone: "wacht",
    // ⚠️ Wél een handeling: zonder CMS-koppeling zet een mens hem live. Dat is
    // de stap waar dit programma stilvalt als niemand hem ziet.
    actionRequired: true,
  },
  geplaatst: {
    label: "Staat live",
    running: "Klaar",
    whoseTurn: null,
    tone: "klaar",
    actionRequired: false,
  },
  afgewezen: {
    label: "Afgewezen",
    running: "ORBIT ENGINE maakt een nieuw voorstel",
    whoseTurn: "orbit_engine",
    tone: "neutraal",
    actionRequired: false,
  },
  mislukt: {
    label: "Schrijven mislukt",
    running: "ORBIT ENGINE probeert het opnieuw",
    whoseTurn: "orbit_engine",
    tone: "fout",
    actionRequired: false,
  },
};

export const MONTH_STATUS_META: Record<
  PlanMonthStatus,
  { label: string; running: string; whoseTurn: WhoseTurn; tone: StatusTone }
> = {
  concept: {
    label: "Concept",
    running: "Nog niet gedeeld",
    whoseTurn: "orbit_engine",
    tone: "neutraal",
  },
  ter_goedkeuring: {
    label: "Wacht op akkoord",
    running: "Wacht op jou",
    whoseTurn: "klant",
    tone: "wacht",
  },
  goedgekeurd: {
    label: "Goedgekeurd",
    running: "Loopt",
    whoseTurn: null,
    tone: "klaar",
  },
  afgewezen: {
    label: "Afgewezen",
    running: "ORBIT ENGINE stelt een nieuw plan op",
    whoseTurn: "orbit_engine",
    tone: "neutraal",
  },
};

/**
 * De derde laag: wanneer gebeurt er iets?
 *
 * Nova's `runningDate`. De regel die dit bruikbaar maakt is dat een datum
 * alleen getoond wordt als hij ergens op slaat: bij een pagina die op akkoord
 * wacht is de publicatiedatum een belofte die van de klant afhangt, en dan is
 * "publiceert zodra je akkoord geeft" eerlijker dan een datum.
 *
 * ⚠️ Werkt met hele dagen en niet met uren. Een plan loopt over maanden; "over
 * 3 dagen" is de precisie die past, en "over 3 dagen en 4 uur" suggereert een
 * planning die er niet is.
 */
export function planRunningDate(
  page: {
    status: PlannedPageStatus;
    scheduled_for: string | null;
    posted_at: string | null;
  },
  now: Date = new Date(),
): string | null {
  if (page.status === "geplaatst") {
    return page.posted_at ? `Geplaatst op ${formatDay(page.posted_at)}` : "Staat live";
  }
  if (page.status === "ter_goedkeuring") {
    // Bewust géén datum: die hangt van de klant af, niet van ons.
    return "Publiceert zodra je akkoord geeft";
  }
  if (page.status === "goedgekeurd") return "Klaar om te plaatsen";
  if (page.status === "mislukt" || page.status === "afgewezen") return null;

  if (!page.scheduled_for) return null;
  const dagen = daysBetween(now, new Date(page.scheduled_for));

  if (page.status === "schrijven") return "ORBIT ENGINE schrijft dit nu";
  // `gepland`: zeg wannéér, want dat is het enige dat er nog gebeurt.
  if (dagen < 0) return `Stond gepland voor ${formatDay(page.scheduled_for)}`;
  if (dagen === 0) return "Vandaag gepland";
  if (dagen === 1) return "Morgen gepland";
  if (dagen <= 21) return `Over ${dagen} dagen`;
  return `Gepland voor ${formatDay(page.scheduled_for)}`;
}

/**
 * Wanneer begint ORBIT ENGINE te schrijven?
 *
 * Tien dagen vóór de publicatiedatum, precies zoals Nova
 * ("about 10 days before its scheduled post date"). Dat is lang genoeg om te
 * herschrijven na een afwijzing en kort genoeg om actueel te zijn.
 */
export const SCHRIJFVOORSPRONG_DAGEN = 10;

export function shouldStartWriting(
  page: { status: PlannedPageStatus; scheduled_for: string | null },
  monthApproved: boolean,
  now: Date = new Date(),
): boolean {
  // ⚠️ Nooit schrijven voor een maand die de klant niet heeft goedgekeurd. Dat
  // is niet alleen beleefd: elke pagina kost geld, en een afgewezen maand die
  // toch geschreven is, is weggegooid budget.
  if (!monthApproved) return false;
  if (page.status !== "gepland") return false;
  if (!page.scheduled_for) return false;
  return daysBetween(now, new Date(page.scheduled_for)) <= SCHRIJFVOORSPRONG_DAGEN;
}

/** Hele dagen van `from` naar `to`. Negatief als `to` in het verleden ligt. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
}

/**
 * Hoeveel pagina's wachten er op de klant?
 *
 * Nova's `actionsNeeded` met `approvalsNeeded`. Eén teller die zegt of er iets
 * te doen is, want dat is de enige vraag waarmee iemand inlogt.
 */
export function countActionRequired(
  pages: { status: PlannedPageStatus }[],
): number {
  return pages.filter((p) => PLAN_STATUS_META[p.status].actionRequired).length;
}
