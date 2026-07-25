import type { ProfileStatus } from "@/lib/types/database";
import { PROFILE_STATUS_META } from "@/lib/profile-status";
import { TONE_STYLE } from "@/lib/analysis-status";

export function ProfileStatusBadge({ status }: { status: ProfileStatus }) {
  const meta = PROFILE_STATUS_META[status];
  return (
    <span className="chip" style={{ ...TONE_STYLE[meta.tone] }}>
      {meta.label}
    </span>
  );
}
