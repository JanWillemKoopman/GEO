import type { AnalysisStatus } from "@/lib/types/database";
import { STATUS_META, TONE_STYLE } from "@/lib/analysis-status";

export function StatusBadge({ status }: { status: AnalysisStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="chip" style={{ ...TONE_STYLE[meta.tone] }}>
      {meta.actionRequired && <span className="live-dot" style={{ background: "var(--intent-intelligence-solid)" }} />}
      {meta.label}
    </span>
  );
}
