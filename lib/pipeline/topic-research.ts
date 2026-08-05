import "server-only";

/**
 * Onderwerp-onderzoek (halte A1', per analyse): alleen wat specifiek is voor
 * dit product of thema, (1) wat de website hierover zegt, (2) wie de concurrenten
 * voor dit onderwerp zijn. Het bedrijfsbrede deel (merknaam, branche, tone-of-
 * voice, persona's) zit al in het klantprofiel en wordt hier niet herhaald.
 * Quality-tier, web_search AAN (concurrenten voor een onderwerp vinden
 * leunt op actuele marktkennis, net als het profielonderzoek). Gebruikt de
 * al gecrawlde `profile_pages`-inventaris (§12.23) i.p.v. Een eigen crawl,
 * die site is al eenmalig gecrawld bij het profiel.
 */
import { callStructured, type StructuredCallResult } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { webSearchEnabled } from "@/lib/config";
import { TopicResearch } from "@/lib/schemas/topic-research";
import type { Profile, ProfilePage } from "@/lib/types/database";

// Alleen pagina's met opgehaalde inhoud zijn zinvol voor "wat zegt de site over X";
// de URL-lijst is compleet, maar tekst is een steekproef (zie crawlInventory).
const TOPIC_PAGES_CAP = 40;

/** Bouwt een compacte "sitemap met inhoud" van de al gecrawlde profielpagina's. */
function buildPagesBlock(pages: ProfilePage[]): string {
  const withContent = pages.filter((p) => p.text_excerpt);
  if (withContent.length === 0) return "(geen pagina-inhoud beschikbaar, leun op web search)";
  return withContent
    .slice(0, TOPIC_PAGES_CAP)
    .map((p) => `- ${p.url}${p.title ? ` · "${p.title}"` : ""}: ${(p.text_excerpt ?? "").slice(0, 400)}`)
    .join("\n");
}

export async function generateTopicResearch(args: {
  topic: string;
  pages: ProfilePage[];
  profile: Profile;
  contentBrief?: string | null;
  /** Voor de kostenregistratie (optimalisatie.md 0.6). */
  analysisId: string;
}): Promise<StructuredCallResult<TopicResearch>> {
  const { topic, pages, profile, contentBrief } = args;

  // Zie profile-research.ts: zonder zoekfunctie niet om actuele kennis vragen.
  const groundingRule = webSearchEnabled
    ? `Gebruik web search voor actuele marktcontext.`
    : `Je hebt GEEN zoekfunctie. Baseer je uitsluitend op de meegegeven pagina-inhoud en ` +
      `op algemeen bekende feiten. Weet je de concurrenten voor dit onderwerp niet zeker, ` +
      `geef dan een korte of lege lijst in plaats van namen te verzinnen.`;

  const system =
    `Je bent een merk- en marktanalist. Dit bedrijf heeft al een profiel (merknaam, branche, algemene concurrenten); ` +
    `jouw taak is ALLEEN het specifieke onderwerp "${topic}" te onderzoeken: ` +
    `(1) wat zegt de website specifiek over dit product of thema (contentSummary), en ` +
    `(2) welke 3–5 concurrenten zijn relevant VOOR DIT SPECIFIEKE ONDERWERP (niet per se dezelfde als de algemene concurrenten van het bedrijf). ` +
    `Geef bij (2) per concurrent ALLEEN de bedrijfsnaam of merknaam (2 tot 4 woorden). Geen toelichting, geen onderbouwing en geen bronvermelding of link; dat is geen leesbare lijst op een klantscherm. ` +
    `${groundingRule} Antwoord in het Nederlands.`;

  const briefLine = contentBrief?.trim()
    ? `\nGewenste hoek en doelgroep van de klant (houd hier rekening mee): ${contentBrief.trim()}`
    : "";

  const user =
    `Bedrijf: ${profile.brand_name ?? profile.url}\n` +
    `Website: ${profile.url}\n` +
    `Branche: ${profile.industry ?? "onbekend"}\n` +
    `Algemene concurrenten van het bedrijf: ${profile.competitors.join(", ") || "onbekend"}\n` +
    `Onderwerp/scope: ${topic}${briefLine}\n\n` +
    `Pagina's van de website (url · titel: korte inhoud):\n${buildPagesBlock(pages)}`;

  return callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: TopicResearch,
    schemaName: "topic_research",
    // Grounding via de centrale schakelaar (optimalisatie.md 2.1). Uit in de
    // ontwikkelfase om kosten te sparen; dan leunt dit onderzoek op wat het
    // model zich herinnert in plaats van op actuele marktkennis.
    webSearch: webSearchEnabled,
    work: "analytical",
    meta: { kind: "topic_research", analysisId: args.analysisId, profileId: profile.id },
  });
}
