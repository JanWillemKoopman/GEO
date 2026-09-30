"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogKnoppen } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { CONTENT_TYPES } from "@/lib/plan-writing";
import { SOORTEN } from "@/lib/pagina/soorten";
import { schoneDoelvragen, voorgesteldeMaand, type MaandVoorIdee } from "@/lib/pagina-idee";
import type { ContentType } from "@/lib/types/database";
import { GEEN_VERBINDING } from "@/lib/meldingen";

/**
 * NIEUW PAGINA-IDEE (30 september 2026): het venster waarmee de consultant zelf
 * een pagina-idee toevoegt, in de bibliotheek en op het bord van het contentplan.
 *
 * Vervangt het formulier "Handmatige kans" dat als klein knopje boven de
 * voorraad stond: zes velden onder elkaar, een keuzelijst waarin je met Ctrl
 * meer moest kiezen, en niets dat zei waarom je een veld invulde. Nu drie vragen
 * die elk één zin uitleg hebben, de soort als tegels in plaats van een
 * uitklaplijst met vakwoorden, en wat je meestal niet nodig hebt onder "Meer
 * opties". Onderaan meteen de maand, met een voorstel (`voorgesteldeMaand()`),
 * zodat je voor één los idee niet naar het bord hoeft om te slepen.
 *
 * Alleen voor de consultant: de route (`/api/profiles/[id]/kansen/handmatig`)
 * is van de beheerder (N5), en een knop die na de klik weigert is erger dan
 * geen knop.
 */
export interface KennisOptie {
  id: string;
  soort: string;
  bewering: string;
}

const MAX_DOELVRAGEN = 8;
const IDEEENLIJST = "";

export function NieuwPaginaIdee({
  profileId,
  kennisOpties,
  maanden,
  perMaand,
  knop = "primair",
}: {
  profileId: string;
  kennisOpties: KennisOptie[];
  /** De maanden van het plan; leeg als er (nog) geen plan is. */
  maanden: MaandVoorIdee[];
  perMaand: number;
  /** Hoe de knop eruitziet: de hoofdknop van een scherm, of rustig in een lijst. */
  knop?: "primair" | "rustig";
}) {
  const router = useRouter();
  const toast = useToast();
  const voorstel = useMemo(() => voorgesteldeMaand(maanden, perMaand), [maanden, perMaand]);
  const kiesbaar = maanden.filter((m) => !m.voorbij);

  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [titel, setTitel] = useState("");
  const [soort, setSoort] = useState<ContentType | null>(null);
  const [doelvragen, setDoelvragen] = useState<string[]>([""]);
  const [lezer, setLezer] = useState("");
  const [verbeteren, setVerbeteren] = useState(false);
  const [adres, setAdres] = useState("");
  const [geldtVoor, setGeldtVoor] = useState<string[]>([]);
  const [maandId, setMaandId] = useState<string>(voorstel?.id ?? IDEEENLIJST);
  const [fout, setFout] = useState<string | null>(null);

  function begin() {
    setTitel("");
    setSoort(null);
    setDoelvragen([""]);
    setLezer("");
    setVerbeteren(false);
    setAdres("");
    setGeldtVoor([]);
    setMaandId(voorstel?.id ?? IDEEENLIJST);
    setFout(null);
    setOpen(true);
  }

  async function toevoegen() {
    if (!titel.trim()) return setFout("Vul in waar de pagina over gaat.");
    if (!soort) return setFout("Kies wat voor pagina het wordt.");
    if (verbeteren && !adres.trim()) return setFout("Vul het adres in van de pagina die beter moet.");
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}/kansen/handmatig`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel,
          lezer: lezer.trim() || null,
          handeling: verbeteren ? "pagina_verbeteren" : "nieuwe_pagina",
          bestaandeUrl: verbeteren ? adres : null,
          geldtVoor,
          doelvragen: schoneDoelvragen(doelvragen),
          contentType: soort,
          maandId: maandId || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; ingepland?: boolean; melding?: string };
      if (!res.ok || !data.ok) {
        setFout(data.error ?? "Toevoegen is niet gelukt. Probeer het opnieuw.");
        return;
      }
      const maand = maanden.find((m) => m.id === maandId);
      toast({
        title: "Pagina-idee toegevoegd",
        description: data.ingepland && maand
          ? `Staat in ${maand.titel}. Zodra die maand gestart is, zet ORBIT ENGINE de vragen voor deze pagina klaar onder Openstaande vragen.`
          : data.melding
            ? `Staat in de ideeënlijst van het contentplan. Inplannen lukte niet: ${data.melding}`
            : "Staat in de ideeënlijst van het contentplan. Plan het in wanneer je wilt.",
      });
      setOpen(false);
      router.refresh();
    } catch {
      setFout(GEEN_VERBINDING);
    } finally {
      setBezig(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={knop === "primair" ? "btn-actie" : "btn-outline btn-sm"}
        onClick={begin}
      >
        Nieuw pagina-idee
      </button>

      {open && (
        <Dialog label="Nieuw pagina-idee" onSluit={() => setOpen(false)} bezig={bezig} className="max-w-xl">
          <div className="flex flex-col gap-1">
            <h2 className="type-title">Nieuw pagina-idee</h2>
            <p className="text-sm text-secondary">
              Voor een pagina die de meting niet vond. Hij krijgt het label &quot;Idee van je consultant&quot;.
            </p>
          </div>

          <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1">
            {/* ── 1. Het onderwerp ─────────────────────────────────────────── */}
            <Vraag nummer={1} titel="Waar gaat de pagina over?" kopId="idee-titel-kop" voor="idee-titel">
              <input
                id="idee-titel"
                className="field"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="Bijvoorbeeld: Wat kost dakisolatie in Tilburg?"
                autoFocus
              />
            </Vraag>

            {/* ── 2. De soort, als tegels ──────────────────────────────────── */}
            <Vraag nummer={2} titel="Wat voor pagina wordt het?" kopId="idee-soort-kop">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-labelledby="idee-soort-kop">
                {CONTENT_TYPES.map((t) => {
                  const gekozen = soort === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={gekozen}
                      onClick={() => setSoort(t)}
                      className="flex flex-col items-start gap-0.5 rounded-md border px-3 py-2.5 text-left transition-colors hover:bg-[var(--interactive-hover)]"
                      style={{
                        borderColor: gekozen ? "var(--border-selected)" : "var(--border-subtle)",
                        boxShadow: gekozen ? "0 0 0 1px var(--border-selected)" : undefined,
                        background: gekozen ? "var(--interactive-hover)" : undefined,
                      }}
                    >
                      <span className="text-sm font-medium">{SOORTEN[t].keuze}</span>
                      <span className="text-xs text-secondary">{SOORTEN[t].uitleg}</span>
                    </button>
                  );
                })}
              </div>
            </Vraag>

            {/* ── 3. De vragen van mensen ──────────────────────────────────── */}
            <Vraag
              nummer={3}
              titel="Welke vragen stellen mensen hierover?"
              kopId="idee-vragen-kop"
              uitleg="ORBIT ENGINE gebruikt deze vragen bij het voorbereiden en schrijven van de pagina. Bij een artikel, gids, FAQ of vergelijking zoekt hij ze ook op in Google."
            >
              <div className="flex flex-col gap-2">
                {doelvragen.map((v, i) => (
                  <input
                    key={i}
                    className="field"
                    aria-label={`Vraag ${i + 1}`}
                    value={v}
                    onChange={(e) => setDoelvragen((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={i === 0 ? "Bijvoorbeeld: Hoeveel kost dakisolatie per vierkante meter?" : "Nog een vraag"}
                  />
                ))}
                {doelvragen.length < MAX_DOELVRAGEN && (
                  <button
                    type="button"
                    className="w-fit text-sm text-secondary hover:underline"
                    onClick={() => setDoelvragen((l) => [...l, ""])}
                  >
                    + Nog een vraag
                  </button>
                )}
              </div>
            </Vraag>

            {/* ── Meer opties: wat je meestal niet nodig hebt ─────────────── */}
            <details className="text-sm">
              <summary className="cursor-pointer select-none text-secondary hover:underline">
                Meer opties: een bestaande pagina verbeteren, voor wie, welke dienst
              </summary>
              <div className="mt-3 flex flex-col gap-4">
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={verbeteren} onChange={(e) => setVerbeteren(e.target.checked)} className="mt-1" />
                  <span>Dit is een bestaande pagina die beter moet</span>
                </label>
                {verbeteren && (
                  <input
                    className="field"
                    aria-label="Adres van de bestaande pagina"
                    value={adres}
                    onChange={(e) => setAdres(e.target.value)}
                    placeholder="https://www.voorbeeld.nl/dakisolatie"
                  />
                )}
                <div className="flex flex-col gap-1">
                  <label htmlFor="idee-lezer" className="font-medium">Voor wie is de pagina?</label>
                  <input
                    id="idee-lezer"
                    className="field"
                    value={lezer}
                    onChange={(e) => setLezer(e.target.value)}
                    placeholder="Bijvoorbeeld: iemand die wil weten wat dakisolatie kost"
                  />
                </div>
                {kennisOpties.length > 0 && (
                  <fieldset className="flex flex-col gap-1.5">
                    <legend className="mb-1 font-medium">Over welke dienst of welk werkgebied gaat het?</legend>
                    <span className="text-xs text-secondary">
                      ORBIT ENGINE schrijft dan met wat het over die dienst of dat gebied weet.
                    </span>
                    {kennisOpties.map((k) => (
                      <label key={k.id} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={geldtVoor.includes(k.id)}
                          onChange={(e) =>
                            setGeldtVoor((l) => (e.target.checked ? [...l, k.id] : l.filter((x) => x !== k.id)))
                          }
                        />
                        <span>
                          <span className="text-muted">{k.soort === "dienst" ? "Dienst" : "Werkgebied"}:</span> {k.bewering}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                )}
              </div>
            </details>

            {/* ── Wanneer ──────────────────────────────────────────────────── */}
            {kiesbaar.length > 0 && (
              <div className="flex flex-col gap-1">
                <label htmlFor="idee-maand" className="text-sm font-medium">Wanneer moet hij geschreven worden?</label>
                <select id="idee-maand" className="field field-select" value={maandId} onChange={(e) => setMaandId(e.target.value)}>
                  {kiesbaar.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.titel}
                      {m.id === voorstel?.id ? " (voorgesteld)" : m.aantal >= perMaand ? " (al vol)" : ""}
                    </option>
                  ))}
                  <option value={IDEEENLIJST}>Nog niet inplannen, zet het in de ideeënlijst</option>
                </select>
              </div>
            )}
          </div>

          {fout && (
            <p className="text-sm" role="alert" style={{ color: "var(--intent-danger-content)" }}>
              {fout}
            </p>
          )}

          <DialogKnoppen>
            <button type="button" className="btn-outline" onClick={() => setOpen(false)} disabled={bezig}>
              Annuleren
            </button>
            <button type="button" className="btn-primary" onClick={() => void toevoegen()} disabled={bezig}>
              {bezig ? "Bezig met toevoegen" : "Toevoegen"}
            </button>
          </DialogKnoppen>
        </Dialog>
      )}
    </>
  );
}

function Vraag({
  nummer,
  titel,
  kopId,
  voor,
  uitleg,
  children,
}: {
  nummer: number;
  titel: string;
  /** Het id van de kop, voor een groep die ernaar verwijst. */
  kopId: string;
  /** Het id van het ene invulveld onder deze vraag, als dat er is. */
  voor?: string;
  uitleg?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="mono-label">{nummer}</span>
        {voor ? (
          <label htmlFor={voor} id={kopId} className="text-sm font-medium">
            {titel}
          </label>
        ) : (
          <span id={kopId} className="text-sm font-medium">
            {titel}
          </span>
        )}
      </div>
      {uitleg && <p className="-mt-1 text-xs text-secondary">{uitleg}</p>}
      {children}
    </div>
  );
}
