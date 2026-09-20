import "server-only";

/**
 * Is er een zoekvolumeleverancier beschikbaar in deze omgeving?
 *
 * Zelfde regel als `lib/engines/registry.ts`: een sleutel bepaalt of de
 * leverancier meedoet, en zonder sleutel gedraagt de app zich identiek aan
 * vóór deze bouwronde (docs/tasks/zoekdata-in-de-keten.md, blok B).
 *
 * ── DE LAAG STAAT UIT, EN DAT IS EEN BESLUIT (20 september 2026) ────────────
 *
 * Deze laag is geparkeerd. De reden staat in `docs/logbook.md`: hij heeft tot
 * nu toe 0,18 dollar aan data opgeleverd die nergens gelezen wordt, tegen twee
 * productiebugs, en hij is uit de app te halen zonder dat er één scherm, score
 * of aanbeveling verandert.
 *
 * ⚠️ De sleutels blijven bewust in Vercel staan, want de eigenaar wil later
 * kunnen doorontwikkelen. Daarom kan de aanwezigheid van een sleutel hier niet
 * meer de enige schakelaar zijn: dan zou de laag gewoon door blijven draaien.
 * Er is dus een expliciete schakelaar bijgekomen, en die staat standaard UIT.
 * Weer aanzetten is één omgevingsvariabele: `SEARCH_DEMAND_ENABLED=true`.
 *
 * ⚠️ Waarom standaard uit en niet standaard aan: een geparkeerde laag die per
 * ongeluk meedraait is precies hoe de nakalibratiebug van 20 september kon
 * ontstaan. Wie hem aanzet, doet dat bewust en leest eerst waarom hij uit
 * stond.
 */
import { createDataForSeoProvider } from "@/lib/search-demand/dataforseo";
import type { SearchDemandProvider } from "@/lib/search-demand/types";

/**
 * Staat de zoekvolumelaag aan?
 *
 * Alleen de letterlijke waarde `true` zet hem aan. Een lege string, `1`, `ja`
 * of een typefout laten hem uit staan: bij een geparkeerde laag is "uit" de
 * veilige uitkomst van twijfel, niet "aan".
 *
 * Apart geëxporteerd omdat `lib/search-demand/cache.ts` hem ook nodig heeft:
 * staat de laag uit, dan wordt ook de cache niet meer gelezen. Anders zou een
 * eerder opgehaalde zoekterm nog dertig dagen lang een volumeband kunnen
 * zetten in een app die geacht wordt stil te staan.
 */
export function searchDemandEnabled(): boolean {
  return process.env.SEARCH_DEMAND_ENABLED?.trim().toLowerCase() === "true";
}

/** `null` zonder sleutel of met de laag uit: dan gedraagt de app zich exact zoals vóór deze bouwronde. */
export function searchDemandProvider(): SearchDemandProvider | null {
  if (!searchDemandEnabled()) return null;
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) return null;
  return createDataForSeoProvider(login, password);
}
