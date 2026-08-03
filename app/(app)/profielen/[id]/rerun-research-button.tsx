"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "Onderzoek opnieuw" (docs/tasks/onboarding-2.0.md §8, punt 3).
 *
 * De knop is alleen bruikbaar omdat hij veilig is: `field-merge.ts` houdt
 * profielvelden tegen die een mens zette, en de route laat aanbodknopen met
 * bron `klant` of `gesprek` staan. Zonder die twee zou dit een knop zijn die je
 * niet durft te gebruiken — en dan is het antwoord op "de site is vernieuwd"
 * weer "maak een nieuw merk aan".
 *
 * Een bevestiging ervoor, want het duurt een paar minuten en het herschrijft
 * het aanbod. Geen modaal venster: één klik die verandert in twee is genoeg.
 */
export function RerunResearchButton({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/deep-research`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Opnieuw onderzoeken mislukt.");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Opnieuw onderzoeken mislukt. Controleer je verbinding.");
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="btn-outline btn-sm w-fit"
          onClick={() => setConfirming(true)}
        >
          Onderzoek opnieuw
        </button>
        {error && (
          <p className="text-sm text-[var(--status-error)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
      <p className="text-sm text-secondary">
        We lezen de website opnieuw uit en bouwen het aanbod opnieuw op. Dat
        duurt een paar minuten.
        <strong> Wat jij of de klant heeft ingevuld blijft staan</strong>, net
        als de onderwerpen en de AI-kennistest.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary btn-sm disabled:opacity-60"
          disabled={pending}
          onClick={() => void run()}
        >
          {pending ? "Starten…" : "Ja, opnieuw onderzoeken"}
        </button>
        <button
          type="button"
          className="btn-outline btn-sm"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Annuleren
        </button>
      </div>
      {error && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
