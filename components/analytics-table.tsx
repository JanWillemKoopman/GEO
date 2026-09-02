"use client";

import { useMemo, useState } from "react";

/**
 * De ene tabel voor alle vier de Analytics-schermen (plan
 * analytics-herontwerp.md, F3).
 *
 * Nu bouwt elke pagina zijn eigen lijst met kaarten, en dat is precies waarom
 * de schermen anders aanvoelen: andere kolombreedtes, andere sortering, geen
 * groepering. Deze component regelt sorteren via de kolomkop, groeperen op
 * label met een subtotaal per groep, vaste kolombreedtes, `tabular-nums` op
 * elke cijferkolom, een plakkende kop en een plakkende eigen rij.
 *
 * Alleen lezen: geen knoppen in een rij, geen bewerken. Dat past bij Analytics
 * als leesomgeving (plan §1.2).
 */
export interface AnalyticsColumn<T> {
  key: string;
  header: string;
  /** Vaste breedte als Tailwind-waarde, bv. `"9rem"`. Zonder blijft de kolom flexibel. */
  width?: string;
  /** Rechts uitgelijnd met `tabular-nums`: voor elke kolom die een getal toont. */
  numeriek?: boolean;
  render: (row: T) => React.ReactNode;
  /** Ontbreekt dit, dan is de kolom niet sorteerbaar. `null` sorteert altijd achteraan. */
  sortValue?: (row: T) => number | string | null;
}

export interface AnalyticsGroup {
  key: string;
  label: string;
}

export function AnalyticsTable<T>({
  columns,
  rows,
  rowKey,
  groupOf,
  isOwnRow,
  onRowClick,
  selectedKey,
  defaultSortKey,
  defaultSortDir = "asc",
  emptyLabel = "Niets te tonen bij deze filters.",
  stickyOffset = "var(--header-h)",
}: {
  columns: AnalyticsColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Groepeert op label als dit meegegeven is; anders één platte tabel. */
  groupOf?: (row: T) => AnalyticsGroup | null;
  /** Deze rij blijft zichtbaar boven- of onderaan zijn groep bij het scrollen. */
  isOwnRow?: (row: T) => boolean;
  /** Een rij is klikbaar zodra dit meegegeven is: de aanroeper opent er
   * meestal een `DetailPanel` mee (plan F4), zonder de lijst te verlaten. */
  onRowClick?: (row: T) => void;
  /** De rij die nu in het detailpaneel staat, voor de gemarkeerde stand. */
  selectedKey?: string | null;
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
  emptyLabel?: string;
  /** Waarop de kop plakt: standaard de bovenbalk, of erbij op als er een filterbalk boven staat. */
  stickyOffset?: string;
}) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);

  const sortColumn = columns.find((c) => c.key === sortKey && c.sortValue);

  const sorted = useMemo(() => {
    if (!sortColumn?.sortValue) return rows;
    const withValue = rows.map((row) => ({ row, waarde: sortColumn.sortValue!(row) }));
    withValue.sort((a, b) => {
      if (a.waarde === null && b.waarde === null) return 0;
      if (a.waarde === null) return 1;
      if (b.waarde === null) return -1;
      const cmp = a.waarde < b.waarde ? -1 : a.waarde > b.waarde ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return withValue.map((w) => w.row);
  }, [rows, sortColumn, sortDir]);

  const groepen = useMemo(() => {
    if (!groupOf) return [{ groep: null as AnalyticsGroup | null, rijen: sorted }];
    const perGroep = new Map<string, { groep: AnalyticsGroup; rijen: T[] }>();
    const zonderGroep: T[] = [];
    for (const row of sorted) {
      const g = groupOf(row);
      if (!g) {
        zonderGroep.push(row);
        continue;
      }
      const bestaand = perGroep.get(g.key);
      if (bestaand) bestaand.rijen.push(row);
      else perGroep.set(g.key, { groep: g, rijen: [row] });
    }
    const resultaat = [...perGroep.values()].map((g) => ({ groep: g.groep as AnalyticsGroup | null, rijen: g.rijen }));
    if (zonderGroep.length > 0) resultaat.push({ groep: null, rijen: zonderGroep });
    return resultaat;
  }, [sorted, groupOf]);

  function sorteerOp(kolom: AnalyticsColumn<T>) {
    if (!kolom.sortValue) return;
    if (sortKey === kolom.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(kolom.key);
      setSortDir("asc");
    }
  }

  if (rows.length === 0) {
    return <p className="text-secondary">{emptyLabel}</p>;
  }

  // ⚠️ Bewust GEEN eigen `overflow-x-auto` om de tabel heen. Zo'n wikkel zou
  // hemzelf de scrolcontext maken voor de `position: sticky` kop en eigen rij
  // hieronder, die dan aan deze doos plakken in plaats van aan het venster
  // (dezelfde val als bij `.analytics-shell` in `app/globals.css`, zie de
  // toelichting daar). Het plan wil bovendien maar één schuifbalk per pagina
  // (§1.3), niet een losse per tabel: `.analytics-shell` regelt dat al.
  return (
    <div>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr
            className="sticky z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-base-blur)] backdrop-blur-md"
            style={{ top: stickyOffset }}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-2 pr-4 font-normal text-muted ${col.numeriek ? "text-right" : "text-left"}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.sortValue ? (
                  <button
                    type="button"
                    onClick={() => sorteerOp(col)}
                    className="inline-flex items-center gap-1 hover:text-[var(--text-primary)]"
                  >
                    {col.header}
                    {sortKey === col.key && <span aria-hidden>{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groepen.map(({ groep, rijen }) => (
            <GroupBody
              key={groep?.key ?? "__zonder"}
              groep={groep}
              rijen={rijen}
              columns={columns}
              rowKey={rowKey}
              isOwnRow={isOwnRow}
              onRowClick={onRowClick}
              selectedKey={selectedKey}
              stickyOffset={stickyOffset}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupBody<T>({
  groep,
  rijen,
  columns,
  rowKey,
  isOwnRow,
  onRowClick,
  selectedKey,
  stickyOffset,
}: {
  groep: AnalyticsGroup | null;
  rijen: T[];
  columns: AnalyticsColumn<T>[];
  rowKey: (row: T) => string;
  isOwnRow?: (row: T) => boolean;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  stickyOffset: string;
}) {
  return (
    <>
      {groep && (
        <tr>
          <td
            colSpan={columns.length}
            className="mono-label bg-[var(--bg-elevated)] py-1.5 pr-4 pl-2 text-muted"
          >
            {groep.label} · {rijen.length === 1 ? "1 rij" : `${rijen.length} rijen`}
          </td>
        </tr>
      )}
      {rijen.map((row) => {
        const key = rowKey(row);
        const eigen = isOwnRow?.(row) ?? false;
        const geselecteerd = selectedKey === key;
        return (
          <tr
            key={key}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            aria-selected={onRowClick ? geselecteerd : undefined}
            className={`border-t border-[var(--border-subtle)] ${onRowClick ? "cursor-pointer hover:bg-[var(--bg-elevated)]" : ""} ${
              eigen ? "sticky z-[5]" : ""
            }`}
            style={{
              ...(eigen
                ? {
                    top: `calc(${stickyOffset} + 2.25rem)`,
                    boxShadow: "0 1px 0 var(--border-subtle)",
                  }
                : undefined),
              background: geselecteerd ? "var(--intent-intelligence-surface)" : eigen ? "var(--bg-elevated)" : undefined,
            }}
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className={`py-1.5 pr-4 align-top ${col.numeriek ? "text-right tabular-nums" : ""}`}
              >
                {col.render(row)}
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}
