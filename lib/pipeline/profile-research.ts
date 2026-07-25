import "server-only";

/**
 * Klantprofiel-onderzoek (accountniveau, eenmalig per merk). Model gpt-4.1-mini,
 * web_search AAN voor bredere marktcontext. De eigen crawltekst gaat als context
 * mee. Bedrijfsbreed — geen onderwerp-scoping (zie lib/pipeline/topic-research.ts
 * voor het per-analyse onderwerp-onderzoek dat hierop voortbouwt).
 */
import { callStructured, type StructuredCallResult } from "@/lib/openai/structured";
import { MODELS, TEMPERATURES } from "@/lib/openai/models";
import { ProfileResearch } from "@/lib/schemas/profile";

/** Wat de klant zelf in de onboarding aanleverde (leidend — zie prepare-profile.ts). */
export interface ClientIntake {
  name?: string | null;
  aliases?: string[];
  description?: string | null;
  industry?: string | null;
  products?: string[];
  valueProps?: string[];
  competitors?: string[];
  serviceScope?: string | null;
  serviceRegions?: string[];
  marketLanguage?: string | null;
  toneOfVoice?: string | null;
  audience?: string | null;
  customerQuestions?: string[];
}

function buildIntakeBlock(intake?: ClientIntake): string {
  if (!intake) return "";
  const lines: string[] = [];
  if (intake.name) lines.push(`Bedrijfsnaam: ${intake.name}`);
  if (intake.aliases?.length) lines.push(`Ook bekend als: ${intake.aliases.join(", ")}`);
  if (intake.description) lines.push(`Omschrijving (door de klant): ${intake.description}`);
  if (intake.industry) lines.push(`Branche (door de klant): ${intake.industry}`);
  if (intake.products?.length) lines.push(`Producten/diensten (door de klant): ${intake.products.join(", ")}`);
  if (intake.valueProps?.length) lines.push(`Waardeproposities (door de klant): ${intake.valueProps.join(", ")}`);
  if (intake.competitors?.length) lines.push(`Concurrenten (door de klant): ${intake.competitors.join(", ")}`);
  if (intake.serviceScope) lines.push(`Bereik: ${intake.serviceScope}`);
  if (intake.serviceRegions?.length) lines.push(`Werkgebied/regio's: ${intake.serviceRegions.join(", ")}`);
  if (intake.marketLanguage) lines.push(`Markt & taal: ${intake.marketLanguage}`);
  if (intake.toneOfVoice) lines.push(`Gewenste tone-of-voice (door de klant): ${intake.toneOfVoice}`);
  if (intake.audience) lines.push(`Doelgroep (door de klant): ${intake.audience}`);
  if (intake.customerQuestions?.length)
    lines.push(`Veelgehoorde klantvragen (door de klant): ${intake.customerQuestions.join(" | ")}`);
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
  /** Voor de kostenregistratie (optimalisatie.md 0.6). */
  profileId: string;
}): Promise<StructuredCallResult<ProfileResearch>> {
  const { url, siteText, intake } = args;

  const brandNameRule =
    `Bepaal ook de canonieke merknaam (brandName) zoals klanten die kennen — de naam die in gewone taal gebruikt wordt, ` +
    `niet het domein (dus bv. "Golden Fingers", niet "barbershopgoldenfingers.nl").`;

  // ✅ Contentkwaliteit (A2/A3): naast de merk-typering ook de SCHRIJF-GRONDSLAG
  // extraheren — concrete feiten + letterlijke stijlvoorbeelden — zodat Fase C
  // later concreet én on-brand kan schrijven zonder iets te verzinnen.
  const writingBasisRule =
    `Extraheer daarnaast, UITSLUITEND op basis van wat letterlijk in de website-tekst staat (niet verzinnen, niet uit web search): ` +
    `(a) proofPoints — concrete, citeerbare feiten (garanties, jaartallen, aantallen, specialisaties, werkwijze, keurmerken); laat leeg als er niets hards staat; ` +
    `(b) styleSamples — 2-3 letterlijke voorbeeldzinnen van de site die de merkstem tonen.`;

  const system =
    `Je bent een merk- en marktanalist. Analyseer dit bedrijf op basis van de website-tekst en het web. ` +
    `Bepaal: branche, kernproducten/-diensten, tone-of-voice, doelgroep-persona's, waardeproposities en 3–5 belangrijkste concurrenten ` +
    `van het HELE bedrijf (niet van één product/segment — dat wordt per analyse apart bepaald). ` +
    `${brandNameRule} ${writingBasisRule} Gebruik web search voor actuele marktcontext. Antwoord in het Nederlands.`;

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
    temperature: TEMPERATURES.analytical,
    meta: { kind: "profile_research", profileId: args.profileId },
  });
}
