"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import type { IcoonNaam } from "@/lib/icons";

/**
 * Een knop "Meer" met een menu, voor handelingen die er moeten zijn maar
 * zelden gebruikt worden.
 *
 * ── WAAROM DIT BESTAAT (1 OKTOBER 2026) ─────────────────────────────────────
 *
 * Op het contentplan stonden "Eerdere voorstellen" en "Download CSV" als twee
 * omlijnde knoppen naast de paginakop, even zwaar als een echte handeling, op
 * een scherm waar de klant vooral komt kijken wat er deze maand gebeurt. Wat je
 * af en toe nodig hebt, hoort bereikbaar te zijn en niet in beeld te staan.
 *
 * Een regel is een link (`href`) of een download (`download`); een handeling
 * die iets verandert hoort niet in dit menu, die verdient een eigen knop.
 */
export interface MeerRegel {
  label: string;
  href: string;
  icoon?: IcoonNaam;
  /** Een bestand ophalen in plaats van naar een scherm gaan. */
  download?: boolean;
}

export function MeerMenu({ regels, label = "Meer" }: { regels: MeerRegel[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const wikkel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function buiten(e: MouseEvent) {
      if (!wikkel.current?.contains(e.target as Node)) setOpen(false);
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
    };
  }, [open]);

  if (regels.length === 0) return null;

  return (
    <div className="relative" ref={wikkel}>
      <button
        type="button"
        className="btn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <Icon naam="openen" size={16} />
      </button>
      {open && (
        <div role="menu" className="menu-surface absolute right-0 top-full z-30 mt-1 w-64 text-left">
          {regels.map((r) =>
            r.download ? (
              <a key={r.href} href={r.href} role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
                {r.icoon && <Icon naam={r.icoon} size={16} />}
                {r.label}
              </a>
            ) : (
              <Link key={r.href} href={r.href} role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
                {r.icoon && <Icon naam={r.icoon} size={16} />}
                {r.label}
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
