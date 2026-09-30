"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Vraagkaart, type Vraag } from "@/components/pagina/vragenlijst";
import {
  filterKnoppen,
  nogOpen,
  pastBijFilter,
  type GroepSoort,
  type VraagFilter,
} from "@/lib/vragen-overzicht";

/**
 * Alle vragen aan de klant in één lijst, met één filterrij.
 *
 * ── ⚠️ HERONTWORPEN OP 30 SEPTEMBER 2026 ────────────────────────────────────
 *
 * Het scherm had twee blokken met elk een eigen kaart: de vragen per pagina
 * bovenaan (knoppen "Antwoord opslaan" en "Overslaan", een kop "Vragen voor
 * deze pagina" herhaald onder de paginanaam), en onderaan een tweede kaart met
 * de losse vragen, een eigen filter, bij elke vraag twee grijze etiketten en de
 * knoppen "Opslaan" en "Weet ik niet". Voor de klant is het één soort werk, dus
 * nu: één filterrij (Alles, Pagina's, Over je merk, per cluster), daaronder de
 * groepen onder een eigen kop, en overal dezelfde vraagkaart
 * (`components/pagina/vragenlijst.tsx`), dezelfde die ook op het scherm van de
 * pagina zelf staat.
 *
 * De groepen worden bij het laden vastgezet. Na elk antwoord ververst de
 * server de kop en de teller in de bovenbalk (`router.refresh()`); zou de lijst
 * die nieuwe stand ook overnemen, dan sprong een beantwoorde vraag onder je
 * cursor weg en zakte een pagina die net af is uit beeld voordat je de
 * bevestiging las. Nu klapt een beantwoorde vraag in tot één regel en blijft
 * hij staan tot je het scherm opnieuw opent.
 */

export interface VraagGroep {
  sleutel: string;
  soort: GroepSoort;
  naam: string;
  /** Alleen bij een pagina: waar de pagina zelf staat. */
  href?: string;
  /** Alleen bij een pagina: "vóór 12 oktober". */
  streefdatum?: string | null;
  looptAchter?: boolean;
  /** Alle vragen, ook de al beantwoorde en overgeslagen. */
  vragen: Vraag[];
  /** Profielgaten: een veld in het merkdossier dat nog leeg is. */
  gaten?: { field: string; label: string; effect: string; href: string | null }[];
}

const SOORT_LABEL: Record<GroepSoort, string> = {
  pagina: "Pagina",
  merk: "Merk",
  cluster: "Cluster",
};

const SOORT_UITLEG: Record<GroepSoort, string> = {
  pagina: "We schrijven deze pagina zodra elke vraag beantwoord of overgeslagen is.",
  merk: "Hoort bij geen pagina. Je antwoord helpt elke volgende pagina.",
  cluster: "Hoort bij geen pagina. Je antwoord helpt elke volgende pagina in dit cluster.",
};

const LOS_OVERSLAAN = "ORBIT ENGINE vraagt het niet nog een keer en schrijft zonder dit gegeven.";

type Stand = Record<string, { status: string; answer: string | null }>;

export function VragenOverzicht({ profileId, groepen: beginGroepen }: { profileId: string; groepen: VraagGroep[] }) {
  const [groepen] = useState(() =>
    beginGroepen.map((g) => ({
      ...g,
      openIds: g.vragen.filter((v) => v.status === "open").map((v) => v.id),
      extraOpen: g.gaten?.length ?? 0,
    })),
  );
  const [stand, setStand] = useState<Stand>(() =>
    Object.fromEntries(groepen.flatMap((g) => g.vragen).map((v) => [v.id, { status: v.status, answer: v.answer }])),
  );
  const [filter, setFilter] = useState<VraagFilter>("alles");
  const [toonGedaan, setToonGedaan] = useState(false);

  const statusVan = Object.fromEntries(Object.entries(stand).map(([id, s]) => [id, s.status]));
  const knoppen = filterKnoppen(groepen, statusVan);
  const zichtbaar = groepen.filter((g) => pastBijFilter(g, filter));
  const metOpen = zichtbaar.filter((g) => g.openIds.length + g.extraOpen > 0);
  // Wat bij het laden al beantwoord of overgeslagen was. Alleen losse vragen:
  // een pagina toont alleen zijn open vragen, de rest staat op de pagina zelf.
  const eerderGedaan = zichtbaar.flatMap((g) => g.vragen.filter((v) => !g.openIds.includes(v.id)));

  function naamVan(f: VraagFilter): string {
    if (f === "alles") return "Alles";
    if (f === "paginas") return "Pagina's";
    return groepen.find((g) => g.sleutel === f)?.naam ?? "Cluster";
  }

  function zet(id: string, s: { status: string; answer: string | null }) {
    setStand((oud) => ({ ...oud, [id]: s }));
  }

  return (
    <div className="flex flex-col gap-8">
      {knoppen.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Toon vragen van">
          {knoppen.map((k) => (
            <button
              key={k.filter}
              type="button"
              className="chip-select"
              aria-pressed={filter === k.filter}
              onClick={() => setFilter(k.filter)}
            >
              <span className="max-w-[16rem] truncate">{naamVan(k.filter)}</span>
              <span className="tabular text-[var(--text-subtle)]">{k.aantal}</span>
            </button>
          ))}
        </div>
      )}

      {metOpen.map((g) => {
        const open = g.vragen.filter((v) => g.openIds.includes(v.id));
        const gedaan = open.filter((v) => stand[v.id]?.status !== "open").length;
        const klaar = open.length > 0 && gedaan === open.length && nogOpen(g, statusVan) === 0;
        return (
          <section key={`${g.soort}-${g.sleutel}`} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="mono-label">{SOORT_LABEL[g.soort]}</span>
                  <h2 className="type-section">
                    {g.href ? (
                      <Link href={g.href} className="hover:underline">
                        {g.naam}
                      </Link>
                    ) : (
                      g.naam
                    )}
                  </h2>
                </div>
                <span className="flex flex-wrap items-center gap-2">
                  {g.looptAchter && <span className="chip chip-danger">Loopt achter</span>}
                  {g.streefdatum && <span className="type-caption text-muted">vóór {g.streefdatum}</span>}
                  <span className="type-caption text-muted tabular">
                    {gedaan} van {open.length + g.extraOpen} gedaan
                  </span>
                </span>
              </div>
              <p className="type-caption text-muted">{SOORT_UITLEG[g.soort]}</p>
            </div>

            {klaar && (
              <div className="card card-success flex items-center gap-2 type-body" role="status">
                <Icon naam="klaar" size={16} />
                {g.soort === "pagina"
                  ? "Alles voor deze pagina is binnen. We gaan hem schrijven."
                  : "Alles in deze groep is beantwoord of overgeslagen."}
              </div>
            )}

            <ul className="flex flex-col gap-3">
              {/* De kernvraag van de pagina bovenaan, dan de open vraag, dan de rest (V8). */}
              {[...open].sort((a, b) => volgorde(b) - volgorde(a)).map((v) => (
                <li key={v.id}>
                  <Vraagkaart
                    profileId={profileId}
                    vraag={v}
                    stand={stand[v.id]}
                    onKlaar={(s) => zet(v.id, s)}
                    overslaanUitleg={g.soort === "pagina" ? undefined : LOS_OVERSLAAN}
                  />
                </li>
              ))}
              {(g.gaten ?? []).map((gap) => (
                <li key={gap.field} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="type-body-emphasis">{gap.label}</span>
                    <span className="type-caption text-muted">{gap.effect}</span>
                  </div>
                  {gap.href && (
                    <Link href={gap.href} className="btn-outline btn-sm w-fit shrink-0">
                      Invullen
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {metOpen.length === 0 && (
        <p className="type-body text-secondary">
          {filter === "alles" ? "Er staat niets open." : `Bij ${naamVan(filter)} staat niets open.`}
        </p>
      )}

      {/* Eerder beantwoord of overgeslagen: ingeklapt, met "Wijzig" per vraag, zodat
          je een verkeerd antwoord ter plekke verbetert (sinds 22 september 2026). */}
      {eerderGedaan.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setToonGedaan((t) => !t)}
            className="btn-ghost btn-sm w-fit"
            aria-expanded={toonGedaan}
          >
            {toonGedaan ? "Verberg" : "Toon"} wat je al beantwoordde of oversloeg ({eerderGedaan.length})
          </button>
          {toonGedaan && (
            <ul className="flex flex-col gap-2">
              {eerderGedaan.map((v) => (
                <li key={v.id}>
                  <Vraagkaart
                    profileId={profileId}
                    vraag={v}
                    stand={stand[v.id]}
                    onKlaar={(s) => zet(v.id, s)}
                    overslaanUitleg={LOS_OVERSLAAN}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function volgorde(v: Vraag): number {
  return v.required ? 2 : v.open_vraag ? 1 : 0;
}
