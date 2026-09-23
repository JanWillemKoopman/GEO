import type { ProfileStatus } from "@/lib/types/database";
import { PROFILE_STATUS_META } from "@/lib/profile-status";
import { TONE_CHIP, WHOSE_TURN_LABEL } from "@/lib/analysis-status";

export function ProfileStatusBadge({
  status,
  showWhoseTurn = false,
}: {
  status: ProfileStatus;
  showWhoseTurn?: boolean;
}) {
  const meta = PROFILE_STATUS_META[status];
  return (
    <span className="flex items-center gap-2">
      <span className={TONE_CHIP[meta.tone]}>
        {meta.label}
      </span>
      {showWhoseTurn && meta.whoseTurn && (
        <span className="text-sm text-muted">{WHOSE_TURN_LABEL[meta.whoseTurn]}</span>
      )}
    </span>
  );
}
