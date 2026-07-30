/**
 * Welke bots moeten binnen kunnen, en hoe erg is het als ze dat niet kunnen?
 * (optimalisatie.md 3.5)
 *
 * Niet elke geweigerde bot is even erg. Een site die `CCBot` weert mist wat
 * trainingsdata; een site die `OAI-SearchBot` weert kan door ChatGPT letterlijk
 * niet geciteerd worden — dan is elke euro aan contentgeneratie weggegooid. Dat
 * onderscheid moet in de data zitten en niet in de kop van de gebruiker.
 *
 * Bewust ZONDER `server-only`: alleen een tabel met feiten, ook bruikbaar in de UI.
 */

export type CrawlerImpact = "blocker" | "warning";

export interface AiCrawler {
  /** De user-agent zoals hij in robots.txt genoemd wordt. */
  userAgent: string;
  /** Hoe de klant hem kent. */
  label: string;
  /** Wat deze bot doet, in één zin zonder jargon. */
  purpose: string;
  /**
   * `blocker` = zonder deze bot kan de kernbelofte van de app niet waargemaakt
   * worden. `warning` = je mist bereik, maar ChatGPT-zichtbaarheid blijft mogelijk.
   */
  impact: CrawlerImpact;
}

/**
 * De volgorde is de volgorde waarin ze getoond worden: eerst wat de belofte van
 * dit product raakt (ChatGPT), daarna de rest.
 */
export const AI_CRAWLERS: AiCrawler[] = [
  {
    userAgent: "OAI-SearchBot",
    label: "ChatGPT-zoeken",
    purpose:
      "Haalt pagina's op waar ChatGPT naar verwijst als iemand een vraag stelt. Zonder deze bot kan ChatGPT je site niet citeren.",
    impact: "blocker",
  },
  {
    userAgent: "ChatGPT-User",
    label: "ChatGPT (op verzoek van een gebruiker)",
    purpose:
      "Haalt je pagina op wanneer iemand ChatGPT vraagt naar je site te kijken. Geweigerd betekent: 'die pagina kan ik niet openen'.",
    impact: "blocker",
  },
  {
    userAgent: "Bingbot",
    label: "Bing",
    purpose:
      "Geen AI-bot, maar ChatGPT-zoeken leunt op de index van Bing. Sta je daar niet in, dan word je ook in ChatGPT nauwelijks gevonden.",
    impact: "blocker",
  },
  {
    userAgent: "GPTBot",
    label: "OpenAI-training",
    purpose:
      "Verzamelt pagina's waarmee toekomstige modellen getraind worden. Dat is de lange termijn: wat het model 'gewoon weet' zonder te zoeken.",
    impact: "warning",
  },
  {
    userAgent: "ClaudeBot",
    label: "Claude (Anthropic)",
    purpose: "De crawler achter Claude. Zelfde verhaal als bij OpenAI, andere assistent.",
    impact: "warning",
  },
  {
    userAgent: "PerplexityBot",
    label: "Perplexity",
    purpose: "Een AI-zoekmachine die bronnen expliciet toont. Relatief veel doorverwijzingen per vermelding.",
    impact: "warning",
  },
  {
    userAgent: "Google-Extended",
    label: "Google AI (Gemini, AI Overviews)",
    purpose:
      "Bepaalt of je pagina's gebruikt mogen worden in Google's AI-antwoorden. Staat los van gewone Google-indexering.",
    impact: "warning",
  },
  {
    userAgent: "CCBot",
    label: "Common Crawl",
    purpose:
      "Een open webarchief dat door vrijwel elke AI-partij als trainingsbron gebruikt wordt. Indirect, maar breed.",
    impact: "warning",
  },
];
