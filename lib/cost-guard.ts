import "server-only";

/**
 * Wie mag een handeling starten die geld kost?
 *
 * ── HET BESLUIT ─────────────────────────────────────────────────────────────
 *
 * **Alleen de beheerder van ORBIT ENGINE** (besluit 18, 11 augustus 2026). Op 11 augustus
 * was eerst besloten dat een account-admin zelf een meting mocht starten en een
 * member een maand mocht goedkeuren; datzelfde besluit is dezelfde dag
 * teruggedraaid toen de rekensom eronder zichtbaar werd. Een klant met acht
 * onderwerpen kon op één middag $6,56 uitgeven zonder dat iemand het merkte, en
 * er was geen enkele rem.
 *
 * Dat past ook beter bij hoe dit product verkocht wordt (sales-led): de
 * consultant zet klaar, de klant kijkt na en keurt goed. Goedkeuren is gratis;
 * het in gang zetten van betaald werk is een handeling van de eigenaar.
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
 * ── WAT HIER BEWUST NIET IN ZIT ─────────────────────────────────────────────
 *
 * Het budgetplafond zelf. Dat is een tweede, onafhankelijke rem
 * (`lib/spend-limit.ts`): deze functie zegt WIE er mag uitgeven, die andere
 * zegt HOEVEEL er nog over is. Ze horen allebei te gelden, want een beheerder
 * die zich vergist in een lus kan net zo goed een rekening opblazen.
 */
import { isStaff } from "@/lib/staff";

export { COST_DENIED, type CostlyAction } from "@/lib/cost-rules";

/**
 * Mag deze gebruiker betaald werk starten?
 *
 * Faalt zacht naar `false`: een storing in de controle mag nooit iemand
 * onbedoeld geld laten uitgeven. Dezelfde kant op als `isStaff` zelf.
 */
export async function mayTriggerCost(userId: string): Promise<boolean> {
  return isStaff(userId);
}
