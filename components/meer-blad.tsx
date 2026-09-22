"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { Drawer } from "@/components/drawer";
import { BrandSwitcher } from "@/components/brand-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { hoofdstukken, navActief, type NavItem } from "@/lib/nav";
import type { BrandOption } from "@/lib/workspace";

/**
 * Het blad achter "Meer" op de onderbalk: de rest van de navigatie.
 *
 * ── WAAROM DIT `Drawer` HERGEBRUIKT EN NIET EEN EIGEN OVERLAY ──────────────
 *
 * Een blad van onderen is een blad van onderen, of het nu de details van één
 * rij draagt (`components/drawer.tsx`, gebouwd in stap 3) of de rest van de
 * navigatie. Dezelfde sleepgreep, dezelfde animatie, dezelfde
 * toetsenbordafhandeling. Twee keer dezelfde overlay bouwen is precies het
 * soort herhaling waar `docs/designsystem.md` §8 regel 1 voor bedoeld is.
 *
 * ── WAT ER WEL EIGEN IS AAN DEZE INHOUD ─────────────────────────────────────
 *
 * De merkkiezer, de standwissel en uitloggen staan alleen hier: op de
 * desktop staan ze los in de bovenbalk, maar die bovenbalk bestaat op een
 * telefoon niet meer (`.topbar-mobiel` heeft geen ruimte voor vier knoppen).
 * Ze verhuizen dus mee naar de enige plek die overblijft.
 */
export function MeerBlad({
  open,
  onSluit,
  alles,
  primaireHrefs,
  brands,
  activeBrand,
  onSelectBrand,
  signOutAction,
  previewToggle,
}: {
  open: boolean;
  onSluit: () => void;
  /** De volledige, platte navigatielijst: brandNav + generalNav + salesNav. */
  alles: NavItem[];
  /** De hrefs die al op de onderbalk staan, dus hier verborgen: geen bestemming twee keer. */
  primaireHrefs: string[];
  brands: BrandOption[];
  activeBrand: BrandOption | null;
  onSelectBrand: (brandId: string) => void;
  signOutAction: () => void | Promise<void>;
  /** De wisselknop naar de klantweergave. `null` voor wie dat recht niet heeft.
   *  Zelfde component als in de desktop-bovenbalk, alleen hier neergezet: op
   *  een telefoon is er geen tweede plek voor. */
  previewToggle?: React.ReactNode;
}) {
  const pathname = usePathname();

  const koppen = hoofdstukken(alles)
    .map((kop) => ({ ...kop, items: kop.items.filter((i) => !primaireHrefs.includes(i.href)) }))
    .filter((kop) => kop.items.length > 0);

  return (
    <Drawer open={open} titel="Navigatie" onSluit={onSluit}>
      <div className="flex flex-col gap-6">
        {/* Eén merk is geen keuze: `BrandSwitcher` toont dan de naam als platte
            tekst en geen knop, zie de toelichting daar. */}
        {brands.length > 0 && (
          <div className="meer-blad-merk">
            <BrandSwitcher
              brands={brands}
              active={activeBrand}
              onSelect={(id) => {
                onSelectBrand(id);
                onSluit();
              }}
            />
            {previewToggle}
          </div>
        )}

        {/* Wat op de desktop los in de bovenbalk staat en op een telefoon geen
            eigen plek meer heeft: uitleg. Geen `.nav-kop` erboven, want dit
            hoort bij geen enkel hoofdstuk; wel een rand eronder zodat het zich
            niet vermengt met de echte navigatie. */}
        <div className="flex flex-col gap-1 border-b border-[var(--line-muted)] pb-5">
          <Link
            href="/support"
            onClick={onSluit}
            className="nav-item nav-item-lg"
            aria-current={pathname === "/support" ? "page" : undefined}
          >
            Uitleg en hulp
          </Link>
        </div>

        {koppen.map((kop) => (
          <div key={kop.naam} className="flex flex-col gap-1">
            <span className="nav-kop">
              <Icon naam={kop.icoon} size={16} />
              {kop.naam}
            </span>
            {kop.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onSluit}
                className="nav-item nav-item-lg"
                aria-current={navActief(pathname, item) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}

        <div className="flex flex-col gap-1 border-t border-[var(--line-muted)] pt-4">
          <div className="nav-item nav-item-lg">
            Weergave
            <ThemeToggle />
          </div>
          {/* `w-full`: de knop staat in een `<form>`, een blokelement en geen
              flex-ouder, dus hij krijgt de stretch-breedte van de Links
              hierboven niet vanzelf mee. */}
          <form action={signOutAction}>
            <button type="submit" className="nav-item nav-item-lg w-full text-left">
              Uitloggen
            </button>
          </form>
        </div>
      </div>
    </Drawer>
  );
}
