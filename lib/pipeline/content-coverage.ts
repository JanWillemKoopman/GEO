/**
 * De DEKKINGSPOORT: doet de tekst wat het contract beloofde?
 * (docs/tasks/contentpijplijn-herontwerp.md A3, migratie 0082)
 *
 * ── WAAROM DIT DE ONTBREKENDE POORT WAS ─────────────────────────────────────
 *
 * `content-gate.ts` toetst of de pagina zijn DOELVRAAG meteen beantwoordt, of
 * het bedrijf bij naam genoemd wordt, of er cijfers in staan en of er niet
 * doorverwezen wordt. Allemaal eigenschappen van de tekst als geheel. Wat er
 * niet in zat: of alles wat op deze pagina hoorde te staan er ook echt staat.
 * Die vraag hing aan promptregel 7 ("beantwoord ook de logische vervolgvragen")
 * en aan één boolean die het model over zichzelf invulde.
 *
 * Nagerekend op productie (1 september 2026, 29 afgeronde pagina's): gemiddeld
 * 548 woorden waar een artikel op 700 tot 1200 mikt, en 15 pagina's met "check
 * nodig". Dat is de meetbare kant van "de lezer heeft het gevoel dat er iets
 * ontbreekt".
 *
 * ── WAT DEZE POORT WEL EN NIET KAN ──────────────────────────────────────────
 *
 * Hij telt of elke sectie uit het contract bestaat, of er in die sectie een zin
 * staat die de deelvraag echt raakt, of de verplichte F-nummers gebruikt zijn,
 * of de uit te leggen termen voorkomen, en of de geplande FAQ-vragen er zijn.
 * Dat is woordoverlap, geen begrip: hij ziet niet of een antwoord KLOPT. Het
 * inhoudelijke oordeel komt van de citeerbaarheidsbeoordelaar
 * (`lib/schemas/content-panel.ts`), en de twee vullen elkaar aan zoals de
 * GEO-poort en de redacteur dat al deden.
 *
 * ── ONBEKEND IS GEEN ONVOLDOENDE ────────────────────────────────────────────
 *
 * Zonder contract is de uitkomst `null` en geen 0: dan is er niets om tegen te
 * toetsen, en een pagina afrekenen op een toets die niet gedraaid heeft is
 * hetzelfde als een verkeerde waarde invullen waar `null` hoort (conventie 3).
 *
 * Bewust ZONDER `server-only` (conventie 2): pure tekstanalyse, testbaar vanuit
 * `scripts/test-unit.ts`.
 */
import type { ContentContract, ContractSection } from "@/lib/schemas/content-contract";
import { splitSections, normalizeHeading } from "@/lib/pipeline/content-sections";
import { topicTerms, scoreTermOverlap } from "@/lib/pipeline/page-relevance";

/**
 * Welk deel van de kernwoorden van een deelvraag in een sectie moet voorkomen
 * voordat hij als "behandeld" telt.
 *
 * De helft, dezelfde drempel als `ECHO_DREMPEL` in `content-gate.ts`. Lager zou
 * elke sectie slagen die het onderwerp één keer noemt; hoger zou een sectie
 * afkeuren die de vraag in andere woorden beantwoordt, en dat is precies wat
 * goed geschreven tekst doet.
 */
const DEELVRAAG_DREMPEL = 0.5;

/** Zo veel woorden moet een sectie minstens hebben om als geschreven te tellen. */
const MIN_WOORDEN_PER_SECTIE = 25;

export interface SectionCoverage {
  id: string;
  heading: string;
  /** Staat er een sectie met deze kop (of een duidelijke variant)? */
  aanwezig: boolean;
  /** Raakt de tekst van die sectie de deelvraag? */
  beantwoordt: boolean;
  /** Heeft de sectie genoeg tekst om iets te zeggen? */
  uitgewerkt: boolean;
  /** F-nummers uit het contract die nergens als bewering zijn aangemeld. */
  ongebruikteFeiten: string[];
  /** Termen die uitgelegd hadden moeten worden en niet voorkomen. */
  ontbrekendeUitleg: string[];
}

export interface CoverageResult {
  /** Percentage van alle contractpunten dat gehaald is. `null` zonder contract. */
  score: number | null;
  /** Per sectie de uitslag, voor het scherm en voor de reparatiestap. */
  secties: SectionCoverage[];
  /** Geplande FAQ-vragen die niet terugkomen in de FAQ. */
  ontbrekendeFaq: string[];
  /** Staat het beloofde directe antwoord in de opening? */
  openingKlopt: boolean;
  /**
   * Wat er nog aan schort, in gewone taal, met de KOP erbij zodat de reparatie
   * weet welke sectie hij mag aanraken.
   */
  issues: string[];
}

export interface CoverageInput {
  contract: ContentContract | null;
  bodyMarkdown: string;
  faq: { q: string; a: string }[];
  /** De beweringen zoals het model ze aanmeldde, voor de F-nummercontrole. */
  claims: { factRef: string }[];
}

/** Hoeveel van de kernwoorden van `vraag` komen voor in `tekst`? */
function dekkingsgraad(vraag: string, tekst: string): number {
  const termen = topicTerms(vraag);
  if (termen.length === 0) return 1; // niets te toetsen: dan niet afrekenen
  return scoreTermOverlap(tekst, termen) / termen.length;
}

function woorden(tekst: string): number {
  return tekst.trim().split(/\s+/).filter(Boolean).length;
}

/** Het F-nummer normaliseren: "F3", "f3", "F03" en "Feit 3" zijn hetzelfde. */
function factNummer(ref: string): string {
  const match = /(\d+)/.exec(ref ?? "");
  return match ? `f${Number(match[1])}` : "";
}

function toetsSectie(
  sectie: ContractSection,
  geschreven: { heading: string; body: string }[],
  gebruikteFeiten: Set<string>,
): SectionCoverage {
  const doel = normalizeHeading(sectie.heading);
  // Eerst op kop, daarna op inhoud: het model mag een kop anders formuleren dan
  // het contract voorstelde, zolang de sectie er inhoudelijk staat. Afkeuren op
  // een synoniem zou de reparatiestap een sectie laten toevoegen die er al is.
  const opKop = geschreven.find((g) => normalizeHeading(g.heading) === doel);
  const opInhoud =
    opKop ??
    geschreven.find(
      (g) =>
        dekkingsgraad(sectie.heading, `${g.heading} ${g.body}`) >= DEELVRAAG_DREMPEL &&
        dekkingsgraad(sectie.subQuestion, g.body) >= DEELVRAAG_DREMPEL,
    );

  const gevonden = opInhoud ?? null;
  const tekst = gevonden ? `${gevonden.heading} ${gevonden.body}` : "";

  const ongebruikteFeiten = sectie.factRefs
    .map(factNummer)
    .filter((nr) => nr && !gebruikteFeiten.has(nr))
    .map((nr) => nr.toUpperCase());

  const ontbrekendeUitleg = sectie.explainerTerms.filter(
    (term) => term.trim() && dekkingsgraad(term, tekst) < DEELVRAAG_DREMPEL,
  );

  return {
    id: sectie.id,
    heading: sectie.heading,
    aanwezig: Boolean(gevonden),
    beantwoordt: Boolean(gevonden) && dekkingsgraad(sectie.subQuestion, tekst) >= DEELVRAAG_DREMPEL,
    uitgewerkt: Boolean(gevonden) && woorden(gevonden!.body) >= MIN_WOORDEN_PER_SECTIE,
    ongebruikteFeiten,
    ontbrekendeUitleg,
  };
}

/**
 * Rekent de geschreven pagina na tegen zijn eigen contract.
 *
 * De issues zijn met opzet geformuleerd als opdracht mét kop erbij ("In de
 * sectie 'Wat kost het': …"). De reparatiestap gebruikt die kop om te bepalen
 * welke sectie hij herschrijft, dus een bevinding zonder kop is voor hem
 * onbruikbaar.
 */
export function checkContractCoverage(input: CoverageInput): CoverageResult {
  const { contract, bodyMarkdown, faq, claims } = input;

  if (!contract || contract.sections.length === 0) {
    return { score: null, secties: [], ontbrekendeFaq: [], openingKlopt: true, issues: [] };
  }

  const geschreven = splitSections(bodyMarkdown).map((s) => ({ heading: s.heading, body: s.body }));
  const gebruikteFeiten = new Set(claims.map((c) => factNummer(c.factRef)).filter(Boolean));
  const secties = contract.sections.map((s) => toetsSectie(s, geschreven, gebruikteFeiten));

  // De opening: de eerste sectie zonder kop, of anders het begin van de tekst.
  const aanhef = geschreven.find((g) => !g.heading)?.body ?? bodyMarkdown.slice(0, 600);
  const openingKlopt = dekkingsgraad(contract.openingAnswer, aanhef) >= DEELVRAAG_DREMPEL;

  const faqTekst = faq.map((f) => `${f.q} ${f.a}`).join(" ");
  const ontbrekendeFaq = contract.faqQuestions.filter(
    (vraag) => vraag.trim() && dekkingsgraad(vraag, faqTekst) < DEELVRAAG_DREMPEL,
  );

  // ── De score ──────────────────────────────────────────────────────────────
  //
  // Elk contractpunt telt even zwaar: per sectie drie punten (aanwezig,
  // beantwoordt de deelvraag, is uitgewerkt), plus één punt per geplande
  // FAQ-vraag en één voor de opening. Even zwaar wegen is dezelfde keuze als
  // bij `geoScore()`: een gewogen gemiddelde is een cijfer waarvan achteraf
  // niemand meer kan navertellen hoe het tot stand kwam, en de lijst eronder
  // vertelt het echte verhaal.
  let gehaald = openingKlopt ? 1 : 0;
  let totaal = 1;
  for (const s of secties) {
    totaal += 3;
    if (s.aanwezig) gehaald += 1;
    if (s.beantwoordt) gehaald += 1;
    if (s.uitgewerkt) gehaald += 1;
  }
  totaal += contract.faqQuestions.length;
  gehaald += contract.faqQuestions.length - ontbrekendeFaq.length;

  const issues: string[] = [];
  if (!openingKlopt) {
    issues.push(
      `De pagina begint niet met het afgesproken directe antwoord. Zet dit bovenaan, ` +
        `vóór elke inleiding: "${contract.openingAnswer}"`,
    );
  }
  for (const s of secties) {
    if (!s.aanwezig) {
      issues.push(
        `De sectie "${s.heading}" ontbreekt. Voeg hem toe; hij moet deze vraag beantwoorden: ` +
          `"${contract.sections.find((c) => c.id === s.id)?.subQuestion ?? s.heading}".`,
      );
      continue;
    }
    if (!s.beantwoordt) {
      issues.push(
        `In de sectie "${s.heading}" staat geen zin die deze vraag beantwoordt: ` +
          `"${contract.sections.find((c) => c.id === s.id)?.subQuestion ?? ""}". Voeg dat antwoord toe.`,
      );
    }
    if (!s.uitgewerkt) {
      issues.push(
        `De sectie "${s.heading}" is te dun (minder dan ${MIN_WOORDEN_PER_SECTIE} woorden). ` +
          `Werk hem uit of voeg hem samen met een andere sectie.`,
      );
    }
    if (s.ongebruikteFeiten.length > 0) {
      issues.push(
        `In de sectie "${s.heading}" horen deze bevestigde feiten thuis en ze staan er niet: ` +
          `${s.ongebruikteFeiten.join(", ")}.`,
      );
    }
    if (s.ontbrekendeUitleg.length > 0) {
      issues.push(
        `In de sectie "${s.heading}" wordt dit begrip gebruikt zonder uitleg: ` +
          `${s.ontbrekendeUitleg.join(", ")}. Leg het kort uit.`,
      );
    }
  }
  if (ontbrekendeFaq.length > 0) {
    issues.push(
      `Deze vragen horen in de FAQ en staan er niet: ${ontbrekendeFaq.map((v) => `"${v}"`).join(", ")}.`,
    );
  }

  return {
    score: totaal > 0 ? Math.round((gehaald / totaal) * 100) : null,
    secties,
    ontbrekendeFaq,
    openingKlopt,
    issues,
  };
}
