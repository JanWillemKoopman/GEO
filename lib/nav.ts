/**
 * De navigatie van de app, één bron voor alle menu's.
 *
 * ── WAT HIER MIS WAS ────────────────────────────────────────────────────────
 *
 * De zijbalk toonde een klant 7 regels die uitklapten naar 15 bestemmingen. Eén
 * van die regels, "Mijn merk", had er in zijn eentje negen, en het commentaar
 * hierboven noemde die groep zelf al "de vergaarbak die dit oplost alleen
 * verticaal". Daarnaast stonden alle 27 velden van de merkprofiel-wizard óók in
 * het profielgegevens-scherm: twee menu-items, twee schermen en twee
 * opslagroutes voor dezelfde gegevens.
 *
 * ── WAT ERVOOR IN DE PLAATS KOMT ────────────────────────────────────────────
 *
 * Vijf hoofdstukken, elk met hooguit drie kinderen, en elk hoofdstuk
 * beantwoordt één vraag (besluit 1 tot en met 8 van 17 augustus 2026):
 *
 *   OVERZICHT     Hoe sta ik ervoor en wat moet ik nu doen?
 *   STRATEGIE     Wat gaan we doen, en wat is er al gemaakt?
 *   ANALYTICS     Wat zeggen de cijfers, en waarom?
 *   MERKPROFIEL   Wie ben ik volgens ORBIT ENGINE, en klopt dat?
 *   INSTELLINGEN  Hoe is het ingericht?
 *
 * ⚠️ **Strategie staat vóór Analytics, en dat is geen smaak.** Wie inlogt wil
 * weten wat hij moet doen, niet browsen in data. Overzicht draagt het
 * hoofdcijfer al, Analytics is verdieping en Strategie is handelen. De wachtrij
 * op Overzicht wijst naar Strategie, dus die hoort ernaast te staan. Nova
 * ordent zijn vier bestemmingen om dezelfde reden zo.
 *
 * ── DE ZIJBALK GROEIT MEE ───────────────────────────────────────────────────
 *
 * Een hoofdstuk verschijnt pas zodra zijn bestemmingen bestaan. Een kop die
 * naar een leeg scherm wijst is erger dan een kop die er nog niet is, want de
 * eerste kost vertrouwen in de hele balk. `hoofdstukken()` laat een hoofdstuk
 * zonder bestemmingen dus gewoon weg; er is geen aparte "nog niet"-staat.
 *
 * Bewust ZONDER `server-only`: zowel de server-shell als het client-menu leest dit.
 */

/** De vijf klanthoofdstukken plus de afgeschermde groep, in menuvolgorde. */
export const HOOFDSTUKKEN = [
  "Overzicht",
  "Strategie",
  "Analytics",
  "Merkprofiel",
  "Instellingen",
  "Admin",
] as const;

export type Hoofdstuk = (typeof HOOFDSTUKKEN)[number];

/**
 * Eén teken per hoofdstuk, zichtbaar als de zijbalk is ingeklapt. Bewust geen
 * icoonset: die vraagt een bibliotheek, een kleurregel en een tweede manier om
 * betekenis over te brengen, voor zes koppen.
 */
export const HOOFDSTUK_TEKEN: Record<Hoofdstuk, string> = {
  Overzicht: "◉",
  Strategie: "▣",
  Analytics: "▲",
  Merkprofiel: "◆",
  Instellingen: "⚙",
  Admin: "◈",
};

export interface NavItem {
  href: string;
  label: string;
  /** Eén teken, zichtbaar als de zijbalk is ingeklapt. */
  teken: string;
  /**
   * Onder welke kop deze bestemming valt. Sinds 17 augustus 2026 is dít wat de
   * structuur bepaalt: de zijbalk groepeert een platte lijst bestemmingen op
   * dit veld, in de volgorde van `HOOFDSTUKKEN`. Een bestemming verplaatsen
   * naar een ander hoofdstuk is daarmee één woord wijzigen, en niet een blok
   * JSX verhuizen.
   */
  hoofdstuk: Hoofdstuk;
  /**
   * Alleen voor jou, nooit voor de klant (`docs/ux-design.md`, "Wat de klant
   * ziet en wat alleen jij ziet"). De zijbalk zet er een klein teken bij, zodat
   * je nooit per ongeluk tijdens een gedeeld scherm op een interne pagina klikt.
   */
  staffOnly?: boolean;
}

/** Eén kop met zijn bestemmingen. Leeg wordt niet getoond. */
export interface NavHoofdstuk {
  naam: Hoofdstuk;
  teken: string;
  items: NavItem[];
  /** De Admin-groep staat onder een scheidingslijn. */
  afgeschermd?: boolean;
}

/**
 * Wat over dít merk gaat. Leeg zolang er geen merk gekozen is.
 *
 * ⚠️ De adressen zijn merk-gebonden (`/merk/[id]/...`) en niet meer
 * `/profielen/[id]/...`. De oude adressen verwijzen permanent door, zie
 * `lib/redirects.ts`.
 *
 * `staff` verbergt de Admin-bestemmingen. Dat is een beleefdheid en geen slot:
 * elke route eronder geeft een gewone gebruiker nog steeds een 404.
 */
export function brandNav(brandId: string, staff = false): NavItem[] {
  return [
    // ── OVERZICHT ────────────────────────────────────────────────────────
    // Eén bestemming, en die heet niet nog een keer "Overzicht": een kop met
    // één kind dat hetzelfde heet is een regel die niets toevoegt.
    {
      href: `/merk/${brandId}`,
      label: "Hoe sta je ervoor",
      teken: "○",
      hoofdstuk: "Overzicht",
    },

    // ── STRATEGIE ────────────────────────────────────────────────────────
    {
      href: `/merk/${brandId}/strategie/plan`,
      label: "Contentplan",
      teken: "○",
      hoofdstuk: "Strategie",
    },
    {
      href: `/merk/${brandId}/strategie/clusters`,
      label: "Clusters",
      teken: "○",
      hoofdstuk: "Strategie",
    },
    {
      href: `/merk/${brandId}/strategie/bibliotheek`,
      label: "Bibliotheek",
      teken: "○",
      hoofdstuk: "Strategie",
    },

    // ── ANALYTICS ────────────────────────────────────────────────────────
    {
      href: `/merk/${brandId}/analytics`,
      label: "Zichtbaarheid in AI",
      teken: "○",
      hoofdstuk: "Analytics",
    },
    {
      href: `/merk/${brandId}/analytics/zoekverkeer`,
      label: "Zoekverkeer",
      teken: "○",
      hoofdstuk: "Analytics",
    },
    {
      href: `/merk/${brandId}/analytics/concurrenten`,
      label: "Concurrenten",
      teken: "○",
      hoofdstuk: "Analytics",
    },

    // ── MERKPROFIEL ──────────────────────────────────────────────────────
    {
      href: `/merk/${brandId}/merkprofiel`,
      label: "Merkdossier",
      teken: "○",
      hoofdstuk: "Merkprofiel",
    },
    {
      href: `/merk/${brandId}/merkprofiel/bewerken`,
      label: "Bewerken",
      teken: "○",
      hoofdstuk: "Merkprofiel",
    },
    {
      href: `/merk/${brandId}/merkprofiel/input`,
      label: "Vraagt jouw input",
      teken: "○",
      hoofdstuk: "Merkprofiel",
    },

    // ── ADMIN ────────────────────────────────────────────────────────────
    ...(staff
      ? [
          {
            href: `/merk/${brandId}/admin`,
            label: "Onboarding-inzicht",
            teken: "○",
            hoofdstuk: "Admin" as const,
            staffOnly: true,
          },
          {
            href: `/merk/${brandId}/admin/toewijzen`,
            label: "Toewijzen",
            teken: "○",
            hoofdstuk: "Admin" as const,
            staffOnly: true,
          },
        ]
      : []),
  ];
}

/**
 * Wat over de app als geheel gaat.
 *
 * ⚠️ "Alle merken" is hier weg (besluit 2) en zit nu in de merkkiezer bovenin.
 * Een klant met één merk betaalde er anders bij elke sessie een klik voor, en
 * een bestemming die je nooit kiest is ruis in een balk die juist rust moet
 * geven. De beheerder houdt zijn eigen ingang via het CSM-paneel.
 */
export function generalNav(staff = false): NavItem[] {
  return [
    { href: "/instellingen", label: "Account en team", teken: "○", hoofdstuk: "Instellingen" },
    {
      href: "/instellingen/koppelingen",
      label: "Koppelingen",
      teken: "○",
      hoofdstuk: "Instellingen",
    },
    ...(staff
      ? [
          {
            href: "/beheer",
            label: "Alle merken",
            teken: "○",
            hoofdstuk: "Admin" as const,
            staffOnly: true,
          },
        ]
      : []),
  ];
}

/**
 * De platte lijst bestemmingen omgezet in koppen, in de volgorde van
 * `HOOFDSTUKKEN`. Een hoofdstuk zonder bestemmingen valt weg.
 */
export function hoofdstukken(items: NavItem[]): NavHoofdstuk[] {
  return HOOFDSTUKKEN.map((naam) => ({
    naam,
    teken: HOOFDSTUK_TEKEN[naam],
    items: items.filter((i) => i.hoofdstuk === naam),
    afgeschermd: naam === "Admin",
  })).filter((h) => h.items.length > 0);
}

/**
 * Actief = deze route of een route eronder.
 *
 * De querystring telt niet mee: `/analyses?merk=x` en `/analyses` zijn dezelfde
 * pagina, en twee items tegelijk laten oplichten is erger dan één die net niet
 * klopt.
 */
export function isActive(pathname: string, href: string): boolean {
  const pad = href.split("?")[0];
  return pathname === pad || pathname.startsWith(`${pad}/`);
}

/**
 * Precies deze route, zonder de kinderen eronder.
 *
 * Nodig omdat de bestemmingen binnen een hoofdstuk elkaars prefix zijn:
 * `/merk/x/merkprofiel` is het begin van `/merk/x/merkprofiel/bewerken`, en met
 * `isActive()` zou "Merkdossier" oplichten terwijl je in "Bewerken" zit.
 */
export function isExact(pathname: string, href: string): boolean {
  return pathname === href.split("?")[0];
}

/**
 * Account, achter het profielmenu, geen hoofdnavigatie.
 *
 * ⚠️ Hier stond ook `NAV`, de platte lijst van vóór de zijbalk. Die is op
 * 17 augustus 2026 weg: `MainNav` las hem en bestond niet meer, en het
 * profielmenu toonde er een tweede hoofdnavigatie mee naast de zijbalk. Twee
 * menu's met dezelfde bestemmingen lopen gegarandeerd uit elkaar.
 */
export const ACCOUNT_NAV: NavItem[] = [
  { href: "/instellingen", label: "Mijn instellingen", teken: "⚙", hoofdstuk: "Instellingen" },
];
