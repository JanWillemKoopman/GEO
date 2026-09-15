/**
 * De vulling van het contentplan: welke voorraadkans in welke openstaande
 * maand hoort (blok A, punt 1 uit `docs/tasks/nova-vergelijking-verbeterpunten.md`).
 *
 * ── WAAROM DIT GEEN NIEUWE REGEL IS ─────────────────────────────────────────
 *
 * `createPlan()` in `lib/plans.ts` vulde tot nu toe precies één maand zo, de
 * "voorzet": de sterkste kansen uit de voorraad tot aan de pakketquota, de rest
 * blijft in de voorraad staan. Dit bestand tilt diezelfde regel uit die ene
 * plek en past hem toe op elke maand die nog niet is vrijgegeven, zodat het
 * plan bij elke schermopening zo ver gevuld is als de gemeten voorraad op dat
 * moment toelaat, in plaats van alleen de eerste maand.
 *
 * ── WAAROM "TER GOEDKEURING" HIER OOK THUISHOORT ────────────────────────────
 *
 * Vandaag krijgt in de hele levensduur van een plan maar één maand ooit die
 * status: `approveMonth()` bevordert de volgende conceptmaand nooit. Zonder die
 * regel zou het vooraf vullen van alle maanden een scherm opleveren met
 * meerdere even zware "Concept"-maanden in plaats van precies één maand die om
 * een beslissing vraagt (`docs/tasks/optimalisatielab-orbit-engine.md` §3.2:
 * "twaalf maanden tegelijk ter goedkeuring aanbieden is twaalf beslissingen
 * vragen voor iets wat pas over een jaar speelt"). Deze functie houdt die regel
 * in stand: nooit meer dan één openstaande maand tegelijk "ter_goedkeuring".
 *
 * Puur en zonder `server-only` (conventie 2): geen database, dus testbaar
 * vanuit `scripts/test-unit.ts`. De database-kant (welke rijen dat precies
 * zijn, hoe ze worden bijgewerkt) staat in `vulOpenMaanden()`, `lib/plans.ts`.
 */
import type { PlanMonthStatus } from "@/lib/types/database";

export interface OpenMaand {
  id: string;
  monthNumber: number;
  status: PlanMonthStatus;
  /** Niet-buffer pagina's die er al in staan, ongeacht hoe ze daar kwamen. */
  huidigAantal: number;
  /**
   * `false` zodra de maand geen bruikbare publicatiedag meer heeft
   * (`maandIsVol()`, `lib/plan-schedule.ts`): dan mag er niets bij, ook al zit
   * hij onder de quota. Zonder dit onderscheid zou een pagina wél een
   * `plan_month_id` krijgen maar nooit een `scheduled_for`, want
   * `spreadDates()` heeft voor zo'n maand geen dag meer te geven. Dit is
   * precies de reden dat `createPlan()` de voorzet vroeger naar maand 2
   * verplaatste als maand 1 al te ver gevorderd was; die regel geldt nu voor
   * elke maand in de reeks, niet alleen de eerste.
   */
  magNogVullen: boolean;
}

export interface VulOpdracht {
  monthId: string;
  monthNumber: number;
  /** Volgorde binnen de maand: eerst toegewezen kaarten komen eerst. */
  backlogIds: string[];
}

export interface VulUitkomst {
  opdrachten: VulOpdracht[];
  /** Hoeveel voorraadkansen nergens meer in pasten en dus in de voorraad blijven. */
  restendeVoorraad: number;
  /** Welke maand naar "ter_goedkeuring" moet. `null` = niets te bevorderen. */
  bevorderMaand: string | null;
}

/**
 * Verdeelt de voorraad over de openstaande maanden, in maandvolgorde.
 *
 * @param openMaanden Alleen maanden met `status !== "goedgekeurd"`, oplopend
 *   op `monthNumber`. Een `"goedgekeurd"` maand wordt hier nooit aan
 *   doorgegeven: die is dicht, en deze functie raakt hem dus nooit aan. Een
 *   maand met `magNogVullen: false` telt wel mee voor "heeft al inhoud" en
 *   voor bevordering naar `"ter_goedkeuring"`, maar krijgt nooit nieuwe kaarten.
 * @param voorraadIds Al gesorteerd (`sortBacklog()`, `lib/plan-backlog.ts`):
 *   de sterkste kans eerst. Deze functie sorteert zelf niets.
 */
export function bepaalVulling(input: {
  openMaanden: OpenMaand[];
  voorraadIds: string[];
  pagesPerMonth: number;
}): VulUitkomst {
  const { openMaanden, pagesPerMonth } = input;
  const voorraad = [...input.voorraadIds];
  const opdrachten: VulOpdracht[] = [];
  const heeftAlTerGoedkeuring = openMaanden.some((m) => m.status === "ter_goedkeuring");
  let bevorderMaand: string | null = null;

  for (const maand of openMaanden) {
    const ruimte = maand.magNogVullen ? pagesPerMonth - maand.huidigAantal : 0;
    const toegewezen = voorraad.splice(0, Math.max(0, ruimte));

    if (toegewezen.length > 0) {
      opdrachten.push({ monthId: maand.id, monthNumber: maand.monthNumber, backlogIds: toegewezen });
    }

    // De eerste maand met inhoud (van tevoren óf net toegewezen) wordt de
    // maand die om een beslissing vraagt, maar alleen als er nog geen enkele
    // openstaande maand die status al draagt.
    const heeftInhoud = maand.huidigAantal + toegewezen.length > 0;
    if (!heeftAlTerGoedkeuring && bevorderMaand === null && heeftInhoud) {
      bevorderMaand = maand.id;
    }
  }

  return {
    opdrachten,
    restendeVoorraad: voorraad.length,
    bevorderMaand,
  };
}
