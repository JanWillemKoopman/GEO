import "server-only";

/**
 * Wie mag een handeling starten die geld kost?
 *
 * ── HET BESLUIT, HERZIEN OP 2 SEPTEMBER 2026 (herstelplan na audit, T4) ─────
 *
 * Alle zeven handelingen in `CostlyAction` zijn van de beheerder. Tussen 27 en
 * 30 augustus 2026 stonden vijf ervan open voor de klant zelf ("hij doet zijn
 * eigen groeiwerk"), maar dat botste met de sales-led strategie
 * (`docs/logbook.md` §15): op productie kon een ingelogde klant zelf een merk
 * aanmaken en een cluster starten, geld uitgeven zonder dat iemand het merkte.
 * De eigenaar heeft dat op 2 september 2026 teruggedraaid. Welke handelingen
 * dat zijn en waarom staat bij `STAFF_ONLY_ACTIONS` in `lib/cost-rules.ts`,
 * want dat is data en hoort in een pure module.
 *
 * Vóór 27 augustus 2026 stond alles al eens op slot (besluit 18, 11 augustus
 * 2026), en dat liep de klant vast: hij zag vier volle knoppen die pas ná de
 * klik weigerden, en één ervan stond als taak in zijn eigen werklijst. Die fout
 * komt nu niet terug: de knoppen blijven zichtbaar en klikbaar, de melding
 * nodigt uit ("je customer success manager regelt dit") in plaats van af te
 * wijzen.
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
 * Faalt zacht naar `false`: een storing in de controle mag nooit iemand
 * onbedoeld betaald werk laten starten. Dezelfde kant op als `isStaff` zelf.
 */
export async function mayTriggerCost(
  userId: string,
  action: CostlyAction,
): Promise<boolean> {
  if (!actionNeedsStaff(action)) return true;
  return isStaff(userId);
}
