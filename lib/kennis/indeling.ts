/**
 * DE INDELING VAN SITEFEITEN IN DE KENNISLAAG (K8 deel 2 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`, besluit V18).
 *
 * De samenvatting van het onderzoek levert sitefeiten zonder soort: "een
 * proefles kost € 45" komt binnen als bewering met citaat, niet als prijs. Tot
 * K8 deelde het feitenregister ze daarna in, op `brand_facts`. Nu gebeurt dat op
 * het kennisitem zelf, zodat de kennislaag twee prijzen voor hetzelfde als
 * botsing herkent (V14).
 *
 * Het model zegt welke soort, welke waarde en waarop het slaat
 * (`fact-classify.ts`, ongewijzigd). Deze module zet dat om, in code:
 *   - het domein volgt uit de soort, dezelfde regel als het terugvullen (K3);
 *   - "geldt voor" is bij het model een naam ("proefles"); die wordt de
 *     verwijzing naar het aanbod met die naam, dezelfde regel als K3
 *     (`koppelAanAanbod()`). Vindt de code geen aanbod met die naam, dan blijft
 *     het item merkbreed en staat de naam in `ruw`: zo was het vóór de indeling
 *     ook, en een botsing die daardoor te veel gezien wordt, legt de consultant
 *     voor (V14). Liever een keuze te veel dan een prijs op de verkeerde pagina.
 *
 * Puur en zonder `server-only` (conventie 2). Het wegschrijven staat in
 * `indelen.ts`.
 */
import { domeinVanFeit, koppelAanAanbod } from "@/lib/kennis/terugvullen";
import type { Indeling } from "@/lib/kennis/vastleggen-typen";
import type { Klantkennis } from "@/lib/types/database";

/** De bronnen van een sitefeit in de kennislaag: het oude register (K3) of de samenvatting (sinds K8). */
export const SITEFEIT_HERKOMST = ["brand_facts", "profile_facets"] as const;

/** Moet dit item nog ingedeeld worden? Alleen een actueel sitefeit zonder soort. */
export function moetIngedeeld(
  item: Pick<Klantkennis, "soort" | "bron" | "status" | "herkomst_tabel" | "vervangen_door" | "afgewezen_op">,
): boolean {
  return (
    !item.soort &&
    item.bron === "website" &&
    item.status === "waargenomen" &&
    (SITEFEIT_HERKOMST as readonly string[]).includes(item.herkomst_tabel ?? "") &&
    !item.vervangen_door &&
    !item.afgewezen_op
  );
}

export interface ModelIndeling {
  soort: string;
  waarde: unknown | null;
  geldtVoor: string | null;
  bewijskracht: "geen" | "gewoon" | "sterk";
}

/** Een aanbodknoop zoals de kennislaag hem kent: het item, en de naam van de knoop. */
export interface AanbodNaam {
  kennisId: string;
  naam: string;
}

export function indelingVoorKennis(ind: ModelIndeling, aanbod: readonly AanbodNaam[]): Indeling {
  const tekst = (ind.geldtVoor ?? "").trim();
  const geldtVoor = tekst
    ? koppelAanAanbod(tekst, aanbod.map((a) => ({ id: a.kennisId, name: a.naam, removed_at: null })))
    : [];
  return {
    domein: domeinVanFeit(ind.soort),
    soort: ind.soort,
    waarde: ind.waarde ?? null,
    bewijskracht: ind.bewijskracht,
    geldtVoor: [...new Set(geldtVoor)],
    ruw: { ...ind, geldtVoorGevonden: tekst ? geldtVoor.length > 0 : null },
  };
}
