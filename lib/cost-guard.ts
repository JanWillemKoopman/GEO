import "server-only";

/**
 * Wie mag een handeling starten die geld kost?
 *
 * ── HET BESLUIT, HERZIEN OP 27 AUGUSTUS 2026 ────────────────────────────────
 *
 * Het antwoord hangt sinds vandaag van de handeling af, en niet meer van de
 * persoon alleen. Twee handelingen blijven van de beheerder, de rest is van de
 * klant. Welke twee en waarom staat bij `STAFF_ONLY_ACTIONS` in
 * `lib/cost-rules.ts`, want dat is data en hoort in een pure module.
 *
 * Kort: een nieuw merk onderzoeken en een reputatieanalyse zijn een verkoop.
 * Een cluster starten, de meting bevestigen, content laten schrijven en een
 * maand vrijgeven zijn het werk waarvoor de klant al betaalt.
 *
 * Tot vandaag stond alles op slot (besluit 18, 11 augustus 2026). Dat hield de
 * rekening klein maar liep de klant vast: hij zag vier volle knoppen die pas ná
 * de klik weigerden, en één ervan stond als taak in zijn eigen werklijst.
 *
 * ── WAAROM ÉÉN FUNCTIE EN GEEN CONTROLE PER ROUTE ───────────────────────────
 *
 * ⚠️ Conventie P2 (`docs/logbook.md`): twee functies die
 * hetzelfde zouden moeten doen, drijven uit elkaar. Precies dat gebeurde met
 * `getOwnedProfile` en `getOwnedAnalysis`, en het kostte een fout die de eerste
 * klant zou hebben geraakt. Elke dure route stelt daarom dezelfde vraag aan
 * dezelfde functie. Verandert het besluit ooit, dan verandert het hier en
 * nergens anders.
 *
 * ⚠️ De handeling is een verplicht argument en heeft geen standaardwaarde. Dat
 * is opzet: wie een nieuwe dure route toevoegt, moet van de compiler een keuze
 * maken over wie hem mag starten, in plaats van er stilzwijgend de losse kant
 * van te krijgen.
 *
 * ── WAT HIER BEWUST NIET IN ZIT ─────────────────────────────────────────────
 *
 * Het budgetplafond zelf. Dat is een tweede, onafhankelijke rem
 * (`lib/spend-limit.ts`): deze functie zegt WIE er mag uitgeven, die andere
 * zegt HOEVEEL er nog over is. Ze horen allebei te gelden, want een beheerder
 * die zich vergist in een lus kan net zo goed een rekening opblazen. Nu de
 * klant zelf werk start, is dat plafond de rem die er echt toe doet.
 *
 * En de ownership-controle. Elke route kijkt zelf, vóór of ná deze vraag, of
 * dit merk of dit cluster wel van deze gebruiker is (`getOwnedProfile`,
 * `getOwnedAnalysis`). Deze functie zegt niets over eigendom.
 */
import { isStaff } from "@/lib/staff";
import { actionNeedsStaff, type CostlyAction } from "@/lib/cost-rules";

export { COST_DENIED, type CostlyAction } from "@/lib/cost-rules";

/**
 * Mag deze gebruiker deze betaalde handeling starten?
 *
 * Faalt zacht naar `false` bij de twee handelingen die op slot staan: een
 * storing in de controle mag nooit iemand onbedoeld een verkoop laten starten.
 * Dezelfde kant op als `isStaff` zelf.
 */
export async function mayTriggerCost(
  userId: string,
  action: CostlyAction,
): Promise<boolean> {
  if (!actionNeedsStaff(action)) return true;
  return isStaff(userId);
}
