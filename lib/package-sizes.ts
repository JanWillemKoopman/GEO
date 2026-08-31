/**
 * Het contentpakket: hoeveel pagina's ORBIT ENGINE per maand voor een klant schrijft.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * Conventie 2: de drie toegestane maten en de vraag "is dit een geldige maat"
 * bepalen de uitkomst en horen dus in een pure, importeerbare module zonder
 * `server-only`. De wizard, de bewerkroute en de unittests lezen alle drie
 * dezelfde lijst, zodat er nooit een vierde maat kan ontstaan die maar op één
 * plek bestaat.
 *
 * ── WIE HEM ZET, EN WAAROM NIET DE KLANT ────────────────────────────────────
 *
 * ⚠️ Alleen de beheerder van ORBIT ENGINE. Het pakket is een VERKOOPAFSPRAAK en
 * geen instelling: zou een klant zichzelf op 40 kunnen zetten, dan is de
 * afspraak een suggestie en de facturatie een gok. Dezelfde redenering die
 * `package_pages_per_month` uit `lib/account-editable.ts` houdt.
 *
 * ── WAAROM HIJ AL BIJ HET AANMAKEN GEVRAAGD WORDT ───────────────────────────
 *
 * ⚠️ Gevonden op 31 augustus 2026, in de eerste live doorloop van de hele
 * klantreis. Het planscherm blokkeerde op "Er is nog geen pakket gekozen. Kies
 * eerst 10, 20 of 40 pagina's per maand", terwijl er nergens in de app een
 * scherm was waar dat te kiezen viel. De doorloop kwam alleen verder doordat de
 * waarde met de hand in de database is gezet. Een nieuwe klant liep daarmee
 * gegarandeerd vast op zijn eigen contentplan.
 *
 * Het pakket staat daarom nu naast de naam en de website in de
 * pre-boardingwizard, zodat het altijd al ingevuld is op het moment dat de
 * klant het plan voor het eerst opent, en het blijft daarna aanpasbaar op het
 * beheerscherm van het merk.
 */

/** De drie pakketten die verkocht worden. Er is geen vierde. */
export const PACKAGE_SIZES = [10, 20, 40] as const;

export type PackageSize = (typeof PACKAGE_SIZES)[number];

/** De standaard in de wizard: het instappakket, niet het duurste. */
export const DEFAULT_PACKAGE_SIZE: PackageSize = 10;

/**
 * Is dit een verkocht pakket?
 *
 * Faalt naar `false` bij alles wat geen exacte maat is, ook bij "10" als tekst
 * en bij 15. Onbekend is een betere waarde dan een verkeerde (conventie 3): een
 * pakket van 15 zou stil een quotum opleveren waar geen afspraak achter zit.
 */
export function isPackageSize(value: unknown): value is PackageSize {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (PACKAGE_SIZES as readonly number[]).includes(value)
  );
}

/**
 * Een geldige maat, of `null`.
 *
 * `null` betekent "geen pakket afgesproken" en is een echte waarde: bij een
 * merk dat als demo klaargezet wordt is er nog niets verkocht. Het planscherm
 * zegt dat dan ook met zoveel woorden in plaats van een aantal te verzinnen.
 */
export function toPackageSize(value: unknown): PackageSize | null {
  if (value === null || value === undefined || value === "") return null;
  const getal = typeof value === "string" ? Number(value) : value;
  return isPackageSize(getal) ? getal : null;
}

/** Wat er op het scherm staat, bijvoorbeeld "20 pagina's per maand". */
export function packageLabel(size: number | null | undefined): string {
  if (!size || size <= 0) return "Nog geen pakket gekozen";
  return `${size} pagina's per maand`;
}
