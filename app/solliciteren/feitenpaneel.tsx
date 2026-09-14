"use client";

import { useState } from "react";
import { CATEGORIEEN, refVan, vindCategorie, type Feitcategorie } from "@/lib/solliciteren/feiten";
import type { SollicitatieFeit } from "@/lib/types/database";

/**
 * De feitenkaart: de gesloten lijst van wat een brief over jou mag beweren.
 *
 * ── WAAROM DIT HET BELANGRIJKSTE PANEEL VAN DIT SCHERM IS ──────────────────
 *
 * Een dossier meegeven met "gebruik dit waar het past" is een uitnodiging, geen
 * grens. Precies daar waar een brief een concreet feit nodig heeft en het
 * materiaal het niet levert, vult een model het in. Deze kaart draait dat om:
 * alles wat er niet op staat, bestaat voor de brief niet, en elke zin in de
 * brief wijst naar het nummer waar hij op steunt.
 *
 * ── DE BRONZIN STAAT EROP, EN DAAROM IS DE KAART TE VERTROUWEN ─────────────
 *
 * Per feit staat de zin uit je dossier waar het uit komt. Code controleert dat
 * die zin er letterlijk in staat; of het feit ook klopt, zie jij in twee
 * seconden. Zonder die zin is een feit een bewering van een model over jou.
 */
export function Feitenpaneel({
  feiten,
  bezig,
  uitlezen,
  laatsteRonde,
  onUitlezen,
  onToevoegen,
  onWijzigen,
  onVerwijderen,
}: {
  feiten: SollicitatieFeit[];
  bezig: boolean;
  uitlezen: boolean;
  /** Wat de laatste uitleesronde opleverde, voor op het scherm. */
  laatsteRonde: { aangeleverd: number; aangenomen: number; behouden: number } | null;
  onUitlezen: () => void;
  onToevoegen: (feit: { categorie: Feitcategorie; tekst: string; periode: string }) => Promise<boolean>;
  onWijzigen: (id: string, feit: { tekst: string; periode: string }) => Promise<boolean>;
  onVerwijderen: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [categorie, setCategorie] = useState<Feitcategorie>("resultaat");
  const [tekst, setTekst] = useState("");
  const [periode, setPeriode] = useState("");
  const [toonBron, setToonBron] = useState<string | null>(null);

  function beginNieuw() {
    setOpen("nieuw");
    setCategorie("resultaat");
    setTekst("");
    setPeriode("");
  }

  function beginBewerken(feit: SollicitatieFeit) {
    setOpen(feit.id);
    setCategorie(feit.categorie);
    setTekst(feit.tekst);
    setPeriode(feit.periode ?? "");
  }

  async function bewaar() {
    const gelukt =
      open === "nieuw"
        ? await onToevoegen({ categorie, tekst, periode })
        : await onWijzigen(open as string, { tekst, periode });
    if (gelukt) setOpen(null);
  }

  return (
    <section className="sol-kaart sol-paneel">
      <div className="sol-paneel__kop">
        <h2 className="sol-kaart__titel">Je feitenkaart</h2>
        <span className="sol-bericht__meta">
          {feiten.length === 0
            ? "nog leeg"
            : `${feiten.length} ${feiten.length === 1 ? "feit" : "feiten"}`}
        </span>
      </div>
      <p className="sol-kaart__tekst sol-kaart__tekst--klein">
        Dit is alles wat een brief over je mag beweren. Staat het er niet op, dan komt het er niet
        in, ook niet als het in je dossier tussen de regels te lezen is.
      </p>

      <div className="sol-paneel__voet">
        <button type="button" className="sol-knop" onClick={onUitlezen} disabled={bezig || uitlezen}>
          {uitlezen ? "Bezig met uitlezen" : feiten.length === 0 ? "Lees mijn dossier uit" : "Lees opnieuw uit"}
        </button>
        <button
          type="button"
          className="sol-knop sol-knop--stil"
          onClick={beginNieuw}
          disabled={bezig || uitlezen}
        >
          Zelf een feit toevoegen
        </button>
      </div>

      {laatsteRonde ? (
        <p className="sol-veld__teller">
          Het model leverde {laatsteRonde.aangeleverd} feiten aan, waarvan er{" "}
          {laatsteRonde.aangenomen} een letterlijke bronzin in je dossier hadden. De rest is
          weggegooid.
          {laatsteRonde.behouden > 0
            ? ` Je ${laatsteRonde.behouden} eigen ${laatsteRonde.behouden === 1 ? "feit is" : "feiten zijn"} blijven staan.`
            : ""}
        </p>
      ) : null}

      {open !== null ? (
        <div className="sol-opsteller">
          {open === "nieuw" ? (
            <div className="sol-veld">
              <label className="sol-veld__label" htmlFor="sol-categorie">
                Wat voor feit is dit?
              </label>
              <select
                id="sol-categorie"
                className="sol-invoer"
                value={categorie}
                onChange={(e) => setCategorie(e.target.value as Feitcategorie)}
              >
                {CATEGORIEEN.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.naam}
                  </option>
                ))}
              </select>
              <p className="sol-veld__uitleg">{vindCategorie(categorie).waarvoor}</p>
            </div>
          ) : null}

          <div className="sol-veld">
            <label className="sol-veld__label" htmlFor="sol-feittekst">
              Het feit, in één zin
            </label>
            <textarea
              id="sol-feittekst"
              className="sol-invoer sol-invoer--tekstvak"
              rows={2}
              value={tekst}
              maxLength={500}
              onChange={(e) => setTekst(e.target.value)}
              placeholder="Bracht de doorlooptijd van offertes terug van negen naar vijf dagen"
            />
            <p className="sol-veld__uitleg">
              Zo concreet mogelijk. Een getal of een naam maakt een feit bruikbaar, een oordeel over
              jezelf niet.
            </p>
          </div>

          <div className="sol-veld">
            <label className="sol-veld__label" htmlFor="sol-periode">
              Periode
            </label>
            <input
              id="sol-periode"
              className="sol-invoer"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              placeholder="2019 tot 2026, of leeg laten"
            />
          </div>

          <div className="sol-opsteller__voet">
            <button type="button" className="sol-knop" onClick={bewaar} disabled={bezig || !tekst.trim()}>
              Opslaan
            </button>
            <button
              type="button"
              className="sol-knop sol-knop--stil"
              onClick={() => setOpen(null)}
              disabled={bezig}
            >
              Annuleer
            </button>
            <span className="sol-veld__teller">
              Wat je zelf zet of corrigeert, blijft staan bij een volgende uitleesronde.
            </span>
          </div>
        </div>
      ) : null}

      {CATEGORIEEN.map((groep) => {
        const rij = feiten.filter((f) => f.categorie === groep.id).sort((a, b) => a.nummer - b.nummer);
        if (rij.length === 0) return null;
        return (
          <div key={groep.id} className="sol-feitgroep">
            <h3 className="sol-feitgroep__titel">{groep.naam}</h3>
            <ul className="sol-feiten">
              {rij.map((feit) => (
                <li key={feit.id} className="sol-feit">
                  <span className="sol-feit__ref">{refVan(feit)}</span>
                  <div className="sol-feit__tekst">
                    <span>
                      {feit.tekst}
                      {feit.periode ? <span className="sol-bericht__meta"> ({feit.periode})</span> : null}
                      {feit.handmatig ? <span className="sol-feit__eigen">van jou</span> : null}
                    </span>
                    {toonBron === feit.id && feit.bronzin ? (
                      <q className="sol-feit__bron">{feit.bronzin}</q>
                    ) : null}
                  </div>
                  <div className="sol-stuk__knoppen">
                    {feit.bronzin ? (
                      <button
                        type="button"
                        className="sol-knop sol-knop--stil"
                        onClick={() => setToonBron(toonBron === feit.id ? null : feit.id)}
                      >
                        Bron
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="sol-knop sol-knop--stil"
                      onClick={() => beginBewerken(feit)}
                      disabled={bezig}
                    >
                      Bewerk
                    </button>
                    <button
                      type="button"
                      className="sol-knop sol-knop--stil"
                      onClick={() => {
                        if (window.confirm(`${refVan(feit)} van de kaart halen?`)) {
                          void onVerwijderen(feit.id);
                        }
                      }}
                      disabled={bezig}
                    >
                      Weg
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
