import "server-only";

/**
 * Is er een zoekvolumeleverancier beschikbaar in deze omgeving?
 *
 * Zelfde regel als `lib/engines/registry.ts`: een sleutel bepaalt of de
 * leverancier meedoet, en zonder sleutel gedraagt de app zich identiek aan
 * vóór deze bouwronde (docs/tasks/zoekdata-in-de-keten.md, blok B).
 */
import { createDataForSeoProvider } from "@/lib/search-demand/dataforseo";
import type { SearchDemandProvider } from "@/lib/search-demand/types";

/** `null` zonder sleutel: dan gedraagt de app zich exact zoals vóór deze bouwronde. */
export function searchDemandProvider(): SearchDemandProvider | null {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) return null;
  return createDataForSeoProvider(login, password);
}
