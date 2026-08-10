"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileStatus } from "@/lib/types/database";
import type { ResearchStep } from "@/lib/pipeline/research-steps";
import { ErrorNotice, problemFromResponse } from "@/components/error-notice";
import { WorkInProgress, useStatusPoll } from "@/components/work-in-progress";
import type { UserFacingError } from "@/lib/errors";

interface StatusPayload {
  status: ProfileStatus;
  pendingJobs: number;
  failedJobs: number;
  retrying: boolean;
  attempts: number;
  etaText: string | null;
  /**
   * Dezelfde stappen die `ProfileReadinessPanel` verderop toont. Ze stonden er al
   * in de payload en werden hier niet gebruikt, het wachten was daardoor twee
   * verschillende ervaringen achter elkaar: eerst een generiek scherm van een
   * minuut, dan een stappenlijst. Nu één lijst die gewoon doorloopt.
   */
  steps?: ResearchStep[];
}

/**
 * Voortgang van het profielonderzoek. Plant het werk in en kijkt toe, zelfde
 * patroon als prepare-progress (optimalisatie.md 1.7).
 *
 * Dit is de zwaarste enkele taak in het systeem (sitemap-crawl van tot 150
 * pagina's plus AI-onderzoek met web_search). Juist hier was "je kunt dit
 * scherm sluiten" het minst waar toen de browser het werk nog zelf deed.
 */
const STALE_FAILURE: UserFacingError = {
  kind: "unknown",
  title: "Het onderzoek is eerder vastgelopen",
  message:
    "Meestal is dat een tijdelijke storing, of een website die Aura niet " +
    "binnenliet. Probeer het opnieuw, je gegevens blijven staan.",
  canRetry: true,
  detail: "",
};

export function ProfileProgress({
  profileId,
  initialStatus,
}: {
  profileId: string;
  initialStatus: ProfileStatus;
}) {
  const router = useRouter();
  const [problem, setProblem] = useState<UserFacingError | null>(
    initialStatus === "mislukt" ? STALE_FAILURE : null,
  );
  const started = useRef(false);

  async function schedule() {
    setProblem(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/research`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setProblem(problemFromResponse(json));
      }
    } catch {
      /* netwerkfout bij inplannen, de polling leest de echte stand */
    }
  }

  const data = useStatusPoll<StatusPayload>(
    `/api/profiles/${profileId}/status`,
    (d) => d.status === "klaar",
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

  return (
    <WorkInProgress
      title="Aura leert je merk kennen"
      explanation="Aura leest je website, brengt in kaart welke pagina's er staan, en zoekt uit wat je aanbiedt en wie je concurrenten zijn. Voordat het één woord schrijft, weet het wie je bent."
      steps={(data?.steps ?? []).map((s) => ({
        label: s.result ? `${s.label}: ${s.result}` : s.label,
        done: s.state === "klaar" || s.state === "overgeslagen",
      }))}
      etaText={data?.etaText}
      retrying={data?.retrying}
      attempts={data?.attempts}
    />
  );
}
