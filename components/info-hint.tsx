"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Uitleg op de plek zelf (optimalisatie.md 2.10).
 *
 * Bij elk cijfer een klein vraagteken met twee zinnen: wat is dit, en hoe zeker
 * zijn we ervan. Bewust géén aparte helppagina. Daar komt niemand, en een
 * getal dat je moet opzoeken om te begrijpen is een getal dat je verkeerd
 * onthoudt.
 *
 * Het paneeltje sluit op Escape en op een klik ergens anders, en de knop houdt
 * het formaat van een echte tikdoel (44px) zodat hij op mobiel bruikbaar is,
 * ook al ziet hij er klein uit.
 */
export function InfoHint({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        // Zichtbaar klein, aanraakbaar groot: het negatieve marge-trucje houdt de
        // knop 44×44 zonder dat hij de regelhoogte opblaast.
        className="-m-3 inline-flex h-11 w-11 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        aria-label={`Uitleg: ${label}`}
      >
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full border border-current"
          style={{ fontSize: "0.6rem", lineHeight: 1 }}
          aria-hidden
        >
          ?
        </span>
      </button>

      {open && (
        <span
          id={panelId}
          role="note"
          // ⚠️ Bewust NIET `.menu-surface` (21 september 2026): die klasse zet
          // `padding: 4px 0`, bedoeld voor een dropdown waarvan elke REGEL zijn
          // eigen zijpadding draagt. Op dit paneeltje, met vrije lopende tekst,
          // won die regel het van Tailwinds `p-3` (gelijke specificiteit, later
          // in de bundel), dus stond de tekst zonder zijmarge tot aan de rand.
          className="absolute left-0 top-8 z-20 block w-64 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm font-normal leading-snug text-secondary shadow-[var(--shadow-lg)]"
        >
          <span className="mono-label mb-1 block" style={{ fontSize: "0.65rem" }}>
            {label}
          </span>
          {children}
        </span>
      )}
    </span>
  );
}
