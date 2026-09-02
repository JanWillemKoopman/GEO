/**
 * De ONDERBOUWINGSGRAAD: kan deze pagina goed worden met wat we hebben?
 * (docs/tasks/vragen-voor-het-schrijven.md §4)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De app had geen maat voor "hebben we hier genoeg voor". Eén getal kwam in de
 * buurt, `minProofPointsForConcreteContent = 3` in `lib/config.ts`, maar dat zet
 * alleen het web-zoeken aan: het houdt niets tegen, het waarschuwt niemand, en
 * het kijkt naar het MERK als geheel in plaats van naar DEZE pagina.
 *
 * Gemeten in de contentronde van 1 september 2026 (Gasservice Brabant): van de
 * 25 secties van de Tilburg-pagina hadden er 7 een F-nummer. De app kon toen
 * niet zien of dat erg was, want ze wist niet welke van die 25 secties iets over
 * het bedrijf hoorden te zeggen. Sinds `needsBrandFact` op `ContractSection`
 * weet ze dat wel, en is dit een telling.
 *
 * ── DE REKENSOM ─────────────────────────────────────────────────────────────
 *
 *   merksecties = secties met needsBrandFact
 *   gedekt      = merksecties met minstens één BESTAAND F-nummer in factRefs
 *   graad       = gedekt / merksecties
 *
 * `null` bij nul merksecties, en dat is een echte waarde en geen ontbrekende
 * (conventie 3). Een pagina die volledig uit algemene uitleg bestaat is geen
 * slechte pagina; hij is alleen geen pagina waarvoor de klant iets hoeft aan te
 * leveren. Een 0 zou daar het verkeerde antwoord zijn en de inputpoort ten
 * onrechte dichtzetten.
 *
 * ── HET MODEL BEOORDEELT, DE CODE REKENT NA ─────────────────────────────────
 *
 * `needsBrandFact` is een oordeel van het model, want algemeen tegenover
 * merkgebonden is inhoudelijk. Of het F-nummer dat het model erbij zette ECHT
 * bestaat, is een telling, en die doen wij. Dat is dezelfde verdeling als bij
 * `isSupported` in `factcard.ts`: een optimistisch model mag zichzelf niet
 * vrijpleiten uit de vraag die het gat moest dichten (conventie 1).
 *
 * Bewust ZONDER `server-only` (conventie 2): pure rekenkunde, testbaar vanuit
 * `scripts/test-unit.ts`.
 */
import { splitRefs, type FactItem } from "@/lib/pipeline/factcard";
import type { ContentContract, ContractSection } from "@/lib/schemas/content-contract";

/** Wat de inputpoort en het briefingscherm van één pagina moeten weten. */
export interface InputCoverage {
  /**
   * Percentage van 0 tot 100, of `null` als er geen merkgebonden sectie is.
   *
   * Afgerond op één decimaal, zodat hij in `content_pieces.input_coverage`
   * (numeric(5,2)) past zonder dat de database gaat afronden en het scherm een
   * ander getal toont dan de poort woog.
   */
  graad: number | null;
  /** Hoeveel secties om een uitspraak over dit bedrijf vragen. */
  merksecties: number;
  /** Hoeveel daarvan een bestaand F-nummer hebben. */
  gedekt: number;
  /** De merksecties zonder bestaand F-nummer: hier komen de vragen vandaan. */
  ongedekt: ContractSection[];
}

/**
 * Heeft deze sectie minstens één F-nummer dat echt op de kaart staat?
 *
 * Losse verwijzingen worden gesplitst met dezelfde `splitRefs` die
 * `isSupported` gebruikt: een sectie met factRefs `["F1, F2"]` verwijst naar
 * twee feiten, niet naar één feit dat "F1, F2" heet. Zonder die splitsing zou
 * een correct onderbouwde sectie als ongedekt tellen en zou de klant een vraag
 * krijgen waarvan het antwoord al op de kaart staat, en dat is precies het
 * geloofwaardigheidsverlies uit contentbriefing.md §4 regel 6.
 *
 * ⚠️ Bewust GEEN citaatplicht zoals bij `isSupported`. Daar gaat het om een
 * bewering die het model zelf onderbouwd noemt; hier om een sectie die nog
 * geschreven moet worden, en die heeft nog geen zin om een citaat uit te halen.
 * Eén bestaand feit is hier genoeg om te zeggen: hier valt iets te schrijven.
 */
function sectieIsGedekt(sectie: ContractSection, beschikbaar: Set<string>): boolean {
  return (sectie.factRefs ?? [])
    .flatMap((ref) => splitRefs(ref))
    .some((ref) => beschikbaar.has(ref));
}

/**
 * Vraagt deze sectie om een uitspraak over dit bedrijf?
 *
 * ⚠️ Een contract van vóór migratie 0083 heeft dit veld niet. `undefined` telt
 * dan als "niet merkgebonden", en dus als een pagina zonder gat. Dat is de
 * veilige kant: een oude pagina hoort niet ineens door de inputpoort tegen
 * gehouden te worden op een veld dat destijds niet bestond (conventie 3,
 * onbekend is een betere waarde dan een verkeerde).
 */
function isMerksectie(sectie: ContractSection): boolean {
  return sectie.needsBrandFact === true;
}

/**
 * Rekent de onderbouwingsgraad van één pagina uit.
 *
 * `facts` is de feitenkaart zoals hij op dit moment geldt, dus inclusief de
 * antwoorden die de klant al gaf (`mergeAnsweredFacts`). Daardoor stijgt de
 * graad zichtbaar zodra hij een vraag beantwoordt, en dat is precies het
 * moment waarop de app moet laten zien dat de input verschil maakt.
 */
export function berekenInputCoverage(
  contract: ContentContract | null,
  facts: readonly FactItem[],
): InputCoverage {
  const secties = contract?.sections ?? [];
  const beschikbaar = new Set(facts.map((f) => f.ref?.toUpperCase().replace(/\s+/g, "")).filter(Boolean));

  const merksecties = secties.filter(isMerksectie);
  const ongedekt = merksecties.filter((s) => !sectieIsGedekt(s, beschikbaar));
  const gedekt = merksecties.length - ongedekt.length;

  return {
    graad:
      merksecties.length === 0
        ? null
        : Math.round((gedekt / merksecties.length) * 1000) / 10,
    merksecties: merksecties.length,
    gedekt,
    ongedekt,
  };
}

/**
 * Het contract VASTZETTEN vlak vóór het schrijven
 * (docs/tasks/vragen-voor-het-schrijven.md §6).
 *
 * ── WAAROM OVERSLAAN IETS MOET KOSTEN ───────────────────────────────────────
 *
 * Overslaan zette tot nu toe de status op `overgeslagen`, en daarna werd de
 * pagina geschreven alsof de vraag nooit had bestaan. De schrijver kreeg dus
 * nog steeds de opdracht een sectie te vullen waar hij niets voor had, en deed
 * dat door om het gat heen te praten of het te benoemen: "Een concrete wachttijd
 * is niet beschikbaar. Vraag wanneer advies mogelijk is." Over de vier pagina's
 * van 1 september samen stonden er 80 van zulke zinnen.
 *
 * Nu valt de sectie eruit. Drie dingen worden daar beter van, en alle drie zijn
 * ze zichtbaar: de pagina wordt korter in plaats van vager, de dekkingspoort
 * toetst niet meer op een sectie die er nooit had kunnen komen, en de
 * reparatielus krijgt geen opdracht die hij niet kan uitvoeren.
 *
 * ── WAAROM ALLEEN OVERGESLAGEN, EN NIET OOK OPENSTAAND ──────────────────────
 *
 * Een vraag die nog OPEN staat is geen keuze van de klant; die heeft hij
 * misschien niet eens gezien. Zijn sectie laten vervallen zou hem stilzwijgend
 * een kortere pagina bezorgen op grond van iets wat hij nooit besloot. Een
 * overgeslagen vraag is wél een besluit: hij heeft hem gezien en gezegd dat hij
 * het niet weet. Dat is dezelfde grens die `lib/open-questions.ts` trekt bij het
 * tellen van openstaande vragen.
 *
 * ── DE ONDERGRENS ───────────────────────────────────────────────────────────
 *
 * Er blijven altijd minstens `MIN_SECTIES_NA_SNOEIEN` secties staan, net als bij
 * `snoeiOpDoellengte` in `contract-format.ts`. Een pagina van één sectie is geen
 * pagina, en dan is een iets vagere sectie het betere probleem. Slaat de klant
 * echt alles over, dan is dat het werk van de INPUTPOORT en niet van deze
 * functie: die houdt de pagina tegen vóór het geld wordt uitgegeven.
 */
export const MIN_SECTIES_NA_SNOEIEN = 3;

export function zetContractVast(
  contract: ContentContract | null,
  /** De sectie-id's waarvan de vraag is overgeslagen ("s3"). */
  overgeslagenSecties: readonly string[],
): ContentContract | null {
  if (!contract) return null;
  const teSnoeien = new Set(overgeslagenSecties.filter(Boolean));
  if (teSnoeien.size === 0) return contract;

  const behouden = contract.sections.filter((s) => !teSnoeien.has(s.id));
  if (behouden.length < MIN_SECTIES_NA_SNOEIEN) return contract;

  return { ...contract, sections: behouden };
}

/**
 * Eén sectie van één pagina, als tekst: "<content_piece_id>:s3".
 *
 * `fact_requests.section_refs` (migratie 0083) bewaart deze vorm. Het sectie-id
 * alleen zou niet volstaan: elke pagina nummert zijn secties vanaf s1, dus "s3"
 * bestaat op elke pagina van de batch.
 */
export function sectieVerwijzing(pieceId: string, sectionId: string): string {
  return `${pieceId}:${sectionId}`;
}

/** De sectie-id's uit een lijst verwijzingen die bij DEZE pagina horen. */
export function sectiesVanPagina(
  refs: readonly string[] | null | undefined,
  pieceId: string,
): string[] {
  const voorvoegsel = `${pieceId}:`;
  return (refs ?? [])
    .filter((r) => typeof r === "string" && r.startsWith(voorvoegsel))
    .map((r) => r.slice(voorvoegsel.length))
    .filter(Boolean);
}

/**
 * "P2-s5" uit de opdracht terug naar de pagina-index en het sectie-id.
 *
 * Geeft null bij alles wat niet aan de vorm voldoet. Dat is de veilige kant: een
 * verzonnen verwijzing mag geen sectie van een willekeurige pagina laten
 * vervallen (conventie 3). De aanroeper valt dan terug op de koppeling via
 * `neededFor`.
 */
export function leesSectieVerwijzing(
  ruw: string | null | undefined,
): { paginaIndex: number; sectionId: string } | null {
  const m = /^\s*P(\d+)\s*[-:]\s*(s\d+)\s*$/i.exec(ruw ?? "");
  if (!m) return null;
  const paginaIndex = Number(m[1]) - 1;
  if (!Number.isInteger(paginaIndex) || paginaIndex < 0) return null;
  return { paginaIndex, sectionId: m[2].toLowerCase() };
}
