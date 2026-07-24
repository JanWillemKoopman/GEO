import { z } from "zod";

/**
 * Klantprofiel-onderzoek (accountniveau, eenmalig per merk). Bedrijfsbreed —
 * geen onderwerp-scoping (die zit in topic-research.ts, per analyse).
 */
export const ProfileResearch = z.object({
  /** Canonieke merknaam zoals klanten die kennen (bv. "Golden Fingers"), niet het domein. */
  brandName: z.string(),
  industry: z.string(),
  products: z.array(z.string()),
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
