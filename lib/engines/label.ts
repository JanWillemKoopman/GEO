/**
 * Zoals de klant een engine kent, los van de zware registry (`registry.ts`,
 * `server-only`, bouwt adapters met API-sleutels). Puur een woordenlijst voor
 * weergave, dus importeerbaar vanuit elke pagina die alleen een label nodig
 * heeft (D: meetdatum + model bij de score, `llm-knowledge-panel.tsx`).
 *
 * Stond eerder alleen lokaal in llm-knowledge-panel.tsx; nu één bron, geen
 * tweede lijst die uit de pas kan lopen zodra er een derde engine bijkomt.
 */
export const ENGINE_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  gemini: "Gemini",
};

export function engineLabel(id: string): string {
  return ENGINE_LABELS[id] ?? id;
}
