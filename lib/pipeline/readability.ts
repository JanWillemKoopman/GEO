/**
 * Is deze tekst te lezen voor een gewone bezoeker?
 * (docs/tasks/inspace-optimalisaties-1-4.md, 4)
 *
 * ── GEEN VERZONNEN FLESCH-SCORE ─────────────────────────────────────────────
 *
 * De verleiding is een getal van 0 tot 100. Dat is hier om twee redenen fout.
 * Ten eerste is de Flesch-formule op Nederlands een aanpassing van een
 * aanpassing, en suggereert een getal een precisie die de formule niet heeft.
 * Ten tweede, en belangrijker: niemand weet wat 58 betekent, dus niemand doet
 * er iets mee. Dat is precies het patroon dat dit project al drie keer heeft
 * teruggedraaid — het verzonnen volumegetal 0–100 werd drie banden (migratie
 * 0017), en de zelfrapportage van de content-gate werd een deterministische
 * poort.
 *
 * Dus: vier gemeten grootheden, een oordeel in drie standen, en een
 * verbeterpunt dat een AANTAL noemt. "12 zinnen zijn langer dan 30 woorden,
 * knip ze in tweeën" is uitvoerbaar; "leesbaarheidsscore 58" niet.
 *
 * Puur, dus testbaar (conventie 2).
 */

export interface ReadabilityResult {
  zinnen: number;
  gemiddeldeZinslengte: number;
  /** Zinnen langer dan 30 woorden — die leest niemand in één keer. */
  langeZinnen: number;
  /** Aandeel woorden van 4+ lettergrepen, geschat op klinkergroepen. */
  langeWoordenRatio: number;
  /** Passieve constructies: "wordt … door", "werd … door". */
  passief: number;
  oordeel: "goed" | "stroef" | "moeilijk";
}

/** Vanaf hier leest een zin niet meer in één adem. */
const LANGE_ZIN = 30;

/**
 * Drempels om mee te beginnen, af te stellen op echte pagina's. Bewust ruim: een
 * poort die op de eerste tien pagina's altijd afgaat, wordt genegeerd en is dan
 * erger dan geen poort.
 */
const STROEF_GEMIDDELDE = 20;
const MOEILIJK_GEMIDDELDE = 25;
const STROEF_LANGE_RATIO = 0.15;
const MOEILIJK_LANGE_RATIO = 0.25;

/** Markdown-opmaak en codeblokken eruit; die zijn geen proza. */
function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*[#>|-]+\s*/gm, " ")
    .replace(/[*_]+/g, "");
}

/**
 * Zinnen splitsen op eindleestekens.
 *
 * Afkortingen met een punt ("bijv.", "d.w.z.") leveren losse fragmenten op, maar
 * die zijn kort en drukken het gemiddelde omláág — ze kunnen dus geen vals
 * alarm veroorzaken, alleen een gemist geval. Dat is de goede kant om te falen.
 */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 3);
}

/** Lettergrepen schatten op klinkergroepen. Ruw, maar consistent ruw. */
function syllables(word: string): number {
  const groepen = word.toLowerCase().match(/[aeiouyà-ÿ]+/g);
  return groepen ? groepen.length : 1;
}

export function assessReadability(markdown: string): ReadabilityResult {
  const tekst = plainText(markdown);
  const zinnen = sentences(tekst);

  if (zinnen.length === 0) {
    // Geen tekst is geen oordeel. `goed` teruggeven zou een lege pagina
    // goedkeuren; de contentpoort heeft daar al een eigen lengtecontrole voor.
    return {
      zinnen: 0,
      gemiddeldeZinslengte: 0,
      langeZinnen: 0,
      langeWoordenRatio: 0,
      passief: 0,
      oordeel: "goed",
    };
  }

  const lengtes = zinnen.map((z) => z.split(/\s+/).filter(Boolean).length);
  const totaalWoorden = lengtes.reduce((a, b) => a + b, 0);
  const gemiddelde = totaalWoorden / zinnen.length;
  const langeZinnen = lengtes.filter((l) => l > LANGE_ZIN).length;

  const woorden = tekst.split(/[^a-zA-Zà-ÿ]+/).filter((w) => w.length > 0);
  const langeWoorden = woorden.filter((w) => syllables(w) >= 4).length;
  const langeWoordenRatio =
    woorden.length === 0 ? 0 : langeWoorden / woorden.length;

  const passief = (tekst.match(/\b(wordt|worden|werd|werden)\b[^.!?]{0,60}\bdoor\b/gi) ?? [])
    .length;

  const langeRatio = langeZinnen / zinnen.length;
  const oordeel: ReadabilityResult["oordeel"] =
    gemiddelde > MOEILIJK_GEMIDDELDE || langeRatio > MOEILIJK_LANGE_RATIO
      ? "moeilijk"
      : gemiddelde > STROEF_GEMIDDELDE || langeRatio > STROEF_LANGE_RATIO
        ? "stroef"
        : "goed";

  return {
    zinnen: zinnen.length,
    gemiddeldeZinslengte: Math.round(gemiddelde * 10) / 10,
    langeZinnen,
    langeWoordenRatio: Math.round(langeWoordenRatio * 1000) / 1000,
    passief,
    oordeel,
  };
}

/**
 * Het verbeterpunt dat de klant leest.
 *
 * Noemt het AANTAL en niet het oordeel: "12 zinnen zijn langer dan 30 woorden"
 * kan iemand aanpakken, "de tekst is stroef" niet.
 */
export function describeReadability(r: ReadabilityResult): string {
  const delen: string[] = [];

  if (r.langeZinnen > 0) {
    delen.push(
      `${r.langeZinnen} ${r.langeZinnen === 1 ? "zin is" : "zinnen zijn"} langer dan ${LANGE_ZIN} woorden — knip ze in tweeën`,
    );
  }
  if (r.gemiddeldeZinslengte > STROEF_GEMIDDELDE) {
    delen.push(
      `de gemiddelde zin telt ${r.gemiddeldeZinslengte} woorden (streef naar minder dan ${STROEF_GEMIDDELDE})`,
    );
  }
  if (r.passief > 2) {
    delen.push(
      `${r.passief} zinnen zijn in de lijdende vorm ("wordt … door") — actief leest directer`,
    );
  }

  if (delen.length === 0) {
    return `De tekst leest vlot: gemiddeld ${r.gemiddeldeZinslengte} woorden per zin.`;
  }
  return `${delen.join("; ")}.`;
}
