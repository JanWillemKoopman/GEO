"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisStatus } from "@/lib/types/database";
import { ErrorNotice, problemFromResponse } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";

interface StatusPayload {
  status: AnalysisStatus;
  hasTopicResearch: boolean;
  promptCount: number;
}

/**
 * Start halte 1'+2 en toont live, server-state-gedreven voortgang (abcplan.md §3.7
 * stap 4). Draait de prepare-call en pollt intussen de status; bij concept_klaar
 * gaan we door naar het concept-scherm (Instellingen), bij mislukt tonen we retry.
 */
/**
 * Fout uit een EERDERE sessie: de status stond al op 'mislukt' bij binnenkomst,
 * dus we hebben de oorspronkelijke oorzaak niet meer in handen. Vandaar een
 * algemene boodschap zonder technische details — die staan in de serverlogs.
 */
const STALE_FAILURE: UserFacingError = {
  kind: "unknown",
  title: "Het voorbereiden is eerder misgelopen",
  message:
    "Dit lag vaak aan een tijdelijke storing. Probeer het opnieuw — wat al gelukt " +
    "is blijft bewaard, dus je begint niet van voren af aan.",
  canRetry: true,
  detail: "",
};

export function PrepareProgress({
  analysisId,
  initialStatus,
}: {
  analysisId: string;
  initialStatus: AnalysisStatus;
}) {
  const router = useRouter();
  const [data, setData] = useState<StatusPayload>({
    status: initialStatus,
    hasTopicResearch: false,
    promptCount: 0,
  });
  // Eén foutobject i.p.v. een losse vlag + ruwe tekst (optimalisatie.md 0.11).
  const [problem, setProblem] = useState<UserFacingError | null>(
    initialStatus === "mislukt" ? STALE_FAILURE : null,
  );
  const started = useRef(false);

  async function runPrepare() {
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/prepare`, { method: "POST" });
      // Alleen bij een EXPLICIETE serverfout hard falen (dan hebben we ook detail).
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setProblem(problemFromResponse(json));
      }
    } catch {
      // Netwerkfout ("Load failed") — de verbinding viel weg, maar de server
      // werkt door. NIET hard falen: de polling hieronder leest de echte status.
    }
  }

  // Poll de status terwijl prepare draait.
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/analyses/${analysisId}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const json: StatusPayload = await res.json();
        if (!active) return;
        setData(json);
        if (json.status === "concept_klaar" || json.status === "meten") {
          router.replace(`/analyses/${analysisId}/instellingen`);
        } else if (json.status === "mislukt") {
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

  // Trigger prepare één keer bij binnenkomst.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runPrepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = [
    { label: "Website lezen voor dit onderwerp", done: data.hasTopicResearch },
    { label: "Concurrenten voor dit onderwerp zoeken", done: data.hasTopicResearch },
    {
      label: `Prompts opstellen${data.promptCount ? ` (${data.promptCount})` : ""}`,
      done: data.promptCount > 0,
    },
  ];
  const activeIndex = steps.findIndex((s) => !s.done);

  if (problem) {
    return <ErrorNotice error={problem} onRetry={() => void runPrepare()} />;
  }

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="live-dot" />
        <span className="mono-label">Analyse wordt voorbereid… dit duurt doorgaans een halve minuut</span>
      </div>
      <ul className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const isActive = i === activeIndex;
          return (
            <li key={step.label} className="flex items-center gap-3">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
                style={{
                  background: step.done ? "rgba(46,158,80,0.2)" : "transparent",
                  border: step.done ? "none" : "1px solid var(--border-strong)",
                  color: step.done ? "var(--accent-green-text)" : "var(--text-muted)",
                }}
              >
                {step.done ? "✓" : ""}
              </span>
              <span style={{ color: step.done || isActive ? "var(--text-primary)" : "var(--text-muted)" }}>
                {step.label}
              </span>
              {isActive && <span className="live-dot" style={{ marginLeft: "auto" }} />}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">
        Je kunt dit scherm sluiten en later terugkomen — de voortgang loopt gewoon door.
      </p>
    </div>
  );
}
