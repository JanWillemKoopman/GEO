"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/drawer";
import { Icon } from "@/components/icon";
import { Sidebar } from "@/components/sidebar";
import type { BrandOption } from "@/lib/workspace";

/**
 * De zijbalk als lade, voor een scherm smaller dan 1024 pixels dat geen
 * telefoon is (UX-audit 23 september 2026, P0.1).
 *
 * ── WAT HIER MIS WAS ────────────────────────────────────────────────────────
 *
 * De zijbalk verschijnt pas vanaf 1024 pixels (`lg:block`), en de onderbalk
 * alleen als de server op de useragent een telefoon herkent (`lib/apparaat.ts`).
 * Een iPad, of een laptopvenster op de helft van het scherm, viel tussen die
 * twee in en kreeg geen enkele weg naar Clusters, Contentplan of Analytics.
 * Wie daar landde, zat vast op de pagina waar hij was.
 *
 * Dit is dezelfde `Sidebar` in een lade, geen tweede menu: één bron voor de
 * navigatie (`lib/nav.ts`), dus de lade kan nooit een ander menu tonen dan de
 * balk. De knop staat vanaf 1024 pixels uit, want dan staat de balk er zelf.
 */
export function NavLade({
  activeBrand,
  staff,
  sales,
  openVragen,
}: {
  activeBrand: BrandOption | null;
  staff: boolean;
  sales: boolean;
  openVragen: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Een klik op een bestemming sluit de lade al via `onMobileClose`; dit vangt
  // de andere wegen naar een nieuwe pagina (terugknop van de browser).
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="icon-btn lg:hidden"
        aria-label="Menu openen"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Icon naam="menu" size={18} />
      </button>
      <Drawer open={open} titel="Menu" kant="links" onSluit={() => setOpen(false)}>
        <Sidebar
          activeBrand={activeBrand}
          staff={staff}
          sales={sales}
          openVragen={openVragen}
          onMobileClose={() => setOpen(false)}
        />
      </Drawer>
    </>
  );
}
