/**
 * Voorbeelden per branche: het formulier praat de taal van de klant.
 *
 * ── WAT HET PROBLEEM WAS ────────────────────────────────────────────────────
 *
 * Van de 56 velden in `brand-fields.ts` hebben er 45 een voorbeeld, en die zijn
 * bijna allemaal geschreven vanuit één fictieve autodealer: "Van Mossel
 * Automotive", "Wij zorgen dat iedereen in de regio zorgeloos kan rijden",
 * "Sinds 1934, 9 vestigingen, 400 medewerkers". Voor een fysiotherapiepraktijk
 * of een advocatenkantoor leest dat als een formulier dat voor iemand anders is
 * gemaakt, en dat is precies het gevoel dat je in een demogesprek niet wilt.
 *
 * ── WAAROM EEN VASTE LIJST EN GEEN AI ───────────────────────────────────────
 *
 * Een voorbeeld per klant laten schrijven kost bijna niets en klinkt
 * aantrekkelijk, maar het botst op de belangrijkste belofte van dit product:
 * niets in beeld dat nergens op gebaseerd is. Een verzonnen voorbeeld dat te
 * echt oogt ("Sinds 1998, drie vestigingen, twaalf therapeuten") laat de klant
 * corrigeren wat wíj bedacht hebben. Een vaste lijst per branche kan dat niet:
 * hij is geschreven, nagelezen en getest, en hij kost niets in gebruik.
 *
 * ── DE INDELING ─────────────────────────────────────────────────────────────
 *
 * Dertien branches plus een algemene terugval. De basis is de brancheindeling
 * van InSpace (E-commerce, Leadgeneratie, Maakindustrie, Financieel, Advocaten,
 * Tandartsen, Zorg, Vastgoed, Automotive, Mode, Sieraden), met drie
 * aanpassingen:
 *
 *   1. **Samengevoegd wat hetzelfde formulier vraagt.** Mode en Sieraden vullen
 *      dezelfde velden in als elke andere webshop, en Tandartsen dezelfde als
 *      elke andere zorgverlener. Hun lijst is gemaakt voor landingspagina's op
 *      zoekwoorden ("Automotive SEO"), niet om een formulier te vullen.
 *   2. **Leadgeneratie is geen branche maar een kanaal.** Wat daar bij hen
 *      onder valt, is bij ons zakelijke dienstverlening.
 *   3. **Zeven branches erbij die het Nederlandse MKB draagt** en die op hun
 *      lijst ontbreken: bouw en installatie, horeca en recreatie, opleiding,
 *      persoonlijke verzorging, transport, software, en zakelijke
 *      dienstverlening. Een installatiebedrijf is in Nederland een
 *      waarschijnlijker klant dan een juwelier.
 *
 * ⚠️ Past een merk in geen enkele branche, dan komen de algemene voorbeelden
 * terug die er altijd al stonden. Nooit een lege plek, en nooit een voorbeeld
 * uit een andere wereld.
 *
 * Puur, dus testbaar zonder database (conventie 2).
 */
import type { Profile } from "@/lib/types/database";

export type BrandCategory =
  | "automotive"
  | "zorg"
  | "juridisch_financieel"
  | "bouw_installatie"
  | "retail"
  | "maakindustrie"
  | "vastgoed"
  | "zakelijke_dienstverlening"
  | "software"
  | "horeca_recreatie"
  | "opleiding"
  | "persoonlijke_verzorging"
  | "transport_logistiek"
  | "algemeen";

/** Hoe de branche heet als hij ergens op het scherm genoemd wordt. */
export const CATEGORY_LABEL: Record<BrandCategory, string> = {
  automotive: "Automotive",
  zorg: "Zorg en gezondheid",
  juridisch_financieel: "Juridisch en financieel",
  bouw_installatie: "Bouw, installatie en techniek",
  retail: "Retail en webshop",
  maakindustrie: "Maakindustrie en groothandel",
  vastgoed: "Vastgoed en makelaardij",
  zakelijke_dienstverlening: "Zakelijke dienstverlening",
  software: "Software en online diensten",
  horeca_recreatie: "Horeca, vrije tijd en toerisme",
  opleiding: "Opleiding en training",
  persoonlijke_verzorging: "Persoonlijke verzorging en sport",
  transport_logistiek: "Transport en logistiek",
  algemeen: "Algemeen",
};

/**
 * Trefwoorden per branche.
 *
 * ⚠️ Het LANGSTE passende trefwoord wint, niet het eerste. Zonder die regel
 * belandt een bouwmarkt bij bouw in plaats van bij retail, en een autoschadeherstel
 * bij schade in plaats van bij automotive. Eén regel in plaats van een
 * zorgvuldig gerangschikte lijst die bij de eerste toevoeging weer omvalt.
 */
const KEYWORDS: Record<Exclude<BrandCategory, "algemeen">, string[]> = {
  automotive: [
    "automotive", "autodealer", "autobedrijf", "autoschade", "autoverhuur",
    "autohandel", "garagebedrijf", "occasion", "apk", "banden", "caravan",
    "camper", "motorfiets", "leasemaatschappij", "schadeherstel", "tweewieler",
  ],
  zorg: [
    "fysiotherapie", "tandarts", "tandheelkunde", "huisarts", "zorg",
    "kliniek", "praktijk voor", "psycholoog", "therapie", "logopedie",
    "podotherapie", "diëtist", "apotheek", "opticien", "audicien",
    "thuiszorg", "verpleging", "orthodont", "dierenarts", "revalidatie",
  ],
  juridisch_financieel: [
    "advocaat", "advocaten", "notaris", "juridisch", "rechtsbijstand",
    "accountant", "boekhouder", "administratiekantoor", "belastingadvies",
    "financieel", "hypotheek", "verzekering", "assurantie", "pensioen",
    "bank", "incasso", "mediation", "fiscaal",
  ],
  bouw_installatie: [
    "installateur", "installatiebedrijf", "loodgieter", "cv-ketel",
    "warmtepomp", "zonnepanelen", "elektricien", "aannemer", "bouwbedrijf",
    "dakdekker", "stukadoor", "timmerbedrijf", "verbouwing", "kozijnen",
    "isolatie", "schilder", "hovenier", "riool", "airco", "klimaat",
  ],
  retail: [
    "webshop", "e-commerce", "ecommerce", "webwinkel", "retail", "winkel",
    "detailhandel", "mode", "kleding", "sieraden", "juwelier", "meubel",
    "wonen", "interieur", "bouwmarkt", "speelgoed", "elektronica",
    "supermarkt", "cadeau", "boekhandel", "sportzaak", "dierenwinkel",
  ],
  maakindustrie: [
    "maakindustrie", "fabrikant", "fabriek", "productiebedrijf", "groothandel",
    "machinebouw", "metaalbewerking", "kunststof", "verpakking", "toelevering",
    "constructie", "assemblage", "industrie", "staal", "chemie",
  ],
  vastgoed: [
    "vastgoed", "makelaar", "makelaardij", "woningverhuur", "verhuurmakelaar",
    "vve-beheer", "vastgoedbeheer", "taxateur", "projectontwikkel",
    "bedrijfsmakelaar", "woningcorporatie", "hypotheekadvies en makelaardij",
  ],
  zakelijke_dienstverlening: [
    "adviesbureau", "consultancy", "consultant", "marketingbureau",
    "reclamebureau", "communicatiebureau", "ontwerpbureau", "recruitment",
    "detachering", "uitzendbureau", "werving", "ingenieursbureau",
    "architectenbureau", "onderzoeksbureau", "interim", "coaching voor",
    "zakelijke dienstverlening", "ict-dienstverlening", "salarisadministratie",
  ],
  software: [
    "software", "saas", "b2b-software", "platform", "app", "applicatie",
    "webdevelopment", "webbureau", "hosting", "cloud", "ai-software",
    "startup", "scale-up", "developer",
  ],
  horeca_recreatie: [
    "restaurant", "horeca", "café", "hotel", "bed and breakfast", "camping",
    "vakantiepark", "recreatie", "toerisme", "catering", "cateraar",
    "bakkerij", "slagerij", "brouwerij", "evenement", "attractiepark",
    "zalenverhuur", "traiteur", "wijnhandel",
  ],
  opleiding: [
    "opleiding", "opleider", "training", "cursus", "onderwijs", "school",
    "rijschool", "bijles", "e-learning", "academie", "workshop",
    "kinderopvang", "trainingsbureau", "examen",
  ],
  persoonlijke_verzorging: [
    "kapsalon", "kapper", "schoonheidssalon", "schoonheidsspecialist",
    "nagelstudio", "barbier", "wellness", "massagesalon", "sportschool",
    "fitness", "yoga", "personal training", "pedicure", "tattoo",
    "huidverzorging", "beauty",
  ],
  transport_logistiek: [
    "transport", "logistiek", "expediteur", "koeriersdienst", "verhuisbedrijf",
    "verhuizer", "opslag", "distributie", "vervoer", "taxibedrijf",
    "touringcar", "scheepvaart", "warehouse", "fulfilment",
  ],
};

/** Alle trefwoorden op lengte, langste eerst. Eén keer opgebouwd. */
const SORTED_KEYWORDS: { woord: string; categorie: BrandCategory }[] = Object.entries(
  KEYWORDS,
)
  .flatMap(([categorie, woorden]) =>
    woorden.map((woord) => ({ woord, categorie: categorie as BrandCategory })),
  )
  .sort((a, b) => b.woord.length - a.woord.length);

/**
 * De terugval per bedrijfsmodel, als de branchetekst niets oplevert.
 *
 * Niet perfect en dat hoeft ook niet: "een fabrikant lijkt meer op een
 * fabrikant dan op niets". Alleen als ook dit niets oplevert komen de algemene
 * voorbeelden terug.
 */
const BY_BUSINESS_MODEL: Record<string, BrandCategory> = {
  retailer: "retail",
  fabrikant: "maakindustrie",
  platform: "software",
};

/**
 * In welke branche valt dit merk?
 *
 * Kijkt naar de branchetekst uit het onderzoek en naar de bedrijfsnaam. Die
 * tweede is geen luxe: "Installatiebedrijf Van Dijk" zegt het al in zijn naam,
 * ook als het onderzoek er "technische dienstverlening" van maakte.
 */
export function categoryOf(input: {
  industry?: string | null;
  businessModel?: string | null;
  name?: string | null;
}): BrandCategory {
  const tekst = `${input.industry ?? ""} ${input.name ?? ""}`.toLowerCase();

  if (tekst.trim()) {
    const treffer = SORTED_KEYWORDS.find((k) => tekst.includes(k.woord));
    if (treffer) return treffer.categorie;
  }

  return BY_BUSINESS_MODEL[input.businessModel ?? ""] ?? "algemeen";
}

/**
 * De voorbeelden per branche, per veld.
 *
 * ── WELKE VELDEN, EN WAAROM NIET ALLE 45 ────────────────────────────────────
 *
 * Eenentwintig velden, gekozen op één vraag: verandert het antwoord wezenlijk
 * per branche? Een sitemapadres, een LinkedIn-profiel en een plaatsnaam zien er
 * bij een tandarts hetzelfde uit als bij een garage, en daar een tweede
 * voorbeeld voor schrijven levert onderhoud op zonder opbrengst. Een veld dat
 * hier ontbreekt houdt gewoon het algemene voorbeeld uit `brand-fields.ts`.
 *
 * ⚠️ Bedrijfsnamen in de voorbeelden zijn VERZONNEN. Een echte naam in een grijs
 * voorbeeldveld leest als een aanbeveling of een vergelijking, en bij
 * `competitors` zou het bovendien betekenen dat wij een concurrent voorzeggen.
 */
type FieldExamples = Partial<Record<keyof Profile, string>>;

const EXAMPLES: Record<Exclude<BrandCategory, "algemeen">, FieldExamples> = {
  // ── Automotive ────────────────────────────────────────────────────────────
  automotive: {
    name: "Autobedrijf De Vries",
    industry: "Autodealer, universeel garagebedrijf, schadeherstel",
    tone_of_voice: "Een ervaren monteur die het uitlegt zonder je dom te laten voelen",
    brand_mission: "Wij zorgen dat iedereen in de regio zorgeloos blijft rijden",
    differentiator: "Bij ons staat er altijd iemand aan de balie die je herkent",
    competitors: "Autopalace Zuid",
    intake_audience:
      "Particulieren uit de regio die hun auto laten onderhouden waar ze hem gekocht hebben",
    taboo_phrases: "goedkoop",
    compliance_notes:
      "Prijzen altijd inclusief btw, en bij een occasion de exacte uitvoering en kilometerstand erbij",
    author_role: "Bedrijfsleider werkplaats",
    usp: "Als enige in de regio eigen schadeherstel én vervangend vervoer",
    key_messages: "Altijd een vervangende auto",
    proof_points: "Sinds 1978, 9 monteurs, 4.000 onderhoudsbeurten per jaar",
    products: "Onderhoudsbeurt, APK, schadeherstel, occasions",
    priority_offerings: "Onderhoudsabonnementen",
    deprioritised_offerings: "Losse bandenwissel",
    target_segments: "Zakelijke rijders met een auto op naam van de zaak",
    seasonality: "Piek bij de bandenwissel in oktober en april, rustig in de zomervakantie",
    sales_objections: "Bij een dealer ben je altijd duurder dan bij de garage om de hoek",
    offline_proof: "Erkend schadeherstelbedrijf sinds 2011",
    goal_12m:
      "De vanzelfsprekende keuze voor onderhoud in onze regio, ook voor wie zijn auto elders kocht",
  },

  // ── Zorg en gezondheid ────────────────────────────────────────────────────
  zorg: {
    name: "Fysiopraktijk Het Anker",
    industry: "Fysiotherapiepraktijk, tandartspraktijk, huisartsenpraktijk",
    tone_of_voice: "Een behandelaar die de tijd neemt en niets belangrijker maakt dan het is",
    brand_mission: "Wij zorgen dat mensen weer kunnen wat ze willen kunnen",
    differentiator: "Je ziet bij ons elke afspraak dezelfde behandelaar",
    competitors: "Gezondheidscentrum De Brug",
    intake_audience: "Mensen uit de buurt met klachten die hun dagelijks leven in de weg zitten",
    taboo_phrases: "gegarandeerd resultaat",
    compliance_notes:
      "Geen beloftes over genezing of resultaat, geen medisch advies in algemene teksten, en verwijs bij klachten altijd naar een afspraak",
    author_role: "Fysiotherapeut en praktijkhouder",
    usp: "De enige praktijk in de regio met bekkenfysiotherapie én zwangerschapsbegeleiding",
    key_messages: "Binnen een week terecht, ook zonder verwijzing",
    proof_points: "Sinds 2009, 12 behandelaars, aangesloten bij het kwaliteitsregister",
    products: "Fysiotherapie, manuele therapie, sportrevalidatie, bekkenfysiotherapie",
    priority_offerings: "Sportrevalidatie",
    deprioritised_offerings: "Losse massages",
    target_segments: "Hardlopers en amateursporters die na een blessure terug willen",
    seasonality: "Piek in januari en na de zomer, rustig in de vakantieweken",
    sales_objections: "Wordt dat wel vergoed door mijn verzekering?",
    offline_proof: "Aangesloten bij het kwaliteitsregister sinds 2012",
    goal_12m: "De praktijk waar de regio aan denkt bij sportblessures",
  },

  // ── Juridisch en financieel ───────────────────────────────────────────────
  juridisch_financieel: {
    name: "Van Rijn Advocaten",
    industry: "Advocatenkantoor, accountantskantoor, hypotheekadvies",
    tone_of_voice: "Een adviseur die in gewone taal uitlegt wat er op het spel staat",
    brand_mission: "Wij zorgen dat een ondernemer weet waar hij aan toe is voordat het misgaat",
    differentiator: "Je spreekt bij ons altijd de specialist zelf, niet een assistent",
    competitors: "De Boer en Partners",
    intake_audience: "Ondernemers in het MKB die een vraag hebben waar ze zelf niet uitkomen",
    taboo_phrases: "gegarandeerd",
    compliance_notes:
      "Geen uitspraken over de afloop van een zaak of over rendement, geen advies zonder voorbehoud, en altijd verwijzen naar een gesprek",
    author_role: "Advocaat arbeidsrecht",
    usp: "Het enige kantoor in de regio dat arbeidsrecht en ondernemingsrecht onder één dak heeft",
    key_messages: "Een vast tarief afgesproken vooraf, geen verrassingen achteraf",
    proof_points: "Sinds 1996, 8 advocaten, gemiddeld binnen twee dagen een eerste reactie",
    products: "Arbeidsrecht, ondernemingsrecht, contracten, incasso",
    priority_offerings: "Vaste juridische begeleiding op abonnement",
    deprioritised_offerings: "Losse contractcontroles",
    target_segments: "Groeiende bedrijven van 10 tot 50 medewerkers zonder eigen jurist",
    seasonality: "Piek rond het einde van het boekjaar en bij reorganisaties in het najaar",
    sales_objections: "Een advocaat inschakelen is meteen duur",
    offline_proof: "Gespecialiseerd lid van de vereniging arbeidsrecht sinds 2015",
    goal_12m: "Het eerste kantoor waar een MKB-ondernemer in de regio aan denkt bij personeelszaken",
  },

  // ── Bouw, installatie en techniek ─────────────────────────────────────────
  bouw_installatie: {
    name: "Installatiebedrijf Van Dijk",
    industry: "Installatiebedrijf, aannemer, elektrotechniek",
    tone_of_voice: "Een vakman die zegt wat er nodig is en wat het gaat kosten",
    brand_mission: "Wij zorgen dat een huis warm, veilig en zuinig is",
    differentiator: "Wij komen zelf kijken voordat we een prijs noemen",
    competitors: "Techniek Groep Midden",
    intake_audience: "Huiseigenaren in de regio die hun installatie willen vervangen of verduurzamen",
    taboo_phrases: "vanaf",
    compliance_notes:
      "Bij subsidies altijd de voorwaarden en het jaartal erbij, en geen besparingsbedragen noemen zonder de aannames",
    author_role: "Werkvoorbereider en installateur",
    usp: "Als enige in de regio eigen monteurs voor zowel warmtepompen als zonnepanelen",
    key_messages: "Binnen 24 uur een monteur bij een storing",
    proof_points: "Sinds 1994, 22 monteurs, gemiddeld 4,7 op Google uit 180 beoordelingen",
    products: "Warmtepompen, cv-installatie, zonnepanelen, onderhoud en storingsdienst",
    priority_offerings: "Warmtepompen",
    deprioritised_offerings: "Losse kraanreparaties",
    target_segments: "Woningeigenaren met een huis van vóór 1990 dat toe is aan verduurzaming",
    seasonality: "Piek in het najaar bij de eerste kou, offertes komen binnen vanaf augustus",
    sales_objections: "Zo'n warmtepomp verdient zich toch nooit terug?",
    offline_proof: "Erkend installateur en gecertificeerd voor F-gassen sinds 2016",
    goal_12m: "De installateur die in de regio als eerste genoemd wordt bij verduurzaming",
  },

  // ── Retail en webshop ─────────────────────────────────────────────────────
  retail: {
    name: "Huis en Haard Wonen",
    industry: "Webshop in woonaccessoires, modewinkel, speciaalzaak",
    tone_of_voice: "Een verkoper met verstand van zaken die je niets aanpraat",
    brand_mission: "Wij zorgen dat je thuis krijgt wat je in de winkel had verwacht",
    differentiator: "Wij hebben het echt op voorraad, dus je hebt het morgen in huis",
    competitors: "Wonen Direct",
    intake_audience: "Particulieren die online kopen maar wel advies willen voordat ze bestellen",
    taboo_phrases: "laagste prijs",
    compliance_notes:
      "Prijzen inclusief btw en verzendkosten, en de bedenktijd van veertien dagen altijd noemen",
    author_role: "Inkoper en productspecialist",
    usp: "Het grootste voorraadassortiment in ons segment, meer dan 4.000 artikelen op voorraad",
    key_messages: "Voor 22:00 besteld, morgen in huis",
    proof_points: "Sinds 2013, 4.000 artikelen op voorraad, 9,1 op Kiyoh uit 2.400 beoordelingen",
    products: "Verlichting, meubels, woontextiel, decoratie",
    priority_offerings: "Eigen merk verlichting",
    deprioritised_offerings: "Kleine accessoires onder de tien euro",
    target_segments: "Mensen die net verhuisd zijn en hun hele huis in één keer inrichten",
    seasonality: "Piek van oktober tot december, dal in juli en augustus",
    sales_objections: "Online kan ik het niet zien of voelen",
    offline_proof: "Aangesloten bij Thuiswinkel Waarborg sinds 2015",
    goal_12m: "De webshop die als eerste genoemd wordt bij wie zijn interieur wil vernieuwen",
  },

  // ── Maakindustrie en groothandel ──────────────────────────────────────────
  maakindustrie: {
    name: "Metaalwerken Noord",
    industry: "Machinebouw, metaalbewerking, technische groothandel",
    tone_of_voice: "Een technisch specialist die weet dat zijn lezer het vak kent",
    brand_mission: "Wij zorgen dat de productielijn van onze klant blijft draaien",
    differentiator: "Wij tekenen, maken en monteren het zelf, dus er zit geen schakel tussen",
    competitors: "Industrie Techniek Oost",
    intake_audience: "Technische inkopers en werkvoorbereiders bij producerende bedrijven",
    taboo_phrases: "standaard",
    compliance_notes:
      "Bij machines altijd de geldende norm en CE-markering noemen, en nooit specificaties zonder tolerantie",
    author_role: "Hoofd engineering",
    usp: "Van tekening tot montage binnen zes weken, ook bij enkelstuks",
    key_messages: "Eén aanspreekpunt van ontwerp tot oplevering",
    proof_points: "Sinds 1968, 45 medewerkers, ISO 9001 gecertificeerd",
    products: "Machinebouw, plaatbewerking, lasconstructies, onderhoud",
    priority_offerings: "Onderhoudscontracten op geleverde machines",
    deprioritised_offerings: "Losse lasklussen",
    target_segments: "Producenten in de voedingsmiddelenindustrie met eigen technische dienst",
    seasonality: "Investeringen worden vaak in het vierde kwartaal beslist en in het eerste uitgevoerd",
    sales_objections: "Jullie zijn duurder dan een leverancier uit het buitenland",
    offline_proof: "ISO 9001 gecertificeerd sinds 2004",
    goal_12m: "De vaste partner voor machinebouw bij vijf grote producenten in Noord-Nederland",
  },

  // ── Vastgoed en makelaardij ───────────────────────────────────────────────
  vastgoed: {
    name: "Sterk Makelaardij",
    industry: "Makelaardij, vastgoedbeheer, verhuurbemiddeling",
    tone_of_voice: "Een makelaar die eerlijk zegt wat een huis waard is, ook als dat tegenvalt",
    brand_mission: "Wij zorgen dat verhuizen een goede beslissing wordt in plaats van een gok",
    differentiator: "Wij doen de bezichtiging altijd zelf, nooit een collega die het huis niet kent",
    competitors: "Woonhuis Makelaars",
    intake_audience: "Mensen in de regio die hun huis verkopen en tegelijk iets anders zoeken",
    taboo_phrases: "unieke kans",
    compliance_notes:
      "Geen uitspraken over waardestijging, en bij vraagprijzen altijd de peildatum erbij",
    author_role: "Register makelaar en taxateur",
    usp: "De enige in de regio met een eigen taxateur in dienst",
    key_messages: "Gemiddeld binnen 21 dagen verkocht",
    proof_points: "Sinds 2004, 900 woningen verkocht, gemiddeld 21 dagen op de markt",
    products: "Verkoopbegeleiding, aankoopbegeleiding, taxaties, verhuur",
    priority_offerings: "Aankoopbegeleiding",
    deprioritised_offerings: "Losse taxaties voor derden",
    target_segments: "Doorstromers met een woning boven de vier ton",
    seasonality: "Piek in het voorjaar, tweede piek in september, dal rond de kerst",
    sales_objections: "Een makelaar kost me tienduizend euro, dat doe ik zelf ook wel",
    offline_proof: "Aangesloten bij NVM sinds 2006",
    goal_12m: "De makelaar die in onze gemeente als eerste genoemd wordt bij verkoop",
  },

  // ── Zakelijke dienstverlening ─────────────────────────────────────────────
  zakelijke_dienstverlening: {
    name: "Koers Adviesgroep",
    industry: "Adviesbureau, marketingbureau, detachering",
    tone_of_voice: "Een adviseur die doorvraagt voordat hij met een oplossing komt",
    brand_mission: "Wij zorgen dat een organisatie de keuze maakt die ze zelf niet durfde te maken",
    differentiator: "Wij leveren geen rapport maar blijven tot het ingevoerd is",
    competitors: "Bureau Vooruit",
    intake_audience: "Directeuren en managers bij organisaties van 50 tot 500 medewerkers",
    taboo_phrases: "synergie",
    compliance_notes:
      "Geen namen van opdrachtgevers zonder toestemming, en geen cijfers uit een opdracht in een publieke tekst",
    author_role: "Partner en organisatieadviseur",
    usp: "Wij zetten geen adviseur in die zelf nooit in de uitvoering heeft gestaan",
    key_messages: "Binnen zes weken van analyse naar eerste resultaat",
    proof_points: "Sinds 2011, 14 adviseurs, gemiddeld 8,7 als opdrachtgeverscijfer",
    products: "Organisatieadvies, procesbegeleiding, interim-management, training",
    priority_offerings: "Meerjarige begeleidingstrajecten",
    deprioritised_offerings: "Losse workshops van een dagdeel",
    target_segments: "Familiebedrijven die voor een opvolging staan",
    seasonality: "Trajecten starten meestal in januari en september",
    sales_objections: "Een adviseur vertelt ons wat we zelf al weten",
    offline_proof: "Drie jaar op rij begeleider van hetzelfde familiebedrijf, met naam op aanvraag",
    goal_12m: "Bekendstaan als het bureau voor opvolging in familiebedrijven",
  },

  // ── Software en online diensten ───────────────────────────────────────────
  software: {
    name: "Planbase",
    industry: "B2B-software, SaaS-platform, online dienst",
    tone_of_voice: "Een productspecialist die laat zien in plaats van belooft",
    brand_mission: "Wij zorgen dat een team stopt met bijhouden in spreadsheets",
    differentiator: "Je bent bij ons binnen een dag live, zonder implementatietraject",
    competitors: "Flowdesk",
    intake_audience: "Operationeel managers die een proces beheren dat nu in Excel staat",
    taboo_phrases: "revolutionair",
    compliance_notes:
      "Bij persoonsgegevens altijd verwijzen naar de verwerkersovereenkomst, en geen beveiligingsclaims zonder certificering",
    author_role: "Productmanager",
    usp: "De enige die koppelt met de vier pakketten die deze branche echt gebruikt",
    key_messages: "Geen implementatiekosten, opzeggen per maand",
    proof_points: "Sinds 2019, 640 bedrijven, 99,9% beschikbaarheid over het afgelopen jaar",
    products: "Planningsmodule, urenregistratie, facturatie, koppelingen",
    priority_offerings: "Jaarabonnementen op het volledige pakket",
    deprioritised_offerings: "Maatwerkkoppelingen voor één klant",
    target_segments: "Installatie- en servicebedrijven met 10 tot 50 monteurs in de buitendienst",
    seasonality: "Nieuwe klanten starten vooral in januari en direct na de zomer",
    sales_objections: "Overstappen kost ons te veel tijd",
    offline_proof: "ISO 27001 gecertificeerd sinds 2023",
    goal_12m: "Het standaardpakket voor planning bij installatiebedrijven in Nederland",
  },

  // ── Horeca, vrije tijd en toerisme ────────────────────────────────────────
  horeca_recreatie: {
    name: "Herberg de Linde",
    industry: "Restaurant, hotel, vakantiepark, cateraar",
    tone_of_voice: "Een gastheer die je welkom heet zonder overdreven te doen",
    brand_mission: "Wij zorgen dat mensen even helemaal weg zijn van hun dag",
    differentiator: "Wij koken alles zelf, ook het brood en de desserts",
    competitors: "Het Ruiterhuis",
    intake_audience: "Mensen uit de omgeving die uit eten gaan voor een gelegenheid",
    taboo_phrases: "ambiance",
    compliance_notes:
      "Allergenen altijd volledig vermelden, en bij prijzen het bedrag per persoon inclusief btw",
    author_role: "Gastheer en eigenaar",
    usp: "De enige in het dorp met een eigen kweektuin achter het pand",
    key_messages: "Alles vers, elke dag, uit de eigen keuken",
    proof_points: "Sinds 1987, 90 zitplaatsen, 4,6 op Google uit 1.100 beoordelingen",
    products: "Restaurant, zaalverhuur, catering, arrangementen met overnachting",
    priority_offerings: "Zakelijke arrangementen en zaalverhuur",
    deprioritised_offerings: "Afhaalmaaltijden",
    target_segments: "Bedrijven uit de regio die een teamdag of een jubileum organiseren",
    seasonality: "Piek van mei tot september en in december, dal in januari en februari",
    sales_objections: "Voor een groep zijn jullie te duur",
    offline_proof: "Vermeld in de streekgids voor duurzame keukens sinds 2021",
    goal_12m: "De plek waar bedrijven uit de regio hun personeelsdag boeken",
  },

  // ── Opleiding en training ─────────────────────────────────────────────────
  opleiding: {
    name: "Vakschool Praktijk",
    industry: "Opleider, trainingsbureau, rijschool, cursusaanbieder",
    tone_of_voice: "Een docent die uitlegt tot je het snapt en niet tot hij het gezegd heeft",
    brand_mission: "Wij zorgen dat iemand na afloop echt iets kan wat hij eerst niet kon",
    differentiator: "Onze docenten staan zelf nog in het vak waarin ze lesgeven",
    competitors: "Leerpunt Opleidingen",
    intake_audience: "Werkenden die zich willen omscholen zonder te stoppen met werken",
    taboo_phrases: "gegarandeerd geslaagd",
    compliance_notes:
      "Bij slagingspercentages altijd het jaar en het aantal deelnemers erbij, en geen uitspraken over baankansen",
    author_role: "Hoofddocent",
    usp: "De enige in de regio met avondopleidingen die in vier maanden afgerond zijn",
    key_messages: "Les in groepen van maximaal twaalf",
    proof_points: "Sinds 2008, 3.400 geslaagden, gemiddeld 8,4 als deelnemerscijfer",
    products: "Vakopleidingen, bijscholing, incompanytrainingen, examentraining",
    priority_offerings: "Incompanytrainingen voor bedrijven",
    deprioritised_offerings: "Losse avondworkshops",
    target_segments: "Werkgevers die hun monteurs willen bijscholen op nieuwe techniek",
    seasonality: "Inschrijvingen piek in augustus en januari, dal in de zomervakantie",
    sales_objections: "Mijn mensen kunnen er niet een hele dag uit",
    offline_proof: "Erkend opleider volgens de branchenorm sinds 2014",
    goal_12m: "De opleider die werkgevers in de regio als eerste bellen bij bijscholing",
  },

  // ── Persoonlijke verzorging en sport ──────────────────────────────────────
  persoonlijke_verzorging: {
    name: "Studio Puur",
    industry: "Kapsalon, schoonheidssalon, sportschool, wellness",
    tone_of_voice: "Iemand die je op je gemak stelt en niets opdringt",
    brand_mission: "Wij zorgen dat je met een beter gevoel de deur uitgaat dan je binnenkwam",
    differentiator: "Je krijgt bij ons altijd dezelfde specialist, ook als je een jaar wegblijft",
    competitors: "Salon Belle",
    intake_audience: "Mensen uit de buurt die vaste klant willen worden, geen eenmalige afspraak",
    taboo_phrases: "anti-aging",
    compliance_notes:
      "Geen medische claims over huid of gewicht, en bij behandelingen altijd de duur en de prijs erbij",
    author_role: "Salonhouder en specialist",
    usp: "De enige salon in de omgeving die zowel huidverbetering als permanente ontharing doet",
    key_messages: "Altijd een gratis intake voordat je iets afspreekt",
    proof_points: "Sinds 2015, 6 specialisten, 4,9 op Google uit 640 beoordelingen",
    products: "Knippen en kleuren, huidbehandelingen, massages, abonnementen",
    priority_offerings: "Behandelabonnementen",
    deprioritised_offerings: "Losse producten aan de balie",
    target_segments: "Vrouwen van 35 tot 55 die maandelijks terugkomen",
    seasonality: "Piek voor de feestdagen en in mei, dal in januari",
    sales_objections: "Dat is veel geld voor iets waar ik niet zeker van ben",
    offline_proof: "Gecertificeerd voor huidverbetering volgens de branchenorm sinds 2019",
    goal_12m: "De salon waar de buurt aan denkt bij huidverbetering",
  },

  // ── Transport en logistiek ────────────────────────────────────────────────
  transport_logistiek: {
    name: "Van Es Transport",
    industry: "Transportbedrijf, logistiek dienstverlener, verhuisbedrijf",
    tone_of_voice: "Een planner die zegt wanneer het er is en zich daaraan houdt",
    brand_mission: "Wij zorgen dat een lading aankomt op het moment dat het uitkomt",
    differentiator: "Wij rijden met eigen chauffeurs, dus je krijgt elke week hetzelfde gezicht",
    competitors: "Rijnvracht Logistiek",
    intake_audience: "Logistiek verantwoordelijken bij producenten en groothandels",
    taboo_phrases: "onvertraagd",
    compliance_notes:
      "Bij levertijden altijd de voorwaarde erbij, en geen uitspraken over aansprakelijkheid buiten de vervoersvoorwaarden",
    author_role: "Planner en teamleider transport",
    usp: "Als enige in de regio eigen opslag én dagelijks vervoer naar Duitsland",
    key_messages: "Vandaag geladen, morgen gelost",
    proof_points: "Sinds 1991, 34 trekkers, 98,6% op tijd geleverd in het afgelopen jaar",
    products: "Wegtransport, opslag, distributie, verhuizingen",
    priority_offerings: "Vaste distributieritten op contract",
    deprioritised_offerings: "Losse spoedritten",
    target_segments: "Producenten die wekelijks naar dezelfde regio in Duitsland rijden",
    seasonality: "Piek in het najaar richting de feestdagen, dal in juli",
    sales_objections: "Jullie zijn duurder per rit dan een chauffeur die zich aanbiedt",
    offline_proof: "Aangesloten bij de brancheorganisatie en gecertificeerd voor voedseltransport",
    goal_12m: "De vaste vervoerder voor tien producenten in onze regio",
  },
};

/**
 * Alle voorbeelden voor dit merk, als kaart van kolomnaam naar voorbeeldtekst.
 *
 * Bevat alleen de velden waar deze branche een eigen voorbeeld voor heeft. Wat
 * er niet in staat houdt het algemene voorbeeld uit `brand-fields.ts`, en dat is
 * de bedoeling: één plek waar de algemene tekst staat, en hier alleen wat er
 * echt anders is.
 */
export function examplesFor(profile: {
  industry: string | null;
  business_model: string | null;
  name: string | null;
  brand_name: string | null;
}): Record<string, string> {
  const categorie = categoryOf({
    industry: profile.industry,
    businessModel: profile.business_model,
    name: profile.brand_name ?? profile.name,
  });
  if (categorie === "algemeen") return {};
  return EXAMPLES[categorie] as Record<string, string>;
}

/** Voor de test en voor het scherm: hoeveel velden heeft deze branche eigen? */
export function exampleCount(categorie: BrandCategory): number {
  return categorie === "algemeen" ? 0 : Object.keys(EXAMPLES[categorie]).length;
}

export const CATEGORIES: BrandCategory[] = [
  ...(Object.keys(KEYWORDS) as Exclude<BrandCategory, "algemeen">[]),
  "algemeen",
];
