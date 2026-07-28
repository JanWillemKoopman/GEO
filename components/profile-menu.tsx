"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Profiel-icoon rechtsboven in de header: ingang naar bedrijfsgegevens en
 * accountinstellingen. Zelfde open/sluit-patroon als InfoHint (klik erbuiten
 * of Escape sluit 'm), en dezelfde 44px-tikdoel voor mobiel.
 */
export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

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
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account-menu"
        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 20c1.6-3.6 4.8-5.5 8-5.5s6.4 1.9 8 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-12 z-20 flex w-56 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-lg"
        >
          <Link
            href="/profielen"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="px-4 py-3 text-sm transition-colors hover:bg-[var(--bg-surface-2)]"
          >
            Mijn bedrijfsgegevens
          </Link>
          <Link
            href="/instellingen"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="px-4 py-3 text-sm transition-colors hover:bg-[var(--bg-surface-2)]"
          >
            Mijn instellingen
          </Link>
        </div>
      )}
    </div>
  );
}
