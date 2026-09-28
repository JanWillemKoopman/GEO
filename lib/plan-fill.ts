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
 * ── WAAROM ER OOK EEN TWEEDE RONDE IS, VOOR WISSELGELD ──────────────────────
 *
 * Blok A, punt 3: elke maand krijgt na zijn echte inhoud ook `BUFFER_PER_MONTH`
 * extra kans(en) als buffer, zodat een latere verwijdering of terugsleep die
 * maand niet laat krimpen (punt 2, `vulMetBuffer()` in `lib/plans.ts`). Dit
 * staat expliciet in een tweede ronde, ná alle echte inhoud van alle maanden:
 * een verre maand die nog een lege plek heeft, gaat voor op wisselgeld in een
 * eerdere maand die zijn quota al haalt.
 *
 * Puur en zonder `server-only` (conventie 2): geen database, dus testbaar
 * vanuit `scripts/test-unit.ts`. De database-kant (welke rijen dat precies
 * zijn, hoe ze worden bijgewerkt) staat in `vulOpenMaanden()`, `lib/plans.ts`.
 */
import type { PlanMonthStatus } from "@/lib/types/database";
import { BUFFER_PER_MONTH } from "@/lib/plan-constants";

/**
 * Hoeveel maanden er minstens tussen twee verbeteringen van dezelfde pagina
 * zitten. Besluit van de eigenaar op 24 september 2026, na punt 31 van de
 * kwaliteitsdoorlichting: bij de installateur stonden vier verbeteringen van
 * `/warmtepomp` in dezelfde week, vier herschrijvingen die elkaar overschrijven.
 * Eén per drie maanden laat de vorige ook tijd om effect te meten.
 */
export const VERBETER_TUSSENRUIMTE_MAANDEN = 3;

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
  /** Buffers die er al in staan (blok A, punt 3): tellen niet mee voor de quota. */
  huidigBuffers: number;
}

export interface VulOpdracht {
  monthId: string;
  monthNumber: number;
  /** Volgorde binnen de maand: eerst toegewezen kaarten komen eerst. */
  backlogIds: string[];
  /** Wisselgeld voor deze maand (punt 3): geen datum, geen plek in de telling. */
  bufferIds: string[];
}

export interface VulUitkomst {
  opdrachten: VulOpdracht[];
  /** Hoeveel voorraadkansen nergens meer in pasten en dus in de voorraad blijven. */
  restendeVoorraad: number;
  /**
   * Welke kansen dat precies zijn (blok A, punt 4): ze pasten na twaalf
   * maanden vol content plus buffer nog steeds niet. `lib/plans.ts` gebruikt
   * dit om ze in de voorraad te merken als "buiten bereik", niet als
   * "wachtrij". Zelfde volgorde als `voorraadIds`.
   */
  restendeVoorraadIds: string[];
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
  /**
   * Het adres van elke voorraadkans die een bestaande pagina VERBETERT
   * (genormaliseerd). Een nieuwe pagina staat er niet in. Zonder deze kaart
   * gedraagt de vulling zich zoals vóór punt 31.
   */
  adresVan?: ReadonlyMap<string, string>;
  /** Per adres de maandnummers waar al een verbetering van die pagina staat. */
  bezet?: ReadonlyMap<string, readonly number[]>;
}): VulUitkomst {
  const { openMaanden, pagesPerMonth } = input;
  const voorraad = [...input.voorraadIds];
  const bezet = new Map<string, number[]>(
    [...(input.bezet ?? new Map<string, readonly number[]>()).entries()].map(([k, v]) => [k, [...v]]),
  );
  const botst = (id: string, maand: number): boolean => {
    const adres = input.adresVan?.get(id);
    if (!adres) return false;
    return (bezet.get(adres) ?? []).some((m) => Math.abs(m - maand) < VERBETER_TUSSENRUIMTE_MAANDEN);
  };
  const registreer = (id: string, maand: number): void => {
    const adres = input.adresVan?.get(id);
    if (!adres) return;
    bezet.set(adres, [...(bezet.get(adres) ?? []), maand]);
  };
  /** Neemt tot `aantal` kansen uit de voorraad die in deze maand passen, in volgorde. */
  const neem = (aantal: number, maand: number): string[] => {
    const uit: string[] = [];
    for (let i = 0; i < voorraad.length && uit.length < aantal; ) {
      const id = voorraad[i];
      if (botst(id, maand)) {
        i++;
        continue;
      }
      voorraad.splice(i, 1);
      registreer(id, maand);
      uit.push(id);
    }
    return uit;
  };
  const opdrachten = new Map<string, VulOpdracht>();
  const heeftAlTerGoedkeuring = openMaanden.some((m) => m.status === "ter_goedkeuring");
  let bevorderMaand: string | null = null;

  const opdracht = (maand: OpenMaand): VulOpdracht => {
    let o = opdrachten.get(maand.id);
    if (!o) {
      o = { monthId: maand.id, monthNumber: maand.monthNumber, backlogIds: [], bufferIds: [] };
      opdrachten.set(maand.id, o);
    }
    return o;
  };

  // Eerste ronde: echte inhoud, tot aan de pakketquota. Dit gaat voor alles
  // anders, ook voor een verre maand: liever de sterkste kans in maand acht
  // dan wisselgeld in maand een.
  for (const maand of openMaanden) {
    const ruimte = maand.magNogVullen ? pagesPerMonth - maand.huidigAantal : 0;
    // Punt 31: een tweede verbetering van dezelfde pagina binnen drie maanden
    // wordt overgeslagen en schuift door naar een latere maand.
    const toegewezen = neem(Math.max(0, ruimte), maand.monthNumber);

    if (toegewezen.length > 0) {
      opdracht(maand).backlogIds.push(...toegewezen);
    }

    // De eerste maand met inhoud (van tevoren óf net toegewezen) wordt de
    // maand die om een beslissing vraagt, maar alleen als er nog geen enkele
    // openstaande maand die status al draagt.
    const heeftInhoud = maand.huidigAantal + toegewezen.length > 0;
    if (!heeftAlTerGoedkeuring && bevorderMaand === null && heeftInhoud) {
      bevorderMaand = maand.id;
    }
  }

  // Tweede ronde: wisselgeld (punt 3), met wat overblijft. Ook in maandvolgorde,
  // zodat de eerstkomende maanden als eerste hun buffer krijgen.
  for (const maand of openMaanden) {
    if (voorraad.length === 0) break;
    // Dezelfde bescherming als de content-ronde hierboven zou hebben als de
    // aanroeper toch per ongeluk een gesloten maand doorgeeft: een
    // "goedgekeurd"-maand is dicht, ook voor wisselgeld.
    if (maand.status === "goedgekeurd" || !maand.magNogVullen) continue;
    const nogTeVullen = BUFFER_PER_MONTH - maand.huidigBuffers;
    if (nogTeVullen <= 0) continue;
    const buffers = neem(nogTeVullen, maand.monthNumber);
    if (buffers.length > 0) {
      opdracht(maand).bufferIds.push(...buffers);
    }
  }

  return {
    opdrachten: [...opdrachten.values()],
    restendeVoorraad: voorraad.length,
    restendeVoorraadIds: voorraad,
    bevorderMaand,
  };
}
