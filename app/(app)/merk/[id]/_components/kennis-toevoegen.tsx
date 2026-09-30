"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogKnoppen } from "@/components/dialog";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import { Icon } from "@/components/icon";
import type { UserFacingError } from "@/lib/errors";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_CHARS, MIN_UPLOAD_CHARS } from "@/lib/kennis/upload-grenzen";
import type { UploadTelling } from "@/lib/kennis/upload-verify";

type Uitkomst = (UploadTelling & { weggelaten: number }) | { alAangeleverd: true };

/**
 * De knop rechtsboven op "Feiten en kennis" en het venster erachter (30 september 2026).
 *
 * De klant en de consultant maken het systeem hiermee snel slimmer: een document
 * uploaden, tekst plakken, of allebei. ORBIT ENGINE leest het materiaal en zet
 * feiten, kennis en vermoedens in de tabel, met als bron "Handmatige upload". Wat er
 * letterlijk staat gebruikt het bij het schrijven; een vermoeden pas nadat het
 * bevestigd is (`magInBlokA()`). De controle daarop staat in code
 * (`controleerUpload()`), niet in de prompt.
 *
 * `alleenLezen` is de klant: die kan toevoegen maar niet bevestigen, en de tekst
 * zegt daarom wie een vermoeden bevestigt.
 */
export function KennisToevoegen({ profileId, alleenLezen = false }: { profileId: string; alleenLezen?: boolean }) {
  const router = useRouter();
  const kiezer = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [bestand, setBestand] = useState<File | null>(null);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [meldingBestand, setMeldingBestand] = useState<string | null>(null);
  const [probleem, setProbleem] = useState<UserFacingError | null>(null);
  const [uitkomst, setUitkomst] = useState<Uitkomst | null>(null);

  const kanVerwerken = !bezig && (bestand !== null || tekst.trim().length >= MIN_UPLOAD_CHARS);
  const tekens = tekst.trim().length;

  function reset() {
    setBestand(null);
    setTekst("");
    setMeldingBestand(null);
    setProbleem(null);
    setUitkomst(null);
    if (kiezer.current) kiezer.current.value = "";
  }

  function sluit() {
    setOpen(false);
    reset();
  }

  function kiesBestand(gekozen: File | undefined) {
    setMeldingBestand(null);
    if (!gekozen) return;
    if (gekozen.size > MAX_UPLOAD_BYTES) {
      setBestand(null);
      setMeldingBestand("Dit bestand is groter dan 4 MB. Kies een kleiner bestand of plak de tekst.");
      if (kiezer.current) kiezer.current.value = "";
      return;
    }
    setBestand(gekozen);
  }

  async function verwerk() {
    setBezig(true);
    setProbleem(null);
    try {
      const body = new FormData();
      if (bestand) body.append("bestand", bestand);
      if (tekst.trim()) body.append("tekst", tekst.trim());
      const res = await fetch(`/api/profiles/${profileId}/kennis/upload`, { method: "POST", body });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setProbleem(problemFromResponse(json));
        return;
      }
      setUitkomst(json as Uitkomst);
      router.refresh();
    } catch (err) {
      setProbleem(networkProblem(err));
    } finally {
      setBezig(false);
    }
  }

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <Icon naam="toevoegen" size={16} />
        Kennis toevoegen
      </button>

      {open && (
        <Dialog label="Kennis toevoegen" onSluit={sluit} bezig={bezig} className="max-w-xl">
          <div className="flex flex-col gap-1">
            <h2 className="type-title">Kennis toevoegen</h2>
            <p className="type-compact text-[var(--text-tertiary)]">
              Upload een document of plak tekst over het bedrijf. ORBIT ENGINE leest het en zet er feiten, kennis en vermoedens
              uit in de tabel, met als bron Handmatige upload.
            </p>
          </div>

          {uitkomst ? (
            <Resultaat uitkomst={uitkomst} alleenLezen={alleenLezen} />
          ) : (
            <>
              {probleem && <ErrorNotice error={probleem} />}

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Document</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-outline btn-sm" disabled={bezig} onClick={() => kiezer.current?.click()}>
                    {bestand ? "Ander bestand kiezen" : "Bestand kiezen"}
                  </button>
                  {bestand ? (
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <span className="truncate">{bestand.name}</span>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        disabled={bezig}
                        onClick={() => {
                          setBestand(null);
                          if (kiezer.current) kiezer.current.value = "";
                        }}
                      >
                        Weghalen
                      </button>
                    </span>
                  ) : (
                    <span className="text-sm text-muted">PDF, TXT of MD, tot 4 MB</span>
                  )}
                </div>
                <input
                  ref={kiezer}
                  type="file"
                  hidden
                  accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                  onChange={(e) => kiesBestand(e.target.files?.[0])}
                />
                {meldingBestand && <p className="text-sm text-[var(--intent-danger-content)]">{meldingBestand}</p>}
                <p className="text-xs text-muted">Een Word-bestand nog niet: sla het op als PDF of plak de tekst. Een gescande PDF is een plaatje en levert geen tekst op.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="kennis-tekst" className="text-sm font-medium">
                  Of plak informatie
                </label>
                <textarea
                  id="kennis-tekst"
                  className="field min-h-36 text-sm"
                  placeholder="Plak hier bijvoorbeeld een offerte, een brochure, de aantekeningen van een gesprek of een lijst met veelgestelde vragen."
                  value={tekst}
                  disabled={bezig}
                  maxLength={MAX_UPLOAD_CHARS}
                  onChange={(e) => setTekst(e.target.value)}
                />
                <p className="text-xs text-muted">
                  {tekens === 0
                    ? `Tot ${MAX_UPLOAD_CHARS.toLocaleString("nl-NL")} tekens. Bij een document en tekst samen telt alles mee.`
                    : `${tekens.toLocaleString("nl-NL")} tekens`}
                </p>
              </div>

              <p className="text-xs text-secondary">
                Wat er letterlijk in het materiaal staat gebruikt ORBIT ENGINE vanaf nu bij het schrijven. Wat het er alleen uit
                afleidt is een vermoeden en wordt pas gebruikt nadat {alleenLezen ? "je consultant" : "je"} het bevestigt.
              </p>
            </>
          )}

          <DialogKnoppen>
            {uitkomst ? (
              <>
                <button type="button" className="btn-ghost" onClick={reset}>
                  Nog iets toevoegen
                </button>
                <button type="button" className="btn-primary" onClick={sluit}>
                  Klaar
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-ghost" disabled={bezig} onClick={sluit}>
                  Annuleren
                </button>
                <button type="button" className="btn-primary" disabled={!kanVerwerken} onClick={() => void verwerk()}>
                  {bezig ? "ORBIT ENGINE leest…" : "Lezen en toevoegen"}
                </button>
              </>
            )}
          </DialogKnoppen>
        </Dialog>
      )}
    </>
  );
}

function Resultaat({ uitkomst, alleenLezen }: { uitkomst: Uitkomst; alleenLezen: boolean }) {
  if ("alAangeleverd" in uitkomst) {
    return (
      <p className="text-sm">
        Dit materiaal is al eerder aangeleverd, dus wat erin staat zit al in de tabel. Je hoeft niets te doen.
      </p>
    );
  }
  const { feiten, kennis, vermoedens, alBekend, weggelaten, geweigerd } = uitkomst;
  const nieuw = feiten + kennis + vermoedens;
  const regels: string[] = [];
  if (feiten > 0) regels.push(`${feiten} ${feiten === 1 ? "feit" : "feiten"}`);
  if (kennis > 0) regels.push(`${kennis} ${kennis === 1 ? "stuk kennis" : "stukken kennis"}`);
  if (vermoedens > 0) regels.push(`${vermoedens} ${vermoedens === 1 ? "vermoeden" : "vermoedens"}`);

  return (
    <div className="flex flex-col gap-2 text-sm">
      {nieuw > 0 ? (
        <>
          <p>
            Toegevoegd met als bron Handmatige upload: <strong>{regels.join(", ")}</strong>. Je ziet ze bovenaan de tabel.
          </p>
          {feiten + kennis > 0 && <p className="text-secondary">Wat er letterlijk in het materiaal stond, gebruikt ORBIT ENGINE vanaf nu bij het schrijven.</p>}
          {vermoedens > 0 && (
            <p className="text-secondary">
              {vermoedens === 1 ? "Het vermoeden wordt" : "De vermoedens worden"} pas gebruikt nadat {alleenLezen ? "je consultant" : "je"}{" "}
              {vermoedens === 1 ? "het" : "ze"} bevestigt.
            </p>
          )}
        </>
      ) : (
        <p>
          Hier kwam niets nieuws uit.{" "}
          {alBekend > 0
            ? "Wat erin staat, zat al in de tabel."
            : "Dat gebeurt bij sfeerteksten: er staat niets in dat ORBIT ENGINE als gegeven kan gebruiken. Probeer een offerte, een brochure of gespreksaantekeningen."}
        </p>
      )}
      {nieuw > 0 && alBekend > 0 && <p className="text-secondary">{alBekend} {alBekend === 1 ? "gegeven zat" : "gegevens zaten"} er al en {alBekend === 1 ? "is" : "zijn"} niet dubbel toegevoegd.</p>}
      {weggelaten > 0 && (
        <p className="text-secondary">
          {weggelaten} {weggelaten === 1 ? "voorstel is" : "voorstellen zijn"} weggelaten omdat {weggelaten === 1 ? "het" : "ze"} niet klopten met de tekst, bijvoorbeeld een
          bedrag dat er zo niet stond.
        </p>
      )}
      {geweigerd > 0 && <p className="text-secondary">{geweigerd} {geweigerd === 1 ? "gegeven kon" : "gegevens konden"} niet worden opgeslagen.</p>}
    </div>
  );
}
