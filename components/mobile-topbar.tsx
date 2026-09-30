/**
 * De bovenbalk op een telefoon: 52px, de titel van het scherm links en rechts
 * de ruimte voor de hamburgerknop.
 *
 * ── WAAROM DIT EEN ANDERE BALK IS EN GEEN SMALLE VERSIE VAN `.topbar` ───────
 *
 * De desktopbalk draagt het woordmerk, de merkkiezer en vier knoppen. Daar is
 * op 52 pixels hoogte en de volle breedte van een telefoon geen plaats voor;
 * `redesign2026.md` §8.12.3 zegt het met zoveel woorden: andere inhoud, niet
 * dezelfde inhoud kleiner.
 *
 * ── GEEN TERUGKNOP EN GEEN LOSSE KNOPPEN MEER (30 september 2026) ──────────
 *
 * Links stond een terugknop, rechts het belletje en het profiel. De terugknop
 * deed niets wat de browser niet al doet, en het belletje en het profiel zitten
 * nu in het schermvullende menu (`components/mobiel-menu.tsx`). De knop zelf
 * staat niet in deze balk maar vast in de hoek, zodat hij boven het geopende
 * menu blijft liggen en daar tot een kruis draait; `.topbar-mobiel` houdt
 * rechts plek voor hem vrij.
 *
 * ── DE TITEL KOMT UIT DE NAVIGATIELIJST, NIET UIT DE PAGINA ────────────────
 *
 * `lib/nav.ts#titelVoorPad` zoekt het label bij het huidige pad op in
 * dezelfde lijst die de zijbalk en het menu al gebruiken. Een scherm zonder
 * menu-item (een detailpagina) valt terug op de merknaam.
 */
export function MobileTopbar({ titel }: { titel: string }) {
  return (
    <header className="topbar-mobiel no-print">
      <h1 className="topbar-mobiel-titel">{titel}</h1>
    </header>
  );
}
