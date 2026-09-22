"use client";

import { useState } from "react";
import { Drawer } from "@/components/drawer";
import { CollapsibleSection } from "@/components/collapsible-section";
import { Icon } from "@/components/icon";

/**
 * De CONTEXTRAIL naast het canvas
 * (`docs/tasks/herontwerp-contentpagina.md` §6).
 *
 * Vier secties: de kwaliteit, waarop de tekst rust, waarom deze pagina bestaat,
 * en de versies. Alles wat op het oude scherm als losse kaart onder de tekst
 * hing, staat hier ingeklapt naast de tekst.
 *
 * ── WAAROM DE RAIL SOMS EEN LADE IS ─────────────────────────────────────────
 *
 * De splitsing hangt aan een containerquery in `globals.css` en niet aan de
 * vensterbreedte: of de rail past hangt net zo goed af van de zijbalk, die de
 * gebruiker zelf in- en uitklapt. Past hij niet, dan verschijnt hieronder de
 * knop naar een lade, en die lade is `components/drawer.tsx`: bestaand, met
 * Escape erin en op een telefoon een blad dat van onderen komt.
 *
 * Dezelfde secties staan in beide gevallen in de boom, maar er is er altijd
 * hooguit één die iemand kan bedienen: is de kolom er, dan is de ladeknop weg,
 * en is de kolom weg, dan staat hij op `display: none` en rendert de lade zijn
 * inhoud alleen zolang hij open is. Twee zichtbare kopieën zouden twee keer
 * moeten bijhouden welke sectie openstaat.
 *
 * ── ⚠️ `defaultOpen` STAAT OVERAL EXPLICIET ─────────────────────────────────
 *
 * `CollapsibleSection` klapt vanaf 1024px uit zichzelf alles open. Dat is goed
 * gedrag voor een pagina met drie secties en verkeerd gedrag voor een rail die
 * juist bestaat om de lange lijst in te klappen: zonder deze prop staat het
 * oude scherm er gewoon weer, alleen smaller.
 */
export function ContextRail({
  kwaliteit,
  kwaliteitBadge,
  onderbouwing,
  onderbouwingBadge,
  waarom,
  versies,
  versieBadge,
  intern,
  inhoud,
}: {
  kwaliteit: React.ReactNode;
  /** Het aantal blokkades, of leeg als er geen zijn. */
  kwaliteitBadge?: string;
  onderbouwing: React.ReactNode;
  /** "12/14 onderbouwd", of leeg. */
  onderbouwingBadge?: string;
  waarom: React.ReactNode;
  versies: React.ReactNode;
  versieBadge?: string;
  /** Alleen voor een beheerder. `null` voor iedereen anders. */
  intern: React.ReactNode;
  /** De inhoudsopgave. Navigatie hoort in de rail, niet in de leeskolom. */
  inhoud: React.ReactNode;
}) {
  const [lade, setLade] = useState(false);

  const secties = (
    <div className="flex flex-col">
      {inhoud}

      <CollapsibleSection
        title="Kwaliteit"
        badge={kwaliteitBadge}
        badgeClassName={kwaliteitBadge ? "chip chip-danger" : undefined}
        defaultOpen
        compact
      >
        {kwaliteit}
      </CollapsibleSection>

      <CollapsibleSection
        title="Waarop dit rust"
        badge={onderbouwingBadge}
        defaultOpen={false}
        compact
      >
        {onderbouwing}
      </CollapsibleSection>

      <CollapsibleSection title="Waarom deze pagina" defaultOpen={false} compact>
        {waarom}
      </CollapsibleSection>

      <CollapsibleSection title="Versies" badge={versieBadge} defaultOpen={false} compact>
        {versies}
      </CollapsibleSection>

      {intern}
    </div>
  );

  return (
    <>
      {/* De kolomversie. Verdwijnt via de containerquery zodra hij niet past. */}
      <aside className="content-rail" aria-label="Context bij deze pagina">
        {secties}
      </aside>

      {/* De knop naar de lade. Verdwijnt via diezelfde query zodra de kolom er
          wel is, zodat er nooit twee ingangen naar dezelfde inhoud zijn. */}
      <div className="content-rail-knop">
        <button type="button" onClick={() => setLade(true)} className="btn-outline btn-sm w-fit">
          <span className="flex items-center gap-1.5">
            <Icon naam="feit" size={14} />
            Kwaliteit en onderbouwing
            {kwaliteitBadge && <span className="chip chip-danger">{kwaliteitBadge}</span>}
          </span>
        </button>
      </div>

      <Drawer
        open={lade}
        titel="Context bij deze pagina"
        onderschrift="De kwaliteit, de onderbouwing en de versies"
        onSluit={() => setLade(false)}
      >
        {lade ? secties : null}
      </Drawer>
    </>
  );
}
