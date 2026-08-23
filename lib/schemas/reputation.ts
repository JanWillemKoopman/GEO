import { z } from "zod";

/**
 * De contracten van Mijn reputatie (docs/tasks/mijn-reputatie.md §4).
 *
 * ── ⚠️ DE VOLGORDE VAN ELKE ENUM IS EEN VANGNET, GEEN SMAAK ─────────────────
 *
 * Structured output kiest bij twijfel de EERSTE waarde uit een lijst. Dat is
 * geen theorie: het model vulde ondanks een expliciete instructie bij 10 van 27
 * niet-genoemde merken tóch een `mention_role` in, precies omdat
 * `eerste_aanbeveling` vooraan stond (conventie 1).
 *
 * Daarom staat in elke enum hieronder de VEILIGSTE waarde vooraan. Twijfelt het
 * model, dan levert dat `onbekend` op en niet `positief`. Dat is de goedkoopste
 * helft van het vangnet; de andere helft staat in code, in
 * `lib/pipeline/reputation-verdict.ts`, want een volgorde is nog steeds een
 * intentie en geen garantie.
 */

/**
 * Het oordeel over één antwoord (§4.7).
 *
 * Draait als tweede, GOEDKOPE en ONGEGRONDE aanroep na elke vraag uit blok A en
 * B. Dat is dezelfde splitsing als halte 3a en 3b van de meting: het model dat
 * antwoordde, beoordeelt zichzelf niet. Zou je het in één aanroep doen, dan
 * moet bij elke mislukte beoordeling de dure gegronde vraag opnieuw gesteld
 * worden, en dat is bij de meting de duurste fout gebleken die je kunt maken.
 */
export const ReputationVerdict = z.object({
  /**
   * ⚠️ `onbekend` staat vooraan, zie de kop van dit bestand. Een model dat
   * twijfelt hoort "ik weet het niet" te zeggen, niet "positief".
   */
  toon: z.enum([
    "onbekend",
    "neutraal",
    "gemengd",
    "overwegend_positief",
    "positief",
    "negatief",
  ]),
  /**
   * Ging dit antwoord überhaupt over dít merk?
   *
   * ⚠️ Het scherpste vangnet van de hele analyse. Bij een merk met een
   * gelijknamige naamgenoot elders praat het model geregeld over het verkeerde
   * bedrijf, en dan is elk oordeel eruit onbruikbaar. `false` maakt de toonscore
   * altijd null, afgedwongen in code.
   */
  noemt_merk: z.boolean(),
  /**
   * Waar het oordeel op rust.
   *
   * ⚠️ `geen` haalt het antwoord uit het merkcijfer (de harde regel uit §2.1:
   * toon zonder bewijs is geen reputatie). `onbekend` staat vooraan omdat dat
   * de veilige twijfelwaarde is; `geen` is een POSITIEVE vaststelling ("ik heb
   * gekeken en er is niets") en mag dus niet de standaard zijn.
   */
  grondslag: z.enum([
    "onbekend",
    "geen",
    "eigen_site",
    "sociale_media",
    "pers",
    "reviews",
  ]),
  /** Wat er letterlijk positief genoemd wordt. Leeg als er niets staat. */
  pluspunten: z.array(z.string()),
  /**
   * Wat er letterlijk negatief genoemd wordt.
   *
   * Een leeg lijstje is hier een MEETRESULTAAT en geen ontbrekende waarde: een
   * model dat expliciet naar klachten gevraagd wordt en er geen vindt, zegt dat.
   */
  minpunten: z.array(z.string()),
  /**
   * Letterlijke citaten, om na te kunnen lezen waar het oordeel op rust.
   *
   * ⚠️ Elk citaat waarvan de tekst niet letterlijk in het opgeslagen antwoord
   * voorkomt, gaat er in code uit. Dezelfde controle als `quote-check.ts` doet.
   */
  citaten: z.array(z.object({ tekst: z.string(), bron_url: z.string() })),
});

export type ReputationVerdict = z.infer<typeof ReputationVerdict>;

/**
 * Het oordeel over één vergelijkingsantwoord (§4.4).
 *
 * Per criterium een volgorde van de partijen, met per partij de reden en of het
 * model hem kende. De vier criteria staan vast: liet je het model zelf criteria
 * bedenken, dan levert elke run andere assen op en is geen enkele herhaling en
 * geen enkele vergelijking tussen twee diensten nog iets waard.
 */
export const ReputationComparison = z.object({
  criteria: z.array(
    z.object({
      criterium: z.enum([
        "dienstverlening",
        "kwaliteit",
        "prijs_kwaliteit",
        "betrouwbaarheid",
      ]),
      partijen: z.array(
        z.object({
          naam: z.string(),
          /**
           * ⚠️ `false` betekent: ik ken dit bedrijf niet goed genoeg om er iets
           * over te zeggen. Dat is een geldig en vaak het juiste antwoord, en
           * het is veel beter dan een gok: zo'n partij valt uit de noemer in
           * plaats van dat hij onderaan gezet wordt. Een eerlijk "ik weet het
           * niet" is hier de meest waardevolle uitkomst die er is.
           */
          ken_ik: z.boolean(),
          /** De plaats vanaf 1. 0 of negatief betekent geen plaats. */
          plaats: z.number(),
          /** Waarom deze partij hier staat. Hier zit de nuance in, niet in het cijfer. */
          reden: z.string(),
          /** De bronnen waar deze plaatsing op rust. Leeg mag. */
          bronnen: z.array(z.string()),
        }),
      ),
    }),
  ),
});

export type ReputationComparison = z.infer<typeof ReputationComparison>;

/**
 * De reviewplatforms en cijfers die het model vindt (§4.5, blok C1).
 *
 * ⚠️ Wat hier uitkomt is een KANDIDAAT en geen feit. Het model levert het
 * cijfer, de eigen crawler plus de JSON-LD-oogst bevestigen het, en pas dan
 * staat het als bevestigd op het scherm (§2.4). Hetzelfde patroon als
 * `validate-claims.ts`: het model levert de kandidaat, de code besluit.
 */
export const ReputationRatings = z.object({
  platforms: z.array(
    z.object({
      platform: z.string(),
      /** Zonder URL wordt het cijfer weggegooid: er valt dan niets te controleren. */
      url: z.string(),
      /** Het cijfer zoals het model het vond. Negatief of 0 betekent: geen cijfer. */
      cijfer: z.number(),
      /** Op hoeveel beoordelingen. 0 betekent onbekend. */
      aantal: z.number(),
      /** Hoe zeker het model hiervan is. "Weet je het niet zeker, zeg dat dan." */
      zeker: z.boolean(),
    }),
  ),
});

export type ReputationRatings = z.infer<typeof ReputationRatings>;

/**
 * De indeling van alle gevonden domeinen (§4.5, blok C5).
 *
 * Eén aanroep voor de hele lijst, niet één per domein, precies zoals
 * `lib/offsite/presence.ts` dat doet. De web-zoekactie is de dure post; tien
 * domeinen los voorleggen kost tien keer zoveel als ze samen voorleggen.
 *
 * ⚠️ `overig` staat vooraan: dat is de veilige twijfelwaarde. De bekende
 * platforms worden sowieso al in code ingedeeld (`lib/reputation/sources.ts`),
 * en die lijst wint altijd van het model.
 *
 * ── ⚠️ `eigen` STAAT HIER BEWUST NIET TUSSEN (23 augustus 2026) ─────────────
 *
 * Hij stond er wel, en dat ging mis in de eerste echte run. Het model deelde
 * `autobedrijfdetwee.nl`, `sdlautomotive.nl` en `alfaromeo.nl` alle drie in als
 * `eigen`. Achteraf logisch: het las de categorie als "de site van dat bedrijf
 * zelf" in plaats van "de site van de klant". Dat is geen fout van het model
 * maar een dubbelzinnige categorie.
 *
 * Het gevolg was tweeledig en allebei zichtbaar voor de klant. Op het scherm
 * zou staan dat de site van zijn concurrent zijn eigen site is. En de zin onder
 * het bronnenblok telt de eigen bronnen, dus "9 van de 15 bronnen zijn je eigen
 * site" zou onzin zijn geworden, terwijl juist die verhouding het bewijs is dat
 * een merk alleen over zichzelf praat.
 *
 * Welk domein de eigen site is, weten wij zeker: het staat in het profiel.
 * `knownKind()` beslist dat in code en de vraag wordt niet meer gesteld. Een
 * model laten raden wat je zelf al weet, is geld uitgeven aan een slechter
 * antwoord.
 */
export const ReputationSourceKinds = z.object({
  domeinen: z.array(
    z.object({
      domein: z.string(),
      soort: z.enum(["overig", "review", "vakpers", "sociaal", "register"]),
    }),
  ),
});

export type ReputationSourceKinds = z.infer<typeof ReputationSourceKinds>;

/**
 * De synthese (§4.6, blok D).
 *
 * ⚠️ DE SYNTHESE REKENT NIET. De drie getallen en de plaats zijn op dit moment
 * al berekend door `lib/reputation/score.ts` en `lib/reputation/rank.ts`, en
 * gaan als GEGEVEN de prompt in. Het model schrijft de uitleg, het bepaalt de
 * uitkomst niet. Zou je dat omdraaien, dan verschilt het cijfer per keer dat je
 * het vraagt en is geen enkele vergelijking over de tijd nog iets waard.
 *
 * Vandaar dat er in dit schema geen enkel getal zit.
 */
export const ReputationSynthesis = z.object({
  /** De zin voor blok 1, in gewone taal. Komt letterlijk op het scherm van de klant. */
  samenvatting: z.string(),
  /**
   * Eigenschappen die AI structureel aan dit merk koppelt.
   *
   * Alleen punten die in minstens twee antwoorden voorkomen halen het scherm.
   * Dat filter staat in code en niet in de prompt: één keer iets noemen is
   * toeval en geen patroon.
   */
  sterk: z.array(z.string()),
  /** Bezwaren die terugkomen. Zelfde regel: minstens twee antwoorden. */
  kwetsbaar: z.array(z.string()),
  /** Eén of twee zinnen per aanbodknoop, op naam gekoppeld. */
  per_dienst: z.array(z.object({ dienst: z.string(), uitleg: z.string() })),
  /**
   * De twee zinnen onder de vergelijkingstabel, want een tabel is geen
   * conclusie. Leeg als er geen vergelijking gedraaid heeft.
   */
  vergelijking: z.string(),
});

export type ReputationSynthesis = z.infer<typeof ReputationSynthesis>;


/**
 * De open marktvraag (blok M).
 *
 * ⚠️ Er staat GEEN vaste set bedrijven in dit schema, en dat is het hele punt.
 * De benoemde vergelijking legde partijen op en liep vast zodra het model die
 * niet kende; deze vraag laat het model zelf noemen wie er in de markt toe doet.
 * Wie AI noemt, ís de concurrent.
 *
 * De volgorde is de aanbeveling. Dat is een sterker signaal dan een gedwongen
 * rangschikking, want het model kiest hier vrijwillig wie hij vooraan zet.
 */
export const ReputationMarket = z.object({
  bedrijven: z.array(
    z.object({
      naam: z.string(),
      /** Vanaf 1, in de volgorde waarin het antwoord ze noemt. */
      plek: z.number(),
      /** Waarom dit bedrijf genoemd wordt. Hier zit het bruikbare advies. */
      reden: z.string(),
    }),
  ),
});

export type ReputationMarket = z.infer<typeof ReputationMarket>;

/**
 * Het bewijsmateriaal uit de onderzoeksfase (blok E).
 *
 * Eén keer zoeken, daarna alle dienstvragen tegen hetzelfde corpus. Zonder dit
 * krijgt elke dienstvraag andere zoekresultaten, en dan weet je bij een verschil
 * tussen twee diensten niet of dat aan de reputatie ligt of aan wat de
 * zoekmachine die seconde opleverde.
 */
export const ReputationEvidence = z.object({
  fragmenten: z.array(
    z.object({
      /** De letterlijke passage. Dit is wat de dienstvragen straks lezen. */
      tekst: z.string(),
      /** Waar hij vandaan komt. Leeg als het model geen bron noemt. */
      bron_url: z.string(),
      /** Waar dit fragment over gaat, zodat de dienstvraag het juiste stuk pakt. */
      onderwerp: z.string(),
    }),
  ),
});

export type ReputationEvidence = z.infer<typeof ReputationEvidence>;
