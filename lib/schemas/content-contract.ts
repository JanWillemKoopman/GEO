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
   * Vraagt deze sectie om een uitspraak over DIT bedrijf, of is hij algemeen?
   * (docs/tasks/vragen-voor-het-schrijven.md §4)
   *
   * "Wat kost een hybride warmtepomp bij dit bedrijf" vraagt erom. "Hoe werkt
   * een hybride warmtepomp" niet: dat is uitleg over het onderwerp, en een
   * pagina zonder één zo'n sectie is geen slechte pagina.
   *
   * Dit is het veld waarmee de app eindelijk het verschil kan zien tussen "deze
   * sectie is van nature algemeen" en "deze sectie zou iets over het bedrijf
   * moeten zeggen en kan dat niet". Zonder dat verschil is er geen maat voor
   * "hebben we hier genoeg voor" en dus geen reden om een vraag te stellen.
   *
   * Het MODEL oordeelt hier, want het is een inhoudelijk oordeel en geen
   * telling. De CODE rekent na of er een bestaand F-nummer bij staat
   * (`lib/pipeline/input-coverage.ts`), precies de verdeling van conventie 1.
   */
  needsBrandFact: z.boolean(),
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
