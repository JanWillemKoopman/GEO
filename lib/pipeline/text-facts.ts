/**
 * Harde feiten uit de LOPENDE TEKST van een site (4 augustus 2026).
 *
 * ── WAAROM DIT ERBIJ MOEST ──────────────────────────────────────────────────
 *
 * `structured-data.ts` oogst uit JSON-LD en OpenGraph, en dat is de betere bron:
 * expliciet gelabeld, geen giswerk. Maar bij de eerste echte onboarding bleef er
 * na filtering NUL controleerbaar feit over — Fysi-Unique zet wél `Organization`
 * in zijn opmaak, maar zonder adres, telefoonnummer of oprichtingsjaar. Het blok
 * "klopt wat ChatGPT over je zegt?" had daardoor niets om tegen af te zetten.
 *
 * Terwijl die gegevens er gewoon staan. Het `citeert`-antwoord van diezelfde
 * meting noemde ze letterlijk: "Henry Dunantstraat 32, 3822 XE" en
 * "(033) 455 89 45" — gevonden op de contactpagina die wij zelf gecrawld hadden.
 *
 * Voor het merendeel van het MKB is dit de normale situatie: een SEO-plugin die
 * `WebPage` en `Article` neerzet en verder niets. Zonder deze module werkt de
 * kennistest daar principieel niet.
 *
 * ── DE REGEL DIE VALS ALARM VOORKOMT ────────────────────────────────────────
 *
 * Een verkeerd feit is hier duurder dan een ontbrekend feit. Zou er een tweede
 * telefoonnummer van de site komen — een samenwerkende praktijk, een
 * verwijspagina — dan zou `checkFacts()` het juiste antwoord van ChatGPT als
 * `tegengesproken` markeren. Dat is precies de melding waar een ondernemer van
 * schrikt, en hij zou nergens op slaan.
 *
 * Vandaar twee beperkingen, allebei deterministisch:
 *
 *   1. Alleen CANONIEKE pagina's: de homepage en pagina's waarvan het pad naar
 *      contact/over-ons wijst. Daar staat het echte nummer; op een blog staat
 *      dat van iemand anders.
 *   2. Per soort maar ÉÉN waarde: degene die op de meeste van die pagina's
 *      voorkomt. Dat is in de praktijk de voettekst, en die is per definitie de
 *      canonieke. Bij een gelijkspel wint niemand en geven we niets terug —
 *      onbekend is beter dan een verkeerde (conventie 3).
 *
 * Puur, dus testbaar (conventie 2).
 */
import type { HarvestedFact } from "@/lib/pipeline/structured-data";

/** Waar in het pad we het canonieke telefoonnummer en adres verwachten. */
const CANONICAL_PATH_HINTS = [
  "contact",
  "over-",
  "over_",
  "/over",
  "about",
  "wie-zijn-wij",
  "praktijk",
  "vestiging",
  "locatie",
  "route",
];

/**
 * Nederlandse telefoonnummers in de gangbare schrijfwijzen.
 *
 * ⚠️ De scheidingstekens omvatten HAAKJES. De eerste versie deed dat niet, en
 * die miste het nummer van Fysi-Unique — dat staat er als "(033) 455 89 45",
 * met de kengetalhaakjes die op vrijwel elke Nederlandse praktijksite staan.
 * Zonder `(` en `)` in de klasse stopt de match na drie cijfers.
 *
 * Een dubbele punt staat er bewust NIET in: anders wordt "08:00 - 20:30" uit
 * een openingstijdenblok een telefoonnummer.
 */
const PHONE_RE = /\(?(?:\+31|0031|0)[\s.()-]{0,3}\d(?:[\s.()-]{0,3}\d){7,9}/g;

/**
 * Straat + huisnummer + postcode + plaats.
 *
 * ⚠️ Een komma mag zowel vóór als NÁ de postcode staan. De eerste versie stond
 * hem alleen ervoor, en Fysi-Unique schrijft "Henry Dunantstraat 32 3822 XE,
 * Amersfoort" — met de komma erachter. Twee tekens verschil, nul adressen
 * gevonden.
 */
const ADDRESS_RE =
  /([A-Z][A-Za-zÀ-ÿ'.\- ]{2,40}\s+\d+[a-zA-Z]?)\s*,?\s*(\d{4}\s?[A-Z]{2})\s*,?\s*([A-Z][A-Za-zÀ-ÿ'\- ]{2,30})/g;

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** "KvK 12345678", "KvK-nummer: 12345678". */
const KVK_RE = /kvk[^\d]{0,15}(\d{8})\b/gi;

/**
 * Cijferreeksen die eruitzien als een telefoonnummer maar het niet zijn. Een
 * KvK-nummer van acht cijfers dat met een 0 begint valt precies binnen het
 * telefoonpatroon.
 */
function looksLikePhone(candidate: string): boolean {
  const digits = candidate.replace(/\D+/g, "");
  // Nederlandse vaste en mobiele nummers: 10 cijfers binnenlands (06…, 033…),
  // 11–12 met landcode. Korter is een postcode of een KvK-nummer.
  return digits.length >= 10 && digits.length <= 12;
}

export interface CrawledPage {
  url: string;
  text: string;
}

/** Is dit een pagina waar het canonieke adres en nummer op staan? */
export function isCanonicalPage(url: string): boolean {
  let path: string;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    path = url.toLowerCase();
  }
  // De homepage telt altijd mee: daar staat de voettekst ook.
  if (path === "" || path === "/") return true;
  return CANONICAL_PATH_HINTS.some((hint) => path.includes(hint));
}

function matchesOf(text: string, re: RegExp): string[] {
  return [...text.matchAll(new RegExp(re.source, re.flags))].map((m) =>
    m[0].trim(),
  );
}

/**
 * Achtervoegsels waaraan een Nederlandse straatnaam te herkennen is.
 *
 * Nodig omdat het adrespatroon van links naar rechts leest en dus meepakt wat
 * er vóór de straatnaam staat. Bij Fysi-Unique leverde dat "Fysi-Unique Henry
 * Dunantstraat 32 3822 XE, Amersfoort" op: de merknaam in de voettekst staat
 * pal voor het adres en begint óók met een hoofdletter.
 */
const STREET_SUFFIXES =
  /(straat|weg|laan|plein|kade|dijk|baan|park|hof|singel|gracht|pad|dreef|steeg|boulevard|allee)$/i;

/**
 * Het adres terugbrengen tot straat + huisnummer + postcode + plaats.
 *
 * Zoekt het laatste woord vóór het huisnummer dat op een straatachtervoegsel
 * eindigt en knipt daarvoor af — met hooguit één woord ervoor, want
 * "Henry Dunantstraat" en "Van der Valkweg" bestaan allebei. Vindt hij geen
 * herkenbaar achtervoegsel, dan blijft het adres zoals het is: liever een
 * adres met een woord te veel dan geen adres.
 */
export function trimStreet(adres: string): string {
  const woorden = adres.split(/\s+/);
  const nummerIndex = woorden.findIndex((w) => /^\d+[a-zA-Z]?$/.test(w));
  if (nummerIndex < 1) return adres;

  for (let i = nummerIndex - 1; i >= 0; i--) {
    if (STREET_SUFFIXES.test(woorden[i].replace(/[^A-Za-zÀ-ÿ]/g, ""))) {
      // Eén woord ervoor meenemen als het met een kleine letter begint
      // ("Van der Valkweg" → "der" telt niet mee, "Henry" wel omdat het een
      // hoofdletter heeft en dus deel van de naam is).
      const start = i > 0 && /^[A-ZÀ-Þ]/.test(woorden[i - 1]) ? i - 1 : i;
      return woorden.slice(start).join(" ");
    }
  }
  return adres;
}

/**
 * De waarde die op de meeste pagina's voorkomt. Bij een gelijkspel: niets, want
 * dan kunnen we niet zeggen welke de echte is.
 */
function mostCommon(values: string[][], byDigits = false): string | null {
  const telling = new Map<string, { count: number; original: string }>();
  for (const perPagina of values) {
    // Per pagina één stem per unieke waarde: een telefoonnummer dat drie keer
    // op dezelfde pagina staat is nog steeds één pagina.
    for (const v of new Set(perPagina.map((x) => x.replace(/\s+/g, " ")))) {
      // Bij een telefoonnummer tellen alleen de cijfers: "(033) 455 89 45" en
      // "033-4558945" zijn hetzelfde nummer. Bij een adres juist niet — twee
      // straten met hetzelfde huisnummer en dezelfde postcodecijfers zouden dan
      // als één waarde tellen.
      const sleutel = byDigits
        ? (v.replace(/\D+/g, "") || v.toLowerCase())
        : v.toLowerCase();
      const huidig = telling.get(sleutel);
      telling.set(sleutel, {
        count: (huidig?.count ?? 0) + 1,
        original: huidig?.original ?? v,
      });
    }
  }
  if (telling.size === 0) return null;

  const gesorteerd = [...telling.values()].sort((a, b) => b.count - a.count);
  if (gesorteerd.length > 1 && gesorteerd[0].count === gesorteerd[1].count) {
    return null;
  }
  return gesorteerd[0].original;
}

/**
 * Oogst telefoon, adres, e-mail en KvK uit de gecrawlde tekst.
 *
 * Geeft hooguit één feit per soort terug, met `fromType: "Tekst"` zodat in de
 * database zichtbaar blijft dat dit uit lopende tekst komt en niet uit opmaak —
 * en `checkableFacts()` het niet als paginaniveau-ruis wegfiltert.
 */
export function harvestTextFacts(pages: CrawledPage[]): HarvestedFact[] {
  const canoniek = pages.filter((p) => isCanonicalPage(p.url) && p.text.trim());
  if (canoniek.length === 0) return [];

  const facts: HarvestedFact[] = [];

  const telefoon = mostCommon(
    canoniek.map((p) => matchesOf(p.text, PHONE_RE).filter(looksLikePhone)),
    true,
  );
  if (telefoon) facts.push({ key: "telefoon", value: telefoon, fromType: "Tekst" });

  const adres = mostCommon(
    canoniek.map((p) =>
      matchesOf(p.text, ADDRESS_RE).map((a) => trimStreet(a.replace(/\s+/g, " "))),
    ),
  );
  if (adres) facts.push({ key: "adres", value: adres, fromType: "Tekst" });

  const email = mostCommon(
    canoniek.map((p) =>
      matchesOf(p.text, EMAIL_RE)
        .map((e) => e.toLowerCase())
        // Beeld- en bestandsnamen die op een e-mailadres lijken.
        .filter((e) => !/\.(png|jpe?g|webp|svg|gif)$/.test(e)),
    ),
  );
  if (email) facts.push({ key: "email", value: email, fromType: "Tekst" });

  // KvK staat vrijwel altijd op één pagina (de voorwaarden of het colofon), dus
  // hier telt "komt voor" en niet "komt het vaakst voor".
  for (const p of canoniek) {
    const m = new RegExp(KVK_RE.source, KVK_RE.flags).exec(p.text);
    if (m) {
      facts.push({ key: "kvk", value: m[1], fromType: "Tekst" });
      break;
    }
  }

  return facts;
}

/**
 * De per-pagina geoogste feiten samenvoegen tot één canonieke set.
 *
 * ── WAAROM DIT EEN TWEEDE STAP IS ───────────────────────────────────────────
 *
 * `harvestTextFacts()` draait in de crawler, per pagina, op de VOLLEDIGE tekst —
 * en dat moet daar, want wat `crawlPages` bewaart is afgekapt op 1500 tekens en
 * bij Fysi-Unique staat het telefoonnummer op de contactpagina ná die grens.
 *
 * Maar de regel die vals alarm voorkomt — "per soort de waarde die op de MEESTE
 * canonieke pagina's staat" — kan pas als je alle pagina's hebt. Vandaar hier.
 *
 * Bij een gelijkspel geven we niets terug. Twee verschillende telefoonnummers op
 * even veel pagina's betekent dat we niet weten welke de echte is, en een
 * verkeerd nummer zou ChatGPT's júíste antwoord als `tegengesproken` markeren.
 */
export function mergeTextFacts(
  pages: { url: string; facts: HarvestedFact[] }[],
): HarvestedFact[] {
  const canoniek = pages.filter((p) => isCanonicalPage(p.url));
  if (canoniek.length === 0) return [];

  const perSleutel = new Map<string, string[][]>();
  for (const p of canoniek) {
    // Per pagina één stem per sleutel: `harvestTextFacts` levert er al hooguit
    // één per soort, maar deze vorm past op `mostCommon`.
    const gezien = new Map<string, string[]>();
    for (const f of p.facts) {
      gezien.set(f.key, [...(gezien.get(f.key) ?? []), f.value]);
    }
    for (const [key, waarden] of gezien) {
      perSleutel.set(key, [...(perSleutel.get(key) ?? []), waarden]);
    }
  }

  const out: HarvestedFact[] = [];
  for (const [key, waarden] of perSleutel) {
    // Het KvK-nummer staat vrijwel altijd op één pagina (de voorwaarden of het
    // colofon), dus daar telt "komt voor" en niet "komt het vaakst voor".
    const waarde =
      key === "kvk"
        ? (waarden[0]?.[0] ?? null)
        : mostCommon(waarden, key === "telefoon");
    if (waarde) out.push({ key, value: waarde, fromType: "Tekst" });
  }
  return out;
}
