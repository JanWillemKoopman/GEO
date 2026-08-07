"use client";

import { useState } from "react";

/**
 * Eén kopieerknop voor de hele app (H.65).
 *
 * `answers-view.tsx` bouwde dit patroon al één keer met de hand (kopieer een
 * meting als bewijs); dit is dezelfde knop, generiek gemaakt zodat elke andere
 * plek die iets kopieerbaar heeft, geen tweede versie hoeft te schrijven, een
 * publicatie-URL, een citaat, een e-mailadres, een service-account-adres.
 *
 * Geen foutmelding bij een geweigerd klembord (geen https, of de gebruiker zei
 * nee): dat is meer ruis dan hulp voor een knop die toch al optioneel is.
 */
export function CopyButton({
  value,
  label = "Kopieer",
  copiedLabel = "Gekopieerd",
  className = "text-sm text-secondary hover:underline",
}: {
  /** Wat er op het klembord komt. Een lege waarde toont geen knop. */
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!value.trim()) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Klembord geweigerd. Stil laten liggen, zie de uitleg hierboven.
    }
  }

  return (
    <button type="button" onClick={() => void copy()} className={className}>
      {copied ? `✓ ${copiedLabel}` : label}
    </button>
  );
}
