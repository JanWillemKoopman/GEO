/**
 * De waardeproposities uit het merkprofiel, klaar om de schrijfopdracht in te gaan
 * (docs/tasks/contentpijplijn-publicatiewaardig.md, WP1).
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Het profielonderzoek schrijft de waardeproposities op zoals een analist dat
 * doet: met de herkomst erbij. Op productie (25 september 2026) stond bij de
 * hovenier "Meer dan 35 jaar ervaring, volgens de website" en "De klant wordt
 * naar eigen zeggen van A tot Z ontzorgd", bij de installateur "Het bedrijf zegt
 * werkzaamheden ... te regelen". Die zinnen gingen letterlijk de schrijfprompt in
 * als "waarom klanten kiezen", en een schrijver die "volgens de website" leest,
 * neemt die afstand over: "35 jaar ervaring, maar dat zegt op zichzelf niets"
 * (§1.2, O2 van het plan). Daarnaast stonden er dubbelingen in, omdat het
 * onderzoek twee keer draaide en `unionList()` alleen exact gelijke zinnen
 * samenvoegt: 11 regels bij de hovenier, waarvan 5 tweemaal hetzelfde, 9 bij de
 * rijschool, waarvan 3 dubbel.
 *
 * ── WAT ER GEBEURT ──────────────────────────────────────────────────────────
 *
 * 1. Herkomsttaal eraf halen waar dat zonder de zin te verbuigen kan
 *    ("volgens de website", "naar eigen zeggen", "De website biedt X aan").
 * 2. Blijft er daarna nog herkomsttaal staan ("De website stelt dat het bedrijf
 *    tuinen realiseert"), dan vervalt de regel. Zo'n bijzin netjes omzetten
 *    vraagt taalkennis die een regel code niet heeft, en een verkeerd verbogen
 *    zin in de schrijfopdracht is erger dan een ontbrekende (conventie 3). In
 *    alle drie de merkdossiers stond dezelfde propositie ook in een schone vorm.
 * 3. Dubbelingen weg op inhoudswoorden: twee regels waarvan de kleinste voor
 *    minstens 75 procent in de andere zit, zijn dezelfde propositie. Gemeten op
 *    de drie merkdossiers: dan vallen precies de dubbele regels weg en geen
 *    enkele echte (zie de test in `scripts/test-unit.ts`).
 *
 * Puur (conventie 2): geen database, testbaar met de echte zinnen.
 */

/**
 * Herkomsttaal die we kunnen weghalen zonder de zin kapot te maken. Volgorde
 * telt: de langste vormen eerst, zodat "volgens de website" niet half blijft
 * staan als "volgens de".
 */
const WEG_TE_HALEN: RegExp[] = [
  // ", volgens de website" en "volgens de site" op elke plek in de zin.
  /,?\s*(?:zo\s+)?volgens\s+(?:de|hun|zijn|haar|eigen)\s+(?:eigen\s+)?(?:website|site|webpagina|homepage|pagina)\b/gi,
  // "naar eigen zeggen", "naar eigen zeggen van het bedrijf".
  /,?\s*naar\s+eigen\s+zeggen(?:\s+van\s+het\s+bedrijf)?\b/gi,
  // "(volgens de site)" tussen haakjes.
  /\s*\((?:volgens|bron:)[^)]*\)/gi,
];

/**
 * Omzettingen van een hele zin waarvan het meta-deel ervoor staat. Elke vorm
 * laat de kern ongemoeid staan en haalt alleen het werkwoord van de bron weg.
 */
const OMZETTINGEN: { patroon: RegExp; naar: (m: RegExpMatchArray) => string }[] = [
  // "De website biedt een gratis, vrijblijvende offerte aan" → "Een gratis, vrijblijvende offerte".
  {
    patroon: /^(?:de|het)\s+(?:website|site|bedrijf)\s+biedt\s+(.+?)\s+aan\.?$/i,
    naar: (m) => m[1],
  },
  // "De pagina over CV-ketelvervanging vermeldt een officiële CO-certificering ..."
  {
    patroon:
      /^(?:de|het)\s+(?:website|site|pagina|webpagina)(?:\s+over\s+.+?)?\s+(?:vermeldt|noemt|toont|beschrijft)\s+(?:een\s+|de\s+|het\s+)?(.+)$/i,
    naar: (m) => m[1],
  },
  // "Vermeldt officiële CO-certificering ... op de pagina over CV-ketelvervanging."
  {
    patroon:
      /^(?:vermeldt|noemt|toont)\s+(.+?)\s+op\s+(?:de|zijn|haar)\s+(?:website|site|pagina|webpagina)(?:\s+over\s+[^.]+)?\.?$/i,
    naar: (m) => m[1],
  },
];

/**
 * Wat er na het schoonmaken NIET meer in mag staan. Staat het er toch, dan is
 * de zin een verslag over de bron en geen propositie, en vervalt hij.
 */
const RESTERENDE_HERKOMST =
  /\b(?:website|webpagina|homepage|naar eigen zeggen|zegt|stelt dat|claimt|beweert|communicatie|benadrukt)\b|\bsite\b|\bde pagina\b|\bvolgens (?:de|hun|zijn|haar) (?:eigen )?(?:site|pagina)\b/i;

/** Eerste letter hoofdletter, rest ongemoeid. */
function hoofdletter(zin: string): string {
  return zin.charAt(0).toUpperCase() + zin.slice(1);
}

/** Spaties, losse leestekens aan het eind en een lege staart opruimen. */
function netjes(zin: string): string {
  return zin
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[,;:]\s*$/, "")
    .trim();
}

/**
 * Eén propositie schoonmaken. Geeft `null` als er na het schoonmaken nog
 * herkomsttaal overblijft: dan is het geen propositie maar een verslag.
 *
 * Een zin met een puntkomma ("Gratis en vrijblijvende offerte; de website zegt
 * te streven naar verzending binnen 4 uur") wordt per deel beoordeeld: het deel
 * zonder herkomst blijft, het deel met herkomst vervalt.
 */
export function schoonWaardepropositie(ruw: string): string | null {
  const delen = ruw
    .split(";")
    .map((deel) => {
      let zin = deel.trim();
      for (const patroon of WEG_TE_HALEN) zin = zin.replace(patroon, "");
      zin = netjes(zin);
      for (const { patroon, naar } of OMZETTINGEN) {
        const m = zin.match(patroon);
        if (m) {
          zin = netjes(naar(m));
          break;
        }
      }
      return zin;
    })
    .filter((zin) => zin.length > 0 && !RESTERENDE_HERKOMST.test(zin));

  if (delen.length === 0) return null;
  const zin = netjes(delen.join("; ")).replace(/\.$/, "");
  // Te kort om iets te zeggen ("Gratis"): liever weg dan een losse flard.
  if (inhoudswoorden(zin).size < 2) return null;
  return hoofdletter(zin);
}

/** Woorden die in elke propositie staan en niets over de inhoud zeggen. */
const STOPWOORDEN = new Set([
  "de", "het", "een", "en", "of", "van", "met", "voor", "in", "op", "tot", "bij", "uit", "aan",
  "te", "om", "als", "die", "dat", "er", "is", "zijn", "wordt", "worden", "naar", "ieder", "elke",
]);

/** De inhoudswoorden van een zin, genormaliseerd, zonder stopwoorden. */
function inhoudswoorden(zin: string): Set<string> {
  return new Set(
    zin
      .toLowerCase()
      .replace(/[()]/g, "")
      .split(/[^a-z0-9à-ÿ-]+/i)
      .map((w) => w.replace(/^-+|-+$/g, ""))
      .filter((w) => w.length > 1 && !STOPWOORDEN.has(w)),
  );
}

/**
 * Zelfde propositie in andere woorden? De overlapcoëfficiënt: het deel van de
 * KLEINSTE woordverzameling dat in de andere zit. Niet Jaccard, want een
 * propositie met een extra bijzin ("... of vergelijkbare extra
 * begeleidingsbehoeften") zou dan als nieuw gelden terwijl hij hetzelfde zegt.
 *
 * 0,75 is gekozen op de drie merkdossiers van 25 september 2026: de kleinste
 * echte dubbeling (de lesvormen van de rijschool) haalt precies 0,75, het
 * hoogste niet-dubbele paar komt op 0,29 (de twee dienstenomschrijvingen van
 * de hovenier).
 */
export const DUBBEL_DREMPEL = 0.75;

export function zelfdePropositie(a: string, b: string): boolean {
  return overlap(a, b) >= DUBBEL_DREMPEL;
}

/** De overlapcoëfficiënt zelf, 0 bij minder dan twee inhoudswoorden. */
export function overlap(a: string, b: string): number {
  const wa = inhoudswoorden(a);
  const wb = inhoudswoorden(b);
  const kleinste = Math.min(wa.size, wb.size);
  if (kleinste < 2) return 0;
  let gedeeld = 0;
  for (const w of wa) if (wb.has(w)) gedeeld++;
  return gedeeld / kleinste;
}

/**
 * De hele lijst: schoonmaken, ontdubbelen, volgorde behouden. Van een dubbel
 * paar blijft de eerste staan; dat is in het profiel de waarde die er het eerst
 * stond, dus bij een klant die zelf iets invulde zijn eigen formulering
 * (`unionList()` zet klantwaarden vooraan).
 */
export function schoneWaardeproposities(lijst: readonly string[] | null | undefined): string[] {
  const uit: string[] = [];
  for (const ruw of lijst ?? []) {
    if (typeof ruw !== "string") continue;
    const schoon = schoonWaardepropositie(ruw);
    if (!schoon) continue;
    if (uit.some((bestaand) => zelfdePropositie(bestaand, schoon))) continue;
    uit.push(schoon);
  }
  return uit;
}

// ════════════════════════════════════════════════════════════════════════════
// Dezelfde herkomsttaal op de FEITENKAART.
//
// Nagerekend op de schrijfaanroepen van 25 september 2026: niet alleen de
// waardeproposities, ook 26 van de 45 feiten met als bron de kale domeinnaam
// (de proof points uit het profielonderzoek) begonnen met "De website
// vermeldt", "De website noemt" of "Bedrijfsgegevens volgens de aangeleverde
// website-informatie". Die gaan als F-nummer naar de schrijver, en de schrijver
// moet er letterlijk uit citeren.
//
// Daarom hier alleen een VOORVOEGSEL of een staart eraf, nooit een omzetting:
// wat overblijft is letterlijk een stuk van het feit, dus een citaat eruit blijft
// een citaat uit het opgeslagen feit (`normalizeForQuote()` negeert hoofdletters
// en leestekens). Een bijzin met "dat" houdt daardoor zijn werkwoord achteraan
// ("Leerlingen les krijgen van één vaste instructeur"); dat leest stroef, maar
// de schrijver herschrijft de zin toch, en de afstand tot het eigen bedrijf is
// weg. Het opgeslagen feit verandert niet (conventie 8).
// ════════════════════════════════════════════════════════════════════════════

const VINDPLAATS_VOOR: RegExp[] = [
  /^bedrijfsgegevens\s+volgens\s+de\s+(?:aangeleverde\s+)?(?:website|site)(?:-informatie)?\s*:\s*/i,
  /^volgens\s+de\s+(?:eigen\s+)?(?:website|site)(?:\s+van\s+\S+)?\s*[,:]?\s*/i,
  /^(?:de|zijn|haar)\s+(?:eigen\s+)?(?:website|site|webpagina)(?:\s+van\s+\S+)?\s+(?:vermeldt|noemt|beschrijft|meldt|toont|geeft|stelt|zegt|biedt)(?:\s+aan)?(?:\s+in\s+de\s+[^:]{1,40}:|\s+dat\b|\s+als\b|\s*:)?\s*/i,
];

const VINDPLAATS_NA = /,?\s*(?:zo\s+)?(?:volgens\s+de\s+(?:eigen\s+)?(?:website|site)|naar\s+eigen\s+zeggen)\s*\.?$/i;

/**
 * Een feittekst zonder de vindplaats ervoor of erachter, voor de weergave op de
 * feitenkaart. Blijft er te weinig over, dan de oorspronkelijke tekst: liever
 * herkomsttaal dan een feit dat onleesbaar is geworden.
 */
export function zonderVindplaats(tekst: string): string {
  let uit = tekst.trim();
  const bieden = /^(?:de|zijn|haar)\s+(?:eigen\s+)?(?:website|site)\s+biedt\s/i.test(uit);
  for (const patroon of VINDPLAATS_VOOR) {
    const nieuw = uit.replace(patroon, "");
    if (nieuw !== uit) {
      uit = nieuw;
      break;
    }
  }
  uit = uit.replace(VINDPLAATS_NA, "");
  // "De website biedt een gratis offerte aan." → "een gratis offerte".
  if (bieden) uit = uit.replace(/\s+aan\s*\.?$/i, "");
  // "De website vermeldt: “35+ Jaar ervaring”." → "35+ Jaar ervaring".
  uit = uit.replace(/^[“"‘']\s*(.+?)\s*[”"’']\s*\.?$/, "$1").trim();
  if (inhoudswoorden(uit).size < 2) return tekst.trim();
  return hoofdletter(uit);
}
