import type { ProfileStatus } from "@/lib/types/database";
import type { StatusTone, WhoseTurn } from "@/lib/analysis-status";

/** Zie WhoseTurn in analysis-status.ts: dezelfde tweelaags-statustaal (A.1), nu voor het profiel. */
export const PROFILE_STATUS_META: Record<
  ProfileStatus,
  { label: string; tone: StatusTone; whoseTurn: WhoseTurn }
> = {
  bezig: { label: "Onderzoek loopt…", tone: "progress", whoseTurn: "aura" },
  klaar: { label: "Gereed", tone: "success", whoseTurn: null },
  mislukt: { label: "Niet gelukt", tone: "error", whoseTurn: "jij" },
};
