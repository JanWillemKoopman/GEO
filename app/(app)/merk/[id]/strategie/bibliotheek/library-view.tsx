"use client";

import { useMemo, useState } from "react";
import { pagineer, PAGINA_GROOTTE } from "@/lib/library";
import { filterPaginas, filterKeuzes, groepVan, statusRegel, GROEP_LABEL, LEEG_FILTER, type Groep as GroepSleutel, type PaginaFilter } from "@/lib/pagina-lijst";
import { Icon } from "@/components/icon";
import { SectionHeading } from "@/components/section-heading";
import { FilterKeuze } from "@/components/filter-keuze";
import { Lijst, LijstRegel } from "@/components/lijst";
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
 * ── ÉÉN REGEL, FILTERS ACHTER EEN KNOP (1 oktober 2026) ─────────────────────
 *
 * Het zoekveld, vier keuzelijsten met een label erboven en de teller stonden
 * samen in een kaart die het eerste scherm vulde: wie de bibliotheek opende,
 * zag eerst filters en pas daarna pagina's. Nu staat er één regel met het
 * zoekveld en een knop "Filters" die zegt hoeveel er aan staan; de vier keuzes
 * klappen eronder open (`FilterKeuze`, dezelfde vorm als op Analytics).
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
  // Hoeveel van de vier keuzelijsten iets aan hebben; zoeken telt niet, dat
  // staat altijd in beeld. Open als er al een filter uit het adres komt, zodat
  // een kortere lijst nooit onverklaard is.
  const aantalFilters = [filter.status, filter.cluster, filter.soort, filter.actie].filter((v) => v !== "").length;
  const [filtersOpen, setFiltersOpen] = useState(beginCluster !== "");

  function zet(deel: Partial<PaginaFilter>) {
    setFilter((f) => ({ ...f, ...deel }));
    setPagina(1);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex min-w-0 flex-1 basis-64 items-center">
            <span className="sr-only">Zoeken</span>
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
          </label>
          <button
            type="button"
            className="btn-outline"
            aria-expanded={filtersOpen}
            aria-controls="bibliotheek-filters"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Icon naam="filter" size={16} />
            Filters
            {aantalFilters > 0 && <span className="chip chip-neutral tabular">{aantalFilters}</span>}
          </button>
        </div>

        {filtersOpen && (
          <div id="bibliotheek-filters" className="filter-rij flex flex-wrap items-center gap-x-5 gap-y-3">
            <Keuze label="Status" waarde={filter.status} opties={keuzes.status} onKies={(status) => zet({ status })} />
            <Keuze label="Cluster" waarde={filter.cluster} opties={keuzes.cluster} onKies={(cluster) => zet({ cluster })} />
            <Keuze label="Soort pagina" waarde={filter.soort} opties={keuzes.soort} onKies={(soort) => zet({ soort })} />
            <Keuze label="Nieuw of bestaand" waarde={filter.actie} opties={keuzes.actie} onKies={(actie) => zet({ actie })} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <span className="type-caption text-muted tabular">
            {actief ? `${deel.totaal} van de ${totaal} pagina's` : `${totaal} pagina's`}
          </span>
          {actief && (
            <button type="button" className="link type-caption" onClick={() => zet(LEEG_FILTER)}>
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
    <FilterKeuze label={label} waarde={waarde} onKies={onKies}>
      <option value="">Alles</option>
      {opties.map(([waarde, tekst]) => (
        <option key={waarde} value={waarde}>
          {tekst}
        </option>
      ))}
    </FilterKeuze>
  );
}

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
        <Lijst label={GROEP_LABEL[groep]}>
          {rijen.map((r) => (
            <Rij key={r.routeId} rij={r} wacht={groep === "wacht"} profileId={profileId} />
          ))}
        </Lijst>
      )}
    </section>
  );
}

function Rij({ rij: r, wacht, profileId }: { rij: PaginaRij; wacht: boolean; profileId: string }) {
  const rechts =
    wacht || r.stand.looptAchter ? (
      <>
        {wacht && <span className="chip chip-warning">{statusRegel(r)}</span>}
        {r.stand.looptAchter && <span className="chip chip-danger">Loopt achter</span>}
      </>
    ) : undefined;
  return (
    <LijstRegel
      titel={
        <span className="block truncate" title={r.naam}>
          {r.naam}
        </span>
      }
      bijzaak={[r.soort, r.cluster, r.datum ? `gepland ${formatDag(r.datum)}` : null].filter(Boolean).join(" · ")}
      toelichting={wacht ? undefined : statusRegel(r)}
      rechts={rechts}
      href={
        heeftEigenScherm(r.stand.sleutel)
          ? `/merk/${profileId}/strategie/bibliotheek/${r.routeId}?van=bibliotheek`
          : undefined
      }
    />
  );
}
