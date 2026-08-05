import type { ProfileStatus } from "@/lib/types/database";
import type { StatusTone } from "@/lib/analysis-status";

export const PROFILE_STATUS_META: Record<ProfileStatus, { label: string; tone: StatusTone }> = {
  bezig: { label: "Onderzoek loopt…", tone: "progress" },
  klaar: { label: "Gereed", tone: "success" },
  mislukt: { label: "Niet gelukt", tone: "error" },
};
