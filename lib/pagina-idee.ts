/**
 * EEN NIEUW PAGINA-IDEE: welke maand stellen we voor?
 *
 * Het venster "Nieuw pagina-idee" (`components/pagina/nieuw-pagina-idee.tsx`,
 * 30 september 2026) vraagt meteen wanneer het idee geschreven wordt, met een
 * voorstel erin. Zo hoeft de consultant voor één los idee niet naar het bord te
 * gaan en te slepen.
 *
 * De regel: de eerste maand die nog niet voorbij is en nog plek heeft binnen
 * het aantal pagina's per maand. Is elke maand vol, dan de eerste die nog niet
 * voorbij is; een maand boven zijn aantal mag (besluit: geen grens), en het bord
 * zegt dan hoeveel erboven. Geen maand, dan geen voorstel: het idee gaat naar de
 * ideeënlijst.
 *
 * Puur en zonder `server-only` (conventie 2).
 */

export interface MaandVoorIdee {
  id: string;
  /** "Oktober 2026", of "Maand 4" als de kalender onbekend is. */
  titel: string;
  /** Hoeveel pagina's er al in staan, zonder reserves. */
  aantal: number;
  voorbij: boolean;
}

export function voorgesteldeMaand(maanden: readonly MaandVoorIdee[], perMaand: number): MaandVoorIdee | null {
  const open = maanden.filter((m) => !m.voorbij);
  return open.find((m) => m.aantal < perMaand) ?? open[0] ?? null;
}

/** De doelvragen uit het venster: getrimd, zonder lege regels en zonder dubbelingen. */
export function schoneDoelvragen(regels: readonly string[]): string[] {
  const gezien = new Set<string>();
  const uit: string[] = [];
  for (const r of regels) {
    const v = r.replace(/\s+/g, " ").trim();
    const sleutel = v.toLowerCase();
    if (!v || gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uit.push(v);
  }
  return uit;
}
