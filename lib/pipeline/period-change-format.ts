/**
 * De verandering VERWOORDEN (optimalisatie.md 6.2/6.7).
 *
 * Apart van `period-change.ts`, dat de database bevraagt. Hier staat alleen wat
 * er met de uitkomst gebeurt: hoe hij de rapportopdracht in gaat, en of hij een
 * mail waard is. Dat zijn de twee beslissingen waar het misgaat, en dus de twee
 * die zonder database getest moeten kunnen worden.
 *
 * Bewust ZONDER `server-only`.
 */

export interface PeriodChange {
  previousWeek: number;
  /** Verandering van de leidende score, en of die buiten de ruis valt. */
  scoreDelta: number;
  scoreMeaningful: boolean;
  scoreThreshold: number;
  /** Vragen waarin het merk nu WÉL genoemd wordt en vorige periode niet. */
  won: string[];
  /** Vragen waarin het merk nu NIET meer genoemd wordt en vorige periode wel. */
  lost: string[];
  /** Concurrenten die opgerukt zijn, met het verschil in vermeldingen. */
  competitorsUp: { name: string; delta: number }[];
  competitorsDown: { name: string; delta: number }[];
  /** Concurrenten die deze periode voor het eerst opduiken. */
  newCompetitors: string[];
}


/**
 * Het veranderingsblok voor de rapportopdracht.
 *
 * Bewust een uitgeschreven blok en niet de ruwe JSON: het model moet dit
 * VERWOORDEN, niet interpreteren. Hoe minder rekenwerk we bij het model
 * neerleggen, hoe minder er misgaat.
 */
export function buildChangeBlock(change: PeriodChange | null, weekNo: number): string {
  if (!change) {
    return `\nDit is de EERSTE meting (periode ${weekNo}); er is nog niets om mee te vergelijken. Beschrijf de stand.`;
  }

  const lines = [
    `\n── WAT ER VERANDERD IS sinds periode ${change.previousWeek} ──`,
    `Dit rapport gaat over de VERANDERING. Beschrijf niet opnieuw de hele stand; ` +
      `zeg wat er anders is en wat dat betekent.`,
    change.scoreMeaningful
      ? `Score: ${change.scoreDelta > 0 ? "+" : ""}${change.scoreDelta} punten. Dat is een ECHTE verandering ` +
        `(buiten de meetruis van ${change.scoreThreshold} punten).`
      : `Score: ${change.scoreDelta > 0 ? "+" : ""}${change.scoreDelta} punten — dat valt BINNEN de meetruis ` +
        `(${change.scoreThreshold} punten nodig). Noem dit "stabiel" en trek er GEEN conclusies uit. ` +
        `Doen alsof een verschil binnen de ruis iets betekent, is de snelste manier om ongeloofwaardig te worden.`,
  ];

  if (change.won.length > 0) {
    lines.push(`\nNIEUW GEWONNEN — hier word je nu wél genoemd:\n- ${change.won.join("\n- ")}`);
  }
  if (change.lost.length > 0) {
    lines.push(`\nVERLOREN — hier werd je eerder genoemd en nu niet meer:\n- ${change.lost.join("\n- ")}`);
  }
  if (change.won.length === 0 && change.lost.length === 0) {
    lines.push(`\nOp vraagniveau is er niets omgeslagen: dezelfde vragen als vorige periode.`);
  }

  if (change.competitorsUp.length > 0) {
    lines.push(
      `\nCONCURRENTEN DIE OPRUKKEN: ${change.competitorsUp
        .map((c) => `${c.name} (+${c.delta})`)
        .join(", ")}`,
    );
  }
  if (change.competitorsDown.length > 0) {
    lines.push(
      `Concurrenten die terrein verliezen: ${change.competitorsDown
        .map((c) => `${c.name} (${c.delta})`)
        .join(", ")}`,
    );
  }
  if (change.newCompetitors.length > 0) {
    lines.push(`Nieuw opgedoken in de antwoorden: ${change.newCompetitors.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Valt er genoeg te melden om een mail te sturen? (optimalisatie.md 6.7)
 *
 * Een mail die elke periode hetzelfde zegt, wordt na drie keer niet meer
 * geopend — en dan mist de klant ook de mail die er wél toe doet. Dus: alleen
 * bij een echte scoreverandering, een omgeslagen vraag, of een concurrent die
 * merkbaar opgerukt is.
 */
export function isWorthEmailing(change: PeriodChange | null): boolean {
  if (!change) return true; // de eerste keer altijd
  return (
    change.scoreMeaningful ||
    change.won.length > 0 ||
    change.lost.length > 0 ||
    change.newCompetitors.length > 0 ||
    change.competitorsUp.some((c) => c.delta >= 2)
  );
}
