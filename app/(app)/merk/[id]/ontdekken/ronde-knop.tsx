"use client";

import { useState } from "react";
import { useRefresh } from "@/components/use-refresh";

/**
 * De knop die een ontdekkingsronde start. Alleen op het scherm van de
 * consultant; de route controleert het zelf nog een keer
 * (`clusters_aanvullen` in lib/cost-rules.ts).
 *
 * Eerst bevestigen, met het bedrag erbij: een ronde kost geld, en dat hoort
 * iemand te zien vóór hij klikt en niet op de rekening.
 */
export function RondeKnop({
  merkId,
  herhaling,
  kostenTekst,
}: {
  merkId: string;
  herhaling: boolean;
  /** Bijvoorbeeld "ongeveer $1 tot $1,50". Komt van de server. */
  kostenTekst: string;
}) {
  const { refresh, refreshing } = useRefresh();
  const [bevestigen, setBevestigen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const wacht = bezig || refreshing;

  async function start() {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/profiles/${merkId}/discovery`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setFout(json.error ?? "De ronde kon niet gestart worden.");
        setBezig(false);
        return;
      }
      refresh();
    } catch {
      setFout("De ronde kon niet gestart worden. Controleer je verbinding.");
      setBezig(false);
    }
  }

  if (!bevestigen) {
    return (
      <div className="flex flex-col gap-1">
        <button type="button" className="btn-actie w-fit" onClick={() => setBevestigen(true)}>
          {herhaling ? "Nieuwe ontdekkingsronde" : "Start een ontdekkingsronde"}
        </button>
        {fout && (
          <p className="text-sm text-[var(--intent-danger-content)]" role="alert">
            {fout}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card card-rail flex flex-col gap-3">
      <span className="mono-label">Ronde starten</span>
      <p className="text-secondary">
        Een ronde kost {kostenTekst} en duurt 5 tot 10 minuten. Je kunt dit scherm daarna sluiten.
        Wat eruit komt, kost niets tot je een onderwerp laat meten.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-actie" disabled={wacht} onClick={start}>
          {wacht ? "Bezig met starten" : "Ja, start de ronde"}
        </button>
        <button type="button" className="btn-ghost" disabled={wacht} onClick={() => setBevestigen(false)}>
          Annuleren
        </button>
      </div>
      {fout && (
        <p className="text-sm text-[var(--intent-danger-content)]" role="alert">
          {fout}
        </p>
      )}
    </div>
  );
}
