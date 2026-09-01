/**
 * De contentvoorraad: alles wat geschreven kan worden maar nog geen maand heeft.
 *
 * ── WAT ER IN DE VOORRAAD ZIT, EN WAAROM ALLEEN DAT ─────────────────────────
 *
 * Uitsluitend GEMETEN kansen: aanbevelingen uit een rapport van een cluster dat
 * daadwerkelijk gemeten is. Elke kaart draagt daardoor een vraag die een echte
 * AI-assistent echt gesteld kreeg, het gewicht van die vraag, en of het merk er
 * nu wel of niet in voorkwam.
 *
 * ⚠️ Dat is een bewuste versmalling, en hij doet pijn op dag één. Gasservice
 * Brabant heeft zeven clusters waarvan er één gemeten is, dus de voorraad begint
 * daar met zeven kansen en niet met honderdtwintig. De oude vulling (elk cluster
 * × elke funnelfase, 28 titels uitgesmeerd over 120 plekken) leverde meer rijen
 * op, maar 103 daarvan konden niet geschreven worden: zonder meting heeft de
 * schrijfstap geen gemiste vragen als briefing en levert het model iets
 * algemeens op. Een korte lijst die klopt is bruikbaarder dan een lange lijst
 * die wacht.
 *
 * ⚠️ Wat de leegte oplost, stond tot 26 augustus 2026 náást de lijst: een blok
 * "Nog niet gemeten" met de zes ongemeten clusters van Gasservice Brabant en een
 * meetknop erbij. Dat blok is eruit. Het stond onder de voorraad, dus onder aan
 * een lijst die zelf al scrollt, en het beantwoordde een vraag die op het
 * clusterscherm hoort: welke clusters moeten nog gemeten worden. Dit scherm gaat
 * over inplannen.
 *
 * Puur en zonder `server-only` (conventie 2): het planscherm filtert hiermee in
 * de browser.
 */

/** Wat je met deze kans gaat doen. Komt uit `recommendations_json[].action`. */
export type BacklogHandeling = "nieuw" | "verbeteren";

export interface BacklogItem {
  id: string;
  title: string;
  /** Waarom dit een kans is, in de woorden van het rapport. */
  why: string | null;
  /** Voor wie de pagina is. */
  targetIntent: string | null;
  /** De naam van het cluster waar deze kans uit komt. */
  cluster: string | null;
  /** De analyse achter dat cluster, voor de doorklik naar het dossier. */
  clusterId: string | null;
  handeling: BacklogHandeling | null;
  /** De pagina die verbeterd wordt. Leeg bij een nieuwe pagina. */
  existingUrl: string | null;
  /**
   * De potentiescore van deze kans (docs/tasks/potentiescore.md), 0-100.
   *
   * Per KANS en niet per cluster: `loadRecommendationPotential()` rekent de
   * zichtbaarheid uit over precies de doelvragen die deze aanbeveling raakt, en
   * combineert die met het zoekvolume van het onderwerp erachter. Twee kansen
   * uit hetzelfde rapport kunnen dus verschillen, en dat is precies het verschil
   * waarop iemand kiest wat hij eerst laat schrijven.
   *
   * `null` = geen doelvragen, of dit merk heeft nog geen profielbrede
   * herberekening gehad. Dan staat er geen getal op de kaart (conventie 3).
   */
  potentie: number | null;
  /** Hoeveel gemeten vragen deze kans raakt. `null` = geen doelvragen bekend. */
  raakt: number | null;
  /** Hoeveel vragen er in dit cluster gemeten zijn, de noemer bij `raakt`. */
  gemeten: number | null;
  /**
   * ⚠️ SORTEERSLEUTEL, NOOIT OP HET SCHERM. Som van de bevroren vraaggewichten;
   * loopt op boven de 1 en is dus geen aandeel. Zie `lib/opportunities.ts`.
   */
  gewicht: number | null;
}

export interface BacklogFilters {
  /** Zoekt in titel, reden en clusternaam. Hoofdletterongevoelig. */
  zoek: string;
  /** Lege string = alle clusters. */
  cluster: string;
  /** Lege string = beide handelingen. */
  handeling: "" | BacklogHandeling;
}

export const LEGE_BACKLOG_FILTERS: BacklogFilters = {
  zoek: "",
  cluster: "",
  handeling: "",
};

/**
 * Filtert de voorraad.
 *
 * ⚠️ Zoeken kijkt óók in de reden en de clusternaam, niet alleen in de titel.
 * De titels van aanbevelingen beginnen vaak met hetzelfde werkwoord ("Verbeter
 * de pagina over ..."), en dan is zoeken op alleen de titel een filter dat niets
 * wegneemt. Wie "Tilburg" intikt, bedoelt de kans waarin Tilburg voorkomt, waar
 * dat woord ook staat.
 */
export function filterBacklog(
  items: BacklogItem[],
  filters: BacklogFilters,
): BacklogItem[] {
  const zoek = filters.zoek.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.cluster && item.cluster !== filters.cluster) return false;
    if (filters.handeling && item.handeling !== filters.handeling) return false;
    if (!zoek) return true;
    const hooi = [item.title, item.why ?? "", item.cluster ?? ""]
      .join(" ")
      .toLowerCase();
    return hooi.includes(zoek);
  });
}

/**
 * De volgorde van de voorraad: wat het meest oplevert bovenaan.
 *
 * Dezelfde ladder als `lib/opportunities.ts`, en om dezelfde reden. De
 * potentiescore is gemeten en tussen clusters vergelijkbaar; het gewicht van de
 * doelvragen is een benadering daarvan en dient als vangnet zolang er nog geen
 * profielbrede herberekening is geweest. Een kans MET potentiescore gaat altijd
 * voor een kans zonder: gemeten weegt zwaarder dan geschat.
 *
 * Bij een echte gelijke stand op titel, zodat twee keer laden dezelfde lijst
 * geeft en de kaarten niet onder de muis van plek wisselen.
 */
export function sortBacklog(items: BacklogItem[]): BacklogItem[] {
  return [...items].sort((a, b) => {
    const pa = a.potentie ?? null;
    const pb = b.potentie ?? null;
    if (pa !== null && pb !== null && pa !== pb) return pb - pa;
    if ((pa === null) !== (pb === null)) return pa === null ? 1 : -1;
    const wa = a.gewicht ?? 0;
    const wb = b.gewicht ?? 0;
    if (wa !== wb) return wb - wa;
    return a.title.localeCompare(b.title, "nl");
  });
}

/** De clusters die in de voorraad voorkomen, met hun aantal, voor het filter. */
export function clusterCounts(items: BacklogItem[]): { naam: string; aantal: number }[] {
  const teller = new Map<string, number>();
  for (const item of items) {
    if (!item.cluster) continue;
    teller.set(item.cluster, (teller.get(item.cluster) ?? 0) + 1);
  }
  return [...teller.entries()]
    .map(([naam, aantal]) => ({ naam, aantal }))
    .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
}

/**
 * Hoe de potentie op de kaart komt te staan.
 *
 * Drie standen, en de derde is de belangrijkste: bij een onbekende potentie
 * staat er GEEN getal, ook geen nul. Conventie 3, en op deze kaart telt hij
 * dubbel: het getal bepaalt of iemand deze kans in een maand sleept.
 */
export function potentieLabel(item: BacklogItem): string | null {
  if (item.potentie === null) return null;
  return `potentie ${Math.round(item.potentie)}`;
}

/** "raakt 4 van de 30 gemeten vragen", of alleen de teller, of niets. */
export function raaktLabel(item: BacklogItem): string | null {
  if (item.raakt === null || item.raakt === 0) return null;
  const vraag = item.raakt === 1 ? "vraag" : "vragen";
  if (item.gemeten === null || item.gemeten === 0) {
    return `raakt ${item.raakt} gemeten ${vraag}`;
  }
  return `raakt ${item.raakt} van de ${item.gemeten} gemeten vragen`;
}

/**
 * Het derde niveau van de voorraad (werkpakket C §5.1, migratie 0078): een
 * gemeten gemis dat het rapportmodel overwoog maar niet tot aanbeveling
 * maakte, met de reden. Komt uit `reports.declined_json`, dus per definitie
 * alleen van clusters die al gemeten zijn: een ongemeten cluster heeft nog
 * geen rapport en dus ook geen afgevallen kansen.
 */
export interface DeclinedItem {
  cluster: string | null;
  problem: string;
  reason: string;
}

/**
 * Hoeveel maanden de voorraad meegaat bij het huidige publicatietempo
 * (werkpakket C §5.2).
 *
 * `null` bij een voorraad van nul (niets om een duur van te geven) of een
 * tempo van nul of minder (delen door nul is geen antwoord, conventie 3).
 * Naar boven afgerond: bij 7 kansen en een tempo van 4 per maand duurt de
 * laatste maand ook, ook al is hij niet vol.
 */
export function estimateBacklogMonths(
  backlogSize: number,
  pagesPerMonth: number,
): number | null {
  if (backlogSize <= 0 || pagesPerMonth <= 0) return null;
  return Math.ceil(backlogSize / pagesPerMonth);
}

/** De zin onder het publicatietempo: hoe lang de voorraad meegaat. */
export function backlogDurationLabel(
  backlogSize: number,
  pagesPerMonth: number,
): string | null {
  const maanden = estimateBacklogMonths(backlogSize, pagesPerMonth);
  if (maanden === null) return null;
  return maanden === 1
    ? "Bij dit tempo duurt de voorraad nog 1 maand."
    : `Bij dit tempo duurt de voorraad nog ${maanden} maanden.`;
}

