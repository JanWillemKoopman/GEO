import { ICONEN, type IcoonNaam } from "@/lib/icons";

/**
 * Eén icoon, met de maat van dit ontwerp erop.
 *
 * ── WAAROM EEN OMHULSEL EN NIET RECHTSTREEKS UIT DE BIBLIOTHEEK ────────────
 *
 * Sinds 30 september 2026 tekent de app in Phosphor, gewicht `bold`: dikke,
 * ronde lijnen. Het gewicht staat hier op één plek vast, zodat de hele app
 * met één woord van gewicht kan wisselen (`thin`, `light`, `regular`, `bold`,
 * `fill`, `duotone`). De reden voor de wissel: de lijnset daarvoor (Lucide op
 * lijndikte 1,5) las als te dun en te standaard, en de tussenstap Solar Bold
 * werd na één dag weer verlaten.
 *
 * ⚠️ **Het icoon kleurt nooit zichzelf.** Het erft `currentColor` van de tekst
 * ernaast. Zo blijft de betekenislaag van `docs/designsystem.md` §2.3 de enige
 * plek waar kleur betekenis krijgt, en verandert een icoon mee als de staat van
 * de regel verandert. Wil je er wél kleur op, zet die dan op de ouder.
 *
 * ⚠️ **`aria-hidden` staat vast en is geen vergissing.** Elk icoon in deze app
 * staat naast zijn eigen label. Een schermlezer die "netwerk" voorleest vóór
 * het woord "Clusters" voegt niets toe en kost tijd. Staat een icoon een keer
 * écht alleen (een knop zonder tekst), dan hoort het label op de knop, niet op
 * het icoon: zie de `aria-label`s in `components/workspace-chrome.tsx`.
 *
 * Bewust zonder `"use client"`: dit component heeft geen staat en geen
 * gebeurtenissen. In een serverscherm wordt het op de server tot SVG gerenderd,
 * in de zijbalk reist het mee met de client. Eén bestand, allebei de kanten op.
 */
export function Icon({
  naam,
  size = 16,
  className,
}: {
  naam: IcoonNaam;
  /** Pixels. 16 in tekstregels, 18 in koppen, 20 in losse knoppen. */
  size?: number;
  className?: string;
}) {
  const Tekening = ICONEN[naam];
  return (
    <Tekening
      size={size}
      weight="bold"
      aria-hidden
      className={`shrink-0${className ? ` ${className}` : ""}`}
    />
  );
}
