import { z } from "zod";

/**
 * Fase C, Content-generatie (abcplan.md §8). Model mini, geen web_search.
 * LLM-geoptimaliseerd: direct antwoord, heldere koppen, FAQ, schema-markup.
 */
export const ContentPiece = z.object({
  title: z.string(),
  metaTitle: z.string().max(60), // Google kapt rond de 60 tekens af
  metaDescription: z.string().max(160),
  bodyMarkdown: z.string(), // volledige pagina in Markdown
  faq: z.array(
    z.object({
      q: z.string(),
      a: z.string(),
    }),
  ),
  schemaJsonLd: z.string(), // klaar om te plakken
  targetIntent: z.string(),
  cluster: z.string(),
  /**
   * Traceerbaarheid (contentbriefing.md §9, implementatieplan.md R5.3): per
   * concrete bewering over de klant het F-nummer van de feitenkaart dat hem
   * dekt.
   *
   * Het model moet zijn eigen tekst dus nalopen en per bewering de bron
   * aanwijzen. Dat is niet alleen administratie, het is wat het verzinnen
   * duur maakt. Een bewering zonder F-nummer valt op, en `sourceCoverage()`
   * rekent in code na of het genoemde nummer echt bestaat. Alleen algemene
   * uitleg over het onderwerp hoeft hier niet in; die bevat geen belofte van
   * deze klant.
   */
  /**
   * DE BEWIJSPUNTEN (V9, migratie 0093): per gekozen feit wat het voor de lezer
   * betekent.
   *
   * ⚠️ Dit is een ANDERE vraag dan `claims` hieronder. `claims` bewijst dat een
   * zin MAG staan (welk feit dekt hem). Dit bewijst dat een feit IS OMGEZET van
   * bedrijfsgegeven naar argument. De externe copywriter van 3 september noemde
   * dat zijn tweede aanbeveling van drie, met dit voorbeeld: "vaste ploeg van
   * vier eigen dakdekkers" moet "u weet wie er op uw dak komt" worden.
   *
   * Drie tot vijf, en niet meer: van twintig feiten er twintig noemen is precies
   * de redactionele luiheid die hij aanwees. De code rekent na dat het F-nummer
   * bestaat en dat de betekeniszin ook echt in de tekst staat.
   */
  proofPoints: z.array(
    z.object({
      /** Het F-nummer van het feit dat dit punt draagt. */
      factRef: z.string(),
      /** Eén zin: wat dit feit voor DEZE lezer betekent. Geen bedrijfsgegeven. */
      betekenis: z.string(),
      /**
       * Waarom dat voor DEZE lezer telt (optimalisatie 7, 4 september 2026).
       *
       * De externe AI-expert wees op een stap die ontbrak: "vier eigen
       * dakdekkers" wordt "u weet wie er op uw dak komt", en dat is de vertaling
       * van feit naar betekenis. De vraag daarna is waarom die betekenis voor
       * deze ene lezer iets uitmaakt. Feit, betekenis, relevantie: pas bij de
       * derde stap wordt een bewijsstuk een argument.
       *
       * Dit veld stuurt niets af: het dwingt de schrijver de keuze hardop te
       * maken, en het is terug te lezen naast de tekst. Mag leeg bij een pagina
       * die vóór deze wijziging geschreven is.
       */
      relevantie: z.string(),
    }),
  ),
  claims: z.array(
    z.object({
      claim: z.string(),
      factRef: z.string(),
      /**
       * Het letterlijke fragment uit dat feit dat de bewering dekt. De code
       * controleert of het er echt in staat, een F-nummer noemen zonder de
       * dekkende zin te kunnen aanwijzen telt niet als onderbouwing.
       */
      quote: z.string(),
    }),
  ),
});

export type ContentPiece = z.infer<typeof ContentPiece>;

/**
 * De FAQ zoals de klant hem zelf bewerkt (content-editie, onderdeel 3). Los
 * van `ContentPiece.faq` hierboven: dat schema is voor wat het model
 * TERUGGEEFT, dit is voor wat een mens via de PATCH-route INSTUURT, en die
 * twee mogen verschillende regels hebben, een klant tikt geen `targetIntent`
 * of `claims` in.
 *
 * Grenzen (12 paren, 200/600 tekens) zijn een inschatting, geen meting, net
 * als `DUPLICATE_THRESHOLD` in `lib/pipeline/similarity.ts`. Aan te passen
 * zodra er echte gevallen zijn die ertegenaan lopen.
 */
const FAQ_EDIT_MAX_ITEMS = 12;
const FAQ_EDIT_MAX_QUESTION_LENGTH = 200;
const FAQ_EDIT_MAX_ANSWER_LENGTH = 600;

export const FaqEdit = z
  .array(
    z.object({
      q: z.string().trim().min(1, "Een vraag mag niet leeg zijn").max(FAQ_EDIT_MAX_QUESTION_LENGTH),
      a: z.string().trim().min(1, "Een antwoord mag niet leeg zijn").max(FAQ_EDIT_MAX_ANSWER_LENGTH),
    }),
  )
  .max(FAQ_EDIT_MAX_ITEMS, `Maximaal ${FAQ_EDIT_MAX_ITEMS} vraag-en-antwoordparen`);

export type FaqEditItem = z.infer<typeof FaqEdit>[number];
