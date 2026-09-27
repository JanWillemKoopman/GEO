"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";

export interface KennisConflictWeergave {
  id: string;
  soort: string;
  blokkerend: boolean;
  uitleg: string | null;
  items: { id: string; bewering: string; herkomst: string; actueel: boolean }[];
}

/**
 * Botsingen tussen kennisitems (K7, besluit V14): twee versies van hetzelfde
 * gegeven in de kennis over het bedrijf. De consultant kiest welke klopt, of
 * geen van beide. Schrijven gaat via de API-route (conventie 6).
 */
export function KennisConflictLijst({ profileId, conflicten }: { profileId: string; conflicten: KennisConflictWeergave[] }) {
  const router = useRouter();
  const [bezig, setBezig] = useState<string | null>(null);
  const [probleem, setProbleem] = useState<UserFacingError | null>(null);

  async function kies(conflictId: string, body: Record<string, unknown>) {
    setBezig(conflictId);
    setProbleem(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/fact-conflicts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId, ...body }),
      });
      if (!res.ok) {
        setProbleem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      router.refresh();
    } catch (err) {
      setProbleem(networkProblem(err));
    } finally {
      setBezig(null);
    }
  }

  if (conflicten.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium">In de kennis over het bedrijf</h2>
      <p className="text-sm text-secondary">
        Twee versies van hetzelfde gegeven. Zolang je niet kiest, gaat geen van beide naar de schrijver. Wat je kiest, telt als
        bevestigd door de klant; het andere wordt afgewezen.
      </p>
      {probleem && <ErrorNotice error={probleem} />}
      <ul className="flex flex-col gap-3">
        {conflicten.map((c) => (
          <li key={c.id} className="card flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono-label">{c.soort}</span>
              {c.blokkerend && <span className="text-xs text-secondary">Een hard gegeven, zoals een prijs of termijn</span>}
            </div>
            <ul className="flex flex-col gap-2">
              {c.items.map((i) => (
                <li key={i.id} className="vlak flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">&ldquo;{i.bewering}&rdquo;</span>
                    <span className="text-xs text-muted">{i.herkomst}</span>
                  </div>
                  {i.actueel ? (
                    <button
                      type="button"
                      className="btn-outline btn-sm shrink-0"
                      disabled={bezig === c.id}
                      onClick={() => kies(c.id, { kennisId: i.id })}
                    >
                      Dit klopt
                    </button>
                  ) : (
                    <span className="text-xs text-muted">Al afgewezen of vervangen</span>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn-ghost btn-sm w-fit"
              disabled={bezig === c.id}
              onClick={() => kies(c.id, { geenVanBeide: true })}
            >
              Geen van beide klopt
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
