import "server-only";

/**
 * Klantprofiel-onderzoek (accountniveau, eenmalig per merk). Quality-tier,
 * web_search AAN voor bredere marktcontext. De eigen crawltekst gaat als context
 * mee. Bedrijfsbreed — geen onderwerp-scoping (zie lib/pipeline/topic-research.ts
 * voor het per-analyse onderwerp-onderzoek dat hierop voortbouwt).
 */
import { callStructured, type StructuredCallResult } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { webSearchEnabled } from "@/lib/config";
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
  /**
   * Hoeveel pagina's er in de context zitten. Alleen voor de instructie: het
   * verschil tussen "hier is de homepage" en "hier is de hele site" bepaalt hoe
   * stellig het model mag zijn over wat het bedrijf NIET doet.
   */
  pageCount?: number;
}): Promise<StructuredCallResult<ProfileResearch>> {
  const { url, siteText, intake, pageCount = 0 } = args;

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

  // Zonder zoekfunctie moet de instructie NIET om actuele marktcontext vragen —
  // dan verzint het model die. Liever eerlijk: baseer je op wat er staat.
  const groundingRule = webSearchEnabled
    ? `Gebruik web search voor actuele marktcontext.`
    : `Je hebt GEEN zoekfunctie. Baseer je uitsluitend op de meegegeven website-tekst en ` +
      `op algemeen bekende feiten. Weet je concurrenten niet zeker, geef dan een korte of ` +
      `lege lijst in plaats van namen te verzinnen.`;

  // Het BEDRIJFSMODEL (R8.5, migratie 0032). Bepaalt straks welke vaste
  // briefingvragen zinvol zijn: een platform of keten heeft geen enkelvoudig
  // adres of telefoonnummer, en die verplicht vragen levert een antwoord op dat
  // niet kan kloppen.
  const businessModelRule =
    `Bepaal het BEDRIJFSMODEL (businessModel), en wees hierin letterlijk: ` +
    `'retailer' = verkoopt producten van ANDERE merken (webshop, winkelketen); ` +
    `'platform' = brengt vraag en aanbod van derden bij elkaar (marktplaats, vergelijker, boekingssite); ` +
    `'dienstverlener' = levert diensten met eigen mensen (praktijk, bureau, installateur); ` +
    `'fabrikant' = maakt en verkoopt zijn eigen producten; ` +
    `'overig' = past in geen van deze. Twijfel je tussen retailer en fabrikant, kijk of ` +
    `de producten het merk van het bedrijf zelf dragen.`;

  const system =
    `Je bent een merk- en marktanalist. Analyseer dit bedrijf op basis van de website-tekst en het web. ` +
    `Bepaal: branche, kernproducten/-diensten, tone-of-voice, doelgroep-persona's, waardeproposities en 3–5 belangrijkste concurrenten ` +
    `van het HELE bedrijf (niet van één product/segment — dat wordt per analyse apart bepaald). ` +
    `${brandNameRule} ${businessModelRule} ${writingBasisRule} ${groundingRule} Antwoord in het Nederlands.`;

  // Hoeveel de context waard is, hangt af van hoeveel pagina's erin zitten. Bij
  // één homepage moet het model voorzichtig zijn over wat het bedrijf níét doet;
  // bij 80 pagina's is een ontbrekende dienst een echt signaal. Dat verschil
  // benoemen is gratis en scheelt verzonnen stelligheid.
  const scopeRule =
    pageCount >= 10
      ? `De tekst hieronder komt van ${pageCount} pagina's van de site — dat is een ruime dekking. ` +
        `Wat er in dit materiaal niet voorkomt, biedt het bedrijf waarschijnlijk ook niet aan.`
      : pageCount > 0
        ? `De tekst hieronder komt van ${pageCount} pagina('s) — een beperkte dekking. Trek geen ` +
          `conclusies uit wat er ONTBREEKT.`
        : `Je hebt alleen losse tekst, geen paginadekking. Trek geen conclusies uit wat ontbreekt.`;

  const user =
    `Website: ${url}\n\n${scopeRule}\n\n` +
    `Geëxtraheerde website-tekst (kan onvolledig zijn):\n"""\n${
      siteText ||
      (webSearchEnabled
        ? "(geen tekst opgehaald — leun op web search)"
        : "(geen tekst opgehaald, en geen zoekfunctie beschikbaar — houd het onderzoek beperkt)")
    }\n"""` +
    buildIntakeBlock(intake);

  return callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: ProfileResearch,
    schemaName: "profile_research",
    // Grounding via de centrale schakelaar (optimalisatie.md 2.1). Uit in de
    // ontwikkelfase om kosten te sparen; dan leunt dit onderzoek op wat het
    // model zich herinnert in plaats van op actuele marktkennis.
    webSearch: webSearchEnabled,
    work: "analytical",
    meta: { kind: "profile_research", profileId: args.profileId },
  });
}
