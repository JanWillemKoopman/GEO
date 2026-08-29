"use client";

import { useState } from "react";
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
      {/* De hoogte staat vast op --header-h en volgt niet meer uit de inhoud:
          de hoofdstuktabs van het dossier plakken exact onder deze balk, en
          zodra de twee getallen uit elkaar lopen ontstaat er een kier waar de
          pagina-inhoud doorheen schuift. Zie het blok bij --header-h in
          globals.css. */}
      <header className="no-print sticky top-0 z-30 h-[var(--header-h)] border-b border-[var(--border-subtle)] bg-[var(--bg-base-blur)] backdrop-blur-md">
        <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setLadeOpen(true)}
              className="-ml-1 rounded-[var(--radius-md)] p-2 text-secondary transition-colors hover:bg-[var(--bg-muted)] lg:hidden"
              aria-label="Menu openen"
            >
              <Icon naam="menu" size={20} />
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
              nu bent en niet over hoe het scherm eruitziet. */}
          <div className="flex shrink-0 items-center gap-1">
            {openQuestions}
            {previewToggle}
            <ThemeToggle />
            {accountMenu}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Vaste zijbalk vanaf lg. Sticky onder de bovenbalk, met een eigen
            scrollbaan zodat een lange merknaam de pagina niet meeneemt. */}
        <aside className="no-print hidden shrink-0 self-start border-r border-[var(--border-subtle)] lg:block">
          <Sidebar activeBrand={activeBrand} staff={staff} sales={sales} openVragen={openVragen} />
        </aside>

        {/* `min-w-0` is hier geen sier: dit is een flex-kind, en zonder deze
            regel zet één lange URL diep in een kaart de minimale breedte van de
            hele kolom. Zie het blok "Niets is breder dan het scherm" in
            globals.css.

            De achtergrond staat hier bewust WEL op --bg-muted en niet op het
            pagina-wit van --bg-base. Nova's eigen pagina is wit (24 augustus
            2026, zie globals.css), maar dat geldt voor een kale pagina zonder
            zijbalk. Zodra de inhoud in kaarten op wit staat, valt de rand van
            die kaarten tegen deze even witte grond weg: op verzoek van de
            eigenaar (28 augustus 2026) krijgt de werkruimte hier weer het
            lichtgrijs dat de kaarten laat opvallen.

            `.workspace-canvas` (ook 28 augustus 2026, globals.css) legt daar
            een fijn stippenpatroon overheen dat naar het midden toe wegvalt,
            alleen in de lichte stand: zie de toelichting bij die klasse. */}
        <main className="workspace-canvas min-w-0 flex-1">
          <div className="mx-auto w-full max-w-5xl px-6 py-10">{children}</div>
        </main>
      </div>

      {/* De mobiele lade. */}
      {ladeOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay-scrim)]"
            aria-label="Menu sluiten"
            onClick={() => setLadeOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
              <span className="mono-label">Navigatie</span>
              <button
                type="button"
                onClick={() => setLadeOpen(false)}
                className="rounded-[var(--radius-md)] p-1 text-muted transition-colors hover:text-[var(--text-primary)]"
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
