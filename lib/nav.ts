/**
 * De navigatie van de app — één bron voor alle menu's.
 *
 * ── WAT HIER MIS WAS ────────────────────────────────────────────────────────
 *
 * De bovenbalk had vier links, waarvan er twee naar dezelfde route wezen:
 * "Klantprofielen" en "Mijn bedrijfsgegevens" gingen allebei naar /profielen.
 * Het mobiele menu herhaalde dat, keurig verdeeld over twee koppen ("Navigatie"
 * en "Account"), wat de suggestie versterkte dat het om twee verschillende
 * dingen ging.
 *
 * Navigatie is een belofte over de omvang van een product. Vier items
 * suggereren vier plekken; blijken er twee hetzelfde, dan verliest de gebruiker
 * vertrouwen in de rest van de balk.
 *
 * Twee bestemmingen dus, en het woord "merk" in plaats van "klantprofiel".
 * Dat laatste is bureau-jargon: voor de ondernemer die zijn eigen zichtbaarheid
 * meet is het gewoon zijn merk. Met dat ene woord was de tweede link ook niet
 * meer nodig — die bestond juist omdat "klantprofiel" niet uitlegde wat het is.
 *
 * De routes heten nog /profielen: bestaande links en bladwijzers blijven zo
 * werken. Wat de klant leest, is wat telt.
 *
 * Bewust ZONDER `server-only`: zowel de server-shell als het client-menu leest
 * dit.
 */
export interface NavItem {
  href: string;
  label: string;
}

/** De twee plekken waar het werk gebeurt. */
export const NAV: NavItem[] = [
  { href: "/analyses", label: "Analyses" },
  { href: "/profielen", label: "Merken" },
];

/** Account — achter het profielmenu, geen hoofdnavigatie. */
export const ACCOUNT_NAV: NavItem[] = [{ href: "/instellingen", label: "Mijn instellingen" }];

/** Actief = deze route of een route eronder. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
