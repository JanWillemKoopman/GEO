/**
 * Het deterministische vangnet onder de samenvatting van het rapport.
 *
 * ── DE FOUT DIE DIT REPAREERT ───────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 31 augustus 2026, in de eerste live doorloop van de hele
 * klantreis. De alinea "Wat dit betekent" opende met:
 *
 *   "Wouter Warmtepomp wordt in deze eerste meting nog niet genoemd bij de 15
 *    onderzochte vragen. [...] De meting bestaat uit 30 antwoorden."
 *
 * Er stonden 30 vragen in het meetplan en er zijn 46 metingen over die 30
 * vragen gedaan. Het model haalde "15" ergens uit zijn invoer, waarschijnlijk
 * uit het aantal gemiste vragen in het bewijsdossier, en sprak zichzelf drie
 * zinnen verder tegen. Voor de klant is dit het eerste getal dat hij leest, en
 * twee getallen die elkaar tegenspreken maken het hele rapport ongeloofwaardig.
 *
 * ── WAAROM CODE EN NIET NOG EEN PROMPTREGEL (conventie 1) ───────────────────
 *
 * Het aantal onderzochte vragen is te tellen; daar hoeft geen model aan te pas
 * te komen. De instructie krijgt het getal nu wel expliciet mee (dat is de
 * intentie), en deze functie corrigeert wat er alsnog uit komt (dat is de
 * garantie). Precies het patroon van `mention_role`, `normalizePosition()` en
 * `mergeOverlappingRecommendations()`.
 *
 * ── WAAROM ZO SMAL ──────────────────────────────────────────────────────────
 *
 * Alleen zinsdelen die letterlijk het TOTAAL aantal onderzochte vragen
 * beweren, worden aangeraakt. Een zin als "bij 17 van de 30 vragen ontbreekt
 * het merk" blijft ongemoeid: dat is een verhouding en geen totaal, en een te
 * gretige vervanging zou daar een onwaarheid van maken. Bij twijfel niets doen
 * (conventie 3).
 */

/**
 * De vormen waarin het model het totaal opschrijft. De opvangende groep is
 * steeds het getal; de rest van de zin blijft staan zoals hij er stond.
 */
const TOTAAL_PATRONEN: RegExp[] = [
  /\b(\d{1,4})(\s+)(onderzochte\s+vragen)\b/gi,
  /\b(\d{1,4})(\s+)(gemeten\s+vragen)\b/gi,
  /\b(\d{1,4})(\s+)(vragen\s+onderzocht)\b/gi,
  /\b(\d{1,4})(\s+)(vragen\s+gemeten)\b/gi,
];

export interface SummaryCorrection {
  /** De samenvatting zoals hij opgeslagen mag worden. */
  summary: string;
  /** Welke getallen zijn rechtgezet. Leeg is de normale gang van zaken. */
  corrected: number[];
}

/**
 * Zet het aantal onderzochte vragen in de samenvatting recht.
 *
 * `actual` is het aantal UNIEKE vragen dat in deze meetronde gesteld is, niet
 * het aantal metingen: de zwaarstwegende vragen worden meerdere keren gemeten,
 * dus die twee lopen uiteen (30 vragen, 46 metingen bij de doorloop hierboven).
 * Voor de klant is "hoeveel vragen zijn er onderzocht" de eerste, en het aantal
 * herhalingen hoort in de betrouwbaarheidszin thuis.
 *
 * Bij `actual <= 0` gebeurt er niets: zonder een betrouwbaar eigen getal is
 * corrigeren gokken, en een gok in de verkeerde richting is erger dan de
 * modelfout die hij moest afvangen.
 */
export function correctQuestionCount(
  summary: string | null | undefined,
  actual: number,
): SummaryCorrection {
  const tekst = typeof summary === "string" ? summary : "";
  if (!tekst || !Number.isFinite(actual) || actual <= 0) {
    return { summary: tekst, corrected: [] };
  }

  const corrected: number[] = [];
  let resultaat = tekst;
  for (const patroon of TOTAAL_PATRONEN) {
    resultaat = resultaat.replace(
      patroon,
      (_hele, getal: string, spatie: string, staart: string) => {
        const genoemd = Number(getal);
        if (genoemd === actual) return `${getal}${spatie}${staart}`;
        corrected.push(genoemd);
        return `${actual}${spatie}${staart}`;
      },
    );
  }

  return { summary: resultaat, corrected };
}

/**
 * De regel die het aantal onderzochte vragen aan de schrijfinstructie meegeeft.
 *
 * Bewust met zoveel woorden het onderscheid tussen vragen en metingen erin: de
 * betrouwbaarheidsregel eronder noemt het aantal metingen, en zonder dit
 * onderscheid haalt het model die twee door elkaar.
 */
export function questionCountLine(uniqueQuestions: number, runs: number): string {
  if (uniqueQuestions <= 0) return "";
  const metingen =
    runs > uniqueQuestions
      ? ` Die zijn samen ${runs} keer gemeten, want de zwaarstwegende vragen worden herhaald.`
      : "";
  return (
    `AANTAL ONDERZOCHTE VRAGEN: ${uniqueQuestions}. Noem dit getal als je in de samenvatting ` +
    `zegt hoeveel vragen er onderzocht zijn, en verzin er geen ander.${metingen}`
  );
}

/**
 * Knipt de samenvatting af op maximaal `maxZinnen` zinnen (conventie 1).
 *
 * ── DE FOUT DIE DIT REPAREERT ───────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 22 september 2026: "Wat dit cluster laat zien" toonde de
 * volledige rapportsamenvatting plus een lijst met elk gemist vraag, tot wel
 * vijftien regels. De instructie in `report.ts` vraagt het model om kort te
 * schrijven, maar "kort" is geen getal en het model schreef soms zeven of acht
 * zinnen. Een gebruiker die een cluster aanvinkt wil in 3 tot 5 zinnen lezen
 * hoe het ervoor staat, geen rapport.
 *
 * Knippen op zinnen (niet op tekens) omdat een afgekapt teken halverwege een
 * woord onleesbaar is; een halve zin is dat ook, maar wel te herkennen als
 * bewust ingekort. Bij twijfel over een zinsgrens (afkortingen als "bv.")
 * wordt er niet geknipt: te veel is beter dan een verminkte zin.
 */
export function kortSamengevat(summary: string, maxZinnen = 5): string {
  const zinnen = summary.trim().match(/[^.!?]+[.!?]+(?=\s|$)/g);
  if (!zinnen || zinnen.length <= maxZinnen) return summary.trim();
  return zinnen
    .slice(0, maxZinnen)
    .map((zin) => zin.trim())
    .join(" ");
}

/**
 * Welke andere bronnen dan ChatGPT noemden het merk wél? Leest `per_engine_json`
 * van de score. Alleen bronnen met minstens één beoordeelde meting en een score
 * boven nul tellen; een ontbrekende of onleesbare bron telt niet (conventie 3).
 */
export function bronnenDieWelNoemden(
  perEngine: unknown,
  primair: string,
  labels: { id: string; label: string }[],
): string[] {
  if (!perEngine || typeof perEngine !== "object") return [];
  const uit: string[] = [];
  for (const [id, waarde] of Object.entries(perEngine as Record<string, unknown>)) {
    if (id === primair || !waarde || typeof waarde !== "object") continue;
    const { score, judged_runs } = waarde as { score?: unknown; judged_runs?: unknown };
    if (typeof score === "number" && score > 0 && typeof judged_runs === "number" && judged_runs > 0) {
      uit.push(labels.find((l) => l.id === id)?.label ?? id);
    }
  }
  return uit;
}

/**
 * De regel voor de schrijfinstructie: de score gaat over ChatGPT, en andere
 * bronnen noemden het merk wél. Bewust zonder hun cijfer: de eigenaar wil naast
 * de ChatGPT-score nergens een tweede getal zien (`lib/engines/bron.ts`).
 */
export function bronnenRegel(welGenoemdIn: string[]): string {
  if (welGenoemdIn.length === 0) return "";
  return (
    `\nBRONNEN: de score hierboven gaat alleen over ChatGPT. In ${welGenoemdIn.join(" en ")} werd ` +
    `het merk WEL genoemd. Schrijf dus nooit dat het merk nergens, bij geen enkele vraag of in geen ` +
    `enkel AI-antwoord genoemd werd; zeg dan "in ChatGPT".`
  );
}

/**
 * Het vangnet onder `bronnenRegel()` (conventie 1).
 *
 * ── DE FOUT DIE DIT REPAREERT ───────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 24 september 2026 in de kwaliteitsdoorlichting. Het rapport
 * van een rijschool opende met "Pompert werd niet genoemd bij de 30 onderzochte
 * vragen. De zichtbaarheid is daarmee ongeveer 0 op 100", terwijl de rijschool
 * in 17 van de 74 AI-overzichten van Google wél stond. Het model kreeg alleen
 * het ChatGPT-cijfer mee en kon het verschil niet weten. Voor de klant is dit de
 * eerste zin van zijn rapport: hij leest dat hij onzichtbaar is, en dat klopt niet.
 *
 * Staat er een zin die "niet genoemd" of "nergens genoemd" zegt zonder ChatGPT
 * erbij, terwijl een andere bron het merk wel noemde, dan komt er één zin
 * achter die het rechtzet. Er wordt niets herschreven: een zin herschrijven
 * zonder model is gokken, een zin toevoegen niet.
 */
export function vulBronnenAan(
  summary: string,
  welGenoemdIn: string[],
): { summary: string; aangevuld: boolean } {
  if (welGenoemdIn.length === 0 || !summary.trim()) return { summary, aangevuld: false };
  const zinnen = summary.match(/[^.!?]+[.!?]*/g) ?? [summary];
  const absoluut = zinnen.some(
    (z) =>
      /\b(niet|nergens|nooit)\s+(\S+\s+){0,3}genoemd\b|\bgeen enkele\b|\b0 op 100\b/i.test(z) &&
      !/chatgpt/i.test(z),
  );
  if (!absoluut) return { summary, aangevuld: false };
  const zin =
    ` Dat gaat over ChatGPT: in ${welGenoemdIn.join(" en ")} werd het merk wel genoemd.`;
  return { summary: summary.trimEnd() + zin, aangevuld: true };
}
