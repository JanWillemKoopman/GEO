/**
 * Het CONTENT QUALITY PROFILE: wat betekent "goed" voor DIT soort pagina?
 * (docs/tasks/contentkwaliteit-framework.md §4.2)
 *
 * ── WAT DIT VERVANGT ────────────────────────────────────────────────────────
 *
 * Drie losse constanten in `lib/pipeline/content.ts` bepaalden tot nu toe of een
 * pagina goed genoeg was: `REVIEW_THRESHOLD = 80`, `GEO_THRESHOLD = 60` en
 * `COVERAGE_THRESHOLD = 85`. Ze golden voor alle vier de paginatypes tegelijk,
 * terwijl de gemeten werkelijkheid op productie (43 pagina's, 2 september 2026)
 * drie totaal verschillende profielen laat zien:
 *
 *   type       kwaliteit   bronherleidbaarheid   woorden
 *   faq        87,5        0,7                   366
 *   article    80,7        51,8                  830
 *   landing    80,1        77,1                  535
 *
 * Een FAQ die 0,7 procent van zijn beweringen kan herleiden is geen slechte
 * FAQ: er staan nauwelijks beweringen over het bedrijf in, en dat hoort ook
 * niet. Diezelfde 0,7 op een dienstenpagina is een pagina die niets waarmaakt.
 * Eén lat over allebei is dus per definitie fout voor één van de twee.
 *
 * ── WAAROM CONFIGURATIE EN GEEN CODE PER TYPE ───────────────────────────────
 *
 * De opdracht vraagt het expliciet: geen hardgecodeerde logica verspreid over
 * prompts en bestanden zodra een configureerbaar model past. Alles wat per type
 * verschilt staat hier in één tabel: welke dimensies meetellen, hoe zwaar,
 * welke ondergrens, welke bewijsvereisten en welke type-eigen harde regels.
 * `content.ts` leest dit en beslist niets meer zelf.
 *
 * ── DE GETALLEN RUSTEN OP ZEVEN PAGINA'S ────────────────────────────────────
 *
 * Ze zijn gedifferentieerd langs de gemeten verschillen hierboven, niet geijkt:
 * daarvoor zijn er twintig beoordeelde pagina's nodig, en die verzamelt
 * `content_quality_reviews` (fase E). Ze staan daarom op één plek met de reden
 * erbij, precies zoals `DUPLICATE_THRESHOLD` en de 40/70 van de inputpoort.
 *
 * Bewust ZONDER `server-only` (conventie 2).
 */
import type { ContentType } from "@/lib/types/database";
import {
  UNIVERSELE_DIMENSIES,
  type QualityDimension,
} from "@/lib/pipeline/quality-dimensions";

/** Een type-eigen controle die de code zelf kan uitvoeren, zonder AI. */
export interface TypeRegel {
  /** Stabiele sleutel, komt terug in de bevinding en in de tests. */
  id: string;
  /** Wat er misgaat, in de taal van de klant. */
  omschrijving: string;
  /** Onder welke dimensie dit valt. */
  dimension: QualityDimension;
  /** Houdt dit publicatie tegen, of is het een verbeterpunt? */
  blokkeert: boolean;
}

export interface ContentQualityProfile {
  type: ContentType;
  /** Wat deze pagina moet bereiken. Gaat mee in de opdracht aan de beoordelaar. */
  doel: string;
  /** Voor wie hij geschreven is. */
  doelgroep: string;
  /** Met welke bedoeling iemand hier terechtkomt. */
  intentie: string;
  /**
   * Het gewicht per dimensie. Een dimensie die hier niet staat, telt voor dit
   * type NIET mee, ook niet als er toevallig een score voor is.
   *
   * Gewichten zijn hele getallen van 1 tot 3, geen percentages: percentages
   * moeten optellen tot honderd en dan verandert elk gewicht alle andere. Met
   * hele getallen is één regel aanpassen één beslissing.
   */
  gewichten: Partial<Record<QualityDimension, number>>;
  /** Onder dit totaal is de pagina niet af. */
  minimumTotaal: number;
  /** Ondergrens per dimensie. Alleen waar één zwakke dimensie op zichzelf al fataal is. */
  minimumPerDimensie: Partial<Record<QualityDimension, number>>;
  /**
   * Welk deel van de merkgebonden secties onderbouwd moet zijn vóór het
   * schrijven. `null` = deze pagina hoeft niets over het bedrijf te bewijzen.
   */
  minimumBewijsdekking: number | null;
  /**
   * Welk deel van de KERNsecties onderbouwd moet zijn. Altijd 100: een pagina
   * waarvan de kern niet waargemaakt kan worden, is de pagina niet waard.
   */
  minimumKritiekeDekking: number;
  /** Richtlengte, uit `TARGET_WORDS` in content.ts (daar blijft de bron). */
  regels: TypeRegel[];
  /** Wat een AI-assistent van dit type moet kunnen overnemen. */
  citeerbaarheid: string;
}

/**
 * De harde regels die voor ELK type gelden. Ze staan hier en niet per profiel,
 * want een verboden woord is op een FAQ net zo verboden als op een
 * landingspagina. Alle zes blokkeren, en dat is de complete lijst: zie
 * `quality-score.ts` voor waarom de lijst kort moet blijven.
 */
export const UNIVERSELE_REGELS: TypeRegel[] = [
  {
    id: "verboden_woord",
    omschrijving: "Er staat een woord in dat je hebt uitgesloten.",
    dimension: "feitelijkheid",
    blokkeert: true,
  },
  {
    id: "verboden_onderwerp",
    omschrijving: "De pagina gaat over een onderwerp waarover je niet wilt publiceren.",
    dimension: "feitelijkheid",
    blokkeert: true,
  },
  {
    id: "concurrent_genoemd",
    omschrijving: "Er staat een ander bedrijf bij naam in de tekst.",
    dimension: "feitelijkheid",
    blokkeert: true,
  },
  {
    id: "kritieke_claim_zonder_bewijs",
    omschrijving: "Een bewering die deze pagina draagt, kunnen we niet onderbouwen.",
    dimension: "bewijs",
    blokkeert: true,
  },
  {
    id: "bewering_zonder_bron",
    omschrijving: "Er staat een uitspraak over je bedrijf in waar geen bron bij hoort.",
    dimension: "feitelijkheid",
    blokkeert: true,
  },
  {
    id: "duplicaat",
    omschrijving: "Deze tekst lijkt te veel op een pagina die je al hebt.",
    dimension: "originaliteit",
    blokkeert: true,
  },
];

/**
 * De vier profielen.
 *
 * ── HOE DE GEWICHTEN GEKOZEN ZIJN ───────────────────────────────────────────
 *
 * Per type is de vraag: waaraan zou een lezer merken dat dit een goede pagina
 * van dit soort is? Bij een kennisartikel is dat diepgang en expertise; bij een
 * dienstenpagina is dat of het over dít bedrijf gaat en of het klopt; bij een
 * FAQ is dat of de vraag beantwoord wordt en of het antwoord kort is; bij een
 * vergelijking is dat volledigheid en eerlijkheid.
 *
 * Gewicht 3 = hierop valt de pagina; 2 = telt volwaardig mee; 1 = weegt mee maar
 * beslist niet.
 */
export const QUALITY_PROFILES: Record<ContentType, ContentQualityProfile> = {
  article: {
    type: "article",
    doel: "een lezer die iets wil begrijpen volledig en betrouwbaar bedienen, zodat een AI-assistent dit als uitleg aanhaalt",
    doelgroep: "iemand die zich oriënteert en het onderwerp nog niet kent",
    intentie: "informatief",
    gewichten: {
      feitelijkheid: 3,
      volledigheid: 3,
      diepgang: 3,
      expertise: 3,
      relevantie: 2,
      bewijs: 2,
      specificiteit: 2,
      originaliteit: 2,
      structuur: 2,
      leesbaarheid: 2,
      toon: 1,
    },
    minimumTotaal: 75,
    minimumPerDimensie: { feitelijkheid: 70, volledigheid: 60 },
    // Lager dan bij een landingspagina, en dat is geen slordigheid: een
    // kennisartikel mag grotendeels algemene uitleg zijn. Gemeten haalt dit
    // type 51,8 procent bronherleidbaarheid, tegen 77,1 bij een landingspagina.
    minimumBewijsdekking: 50,
    minimumKritiekeDekking: 100,
    regels: [
      {
        id: "artikel_te_dun",
        omschrijving: "Het artikel heeft te weinig secties om het onderwerp echt uit te leggen.",
        dimension: "volledigheid",
        blokkeert: false,
      },
    ],
    citeerbaarheid:
      "elke sectie bevat één zin die het complete antwoord op zijn deelvraag geeft, losstaand te begrijpen",
  },
  faq: {
    type: "faq",
    doel: "de vragen beantwoorden die een klant stelt vlak voordat hij contact opneemt",
    doelgroep: "iemand die al bijna klant is en nog één ding wil weten",
    intentie: "praktisch",
    gewichten: {
      relevantie: 3,
      feitelijkheid: 3,
      leesbaarheid: 3,
      volledigheid: 2,
      structuur: 2,
      specificiteit: 2,
      toon: 1,
    },
    // Lager dan de rest, en bewust: een FAQ die kort en juist is, is af. De
    // dimensies die hem hoger zouden tillen (diepgang, originaliteit) horen hier
    // niet, dus een hoge lat zou vragen om uitweiding die het type juist bederft.
    minimumTotaal: 70,
    minimumPerDimensie: { relevantie: 70, feitelijkheid: 70 },
    // Geen bewijsvereiste: gemeten 0,7 procent bronherleidbaarheid over drie
    // FAQ-pagina's, en dat is geen fout maar de aard van het type. Wat er wél
    // over het bedrijf beweerd wordt, valt onder de universele harde regel.
    minimumBewijsdekking: null,
    minimumKritiekeDekking: 100,
    regels: [
      {
        id: "faq_te_weinig_vragen",
        omschrijving: "Er staan te weinig vraag-antwoordparen op deze pagina.",
        dimension: "volledigheid",
        blokkeert: false,
      },
      {
        id: "faq_antwoord_te_lang",
        omschrijving: "Een of meer antwoorden zijn te lang om als antwoord te lezen.",
        dimension: "leesbaarheid",
        blokkeert: false,
      },
    ],
    citeerbaarheid: "elk antwoord staat op zichzelf en is over te nemen zonder de vraag ernaast",
  },
  landing: {
    type: "landing",
    doel: "iemand die deze dienst zoekt laten zien dat dit bedrijf hem levert, en hem laten handelen",
    doelgroep: "iemand met een concrete behoefte die aanbieders vergelijkt",
    intentie: "commercieel",
    gewichten: {
      specificiteit: 3,
      bewijs: 3,
      feitelijkheid: 3,
      overtuiging: 3,
      relevantie: 2,
      volledigheid: 2,
      structuur: 2,
      leesbaarheid: 2,
      toon: 2,
      originaliteit: 1,
      expertise: 1,
    },
    // De hoogste lat van de vier. Dit is de pagina waarop een klant geld
    // verdient en waarop een verzonnen belofte hem het meest kost.
    minimumTotaal: 78,
    minimumPerDimensie: { feitelijkheid: 75, specificiteit: 65, bewijs: 60 },
    minimumBewijsdekking: 70,
    minimumKritiekeDekking: 100,
    regels: [
      {
        id: "landing_geen_vervolgstap",
        omschrijving: "De pagina zegt nergens hoe iemand contact opneemt.",
        dimension: "overtuiging",
        blokkeert: false,
      },
      {
        id: "landing_te_algemeen",
        omschrijving: "De pagina noemt te weinig concrete gegevens van je bedrijf.",
        dimension: "specificiteit",
        blokkeert: false,
      },
    ],
    citeerbaarheid:
      "het bedrijf staat met naam bij elke belofte, zodat een AI-assistent weet wie hij aanraadt",
  },
  comparison: {
    type: "comparison",
    doel: "iemand helpen kiezen tussen aanpakken, zonder een ander bedrijf te noemen",
    doelgroep: "iemand die twijfelt tussen twee manieren om zijn probleem op te lossen",
    intentie: "afwegend",
    gewichten: {
      volledigheid: 3,
      feitelijkheid: 3,
      relevantie: 2,
      diepgang: 2,
      expertise: 2,
      bewijs: 2,
      structuur: 2,
      leesbaarheid: 2,
      specificiteit: 1,
      originaliteit: 1,
    },
    minimumTotaal: 75,
    minimumPerDimensie: { feitelijkheid: 75, volledigheid: 65 },
    minimumBewijsdekking: 60,
    minimumKritiekeDekking: 100,
    regels: [
      {
        id: "vergelijking_eenzijdig",
        omschrijving: "De vergelijking behandelt maar één kant.",
        dimension: "volledigheid",
        blokkeert: false,
      },
    ],
    citeerbaarheid: "per optie staat er één zin die zegt wanneer je hem kiest",
  },
};

/**
 * Het profiel bij een contenttype.
 *
 * Valt terug op `article` bij een onbekend type. Dat is de veilige kant: een
 * kennisartikel heeft de breedste dimensieset en de middelste lat, dus een
 * onbekend type wordt niet per ongeluk te streng of te mild beoordeeld
 * (conventie 3).
 */
export function profielVoorType(type: ContentType | string | null | undefined): ContentQualityProfile {
  const gevonden = type ? QUALITY_PROFILES[type as ContentType] : undefined;
  return gevonden ?? QUALITY_PROFILES.article;
}

/** Welke dimensies telt dit profiel mee? In de vaste volgorde van de opdracht. */
export function dimensiesVan(profiel: ContentQualityProfile): QualityDimension[] {
  return (Object.keys(profiel.gewichten) as QualityDimension[]).filter(
    (d) => (profiel.gewichten[d] ?? 0) > 0,
  );
}

/**
 * Rekent na dat elk profiel de vier universele dimensies meeweegt.
 *
 * Puur en geëxporteerd omdat `scripts/test-unit.ts` hem draait: een profiel dat
 * `feitelijkheid` vergeet, is een profiel dat een onware pagina kan goedkeuren,
 * en dat hoort bij het bouwen op te vallen en niet op productie.
 */
export function profielMistUniverseleDimensie(profiel: ContentQualityProfile): QualityDimension[] {
  return UNIVERSELE_DIMENSIES.filter((d) => (profiel.gewichten[d] ?? 0) <= 0);
}

/**
 * Wat de type-eigen regels nodig hebben om te oordelen: tellingen, geen tekst.
 *
 * Bewust geen `bodyMarkdown` hier: het tellen gebeurt bij de aanroeper, die de
 * bestaande hulpfuncties (`splitSections`, `countWords`) al in handen heeft.
 * Deze functie beslist alleen, en dat maakt hem testbaar zonder een hele pagina.
 */
export interface TypeMeting {
  secties: number;
  faqParen: number;
  /** Het langste FAQ-antwoord in woorden. 0 als er geen FAQ is. */
  langsteFaqAntwoord: number;
  /** Staat er een manier om contact op te nemen in de tekst? */
  heeftVervolgstap: boolean;
  /** Hoeveel bevestigde feiten er daadwerkelijk in de tekst aangehaald worden. */
  gebruikteFeiten: number;
  /** Het aantal woorden van de pagina, voor de dichtheidsregel. */
  woorden: number;
}

/** Wanneer een FAQ-antwoord te lang is om nog als antwoord te lezen. */
export const FAQ_ANTWOORD_MAX_WOORDEN = 120;

/** Hoeveel vraag-antwoordparen een FAQ minstens hoort te hebben. */
export const FAQ_MIN_PAREN = 5;

/** Hoeveel secties een kennisartikel minstens hoort te hebben. */
export const ARTIKEL_MIN_SECTIES = 4;

/**
 * Hoeveel bevestigde feiten er per honderd woorden in een landingspagina horen.
 *
 * 0,5 betekent: één concreet gegeven per tweehonderd woorden. Laag gekozen,
 * want dit is een ondergrens en geen streefwaarde. Gemeten op de ronde van
 * 1 september 2026: over vier pagina's samen stonden vijf concrete getallen
 * tegenover 80 zinnen die de lezer opdroegen iets na te vragen. Die pagina's
 * zouden hier alle vier op vallen.
 */
export const LANDING_FEITEN_PER_100_WOORDEN = 0.5;

/**
 * Welke type-eigen regels zijn overtreden?
 *
 * Geeft de overtreden regels terug, niet de geslaagde: een lijst van wat er goed
 * ging is niet waar de reparatie iets aan heeft. Een meting die niet uit te
 * voeren is (geen FAQ bij een FAQ-pagina die nog leeg is) levert geen
 * overtreding op maar wordt overgeslagen, want onbekend is geen onvoldoende.
 */
export function checkTypeRegels(
  profiel: ContentQualityProfile,
  meting: TypeMeting,
): TypeRegel[] {
  const overtreden: TypeRegel[] = [];
  const regel = (id: string) => profiel.regels.find((r) => r.id === id);

  if (profiel.type === "article") {
    if (meting.secties > 0 && meting.secties < ARTIKEL_MIN_SECTIES) {
      const r = regel("artikel_te_dun");
      if (r) overtreden.push(r);
    }
  }

  if (profiel.type === "faq") {
    if (meting.faqParen > 0 && meting.faqParen < FAQ_MIN_PAREN) {
      const r = regel("faq_te_weinig_vragen");
      if (r) overtreden.push(r);
    }
    if (meting.langsteFaqAntwoord > FAQ_ANTWOORD_MAX_WOORDEN) {
      const r = regel("faq_antwoord_te_lang");
      if (r) overtreden.push(r);
    }
  }

  if (profiel.type === "landing") {
    if (!meting.heeftVervolgstap) {
      const r = regel("landing_geen_vervolgstap");
      if (r) overtreden.push(r);
    }
    // Alleen zinnig bij een pagina die al tekst heeft: bij nul woorden zou elke
    // dichtheid nul zijn en zou de regel altijd afgaan.
    if (meting.woorden >= 200) {
      const dichtheid = (meting.gebruikteFeiten / meting.woorden) * 100;
      if (dichtheid < LANDING_FEITEN_PER_100_WOORDEN) {
        const r = regel("landing_te_algemeen");
        if (r) overtreden.push(r);
      }
    }
  }

  return overtreden;
}
