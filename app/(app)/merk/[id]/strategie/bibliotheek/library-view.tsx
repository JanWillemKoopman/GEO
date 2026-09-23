"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { pagineer, PAGINA_GROOTTE } from "@/lib/library";
import { filterPaginas, tellingen, GROEP_LABEL, type Groep } from "@/lib/pagina-lijst";
import { STAND_CHIP, formatDag } from "@/lib/pagina-stand";
import type { PaginaRij } from "@/lib/pagina-data";

/**
 * De bibliotheek: alle pagina's van dit merk, elk met zijn ene stand
 * (`docs/tasks/contentflow-een-lijn.md` §4.6a, 23 september 2026).
 *
 * ── WAT ER VERANDERDE EN WAAROM ─────────────────────────────────────────────
 *
 * 1. De tegels tellen dezelfde stand als de chips. "Klaar voor vrijgave: 0"
 *    boven twee rijen die op vrijgave wachtten, kan niet meer.
 * 2. Een klik op een tegel filtert de lijst. Wie "Wacht op jou: 3" ziet, wil
 *    die drie zien.
 * 3. De zware filterkaart met drie keuzelijsten is weg: een zoekveld is genoeg,
 *    en pas vanaf tien pagina's. Voor drie pagina's was de filter groter dan de
 *    lijst.
 * 4. Elke rij zegt wat de klant moet doen, als hij aan zet is, en het
 *    kwaliteitscijfer staat er pas als er tekst is om te beoordelen. Een los
 *    streepje als cijfer is weg.
 * 5. De volgorde: eerst wat op jou wacht, dan wat ORBIT ENGINE maakt, dan wat
 *    live staat.
 */
export function LibraryView({
  profileId,
  rows: alleRijen,
  beginCluster,
}: {
  profileId: string;
  rows: PaginaRij[];
  /** Een cluster-id uit het adres, of leeg. */
  beginCluster: string;
}) {
  const [cluster, setCluster] = useState(beginCluster);
  const rows = useMemo(
    () => (cluster ? alleRijen.filter((r) => r.clusterId === cluster) : alleRijen),
    [alleRijen, cluster],
  );
  const clusterNaam = cluster ? (alleRijen.find((r) => r.clusterId === cluster)?.cluster ?? null) : null;
  const [groep, setGroep] = useState<Groep | null>(null);
  const [zoek, setZoek] = useState("");
  const [pagina, setPagina] = useState(1);

  const t = useMemo(() => tellingen(rows), [rows]);
  const gefilterd = useMemo(() => filterPaginas(rows, { zoek, groep }), [rows, zoek, groep]);
  const deel = useMemo(() => pagineer(gefilterd, pagina), [gefilterd, pagina]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        {(["wacht", "gemaakt", "live"] as Groep[]).map((g) => {
          const actief = groep === g;
          return (
            <button
              key={g}
              type="button"
              aria-pressed={actief}
              onClick={() => {
                setGroep(actief ? null : g);
                setPagina(1);
              }}
              className={`card card-interactive flex flex-col gap-1 text-left ${
                g === "wacht" && t.wacht > 0 ? "card-rail card-rail-warning" : ""
              }`}
              style={actief ? { borderColor: "var(--border-selected)" } : undefined}
            >
              <span className="type-caption text-muted">{GROEP_LABEL[g]}</span>
              <span className="stat-value">{t[g]}</span>
            </button>
          );
        })}
      </div>

      {rows.length >= 10 && (
        <input
          className="field"
          value={zoek}
          onChange={(e) => {
            setZoek(e.target.value);
            setPagina(1);
          }}
          placeholder="Zoek op naam of cluster"
          aria-label="Zoek een pagina"
        />
      )}

      {clusterNaam && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="chip chip-neutral">Cluster: {clusterNaam}</span>
          <button type="button" className="text-sm text-secondary hover:underline" onClick={() => setCluster("")}>
            Alle clusters
          </button>
        </div>
      )}

      {groep && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="chip chip-neutral">
            {GROEP_LABEL[groep]}: {deel.totaal}
          </span>
          <button type="button" className="text-sm text-secondary hover:underline" onClick={() => setGroep(null)}>
            Toon alles
          </button>
        </div>
      )}

      {deel.totaal === 0 ? (
        <div className="card flex flex-col gap-1">
          <p className="type-body-emphasis">Hier staat niets</p>
          <p className="text-secondary">
            {groep === "wacht" ? "Er wacht niets op je. Mooi zo." : "Geen pagina past bij deze keuze."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {deel.rijen.map((r) => (
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
                  {r.stand.looptAchter && <span className="chip chip-danger">Loopt achter</span>}
                  {r.stand.handeling && (
                    <span className="type-caption-emphasis text-[var(--text-primary)] underline">
                      {r.stand.handeling}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
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
