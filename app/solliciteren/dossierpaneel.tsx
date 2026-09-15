"use client";

import { useRef, useState } from "react";
import {
  MAX_DOCUMENT_TEKENS,
  SOORTEN,
  sorteerDossier,
  vindSoort,
} from "@/lib/solliciteren/dossier";
import type { SollicitatieDocument, SollicitatieDocumentSoort } from "@/lib/types/database";

/**
 * Jouw dossier: CV, eerdere brieven, motivaties en projecten.
 *
 * ── DIT STAAT LOS VAN HET GESPREK ──────────────────────────────────────────
 *
 * Sinds migratie 0096 hangt dit materiaal aan jou en niet aan één vacature. Je
 * zet het één keer klaar en het blijft staan. Dat is de hele reden dat een
 * tweede sollicitatie nog maar één handeling kost: vacature plakken.
 *
 * ── HET SOORT IS GEEN KOPJE ────────────────────────────────────────────────
 *
 * "Eerdere brief" is het materiaal waar je schrijfstijl aan gemeten wordt, "CV"
 * en "project" leveren de feiten. Vandaar dat het soort verplicht is en niet af
 * te leiden uit de titel.
 */
export function Dossierpaneel({
  documenten,
  bezig,
  onOpslaan,
  onVerwijderen,
}: {
  documenten: SollicitatieDocument[];
  bezig: boolean;
  /** Zonder id is het een nieuw stuk. */
  onOpslaan: (stuk: {
    id: string | null;
    soort: SollicitatieDocumentSoort;
    titel: string;
    inhoud: string;
  }) => Promise<boolean>;
  onVerwijderen: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [soort, setSoort] = useState<SollicitatieDocumentSoort>("cv");
  const [titel, setTitel] = useState("");
  const [inhoud, setInhoud] = useState("");
  const [inlezen, setInlezen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const bestandKiezer = useRef<HTMLInputElement | null>(null);

  const gesorteerd = sorteerDossier(
    documenten.map((d) => ({ id: d.id, soort: d.soort, titel: d.titel, inhoud: d.inhoud })),
  );

  function beginNieuw() {
    setOpen("nieuw");
    setSoort(documenten.some((d) => d.soort === "cv") ? "brief" : "cv");
    setTitel("");
    setInhoud("");
    setFout(null);
  }

  function beginBewerken(document: SollicitatieDocument) {
    setOpen(document.id);
    setSoort(document.soort);
    setTitel(document.titel);
    setInhoud(document.inhoud);
    setFout(null);
  }

  async function bewaar() {
    if (!titel.trim()) {
      setFout("Geef dit stuk een naam, dan vind je het later terug.");
      return;
    }
    const gelukt = await onOpslaan({
      id: open === "nieuw" ? null : open,
      soort,
      titel,
      inhoud,
    });
    if (gelukt) setOpen(null);
    else setFout("Het opslaan is niet gelukt.");
  }

  /**
   * Een bestand inlezen zet de tekst in het VELD en slaat niets op. Een PDF die
   * half goed uitleest hoor je te zien voordat hij in je dossier staat.
   */
  async function leesBestand(bestand: File) {
    setInlezen(true);
    setFout(null);
    try {
      const formulier = new FormData();
      formulier.append("bestand", bestand);
      const res = await fetch("/api/solliciteren/documenten/inlezen", {
        method: "POST",
        body: formulier,
      });
      const data = (await res.json()) as { tekst?: string; naam?: string; error?: string };
      if (!res.ok || typeof data.tekst !== "string") {
        setFout(data.error ?? "Dit bestand liet zich niet lezen.");
        return;
      }
      setInhoud(data.tekst);
      if (!titel.trim() && data.naam) setTitel(data.naam.replace(/\.[^.]+$/, ""));
    } catch {
      setFout("De verbinding viel weg tijdens het inlezen.");
    } finally {
      setInlezen(false);
      if (bestandKiezer.current) bestandKiezer.current.value = "";
    }
  }

  return (
    <section className="sol-kaart sol-paneel">
      <div className="sol-paneel__kop">
        <h2 className="sol-kaart__titel">Jouw dossier</h2>
        <button
          type="button"
          className="sol-knop sol-knop--klein"
          onClick={beginNieuw}
          disabled={bezig}
        >
          Stuk toevoegen
        </button>
      </div>
      <p className="sol-kaart__tekst sol-kaart__tekst--klein">
        Dit staat los van een vacature en blijft staan. Eén keer klaarzetten, daarna is een nieuwe
        brief alleen nog de vacature plakken.
      </p>

      {gesorteerd.length === 0 && open === null ? (
        <p className="sol-veld__teller">
          Nog leeg. Begin met je CV en een paar eerdere brieven, dan heeft de assistent je feiten en
          je schrijfstijl.
        </p>
      ) : null}

      <ul className="sol-stukken">
        {gesorteerd.map((stuk) => {
          const document = documenten.find((d) => d.id === stuk.id);
          if (!document) return null;
          return (
            <li key={stuk.id} className="sol-stuk">
              {/* De hele regel opent de bewerker. Twee knoppen ernaast pasten
                  niet naast een lange titel in deze kolom, en "bewerken" is wat
                  je hier vrijwel altijd wilt. Weggooien blijft een eigen knop,
                  want dat wil je nooit per ongeluk. */}
              <button
                type="button"
                className="sol-stuk__regel"
                onClick={() => beginBewerken(document)}
                disabled={bezig}
              >
                <span className="sol-stuk__soort">{vindSoort(stuk.soort).naam}</span>
                <span className="sol-stuk__titel">{stuk.titel}</span>
                {/* Het aantal tekens staat er alleen als het iets betekent. Bij
                    elk stuk een getal zetten duwde lange titels naar een tweede
                    regel, en "351 tekens" vertelt je niets wat je wilt weten.
                    "Leeg" wel: dat is een stuk dat niets bijdraagt. */}
                {stuk.inhoud.length === 0 ? (
                  <span className="sol-bericht__meta sol-bericht__meta--let-op">leeg</span>
                ) : null}
              </button>
              <button
                type="button"
                className="sol-stuk__weg"
                onClick={() => {
                  if (window.confirm(`"${stuk.titel}" uit je dossier halen?`)) {
                    void onVerwijderen(stuk.id);
                  }
                }}
                disabled={bezig}
                aria-label={`"${stuk.titel}" uit je dossier halen`}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      {open !== null ? (
        <div className="sol-opsteller">
          <div className="sol-keuzes">
            <div className="sol-veld">
              <label className="sol-veld__label" htmlFor="sol-soort">
                Wat voor stuk is dit?
              </label>
              <select
                id="sol-soort"
                className="sol-invoer"
                value={soort}
                onChange={(e) => setSoort(e.target.value as SollicitatieDocumentSoort)}
              >
                {SOORTEN.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.naam}
                  </option>
                ))}
              </select>
              <p className="sol-veld__uitleg">{vindSoort(soort).waarvoor}</p>
            </div>

            <div className="sol-veld">
              <label className="sol-veld__label" htmlFor="sol-titel">
                Naam
              </label>
              <input
                id="sol-titel"
                className="sol-invoer"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="CV 2026, of Brief gemeente Utrecht"
              />
              <p className="sol-veld__uitleg">Alleen voor jezelf, om het terug te vinden.</p>
            </div>
          </div>

          <div className="sol-veld">
            <label className="sol-veld__label" htmlFor="sol-inhoud">
              De tekst
            </label>
            <textarea
              id="sol-inhoud"
              className="sol-invoer sol-invoer--tekstvak"
              rows={10}
              value={inhoud}
              maxLength={MAX_DOCUMENT_TEKENS}
              onChange={(e) => setInhoud(e.target.value)}
              placeholder="Plak hier je tekst, of lees een bestand in"
            />
            <p className="sol-veld__teller">
              {inhoud.length === 0 ? "nog leeg" : `${inhoud.length.toLocaleString("nl-NL")} tekens`}
            </p>
          </div>

          <div className="sol-opsteller__voet">
            <button type="button" className="sol-knop" onClick={bewaar} disabled={bezig || inlezen}>
              Opslaan
            </button>
            <button
              type="button"
              className="sol-knop sol-knop--stil"
              onClick={() => bestandKiezer.current?.click()}
              disabled={bezig || inlezen}
            >
              {inlezen ? "Bezig met inlezen" : "Lees een bestand in"}
            </button>
            <button
              type="button"
              className="sol-knop sol-knop--stil"
              onClick={() => setOpen(null)}
              disabled={bezig || inlezen}
            >
              Annuleer
            </button>
            <input
              ref={bestandKiezer}
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              hidden
              onChange={(e) => {
                const bestand = e.target.files?.[0];
                if (bestand) void leesBestand(bestand);
              }}
            />
          </div>
          <p className="sol-veld__teller">
            Een PDF of een tekstbestand wordt ingelezen in het veld hierboven, en pas opgeslagen als
            je op Opslaan drukt. Een gescande PDF is een plaatje en levert geen tekst op.
          </p>
        </div>
      ) : null}

      {fout ? <p className="sol-fout">{fout}</p> : null}
    </section>
  );
}
