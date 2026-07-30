import { z } from "zod";

/**
 * Classificatie van ontdekte merken (migratie 0026).
 *
 * Sinds de meting puur ontdekt, komt élk merk uit een AI-antwoord binnen als
 * entiteit — inclusief AutoScout24, Marktplaats en de ANWB bij een autobedrijf.
 * Zonder dit onderscheid zouden die als "concurrent" in de grafiek staan en het
 * aandeel van de klant drukken. Deze stap bepaalt per merk wat het IS.
 *
 * De rollen komen exact overeen met de check-constraint op entities.entity_role
 * (migratie 0024). Alleen 'concurrent' telt mee in de concurrentievergelijking
 * en in share_of_voice.
 */
export const ENTITY_ROLES = [
  /** Een bedrijf dat hetzelfde aanbiedt aan dezelfde klant — telt mee. */
  "concurrent",
  /** Het merk van de klant zelf, in een andere schrijfwijze. */
  "eigen_merk",
  /** Een merk/product dat de klant zelf voert of verkoopt (bv. Škoda bij een dealer). */
  "eigen_product",
  /** Branchevereniging, keurmerk of kennisinstituut (ANWB, BOVAG). */
  "brancheorganisatie",
  /** Marktplaats, vergelijkingssite of portal (AutoScout24, Marktplaats, Gaspedaal). */
  "vergelijker",
  /** Alles wat geen van bovenstaande is: leverancier, media, toevallige naam. */
  "niet_relevant",
] as const;

export const EntityClassification = z.object({
  entities: z.array(
    z.object({
      /** Exact de naam zoals aangeleverd, zodat we hem kunnen terugkoppelen. */
      name: z.string(),
      role: z.enum(ENTITY_ROLES),
      /** Korte reden, alleen tonen bij alles wat GEEN concurrent is. */
      reason: z.string(),
    }),
  ),
});

export type EntityClassification = z.infer<typeof EntityClassification>;
export type EntityRole = (typeof ENTITY_ROLES)[number];
