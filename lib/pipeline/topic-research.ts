import "server-only";

/**
 * Onderwerp-onderzoek (halte A1', per analyse): alleen wat specifiek is voor
 * dit product/thema — (1) wat de website hierover zegt, (2) wie de concurrenten
 * voor dit onderwerp zijn. Het bedrijfsbrede deel (merknaam, branche, tone-of-
 * voice, persona's) zit al in het klantprofiel en wordt hier niet herhaald.
 * Model gpt-4.1-mini, web_search AAN (concurrenten voor een onderwerp vinden
 * leunt op actuele marktkennis, net als het profielonderzoek). Gebruikt de
 * al gecrawlde `profile_pages`-inventaris (§12.23) i.p.v. een eigen crawl —
 * die site is al eenmalig gecrawld bij het profiel.
 */
import { callStructured, type StructuredCallResult } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { TopicResearch } from "@/lib/schemas/topic-research";
import type { Profile, ProfilePage } from "@/lib/types/database";

// Alleen pagina's met opgehaalde inhoud zijn zinvol voor "wat zegt de site over X";
// de URL-lijst is compleet, maar tekst is een steekproef (zie crawlInventory).
const TOPIC_PAGES_CAP = 40;

/** Bouwt een compacte "sitemap met inhoud" van de al gecrawlde profielpagina's. */
function buildPagesBlock(pages: ProfilePage[]): string {
  const withContent = pages.filter((p) => p.text_excerpt);
  if (withContent.length === 0) return "(geen pagina-inhoud beschikbaar — leun op web search)";
  return withContent
    .slice(0, TOPIC_PAGES_CAP)
    .map((p) => `- ${p.url}${p.title ? ` — "${p.title}"` : ""}: ${(p.text_excerpt ?? "").slice(0, 400)}`)
    .join("\n");
}

export async function generateTopicResearch(args: {
  topic: string;
  pages: ProfilePage[];
  profile: Profile;
}): Promise<StructuredCallResult<TopicResearch>> {
  const { topic, pages, profile } = args;

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
    `Pagina's van de website (url — titel: korte inhoud):\n${buildPagesBlock(pages)}`;

  return callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: TopicResearch,
    schemaName: "topic_research",
    webSearch: true,
  });
}
