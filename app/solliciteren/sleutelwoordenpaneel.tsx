"use client";

import { useMemo } from "react";
import {
  dekkingspercentage,
  vergelijkSleutelwoorden,
} from "@/lib/solliciteren/sleutelwoorden";

/**
 * Welke woorden uit de vacature nog niet in het CV staan.
 *
 * ── DIT KOST NIETS EN WACHT NERGENS OP ─────────────────────────────────────
 *
 * De vergelijking is tellen en gebeurt in de browser, terwijl je plakt. Geen
 * aanroep, geen kosten, elke keer dezelfde uitkomst
 * (`lib/solliciteren/sleutelwoorden.ts`). Dat is bewust: een werkgever haalt
 * binnengekomen brieven door een systeem dat op letterlijke woorden zoekt, en
 * dat is geen werk voor een taalmodel.
 *
 * ⚠️ Het is woordvergelijking en geen begrip: "leidinggeven" en "teamlead"
 * tellen hier als twee verschillende dingen. Vandaar dat er "kijk of je hier
 * iets mee kunt" staat en niet "dit mist".
 */
export function Sleutelwoordenpaneel({ cv, vacature }: { cv: string; vacature: string }) {
  const woorden = useMemo(() => vergelijkSleutelwoorden(vacature, cv), [vacature, cv]);
  const dekking = useMemo(() => dekkingspercentage(vacature, cv), [vacature, cv]);

  if (woorden.length === 0) {
    return (
      <section className="sol-kaart sol-paneel">
        <h2 className="sol-kaart__titel">Sleutelwoorden</h2>
        <p className="sol-kaart__tekst sol-kaart__tekst--klein">
          Plak de vacaturetekst hierboven. Dan staat hier welke woorden uit de vacature nog niet in
          je CV voorkomen.
        </p>
      </section>
    );
  }

  const ontbreekt = woorden.filter((w) => !w.staatInCv);

  return (
    <section className="sol-kaart sol-paneel">
      <h2 className="sol-kaart__titel">Sleutelwoorden</h2>
      <p className="sol-kaart__tekst sol-kaart__tekst--klein">
        {dekking === null
          ? "Plak ook je CV, dan vergelijkt dit scherm de twee teksten."
          : ontbreekt.length === 0
            ? `Je CV noemt alle ${woorden.length} woorden die in deze vacature het vaakst terugkomen.`
            : `Je CV noemt ${dekking}% van deze woorden. De ${ontbreekt.length} zonder vinkje staan er nog niet in, kijk of je er iets mee kunt.`}
      </p>

      <ul className="sol-woorden">
        {woorden.map((woord) => (
          <li
            key={woord.woord}
            className={`sol-woord${woord.staatInCv ? " sol-woord--raak" : ""}`}
            title={
              woord.staatInCv
                ? `Staat in je CV, en ${woord.aantalInVacature}x in de vacature`
                : `Staat ${woord.aantalInVacature}x in de vacature, nog niet in je CV`
            }
          >
            {woord.woord}
            {woord.aantalInVacature > 1 ? (
              <span className="sol-woord__aantal">{woord.aantalInVacature}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
