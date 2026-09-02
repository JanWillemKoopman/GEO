"use client";

import { Icon } from "@/components/icon";

/**
 * Het paneel rechts van een `AnalyticsTable` (plan analytics-herontwerp.md, F4).
 *
 * Gaat open bij een klik op een rij (`AnalyticsTable`'s `onRowClick`), en laat
 * de tabel ernaast krimpen: de aanroeper zet dit in een rooster van 12
 * kolommen, 8 voor de tabel en 4 voor dit paneel, en 12 voor de tabel als het
 * paneel dicht is. **Alleen lezen, geen knoppen**: dat past bij Analytics als
 * leesomgeving (plan §1.2), en verdieping die hier zou kunnen bewerken zou
 * die belofte breken.
 */
export function DetailPanel({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card sticky top-[calc(var(--header-h)+1rem)] flex max-h-[calc(100vh-var(--header-h)-2rem)] flex-col gap-3 overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{title}</span>
          {subtitle && <span className="mono-label block truncate text-muted">{subtitle}</span>}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-[var(--radius-md)] p-1 text-muted transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          aria-label="Paneel sluiten"
        >
          <Icon naam="sluiten" size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}
