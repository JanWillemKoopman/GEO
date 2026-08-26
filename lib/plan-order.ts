/**
 * De volgorde van pagina's binnen een maand.
 *
 * ── WAAROM GEEN SLEPEN ──────────────────────────────────────────────────────
 *
 * Nova laat je slepen. Dat is op een muis prettig en op een telefoon
 * onbetrouwbaar: HTML5-drag werkt daar niet, en de vervangers vragen dat je een
 * rij eerst een halve seconde vasthoudt zonder te scrollen. De eerste klacht van
 * dit hele traject ging over mobiel, dus dat is hier geen theoretisch bezwaar.
 * Twee knoppen doen hetzelfde werk, werken overal, en zijn met het toetsenbord
 * te bedienen zonder dat er iets extra's voor nodig is.
 *
 * ── WAT ER PRECIES VERWISSELT ───────────────────────────────────────────────
 *
 * Twee dingen tegelijk: de plek in de lijst én de publicatiedatum. Zou alleen de
 * plek wisselen, dan staat pagina B ineens bóven pagina A terwijl hij later
 * verschijnt, en dan is de lijst geen agenda meer. Zou alleen de datum wisselen,
 * dan verspringt de lijst bij de volgende keer verversen.
 *
 * Puur, dus testbaar (conventie 2).
 */

export interface OrderablePage {
  id: string;
  sort_order: number;
  scheduled_for: string | null;
  is_buffer: boolean;
  status: string;
  /** Migratie 0067: de gebruiker koos deze datum zelf. Die verhuist niet mee. */
  scheduled_manual?: boolean;
}

export interface SwapResult {
  /** De twee rijen zoals ze opgeslagen moeten worden. */
  updates: { id: string; sort_order: number; scheduled_for: string | null }[];
  /** Waarom het niet kon, in gewone taal. Null = het kan. */
  problem: string | null;
}

/**
 * Verwisselt een pagina met zijn buurman in dezelfde maand.
 *
 * ⚠️ Een geplaatste pagina blijft staan waar hij staat. Zijn datum is de
 * werkelijkheid geworden, en die verzetten zou een leugen opleveren over wanneer
 * er iets live ging. Hetzelfde geldt voor de buurman: verschuiven ten koste van
 * iets wat al gebeurd is, kan niet.
 *
 * ⚠️ Draagt één van de twee een zelfgekozen datum (migratie 0067), dan wisselen
 * alleen de plekken en houden beide hun datum. Anders verhuist de keuze "deze
 * pagina moet op 18 augustus, want dan is de beurs" naar de buurman, en dat is
 * precies de pagina waarvoor die datum niet gold.
 */
export function swapWithNeighbour(
  pages: OrderablePage[],
  pageId: string,
  richting: "omhoog" | "omlaag",
): SwapResult {
  // Buffers doen niet mee: ze staan achteraan en hebben geen datum. Ze in de
  // volgorde meenemen zou betekenen dat "omlaag" een pagina met een reserve laat
  // wisselen, en dan verliest hij zijn publicatiedatum.
  const lijst = pages
    .filter((p) => !p.is_buffer)
    .sort((a, b) => a.sort_order - b.sort_order);

  const i = lijst.findIndex((p) => p.id === pageId);
  if (i === -1) return { updates: [], problem: "Deze pagina staat niet in deze maand." };

  const j = richting === "omhoog" ? i - 1 : i + 1;
  if (j < 0 || j >= lijst.length) {
    return {
      updates: [],
      problem:
        richting === "omhoog"
          ? "Deze pagina staat al bovenaan de maand."
          : "Deze pagina staat al onderaan de maand.",
    };
  }

  const a = lijst[i];
  const b = lijst[j];

  if (a.status === "geplaatst" || b.status === "geplaatst") {
    return {
      updates: [],
      problem: "Een pagina die al live staat, houdt zijn datum.",
    };
  }

  const eigenDatum = a.scheduled_manual === true || b.scheduled_manual === true;

  return {
    updates: [
      {
        id: a.id,
        sort_order: b.sort_order,
        scheduled_for: eigenDatum ? a.scheduled_for : b.scheduled_for,
      },
      {
        id: b.id,
        sort_order: a.sort_order,
        scheduled_for: eigenDatum ? b.scheduled_for : a.scheduled_for,
      },
    ],
    problem: null,
  };
}

/** Kan deze pagina omhoog of omlaag? Bepaalt of de knop er staat. */
export function canMove(
  pages: OrderablePage[],
  pageId: string,
  richting: "omhoog" | "omlaag",
): boolean {
  return swapWithNeighbour(pages, pageId, richting).problem === null;
}
