/**
 * Welke gecrawlde pagina's horen bij DIT onderwerp?
 * (strategie-contentkwaliteit-vervolgstappen.md S1)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * `buildFactBase()` nam tot nu toe de eerste 8 rijen uit `profile_pages`. Geen
 * `order by`, geen filter. Wat dat in productie oplevert, gemeten op de
 * contentronde van 31 juli:
 *
 *   Coolblue, onderwerp "wasmachine kopen". De 8 gekozen pagina's waren de
 *   homepage, /ons-assortiment, /klantenservice, /winkels, plus dezelfde vier
 *   NOG EEN KEER in het Engels (/en/…). Nul wasmachinepagina's. Terwijl er
 *   TIEN gecrawld waren, 15.000 tekens, met titels als "wasmachine kopen waar
 *   op letten" en "de wasmachine voor jouw gezinssamenstelling".
 *
 *   Fysi-Unique, onderwerp "hardloopblessure behandelen". Gekozen: heupklachten,
 *   knieklachten, hoofdpijn, medische fitness, zwangerschapsbegeleiding,
 *   revalidatie, tarieven. De pagina /fysiotherapie-bij-hardloopklachten-in-
 *   amersfoort/ was wél gecrawld en werd niet gekozen, terwijl dat exact de
 *   pagina is waaruit het onderzoek de antwoorden haalde.
 *
 * Gevolg: over vijf analyses stonden er 24 citeerbare feiten op de kaart, en
 * géén enkele ging over het onderwerp van de analyse. Een pagina van 500 woorden
 * over hardloopblessures moest gebouwd worden uit vier therapeutenbio's en een
 * Zorgkaart-cijfer.
 *
 * ── WAAROM GEEN EMBEDDINGS ──────────────────────────────────────────────────
 *
 * Het onderscheid dat we moeten maken is grof: gaat deze pagina over wasmachines
 * of over de klantenservice? Termoverlap ziet dat prima, kost niets, en is
 * regel-voor-regel na te lopen wanneer er ooit een rare selectie uitkomt. Een
 * embedding-aanroep zou hier een blackbox toevoegen aan een keuze die je juist
 * wilt kunnen verklaren.
 *
 * Bewust ZONDER `server-only`: pure selectielogica, testbaar in een kaal script.
 */

/** Eén gecrawlde pagina, zoals hij uit `profile_pages` komt. */
export interface CandidatePage {
  url: string;
  title: string | null;
  text: string;
}

export interface ScoredPage extends CandidatePage {
  /** Hoeveel van de onderwerptermen deze pagina raakt, gewogen. */
  score: number;
  /** Het pad zonder taalsegment. Twee varianten van dezelfde pagina delen dit. */
  canonical: string;
}

/**
 * Woorden die niets over het onderwerp zeggen. Kort gehouden: alleen wat in
 * vrijwel elke Nederlandse vraag voorkomt, plus de Engelse equivalenten omdat
 * doelvragen soms een Engelse merknaam of term bevatten.
 */
const STOPWOORDEN = new Set([
  "aan", "als", "bij", "dat", "deze", "die", "dit", "door", "een", "een", "een",
  "haar", "hebben", "heeft", "het", "hoe", "hun", "ien", "iets", "kan", "kun",
  "kunnen", "meer", "met", "moet", "naar", "niet", "nog", "ook", "over", "voor",
  "van", "wat", "waar", "wanneer", "welke", "wel", "wie", "worden", "wordt",
  "zijn", "zoals", "and", "for", "the", "what", "which", "with", "you", "your",
  // Woorden die in élke doelvraag van dit product staan en dus niets scheiden.
  "beste", "goede", "goedkope", "tips", "advies", "vraag", "vragen", "site",
  "website", "pagina", "nederland",
]);

/**
 * Eén woord terugbrengen tot z'n stam.
 *
 * Zelfde ruwe aanpak als `claimKey()` in factcard.ts, en met opzet dezelfde:
 * "wasmachine" moet "wasmachines" raken en "blessure" moet "blessures" raken.
 * Nederlands kent -en en -s als meervoud; de lengtegrenzen houden korte woorden
 * heel ("les" wordt geen "le").
 */
export function stem(woord: string): string {
  const w = woord
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
  if (w.length > 5 && w.endsWith("en")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/**
 * De onderwerptermen: waar moet een relevante pagina over gaan?
 *
 * Voeder dit met het analyse-onderwerp en de teksten van de doelvragen. De
 * doelvragen wegen zwaar mee in wat er uitkomt, en dat is de bedoeling: dít zijn
 * de vragen die de pagina moet winnen, dus dít zijn de pagina's die we nodig
 * hebben.
 */
export function topicTerms(...bronnen: (string | null | undefined)[]): string[] {
  const termen = new Set<string>();
  for (const bron of bronnen) {
    if (!bron) continue;
    for (const ruw of bron.split(/[^a-zA-Z0-9À-ɏ]+/)) {
      if (ruw.length < 3) continue;
      const s = stem(ruw);
      if (s.length < 3 || STOPWOORDEN.has(s) || STOPWOORDEN.has(ruw.toLowerCase())) continue;
      termen.add(s);
    }
  }
  return Array.from(termen);
}

/**
 * Het pad van een URL zonder taalsegment, zodat /en/winkels en /winkels als
 * dezelfde pagina gelden.
 *
 * Dit is geen finesse: de helft van de Coolblue-selectie ging op aan Engelse
 * duplicaten van pagina's die er al in stonden. Vier van de acht plekken, weg
 * aan tekst die de klant niet eens publiceert.
 *
 * Alleen het EERSTE segment wordt als taal herkend, en alleen als het exact twee
 * letters is uit een korte lijst. Een pad als /nl-nl/… komt ook voor.
 */
const TAALSEGMENT = /^(nl|en|de|fr|es|it|be|pl|da|sv|no|fi)(-[a-z]{2})?$/i;

export function canonicalPath(url: string): string {
  let pad = url;
  try {
    pad = new URL(url).pathname;
  } catch {
    // Geen geldige URL: dan is de hele string het pad. Beter een ruwe sleutel
    // dan hier een fout gooien om een crawlrij die net niet klopt.
    pad = url.replace(/^https?:\/\/[^/]*/i, "");
  }
  const segmenten = pad.split("/").filter(Boolean);
  if (segmenten.length > 0 && TAALSEGMENT.test(segmenten[0])) segmenten.shift();
  return "/" + segmenten.join("/").toLowerCase().replace(/\/+$/, "");
}

/**
 * Hoeveel van de onderwerptermen raakt deze pagina?
 *
 * Geteld wordt het aantal VERSCHILLENDE termen dat voorkomt, niet hoe vaak.
 * Anders wint één lange pagina die het woord "wasmachine" veertig keer noemt van
 * een pagina die alle vier de termen raakt, en die tweede is de betere bron.
 *
 * Titel en URL wegen drie keer zo zwaar als de body. Een term in de titel zegt
 * "deze pagina gáát hierover"; een term ergens in de lopende tekst zegt alleen
 * "hij komt voor". Bij Coolblue is dat precies het verschil tussen
 * /advies/wasmachine-kopen-waar-op-letten en de homepage die het woord ook noemt.
 */
export function scorePage(page: CandidatePage, terms: string[]): number {
  if (terms.length === 0) return 0;

  const kop = new Set(topicTerms(page.title, page.url));
  const body = new Set(topicTerms(page.text));

  let score = 0;
  for (const term of terms) {
    if (kop.has(term)) score += 3;
    else if (body.has(term)) score += 1;
  }
  return score;
}

/**
 * De pagina's die bij dit onderwerp horen, beste eerst.
 *
 * Drie regels, in deze volgorde:
 *
 *   1. **Taalvarianten samenvouwen.** Per canoniek pad blijft de best scorende
 *      variant over; bij gelijke score wint de kortste URL (dat is vrijwel altijd
 *      de Nederlandse).
 *   2. **Sorteren op relevantie**, bij gelijke score op URL zodat de uitkomst
 *      stabiel is. Een selectie die per aanroep verschilt maakt de feitenkaart
 *      onverklaarbaar.
 *   3. **Aanvullen tot `max`.** Levert de scoring te weinig relevante pagina's
 *      (score 0 voor alles, een onderwerp dat nergens op de site staat), dan
 *      vullen we aan met de best beschikbare rest. Liever een dunne kaart met
 *      algemene pagina's dan een lege: `formatFactCard()` heeft al een eerlijke
 *      lege-kaart-instructie, maar die zet de schrijver volledig stil.
 */
export function selectRelevantPages(
  pages: CandidatePage[],
  terms: string[],
  max: number,
): ScoredPage[] {
  const perPad = new Map<string, ScoredPage>();

  for (const page of pages) {
    if (!page.url?.trim()) continue;
    const scored: ScoredPage = {
      ...page,
      score: scorePage(page, terms),
      canonical: canonicalPath(page.url),
    };

    const bestaand = perPad.get(scored.canonical);
    if (
      !bestaand ||
      scored.score > bestaand.score ||
      (scored.score === bestaand.score && scored.url.length < bestaand.url.length)
    ) {
      perPad.set(scored.canonical, scored);
    }
  }

  return Array.from(perPad.values())
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, max);
}
