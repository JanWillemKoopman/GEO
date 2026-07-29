"use client";

import { useState } from "react";
import Link from "next/link";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";

/**
 * "Schrijf alles" (optimalisatie.md 4.9).
 *
 * De belofte van het product heet 1-click content generatie, maar het waren *n*
 * klikken over maximaal drie aanbevelingen. Sinds fase 1 is elke pagina een
 * losse taak in de wachtrij, dus dit legt niets plat — de werker pakt ze één
 * voor één op en de klant kan het scherm sluiten.
 *
 * Er staat bij hoeveel pagina's het worden en hoe lang het ongeveer duurt. Een
 * knop die ongevraagd acht AI-aanroepen wegzet zonder dat te zeggen, is geen
 * gemak maar een verrassing.
 */
export function GenerateAllButton({
  analysisId,
  total,
  remaining,
  blocked,
}: {
  analysisId: string;
  total: number;
  /** Hoeveel er nog niet geschreven zijn. */
  remaining: number;
  /** Houdt de technische controle een blokkade tegen? (optimalisatie.md 3.7) */
  blocked: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | "queued" | "error">("idle");
  const [problem, setProblem] = useState<UserFacingError | null>(null);
  const [planned, setPlanned] = useState(0);

  if (remaining === 0) return null;

  // Ruwe schatting: twee AI-aanroepen per pagina, en de werker doet zware taken
  // één voor één. Aan de hoge kant houden — een schatting die meevalt is prettig.
  const minutes = Math.max(1, Math.ceil((remaining * 100) / 60));

  async function generateAll() {
    setState("busy");
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/generate-all`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setProblem(problemFromResponse(json));
        return;
      }
      setPlanned((json as { planned?: number }).planned ?? remaining);
      setState("queued");
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  if (state === "error" && problem) {
    return <ErrorNotice error={problem} onRetry={() => void generateAll()} />;
  }

  if (state === "queued") {
    return (
      <div className="card flex flex-col gap-2" style={{ borderColor: "rgba(165,120,240,0.4)" }}>
        <span className="flex items-center gap-2 font-medium">
          <span className="live-dot" />
          {planned} {planned === 1 ? "pagina wordt" : "pagina's worden"} geschreven
        </span>
        <p className="text-sm text-secondary">
          Dit duurt ongeveer {minutes} {minutes === 1 ? "minuut" : "minuten"}. Je kunt dit scherm
          sluiten — het schrijven loopt door en de teksten verschijnen vanzelf in de Content
          Bibliotheek.
        </p>
        <Link href={`/analyses/${analysisId}/bibliotheek`} className="btn-outline w-fit">
          Naar de Content Bibliotheek
        </Link>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3" style={{ borderColor: "rgba(165,120,240,0.4)" }}>
      <div className="flex flex-col gap-1">
        <span className="font-medium">
          Alles laten schrijven ({remaining} van de {total})
        </span>
        <p className="text-sm text-secondary">
          We zetten alle nog ontbrekende pagina&apos;s in de wachtrij. Duurt ongeveer {minutes}{" "}
          {minutes === 1 ? "minuut" : "minuten"}; je hoeft er niet bij te blijven.
          {blocked && (
            <>
              {" "}
              <span className="font-medium text-[var(--text-primary)]">
                Let op: je site houdt AI-assistenten nu buiten
              </span>{" "}
              — deze teksten kunnen dan nog niet geciteerd worden.
            </>
          )}
        </p>
      </div>
      <button
        onClick={() => void generateAll()}
        disabled={state === "busy"}
        className="btn-primary w-fit"
      >
        {state === "busy" ? "Bezig…" : `Schrijf alle ${remaining} pagina's`}
      </button>
    </div>
  );
}
