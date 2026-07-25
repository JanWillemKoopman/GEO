"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisStatus } from "@/lib/types/database";
import { ErrorNotice, problemFromResponse } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";

/**
 * Draait halte B1+B2 (abcplan.md §7) en toont live voortgang. Wordt automatisch
 * aangeroepen zodra de meting klaar is — géén klant-klik nodig (in tegenstelling
 * tot Fase C content-generatie). Herbruikt vanuit MeasureProgress (handoff na
 * 'gemeten') én vanuit de Rapport-tab (rechtstreeks bezoek of retry na 'mislukt').
 */
/** Zie de gelijknamige constante in prepare-progress.tsx. */
const STALE_FAILURE: UserFacingError = {
  kind: "unknown",
  title: "Het rapport kon eerder niet worden opgesteld",
  message:
    "Je meting blijft bewaard — er wordt niet opnieuw gemeten, dus een nieuwe " +
    "poging kost alleen het opstellen van het rapport.",
  canRetry: true,
  detail: "",
};

export function ReportProgress({
  analysisId,
  initialStatus = "gemeten",
}: {
  analysisId: string;
  initialStatus?: AnalysisStatus;
}) {
  const router = useRouter();
  const [problem, setProblem] = useState<UserFacingError | null>(
    initialStatus === "mislukt" ? STALE_FAILURE : null,
  );
  const started = useRef(false);

  async function runReport() {
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/report`, { method: "POST" });
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
        const json: { status: AnalysisStatus } = await res.json();
        if (!active) return;
        if (json.status === "gereed") {
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
    void runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (problem) {
    return <ErrorNotice error={problem} onRetry={() => void runReport()} />;
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="live-dot" />
        <span className="mono-label">Rapport wordt opgesteld…</span>
      </div>
      <p className="text-secondary">
        We analyseren waar concurrenten je voorbijstreven en stellen concrete aanbevelingen op.
        Dit duurt meestal een paar tientallen seconden.
      </p>
    </div>
  );
}
