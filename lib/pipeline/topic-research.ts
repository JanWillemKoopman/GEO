import "server-only";

/**
 * Onderwerp-onderzoek (halte A1', per analyse): alleen wat specifiek is voor
 * dit product/thema — (1) wat de website hierover zegt, (2) wie de concurrenten
 * voor dit onderwerp zijn. Het bedrijfsbrede deel (merknaam, branche, tone-of-
 * voice, persona's) zit al in het klantprofiel en wordt hier niet herhaald.
 * Model gpt-4.1-mini, web_search AAN (concurrenten voor een onderwerp vinden
 * leunt op actuele marktkennis, net als het profielonderzoek).
 */
import { callStructured, type StructuredCallResult } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { TopicResearch } from "@/lib/schemas/topic-research";
import type { Profile } from "@/lib/types/database";

export async function generateTopicResearch(args: {
  topic: string;
  siteText: string;
  profile: Profile;
}): Promise<StructuredCallResult<TopicResearch>> {
  const { topic, siteText, profile } = args;

  const system =
    `Je bent een merk- en marktanalist. Dit bedrijf heeft al een profiel (merknaam, branche, algemene concurrenten); ` +
    `jouw taak is ALLEEN het specifieke onderwerp "${topic}" te onderzoeken: ` +
    `(1) wat zegt de website specifiek over dit product/thema (contentSummary), en ` +
    `(2) welke 3–5 concurrenten zijn relevant VOOR DIT SPECIFIEKE ONDERWERP (niet per se dezelfde als de algemene concurrenten van het bedrijf). ` +
    `Gebruik web search voor actuele marktcontext. Antwoord in het Nederlands.`;

  const user =
    `Bedrijf: ${profile.brand_name ?? profile.url}\n` +
    `Website: ${profile.url}\n` +
    `Branche: ${profile.industry ?? "onbekend"}\n` +
    `Algemene concurrenten van het bedrijf: ${profile.competitors.join(", ") || "onbekend"}\n` +
    `Onderwerp/scope: ${topic}\n\n` +
    `Geëxtraheerde website-tekst (kan onvolledig zijn):\n"""\n${siteText || "(geen tekst opgehaald — leun op web search)"}\n"""`;

  return callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: TopicResearch,
    schemaName: "topic_research",
    webSearch: true,
  });
}
