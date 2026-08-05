import { z } from "zod";

/**
 * De aanbodboom (docs/tasks/onboarding-2.0.md, blok B fase 1).
 *
 * ── WAAROM ÉÉN SCHEMA EN NIET DRIE ──────────────────────────────────────────
 *
 * Een dienstverlener heeft diensten met subdiensten, een retailer categorieën
 * met productgroepen, een platform vraag- en aanbodzijde. Verleidelijk om daar
 * drie schema's van te maken, maar dan krijgt elke consument van deze data
 * drie codepaden, en een klant die van "retailer" naar "fabrikant" verschuift
 * gooit zijn hele boom weg.
 *
 * Eén boom met een `kind` per knoop dekt alle drie. Het verschil zit in de
 * INSTRUCTIE (welke soorten je verwacht en waar je ze zoekt), niet in de vorm.
 * Dat is dezelfde keuze als bij `businessModel` zelf: één gesloten enum, en de
 * betekenis zit in wat de code ermee doet.
 *
 * ── WAAROM ELKE KNOOP BEWIJS DRAAGT ─────────────────────────────────────────
 *
 * De klant vult in de onboarding nog drie velden in. Alles wat hier in de boom
 * staat komt van een model dat naar gecrawlde pagina's keek. Zonder `evidenceUrl`
 * is een verkeerde dienst niet te corrigeren, want niemand kan nagaan waar hij
 * vandaan kwam, en met 30 knopen gaat niemand dat handmatig uitzoeken.
 */
export const OfferingNode = z.object({
  /**
   * `categorie` is de groepering, de rest zijn bladeren. Een `merk` is een
   * gevoerd merk van een ander (relevant bij retailers: die worden anders als
   * concurrent geteld. Precies wat R0.5 moest oplossen).
   */
  kind: z.enum(["dienst", "product", "categorie", "merk", "vestiging"]),
  name: z.string(),
  /** Onder welke categorie dit valt. Leeg = bovenste niveau. */
  parent: z.string(),
  /** Wat het is en welk probleem het oplost, in de taal van de klant. */
  description: z.string(),
  /** Voor wie. Leeg als de site dat niet zegt, niet invullen met een aanname. */
  audience: z.string(),
  /** "vanaf € 65", "op offerte", "€ 20–40". Leeg als er niets over prijs staat. */
  priceIndication: z.string(),
  /** De pagina waar dit vandaan komt. Verplicht: zonder bron niet te corrigeren. */
  evidenceUrl: z.string(),
  /** Een letterlijk fragment van die pagina dat dit onderbouwt. */
  evidenceQuote: z.string(),
});

export type OfferingNode = z.infer<typeof OfferingNode>;

export const OfferingTree = z.object({
  /**
   * Het bedrijfsmodel zoals het model het ziet ná het bekijken van de hele site.
   * Wijkt dit af van wat `profile_research` op de homepage bepaalde, dan is dat
   * een signaal. Geen fout die stil overschreven mag worden.
   */
  businessModel: z.enum(["retailer", "platform", "dienstverlener", "fabrikant", "overig"]),
  nodes: z.array(OfferingNode),
  /** Wat het model NIET kon vaststellen. Voedt de gespreksagenda. */
  gaps: z.array(z.string()),
});

export type OfferingTree = z.infer<typeof OfferingTree>;
