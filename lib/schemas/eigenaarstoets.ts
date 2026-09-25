import { z } from "zod";

/**
 * De EIGENAARSTOETS (L10, docs/tasks/contentpijplijn-publicatiewaardig.md §5 en
 * WP9): leest de pagina als de ondernemer.
 *
 * Waarom deze vorm: de blinde lezer van de doorlichting beantwoordt precies
 * deze vragen (publiceert hij zo, wat verandert hij eerst, welke zinnen zijn
 * herhaling of hol) en bleek daarin bruikbaar, terwijl losse cijfers van de
 * vakmanschapsbeoordelaar de volgorde van een echte copywriter slecht volgden
 * (rangcorrelatie 0,29, `content-craft.ts`). Elk probleem draagt een letterlijk
 * citaat; de code gooit een probleem weg waarvan het citaat niet in de tekst
 * staat (`eigenaarstoets.ts`).
 */
export const EIGENAAR_PROBLEMEN = [
  "herhaling",
  "hol",
  "kop_past_niet",
  "toon",
  "ontbrekend_bewijs",
  "onduidelijk",
  "anders",
] as const;
export type EigenaarProbleem = (typeof EIGENAAR_PROBLEMEN)[number];

export const Eigenaarstoets = z.object({
  /** Zou de ondernemer dit zonder aanpassing op zijn eigen site zetten? */
  publiceert: z.enum(["ja", "met_aanpassingen", "nee"]),
  /** In één of twee zinnen waarom. */
  waarom: z.string(),
  /** Wat hij als eerste zou veranderen. */
  eersteWijziging: z.object({
    /** De kop van de sectie, of null voor de hele pagina. */
    sectie: z.string().nullable(),
    /** De letterlijke zin uit de pagina waar het om gaat, of leeg als het iets is dat ontbreekt. */
    citaat: z.string(),
    /** Wat er moet gebeuren, als opdracht aan de schrijver. */
    wat: z.string(),
  }),
  /** Hoogstens zes problemen die een copywriter eruit zou halen. */
  problemen: z.array(
    z.object({
      soort: z.enum(EIGENAAR_PROBLEMEN),
      /** De letterlijke zin uit de pagina. */
      citaat: z.string(),
      /** Wat ermee moet, als opdracht aan de schrijver. */
      voorstel: z.string(),
    }),
  ),
  /** Tegen de huidige sitepagina, als die er is. */
  vergelijking: z.enum(["nieuw_beter", "gelijk", "huidig_beter", "geen_huidige"]),
});
export type Eigenaarstoets = z.infer<typeof Eigenaarstoets>;
