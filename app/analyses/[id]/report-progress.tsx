"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisStatus } from "@/lib/types/database";

/**
 * Draait halte B1+B2 (abcplan.md §7) en toont live voortgang. Wordt automatisch
 * aangeroepen zodra de meting klaar is — géén klant-klik nodig (in tegenstelling
 * tot Fase C content-generatie). Herbruikt vanuit MeasureProgress (handoff na
 * 'gemeten') én vanuit de Rapport-tab (rechtstreeks bezoek of retry na 'mislukt').
 */
export function ReportProgress({
  analysisId,
  initialStatus = "gemeten",
}: {
  analysisId: string;
  initialStatus?: AnalysisStatus;
}) {
  const router = useRouter();
  const [failed, setFailed] = useState(initialStatus === "mislukt");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const started = useRef(false);

  async function runReport() {
    setFailed(false);
    setErrorDetail(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/report`, { method: "POST" });
      let json: { status?: string; detail?: string } = {};
      try {
        json = await res.json();
      } catch {
        setFailed(true);
        setErrorDetail(`Server gaf geen geldig antwoord (HTTP ${res.status}).`);
        return;
      }
      if (!res.ok || json.status === "mislukt") {
        setFailed(true);
        setErrorDetail(json.detail ?? null);
        return;
      }
    } catch (err) {
      setFailed(true);
      setErrorDetail(err instanceof Error ? err.message : String(err));
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
    void runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div className="card flex flex-col gap-4">
        <span
          className="chip w-fit"
          style={{ background: "rgba(229,72,77,0.16)", color: "#f0a3a5", borderColor: "rgba(229,72,77,0.4)" }}
        >
          Mislukt
        </span>
        <p className="text-secondary">
          Het opstellen van het rapport is mislukt. Je meting blijft bewaard — er wordt niet
          opnieuw gemeten.
        </p>
        {errorDetail && (
          <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 font-mono text-xs text-[var(--status-error)]">
            {errorDetail}
          </p>
        )}
        <button onClick={() => void runReport()} className="btn-primary w-fit">
          Opnieuw proberen
        </button>
      </div>
    );
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
