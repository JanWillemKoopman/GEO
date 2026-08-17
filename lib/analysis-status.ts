import type { AnalysisStatus } from "@/lib/types/database";

export type StatusTone = "attention" | "progress" | "info" | "success" | "error";

/**
 * Bij wie de bal ligt (A.1, naar Nova's tweelaags-statustaal: een technische
 * staat naast een leesbare "Waiting in your CMS" / "Waiting for you",
 * `docs/tasks/nova-analyse.md` §3.2). De technische status (`AnalysisStatus`)
 * blijft de bron van waarheid; dit is de vertaling ernaast, niet in de plaats
 * ervan. `null` = niemand hoeft iets, de staat is af of informatief.
 */
export type WhoseTurn = "jij" | "orbit_engine" | null;

export const WHOSE_TURN_LABEL: Record<Exclude<WhoseTurn, null>, string> = {
  jij: "Wacht op jou",
  orbit_engine: "ORBIT ENGINE is bezig",
};

/**
 * Metadata per status voor de UI (abcplan.md §3.4). `concept_klaar` is bewust
 * "attention" + actionRequired: het enige moment waarop de klant iets MOET doen,
 * en wordt daarom bovenaan de lijst geprioriteerd.
 */
export const STATUS_META: Record<
  AnalysisStatus,
  { label: string; tone: StatusTone; actionRequired: boolean; whoseTurn: WhoseTurn }
> = {
  bezig: { label: "ORBIT ENGINE werkt…", tone: "progress", actionRequired: false, whoseTurn: "orbit_engine" },
  concept_klaar: {
    label: "Klaar voor jouw akkoord",
    tone: "attention",
    actionRequired: true,
    whoseTurn: "jij",
  },
  meten: { label: "Meting loopt…", tone: "progress", actionRequired: false, whoseTurn: "orbit_engine" },
  gemeten: {
    label: "Score binnen · rapport volgt",
    tone: "info",
    actionRequired: false,
    whoseTurn: "orbit_engine",
  },
  gereed: { label: "Gereed", tone: "success", actionRequired: false, whoseTurn: null },
  mislukt: { label: "Niet gelukt", tone: "error", actionRequired: false, whoseTurn: "jij" },
};

/**
 * Inline-stijl per tone, uit de betekenislaag (designsystem.md §2.3).
 *
 * ⚠️ Repareerd 6 augustus 2026: dit bestand had de kleuren-opruiming van de
 * vormgevingsronde gemist, de kleurcontrole draaide toen alleen over `.tsx`
 * en dit is een `.ts`-bestand. Er stonden nog vijf rauwe `rgba()`-kleuren in,
 * waarvan `info` en `success` letterlijk dezelfde waarde deelden (het oude
 * marketingsite-groen, zie designsystem.md bijlage A): een "score binnen, rapport volgt"-melding
 * was zo niet te onderscheiden van "gereed". Nu wijzen ze naar aparte
 * betekenissen: `information` (blauw) voor een mededeling, `growth` (groen)
 * voor een afgeronde, geslaagde staat.
 */
export const TONE_STYLE: Record<StatusTone, React.CSSProperties> = {
  attention: {
    background: "var(--intent-intelligence-surface)",
    color: "var(--intent-intelligence-text)",
    borderColor: "var(--intent-intelligence-border)",
  },
  progress: {
    background: "var(--intent-neutral-surface)",
    color: "var(--text-secondary)",
    borderColor: "var(--intent-neutral-border)",
  },
  info: {
    background: "var(--intent-information-surface)",
    color: "var(--intent-information-text)",
    borderColor: "var(--intent-information-border)",
  },
  success: {
    background: "var(--intent-growth-surface)",
    color: "var(--intent-growth-text)",
    borderColor: "var(--intent-growth-border)",
  },
  error: {
    background: "var(--intent-danger-surface)",
    color: "var(--intent-danger-text)",
    borderColor: "var(--intent-danger-border)",
  },
};
