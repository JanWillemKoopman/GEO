/**
 * Filteren en tellen voor de lijsten van pagina's: de bibliotheek en "Jouw
 * beurt" (`docs/tasks/contentflow-een-lijn.md` §4.6a).
 *
 * ── WAAROM DE TEGELS NU UIT DE STAND KOMEN ─────────────────────────────────
 *
 * Op 23 september 2026 stond bovenaan de bibliotheek "Klaar voor vrijgave: 0"
 * boven twee rijen "Klaar om te publiceren", en "Geschreven: 3" terwijl één
 * van de drie leeg was. De tegels telden een andere kolom dan de chips
 * toonden. Nu tellen beide dezelfde stand (`lib/pagina-stand.ts`), in drie
 * groepen die zeggen wat de klant wil weten: wat wacht op mij, wat is ORBIT
 * ENGINE aan het maken, wat staat er live.
 *
 * Puur (conventie 2).
 */
import type { PaginaStand } from "@/lib/pagina-stand";

export type Groep = "wacht" | "gemaakt" | "live";

export const GROEP_LABEL: Record<Groep, string> = {
  wacht: "Wacht op jou",
  gemaakt: "Wordt gemaakt",
  live: "Staat live",
};

/** In welke tegel valt deze stand? `null` = nergens (een vervallen pagina). */
export function groepVan(stand: PaginaStand): Groep | null {
  if (stand.fase === null) return null;
  if (stand.fase === 4) return "live";
  if (stand.aanZet === "klant") return "wacht";
  return "gemaakt";
}

export function tellingen(rijen: { stand: PaginaStand }[]): Record<Groep, number> {
  const t: Record<Groep, number> = { wacht: 0, gemaakt: 0, live: 0 };
  for (const r of rijen) {
    const g = groepVan(r.stand);
    if (g) t[g]++;
  }
  return t;
}

/** Zoeken op naam en cluster, en optioneel één tegel. Vervallen pagina's vallen altijd weg. */
export function filterPaginas<T extends { naam: string; cluster: string | null; stand: PaginaStand }>(
  rijen: T[],
  filter: { zoek: string; groep: Groep | null },
): T[] {
  const q = filter.zoek.trim().toLowerCase();
  return rijen.filter((r) => {
    const g = groepVan(r.stand);
    if (!g) return false;
    if (filter.groep && g !== filter.groep) return false;
    if (!q) return true;
    return r.naam.toLowerCase().includes(q) || (r.cluster ?? "").toLowerCase().includes(q);
  });
}
