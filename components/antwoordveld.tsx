"use client";

import { vraagVorm, type VraagBron } from "@/lib/feitenvraag";

/**
 * Het invoerveld bij één feitenvraag.
 *
 * ── WAAROM DIT EEN GEDEELD COMPONENT IS ─────────────────────────────────────
 *
 * Dezelfde rij uit `fact_requests` werd op twee schermen getoond met twee
 * verschillende invoervelden: de briefing tekende een ja-of-nee-keuze, een
 * bedragveld of een keuzelijst, en de vragenlijst op "Openstaande vragen"
 * tekende voor élke vraag hetzelfde tekstvak van drie regels. Een vraag die met
 * één klik te beantwoorden was, kostte daar dus een getypt antwoord.
 *
 * Welke vorm bij welke vraag hoort staat in `lib/feitenvraag.ts`, puur en
 * getest; dit component tekent alleen wat daar uitkomt.
 */
export function Antwoordveld({
  id,
  vraag,
  waarde,
  zetWaarde,
  uitgeschakeld = false,
}: {
  /** Het id van het label, voor de koppeling met een schermlezer. */
  id: string;
  vraag: VraagBron;
  waarde: string;
  zetWaarde: (waarde: string) => void;
  uitgeschakeld?: boolean;
}) {
  const { vorm, keuzes, hint } = vraagVorm(vraag);

  if (vorm === "keuze") {
    return (
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={id}>
        {keuzes.map((optie) => {
          const gekozen = waarde === optie;
          return (
            <button
              key={optie}
              type="button"
              role="radio"
              aria-checked={gekozen}
              disabled={uitgeschakeld}
              className={gekozen ? "btn-primary btn-sm" : "btn-outline btn-sm"}
              onClick={() => zetWaarde(gekozen ? "" : optie)}
            >
              {optie}
            </button>
          );
        })}
      </div>
    );
  }

  if (vorm === "tekstvak") {
    return (
      <textarea
        id={id}
        className="field"
        rows={3}
        value={waarde}
        disabled={uitgeschakeld}
        onChange={(e) => zetWaarde(e.target.value)}
        placeholder={hint}
      />
    );
  }

  const type = vorm === "getal" ? "number" : vorm === "url" ? "url" : "text";
  return (
    <div className="flex items-center gap-2">
      {vorm === "bedrag" && <span aria-hidden>€</span>}
      <input
        id={id}
        type={type}
        inputMode={vorm === "bedrag" ? "decimal" : undefined}
        className="field flex-1"
        value={waarde}
        disabled={uitgeschakeld}
        onChange={(e) => zetWaarde(e.target.value)}
        placeholder={hint}
      />
    </div>
  );
}
