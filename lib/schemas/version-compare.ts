import { z } from "zod";

/**
 * HET VERGELIJKEND OORDEEL tussen twee versies van dezelfde pagina
 * (optimalisatie 11 uit docs/tasks/optimalisaties-expertronde-4-september-2026.md).
 *
 * ── WAAROM VERGELIJKEN EN NIET NOG EEN CIJFER ───────────────────────────────
 *
 * Van onze vakmanschapsbeoordelaar is gemeten dat zijn NIVEAU klopt (0,14 punt
 * van het menselijke oordeel) en zijn ORDENING niet (rangcorrelatie 0,29). Beide
 * externe experts stelden daarom voor om hem vergelijkend te laten werken: welke
 * van deze twee zou een goede copywriter eerder naar de klant sturen? Dat is
 * voor een taalmodel een natuurlijker vraag dan een absoluut cijfer op een
 * abstracte schaal.
 *
 * ⚠️ Zij dachten daarbij aan het kiezen tussen PAGINA'S ("welke pagina verdient
 * mijn dure reparatie"). Die keuze bestaat in deze app niet: de reparatie werkt
 * per pagina en start op de drempel van het paginatype. Waar een vergelijkend
 * oordeel wél rechtstreeks iets stuurt, is de keuze tussen twee VERSIES van
 * dezelfde pagina, en die werd tot 4 september 2026 gemaakt door twee absolute
 * cijfers van elkaar af te trekken die allebei van diezelfde beoordelaar komen.
 * Een verschil van twee punten is bij die betrouwbaarheid ruis, en toch besliste
 * het over welke tekst de klant krijgt.
 */
export const VersionCompare = z.object({
  /** "A" is de bestaande versie, "B" de zojuist gerepareerde. */
  beter: z.enum(["A", "B"]),
  /**
   * Waarom. Eén zin, en die zin gaat in het logboek van de pagina: zonder reden
   * is dit oordeel niet na te lopen als het er later naast blijkt te zitten.
   */
  waarom: z.string(),
});

export type VersionCompare = z.infer<typeof VersionCompare>;
