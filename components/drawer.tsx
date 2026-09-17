"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icon";

/**
 * Een paneel dat van rechts inschuift, met de verdieping bij een rij.
 *
 * ── WAAROM DIT GEEN PAGINA IS ───────────────────────────────────────────────
 *
 * Een rij openen mag je je plek in de lijst niet kosten. Wie op rij 47 van een
 * tabel met 200 clusters klikt en daarna terug wil, hoort weer bij rij 47 te
 * staan en niet bovenaan. Een nieuwe pagina doet dat verkeerd: hij vervangt de
 * lijst, verliest de scrollpositie en kost twee navigaties om één cijfer te
 * bekijken.
 *
 * Dit vervangt `DetailPanel`, dat hetzelfde deed maar de tabel ernaast liet
 * krimpen. Dat werkte zolang de tabel vier kolommen had; met de bredere
 * tabellen van de nieuwe opmaak (`redesign2026.md` §8.1, stand `data`) is
 * krimpen geen optie meer, want dan valt precies de kolom weg waar je op
 * klikte.
 *
 * ── OP EEN TELEFOON IS HET EEN BLAD ─────────────────────────────────────────
 *
 * Onder 768 pixels schuift hij van onderen in plaats van van rechts. 420 pixels
 * breed is daar het hele scherm, en dan is "van rechts" een paginawissel met
 * extra stappen. De sleepgreep die dan verschijnt is geen versiering: zonder
 * zichtbare greep probeert niemand te slepen, en dan is het scrim de enige
 * uitweg. Boven een blad van 90vh is dat scrim maar een paar pixels hoog.
 *
 * De vorm staat in `app/globals.css` onder "Lade". Zie `redesign2026.md` §7.14.
 */
export function Drawer({
  open,
  titel,
  onderschrift,
  onSluit,
  voet,
  children,
}: {
  open: boolean;
  titel: string;
  onderschrift?: string;
  onSluit: () => void;
  /** Knoppen onderaan, achter een streep. Weglaten als de lade alleen leest. */
  voet?: React.ReactNode;
  children: React.ReactNode;
}) {
  const paneel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // De focus gaat naar het paneel, zodat een toetsenbordgebruiker niet achter
    // de lade in de tabel blijft hangen. Zelfde patroon als `ConfirmDialog`.
    paneel.current?.focus();

    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") onSluit();
    }
    document.addEventListener("keydown", toets);

    // ⚠️ De pagina eronder mag niet meescrollen. Zonder deze twee regels scrolt
    // het wiel de tabel achter de lade door zodra de inhoud van de lade zelf
    // aan zijn einde zit, en dan verlies je alsnog je plek in de lijst: precies
    // het probleem dat dit component moet oplossen.
    const vorige = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", toets);
      document.body.style.overflow = vorige;
    };
  }, [open, onSluit]);

  if (!open) return null;

  return (
    <div className="no-print">
      <button
        type="button"
        className="drawer-scrim"
        aria-label="Sluiten"
        onClick={onSluit}
      />
      <div
        ref={paneel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        className="drawer"
      >
        {/* Alleen zichtbaar op een telefoon; zie het blok in globals.css. */}
        <span className="drawer-greep" aria-hidden />

        <div className="drawer-kop">
          <span className="min-w-0 flex-1">
            <span className="type-compact-emphasis block truncate">{titel}</span>
            {onderschrift && (
              <span className="type-caption block truncate text-muted">{onderschrift}</span>
            )}
          </span>
          <button
            type="button"
            onClick={onSluit}
            className="btn-ghost btn-icon btn-sm btn-rect"
            aria-label="Lade sluiten"
          >
            <Icon naam="sluiten" size={16} />
          </button>
        </div>

        <div className="drawer-inhoud">{children}</div>

        {voet && <div className="drawer-voet">{voet}</div>}
      </div>
    </div>
  );
}
