/**
 * Van paginastrategie naar schrijfopdracht (docs/tasks/contentpijplijn-publicatiewaardig.md
 * §5 L7, WP4).
 *
 * ── WAT ER VERANDERT VOOR DE SCHRIJVER ──────────────────────────────────────
 *
 * Tot WP4 kreeg de schrijver een contract met "Alles wat hier staat MOET erop
 * komen", de hele feitenkaart (44 feiten bij de hovenier, 84 bij de
 * installateur), een paginaplan met "GEEN BRON" en achttien blokken; samen
 * gemiddeld 14.100 tokens. Voor een ontbrekend feit kreeg hij tegenstrijdige
 * opdrachten, en de enige uitweg was het gat opschrijven ("is niet
 * vastgelegd"), §1.2 O2.
 *
 * Nu krijgt hij de beslissingen van de strategie, de opbouw die code daaruit
 * afleidt, en alleen de gekozen feiten. Weglaten mag, en wordt vastgelegd in
 * `weggelaten`. Wat niet op de pagina hoort, staat er uitdrukkelijk bij, zodat
 * de schrijver weet waar hij over zwijgt.
 *
 * Puur (conventie 2): de opdracht en de opbouw zijn testbaar zonder model.
 */
import type { PageStrategy } from "@/lib/schemas/page-strategy";
import { normaliseerRef } from "@/lib/pipeline/strategie-check";
import { faqblok, faqFeiten, type FaqSelectie } from "@/lib/pipeline/faq-criteria";

/** De feiten die de strategie koos: prioriteit, optioneel, en waar een gekozen onderwerp op rust. */
export function gekozenRefs(s: PageStrategy, faq?: FaqSelectie | null): Set<string> {
  const refs = new Set<string>();
  // De feiten onder de gekozen FAQ horen er ook bij (WP7): anders krijgt de
  // schrijver een vraag waarvan hij het antwoord niet op zijn kaart ziet.
  for (const f of faqFeiten(faq)) refs.add(normaliseerRef(f));
  for (const p of s.prioriteitsfeiten) refs.add(normaliseerRef(p.feit));
  for (const f of s.optioneleFeiten) refs.add(normaliseerRef(f));
  for (const o of s.onderwerpen) {
    if (o.besluit !== "opnemen") continue;
    for (const f of o.feiten) refs.add(normaliseerRef(f));
  }
  return refs;
}

export interface OpbouwPunt {
  onderwerp: string;
  woorden: number | null;
  bron: "feit" | "vakkennis" | "geen";
  feiten: string[];
  /** De termen van de gecontroleerde algemene uitleg waarop het rust. */
  uitleg: string[];
}

/** De opbouw: de onderwerpen die erop komen, in de volgorde van de strategie. */
export function opbouwUitStrategie(s: PageStrategy): OpbouwPunt[] {
  return s.onderwerpen
    .filter((o) => o.besluit === "opnemen")
    .map((o) => ({
      onderwerp: o.onderwerp,
      woorden: o.woorden,
      bron: o.bron,
      feiten: o.feiten.map(normaliseerRef),
      // Een strategie van vóór 25 september 2026 heeft dit veld niet.
      uitleg: o.uitleg ?? [],
    }));
}

/** Wat niet op de pagina komt: weggelaten onderwerpen, vragen aan de ondernemer, en onzekerheden A en C. */
export function nietOpDezePagina(s: PageStrategy): string[] {
  const uit: string[] = [];
  for (const o of s.onderwerpen) {
    if (o.besluit === "weglaten") uit.push(o.onderwerp);
    if (o.besluit === "eerst vragen") uit.push(`${o.onderwerp} (daar vragen wij de ondernemer eerst naar)`);
  }
  for (const o of s.onzekerheden) {
    if (o.bestemming === "A") uit.push(`${o.punt} (dat vragen wij de ondernemer; de pagina zwijgt erover)`);
    if (o.bestemming === "C") uit.push(o.punt);
  }
  return uit;
}

/** Het blok dat bovenaan de schrijfopdracht staat. */
export function strategieblok(s: PageStrategy, faq?: FaqSelectie | null): string {
  const opbouw = opbouwUitStrategie(s);
  const niet = nietOpDezePagina(s);
  const voorbehouden = s.onzekerheden.filter((o) => o.bestemming === "B" && o.formulering?.trim());
  const regels: string[] = [
    "DE PAGINASTRATEGIE. De redactie heeft gekozen wat er op deze pagina komt; jij schrijft het. Volg " +
      "deze keuzes. Kun je een punt uit de opbouw niet goed schrijven met wat je hebt, laat het dan weg en " +
      "zet het in `weggelaten` met de reden. Weglaten is beter dan opvullen.",
    `Lezer: ${s.lezer} (fase: ${s.fase}, zoekt om te ${s.zoekintentie}).`,
    `Wat de lezer na afloop doet: ${s.paginadoel}`,
    `Kernboodschap: ${s.kernboodschap}`,
    `Hoek (waarom deze pagina naast de andere bestaat): ${s.hoek}`,
    `Openingsantwoord, bovenaan in hoogstens twee zinnen: ${s.openingsantwoord}`,
    s.bezwaar ? `Het bezwaar dat deze pagina wegneemt: ${s.bezwaar}` : "",
    `Oproep aan het eind: ${s.oproep}`,
    `Lengte: ongeveer ${s.lengtebudget.woorden} woorden in bodyMarkdown, niet meer. Een AI-assistent ` +
      `citeert een korte, stellige zin.`,
    "",
    "OPBOUW, in deze volgorde, één kop per punt (een mededeling, geen vraag):",
    ...opbouw.map((o, i) => {
      const waarop = [
        o.feiten.length ? `rust op ${o.feiten.join(", ")}` : "",
        o.uitleg.length
          ? `gebruik de gecontroleerde uitleg over ${o.uitleg.join(" en ")}`
          : o.bron === "vakkennis" && !o.feiten.length
            ? "algemene vakkennis"
            : "",
        // Algemene uitleg zegt wat gebruikelijk is, niet wat dit bedrijf doet: anders
        // wordt het een belofte die niemand heeft gedaan (werkstand §4, punt 1).
        o.bron === "vakkennis" ? "zeg wat gebruikelijk is, niet wat dit bedrijf doet of belooft" : "",
      ].filter(Boolean);
      return `${i + 1}. ${o.onderwerp}${o.woorden ? ` (ongeveer ${o.woorden} woorden)` : ""}; ${waarop.join("; ")}`;
    }),
    "",
    "PRIORITEITSFEITEN. Deze staan erin, stellig, zonder voorbehoud erachter:",
    ...s.prioriteitsfeiten.map((p) => `- ${normaliseerRef(p.feit)}: ${p.betekenis}`),
    s.optioneleFeiten.length ? `Mag ook, hoeft niet: ${s.optioneleFeiten.map(normaliseerRef).join(", ")}.` : "",
    niet.length
      ? `\nNIET OP DEZE PAGINA. Hier schrijf je niets over, ook geen zin dat het onbekend is en geen FAQ:\n- ${niet.join("\n- ")}`
      : "",
    voorbehouden.length
      ? `\nEEN VOORBEHOUD DAT WEL MAG, precies één keer en in deze woorden:\n- ${voorbehouden.map((o) => o.formulering).join("\n- ")}`
      : "\nGeen voorbehouden: een feit staat stellig, en een bandbreedte is al voorzichtig genoeg.",
    s.gevoelig.length ? `\nGEVOELIG, hier hoort nuance:\n- ${s.gevoelig.map((g) => `${g.onderwerp}: ${g.nuance}`).join("\n- ")}` : "",
    // WP7: de FAQ volgens de vier criteria. Ontbreekt de selectie (een strategie
    // van vóór WP7), dan geen blok en beslist de schrijver zoals voorheen.
    faq !== undefined ? `\n${faqblok(faq)}` : "",
  ];
  return regels.filter((r) => r !== "").join("\n");
}

/**
 * Regel 7, 10 en 11 van de schrijfprompt voor een pagina met strategie. De rest
 * van de harde regels (feitenkaart, concurrenten, leestekens, naam in de eerste
 * alinea en de afsluiting) blijft gelijk; zie `CONTENT_SYSTEM_BASIS` in content.ts.
 */
export const REGEL_7_STRATEGIE =
  "(7) Beantwoord de hoofdvraag en wat de opbouw kiest. Een vervolgvraag die niet in de opbouw staat, " +
  "hoort op deze pagina niet thuis. ";

export const REGELS_STRATEGIE =
  "(10) DE STRATEGIE. Bovenaan staat wat de redactie voor deze pagina koos: de opbouw, de " +
  "prioriteitsfeiten en wat er NIET op komt. Houd je daaraan. Elk punt van de opbouw krijgt een kop, " +
  "in die volgorde, met minstens één zin die losstaand te begrijpen is. Je MAG een punt weglaten als " +
  "je het niet goed kunt schrijven met wat je hebt; zet het dan in `weggelaten` met de reden, en " +
  "schrijf er NIETS over op de pagina, ook geen zin dat iets niet bekend of niet vastgelegd is. Voeg " +
  "geen onderwerp toe dat niet in de opbouw staat. " +
  "(11) ALGEMENE UITLEG. Onder 'GECONTROLEERDE ALGEMENE UITLEG' staat uitleg over het onderwerp " +
  "waarvan wij de bron hebben nagerekend. Gebruik hem alleen waar de opbouw om uitleg vraagt. Hij gaat " +
  "over het ONDERWERP en nooit over dit bedrijf, dus er hoort geen F-nummer bij. Verzin nooit een " +
  "cijfer, een norm of een termijn die je niet hebt gekregen.";

/** Wat er in `content_pieces.strategy_json` staat (migratie 0114). */
export interface StrategieRecord {
  versie: 1;
  invoerSleutel: string;
  strategie: PageStrategy;
  /** Wat het model koos, vóór de correcties (conventie 8). */
  ruw: PageStrategy;
  correcties: string[];
  waarschuwingen: string[];
  vragenAanOndernemer: string[];
  /** Het F-nummer en het feit-id, zodat de keuze na te lezen is als de nummering verschuift. */
  feitIds: Record<string, string | null>;
  model: string;
  duurMs: number | null;
  achtergrond: boolean;
  gemaaktOp: string;
  /**
   * De FAQ volgens de vier criteria (L6, WP7). Ontbreekt bij een strategie van
   * vóór WP7; `null` als de selectie mislukte (dan geen FAQ).
   */
  faq?: FaqSelectie | null;
  /** Conflicten die deze pagina tegenhouden. Leeg = de pagina mag geschreven worden. */
  tegengehouden: { conflictId: string; soort: string; ref: string }[];
}


/** Leest een opgeslagen strategie terug, of `null` als het geen bruikbare is. */
export function strategieUitRij(json: unknown): StrategieRecord | null {
  const r = json as Partial<StrategieRecord> | null;
  if (!r || r.versie !== 1 || !r.strategie || !r.invoerSleutel) return null;
  return r as StrategieRecord;
}

