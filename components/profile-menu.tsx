"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { ThemeMenuItem } from "@/components/theme-toggle";

/**
 * Het uitklapmenu van het profiel.
 *
 * ── ONDERAAN DE ZIJBALK (29 september 2026) ─────────────────────────────────
 *
 * Op desktop staat het profiel niet meer rechtsboven maar als laatste regel van
 * de zijbalk (`plek="zijbalk"`): icoon plus voornaam, of het e-mailadres als er
 * geen naam bekend is, met het menu naar boven open. Het menu telt nu vijf
 * dingen: Mijn account, de weergave (licht of donker), Support en Uitloggen. De
 * themaschakelaar en het Support-icoon zijn daarvoor uit de bovenbalk gehaald.
 * Op een telefoon zit het profiel sinds 30 september 2026 in het schermvullende
 * menu (`components/mobiel-menu.tsx`); `plek="topbalk"` wordt nergens meer gebruikt.
 *
 * Hieronder de geschiedenis van het menu zoals het rechtsboven stond.
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
 * vlak (`.menu-surface`, `--shadow-lg`), gesloten door een klik erbuiten of Escape, en
 * uitsluitend de kleurtokens uit `designsystem.md` §A/§B, zodat licht en
 * donker vanzelf goed staan.
 */
export function ProfileMenu({
  naam,
  email,
  signOutAction,
  plek = "topbalk",
}: {
  /** Voornaam als die bekend is, anders het e-mailadres (`lib/weergavenaam.ts`). */
  naam: string;
  email: string;
  signOutAction: () => void | Promise<void>;
  /** `zijbalk`: brede knop onderaan met het menu naar boven. `topbalk`: alleen
   *  het icoon, met het menu naar beneden (telefoon). */
  plek?: "zijbalk" | "topbalk";
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const inZijbalk = plek === "zijbalk";

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
      {inZijbalk ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Profielmenu openen"
          aria-haspopup="menu"
          aria-expanded={open}
          className="nav-item w-full"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon naam="profiel" size={16} />
            <span className="truncate">{naam}</span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu openen"
          aria-haspopup="menu"
          aria-expanded={open}
          className="icon-btn"
        >
          <Icon naam="profiel" size={18} />
        </button>
      )}

      {open && (
        <div
          role="menu"
          aria-label="Menu"
          className={`menu-surface absolute z-40 overflow-hidden ${
            inZijbalk ? "bottom-full left-0 mb-1 w-full min-w-56" : "right-0 mt-1 w-56"
          }`}
        >
          <div className="menu-sectie">
            <span className="block truncate text-sm text-secondary">{email}</span>
          </div>

          <span className="menu-scheiding" aria-hidden />
          <div>
            <Link
              href="/instellingen"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="menu-item"
            >
              <Icon naam="profiel" size={16} />
              Mijn account
            </Link>
            <ThemeMenuItem />
            <Link
              href="/support"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="menu-item"
            >
              <Icon naam="help" size={16} />
              Support
            </Link>
          </div>

          <span className="menu-scheiding" aria-hidden />
          <div>
            <form action={signOutAction}>
              <button type="submit" role="menuitem" className="menu-item">
                <Icon naam="uitloggen" size={16} />
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
