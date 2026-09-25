/**
 * De FAQ volgens de vier criteria (docs/tasks/contentpijplijn-publicatiewaardig.md §11, WP7).
 *
 * ── WAAROM ──────────────────────────────────────────────────────────────────
 *
 * Het contract vroeg om FAQ-vragen met de regel "Vraag NIET na wat er in de
 * secties hierboven al beantwoord wordt". Wat in de FAQ kwam was dus per
 * definitie wat niet in de tekst paste, meestal zonder feit, en dan werd het
 * antwoord een voorbehoud (§1.2, O8): "Welke regels gelden in Best voor het
 * afvoeren van regenwater (...)?" met "Deze pagina geeft geen bevestigde lokale
 * eis voor Best", en "Wat is op de lange termijn voordeliger: een cv-ketel kopen
 * of huren?" op de site van een bedrijf dat niet verhuurt.
 *
 * Nu kiest L6 uit kandidaten in volgorde van waarde (bezwaren uit het
 * verkoopgesprek, gemeten vragen, vervolgvragen uit eerdere keuringen, het
 * dossier), en de code past de criteria hieronder opnieuw toe. Een vraag zonder
 * onderbouwing wordt een vraag aan de ondernemer, geen voorbehoud. Nul vragen is
 * een geldige uitkomst; hoogstens vijf.
 *
 * Puur (conventie 2).
 */
import type { FaqSelection } from "@/lib/schemas/faq-selection";
import { topicTerms, scoreTermOverlap } from "@/lib/pipeline/page-relevance";

export const MAX_FAQ = 5;
/** Vanaf deze overlap met een gekozen onderwerp beantwoordt de tekst de vraag al (criterium 2). */
export const FAQ_ONDERWERP_OVERLAP = 0.6;
/** Een antwoord korter dan dit is een waarschuwing (§12.2). */
export const MIN_ANTWOORD_WOORDEN = 25;

export type FaqBron = "bezwaar" | "gemeten" | "vervolgvraag" | "dossier";
const BRON_VOLGORDE: Record<FaqBron, number> = { bezwaar: 0, gemeten: 1, vervolgvraag: 2, dossier: 3 };

export interface FaqKandidaat {
  vraag: string;
  bron: FaqBron;
}

export interface FaqKeuze {
  vraag: string;
  bron: FaqBron;
  onderbouwing: "feit" | "vakkennis";
  feiten: string[];
  vakkennis: string | null;
}

export interface FaqSelectie {
  gekozen: FaqKeuze[];
  afgewezen: { vraag: string; reden: string }[];
  /** Vragen die een lezer stelt maar waarop wij geen antwoord hebben: naar de ondernemer. */
  vragenAanOndernemer: string[];
}

function normaal(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, " ").trim();
}

/**
 * De kandidaten, ontdubbeld en op waarde gesorteerd. Een bezwaar is een vraag
 * die de klant echt kreeg; het dossier is wat een onderzoek zonder bedrijf
 * bedacht. Hooguit twintig, zodat de selectie één korte aanroep blijft.
 */
export function faqKandidaten(bronnen: Partial<Record<FaqBron, readonly string[]>>, max = 20): FaqKandidaat[] {
  const uit: FaqKandidaat[] = [];
  const gezien = new Set<string>();
  for (const bron of Object.keys(BRON_VOLGORDE) as FaqBron[]) {
    for (const vraag of bronnen[bron] ?? []) {
      const v = (vraag ?? "").trim();
      const n = normaal(v);
      if (!v || gezien.has(n)) continue;
      gezien.add(n);
      uit.push({ vraag: v, bron });
    }
  }
  return uit.sort((a, b) => BRON_VOLGORDE[a.bron] - BRON_VOLGORDE[b.bron]).slice(0, max);
}

/** Beantwoordt een gekozen onderwerp deze vraag al? Criterium 2, op kernwoorden. */
export function alBeantwoord(vraag: string, onderwerpen: readonly string[]): boolean {
  const termen = topicTerms(vraag);
  if (termen.length < 2) return false;
  return onderwerpen.some((o) => scoreTermOverlap(o, termen) / termen.length >= FAQ_ONDERWERP_OVERLAP);
}

/**
 * Het oordeel van L6 toepassen, met de criteria opnieuw in code (conventie 1):
 * een gehouden vraag zonder onderbouwing, met een F-nummer dat niet op de kaart
 * staat, of die een gekozen onderwerp al beantwoordt, valt alsnog af.
 */
export function pasFaqSelectieToe(
  kandidaten: readonly FaqKandidaat[],
  oordeel: FaqSelection | null,
  context: { kaartRefs: readonly string[]; onderwerpen: readonly string[] },
): FaqSelectie {
  const kaart = new Set(context.kaartRefs.map((r) => r.toUpperCase()));
  const gekozen: FaqKeuze[] = [];
  const afgewezen: FaqSelectie["afgewezen"] = [];
  const vragen: string[] = [];
  const perNummer = new Map((oordeel?.kandidaten ?? []).map((o) => [o.nummer, o]));

  kandidaten.forEach((k, i) => {
    const o = perNummer.get(i + 1);
    if (!o) {
      afgewezen.push({ vraag: k.vraag, reden: "Geen oordeel over deze vraag." });
      return;
    }
    if (!o.houden) {
      afgewezen.push({ vraag: k.vraag, reden: o.reden || o.criterium || "Afgewezen." });
      // Criterium 3: de lezer stelt hem wel, maar wij hebben geen antwoord. Dat
      // is een vraag aan de ondernemer, geen voorbehoud op de pagina.
      if (o.criterium === "geen onderbouwing") vragen.push(k.vraag);
      return;
    }
    const feiten = Array.from(new Set(o.feiten.map((f) => f.trim().toUpperCase()).filter((f) => kaart.has(f))));
    if (o.onderbouwing === "geen" || (o.onderbouwing === "feit" && feiten.length === 0) || (o.onderbouwing === "vakkennis" && !o.vakkennis?.trim())) {
      afgewezen.push({ vraag: k.vraag, reden: "Geen feit van de kaart en geen vaste vakkennis onder het antwoord." });
      vragen.push(k.vraag);
      return;
    }
    if (alBeantwoord(k.vraag, context.onderwerpen)) {
      afgewezen.push({ vraag: k.vraag, reden: "De tekst beantwoordt deze vraag al." });
      return;
    }
    if (gekozen.length >= MAX_FAQ) {
      afgewezen.push({ vraag: k.vraag, reden: `Al ${MAX_FAQ} vragen gekozen.` });
      return;
    }
    gekozen.push({
      vraag: k.vraag,
      bron: k.bron,
      onderbouwing: o.onderbouwing,
      feiten: o.onderbouwing === "feit" ? feiten : [],
      vakkennis: o.onderbouwing === "vakkennis" ? (o.vakkennis?.trim() ?? null) : null,
    });
  });

  return { gekozen, afgewezen, vragenAanOndernemer: Array.from(new Set(vragen)) };
}

/** Het FAQ-deel van de schrijfopdracht. */
export function faqblok(selectie: FaqSelectie | null | undefined): string {
  // `undefined` = een strategie van vóór WP7: geen blok, de schrijver beslist.
  // `null` = de selectie mislukte: dan geen FAQ, want een FAQ zonder selectie
  // is precies de restcategorie die dit werk opruimt.
  if (selectie === undefined) return "";
  if (selectie === null || selectie.gekozen.length === 0) {
    return "FAQ: geen. Zet geen vraag-en-antwoordblokken onder deze pagina; het veld `faq` blijft leeg.";
  }
  return [
    `FAQ: precies deze ${selectie.gekozen.length === 1 ? "vraag" : `${selectie.gekozen.length} vragen`}, ` +
      "in deze woorden of dicht erbij. Per antwoord eerst het antwoord in één zin, dan hoogstens twee " +
      "zinnen toelichting, samen 30 tot 80 woorden, zonder een zin uit de tekst te herhalen:",
    ...selectie.gekozen.map(
      (g) =>
        `- ${g.vraag} (${g.onderbouwing === "feit" ? `rust op ${g.feiten.join(", ")}` : `algemene uitleg: ${g.vakkennis}`})`,
    ),
  ].join("\n");
}

/** De F-nummers waarop de gekozen FAQ rust: die horen bij de gekozen feiten van de pagina. */
export function faqFeiten(selectie: FaqSelectie | null | undefined): string[] {
  return (selectie?.gekozen ?? []).flatMap((g) => g.feiten);
}

export interface FaqNaSchrijven {
  /** Vragen op de pagina die niet in de selectie staan. */
  buitenSelectie: string[];
  /** Antwoorden korter dan 25 woorden. */
  kort: string[];
  /** Antwoorden op een feitvraag waarvan geen feit in de beweringen staat. */
  zonderFeit: string[];
}

/** Na het schrijven: houdt de FAQ zich aan de selectie? Waarschuwingen (§12.2). */
export function checkFaqNaSchrijven(args: {
  faq: readonly { q: string; a: string }[];
  selectie: FaqSelectie;
  claims: readonly { factRef: string; claim: string }[];
}): FaqNaSchrijven {
  const uit: FaqNaSchrijven = { buitenSelectie: [], kort: [], zonderFeit: [] };
  for (const f of args.faq) {
    const termen = topicTerms(f.q);
    const match = args.selectie.gekozen.find((g) =>
      termen.length === 0 ? normaal(g.vraag) === normaal(f.q) : scoreTermOverlap(g.vraag, termen) / termen.length >= 0.5,
    );
    if (!match) {
      uit.buitenSelectie.push(f.q);
      continue;
    }
    if (f.a.trim().split(/\s+/).filter(Boolean).length < MIN_ANTWOORD_WOORDEN) uit.kort.push(f.q);
    if (match.onderbouwing === "feit") {
      // Grof maar deterministisch: staat een van de feiten onder deze vraag in de
      // beweringen van de pagina? Zo niet, dan rust het antwoord op niets.
      const gebruikt = args.claims.some((c) => match.feiten.some((ref) => c.factRef.toUpperCase().includes(ref)));
      if (!gebruikt) uit.zonderFeit.push(f.q);
    }
  }
  return uit;
}
