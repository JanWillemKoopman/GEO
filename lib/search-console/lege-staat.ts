/**
 * Waarom staat er geen zoekverkeer op het scherm?
 *
 * ── VIER PROBLEMEN DIE ER HETZELFDE UITZAGEN ────────────────────────────────
 *
 * Het zoekverkeerscherm had twee lege staten: "Nog niet gekoppeld" en "Nog geen
 * cijfers binnen", met daarnaast één die er in de praktijk nooit uit kwam.
 * Achter die twee zitten vier verschillende situaties met vier verschillende
 * oplossingen, en ze verschilden alleen in het kopje:
 *
 *   1. Er is geen koppeling  →  de consultant moet er een maken.
 *   2. Er is er wel een, maar Google laat ons er niet in  →  het adres van
 *      ORBIT ENGINE moet in Search Console worden toegevoegd.
 *   3. De koppeling werkt, er staat alleen nog niets van ons live  →  publiceren.
 *   4. Alles staat goed, Google heeft de cijfers nog niet  →  wachten, en het
 *      duurt bij Google een dag of drie.
 *
 * Bij drie van de vier kan de klant niets doen, en bij precies één wel. Eén
 * tekst voor alle vier betekent dus dat de enige situatie waarin hij moet
 * handelen, niet te onderscheiden is van de drie waarin hij moet wachten.
 *
 * ── DE VOLGORDE IS EEN BESLUIT, GEEN GEVOLG VAN DE CODE ─────────────────────
 *
 * ⚠️ Tot 16 september 2026 vuurde de controle op de koppeling vóór die op de
 * gepubliceerde pagina's, en dat leverde een verkeerde melding op bij de meest
 * voorkomende klant van allemaal: net gekoppeld, nog niets gepubliceerd. Die
 * kreeg "Koppel je Google Search Console" te zien terwijl de koppeling er al
 * stond. De staat "nog niets live" was daardoor alleen bereikbaar voor merken
 * die al cijfers hadden, en dus vrijwel nooit.
 *
 * De volgorde hieronder volgt het programma zelf: eerst kan er gemeten worden,
 * dan is er iets om te meten, dan komen de cijfers. Elke staat zegt wat er
 * gebeurt en wie er aan zet is, zoals Nova dat bij elke wachtstand doet.
 *
 * Puur en zonder `server-only` (conventie 2): dit bepaalt welke uitleg de klant
 * leest, en dat hoort onder test.
 */

export type LegeStaat = "niet_gekoppeld" | "geen_toegang" | "niets_live" | "cijfers_komen";

export interface LegeStaatInvoer {
  /** Is er een Search Console-property vastgelegd? */
  heeftProperty: boolean;
  /** Wanneer ORBIT ENGINE voor het laatst cijfers kon lezen. Leeg = nog nooit. */
  geverifieerdOp: string | null;
  /** De laatste fout in gewone taal, als de laatste poging mislukte. */
  laatsteFout: string | null;
  /** Hoeveel pagina's van ORBIT ENGINE er live staan. */
  gepubliceerdePaginas: number;
  /** Hoeveel dagcijfers er binnen zijn voor precies die pagina's. */
  dagenVoorOnzePaginas: number;
}

export interface LegeStaatUitleg {
  staat: LegeStaat;
  /** Het mono-label bovenaan de kaart. */
  kop: string;
  /** Wat er aan de hand is, in gewone taal. */
  uitleg: string;
  /** Wie er aan zet is. `null` = niemand, er hoeft alleen gewacht te worden. */
  aanZet: "consultant" | "klant" | null;
  /** Wat de klant leest als hij zelf niets kan doen. Leeg als hij wél aan zet is. */
  geruststelling: string;
}

/**
 * Welke van de vier, of `null` als er gewoon cijfers te tonen zijn.
 *
 * ⚠️ `dagenVoorOnzePaginas` telt de cijfers van ÓNZE pagina's en niet die van de
 * hele site. Een merk met een bestaande website heeft vanaf dag één duizenden
 * rijen in Search Console, en op de oude controle (`rijen.length === 0`) leek
 * daarmee alles in orde terwijl er over het werk van ORBIT ENGINE nog niets
 * bekend was.
 */
export function legeStaat(invoer: LegeStaatInvoer): LegeStaatUitleg | null {
  if (!invoer.heeftProperty) {
    return {
      staat: "niet_gekoppeld",
      kop: "Nog niet gekoppeld",
      uitleg:
        "Met Google Search Console erbij laat ORBIT ENGINE zien of de pagina's die hij schreef " +
        "ook bezoekers opleveren.",
      aanZet: "consultant",
      geruststelling:
        "Je consultant legt de koppeling voor je. Laat weten dat je hem wilt, dan staat je " +
        "zoekverkeer hier binnen een dag.",
    };
  }

  // Nooit gelukt, of de laatste poging liep vast. Allebei hetzelfde probleem
  // voor de klant: Google laat ons er niet in, en dat lost een nieuwe koppeling
  // niet op.
  if (!invoer.geverifieerdOp || invoer.laatsteFout) {
    return {
      staat: "geen_toegang",
      kop: "Wacht op toegang bij Google",
      uitleg:
        "De koppeling staat klaar, maar Google laat ORBIT ENGINE nog niet bij de cijfers van deze " +
        "site. Het adres van ORBIT ENGINE moet in Search Console als gebruiker toegevoegd worden.",
      aanZet: "consultant",
      geruststelling:
        "Je consultant regelt dit. Zodra Google ons binnenlaat, staan de cijfers er binnen een dag.",
    };
  }

  if (invoer.gepubliceerdePaginas === 0) {
    return {
      staat: "niets_live",
      kop: "Nog geen pagina's live",
      uitleg:
        "De koppeling werkt. Er staat alleen nog geen pagina van ORBIT ENGINE op je site, dus er " +
        "is nog niets waarvan het verkeer te volgen valt.",
      aanZet: "klant",
      geruststelling: "",
    };
  }

  if (invoer.dagenVoorOnzePaginas === 0) {
    return {
      staat: "cijfers_komen",
      kop: "De cijfers komen binnen",
      uitleg:
        "Je pagina's staan live en de koppeling werkt. Google levert de eerste cijfers van een " +
        "nieuwe pagina meestal na een dag of drie.",
      aanZet: null,
      geruststelling: "Je hoeft niets te doen. Kijk over een paar dagen terug.",
    };
  }

  return null;
}
