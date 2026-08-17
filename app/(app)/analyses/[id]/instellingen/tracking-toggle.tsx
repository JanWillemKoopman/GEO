"use client";

import { useState } from "react";

/** Aan/uit-schakelaar voor de wekelijkse tracking-lus (abcplan.md §6 A3/§12.4). */
export function TrackingToggle({ analysisId, initial }: { analysisId: string; initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/tracking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracking_enabled: next }),
      });
      // A.10: een optimistische schakelaar die stil terugvalt bij een mislukte
      // opslag is erger dan geen bevestiging, hij toont dan een staat die niet
      // is opgeslagen. Bij een fout dus de knop terugzetten én dat zeggen.
      if (!res.ok) {
        setEnabled(!next);
        setError("Opslaan is niet gelukt. Probeer het opnieuw.");
      }
    } catch {
      setEnabled(!next);
      setError("We konden ORBIT ENGINE niet bereiken. Controleer je verbinding.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card flex items-center justify-between gap-4">
      <div>
        <span className="mono-label">Wekelijks meten</span>
        <p className="mt-1 text-sm text-secondary">
          ORBIT ENGINE meet tien weken lang elke week opnieuw. Zo zie je een lijn in plaats van één
          nulmeting.
        </p>
        {error && (
          <p className="mt-1 text-sm text-[var(--status-error)]" role="alert">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending}
        aria-pressed={enabled}
        className="relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60"
        style={{ background: enabled ? "var(--intent-intelligence-solid)" : "var(--bg-elevated)", border: "var(--border-width-xs) solid var(--border-subtle)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}
