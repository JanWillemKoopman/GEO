"use client";

import { MAX_VACATURE_TEKENS } from "@/lib/solliciteren/prompt";

/**
 * De vacature. Het enige dat per gesprek verandert.
 *
 * ── WAAROM KOPPELEN EEN EIGEN HANDELING IS ─────────────────────────────────
 *
 * De tekst gaat bij ELK bericht opnieuw mee de aanroep in. Zou het vak bij elke
 * toetsaanslag opslaan, dan zou half geplakte tekst meteen meetellen in het
 * volgende antwoord. Vandaar één knop, één moment, en een regel eronder die
 * zegt of wat er nu in het vak staat hetzelfde is als wat de assistent kent.
 */
export function Vacaturepaneel({
  vacature,
  gewijzigd,
  gekoppeldOp,
  bezig,
  onWijzig,
  onKoppel,
}: {
  vacature: string;
  gewijzigd: boolean;
  gekoppeldOp: string | null;
  bezig: boolean;
  onWijzig: (waarde: string) => void;
  onKoppel: () => void;
}) {
  return (
    <section className="sol-kaart sol-paneel sol-paneel--nadruk">
      <h2 className="sol-kaart__titel">Deze vacature</h2>
      <p className="sol-kaart__tekst sol-kaart__tekst--klein">
        Plak de hele tekst, inclusief de eisen. Dit is het enige dat per sollicitatie verandert.
      </p>

      <div className="sol-veld">
        <label className="sol-veld__label" htmlFor="sol-vacature">
          Vacaturetekst
        </label>
        <textarea
          id="sol-vacature"
          className="sol-invoer sol-invoer--tekstvak"
          rows={10}
          value={vacature}
          maxLength={MAX_VACATURE_TEKENS}
          onChange={(e) => onWijzig(e.target.value)}
          placeholder="Plak hier de vacaturetekst"
        />
        <p className="sol-veld__teller">
          {vacature.length === 0
            ? "nog leeg"
            : `${vacature.length.toLocaleString("nl-NL")} tekens`}
        </p>
      </div>

      <div className="sol-paneel__voet">
        <button type="button" className="sol-knop" onClick={onKoppel} disabled={bezig || !gewijzigd}>
          {bezig ? "Bezig met koppelen" : "Koppel aan dit gesprek"}
        </button>
        <p className="sol-veld__teller">
          {gewijzigd
            ? "De assistent kent deze versie nog niet."
            : gekoppeldOp
              ? `Gekoppeld op ${new Date(gekoppeldOp).toLocaleString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}.`
              : "Nog niets gekoppeld."}
        </p>
      </div>
    </section>
  );
}
