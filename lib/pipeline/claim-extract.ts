/**
 * Welke zinnen in een geschreven pagina zijn een BEWERING?
 * (strategie-contentkwaliteit-vervolgstappen.md S3)
 *
 * ── WAAROM DE CODE DIT MOET BEPALEN, EN NIET HET MODEL ──────────────────────
 *
 * `source_coverage` was het percentage van `claims_json` dat standhield tegen de
 * feitenkaart. Maar `claims_json` wordt door het SCHRIJVENDE model zelf
 * samengesteld: het bepaalt welke zinnen als bewering tellen. Gemeten over de
 * tien pagina's van 31 juli:
 *
 *   4.470 woorden · ~250 zinnen · 49 getagde beweringen
 *
 * Ongeveer één op de vijf zinnen werd gemeten. De andere vier vijfde waren
 * onzichtbaar voor élke controle die dit systeem heeft — en dat is precies waar
 * de twee ergste vondsten van de contentronde in verdwenen:
 *
 *   • Van der Valk: "Op valk.com zoekt en vergelijkt u snel alle opties…
 *     reserveer direct online." Aantoonbaar onjuist (er is geen boekingsmodule),
 *     niet getagd, dus source_coverage 100.
 *   • Fysi-Unique: de openingszin beweerde "biedt preventieve begeleiding",
 *     terwijl het bevestigde antwoord "nee" was. Niet getagd.
 *
 * Een cijfer waarvan de gemeten partij de noemer kiest, is geen meting. Dit is
 * de werkafspraak "een promptinstructie is een intentie, code is een garantie",
 * toegepast op de meetlat zelf.
 *
 * ── VALS-POSITIEVEN ZIJN GOEDKOPER DAN VALS-NEGATIEVEN ──────────────────────
 *
 * Deze regels zullen zinnen aanmerken die geen echte bewering zijn. Dat kost de
 * klant een regel in `review_notes`. Een gemiste fabricage kost hem zijn
 * geloofwaardigheid. Bij twijfel dus: kandidaat.
 *
 * Bewust ZONDER `server-only`: pure tekstanalyse, testbaar in een kaal script.
 */
import { splitSentences, stripMarkdown } from "@/lib/pipeline/sentences";
import { isSupported, normalizeForQuote, type FactItem, type WrittenClaim } from "@/lib/pipeline/factcard";

/** Waaróm deze zin als bewering geldt. Gaat mee naar `review_notes`. */
export type ClaimSignal = "merknaam" | "getal" | "toezegging";

export interface DetectedClaim {
  /** De zin zoals hij in de tekst staat, zonder markdown-opmaak. */
  sentence: string;
  signal: ClaimSignal;
}

/**
 * Werkwoorden en wendingen waarmee een pagina iets TOEZEGT.
 *
 * Deze lijst is niet bedacht maar afgelezen van de tien testpagina's: dit zijn
 * de woorden waarmee de onbewaakte marketingzinnen begonnen. "Reserveer direct
 * online" (Van der Valk) valt onder `reserveer`, "Fysi-Unique biedt preventieve
 * begeleiding" onder `biedt`.
 */
const TOEZEGGINGEN = [
  "biedt", "bieden", "levert", "leveren", "garandeert", "garanderen", "verzorgt",
  "verzorgen", "regelt", "regelen", "inbegrepen", "inclusief", "beschikbaar",
  "mogelijk", "kunt u", "kun je", "kunt je", "krijg je", "krijgt u", "ontvang je",
  "ontvangt u", "reserveer", "bestel", "boek je", "boekt u", "altijd", "binnen",
  "gratis", "zonder afspraak", "dezelfde dag", "wij zorgen", "we zorgen",
];

/**
 * Cijfers, bedragen, percentages, jaartallen, tijden.
 *
 * Een los cijfer is genoeg signaal: elk getal op een klantpagina is een bewering
 * die iemand kan natrekken. "22 winkels", "€250 cashback", "9,4 op Zorgkaart",
 * "sinds 1862", "tussen 12.00 en 15.00 uur".
 */
const GETAL = /(\d|€|%)/;

/** Losse woorden en koppen zijn geen bewering; hieronder wordt het ruis. */
const MIN_WOORDEN = 5;

/** Woordgrens-veilige merknaamcontrole, ongevoelig voor koppeltekens en accenten. */
function bevatMerknaam(zin: string, brandName: string): boolean {
  const merk = normalizeForQuote(brandName);
  if (merk.length < 2) return false;
  return ` ${normalizeForQuote(zin)} `.includes(` ${merk} `);
}

/**
 * Alle kandidaat-beweringen in een geschreven pagina.
 *
 * De FAQ gaat mee, en dat is geen detail: `TYPE_GUIDANCE` stuurt bij het type
 * `faq` juist alles naar het FAQ-veld en houdt `bodyMarkdown` kort. Zou deze
 * functie alleen de body bekijken, dan zou precies dat contenttype ongemeten
 * blijven. De vraagregels zelf tellen niet mee — een vraag is geen bewering.
 */
export function detectClaimSentences(
  args: { bodyMarkdown: string; faq?: { q: string; a: string }[] },
  brandName: string,
): DetectedClaim[] {
  const stukken = [
    stripMarkdown(args.bodyMarkdown ?? ""),
    ...(args.faq ?? []).map((f) => stripMarkdown(f.a ?? "")),
  ];

  const gezien = new Set<string>();
  const gevonden: DetectedClaim[] = [];

  for (const stuk of stukken) {
    for (const ruw of splitSentences(stuk)) {
      const zin = ruw.trim();
      if (zin.split(/\s+/).filter(Boolean).length < MIN_WOORDEN) continue;
      // Een vraag stelt niets; hij vraagt iets. FAQ-koppen en tussenvragen
      // vallen hier weg zonder dat we ze apart hoeven te herkennen.
      if (zin.endsWith("?")) continue;

      const sleutel = normalizeForQuote(zin);
      if (!sleutel || gezien.has(sleutel)) continue;

      // Volgorde is de sterkte van het signaal: een zin mét de merknaam is een
      // bewering over deze klant, ook zonder getal. Dat is de categorie waarin
      // beide gemiste fabricages van 31 juli vielen.
      let signal: ClaimSignal | null = null;
      if (bevatMerknaam(zin, brandName)) signal = "merknaam";
      else if (GETAL.test(zin)) signal = "getal";
      else if (TOEZEGGINGEN.some((t) => sleutel.includes(normalizeForQuote(t)))) signal = "toezegging";
      if (!signal) continue;

      gezien.add(sleutel);
      gevonden.push({ sentence: zin, signal });
    }
  }

  return gevonden;
}

/**
 * Hoort deze getagde bewering bij deze gedetecteerde zin?
 *
 * Het model tagt een parafrase ("Coolblue heeft 22 fysieke winkels"), niet de
 * letterlijke zin ("Coolblue heeft 22 fysieke winkels in Nederland waar je
 * terecht kunt voor advies"). Daarom overlap in plaats van gelijkheid: staat
 * minstens 60% van de inhoudswoorden van de claim in de zin, dan hoort hij erbij.
 *
 * 60% en niet hoger, omdat het alternatief erger is: een claim die zijn eigen
 * zin niet terugvindt telt de zin als ongemeten én de claim als los, en dan
 * straft de meting een pagina twee keer voor één formulering.
 */
export function claimMatchesSentence(claim: string, sentence: string): boolean {
  const woorden = normalizeForQuote(claim).split(" ").filter((w) => w.length > 2);
  if (woorden.length === 0) return false;
  const zin = ` ${normalizeForQuote(sentence)} `;
  const raak = woorden.filter((w) => zin.includes(` ${w} `)).length;
  return raak / woorden.length >= 0.6;
}

export interface CoverageResult {
  /** Percentage gedetecteerde beweringen dat herleidbaar is. `null` = niets gedetecteerd. */
  coverage: number | null;
  /** Hoeveel zinnen de code als bewering aanmerkte — de eerlijke noemer. */
  detected: number;
  /** Hoeveel beweringen het model zelf tagde. */
  tagged: number;
  /** Getagde beweringen die de feitenkaart niet draagt. */
  unsupported: WrittenClaim[];
  /** Zinnen die als bewering gelden maar door het model nooit getagd zijn. */
  untagged: DetectedClaim[];
}

/**
 * De bronnendekking, met een noemer die de code bepaalt.
 *
 * Een gedetecteerde zin telt als gedekt wanneer er een getagde claim bij hoort
 * die `isSupported()` overleeft. Een zin zonder claim telt als ONgedekt — dat is
 * het hele punt: niet-taggen mag geen manier zijn om aan de meting te ontsnappen.
 *
 * Nul gedetecteerde zinnen geeft `null` en niet 100. "Ik heb niets beweerd" is
 * geen perfecte dekking maar een ontbrekend oordeel, en `null` is daar de enige
 * eerlijke weergave van (dezelfde regel als `sourceCoverage()`).
 */
export function detectedCoverage(args: {
  detected: DetectedClaim[];
  claims: WrittenClaim[];
  facts: FactItem[];
}): CoverageResult {
  const { detected, claims, facts } = args;

  const echt = claims.filter((c) => c.claim?.trim());
  const gedekteClaims = echt.filter((c) => isSupported(c.factRef, facts, c.quote ?? null));
  const unsupported = echt.filter((c) => !gedekteClaims.includes(c));

  if (detected.length === 0) {
    return { coverage: null, detected: 0, tagged: echt.length, unsupported, untagged: [] };
  }

  const untagged = detected.filter(
    (d) => !gedekteClaims.some((c) => claimMatchesSentence(c.claim, d.sentence)),
  );

  const gedekt = detected.length - untagged.length;
  return {
    coverage: Math.round((gedekt / detected.length) * 100),
    detected: detected.length,
    tagged: echt.length,
    unsupported,
    untagged,
  };
}
