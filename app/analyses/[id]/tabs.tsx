"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "", label: "Overzicht" },
  // Het letterlijke AI-antwoord is het overtuigendste wat het systeem bezit
  // (optimalisatie.md 3A) — dus staat het vóór het rapport, niet weggestopt.
  { segment: "antwoorden", label: "Vragen & antwoorden" },
  { segment: "rapport", label: "Rapport" },
  { segment: "bibliotheek", label: "Content Bibliotheek" },
  { segment: "instellingen", label: "Instellingen" },
];

export function AnalysisTabs({ analysisId }: { analysisId: string }) {
  const pathname = usePathname();
  const base = `/analyses/${analysisId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)]">
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active = pathname === href;
        return (
          <Link
            key={tab.segment || "overzicht"}
            href={href}
            className="relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors"
            style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
          >
            {tab.label}
            {active && (
              <span
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                style={{ background: "var(--brand-gradient)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
