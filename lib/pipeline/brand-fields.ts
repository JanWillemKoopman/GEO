/**
 * Het merkprofiel als veldenlijst: wat vragen we, waarom, en wie vulde het in?
 *
 * ── WAAROM DIT EEN MODULE IS EN GEEN FORMULIER ──────────────────────────────
 *
 * Dezelfde lijst wordt op vier plekken gebruikt: de wizard rendert hem, de
 * opslagroute valideert ertegen, het afrondingsblok telt hem, en de
 * schrijfprompt leest de uitkomst. Stond de lijst in de JSX, dan zouden die
 * vier uit elkaar lopen zodra er één veld bijkomt.
 *
 * Puur, dus testbaar (conventie 2). Geen `server-only`: de wizard draait in de
 * browser en gebruikt dezelfde definities.
 *
 * ── ZEVEN STAPPEN, EN ALLE 41 VELDEN (17 augustus 2026) ─────────────────────
 *
 * Tot deze ronde stonden hier 27 velden in vijf stappen, en de overige veertien
 * uitsluitend in een tweede scherm ("Profielgegevens", een platte editor met
 * alle 41). Twee schermen, twee opslagroutes en twee menu-items voor dezelfde
 * kolommen, waarvan het ene een deelverzameling van het andere was. De klant
 * die het ene scherm gebruikte kon de veertien velden van het andere niet
 * vinden, en wie beide gebruikte wist niet welk scherm won.
 *
 * De wizardvorm wint, want die is op klantfeedback ontworpen: hij toont per
 * veld waar de waarde vandaan komt, zodat de klant nakijkt in plaats van
 * invult. De veertien losse velden hebben hier een stap gekregen. De indeling
 * volgt die van InSpace Nova, met één toevoeging: Nova heeft geen eigen blok
 * voor "waar je om bekend wilt staan", en dat is juist het blok dat bepaalt wat
 * een AI-assistent over je merk kan zeggen.
 *
 * ⚠️ **41 in, 41 uit.** De zeven stappen dekken exact `EDITABLE_PROFILE_FIELDS`,
 * niets meer en niets minder, en `scripts/test-unit.ts` faalt in beide
 * richtingen. Eén veld dat nergens landt is een veld dat de klant niet meer kan
 * corrigeren, en dat merkt niemand tot de volgende contentronde.
 *
 * ── DRIE LAGEN UITLEG PER VELD, NET ALS NOVA ────────────────────────────────
 *
 * Nova geeft élk onboardingveld een label, een `*Desc` en een `*Placeholder`
 * met een écht voorbeeld erin ("B2B SaaS, E-commerce fashion, Healthcare
 * services"). Dat is drie lagen, en het is het verschil tussen een formulier dat
 * je invult en een formulier dat je begrijpt. Overgenomen.
 *
 * ── HET LABEL "UIT JE WEBSITE GEHAALD" ──────────────────────────────────────
 *
 * Nova's `brand.draftedBadge`. ORBIT ENGINE heeft hiervoor al de gegevens in
 * `profile_field_sources` (migratie 0039): per veld staat er of het van de klant
 * komt, uit het gesprek, of uit het onderzoek. Dit is de plek waar dat zichtbaar
 * wordt voor de klant, en het is de reden dat hij geen leeg formulier van
 * veertig velden ziet maar veertig velden die hij mág nakijken.
 *
 * ⚠️ De sleutel is de kolomnaam in `profiles`. Dat is geen toeval maar de
 * voorwaarde waaronder de herkomstchip werkt: `profile_field_sources.field`
 * bevat diezelfde kolomnaam.
 */
import type { Profile } from "@/lib/types/database";

/** In welke stap van de wizard staat dit veld? */
export type BrandStep =
  | "bedrijf"
  | "merk"
  | "klant"
  | "stem"
  | "woorden"
  | "auteur"
  | "bekend";

export type FieldKind =
  | "tekst"
  | "lange-tekst"
  | "lijst"
  | "schuif"
  | "keuze"
  | "personas";

export interface BrandField {
  /** De kolomnaam in `profiles`. Ook de sleutel in `profile_field_sources`. */
  key: keyof Profile;
  step: BrandStep;
  label: string;
  /** Wat het betekent, één zin. Nova's `*Desc`. */
  description: string;
  /** Een écht voorbeeld, geen herhaling van het label. Nova's `*Placeholder`. */
  placeholder?: string;
  kind: FieldKind;
  /** Bij `schuif` en `keuze`: de standen, op volgorde. Index 0 hoort bij waarde 1. */
  options?: string[];
  /**
   * Bij `keuze`: de waarde die per stand wordt opgeslagen, op dezelfde volgorde
   * als `options`. Zonder deze lijst slaat een `schuif` het nummer op.
   *
   * ⚠️ Deze waarden staan in een database-constraint. Een stand toevoegen zonder
   * de migratie mee te nemen levert een insert op die de database weigert, en de
   * klant ziet dan alleen "opslaan is niet gelukt".
   */
  values?: string[];
  /**
   * Kan de pijplijn dit zelf vinden? Bepaalt of het veld in de wizard als
   * "uit je website gehaald" mag verschijnen, en of een leeg veld erg is.
   */
  derivable: boolean;
}

/**
 * De volledige lijst. Volgorde binnen een stap is de leesvolgorde op het scherm.
 *
 * ⚠️ Velden die al een eigenaar hadden staan er bewust NIET in als tweede
 * kolom: `value_props` is Nova's "value pillars", `proof_points` zijn de
 * "proof points", `intake_audience` is de primaire doelgroep. Zie migratie 0048
 * voor de volledige vertaaltabel.
 */
export const BRAND_FIELDS: BrandField[] = [
  // ── 1. Je bedrijf ─────────────────────────────────────────────────────────
  // De harde feiten waar de meting op draait. `aliases` en `service_regions`
  // zijn hier geen administratie: zonder schrijfwijzen telt een vermelding niet
  // mee, en zonder plaatsnaam gaan de vragen landelijk.
  {
    key: "name",
    step: "bedrijf",
    label: "Naam van je bedrijf",
    description: "Zoals je bedrijf heet. Dit is ook het label van dit merk in ORBIT ENGINE.",
    placeholder: "Van Mossel Automotive",
    kind: "tekst",
    derivable: true,
  },
  {
    key: "aliases",
    step: "bedrijf",
    label: "Andere schrijfwijzen van je naam",
    description:
      "Noemt een AI je als \"Jansen BV\" terwijl je dossier \"Bakkerij Jansen\" zegt, dan telt die vermelding niet mee en valt je score te laag uit.",
    placeholder: "Bakkerij Jansen",
    kind: "lijst",
    derivable: true,
  },
  {
    key: "industry",
    step: "bedrijf",
    label: "In welke categorie zit je",
    description: "De markt waarin je concurreert, in een paar woorden.",
    placeholder: "Autodealer, fysiotherapiepraktijk, B2B-software",
    kind: "tekst",
    derivable: true,
  },
  {
    // Het bedrijfsmodel (R8.5, migratie 0032) stuurt welke vragen de klant bij
    // het schrijven krijgt: een platform of keten heeft geen enkel adres of
    // telefoonnummer, en die vraag verplicht stellen levert een antwoord op dat
    // niet kan kloppen. De klant weet dit beter dan het model.
    key: "business_model",
    step: "bedrijf",
    label: "Wat voor bedrijf je bent",
    description:
      "Bepaalt waar ORBIT ENGINE in je aanbod naar zoekt en welke vragen je krijgt voordat er een pagina geschreven wordt.",
    kind: "keuze",
    options: [
      "Dienstverlener: eigen mensen leveren de dienst",
      "Retailer: verkoopt producten van andere merken",
      "Platform: brengt vraag en aanbod van derden samen",
      "Fabrikant: maakt en verkoopt eigen producten",
      "Overig",
    ],
    values: ["dienstverlener", "retailer", "platform", "fabrikant", "overig"],
    derivable: true,
  },
  {
    key: "service_scope",
    step: "bedrijf",
    label: "Hoe ver je bereik gaat",
    description:
      "Bij 'lokaal' stelt ORBIT ENGINE regionale vragen, en meet je jezelf niet af tegen partijen waar je nooit tegenaan loopt.",
    kind: "keuze",
    options: ["Lokaal", "Landelijk", "Internationaal"],
    values: ["lokaal", "landelijk", "internationaal"],
    derivable: true,
  },
  {
    key: "service_regions",
    step: "bedrijf",
    label: "In welke plaatsen of streken je werkt",
    description: "Gebruikt voor de lokale zoekvragen in de meting.",
    placeholder: "Amersfoort",
    kind: "lijst",
    derivable: true,
  },
  {
    key: "market_language",
    step: "bedrijf",
    label: "Markt en taal",
    description: "Waar je klanten zitten en in welke taal je ze aanspreekt.",
    placeholder: "Nederland en België, Nederlands",
    kind: "tekst",
    derivable: true,
  },
  {
    key: "sitemap_url",
    step: "bedrijf",
    label: "Adres van je sitemap",
    description:
      "Weet je waar je sitemap staat, vul hem dan in. Laat leeg en ORBIT ENGINE zoekt hem zelf via robots.txt en de standaardlocaties.",
    placeholder: "https://voorbeeld.nl/sitemap.xml",
    kind: "tekst",
    derivable: true,
  },

  // ── 2. Je merk ────────────────────────────────────────────────────────────
  {
    key: "brand_mission",
    step: "merk",
    label: "Wat je merk wil bereiken",
    description: "De verandering waar je bedrijf voor bestaat, in één zin.",
    placeholder: "Wij zorgen dat iedereen in de regio zorgeloos kan rijden",
    kind: "lange-tekst",
    derivable: true,
  },
  {
    key: "brand_positioning",
    step: "merk",
    label: "Hoe je je verhoudt tot de rest",
    description: "Hoe je gezien wilt worden naast de alternatieven in je markt.",
    placeholder: "De grootste keuze in de regio, met de service van een familiebedrijf",
    kind: "lange-tekst",
    derivable: true,
  },
  {
    key: "value_props",
    step: "merk",
    label: "Waar je voor staat",
    description: "De uitgangspunten die bepalen hoe je werkt en communiceert.",
    placeholder: "Eerlijk advies",
    kind: "lijst",
    derivable: true,
  },

  // ── 3. Je klant ───────────────────────────────────────────────────────────
  {
    key: "intake_audience",
    step: "klant",
    label: "Voor wie je het vooral doet",
    description: "De groep waar elke tekst op geschreven wordt.",
    placeholder: "Particulieren in Noord-Brabant die een tweede auto zoeken",
    kind: "lange-tekst",
    derivable: true,
  },
  {
    key: "audience_secondary",
    step: "klant",
    label: "En wie je er nog meer mee wilt bereiken",
    description: "Een tweede groep, als die er is. Leeg laten mag.",
    placeholder: "Zzp'ers die een bestelbus willen leasen",
    kind: "lange-tekst",
    derivable: false,
  },
  {
    key: "audience_knowledge_level",
    step: "klant",
    label: "Hoeveel weet je lezer al",
    description:
      "Bepaalt hoeveel een tekst mag aannemen. Bij 'expert' slaat ORBIT ENGINE de basisuitleg over.",
    kind: "schuif",
    options: ["Weinig", "Redelijk wat", "Veel, is vakgenoot"],
    derivable: false,
  },
  {
    key: "personas",
    step: "klant",
    label: "Je klanttypes",
    description:
      "Per type een naam en waar die persoon mee zit. ORBIT ENGINE schrijft een pagina voor één type tegelijk, niet voor iedereen tegelijk.",
    placeholder: "Jonge ouders",
    kind: "personas",
    derivable: true,
  },
  {
    key: "differentiator",
    step: "klant",
    label: "Waarom ze voor jou kiezen en niet voor hen",
    description: "Het verschil dat de doorslag geeft, in de woorden van je klant.",
    placeholder: "Bij ons staat er altijd iemand aan de balie die je herkent",
    kind: "lange-tekst",
    derivable: true,
  },
  {
    key: "competitors",
    step: "klant",
    label: "Met wie je vergeleken wordt",
    description:
      "De partijen waar je klant ook naar kijkt. Clusters vullen dit per onderwerp aan met eigen, specifieke concurrenten.",
    placeholder: "Van Mossel",
    kind: "lijst",
    derivable: true,
  },

  // ── 4. Hoe je klinkt ──────────────────────────────────────────────────────
  {
    key: "tone_formality",
    step: "stem",
    label: "Hoe formeel",
    description: "Van losjes tot zakelijk.",
    kind: "schuif",
    options: ["Informeel", "Tussenin", "Formeel"],
    derivable: false,
  },
  {
    key: "tone_energy",
    step: "stem",
    label: "Hoeveel energie",
    description: "Van rustig en feitelijk tot aanstekelijk.",
    kind: "schuif",
    options: ["Rustig", "Gebalanceerd", "Energiek"],
    derivable: false,
  },
  {
    key: "tone_complexity",
    step: "stem",
    label: "Hoe technisch",
    description: "Hoe diep je teksten de materie in mogen.",
    kind: "schuif",
    options: ["Eenvoudig", "Toegankelijk expert", "Diep expert"],
    derivable: false,
  },
  {
    key: "tone_humor",
    step: "stem",
    label: "Hoeveel humor",
    description: "Van helemaal niet tot speels.",
    kind: "schuif",
    options: ["Geen", "Subtiel", "Speels"],
    derivable: false,
  },
  {
    key: "tone_emotional",
    step: "stem",
    label: "Welke lading",
    description: "Het gevoel dat je teksten meegeven.",
    kind: "schuif",
    options: ["Neutraal", "Geruststellend", "Enthousiast", "Urgent"],
    derivable: false,
  },
  {
    key: "tone_of_voice",
    step: "stem",
    label: "Je merk als persoon",
    description:
      "Beschrijf in een paar zinnen hoe je merk zou klinken als het iemand was. Los van de schuiven hierboven: dit is jouw eigen omschrijving.",
    placeholder: "Een ervaren monteur die het uitlegt zonder je dom te laten voelen",
    kind: "lange-tekst",
    derivable: true,
  },

  // ── 5. Je woorden ─────────────────────────────────────────────────────────
  {
    key: "signature_phrases",
    step: "woorden",
    label: "Uitdrukkingen die van jou zijn",
    description: "Zinnen die je vaker gebruikt en die terug mogen komen.",
    placeholder: "Altijd dichtbij",
    kind: "lijst",
    derivable: true,
  },
  {
    key: "taboo_phrases",
    step: "woorden",
    label: "Woorden die je nooit wilt zien",
    description:
      "ORBIT ENGINE gebruikt ze niet, en controleert na het schrijven of ze er echt niet in staan. Staat er toch een in, dan gaat de pagina terug de kwaliteitscontrole in.",
    placeholder: "goedkoop",
    kind: "lijst",
    derivable: false,
  },
  {
    key: "pronoun_preference",
    step: "woorden",
    label: "Hoe je je lezer aanspreekt",
    description:
      "Geldt voor de teksten die ORBIT ENGINE vóór jou schrijft. ORBIT ENGINE's eigen schermen zeggen altijd 'je'.",
    kind: "keuze",
    options: ["je en jij", "u en uw", "wij en ons"],
    values: ["je", "u", "wij"],
    derivable: false,
  },
  {
    key: "identity_keywords",
    step: "woorden",
    label: "Woorden die bij je horen",
    description: "Termen die je merk kenmerken en die in je teksten terug mogen komen.",
    placeholder: "betrouwbaar, regionaal, vakmanschap",
    kind: "lijst",
    derivable: true,
  },
  {
    key: "compliance_notes",
    step: "woorden",
    label: "Regels waar je aan moet voldoen",
    description:
      "Wettelijke of branche-eisen waar elke tekst rekening mee moet houden (AFM, KOA, medisch). ORBIT ENGINE neemt dit letterlijk mee in de schrijfopdracht.",
    placeholder: "Geen uitspraken over rendement, altijd de kleine lettertjes vermelden",
    kind: "lange-tekst",
    derivable: false,
  },

  // ── 6. Wie het schrijft ───────────────────────────────────────────────────
  {
    key: "author_name",
    step: "auteur",
    label: "Naam",
    description:
      "Moet een echt persoon zijn die bij je werkt en online te vinden is. Een verzonnen auteur werkt averechts.",
    placeholder: "Sanne de Wit",
    kind: "tekst",
    derivable: false,
  },
  {
    key: "author_role",
    step: "auteur",
    label: "Functie",
    description: "Waarom deze persoon hierover kan schrijven.",
    placeholder: "Bedrijfsleider werkplaats",
    kind: "tekst",
    derivable: false,
  },
  {
    key: "author_bio",
    step: "auteur",
    label: "Korte introductie",
    description: "Twee zinnen. Komt onder de artikelen te staan.",
    placeholder: "Sanne werkt sinds 2011 in de werkplaats en leidt daar het onderhoudsteam.",
    kind: "lange-tekst",
    derivable: false,
  },
  {
    key: "author_photo_url",
    step: "auteur",
    label: "Foto",
    description: "Het adres van een portretfoto. Een gezicht bij een naam telt mee als signaal.",
    placeholder: "https://voorbeeld.nl/team/sanne.jpg",
    kind: "tekst",
    derivable: false,
  },
  {
    key: "author_linkedin_url",
    step: "auteur",
    label: "LinkedIn",
    description: "Een vindbaar profiel maakt de auteur controleerbaar.",
    placeholder: "https://linkedin.com/in/…",
    kind: "tekst",
    derivable: false,
  },
  {
    key: "author_facebook_url",
    step: "auteur",
    label: "Facebook",
    description: "Optioneel. Alleen invullen als het profiel publiek en actueel is.",
    placeholder: "https://facebook.com/…",
    kind: "tekst",
    derivable: false,
  },
  {
    key: "author_other_url",
    step: "auteur",
    label: "Nog een profiel",
    description: "Een eigen pagina op je site, een vakblad, of een ander openbaar profiel.",
    placeholder: "https://voorbeeld.nl/over-ons/sanne",
    kind: "tekst",
    derivable: false,
  },

  // ── 7. Waar je om bekend wilt staan ───────────────────────────────────────
  // De stap die Nova niet heeft, en die hier het zwaarst weegt: dit is wat een
  // AI-assistent over je merk kán zeggen. Zonder harde feiten wordt elke tekst
  // algemeen, en algemeen wordt niet geciteerd.
  {
    key: "usp",
    step: "bekend",
    label: "Wat je beter doet dan wie dan ook",
    description: "Het ene ding waarop je wint. Niet drie dingen, één.",
    placeholder: "Als enige in Brabant een eigen schadeherstelbedrijf én verhuur",
    kind: "lange-tekst",
    derivable: true,
  },
  {
    key: "key_messages",
    step: "bekend",
    label: "Wat in elke tekst terug moet komen",
    description: "De kernboodschappen die je overal wilt herhalen.",
    placeholder: "Altijd een vervangende auto",
    kind: "lijst",
    derivable: true,
  },
  {
    key: "proof_points",
    step: "bekend",
    label: "Cijfers die je claims waarmaken",
    description:
      "Harde feiten: aantallen, jaartallen, keurmerken. Dit is wat een AI-assistent aanhaalt; algemene beloftes slaat hij over.",
    placeholder: "Sinds 1934, 9 vestigingen, 400 medewerkers",
    kind: "lijst",
    derivable: true,
  },
  {
    key: "products",
    step: "bekend",
    label: "Je producten en diensten",
    description: "Wat je verkoopt, in de woorden die je klant gebruikt.",
    placeholder: "Onderhoudsbeurt",
    kind: "lijst",
    derivable: true,
  },
  {
    key: "summary",
    step: "bekend",
    label: "Je bedrijf in een alinea",
    description: "De korte samenvatting die ORBIT ENGINE als opening van elk onderzoek gebruikt.",
    placeholder: "Van Mossel is een regionale autodealer met negen vestigingen in Brabant.",
    kind: "lange-tekst",
    derivable: true,
  },
  {
    key: "intake_description",
    step: "bekend",
    label: "Wat je er zelf over kwijt wilt",
    description:
      "Alles wat hierboven niet paste maar wel meetelt. Wat je hier zet blijft staan, ook als het onderzoek opnieuw draait.",
    placeholder: "Wat doen jullie, en wat maakt jullie uniek?",
    kind: "lange-tekst",
    derivable: false,
  },
];

export const STEP_META: Record<BrandStep, { title: string; description: string }> = {
  bedrijf: {
    title: "Je bedrijf",
    description:
      "De harde feiten waar de meting op draait: hoe je heet, waar je werkt, en wat voor bedrijf je bent.",
  },
  merk: {
    title: "Je merk",
    description: "Waar je voor staat. Dit stuurt de toon van alles wat ORBIT ENGINE schrijft.",
  },
  klant: {
    title: "Je klant",
    description: "Voor wie de teksten zijn, en waar je klant je mee vergelijkt.",
  },
  stem: {
    title: "Hoe je klinkt",
    description: "Vijf schuiven bepalen de toon van elke pagina die ORBIT ENGINE maakt.",
  },
  woorden: {
    title: "Je woorden",
    description: "Wat er wél in mag, wat er nooit in mag, en hoe je je lezer aanspreekt.",
  },
  auteur: {
    title: "Wie het schrijft",
    description:
      "Content verschijnt onder een naam. Een vindbaar mens telt mee als betrouwbaarheidssignaal.",
  },
  bekend: {
    title: "Waar je om bekend wilt staan",
    description:
      "De feiten en boodschappen die een AI-assistent over je kan herhalen. Zonder cijfers wordt elke tekst algemeen.",
  },
};

export const STEP_ORDER: BrandStep[] = [
  "bedrijf",
  "merk",
  "klant",
  "stem",
  "woorden",
  "auteur",
  "bekend",
];

export function fieldsOfStep(step: BrandStep): BrandField[] {
  return BRAND_FIELDS.filter((f) => f.step === step);
}

/**
 * Is dit veld gevuld?
 *
 * Één functie voor alle soorten, want "gevuld" betekent per soort iets anders
 * en dat verschil hoort niet bij elke aanroepplek opnieuw uitgeschreven te
 * worden. Een lege string telt niet, een lege lijst telt niet, en 0 bestaat niet
 * bij de schuiven (die lopen vanaf 1).
 */
export function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return value > 0;
  return true;
}

export interface StepProgress {
  step: BrandStep;
  gevuld: number;
  totaal: number;
  /** Alles ingevuld? */
  compleet: boolean;
}

export function stepProgress(profile: Partial<Profile>, step: BrandStep): StepProgress {
  const velden = fieldsOfStep(step);
  const gevuld = velden.filter((f) => isFilled(profile[f.key])).length;
  return {
    step,
    gevuld,
    totaal: velden.length,
    compleet: gevuld === velden.length,
  };
}

export function allProgress(profile: Partial<Profile>): StepProgress[] {
  return STEP_ORDER.map((s) => stepProgress(profile, s));
}

/**
 * Hoeveel van het merkprofiel staat er, in één getal?
 *
 * Voor het afrondingsblok en de wizardrail. Bewust een verhouding van gevulde
 * velden en geen percentage met een cijfer achter de komma: dat suggereert een
 * precisie die er niet is, en `docs/ux-design.md` verbiedt schijnprecisie.
 */
export function overallProgress(profile: Partial<Profile>): {
  gevuld: number;
  totaal: number;
} {
  const gevuld = BRAND_FIELDS.filter((f) => isFilled(profile[f.key])).length;
  return { gevuld, totaal: BRAND_FIELDS.length };
}
