/**
 * Het merkprofiel van het voorbeeldaccount RunX.
 *
 * Plan: `docs/tasks/demo-account-runx.md` §4. Wat hier staat komt uit twee
 * bronnen, en dat onderscheid is de afspraak van route A (§2 van het plan):
 *
 *   • **Openbaar**: van runx.nl, opgehaald op 1 oktober 2026. Adressen, het
 *     aanbod, de merken, de gratis loopanalyse bij nieuwe schoenen, de
 *     zelfstandige ondernemers per winkel.
 *   • **Fictief**: het nagespeelde onboardinggesprek. Wat RunX intern wil,
 *     belooft of telt. Gemarkeerd met `fictief: true` waar het een los item is.
 *
 * ⚠️ Bewust NIET opgenomen: namen van medewerkers (die staan op de site, maar
 * een verzonnen account hoort geen echte personen op te voeren), prijzen,
 * retourtermijnen, garanties en klantbeoordelingen.
 *
 * Puur, zonder `server-only`.
 */

export const MERK = {
  naam: "RunX",
  url: "https://runx.nl",
  accountNaam: "RunX",
  /** Het contentpakket: 10 pagina's per maand (`lib/package-sizes.ts`). */
  pakket: 10 as const,
};

export interface Winkel {
  stad: string;
  /** Hoe de vestiging heet op de site. */
  naam: string;
  adres: string;
  url: string;
  /** Plaatsen rond de winkel die tot het werkgebied horen. */
  omgeving: string[];
  /** Openbaar, letterlijk of vrijwel letterlijk van de winkelpagina. */
  feit: string;
}

export const WINKELS: Winkel[] = [
  {
    stad: "Apeldoorn",
    naam: "RunX Apeldoorn",
    adres: "Marktstraat 1C, 7311 LH Apeldoorn",
    url: "https://runx.nl/winkels/apeldoorn/",
    omgeving: ["Deventer", "Zutphen", "Epe"],
    feit: "Videoloopanalyse op de loopband, gecombineerd met het buiten testen van schoenen.",
  },
  {
    stad: "Groningen",
    naam: "RunX Groningen",
    adres: "Hoornsediep 127, 9727 GH Groningen",
    url: "https://runx.nl/winkels/groningen/",
    omgeving: ["Haren", "Assen", "Leek"],
    feit: "Sinds 2003, een winkel van 1.000 m² met vijf testbanen binnen en een aparte afdeling wandelen.",
  },
  {
    stad: "Haarlem",
    naam: "RunX Haarlem",
    adres: "Kruisstraat 7, 2011 PV Haarlem",
    url: "https://runx.nl/winkels/haarlem/",
    omgeving: ["Heemstede", "Bloemendaal", "Zandvoort"],
    feit: "Opgericht in 1989, sinds 2011 aan de Kruisstraat en sinds 2019 onderdeel van RunX.",
  },
  {
    stad: "Tilburg",
    naam: "RunX Tilburg",
    adres: "Schouwburgring 51, 5038 TK Tilburg",
    url: "https://runx.nl/winkels/tilburg/",
    omgeving: ["Breda", "Waalwijk", "Oisterwijk"],
    feit: "Een vernieuwd loopanalysesysteem en een sportfysiotherapeut op afspraak.",
  },
  {
    stad: "Enschede",
    naam: "RunX Twente",
    adres: "Kuipersdijk 52, 7512 CJ Enschede",
    url: "https://runx.nl/winkels/twente/",
    omgeving: ["Hengelo", "Almelo", "Oldenzaal"],
    feit: "Podologisch advies en het aanpassen van zolen in de winkel.",
  },
  {
    stad: "Zaandam",
    naam: "RunX Zaandam",
    adres: "Gedempte Gracht 58, 1506 CH Zaandam",
    url: "https://runx.nl/winkels/zaandam/",
    omgeving: ["Purmerend", "Wormerveer", "Amsterdam-Noord"],
    feit: "Al 25 jaar een hardloopwinkel in de Zaanstreek, met een team van wedstrijdlopers.",
  },
];

/**
 * De kennisvelden van het merkprofiel, zoals de consultant ze na het
 * (nagespeelde) onboardinggesprek invulde. Gaat via `slaProfielOp()`, de enige
 * schrijver van kennisvelden op `profiles` (K8 deel 3).
 */
export const PROFIELVELDEN = {
  brand_name: "RunX",
  aliases: [
    "RunX Hardloopwinkel",
    "RunX Apeldoorn",
    "RunX Groningen",
    "RunX Haarlem",
    "RunX Tilburg",
    "RunX Twente",
    "RunX Zaandam",
    "Run X",
  ],
  name_exclusions: ["RUNX hardloopapp", "Run-X sportschool"],
  industry: "Hardloopspeciaalzaak",
  business_model: "retailer",
  summary:
    "RunX is een keten van zes hardloopspeciaalzaken in Apeldoorn, Groningen, Haarlem, Tilburg, Enschede (Twente) en Zaandam. Elke winkel wordt geleid door een zelfstandige ondernemer. Kern van het aanbod: hardloopschoenen met een gratis loopanalyse bij aanschaf, kleding, horloges, voeding en trainingen.",
  intake_description:
    "Zes hardloopwinkels, elk met een eigen ondernemer en een eigen team van lopers. Ze willen gevonden worden door lopers in hun eigen regio, van beginner tot marathonloper.",
  intake_audience:
    "Hardlopers in de regio rond de zes winkels: beginners die hun eerste schoenen zoeken, recreanten die naar een halve of hele marathon toewerken, trailers en lopers met klachten.",
  market_language: "Nederlands, Nederland",
  service_scope: "lokaal",
  service_regions: WINKELS.flatMap((w) => [w.stad, ...w.omgeving]),
  products: [
    "Hardloopschoenen",
    "Wedstrijdschoenen",
    "Trailschoenen",
    "Hardloopkleding",
    "GPS-horloges",
    "Compressie",
    "Sportvoeding",
    "Loopanalyse",
  ],
  priority_offerings: ["Loopanalyse", "Hardloopschoenen", "Wedstrijdschoenen", "Trailschoenen"],
  deprioritised_offerings: ["Wandelschoenen"],
  deal_value_band: "klein",
  seasonality:
    "Twee pieken: januari en februari (goede voornemens, voorjaarsmarathons) en augustus tot oktober (najaarslopen zoals de Dam tot Damloop, de Tilburg Ten Miles en de 4 Mijl van Groningen). Juli en december zijn rustiger.",
  goal_12m:
    "In elke van de zes steden de hardloopwinkel zijn die AI als eerste noemt bij een vraag over een loopanalyse of hardloopschoenen. Daarnaast trail en HYROX als nieuwe groepen opbouwen.",
  growth_regions: ["Twente", "Veluwe"],
  personas: [
    { name: "De starter", needs: ["eerste goede schoenen", "een schema dat haalbaar is", "een groep om mee te beginnen"] },
    { name: "De marathonloper", needs: ["wedstrijdschoenen", "voeding en tempo", "voorbereiding op een regionale marathon"] },
    { name: "De trailloper", needs: ["grip en bescherming", "uitrusting voor lange tochten", "routes in de buurt"] },
    { name: "De loper met klachten", needs: ["een schoen die past bij de klacht", "eerlijk advies over wanneer naar de fysio", "compressie en zolen"] },
    { name: "De HYROX-sporter", needs: ["een schoen voor rennen én kracht", "trainen naast de sportschool"] },
  ],
  target_segments: ["Beginnende hardlopers", "Recreatieve wedstrijdlopers", "Trailrunners", "Lopers met blessures", "HYROX-sporters"],
  sales_objections: [
    "Online is het goedkoper.",
    "Een loopanalyse in de winkel is toch vooral verkooppraat?",
    "Ik loop maar af en toe, dan heb ik geen dure schoenen nodig.",
  ],
  bezwaren_met_antwoord:
    "Online is het goedkoper: je betaalt voor een schoen die past bij hoe jij loopt, en die weet je pas na een loopanalyse en een paar passen op de band. Verkooppraat: de analyse is gratis bij nieuwe schoenen en het advies kan ook zijn dat je huidige schoen nog prima is. Af en toe lopen: juist dan maakt een schoen die past het verschil tussen doorgaan en afhaken.",
  competitors: ["Run2Day", "Runnersworld", "Decathlon", "Intersport", "Zalando"],
  value_props: [
    "Gratis loopanalyse bij aanschaf van nieuwe hardloopschoenen",
    "Advies van lopers die zelf hardlopen",
    "Zes winkels, dus altijd een in de buurt",
    "Breed assortiment van ruim twintig merken onder één dak",
  ],
  differentiator:
    "Elke RunX-winkel is van een zelfstandige ondernemer die zelf loopt. Je krijgt advies van iemand die de routes, de events en de lopers in de eigen stad kent, met het assortiment van een keten.",
  offline_proof: [
    "Loopgroepen vanuit de winkels",
    "Aanwezig met een stand bij regionale lopen",
  ],
  verhalen:
    "Klanten die met een scheenbeenklacht binnenkomen en na een loopanalyse en een andere schoen weer pijnvrij hun eerste halve marathon lopen. Een beginnersgroep in januari waarvan de helft in september samen de Dam tot Damloop loopt.",
  verhaal_werkwijze:
    "Eerst een gesprek: hoe vaak loop je, waar, waar wil je naartoe en heb je klachten. Dan een loopanalyse op de band met video, en daarna loop je met twee of drie schoenen die passen. Je kiest zelf, met uitleg over het verschil.",
  verhaal_niet:
    "We stellen geen medische diagnose. Bij aanhoudende pijn verwijzen we door naar een fysiotherapeut of sportarts. En we verkopen je geen schoen die niet past bij hoe je loopt, ook niet als hij in de aanbieding is.",
  verhaal_begin:
    "RunX is ontstaan uit hardloopwinkels die elk al jaren in hun eigen stad bestonden, sommige al sinds 1989, en die onder één naam zijn gaan samenwerken.",
  pronoun_preference: "je",
  taboo_phrases: ["de beste hardloopwinkel van Nederland", "gegarandeerd blessurevrij", "sneller lopen gegarandeerd"],
  forbidden_topics: ["medische diagnoses", "prijzen en kortingen", "kritiek op andere merken of winkels"],
  respect_site_structure: true,
};

/**
 * De aanbodboom. Ouder → kinderen. `soort` volgt `profile_offerings.kind`.
 */
export interface Knoop {
  naam: string;
  soort: "dienst" | "product" | "categorie" | "merk" | "vestiging";
  omschrijving?: string;
  kinderen?: Knoop[];
}

export const AANBOD: Knoop[] = [
  {
    naam: "Advies en service",
    soort: "categorie",
    kinderen: [
      { naam: "Loopanalyse", soort: "dienst", omschrijving: "Gratis bij aanschaf van nieuwe hardloopschoenen. Op de loopband met video, en daarna schoenen testen." },
      { naam: "Schoenadvies", soort: "dienst", omschrijving: "Persoonlijk advies bij je aankoop, afgestemd op hoe, waar en hoeveel je loopt." },
      { naam: "Sokken- en zooladvies", soort: "dienst", omschrijving: "Advies over hardloopsokken en inlegzolen, in Twente ook podologisch." },
      { naam: "RunX Club", soort: "dienst", omschrijving: "Het lidmaatschap voor vaste klanten." },
      { naam: "Trainingen en trainingsgroepen", soort: "dienst", omschrijving: "Loopgroepen en trainingen vanuit de winkels, voor beginners en gevorderden." },
      { naam: "Events", soort: "dienst", omschrijving: "Aanwezig bij regionale lopen en eigen clinics." },
    ],
  },
  {
    naam: "Hardloopschoenen",
    soort: "categorie",
    kinderen: [
      { naam: "Neutrale hardloopschoenen", soort: "product" },
      { naam: "Stabiele hardloopschoenen", soort: "product" },
      { naam: "Wedstrijdschoenen", soort: "product", omschrijving: "Waaronder schoenen met een carbon plaat." },
      { naam: "Trailschoenen", soort: "product" },
      { naam: "Spikes", soort: "product" },
      { naam: "Wandelschoenen", soort: "product" },
    ],
  },
  {
    naam: "Kleding en uitrusting",
    soort: "categorie",
    kinderen: [
      { naam: "Hardloopkleding", soort: "product" },
      { naam: "Compressie", soort: "product" },
      { naam: "Sokken", soort: "product" },
      { naam: "Rugzakken en heuptassen", soort: "product" },
      { naam: "Verlichting", soort: "product" },
    ],
  },
  {
    naam: "Techniek",
    soort: "categorie",
    kinderen: [
      { naam: "GPS-horloges", soort: "product" },
      { naam: "Hartslagbanden", soort: "product" },
      { naam: "Koptelefoons", soort: "product" },
    ],
  },
  { naam: "Voeding", soort: "categorie", omschrijving: "Gels, repen en sportdrank." },
  {
    naam: "Merken",
    soort: "categorie",
    kinderen: [
      "Adidas", "Asics", "Brooks", "Coros", "Craft", "Falke", "Garmin", "Herzog", "Hoka",
      "Maurten", "Mizuno", "New Balance", "On", "Polar", "Puma", "Saucony", "Shokz", "SiS", "Torq",
    ].map((naam) => ({ naam, soort: "merk" as const })),
  },
  {
    naam: "Vestigingen",
    soort: "categorie",
    kinderen: WINKELS.map((w) => ({ naam: w.naam, soort: "vestiging" as const, omschrijving: `${w.adres}. ${w.feit}` })),
  },
];

/**
 * Wie AI noemt, en welke rol die partij voor RunX heeft. Bepaalt wie er in
 * "Jij vs. concurrenten" staat (`entities.entity_role`). Vooraf vastgelegd met
 * `role_source = 'handmatig'`, zodat de aggregatie niets hoeft te classificeren
 * (dat zou een AI-aanroep zijn, `lib/pipeline/classify-entities.ts`).
 */
export const PARTIJEN: { naam: string; rol: "concurrent" | "eigen_product" | "vergelijker" | "niet_relevant" }[] = [
  { naam: "Run2Day", rol: "concurrent" },
  { naam: "Runnersworld", rol: "concurrent" },
  { naam: "Decathlon", rol: "concurrent" },
  { naam: "Intersport", rol: "concurrent" },
  { naam: "Zalando", rol: "concurrent" },
  { naam: "Bol", rol: "concurrent" },
  { naam: "Sportsdirect", rol: "concurrent" },
  { naam: "Bever", rol: "concurrent" },
  { naam: "Start to Run", rol: "niet_relevant" },
  { naam: "Basic-Fit", rol: "niet_relevant" },
  { naam: "Strava", rol: "niet_relevant" },
  { naam: "Nike", rol: "niet_relevant" },
  { naam: "Salomon", rol: "niet_relevant" },
  { naam: "CEP", rol: "niet_relevant" },
  { naam: "Asics", rol: "eigen_product" },
  { naam: "Brooks", rol: "eigen_product" },
  { naam: "Hoka", rol: "eigen_product" },
  { naam: "Saucony", rol: "eigen_product" },
  { naam: "On", rol: "eigen_product" },
  { naam: "New Balance", rol: "eigen_product" },
  { naam: "Mizuno", rol: "eigen_product" },
  { naam: "Adidas", rol: "eigen_product" },
  { naam: "Puma", rol: "eigen_product" },
  { naam: "Garmin", rol: "eigen_product" },
  { naam: "Maurten", rol: "eigen_product" },
  { naam: "Herzog", rol: "eigen_product" },
];

/** Waarom AI een concurrent noemt. Gaat in de antwoorden en in `competitor_breakdown`. */
export const WAAROM: Record<string, string> = {
  RunX: "zes hardloopspeciaalzaken met een gratis loopanalyse bij aanschaf van nieuwe schoenen en advies van lopers",
  Run2Day: "een landelijke keten van hardloopwinkels met loopanalyse",
  Runnersworld: "een keten van hardloopwinkels met persoonlijk advies",
  Decathlon: "een grote sportwarenhuisketen met een breed en betaalbaar assortiment",
  Intersport: "een sportketen met hardloopschoenen van bekende merken",
  Zalando: "een webwinkel met een groot aanbod hardloopschoenen en gratis retour",
  Bol: "een webwinkel waar je snel hardloopartikelen bestelt",
  Sportsdirect: "een sportwinkel met scherpe prijzen op vorige collecties",
  Bever: "een outdoorketen met trailschoenen en rugzakken",
  "Start to Run": "een bekend beginnersprogramma met loopgroepen",
  "Basic-Fit": "een sportschoolketen met HYROX-trainingen",
};

/** Het onboardinggesprek, zoals vastgelegd op het gespreksscherm (fictief). */
export const GESPREK = {
  notities:
    "Kickoff met de zes ondernemers samen. Iedereen wil vooral gevonden worden op de loopanalyse in de eigen stad. Groningen en Haarlem hebben de meeste vragen over beginnersgroepen, Twente en Apeldoorn zien groei in trail. Afspraak: geen prijzen in de content, en altijd doorverwijzen bij blessures. Jaargesprek september 2026: HYROX erbij als cluster, trail uitbreiden.",
  contextfactoren: [
    { kind: "nieuwe_dienst", description: "HYROX-trainingen vanuit Zaandam en Haarlem, gestart in augustus 2026.", effective_from: "2026-08-01" },
    { kind: "overig", description: "Nieuw loopanalysesysteem in Tilburg na de verbouwing.", effective_from: "2026-03-01" },
  ],
};
