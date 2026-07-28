"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Mobiel accountmenu: op kleine schermen staat er in de header alleen dit
 * profiel-icoon (desktop toont alles al direct inline, zie AppShell). Erachter
 * zit geen kleine dropdown maar een full-screen sheet (designsystem.md C3: op
 * mobiel voelt dat nativer aan dan een klein paneeltje), met alle navigatie en
 * account-acties in één duimbereik-vriendelijke lijst.
 */
export function ProfileMenu({
  email,
  signOutAction,
}: {
  email: string;
  signOutAction: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    // Voorkomt dat de pagina eronder meescrollt terwijl het sheet open staat.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu openen"
        aria-haspopup="dialog"
        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] sm:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 20c1.6-3.6 4.8-5.5 8-5.5s6.4 1.9 8 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-base)] sm:hidden"
          >
          <div className="flex h-16 items-center justify-between border-b border-[var(--border-subtle)] px-6">
            <span className="text-lg font-bold tracking-tight">
              <span className="brand-gradient-text">GEO Tracker</span>
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Menu sluiten"
              className="-m-2.5 flex h-11 w-11 items-center justify-center text-2xl text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              ×
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-6 py-8">
            <div className="flex flex-col gap-1">
              <span className="mono-label">Navigatie</span>
              <nav className="flex flex-col">
                <Link
                  href="/analyses"
                  onClick={() => setOpen(false)}
                  className="border-b border-[var(--border-subtle)] py-4 text-lg font-medium"
                >
                  Mijn analyses
                </Link>
                <Link
                  href="/profielen"
                  onClick={() => setOpen(false)}
                  className="border-b border-[var(--border-subtle)] py-4 text-lg font-medium"
                >
                  Klantprofielen
                </Link>
              </nav>
            </div>

            <div className="flex flex-col gap-1">
              <span className="mono-label">Account</span>
              <nav className="flex flex-col">
                <Link
                  href="/profielen"
                  onClick={() => setOpen(false)}
                  className="border-b border-[var(--border-subtle)] py-4 text-lg font-medium"
                >
                  Mijn bedrijfsgegevens
                </Link>
                <Link
                  href="/instellingen"
                  onClick={() => setOpen(false)}
                  className="border-b border-[var(--border-subtle)] py-4 text-lg font-medium"
                >
                  Mijn instellingen
                </Link>
              </nav>
            </div>

            <div className="mt-auto flex flex-col gap-4">
              <span className="text-sm text-secondary">{email}</span>
              <form action={signOutAction}>
                <button type="submit" className="btn-outline w-full">
                  Uitloggen
                </button>
              </form>
            </div>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
