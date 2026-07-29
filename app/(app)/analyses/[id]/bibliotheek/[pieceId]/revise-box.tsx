"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";

/**
 * "Wat moet er anders?" (optimalisatie.md 4.8).
 *
 * De belangrijkste ontbrekende knop in de hele app. Een pagina die er bijna was
 * kon alleen geaccepteerd of genegeerd worden — "maak hem korter", "de toon is
 * te formeel", "noem onze levertijd erbij" was nergens te zeggen, en dan is het
 * hele redactieproces eenrichtingsverkeer.
 *
 * Het resultaat is een NIEUWE VERSIE, geen overschrijving: gaat het slechter,
 * dan kan de klant terug.
 */
const SUGGESTIONS = [
  "Maak hem korter en concreter",
  "De toon is te formeel",
  "Meer nadruk op wat wij anders doen",
  "Voeg onze prijzen en levertijden toe",
];

export function ReviseBox({ analysisId, pieceId }: { analysisId: string; pieceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "queued" | "error">("idle");
  const [problem, setProblem] = useState<UserFacingError | null>(null);

  async function submit() {
    const value = note.trim();
    if (!value) return;

    setState("busy");
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/content/${pieceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setProblem(problemFromResponse(json));
        return;
      }
      setState("queued");
      // De nieuwe versie verschijnt vanzelf; de pagina verversen zodat de klant
      // de versiegeschiedenis ziet groeien zodra hij terugkomt.
      router.refresh();
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  if (state === "error" && problem) {
    return <ErrorNotice error={problem} onRetry={() => void submit()} />;
  }

  if (state === "queued") {
    return (
      <div className="card card-accent flex flex-col gap-2">
        <span className="flex items-center gap-2 font-medium">
          <span className="live-dot" />
          We schrijven een nieuwe versie
        </span>
        <p className="text-sm text-secondary">
          Dit duurt een paar minuten. Je kunt dit scherm sluiten — de nieuwe versie verschijnt
          vanzelf, en deze versie blijft bewaard voor het geval je terug wilt.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline w-fit">
        Iets aanpassen aan deze tekst
      </button>
    );
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="mono-label">Wat moet er anders?</span>
        <p className="text-sm text-secondary">
          Schrijf het gewoon in je eigen woorden. We maken een nieuwe versie; deze blijft bewaard.
        </p>
      </div>

      <textarea
        className="field"
        rows={4}
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Bijvoorbeeld: de eerste alinea mag directer, en noem er onze openingstijden bij."
        aria-label="Wat moet er anders aan deze tekst?"
      />

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            // Aanvullen in plaats van vervangen: de klant kan meerdere punten
            // stapelen, en wat hij al getypt had gaat niet verloren.
            onClick={() => setNote((n) => (n.trim() ? `${n.trim()}\n${s}` : s))}
            className="chip"
            style={{
              fontSize: "0.7rem",
              background: "transparent",
              color: "var(--text-muted)",
              borderColor: "var(--border-subtle)",
            }}
          >
            + {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={state === "busy" || !note.trim()}
          className="btn-primary w-fit"
        >
          {state === "busy" ? "Bezig…" : "Schrijf een nieuwe versie"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-secondary hover:underline">
          Annuleren
        </button>
      </div>
    </div>
  );
}
