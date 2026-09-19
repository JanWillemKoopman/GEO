import "server-only";

/**
 * De DataForSEO-adapter: `keywords_data/google_ads/search_volume/live`
 * (docs/tasks/zoekdata-in-de-keten.md, blok B; prijsvergelijking in
 * `docs/tasks/ontwikkelplan-visie.md` §6).
 *
 * ── GEVERIFIEERD TEGEN EEN ECHT ACCOUNT (conventie 10, 19 september 2026) ───
 *
 * Authenticatie, endpoint en responsvorm zijn bevestigd tegen een echt
 * account (docs/logbook.md). Daarbij kwam de woordlimiet hieronder aan het
 * licht: dat is geen aanname meer maar nagemeten gedrag.
 *
 * ── AUTHENTICATIE ────────────────────────────────────────────────────────────
 *
 * Basic-auth met login:wachtwoord, base64. Twee omgevingsvariabelen,
 * `DATAFORSEO_LOGIN` en `DATAFORSEO_PASSWORD`; zonder allebei doet
 * `lib/search-demand/registry.ts` deze adapter niet mee.
 *
 * ── ALLEEN NEDERLAND, VOORLOPIG ──────────────────────────────────────────────
 *
 * DataForSEO werkt met een numerieke locatiecode per land, niet met een
 * ISO-landcode. Deze adapter kent er één: Nederland. Een tweede land erbij
 * (open vraag 1 in het plan: België) is een kleine uitbreiding van
 * `LOCATION_CODES`, geen nieuwe adapter.
 */
import type { SearchDemandProvider, SearchDemandResult } from "@/lib/search-demand/types";
import { binnenWoordlimiet, MAX_WOORDEN_PER_ZOEKTERM } from "@/lib/search-demand/keywords";

const LOCATION_CODES: Record<string, number> = {
  NL: 2528,
};

const ENDPOINT = "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live";

/** DataForSEO staat maximaal 1000 zoektermen per aanroep toe. */
export const MAX_KEYWORDS_PER_CALL = 1000;

interface DataForSeoTask {
  status_code: number;
  status_message: string;
  result: {
    keyword: string;
    search_volume: number | null;
    competition_index: number | null;
    cpc: number | null;
  }[] | null;
}

interface DataForSeoResponse {
  status_code: number;
  status_message: string;
  tasks: DataForSeoTask[] | null;
}

export function createDataForSeoProvider(login: string, password: string): SearchDemandProvider {
  const auth = Buffer.from(`${login}:${password}`).toString("base64");

  return {
    id: "dataforseo",
    async fetchVolumes(keywords, country, language) {
      if (keywords.length === 0) return [];
      const locationCode = LOCATION_CODES[country.toUpperCase()];
      if (!locationCode) {
        console.warn(`DataForSEO: geen locatiecode voor land "${country}", overgeslagen.`);
        return [];
      }

      const gefilterd = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))];

      // Vooraf uitfilteren, niet pas laten mislukken: een term boven de
      // woordlimiet hoort hetzelfde behandeld te worden als een term die
      // DataForSEO niet kent (conventie 3, "onbekend" via cache.ts): hij
      // ontbreekt simpelweg in het resultaat, in plaats van de hele batch
      // waar hij toevallig in zat te laten mislukken.
      const uniekeTermen = gefilterd.filter(binnenWoordlimiet);
      const teLang = gefilterd.length - uniekeTermen.length;
      if (teLang > 0) {
        console.warn(
          `DataForSEO: ${teLang} zoekterm boven de woordlimiet van ${MAX_WOORDEN_PER_ZOEKTERM}, overgeslagen.`,
        );
      }

      const resultaten: SearchDemandResult[] = [];

      // Batches van MAX_KEYWORDS_PER_CALL: één aanroep per batch, hetzelfde
      // soort begrenzing als Google's eigen ROW_LIMIT bij Search Console.
      for (let i = 0; i < uniekeTermen.length; i += MAX_KEYWORDS_PER_CALL) {
        const batch = uniekeTermen.slice(i, i + MAX_KEYWORDS_PER_CALL);
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            {
              keywords: batch,
              location_code: locationCode,
              language_code: language.toLowerCase(),
            },
          ]),
        });

        if (!res.ok) {
          console.warn(`DataForSEO gaf HTTP ${res.status} terug, deze batch overgeslagen.`);
          continue;
        }

        const j = (await res.json()) as DataForSeoResponse;
        const task = j.tasks?.[0];
        if (!task || task.status_code !== 20000 || !task.result) {
          console.warn(`DataForSEO-taak mislukt: ${task?.status_message ?? "geen taak in de respons"}.`);
          continue;
        }

        for (const r of task.result) {
          resultaten.push({
            keyword: r.keyword,
            volume: typeof r.search_volume === "number" ? r.search_volume : null,
            competition: typeof r.competition_index === "number" ? r.competition_index / 100 : null,
            cpc: typeof r.cpc === "number" ? r.cpc : null,
            raw: r,
          });
        }
      }

      return resultaten;
    },
  };
}
