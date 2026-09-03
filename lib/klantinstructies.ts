/**
 * INSTRUCTIES van de klant zijn geen feiten (V5 uit
 * `docs/tasks/contentkwaliteit-copywriterronde.md`).
 *
 * ── WAT ER MISGING ──────────────────────────────────────────────────────────
 *
 * Vier van de zes pagina's van Fysio Centrum Utrecht kregen dit antwoord mee,
 * woordelijk, op 3 september 2026:
 *
 *   "Zet er geen adres bij, want we hebben twee vestigingen, bij Utrecht
 *    Centraal en in Leidsche Rijn, en welke van de twee het wordt hangt af van
 *    waar iemand woont. Verwijs voor de adressen naar de contactpagina."
 *
 * Twee van die vier zetten er toch een adres bij, één ervan twee keer. Dat is
 * geen smaakverschil: het is een instructie die letterlijk in de invoer stond.
 * Zolang zoiets kan gebeuren, weet de klant niet wat zijn antwoorden waard zijn.
 *
 * ── WAAROM HET MISGING ──────────────────────────────────────────────────────
 *
 * Zo'n antwoord komt binnen als één feit op de feitenkaart, tussen de andere
 * feiten, in de vorm "vraag: antwoord". Het model leest daar dus een MEDEDELING
 * waar een OPDRACHT staat, en een mededeling mag je negeren als er iets beters
 * te melden is. `taboo_phrases` en `forbidden_topics` staan wél als gesloten
 * verbod bovenaan de prompt, en die worden wel nageleefd.
 *
 * Deze module haalt de opdrachtzinnen uit zo'n antwoord, zodat ze bij de
 * verboden terechtkomen in plaats van bij de feiten. Het vangnet ernaast
 * (conventie 1) staat in `content-gate.ts`: `checkAdresinstructie`.
 *
 * Puur en zonder `server-only` (conventie 2).
 */

/**
 * Werkwoorden waarmee een klant ons een opdracht geeft.
 *
 * Een gesloten lijst, en bewust klein. De vangst hoeft niet volledig te zijn:
 * elke gevonden instructie is er één die anders als feit was weggezakt, en een
 * te ruime lijst maakt van gewone antwoorden ("we noemen liever geen gemiddelde")
 * ineens een verbod dat de pagina blokkeert.
 */
const OPDRACHTWOORDEN = [
  "zet er geen",
  "zet geen",
  "zet er niet",
  "noem geen",
  "noem niet",
  "noem er geen",
  "gebruik geen",
  "gebruik niet",
  "vermeld geen",
  "vermeld niet",
  "schrijf geen",
  "schrijf niet",
  "verwijs naar",
  "verwijs voor",
  "link naar",
  "laat weg",
  "laat het weg",
  "zonder te noemen",
];

export interface Klantinstructie {
  /** De zin zoals de klant hem schreef. */
  zin: string;
  /** Is dit een verbod ("geen", "niet") of een opdracht ("verwijs naar")? */
  soort: "verbod" | "opdracht";
}

/** Zinnen uit één antwoord halen. Leestekens blijven staan, dat leest prettiger. */
function zinnenVan(tekst: string): string[] {
  return (tekst ?? "")
    .split(/(?<=[.!?])\s+/)
    .map((z) => z.trim())
    .filter(Boolean);
}

/**
 * Haal de instructiezinnen uit klantantwoorden.
 *
 * Voert de HELE feitentekst in, dus "vraag: antwoord". Een antwoord bevat vaak
 * allebei: "Het telefoonnummer is 030-2270437. Zet er geen adres bij, want ..."
 * is één feit én één verbod, en die moeten uit elkaar.
 */
export function vindKlantinstructies(teksten: readonly string[]): Klantinstructie[] {
  const gevonden: Klantinstructie[] = [];
  const gezien = new Set<string>();

  for (const tekst of teksten) {
    for (const zin of zinnenVan(tekst)) {
      const laag = zin.toLowerCase();
      const woord = OPDRACHTWOORDEN.find((w) => laag.includes(w));
      if (!woord) continue;
      const sleutel = laag.slice(0, 120);
      if (gezien.has(sleutel)) continue;
      gezien.add(sleutel);
      gevonden.push({
        zin,
        soort: /\b(geen|niet)\b/i.test(zin) ? "verbod" : "opdracht",
      });
    }
  }

  return gevonden;
}

/**
 * Het promptblok, in dezelfde vorm als de verboden woorden.
 *
 * Gesloten lijst, bovenaan, en met de reden erbij dat de klant dit zelf zo
 * gevraagd heeft. Een model dat leest dat de ONDERNEMER dit vroeg, houdt zich er
 * beter aan dan een model dat een regel van ons leest.
 */
export function instructieblok(instructies: readonly Klantinstructie[]): string {
  if (instructies.length === 0) return "";
  const regels = instructies.map((i) => `- ${i.zin}`);
  return (
    `WAT DE KLANT ZELF HEEFT GEVRAAGD. Dit zijn geen feiten maar opdrachten, en de ondernemer ` +
    `heeft ze woordelijk zo opgeschreven. Volg ze precies, ook als je denkt dat de pagina er beter ` +
    `van wordt zonder:\n${regels.join("\n")}`
  );
}

/**
 * Vraagt een van deze instructies om GEEN adres op de pagina?
 *
 * Los van de rest, want dit is het enige geval waarvoor een harde controle
 * bestaat, en het is meteen het geval dat op 3 september twee keer misging.
 */
export function verbiedtAdres(instructies: readonly Klantinstructie[]): boolean {
  return instructies.some(
    (i) => i.soort === "verbod" && /\badres(sen)?\b/i.test(i.zin),
  );
}
