"use client";

import { useMemo, useState } from "react";
import { zoekCliches } from "@/lib/solliciteren/cliches";
import { isGeldigModel, vindModel } from "@/lib/solliciteren/modellen";

/**
 * Eén bericht in het gesprek.
 *
 * ── DE TEKST WORDT NIET OPGEMAAKT ──────────────────────────────────────────
 *
 * Geen markdown-omzetting. Een sollicitatiebrief gaat straks in een tekstvak of
 * een e-mail, en dan is wat hier op het scherm staat precies wat je plakt. Een
 * brief die er hier mooier uitziet dan na het kopiëren, is een brief die je twee
 * keer moet opmaken.
 *
 * ── DE CLICHÉ-STROOK ───────────────────────────────────────────────────────
 *
 * Het vangnet onder de promptinstructie "geen AI-taal" (conventie 1). De
 * instructie staat in `lib/solliciteren/prompt.ts`, de telling in
 * `lib/solliciteren/cliches.ts`, en wat eruit komt staat hieronder. Er wordt
 * niets weggehaald: of "met veel enthousiasme" in jouw brief een cliché is of
 * gewoon waar, bepaal jij.
 */
export function Bericht({
  rol,
  inhoud,
  model,
  stand,
  kosten,
  fout,
  bezig,
}: {
  rol: "gebruiker" | "assistent";
  inhoud: string;
  model: string | null;
  stand: string | null;
  kosten: number | null;
  fout: string | null;
  /** Staat dit antwoord nog te komen? Dan geen telling, die is dan nog niet af. */
  bezig?: boolean;
}) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const cliches = useMemo(
    () => (rol === "assistent" && !bezig ? zoekCliches(inhoud) : []),
    [rol, inhoud, bezig],
  );
  const woorden = useMemo(
    () => (inhoud.trim() ? inhoud.trim().split(/\s+/).length : 0),
    [inhoud],
  );

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(inhoud);
      setGekopieerd(true);
      window.setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      // Zonder rechten op het klembord (of zonder https) lukt dit niet. Dan is
      // selecteren en zelf kopiëren de uitweg, en een foutmelding daarover
      // helpt niemand verder.
    }
  }

  const modelnaam =
    model && isGeldigModel(model) ? vindModel(model).naam.split(",")[0] : (model ?? null);

  return (
    <article className={`sol-bericht sol-bericht--${rol}`}>
      <header className="sol-bericht__kop">
        <span className="sol-bericht__wie">{rol === "gebruiker" ? "Jij" : "Assistent"}</span>
        {modelnaam ? (
          <span className="sol-bericht__meta">
            {modelnaam}
            {stand ? `, redeneerstand ${stand}` : ""}
            {typeof kosten === "number" && kosten > 0
              ? `, ${(kosten * 100).toFixed(2).replace(".", ",")} dollarcent`
              : ""}
          </span>
        ) : null}
      </header>

      {fout ? (
        <p className="sol-fout">Dit antwoord is niet gelukt. Reden: {fout}</p>
      ) : (
        <div className="sol-bericht__tekst">{inhoud}</div>
      )}

      {rol === "assistent" && !bezig && inhoud ? (
        <footer className="sol-bericht__voet">
          <button type="button" className="sol-knop sol-knop--stil" onClick={kopieer}>
            {gekopieerd ? "Gekopieerd" : "Kopieer"}
          </button>
          <span className="sol-bericht__meta">{woorden} woorden</span>
          {cliches.length === 0 ? (
            <span className="sol-bericht__meta sol-bericht__meta--goed">Geen standaardzinnen</span>
          ) : (
            <span className="sol-bericht__meta sol-bericht__meta--let-op">
              {cliches.length === 1 ? "1 standaardzin" : `${cliches.length} standaardzinnen`}
            </span>
          )}
        </footer>
      ) : null}

      {cliches.length > 0 ? (
        <ul className="sol-cliches">
          {cliches.slice(0, 4).map((vondst) => (
            <li key={vondst.gevonden}>
              <strong>{vondst.gevonden}</strong>
              {vondst.aantal > 1 ? ` (${vondst.aantal}x)` : ""}: {vondst.waarom}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
