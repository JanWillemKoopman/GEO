/**
 * De mobiele tegenhanger van een gegevenstabel: twee kolommen van 50%, elk met
 * twee waarden gestapeld. GEMETEN bij OKX (`redesign2026.md` §7.11, §8.12.1) en
 * niet een kaart per rij en niet horizontaal schuiven: die twee alternatieven
 * zijn allebei geprobeerd bij OKX en allebei losgelaten.
 *
 * ── WAAROM VIER GEGEVENS EN NIET ZEVEN ──────────────────────────────────────
 *
 * Een tabel op de computer toont tot zeven kolommen. Op een telefoon is dat
 * onleesbaar, dus dit component toont er twee keer twee: een hoofdwaarde met
 * bijschrift links, een kerncijfer met verandering rechts. Welke vier van de
 * zeven meegaan is per tabel een ontwerpkeuze en geen automatisme (§7.11); de
 * overige kolommen worden niet gerenderd, niet verborgen, dus die keuze ligt
 * bij wie dit component per scherm aanroept en niet hierin.
 *
 * Een tik op een rij opent het detailblad met alle gegevens: dat blad ís
 * `Drawer` (§7.14), er komt voor stap 7 geen apart component bij.
 */
export type MobielTabelRij = {
  id: string;
  hoofdwaarde: string;
  bijschrift?: string;
  kerncijfer: string;
  verandering?: { tekst: string; richting: "omhoog" | "omlaag" | "vlak" };
};

export function MobielTabel({
  rijen,
  onRijKlik,
  leeg,
}: {
  rijen: MobielTabelRij[];
  /** Weglaten als de tabel alleen leest: dan is een rij niet aanklikbaar. */
  onRijKlik?: (rij: MobielTabelRij) => void;
  /** Wat er staat als `rijen` leeg is. Zie 7.21 in het plan, `EmptyState`. */
  leeg?: React.ReactNode;
}) {
  if (rijen.length === 0) {
    return <>{leeg}</>;
  }

  return (
    <div className="mobiel-tabel" role="list">
      {rijen.map((rij) => (
        <div
          key={rij.id}
          role="listitem"
          onClick={onRijKlik ? () => onRijKlik(rij) : undefined}
          className={`mobiel-tabel-rij ${onRijKlik ? "mobiel-tabel-rij-klikbaar" : ""}`}
        >
          <span className="mobiel-tabel-links">
            <span className="mobiel-tabel-hoofdwaarde">{rij.hoofdwaarde}</span>
            {rij.bijschrift && <span className="mobiel-tabel-bijschrift">{rij.bijschrift}</span>}
          </span>
          <span className="mobiel-tabel-rechts">
            <span className="mobiel-tabel-kerncijfer">{rij.kerncijfer}</span>
            {rij.verandering && (
              <span
                className={`mobiel-tabel-verandering mobiel-tabel-verandering-${rij.verandering.richting}`}
              >
                {rij.verandering.tekst}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
