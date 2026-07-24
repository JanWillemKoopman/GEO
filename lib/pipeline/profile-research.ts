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

/** Wat de klant zelf in de onboarding aanleverde (leidend — zie prepare-profile.ts). */
export interface ClientIntake {
  name?: string | null;
  description?: string | null;
  industry?: string | null;
  products?: string[];
  competitors?: string[];
  toneOfVoice?: string | null;
  audience?: string | null;
}

function buildIntakeBlock(intake?: ClientIntake): string {
  if (!intake) return "";
  const lines: string[] = [];
  if (intake.name) lines.push(`Bedrijfsnaam: ${intake.name}`);
  if (intake.description) lines.push(`Omschrijving (door de klant): ${intake.description}`);
  if (intake.industry) lines.push(`Branche (door de klant): ${intake.industry}`);
  if (intake.products?.length) lines.push(`Producten/diensten (door de klant): ${intake.products.join(", ")}`);
  if (intake.competitors?.length) lines.push(`Concurrenten (door de klant): ${intake.competitors.join(", ")}`);
  if (intake.toneOfVoice) lines.push(`Gewenste tone-of-voice (door de klant): ${intake.toneOfVoice}`);
  if (intake.audience) lines.push(`Doelgroep (door de klant): ${intake.audience}`);
  if (lines.length === 0) return "";
  return (
    `\n\nDe klant heeft in de onboarding het volgende al aangegeven — RESPECTEER dit: verzin geen andere ` +
    `merknaam, branche of concurrenten als die gegeven zijn, en gebruik het als leidraad; VUL de rest aan ` +
    `en verrijk:\n${lines.join("\n")}`
  );
}

export async function generateProfileResearch(args: {
  url: string;
  siteText: string;
  intake?: ClientIntake;
}): Promise<StructuredCallResult<ProfileResearch>> {
  const { url, siteText, intake } = args;

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
    `Geëxtraheerde website-tekst (kan onvolledig zijn):\n"""\n${siteText || "(geen tekst opgehaald — leun op web search)"}\n"""` +
    buildIntakeBlock(intake);

  return callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: ProfileResearch,
    schemaName: "profile_research",
    webSearch: true,
  });
}
