/**
 * Het verschil tussen twee versies van een pagina, woord voor woord
 * (content-editie, onderdeel 1: versiediff, naar Nova's "contentvoorbeeld met
 * diff, rood is oud, groen is nieuw").
 *
 * Bewust ZONDER `server-only`: pure vergelijking van twee strings, geen
 * database, testbaar vanuit scripts/test-unit.ts. `lib/pipeline/similarity.ts`
 * geeft alleen een gelijkenis-SCORE (voor dubbele-pagina-detectie), geen
 * alignment, dus dat is hier geen bruikbare basis, dit is terecht nieuw werk.
 *
 * Algoritme: klassieke LCS (longest common subsequence) via een suffix-DP-
 * tabel, daarna een voorwaartse wandeling die meteen de editscript-volgorde
 * oplevert (geen aparte backtrack-en-omdraai-stap nodig). Getokeniseerd op
 * `/(\s+)/` zodat witruimte zelf een token is: dat behoudt de opmaak bij
 * reconstructie in plaats van alle woorden aan elkaar te plakken.
 */

export type DiffOpType = "gelijk" | "toegevoegd" | "verwijderd";

export interface DiffOp {
  type: DiffOpType;
  text: string;
}

export interface DiffResult {
  ops: DiffOp[];
  /** "woord" is het normale geval, "alinea" is de terugval bij te lange teksten. */
  granularity: "woord" | "alinea";
}

/**
 * Boven deze `oudTokens.length × nieuwTokens.length` valt de DP-tabel terug op
 * alineaniveau. Een pagina van 800 tot 1500 woorden geeft met witruimte-tokens
 * erbij circa 1600 tot 3000 tokens per kant, dus een product tot circa 9
 * miljoen, in milliseconden te doen. Deze grens ligt ruim daarboven en raakt
 * dus alleen een pagina die een klant handmatig fors heeft uitgebreid.
 */
const DEFAULT_MAX_PRODUCT = 16_000_000;

function tokenizeWords(text: string): string[] {
  // Lege strings uit een split op een randgeval (lege tekst) eruit, anders
  // krijg je een enkel leeg token dat als "verschil" meetelt.
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

function tokenizeParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter((t) => t.length > 0);
}

/**
 * De kern: LCS via een suffix-DP-tabel (`dp[i][j]` = lengte van de langste
 * gemeenschappelijke subreeks van `oud[i:]` en `nieuw[j:]`), gevolgd door een
 * voorwaartse wandeling vanaf `(0,0)`. Die wandeling levert het editscript al
 * in de juiste volgorde op: bij een vervanging komt "verwijderd" vanzelf vóór
 * "toegevoegd", omdat de oude tekst eerst gelezen wordt.
 */
function runDiff(oudTokens: string[], nieuwTokens: string[]): DiffOp[] {
  const m = oudTokens.length;
  const n = nieuwTokens.length;

  const dp: Int32Array[] = new Array(m + 1);
  for (let i = 0; i <= m; i++) dp[i] = new Int32Array(n + 1);

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] =
        oudTokens[i] === nieuwTokens[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oudTokens[i] === nieuwTokens[j]) {
      ops.push({ type: "gelijk", text: oudTokens[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "verwijderd", text: oudTokens[i] });
      i++;
    } else {
      ops.push({ type: "toegevoegd", text: nieuwTokens[j] });
      j++;
    }
  }
  while (i < m) {
    ops.push({ type: "verwijderd", text: oudTokens[i] });
    i++;
  }
  while (j < n) {
    ops.push({ type: "toegevoegd", text: nieuwTokens[j] });
    j++;
  }

  return collapseOps(ops);
}

/** Aangrenzende ops van hetzelfde type samenvoegen, anders krijgt de UI honderden losse stukjes per woord. */
function collapseOps(ops: DiffOp[]): DiffOp[] {
  const out: DiffOp[] = [];
  for (const op of ops) {
    const last = out[out.length - 1];
    if (last && last.type === op.type) last.text += op.text;
    else out.push({ ...op });
  }
  return out;
}

export function diffContent(
  oud: string,
  nieuw: string,
  maxProduct: number = DEFAULT_MAX_PRODUCT,
  /**
   * Woordniveau overslaan en meteen op alinea's vergelijken (2 september 2026).
   *
   * ── WAAROM DIT NODIG BLEEK ──────────────────────────────────────────────
   *
   * Woord-voor-woord werkt prachtig tussen twee VERSIES van onze eigen tekst:
   * daar verandert een zin en blijft de rest staan. Tussen de pagina van de
   * klant en de vervangende tekst werkt het averechts, want die twee delen
   * alleen hun kleine woorden. De eerste echte vergelijking, met de pagina van
   * Wouter Warmtepomp, leverde dit op:
   *
   *   "Hybride Warmtepomp ~~Wouter Warmtepomp B.V.~~ Voor ~~Airco~~ Dongen en
   *    ~~warmtepomp installateur~~ Oosterhout ~~to is footer~~ op ~~Home~~ basis"
   *
   * Doorgestreepte en nieuwe woorden om beurten, uit twee teksten die niets met
   * elkaar te maken hebben. Dat is geen vergelijking maar ruis, en het
   * suggereert bovendien een precisie die er niet is: een verbetering is een
   * herschrijving, geen bewerking. Op alineaniveau staat er wat er staat: dit
   * blok gaat eruit, dit blok komt erin.
   */
  granulariteit: "auto" | "alinea" = "auto",
): DiffResult {
  const oudWoorden = tokenizeWords(oud);
  const nieuwWoorden = tokenizeWords(nieuw);

  if (granulariteit !== "alinea" && oudWoorden.length * nieuwWoorden.length <= maxProduct) {
    return { ops: runDiff(oudWoorden, nieuwWoorden), granularity: "woord" };
  }

  // Terugval: dezelfde motor, maar op hele alinea's in plaats van woorden. Een
  // enkele gewijzigde zin ziet er dan uit als "hele alinea vervangen" in
  // plaats van een precieze woord-voor-woord-markering, minder scherp, maar
  // nog steeds bruikbaar, en zonder de kostenexplosie van de volle DP-tabel.
  const oudAlineas = tokenizeParagraphs(oud);
  const nieuwAlineas = tokenizeParagraphs(nieuw);
  return { ops: runDiff(oudAlineas, nieuwAlineas), granularity: "alinea" };
}
