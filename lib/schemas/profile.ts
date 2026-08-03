import { z } from "zod";

/**
 * Klantprofiel-onderzoek (accountniveau, eenmalig per merk). Bedrijfsbreed —
 * geen onderwerp-scoping (die zit in topic-research.ts, per analyse).
 */
export const ProfileResearch = z.object({
  /** Canonieke merknaam zoals klanten die kennen (bv. "Golden Fingers"), niet het domein. */
  brandName: z.string(),
  industry: z.string(),
  /**
   * Het BEDRIJFSMODEL (R8.5, migratie 0032). Bepaalt welke vaste briefingvragen
   * zinvol zijn: een platform of keten heeft geen enkelvoudig adres of
   * telefoonnummer, en die verplicht vragen nodigt uit tot invullen wat niet
   * klopt — precies wat R5 moest voorkomen.
   *
   * Gemeten in de contentronde van 31 juli: bij 3 van de 5 testcases (Bol,
   * Coolblue, Van der Valk) was de verplichte adres-/telefoonvraag principieel
   * onbeantwoordbaar.
   */
  businessModel: z.enum(["retailer", "platform", "dienstverlener", "fabrikant", "overig"]),
  products: z.array(z.string()),
  /**
   * ⚠️ HET BEREIK, EN WAAROM 'onbekend' VOORAAN STAAT (3 aug 2026)
   *
   * De oude onboarding vroeg dit aan de klant in een wizard van elf velden. De
   * nieuwe vraagt drie velden, en niemand nam deze drie over — met als gevolg
   * dat de eerste echte proefonboarding (Fysi-Unique, een fysiotherapiepraktijk
   * in Amersfoort) eindigde met `service_scope = null` en `service_regions = []`.
   *
   * Dat is geen cosmetisch gat. `lib/pipeline/prompts.ts` zet de regel "dit is
   * een LOKAAL bedrijf, verwerk de plaatsnaam in een deel van de vragen" alleen
   * neer als bereik én regio gevuld zijn; `llm-baseline.ts` hangt zijn
   * categorievragen eraan op ("aanbieders van sportfysiotherapie in Amersfoort"
   * werd "in Nederland"). Zonder deze velden meet een lokale praktijk zichzelf
   * af tegen de landelijke markt, en dat zonder één foutmelding.
   *
   * 'onbekend' staat VOORAAN omdat structured output bij twijfel de eerste
   * enum-waarde kiest (conventie 1: dat is in dit project gemeten — 10 van de 27
   * niet-genoemde merken kregen zo een rol toebedeeld). De eerste waarde hoort
   * dus de eerlijkste te zijn, niet de meest waarschijnlijke.
   */
  serviceScope: z.enum(["onbekend", "lokaal", "landelijk", "internationaal"]),
  /** Plaatsen/regio's waar het bedrijf werkt. Leeg bij niet-lokaal of onbekend. */
  serviceRegions: z.array(z.string()),
  /** Land en taal van de markt, bv. "Nederland, Nederlands". Leeg = onbekend. */
  marketLanguage: z.string(),
  toneOfVoice: z.string(),
  personas: z.array(
    z.object({
      name: z.string(),
      needs: z.array(z.string()),
    }),
  ),
  valueProps: z.array(z.string()),
  competitors: z.array(z.string()),
  summary: z.string(),
  /**
   * ✅ Contentkwaliteit (A2): concrete, CITEERBARE feiten die LETTERLIJK uit de
   * site/context blijken (garanties, jaartallen, aantallen, specialisaties,
   * werkwijze). Dit is de grondstof waarmee Fase C concreet kan schrijven zónder
   * iets te verzinnen — precies de spanning die de merkneutrale contentregels
   * ("verzin geen feiten") anders generiek houden. Leeg laten als er niets hards is.
   */
  proofPoints: z.array(z.string()),
  /**
   * ✅ Contentkwaliteit (A3): 2-3 LETTERLIJKE voorbeeldzinnen van de site die de
   * merkstem tonen, zodat de schrijver de toon kan nabootsen i.p.v. een losse
   * "tone of voice"-omschrijving te interpreteren.
   */
  styleSamples: z.array(z.string()),
});

export type ProfileResearch = z.infer<typeof ProfileResearch>;
