import "server-only";

/**
 * Kent het web dit merk als ENTITEIT? (optimalisatie.md 7.4)
 *
 * Of een bedrijf in Wikidata en Wikipedia voorkomt, is een van de sterkste
 * signalen die AI-systemen gebruiken om het überhaupt als bestaand ding te
 * herkennen. Staat een merk daar niet, dan is het voor een model geen entiteit
 * maar een woord, en een woord kun je niet aanbevelen.
 *
 * Bewust GEEN AI-aanroep: Wikidata en Wikipedia hebben allebei een gratis,
 * open API zonder sleutel. Een model laten raden of een bedrijf in Wikidata
 * staat, terwijl je het exact kunt opzoeken, is geld uitgeven aan een slechter
 * antwoord.
 */
import { USER_AGENT } from "@/lib/crawler";

const TIMEOUT_MS = 8000;

export interface EntityPresence {
  wikidataId: string | null;
  wikidataLabel: string | null;
  wikipediaUrl: string | null;
  checkedAt: string;
}

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface WikidataSearch {
  search?: { id: string; label?: string; description?: string; url?: string }[];
}

interface WikipediaSearch {
  query?: { search?: { title: string }[] };
}

/**
 * Zoekt het merk in Wikidata.
 *
 * De valkuil is een naamgenoot: "Fresh" levert tientallen treffers op waarvan
 * geen enkele dit bedrijf is. Daarom eisen we dat de beschrijving óf de branche
 * óf een bedrijfswoord bevat, liever niets vinden dan de verkeerde entiteit
 * aan een klant koppelen en hem laten denken dat hij er al op staat.
 */
const COMPANY_WORDS = [
  "bedrijf", "onderneming", "company", "business", "organisatie", "organization",
  "winkel", "retailer", "merk", "brand", "fabrikant", "manufacturer", "dienstverlener",
];

async function findWikidata(
  brandName: string,
  industry: string | null,
): Promise<{ id: string; label: string } | null> {
  const query = encodeURIComponent(brandName);
  const data = await getJson<WikidataSearch>(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${query}&language=nl&uselang=nl&format=json&limit=10&origin=*`,
  );

  const hits = data?.search ?? [];
  if (hits.length === 0) return null;

  const industryWord = industry?.toLowerCase().split(/\s+/)[0] ?? null;
  const plausible = hits.find((h) => {
    const description = (h.description ?? "").toLowerCase();
    if (!description) return false;
    if (industryWord && description.includes(industryWord)) return true;
    return COMPANY_WORDS.some((w) => description.includes(w));
  });

  // Alleen bij een exacte naamovereenkomst nemen we ook een treffer zonder
  // herkenbare bedrijfsbeschrijving aan: dan is de kans op een naamgenoot klein
  // genoeg, en het alternatief (niets melden) is hier de slechtere fout.
  const exact = hits.find((h) => h.label?.toLowerCase() === brandName.toLowerCase());
  const chosen = plausible ?? (exact && hits.length === 1 ? exact : null);

  return chosen ? { id: chosen.id, label: chosen.label ?? brandName } : null;
}

/** Zoekt een Nederlandstalig Wikipedia-artikel met exact deze titel. */
async function findWikipedia(brandName: string): Promise<string | null> {
  const query = encodeURIComponent(brandName);
  const data = await getJson<WikipediaSearch>(
    `https://nl.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&srlimit=5&origin=*`,
  );

  const hits = data?.query?.search ?? [];
  // Alleen een EXACTE titel telt. Wikipedia's zoekfunctie geeft graag
  // gerelateerde artikelen terug, en "je staat op Wikipedia" op basis van een
  // artikel over je branche is gewoon onwaar.
  const exact = hits.find((h) => h.title.toLowerCase() === brandName.toLowerCase());
  if (!exact) return null;

  return `https://nl.wikipedia.org/wiki/${encodeURIComponent(exact.title.replace(/ /g, "_"))}`;
}

export async function checkEntityPresence(
  brandName: string,
  industry: string | null,
): Promise<EntityPresence> {
  const checkedAt = new Date().toISOString();
  if (!brandName.trim()) {
    return { wikidataId: null, wikidataLabel: null, wikipediaUrl: null, checkedAt };
  }

  const [wikidata, wikipediaUrl] = await Promise.all([
    findWikidata(brandName, industry),
    findWikipedia(brandName),
  ]);

  return {
    wikidataId: wikidata?.id ?? null,
    wikidataLabel: wikidata?.label ?? null,
    wikipediaUrl,
    checkedAt,
  };
}
