"use client";

import { useState } from "react";
import Link from "next/link";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";

/**
 * "Bereid alles voor" (optimalisatie.md 4.9).
 *
 * De belofte van het product heet 1-click content generatie, maar het waren *n*
 * klikken over maximaal drie aanbevelingen. Sinds fase 1 is elke pagina een
 * losse taak in de wachtrij, dus dit legt niets plat, de werker pakt ze één
 * voor één op en de klant kan het scherm sluiten.
 *
 * Er staat bij hoeveel pagina's het worden en hoe lang het ongeveer duurt. Een
 * knop die ongevraagd acht AI-aanroepen wegzet zonder dat te zeggen, is geen
 * gemak maar een verrassing.
 *
 * ── ⚠️ DEZE KNOP SCHREEF NOOIT, EN ZEI TOT 7 SEPTEMBER 2026 VAN WEL ─────────
 *
 * `generate-all/route.ts` stuurt altijd `{ briefing: true, ... }` terug: de
 * route plant nooit meteen een schrijfronde in, hij zet de hele batch klaar
 * voor de contentbriefing (`contentbriefing.md` §2), want drie keer dezelfde
 * vraag beantwoorden bij drie losse pagina's is precies de wrijving die
 * `README.md` §2 verbiedt. Deze knop las dat veld nooit en toonde na élke
 * geslaagde aanroep "ORBIT ENGINE schrijft N pagina's" met een pulserend
 * live-bolletje, alsof het schrijven al liep. Er stond geen letter tekst: de
 * klant moest eerst zelf de briefing invullen. `generate-button.tsx` (de
 * knop voor één pagina) had deze vertakking al wél; nu deze knop ook, zelfde
 * patroon als `state === "briefing"` daar.
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
  const [state, setState] = useState<"idle" | "busy" | "briefing" | "error">("idle");
  const [problem, setProblem] = useState<UserFacingError | null>(null);
  const [planned, setPlanned] = useState(0);

  if (remaining === 0) return null;

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
      setPlanned((json as { pages?: number }).pages ?? remaining);
      setState("briefing");
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  if (state === "error" && problem) {
    return <ErrorNotice error={problem} onRetry={() => void generateAll()} />;
  }

  // De route heeft de batch klaargezet voor de vragen, er is nog geen letter
  // geschreven. Zelfde melding en dezelfde bestemming als bij één losse pagina.
  if (state === "briefing") {
    return (
      <div className="card card-accent flex flex-col gap-2">
        <span className="font-medium">
          {planned} {planned === 1 ? "pagina staat" : "pagina's staan"} klaar voor jouw vragen
        </span>
        <p className="text-sm text-secondary">
          ORBIT ENGINE heeft de feiten verzameld die het al kent. Beantwoord de vragen die overblijven,
          dan schrijft het de pagina&apos;s.
        </p>
        <Link href={`/analyses/${analysisId}/briefing`} className="btn-primary w-fit">
          Beantwoord de vragen
        </Link>
      </div>
    );
  }

  return (
    <div className="card card-accent flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="font-medium">
          Bereid alle pagina&apos;s voor om te schrijven ({remaining} van de {total})
        </span>
        <p className="text-sm text-secondary">
          ORBIT ENGINE verzamelt eerst de feiten en de vragen die nog overblijven. Daarna beantwoord je
          ze in één keer, en pas dan schrijft ORBIT ENGINE de pagina&apos;s.
          {blocked && (
            <>
              {" "}
              <span className="font-medium text-[var(--text-primary)]">
                Let op: je site houdt AI-assistenten nu buiten.
              </span>{" "}
              Deze teksten kunnen voorlopig niet geciteerd worden.
            </>
          )}
        </p>
      </div>
      <button
        onClick={() => void generateAll()}
        disabled={state === "busy"}
        className="btn-primary btn-lg w-fit"
      >
        {state === "busy" ? "Bezig…" : `Bereid ${remaining} pagina's voor`}
      </button>
    </div>
  );
}
