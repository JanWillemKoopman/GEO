/**
 * De BEVINDING als type in plaats van als losse zin
 * (docs/tasks/contentkwaliteit-framework.md §4.3)
 *
 * ── WAT ER MIS WAS ──────────────────────────────────────────────────────────
 *
 * `content_pieces.review_notes` is `text[]`. Gemeten op de zeven pagina's van
 * 1 en 2 september 2026 stonden er 45 tot 96 regels in, per pagina. Ze kwamen
 * uit negen verschillende controles, hadden geen dimensie, geen ernst, geen
 * sectie, en niets zei of ze publicatie tegenhielden. De klant kreeg ze
 * allemaal te lezen; de reparatie kreeg er tien, gekozen op een regex-gewicht
 * (`content-issues.ts`).
 *
 * Daardoor kon de app twee dingen niet die de opdracht nu eist: zeggen WAAROM
 * een pagina onvoldoende is, en zeggen WAAR in de keten dat is ontstaan.
 *
 * ── HET MODEL ───────────────────────────────────────────────────────────────
 *
 * Eén type voor alle bronnen, met de vier velden die een reparatie bruikbaar
 * maken: wat is er gevonden (`finding`), waarop rust dat (`evidence`), wat had
 * er moeten staan (`expected`), en wat moet er gebeuren (`recommendation`).
 * Dat is precies het verschil tussen "maak dit beter" en de opdracht die §17
 * van de aanvraag beschrijft.
 *
 * ── ⚠️ `review_notes` BLIJFT BESTAAN EN BLIJFT GEVULD ───────────────────────
 *
 * Zes schermen en de klantweergave lezen die kolom. `issueTekst()` maakt van
 * elke bevinding dezelfde soort zin als voorheen, zodat er niets breekt en de
 * klant hetzelfde blijft zien. Het verschil zit erachter: `quality_json`
 * bewaart de bevinding mét zijn structuur, en de reparatie en het
 * adviseursscherm lezen díe.
 *
 * Bewust ZONDER `server-only` (conventie 2).
 */
import type { QualityDimension } from "@/lib/pipeline/quality-dimensions";

/**
 * Hoe erg is het?
 *
 * `blokkerend` is geen ernstgraad maar een aparte toestand: hij zegt dat de
 * pagina niet gepubliceerd hoort te worden, ongeacht het cijfer. Zie
 * `quality-score.ts` voor waarom score en blokkade uit elkaar moeten blijven.
 */
export const SEVERITIES = ["blokkerend", "hoog", "midden", "laag"] as const;
export type Severity = (typeof SEVERITIES)[number];

/**
 * De stap in de keten waar dit probleem ONTSTAAN is, niet waar het gevonden is.
 * (docs/tasks/contentkwaliteit-framework.md §4, punt 14 van de opdracht)
 *
 * Dit is het veld dat "de pagina is generiek" vertaalt naar "er is te weinig
 * bedrijfsinformatie" in plaats van naar "de schrijfprompt moet beter". De
 * toewijzing gebeurt in `root-cause.ts` en is puur afgeleid: geen AI, geen gok.
 */
export const PIPELINE_PHASES = [
  "kans",
  "onderzoek",
  "kennis",
  "contract",
  "briefing",
  "schrijven",
  "keuring",
] as const;
export type PipelinePhase = (typeof PIPELINE_PHASES)[number];

/** Wat elke fase betekent, in de taal van een adviseur. */
export const PHASE_LABELS: Record<PipelinePhase, string> = {
  kans: "de kans die uit de meting kwam",
  onderzoek: "het onderzoek naar het merk en de markt",
  kennis: "wat we van dit bedrijf weten",
  contract: "de inhoudsopgave van deze pagina",
  briefing: "de vragen aan de klant",
  schrijven: "de schrijfronde",
  keuring: "de kwaliteitscontrole zelf",
};

/** Welke controle deze bevinding vond. Voor de audit-trail en de kalibratie. */
export const ISSUE_BRONNEN = [
  "redactie",
  "feitelijkheid",
  "citeerbaarheid",
  "vakmanschap",
  "geo_poort",
  "contractdekking",
  "kwaliteitspoort",
  "bronpraat",
  "bronherleidbaarheid",
  "verboden_woord",
  "verboden_onderwerp",
  "typeregel",
  "bewijsdekking",
  "aanspreekvorm",
  "klantinstructie",
] as const;
export type IssueBron = (typeof ISSUE_BRONNEN)[number];

export interface QualityIssue {
  dimension: QualityDimension;
  severity: Severity;
  /** De kop van de sectie waar dit op slaat. `null` = de hele pagina. */
  section: string | null;
  /** Wat er gevonden is. Eén zin, in gewone taal. */
  finding: string;
  /** Waarop dat oordeel rust: een citaat, een cijfer, een F-nummer. */
  evidence: string | null;
  /** Wat er had moeten staan. Leeg als dat niet te zeggen is. */
  expected: string | null;
  /** Wat er moet gebeuren. Dit is wat het reparatiemodel als opdracht krijgt. */
  recommendation: string;
  /** Houdt dit publicatie tegen? */
  blocking: boolean;
  /**
   * Hoe zeker we van deze bevinding zijn, 0 tot 1.
   *
   * Een deterministische controle staat op 1: die telt, hij oordeelt niet. Een
   * AI-bevinding staat lager, want het model kan zich vergissen. Zonder dat
   * onderscheid weegt "het model vond de toon te formeel" even zwaar als "er
   * staat letterlijk een verboden woord in de tekst".
   */
  confidence: number;
  /** Waar in de keten dit ontstond. */
  phase: PipelinePhase;
  /** Welke controle hem vond. */
  bron: IssueBron;
}

/** Zekerheid van een controle die telt in plaats van oordeelt. */
export const ZEKER = 1;
/** Zekerheid van een AI-oordeel over een hele pagina. */
export const MODELOORDEEL = 0.7;

/**
 * Eén bevinding als leesbare zin, in de vorm die `review_notes` altijd al had.
 *
 * De sectie voorop, want dat is wat de klant als eerste zoekt ("waar dan?"), en
 * de aanbeveling achteraan, want dat is wat hij ermee moet. Bij een bevinding
 * over de hele pagina valt de sectie weg in plaats van dat er "(onbekend)"
 * staat: dat was de vorm van vroeger en die las als een fout in plaats van als
 * een pagina-brede opmerking.
 */
export function issueTekst(issue: QualityIssue): string {
  const kop = issue.section ? `In de sectie "${issue.section}": ` : "";
  const staart = issue.recommendation.trim() ? ` ${issue.recommendation.trim()}` : "";
  return `${kop}${issue.finding.trim()}${staart}`.replace(/\s+/g, " ").trim();
}

/** Alle bevindingen als de tekstregels die `review_notes` verwacht. */
export function issueTeksten(issues: readonly QualityIssue[]): string[] {
  const gezien = new Set<string>();
  const uit: string[] = [];
  for (const issue of issues) {
    const regel = issueTekst(issue);
    if (!regel || gezien.has(regel)) continue;
    gezien.add(regel);
    uit.push(regel);
  }
  return uit;
}

/**
 * Het gewicht van een bevinding bij het kiezen wat er gerepareerd wordt.
 *
 * Vervangt de regex-tabel van `content-issues.ts` voor bevindingen die als type
 * beschikbaar zijn: ernst maal zekerheid, met blokkades altijd bovenaan. Die
 * oude tabel blijft bestaan voor de tekstregels die er nog los binnenkomen (een
 * pagina van vóór dit werk), want daar is geen type van.
 */
export function issueGewicht(issue: QualityIssue): number {
  const ernst =
    issue.severity === "blokkerend" ? 100 : issue.severity === "hoog" ? 10 : issue.severity === "midden" ? 4 : 1;
  return ernst * Math.max(0.1, issue.confidence);
}

/**
 * De bevindingen die de reparatieronde meekrijgt, zwaarste eerst.
 *
 * ⚠️ Met 119 opdrachten over 25 secties raakt het model vrijwel de hele pagina
 * aan, en dan is er niets gerichts meer aan een sectiereparatie (verbetering 5
 * van de contentronde van 1 september). Dezelfde grens als voorheen, alleen op
 * ernst in plaats van op woordpatronen.
 */
export function prioriteerIssues(issues: readonly QualityIssue[], max: number): QualityIssue[] {
  return [...issues]
    .sort((a, b) => issueGewicht(b) - issueGewicht(a) || a.finding.localeCompare(b.finding))
    .slice(0, Math.max(0, max));
}

/** De bevindingen die publicatie tegenhouden. */
export function blokkerendeIssues(issues: readonly QualityIssue[]): QualityIssue[] {
  return issues.filter((i) => i.blocking);
}

/**
 * Bevindingen groeperen per sectie, voor de reparatieopdracht.
 *
 * Een sectie krijgt zijn eigen blok met alle problemen die erin zitten, in
 * plaats van dat het model één lange lijst krijgt waarin het zelf moet uitzoeken
 * welke regel bij welke kop hoort. Bevindingen zonder sectie komen onder de
 * sleutel `""` en gelden voor de hele pagina.
 */
export function issuesPerSectie(issues: readonly QualityIssue[]): Map<string, QualityIssue[]> {
  const perSectie = new Map<string, QualityIssue[]>();
  for (const issue of issues) {
    const sleutel = issue.section?.trim() ?? "";
    const lijst = perSectie.get(sleutel);
    if (lijst) lijst.push(issue);
    else perSectie.set(sleutel, [issue]);
  }
  return perSectie;
}

/**
 * Een losse tekstregel als bevinding, voor bronnen die nog geen type leveren.
 *
 * Nodig omdat de reparatietaak zijn bevindingen als `string[]` in de payload
 * krijgt (`lib/jobs/types.ts`) en een taak die al in de wachtrij stond, na een
 * deploy nog steeds moet werken. Ernst `midden` en zekerheid 0,5: onbekend is
 * geen onvoldoende en ook geen zekerheid (conventie 3).
 */
export function issueUitTekst(regel: string): QualityIssue {
  return {
    dimension: "relevantie",
    severity: "midden",
    section: null,
    finding: regel.trim(),
    evidence: null,
    expected: null,
    recommendation: "",
    blocking: false,
    confidence: 0.5,
    phase: "schrijven",
    bron: "redactie",
  };
}

/** Bevindingen inlezen uit opgeslagen JSON, met alle onbekende vormen eruit. */
export function issuesUitJson(ruw: unknown): QualityIssue[] {
  if (!Array.isArray(ruw)) return [];
  const uit: QualityIssue[] = [];
  for (const item of ruw) {
    if (!item || typeof item !== "object") continue;
    const rij = item as Record<string, unknown>;
    if (typeof rij.finding !== "string" || !rij.finding.trim()) continue;
    uit.push({
      dimension: (rij.dimension as QualityDimension) ?? "relevantie",
      severity: (SEVERITIES as readonly string[]).includes(rij.severity as string)
        ? (rij.severity as Severity)
        : "midden",
      section: typeof rij.section === "string" && rij.section ? rij.section : null,
      finding: rij.finding,
      evidence: typeof rij.evidence === "string" ? rij.evidence : null,
      expected: typeof rij.expected === "string" ? rij.expected : null,
      recommendation: typeof rij.recommendation === "string" ? rij.recommendation : "",
      blocking: rij.blocking === true,
      confidence: typeof rij.confidence === "number" ? rij.confidence : 0.5,
      phase: (PIPELINE_PHASES as readonly string[]).includes(rij.phase as string)
        ? (rij.phase as PipelinePhase)
        : "schrijven",
      bron: (ISSUE_BRONNEN as readonly string[]).includes(rij.bron as string)
        ? (rij.bron as IssueBron)
        : "redactie",
    });
  }
  return uit;
}
