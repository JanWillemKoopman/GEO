"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, isActive } from "@/lib/nav";

/**
 * De hoofdnavigatie op desktop.
 *
 * De vorige versie had geen actieve staat: vier identieke mono-labels, geen
 * enkele markering van waar je was. Het mobiele menu hád die markering wel, de
 * vraag "waar ben ik" was dus op het grootste scherm het slechtst beantwoord.
 */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="mono-label rounded-[var(--radius-pill)] px-3 py-1.5 transition-colors"
            style={{
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              background: active ? "var(--bg-elevated)" : "transparent",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
