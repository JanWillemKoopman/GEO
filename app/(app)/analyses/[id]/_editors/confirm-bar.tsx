"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * De goedkeuringsbalk van het conceptscherm (abcplan.md §3.6/A2c).
 *
 * Deze knop stond eerder onderaan het tabblad "Instellingen", na vijf kaarten
 * scrollen, de enige handeling waarop de hele app staat te wachten, verstopt op
 * de plek die universeel "hier hoef je niet te zijn" betekent.
 *
 * Nu is het een blijvende balk over de volle breedte, op élk schermformaat: je
 * kunt het concept van boven tot onder doorlezen zonder de actie ooit kwijt te
 * raken. De glaslaag (`backdrop-blur`) is dezelfde als die van de bovenbalk,
 * designsystem.md §A3 gebruikt dat patroon voor alles wat over de inhoud heen
 * zweeft.
 */
export function ConfirmBar({
  analysisId,
  activeCount,
}: {
  analysisId: string;
  /** Aantal actieve vragen (A.8): wat er gaat gebeuren, niet alleen dat er iets gebeurt. */
  activeCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    let res: Response;
    try {
      res = await fetch(`/api/analyses/${analysisId}/confirm`, { method: "POST" });
    } catch {
      // De fetch zelf strandde (netwerk/timeout), er is geen response om te lezen.
      setError("Bevestigen is niet gelukt. Probeer het opnieuw.");
      setPending(false);
      return;
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Bevestigen is niet gelukt.");
      setPending(false);
      return;
    }
    // Buiten de try: bevestigen is al gelukt op de server, dus een fout hier
    // (bv. tijdens router.refresh) mag niet als "bevestigen mislukt" ogen.
    router.push(`/analyses/${analysisId}`);
    router.refresh();
  }

  return (
    <>
      {/* Spacer, zodat de balk het einde van de inhoud nooit bedekt. */}
      <div className="no-print h-24" aria-hidden />
      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-base-blur)] px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2">
          <button
            onClick={() => void confirm()}
            disabled={pending}
            className="btn-primary btn-lg w-full disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Meting starten…" : "Bevestig en start de meting"}
          </button>
          {error ? (
            <span className="text-sm text-[var(--status-error)]" role="alert">
              {error}
            </span>
          ) : (
            <span className="hidden text-sm text-muted sm:inline">
              {/* A.8: aankondigen wat er gaat gebeuren, niet alleen dat er iets gebeurt. */}
              ORBIT ENGINE stelt {activeCount} {activeCount === 1 ? "vraag" : "vragen"} aan AI-assistenten
              en verwerkt de antwoorden. Je kunt de vragen en het onderzoek hierna nog steeds
              aanpassen.
            </span>
          )}
        </div>
      </div>
    </>
  );
}
