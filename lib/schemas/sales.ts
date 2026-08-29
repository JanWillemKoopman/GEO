import { z } from "zod";

/**
 * De contracten van de Sales-module (`docs/tasks/geo-prospect-engine.md`).
 *
 * ── ⚠️ WAT DIT MODEL WEL EN NIET MAG BEPALEN ───────────────────────────────
 *
 * Conventie 1: een promptinstructie is een intentie, code is een garantie. In
 * deze module ligt die grens scherper dan elders, want wat hier uitkomt bepaalt
 * welke bedrijven benaderd worden. Het model levert dus **kandidaten en
 * vindplaatsen**, en het beslist niets:
 *
 *   - Het bepaalt niet of een bedrijf in de markt hoort. Dat doet de admin bij
 *     poort 1, op basis van de zekerheid die `lib/sales/discovery.ts` rekent.
 *   - Het bepaalt niet hoe zeker een bedrijf is. Dat volgt uit het aantal
 *     onafhankelijke vindplaatsen, en het model is er daarvan één.
 *   - Het bepaalt niet wie er uitgesloten wordt. Dat is `lib/sales/suppression.ts`.
 *
 * ── EN WAAROM DE VINDPLAATS VERPLICHT IS ────────────────────────────────────
 *
 * Plan hoofdstuk 15: geen bewijs is geen claim. Een bedrijfsnaam zonder pagina
 * waar hij vandaan komt, is niet te controleren bij poort 1, en een verzonnen
 * bedrijf dat door poort 1 glipt komt uiteindelijk in een verkoopmail terecht.
 * Het veld mag leeg zijn (het model mag niets verzinnen om het te vullen), maar
 * dan telt de kandidaat als minder zeker.
 */

/**
 * Wat de marktontdekking oplevert (plan 9.1).
 *
 * Twee lijsten, en de tweede is de belangrijkste. De bedrijven zijn wat het
 * model zelf vond; de bronpagina's zijn waar onze eigen crawler dáárna gratis
 * verder kan zoeken, zonder model en zonder AI-vooroordeel. Dat tweede is de
 * enige echt onafhankelijke bron die we vandaag hebben.
 */
export const SalesMarketDiscovery = z.object({
  bedrijven: z.array(
    z.object({
      /** De bedrijfsnaam zoals hij op de vindplaats staat. */
      naam: z.string(),
      /**
       * Het webadres, of een lege string.
       *
       * ⚠️ Leeg mag, en dat is met opzet. Een bedrijf zonder website is precies
       * de prospect die deze module zoekt (plan hoofdstuk 9). Zou dit veld
       * verplicht zijn, dan zou het model er een verzinnen.
       */
      website: z.string(),
      /** De vestigingsplaats, of leeg als die er niet bij stond. */
      plaats: z.string(),
      /** De pagina waarop dit bedrijf gevonden is. Leeg als er geen bron is. */
      bron_url: z.string(),
    }),
  ),
  /**
   * De ledenlijsten, vergelijkingssites en gemeentegidsen die deze markt
   * beschrijven.
   *
   * Dit is de bron die niets kost: onze crawler haalt deze pagina's op en leest
   * eruit naar welke bedrijven ze linken. Een ledenlijst van een
   * branchevereniging linkt naar zijn leden, ook naar de leden die geen enkel
   * AI-model ooit noemt.
   */
  bronpaginas: z.array(
    z.object({
      /** Het volledige adres van de overzichtspagina. */
      url: z.string(),
      /** Wat voor pagina dit is, in gewone taal, bijvoorbeeld "ledenlijst NVM". */
      wat: z.string(),
    }),
  ),
  /**
   * Wat het model niet zeker wist, in gewone taal.
   *
   * Conventie 3 in gespreksvorm: een lijst met dertig bedrijven waarvan er acht
   * twijfelachtig zijn, is iets anders dan een lijst met dertig zekere. Dit veld
   * komt bij poort 1 op het scherm, zodat de admin weet waar hij moet kijken.
   */
  kanttekening: z.string(),
});

export type SalesMarketDiscovery = z.infer<typeof SalesMarketDiscovery>;

/**
 * Wat de intentiestap oplevert (plan 10.1, as 2).
 *
 * ⚠️ Het model stelt VOOR, het beslist niet. Hoeveel intenties er meedoen, hoe
 * de vragen erover verdeeld worden en hoe zwaar elke vraag telt, staat in
 * `lib/sales/intents.ts` als rekensom. Vraag je een model om die verdeling, dan
 * krijg je zesendertig vragen of elf over dezelfde intentie: tellen is geen
 * taalwerk.
 */
export const SalesMarketIntents = z.object({
  intenties: z.array(
    z.object({
      /** Het etiket, kleingeschreven en zonder spaties, bijvoorbeeld `aankoopbegeleiding`. */
      label: z.string(),
      /** Wat een salesmedewerker leest, bijvoorbeeld "Aankoopbegeleiding". */
      naam: z.string(),
      /** Waarom deze intentie commercieel telt, in één zin. */
      uitleg: z.string(),
      /**
       * Hoe waardevol één opdracht uit deze intentie is: hoog, midden of laag.
       *
       * Drie banden en geen bedrag. Een bedrag zou een precisie suggereren die
       * niemand heeft, en het zou in een verkoopmail terechtkomen.
       */
      waarde: z.enum(["hoog", "midden", "laag"]),
      /**
       * Hoe vaak deze intentie voorkomt, GESCHAT (plan 10.3).
       *
       * Echte zoekvolumes zijn in ORBIT ENGINE bewust niet gebouwd. Het woord
       * "schatting" reist mee tot op het scherm.
       */
      frequentie: z.enum(["hoog", "midden", "laag"]),
    }),
  ),
  /** Wat het model niet zeker wist, in gewone taal. Komt bij poort 2 op het scherm. */
  kanttekening: z.string(),
});

export type SalesMarketIntents = z.infer<typeof SalesMarketIntents>;

/**
 * Wat de vragenstap oplevert (plan 10.1, het kruis van de twee assen).
 *
 * Het model krijgt de plekken aangereikt (intentie plus fase) en vult alleen de
 * tekst in. Het geeft ze terug mét het etiket erbij, zodat de code kan
 * controleren dat de vraag op de plek hoort waar hij terechtkomt, in plaats van
 * te vertrouwen op de volgorde van een lijst.
 */
export const SalesMarketQuestions = z.object({
  vragen: z.array(
    z.object({
      /** Het etiket van de intentie waar deze vraag bij hoort. */
      intent_label: z.string(),
      /** De klantreisfase: orientatie, vergelijken, selecteren of contact. */
      fase: z.string(),
      /** De vraag zoals een echte klant hem zou stellen. */
      vraag: z.string(),
    }),
  ),
});

export type SalesMarketQuestions = z.infer<typeof SalesMarketQuestions>;

/**
 * Het oordeel over één antwoord: welke bedrijven staan erin? (plan 7.2, 15.2)
 *
 * ── PURE ONTDEKKING, NET ALS BIJ DE KLANTMETING ─────────────────────────────
 *
 * De namen van de dertig bedrijven uit de markt gaan NIET mee in deze prompt, om
 * dezelfde reden als in `lib/openai/mention-prompt.ts`: een vooraf meegegeven
 * lijst richt het model op die namen in plaats van op wat er werkelijk staat, en
 * elke meegegeven naam komt in élke meting terug. Bij dertig bedrijven weegt dat
 * zwaarder dan bij één merk, en het zou de meting bovendien duur maken.
 *
 * Het koppelen van een genoemde naam aan een bedrijf uit de markt gebeurt daarna
 * in `lib/sales/match.ts`, deterministisch en testbaar. Een naam die bij geen
 * enkel bedrijf hoort, wordt bewaard: dat is ofwel een gat in onze
 * marktinventarisatie, ofwel een verzonnen naam, en allebei is informatie.
 */
export const SalesAnswerJudgement = z.object({
  bedrijven: z.array(
    z.object({
      /** De bedrijfsnaam precies zoals hij in het antwoord staat. */
      naam: z.string(),
      /** Het webadres als het antwoord er een noemt, anders leeg. */
      website: z.string(),
      /** De hoeveelste genoemde partij dit is, 1 is de eerste. */
      positie: z.number(),
      /**
       * Hoe prominent dit bedrijf in het antwoord staat.
       *
       * Dezelfde drie rollen als bij de klantmeting, want het verschil tussen
       * "je staat erbij" en "je wordt aangeraden" is precies waar het gesprek
       * over gaat.
       */
      rol: z.enum(["eerste_aanbeveling", "een_van_meerdere", "zijdelings"]),
      /** Het stukje tekst waarin dit bedrijf voorkomt, hooguit twee zinnen. */
      fragment: z.string(),
    }),
  ),
  /** De brondomeinen die het antwoord aanhaalt, bijvoorbeeld `funda.nl`. */
  bronnen: z.array(z.string()),
});

export type SalesAnswerJudgement = z.infer<typeof SalesAnswerJudgement>;

/**
 * De uitleg en de haak bij één kans (plan hoofdstuk 14).
 *
 * ⚠️ **Drie kandidaten en geen één.** De controle achteraf verwerpt een zin met
 * een getal dat nergens uit de meetdata volgt, en dan moet er iets anders zijn
 * om op terug te vallen. Drie kandidaten in één aanroep is goedkoper dan drie
 * aanroepen, en het maakt de terugval op het sjabloon zeldzaam in plaats van
 * gewoon.
 *
 * Het model kiest niet WELKE kans dit is en het rekent niets: dat lag al vast
 * voordat deze aanroep begon (`lib/pipeline/sales-detect.ts`).
 */
export const SalesOpportunityText = z.object({
  /** De beste zin: één reden om te bellen, met de gemeten cijfers erin. */
  haak: z.string(),
  /** Twee alternatieven, voor als de eerste een getal bevat dat niet klopt. */
  alternatieven: z.array(z.string()),
  /** De zakelijke uitleg, drie tot vijf zinnen. Wat er gemeten is en wat het betekent. */
  uitleg: z.string(),
});

export type SalesOpportunityText = z.infer<typeof SalesOpportunityText>;
