"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisStatus } from "@/lib/types/database";
import { ErrorNotice, problemFromResponse } from "@/components/error-notice";
import { WorkInProgress, useStatusPoll } from "@/components/work-in-progress";
import type { UserFacingError } from "@/lib/errors";

interface StatusPayload {
  status: AnalysisStatus;
  hasTopicResearch: boolean;
  promptCount: number;
  pendingJobs: number;
  failedJobs: number;
  retrying: boolean;
  etaText: string | null;
}

/**
 * Voortgang van de voorbereiding (halte 1'+2).
 *
 * PLANT het werk in (één POST die direct antwoordt) en kijkt daarna alleen nog
 * toe (optimalisatie.md 1.7). Voorheen dééd deze fetch het werk — zestig
 * seconden lang open blijven staan — terwijl er onderaan stond dat je het
 * scherm mocht sluiten. Dat klopt nu wél.
 */
const STALE_FAILURE: UserFacingError = {
  kind: "unknown",
  title: "De voorbereiding is eerder vastgelopen",
  message:
    "Meestal is dat een tijdelijke storing. Probeer het opnieuw — wat al gelukt is, " +
    "blijft bewaard. Je begint niet van voren af aan.",
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
  const [problem, setProblem] = useState<UserFacingError | null>(
    initialStatus === "mislukt" ? STALE_FAILURE : null,
  );
  const started = useRef(false);

  async function schedule() {
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/prepare`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setProblem(problemFromResponse(json));
      }
    } catch {
      // Netwerkfout bij het INPLANNEN. De taak staat mogelijk toch al in de rij;
      // de polling hieronder leest de echte stand.
    }
  }

  const data = useStatusPoll<StatusPayload>(
    `/api/analyses/${analysisId}/status`,
    (d) => d.status === "concept_klaar" || d.status === "meten",
    () => router.replace(`/analyses/${analysisId}/instellingen`),
  );

  // Definitief mislukt: alle pogingen zijn op. Een tijdelijke storing komt hier
  // dus niet, die wordt onzichtbaar opnieuw geprobeerd.
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

  return (
    <WorkInProgress
      title="Aura bereidt je analyse voor"
      explanation="Aura leest je website op dit onderwerp, zoekt uit wie hier je concurrenten zijn en stelt de vragen op die straks naar de AI-assistenten gaan."
      etaText={data?.etaText}
      retrying={data?.retrying}
      steps={[
        { label: "Website lezen op dit onderwerp", done: Boolean(data?.hasTopicResearch) },
        { label: "Concurrenten op dit onderwerp zoeken", done: Boolean(data?.hasTopicResearch) },
        {
          label: `Vragen opstellen${data?.promptCount ? ` (${data.promptCount})` : ""}`,
          done: (data?.promptCount ?? 0) > 0,
        },
      ]}
    />
  );
}
