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

export interface PaginaFilter {
  zoek: string;
  /** Een `PaginaStandSleutel`, of leeg. */
  status: string;
  /** Een cluster-id, of leeg. */
  cluster: string;
  /** "Artikel", "Landingspagina", ... of leeg. */
  soort: string;
  /** "nieuw" of "verbeteren", of leeg. */
  actie: string;
}

export const LEEG_FILTER: PaginaFilter = { zoek: "", status: "", cluster: "", soort: "", actie: "" };

/**
 * Filteren op status, cluster, soort content en type, plus zoeken op naam en
 * cluster (23 september 2026, op verzoek van de eigenaar). Vervallen pagina's
 * vallen altijd weg.
 */
export function filterPaginas<
  T extends { naam: string; cluster: string | null; clusterId?: string | null; soort?: string; actie?: string; stand: PaginaStand },
>(rijen: T[], filter: PaginaFilter): T[] {
  const q = filter.zoek.trim().toLowerCase();
  return rijen.filter((r) => {
    if (!groepVan(r.stand)) return false;
    if (filter.status && r.stand.sleutel !== filter.status) return false;
    if (filter.cluster && r.clusterId !== filter.cluster) return false;
    if (filter.soort && r.soort !== filter.soort) return false;
    if (filter.actie && r.actie !== filter.actie) return false;
    if (!q) return true;
    return r.naam.toLowerCase().includes(q) || (r.cluster ?? "").toLowerCase().includes(q);
  });
}

/** De keuzes in een filter: alleen wat er echt voorkomt, want een lege keuze filtert naar niets. */
export function filterKeuzes<
  T extends { cluster: string | null; clusterId?: string | null; soort?: string; actie?: string; stand: PaginaStand },
>(rijen: T[]) {
  const zichtbaar = rijen.filter((r) => groepVan(r.stand));
  const uniek = <K,>(lijst: [string, K][]) => [...new Map(lijst).entries()];
  return {
    status: uniek(zichtbaar.map((r) => [r.stand.sleutel, r.stand.label] as [string, string])),
    cluster: uniek(
      zichtbaar.filter((r) => r.clusterId).map((r) => [r.clusterId!, r.cluster ?? "Cluster"] as [string, string]),
    ).sort((a, b) => a[1].localeCompare(b[1], "nl")),
    soort: uniek(zichtbaar.filter((r) => r.soort).map((r) => [r.soort!, r.soort!] as [string, string])),
    actie: uniek(
      zichtbaar
        .filter((r) => r.actie)
        .map((r) => [r.actie!, r.actie === "verbeteren" ? "Bestaande pagina verbeteren" : "Nieuwe pagina"] as [string, string]),
    ),
  };
}
