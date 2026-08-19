import "server-only";

/**
 * Klantprofiel-onderzoek (accountniveau, eenmalig per merk). Quality-tier,
 * web_search AAN voor bredere marktcontext. De eigen crawltekst gaat als context
 * mee. Bedrijfsbreed. Geen onderwerp-scoping (zie lib/pipeline/topic-research.ts
 * voor het per-analyse onderwerp-onderzoek dat hierop voortbouwt).
 */
import { callStructured, type StructuredCallResult } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { webSearchEnabled } from "@/lib/config";
import { ProfileResearch } from "@/lib/schemas/profile";
import { buildIntakeBlock, type ClientIntake } from "@/lib/pipeline/intake-block";

// De veldenlijst en de tweedeling tussen bevestigde feiten en aannames van vóór
// het gesprek staan in een pure module, zodat de test ze kan nakijken.
export { buildIntakeBlock, type ClientIntake } from "@/lib/pipeline/intake-block";

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
    `Bepaal ook de canonieke merknaam (brandName) zoals klanten die kennen, de naam die in gewone taal gebruikt wordt, ` +
    `niet het domein (dus bv. "Golden Fingers", niet "barbershopgoldenfingers.nl").`;

  // ✅ Contentkwaliteit (A2/A3): naast de merk-typering ook de SCHRIJF-GRONDSLAG
  // extraheren, concrete feiten + letterlijke stijlvoorbeelden, zodat Fase C
  // later concreet én on-brand kan schrijven zonder iets te verzinnen.
  const writingBasisRule =
    `Extraheer daarnaast, UITSLUITEND op basis van wat letterlijk in de website-tekst staat (niet verzinnen, niet uit web search): ` +
    `(a) proofPoints: concrete, citeerbare feiten (garanties, jaartallen, aantallen, specialisaties, werkwijze, keurmerken); laat leeg als er niets hards staat; ` +
    `(b) styleSamples: 2-3 letterlijke voorbeeldzinnen van de site die de merkstem tonen.`;

  // Zonder zoekfunctie moet de instructie NIET om actuele marktcontext vragen,
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

  // Het BEREIK (3 aug 2026). Zie het commentaar bij `serviceScope` in
  // lib/schemas/profile.ts voor waarom dit erbij moest.
  const scopeFieldRule =
    `Bepaal het BEREIK (serviceScope): 'lokaal' = klanten komen uit een stad of streek ` +
    `(praktijk, kapper, installateur); 'landelijk' = het hele land is de markt; ` +
    `'internationaal' = meerdere landen; 'onbekend' = je kunt het niet uit het materiaal afleiden. ` +
    `Bij 'lokaal' zet je in serviceRegions de plaatsen of streken die de site noemt, zoals een ` +
    `klant ze zou uitspreken ("Amersfoort", "regio Utrecht"), niet het adres. Bij niet-lokaal laat ` +
    `je die lijst leeg. Zet in marketLanguage het land en de taal van de markt ` +
    `(bv. "Nederland, Nederlands"). Weet je het niet, kies 'onbekend' en laat leeg. Dat is een ` +
    `beter antwoord dan een gok.`;

  const system =
    `Je bent een merk- en marktanalist. Analyseer dit bedrijf op basis van de website-tekst en het web. ` +
    `Bepaal: branche, kernproducten/-diensten, tone-of-voice, doelgroep-persona's, waardeproposities en 3–5 belangrijkste concurrenten ` +
    `van het HELE bedrijf, niet van één product of segment; dat wordt per analyse apart bepaald. ` +
    `${brandNameRule} ${businessModelRule} ${scopeFieldRule} ${writingBasisRule} ${groundingRule} Antwoord in het Nederlands.`;

  // Hoeveel de context waard is, hangt af van hoeveel pagina's erin zitten. Bij
  // één homepage moet het model voorzichtig zijn over wat het bedrijf níét doet;
  // bij 80 pagina's is een ontbrekende dienst een echt signaal. Dat verschil
  // benoemen is gratis en scheelt verzonnen stelligheid.
  const scopeRule =
    pageCount >= 10
      ? `De tekst hieronder komt van ${pageCount} pagina's van de site. Dat is een ruime dekking. ` +
        `Wat er in dit materiaal niet voorkomt, biedt het bedrijf waarschijnlijk ook niet aan.`
      : pageCount > 0
        ? `De tekst hieronder komt van ${pageCount} pagina('s): een beperkte dekking. Trek geen ` +
          `conclusies uit wat er ONTBREEKT.`
        : `Je hebt alleen losse tekst, geen paginadekking. Trek geen conclusies uit wat ontbreekt.`;

  const user =
    `Website: ${url}\n\n${scopeRule}\n\n` +
    `Geëxtraheerde website-tekst (kan onvolledig zijn):\n"""\n${
      siteText ||
      (webSearchEnabled
        ? "(geen tekst opgehaald, leun op web search)"
        : "(geen tekst opgehaald, en geen zoekfunctie beschikbaar; houd het onderzoek beperkt)")
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
