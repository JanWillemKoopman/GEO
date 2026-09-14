"use client";

import { useMemo } from "react";
import { brievenUit } from "@/lib/solliciteren/dossier";
import { MINIMUM_WOORDEN, formuleerStemregels, meetStem } from "@/lib/solliciteren/stem";
import type { SollicitatieDocument } from "@/lib/types/database";

/**
 * Wat er gemeten is aan jouw eerdere brieven.
 *
 * ── WAAROM DIT ZICHTBAAR IS EN NIET ALLEEN IN DE PROMPT ZIT ────────────────
 *
 * De gemeten stem gaat als harde regels de aanroep in. Wat een model precies
 * opgedragen krijgt hoort niet onzichtbaar te zijn: zie je hier "gemiddeld 22
 * woorden per zin" staan terwijl je weet dat je korter schrijft, dan zegt dat
 * dat er een brief in je dossier zit die er niet in hoort, en dat is iets wat
 * jij oplost en de app niet.
 *
 * De meting zelf staat in `lib/solliciteren/stem.ts`, draait in de browser
 * terwijl je een brief toevoegt, en kost niets.
 */
export function Stempaneel({ documenten }: { documenten: SollicitatieDocument[] }) {
  const stukken = useMemo(
    () => documenten.map((d) => ({ id: d.id, soort: d.soort, titel: d.titel, inhoud: d.inhoud })),
    [documenten],
  );
  const brieven = useMemo(() => brievenUit(stukken), [stukken]);
  const profiel = useMemo(() => meetStem(brieven), [brieven]);

  if (!profiel) {
    const woorden = brieven.join(" ").trim().split(/\s+/).filter(Boolean).length;
    return (
      <section className="sol-kaart sol-paneel">
        <h2 className="sol-kaart__titel">Jouw schrijfstijl</h2>
        <p className="sol-kaart__tekst sol-kaart__tekst--klein">
          {brieven.length === 0
            ? "Zet een paar eerdere brieven in je dossier. Dan meet dit scherm hoe jij schrijft, en krijgt de assistent dat als harde opdracht mee."
            : `Er ligt ${woorden} woord aan brieven. Vanaf ${MINIMUM_WOORDEN} woorden is de meting betrouwbaar genoeg om er iets op te baseren.`}
        </p>
      </section>
    );
  }

  return (
    <section className="sol-kaart sol-paneel">
      <h2 className="sol-kaart__titel">Jouw schrijfstijl</h2>
      <p className="sol-kaart__tekst sol-kaart__tekst--klein">
        Gemeten aan {profiel.bronnen} {profiel.bronnen === 1 ? "brief" : "brieven"}, samen{" "}
        {profiel.woorden.toLocaleString("nl-NL")} woorden. Dit gaat als opdracht mee, en elke
        geschreven brief wordt er weer langs gelegd.
      </p>

      <dl className="sol-maten">
        <div>
          <dt>Zinslengte</dt>
          <dd>{profiel.woordenPerZin} woorden</dd>
        </div>
        <div>
          <dt>Langere zinnen</dt>
          <dd>tot {profiel.langereZin} woorden</dd>
        </div>
        <div>
          <dt>Alinea</dt>
          <dd>{profiel.zinnenPerAlinea.toLocaleString("nl-NL")} zinnen</dd>
        </div>
        <div>
          <dt>Aanspreekvorm</dt>
          <dd>{profiel.aanspreekvorm ? `"${profiel.aanspreekvorm}"` : "wisselend"}</dd>
        </div>
        <div>
          <dt>Begint met {'"Ik"'}</dt>
          <dd>{profiel.ikBegin} van de 100 zinnen</dd>
        </div>
      </dl>

      {profiel.eigenWoorden.length > 0 ? (
        <>
          <p className="sol-veld__teller">Woorden die je echt gebruikt:</p>
          <ul className="sol-woorden">
            {profiel.eigenWoorden.map((woord) => (
              <li key={woord} className="sol-woord sol-woord--raak">
                {woord}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <details className="sol-uitklap">
        <summary>Wat de assistent hiervan te horen krijgt</summary>
        <ul className="sol-cliches sol-cliches--stil">
          {formuleerStemregels(profiel).map((regel) => (
            <li key={regel}>{regel}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
