/**
 * Wélke gecrawlde pagina's de aanbod-aanroep in gaan.
 *
 * ── HET REKENSOMMETJE DAT DIT NODIG MAAKTE ──────────────────────────────────
 *
 * `offering.ts` mag 55.000 tekens meesturen en `crawler.ts` kapt elke pagina af
 * op 1.500 tekens. Van de 150 gecrawlde pagina's halen er dus hooguit ~35 het
 * model. Welke 35 dat waren, bepaalde tot nu toe één regel: sorteren op
 * tekstlengte, langste eerst.
 *
 * Dat werkt averechts. Omdat élke pagina op 1.500 tekens is afgekapt, staan alle
 * langere pagina's precies gelijk en beslist de volgorde waarin de database ze
 * teruggaf. En de pagina's die die grens halen zijn juist de blogartikelen: een
 * dienstenpagina van 900 tekens verliest van een artikel van 4.000. Precies de
 * pagina's waar het aanbod op staat vielen als eerste af.
 *
 * ── WAT ER NU GEBEURT ───────────────────────────────────────────────────────
 *
 * Dezelfde verdeling als bij de crawl zelf (`url-priority.ts`): om beurten uit
 * elke sectie de best scorende pagina die nog past, tot het tekenbudget op is.
 * Lengte telt nog mee, maar alleen als het verschil tussen twee pagina's die
 * verder gelijk scoren.
 *
 * Puur, dus testbaar (conventie 2).
 */
import { scoreUrl } from "@/lib/pipeline/url-priority";
import { sectionOf } from "@/lib/crawl-urls";

export interface SelectablePage {
  url: string;
  title: string | null;
  text: string;
}

/**
 * Hoeveel de lengte van een pagina mag meewegen. Bewust klein: minder dan één
 * stap dieptestraf (12 punten) uit `url-priority.ts`, zodat lengte alleen
 * gelijke gevallen scheidt en nooit een dienstenpagina van een blog verliest.
 */
const LENGTE_GEWICHT = 10;
const LENGTE_IJKPUNT = 1500;

export interface PageSelection {
  /** De blokken zoals ze de prompt in gaan, belangrijkste eerst. */
  blocks: string[];
  /** De pagina's achter die blokken, in dezelfde volgorde. */
  selected: SelectablePage[];
  /** Hoeveel pagina's er niet in pasten. Nul is een ander verhaal dan honderd. */
  skipped: number;
  /** Uit hoeveel verschillende secties van de site de selectie komt. */
  sections: number;
}

function blokVoor(page: SelectablePage): string {
  return `--- ${page.url}${page.title ? ` · ${page.title}` : ""}\n${page.text}`;
}

function scoreVan(page: SelectablePage, priorityPaths: readonly string[]): number {
  const lengte =
    (Math.min(page.text.length, LENGTE_IJKPUNT) / LENGTE_IJKPUNT) * LENGTE_GEWICHT;
  return scoreUrl(page.url, priorityPaths) + lengte;
}

/**
 * Bouwt de paginablokken voor de aanbod-aanroep binnen een tekenbudget.
 *
 * Om beurten uit elke sectie, en niet sectie voor sectie: bij een site met een
 * blog van 80 pagina's en diensten van 12 zou "sectie voor sectie" het hele
 * budget aan de eerste sectie geven zodra die groot genoeg is.
 */
export function buildPageBlocks(
  pages: readonly SelectablePage[],
  maxChars: number,
  priorityPaths: readonly string[] = [],
): PageSelection {
  const bruikbaar = pages.filter((p) => p.text.trim().length > 0);

  const perSectie = new Map<string, SelectablePage[]>();
  for (const page of bruikbaar) {
    const key = sectionOf(page.url);
    const lijst = perSectie.get(key) ?? [];
    lijst.push(page);
    perSectie.set(key, lijst);
  }
  for (const lijst of perSectie.values()) {
    lijst.sort(
      (a, b) => scoreVan(b, priorityPaths) - scoreVan(a, priorityPaths) || a.url.localeCompare(b.url),
    );
  }

  const secties = [...perSectie.entries()].sort((a, b) => {
    const verschil = scoreVan(b[1][0], priorityPaths) - scoreVan(a[1][0], priorityPaths);
    if (verschil !== 0) return verschil;
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return a[0].localeCompare(b[0]);
  });

  // Wijzers per sectie, zodat de rondes elkaar niet overlappen.
  const positie = new Map<string, number>(secties.map(([segment]) => [segment, 0]));
  const gekozen: SelectablePage[] = [];
  let totaal = 0;
  let vooruitgang = true;

  while (vooruitgang && totaal < maxChars) {
    vooruitgang = false;
    for (const [segment, lijst] of secties) {
      const i = positie.get(segment) ?? 0;
      if (i >= lijst.length) continue;

      const page = lijst[i];
      positie.set(segment, i + 1);
      vooruitgang = true;

      const lengte = blokVoor(page).length;
      // Past hij niet, dan gaat deze sectie door naar de volgende pagina in
      // plaats van te stoppen: een korte pagina verderop past mogelijk wel.
      if (totaal + lengte > maxChars) continue;

      gekozen.push(page);
      totaal += lengte;
    }
  }

  // De uiteindelijke volgorde is de belangrijkste eerst, niet de rondevolgorde.
  // Zo staat een dienstenpagina bovenaan de prompt en niet halverwege.
  gekozen.sort(
    (a, b) => scoreVan(b, priorityPaths) - scoreVan(a, priorityPaths) || a.url.localeCompare(b.url),
  );

  return {
    blocks: gekozen.map(blokVoor),
    selected: gekozen,
    skipped: bruikbaar.length - gekozen.length,
    sections: new Set(gekozen.map((p) => sectionOf(p.url))).size,
  };
}
