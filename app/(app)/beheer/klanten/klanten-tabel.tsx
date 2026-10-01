"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { FilterKeuze } from "@/components/filter-keuze";
import {
  GROEP_LABEL,
  KOLOM_GROEPEN,
  KOLOMMEN,
  filterKlanten,
  klantenCsv,
  sorteerKlanten,
  type CelToon,
  type Kolom,
  type KolomGroep,
  type KlantRij,
} from "@/lib/klantenoverzicht";

/**
 * De klantentabel: één regel per klant, met een schakelaar die kiest welke
 * groep kolommen je ziet.
 *
 * ── WAAROM ÉÉN TABEL MET EEN SCHAKELAAR EN GEEN ZES TABELLEN ────────────────
 *
 * Dertig kolommen naast elkaar passen op geen enkel scherm, en zes losse
 * tabellen laten je bij elke wissel de klant opnieuw zoeken. Nu blijft de
 * klantnaam altijd vooraan staan, en blijven zoeken, filter en sortering
 * staan als je van groep wisselt.
 *
 * De schakelaar is een rij filterknoppen en geen segment: een segment is voor
 * twee of drie standen (`components/tabs.tsx`), dit zijn er zes, en net als de
 * segmenten in "Alle merken" wil je ze allemaal tegelijk zien.
 */
const TOON_CHIP: Record<CelToon, string> = {
  goed: "chip chip-success",
  let_op: "chip chip-warning",
  fout: "chip chip-danger",
  neutraal: "chip chip-neutral",
};

export function KlantenTabel({ klanten, nuIso }: { klanten: KlantRij[]; nuIso: string }) {
  const router = useRouter();
  // Eén moment voor de hele tabel, door de server meegegeven: zo zeggen server
  // en browser allebei "gisteren" en niet de een "gisteren" en de ander "vandaag".
  const nu = useMemo(() => new Date(nuIso), [nuIso]);

  const [groep, setGroep] = useState<KolomGroep>("klant");
  const [zoek, setZoek] = useState("");
  const [klantId, setKlantId] = useState("");
  const [email, setEmail] = useState("");
  const [sortering, setSortering] = useState<{ sleutel: string; richting: "op" | "af" } | null>(null);

  const kolommen = useMemo(() => KOLOMMEN.filter((k) => k.groep === groep), [groep]);
  const alleEmails = useMemo(() => [...new Set(klanten.flatMap((k) => k.emails))].sort(), [klanten]);
  const klantenOpNaam = useMemo(
    () => [...klanten].sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
    [klanten],
  );

  const zichtbaar = useMemo(() => {
    const gefilterd = filterKlanten(klanten, { zoek, klantId, email });
    const kolom = sortering ? KOLOMMEN.find((k) => k.sleutel === sortering.sleutel) : null;
    if (sortering?.sleutel === "naam") {
      return sorteerKlanten(gefilterd, (r) => r.naam.toLowerCase(), sortering.richting);
    }
    return kolom && sortering
      ? sorteerKlanten(gefilterd, kolom.sorteer, sortering.richting)
      : sorteerKlanten(gefilterd, (r) => r.naam.toLowerCase(), "op");
  }, [klanten, zoek, klantId, email, sortering]);

  const filterActief = zoek.trim() !== "" || klantId !== "" || email.trim() !== "";

  function sorteerOp(sleutel: string) {
    setSortering((huidig) =>
      huidig?.sleutel === sleutel
        ? { sleutel, richting: huidig.richting === "op" ? "af" : "op" }
        : { sleutel, richting: "op" },
    );
  }

  function exporteer() {
    // Het BOM-teken vooraan laat Excel de é in "Ideeën" goed lezen.
    const inhoud = "﻿" + klantenCsv(zichtbaar, nu);
    const url = URL.createObjectURL(new Blob([inhoud], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `klanten-${nuIso.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (klanten.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="type-body-emphasis">Nog geen klanten</h3>
        <p className="text-secondary">Zodra er een account is aangemaakt, staat het hier.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Welke gegevens ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Welke gegevens je ziet">
        {KOLOM_GROEPEN.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={groep === g}
            className="chip-select chip-select-lg"
            onClick={() => setGroep(g)}
          >
            {GROEP_LABEL[g]}
          </button>
        ))}
      </div>

      {/* ── Zoeken en filteren ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 items-center gap-2">
          <span className="mono-label shrink-0">Zoek</span>
          <input
            type="search"
            className="field field-sm w-56 max-w-full"
            placeholder="Bedrijfsnaam"
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
          />
        </label>

        <FilterKeuze label="Klant" waarde={klantId} onKies={setKlantId}>
          <option value="">Alle klanten</option>
          {klantenOpNaam.map((k) => (
            <option key={k.id} value={k.id}>
              {k.naam}
            </option>
          ))}
        </FilterKeuze>

        <label className="flex min-w-0 items-center gap-2">
          <span className="mono-label shrink-0">Gebruiker</span>
          <input
            type="search"
            className="field field-sm w-64 max-w-full"
            placeholder="E-mailadres"
            list="klanten-emails"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <datalist id="klanten-emails">
            {alleEmails.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
        </label>

        {filterActief && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              setZoek("");
              setKlantId("");
              setEmail("");
            }}
          >
            Wis filters
          </button>
        )}

        <button type="button" className="btn-outline btn-sm ml-auto" onClick={exporteer}>
          <Icon naam="downloaden" size={16} />
          Exporteer
        </button>
      </div>

      {/* Bij een filter op e-mailadres is de vraag "van welke klanten is deze
          gebruiker", en dat antwoord staat dan in één zin boven de tabel. */}
      <p className="text-sm text-secondary" aria-live="polite">
        {email.trim()
          ? zichtbaar.length === 0
            ? `Geen klant met een gebruiker die "${email.trim()}" in het e-mailadres heeft.`
            : `${zichtbaar.length === 1 ? "1 klant" : `${zichtbaar.length} klanten`} met een gebruiker die "${email.trim()}" in het e-mailadres heeft: ${zichtbaar.map((k) => k.naam).join(", ")}.`
          : filterActief
            ? `${zichtbaar.length} van ${klanten.length} klanten`
            : klanten.length === 1
              ? "1 klant"
              : `${klanten.length} klanten`}
      </p>

      {zichtbaar.length === 0 ? (
        <p className="text-secondary">Geen klant past bij dit filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="tabel tabel-klikbaar">
            <thead>
              <tr>
                <KopCel
                  label="Klant"
                  uitleg="Naam van de klant, met de merken eronder"
                  sleutel="naam"
                  sortering={sortering}
                  onSorteer={sorteerOp}
                />
                {kolommen.map((k) => (
                  <KopCel
                    key={k.sleutel}
                    label={k.label}
                    uitleg={k.uitleg}
                    sleutel={k.sleutel}
                    getal={k.getal}
                    sortering={sortering}
                    onSorteer={sorteerOp}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {zichtbaar.map((r) => (
                <tr
                  key={r.id}
                  // Eén merk: de hele regel opent dat merk. Meer merken: kies
                  // er een onder de klantnaam, want welk merk zou de regel
                  // anders moeten openen?
                  onClick={r.merken.length === 1 ? () => router.push(`/merk/${r.merken[0].id}`) : undefined}
                  style={r.merken.length === 1 ? undefined : { cursor: "default" }}
                >
                  <td className="min-w-[14rem]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{r.naam}</span>
                      {r.merken.length === 0 ? (
                        <span className="text-xs text-muted">Nog geen merk</span>
                      ) : (
                        <span className="flex flex-wrap gap-x-3 text-xs text-muted">
                          {r.merken.map((m) => (
                            <Link
                              key={m.id}
                              href={`/merk/${m.id}`}
                              className="hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {m.naam}
                            </Link>
                          ))}
                        </span>
                      )}
                    </div>
                  </td>
                  {kolommen.map((k) => (
                    <Cel key={k.sleutel} kolom={k} rij={r} nu={nu} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KopCel({
  label,
  uitleg,
  sleutel,
  getal = false,
  sortering,
  onSorteer,
}: {
  label: string;
  uitleg: string;
  sleutel: string;
  getal?: boolean;
  sortering: { sleutel: string; richting: "op" | "af" } | null;
  onSorteer: (sleutel: string) => void;
}) {
  const actief = sortering?.sleutel === sleutel;
  return (
    <th
      scope="col"
      aria-sort={actief ? (sortering.richting === "op" ? "ascending" : "descending") : undefined}
      className={getal ? "text-right" : undefined}
    >
      <button
        type="button"
        title={uitleg}
        onClick={() => onSorteer(sleutel)}
        className={`inline-flex items-center gap-1 whitespace-nowrap ${getal ? "flex-row-reverse" : ""}`}
      >
        {label}
        {actief && <Icon naam={sortering.richting === "op" ? "omhoog" : "omlaag"} size={12} />}
      </button>
    </th>
  );
}

function Cel({ kolom, rij, nu }: { kolom: Kolom; rij: KlantRij; nu: Date }) {
  const tekst = kolom.tekst(rij, nu);
  const bijschrift = kolom.bijschrift?.(rij, nu) ?? "";
  const verschil = kolom.verschil?.(rij) ?? null;
  const toon = kolom.toon?.(rij) ?? null;

  return (
    <td className={kolom.getal ? "text-right tabular" : undefined}>
      <div className={`flex flex-col gap-0.5 ${kolom.getal ? "items-end" : "items-start"}`}>
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          {tekst === "" ? (
            <span className="text-muted" aria-label="Onbekend" title="Onbekend">
              <Icon naam="nvt" size={14} />
            </span>
          ) : toon ? (
            <span className={TOON_CHIP[toon]}>{tekst}</span>
          ) : (
            tekst
          )}
          {verschil && (
            <span
              className={
                verschil.richting === "omhoog"
                  ? "chip chip-stijging"
                  : verschil.richting === "omlaag"
                    ? "chip chip-daling"
                    : "text-xs text-muted"
              }
            >
              {verschil.tekst}
            </span>
          )}
        </span>
        {bijschrift && (
          <span className="max-w-[16rem] truncate text-xs text-muted" title={bijschrift}>
            {bijschrift}
          </span>
        )}
      </div>
    </td>
  );
}
