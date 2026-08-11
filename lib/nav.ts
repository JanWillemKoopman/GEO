/**
 * De navigatie van de app, één bron voor alle menu's.
 *
 * ── WAT HIER MIS WAS ────────────────────────────────────────────────────────
 *
 * De bovenbalk had vier links, waarvan er twee naar dezelfde route wezen:
 * "Klantprofielen" en "Mijn bedrijfsgegevens" gingen allebei naar /profielen.
 * Navigatie is een belofte over de omvang van een product; blijken twee items
 * hetzelfde, dan verliest de gebruiker vertrouwen in de rest van de balk. Dat
 * werd teruggebracht tot twee bestemmingen, met het woord "merk" in plaats van
 * het bureau-jargon "klantprofiel".
 *
 * ── WAT ER NU BIJ KOMT ──────────────────────────────────────────────────────
 *
 * Besluit 1 (`docs/Nova.md` §0) maakt van de app een merk-werkruimte: je kiest
 * bovenin een merk en daarna gaat alles over dát merk. Daarmee vallen de
 * bestemmingen in twee soorten uiteen:
 *
 *   • wat over ÉÉN merk gaat        (`brandNav`)
 *   • wat over de app als geheel gaat (`generalNav`)
 *
 * Dat onderscheid is horizontaal niet te maken zonder scheidingstekens die
 * niets betekenen, en verticaal is het één tussenkopje. Vandaar de zijbalk.
 *
 * ⚠️ De routes zelf zijn NIET verhuisd. `/profielen/[id]` blijft `/profielen/[id]`
 * en `/analyses` blijft `/analyses`. Er staan bladwijzers en gedeelde demolinks
 * naar die adressen, en een merk-werkruimte is een kwestie van context, niet van
 * andere URL's. Zodra Overzicht, Strategie en Analytics bestaan (fase 4 en 5)
 * krijgen die wél een merk-gebonden pad.
 *
 * Bewust ZONDER `server-only`: zowel de server-shell als het client-menu leest dit.
 */
export interface NavItem {
  href: string;
  label: string;
  /**
   * Eén teken, zichtbaar als de zijbalk is ingeklapt. Bewust geen icoonset:
   * die vraagt een bibliotheek, een kleurregel en een tweede manier om
   * betekenis over te brengen, voor negen items.
   */
  teken: string;
}

/** Wat over dít merk gaat. Leeg zolang er geen merk gekozen is. */
export function brandNav(brandId: string): NavItem[] {
  return [
    { href: `/profielen/${brandId}`, label: "Merkdossier", teken: "◆" },
    { href: `/profielen/${brandId}/plan`, label: "Contentplan", teken: "▣" },
    { href: `/analyses?merk=${brandId}`, label: "Analyses", teken: "▲" },
  ];
}

/**
 * Wat over de app als geheel gaat.
 *
 * `staff` voegt het CSM-paneel toe (fase 8). Het staat bewust in dezelfde lijst
 * en niet in een derde groep: het is voor de eigenaar gewoon een bestemming, en
 * een aparte kop "Beheer" boven één item is een kop te veel. Een gewone klant
 * ziet het item niet, en de pagina zelf geeft hem een 404 (`app/(app)/beheer`).
 */
export function generalNav(staff = false): NavItem[] {
  return [
    { href: "/profielen", label: "Alle merken", teken: "▤" },
    { href: "/analyses", label: "Alle analyses", teken: "▦" },
    ...(staff ? [{ href: "/beheer", label: "Beheer", teken: "◈" }] : []),
    { href: "/instellingen", label: "Instellingen", teken: "⚙" },
  ];
}

/**
 * Actief = deze route of een route eronder.
 *
 * De querystring telt niet mee: `/analyses?merk=x` en `/analyses` zijn dezelfde
 * pagina, en twee items tegelijk laten oplichten is erger dan één die net niet
 * klopt. Daarom wint het merk-item alleen als er ook echt een merk in het pad
 * staat.
 */
export function isActive(pathname: string, href: string): boolean {
  const pad = href.split("?")[0];
  return pathname === pad || pathname.startsWith(`${pad}/`);
}

/** Account, achter het profielmenu, geen hoofdnavigatie. */
export const ACCOUNT_NAV: NavItem[] = [
  { href: "/instellingen", label: "Mijn instellingen", teken: "⚙" },
];

/**
 * De oude platte lijst. Blijft bestaan zolang `MainNav` en `ProfileMenu` hem
 * lezen; die twee verdwijnen zodra de zijbalk overal doorgevoerd is.
 */
export const NAV: NavItem[] = [
  { href: "/analyses", label: "Analyses", teken: "▦" },
  { href: "/profielen", label: "Merken", teken: "▤" },
];
