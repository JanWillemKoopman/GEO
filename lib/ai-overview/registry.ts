import "server-only";

/**
 * Staat de AI Overview-bron aan in deze omgeving?
 *
 * ── DEZELFDE OPZET ALS `lib/search-demand/registry.ts`, EN OM DEZELFDE REDEN ─
 *
 * Die laag leerde op 20 september 2026 een dure les (`docs/logbook.md`,
 * 20 september (2)): een koppeling die half werkt en meedraait kost bugs zonder
 * iets op te leveren. "Gebouwd, niet gebruikt" is geen neutrale toestand.
 *
 * Vandaar een expliciete schakelaar die standaard UIT staat, en niet de
 * aanwezigheid van een sleutel. De DataForSEO-sleutels staan in Vercel voor de
 * geparkeerde zoekvolumelaag; zou de sleutel hier de schakelaar zijn, dan gaat
 * deze bron meteen meedraaien op elke omgeving waar die laag ooit is opgezet.
 *
 * ⚠️ Alleen de waarde `true` zet hem aan. Een lege string, `1`, `ja`, `aan` of
 * een typefout laten hem uit staan: bij een bron die per meetronde geld kost is
 * "uit" de veilige uitkomst van twijfel. Hoofdletters en spaties eromheen worden
 * wél vergeven (`TRUE`, ` true `), zelfde regel als `searchDemandEnabled()`: dat
 * is geen typefout maar hoe een omgevingsscherm een waarde teruggeeft.
 *
 * ⚠️ En er zit een tweede grendel op: deze bron meet pas mee in wat de klant
 * ziet zodra `enqueueAiOverviewMeasurement()` hem inplant. De schakelaar
 * hieronder bepaalt alleen óf dat mag. De score van de klant blijft hoe dan ook
 * op `PRIMARY_ENGINE` rusten (`lib/engines/types.ts`).
 */
export function aiOverviewEnabled(): boolean {
  return process.env.AI_OVERVIEW_ENABLED?.trim().toLowerCase() === "true";
}

/** De inloggegevens, of `null` als er niets bruikbaars staat. */
export function aiOverviewCredentials(): { login: string; password: string } | null {
  if (!aiOverviewEnabled()) return null;
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) return null;
  return { login, password };
}
