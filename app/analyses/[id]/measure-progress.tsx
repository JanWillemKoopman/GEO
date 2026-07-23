"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisStatus } from "@/lib/types/database";
import { ReportProgress } from "./report-progress";

interface StatusPayload {
  status: AnalysisStatus;
  activePromptCount: number;
  measuredCount: number;
}

/**
 * Start halte A3 (nulmeting) en toont live, server-state-gedreven voortgang
 * (abcplan.md §3.7 stap 6: "Bezig met meten… (x/30 prompts verwerkt)").
 */
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
  const [failed, setFailed] = useState(initialStatus === "mislukt");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  // Zodra de meting klaar is, schakelt dit component door naar het rapport —
  // automatisch, geen navigatie/klik nodig (matcht abcplan.md §9 stap 6-9).
  const [handoffToReport, setHandoffToReport] = useState(false);
  const started = useRef(false);

  async function runMeasure() {
    setFailed(false);
    setErrorDetail(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/measure`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}) as { detail?: string });
        setFailed(true);
        setErrorDetail(json.detail ?? null);
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
          setFailed(true);
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

  if (failed) {
    return (
      <div className="card flex flex-col gap-4">
        <span
          className="chip w-fit"
          style={{ background: "rgba(211,58,63,0.1)", color: "#c2282d", borderColor: "rgba(211,58,63,0.3)" }}
        >
          Mislukt
        </span>
        <p className="text-secondary">
          Het meten van deze analyse is mislukt. Prompts die al gemeten zijn blijven bewaard —
          bij een nieuwe poging wordt niet opnieuw begonnen.
        </p>
        {errorDetail && (
          <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 font-mono text-xs text-[var(--status-error)]">
            {errorDetail}
          </p>
        )}
        <button onClick={() => void runMeasure()} className="btn-primary w-fit">
          Opnieuw proberen
        </button>
      </div>
    );
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
