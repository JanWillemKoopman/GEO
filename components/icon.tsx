import { ICONEN, type IcoonNaam } from "@/lib/icons";

/**
 * Eén icoon, met de maat en de lijndikte van dit ontwerp erop.
 *
 * ── WAAROM EEN OMHULSEL EN NIET RECHTSTREEKS UIT DE BIBLIOTHEEK ────────────
 *
 * Lucide levert standaard 24 pixels bij lijndikte 2. Dat is te zwaar naast
 * `text-sm`: het icoon trekt dan meer aandacht dan het woord ernaast, en dat is
 * de omgekeerde volgorde van wat `docs/merkstrategie.md` §15.3 vraagt
 * ("duidelijke typografie, subtiele borders"). De handgetekende SVG's die hier
 * al stonden (`components/profile-menu.tsx`) hadden lijndikte 1,6 en 1,8, en
 * dat bleek de goede maat. 1,75 zit daar precies tussenin en houdt de hele set
 * op één gewicht.
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
      strokeWidth={1.75}
      aria-hidden
      className={`shrink-0${className ? ` ${className}` : ""}`}
    />
  );
}
