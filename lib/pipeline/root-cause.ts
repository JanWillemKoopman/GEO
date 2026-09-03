/**
 * WAAR IN DE KETEN IS DIT ONTSTAAN?
 * (docs/tasks/contentkwaliteit-framework.md §4, punt 14 van de opdracht)
 *
 * ── WAAROM DIT HET BELANGRIJKSTE STUK VAN HET RAAMWERK IS ───────────────────
 *
 * "Deze pagina is generiek" heeft zes mogelijke oorzaken, en vijf ervan lost een
 * betere schrijfprompt niet op:
 *
 *   • de kans zelf was verkeerd afgebakend            → fase `kans`
 *   • de crawl vond te weinig van de site              → fase `onderzoek`
 *   • de aanbodboom mist de dienst waar dit over gaat  → fase `onderzoek`
 *   • we weten te weinig van dit bedrijf               → fase `kennis`
 *   • de inhoudsopgave vroeg de verkeerde secties      → fase `contract`
 *   • de vragen aan de klant misten het gat            → fase `briefing`
 *   • het model schreef het slecht op                  → fase `schrijven`
 *
 * Op productie is precies dat misgegaan. De zeven pagina's van 1 en 2 september
 * kregen samen twintig reparatierondes en gingen er gemiddeld op ACHTERUIT (van
 * 78 naar 52 bij de zwaarst gerepareerde). Dat is de voorspelbare uitkomst van
 * herschrijven wanneer het probleem een ontbrekend feit is: het model kan alleen
 * de woorden veranderen, niet de kennis.
 *
 * ── HOE DE TOEWIJZING WERKT ─────────────────────────────────────────────────
 *
 * Puur afgeleid uit de bron van de bevinding en de dimensie. Geen AI-aanroep,
 * geen gok, en dus ook nooit een oorzaak die niet uit de data volgt. Waar de
 * bron alleen niet genoeg zegt, kijkt de functie naar de bewijsdekking: dezelfde
 * bevinding ("deze sectie is te algemeen") komt uit de kennis als er geen feit
 * voor bestond, en uit het schrijven als het feit er wél lag.
 *
 * Bewust ZONDER `server-only` (conventie 2).
 */
import type { QualityDimension } from "@/lib/pipeline/quality-dimensions";
import {
  PHASE_LABELS,
  type IssueBron,
  type PipelinePhase,
  type QualityIssue,
} from "@/lib/pipeline/quality-issue";

/**
 * De vaste toewijzing per bron. Dit is de eerste en sterkste aanwijzing: wie de
 * bevinding vond, zegt meestal al waar hij vandaan komt.
 */
const BRON_FASE: Record<IssueBron, PipelinePhase> = {
  // Wat de redacteur ziet gaat over hoe het opgeschreven is.
  redactie: "schrijven",
  // Een bewering zonder dekking: het feit ontbrak, of het model verzon iets.
  // Welke van de twee, bepaalt `faseVanIssue()` met de bewijsdekking erbij.
  feitelijkheid: "kennis",
  // Een deelvraag die niet beantwoord wordt: de sectie stond in het contract en
  // is niet ingevuld. Dat is een schrijfprobleem, tenzij het feit ontbrak.
  citeerbaarheid: "schrijven",
  vakmanschap: "schrijven",
  geo_poort: "schrijven",
  // De tekst dekt het contract niet: het contract vroeg iets wat er niet kwam.
  contractdekking: "schrijven",
  kwaliteitspoort: "schrijven",
  bronpraat: "schrijven",
  // V2: twee aanspreekvormen op één pagina is puur een schrijffout. Het
  // merkprofiel levert de vorm aan; wie hem niet volhoudt, is de schrijver.
  aanspreekvorm: "schrijven",
  // V5: de klant heeft het gevraagd en het stond in de invoer. Wie het toch
  // doet, is de schrijver.
  klantinstructie: "schrijven",
  // V9 en V4: het materiaal lag er, de tekst gebruikt het niet als argument.
  // Een schrijfprobleem, niet een kennisprobleem.
  bewijspunt: "schrijven",
  klantcitaat: "schrijven",
  // V8, V1 en V10: opening, merkstem en koppen zijn alle drie schrijfkeuzes.
  paginavorm: "schrijven",
  // Onherleidbare beweringen wijzen op een te dunne feitenkaart.
  bronherleidbaarheid: "kennis",
  // Een verboden woord of onderwerp is een schrijffout: de regel stond in de
  // opdracht en het model hield zich er niet aan.
  verboden_woord: "schrijven",
  verboden_onderwerp: "schrijven",
  typeregel: "schrijven",
  // Te weinig bewijs voor de secties die de pagina draagt.
  bewijsdekking: "kennis",
};

/**
 * De fase waar deze bevinding uit voortkomt.
 *
 * `bewijsAanwezig` is wat het onderscheid maakt tussen "we wisten het niet" en
 * "het model schreef het niet op": stond er een feit voor deze sectie op de
 * kaart, dan is een lege sectie een schrijfprobleem; stond er niets, dan is het
 * een kennisprobleem en helpt herschrijven niet.
 */
export function faseVanIssue(
  issue: Pick<QualityIssue, "bron" | "dimension">,
  context: { bewijsAanwezig: boolean; contractAanwezig: boolean },
): PipelinePhase {
  // Zonder contract is elke volledigheidsklacht een contractprobleem: de pagina
  // had geen inhoudsopgave om compleet tegen te zijn.
  if (!context.contractAanwezig && (issue.dimension === "volledigheid" || issue.bron === "contractdekking")) {
    return "contract";
  }

  // Een bewering zonder dekking terwijl er wél feiten lagen, is een schrijffout.
  if ((issue.bron === "feitelijkheid" || issue.bron === "bronherleidbaarheid") && context.bewijsAanwezig) {
    return "schrijven";
  }

  // Een lege of te algemene sectie terwijl er géén feit voor bestond, is een
  // kennisprobleem, en dan had de briefing de vraag moeten stellen.
  if (
    !context.bewijsAanwezig &&
    (issue.dimension === "specificiteit" || issue.dimension === "bewijs")
  ) {
    return "kennis";
  }

  return BRON_FASE[issue.bron] ?? "schrijven";
}

export interface RootCause {
  fase: PipelinePhase;
  /** Hoeveel bevindingen uit deze fase komen. */
  aantal: number;
  /** Hoeveel daarvan blokkeren. */
  blokkerend: number;
  /** De zwaarste bevinding uit deze fase, als voorbeeld. */
  voorbeeld: string | null;
}

/**
 * Waar zit het probleem van deze pagina?
 *
 * Levert de fases gesorteerd op zwaarte: eerst waar de blokkades zitten, dan
 * waar de meeste bevindingen zitten. Een lege lijst betekent dat er niets mis
 * is, en dat is een geldig antwoord.
 */
export function analyseerRootCause(
  issues: readonly QualityIssue[],
): RootCause[] {
  const perFase = new Map<PipelinePhase, RootCause>();

  for (const issue of issues) {
    const bestaand = perFase.get(issue.phase);
    if (bestaand) {
      bestaand.aantal++;
      if (issue.blocking) bestaand.blokkerend++;
      if (issue.blocking && !bestaand.voorbeeld) bestaand.voorbeeld = issue.finding;
    } else {
      perFase.set(issue.phase, {
        fase: issue.phase,
        aantal: 1,
        blokkerend: issue.blocking ? 1 : 0,
        voorbeeld: issue.finding,
      });
    }
  }

  return [...perFase.values()].sort(
    (a, b) =>
      b.blokkerend - a.blokkerend ||
      // ⚠️ Bij een gelijk aantal blokkades wint de fase die een HERSCHRIJVING
      // NIET kan oplossen, ook als daar minder bevindingen uit komen.
      //
      // Gemeten in de ketentest: een pagina met één blokkade uit de kennis
      // (een kernsectie zonder feit) en één uit het schrijven, plus drie gewone
      // schrijfbevindingen, kwam op "dit is een schrijfprobleem" uit. Dat is de
      // verkeerde conclusie met een dure staart: `reparatieHeeftZin()` leest de
      // zwaarste oorzaak, dus de app zou drie reparatierondes betalen voor een
      // pagina die geblokkeerd blijft tot de ondernemer zijn vraag beantwoordt.
      //
      // De volgorde is dus niet "waar zitten de meeste bevindingen" maar "wat
      // houdt deze pagina tegen": een ontbrekend feit lost geen herschrijving
      // op, vier stroeve zinnen wel.
      Number(herschrijvingHelpt(a.fase)) - Number(herschrijvingHelpt(b.fase)) ||
      b.aantal - a.aantal ||
      a.fase.localeCompare(b.fase),
  );
}

/**
 * Valt deze fase met een herschrijving op te lossen?
 *
 * Drie van de zeven: het schrijven zelf, de keuring, en de briefing (daar is de
 * vraag al gesteld en kan de tekst er alsnog omheen). De andere vier vragen om
 * een handeling buiten de schrijfronde, en die staat in `FASE_HANDELING`.
 */
function herschrijvingHelpt(fase: PipelinePhase): boolean {
  return fase === "schrijven" || fase === "keuring" || fase === "briefing";
}

/**
 * Wat er MOET GEBEUREN, gegeven de zwaarste oorzaak.
 *
 * Dit is het antwoord op "en wat doen we eraan", en het is de reden dat dit hele
 * bestand bestaat. Elke zin hier wijst naar een handeling die iemand kan
 * uitvoeren, niet naar een fase-naam.
 */
export const FASE_HANDELING: Record<PipelinePhase, string> = {
  kans: "De aanbeveling zelf klopt niet: deze pagina beantwoordt een andere vraag dan die gemist werd. Kies een andere kans of pas de doelvraag aan.",
  onderzoek:
    "Het onderzoek naar dit merk mist informatie die op de site staat. Draai de crawl opnieuw of vul de aanbodboom aan.",
  kennis:
    "We weten te weinig van dit bedrijf om deze pagina waar te maken. Herschrijven lost dat niet op; hier hoort een vraag aan de klant.",
  contract:
    "De inhoudsopgave vroeg de verkeerde secties. Laat de planstap opnieuw draaien voordat er weer geschreven wordt.",
  briefing:
    "De vragen aan de klant misten het gat dat deze pagina heeft. Stel de vraag alsnog en schrijf daarna opnieuw.",
  schrijven: "Dit is een schrijfprobleem: het materiaal lag er, de tekst gebruikt het niet goed. Een gerichte reparatie helpt hier.",
  keuring:
    "De kwaliteitscontrole zelf kon deze pagina niet volledig beoordelen. Kijk hem met de hand na voordat je publiceert.",
};

/**
 * Eén zin die zegt waar het misging en wat eraan te doen is.
 *
 * Voor het adviseursscherm en voor het logboek van een ronde. Bewust één zin:
 * de volledige lijst staat in `quality_json`, dit is de kop erboven.
 */
export function beschrijfRootCause(oorzaken: readonly RootCause[]): string {
  const zwaarste = oorzaken[0];
  if (!zwaarste) return "Er zijn geen kwaliteitsproblemen gevonden.";
  return (
    `De meeste problemen komen uit ${PHASE_LABELS[zwaarste.fase]} ` +
    `(${zwaarste.aantal} ${zwaarste.aantal === 1 ? "bevinding" : "bevindingen"}` +
    `${zwaarste.blokkerend > 0 ? `, waarvan ${zwaarste.blokkerend} blokkerend` : ""}). ` +
    FASE_HANDELING[zwaarste.fase]
  );
}

/**
 * Mag er nog een reparatieronde komen, gezien de oorzaak?
 * (punt 19 van de opdracht: geen AI-aanroep waar hij niets oplost)
 *
 * ── DE REGEL, EN WAT HIJ BESPAART ───────────────────────────────────────────
 *
 * Nee zodra de zwaarste oorzaak in `kennis`, `contract`, `kans` of `onderzoek`
 * ligt. Herschrijven verandert daar niets aan: het model krijgt hetzelfde
 * materiaal en levert dezelfde pagina in andere woorden.
 *
 * Gemeten op productie is dat geen theorie. De vier pagina's van 1 september
 * kregen samen elf reparatierondes voor $0,78 per pagina, en de kwaliteitsscore
 * ging van 78 naar 52, van 68 naar 36 en van 48 naar 48. Alle drie hadden een
 * bronherleidbaarheid onder de 40 procent, dus alle drie hadden een
 * kennisprobleem en geen schrijfprobleem.
 */
export function reparatieHeeftZin(oorzaken: readonly RootCause[]): boolean {
  const zwaarste = oorzaken[0];
  if (!zwaarste) return false;
  return herschrijvingHelpt(zwaarste.fase);
}

/** De dimensies die op een kennisprobleem wijzen in plaats van op een schrijfprobleem. */
export const KENNISDIMENSIES: readonly QualityDimension[] = ["bewijs", "specificiteit"];
