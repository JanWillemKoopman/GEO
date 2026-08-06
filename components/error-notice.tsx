"use client";

/**
 * Uniforme foutweergave (optimalisatie.md 0.11).
 *
 * Vervangt het patroon dat in prepare-progress, measure-progress,
 * report-progress en generate-button drie keer los herhaald werd: een rood
 * "Mislukt"-label met daaronder de ruwe serverfout in monospace. Voor een
 * ondernemer zonder technische achtergrond zegt "[429] Rate limit reached for
 * gpt-5.6-luna" niets, behalve dat er iets stuk is.
 *
 * Hier: kop en uitleg in gewone taal, één duidelijke vervolgstap, en de
 * technische tekst weggevouwen achter "technische details" (nog steeds nodig
 * voor support, maar niet het eerste wat iemand leest).
 */
import type { UserFacingError } from "@/lib/errors";

export function ErrorNotice({
  error,
  onRetry,
  retryLabel = "Opnieuw proberen",
}: {
  error: UserFacingError;
  /** Weglaten als er in deze context niets te herhalen valt. */
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="card card-danger flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="chip chip-danger w-fit">Niet gelukt</span>
        {/* role="alert" zodat een schermlezer de fout aankondigt zodra hij verschijnt. */}
        <h3 className="text-lg font-semibold" role="alert">
          {error.title}
        </h3>
        <p className="text-secondary">{error.message}</p>
      </div>

      {error.canRetry && onRetry && (
        <button onClick={onRetry} className="btn-primary w-fit">
          {retryLabel}
        </button>
      )}

      {error.detail && (
        <details className="text-sm">
          <summary className="mono-label cursor-pointer transition-colors hover:text-[var(--text-primary)]">
            Technische details
          </summary>
          <p className="mt-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 font-mono text-xs break-words text-[var(--text-secondary)]">
            {error.detail}
          </p>
        </details>
      )}
    </div>
  );
}

/**
 * Vertaalt een mislukte fetch-respons naar een UserFacingError. De server stuurt
 * de classificatie mee (`problem`); ontbreekt die, bv. Bij een 502 van het
 * platform zelf, waar onze route niet eens aan bod komt. Dan vallen we terug op
 * een algemene boodschap in plaats van een lege melding.
 */
export function problemFromResponse(json: unknown, fallbackDetail = ""): UserFacingError {
  const problem = (json as { problem?: UserFacingError } | null)?.problem;
  if (problem?.title && problem?.message) return problem;

  const detail =
    (json as { detail?: string; error?: string } | null)?.detail ??
    (json as { error?: string } | null)?.error ??
    fallbackDetail;

  return {
    kind: "unknown",
    title: "Er ging iets onverwachts mis",
    message: "Probeer het opnieuw. Blijft het misgaan, laat het ons dan weten.",
    canRetry: true,
    detail,
  };
}

/** Netwerkfout aan de kant van de browser (verbinding weggevallen, offline). */
export function networkProblem(err: unknown): UserFacingError {
  return {
    kind: "ai_unavailable",
    title: "Geen verbinding",
    message:
      "Je browser komt niet bij Aura. Controleer je internetverbinding. " +
      "Het werk op de achtergrond loopt gewoon door.",
    canRetry: true,
    detail: err instanceof Error ? err.message : String(err),
  };
}
