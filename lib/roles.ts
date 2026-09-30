/**
 * De drie rollen in de app, puur uitgerekend (conventie 2, geen `server-only`).
 *
 * ── WAT ER VOOR DE EIGENAAR STOND, EN WAT NU ────────────────────────────────
 *
 * Tot 30 september 2026 kende de app twee dingen door elkaar: "staf"
 * (`staff_users`, iedereen daarin kon alles) en per klantaccount een rol
 * `admin` of `member` ("Beheerder" en "Lid"). Voor een consultant bleek dat
 * onleesbaar: het verschil tussen Lid en Beheerder is alleen of iemand
 * collega's mag uitnodigen, en dat is een consultantklus.
 *
 * Nu drie rollen, elk met één zin:
 *
 *   • superuser:  ziet en kan alles. Alleen `SUPERUSER_EMAIL`, nergens in te
 *                 stellen, dus ook niet per ongeluk weg te halen.
 *   • consultant: werkt met klanten: maakt merken aan, zet ze klaar en nodigt
 *                 klanten uit. Staat in `staff_users`.
 *   • klant:      leest en keurt goed voor het eigen merk. Komt binnen via een
 *                 uitnodiging per e-mail.
 *
 * ⚠️ De superuser is een vast e-mailadres in code en geen rij in de database.
 * Een rij die iemand kan wijzigen is een rol die iemand kan afpakken; een
 * adres in code kan alleen via een codewijziging op `main` veranderen.
 * `staff.ts` eist daarom óók een bevestigd adres, anders zou iemand die zich
 * registreert met dit adres zonder het te bevestigen de superuser zijn.
 */
export const SUPERUSER_EMAIL = "koopman.janwillem@gmail.com";

export type Rol = "superuser" | "consultant" | "klant";

export function isSuperuserEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === SUPERUSER_EMAIL;
}

/**
 * De rol van een gebruiker.
 *
 * `emailBevestigd` hoort erbij: een onbevestigd adres bewijst niets.
 * `inStaffTabel` is het recht uit `staff_users` (consultant).
 */
export function rolVan(input: {
  email: string | null | undefined;
  emailBevestigd: boolean;
  inStaffTabel: boolean;
}): Rol {
  if (input.emailBevestigd && isSuperuserEmail(input.email)) return "superuser";
  return input.inStaffTabel ? "consultant" : "klant";
}

export const ROL_LABEL: Record<Rol, string> = {
  superuser: "Superuser",
  consultant: "Consultant",
  klant: "Klant",
};

/** Eén zin per rol, voor het scherm waar je iemand toegang geeft. */
export const ROL_UITLEG: Record<Rol, string> = {
  superuser: "Ziet en beheert de hele app.",
  consultant: "Maakt merken aan, zet ze klaar en nodigt klanten uit.",
  klant: "Kijkt mee en keurt goed voor het eigen merk. Kan niets aanmaken of uitnodigen.",
};

/**
 * Wat een `account_users.role` voor de gebruiker heet. Beide waarden zijn een
 * klant: het verschil (`admin` mag collega's uitnodigen) is voor de klant geen
 * rol maar een detail, en de consultant beslist over uitnodigen. Vandaar één
 * woord in de UI.
 */
export function klantLabel(): string {
  return ROL_LABEL.klant;
}
