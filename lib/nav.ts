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
 * Besluit 1 maakt van de app een merk-werkruimte: je kiest
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
  /**
   * Subpagina's van dit item (herstructurering augustus 2026, zie
   * `docs/logbook.md`). Het merkdossier was één pagina van 500+ regels met
   * negen ongelijksoortige blokken: een leesscherm ("wat weten we"), drie
   * werkschermen ("vul aan", "corrigeer", "wijs toe") en gereedschap
   * ("techniek", "profielgegevens") stonden allemaal onder elkaar. Elk blok
   * heeft nu zijn eigen bestemming met één duidelijk doel; deze `children`
   * zijn hoe de zijbalk dat zichtbaar maakt zonder de hoofdlijst plat te
   * slaan tot vijftien gelijkwaardige items.
   *
   * ⚠️ Een item MET `children` is in de zijbalk geen link meer, alleen een
   * klap-knop (14 augustus 2026, tweede ronde). "Mijn merk" en "Clusters"
   * waren allebei zelf ook een bestemming én een kopje boven hun subpagina's
   * tegelijk, en dat is precies verwarrend: een klik op de kop deed twee
   * dingen door elkaar (navigeren én uitklappen). Wat eerst de eigen pagina
   * van de kop was, staat nu als eerste kind in de lijst (`Merkdossier` onder
   * "Mijn merk", `Mijn clusters` onder "Clusters"). Zie `components/sidebar.tsx`.
   */
  children?: NavItem[];
  /**
   * Label boven een blokje kinderen, voor de leesbaarheid bij negen
   * subpagina's onder elkaar. Alleen het EERSTE kind van een nieuwe groep
   * draagt dit veld; de zijbalk toont het als kopje vóór dat kind.
   */
  group?: string;
  /**
   * Alleen voor jou, nooit voor de klant (zie `docs/ux-design.md`, "Wat de
   * klant ziet en wat alleen jij ziet"). De zijbalk zet er een klein teken
   * bij, zodat je nooit per ongeluk tijdens een gedeeld scherm op een
   * interne pagina klikt.
   */
  staffOnly?: boolean;
}

/**
 * Wat over dít merk gaat. Leeg zolang er geen merk gekozen is.
 *
 * `staff` verbergt "Toewijzen": die handeling bestond al alleen voor
 * beheerders (een klant mag zijn eigen merk niet weggeven), en de route zelf
 * geeft een klant nog steeds een 404 als hij hem toch raadt.
 */
export function brandNav(brandId: string, staff = false): NavItem[] {
  return [
    {
      href: `/profielen/${brandId}`,
      label: "Mijn merk",
      teken: "◆",
      children: [
        { href: `/profielen/${brandId}`, label: "Merkdossier", teken: "○" },
        {
          href: `/profielen/${brandId}/merkprofiel`,
          label: "Merkprofiel",
          teken: "○",
          group: "Bewerken",
        },
        { href: `/profielen/${brandId}/producten`, label: "Producten", teken: "○" },
        { href: `/profielen/${brandId}/concurrenten`, label: "Concurrenten", teken: "○" },
        {
          href: `/profielen/${brandId}/aanvullen`,
          label: "Feitenvragen",
          teken: "○",
          group: "Vraagt jouw input",
        },
        { href: `/profielen/${brandId}/toevoegingen`, label: "Openstaande punten", teken: "○" },
        {
          href: `/profielen/${brandId}/search-console`,
          label: "Search console",
          teken: "○",
          group: "Naslag",
        },
        { href: `/profielen/${brandId}/techniek`, label: "Techniek", teken: "○" },
        { href: `/profielen/${brandId}/profielgegevens`, label: "Profielgegevens", teken: "○" },
        ...(staff
          ? [
              {
                href: `/profielen/${brandId}/beheer`,
                label: "Toewijzen",
                teken: "○",
                group: "Beheer",
                staffOnly: true,
              },
            ]
          : []),
      ],
    },
    { href: `/profielen/${brandId}/plan`, label: "Contentplan", teken: "▣" },
    {
      href: `/analyses?merk=${brandId}`,
      label: "Clusters",
      teken: "▲",
      children: [
        { href: `/analyses?merk=${brandId}`, label: "Mijn clusters", teken: "○" },
        {
          href: `/analyses/aanbevolen?merk=${brandId}`,
          label: "Voorgestelde clusters",
          teken: "○",
        },
      ],
    },
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
    { href: "/analyses", label: "Alle clusters", teken: "▦" },
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
  { href: "/analyses", label: "Clusters", teken: "▦" },
  { href: "/profielen", label: "Merken", teken: "▤" },
];
