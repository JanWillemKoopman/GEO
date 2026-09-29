/**
 * TEKST DIE OP BIJNA ELKE PAGINA VAN DE SITE STAAT, IS GEEN INHOUD
 * (V2 van `docs/tasks/pijplijnanalyse-contentketen.md`).
 *
 * `stripChrome()` in `page-text.ts` haalt menu en voettekst weg als de site ze
 * netjes als `<nav>`, `<header>` of `<footer>` opmaakt. Veel kleine sites doen
 * dat niet. In ronde 1 van de contentkwaliteit (29 september 2026) begon de
 * "stem" die de schrijver van De Waard kreeg met "Overlast van ongedierte?
 * 0184-701084 ... Menu Home Nieuws Diensten Wespenbestrijding ...", en de
 * huidige tekst van elke verbeterpagina ook.
 *
 * Deze regel kijkt niet naar de opmaak maar naar herhaling: een reeks van
 * `REEKS` woorden die op een groot deel van de andere pagina's van dezelfde site
 * letterlijk terugkomt, is menu, telefoonbalk of voettekst. Geen AI, geen lijst
 * met woorden: alleen tellen.
 *
 * Twee vangnetten, zelfde gedachte als bij `stripChrome()` ("minder tekst is
 * erger dan ruis"): met te weinig andere pagina's doet hij niets, en houdt het
 * opschonen te weinig over, dan komt de oorspronkelijke tekst terug.
 *
 * Puur en zonder `server-only` (conventie 2).
 */

/** Zoveel woorden achter elkaar moeten gelijk zijn om als herhaling te tellen. */
export const REEKS = 6;
/** Pas met zoveel andere pagina's is er genoeg om herhaling te herkennen. */
export const MIN_ANDERE_PAGINAS = 3;
/** Het deel van de andere pagina's waarop een reeks moet staan. */
export const AANDEEL = 0.4;
/** Blijft er minder over dan dit deel, dan was het opschonen niet te vertrouwen. */
export const MIN_OVER = 0.3;

function normaal(woord: string): string {
  return woord
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function reeksen(woorden: readonly string[]): Set<string> {
  const echt = woorden.filter(Boolean);
  const uit = new Set<string>();
  for (let i = 0; i + REEKS <= echt.length; i++) uit.add(echt.slice(i, i + REEKS).join(" "));
  return uit;
}

/**
 * De tekst zonder wat op een groot deel van de andere pagina's van de site
 * staat. `andere` zijn de teksten van de andere pagina's (het crawl-excerpt is
 * genoeg: menu en telefoonbalk staan bovenaan).
 */
export function zonderSiteHerhaling(tekst: string, andere: readonly string[]): string {
  const bron = tekst ?? "";
  const vergelijk = [...new Set(andere.map((t) => (t ?? "").trim()).filter((t) => t && t !== bron.trim()))];
  if (vergelijk.length < MIN_ANDERE_PAGINAS || !bron.trim()) return bron;

  const drempel = Math.max(2, Math.ceil(vergelijk.length * AANDEEL));
  const telling = new Map<string, number>();
  for (const t of vergelijk) {
    for (const r of reeksen(t.split(/\s+/).map(normaal))) telling.set(r, (telling.get(r) ?? 0) + 1);
  }

  // Tekens als "/" en "&" tellen niet als woord: anders breekt "0184-701084 /
  // 06-36232091" de reeks. Ze gaan mee weg als hun buren weggaan.
  const delen = bron.split(/(\s+)/);
  const tokens: { deel: number; norm: string }[] = [];
  delen.forEach((d, i) => {
    if (i % 2 === 0 && d) tokens.push({ deel: i, norm: normaal(d) });
  });
  const echt = tokens.map((t, i) => ({ ...t, i })).filter((t) => t.norm);
  const weg = new Array<boolean>(tokens.length).fill(false);
  for (let i = 0; i + REEKS <= echt.length; i++) {
    const r = echt.slice(i, i + REEKS);
    if ((telling.get(r.map((t) => t.norm).join(" ")) ?? 0) >= drempel) {
      for (let j = r[0]!.i; j <= r[REEKS - 1]!.i; j++) weg[j] = true;
    }
  }
  if (!weg.some(Boolean)) return bron;

  let uit = "";
  tokens.forEach((t, n) => {
    if (weg[n]) return;
    uit += delen[t.deel] + (delen[t.deel + 1] ?? "");
  });
  uit = uit.replace(/[ \t]{2,}/g, " ").trim();
  return uit.length >= bron.trim().length * MIN_OVER ? uit : bron;
}
