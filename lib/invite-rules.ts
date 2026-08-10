/**
 * De regels rond een uitnodiging, puur uitgerekend.
 *
 * Bewust ZONDER `server-only` (conventie 2): de activatiepagina vinkt de
 * wachtwoordregels live af terwijl je typt, dus dezelfde functie draait in de
 * browser én op de server. Eén bron, anders keurt de client iets goed dat de
 * server weigert.
 */
import type { AccountRole } from "@/lib/types/database";

/**
 * De vier eindtoestanden van een uitnodigingslink.
 *
 * Nova heeft er precies deze vier, elk met een eigen scherm
 * (`onboarding.activation`: `invalidTitle`, `expiredTitle`, `alreadyTitle`, en
 * het formulier zelf). Dat onderscheid is de moeite waard: "deze link is
 * verlopen, vraag een nieuwe" is een heel ander bericht dan "je account is al
 * actief, log gewoon in", en met één generieke foutmelding belt de klant.
 */
export type InviteState = "geldig" | "verlopen" | "gebruikt" | "ongeldig";

export interface InviteRow {
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

/**
 * De volgorde is de bedoeling: ingetrokken wint van verlopen, en verlopen wint
 * van gebruikt. Een ingetrokken link mag nooit als "al gebruikt" lezen, want dan
 * denkt de ontvanger dat hij een account heeft.
 */
export function inviteState(row: InviteRow | null, now: Date = new Date()): InviteState {
  if (!row) return "ongeldig";
  if (row.revoked_at) return "ongeldig";
  if (new Date(row.expires_at).getTime() <= now.getTime()) return "verlopen";
  if (row.accepted_at) return "gebruikt";
  return "geldig";
}

/**
 * De wachtwoordregels, precies die van Nova (`rule8`, `ruleNumber`,
 * `ruleUppercase`).
 *
 * Drie regels en niet meer. Een eis om een leesteken erbij levert nauwelijks
 * sterkte op en kost merkbaar veel mislukte pogingen; Nova stelt hem ook niet.
 * Lengte is wat telt, en die staat vooraan.
 */
export interface PasswordRule {
  id: "lengte" | "cijfer" | "hoofdletter";
  label: string;
  ok: boolean;
}

export function passwordRules(password: string): PasswordRule[] {
  return [
    { id: "lengte", label: "Minstens 8 tekens", ok: password.length >= 8 },
    { id: "cijfer", label: "Bevat een cijfer", ok: /[0-9]/.test(password) },
    { id: "hoofdletter", label: "Bevat een hoofdletter", ok: /[A-Z]/.test(password) },
  ];
}

export function passwordOk(password: string): boolean {
  return passwordRules(password).every((r) => r.ok);
}

/** Hoe lang een uitnodiging geldig is. Zie de toelichting in migratie 0047. */
export const INVITE_DAGEN = 14;

export function inviteExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITE_DAGEN * 24 * 60 * 60 * 1000);
}

/**
 * Mag deze rol iemand uitnodigen?
 *
 * Alleen een `admin` van het account, of een beheerder van Aura. Een `member`
 * kan wel meekijken en goedkeuren maar niet de kring uitbreiden; dat is bij een
 * bureau (besluit 9) het verschil tussen een collega en de contractpartij.
 */
export function mayInvite(role: AccountRole | null, staff: boolean): boolean {
  if (staff) return true;
  return role === "admin";
}
