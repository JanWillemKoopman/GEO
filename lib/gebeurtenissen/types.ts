/**
 * Typen van de gebeurtenissenlaag (G1 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`, §6.5).
 *
 * Geen `server-only`: dit zijn alleen typen en pure vormfuncties, testbaar
 * vanuit `scripts/test-unit.ts` (conventie 2).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Eén vaste waarde vandaag. Groeit met G5 ("maand vrijgegeven",
 * "pagina gepubliceerd"), niet eerder: §11 risico 4, een gebeurtenissysteem voor
 * soorten die niemand gebruikt is complexer dan wat hij vervangt.
 */
export const GEBEURTENIS_SOORTEN = ["kennis_gewijzigd"] as const;
export type GebeurtenisSoort = (typeof GEBEURTENIS_SOORTEN)[number];

/** Eén rij uit `gebeurtenissen`, in de vorm die een abonnee leest. */
export interface Gebeurtenis {
  id: string;
  profileId: string;
  soort: GebeurtenisSoort;
  objectTabel: string;
  objectId: string;
  payload: Record<string, unknown> | null;
  aangemaaktOp: string;
}

/** Wat `publiceer()` nodig heeft om een gebeurtenis vast te leggen. */
export interface NieuweGebeurtenis {
  profileId: string;
  soort: GebeurtenisSoort;
  objectTabel: string;
  objectId: string;
  payload?: Record<string, unknown> | null;
}

/**
 * Een abonnee: reageert op één of meer soorten gebeurtenissen. `naam` is de
 * sleutel waarmee de wachtrij de taak dedupliceert en waarmee
 * `gebeurtenis_verwerkingen` onthoudt dat deze abonnee deze gebeurtenis al
 * verwerkte, dus moet hij stabiel blijven zodra hij eenmaal draait.
 *
 * `verwerk()` mag zelf ook idempotent zijn (conventie 9), maar hoeft het niet:
 * `lib/gebeurtenissen/verwerken.ts` garandeert al dat hij per gebeurtenis maar
 * één keer aangeroepen wordt.
 */
export interface Abonnee {
  naam: string;
  soorten: readonly GebeurtenisSoort[];
  verwerk: (admin: SupabaseClient, gebeurtenis: Gebeurtenis) => Promise<void>;
}
