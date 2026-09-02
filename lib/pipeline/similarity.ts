/**
 * Lijkt deze pagina te veel op een andere pagina van hetzelfde merk?
 * (docs/tasks/inspace-optimalisaties-1-4.md, 3)
 *
 * ── WAAROM DIT EEN ECHT RISICO IS EN GEEN THEORIE ───────────────────────────
 *
 * Wij schrijven tot tien pagina's per merk uit DEZELFDE feitenkaart, met
 * dezelfde stijlvoorbeelden, dezelfde merkregels en hetzelfde premium model. Dat
 * is het recept voor pagina's die op elkaar lijken. Niemand meet het, en de
 * klant ziet het pas als hij ze naast elkaar legt, op het moment dat hij ze al
 * gepubliceerd heeft.
 *
 * Voor AI-zichtbaarheid is dat bovendien niet alleen een schoonheidsfout: twee
 * pagina's die hetzelfde zeggen concurreren met elkaar om dezelfde vraag, en
 * geen van beide wordt de duidelijke bron.
 *
 * ── WAAROM VIJF-GRAMMEN EN GEEN LOSSE WOORDEN ───────────────────────────────
 *
 * Twee dienstenpagina's van dezelfde praktijk delen onvermijdelijk hun
 * vakjargon: "fysiotherapie", "behandeling", "klachten", "afspraak". Op losse
 * woorden lijkt élk paar pagina's van hetzelfde merk op elkaar, en dan meet de
 * controle het merk in plaats van de pagina.
 *
 * Wat ze níét delen is hun zinsbouw. Vijf woorden achter elkaar die in twee
 * teksten identiek zijn, is geen toeval maar hergebruik.
 *
 * Puur, dus testbaar (conventie 2).
 */

/** Hoeveel woorden er in een n-gram gaan. */
const N = 5;

/**
 * De drempel waarboven we het melden. Bewust RUIM, en de gemeten waarde wordt
 * altijd gelogd zodat hij na tien echte pagina's op data bijgesteld kan worden
 * in plaats van op gevoel.
 *
 * 0,35 op vijf-grammen is veel: het betekent dat meer dan een derde van álle
 * woordgroepen van vijf letterlijk in de andere tekst voorkomt. Twee eerlijke
 * dienstenpagina's halen dat niet.
 */
export const DUPLICATE_THRESHOLD = 0.35;

/**
 * Tekst naar een vergelijkbare woordenreeks. Markdown-opmaak eruit: een pagina
 * met kopjes en een zonder zijn niet minder gelijk omdat de een `##` gebruikt.
 */
function words(text: string): string[] {
  return text
    .toLowerCase()
    // Markdown-links: de tekst houden, het adres weg.
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>|-]+/g, " ")
    .split(/[^a-z0-9à-ÿ]+/)
    .filter((w) => w.length > 0);
}

function ngrams(text: string, n = N): Set<string> {
  const w = words(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) {
    out.add(w.slice(i, i + n).join(" "));
  }
  return out;
}

/**
 * Jaccard-overlap op woord-vijf-grammen. 0 = niets gemeen, 1 = identiek.
 *
 * Jaccard en geen "hoeveel procent van A staat in B": bij die tweede scoort een
 * korte pagina die volledig in een lange voorkomt 1,00, terwijl dat in de
 * praktijk een samenvatting kan zijn en geen duplicaat. Jaccard weegt de lengte
 * van allebei mee.
 */
export function similarity(a: string, b: string): number {
  const ga = ngrams(a);
  const gb = ngrams(b);
  // Te kort voor een oordeel. Nul teruggeven en niet één: een tekst van vier
  // woorden lijkt nergens op, en een vals alarm is hier duurder dan een gemist
  // geval (conventie 3).
  if (ga.size === 0 || gb.size === 0) return 0;

  let gedeeld = 0;
  for (const g of ga) if (gb.has(g)) gedeeld++;

  const unie = ga.size + gb.size - gedeeld;
  return unie === 0 ? 0 : gedeeld / unie;
}

export interface SimilarPage {
  title: string;
  score: number;
  /**
   * Waar die pagina staat (O6, 2 september 2026).
   *
   * `eigen_content` is een pagina die ORBIT ENGINE zelf schreef; `site` is een
   * pagina die al op de website van de klant stond. Het verschil bepaalt wat de
   * klant moet doen, en daarom staat het hier en niet alleen in de tekst: bij
   * de eerste kies je welke van de twee je publiceert, bij de tweede was het
   * waarschijnlijk een verbetering en geen nieuwe pagina.
   */
  origin: "eigen_content" | "site";
  /** Het adres, alleen bij `site`. Daar kan de klant naartoe klikken. */
  url?: string | null;
}

/**
 * De pagina waar deze tekst het meest op lijkt, of `null` als er niets te
 * vergelijken valt.
 *
 * Geeft altijd de hoogste score terug, ook onder de drempel. Die waarde wordt
 * gelogd, en zonder die logging kunnen we de drempel nooit op echte data
 * bijstellen.
 */
export function mostSimilar(
  text: string,
  others: { title: string; body: string; origin?: "eigen_content" | "site"; url?: string | null }[],
): SimilarPage | null {
  let beste: SimilarPage | null = null;
  for (const other of others) {
    const score = similarity(text, other.body);
    if (!beste || score > beste.score) {
      beste = {
        title: other.title,
        score,
        origin: other.origin ?? "eigen_content",
        url: other.url ?? null,
      };
    }
  }
  return beste;
}

/**
 * Het verbeterpunt dat de klant leest. Met het percentage, want dat is te wegen.
 *
 * Twee teksten, want het zijn twee verschillende problemen (O6). Lijkt de pagina
 * op een andere pagina die WIJ schreven, dan is dat een keuze tussen twee
 * concepten en is er nog niets misgegaan. Lijkt hij op een pagina die al op de
 * site van de klant staat, dan hebben we een tweede pagina gemaakt naast een
 * pagina die er al was, en dat had een verbetering moeten zijn. Die tweede zin
 * zegt dat ook, want anders gaat de klant twee concurrerende pagina's
 * publiceren zonder te weten dat het er twee zijn.
 */
export function describeDuplicate(match: SimilarPage): string {
  const percentage = Math.round(match.score * 100);
  if (match.origin === "site") {
    return (
      `Deze pagina lijkt voor ${percentage}% op een pagina die al op je site staat` +
      `${match.url ? ` (${match.url})` : ""}. Werk die pagina bij in plaats van er een tweede naast ` +
      `te zetten: twee pagina's die hetzelfde zeggen concurreren om dezelfde vraag, en dan wordt ` +
      `geen van beide de duidelijke bron.`
    );
  }
  return (
    `Deze pagina lijkt voor ${percentage}% op "${match.title}". ` +
    `Overweeg ze samen te voegen, of maak scherper waarin ze van elkaar verschillen. ` +
    `Twee pagina's die hetzelfde zeggen concurreren om dezelfde vraag.`
  );
}
