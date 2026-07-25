"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisStatus } from "@/lib/types/database";
import { ReportProgress } from "./report-progress";
import { ErrorNotice, problemFromResponse } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";

interface StatusPayload {
  status: AnalysisStatus;
  activePromptCount: number;
  measuredCount: number;
}

/**
 * Start halte A3 (nulmeting) en toont live, server-state-gedreven voortgang
 * (abcplan.md §3.7 stap 6: "Bezig met meten… (x/30 prompts verwerkt)").
 */
/** Zie de gelijknamige constante in prepare-progress.tsx. */
const STALE_FAILURE: UserFacingError = {
  kind: "unknown",
  title: "De meting is eerder misgelopen",
  message:
    "Vragen die al gemeten zijn blijven bewaard — een nieuwe poging pakt alleen " +
    "op wat nog mist, en kost dus geen dubbel werk.",
  canRetry: true,
  detail: "",
};

export function MeasureProgress({
  analysisId,
  initialStatus,
}: {
  analysisId: string;
  initialStatus: AnalysisStatus;
}) {
  const router = useRouter();
  const [data, setData] = useState<StatusPayload>({
    status: initialStatus,
    activePromptCount: 0,
    measuredCount: 0,
  });
  const [problem, setProblem] = useState<UserFacingError | null>(
    initialStatus === "mislukt" ? STALE_FAILURE : null,
  );
  // Zodra de meting klaar is, schakelt dit component door naar het rapport —
  // automatisch, geen navigatie/klik nodig (matcht abcplan.md §9 stap 6-9).
  const [handoffToReport, setHandoffToReport] = useState(false);
  const started = useRef(false);

  async function runMeasure() {
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/measure`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setProblem(problemFromResponse(json));
      }
    } catch {
      // Netwerkfout ("Load failed") — server werkt door; polling leest de echte status.
    }
  }

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/analyses/${analysisId}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const json: StatusPayload = await res.json();
        if (!active) return;
        setData(json);
        if (json.status === "gemeten") {
          clearInterval(interval);
          setHandoffToReport(true);
        } else if (json.status === "gereed") {
          clearInterval(interval);
          router.refresh();
        } else if (json.status === "mislukt") {
          clearInterval(interval);
          setProblem((p) => p ?? STALE_FAILURE);
        }
      } catch {
        /* stil — volgende tick probeert opnieuw */
      }
    };
    const interval = setInterval(poll, 2000);
    poll();
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [analysisId, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runMeasure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (handoffToReport) {
    return <ReportProgress analysisId={analysisId} />;
  }

  if (problem) {
    return <ErrorNotice error={problem} onRetry={() => void runMeasure()} />;
  }

  const total = data.activePromptCount || null;

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="live-dot" />
        <span className="mono-label">
          Bezig met meten{total ? ` (${data.measuredCount}/${total} prompts verwerkt)` : "…"}
        </span>
      </div>
      <p className="text-secondary">
        Elke actieve prompt wordt naar een AI-assistent gestuurd om te zien of jij (en je
        concurrenten) genoemd worden. Dit duurt doorgaans minder dan een minuut.
      </p>
      <p className="text-sm text-muted">
        Je kunt dit scherm sluiten en later terugkomen — de voortgang loopt gewoon door.
      </p>
    </div>
  );
}
