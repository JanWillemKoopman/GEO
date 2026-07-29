"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisStatus } from "@/lib/types/database";
import { ErrorNotice, problemFromResponse } from "@/components/error-notice";
import { WorkInProgress, useStatusPoll } from "@/components/work-in-progress";
import type { UserFacingError } from "@/lib/errors";

interface StatusPayload {
  status: AnalysisStatus;
  pendingJobs: number;
  failedJobs: number;
  retrying: boolean;
  etaText: string | null;
}

/**
 * Voortgang van het rapport (B1+B2).
 *
 * Wordt normaal gesproken alleen nog getoond, niet gestart: de aggregatietaak
 * ketent zelf door naar het rapport (optimalisatie.md 1.5). Alleen bij een
 * DEFINITIEF mislukt rapport plant dit scherm een nieuwe poging in — dat is de
 * retry-knop, geen automatische start.
 */
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
  const scheduledOnce = useRef(false);

  async function schedule() {
    setProblem(null);
    scheduledOnce.current = true;
    try {
      const res = await fetch(`/api/analyses/${analysisId}/report`, { method: "POST" });
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
    if (!data) return;
    if (data.status === "mislukt" || data.failedJobs > 0) {
      setProblem((p) => p ?? STALE_FAILURE);
      return;
    }
    // Vangnet: staat de analyse op 'gemeten' zonder openstaand werk, dan is de
    // ketening ergens onderbroken (bv. een taak die vóór deze fase is blijven
    // hangen). Eén keer alsnog inplannen in plaats van eindeloos wachten.
    if (data.status === "gemeten" && data.pendingJobs === 0 && !scheduledOnce.current) {
      void schedule();
    }
    // `schedule` is stabiel genoeg (leest alleen analysisId) en wordt bewust
    // niet als dependency opgenomen — dat zou dit effect elke render opnieuw
    // laten draaien en de vangnet-inplanning herhalen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (problem) {
    return <ErrorNotice error={problem} onRetry={() => void schedule()} />;
  }

  return (
    <WorkInProgress
      title="Rapport wordt opgesteld"
      explanation="We vergelijken je meting met die van je concurrenten en zetten de belangrijkste kansen op een rij."
      etaText={data?.etaText}
      retrying={data?.retrying}
    />
  );
}
