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

/** Inline-stijl per tone (kleuren uit het design system, designsystem.md §C). */
export const TONE_STYLE: Record<StatusTone, React.CSSProperties> = {
  attention: { background: "rgba(133,17,217,0.22)", color: "#d9c6f5", borderColor: "rgba(165,120,240,0.55)" },
  progress: { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.72)", borderColor: "rgba(255,255,255,0.14)" },
  info: { background: "rgba(84,184,106,0.14)", color: "#8fdca0", borderColor: "rgba(84,184,106,0.3)" },
  success: { background: "rgba(46,158,80,0.18)", color: "#2e9e50", borderColor: "rgba(84,184,106,0.4)" },
  error: { background: "rgba(229,72,77,0.16)", color: "#f0a3a5", borderColor: "rgba(229,72,77,0.4)" },
};
