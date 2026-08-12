import "server-only";

/**
 * Mag deze gebruiker bij deze rij? Eén functie, één antwoord, één plek.
 *
 * ── DE FOUT DIE DIT VOORKOMT, EN HIJ IS AL EEN KEER GEMAAKT ─────────────────
 *
 * ⚠️ Op 11 augustus 2026 kregen `getOwnedProfile` en `getOwnedAnalysis` allebei
 * dezelfde drie lagen, maar op twee plekken uitgeschreven. Toen migratie 0046
 * de accountlaag toevoegde, kreeg de eerste hem wél en de tweede niet. Het bleef
 * bijna onzichtbaar doordat lézen over RLS loopt en die de laag wél had: een
 * uitgenodigde klant zag zijn analyses gewoon staan. Maar élke schrijfactie
 * loopt over deze controle, en dus kon precies de persoon voor wie het product
 * bedoeld is niets bevestigen, niets laten schrijven en niets goedkeuren.
 *
 * Dat is P2 uit `docs/tasks/lanceerplan.md`: twee functies die hetzelfde zouden
 * moeten doen, drijven uit elkaar. De reparatie van die dag was de tweede
 * functie bijwerken. Dit bestand is de reparatie van de oorzaak: de drie lagen
 * staan nu één keer, en een vierde laag verandert één plek.
 *
 * ── WAT HIER BEWUST NIET IN ZIT ─────────────────────────────────────────────
 *
 * Het ophalen van de rij. Een merk draagt zijn `account_id` zelf; een analyse
 * niet, die hangt aan een merk en het merk hangt aan een account. Dat verschil
 * is echt en hoort te blijven bestaan, want een merk kan bij een toewijzing van
 * account wisselen en dan verhuizen zijn analyses vanzelf mee. De aanroepers
 * zoeken dus zelf de eigenaar en het account op; alleen het OORDEEL staat hier.
 */
import { isStaff } from "@/lib/staff";
import { isMember } from "@/lib/accounts";

/** Wie hoort er bij deze rij, voor zover de rij dat weet. */
export interface AccessSubject {
  /** De historische eigenaar (`user_id`). Null als de rij die niet heeft. */
  ownerId: string | null;
  /** Het account waar de rij aan hangt. Null als het er niet is. */
  accountId: string | null;
}

/**
 * De drie lagen, in deze volgorde, elk met een eigen vraag en een eigen antwoord.
 *
 *   1. Zit je in het account waar dit aan hangt?  (de hoofdregel sinds 0046)
 *   2. Of ben je de historische eigenaar?          (`user_id`)
 *   3. Of ben je beheerder van Aura?               (`isStaff`)
 *
 * Laag 2 blijft bestaan zolang niet op productie is nageteld dat élk merk een
 * account heeft. Zie de toelichting bovenaan migratie 0046.
 *
 * De volgorde is op kosten gekozen en niet op betekenis: laag 2 is een
 * stringvergelijking zonder query, dus die staat vooraan zodra hij kan slagen.
 * Alle drie de lagen geven hetzelfde antwoord, dus de uitkomst hangt er niet
 * van af.
 */
export async function hasAccess(userId: string, subject: AccessSubject): Promise<boolean> {
  // Gratis: geen query nodig.
  if (subject.ownerId && subject.ownerId === userId) return true;

  // `isMember` geeft zelf `false` bij een leeg account, dus een merk zonder
  // account levert hier nooit toegang op. Onbekend is geen toegang.
  if (await isMember(userId, subject.accountId)) return true;

  return isStaff(userId);
}
