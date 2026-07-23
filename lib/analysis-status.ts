import type { AnalysisStatus } from "@/lib/types/database";

export type StatusTone = "attention" | "progress" | "info" | "success" | "error";

/**
 * Metadata per status voor de UI (abcplan.md §3.4). `concept_klaar` is bewust
 * "attention" + actionRequired: het enige moment waarop de klant iets MOET doen,
 * en wordt daarom bovenaan de lijst geprioriteerd.
 */
export const STATUS_META: Record<
  AnalysisStatus,
  { label: string; tone: StatusTone; actionRequired: boolean }
> = {
  bezig: { label: "Bezig…", tone: "progress", actionRequired: false },
  concept_klaar: { label: "Wacht op jouw goedkeuring", tone: "attention", actionRequired: true },
  meten: { label: "Meten…", tone: "progress", actionRequired: false },
  gemeten: { label: "Score klaar, rapport volgt", tone: "info", actionRequired: false },
  gereed: { label: "Gereed", tone: "success", actionRequired: false },
  mislukt: { label: "Mislukt", tone: "error", actionRequired: false },
};

/** Inline-stijl per tone (lichte thema-kleuren, designsystem.md §A). */
export const TONE_STYLE: Record<StatusTone, React.CSSProperties> = {
  attention: { background: "rgba(133,17,217,0.1)", color: "#7a13c9", borderColor: "rgba(133,17,217,0.28)" },
  progress: { background: "rgba(11,11,12,0.05)", color: "rgba(11,11,12,0.62)", borderColor: "rgba(11,11,12,0.12)" },
  info: { background: "rgba(46,158,80,0.12)", color: "#2e9e50", borderColor: "rgba(46,158,80,0.28)" },
  success: { background: "rgba(46,158,80,0.14)", color: "#2e9e50", borderColor: "rgba(46,158,80,0.32)" },
  error: { background: "rgba(211,58,63,0.1)", color: "#c2282d", borderColor: "rgba(211,58,63,0.3)" },
};
