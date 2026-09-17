"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { BrandSwitcher } from "@/components/brand-switcher";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import type { BrandOption } from "@/lib/workspace";

/**
 * Het interactieve deel van de shell: de zijbalk, de mobiele lade en de kiezer.
 *
 * Apart van `AppShell` zodat die een servercomponent kan blijven. De
 * merkenlijst gaat wél naar de client (de kiezer moet erin kunnen zoeken), maar
 * de rest van de shell niet.
 *
 * ── DE MOBIELE INDELING IS EEN ANDERE INDELING ──────────────────────────────
 *
 * `docs/ux-design.md` §7: mobiel is geen verkleinde desktop. De zijbalk wordt
 * daar een lade achter een knop, en de merkkiezer verhuist naar de bovenbalk,
 * want dat is op een telefoon de enige plek die altijd zichtbaar is. De lade
 * sluit zichzelf zodra je iets kiest; een menu dat open blijft staan na een
 * keuze laat je twee keer tikken voor één handeling.
 */
export function WorkspaceChrome({
  brands,
  activeBrand,
  staff,
  sales,
  solliciteren,
  openVragen,
  onSelectBrand,
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
  onSelectBrand: (brandId: string) => void;
  logo: React.ReactNode;
  /** De teller "3 openstaande vragen". Leeg zodra er niets open staat. */
  openQuestions?: React.ReactNode;
  /** De wisselknop naar de klantweergave, `null` voor wie dat recht niet heeft. */
  previewToggle?: React.ReactNode;
  accountMenu: React.ReactNode;
  children: React.ReactNode;
}) {
  const [ladeOpen, setLadeOpen] = useState(false);

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
