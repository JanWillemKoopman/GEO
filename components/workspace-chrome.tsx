"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { BrandSwitcher } from "@/components/brand-switcher";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { MobileTopbar } from "@/components/mobile-topbar";
import { brandNav, generalNav, salesNav, titelVoorPad, type NavItem } from "@/lib/nav";
import type { BrandOption } from "@/lib/workspace";

/**
 * Het interactieve deel van de shell: de zijbalk, de mobiele lade en de kiezer.
 *
 * Apart van `AppShell` zodat die een servercomponent kan blijven. De
 * merkenlijst gaat wél naar de client (de kiezer moet erin kunnen zoeken), maar
 * de rest van de shell niet.
 *
 * ── DE MOBIELE INDELING IS SINDS 17 SEPTEMBER 2026 EEN ANDER SCHERM ─────────
 *
 * Tot stap 6 van de redesign was dit een lade achter een hamburgerknop: dezelfde
 * zijbalk, alleen verborgen tot je hem opende. `redesign2026.md` §8.12 zegt
 * met zoveel woorden dat dat een geschaalde desktopervaring is en geen eigen
 * mobiel ontwerp: `telefoon` (van `isTelefoon()` in `AppShell`, bepaald in de
 * middleware van stap 5) schakelt nu tussen twee VOLLEDIG andere opbouwen,
 * `BottomNav`/`MobileTopbar` tegenover `Sidebar`/`.topbar`, niet tussen twee
 * groottes van dezelfde opbouw.
 *
 * De hamburgerlade van vóór stap 6 blijft bestaan, maar dient nu een ander
 * doel: het vangnet uit §8.12.6 voor als de server zich vergist (een tablet
 * die zich voordoet als telefoon, een browservenster dat smaller wordt
 * gemaakt terwijl de server "computer" besliste). `lg:hidden` blijft op de
 * desktoptak staan, `telefoon` beslist welke van de twee takken er ÜBERHAUPT
 * rendert.
 */
export function WorkspaceChrome({
  brands,
  activeBrand,
  staff,
  sales,
  solliciteren,
  openVragen,
  telefoon,
  onSelectBrand,
  signOutAction,
  logo,
  openQuestions,
  previewToggle,
  accountMenu,
  children,
}: {
  brands: BrandOption[];
  activeBrand: BrandOption | null;
  /** Beheerder? Dan komt het CSM-paneel in de zijbalk (fase 8). */
  staff: boolean;
  /** Salesmedewerker? Dan komt de Sales-sectie in de zijbalk (plan §4.1). */
  sales: boolean;
  /** Mag deze persoon in het zijproject? Dan komt de S in de bovenbalk. */
  solliciteren: boolean;
  /** Hoeveel vragen er open staan. Zet het bolletje in de zijbalk aan. */
  openVragen: number;
  /** `isTelefoon()`, bepaald op de server (`lib/apparaat.ts`, stap 5). Beslist
   *  welke van de twee volledig verschillende opbouwen rendert. */
  telefoon: boolean;
  onSelectBrand: (brandId: string) => void;
  /** De server action achter "Uitloggen". Op desktop zit hij al verwerkt in
   *  `accountMenu`; het "Meer"-blad heeft de kale functie nodig om zijn eigen
   *  rij te bouwen. */
  signOutAction: () => void | Promise<void>;
  logo: React.ReactNode;
  /** De teller "3 openstaande vragen". Leeg zodra er niets open staat. */
  openQuestions?: React.ReactNode;
  /** De wisselknop naar de klantweergave, `null` voor wie dat recht niet heeft. */
  previewToggle?: React.ReactNode;
  accountMenu: React.ReactNode;
  children: React.ReactNode;
}) {
  const [ladeOpen, setLadeOpen] = useState(false);
  const pathname = usePathname();

  // Eén berekening voor de hele mobiele tak: `BottomNav` (de vier primaire
  // posities plus "Meer") en `MobileTopbar` (de titel) hebben hem allebei
  // nodig, en twee kopieën van dezelfde lijst lopen op termijn uit elkaar.
  // Kost niets op desktop: `telefoon` is dan `false` en dit stuk JSX rendert
  // nooit, maar de berekening zelf is goedkoop genoeg (platte array-opbouw)
  // om hem niet achter een voorwaarde te verstoppen en de hooks-volgorde
  // daarmee op het spel te zetten.
  const alles: NavItem[] = [
    ...(activeBrand ? brandNav(activeBrand.id, staff) : []),
    ...generalNav(staff),
    ...salesNav(sales),
  ];
  const titel = telefoon ? (titelVoorPad(pathname, alles) ?? activeBrand?.name ?? "ORBIT ENGINE") : "";

  if (telefoon) {
    return (
      <div className="flex min-h-dvh flex-col">
        <MobileTopbar titel={titel} actie={accountMenu} />

        {/* 56px onderbalk plus zijn veilige zone: de inhoud moet daar nooit
            onder verdwijnen. `.stand` regelt zijn eigen zijmarge en bovenmarge
            al; deze wikkel voegt alleen de ondermarge toe die uniek is voor de
            mobiele tak. */}
        <main className="min-w-0 flex-1 pb-[calc(56px+env(safe-area-inset-bottom)+16px)]">
          <div className="stand">{children}</div>
        </main>

        <BottomNav
          activeBrand={activeBrand}
          brands={brands}
          sales={sales}
          solliciteren={solliciteren}
          previewToggle={previewToggle}
          openVragen={openVragen}
          alles={alles}
          onSelectBrand={onSelectBrand}
          signOutAction={signOutAction}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* De vorm staat in `.topbar` in globals.css: 48 pixels, dekkend, één rand
          eronder. De hoogte staat daar vast op --header-h en volgt niet uit de
          inhoud, want de hoofdstuktabs van een cluster plakken er met
          `top: var(--header-h)` exact onder. Lopen die twee uit elkaar, dan
          ontstaat er een kier waar de pagina-inhoud doorheen schuift. */}
      <header className="topbar no-print">
        <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setLadeOpen(true)}
              className="icon-btn -ml-1 lg:hidden"
              aria-label="Menu openen"
            >
              <Icon naam="menu" size={18} />
            </button>
            {logo}
            <span className="hidden text-muted sm:inline" aria-hidden>
              /
            </span>
            <BrandSwitcher
              brands={brands}
              active={activeBrand}
              onSelect={onSelectBrand}
            />
          </div>

          {/* De themaschakelaar staat links van het accountmenu: allebei gaan ze
              over jou en niet over dit merk, en het accountmenu blijft de
              buitenste plek omdat daar het uitloggen achter zit. De
              wisselknop staat er nog eens links van, want die gaat over wie je
              nu bent en niet over hoe het scherm eruitziet.

              ── HET HULP-ICOON (support-sectie) ─────────────────────────────
              Rechts van de wisselknop en links van de themaschakelaar: dit
              gaat, net als die twee, over jou en niet over dit merk. Een
              gewone link en geen uitklapmenu, want de bestemming is één vaste
              pagina en geen keuze. */}
          <div className="flex shrink-0 items-center gap-1">
            {openQuestions}
            {previewToggle}
            {/* ── DE S: het zijproject "Solliciteren" (14 september 2026) ─────
                Een eigen app van één pagina in dezelfde codebase, met een eigen
                opmaak en een eigen layout: `app/solliciteren/`. Hij staat in
                deze groep omdat hij, net als het hulp-icoon en de
                themaschakelaar, over jou gaat en niet over dit merk, en hij
                staat het verst naar links van de vier omdat hij de app
                verlaat.

                ⚠️ Alleen voor een account van ORBIT ENGINE zelf. Een klant
                hoort geen knop te zien naar iets dat niet van hem is; de
                pagina zelf controleert hetzelfde recht nog een keer, want een
                verborgen knop is geen slot. */}
            {solliciteren && (
              <Link
                href="/solliciteren"
                aria-label="Solliciteren, zijproject"
                title="Solliciteren"
                className="icon-btn font-medium"
              >
                S
              </Link>
            )}
            <Link
              href="/support"
              aria-label="Support: hoe ORBIT ENGINE werkt"
              className="icon-btn"
            >
              <Icon naam="help" size={18} />
            </Link>
            <ThemeToggle />
            {accountMenu}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Vaste zijbalk vanaf lg. Sticky onder de bovenbalk, met een eigen
            scrollbaan zodat een lange merknaam de pagina niet meeneemt. */}
        <aside className="no-print sticky top-[var(--header-h)] hidden h-[calc(100dvh-var(--header-h))] shrink-0 self-start overflow-y-auto border-r border-[var(--line-muted)] lg:block">
          <Sidebar activeBrand={activeBrand} staff={staff} sales={sales} openVragen={openVragen} />
        </aside>

        {/* `min-w-0` is hier geen sier: dit is een flex-kind, en zonder deze
            regel zet één lange URL diep in een kaart de minimale breedte van de
            hele kolom. Zie het blok "Niets is breder dan het scherm" in
            globals.css.

            ── DE DRIE STANDEN (17 SEPTEMBER 2026) ────────────────────────────

            De inhoud stond hier op `max-w-5xl`, dus 1024 pixels, op élk scherm.
            Dat is de kern van wat er aan de desktopervaring schortte: een tabel
            met twaalf kolommen werd in 1024 pixels geperst terwijl het scherm
            2560 breed was.

            `.stand` doet nu 1440 als standaard, en een pagina die breder of
            smaller moet zetten dat zelf met een marker in zijn eigen inhoud
            (`.wil-data`, `.wil-lezen`). De wikkel leest die met `:has()`. Het
            waarom van die constructie staat bij `.stand` in globals.css.

            De grond is `--bg-base` en niet meer `--bg-muted`. Sinds stap 1 zijn
            de pagina en de kaart twee verschillende kleuren (`#f6f6f6` onder
            `#ffffff` in licht, `#000000` onder `#171717` in donker), dus het
            kunstgreepje om de werkruimte grijzer te maken dan de rest is niet
            meer nodig. Het stippenpatroon dat hier lag is in stap 1 al weg. */}
        <main className="workspace-canvas min-w-0 flex-1">
          <div className="stand">{children}</div>
        </main>
      </div>

      {/* De mobiele lade. */}
      {ladeOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--bg-scrim)]"
            aria-label="Menu sluiten"
            onClick={() => setLadeOpen(false)}
          />
          {/* 280 pixels, GEMETEN als de mobiele ladebreedte in het plan (§8.12.3).
              Was 288. De kop is even hoog als de bovenbalk zodat de lade er
              niet naast lijkt te staan. */}
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto border-r border-[var(--border-primary)] bg-[var(--bg-surface)]">
            <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-[var(--line-muted)] px-4">
              <span className="mono-label">Navigatie</span>
              <button
                type="button"
                onClick={() => setLadeOpen(false)}
                className="icon-btn -mr-1"
                aria-label="Menu sluiten"
              >
                <Icon naam="sluiten" size={18} />
              </button>
            </div>
            <Sidebar
              staff={staff}
              sales={sales}
              activeBrand={activeBrand}
              openVragen={openVragen}
              onMobileClose={() => setLadeOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
