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
 * ── DRIE LAGEN UITLEG PER VELD, NET ALS NOVA ────────────────────────────────
 *
 * Nova geeft élk onboardingveld een label, een `*Desc` en een `*Placeholder`
 * met een écht voorbeeld erin ("B2B SaaS, E-commerce fashion, Healthcare
 * services"). Dat is drie lagen, en het is het verschil tussen een formulier dat
 * je invult en een formulier dat je begrijpt. Overgenomen.
 *
 * ── HET LABEL "UIT JE WEBSITE GEHAALD" ──────────────────────────────────────
 *
 * Nova's `brand.draftedBadge`. Aura heeft hiervoor al de gegevens in
 * `profile_field_sources` (migratie 0039): per veld staat er of het van de klant
 * komt, uit het gesprek, of uit het onderzoek. Dit is de plek waar dat zichtbaar
 * wordt voor de klant, en het is de reden dat hij geen leeg formulier van
 * veertig velden ziet maar veertig velden die hij mág nakijken.
 */
import type { Profile } from "@/lib/types/database";

/** In welke stap van de wizard staat dit veld? */
export type BrandStep = "fundament" | "doelgroep" | "stem" | "woorden" | "auteur";

export type FieldKind = "tekst" | "lange-tekst" | "lijst" | "schuif" | "keuze";

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
  // ── Fundament ─────────────────────────────────────────────────────────────
  {
    key: "industry",
    step: "fundament",
    label: "In welke categorie zit je",
    description: "De markt waarin je concurreert, in een paar woorden.",
    placeholder: "Autodealer, fysiotherapiepraktijk, B2B-software",
    kind: "tekst",
    derivable: true,
  },
  {
    key: "brand_mission",
    step: "fundament",
    label: "Wat je merk wil bereiken",
    description: "De verandering waar je bedrijf voor bestaat, in één zin.",
    placeholder: "Wij zorgen dat iedereen in de regio zorgeloos kan rijden",
    kind: "lange-tekst",
    derivable: true,
  },
  {
    key: "brand_positioning",
    step: "fundament",
    label: "Hoe je je verhoudt tot de rest",
    description: "Hoe je gezien wilt worden naast de alternatieven in je markt.",
    placeholder: "De grootste keuze in de regio, met de service van een familiebedrijf",
    kind: "lange-tekst",
    derivable: true,
  },
  {
    key: "usp",
    step: "fundament",
    label: "Wat je beter doet dan wie dan ook",
    description: "Het ene ding waarop je wint. Niet drie dingen, één.",
    placeholder: "Als enige in Brabant een eigen schadeherstelbedrijf én verhuur",
    kind: "lange-tekst",
    derivable: true,
  },
  {
    key: "value_props",
    step: "fundament",
    label: "Waar je voor staat",
    description: "De uitgangspunten die bepalen hoe je werkt en communiceert.",
    placeholder: "Eerlijk advies",
    kind: "lijst",
    derivable: true,
  },
  {
    key: "key_messages",
    step: "fundament",
    label: "Wat in elke tekst terug moet komen",
    description: "De kernboodschappen die je overal wilt herhalen.",
    placeholder: "Altijd een vervangende auto",
    kind: "lijst",
    derivable: true,
  },
  {
    key: "proof_points",
    step: "fundament",
    label: "Cijfers die je claims waarmaken",
    description:
      "Harde feiten: aantallen, jaartallen, keurmerken. Dit is wat een AI-assistent aanhaalt; algemene beloftes slaat hij over.",
    placeholder: "Sinds 1934, 9 vestigingen, 400 medewerkers",
    kind: "lijst",
    derivable: true,
  },
  {
    key: "identity_keywords",
    step: "fundament",
    label: "Woorden die bij je horen",
    description: "Termen die je merk kenmerken en die in je teksten terug mogen komen.",
    placeholder: "betrouwbaar, regionaal, vakmanschap",
    kind: "lijst",
    derivable: true,
  },

  // ── Doelgroep ─────────────────────────────────────────────────────────────
  {
    key: "intake_audience",
    step: "doelgroep",
    label: "Voor wie je het vooral doet",
    description: "De groep waar elke tekst op geschreven wordt.",
    placeholder: "Particulieren in Noord-Brabant die een tweede auto zoeken",
    kind: "lange-tekst",
    derivable: true,
  },
  {
    key: "audience_secondary",
    step: "doelgroep",
    label: "En wie je er nog meer mee wilt bereiken",
    description: "Een tweede groep, als die er is. Leeg laten mag.",
    placeholder: "Zzp'ers die een bestelbus willen leasen",
    kind: "lange-tekst",
    derivable: false,
  },
  {
    key: "audience_knowledge_level",
    step: "doelgroep",
    label: "Hoeveel weet je lezer al",
    description:
      "Bepaalt hoeveel een tekst mag aannemen. Bij 'expert' slaat Aura de basisuitleg over.",
    kind: "schuif",
    options: ["Weinig", "Redelijk wat", "Veel, is vakgenoot"],
    derivable: false,
  },
  {
    key: "competitors",
    step: "doelgroep",
    label: "Met wie je vergeleken wordt",
    description: "De partijen waar je klant ook naar kijkt.",
    placeholder: "Van Mossel",
    kind: "lijst",
    derivable: true,
  },
  {
    key: "differentiator",
    step: "doelgroep",
    label: "Waarom ze voor jou kiezen en niet voor hen",
    description: "Het verschil dat de doorslag geeft, in de woorden van je klant.",
    placeholder: "Bij ons staat er altijd iemand aan de balie die je herkent",
    kind: "lange-tekst",
    derivable: true,
  },

  // ── Stem ──────────────────────────────────────────────────────────────────
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
    description: "Beschrijf in een paar zinnen hoe je merk zou klinken als het iemand was.",
    placeholder: "Een ervaren monteur die het uitlegt zonder je dom te laten voelen",
    kind: "lange-tekst",
    derivable: true,
  },

  // ── Woorden ───────────────────────────────────────────────────────────────
  {
    key: "pronoun_preference",
    step: "woorden",
    label: "Hoe je je lezer aanspreekt",
    description:
      "Geldt voor de teksten die Aura vóór jou schrijft. Aura's eigen schermen zeggen altijd 'je'.",
    kind: "keuze",
    options: ["je en jij", "u en uw", "wij en ons"],
    derivable: false,
  },
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
      "Aura gebruikt ze niet, en controleert na het schrijven of ze er echt niet in staan.",
    placeholder: "goedkoop",
    kind: "lijst",
    derivable: false,
  },
  {
    key: "compliance_notes",
    step: "woorden",
    label: "Regels waar je aan moet voldoen",
    description: "Wettelijke of branche-eisen waar elke tekst rekening mee moet houden.",
    placeholder: "Geen uitspraken over rendement, altijd de kleine lettertjes vermelden",
    kind: "lange-tekst",
    derivable: false,
  },

  // ── Auteur ────────────────────────────────────────────────────────────────
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
    key: "author_linkedin_url",
    step: "auteur",
    label: "LinkedIn",
    description: "Een vindbaar profiel maakt de auteur controleerbaar.",
    placeholder: "https://linkedin.com/in/…",
    kind: "tekst",
    derivable: false,
  },
];

export const STEP_META: Record<
  BrandStep,
  { title: string; description: string }
> = {
  fundament: {
    title: "Je merk",
    description: "Waar je voor staat, en waarmee je wint. Dit stuurt alles wat Aura schrijft.",
  },
  doelgroep: {
    title: "Je klant",
    description: "Voor wie de teksten zijn, en waar je klant je mee vergelijkt.",
  },
  stem: {
    title: "Hoe je klinkt",
    description: "Vijf schuiven bepalen de toon van elke pagina die Aura maakt.",
  },
  woorden: {
    title: "Je woorden",
    description: "Wat er wél in mag, wat er nooit in mag, en hoe je je lezer aanspreekt.",
  },
  auteur: {
    title: "Wie het schrijft",
    description: "Content verschijnt onder een naam. Een vindbaar mens telt mee als betrouwbaarheidssignaal.",
  },
};

export const STEP_ORDER: BrandStep[] = [
  "fundament",
  "doelgroep",
  "stem",
  "woorden",
  "auteur",
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

export function stepProgress(
  profile: Partial<Profile>,
  step: BrandStep,
): StepProgress {
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
