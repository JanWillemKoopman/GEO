"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { MobileTopbar } from "@/components/mobile-topbar";
import { NavLade } from "@/components/nav-lade";
import { brandNav, generalNav, titelVoorPad, type NavItem } from "@/lib/nav";
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
 * De hamburgerlade van vóór stap 6 is op 21 september 2026 weg: op de
 * desktoptak (`telefoon` is dan `false`) hoort geen hamburgermenu meer, ook
 * niet als vangnet voor een smal browservenster. `telefoon` beslist welke van
 * de twee takken er rendert; wie zich vergist zit tussen `BottomNav` en
 * `.topbar`/`Sidebar` in en heeft geen eigen derde opbouw.
 */
export function WorkspaceChrome({
  brands,
  activeBrand,
  staff,
  openVragen,
  telefoon,
  onSelectBrand,
  signOutAction,
  logo,
  openQuestions,
  previewToggle,
  accountMenu,
  profiel,
  children,
}: {
  brands: BrandOption[];
  activeBrand: BrandOption | null;
  /** Beheerder? Dan komt het CSM-paneel in de zijbalk (fase 8). */
  staff: boolean;
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
  /** Het profielicoon in de bovenbalk van de telefoon. */
  accountMenu: React.ReactNode;
  /** Het profiel met naam onderaan de zijbalk (en de lade), 29 september 2026. */
  profiel: React.ReactNode;
  children: React.ReactNode;
}) {
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
    // `.werkruimte` zet --header-h op 0 zolang de bovenbalk niet plakt (zie
    // globals.css): de plakkende tabs en filterbalken sluiten dan aan op de
    // bovenrand van het scherm in plaats van 48 pixels lager.
    <div className="werkruimte flex min-h-dvh">
      {/* ── DE ZIJBALK LOOPT VAN BOVEN TOT ONDER (29 september 2026) ─────────
          Hij plakt aan de bovenrand van het scherm en is precies zo hoog als het
          scherm, met een eigen scrollbaan in het menu (zie `Sidebar`). De
          bovenbalk staat rechts ernaast en niet meer erboven. Vanaf lg; eronder
          opent dezelfde zijbalk als lade (`NavLade`). */}
      <aside className="no-print sticky top-0 hidden h-dvh shrink-0 self-start border-r border-[var(--line-muted)] lg:block">
        <Sidebar
          activeBrand={activeBrand}
          brands={brands}
          onSelectBrand={onSelectBrand}
          logo={logo}
          profiel={profiel}
          staff={staff}
          openVragen={openVragen}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* De vorm staat in `.topbar` in globals.css: volledig doorzichtig, geen
            rand, en vanaf lg ook niet meer plakkend. Wat er nog in staat is wat
            bij dít scherm hoort: de teller van openstaande vragen en de
            klantweergave. De themaschakelaar, Support en het profiel zijn naar
            de zijbalk verhuisd. Onder lg (geen zijbalk) staat hier de menuknop
            met het woordmerk, en dan is de balk wél plakkend en dekkend. */}
        <header className="topbar no-print">
          <div className="flex h-full items-center gap-3 px-4 md:px-5 lg:px-6">
            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <NavLade
                activeBrand={activeBrand}
                brands={brands}
                onSelectBrand={onSelectBrand}
                profiel={profiel}
                staff={staff}
                openVragen={openVragen}
              />
              {logo}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1">
              {openQuestions}
              {previewToggle}
            </div>
          </div>
        </header>

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
            de pagina en de kaart twee verschillende kleuren (`--bg-base` onder
            `--bg-surface`, in beide standen twee echte stappen), dus het
            kunstgreepje om de werkruimte grijzer te maken dan de rest is niet
            meer nodig. Het stippenpatroon dat hier lag is in stap 1 al weg. */}
        <main className="workspace-canvas min-w-0 flex-1">
          <div className="stand">{children}</div>
        </main>
      </div>
    </div>
  );
}
