"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { MeerBlad } from "@/components/meer-blad";
import type { NavItem } from "@/lib/nav";
import type { IcoonNaam } from "@/lib/icons";
import type { BrandOption } from "@/lib/workspace";

/**
 * De onderbalk: de navigatie van een telefoon. Vervangt de zijbalk volledig,
 * niet een verkleinde versie ervan.
 *
 * ── WAAROM VIJF EN NIET MEER ────────────────────────────────────────────────
 *
 * `redesign2026.md` §8.12.4, GEMETEN als OKX' eigen patroon: vijf posities,
 * de laatste altijd "Meer". Vier bestemmingen zijn dus een keuze en geen
 * technische grens: dit zijn de vier waarvan een klant het langst op zijn
 * telefoon zit (`docs/ux-design.md` §1 voor de brede versie van diezelfde
 * afweging), de rest staat achter "Meer" in `MeerBlad`.
 *
 * ── WAAROM DE SET VERSCHUIFT MET HET PAD EN NIET MET DE ROL ─────────────────
 *
 * Een salesmedewerker kan ook een merk bekijken (staff ziet alles), en dan is
 * "waar sta ik nu" een betere leidraad dan "wat ben ik meestal". Vandaar
 * `pathname.startsWith("/sales")` in plaats van een vast `sales`-onderscheid:
 * de balk volgt waar je bent, precies zoals de zijbalk dat met `navActief`
 * ook al deed.
 */
export function BottomNav({
  activeBrand,
  brands,
  sales,
  previewToggle,
  openVragen,
  alles,
  onSelectBrand,
  signOutAction,
}: {
  activeBrand: BrandOption | null;
  brands: BrandOption[];
  sales: boolean;
  previewToggle?: React.ReactNode;
  openVragen: number;
  /** De volledige, platte navigatielijst. `WorkspaceChrome` berekent hem één
   *  keer, want `MobileTopbar` heeft hem voor zijn titel net zo hard nodig en
   *  twee kopieën van dezelfde lijst lopen op termijn uit elkaar. */
  alles: NavItem[];
  onSelectBrand: (brandId: string) => void;
  signOutAction: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const [meerOpen, setMeerOpen] = useState(false);

  const inSalesContext = sales && pathname.startsWith("/sales");

  type Positie = { href: string; label: string; icoon: IcoonNaam };

  // ⚠️ De labels hier zijn KORTER dan in de zijbalk ("Zichtbaar" niet
  // "Zichtbaarheid in AI"): een kolom van een vijfde balkbreedte met 10px
  // tekst breekt af bij het volledige woord. Dezelfde bestemming, een ander
  // label voor een andere ruimte; de href is wat telt voor `aria-current`.
  const primair: Positie[] = inSalesContext
    ? [
        { href: "/sales", label: "Overzicht", icoon: "sales" },
        { href: "/sales/markten", label: "Markten", icoon: "markten" },
        { href: "/sales/prospects", label: "Bedrijven", icoon: "bedrijven" },
        { href: "/sales/outreach", label: "Verstuurd", icoon: "verstuurd" },
      ]
    : activeBrand
      ? [
          { href: `/merk/${activeBrand.id}`, label: "Overzicht", icoon: "overzicht" },
          { href: `/merk/${activeBrand.id}/analytics`, label: "Zichtbaar", icoon: "analytics" },
          { href: `/merk/${activeBrand.id}/strategie/plan`, label: "Plan", icoon: "plannen" },
          { href: `/merk/${activeBrand.id}/strategie/vragen`, label: "Vragen", icoon: "feit" },
        ]
      : // Geen actief merk: dezelfde reden als op de desktop-zijbalk (zie het
        // antwoord in de sessie van 17 september 2026 over de lege zijbalk).
        // Eén zinnige bestemming is beter dan vier lege posities.
        [{ href: "/merk", label: "Merken", icoon: "overzicht" }];

  return (
    <>
      <nav className="onderbalk no-print" aria-label="Hoofdnavigatie">
        {primair.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="onderbalk-item"
            aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
          >
            <Icon naam={item.icoon} size={24} />
            <span className="onderbalk-item-label">{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="onderbalk-item"
          onClick={() => setMeerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={meerOpen}
        >
          <Icon naam="meer" size={24} />
          <span className="onderbalk-item-label">Meer</span>
          {/* Hetzelfde bolletje als in de desktop-bovenbalk: er wachten vragen,
              en "Vragen" staat mogelijk al in de primaire vier, maar niet
              wanneer je in de Sales-context zit. Dan is dit de enige plek waar
              dat nog zichtbaar is. */}
          {openVragen > 0 && !primair.some((p) => p.href.endsWith("/strategie/vragen")) && (
            <span className="vraag-dot onderbalk-item-badge" aria-hidden />
          )}
        </button>
      </nav>

      <MeerBlad
        open={meerOpen}
        onSluit={() => setMeerOpen(false)}
        alles={alles}
        primaireHrefs={primair.map((p) => p.href)}
        brands={brands}
        activeBrand={activeBrand}
        onSelectBrand={onSelectBrand}
        signOutAction={signOutAction}
        previewToggle={previewToggle}
      />
    </>
  );
}
