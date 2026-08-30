/**
 * De vraag die vóór elke klik op "Stel nieuwe clusters voor" beantwoord moet
 * worden: is er iets bijgekomen sinds de vorige ronde?
 * (docs/optimalisatielab-orbit-engine.md, werkpakket A §3.5)
 *
 * ── WAAROM EEN APARTE, PURE MODULE ───────────────────────────────────────────
 *
 * §3.5 is expliciet: "Is er niets bijgekomen, dan meldt de app dat en raadt ze
 * aan de knop niet te gebruiken, hetzelfde voedsel geeft hetzelfde resultaat,
 * alleen duurder." Dat is een rekenregel op vier tellingen, geen AI-oordeel, en
 * hoort dus hier: puur, zonder `server-only`, testbaar zonder database
 * (conventie 2). De aanroeper (`propose-more-topics.ts`) verzamelt de
 * tellingen, deze module zegt alleen of ze gelijk zijn en, zo niet, wat er in
 * gewone taal is bijgekomen.
 */

/** Wat er op het moment van een ronde bekend was over dit merk. */
export interface TopicRoundSnapshot {
  /** ISO-tijdstip waarop het strategisch gesprek voor het laatst is opgeslagen, of null. */
  gesprekVastgelegdOp: string | null;
  /** Aantal klantvragen (fact_requests) met status 'beantwoord'. */
  beantwoordeVragen: number;
  /** Aantal clusters (analyses) met minstens één rapport. */
  gemetenClusters: number;
  /** Aantal onderwerpen met status 'afgewezen'. */
  afgewezenOnderwerpen: number;
}

/** Zijn twee momentopnamen identiek? Dan levert een nieuwe ronde niets nieuws op. */
export function snapshotsGelijk(a: TopicRoundSnapshot, b: TopicRoundSnapshot): boolean {
  return (
    a.gesprekVastgelegdOp === b.gesprekVastgelegdOp &&
    a.beantwoordeVragen === b.beantwoordeVragen &&
    a.gemetenClusters === b.gemetenClusters &&
    a.afgewezenOnderwerpen === b.afgewezenOnderwerpen
  );
}

export interface RoundDiffResult {
  /** Is er een goede reden om deze ronde te draaien? */
  nieuws: boolean;
  /** Wat de beheerder leest, vóór hij op de knop klikt. */
  melding: string;
}

/**
 * Wat is er bijgekomen sinds de vorige ronde, in gewone taal?
 *
 * `vorige` is `null` bij de allereerste ronde: dan is er per definitie iets te
 * doen, er is nog nooit een aanvullende ronde geweest.
 */
export function beoordeelRonde(
  vorige: TopicRoundSnapshot | null,
  huidige: TopicRoundSnapshot,
): RoundDiffResult {
  if (!vorige) {
    return {
      nieuws: true,
      melding: "Dit is de eerste aanvullende ronde voor dit merk.",
    };
  }

  if (snapshotsGelijk(vorige, huidige)) {
    return {
      nieuws: false,
      melding:
        "Er is niets bijgekomen sinds de vorige ronde: hetzelfde gesprek, dezelfde " +
        "beantwoorde vragen, dezelfde metingen. Hetzelfde voedsel geeft hetzelfde resultaat, " +
        "alleen duurder. Wacht tot er nieuwe informatie is.",
    };
  }

  const delen: string[] = [];
  if (vorige.gesprekVastgelegdOp !== huidige.gesprekVastgelegdOp) {
    delen.push(
      vorige.gesprekVastgelegdOp === null
        ? "het strategisch gesprek is vastgelegd"
        : "het strategisch gesprek is bijgewerkt",
    );
  }
  const nieuweVragen = huidige.beantwoordeVragen - vorige.beantwoordeVragen;
  if (nieuweVragen > 0) {
    delen.push(`${nieuweVragen} klantantwoord${nieuweVragen === 1 ? "" : "en"}`);
  }
  const nieuweMetingen = huidige.gemetenClusters - vorige.gemetenClusters;
  if (nieuweMetingen > 0) {
    delen.push(`de metingen van ${nieuweMetingen} cluster${nieuweMetingen === 1 ? "" : "s"}`);
  }
  const nieuweAfwijzingen = huidige.afgewezenOnderwerpen - vorige.afgewezenOnderwerpen;
  if (nieuweAfwijzingen > 0) {
    delen.push(`${nieuweAfwijzingen} afgewezen onderwerp${nieuweAfwijzingen === 1 ? "" : "en"}`);
  }

  if (delen.length === 0) {
    // De snapshots verschillen (bv. minder metingen na een opschoning), maar
    // niet op een manier die meer input betekent. Geen nieuwe informatie, dus
    // dezelfde melding als "niets bijgekomen".
    return {
      nieuws: false,
      melding:
        "Er is niets nieuws bijgekomen sinds de vorige ronde. Hetzelfde voedsel geeft " +
        "hetzelfde resultaat, alleen duurder. Wacht tot er nieuwe informatie is.",
    };
  }

  const opsomming =
    delen.length === 1
      ? delen[0]
      : `${delen.slice(0, -1).join(", ")} en ${delen[delen.length - 1]}`;

  return {
    nieuws: true,
    melding: `Sinds de vorige ronde zijn toegevoegd: ${opsomming}.`,
  };
}
