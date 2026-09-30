/**
 * HET BORD: WELKE MAANDEN STAAN OPEN? (30 september 2026)
 *
 * Het bord toonde twaalf maanden onder elkaar, elk met kop, chip en knoppen.
 * Voor iemand die alleen wil weten wat er nu en straks gebeurt, is dat elf keer
 * te veel. Nu staan de eerste drie maanden die nog komen open. De rest staat
 * dicht als één regel per aaneengesloten stuk, bijvoorbeeld "November 2026 tot
 * en met juni 2027: 14 pagina's", en klapt open met één klik. Er gaat niets
 * verloren: de maanden in zo'n regel zijn dezelfde kaarten als altijd.
 *
 * ⚠️ Een maand waar iets op de klant wacht, staat altijd open, hoe ver weg of
 * hoe lang voorbij hij ook is. Een tekst die op akkoord wacht mag nooit
 * achter "toon" verdwijnen.
 *
 * Puur en zonder `server-only` (conventie 2).
 */

/** Hoeveel maanden er open staan, geteld vanaf de eerste die nog niet voorbij is. */
export const MAANDEN_IN_BEELD = 3;

export interface BordMaand {
  voorbij: boolean;
  /** Er wacht iets op de klant: een tekst voor akkoord, of de maand zelf. */
  vraagtActie: boolean;
}

export type BordGroep<T> =
  | { soort: "maand"; maand: T }
  | { soort: "rest"; /** Het id van de eerste maand in de groep, stabiel zolang de groep dezelfde begint. */ sleutel: string; maanden: T[] };

/**
 * De maanden in de volgorde van het bord, als open maanden en samengeklapte
 * groepen. `sleutel` leest het id van een maand, voor de sleutel van een groep.
 */
export function bordGroepen<T>(
  maanden: readonly T[],
  lees: (m: T) => BordMaand & { id: string },
  aantal: number = MAANDEN_IN_BEELD,
): BordGroep<T>[] {
  const open = new Set<number>();
  let komend = 0;
  maanden.forEach((m, i) => {
    const l = lees(m);
    if (!l.voorbij && komend < aantal) {
      open.add(i);
      komend++;
    }
    if (l.vraagtActie) open.add(i);
  });

  const uit: BordGroep<T>[] = [];
  maanden.forEach((m, i) => {
    if (open.has(i)) {
      uit.push({ soort: "maand", maand: m });
      return;
    }
    const laatste = uit[uit.length - 1];
    if (laatste?.soort === "rest") laatste.maanden.push(m);
    else uit.push({ soort: "rest", sleutel: lees(m).id, maanden: [m] });
  });
  return uit;
}

function lagerBegin(tekst: string): string {
  return tekst.charAt(0).toLowerCase() + tekst.slice(1);
}

/**
 * De regel van een samengeklapte groep. `titels` zijn de maandnamen in
 * volgorde ("November 2026", `maandTitel()`), `paginas` het totaal erin.
 */
export function restRegel(titels: readonly string[], paginas: number): string {
  const bereik =
    titels.length === 0
      ? ""
      : titels.length === 1
        ? titels[0]!
        : `${titels[0]} tot en met ${lagerBegin(titels[titels.length - 1]!)}`;
  const wat = paginas === 0 ? "nog leeg" : paginas === 1 ? "1 pagina" : `${paginas} pagina's`;
  return `${bereik}: ${wat}`;
}
