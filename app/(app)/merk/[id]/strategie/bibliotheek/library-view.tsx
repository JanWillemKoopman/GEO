"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LastUpdated } from "@/components/last-updated";
import {
  beschikbareWaarden,
  filterLibrary,
  libraryTotals,
  pagineer,
  LEGE_FILTERS,
  PAGINA_GROOTTE,
  type LibraryFilters,
  type LibraryRow,
} from "@/lib/library";

/**
 * De merkbrede bibliotheek: kerncijfers, filterbalk, tabel.
 *
 * ── WAAROM DE REKENKANT HIER NIET STAAT ─────────────────────────────────────
 *
 * Filteren en pagineren bepalen wát de klant ziet, en een fout daarin laat een
 * pagina verdwijnen waarvoor hij betaald heeft, zonder dat er iets misgaat op
 * het scherm. Die logica staat daarom in `lib/library.ts`, met tests.
 *
 * ── DE HERKOMST GAAT MEE ────────────────────────────────────────────────────
 *
 * Een contentpagina is vanaf drie plekken te bereiken: het clusterdossier, deze
 * bibliotheek en het contentplan. Zonder herkomst wijst de terugknop op de
 * detailpagina altijd naar dezelfde plek, en dan komt de klant ergens uit waar
 * hij niet vandaan kwam. Vandaar `?van=bibliotheek`, naar Nova's `origin`.
 */
const TYPE_LABEL: Record<string, string> = {
  article: "Artikel",
  faq: "FAQ",
  landing: "Landingspagina",
  comparison: "Vergelijking",
};

const STATUS_LABEL: Record<string, string> = {
  briefing: "Wacht op jouw input",
  draft: "Concept",
  ready: "Klaar om te publiceren",
  published: "Staat live",
  archived: "Gearchiveerd",
};

const STATUS_CHIP: Record<string, string> = {
  briefing: "chip chip-warning",
  draft: "chip chip-neutral",
  ready: "chip chip-info",
  published: "chip chip-success",
  archived: "chip chip-neutral",
};

export function LibraryView({ rows }: { rows: LibraryRow[] }) {
  const [filters, setFilters] = useState<LibraryFilters>(LEGE_FILTERS);
  const [pagina, setPagina] = useState(1);

  const totalen = useMemo(() => libraryTotals(rows), [rows]);
  const waarden = useMemo(() => beschikbareWaarden(rows), [rows]);
  const gefilterd = useMemo(() => filterLibrary(rows, filters), [rows, filters]);
  const pagineerd = useMemo(() => pagineer(gefilterd, pagina), [gefilterd, pagina]);

  function zet(patch: Partial<LibraryFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    // Terug naar pagina 1: een filter aanzetten terwijl je op pagina 3 staat
    // laat je anders naar een stuk lijst kijken dat er niet meer is.
    setPagina(1);
  }

  const gefilterdActief =
    filters.zoek !== "" || filters.type !== "" || filters.status !== "" || filters.cluster !== "";

  return (
    <div className="flex flex-col gap-6">
      {/* ── 1. Kerncijfers ──────────────────────────────────────────────────
          Een trechter en geen drie stapels: geschreven bevat alles, ook wat
          live staat. Vandaar de pijlen in de uitleg eronder. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Cijfer label="Geschreven" waarde={totalen.geschreven} />
        <Cijfer label="Klaar voor vrijgave" waarde={totalen.klaarVoorVrijgave} />
        <Cijfer label="Gepubliceerd" waarde={totalen.gepubliceerd} />
      </div>
      <p className="text-sm text-muted">
        Geschreven telt alles, ook wat al live staat. Zolang een tekst niet online staat, verandert
        er niets aan je zichtbaarheid.
      </p>

      {/* ── 2. Filterbalk ───────────────────────────────────────────────── */}
      <div className="card flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Zoeken</span>
          <input
            className="field"
            value={filters.zoek}
            onChange={(e) => zet({ zoek: e.target.value })}
            placeholder="Zoek op titel of adres…"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <Keuze
            label="Type"
            value={filters.type}
            onChange={(type) => zet({ type })}
            opties={waarden.types.map((t) => ({ value: t, label: TYPE_LABEL[t] ?? t }))}
          />
          <Keuze
            label="Status"
            value={filters.status}
            onChange={(status) => zet({ status })}
            opties={waarden.statussen.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s }))}
          />
          <Keuze
            label="Cluster"
            value={filters.cluster}
            onChange={(cluster) => zet({ cluster })}
            opties={waarden.clusters.map((c) => ({ value: c.id, label: c.naam }))}
          />
        </div>

        {gefilterdActief && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="chip">
              {pagineerd.totaal} van de {rows.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setFilters(LEGE_FILTERS);
                setPagina(1);
              }}
              className="text-sm text-secondary hover:underline"
            >
              Filters wissen
            </button>
          </div>
        )}
      </div>

      {/* ── 3. De lijst ─────────────────────────────────────────────────────
          Op mobiel gestapelde kaarten en geen tabel met zes kolommen
          (`docs/ux-design.md` §7): een tabel die je zijwaarts moet scrollen is
          op een telefoon geen tabel meer. */}
      {pagineerd.totaal === 0 ? (
        <div className="card flex flex-col gap-1">
          <span className="mono-label">Niets gevonden</span>
          <p className="text-secondary">
            Geen pagina past bij deze filters. Wis ze om alles weer te zien.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {pagineerd.rijen.map((r) => (
            <li key={r.id}>
              <Link
                href={`/analyses/${r.analysisId}/bibliotheek/${r.id}?van=bibliotheek`}
                className="card card-interactive flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="mono-label mt-1">
                    {TYPE_LABEL[r.type] ?? r.type} · {r.cluster} ·{" "}
                    <LastUpdated at={r.createdAt} className="" />
                  </p>
                  {r.publishedUrl && (
                    <p className="mono-label break-url mt-1">{r.publishedUrl}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {/* Conventie 3: onbekend is een koppelteken, nooit een 0. */}
                  <span className="stat-value text-sm">
                    {r.geoScore === null ? "-" : `${r.geoScore}/100`}
                  </span>
                  <span className={STATUS_CHIP[r.status] ?? "chip chip-neutral"}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* ── 4. Paginering, pas als er meer dan één pagina is ───────────────── */}
      {pagineerd.paginas > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="mono-label">
            Pagina {pagineerd.pagina} van {pagineerd.paginas} · {PAGINA_GROOTTE} per pagina
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline btn-sm disabled:opacity-50"
              disabled={pagineerd.pagina <= 1}
              onClick={() => setPagina(pagineerd.pagina - 1)}
            >
              Vorige
            </button>
            <button
              type="button"
              className="btn-outline btn-sm disabled:opacity-50"
              disabled={pagineerd.pagina >= pagineerd.paginas}
              onClick={() => setPagina(pagineerd.pagina + 1)}
            >
              Volgende
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Cijfer({ label, waarde }: { label: string; waarde: number }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="mono-label">{label}</span>
      <span className="stat-value text-2xl">{waarde}</span>
    </div>
  );
}

function Keuze({
  label,
  value,
  onChange,
  opties,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  opties: { value: string; label: string }[];
}) {
  // Een filter met één optie filtert niets: dan is elke rij die optie al.
  if (opties.length < 2) return null;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="mono-label">{label}</span>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Alles</option>
        {opties.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
