"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { pagineer, PAGINA_GROOTTE } from "@/lib/library";
import { filterPaginas, filterKeuzes, groepVan, statusRegel, GROEP_LABEL, LEEG_FILTER, type Groep as GroepSleutel, type PaginaFilter } from "@/lib/pagina-lijst";
import { Icon } from "@/components/icon";
import { SectionHeading } from "@/components/section-heading";
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
 * een keuze, goedkeuren, live zetten), "Staat op de planning (geen actie
 * benodigd)" (alles wat vanzelf loopt) en "Staat live". Elke rij zegt in één
 * zin waarop hij wacht (`statusRegel()`), bijvoorbeeld "3 openstaande vragen om
 * de pagina te kunnen schrijven". Alleen een rij met iets om te doen of te lezen is een link
 * (`heeftEigenScherm()`); de rest heeft geen eigen scherm.
 *
 * ── VORMGEVING (23 september 2026) ────────────────────────────────────────
 *
 * Elke rij was een losse kaart van ruim 110px hoog, met de statuszin in 16px
 * en alleen oranje tekst als teken dat er iets wacht. Nu volgt de lijst het
 * overzichtsscherm (`WachtrijLijst`): per groep één kaart met rijen en een
 * scheidingslijn, een `SectionHeading` met het aantal als chip, tekst in de
 * kaartmaat (`type-compact`), en "wacht op jou" als stip plus kleur (regel 4
 * van `docs/designsystem.md` §11: status is nooit kleur alleen). Het getal
 * rechts heet nu "Kwaliteit": los stond "72/100" er zonder te zeggen waarvan.
 *
 * Later die avond, op verzoek van de eigenaar: de oranje zin van een rij die op
 * jou wacht staat nu rechts als oranje chip (`chip-warning`), net als de groene
 * "Klaar voor jouw akkoord". De chip is zelf het teken, dus de stip viel weg.
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
          <span className="mono-label">Zoeken</span>
          <span className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-muted" aria-hidden>
              <Icon naam="zoekmachine" size={16} />
            </span>
            <input
              type="search"
              className="field w-full"
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-muted)] pt-3">
          <span className="type-caption text-muted tabular">
            {actief ? `${deel.totaal} van de ${totaal} pagina's` : `${totaal} pagina's`}
          </span>
          {actief && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => zet(LEEG_FILTER)}>
              Filters wissen
            </button>
          )}
        </div>
      </div>

      {deel.totaal === 0 ? (
        <div className="card flex flex-col gap-1">
          <p className="type-compact-emphasis">Hier staat niets</p>
          <p className="type-compact text-secondary">
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
              className="btn-outline btn-sm"
              disabled={deel.pagina <= 1}
              onClick={() => setPagina(deel.pagina - 1)}
            >
              Vorige
            </button>
            <button
              type="button"
              className="btn-outline btn-sm"
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
      <span className="mono-label">{label}</span>
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
    <section className="flex flex-col gap-3">
      <SectionHeading
        title={GROEP_LABEL[groep]}
        badge={<span className={`chip ${groep === "wacht" && rijen.length > 0 ? "chip-warning" : "chip-neutral"} tabular`}>{rijen.length}</span>}
      />
      {rijen.length === 0 ? (
        <p className="type-compact text-secondary">{leeg}</p>
      ) : (
        <ul className="card flex flex-col divide-y divide-[var(--border-subtle)] overflow-hidden !p-0">
          {rijen.map((r) => (
            <li key={r.routeId}>
              <Rij rij={r} wacht={groep === "wacht"} profileId={profileId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Rij({ rij: r, wacht, profileId }: { rij: PaginaRij; wacht: boolean; profileId: string }) {
  const link = heeftEigenScherm(r.stand.sleutel);
  const inhoud = (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate type-body-emphasis" title={r.naam}>
          {r.naam}
        </p>
        <p className="type-caption text-muted">
          {[r.soort, r.cluster, r.datum ? `gepland ${formatDag(r.datum)}` : null].filter(Boolean).join(" · ")}
        </p>
        {!wacht && <p className="type-compact mt-0.5 text-secondary">{statusRegel(r)}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {wacht && <span className="chip chip-warning">{statusRegel(r)}</span>}
        {r.stand.looptAchter && <span className="chip chip-danger">Loopt achter</span>}
        {link && (
          <span className="text-muted" aria-hidden>
            <Icon naam="verder" size={16} />
          </span>
        )}
      </div>
    </>
  );
  const klasse = "flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5";
  return link ? (
    <Link
      href={`/merk/${profileId}/strategie/bibliotheek/${r.routeId}?van=bibliotheek`}
      className={`${klasse} transition-colors hover:bg-[var(--bg-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--border-focus)]`}
    >
      {inhoud}
    </Link>
  ) : (
    <div className={klasse}>{inhoud}</div>
  );
}
