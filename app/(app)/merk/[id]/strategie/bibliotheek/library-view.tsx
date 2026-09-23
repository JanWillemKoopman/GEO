"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { pagineer, PAGINA_GROOTTE } from "@/lib/library";
import { filterPaginas, filterKeuzes, groepVan, statusRegel, GROEP_LABEL, LEEG_FILTER, type Groep as GroepSleutel, type PaginaFilter } from "@/lib/pagina-lijst";
import { Icon } from "@/components/icon";
import { formatDag, heeftEigenScherm } from "@/lib/pagina-stand";
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
 * ── DRIE GROEPEN, ÉÉN ZIN PER RIJ ─────────────────────────────────────────
 *
 * Avond 23 september 2026, op verzoek van de eigenaar: "Wacht op jou" (vragen,
 * een keuze, goedkeuren, live zetten), "Wordt binnenkort geschreven" (alles wat
 * vanzelf loopt) en "Staat live". Elke rij zegt in één zin waarop hij wacht
 * (`statusRegel()`), bijvoorbeeld "3 openstaande vragen om de pagina te kunnen
 * schrijven". Alleen een rij met iets om te doen of te lezen is een link
 * (`heeftEigenScherm()`); de rest heeft geen eigen scherm.
 *
 * Een filter staat nooit meer uit. Met twee teksten van dezelfde soort hadden
 * Status, Content en Type elk één keuze en werden ze grijs: de eigenaar las
 * dat terecht als "de filters doen het niet".
 */
export function LibraryView({
  profileId,
  rows,
  beginCluster,
}: {
  profileId: string;
  rows: PaginaRij[];
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
          {(["wacht", "binnenkort", "live"] as const).map((g) => (
            <Groep
              key={g}
              groep={g}
              rijen={deel.rijen.filter((r) => groepVan(r.stand) === g)}
              profileId={profileId}
            />
          ))}
        </>
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

/** Wat een groep zegt als hij leeg is. Een lege "Staat live" valt weg. */
const LEEG: Partial<Record<GroepSleutel, string>> = {
  wacht: "Er wacht nu niets op jou.",
  binnenkort: "Er staat nu niets klaar om geschreven te worden.",
};

function Groep({
  groep,
  rijen,
  profileId,
}: {
  groep: GroepSleutel;
  rijen: PaginaRij[];
  profileId: string;
}) {
  const leeg = LEEG[groep];
  if (rijen.length === 0 && !leeg) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="type-section">
        {GROEP_LABEL[groep]} <span className="text-muted tabular">({rijen.length})</span>
      </h2>
      {rijen.length === 0 ? (
        <p className="type-body text-secondary">{leeg}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rijen.map((r) => {
            const inhoud = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate type-body-emphasis" title={r.naam}>
                    {r.naam}
                  </p>
                  <p className="type-caption mt-1 text-muted">
                    {[r.soort, r.cluster, r.datum ? `gepland ${formatDag(r.datum)}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p
                    className="type-body mt-1.5"
                    style={groep === "wacht" ? { color: "var(--intent-warning-text)" } : undefined}
                  >
                    {statusRegel(r)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  {r.score !== null && (
                    <span className="type-caption tabular text-secondary">{Math.round(r.score)}/100</span>
                  )}
                  {r.stand.looptAchter && <span className="chip chip-danger">Loopt achter</span>}
                  {heeftEigenScherm(r.stand.sleutel) && (
                    <span className="text-muted" aria-hidden>
                      <Icon naam="verder" size={16} />
                    </span>
                  )}
                </div>
              </>
            );
            const klasse = "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between";
            return (
              <li key={r.routeId}>
                {heeftEigenScherm(r.stand.sleutel) ? (
                  <Link
                    href={`/merk/${profileId}/strategie/bibliotheek/${r.routeId}?van=bibliotheek`}
                    className={`card card-interactive ${klasse}`}
                  >
                    {inhoud}
                  </Link>
                ) : (
                  <div className={`card ${klasse}`}>{inhoud}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
