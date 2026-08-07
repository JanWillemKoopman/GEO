import type { AnalysisStatus } from "@/lib/types/database";
import { STATUS_META, TONE_STYLE, WHOSE_TURN_LABEL } from "@/lib/analysis-status";

/**
 * `showWhoseTurn` staat aan op de plekken waar de klant maar één status per
 * keer ziet (de analysekop); in een lijst met tien analyses zou een tweede
 * regel per rij (A.1) meer ruis dan hulp zijn, daar telt de chip zelf al.
 */
export function StatusBadge({
  status,
  showWhoseTurn = false,
}: {
  status: AnalysisStatus;
  showWhoseTurn?: boolean;
}) {
  const meta = STATUS_META[status];
  return (
    <span className="flex items-center gap-2">
      <span className="chip" style={{ ...TONE_STYLE[meta.tone] }}>
        {meta.actionRequired && (
          <span className="live-dot" style={{ background: "var(--intent-intelligence-solid)" }} />
        )}
        {meta.label}
      </span>
      {showWhoseTurn && meta.whoseTurn && (
        <span className="text-sm text-muted">{WHOSE_TURN_LABEL[meta.whoseTurn]}</span>
      )}
    </span>
  );
}
