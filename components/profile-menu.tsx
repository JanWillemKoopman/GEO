"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

/**
 * Het uitklapmenu achter het profiel-icoon, rechtsboven, op élk schermformaat.
 *
 * ── WAAROM DIT GEEN FULL-SCREEN SHEET MEER IS (25 augustus 2026) ────────────
 *
 * Hier stond een full-screen sheet naar het voorbeeld van InSpace's mobiele
 * "Pick your orbit"-menu: een paneel dat het hele scherm vulde, met een
 * genummerde navigatielijst erin. Die lijst droeg intussen nog maar één
 * bestemming (`ACCOUNT_NAV` had alleen "Mijn instellingen"), want de rest van
 * de app-navigatie zit al in de zijbalk. Een schermvullend paneel voor één
 * link is zwaarder dan wat het opent, en de opdrachtgever vroeg om precies dit
 * te vervangen door een klein uitklapmenu, zoals de taalkiezer van InSpace: een
 * afgeronde kaart onder het icoon, met korte rijen erin.
 *
 * Het menu telt nu twee rijen: "Mijn account" (naar `/instellingen`) en
 * "Uitloggen". Verder gaat er niets meer achter dit icoon schuil: de
 * hoofdnavigatie hoort in de zijbalk en niet in een tweede menu ernaast, dat
 * was al de reden waarom `NAV` en later `ACCOUNT_NAV` uit `lib/nav.ts`
 * verdwenen (zie de aantekening daar).
 *
 * Vormgeving volgt hetzelfde patroon als `components/brand-switcher.tsx`: een
 * kaart met `--shadow-overlay`, gesloten door een klik erbuiten of Escape, en
 * uitsluitend de kleurtokens uit `designsystem.md` §A/§B, zodat licht en
 * donker vanzelf goed staan.
 */
export function ProfileMenu({
  email,
  signOutAction,
}: {
  email: string;
  signOutAction: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function omlaag(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", omlaag);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", omlaag);
      document.removeEventListener("keydown", toets);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu openen"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
      >
        <Icon naam="profiel" size={20} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menu"
          className="menu-surface absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)]"
          style={{ boxShadow: "var(--shadow-overlay)" }}
        >
          <div className="border-b border-[var(--border-subtle)] px-3 py-2">
            <span className="block truncate text-sm text-secondary">{email}</span>
          </div>

          <div className="p-1">
            <Link
              href="/instellingen"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--wash-hover)]"
            >
              Mijn account
            </Link>
          </div>

          <div className="border-t border-[var(--border-subtle)] p-1">
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="block w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--wash-hover)]"
              >
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
