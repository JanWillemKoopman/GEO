/**
 * De regels rond e-mailadres en wachtwoord wijzigen (fase 7).
 *
 * ── WAAROM DIT PUUR IS ──────────────────────────────────────────────────────
 *
 * Conventie 2. Dit bepaalt wanneer iemand zijn inlog kwijtraakt, en dat hoort
 * onder test. De databasekant staat in de route.
 *
 * ── WAT NOVA HIER DOET, EN WAT ORBIT ENGINE OVERNEEMT ───────────────────────────────
 *
 * Nova: e-mail wijzigen met een bevestigingsmail, wachtwoord
 * wijzigen met een controle op het huidige. Beide overgenomen, want ze lossen
 * allebei een echt probleem op:
 *
 *   • Zonder bevestigingsmail kan een tikfout in het adres iemand permanent
 *     buitensluiten: het oude adres werkt niet meer en het nieuwe bestaat niet.
 *   • Zonder controle op het huidige wachtwoord is een openstaande laptop genoeg
 *     om een account over te nemen.
 */
import { passwordRules } from "@/lib/invite-rules";

export type EmailProblem = "leeg" | "geen_adres" | "zelfde";

/**
 * Mag dit adres het nieuwe worden?
 *
 * Bewust een ruime controle en geen strenge reguliere expressie, net als bij de
 * uitnodiging: e-mailadressen zijn in de praktijk raarder dan elke expressie
 * aankan, en de echte toets is of de bevestigingsmail aankomt.
 */
export function checkNewEmail(
  nieuw: string,
  huidig: string,
): { ok: true; email: string } | { ok: false; reason: EmailProblem; message: string } {
  const schoon = nieuw.trim().toLowerCase();
  if (schoon.length === 0) {
    return { ok: false, reason: "leeg", message: "Vul je nieuwe e-mailadres in." };
  }
  if (!schoon.includes("@") || schoon.length < 5) {
    return { ok: false, reason: "geen_adres", message: "Dit lijkt geen geldig e-mailadres." };
  }
  if (schoon === huidig.trim().toLowerCase()) {
    return {
      ok: false,
      reason: "zelfde",
      message: "Dat is het adres dat je nu al gebruikt.",
    };
  }
  return { ok: true, email: schoon };
}

export type PasswordProblem = "leeg" | "zwak" | "zelfde";

/**
 * Mag dit het nieuwe wachtwoord worden?
 *
 * Dezelfde drie regels als bij de uitnodiging (`passwordRules`), want twee
 * verschillende sterktes voor hetzelfde wachtwoord is een verschil dat niemand
 * kan uitleggen.
 *
 * ⚠️ Het huidige wachtwoord wordt hier NIET gecontroleerd. Dat kan alleen
 * Supabase, door ermee in te loggen, en dat gebeurt in de route. Deze functie
 * gaat over de vorm van het nieuwe.
 */
export function checkNewPassword(
  nieuw: string,
  huidig: string,
): { ok: true } | { ok: false; reason: PasswordProblem; message: string } {
  if (nieuw.length === 0) {
    return { ok: false, reason: "leeg", message: "Vul je nieuwe wachtwoord in." };
  }
  const regels = passwordRules(nieuw);
  const gemist = regels.filter((r) => !r.ok);
  if (gemist.length > 0) {
    return {
      ok: false,
      reason: "zwak",
      // De ontbrekende regels noemen, niet alle drie: wie er twee goed heeft
      // hoeft niet te lezen wat hij al deed.
      message: `Je wachtwoord mist nog: ${gemist.map((r) => r.label.toLowerCase()).join(", ")}.`,
    };
  }
  if (nieuw === huidig) {
    return {
      ok: false,
      reason: "zelfde",
      message: "Dit is je huidige wachtwoord. Kies een ander.",
    };
  }
  return { ok: true };
}
