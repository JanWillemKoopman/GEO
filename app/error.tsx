"use client";

/**
 * Vangnet voor onverwachte fouten in het ingelogde gedeelte.
 *
 * Zonder dit bestand kreeg de klant de standaardpagina van het framework te
 * zien: buiten de huisstijl om, in het Engels, zonder uitweg. Terwijl er al een
 * `ErrorNotice` bestond die precies het juiste doet — gewone taal boven, de
 * technische tekst weggevouwen eronder. Die gebruiken we hier.
 */
import { useEffect } from "react";
import Link from "next/link";
import { ErrorNotice } from "@/components/error-notice";
import { describeError } from "@/lib/errors";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Zichtbaar in de serverlogs van Vercel; de klant hoeft dit niet te lezen.
    console.error("Onverwachte fout in een pagina:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-16">
      <ErrorNotice
        error={{
          kind: "unknown",
          title: "Deze pagina kon niet geladen worden",
          message:
            "Er ging iets mis bij het ophalen van je gegevens. Probeer het opnieuw — " +
            "je werk op de achtergrond loopt gewoon door.",
          canRetry: true,
          // De digest hoort erbij: daarmee is de fout in de logs terug te vinden.
          detail: [describeError(error), error.digest && `digest ${error.digest}`]
            .filter(Boolean)
            .join(" · "),
        }}
        onRetry={reset}
        retryLabel="Opnieuw laden"
      />
      <Link href="/analyses" className="mono-label w-fit transition-colors hover:text-[var(--text-primary)]">
        ← Terug naar je analyses
      </Link>
    </div>
  );
}
