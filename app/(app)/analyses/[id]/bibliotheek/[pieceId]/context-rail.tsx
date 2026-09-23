"use client";

import { useState } from "react";
import { Drawer } from "@/components/drawer";
import { Icon } from "@/components/icon";

/**
 * De CONTEXTRAIL naast het canvas
 * (`docs/tasks/herontwerp-contentpagina.md` §6).
 *
 * Zes tabbladen: de inhoudsopgave, de kwaliteit, waarop de tekst rust, waarom
 * deze pagina bestaat, de versies en (alleen voor een beheerder) de interne
 * cijfers. Alles wat op het oude scherm als losse kaart onder de tekst hing,
 * staat hier naast de tekst.
 *
 * ── ⚠️ TABBLADEN EN NIET LANGER EEN ACCORDION (22 september 2026) ───────────
 *
 * Tot vandaag stonden alle secties onder elkaar, opengeklapt of dicht. Op een
 * groot scherm stond "Kwaliteit" standaard open, en die sectie is op een
 * pagina met veel bevindingen zelf al lang: de rail werd dan één doorlopende
 * kolom zo lang als de tekst zelf, met de inhoudsopgave er nog eens bovenop.
 * Er is hooguit één sectie tegelijk waar iemand naar kijkt, dus toont de rail
 * er nu ook maar één: de rest is een klik verderop in plaats van een stuk
 * scrollen. De sticky kolom in `globals.css` blijft even hoog als het canvas
 * ernaast; wat verandert is dat de INHOUD van die kolom nu bij de vraag past.
 *
 * ── WAAROM DE RAIL SOMS EEN LADE IS ─────────────────────────────────────────
 *
 * De splitsing hangt aan een containerquery in `globals.css` en niet aan de
 * vensterbreedte: of de rail past hangt net zo goed af van de zijbalk, die de
 * gebruiker zelf in- en uitklapt. Past hij niet, dan verschijnt hieronder de
 * knop naar een lade, en die lade is `components/drawer.tsx`: bestaand, met
 * Escape erin en op een telefoon een blad dat van onderen komt.
 *
 * Dezelfde tabbladen staan in beide gevallen in de boom, maar er is er altijd
 * hooguit één die iemand kan bedienen: is de kolom er, dan is de ladeknop weg,
 * en is de kolom weg, dan staat hij op `display: none` en rendert de lade zijn
 * inhoud alleen zolang hij open is. Twee zichtbare kopieën zouden twee keer
 * moeten bijhouden welk tabblad openstaat, en dat doet `actief` hieronder maar
 * één keer, gedeeld door de kolom en de lade.
 */
type SectieSleutel = "inhoud" | "kwaliteit" | "onderbouwing" | "waarom" | "versies" | "intern";

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
  // Kwaliteit is het eerste wat iemand hier hoort te zien: dat is de sectie
  // die tot vandaag standaard openstond, en de bevindingen zijn meestal de
  // reden dat iemand de rail openklapt.
  const [actief, setActief] = useState<SectieSleutel>("kwaliteit");

  const secties: {
    sleutel: SectieSleutel;
    titel: string;
    badge?: string;
    badgeClassName?: string;
    inhoud: React.ReactNode;
  }[] = [
    { sleutel: "inhoud", titel: "Inhoud", inhoud },
    {
      sleutel: "kwaliteit",
      titel: "Kwaliteit",
      badge: kwaliteitBadge,
      badgeClassName: kwaliteitBadge ? "chip chip-danger" : undefined,
      inhoud: kwaliteit,
    },
    { sleutel: "onderbouwing", titel: "Waarop dit rust", badge: onderbouwingBadge, inhoud: onderbouwing },
    { sleutel: "waarom", titel: "Waarom deze pagina", inhoud: waarom },
    { sleutel: "versies", titel: "Versies", badge: versieBadge, inhoud: versies },
    ...(intern
      ? [{ sleutel: "intern" as const, titel: "Intern", inhoud: intern }]
      : []),
  ];
  const huidige = secties.find((s) => s.sleutel === actief) ?? { sleutel: "" as SectieSleutel };

  // ── Een accordeon, geen tabs (23 september 2026) ──────────────────────────
  //
  // Vijf tabs in een kolom van 320 pixels braken over twee regels ("Versies v1"
  // viel eronder) en lazen daardoor als twee menu's. De koppen staan nu onder
  // elkaar, met hun telling ernaast; één kop tegelijk open, zodat de rail niet
  // langer wordt dan de tekst ernaast. Zelfde indeling als het herontwerp al
  // tekende (`docs/tasks/herontwerp-contentpagina.md` §3.1).
  const paneel = (
    <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
      {secties.map((s) => {
        const open = s.sleutel === huidige.sleutel;
        return (
          <section key={s.sleutel} className="flex flex-col">
            <button
              type="button"
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-2 py-3 text-left type-body-emphasis"
              onClick={() => setActief(open ? ("" as SectieSleutel) : s.sleutel)}
            >
              <span className="flex items-center gap-2">
                {s.titel}
                {s.badge && <span className={s.badgeClassName ?? "chip chip-neutral"}>{s.badge}</span>}
              </span>
              <Icon naam={open ? "inklappen" : "uitklappen"} size={14} />
            </button>
            {open && <div className="pb-4">{s.inhoud}</div>}
          </section>
        );
      })}
    </div>
  );

  return (
    <>
      {/* De kolomversie. Verdwijnt via de containerquery zodra hij niet past. */}
      <aside id="rail" className="content-rail" aria-label="Context bij deze pagina">
        {paneel}
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
        {lade ? paneel : null}
      </Drawer>
    </>
  );
}
