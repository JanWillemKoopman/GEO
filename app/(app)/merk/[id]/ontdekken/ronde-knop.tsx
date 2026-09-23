"use client";

import { useState } from "react";
import { useRefresh } from "@/components/use-refresh";
import { THEMA_MAX, THEMA_MIN } from "@/lib/cluster-discovery";

/**
 * De knop die een ontdekkingsronde start. Alleen op het scherm van de
 * consultant; de route controleert het zelf nog een keer
 * (`clusters_aanvullen` in lib/cost-rules.ts).
 *
 * Eerst bevestigen, met het bedrag erbij: een ronde kost geld, en dat hoort
 * iemand te zien vóór hij klikt en niet op de rekening.
 *
 * In dezelfde stap kiest de consultant het thema van de ronde (migratie 0111):
 * een categorie uit de aanbodboom met één klik, of eigen woorden. Zonder thema
 * blijft de startknop uit, en de route weigert het ook.
 */
export function RondeKnop({
  merkId,
  herhaling,
  kostenTekst,
  suggesties,
}: {
  merkId: string;
  herhaling: boolean;
  /** Bijvoorbeeld "ongeveer $1 tot $1,50". Komt van de server. */
  kostenTekst: string;
  /** Categorieën uit de aanbodboom (`themaSuggesties`). */
  suggesties: string[];
}) {
  const { refresh, refreshing } = useRefresh();
  const [bevestigen, setBevestigen] = useState(false);
  const [thema, setThema] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const wacht = bezig || refreshing;
  const schoon = thema.replace(/\s+/g, " ").trim();
  const geldig = schoon.length >= THEMA_MIN && schoon.length <= THEMA_MAX;

  async function start() {
    if (!geldig) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/profiles/${merkId}/discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thema: schoon }),
      });
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
          <p className="text-sm text-[var(--status-error)]" role="alert">
            {fout}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card card-rail flex flex-col gap-4">
      <span className="mono-label">Ronde starten</span>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="type-body-emphasis">Over welk product of thema gaat deze ronde?</span>
          <span className="text-sm text-secondary">
            Eén ronde zoekt gericht binnen één thema. Zo komen er onderwerpen uit die dieper gaan dan
            een ronde over het hele aanbod.
          </span>
          <input
            className="field max-w-md"
            value={thema}
            onChange={(e) => setThema(e.target.value)}
            maxLength={THEMA_MAX}
            placeholder="Bijvoorbeeld private lease"
            autoComplete="off"
            disabled={wacht}
          />
        </label>
        {suggesties.length > 0 && (
          <div className="chip-select-groep" aria-label="Thema's uit je aanbod">
            {suggesties.map((s) => (
              <button
                key={s}
                type="button"
                className="chip-select"
                aria-pressed={schoon.toLowerCase() === s.toLowerCase()}
                disabled={wacht}
                onClick={() => setThema(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-secondary">
        Een ronde kost {kostenTekst} en duurt 5 tot 10 minuten. Je kunt dit scherm daarna sluiten.
        Wat eruit komt, kost niets tot je een onderwerp laat meten.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-actie" disabled={wacht || !geldig} onClick={start}>
          {wacht ? "Bezig met starten" : "Ja, start de ronde"}
        </button>
        <button type="button" className="btn-outline" disabled={wacht} onClick={() => setBevestigen(false)}>
          Annuleren
        </button>
      </div>
      {fout && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {fout}
        </p>
      )}
    </div>
  );
}
