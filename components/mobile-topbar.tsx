"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";

/**
 * De bovenbalk op een telefoon: 52px, terugknop, titel, hooguit één knop.
 *
 * ── WAAROM DIT EEN ANDERE BALK IS EN GEEN SMALLE VERSIE VAN `.topbar` ───────
 *
 * De desktopbalk draagt het woordmerk, de merkkiezer en vier knoppen. Daar is
 * op 52 pixels hoogte en de volle breedte van een telefoon geen plaats voor;
 * `redesign2026.md` §8.12.3 zegt het met zoveel woorden: andere inhoud, niet
 * dezelfde inhoud kleiner. De merkkiezer verhuist naar het "Meer"-blad
 * (`components/meer-blad.tsx`).
 *
 * ── DE TITEL KOMT UIT DE NAVIGATIELIJST, NIET UIT DE PAGINA ────────────────
 *
 * `lib/nav.ts#titelVoorPad` zoekt het label bij het huidige pad op in
 * dezelfde lijst die de zijbalk en de onderbalk al gebruiken. Dat raakt geen
 * van de vijftig `page.tsx`-bestanden vóór stap 10 er is, en is nauwkeurig
 * voor elk scherm dat de klant ooit via een menu bereikt. Een scherm zonder
 * menu-item (een detailpagina als een prospectdossier) valt terug op de
 * merknaam.
 */
export function MobileTopbar({
  titel,
  actie,
}: {
  titel: string;
  /** De ene knop rechts. `null` laat de plek leeg in plaats van een lege knop. */
  actie?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <header className="topbar-mobiel no-print">
      <button
        type="button"
        onClick={() => router.back()}
        className="icon-btn"
        aria-label="Terug"
      >
        <Icon naam="terug" size={20} />
      </button>
      <h1 className="topbar-mobiel-titel">{titel}</h1>
      {actie}
    </header>
  );
}
