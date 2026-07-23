"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContentType } from "@/lib/types/database";

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
  recommendation: { title: string; type: ContentType; targetIntent: string; why: string };
}) {
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  async function generate() {
    setState("pending");
    setErrorDetail(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...recommendation, reportId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setErrorDetail(json.detail ?? json.error ?? null);
        return;
      }
      setState("done");
    } catch (err) {
      setState("error");
      setErrorDetail(err instanceof Error ? err.message : String(err));
    }
  }

  if (state === "done") {
    return (
      <Link href={`/analyses/${analysisId}/bibliotheek`} className="btn-outline w-fit">
        ✓ Klaar — bekijk in de Bibliotheek
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={() => void generate()} disabled={state === "pending"} className="btn-primary w-fit disabled:opacity-60">
        {state === "pending" ? "Pagina schrijven…" : "Genereer deze pagina"}
      </button>
      {state === "error" && (
        <span className="text-sm text-[var(--status-error)]">
          Genereren mislukt{errorDetail ? `: ${errorDetail}` : "."} Probeer het opnieuw.
        </span>
      )}
    </div>
  );
}
