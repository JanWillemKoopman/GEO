"use client";

import { useState } from "react";
import { Drawer } from "@/components/drawer";
import { Icon } from "@/components/icon";

/**
 * De CONTEXTRAIL naast het canvas
 * (`docs/tasks/herontwerp-contentpagina.md` §6).
 *
 * Bovenaan, altijd open: "Te verbeteren" (`quality-findings.tsx`). Daaronder,
 * klein en dicht: de inhoudsopgave, waarop de tekst rust, waarom deze pagina
 * bestaat, de versies en (alleen voor een beheerder) de interne cijfers.
 *
 * ── WAAROM DE RAIL SOMS EEN LADE IS ─────────────────────────────────────────
 *
 * De splitsing hangt aan een containerquery in `globals.css` en niet aan de
 * vensterbreedte: of de rail past hangt net zo goed af van de zijbalk, die de
 * gebruiker zelf in- en uitklapt. Past hij niet, dan verschijnt hieronder de
 * knop naar een lade, en die lade is `components/drawer.tsx`: bestaand, met
 * Escape erin en op een telefoon een blad dat van onderen komt.
 *
 * Hetzelfde paneel staat in beide gevallen in de boom, maar er is er altijd
 * hooguit één die iemand kan bedienen: is de kolom er, dan is de ladeknop weg,
 * en is de kolom weg, dan staat hij op `display: none` en rendert de lade zijn
 * inhoud alleen zolang hij open is. Twee zichtbare kopieën zouden twee keer
 * moeten bijhouden welke kop openstaat, en dat doet `actief` hieronder maar
 * één keer, gedeeld door de kolom en de lade.
 */
type SectieSleutel = "inhoud" | "onderbouwing" | "waarom" | "versies" | "intern";

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
  /** "Te verbeteren". Staat altijd open, bovenaan. */
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
  // ── Alles dicht behalve "Te verbeteren" (23 september 2026) ───────────────
  //
  // Tot vandaag was "Kwaliteit" één van zes gelijkwaardige accordeonkoppen,
  // met "Inhoud" erboven. Maar er is op dit scherm maar één vraag die de rail
  // moet beantwoorden: wat moet er nog beter aan deze tekst. De inhoudsopgave,
  // de onderbouwing, het waarom en de versies zijn naslag. Die staan nu onder
  // "Meer over deze pagina", allemaal dicht, in een kleinere letter.
  const [actief, setActief] = useState<SectieSleutel | null>(null);

  const secties: {
    sleutel: SectieSleutel;
    titel: string;
    badge?: string;
    inhoud: React.ReactNode;
  }[] = [
    { sleutel: "inhoud", titel: "Inhoudsopgave", inhoud },
    { sleutel: "onderbouwing", titel: "Waarop de tekst rust", badge: onderbouwingBadge, inhoud: onderbouwing },
    { sleutel: "waarom", titel: "Waarom deze pagina", inhoud: waarom },
    { sleutel: "versies", titel: "Versies", badge: versieBadge, inhoud: versies },
    ...(intern ? [{ sleutel: "intern" as const, titel: "Intern", inhoud: intern }] : []),
  ];

  const paneel = (
    <div
      className="flex flex-col gap-6"
      // Een sprong naar de tekst vanuit de lade sluit de lade: anders springt
      // de pagina naar een zin die achter de lade verborgen blijft.
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-sluit-lade]")) setLade(false);
      }}
    >
      {kwaliteit}

      <div className="flex flex-col">
        <span className="type-caption text-muted pb-1">Meer over deze pagina</span>
        <div className="flex flex-col divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
          {secties.map((s) => {
            const open = s.sleutel === actief;
            return (
              <section key={s.sleutel} className="flex flex-col">
                <button
                  type="button"
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm text-secondary hover:text-[var(--text-primary)]"
                  onClick={() => setActief(open ? null : s.sleutel)}
                >
                  <span className="flex items-center gap-2">
                    {s.titel}
                    {s.badge && <span className="chip chip-neutral">{s.badge}</span>}
                  </span>
                  <Icon naam={open ? "inklappen" : "uitklappen"} size={14} />
                </button>
                {open && <div className="pb-4">{s.inhoud}</div>}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* De kolomversie. Verdwijnt via de containerquery zodra hij niet past. */}
      <aside id="rail" className="content-rail" aria-label="Te verbeteren en meer over deze pagina">
        {paneel}
      </aside>

      {/* De knop naar de lade. Verdwijnt via diezelfde query zodra de kolom er
          wel is, zodat er nooit twee ingangen naar dezelfde inhoud zijn. */}
      <div className="content-rail-knop">
        <button type="button" onClick={() => setLade(true)} className="btn-outline btn-sm w-fit">
          <span className="flex items-center gap-1.5">
            Te verbeteren
            {kwaliteitBadge && <span className="chip chip-danger">{kwaliteitBadge}</span>}
          </span>
        </button>
      </div>

      <Drawer
        open={lade}
        titel="Te verbeteren"
        onderschrift="Wat er nog beter moet aan deze tekst"
        onSluit={() => setLade(false)}
      >
        {lade ? paneel : null}
      </Drawer>
    </>
  );
}
