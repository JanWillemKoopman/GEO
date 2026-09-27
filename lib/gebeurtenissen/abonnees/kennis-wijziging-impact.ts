import "server-only";

/**
 * DE EERSTE ECHTE ABONNEE (G3 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * "Wij doen geen warmtepompen meer" leidt niet tot blind opnieuw draaien, maar
 * tot een zichtbare lijst (§4 regel 5, niets draait vanzelf): de kansen die op
 * dit kennisitem leunden gaan op "te herzien" (gewoon veranderd) of "vervallen"
 * (het item is afgewezen of mag niet meer op de site), en een pagina die
 * dezelfde kennis gebruikte krijgt een melding.
 *
 * Registreert zichzelf bij import (`registreer()`); geïmporteerd vanuit
 * `lib/jobs/handlers.ts`, zodat de werker hem kent zonder dat het pure register
 * (`lib/gebeurtenissen/register.ts`, gelezen door `scripts/test-unit.ts`) zelf
 * een `server-only`-module hoeft te importeren.
 */
import { registreer } from "@/lib/gebeurtenissen/register";
import type { Abonnee } from "@/lib/gebeurtenissen/types";
import { afhankelijkVan } from "@/lib/afhankelijkheden/vastleggen";
import { markeerKansenGeraakt } from "@/lib/kansen/impact";

export const NAAM = "kennis_wijziging_impact";

export const kennisWijzigingImpact: Abonnee = {
  naam: NAAM,
  soorten: ["kennis_gewijzigd"],
  verwerk: async (admin, gebeurtenis) => {
    const deps = await afhankelijkVan(admin, gebeurtenis.objectId);
    if (deps.length === 0) return;

    const { data: item } = await admin
      .from("klantkennis")
      .select("afgewezen_op, gebruik")
      .eq("id", gebeurtenis.objectId)
      .maybeSingle();
    const kennis = item as { afgewezen_op: string | null; gebruik: string | null } | null;
    // Weg is weg: een mens zei "dit klopt niet" of "dit niet op mijn site". Een
    // gewone wijziging (een prijs, een tekst) is alleen iets om na te kijken.
    const vervallen = Boolean(kennis?.afgewezen_op) || kennis?.gebruik === "verboden";

    const kansIds = deps.filter((d) => d.vanTabel === "kansen").map((d) => d.vanId);
    await markeerKansenGeraakt(admin, kansIds, vervallen);

    const paginaIds = deps.filter((d) => d.vanTabel === "content_pieces").map((d) => d.vanId);
    if (paginaIds.length > 0) {
      const { error } = await admin
        .from("content_pieces")
        .update({ kennis_gewijzigd_op: new Date().toISOString() })
        .in("id", paginaIds);
      if (error) console.warn(`Melding bij pagina's zetten mislukt (${paginaIds.join(", ")}):`, error.message);
    }
  },
};

registreer(kennisWijzigingImpact);
