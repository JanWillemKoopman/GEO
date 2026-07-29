"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisStatus } from "@/lib/types/database";
import { ErrorNotice, problemFromResponse } from "@/components/error-notice";
import { WorkInProgress, useStatusPoll } from "@/components/work-in-progress";
import type { UserFacingError } from "@/lib/errors";

interface StatusPayload {
  status: AnalysisStatus;
  activePromptCount: number;
  measuredCount: number;
  pendingJobs: number;
  failedJobs: number;
  retrying: boolean;
  etaText: string | null;
}

/**
 * Voortgang van de meting (halte A3) én van het rapport dat er direct op volgt.
 *
 * Plant per actieve vraag een meettaak in en kijkt daarna toe. De overgang naar
 * het rapport gebeurt nu OP DE SERVER (optimalisatie.md 1.5): de laatste
 * meettaak plant de aggregatie in, die plant het rapport in. Dit scherm hoeft
 * daar niets voor te doen — vandaar dat de losse handoff naar ReportProgress
 * verdwenen is. Sloot de klant hier de tab, dan werd het rapport voorheen pas
 * gemaakt als hij terugkwam.
 */
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
  const [problem, setProblem] = useState<UserFacingError | null>(
    initialStatus === "mislukt" ? STALE_FAILURE : null,
  );
  const started = useRef(false);

  async function schedule() {
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/measure`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setProblem(problemFromResponse(json));
      }
    } catch {
      /* netwerkfout bij inplannen — de polling leest de echte stand */
    }
  }

  const data = useStatusPoll<StatusPayload>(
    `/api/analyses/${analysisId}/status`,
    (d) => d.status === "gereed",
    () => router.refresh(),
  );

  useEffect(() => {
    if (data && (data.status === "mislukt" || data.failedJobs > 0)) {
      setProblem((p) => p ?? STALE_FAILURE);
    }
  }, [data]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (problem) {
    return <ErrorNotice error={problem} onRetry={() => void schedule()} />;
  }

  const measured = data?.measuredCount ?? 0;
  const total = data?.activePromptCount ?? 0;
  const measuringDone = total > 0 && measured >= total;
  // Na 'gemeten' loopt het rapport nog. Voor de klant is dat dezelfde
  // wachtsituatie, dus geen apart scherm en geen tussentijdse navigatie.
  const writingReport = data?.status === "gemeten";

  return (
    <WorkInProgress
      title={writingReport ? "Rapport wordt opgesteld" : "Bezig met meten"}
      explanation={
        writingReport
          ? "De meting is klaar. We vergelijken je nu met je concurrenten en schrijven daar een rapport over."
          : "Elke vraag gaat naar een AI-assistent om te zien of jij (en je concurrenten) genoemd worden."
      }
      etaText={data?.etaText}
      retrying={data?.retrying}
      steps={[
        {
          label: total > 0 ? `Vragen stellen (${measured} van ${total})` : "Vragen stellen",
          done: measuringDone,
        },
        { label: "Score en concurrentievergelijking berekenen", done: writingReport },
        { label: "Rapport opstellen", done: false },
      ]}
    />
  );
}
