/**
 * Waar haalt AI dit vandaan? Domeinen indelen en tellen (§4.5, blok C3 en C5).
 *
 * Bewust ZONDER `server-only` (conventie 2). De indeling bepaalt de
 * bewijskracht, en dat is een van de twee getallen bovenaan het scherm.
 *
 * ── WAAROM DE INDELING DEELS IN CODE EN DEELS IN HET MODEL ZIT ──────────────
 *
 * De bekende reviewplatforms staan hieronder als lijst. Dat is geen luiheid maar
 * de betrouwbaarste weg: Trustpilot is altijd een reviewplatform, ongeacht wat
 * een model er die dag van vindt. Wat de lijst NIET dekt, de vakpers van een
 * niche, een regionaal register, een branchevereniging, gaat via één goedkope
 * aanroep voor de hele lijst tegelijk (blok C5), precies zoals
 * `lib/offsite/presence.ts` dat doet. Eén aanroep voor tien domeinen in plaats
 * van tien aanroepen.
 *
 * De lijst wint altijd van het model. Zegt het model dat trustpilot.com vakpers
 * is, dan is dat een fout die wij kunnen voorkomen en dus voorkomen we hem.
 */
import { domainOf, IGNORED_DOMAINS } from "@/lib/offsite/domain";
import type { ReputationSourceKind } from "@/lib/types/database";

/**
 * Reviewplatforms die in de Nederlandse markt daadwerkelijk voorkomen.
 *
 * Uit de meetpraktijk, niet uit een internationale lijst: `trustpilot.com` en
 * `google.com` staan er allebei op, maar `yelp.com` levert in Nederland vrijwel
 * niets op en zou de lijst alleen langer maken. Komt er een platform bij dat
 * echt gebruikt wordt, dan hoort het hier, en dan wordt het cijfer erop ook
 * meteen gecontroleerd door de crawler (§2.4).
 */
export const REVIEW_PLATFORMS = new Set([
  "trustpilot.com",
  "trustpilot.nl",
  "klantenvertellen.nl",
  "feedbackcompany.com",
  "feedbackcompany.nl",
  "kiyoh.nl",
  "kiyoh.com",
  "zorgkaartnederland.nl",
  "werkspot.nl",
  "trustoo.nl",
  "trustlocal.nl",
  "google.com",
  "tripadvisor.nl",
  "tripadvisor.com",
  "booking.com",
  "iens.nl",
  "thuisbezorgd.nl",
]);

/** Registers en officiële bronnen: geen mening, wel bewijs dat je bestaat. */
export const REGISTERS = new Set([
  "kvk.nl",
  "rechtspraak.nl",
  "overheid.nl",
  "bigregister.nl",
  "rijksoverheid.nl",
  "europa.eu",
]);

/** Sociale platforms. Tellen mee als aanwezigheid, niet als onafhankelijk bewijs. */
export const SOCIAL = new Set([
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "tiktok.com",
  "pinterest.com",
]);

/**
 * De soort van een domein, voor zover code dat zeker weet.
 *
 * Geeft `null` terug als het niet vaststaat. Dan mag het model het zeggen (blok
 * C5), en pas als dat ook niets oplevert wordt het `overig`. Conventie 3: liever
 * onbekend dan een gok die als feit op het scherm komt.
 */
export function knownKind(
  domain: string,
  ownDomain: string | null,
): ReputationSourceKind | null {
  const d = domain.trim().toLowerCase();
  if (!d) return null;
  if (ownDomain && d === ownDomain.trim().toLowerCase()) return "eigen";
  if (REVIEW_PLATFORMS.has(d)) return "review";
  if (REGISTERS.has(d)) return "register";
  if (SOCIAL.has(d)) return "sociaal";
  return null;
}

export interface CitedSource {
  domain: string;
  citations: number;
  /** Een voorbeeld-URL, om naartoe te kunnen klikken. */
  url: string | null;
  /** Uit welk blok dit domein voor het eerst kwam. */
  firstSeenBlock: string;
}

/**
 * Telt alle aangehaalde URL's van een run per domein.
 *
 * ⚠️ `IGNORED_DOMAINS` gaat eraf, met één uitzondering: `google.com`. In de
 * off-site scan is Google een zoekmachine en zegt "sta jij op google.com" niets,
 * daarom staat hij daar op de negeerlijst. Hier is hij iets anders: de
 * Google-bedrijfsvermelding met zijn sterren is bij een lokaal MKB-bedrijf
 * vrijwel altijd de zwaarstwegende bron die AI aanhaalt. Hem wegfilteren zou
 * precies de belangrijkste bron van de klant onzichtbaar maken.
 *
 * ⚠️ De eigen site gaat er NIET af. Bij de off-site scan wel, want daar gaat het
 * over waar je nog niet staat. Hier is "zeven van de elf bronnen zijn je eigen
 * site" juist de conclusie, en die kun je niet trekken als je hem eerst weggooit.
 */
export function tallySources(
  urlsPerBlock: { block: string; urls: string[] }[],
  ownDomain: string | null,
): CitedSource[] {
  const perDomein = new Map<string, CitedSource>();

  for (const { block, urls } of urlsPerBlock) {
    for (const url of urls) {
      const domein = domainOf(url);
      if (!domein) continue;

      const eigen = ownDomain !== null && domein === ownDomain.toLowerCase();
      const isReview = REVIEW_PLATFORMS.has(domein);
      // De negeerlijst geldt hier alleen voor wat écht niets zegt. Een
      // reviewplatform of de eigen site hoort er altijd bij, ook als hij op de
      // off-site negeerlijst staat.
      if (IGNORED_DOMAINS.has(domein) && !isReview && !eigen) continue;

      const bestaand = perDomein.get(domein);
      if (bestaand) {
        bestaand.citations++;
        if (!bestaand.url) bestaand.url = url;
      } else {
        perDomein.set(domein, { domain: domein, citations: 1, url, firstSeenBlock: block });
      }
    }
  }

  return [...perDomein.values()].sort(
    (a, b) => b.citations - a.citations || a.domain.localeCompare(b.domain),
  );
}

/**
 * De regel onder blok 3: "7 van de 11 bronnen zijn je eigen site."
 *
 * Eén zin die de hele lijst samenvat, want een lijst is geen conclusie. Bij nul
 * bronnen staat er iets anders, en dat is de zwaarste bevinding die dit blok kan
 * opleveren.
 */
export function sourceMixSentence(
  sources: { domain: string; kind: ReputationSourceKind }[],
): string {
  if (sources.length === 0) {
    return "ChatGPT haalt geen enkele controleerbare bron aan over je merk.";
  }
  const eigen = sources.filter((s) => s.kind === "eigen").length;
  const totaal = sources.length;

  if (eigen === 0) {
    return `Alle ${totaal} bronnen die ChatGPT aanhaalt staan buiten je eigen site.`;
  }
  if (eigen === totaal) {
    return `Alle ${totaal} bronnen die ChatGPT aanhaalt zijn je eigen site. Wat AI over je zegt, komt volledig van jezelf.`;
  }
  return `${eigen} van de ${totaal} bronnen zijn je eigen site.`;
}

/**
 * Mag dit reviewcijfer als feit worden opgeslagen? (§4.5, het vangnet op C1)
 *
 * Drie eisen, en het model levert alleen de kandidaat. De code besluit, precies
 * zoals `validate-claims.ts` dat doet:
 *
 *   1. Een cijfer zonder URL wordt weggegooid. Zonder URL valt er niets te
 *      controleren, en een oncontroleerbaar cijfer op het scherm is erger dan
 *      geen cijfer.
 *   2. Een URL waarvan het domein niet op de platformlijst staat, moet bij het
 *      ophalen de merknaam bevatten. Anders wijst hij naar een willekeurige
 *      pagina die het model erbij verzon.
 *   3. Wat overblijft en niet bevestigd kon worden, blijft staan als
 *      ONBEVESTIGD. Weggooien zou informatie vernietigen; als feit opslaan zou
 *      liegen. De chip op het scherm doet het verschil.
 */
export function ratingIsAcceptable(args: {
  url: string | null;
  rating: number | null;
  /** Bevatte de opgehaalde pagina de merknaam? Null = niet opgehaald. */
  pageMentionsBrand: boolean | null;
}): boolean {
  if (args.rating === null || !Number.isFinite(args.rating)) return false;
  if (!args.url) return false;

  const domein = domainOf(args.url);
  if (!domein) return false;
  if (REVIEW_PLATFORMS.has(domein)) return true;

  // Onbekend platform: dan moet de pagina zelf de merknaam noemen.
  return args.pageMentionsBrand === true;
}


/**
 * De URL's die dit antwoord aandraagt als bron.
 *
 * ── ⚠️ EEN ANTWOORD DAT NIET MOCHT ZOEKEN DRAAGT GEEN BRONNEN (23 aug 2026) ──
 *
 * Gevonden in de eerste echte run. De ONGEGRONDE merkvraag over Van den Udenhout
 * leverde vijf URL's op, waaronder `vandenudenhout.nl`. De klant zit op
 * `udenhout.nl`. Het model kan die adressen niet gecontroleerd hebben, want het
 * mocht niet zoeken: het herinnerde zich een patroon en vulde de rest aan.
 *
 * Het gevolg was erger dan een rare link. Zulke URL's gaan de bronnentelling in
 * en verhogen daarmee de BEWIJSKRACHT, en dat is precies het cijfer dat moet
 * voorkomen dat een vriendelijk antwoord over een onbekend bedrijf als een goede
 * reputatie leest (§2.1). Een verzonnen domein telt bovendien als EXTERN, en
 * externe bronnen wegen het zwaarst. Het vangnet werd dus opgeblazen door
 * precies het gevaar waartegen het beschermt.
 *
 * De regel is daarom hard: een bron die niet opgezocht is, is geen bron. Het
 * ANTWOORD blijft wel volledig bewaard, want dat is blok 2 van het scherm: wat
 * het model uit zichzelf weet, tegenover wat het vindt.
 *
 * Staat de kostenknop `MEASURE_WEB_SEARCH` uit, dan geldt hetzelfde en levert de
 * hele run nul bronnen op. Dat is de juiste uitkomst: in die stand is er niets
 * opgezocht, en dan is een bewijskracht van 0 eerlijk in plaats van te laag.
 */
export function citedUrlsFrom(
  text: string,
  raw: unknown,
  grounded: boolean,
): string[] {
  if (!grounded) return [];

  const gevonden = new Set<string>();

  for (const m of text.matchAll(/https?:\/\/[^\s<>()"'\]]+/g)) {
    // Afsluitende leestekens horen niet bij de URL.
    gevonden.add(m[0].replace(/[.,;:]+$/, ""));
  }

  // En wat de API zelf als citatie aanleverde, voor zover herkenbaar. Defensief
  // uitgelezen: liever een gemiste bron dan een harde fout in een dure taak.
  try {
    for (const m of JSON.stringify(raw ?? {}).matchAll(/"url"\s*:\s*"(https?:[^"]+)"/g)) {
      gevonden.add(m[1]);
    }
  } catch {
    // Niet te serialiseren, dan blijft het bij wat er in de tekst stond.
  }

  return [...gevonden];
}
