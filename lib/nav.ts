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

/**
 * De vier klanthoofdstukken plus de afgeschermde groep, in menuvolgorde.
 *
 * ⚠️ **"Instellingen" stond hier tot 25 augustus 2026.** Zijn twee bestemmingen
 * zijn allebei weg: "Account en team" verhuisde naar het uitklapmenu achter het
 * profiel-icoon (`components/profile-menu.tsx`, als "Mijn account"), en
 * "Koppelingen" verhuisde naar Admin, omdat een koppeling maken voortaan
 * alleen aan de consultant is en niet meer aan de klant. Een hoofdstuk zonder
 * bestemmingen valt al weg via `hoofdstukken()`, maar een kop die voorgoed leeg
 * blijft is geen kop meer, dus is hij hier ook weg.
 */
export const HOOFDSTUKKEN = [
  "Overzicht",
  "Strategie",
  "Analytics",
  "Merkprofiel",
  "Admin",
] as const;

export type Hoofdstuk = (typeof HOOFDSTUKKEN)[number];

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
 * van de zes vaste plekken in de app aanwijst; de bestemming eronder staat al
 * ingesprongen achter een lijn en heeft niets extra's nodig om als kind te
 * lezen. Vandaar dat `NavItem` geen icoonveld heeft: dan kán het ook niet
 * ongemerkt terugkomen.
 */
export const HOOFDSTUK_ICOON: Record<Hoofdstuk, IcoonNaam> = {
  Overzicht: "overzicht",
  Strategie: "strategie",
  Analytics: "analytics",
  Merkprofiel: "merkprofiel",
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
   * Alleen voor jou, nooit voor de klant (`docs/ux-design.md`, "Wat de klant
   * ziet en wat alleen jij ziet"). De zijbalk zet er een klein teken bij, zodat
   * je nooit per ongeluk tijdens een gedeeld scherm op een interne pagina klikt.
   */
  staffOnly?: boolean;
}

/** Eén kop met zijn bestemmingen. Leeg wordt niet getoond. */
export interface NavHoofdstuk {
  naam: Hoofdstuk;
  icoon: IcoonNaam;
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
    // ⚠️ VIJF BESTEMMINGEN IS HET MAXIMUM VAN DÍT HOOFDSTUK, EN DIT ZIJN ER
    // DRIE VAN. De vierde, "Alle merken", en de vijfde, "Koppelingen", staan
    // in `generalNav()`.
    //
    // Elk klanthoofdstuk heeft er hooguit drie (besluit 1 tot en met 8 van
    // 17 augustus 2026, `docs/ux-design.md` §5). Voor Admin is die grens op
    // 19 augustus 2026 bewust op vier gezet, bij het toevoegen van de
    // onboardingsessie, en op 25 augustus 2026 verder op vijf, toen
    // "Koppelingen" van Instellingen naar Admin verhuisde: een koppeling maken
    // is voortaan alleen aan de consultant, niet meer aan de klant. De reden
    // blijft van dezelfde soort: de drie hierboven gaan over dít merk, "Alle
    // merken" en "Koppelingen" gaan over de app als geheel, dus het is geen
    // vergaarbak van vijf gelijksoortige regels maar drie plus twee uitgangen.
    // De rest van de regel blijft staan: een ZESDE bestaat niet zonder eerst
    // iets samen te voegen, en de klanthoofdstukken blijven op drie.
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
 *
 * ⚠️ **"Account en team" stond hier tot 25 augustus 2026**, onder Instellingen.
 * Die kop had daarna geen enkele bestemming meer over, want "Koppelingen"
 * (zie hieronder) verhuisde in dezelfde ronde naar Admin. Een kop die voorgoed
 * leeg is, is geen kop: "Account en team" staat nu achter het profiel-icoon
 * rechtsboven, als "Mijn account" (`components/profile-menu.tsx`), en
 * "Instellingen" is uit `HOOFDSTUKKEN` weg.
 *
 * ⚠️ **"Koppelingen" is Admin geworden, niet meer Instellingen** (25 augustus
 * 2026). Een koppeling met Search Console zet de consultant vóór het
 * demogesprek klaar (het product is sales-led, besloten 3 augustus 2026); de
 * klant maakt hem nooit zelf. Instellingen liet die knop zien zonder dat een
 * klant er iets aan had. De pagina zelf (`app/(app)/instellingen/koppelingen/`)
 * controleert nu ook zelf `isStaff`, want een adres achter een verborgen
 * menu-item is nog steeds een adres.
 */
export function generalNav(staff = false): NavItem[] {
  return [
    ...(staff
      ? [
          {
            href: "/beheer",
            label: "Alle merken",
            hoofdstuk: "Admin" as const,
            staffOnly: true,
          },
          {
            href: "/instellingen/koppelingen",
            label: "Koppelingen",
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
    icoon: HOOFDSTUK_ICOON[naam],
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
 * Welke bestemming licht op bij deze route?
 *
 * ── WAAROM DIT MEER IS DAN `isExact` ────────────────────────────────────────
 *
 * Het clusterdossier woont op een eigen adres (`/analyses/[id]`, met daaronder
 * de bibliotheek van dat cluster, het concept en de clusterinstellingen). Dat is
 * geen bestemming in het menu, dus zolang de klant dáár was, lichtte er in de
 * hele zijbalk niets op. Precies op het diepste scherm van de app, de tekst die
 * hij moet publiceren, verdween dus het antwoord op "waar ben ik".
 *
 * Het dossier hoort bij het onderwerp, en onderwerpen staan onder "Clusters".
 * Dus laat "Clusters" oplichten zolang je ergens in een cluster zit. Dat is één
 * regel in plaats van de hele routestructuur verhuizen, en het lost het gevoel
 * van verdwalen op waar het ontstaat.
 *
 * ⚠️ Bewust `startsWith("/analyses/")` met de schuine streep erachter, en niet
 * `"/analyses"`: `/analyses` zelf is sinds 27 augustus 2026 alleen nog een
 * doorverwijzing naar dit menu-item, en die pagina wordt nooit getoond.
 */
export function navActief(pathname: string, item: NavItem): boolean {
  if (isExact(pathname, item.href)) return true;
  return pathname.startsWith("/analyses/") && item.href.endsWith("/strategie/clusters");
}

/**
 * ⚠️ Hier stonden `ACCOUNT_NAV` en daarvoor `NAV`, de platte lijst van vóór de
 * zijbalk. `NAV` verdween op 17 augustus 2026: `MainNav` las hem en bestond
 * niet meer, en het profielmenu toonde er een tweede hoofdnavigatie mee naast
 * de zijbalk. `ACCOUNT_NAV` verdween op 25 augustus 2026, met de laatste
 * bestemming erin: het uitklapmenu achter het profiel-icoon
 * (`components/profile-menu.tsx`) heeft nu precies één link, "Mijn account"
 * naar `/instellingen`, en een lijst van één regel heeft geen apart bestand
 * meer nodig. Twee menu's met dezelfde bestemmingen lopen gegarandeerd uit
 * elkaar; dat risico is met één regel op één plek verdwenen.
 */
