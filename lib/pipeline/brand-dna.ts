import "server-only";

/**
 * Halte 1 — Brand DNA (abcplan.md §6 A1). Topic-aware, model gpt-4.1-mini,
 * web_search AAN voor bredere marktcontext. De eigen crawltekst gaat als context mee.
 */
import { callStructured, type StructuredCallResult } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { BrandDNA } from "@/lib/schemas/brand-dna";

export async function generateBrandDna(args: {
  url: string;
  topic: string | null;
  siteText: string;
}): Promise<StructuredCallResult<BrandDNA>> {
  const { url, topic, siteText } = args;

  const system = topic
    ? `Je bent een merk- en marktanalist. Analyseer dit bedrijf SPECIFIEK voor het onderwerp/product "${topic}". ` +
      `Bepaal: welke rol dit product/segment speelt binnen het bedrijf, de tone-of-voice, de doelgroep-persona's die hiernaar zoeken, ` +
      `de waardeproposities specifiek voor dit segment, en 3–5 concurrenten die relevant zijn VOOR DIT SPECIFIEKE ONDERWERP ` +
      `(niet per se de concurrenten van het hele bedrijf). Gebruik web search voor actuele marktcontext. Antwoord in het Nederlands.`
    : `Je bent een merk- en marktanalist. Analyseer dit bedrijf op basis van de website-tekst en het web. ` +
      `Bepaal: branche, kernproducten/-diensten, tone-of-voice, doelgroep-persona's, waardeproposities en 3–5 belangrijkste concurrenten. ` +
      `Gebruik web search voor actuele marktcontext. Antwoord in het Nederlands.`;

  const user =
    `Website: ${url}\n` +
    `Onderwerp/scope: ${topic ?? "(hele website)"}\n\n` +
    `Geëxtraheerde website-tekst (kan onvolledig zijn):\n"""\n${siteText || "(geen tekst opgehaald — leun op web search)"}\n"""`;

  return callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: BrandDNA,
    schemaName: "brand_dna",
    webSearch: true,
  });
}
