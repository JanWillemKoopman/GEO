/**
 * De kop van het profielscherm: één zin en drie cijfers.
 *
 * ── WAAROM DIT ER MOEST KOMEN ───────────────────────────────────────────────
 *
 * `docs/ux-design.md` regel 1 is "één hoofdgetal". De onboarding produceert er
 * drie die daarvoor in aanmerking komen, herkenning, koopvragen, dekking, en
 * die stonden als chip verspreid over drie panelen, elk in een andere kaart.
 * De consultant moest het verhaal in de demo zelf bij elkaar scrollen.
 *
 * Dit is ook waar het entiteitsdenken van InSpace zichtbaar wordt: de vraag is
 * niet "hoe vaak word je genoemd" maar "kent een AI-systeem dit bedrijf als één
 * herkenbaar iets, en komt het bovendrijven als iemand koopt?". Twee cijfers die
 * naast elkaar horen te staan, want ze kunnen uit elkaar lopen, een merk kan
 * prima bekend zijn en toch bij geen enkele koopvraag genoemd worden.
 *
 * ── DE DUIDINGSZIN IS GEEN VERSIERING ───────────────────────────────────────
 *
 * "0 van de 3" zonder duiding leest als een cijfer op een rapport. Voor vrijwel
 * elk MKB-merk is dat de normale uitgangssituatie, en dat hoort erbij te staan,
 * anders is de eerste indruk van het product een verwijt. Zelfde regel als in
 * `llm-knowledge-panel.tsx`: diagnose, geen aanklacht.
 *
 * Puur, dus testbaar (conventie 2).
 */
import {
  summariseKnows,
  type BaselineVerdict,
  type CategoryVerdict,
} from "@/lib/pipeline/baseline-verdict";
import type { StructureCoverage } from "@/lib/pipeline/structure-gap";

export type StatTone = "goed" | "aandacht" | "neutraal";

export interface OnboardingStat {
  /** Het getal zoals het op het scherm staat. Altijd mét noemer als die er is. */
  value: string;
  label: string;
  /** Eén korte regel eronder. Null = niets te melden. */
  hint: string | null;
  tone: StatTone;
  /**
   * Wat er precies gemeten is, in één zin, achter een vraagteken.
   *
   * ── WAAROM DIT VELD ER MOEST KOMEN ────────────────────────────────────────
   *
   * De drie tegels stonden er als "6/6", "2/3" en "1" en de eerste reactie van
   * de eigenaar was letterlijk "die slaan volgens mij nergens op". Terecht: de
   * noemers waren onzichtbaar. 6 was het aantal formuleringen waarin we naar het
   * merk vroegen, 3 het aantal koopvragen, en de 1 was geen verhouding maar een
   * aantal diensten. Drie eenheden in dezelfde vorm, zonder één van de drie te
   * benoemen.
   *
   * Nova doet dit nergens: daar staat de eenheid altijd in het label zelf
   * ("Total clicks this plan month", "Month {number} of 12", "{posted} of
   * {total}"). Dit veld is die regel, hier toegepast.
   */
  explain: string;
  /** Waar de onderbouwing staat. Maakt de tegel klikbaar. */
  href?: string;
}

export interface OnboardingSummaryInput {
  brandName: string;
  /** De `kent`-oordelen, één per gestelde formulering. */
  knowsVerdicts: BaselineVerdict[];
  /** De `categorie`-oordelen, één per merkneutrale koopvraag. */
  categoryVerdicts: CategoryVerdict[];
  coverage: StructureCoverage;
}

/**
 * Hoeveel gegevens spreekt de assistent tegen? Dat is de zwaarste bevinding die
 * er is en hoort niet weggestopt in een uitklapper, maar hij is er meestal
 * niet, dus hij krijgt geen eigen tegel. Hij komt in de duidingszin.
 */
function contradictedCount(verdicts: BaselineVerdict[]): number {
  return verdicts.length === 0
    ? 0
    : Math.max(0, ...verdicts.map((v) => v.contradicted));
}

export function onboardingStats(
  input: OnboardingSummaryInput,
): OnboardingStat[] {
  const knows = summariseKnows(input.knowsVerdicts);
  const genoemd = input.categoryVerdicts.filter((v) => v.mentioned).length;
  const gevraagd = input.categoryVerdicts.length;
  const { missing, assessed } = input.coverage;

  const stats: OnboardingStat[] = [];

  // 1. Kent de assistent je? Een verhouding en geen ja of nee. Twee woorden
  //    verschil in de vraagstelling draaide dit ooit om (zie summariseKnows).
  //
  //    De noemer is het aantal FORMULERINGEN, niet het aantal vragen: we vragen
  //    hetzelfde op meerdere manieren ("wat is X", "ken je X", "X bedrijf"),
  //    omdat een merk bij de ene formulering wél en bij de andere niet
  //    bovenkomt. Dat stond nergens en maakte "6/6" een cijfer zonder eenheid.
  stats.push({
    value: knows.asked === 0 ? "-" : `${knows.recognised}/${knows.asked}`,
    label: "Kent ChatGPT je bedrijf?",
    hint:
      knows.asked === 0
        ? "Nog niet getest"
        : knows.level === "kent"
          ? `Ja, bij alle ${knows.asked} manieren van vragen`
          : knows.level === "wisselend"
            ? `Wisselend: bij ${knows.recognised} van de ${knows.asked} manieren van vragen`
            : `Nee, bij geen van de ${knows.asked} manieren van vragen`,
    explain:
      `ORBIT ENGINE vraagt ChatGPT op ${knows.asked || "meerdere"} verschillende manieren naar je bedrijf, ` +
      "bijvoorbeeld op merknaam, op merknaam plus plaats, en als losse vraag. " +
      "Bij de ene formulering komt een merk soms wél boven en bij de andere niet, " +
      "en dat verschil is precies wat je wilt weten.",
    href: "#ai-kennis",
    tone:
      knows.asked === 0
        ? "neutraal"
        : knows.level === "kent"
          ? "goed"
          : knows.level === "kent_niet"
            ? "aandacht"
            : "neutraal",
  });

  // 2. Word je genoemd als iemand koopt? Dit is een ander cijfer dan het
  //    eerste, en juist het verschil ertussen is het gesprek waard.
  //
  //    "Koopvraag" is jargon zolang er niet bij staat wat het is: een vraag
  //    waarin je merknaam NIET voorkomt. Dat is de hele clou, want daar kies je
  //    niet zelf of je genoemd wordt.
  stats.push({
    value: gevraagd === 0 ? "-" : `${genoemd}/${gevraagd}`,
    label: "Noemt ChatGPT je als iemand wil kopen?",
    hint:
      gevraagd === 0
        ? "Nog niet gemeten"
        : genoemd === 0
          ? `Nee, bij geen van de ${gevraagd} koopvragen`
          : genoemd === gevraagd
            ? `Ja, bij alle ${gevraagd} koopvragen`
            : `Bij ${genoemd} van de ${gevraagd} koopvragen. Dit is de nulmeting`,
    explain:
      `ORBIT ENGINE stelt ${gevraagd || "een aantal"} vragen zoals een klant ze stelt, zonder je merknaam erin: ` +
      '"welke aanbieder kies ik voor…". Je merk moet daar dus uit zichzelf bovenkomen. ' +
      "Bekend zijn en aanbevolen worden zijn twee verschillende dingen; dit cijfer meet het tweede.",
    href: "#ai-kennis",
    tone: gevraagd === 0 ? "neutraal" : genoemd === 0 ? "aandacht" : "goed",
  });

  // 3. Wat de STRUCTUUR mist. Het enige cijfer hier dat niet over een
  //    AI-antwoord gaat maar over de site zelf, en het enige dat geen
  //    verhouding is. Daarom staat de noemer nu ín de waarde ("1 van de 15")
  //    en niet alleen in de regel eronder: twee verhoudingen en een los getal
  //    naast elkaar lazen als drie cijfers van dezelfde soort.
  stats.push({
    value: assessed === 0 ? "-" : `${missing}/${assessed}`,
    label: "Diensten zonder eigen pagina",
    hint:
      assessed === 0
        ? "Aanbod nog niet in kaart"
        : missing === 0
          ? `Alle ${assessed} onderdelen hebben een pagina`
          : `${missing} van je ${assessed} onderdelen heeft er nog geen`,
    explain:
      "Dit gaat over je eigen site, niet over ChatGPT. ORBIT ENGINE legt je aanbod naast je pagina's: " +
      "een dienst zonder eigen pagina heeft geen plek waar een AI-assistent iets over kan lezen. " +
      "Dit is meestal het snelst te verhelpen punt van de drie.",
    href: "#aanbod",
    tone: assessed === 0 ? "neutraal" : missing === 0 ? "goed" : "aandacht",
  });

  return stats;
}

/**
 * De zin boven de cijfers: wat betekent dit bij elkaar?
 *
 * Vier gevallen, en de volgorde is de ernst. Een tegenspraak wint van alles,
 * "ChatGPT denkt dat je in Eindhoven zit" is de meest alarmerende uitkomst van
 * de hele onboarding en mag niet onder een verhouding verdwijnen.
 */
export function onboardingHeadline(
  input: OnboardingSummaryInput,
): string | null {
  const knows = summariseKnows(input.knowsVerdicts);
  if (knows.asked === 0) return null;

  const merk = input.brandName;
  const tegengesproken = contradictedCount(input.knowsVerdicts);
  const genoemd = input.categoryVerdicts.filter((v) => v.mentioned).length;
  const gevraagd = input.categoryVerdicts.length;

  if (tegengesproken > 0) {
    return (
      `ChatGPT noemt ${tegengesproken} gegeven over ${merk} dat niet klopt met wat er op de ` +
      `site staat. Dat weegt zwaarder dan zichtbaarheid. Een verkeerd antwoord kost een klant.`
    );
  }

  if (knows.level === "kent_niet") {
    return (
      `ChatGPT kent ${merk} nog niet als bedrijf. Dat is niet raar: het is de ` +
      `uitgangssituatie van vrijwel elk MKB-merk. En precies wat ORBIT ENGINE hier verandert.`
    );
  }

  if (knows.level === "wisselend") {
    return (
      `ChatGPT herkent ${merk} bij ${knows.recognised} van de ${knows.asked} manieren van vragen. ` +
      `Je naam is ergens opgepikt, maar ligt nog niet vast als één herkenbaar bedrijf.`
    );
  }

  // Kent het merk. Dan is de koopvraag de interessante.
  if (gevraagd > 0 && genoemd === 0) {
    return (
      `ChatGPT kent ${merk}, maar noemt het bij geen van de ${gevraagd} koopvragen. ` +
      `Bekend zijn en aanbevolen worden zijn twee verschillende dingen. Het tweede levert ` +
      `klanten op.`
    );
  }
  if (gevraagd > 0 && genoemd < gevraagd) {
    return (
      `ChatGPT kent ${merk} en noemt het bij ${genoemd} van de ${gevraagd} koopvragen. ` +
      `Dat is de nulmeting. Vanaf hier is elke beweging meetbaar.`
    );
  }

  return `ChatGPT kent ${merk} en noemt het bij elke gemeten koopvraag. Sterke uitgangspositie. Nu vasthouden.`;
}
