import "server-only";

/**
 * Klantprofiel-onderzoek (accountniveau, eenmalig per merk). Model gpt-4.1-mini,
 * web_search AAN voor bredere marktcontext. De eigen crawltekst gaat als context
 * mee. Bedrijfsbreed — geen onderwerp-scoping (zie lib/pipeline/topic-research.ts
 * voor het per-analyse onderwerp-onderzoek dat hierop voortbouwt).
 */
import { callStructured, type StructuredCallResult } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ProfileResearch } from "@/lib/schemas/profile";

export async function generateProfileResearch(args: {
  url: string;
  siteText: string;
}): Promise<StructuredCallResult<ProfileResearch>> {
  const { url, siteText } = args;

  const brandNameRule =
    `Bepaal ook de canonieke merknaam (brandName) zoals klanten die kennen — de naam die in gewone taal gebruikt wordt, ` +
    `niet het domein (dus bv. "Golden Fingers", niet "barbershopgoldenfingers.nl").`;

  const system =
    `Je bent een merk- en marktanalist. Analyseer dit bedrijf op basis van de website-tekst en het web. ` +
    `Bepaal: branche, kernproducten/-diensten, tone-of-voice, doelgroep-persona's, waardeproposities en 3–5 belangrijkste concurrenten ` +
    `van het HELE bedrijf (niet van één product/segment — dat wordt per analyse apart bepaald). ` +
    `${brandNameRule} Gebruik web search voor actuele marktcontext. Antwoord in het Nederlands.`;

  const user =
    `Website: ${url}\n\n` +
    `Geëxtraheerde website-tekst (kan onvolledig zijn):\n"""\n${siteText || "(geen tekst opgehaald — leun op web search)"}\n"""`;

  return callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: ProfileResearch,
    schemaName: "profile_research",
    webSearch: true,
  });
}
