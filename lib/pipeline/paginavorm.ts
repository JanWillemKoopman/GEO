/**
 * DE VORM VAN DE PAGINA: opening, merkstem en koppen (V8, V1 en V10 uit
 * `docs/tasks/contentkwaliteit-copywriterronde.md`).
 *
 * Drie controles in één module, want ze trekken aan hetzelfde touw en moeten
 * samen gewogen worden: alle drie verschuiven ze iets aan wat een AI-assistent
 * uit de pagina oppakt. Ze los invoeren zou betekenen dat de ene de andere
 * ongemerkt onderuit haalt.
 *
 * ── DE SPANNING DIE HIER OPGELOST WORDT ─────────────────────────────────────
 *
 * De copywriter, regel 1: "Begin niet met het bedrijf. Begin met de situatie
 * waarin de lezer zich bevindt." Elf van de twaalf openingen van 3 september
 * 2026 deden het andersom: "Bij Fysio Centrum Utrecht kun je terecht voor",
 * "MJB Dakservice helpt in Twello bij", "In Apeldoorn kun je MJB Dakservice
 * bellen".
 *
 * Tegelijk is precies die eerste alinea het blok dat een AI-assistent citeert,
 * en daar HOORT de merknaam in: een assistent die "wij" leest, weet niet welk
 * merk hij moet noemen. Die twee sluiten elkaar niet uit, maar wel als je ze
 * allebei op dezelfde ZIN legt. De regel is daarom: de eerste zin gaat over de
 * lezer, de eerste ALINEA noemt het merk.
 */

const OPENING_ALINEA_MAX = 600;

/** De eerste alinea van de body, zonder koppen. */
export function eersteAlinea(bodyMarkdown: string): string {
  const regels = (bodyMarkdown ?? "")
    .split("\n")
    .filter((r) => !/^\s{0,3}#{1,6}\s/.test(r) && !/^\s*[*>-]\s/.test(r));
  const eerste = regels.map((r) => r.trim()).find((r) => r.length > 0) ?? "";
  return eerste.slice(0, OPENING_ALINEA_MAX);
}

/** De eerste zin van die alinea. */
export function eersteZin(bodyMarkdown: string): string {
  const alinea = eersteAlinea(bodyMarkdown);
  const match = alinea.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : alinea).trim();
}

function bevatMerk(tekst: string, merknaam: string): boolean {
  const naam = (merknaam ?? "").trim();
  if (!naam) return false;
  return tekst.toLowerCase().includes(naam.toLowerCase());
}

export interface OpeningResult {
  eersteZin: string;
  /** Begint de eerste zin bij het merk in plaats van bij de lezer? */
  begintBijMerk: boolean;
  /** Begint de pagina met "Ja" op een vraag die niemand stelde? */
  begintMetJa: boolean;
  /** Staat de merknaam ergens in de eerste alinea? Dat hoort wél. */
  merkInAlinea: boolean;
  issues: string[];
}

/**
 * Begint deze pagina bij de lezer of bij het bedrijf? (V8)
 *
 * Het "Ja" apart, want dat is een eigen fout: zes van de twaalf pagina's van
 * 3 september openden ermee, waarvan vijf op een landingspagina of artikel waar
 * niemand een vraag gesteld had. Op een pagina met een vraag als kop is het
 * sterk; los erboven is het een antwoord op een vraag die de lezer niet kent.
 */
export function checkOpening(bodyMarkdown: string, merknaam: string): OpeningResult {
  const zin = eersteZin(bodyMarkdown);
  const alinea = eersteAlinea(bodyMarkdown);

  const begintBijMerk = bevatMerk(zin, merknaam);
  const begintMetJa = /^ja[.,!\s]/i.test(zin.trim());
  const merkInAlinea = bevatMerk(alinea, merknaam);

  const issues: string[] = [];

  if (begintMetJa) {
    issues.push(
      `De pagina begint met "Ja", terwijl er geen vraag boven staat. Begin bij de situatie van de ` +
        `lezer: waar zit hij mee op het moment dat hij hier komt?`,
    );
  }

  if (begintBijMerk) {
    issues.push(
      `De eerste zin begint bij het bedrijf in plaats van bij de lezer: "${zin}". Beschrijf eerst ` +
        `wat de lezer meemaakt, en noem het bedrijf daarna als de oplossing.`,
    );
  }

  // ⚠️ De andere kant van dezelfde medaille. Zonder deze regel lost V8 het ene
  // probleem op en maakt het een groter: de openingsalinea is het blok dat een
  // AI-assistent citeert, en zonder merknaam weet die niet wie hij moet noemen.
  if (!merkInAlinea) {
    issues.push(
      `De merknaam staat nergens in de eerste alinea. Een AI-assistent citeert juist dat blok, en ` +
        `zonder naam weet hij niet over welk bedrijf het gaat. Noem hem in de tweede of derde zin.`,
    );
  }

  return { eersteZin: zin, begintBijMerk, begintMetJa, merkInAlinea, issues };
}

export interface MerkstemResult {
  /** Zinnen in de eerste persoon (wij, we, ons, onze). */
  wijZinnen: number;
  /** Hoe vaak de merknaam in de derde persoon valt. */
  merkvermeldingen: number;
  woorden: number;
  /** Merkvermeldingen per honderd woorden. */
  perHonderd: number;
  issues: string[];
}

/** Boven dit aantal merkvermeldingen per honderd woorden praat de pagina óver het bedrijf. */
export const MERK_PER_HONDERD_MAX = 1.5;

/**
 * Spreekt het bedrijf ergens zelf op zijn eigen site? (V1)
 *
 * ⚠️ Gemeten over de twaalf pagina's van 3 september 2026: TWEE keer "wij" of
 * "we" in 13.600 woorden, allebei in een kop en nul keer in een zin, tegenover
 * 164 keer de merknaam in de derde persoon. Eén vermelding per 83 woorden. Het
 * resultaat leest als een productbeschrijving die iemand anders over dit bedrijf
 * schreef.
 *
 * De oorzaak is een bewuste regel: noem het bedrijf bij naam, want een
 * AI-assistent die "wij" leest weet niet welk merk hij moet citeren. Die regel
 * blijft, maar begrensd: in de citeerbare zinnen, niet in élke zin.
 *
 * De grens van 1,5 per honderd woorden is gekozen en niet gemeten. Hij ligt
 * ruim onder de 1,2 die deze twaalf pagina's haalden en laat een pagina van
 * duizend woorden vijftien keer de naam noemen, genoeg voor het
 * openingsantwoord plus de eerste zin van elke sectie.
 */
export function checkMerkstem(
  bodyMarkdown: string,
  merknaam: string,
): MerkstemResult {
  const tekst = bodyMarkdown ?? "";
  const naam = (merknaam ?? "").trim();

  const zinnen = tekst
    .replace(/^#{1,6} .*$/gm, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((z) => z.trim())
    .filter(Boolean);

  const wijZinnen = zinnen.filter((z) => /\b(wij|we|ons|onze)\b/i.test(z)).length;
  const woorden = tekst.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w)).length;

  const merkvermeldingen = naam
    ? (tekst.match(new RegExp(naam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) ?? []).length
    : 0;
  const perHonderd = woorden > 0 ? (merkvermeldingen / woorden) * 100 : 0;

  const issues: string[] = [];

  // Allebei nodig: veel merknaam is prima zolang het bedrijf ook zelf praat, en
  // geen "wij" is prima op een korte pagina die de naam twee keer noemt.
  if (wijZinnen === 0 && perHonderd > MERK_PER_HONDERD_MAX) {
    issues.push(
      `Het bedrijf zegt nergens "wij" op zijn eigen pagina, en de merknaam staat er ` +
        `${merkvermeldingen} keer in de derde persoon (${perHonderd.toFixed(1)} per honderd ` +
        `woorden). Zo leest het als een beschrijving óver het bedrijf. Laat het bedrijf zelf ` +
        `praten, en houd de merknaam in het openingsantwoord en de eerste zin van elke sectie.`,
    );
  }

  return { wijZinnen, merkvermeldingen, woorden, perHonderd, issues };
}

export interface VraagkoppenResult {
  koppen: number;
  vragen: number;
  aandeel: number;
  issues: string[];
}

/** Hoogstens dit aandeel van de koppen mag een vraag zijn, behalve bij een FAQ. */
export const VRAAGKOPPEN_MAX = 0.5;

/**
 * Is dit een verhaal of een vragenlijst? (V10)
 *
 * ⚠️ Gemeten over de twaalf pagina's van 3 september 2026: 169 van de 228 koppen
 * is een vraag, 74 procent, en op vier pagina's is élke kop er een. De
 * copywriter, patroon 3 op twaalf van de twaalf: "Als vrijwel iedere alinea
 * antwoord geeft op een losse vraag, ontbreekt waarschijnlijk een verhaal."
 *
 * Bij een FAQ geldt de regel niet: daar zijn vragen het punt.
 */
export function checkVraagkoppen(
  bodyMarkdown: string,
  isFaqPagina: boolean,
): VraagkoppenResult {
  const koppen = (bodyMarkdown ?? "")
    .split("\n")
    .map((r) => r.match(/^\s{0,3}#{2,6}\s+(.*)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => m[1].trim());

  const vragen = koppen.filter((k) => k.endsWith("?")).length;
  const aandeel = koppen.length > 0 ? vragen / koppen.length : 0;

  const issues: string[] = [];
  if (!isFaqPagina && koppen.length >= 4 && aandeel > VRAAGKOPPEN_MAX) {
    issues.push(
      `${vragen} van de ${koppen.length} koppen is een vraag. Dan is dit een vragenlijst en geen ` +
        `verhaal. Maak van de meeste koppen een mededeling die zegt wat er in die sectie staat, ` +
        `en bewaar de vraagvorm voor de plek waar de lezer hem echt zo stelt.`,
    );
  }

  return { koppen: koppen.length, vragen, aandeel, issues };
}
