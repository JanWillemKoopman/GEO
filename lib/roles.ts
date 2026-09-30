/**
 * De twee rollen in de app, puur uitgerekend (conventie 2, geen `server-only`).
 *
 * ── WAT ER VOOR DE EIGENAAR STOND, EN WAT NU ────────────────────────────────
 *
 * Tot 30 september 2026 kende de app "staf" (`staff_users`), en per klantaccount
 * een rol `admin` of `member`. Later dezelfde dag werden dat drie rollen
 * (superuser, consultant, klant). De eigenaar is zelf superuser, consultant en
 * ontwikkelaar, dus de consultantrol had geen gebruiker en alleen kosten: een
 * derde stand om te testen, uit te leggen en te bewaken.
 *
 * Nu twee rollen, elk met één zin:
 *
 *   • admin: kan alles. Alleen `SUPERUSER_EMAIL`, nergens in te stellen, dus ook
 *            niet per ongeluk weg te halen. Werkt met klanten: maakt merken aan,
 *            zet ze klaar en nodigt klanten uit.
 *   • klant: beheert het eigen account en keurt goed voor het eigen merk. Komt
 *            binnen via een uitnodiging per e-mail. Elke klant heeft dezelfde
 *            rechten; het verschil tussen `admin` en `member` in
 *            `account_users.role` telt in de app niet meer (migratie 0137).
 *
 * ⚠️ De admin is een vast e-mailadres in code en geen rij in de database.
 * Een rij die iemand kan wijzigen is een rol die iemand kan afpakken; een
 * adres in code kan alleen via een codewijziging op `main` veranderen.
 * `staff.ts` eist daarom óók een bevestigd adres, anders zou iemand die zich
 * registreert met dit adres zonder het te bevestigen de admin zijn.
 */
export const SUPERUSER_EMAIL = "koopman.janwillem@gmail.com";

export type Rol = "admin" | "klant";

export function isSuperuserEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === SUPERUSER_EMAIL;
}

/**
 * De rol van een gebruiker.
 *
 * `emailBevestigd` hoort erbij: een onbevestigd adres bewijst niets.
 */
export function rolVan(input: {
  email: string | null | undefined;
  emailBevestigd: boolean;
}): Rol {
  return input.emailBevestigd && isSuperuserEmail(input.email) ? "admin" : "klant";
}

export const ROL_LABEL: Record<Rol, string> = {
  admin: "Beheerder",
  klant: "Klant",
};

/** Eén zin per rol, voor het scherm waar je iemand toegang geeft. */
export const ROL_UITLEG: Record<Rol, string> = {
  admin: "Ziet en beheert de hele app.",
  klant: "Beheert het eigen account, nodigt collega's uit en keurt goed voor het eigen merk.",
};
