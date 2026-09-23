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
import { formatDag, type PaginaStand } from "@/lib/pagina-stand";
import { schrijfdatum } from "@/lib/content-write-gate";

/**
 * ── DE DRIE GROEPEN VAN DE BIBLIOTHEEK (avond 23 september 2026) ───────────
 *
 * De eigenaar wil twee vragen beantwoord zien: wat wacht op mij, en wat wordt
 * er binnenkort geschreven. Daarnaast staat wat live is. Een pagina in een
 * maand die nog niet is vrijgegeven hoort in geen groep: die staat in het
 * contentplan. Zo staat elke pagina op minstens één van die twee schermen;
 * eerder die avond verdween een pagina zonder plan-pagina ("Nog niet
 * ingepland") van allebei.
 */
export type Groep = "wacht" | "binnenkort" | "live";

export const GROEP_LABEL: Record<Groep, string> = {
  wacht: "Wacht op jou",
  // Heette tot 23 september 2026 "Wordt binnenkort geschreven". Op verzoek van
  // de eigenaar zegt de kop nu zelf dat de klant hier niets hoeft te doen.
  binnenkort: "Staat op de planning (geen actie benodigd)",
  live: "Staat live",
};

/** In welke groep valt deze stand? `null` = alleen in het contentplan (gepland) of nergens (vervallen). */
export function groepVan(stand: PaginaStand): Groep | null {
  if (stand.sleutel === "gepland" || stand.sleutel === "vervallen") return null;
  if (stand.fase === 4) return "live";
  if (stand.aanZet === "klant") return "wacht";
  return "binnenkort";
}

export function tellingen(rijen: { stand: PaginaStand }[]): Record<Groep, number> {
  const t: Record<Groep, number> = { wacht: 0, binnenkort: 0, live: 0 };
  for (const r of rijen) {
    const g = groepVan(r.stand);
    if (g) t[g]++;
  }
  return t;
}

/**
 * Eén regel per rij: waar staat deze pagina, en waarop wacht hij? In de woorden
 * die de eigenaar zelf gaf ("5 openstaande vragen om de pagina te kunnen
 * schrijven", "Alle gegevens bekend, wordt op datum geschreven").
 */
export function statusRegel(r: { stand: PaginaStand; openVragen: number; datum: string | null }): string {
  const { stand } = r;
  switch (stand.sleutel) {
    case "vragen": {
      const n = r.openVragen;
      if (n === 1) return "1 openstaande vraag om de pagina te kunnen schrijven";
      if (n > 1) return `${n} openstaande vragen om de pagina te kunnen schrijven`;
      return "Openstaande vragen om de pagina te kunnen schrijven";
    }
    case "keuze":
      return "Te weinig gegevens om goed te schrijven: kies hoe we verder gaan";
    case "goedkeuren":
      return "Tekst is klaar: lees hem en keur hem goed";
    case "live_zetten":
      return "Goedgekeurd: zet hem op je site";
    case "voorbereiden":
      if (stand.label === "Geen cluster") return "Hangt aan geen cluster, daardoor kunnen we hem nog niet voorbereiden";
      return stand.label === "Wordt voorbereid"
        ? "We zetten de vragen voor deze pagina klaar"
        : "We beginnen uiterlijk morgenochtend met de vragen voor deze pagina";
    case "wacht_op_datum":
      return r.datum
        ? `Alle gegevens bekend, wordt op ${formatDag(schrijfdatum(r.datum))} geschreven`
        : "Alle gegevens bekend, wacht op zijn schrijfdatum";
    case "schrijven":
      return "Alle gegevens bekend, wordt nu geschreven";
    case "niet_ingepland":
      return "Alle gegevens bekend, heeft nog geen datum in het contentplan";
    case "mislukt":
      return "Schrijven lukte niet, we proberen het opnieuw";
    case "effect_meten":
      return "Staat live, we meten het effect na 14 en 28 dagen";
    case "effect_bekend":
      return "Staat live, het effect is gemeten";
    default:
      return stand.label;
  }
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
    // "Voorbereiding volgt" en "Wordt voorbereid" delen één sleutel; één keuze.
    status: uniek(
      zichtbaar.map(
        (r) => [r.stand.sleutel, r.stand.sleutel === "voorbereiden" ? "Wordt voorbereid" : r.stand.label] as [string, string],
      ),
    ),
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
