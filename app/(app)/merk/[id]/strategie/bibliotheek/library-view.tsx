"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { pagineer, PAGINA_GROOTTE } from "@/lib/library";
import { filterPaginas, filterKeuzes, LEEG_FILTER, type PaginaFilter } from "@/lib/pagina-lijst";
import { Icon } from "@/components/icon";
import { STAND_CHIP, formatDag } from "@/lib/pagina-stand";
import type { PaginaRij } from "@/lib/pagina-data";

/**
 * De bibliotheek: alle pagina's van dit merk, elk met zijn ene stand
 * (`docs/tasks/contentflow-een-lijn.md` §4.6a, 23 september 2026).
 *
 * ── DE BOVENKANT: ÉÉN ZOEKBALK EN VIER FILTERS ──────────────────────────────
 *
 * Eerder op 23 september stonden hier drie klikbare tegels ("Wacht op jou",
 * "Wordt gemaakt", "Staat live") die ook als filter dienden. De eigenaar vond
 * dat onduidelijk: een tegel ziet eruit als een cijfer, niet als een knop. Nu
 * een gewone filterbalk met wat de eigenaar vroeg: een duidelijke zoekbalk, en
 * filters op status, cluster, soort content en type. Een filter toont alleen
 * keuzes die in de lijst voorkomen, en staat uit als er maar één keuze is.
 *
 * ── TWEE GROEPEN: WACHT OP JOU, STAAT LIVE ──────────────────────────────────
 *
 * Later die dag vond de eigenaar het nog steeds onduidelijk wat actie nodig
 * had en wat vanzelf liep. Sindsdien staan hier alleen pagina's met tekst
 * (`inBibliotheek()`), in twee groepen met een kop. Wat nog geen tekst heeft
 * staat in het contentplan; onderaan zegt één regel hoeveel dat er zijn.
 * Het label van de chip is de handeling ("Lees en keur goed", "Zet hem live"),
 * dus een tweede regel met dezelfde handeling ernaast viel weg.
 */
export function LibraryView({
  profileId,
  rows,
  onderweg,
  beginCluster,
}: {
  profileId: string;
  rows: PaginaRij[];
  /** Pagina's zonder tekst die in de maak zijn: die staan in het contentplan. */
  onderweg: number;
  /** Een cluster-id uit het adres, of leeg. */
  beginCluster: string;
}) {
  const [filter, setFilter] = useState<PaginaFilter>({ ...LEEG_FILTER, cluster: beginCluster });
  const [pagina, setPagina] = useState(1);

  const keuzes = useMemo(() => filterKeuzes(rows), [rows]);
  const gefilterd = useMemo(() => filterPaginas(rows, filter), [rows, filter]);
  const deel = useMemo(() => pagineer(gefilterd, pagina), [gefilterd, pagina]);
  const actief = Object.values(filter).some((v) => v !== "");
  const totaal = useMemo(() => filterPaginas(rows, LEEG_FILTER).length, [rows]);

  function zet(deel: Partial<PaginaFilter>) {
    setFilter((f) => ({ ...f, ...deel }));
    setPagina(1);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="type-caption-emphasis">Zoeken</span>
          <span className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-muted" aria-hidden>
              <Icon naam="zoekmachine" size={16} />
            </span>
            <input
              className="field field-lg w-full"
              style={{ paddingLeft: "2.25rem" }}
              value={filter.zoek}
              onChange={(e) => zet({ zoek: e.target.value })}
              placeholder="Zoek op naam van de pagina of cluster"
            />
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Keuze label="Status" waarde={filter.status} opties={keuzes.status} onKies={(status) => zet({ status })} />
          <Keuze label="Cluster" waarde={filter.cluster} opties={keuzes.cluster} onKies={(cluster) => zet({ cluster })} />
          <Keuze label="Content" waarde={filter.soort} opties={keuzes.soort} onKies={(soort) => zet({ soort })} />
          <Keuze label="Type" waarde={filter.actie} opties={keuzes.actie} onKies={(actie) => zet({ actie })} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="type-caption text-muted tabular">
            {actief ? `${deel.totaal} van de ${totaal} pagina's` : `${totaal} pagina's`}
          </span>
          {actief && (
            <button type="button" className="text-sm text-secondary hover:underline" onClick={() => zet(LEEG_FILTER)}>
              Filters wissen
            </button>
          )}
        </div>
      </div>

      {deel.totaal === 0 ? (
        <div className="card flex flex-col gap-1">
          <p className="type-body-emphasis">Hier staat niets</p>
          <p className="text-secondary">
            Geen pagina past bij deze filters. Wis ze om alles weer te zien.
          </p>
        </div>
      ) : (
        <>
          <Groep
            titel="Wacht op jou"
            leeg="Er wacht nu geen tekst op jou."
            rijen={deel.rijen.filter((r) => r.stand.aanZet === "klant")}
            profileId={profileId}
          />
          <Groep
            titel="Staat live"
            rijen={deel.rijen.filter((r) => r.stand.aanZet !== "klant")}
            profileId={profileId}
          />
        </>
      )}

      {onderweg > 0 && (
        <p className="type-caption text-muted">
          {onderweg === 1 ? "1 pagina heeft" : `${onderweg} pagina's hebben`} nog geen tekst. Hoe het
          daarmee staat zie je in het{" "}
          <Link href={`/merk/${profileId}/strategie/plan`} className="underline">
            contentplan
          </Link>
          . Wat we daarvoor van je nodig hebben staat bij{" "}
          <Link href={`/merk/${profileId}/strategie/vragen`} className="underline">
            Openstaande vragen
          </Link>
          .
        </p>
      )}

      {deel.paginas > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="type-caption text-muted">
            Pagina {deel.pagina} van {deel.paginas} · {PAGINA_GROOTTE} per pagina
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline btn-sm disabled:opacity-50"
              disabled={deel.pagina <= 1}
              onClick={() => setPagina(deel.pagina - 1)}
            >
              Vorige
            </button>
            <button
              type="button"
              className="btn-outline btn-sm disabled:opacity-50"
              disabled={deel.pagina >= deel.paginas}
              onClick={() => setPagina(deel.pagina + 1)}
            >
              Volgende
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Keuze({
  label,
  waarde,
  opties,
  onKies,
}: {
  label: string;
  waarde: string;
  opties: [string, string][];
  onKies: (waarde: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="type-caption-emphasis">{label}</span>
      <select
        className="field field-select"
        value={waarde}
        onChange={(e) => onKies(e.target.value)}
        disabled={opties.length < 2 && waarde === ""}
      >
        <option value="">Alles</option>
        {opties.map(([waarde, tekst]) => (
          <option key={waarde} value={waarde}>
            {tekst}
          </option>
        ))}
      </select>
    </label>
  );
}

function Groep({
  titel,
  leeg,
  rijen,
  profileId,
}: {
  titel: string;
  /** Tekst als de groep leeg is. Zonder deze tekst valt een lege groep weg. */
  leeg?: string;
  rijen: PaginaRij[];
  profileId: string;
}) {
  if (rijen.length === 0 && !leeg) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="type-section">
        {titel} <span className="text-muted tabular">({rijen.length})</span>
      </h2>
      {rijen.length === 0 ? (
        <p className="type-body text-secondary">{leeg}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rijen.map((r) => (
            <li key={r.routeId}>
              <Link
                href={`/merk/${profileId}/strategie/bibliotheek/${r.routeId}?van=bibliotheek`}
                className="card card-interactive flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate type-body-emphasis" title={r.naam}>
                    {r.naam}
                  </p>
                  <p className="type-caption mt-1 text-muted">
                    {[r.soort, r.cluster, r.datum ? `gepland ${formatDag(r.datum)}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  {r.score !== null && (
                    <span className="type-caption tabular text-secondary">{Math.round(r.score)}/100</span>
                  )}
                  <span className={STAND_CHIP[r.stand.toon]}>{r.stand.label}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
