"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContentAction, ContentType } from "@/lib/types/database";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";

/**
 * "Genereer deze pagina" (abcplan.md §8, Fase C — expliciet op klik, niet vooraf).
 * Na succes een link naar de Content Bibliotheek. Idempotent server-side: nog
 * eens klikken maakt geen dubbele pagina aan.
 */
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
      setState("done");
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  if (state === "done") {
    return (
      <Link href={`/analyses/${analysisId}/bibliotheek`} className="btn-outline w-fit">
        ✓ Klaar — bekijk in de Bibliotheek
      </Link>
    );
  }

  if (state === "error" && problem) {
    return <ErrorNotice error={problem} onRetry={() => void generate()} retryLabel="Opnieuw proberen" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={() => void generate()} disabled={state === "pending"} className="btn-primary w-fit disabled:opacity-60">
        {state === "pending" ? "Pagina schrijven…" : "Genereer deze pagina"}
      </button>
    </div>
  );
}
