"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { BrandSwitcher } from "@/components/brand-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useNotificatiePaneel } from "@/components/notificatie-paneel";
import { hoofdstukken, navActief, type NavItem } from "@/lib/nav";
import type { BrandOption } from "@/lib/workspace";

/**
 * Het menu van een telefoon: een hamburgerknop rechtsboven die een
 * schermvullend paneel van rechts laat inschuiven (30 september 2026).
 *
 * ── WAT HET VERVANGT ────────────────────────────────────────────────────────
 *
 * Tot deze datum had een telefoon een onderbalk met vaste posities plus "Meer"
 * (`BottomNav` en `MeerBlad`), een terugknop linksboven en het belletje en het
 * profiel los in de bovenbalk. Op verzoek van de eigenaar zit alles nu achter
 * één knop: de onderbalk kostte 56 pixels van elk scherm, en een klant zonder
 * actief merk zag er één knop in ("Merken") naast "Meer". De terugknop deed
 * hetzelfde als die van de browser.
 *
 * ── WAT ER IN STAAT ─────────────────────────────────────────────────────────
 *
 * Van boven naar beneden: de merkkiezer, precies dezelfde hoofdstukken als de
 * zijbalk op desktop (`hoofdstukken()` uit `lib/nav.ts`, één bron, dus de twee
 * kunnen nooit uit elkaar lopen), en onderaan wat op desktop bij het belletje
 * en het profiel hoort: notificaties, Mijn account, Support, de weergave en
 * uitloggen.
 *
 * ── DE BEWEGING ─────────────────────────────────────────────────────────────
 *
 * Het paneel blijft altijd in de DOM en schuift met een CSS-overgang, zodat
 * sluiten net zo vloeiend gaat als openen (een `{open && ...}` kan niet
 * uitschuiven, want dan is het al weg). De drie strepen van de knop draaien
 * tot een kruis, de pagina eronder wijkt iets naar links en krimpt, en de
 * regels komen één voor één binnen. Alles staat in `.mobiel-menu` in
 * globals.css, en `prefers-reduced-motion` zet het uit.
 */
export function MobielMenu({
  alles,
  brands,
  activeBrand,
  onSelectBrand,
  signOutAction,
  previewToggle,
  logo,
  naam,
  email,
  openVragen,
}: {
  /** De volledige, platte navigatielijst: brandNav plus generalNav. */
  alles: NavItem[];
  brands: BrandOption[];
  activeBrand: BrandOption | null;
  onSelectBrand: (brandId: string) => void;
  signOutAction: () => void | Promise<void>;
  /** De wissel tussen Admin en Klant, `null` voor wie dat recht niet heeft. */
  previewToggle?: React.ReactNode;
  /** Het woordmerk, linksboven in het geopende menu. */
  logo: React.ReactNode;
  /** Voornaam als die bekend is, anders het e-mailadres. */
  naam: string;
  email: string;
  /** Hoeveel vragen er open staan: voedt het stipje op de knop. */
  openVragen: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const paneel = useRef<HTMLDivElement>(null);
  const { openen: notificatiesOpenen, ongelezen } = useNotificatiePaneel();

  // Een klik op een bestemming sluit het menu al; dit vangt de andere wegen
  // naar een nieuwe pagina (de terugknop van de browser, een melding).
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    paneel.current?.focus();
    // Het midden van wat er nu in beeld is: daar omheen krimpt de pagina.
    document.documentElement.style.setProperty(
      "--menu-oorsprong",
      `${window.scrollY + window.innerHeight / 2}px`,
    );
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", toets);
    // De pagina eronder mag niet meescrollen terwijl je door het menu veegt.
    const vorige = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", toets);
      document.body.style.overflow = vorige;
    };
  }, [open]);

  const sluit = () => setOpen(false);
  const koppen = hoofdstukken(alles);
  // Er wacht iets op je: dan draagt de knop een stipje, want zonder onderbalk
  // en zonder belletje in beeld is dat de enige plek waar je het kunt zien.
  const wacht = ongelezen > 0 || openVragen > 0;

  // Elke regel krijgt een volgnummer voor de trapsgewijze binnenkomst. Na
  // twaalf regels stopt de vertraging met oplopen: verder naar beneden zie je
  // ze bij het openen toch niet.
  let volgnummer = 0;
  const trap = () => ({ "--i": Math.min(volgnummer++, 12) }) as React.CSSProperties;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hamburger no-print"
        data-open={open ? "" : undefined}
        aria-label={open ? "Menu sluiten" : wacht ? "Menu openen, er wacht iets op je" : "Menu openen"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobiel-menu"
      >
        <span className="hamburger-streep" aria-hidden />
        <span className="hamburger-streep" aria-hidden />
        <span className="hamburger-streep" aria-hidden />
        {wacht && !open && <span className="vraag-dot hamburger-stip" aria-hidden />}
      </button>

      <div
        id="mobiel-menu"
        ref={paneel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className="mobiel-menu no-print"
        data-open={open ? "" : undefined}
        inert={!open}
      >
        <div className="mobiel-menu-kop">{logo}</div>

        <div className="mobiel-menu-inhoud">
          {brands.length > 0 && (
            <div className="mobiel-menu-merk mobiel-menu-rij" style={trap()}>
              <BrandSwitcher
                brands={brands}
                active={activeBrand}
                onSelect={(id) => {
                  onSelectBrand(id);
                  sluit();
                }}
              />
              {previewToggle}
            </div>
          )}

          <nav aria-label="Hoofdmenu" className="flex flex-col gap-5">
            {koppen.map((kop) => (
              <div key={kop.naam} className="flex flex-col">
                <span className="nav-kop mobiel-menu-rij" style={trap()}>
                  <span className="min-w-0 flex-1 truncate">{kop.naam}</span>
                  {kop.afgeschermd && (
                    <span className="chip chip-outline shrink-0 normal-case tracking-normal">alleen jij</span>
                  )}
                </span>
                {kop.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={sluit}
                    className="mobiel-menu-item mobiel-menu-rij"
                    style={trap()}
                    aria-current={navActief(pathname, item) ? "page" : undefined}
                  >
                    <Icon naam={item.icoon} size={20} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          {/* Wat op desktop achter het belletje en het profiel zit. */}
          <div className="mobiel-menu-jij">
            <button
              type="button"
              className="mobiel-menu-item mobiel-menu-rij"
              style={trap()}
              onClick={() => {
                sluit();
                notificatiesOpenen();
              }}
            >
              <Icon naam="notificaties" size={20} />
              <span className="flex-1 truncate text-left">Notificaties</span>
              {ongelezen > 0 && (
                <span className="notificatie-teller" aria-label={`${ongelezen} nieuw`}>
                  {ongelezen > 9 ? "9+" : ongelezen}
                </span>
              )}
            </button>

            <div className="mobiel-menu-profiel mobiel-menu-rij" style={trap()}>
              <span className="mobiel-menu-profiel-icoon" aria-hidden>
                <Icon naam="profiel" size={20} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-primary">{naam}</span>
                {email !== naam && <span className="truncate text-sm text-secondary">{email}</span>}
              </span>
            </div>

            <Link
              href="/instellingen"
              onClick={sluit}
              className="mobiel-menu-item mobiel-menu-rij"
              style={trap()}
              aria-current={pathname === "/instellingen" ? "page" : undefined}
            >
              <Icon naam="profiel" size={20} />
              <span className="truncate">Mijn account</span>
            </Link>
            <Link
              href="/support"
              onClick={sluit}
              className="mobiel-menu-item mobiel-menu-rij"
              style={trap()}
              aria-current={pathname === "/support" ? "page" : undefined}
            >
              <Icon naam="help" size={20} />
              <span className="truncate">Support</span>
            </Link>
            <div className="mobiel-menu-item mobiel-menu-rij justify-between" style={trap()}>
              <span>Weergave</span>
              <ThemeToggle />
            </div>
            {/* `w-full`: de knop staat in een `<form>`, een blokelement en geen
                flex-ouder, dus hij krijgt de breedte van de regels erboven niet
                vanzelf mee. */}
            <form action={signOutAction} className="mobiel-menu-rij" style={trap()}>
              <button type="submit" className="mobiel-menu-item w-full">
                <Icon naam="uitloggen" size={20} />
                <span>Uitloggen</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
