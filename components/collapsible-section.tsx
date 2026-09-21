"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

/**
 * Accordion-sectie die op DESKTOP standaard open staat en op MOBIEL standaard
 * dicht (designsystem.md §D2/§D4). Dit is een bewuste, apart ontworpen mobiele
 * indeling, geen verkleinde desktop-versie. `lg` = 1024px, zie §D1.
 */
const DESKTOP_QUERY = "(min-width: 1024px)";

export function CollapsibleSection({
  title,
  badge,
  badgeClassName,
  defaultOpen,
  compact = false,
  card = false,
  children,
}: {
  title: string;
  badge?: string;
  /** Overschrijft de kale, grijze chip. Voor een badge die mag opvallen. */
  badgeClassName?: string;
  /** Overschrijft het breakpoint-gedrag (bv. altijd open forceren). */
  defaultOpen?: boolean;
  /** De kleine variant uit §8.11: 16px kop-vulling en 14px titel in plaats
   *  van 32px/18px. Voor een lijst van tientallen items, zoals `/support`. */
  compact?: boolean;
  /** Op een wit, afgerond vlak in plaats van de vlakke OKX-streep. Voor een
   *  sectie die tussen kaarten staat en er zelf ook als kaart uit moet zien. */
  card?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  useEffect(() => {
    if (defaultOpen !== undefined) return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    setOpen(mq.matches);
  }, [defaultOpen]);

  return (
    <div
      className={`collapsible${compact ? " collapsible-compact" : ""}${card ? " collapsible-card" : ""}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="collapsible-kop"
        aria-expanded={open}
      >
        <span className="collapsible-titel">
          {title}
          {badge && <span className={badgeClassName ?? "chip"}>{badge}</span>}
        </span>
        <span
          className="collapsible-pictogram"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <Icon naam="openen" size={compact ? 16 : 20} />
        </span>
      </button>
      {open && <div className="collapsible-inhoud">{children}</div>}
    </div>
  );
}
