/**
 * De indeling van "Openstaande vragen" in groepen met één filterrij.
 *
 * Tot 30 september 2026 stond het scherm in twee blokken met elk een eigen
 * opbouw: bovenaan de vragen per pagina (met een eigen kop, teller en kaart),
 * onderaan de losse vragen over het merk en de clusters (met een filter, een
 * andere kaart en andere knoppen: "Opslaan" en "Weet ik niet" tegenover
 * "Antwoord opslaan" en "Overslaan"). De eigenaar vond dat onlogisch: het is
 * voor de klant één soort werk, dus staat het nu in één lijst met één filter.
 *
 * Puur en zonder `server-only`, zodat `scripts/test-unit.ts` het kan nakijken.
 */

export type GroepSoort = "pagina" | "merk" | "cluster";

/** Het filter: alles, alle pagina's samen, of één groep (merk of een cluster). */
export type VraagFilter = "alles" | "paginas" | string;

export interface VraagGroepBasis {
  sleutel: string;
  soort: GroepSoort;
  /** De ids van de vragen die bij het laden open stonden. */
  openIds: string[];
  /** Aantal regels zonder vraag-id die nog ingevuld moeten worden (profielgaten). */
  extraOpen?: number;
}

/**
 * Hoeveel er in een groep nu nog open staat, met de stand van deze sessie:
 * een vraag die je net beantwoordde telt niet meer mee.
 */
export function nogOpen(groep: VraagGroepBasis, stand: Record<string, string | undefined>): number {
  return groep.openIds.filter((id) => (stand[id] ?? "open") === "open").length + (groep.extraOpen ?? 0);
}

/** Past deze groep bij het gekozen filter? */
export function pastBijFilter(groep: VraagGroepBasis, filter: VraagFilter): boolean {
  if (filter === "alles") return true;
  if (filter === "paginas") return groep.soort === "pagina";
  return groep.soort !== "pagina" && groep.sleutel === filter;
}

export interface FilterKnop {
  filter: VraagFilter;
  aantal: number;
}

/**
 * De knoppen van de filterrij, in vaste volgorde: Alles, Pagina's, Over je
 * merk, dan de clusters.
 *
 * Een knop staat er alleen als er bij het laden iets open stond in die groep:
 * een knop naar een lege lijst is een dood einde (`docs/ux-design.md` §4). Een
 * knop die tijdens het beantwoorden naar 0 zakt blijft staan, anders verdwijnt
 * hij onder je klik vandaan. De pagina's zijn samen één knop: elke pagina staat
 * in de lijst al onder een eigen kop, en tien lange paginatitels in een
 * filterrij maken die rij onleesbaar. Met maar één groep in totaal is er geen
 * filter: een filter met één knop is een knop die niets doet.
 */
export function filterKnoppen(
  groepen: VraagGroepBasis[],
  stand: Record<string, string | undefined>,
): FilterKnop[] {
  const metOpen = groepen.filter((g) => g.openIds.length + (g.extraOpen ?? 0) > 0);
  if (metOpen.length < 2) return [];
  const knoppen: FilterKnop[] = [
    { filter: "alles", aantal: metOpen.reduce((n, g) => n + nogOpen(g, stand), 0) },
  ];
  const paginas = metOpen.filter((g) => g.soort === "pagina");
  if (paginas.length > 0) {
    knoppen.push({ filter: "paginas", aantal: paginas.reduce((n, g) => n + nogOpen(g, stand), 0) });
  }
  for (const g of metOpen.filter((g) => g.soort === "merk")) {
    knoppen.push({ filter: g.sleutel, aantal: nogOpen(g, stand) });
  }
  for (const g of metOpen.filter((g) => g.soort === "cluster")) {
    knoppen.push({ filter: g.sleutel, aantal: nogOpen(g, stand) });
  }
  return knoppen;
}
