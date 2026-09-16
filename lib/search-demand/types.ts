/**
 * De zoekvolumeleverancierslaag (docs/tasks/zoekdata-in-de-keten.md, blok B).
 *
 * ── NAAR HET PATROON VAN lib/engines/ ───────────────────────────────────────
 *
 * Zelfde reden als daar: `zoekvolume-leverancier` is een keuze die per
 * omgeving kan verschillen, en de rest van de app hoort daar niets van te
 * merken. Zonder sleutel gedraagt de app zich exact zoals vóór deze bouwronde,
 * met de bestaande AI-schatting (`lib/pipeline/search-demand.ts`,
 * ongewijzigd). Met sleutel komt er een echte meting naast te staan.
 *
 * ⚠️ Bewust een KLEINE interface. Elke leverancier (DataForSEO, en ooit
 * misschien een andere) hoeft maar één ding te kunnen: voor een lijst
 * zoektermen het maandvolume teruggeven. Alles daaromheen (cachen,
 * boekhouden, het gokken van een zoekterm uit een vraag) staat in eigen
 * modules en niet in de leverancier zelf.
 */

export interface SearchDemandResult {
  keyword: string;
  /** Maandelijks zoekvolume. `null` = de leverancier kent deze term niet. */
  volume: number | null;
  competition: number | null;
  cpc: number | null;
  /** De volledige ruwe respons voor deze term, voor de audit-trail (conventie 8). */
  raw: unknown;
}

export interface SearchDemandProvider {
  readonly id: "dataforseo";
  /**
   * Haalt het maandvolume op voor een lijst zoektermen, in één land en taal.
   *
   * Geen eigen cache en geen eigen boekhouding: dat is `lib/search-demand/cache.ts`.
   * Deze functie doet precies één ding, de aanroep zelf.
   */
  fetchVolumes(keywords: string[], country: string, language: string): Promise<SearchDemandResult[]>;
}
