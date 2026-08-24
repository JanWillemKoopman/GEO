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

import type { IcoonNaam } from "@/lib/icons";

/** De vijf klanthoofdstukken plus de twee afgeschermde groepen, in menuvolgorde. */
export const HOOFDSTUKKEN = [
  "Overzicht",
  "Strategie",
  "Analytics",
  "Merkprofiel",
  "Instellingen",
  "Sales",
  "Admin",
] as const;

export type Hoofdstuk = (typeof HOOFDSTUKKEN)[number];

/**
 * Hoeveel bestemmingen mag een hoofdstuk hebben?
 *
 * ⚠️ **Deze tabel bestaat omdat "hooguit vier" bezig was een algemene grens te
 * worden** (besluit 24 augustus 2026). De regel van 17 augustus was drie, met
 * daarna twee uitzonderingen op vier die allebei met argumenten zijn vastgelegd
 * (Admin op 19 augustus, Analytics op 22 augustus). Elke volgende uitzondering
 * zou de regel verder oprekken zonder dat iemand het merkt, en dan is de
 * herindeling binnen een half jaar terug bij af.
 *
 * Door de grens in data te zetten in plaats van in een `if` verandert dat: een
 * uitzondering staat hier met een naam erbij, is te tellen, en `scripts/test-unit.ts`
 * leest dezelfde tabel. Wie een zesde bestemming wil, verandert een regel die
 * iedereen ziet in plaats van een getal in een test.
 *
 * **Sales staat op vijf, en dat is de derde uitzondering.** De onderbouwing is
 * van een andere soort dan bij Admin en Analytics: dit is geen klanthoofdstuk.
 * Het bezwaar van 17 augustus was dat een klant zeven regels zag die naar
 * vijftien bestemmingen uitklapten, en dat bezwaar bestaat niet bij een sectie
 * die de klant nooit ziet. De vijf zijn bovendien vijf verschillende soorten
 * werk (plan §4.1) en geen vergaarbak: wat moet ik vandaag doen, welke kansen
 * zijn er, welke bedrijven kennen we, welke markten lopen er, en wat is er
 * verstuurd. Samenvoegen zou er twee in één scherm proppen die niets met elkaar
 * te maken hebben.
 *
 * De klanthoofdstukken blijven op drie. Dát is de regel die overeind moet
 * blijven, en die is met deze tabel scherper dan eerst.
 */
export const GRENS_PER_HOOFDSTUK: Record<Hoofdstuk, number> = {
  Overzicht: 3,
  Strategie: 3,
  Analytics: 4,
  Merkprofiel: 3,
  Instellingen: 3,
  Sales: 5,
  Admin: 4,
};

/**
 * Eén icoon per hoofdstuk, en **alleen** per hoofdstuk. Ingeklapt is dit het
 * enige wat er van de kop overblijft, dus het moet in zijn eentje herkenbaar
 * zijn.
 *
 * ⚠️ **Hier stonden tot 21 augustus 2026 de tekens ◉ ▣ ▲ ◆ ⚙ ◈**, met erboven
 * de reden waarom er géén icoonset was: "die vraagt een bibliotheek, een
 * kleurregel en een tweede manier om betekenis over te brengen, voor zes
 * koppen". Twee van die drie bezwaren zijn opgelost in `lib/icons.ts`: er is één
 * tabel die betekenis aan tekening koppelt, en de iconen kleuren niet zelf maar
 * erven de kleur van de tekst. Het derde bezwaar, de bibliotheek, bleek het
 * kleinste probleem: die vier tekens komen op Windows, macOS en Android uit
 * drie verschillende fallback-fonts en hadden dus sowieso al geen vaste vorm.
 *
 * ⚠️ **De bestemmingen eronder krijgen er géén** (besluit 21 augustus 2026,
 * later dezelfde dag). Ze hebben ze kort wél gehad. Het resultaat was zestien
 * tekeningen in een balk van zestien regels, en dan markeert een icoon niets
 * meer: als alles opvalt, valt niets op. De kop draagt het icoon omdat hij één
 * van de zeven vaste plekken in de app aanwijst; de bestemming eronder staat al
 * ingesprongen achter een lijn en heeft niets extra's nodig om als kind te
 * lezen. Vandaar dat `NavItem` geen icoonveld heeft: dan kán het ook niet
 * ongemerkt terugkomen.
 */
export const HOOFDSTUK_ICOON: Record<Hoofdstuk, IcoonNaam> = {
  Overzicht: "overzicht",
  Strategie: "strategie",
  Analytics: "analytics",
  Merkprofiel: "merkprofiel",
  Instellingen: "instellingen",
  Sales: "sales",
  Admin: "admin",
};

export interface NavItem {
  href: string;
  label: string;
  /**
   * Onder welke kop deze bestemming valt. Sinds 17 augustus 2026 is dít wat de
   * structuur bepaalt: de zijbalk groepeert een platte lijst bestemmingen op
   * dit veld, in de volgorde van `HOOFDSTUKKEN`. Een bestemming verplaatsen
   * naar een ander hoofdstuk is daarmee één woord wijzigen, en niet een blok
   * JSX verhuizen.
   */
  hoofdstuk: Hoofdstuk;
  /**
   * Alleen voor Outer Orbit, nooit voor de klant (`docs/ux-design.md`, "Wat de
   * klant ziet en wat alleen jij ziet"). De zijbalk zet er een klein teken bij,
   * zodat je nooit per ongeluk tijdens een gedeeld scherm op een interne pagina
   * klikt. Geldt voor Admin én voor Sales: een klant mag nooit kunnen zien dat
   * hij ooit als prospect in het systeem heeft gestaan (plan §4.3).
   */
  staffOnly?: boolean;
}

/** Eén kop met zijn bestemmingen. Leeg wordt niet getoond. */
export interface NavHoofdstuk {
  naam: Hoofdstuk;
  icoon: IcoonNaam;
  items: NavItem[];
  /** Sales en Admin staan onder een scheidingslijn: de klant ziet ze nooit. */
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
      hoofdstuk: "Overzicht",
    },

    // ── STRATEGIE ────────────────────────────────────────────────────────
    {
      href: `/merk/${brandId}/strategie/plan`,
      label: "Contentplan",
      hoofdstuk: "Strategie",
    },
    {
      href: `/merk/${brandId}/strategie/clusters`,
      label: "Clusters",
      hoofdstuk: "Strategie",
    },
    {
      href: `/merk/${brandId}/strategie/bibliotheek`,
      label: "Bibliotheek",
      hoofdstuk: "Strategie",
    },

    // ── ANALYTICS ────────────────────────────────────────────────────────
    {
      href: `/merk/${brandId}/analytics`,
      label: "Zichtbaarheid in AI",
      hoofdstuk: "Analytics",
    },
    {
      href: `/merk/${brandId}/analytics/zoekverkeer`,
      label: "Zoekverkeer",
      hoofdstuk: "Analytics",
    },
    {
      href: `/merk/${brandId}/analytics/concurrenten`,
      label: "Concurrenten",
      hoofdstuk: "Analytics",
    },
    //
    // ⚠️ VIER BESTEMMINGEN, EN DIT IS DE VIERDE (besluit 22 augustus 2026).
    //
    // Elk klanthoofdstuk heeft er hooguit drie (besluit 1 tot en met 8 van
    // 17 augustus 2026, `docs/ux-design.md` §5). Admin kreeg er op 19 augustus
    // vier, met een uitgeschreven reden. Analytics krijgt er nu ook vier, en de
    // reden is van dezelfde soort: het is geen vergaarbak maar iets van een
    // andere orde.
    //
    // **De andere drie bestemmingen tonen data die de app sowieso al verzamelt.
    // Deze is een los product dat de klant apart koopt.** Zichtbaarheid,
    // Zoekverkeer en Concurrenten komen alle drie uit werk dat toch al draait:
    // de maandelijkse meting, de Search Console-koppeling, de aggregatie. Mijn
    // reputatie draait niet mee in die cyclus, wordt per keer gestart, per keer
    // betaald en per keer gedateerd. Drie plus een product, net zoals Admin drie
    // plus een uitgang is.
    //
    // Wat dit besluit betekent: een VIJFDE bestaat dan echt niet meer zonder
    // eerst iets samen te voegen. Dat is vanaf nu geen stijlregel meer maar een
    // grens, en `scripts/test-unit.ts` bewaakt hem.
    {
      href: `/merk/${brandId}/analytics/reputatie`,
      label: "Mijn reputatie",
      hoofdstuk: "Analytics",
    },

    // ── MERKPROFIEL ──────────────────────────────────────────────────────
    {
      href: `/merk/${brandId}/merkprofiel`,
      label: "Merkdossier",
      hoofdstuk: "Merkprofiel",
    },
    {
      href: `/merk/${brandId}/merkprofiel/bewerken`,
      label: "Bewerken",
      hoofdstuk: "Merkprofiel",
    },
    {
      href: `/merk/${brandId}/merkprofiel/input`,
      label: "Vraagt jouw input",
      hoofdstuk: "Merkprofiel",
    },

    // ── ADMIN ────────────────────────────────────────────────────────────
    //
    // ⚠️ VIER BESTEMMINGEN IS HET MAXIMUM VAN DÍT HOOFDSTUK, EN DIT ZIJN ER
    // DRIE VAN. De vierde, "Alle merken", staat in `generalNav()`.
    //
    // Elk klanthoofdstuk heeft er hooguit drie (besluit 1 tot en met 8 van
    // 17 augustus 2026, `docs/ux-design.md` §5). Voor Admin is die grens op
    // 19 augustus 2026 bewust op vier gezet, bij het toevoegen van de
    // onboardingsessie. De reden: de drie hierboven gaan over dít merk en
    // "Alle merken" gaat over de app als geheel, dus het is geen vergaarbak van
    // vier gelijksoortige regels maar drie plus een uitgang. De rest van de
    // regel blijft staan: een VIJFDE bestaat niet zonder eerst iets samen te
    // voegen, en de klanthoofdstukken blijven op drie.
    //
    // De scheiding tussen de eerste twee is scherp en zonder overlap:
    // Onboarding is het werk MÉT de klant en is het enige stafscherm dat
    // gedeeld wordt, Diagnose is wat er technisch gebeurde en is alleen voor
    // jou. "Onboarding-inzicht" heette dat scherm hiervoor, en dat leek te veel
    // op "Onboardingsessie" om tijdens een gedeeld scherm nog uit elkaar te
    // houden.
    ...(staff
      ? [
          {
            href: `/merk/${brandId}/admin/onboarding`,
            label: "Onboarding",
            hoofdstuk: "Admin" as const,
            staffOnly: true,
          },
          {
            href: `/merk/${brandId}/admin`,
            label: "Diagnose",
            hoofdstuk: "Admin" as const,
            staffOnly: true,
          },
          {
            href: `/merk/${brandId}/admin/toewijzen`,
            label: "Toewijzen",
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
    { href: "/instellingen", label: "Account en team", hoofdstuk: "Instellingen" },
    {
      href: "/instellingen/koppelingen",
      label: "Koppelingen",
      hoofdstuk: "Instellingen",
    },
    ...(staff
      ? [
          {
            href: "/beheer",
            label: "Alle merken",
            hoofdstuk: "Admin" as const,
            staffOnly: true,
          },
        ]
      : []),
  ];
}

/**
 * De Sales-sectie: de GEO Prospect Engine, uitsluitend voor Outer Orbit
 * (`docs/tasks/geo-prospect-engine.md` §4.1).
 *
 * ⚠️ **De volgorde is niet willekeurig, en Opportunities staat bewust bóven
 * Markten.** Sales werkt vanuit kansen en niet vanuit rapporten. Wie de module
 * opent moet binnen enkele seconden zien wie hij vandaag moet bellen, niet
 * welke markten er onderzocht zijn. Zet je Markten bovenaan, dan wordt dit een
 * rapportenkast met een belijst eronder, en dat is precies het oude plan dat
 * New business heeft teruggestuurd.
 *
 * ⚠️ **Dit is geen merk-navigatie.** Alle andere hoofdstukken gaan over één
 * gekozen merk. Een prospect is per definitie nog geen merk, dus deze
 * bestemmingen hangen aan de app en niet aan de merkkiezer. Ze blijven daarom
 * ook staan als er geen merk gekozen is.
 *
 * `sales` verbergt de hele groep. Dat is een beleefdheid en geen slot: elke
 * route eronder geeft een gewone gebruiker nog steeds "pagina bestaat niet", en
 * de RLS-policies uit migratie 0065 geven hem nul rijen.
 */
export function salesNav(sales = false): NavItem[] {
  if (!sales) return [];
  return [
    { href: "/sales", label: "Overzicht", hoofdstuk: "Sales", staffOnly: true },
    {
      href: "/sales/opportunities",
      label: "Opportunities",
      hoofdstuk: "Sales",
      staffOnly: true,
    },
    { href: "/sales/prospects", label: "Prospects", hoofdstuk: "Sales", staffOnly: true },
    { href: "/sales/markten", label: "Markten", hoofdstuk: "Sales", staffOnly: true },
    { href: "/sales/outreach", label: "Outreach", hoofdstuk: "Sales", staffOnly: true },
  ];
}

/**
 * De hoofdstukken die onder de scheidingslijn staan, omdat de klant ze nooit
 * ziet. Een set en geen vergelijking, zodat er een derde bij kan zonder dat
 * iemand een `||` over het hoofd ziet.
 */
const AFGESCHERMD = new Set<Hoofdstuk>(["Sales", "Admin"]);

/**
 * De platte lijst bestemmingen omgezet in koppen, in de volgorde van
 * `HOOFDSTUKKEN`. Een hoofdstuk zonder bestemmingen valt weg.
 */
export function hoofdstukken(items: NavItem[]): NavHoofdstuk[] {
  return HOOFDSTUKKEN.map((naam) => ({
    naam,
    icoon: HOOFDSTUK_ICOON[naam],
    items: items.filter((i) => i.hoofdstuk === naam),
    afgeschermd: AFGESCHERMD.has(naam),
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
  { href: "/instellingen", label: "Mijn instellingen", hoofdstuk: "Instellingen" },
];
