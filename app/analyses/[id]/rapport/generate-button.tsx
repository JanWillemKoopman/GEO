"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ContentAction, ContentType } from "@/lib/types/database";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";

/**
 * "Genereer deze pagina" (Fase C, expliciet op klik).
 *
 * Het schrijven draait nu op de achtergrond (optimalisatie.md 1.4): de knop
 * plant het in en pollt tot de pagina klaar is. Voorheen hield deze fetch
 * zestig seconden lang een verbinding open terwijl gpt-4.1 twee volledige
 * pagina's schreef — de meest waarschijnlijke plek om op de tijdslimiet stuk te
 * lopen, en dan was het dure schrijfwerk weg.
 *
 * Sluit de klant de tab, dan gaat het schrijven gewoon door.
 */
const GENERATION_FAILED: UserFacingError = {
  kind: "unknown",
  title: "Het schrijven van deze pagina is misgelopen",
  message:
    "We hebben het een paar keer geprobeerd. Probeer het opnieuw — lukt het dan " +
    "nog niet, laat het ons dan weten.",
  canRetry: true,
  detail: "",
};

export function GenerateButton({
  analysisId,
  reportId,
  recommendation,
}: {
  analysisId: string;
  reportId: string;
  recommendation: {
    title: string;
    type: ContentType;
    targetIntent: string;
    why: string;
    action: ContentAction;
    existingUrl: string | null;
  };
}) {
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [problem, setProblem] = useState<UserFacingError | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  function startPolling() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    const url = `/api/analyses/${analysisId}/content?title=${encodeURIComponent(recommendation.title)}`;
    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const json: { ready: boolean; failed: boolean } = await res.json();
        if (json.ready) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setState("done");
        } else if (json.failed) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setState("error");
          setProblem(GENERATION_FAILED);
        }
      } catch {
        /* stil — volgende tick probeert opnieuw */
      }
    }, 4000);
  }

  async function generate() {
    setState("pending");
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...recommendation, reportId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setProblem(problemFromResponse(json));
        return;
      }
      // Stond hij er al? Dan zijn we meteen klaar.
      if (json.done) {
        setState("done");
        return;
      }
      startPolling();
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  if (state === "error" && problem) {
    return <ErrorNotice error={problem} onRetry={() => void generate()} />;
  }

  if (state === "done") {
    return (
      <Link href={`/analyses/${analysisId}/bibliotheek`} className="btn-outline w-fit">
        ✓ Klaar — bekijk in de Bibliotheek
      </Link>
    );
  }

  if (state === "pending") {
    return (
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm text-secondary">
          <span className="live-dot" />
          Pagina wordt geschreven…
        </span>
        <span className="text-sm text-muted">
          Dit duurt een paar minuten. Je kunt deze pagina sluiten — het schrijven loopt door en de
          tekst verschijnt vanzelf in de Content Bibliotheek.
        </span>
      </div>
    );
  }

  return (
    <button onClick={() => void generate()} className="btn-primary w-fit">
      Genereer deze pagina
    </button>
  );
}
