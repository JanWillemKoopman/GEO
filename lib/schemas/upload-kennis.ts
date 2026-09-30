import { z } from "zod";

/**
 * Wat het model uit een handmatige upload haalt: feiten, kennis en vermoedens
 * over het bedrijf (30 september 2026).
 *
 * Eén lijst in plaats van drie, want het verschil tussen een feit en kennis is
 * geen eigenschap van de tekst maar van het domein (`FEITEN_DOMEINEN` in
 * `lib/kennis/overzicht.ts`): identiteit, aanbod en bewijs zijn feiten, de rest
 * is kennis. Het model kiest alleen het domein; welk tabblad het wordt, volgt
 * daaruit. Zo kan het model niet iets "feit" noemen om het zwaarder te laten
 * wegen.
 *
 * `grens` (wat niet op de site mag) en `geleerd` (wat eerdere pagina's
 * opleverden) staan er bewust niet in: het eerste is een verbod en hoort een
 * mens te zetten, het tweede komt uit metingen en niet uit een document.
 */
export const UPLOAD_DOMEINEN = ["identiteit", "aanbod", "bewijs", "doelgroep", "positionering", "verhaal", "stem"] as const;

export const UploadItem = z.object({
  domein: z.enum(UPLOAD_DOMEINEN),
  /** Eén of twee woorden: prijs, termijn, werkgebied, dienst, bezwaar, voorbeeld. */
  soort: z.string(),
  /** Eén gegeven in een korte, zelfstandige zin. */
  bewering: z.string(),
  /**
   * `staat_er`: de tekst zegt het zelf, en `citaat` is de letterlijke zin.
   * `vermoeden`: het model leidt het af uit de tekst, de tekst zegt het niet.
   */
  zekerheid: z.enum(["staat_er", "vermoeden"]),
  /** Bij `staat_er` de letterlijke zin. Bij `vermoeden` de passage waar het op leunt, of leeg. */
  citaat: z.string(),
  /** Verloopt dit gegeven (prijzen, tarieven, actievoorwaarden, openingstijden)? */
  verloopt: z.boolean(),
});

export const UploadKennis = z.object({
  items: z.array(UploadItem),
});

export type UploadItem = z.infer<typeof UploadItem>;
export type UploadKennis = z.infer<typeof UploadKennis>;
