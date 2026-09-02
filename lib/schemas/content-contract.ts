import { z } from "zod";

/**
 * Het CONTENTCONTRACT: wat moet er op deze pagina staan?
 * (docs/tasks/contentpijplijn-herontwerp.md A2, migratie 0082)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De claim-audit (`lib/pipeline/briefing.ts`) leverde BEWERINGEN: wat moet deze
 * pagina waarmaken, en kunnen we dat onderbouwen. Wat er niet was, is een
 * inhoudsopgave: welke secties heeft de pagina nodig, welke deelvraag
 * beantwoordt elke sectie, en welke vervolgvraag stelt de lezer daarna.
 *
 * Zonder dat hing de volledigheid van een pagina aan twee promptregels en aan
 * één boolean van de beoordelaar (`answersFollowUpQuestions`). Dat is precies
 * wat conventie 1 verbiedt: een promptinstructie zonder deterministisch
 * vangnet. Nagerekend op productie was het gevolg zichtbaar: 548 woorden
 * gemiddeld, terwijl een artikel op 700 tot 1200 mikt, en 15 van de 29
 * afgeronde pagina's met "check nodig".
 *
 * Het contract gaat naar de schrijver ÉN naar de poort. Dezelfde lijst die de
 * opdracht geeft, rekent hem na. Dat is het hele idee: "compleet" is geen
 * gevoel meer maar een percentage dat je kunt opzoeken.
 */

/** Eén sectie die de pagina moet hebben. */
export const ContractSection = z.object({
  /** Stabiele sleutel (s1, s2, …), zodat een bevinding naar een sectie kan wijzen. */
  id: z.string(),
  /** De kop zoals hij op de pagina komt te staan. */
  heading: z.string(),
  /**
   * De ENE vraag die deze sectie beantwoordt. Dit is wat de poort narekent:
   * staat er in deze sectie een zin die deze vraag losstaand beantwoordt?
   */
  subQuestion: z.string(),
  /** Wat er inhoudelijk in moet, in korte punten. Voor de schrijver, niet voor de poort. */
  mustCover: z.array(z.string()),
  /**
   * De F-nummers van de feitenkaart die in deze sectie thuishoren. Leeg mag:
   * niet elke sectie doet een bewering over het bedrijf, en algemene uitleg
   * heeft juist géén F-nummer (zie R5.3).
   */
  factRefs: z.array(z.string()),
  /** Termen uit het itemdossier die hier uitgelegd horen te worden. */
  explainerTerms: z.array(z.string()),
  /** Richtlengte van deze sectie. Sturen per sectie werkt, sturen per pagina niet. */
  targetWords: z.number(),
  /**
   * Staat deze sectie al op de BESTAANDE pagina? (O4, migratie 0083)
   *
   * Alleen betekenisvol als deze pagina een bestaande pagina verbetert. Bij een
   * nieuwe pagina staat hier `niet_van_toepassing`, en dat wordt deterministisch
   * afgedwongen in `normaliseerContract()`: een oordeel over een pagina die niet
   * bestaat is per definitie verzonnen.
   *
   * Dit is wat de klant uiteindelijk leest als "wat er aan je pagina verandert".
   * Tot 2 september 2026 bestond die lijst niet: de app leverde een vervangende
   * tekst zonder één woord over wat er nu aan schortte.
   */
  presentOnExisting: z.enum(["aanwezig", "deels", "ontbreekt", "niet_van_toepassing"]),
  /**
   * Wat er aan de bestaande pagina moet veranderen voor deze sectie, in één zin
   * en in gewone taal. Leeg bij een nieuwe pagina en bij een sectie die er al
   * volledig op staat.
   */
  whatToChange: z.string(),
});

export type ContractSection = z.infer<typeof ContractSection>;

export const ContentContract = z.object({
  /**
   * Het directe antwoord op de doelvraag, in maximaal twee zinnen, zoals het
   * bovenaan de pagina moet staan. Bewust onderdeel van het contract en niet
   * alleen een promptregel: dit is het enige stuk tekst waarvan we vooraf weten
   * hoe het eruit moet zien, en de poort kan er dus op controleren.
   */
  openingAnswer: z.string(),
  sections: z.array(ContractSection),
  /** De vragen die als FAQ op de pagina horen, in de woorden van de lezer. */
  faqQuestions: z.array(z.string()),
  /** Waarom deze opzet bij deze doelvraag past. Alleen voor de audit-trail. */
  reasoning: z.string(),
});

export type ContentContract = z.infer<typeof ContentContract>;
