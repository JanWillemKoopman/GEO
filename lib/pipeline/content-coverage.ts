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
import { splitRefs } from "@/lib/pipeline/factcard";
import type { PageStrategy } from "@/lib/schemas/page-strategy";

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

/**
 * Welk deel van zijn eigen richtlengte een sectie minstens moet halen
 * (optimalisatie 15, 4 september 2026).
 *
 * ⚠️ De ondergrens hierboven is ABSOLUUT: 25 woorden, wat het contract ook
 * afsprak. Een sectie met een richtlengte van 200 woorden die er 30 haalt, ging
 * daar dus gewoon doorheen, terwijl de inhoudsopgave hem als dragende sectie
 * plande. Het contract spreekt per sectie een lengte af (dat is de hele reden
 * dat `targetWords` per sectie staat en niet per pagina), en niets rekende die
 * afspraak na.
 *
 * De helft, en dat is bewust ruim: een schrijver mag een sectie compacter maken
 * dan gepland, want korter is vaak beter. Onder de helft is het geen keuze meer
 * maar een sectie die niet geschreven is.
 */
const DEEL_VAN_RICHTLENGTE = 0.5;

/** Hoeveel woorden deze sectie minstens moet hebben, gegeven zijn eigen afspraak. */
function ondergrensVoor(sectie: ContractSection): number {
  const richt = Number.isFinite(sectie.targetWords) ? sectie.targetWords : 0;
  return Math.max(MIN_WOORDEN_PER_SECTIE, Math.round(richt * DEEL_VAN_RICHTLENGTE));
}

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
  /**
   * Alleen bij een pagina met paginastrategie (WP4): onderwerpen die de
   * strategie uitsloot en die toch als sectie op de pagina staan. Blokkerend
   * (§12.1).
   */
  uitgeslotenAanwezig?: string[];
  /** Prioriteitsfeiten van de strategie die niet in de tekst zijn gebruikt. Blokkerend (§12.1). */
  ontbrekendePrioriteit?: string[];
  /** Secties die bij geen gekozen onderwerp horen. Hoog, niet blokkerend. */
  vreemdeSecties?: string[];
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

/**
 * Zinsvormen waarin een begrip daadwerkelijk wordt uitgelegd
 * (contentronde-gasservice-brabant-1-september-2026.md, verbetering 12).
 *
 * ── WAAROM DIT GEEN WOORDOVERLAP MEER IS ────────────────────────────────────
 *
 * De eis was: komt de term voor in DEZE sectie? Het model haalt die eis door in
 * elke sectie een definitiezin te plakken, en dan leest de pagina als een
 * woordenlijst. Vier opeenvolgende secties van de pagina "Snel installeren" op
 * 1 september 2026: "Een condensafvoer voert vocht af en de regeling stuurt het
 * systeem aan.", "Inbedrijfstelling betekent dat de werking wordt
 * gecontroleerd.", "Een richttermijn is een voorlopige indicatie, geen
 * afspraak.", "Subsidievoorwaarden zijn de regels voor toekenning en kunnen
 * wijzigen."
 *
 * Nu telt het voor de HELE pagina, en alleen als de term in een zin staat die
 * hem echt uitlegt. Eén keer goed uitleggen is genoeg; een term twaalf keer
 * noemen is dat niet.
 */
const DEFINITIE = /\b(is|zijn|betekent|betekenen|staat voor|noemen we|heet|heten|bestaat uit|verwijst naar|gaat over)\b/i;

/** Welke van deze termen worden ergens op de pagina echt uitgelegd? */
function uitgelegdeTermen(termen: readonly string[], paginaTekst: string): Set<string> {
  const zinnen = paginaTekst
    .split(/(?<=[.!?])\s+|\n+/)
    .map((z) => z.trim())
    .filter(Boolean);
  const uitgelegd = new Set<string>();
  for (const term of termen) {
    const schoon = term.trim();
    if (!schoon) continue;
    const raakt = zinnen.some(
      (zin) => dekkingsgraad(schoon, zin) >= DEELVRAAG_DREMPEL && DEFINITIE.test(zin),
    );
    if (raakt) uitgelegd.add(schoon);
  }
  return uitgelegd;
}

/**
 * De F-nummers uit een verwijzing, allemaal.
 *
 * ⚠️ Dit las met `(\d+)` alleen het EERSTE nummer, terwijl `isSupported` in
 * `factcard.ts` een samengestelde verwijzing juist netjes opsplitst (dat was
 * reparatie R8.3, omdat een correct onderbouwde claim anders als onbewezen
 * telde). Twee modules die hetzelfde veld anders lezen, geven twee
 * verschillende antwoorden op dezelfde vraag.
 *
 * Wat dat kostte op 1 september 2026: van de 18 claims op de pagina "Snel
 * installeren" hadden er 3 een samengestelde verwijzing ("F1, F5, F18",
 * "F6, F15", "F7, F12"). De dekkingspoort telde daarvan alleen F1, F6 en F7 als
 * gebruikt, en bleef F5, F18, F15 en F12 melden als "bevestigd feit niet
 * gebruikt". Die onterechte bevindingen gingen mee de reparatielus in.
 */
function factNummers(ref: string): string[] {
  return splitRefs(ref ?? "").map((r) => r.toLowerCase());
}

function toetsSectie(
  sectie: ContractSection,
  geschreven: { heading: string; body: string }[],
  gebruikteFeiten: Set<string>,
  /** De termen die ergens op de pagina in een echte definitiezin staan (A12). */
  uitgelegd: Set<string>,
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
    .flatMap(factNummers)
    .filter((nr) => nr && !gebruikteFeiten.has(nr))
    .map((nr) => nr.toUpperCase());

  // Per PAGINA getoetst, niet per sectie: zie `uitgelegdeTermen` hierboven.
  const ontbrekendeUitleg = sectie.explainerTerms.filter(
    (term) => term.trim() && !uitgelegd.has(term.trim()),
  );

  return {
    id: sectie.id,
    heading: sectie.heading,
    aanwezig: Boolean(gevonden),
    beantwoordt: Boolean(gevonden) && dekkingsgraad(sectie.subQuestion, tekst) >= DEELVRAAG_DREMPEL,
    uitgewerkt: Boolean(gevonden) && woorden(gevonden!.body) >= ondergrensVoor(sectie),
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
  const gebruikteFeiten = new Set(claims.flatMap((c) => factNummers(c.factRef)).filter(Boolean));
  const uitgelegd = uitgelegdeTermen(
    contract.sections.flatMap((s) => s.explainerTerms),
    `${bodyMarkdown}\n${faq.map((f) => `${f.q} ${f.a}`).join("\n")}`,
  );
  const secties = contract.sections.map((s) => toetsSectie(s, geschreven, gebruikteFeiten, uitgelegd));

  // De opening: de eerste sectie zonder kop, of anders het begin van de tekst.
  const aanhef = geschreven.find((g) => !g.heading)?.body ?? bodyMarkdown.slice(0, 600);
  // Een LEEG afgesproken antwoord is niet fout maar niet van toepassing: sinds
  // verbetering 3 laat `normaliseerContract` de opening vervallen als hij over
  // onze eigen bewijsvoering ging. Of de pagina dan met het juiste antwoord
  // begint, toetst `doelvraagInOpening` in content-gate.ts op de doelvraag zelf.
  const openingKlopt =
    contract.openingAnswer.trim().length === 0 ||
    dekkingsgraad(contract.openingAnswer, aanhef) >= DEELVRAAG_DREMPEL;

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
      const gepland = contract.sections.find((c) => c.id === s.id);
      const grens = gepland ? ondergrensVoor(gepland) : MIN_WOORDEN_PER_SECTIE;
      issues.push(
        `De sectie "${s.heading}" is te dun (minder dan ${grens} woorden, terwijl de inhoudsopgave ` +
          `er ${gepland?.targetWords ?? MIN_WOORDEN_PER_SECTIE} afsprak). Werk hem uit of voeg hem ` +
          `samen met een andere sectie.`,
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

// ════════════════════════════════════════════════════════════════════════════
// De dekking tegen de PAGINASTRATEGIE (WP4 van contentpijplijn-publicatiewaardig.md)
//
// Met een strategie telt niet meer of 85 procent van een contract erop staat,
// maar of de pagina doet wat de redactie koos: de gekozen onderwerpen staan
// erop (of de schrijver meldde ze als weggelaten), de uitgesloten onderwerpen
// staan er NIET op, en de prioriteitsfeiten zijn gebruikt. Een sectie die bij
// geen gekozen onderwerp hoort, is een bevinding: dat is precies de
// consumentengids die de strategie wegliet.
// ════════════════════════════════════════════════════════════════════════════

/** Een kop hoort bij een onderwerp als de kernwoorden van het onderwerp voor minstens deze fractie in de kop en de eerste zinnen staan. */
const ONDERWERP_DREMPEL = 0.5;
/** Strenger voor een UITGESLOTEN onderwerp, want dat blokkeert: de kop zelf moet het raken. */
const UITGESLOTEN_DREMPEL = 0.6;

function begin(tekst: string, tekens = 400): string {
  return tekst.slice(0, tekens);
}

export interface StrategieDekkingInput {
  strategie: PageStrategy;
  bodyMarkdown: string;
  faq: { q: string; a: string }[];
  claims: { factRef: string }[];
  proofPoints: { factRef: string }[];
  /** Wat de schrijver meldde als weggelaten; een gemeld punt is geen gat. */
  weggelaten: { punt: string }[];
}

export function checkStrategieDekking(input: StrategieDekkingInput): CoverageResult {
  const { strategie: s, bodyMarkdown, claims, proofPoints } = input;
  const geschreven = splitSections(bodyMarkdown).map((x) => ({ heading: x.heading, body: x.body }));
  const metKop = geschreven.filter((g) => g.heading.trim());
  const gebruikt = new Set(
    [...claims.map((c) => c.factRef), ...proofPoints.map((p) => p.factRef)].flatMap(factNummers).filter(Boolean),
  );
  const gemeld = input.weggelaten.map((w) => w.punt);

  const opnemen = s.onderwerpen.filter((o) => o.besluit === "opnemen");
  const uitgesloten = s.onderwerpen.filter((o) => o.besluit !== "opnemen").map((o) => o.onderwerp);

  const raakt = (onderwerp: string, g: { heading: string; body: string }) =>
    dekkingsgraad(onderwerp, `${g.heading} ${begin(g.body)}`) >= ONDERWERP_DREMPEL;

  const secties: SectionCoverage[] = opnemen.map((o, i) => {
    const gevonden = metKop.find((g) => raakt(o.onderwerp, g)) ?? null;
    const gemeldWeg = gemeld.some((p) => dekkingsgraad(o.onderwerp, p) >= ONDERWERP_DREMPEL);
    return {
      id: `onderwerp-${i + 1}`,
      heading: o.onderwerp,
      // Een punt dat de schrijver meldde als weggelaten, telt als afgehandeld:
      // weglaten mag, een gat opschrijven niet (§5 L7).
      aanwezig: Boolean(gevonden) || gemeldWeg,
      beantwoordt: Boolean(gevonden) || gemeldWeg,
      uitgewerkt: Boolean(gevonden) ? woorden(gevonden!.body) >= MIN_WOORDEN_PER_SECTIE : gemeldWeg,
      ongebruikteFeiten: [],
      ontbrekendeUitleg: [],
    };
  });

  const uitgeslotenAanwezig = uitgesloten.filter((onderwerp) =>
    metKop.some(
      (g) => dekkingsgraad(onderwerp, g.heading) >= UITGESLOTEN_DREMPEL && dekkingsgraad(onderwerp, g.body) >= ONDERWERP_DREMPEL,
    ),
  );

  const ontbrekendePrioriteit = s.prioriteitsfeiten
    .map((p) => p.feit.trim().toUpperCase())
    .filter((ref) => ref && !gebruikt.has(ref.toLowerCase()));

  // De laatste sectie mag de oproep zijn; die hoort bij geen onderwerp.
  const vreemdeSecties = metKop
    .filter((g, i) => !(i === metKop.length - 1 && dekkingsgraad(s.oproep, `${g.heading} ${g.body}`) >= ONDERWERP_DREMPEL))
    .filter((g) => !opnemen.some((o) => raakt(o.onderwerp, g)))
    .map((g) => g.heading);

  const aanhef = geschreven.find((g) => !g.heading)?.body ?? bodyMarkdown.slice(0, 600);
  const openingKlopt = !s.openingsantwoord.trim() || dekkingsgraad(s.openingsantwoord, aanhef) >= DEELVRAAG_DREMPEL;

  const issues: string[] = [];
  if (!openingKlopt) {
    issues.push(`De pagina begint niet met het gekozen openingsantwoord. Zet dit bovenaan: "${s.openingsantwoord}"`);
  }
  for (const sectie of secties) {
    if (!sectie.aanwezig) {
      issues.push(`Het onderwerp "${sectie.heading}" uit de opbouw staat er niet op. Schrijf het, of laat het bewust weg.`);
    }
  }
  for (const o of uitgeslotenAanwezig) {
    issues.push(`Het onderwerp "${o}" hoort volgens de strategie niet op deze pagina en staat er toch op. Haal het weg.`);
  }
  for (const ref of ontbrekendePrioriteit) {
    issues.push(`Het prioriteitsfeit ${ref} is niet gebruikt. Zet het stellig in de tekst, op de plek waar de lezer het nodig heeft.`);
  }
  for (const kop of vreemdeSecties) {
    issues.push(`De sectie "${kop}" hoort bij geen onderwerp uit de opbouw. Haal hem weg of voeg hem samen.`);
  }

  let gehaald = openingKlopt ? 1 : 0;
  let totaal = 1;
  for (const x of secties) {
    totaal += 1;
    if (x.aanwezig && x.uitgewerkt) gehaald += 1;
  }
  totaal += s.prioriteitsfeiten.length + uitgesloten.length;
  gehaald += s.prioriteitsfeiten.length - ontbrekendePrioriteit.length;
  gehaald += uitgesloten.length - uitgeslotenAanwezig.length;

  return {
    score: totaal > 0 ? Math.round((gehaald / totaal) * 100) : null,
    secties,
    ontbrekendeFaq: [],
    openingKlopt,
    issues,
    uitgeslotenAanwezig,
    ontbrekendePrioriteit,
    vreemdeSecties,
  };
}
