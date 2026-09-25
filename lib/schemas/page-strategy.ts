import { z } from "zod";

/**
 * De PAGINASTRATEGIE (L5, docs/tasks/contentpijplijn-publicatiewaardig.md §5 en §6, WP3).
 *
 * De redactionele keuze vóór het schrijven: wat er op de pagina komt en vooral
 * wat niet, welke feiten voorop gaan, waar elke onzekerheid heen gaat, en hoe
 * lang de pagina wordt. Feiten worden aangewezen met hun F-nummer op dezelfde
 * feitenkaart die de schrijver krijgt; betwiste feiten met een B-nummer uit de
 * aparte lijst. De code rekent alles na (`strategie-check.ts`).
 *
 * Alle velden verplicht en `nullable` waar leeg mag: de Responses API met
 * structured output eist dat elk veld in het schema staat.
 */

export const ZOEKINTENTIES = ["informeren", "vergelijken", "kopen", "lokaal vinden"] as const;
export const FASES = ["oriëntatie", "overweging", "beslissing"] as const;

/** De vijf redenen waarom een voorbehoud mag (§7.2). Een gesloten lijst. */
export const NUANCE_REDENEN = ["geld", "veiligheid", "wet", "zorg", "klant"] as const;
export type NuanceReden = (typeof NUANCE_REDENEN)[number];

export const PageStrategy = z.object({
  zoekintentie: z.enum(ZOEKINTENTIES),
  /** Eén persoon in één situatie. */
  lezer: z.string(),
  fase: z.enum(FASES),
  /** Wat de lezer na afloop doet. */
  paginadoel: z.string(),
  /** Wat blijft hangen, in één zin. */
  kernboodschap: z.string(),
  /** Het antwoord op de hoofdvraag in hoogstens twee zinnen, met een concreet feit. */
  openingsantwoord: z.string(),
  /** Waarom deze pagina naast de andere bestaat, in één zin. */
  hoek: z.string(),
  /** Drie tot zes feiten, elk met wat het voor deze lezer betekent. */
  prioriteitsfeiten: z.array(z.object({ feit: z.string(), betekenis: z.string() })),
  /** Feiten die mogen, niet hoeven. */
  optioneleFeiten: z.array(z.string()),
  uitgeslotenFeiten: z.array(
    z.object({ feit: z.string(), reden: z.enum(["elders gedekt", "niet relevant", "betwist"]) }),
  ),
  onderwerpen: z.array(
    z.object({
      onderwerp: z.string(),
      besluit: z.enum(["opnemen", "weglaten", "eerst vragen"]),
      /** Waarop het rust als het erop komt. */
      bron: z.enum(["feit", "vakkennis", "geen"]),
      /** De F-nummers waarop het rust. */
      feiten: z.array(z.string()),
      /** Woorden voor dit onderwerp, bij opnemen. */
      woorden: z.number().int().nullable(),
      /** Bij "eerst vragen": de vraag aan de ondernemer. */
      vraag: z.string().nullable(),
      /** Kan dit onderwerp niet zonder een betwist feit? De B-nummers. */
      wachtOpConflict: z.array(z.string()),
      /** Is dit een kernonderwerp voor de lezer? */
      kern: z.boolean(),
      reden: z.string(),
    }),
  ),
  onzekerheden: z.array(
    z.object({
      punt: z.string(),
      /** A: intern oplossen (vraag), B: uitleggen aan de lezer, C: weglaten. */
      bestemming: z.enum(["A", "B", "C"]),
      /** Bij B verplicht, uit de gesloten lijst van §7.2. */
      reden: z.enum(NUANCE_REDENEN).nullable(),
      /** Bij B: de zin zoals hij één keer op de pagina mag. */
      formulering: z.string().nullable(),
      /** Bij A: de vraag aan de ondernemer. */
      vraag: z.string().nullable(),
    }),
  ),
  /** Het bezwaar uit het verkoopgesprek dat deze pagina wegneemt, als dat er is. */
  bezwaar: z.string().nullable(),
  lengtebudget: z.object({
    woorden: z.number().int(),
    onderbouwing: z.string(),
    /** Gaat het budget boven het plafond, dan hier waarom. Anders leeg. */
    redenBovenPlafond: z.string().nullable(),
  }),
  /** Wat de lezer moet doen, in de woorden van het merk. */
  oproep: z.string(),
  /** Onderwerpen waar nuance wel moet (veiligheid, wet, zorg), met de nuance. */
  gevoelig: z.array(z.object({ onderwerp: z.string(), nuance: z.string() })),
});
export type PageStrategy = z.infer<typeof PageStrategy>;
