/**
 * WELKE UITSLAG VAN WELK CLUSTER MOET NOG GEMELD WORDEN, EN IN WELKE WOORDEN.
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Tot 22 september 2026 had een cluster een eigen resultatenpagina
 * (`/analyses/[id]`). Die pagina was tegelijk het wachtscherm: zij vroeg elke
 * paar seconden de status op, en daardoor was er iemand die merkte dat de
 * meting klaar was. Diezelfde pagina herhaalde daarna cijfers die op Analytics
 * staan, vragen die bij Openstaande vragen staan en pagina's die in het
 * Contentplan staan, en is daarom weggehaald.
 *
 * Wat niet verloren mocht gaan is dat ene moment: de meting is klaar. Dat is nu
 * een melding rechtsonder in beeld, waar je ook bent in de app. Deze module
 * beslist wélke clusters zo'n melding verdienen en wat erin staat.
 *
 * Puur en zonder `server-only` (conventie 2): de beslissing is de kern van deze
 * functie, en die hoort toetsbaar te zijn vanuit `scripts/test-unit.ts` zonder
 * database.
 *
 * ── DE REGEL IS: ÉÉN KEER PER RONDE ─────────────────────────────────────────
 *
 * `resultaatGezienAt` (migratie 0107) is leeg zolang de uitslag van de laatste
 * ronde nog niet gemeld is, en `enqueueMeasurement()` maakt hem leeg zodra er
 * een nieuwe ronde ingepland wordt. Daarmee komt elke melding precies één keer,
 * ook als iemand vijf schermen achter elkaar opent, en komt hij alsnog als de
 * klant pas de volgende ochtend inlogt.
 */
import type { AnalysisStatus } from "@/lib/types/database";

export type MeldingSoort = "gemeten" | "mislukt";

/** De stand van één cluster, zoals het meldingsendpunt hem aanlevert. */
export interface ClusterStand {
  id: string;
  naam: string;
  status: AnalysisStatus;
  /** Leeg = de uitslag van de laatste ronde is nog niet gemeld. */
  resultaatGezienAt: string | null;
  /** Percentage. `null` = nog niet meetbaar, nooit 0 als vervanging (conventie 3). */
  zichtbaarheid: number | null;
  /** `null` = niet op te halen. 0 betekent hier echt: er staat niets open. */
  openVragen: number | null;
  voorgesteld: number;
}

export interface ClusterMelding {
  analysisId: string;
  soort: MeldingSoort;
  titel: string;
  /** Eén regel onder de titel: wat dit voor de gebruiker betekent. */
  regel: string;
}

/**
 * Welke statussen betekenen "deze ronde is afgelopen"?
 *
 * `gemeten` hoort er bewust NIET bij: de score is dan binnen maar het rapport
 * loopt nog, en juist het rapport levert de vragen en de voorgestelde pagina's
 * waar de melding over gaat. Melden bij `gemeten` zou twee van de drie cijfers
 * op nul zetten terwijl ze een minuut later wel bestaan.
 */
const AFGEROND: ReadonlySet<AnalysisStatus> = new Set<AnalysisStatus>(["gereed", "mislukt"]);

/** Hoort deze stand gemeld te worden? */
export function moetMelden(stand: ClusterStand): boolean {
  return AFGEROND.has(stand.status) && stand.resultaatGezienAt === null;
}

/**
 * Het cijfer met zijn gevolg erachter, of eerlijk "nog geen score".
 *
 * Een kaal percentage zegt een klant niets; "34% zichtbaarheid" zegt hoe vaak
 * AI-assistenten hem noemen op de vragen van dit cluster. Is er geen score, dan
 * staat dat er, want een 0 zou een gemeten nul beweren (conventie 3).
 */
function zichtbaarheidszin(zichtbaarheid: number | null): string {
  if (zichtbaarheid === null) return "nog geen score";
  return `${Math.round(zichtbaarheid)}% zichtbaarheid`;
}

function vragenzin(openVragen: number | null): string {
  if (openVragen === null) return "vragen nog onbekend";
  if (openVragen === 0) return "geen openstaande vragen";
  return `${openVragen} ${openVragen === 1 ? "openstaande vraag" : "openstaande vragen"}`;
}

function voorstelzin(voorgesteld: number): string {
  if (voorgesteld === 0) return "nog geen voorgestelde pagina's";
  return `${voorgesteld} ${voorgesteld === 1 ? "voorgestelde pagina" : "voorgestelde pagina's"}`;
}

/**
 * De melding voor één afgeronde ronde.
 *
 * Bij een mislukking net zo goed als bij een geslaagde meting. Zonder dat
 * tweede geval blijft een klant wachten op een melding die nooit komt, en dat
 * is erger dan het scherm dat hiervoor in de plaats komt.
 */
export function maakMelding(stand: ClusterStand): ClusterMelding {
  if (stand.status === "mislukt") {
    return {
      analysisId: stand.id,
      soort: "mislukt",
      titel: `De meting van ${stand.naam} is vastgelopen`,
      regel:
        "Wat al gemeten is blijft bewaard. Je kunt het opnieuw proberen vanaf je clusteroverzicht.",
    };
  }
  return {
    analysisId: stand.id,
    soort: "gemeten",
    titel: "Cluster succesvol gemeten",
    regel:
      `${stand.naam}: ${zichtbaarheidszin(stand.zichtbaarheid)}, ` +
      `${vragenzin(stand.openVragen)}, ${voorstelzin(stand.voorgesteld)}.`,
  };
}

/**
 * Alle meldingen die nu op het scherm horen.
 *
 * ⚠️ Begrensd op drie. Wie een week weg is geweest heeft misschien acht
 * afgeronde clusters, en acht meldingen tegelijk zijn geen meldingen meer maar
 * een muur die je wegklikt. De rest wordt stil als gezien weggezet: de cijfers
 * staan op Analytics, de vragen bij Openstaande vragen en de pagina's in het
 * Contentplan, dus er gaat geen werk verloren.
 */
export const MAX_MELDINGEN = 3;

export function teMelden(standen: ClusterStand[]): {
  meldingen: ClusterMelding[];
  /** Alles wat als gemeld weggezet mag worden, ook wat de grens van drie niet haalde. */
  gezien: string[];
} {
  const rijp = standen.filter(moetMelden);
  return {
    meldingen: rijp.slice(0, MAX_MELDINGEN).map(maakMelding),
    gezien: rijp.map((s) => s.id),
  };
}
