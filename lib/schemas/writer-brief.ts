import { z } from "zod";

/**
 * DE SCHRIJFOPDRACHT: de redactionele keuze vóór het schrijven
 * (optimalisatie 5 en 6 uit docs/tasks/optimalisaties-expertronde-4-september-2026.md,
 * migratie 0094).
 *
 * ── WAAROM DIT GEEN SAMENVATTING IS ─────────────────────────────────────────
 *
 * Beide externe experts waarschuwden voor precies één ding: maak hier geen
 * samenvatting van alle voorbereiding, want dat is een negentiende blok
 * informatie en dat is nu net het probleem. Deze stap VOEGT NIETS TOE. Hij
 * kiest: van twintig feiten de drie die vandaag tellen, van veertien
 * klantantwoorden het ene dat iets laat zien, en van alle mogelijke lezers de
 * ene voor wie deze pagina er is.
 *
 * De feitenkaart blijft daarom compleet in de schrijfopdracht staan. Wat erbij
 * komt is een HIËRARCHIE eroverheen, en dat is een ander ontwerpprincipe dan
 * "geef de schrijver minder informatie".
 *
 * ── ELK VELD IS ÉÉN BESLISSING ──────────────────────────────────────────────
 *
 * Negen velden, geen tien. De volgorde is die van de expert: eerst voor wie,
 * dan wat hij wil weten, dan wat hij moet begrijpen, en pas daarna waarom dit
 * bedrijf. Een veld dat leeg blijft maakt de hele opdracht onbruikbaar, en dan
 * schrijft de pijplijn zoals hij het vóór deze stap deed (conventie 3:
 * onbekend is beter dan verkeerd).
 */
export const WriterBrief = z.object({
  /**
   * Eén concrete persoon in één concrete situatie.
   *
   * Niet "mensen die dakisolatie zoeken", maar "een huiseigenaar die merkt dat
   * zijn woning in de winter moeilijk warm blijft en wil weten of isoleren kan
   * zonder de dakbedekking te vervangen". Dat onderscheid is het voorbeeld dat
   * de expert zelf gaf, en `lib/lezersopdracht.ts` rekent de vorm na.
   */
  lezer: z.string(),
  /** De ENE vraag die deze pagina beantwoordt. Niet twintig. */
  hoofdvraag: z.string(),
  /**
   * Wat de lezer moet begrijpen als hij maar één alinea leest.
   *
   * Dit is het kernantwoord, en de code controleert of het ook echt in de
   * eerste alinea van de pagina terechtkomt.
   */
  kernantwoord: z.string(),
  /**
   * Waarom deze pagina bestaat, in GEO-termen: bij welke vraag noemt een
   * assistent dit merk nu niet. Dat koppelt de tekst terug aan de meting.
   */
  waaromDezePagina: z.string(),
  /**
   * De F-nummers die DEZE pagina dragen, drie tot vijf.
   *
   * Dit is de hiërarchie waar beide experts om vroegen: "gebruik voor deze
   * pagina vooral F3, F7 en F12". De schrijver mag de hele kaart zien en weet
   * nu welk deel ervan het werk doet.
   */
  kernfeiten: z.array(z.string()),
  /**
   * WAAROM ZOU JUIST DEZE LEZER DIT BEDRIJF KIEZEN (optimalisatie 6).
   *
   * Eén tot drie eigenschappen, gekozen VANUIT DE LEZER en niet vanuit het
   * bedrijf. Het verschil dat de expert benoemt: "de lezer heeft haast, dus
   * binnen 24 uur ter plaatse telt", niet "het bedrijf heeft vier dakdekkers".
   * Een bedrijf kan twintig sterke eigenschappen hebben en er voor deze pagina
   * maar drie relevante.
   *
   * Er is tot 4 september 2026 geen enkele stap in de pijplijn geweest die deze
   * vraag stelde, terwijl het de vraag was waarmee de externe copywriter zijn
   * hele beoordeling samenvatte.
   */
  keuzeredenen: z.array(
    z.object({
      /** Het F-nummer waarop deze reden rust. */
      factRef: z.string(),
      /** Waarom dit voor DEZE lezer telt. Eén zin, vanuit de lezer geschreven. */
      reden: z.string(),
    }),
  ),
  /**
   * Wat alleen deze ondernemer kan zeggen: zijn motivering, zijn werkwijze, een
   * keuze die hij bewust niet maakt. Mag leeg blijven als de klant niets in zijn
   * eigen woorden heeft aangeleverd, want dan is verzinnen het alternatief.
   */
  eigenWoorden: z.string(),
  /** Wat er absoluut op de pagina moet, hooguit een handvol prioriteiten. */
  moetErIn: z.array(z.string()),
  /** De valkuilen van DEZE pagina, niet de algemene verboden uit de prompt. */
  nietDoen: z.array(z.string()),
  /** De ene gedachte die na het lezen moet blijven hangen. */
  blijftHangen: z.string(),
});

export type WriterBrief = z.infer<typeof WriterBrief>;
