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
 * De vier klanthoofdstukken plus de twee afgeschermde groepen, in menuvolgorde.
 *
 * ⚠️ **"Instellingen" stond hier tot 25 augustus 2026.** Zijn twee bestemmingen
 * zijn allebei weg: "Account en team" verhuisde naar het uitklapmenu achter het
 * profiel-icoon (`components/profile-menu.tsx`, als "Mijn account"), en
 * "Koppelingen" verhuisde naar Admin, omdat een koppeling maken voortaan
 * alleen aan de consultant is en niet meer aan de klant. Een hoofdstuk zonder
 * bestemmingen valt al weg via `hoofdstukken()`, maar een kop die voorgoed leeg
 * blijft is geen kop meer, dus is hij hier ook weg.
 *
 * "Sales" hangt niet aan een merk maar aan een rol, en staat vóór Admin: een
 * salesmedewerker werkt er dagelijks in, terwijl Admin het werk is dat je
 * hooguit af en toe doet (plan §4.1).
 */
export const HOOFDSTUKKEN = [
  "Overzicht",
  "Clusters",
  "Strategie",
  "Analytics",
  "Mijn bedrijf",
  "Admin",
] as const;

export type Hoofdstuk = (typeof HOOFDSTUKKEN)[number];

/**
 * Hoeveel bestemmingen mag een hoofdstuk hebben?
 *
 * ⚠️ **Deze tabel bestaat omdat "hooguit vier" bezig was een algemene grens te
 * worden** (besluit 24 augustus 2026). De regel van 17 augustus was drie, met
 * daarna twee uitzonderingen op vier die allebei met argumenten zijn vastgelegd
 * (Admin op 19 augustus, Analytics op 22 augustus; Admin ging op 25 augustus
 * naar vijf toen "Koppelingen" erbij kwam). Elke volgende uitzondering
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
 * **Admin staat sinds 1 september 2026 op zeven.** Het merkdossier
 * (`/merkprofiel`) is die dag opgesplitst: de leesbare "0-meting" en de
 * "Aanbodboom" zijn allebei stafgereedschap geworden en niet meer iets waar
 * een klant zelfstandig doorheen bladert (het product is sales-led, de
 * consultant richt het profiel in vóór het demogesprek). Ze staan tussen
 * Onboardinggesprek en Diagnose, in de volgorde van de sessie zelf: eerst het
 * gesprek, dan wat daaruit is opgehaald, dan de techniek erachter.
 * Merkprofiel houdt daarmee nog maar één bestemming over, "Merkdossier" (de
 * voormalige "Bewerken"): het enige scherm waar de klant zelf nog iets aan
 * zijn profiel doet.
 *
 * De klanthoofdstukken blijven op drie, met Analytics en Strategie als de twee
 * genoemde uitzonderingen op vier. Dát is de regel die overeind moet blijven,
 * en die is met deze tabel scherper dan eerst.
 */
/**
 * ⚠️ **Admin stond van 2 september 2026 tot 30 september 2026 op acht, sindsdien op zeven, en dat is de vierde
 * uitzondering.** Het herontwerp van Analytics (`docs/tasks/analytics-herontwerp.md`,
 * C1) haalt het entiteitenbeheer (329 rijen bij het grootste merk) van
 * Concurrenten af: dat was beheerwerk in een leesscherm, en zoeken/filteren op
 * die schaal hoort niet tussen een ranglijst. "Concurrenten indelen" is
 * daarmee de zesde bestemming die over dít merk gaat, naast Onboardinggesprek,
 * 0-meting, Aanbodboom, Diagnose en Toewijzen. Dezelfde onderbouwing als bij
 * de vorige drie: dit is stafgereedschap, geen klantscherm, en de acht blijven
 * vijf soorten werk plus twee uitgangen plus deze ene toevoeging, geen
 * vergaarbak.
 *
 * ⚠️ **Van 0091 tot 28 september 2026 stond Admin op negen**, voor het
 * Kwaliteitslab (`/beheer/kwaliteit`). Het scherm verdween met de ombouw van de
 * contentketen (`docs/tasks/contentketen-opnieuw.md`), het menu-item bleef nog
 * een tijd als dode link staan en is toen ook weggehaald. Terug op acht.
 *
 * ⚠️ **Diagnose verdween op 30 september 2026** en is opgegaan in het
 * statusoverzicht van het onboardinggesprek (`lib/pipeline/onboarding-status.ts`).
 * Admin staat daarmee op zeven.
 */
export const GRENS_PER_HOOFDSTUK: Record<Hoofdstuk, number> = {
  Overzicht: 3,
  Clusters: 3,
  // Terug naar de regel van drie sinds 23 september 2026: Clusters is een eigen
  // hoofdstuk geworden, dus Strategie heeft er geen vier meer nodig.
  Strategie: 3,
  Analytics: 4,
  "Mijn bedrijf": 3,
  Admin: 7,
};

/**
 * ⚠️ **Sinds 29 september 2026 dragen de bestemmingen een icoon en de koppen
 * niet meer** (opdracht van de eigenaar bij de nieuwe zijbalk over de volle
 * hoogte, `components/sidebar.tsx`). Dit keert het besluit van 21 augustus 2026
 * om ("de bestemmingen krijgen er géén"): dat besluit ging uit van zestien
 * tekeningen naast zes koppen met een icoon, waar het icoon van de kop het
 * onderscheid moest dragen. Nu de kop een gewone, kleine tekstregel is, is het
 * icoon per bestemming juist wat de regel in één oogopslag terugvindbaar maakt.
 * `HOOFDSTUK_ICOON` bestaat daarom niet meer, en ook de ingeklapte zijbalk (waar
 * het kopicoon het enige was wat overbleef) is weg.
 */

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
  /** Het icoon voor deze regel, uit `lib/icons.ts`. Erft de kleur van de tekst. */
  icoon: IcoonNaam;
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
      label: "Openstaande taken",
      hoofdstuk: "Overzicht",
      icoon: "taken" as const,
    },

    // ── CLUSTERS ─────────────────────────────────────────────────────────
    //
    // ⚠️ EEN EIGEN HOOFDSTUK SINDS 23 SEPTEMBER 2026 (docs/tasks/clusters-ontdekken.md).
    //
    // Tot die dag was "Clusters" de eerste van vier bestemmingen onder
    // Strategie. Met "Clusters ontdekken" erbij zouden het er vijf worden, en
    // een vijfde bestaat niet zonder eerst iets samen te voegen (besluit
    // 22 augustus 2026). Een eigen kop lost dat op en herstelt meteen de
    // regel van drie voor Strategie.
    //
    // De kop staat vóór Strategie om dezelfde reden als Clusters daar eerst
    // stond (28 augustus 2026): zonder meting valt er niets te plannen.
    //
    // "Clusters ontdekken" staat bovenaan op verzoek van de eigenaar. Het
    // adres van "Mijn clusters" is ongewijzigd: het wordt op 27 plekken
    // gebruikt, en verhuizen levert alleen een mooier adres op.
    //
    // ⚠️ DE VOLGORDE HANGT SINDS DE UX-AUDIT VAN 23 SEPTEMBER 2026 (P1.5) AF VAN
    // DE ROL. De consultant draait de ontdekkingsrondes en houdt "Clusters
    // ontdekken" bovenaan, zoals de eigenaar vroeg. Voor de klant was dat het
    // eerste item van het hoofdstuk en meestal een wachtscherm ("je consultant
    // zoekt nieuwe onderwerpen voor je"): hij opende Clusters en zag niet wat hij
    // had, maar wat er nog niet was. Voor hem staat "Mijn clusters" bovenaan.
    ...(staff ? [ontdekken(brandId), mijnClusters(brandId)] : [mijnClusters(brandId), ontdekken(brandId)]),

    // ── STRATEGIE ────────────────────────────────────────────────────────
    //
    // Op 22 september 2026 zijn Contentplan en Openstaande vragen op verzoek
    // van de eigenaar van plek gewisseld: eerst het plan, dan wat ervoor nodig
    // is. "Openstaande vragen" is de enige plek hier waar de klant zelf iets
    // moet DOEN: sinds de eindpoort (`lib/content-final-gate.ts`) houdt een
    // openstaande vraag een pagina tegen. Hij stond tot 28 augustus 2026 onder
    // Merkprofiel, als "Vraagt jouw input".
    {
      href: `/merk/${brandId}/strategie/plan`,
      label: "Contentplan",
      hoofdstuk: "Strategie",
      icoon: "plannen" as const,
    },
    {
      href: `/merk/${brandId}/strategie/vragen`,
      label: "Openstaande vragen",
      hoofdstuk: "Strategie",
      icoon: "feit" as const,
    },
    {
      href: `/merk/${brandId}/strategie/bibliotheek`,
      label: "Bibliotheek",
      hoofdstuk: "Strategie",
      icoon: "bibliotheek" as const,
    },

    // ── ANALYTICS ────────────────────────────────────────────────────────
    {
      href: `/merk/${brandId}/analytics`,
      label: "Zichtbaarheid in AI",
      hoofdstuk: "Analytics",
      icoon: "analytics" as const,
    },
    {
      href: `/merk/${brandId}/analytics/zoekverkeer`,
      label: "Search console",
      hoofdstuk: "Analytics",
      icoon: "zoekmachine",
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

    // ── MERKPROFIEL ──────────────────────────────────────────────────────
    //
    // ⚠️ HIER STOND OOK "MERKDOSSIER" (/merkprofiel), TOT 1 SEPTEMBER 2026. Dat
    // leesscherm is opgesplitst en verhuisd naar Admin, als "0-meting" en
    // "Aanbodboom" (zie hieronder): allebei stafgereedschap, geen klantscherm.
    // Wat overblijft is deze ene bestemming, omgedoopt van "Bewerken" naar
    // "Merkdossier": het enige scherm waar de klant zelf nog iets aan zijn
    // profiel doet.
    // ── DE NAMEN ZIJN OP 30 SEPTEMBER 2026 GEWISSELD ──────────────────────
    //
    // De kop heette "Merkdossier" en de bestemming eronder "Mijn bedrijf". Op
    // verzoek van de eigenaar is dat omgedraaid: de kop is "Mijn bedrijf" (de
    // plek waar het bedrijf van de klant woont) en de bestemming waar hij zijn
    // profiel nakijkt en aanvult is "Merkdossier". Het adres blijft
    // `/merkprofiel/bewerken`, want dat staat in mails en demolinks.
    {
      href: `/merk/${brandId}/merkprofiel/bewerken`,
      label: "Merkdossier",
      hoofdstuk: "Mijn bedrijf",
      icoon: "merkprofiel" as const,
    },
    // ── FEITEN EN KENNIS (30 september 2026) ──────────────────────────────
    //
    // Eén plek voor alles wat ORBIT ENGINE over het bedrijf weet. Het neemt de
    // twee Admin-schermen over die daar al stonden zonder menuregel:
    // `admin/kennis` (het kennisoverzicht) en `admin/feiten` (de
    // tegenstrijdigheden). Die twee zijn weg en verwijzen door.
    //
    // ⚠️ Alleen voor medewerkers, ondanks de plek onder een klantkop. Besluit
    // V6 en V11 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`: de tabel
    // `klantkennis` is voor de klant dicht (RLS) en bevat wat een model alleen
    // denkt. Een klant met deze regel in zijn menu zou op een 404 uitkomen.
    // De kop "Mijn bedrijf" blijft voor een klant een kop met één regel.
    ...(staff
      ? [
          {
            href: `/merk/${brandId}/merkprofiel/feiten-en-kennis`,
            label: "Feiten en kennis",
            hoofdstuk: "Mijn bedrijf" as const,
            icoon: "goedkeuring" as const,
            staffOnly: true,
          },
        ]
      : []),
    // ⚠️ "Vraagt jouw input" stond hier tot 28 augustus 2026. Het heet nu
    // "Openstaande vragen" en staat onder Strategie, zie het blok hierboven.

    // ── ADMIN ────────────────────────────────────────────────────────────
    //
    // ⚠️ ZEVEN BESTEMMINGEN IS HET MAXIMUM VAN DÍT HOOFDSTUK, EN DIT ZIJN ER
    // VIJF VAN. De zesde, "Alle merken", en de zevende, "Koppelingen", staan
    // in `generalNav()`.
    //
    // Elk klanthoofdstuk heeft er hooguit drie (besluit 1 tot en met 8 van
    // 17 augustus 2026, `docs/ux-design.md` §5). Voor Admin is die grens op
    // 19 augustus 2026 bewust op vier gezet, bij het toevoegen van de
    // onboardingsessie, op 25 augustus 2026 op vijf, toen "Koppelingen" van
    // Instellingen naar Admin verhuisde, en op 1 september 2026 op zeven, toen
    // het merkdossier opgesplitst werd in "0-meting" en "Aanbodboom": beide
    // zijn stafgereedschap geworden en geen klantscherm meer (het product is
    // sales-led, de consultant richt het profiel in vóór het demogesprek). De
    // reden blijft van dezelfde soort: de vijf hierboven gaan over dít merk,
    // "Alle merken" en "Koppelingen" gaan over de app als geheel, dus het is
    // geen vergaarbak van zeven gelijksoortige regels maar vijf plus twee
    // uitgangen. De rest van de regel blijft staan: een ACHTSTE bestaat niet
    // zonder eerst iets samen te voegen, en de klanthoofdstukken blijven op
    // drie.
    //
    // "0-meting" en "Aanbodboom" staan tussen Onboardinggesprek en Diagnose,
    // in de volgorde van de sessie zelf: eerst het gesprek met de klant, dan
    // wat daaruit is opgehaald, dan de techniek erachter. De scheiding tussen
    // Onboarding en Diagnose blijft scherp en zonder overlap: Onboarding is
    // het werk MÉT de klant en is het enige stafscherm dat gedeeld wordt,
    // Diagnose is wat er technisch gebeurde en is alleen voor jou.
    // "Onboarding-inzicht" heette dat scherm hiervoor, en dat leek te veel op
    // "Onboardingsessie" om tijdens een gedeeld scherm nog uit elkaar te
    // houden.
    ...(staff
      ? [
          {
            href: `/merk/${brandId}/admin/onboarding`,
            label: "Onboardinggesprek",
            hoofdstuk: "Admin" as const,
            icoon: "reputatie" as const,
            staffOnly: true,
          },
          {
            href: `/merk/${brandId}/admin/aanbodboom`,
            label: "Aanbodboom",
            hoofdstuk: "Admin" as const,
            icoon: "strategie" as const,
            staffOnly: true,
          },
          // Verhuisd van Concurrenten (plan analytics-herontwerp.md, C1): het
          // indelen van merken bepaalt de noemer van het aandeel, maar is zelf
          // beheerwerk en geen analyse.
          {
            href: `/merk/${brandId}/admin/concurrenten`,
            label: "Concurrenten indelen",
            hoofdstuk: "Admin" as const,
            icoon: "concurrenten" as const,
            staffOnly: true,
          },
          {
            href: `/merk/${brandId}/admin/toewijzen`,
            label: "Toegang",
            hoofdstuk: "Admin" as const,
            icoon: "label" as const,
            staffOnly: true,
          },
        ]
      : []),
  ];
}

function ontdekken(brandId: string): NavItem {
  return { href: `/merk/${brandId}/ontdekken`, label: "Clusters ontdekken", hoofdstuk: "Clusters", icoon: "ontdekken" };
}

function mijnClusters(brandId: string): NavItem {
  return { href: `/merk/${brandId}/strategie/clusters`, label: "Mijn clusters", hoofdstuk: "Clusters", icoon: "clusters" };
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
            icoon: "bedrijven" as const,
            staffOnly: true,
          },
          {
            href: "/instellingen/koppelingen",
            label: "Search Console",
            hoofdstuk: "Admin" as const,
            icoon: "koppeling" as const,
            staffOnly: true,
          },
        ]
      : []),
  ];
}

const AFGESCHERMD = new Set<Hoofdstuk>(["Admin"]);

/**
 * De platte lijst bestemmingen omgezet in koppen, in de volgorde van
 * `HOOFDSTUKKEN`. Een hoofdstuk zonder bestemmingen valt weg.
 */
export function hoofdstukken(items: NavItem[]): NavHoofdstuk[] {
  return HOOFDSTUKKEN.map((naam) => ({
    naam,
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
  if (pathname.startsWith("/analyses/") && item.href.endsWith("/strategie/clusters")) return true;
  // Het paginascherm (23 september 2026, `docs/tasks/contentflow-een-lijn.md`
  // §4.6) woont onder de bibliotheek, en daar hoort het ook op te lichten. Tot
  // die dag hing een pagina onder het cluster en lichtte "Clusters" op als je
  // vanuit de Bibliotheek op een pagina klikte.
  if (item.href.endsWith("/strategie/bibliotheek") && pathname.startsWith(`${item.href}/`)) return true;
  return false;
}

/**
 * De titel voor de mobiele bovenbalk (17 september 2026, stap 6 van de
 * redesign, `redesign2026.md` §8.12.3: "terugknop plus schermtitel").
 *
 * ── WAAROM DIT NIET PER PAGINA WORDT MEEGEGEVEN ─────────────────────────────
 *
 * Dat zou vijftig `page.tsx`-bestanden raken vóór er één daadwerkelijk mobiel
 * scherm gebouwd is (stap 10), en de zijbalk lost precies dit probleem al op:
 * elke route die de klant ooit ziet heeft er een label voor. Deze functie
 * hergebruikt die lijst in plaats van hem te herhalen.
 *
 * ⚠️ **`isActive()`, niet `navActief()`, en dat is met opzet een ANDERE
 * strengheid dan de zijbalk gebruikt.** Een eerste versie hergebruikte
 * `navActief`, en een test tegen echte paden (`/merk/x/strategie/plan/versies`)
 * liet meteen zien waarom dat mis is: `navActief` is strikt exact voor de
 * meeste bestemmingen (`isExact`), juist om te voorkomen dat twee
 * buurbestemmingen in de zijbalk tegelijk oplichten
 * (`/merkprofiel` tegenover `/merkprofiel/bewerken`). Voor een titel is dat
 * omgekeerd onwenselijk: een dieper scherm zonder eigen menu-item toont dan
 * liever de titel van zijn OUDER dan niets. `isActive()` (voorvoegsel,
 * `startsWith`) vindt die ouder wél; het is dezelfde titel als de
 * hoofdbestemming, en dat is voor een schermtitel geen probleem, want er is
 * maar één titel per scherm en geen twee die om aandacht strijden zoals in
 * de zijbalk.
 *
 * **Langste match wint, niet de eerste.** Bij een voorvoegsel matchen twee
 * bestemmingen soms allebei (`/merkprofiel` en `/merkprofiel/bewerken` voor
 * het pad `/merkprofiel/bewerken/x`); zonder deze regel pakt de eerste van de
 * twee in `alles`, ongeacht welke specifieker is.
 *
 * Levert niets op voor een route zonder ENKEL treffend menu-item (de
 * merkloze routes als `/instellingen`, of een pad dat aan geen enkel
 * voorvoegsel voldoet): dan valt de bovenbalk terug op de merknaam of de
 * app-naam, geen titel is beter dan een verzonnen titel (conventie 3,
 * `CLAUDE.md`).
 */
export function titelVoorPad(pathname: string, alles: NavItem[]): string | null {
  const treffers = alles.filter((item) => isActive(pathname, item.href));
  if (treffers.length === 0) return null;
  return treffers.reduce((langste, kandidaat) =>
    kandidaat.href.length > langste.href.length ? kandidaat : langste,
  ).label;
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
