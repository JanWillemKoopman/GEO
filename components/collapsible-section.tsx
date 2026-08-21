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
  defaultOpen,
  children,
}: {
  title: string;
  badge?: string;
  /** Overschrijft het breakpoint-gedrag (bv. altijd open forceren). */
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  useEffect(() => {
    if (defaultOpen !== undefined) return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    setOpen(mq.matches);
  }, [defaultOpen]);

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 bg-[var(--bg-elevated)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-surface-2)]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-medium">
          {title}
          {badge && <span className="chip">{badge}</span>}
        </span>
        <span
          className="text-secondary transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <Icon naam="openen" />
        </span>
      </button>
      {open && <div className="flex flex-col gap-4 p-4">{children}</div>}
    </div>
  );
}
