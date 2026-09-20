import "server-only";

/**
 * Staat de Gemini-via-DataForSEO-bron aan in deze omgeving?
 *
 * Zelfde opzet als `lib/ai-overview/registry.ts`, om dezelfde reden: de
 * DataForSEO-sleutels staan al in Vercel voor de AI Overview-bron (en de
 * geparkeerde zoekvolumelaag), dus de sleutel zelf mag hier nooit de
 * schakelaar zijn. Een expliciete, standaard UITstaande schakelaar voorkomt
 * dat deze bron per ongeluk meedraait op een omgeving waar de sleutel om een
 * andere reden staat.
 *
 * ⚠️ Alleen de waarde `true` zet hem aan, hoofdletterongevoelig en met
 * spaties vergeven (zelfde regel als `aiOverviewEnabled()`).
 */
export function llmResponseGeminiEnabled(): boolean {
  return process.env.DATAFORSEO_LLM_ENABLED?.trim().toLowerCase() === "true";
}

/** De inloggegevens, of `null` als er niets bruikbaars staat. */
export function llmResponseCredentials(): { login: string; password: string } | null {
  if (!llmResponseGeminiEnabled()) return null;
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) return null;
  return { login, password };
}
